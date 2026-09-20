import { Domain, DomainConfig } from './types';

export const DOMAIN_CONFIGS: DomainConfig[] = [
  {
    domain: 'skin',
    label: '피부',
    emoji: '✨',
    defaultPeriodDays: 30,
    mediaType: 'photo',
    captureGuide: {
      shots: [{ angle: 'front', guideType: 'face_oval' }],
      lightingCheck: true,
    },
  },
  {
    domain: 'exercise',
    label: '운동',
    emoji: '💪',
    defaultPeriodDays: 90,
    mediaType: 'photo',
    captureGuide: {
      shots: [{ angle: 'front', guideType: 'body_silhouette' }],
      lightingCheck: false,
    },
  },
  {
    domain: 'voice',
    label: '보이스',
    emoji: '🎙️',
    defaultPeriodDays: 7,
    mediaType: 'audio',
    captureGuide: {
      shots: [{ angle: 'front', guideType: 'custom' }],
      lightingCheck: false,
    },
  },
];

export const PERIOD_PRESETS = [7, 30, 90];

export function getDomainConfig(domain: Domain): DomainConfig {
  const found = DOMAIN_CONFIGS.find((d) => d.domain === domain);
  if (found) return found;
  // 커스텀 도메인: 기본값으로 사진 기반, face_oval 가이드 사용
  return {
    domain,
    label: domain,
    emoji: '📌',
    defaultPeriodDays: 30,
    mediaType: 'photo',
    captureGuide: {
      shots: [{ angle: 'front', guideType: 'custom' }],
      lightingCheck: false,
    },
  };
}
