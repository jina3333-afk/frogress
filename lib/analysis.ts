import { File } from 'expo-file-system';
import { Domain, Entry } from './types';

/**
 * 배포된 api/analyze-photo.ts(Vercel 서버리스 함수)의 베이스 URL. 예전엔 이 파일이
 * Anthropic API 키를 클라이언트 번들에 그대로 들고 다니며 직접 호출했는데(.gitignore로
 * git 커밋은 막아도 앱을 설치한 사람은 누구나 번들에서 키를 추출할 수 있었다), 이제는
 * 이 URL로 사진(base64)·도메인·이전 기록만 보내고 실제 Anthropic 호출은 서버에서 한다.
 */
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

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
 * 사진을 서버의 Claude 분석 프록시(api/analyze-photo.ts)로 보내 도메인별 간단 지표를
 * Entry.metrics 형태로 반환한다. 베이스 URL 미설정, 네트워크 오류, 서버 오류 등 어떤
 * 이유로든 실패하면 null을 반환한다 — 호출부는 이 경우 분석 없이 사진만 저장해야 하며,
 * 이 함수는 절대 throw하지 않는다.
 *
 * previousEntries는 직전 기록의 관찰 내용을 프롬프트에 참고 맥락으로 함께 전달해
 * "이전보다 ~했다" 같은 비교가 자연스러울 때 반영되도록 돕는 용도다.
 */
export async function analyzePhoto(
  imageUri: string,
  domain: Domain,
  previousEntries: Entry[]
): Promise<Record<string, number | string> | null> {
  if (!API_BASE_URL) return null;

  const base64 = await readImageAsBase64(imageUri);
  if (!base64) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/api/analyze-photo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: base64,
        mediaType: imageMediaType(imageUri),
        domain,
        previousEntries,
      }),
    });
    if (!response.ok) return null;

    const data = (await response.json()) as { metrics: Record<string, number | string> | null };
    return data.metrics ?? null;
  } catch {
    // 네트워크 오류, 서버 오류, 파싱 실패 등 — 호출부가 사진만 저장하도록 조용히 실패시킨다.
    return null;
  }
}
