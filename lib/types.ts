export type Domain = 'skin' | 'exercise' | 'voice' | string;

export type MediaType = 'photo' | 'audio' | 'video';

export type ShotAngle = 'front' | 'side';
export type GuideType = 'face_oval' | 'body_silhouette' | 'custom';

export interface DomainConfig {
  domain: Domain;
  label: string;
  emoji: string;
  defaultPeriodDays: 7 | 30 | 90 | number;
  mediaType: MediaType;
  captureGuide: {
    shots: { angle: ShotAngle; guideType: GuideType }[];
    lightingCheck: boolean;
  };
}

export interface Entry {
  id: string;
  domain: Domain;
  mediaType: MediaType;
  date: string; // ISO
  rawMediaRef: string;
  processedMediaRef?: string; // 정렬/보정 후
  metrics: Record<string, number | string>;
  aiSummary?: string;
}

export interface CompletedCycle {
  id: string;
  domain: Domain;
  periodDays: number;
  completedAt: string;
  entryCount: number;
  highlightVideoRef?: string;
  /**
   * MVP 로컬 저장을 위한 확장 필드. 서버/영상 파이프라인이 붙기 전까지
   * 연못 화면에서 하이라이트를 다시 재생하기 위해 원본 엔트리를 함께 보관한다.
   */
  entries: Entry[];
}

export interface ActiveCycle {
  id: string;
  domain: Domain;
  periodDays: number;
  startDate: string; // ISO
  entries: Entry[];
}

export type TransitionChoice = 'continue' | 'change_period' | 'new_domain';
