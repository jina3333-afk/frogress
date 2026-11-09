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
        res.status(200).json({ metrics: null });
        return;
      }
      res.status(200).json({ metrics: { observation: response.parsed_output.observation } });
      return;
    }

    // 피부/운동 외 도메인은 아직 분석 지표를 정의하지 않았다.
    res.status(200).json({ metrics: null });
  } catch (error) {
    // 네트워크 오류, 레이트리밋, 인증 오류, 파싱 실패 등 — 호출부(클라이언트)가 사진만
    // 저장하도록 분석 결과 없음으로 조용히 응답한다. 서버 로그에는 남겨서 디버깅 가능하게 한다.
    console.error('[analyze-photo] Anthropic 호출 실패', error);
    res.status(200).json({ metrics: null });
  }
}
