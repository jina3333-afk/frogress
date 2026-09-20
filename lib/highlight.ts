import { generateId } from './id';
import { Entry } from './types';

export interface HighlightResult {
  ref: string;
  frameUris: string[];
  createdAt: string;
}

/**
 * 아키텍처 문서의 HighlightGenerator 인터페이스.
 * 1단계: PhotoTimelapseGenerator. 3단계 확장: VideoMontageGenerator, AudioWaveformGenerator.
 */
export interface HighlightGenerator {
  generate(entries: Entry[]): Promise<HighlightResult>;
}

/**
 * 사진 기반 타임랩스 생성기 (1단계 구현).
 * 실제 서비스에서는 온디바이스 렌더링(Canvas/WebCodecs 상당 - RN에서는 skia/ffmpeg-kit)으로
 * 영상 파일을 만들지만, MVP에서는 정렬된 프레임 목록을 순서대로 재생하는 슬라이드쇼로 대체한다.
 */
export class PhotoTimelapseGenerator implements HighlightGenerator {
  async generate(entries: Entry[]): Promise<HighlightResult> {
    const sorted = [...entries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const frameUris = sorted.map((e) => e.processedMediaRef ?? e.rawMediaRef);
    return {
      ref: generateId('highlight'),
      frameUris,
      createdAt: new Date().toISOString(),
    };
  }
}

/**
 * 정렬 보정 스텁.
 * 다음 개발 단계: MediaPipe 등 랜드마크 인식 라이브러리로 얼굴/신체 기준점을 잡아
 * 이동·회전·확대축소(2D affine) 보정을 수행한다. 지금은 원본을 그대로 통과시킨다.
 */
export async function alignEntryMedia(rawUri: string): Promise<string> {
  return rawUri;
}
