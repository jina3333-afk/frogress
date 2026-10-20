import {
  Book,
  Brain,
  Dumbbell,
  Heart,
  Leaf,
  Mic,
  Moon,
  Music,
  Palette,
  Pen,
  Sparkles,
  Target,
  Utensils,
} from 'lucide-react-native';
import { colors } from '../theme';
import { Domain, DomainConfig } from './types';
import type { LucideIcon } from 'lucide-react-native';

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
      shots: [{ angle: 'side', guideType: 'body_silhouette' }],
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

export interface IconOption {
  key: string;
  icon: LucideIcon;
}

/** 커스텀 도메인 생성 시 고를 수 있는 아이콘 — 특정 영역에 치우치지 않는 범용 아이콘들. */
export const CUSTOM_DOMAIN_ICON_OPTIONS: IconOption[] = [
  { key: 'sparkles', icon: Sparkles },
  { key: 'book', icon: Book },
  { key: 'dumbbell', icon: Dumbbell },
  { key: 'palette', icon: Palette },
  { key: 'music', icon: Music },
  { key: 'pen', icon: Pen },
  { key: 'heart', icon: Heart },
  { key: 'brain', icon: Brain },
  { key: 'moon', icon: Moon },
  { key: 'utensils', icon: Utensils },
  { key: 'leaf', icon: Leaf },
  { key: 'target', icon: Target },
];

export const DEFAULT_CUSTOM_DOMAIN_ICON_KEY = 'sparkles';

function iconByKey(key: string | undefined): LucideIcon {
  if (!key) return Sparkles;
  return CUSTOM_DOMAIN_ICON_OPTIONS.find((o) => o.key === key)?.icon ?? Sparkles;
}

// getDomainConfig는 화면 렌더링 중에 동기로 호출되는 곳이 많아 매번 스토리지를 읽을 수
// 없다 — 대신 커스텀 도메인의 아이콘 선택을 메모리 캐시에 보관한다. 앱 시작 시
// (app/_layout.tsx) storage.ts에 저장된 값으로 한 번 채워 넣고(hydrateCustomDomainIcons),
// 온보딩에서 새로 선택할 때는 registerCustomDomainIcon으로 즉시 반영한다.
let customDomainIconKeys: Record<string, string> = {};

export function hydrateCustomDomainIcons(map: Record<string, string>): void {
  customDomainIconKeys = { ...customDomainIconKeys, ...map };
}

export function registerCustomDomainIcon(domain: string, iconKey: string): void {
  customDomainIconKeys = { ...customDomainIconKeys, [domain]: iconKey };
}

export function getDomainConfig(domain: Domain): DomainConfig {
  const found = DOMAIN_CONFIGS.find((d) => d.domain === domain);
  if (found) return found;
  // 커스텀 도메인: 기본값으로 사진 기반, face_oval 가이드 사용. 정해진 색이 없으니 중립 톤.
  return {
    domain,
    label: domain,
    description: '나만의 기록',
    icon: iconByKey(customDomainIconKeys[domain]),
    defaultPeriodDays: 30,
    mediaType: 'photo',
    captureGuide: {
      shots: [{ angle: 'front', guideType: 'custom' }],
      lightingCheck: false,
    },
    accentColor: colors.textMuted,
  };
}
