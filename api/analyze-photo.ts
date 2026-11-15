// lib/analysis.ts에 있던 Anthropic 호출 로직을 그대로 옮겨왔다. 클라이언트 번들에
// API 키가 그대로 포함되는 문제(EXPO_PUBLIC_ANTHROPIC_API_KEY) 때문에 이 프록시 뒤로
// 옮긴 것 — 여기서 쓰는 ANTHROPIC_API_KEY는 Vercel 프로젝트의 서버 전용 환경변수로만
// 설정하고, EXPO_PUBLIC_ 접두사를 붙이지 않는다.
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';

const MODEL = 'claude-haiku-4-5';

type Domain = 'skin' | 'exercise' | 'voice' | string;

interface LandmarkPoint {
  x: number;
  y: number;
}

/** lib/types.ts의 LandmarkPoints와 같은 모양 — 이 파일은 lib/ 쪽 RN 전용 의존성을 피하려고
 * 공유 타입을 쓰지 않고 그대로 복제해서 쓴다(Domain/Entry도 이미 같은 방식). */
interface LandmarkPoints {
  left: LandmarkPoint;
  right: LandmarkPoint;
  confidence: 'high' | 'medium' | 'low';
}

interface Entry {
  metrics?: Record<string, number | string | LandmarkPoints>;
}

const LandmarkPointSchema = z.object({
  x: z.number().describe('가로 픽셀 좌표 (이미지 왼쪽 끝이 0)'),
  y: z.number().describe('세로 픽셀 좌표 (이미지 위쪽 끝이 0)'),
});

/** 확신할 수 없으면(가려짐, 각도, 저해상도 등) null을 반환하도록 스키마 자체에서 허용한다 —
 * 좌표 추출 실패를 모델이 거짓으로 지어내지 않고 명시적으로 표시할 수 있게 하는 1차 안전장치. */
const LandmarksSchema = z
  .object({
    left: LandmarkPointSchema,
    right: LandmarkPointSchema,
    confidence: z.enum(['high', 'medium', 'low']).describe('이 좌표 추정을 얼마나 확신하는지'),
  })
  .nullable();

function landmarkPromptNote(
  partLabel: string,
  imageWidth: number | undefined,
  imageHeight: number | undefined
): string {
  if (!imageWidth || !imageHeight) {
    return '\n\n좌표 계산에 필요한 이미지 해상도 정보가 없으니 landmarks는 null로 반환해줘.';
  }
  return (
    `\n\n이 사진의 원본 해상도는 가로 ${imageWidth}px, 세로 ${imageHeight}px이야. ` +
    `사진 속 인물의 ${partLabel} 좌표를 이 해상도 기준 픽셀 좌표로 추정해서 landmarks에 함께 ` +
    '알려줘(left/right는 사진을 보는 사람 기준). 잘 보이지 않거나 좌표를 확신하기 어려우면 ' +
    'landmarks를 null로 반환하고, 확신 정도는 confidence로 표시해줘.'
  );
}

const SkinAnalysisSchema = z.object({
  puffiness: z.number().int().min(1).max(5).describe('붓기 정도. 1=없음, 5=심함'),
  toneEvenness: z.number().int().min(1).max(5).describe('톤 균일도. 1=매우 불균일, 5=매우 균일'),
  observation: z.string().describe('사진에서 보이는 특징에 대한 간단한 관찰 한 줄 (한국어)'),
  landmarks: LandmarksSchema.describe('양쪽 눈 중심 좌표 — 사진 정렬 보정의 기준점'),
});

const ExerciseAnalysisSchema = z.object({
  observation: z.string().describe('자세/체형과 관련된 간단한 관찰 한 줄 (한국어)'),
  landmarks: LandmarksSchema.describe('양쪽 어깨 좌표 — 사진 정렬 보정의 기준점'),
});

interface AnalyzeRequestBody {
  imageBase64?: string;
  mediaType?: 'image/jpeg' | 'image/png';
  domain?: Domain;
  previousEntries?: Entry[];
  /** 클라이언트(Image.getSize)가 읽은 사진의 원본 픽셀 해상도 — landmarks 좌표 공간을 모델에게
   * 알려주는 데 쓴다. 없으면 landmarks 추정 자체를 건너뛴다. */
  imageWidth?: number;
  imageHeight?: number;
}

/**
 * 모델이 돌려준 원본-해상도 픽셀 좌표를 0~1 비율 좌표로 정규화해서 저장한다 — 화면에 어떤
 * 크기로 그려지든(React Native Image, resizeMode="cover") 그대로 비율을 곱해 쓸 수 있고,
 * 사진마다 해상도가 달라도 lib/alignment.ts의 유사변환 계산에 그대로 쓸 수 있다.
 * 좌표가 숫자가 아니거나, 이미지 범위를 심하게 벗어나거나, 두 점이 사실상 겹쳐 있으면(유사변환
 * 계산이 불안정해지므로) 신뢰할 수 없는 추정으로 보고 null을 반환한다 — 2차 안전장치.
 */
function normalizeLandmarks(
  raw: { left: LandmarkPoint; right: LandmarkPoint; confidence: 'high' | 'medium' | 'low' } | null | undefined,
  imageWidth: number | undefined,
  imageHeight: number | undefined
): LandmarkPoints | null {
  if (!raw || !imageWidth || !imageHeight) return null;
  const { left, right, confidence } = raw;
  const coords = [left.x, left.y, right.x, right.y];
  if (!coords.every((n) => Number.isFinite(n))) return null;

  // 모델이 살짝 범위를 벗어나게 찍는 경우(이미지 가장자리 근처)는 흔하니 10% 정도 여유를 둔다.
  const margin = 0.1;
  const inBounds = (p: LandmarkPoint) =>
    p.x >= -imageWidth * margin &&
    p.x <= imageWidth * (1 + margin) &&
    p.y >= -imageHeight * margin &&
    p.y <= imageHeight * (1 + margin);
  if (!inBounds(left) || !inBounds(right)) return null;

  const toFraction = (p: LandmarkPoint): LandmarkPoint => ({ x: p.x / imageWidth, y: p.y / imageHeight });
  const normLeft = toFraction(left);
  const normRight = toFraction(right);

  const distance = Math.hypot(normRight.x - normLeft.x, normRight.y - normLeft.y);
  if (distance < 0.02) return null;

  return { left: normLeft, right: normRight, confidence };
}

/**
 * Anthropic SDK 예외를 타입별로 구분해 사람이 읽을 수 있는 한 줄로 요약한다 — 그냥
 * APIError 하나로 뭉뚱그리면 인증 실패/레이트리밋/네트워크 문제/구조화 출력 파싱 실패가
 * 전부 똑같은 로그로 보여서 Vercel 로그만 보고는 원인을 구분할 수 없었다.
 * 구조화 출력 파싱 실패(zodOutputFormat 스키마와 응답이 안 맞는 경우)는 APIError가
 * 아니라 베이스 AnthropicError로 던져지므로 APIError 체크 뒤에 따로 잡아야 한다.
 */
function describeAnthropicError(error: unknown): string {
  if (error instanceof Anthropic.RateLimitError) {
    return `레이트리밋(429) — ${error.message}`;
  }
  if (error instanceof Anthropic.AuthenticationError) {
    return `인증 실패(401) — ANTHROPIC_API_KEY 값을 확인하세요: ${error.message}`;
  }
  if (error instanceof Anthropic.PermissionDeniedError) {
    return `권한 거부(403) — ${error.message}`;
  }
  if (error instanceof Anthropic.NotFoundError) {
    return `리소스 없음(404) — 모델명(${MODEL})을 확인하세요: ${error.message}`;
  }
  if (error instanceof Anthropic.BadRequestError) {
    return `잘못된 요청(400) — 이미지 형식/파라미터를 확인하세요: ${error.message}`;
  }
  if (error instanceof Anthropic.InternalServerError) {
    return `Anthropic 서버 오류(5xx) — ${error.message}`;
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return `Anthropic API 연결 실패(네트워크/타임아웃) — ${error.message}`;
  }
  if (error instanceof Anthropic.APIError) {
    return `Anthropic API 오류(status ${error.status}) — ${error.message}`;
  }
  if (error instanceof Anthropic.AnthropicError) {
    return `구조화된 출력 파싱 실패(모델 응답이 스키마와 안 맞음) — ${error.message}`;
  }
  return `알 수 없는 오류 — ${error instanceof Error ? error.message : String(error)}`;
}

function setCorsHeaders(res: VercelResponse) {
  // 네이티브(Expo Go) 클라이언트는 CORS의 영향을 받지 않지만, 같은 앱의 웹 빌드가
  // 다른 오리진(로컬 개발 서버 등)에서 이 함수를 호출할 수 있어 허용해준다.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST만 지원해요.' });
    return;
  }

  const { imageBase64, mediaType, domain, previousEntries, imageWidth, imageHeight }: AnalyzeRequestBody =
    req.body ?? {};

  if (!imageBase64 || !mediaType || !domain) {
    res.status(400).json({ error: 'imageBase64, mediaType, domain은 필수예요.' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: '서버에 ANTHROPIC_API_KEY가 설정되어 있지 않아요.' });
    return;
  }

  const anthropic = new Anthropic({ apiKey });

  const previousObservation = previousEntries?.[previousEntries.length - 1]?.metrics?.observation;
  const contextNote =
    typeof previousObservation === 'string' && previousObservation
      ? `\n\n참고로 직전 기록의 관찰: "${previousObservation}"`
      : '';

  try {
    if (domain === 'skin') {
      const response = await anthropic.messages.parse({
        model: MODEL,
        max_tokens: 512,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data: imageBase64 },
              },
              {
                type: 'text',
                text:
                  '이 얼굴 사진을 보고 붓기 정도(1~5)와 톤 균일도(1~5)를 평가하고, 간단한 관찰을 ' +
                  '한 줄로 작성해줘. 의학적 진단이 아니라 사진에서 보이는 시각적 인상만 설명해줘.' +
                  contextNote +
                  landmarkPromptNote('양쪽 눈 중심', imageWidth, imageHeight),
              },
            ],
          },
        ],
        output_config: { format: zodOutputFormat(SkinAnalysisSchema) },
      });
      if (!response.parsed_output) {
        // 예외 없이 여기까지 왔다는 건 응답에 텍스트 블록 자체가 없었다는 뜻 —
        // JSON/스키마 파싱 실패는 parseOutputFormat이 예외를 던져서 아래 catch로 간다.
        console.warn(
          `[analyze-photo] skin 분석: parsed_output 없음 — stop_reason=${response.stop_reason}, ` +
            `content block types=[${response.content.map((b) => b.type).join(', ')}]`
        );
        res.status(200).json({ metrics: null });
        return;
      }
      const skinLandmarks = normalizeLandmarks(response.parsed_output.landmarks, imageWidth, imageHeight);
      res.status(200).json({
        metrics: {
          puffiness: response.parsed_output.puffiness,
          toneEvenness: response.parsed_output.toneEvenness,
          observation: response.parsed_output.observation,
          ...(skinLandmarks ? { landmarkPoints: skinLandmarks } : {}),
        },
      });
      return;
    }

    if (domain === 'exercise') {
      const response = await anthropic.messages.parse({
        model: MODEL,
        max_tokens: 512,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data: imageBase64 },
              },
              {
                type: 'text',
                text:
                  '이 사진을 보고 자세나 체형과 관련된 간단한 관찰을 한 줄로 작성해줘.' +
                  contextNote +
                  landmarkPromptNote('양쪽 어깨', imageWidth, imageHeight),
              },
            ],
          },
        ],
        output_config: { format: zodOutputFormat(ExerciseAnalysisSchema) },
      });
      if (!response.parsed_output) {
        console.warn(
          `[analyze-photo] exercise 분석: parsed_output 없음 — stop_reason=${response.stop_reason}, ` +
            `content block types=[${response.content.map((b) => b.type).join(', ')}]`
        );
        res.status(200).json({ metrics: null });
        return;
      }
      const exerciseLandmarks = normalizeLandmarks(response.parsed_output.landmarks, imageWidth, imageHeight);
      res.status(200).json({
        metrics: {
          observation: response.parsed_output.observation,
          ...(exerciseLandmarks ? { landmarkPoints: exerciseLandmarks } : {}),
        },
      });
      return;
    }

    // 피부/운동 외 도메인은 아직 분석 지표를 정의하지 않았다 — 실패가 아니라 "이 도메인은
    // 원래 분석을 안 한다"는 정상 분기이므로 info 레벨로만 남긴다. 받은 domain 값을 그대로
    // 찍어서, 오타나 예상과 다른 값이 와서 분기를 못 탄 경우도 구분할 수 있게 한다.
    console.log(`[analyze-photo] domain="${domain}"은 분석 지표가 정의되지 않아 건너뜁니다.`);
    res.status(200).json({ metrics: null });
  } catch (error) {
    // 네트워크 오류, 레이트리밋, 인증 오류, 구조화 출력 파싱 실패 등 — 호출부(클라이언트)가
    // 사진만 저장하도록 분석 결과 없음으로 조용히 응답한다. 서버 로그에는 어느 도메인에서,
    // 어떤 종류의 오류였는지 구분해서 남긴다.
    console.error(`[analyze-photo] ${domain} 분석 중 Anthropic 호출 실패 — ${describeAnthropicError(error)}`);
    res.status(200).json({ metrics: null });
  }
}
