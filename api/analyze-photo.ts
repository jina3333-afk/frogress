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

interface Entry {
  metrics?: Record<string, number | string>;
}

const SkinAnalysisSchema = z.object({
  puffiness: z.number().int().min(1).max(5).describe('붓기 정도. 1=없음, 5=심함'),
  toneEvenness: z.number().int().min(1).max(5).describe('톤 균일도. 1=매우 불균일, 5=매우 균일'),
  observation: z.string().describe('사진에서 보이는 특징에 대한 간단한 관찰 한 줄 (한국어)'),
});

const ExerciseAnalysisSchema = z.object({
  observation: z.string().describe('자세/체형과 관련된 간단한 관찰 한 줄 (한국어)'),
});

interface AnalyzeRequestBody {
  imageBase64?: string;
  mediaType?: 'image/jpeg' | 'image/png';
  domain?: Domain;
  previousEntries?: Entry[];
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

  const { imageBase64, mediaType, domain, previousEntries }: AnalyzeRequestBody = req.body ?? {};

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
                  contextNote,
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
      res.status(200).json({
        metrics: {
          puffiness: response.parsed_output.puffiness,
          toneEvenness: response.parsed_output.toneEvenness,
          observation: response.parsed_output.observation,
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
                text: '이 사진을 보고 자세나 체형과 관련된 간단한 관찰을 한 줄로 작성해줘.' + contextNote,
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
      res.status(200).json({ metrics: { observation: response.parsed_output.observation } });
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
