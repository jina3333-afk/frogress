// Metro가 이 패키지의 .mjs(ESM) 빌드를 집으면 beta 네임스페이스의 순환 참조 때문에
// "Cannot access '...' before initialization" 런타임 에러가 난다. 서브패스에 확장자를
// 명시해 exports map의 CJS(.js) 빌드를 강제로 집도록 우회한다.
import Anthropic from '@anthropic-ai/sdk/index.js';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod.js';
import { File } from 'expo-file-system';
import { z } from 'zod';
import { Domain, Entry } from './types';

const MODEL = 'claude-haiku-4-5';

/**
 * 클라이언트(Expo RN) 앱에서 직접 호출하는 구조라 이 키는 빌드된 앱 번들에 그대로
 * 포함된다 — .gitignore로 git 커밋은 막아도 앱을 설치한 사람은 누구나 추출할 수 있다.
 * 프로덕션 배포 전에는 이 호출을 백엔드 프록시 뒤로 옮겨야 한다.
 */
const API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!API_KEY) return null;
  if (!client) {
    client = new Anthropic({ apiKey: API_KEY, dangerouslyAllowBrowser: true });
  }
  return client;
}

const SkinAnalysisSchema = z.object({
  puffiness: z.number().int().min(1).max(5).describe('붓기 정도. 1=없음, 5=심함'),
  toneEvenness: z.number().int().min(1).max(5).describe('톤 균일도. 1=매우 불균일, 5=매우 균일'),
  observation: z.string().describe('사진에서 보이는 특징에 대한 간단한 관찰 한 줄 (한국어)'),
});

const ExerciseAnalysisSchema = z.object({
  observation: z.string().describe('자세/체형과 관련된 간단한 관찰 한 줄 (한국어)'),
});

function imageMediaType(uri: string): 'image/jpeg' | 'image/png' {
  return uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
}

async function readImageAsBase64(uri: string): Promise<string | null> {
  try {
    return await new File(uri).base64();
  } catch {
    return null;
  }
}

/**
 * 사진을 Claude(claude-haiku-4-5)로 분석해 도메인별 간단 지표를 Entry.metrics 형태로 반환한다.
 * API 키 미설정, 네트워크 오류, 파싱 실패 등 어떤 이유로든 실패하면 null을 반환한다 —
 * 호출부는 이 경우 분석 없이 사진만 저장해야 하며, 이 함수는 절대 throw하지 않는다.
 *
 * previousEntries는 직전 기록의 관찰 내용을 프롬프트에 참고 맥락으로 함께 전달해
 * "이전보다 ~했다" 같은 비교가 자연스러울 때 반영되도록 돕는 용도다.
 */
export async function analyzePhoto(
  imageUri: string,
  domain: Domain,
  previousEntries: Entry[]
): Promise<Record<string, number | string> | null> {
  const anthropic = getClient();
  if (!anthropic) return null;

  const base64 = await readImageAsBase64(imageUri);
  if (!base64) return null;

  const previousObservation = previousEntries[previousEntries.length - 1]?.metrics?.observation;
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
                source: { type: 'base64', media_type: imageMediaType(imageUri), data: base64 },
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
      if (!response.parsed_output) return null;
      return {
        puffiness: response.parsed_output.puffiness,
        toneEvenness: response.parsed_output.toneEvenness,
        observation: response.parsed_output.observation,
      };
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
                source: { type: 'base64', media_type: imageMediaType(imageUri), data: base64 },
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
      if (!response.parsed_output) return null;
      return { observation: response.parsed_output.observation };
    }

    // 피부/운동 외 도메인은 아직 분석 지표를 정의하지 않았다.
    return null;
  } catch {
    // 네트워크 오류, 레이트리밋, 인증 오류, 파싱 실패 등 — 호출부가 사진만 저장하도록 조용히 실패시킨다.
    return null;
  }
}
