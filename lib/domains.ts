import { Dumbbell, Mic, Sparkles, Tag } from 'lucide-react-native';
import { colors } from '../theme';
import { Domain, DomainConfig } from './types';

export const DOMAIN_CONFIGS: DomainConfig[] = [
  {
    domain: 'skin',
    label: '피부',
    description: '붓기·톤 변화',
    icon: Sparkles,
    defaultPeriodDays: 30,
    mediaType: 'photo',
    captureGuide: {
      shots: [{ angle: 'front', guideType: 'face_oval' }],
      lightingCheck: true,
    },
    accentColor: '#C98368',
  },
  {
    domain: 'exercise',
    label: '운동',
    description: '체형·자세 변화',
    icon: Dumbbell,
    defaultPeriodDays: 90,
    mediaType: 'photo',
    captureGuide: {
      shots: [{ angle: 'front', guideType: 'body_silhouette' }],
      lightingCheck: false,
    },
    accentColor: '#5B7FA6',
  },
  {
    domain: 'voice',
    label: '보이스',
    description: '발성·발음 변화',
    icon: Mic,
    defaultPeriodDays: 7,
    mediaType: 'audio',
    captureGuide: {
      shots: [{ angle: 'front', guideType: 'custom' }],
      lightingCheck: false,
    },
    accentColor: '#8C6FA0',
  },
];

export const PERIOD_PRESETS = [7, 30, 90];

export function getDomainConfig(domain: Domain): DomainConfig {
  const found = DOMAIN_CONFIGS.find((d) => d.domain === domain);
  if (found) return found;
  // 커스텀 도메인: 기본값으로 사진 기반, face_oval 가이드 사용. 정해진 색이 없으니 중립 톤.
  return {
    domain,
    label: domain,
    description: '나만의 기록',
    icon: Tag,
    defaultPeriodDays: 30,
    mediaType: 'photo',
    captureGuide: {
      shots: [{ angle: 'front', guideType: 'custom' }],
      lightingCheck: false,
    },
    accentColor: colors.textMuted,
  };
}
