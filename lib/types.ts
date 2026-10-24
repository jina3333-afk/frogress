import { LucideIcon } from 'lucide-react-native';

export type Domain = 'skin' | 'exercise' | 'voice' | string;

export type MediaType = 'photo' | 'audio' | 'video';

export type ShotAngle = 'front' | 'side';
export type GuideType = 'face_oval' | 'body_silhouette' | 'custom';

export interface DomainConfig {
  domain: Domain;
  label: string;
  description: string;
  icon: LucideIcon;
  defaultPeriodDays: 7 | 30 | 90 | number;
  mediaType: MediaType;
  captureGuide: {
    shots: { angle: ShotAngle; guideType: GuideType }[];
    lightingCheck: boolean;
  };
  /** 연못 카드 등에서 도메인을 구분하는 보조 색 — 브랜드 accent와는 별개의 좁은 범위용. */
  accentColor: string;
}

export interface Entry {
  id: string;
  domain: Domain;
  mediaType: MediaType;
  date: string; // ISO
  rawMediaRef: string;
  processedMediaRef?: string; // 정렬/보정 후
  /** 동영상 엔트리의 썸네일 이미지 uri. 사진은 rawMediaRef 자체를 쓰므로 불필요. */
  thumbnailRef?: string;
  metrics: Record<string, number | string>;
  aiSummary?: string;
  /** 소프트 삭제 — true면 진행률/통계/하이라이트 등 모든 곳에서 제외되고 "최근 삭제"에만 보인다. */
  isArchived?: boolean;
  /** 삭제(보관 처리)된 시각 — "최근 삭제" 목록 정렬용. */
  archivedAt?: string;
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
