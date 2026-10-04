import { lerpColor } from '../lib/color';

/**
 * 뉴트럴 베이스 — 배경/카드/테두리/텍스트. 화면 전체에서 고정이며
 * 거의 무채색에 가까운 톤으로 맞춘다 (Withings 앱류 레퍼런스).
 */
const neutral = {
  background: '#F4F3F0',
  surface: '#FBFCF9',
  /** 이미지 플레이스홀더, 비활성 도트 등 surface보다 한 단 가라앉은 보조 배경. */
  surface2: '#EBEAE5',
  border: '#E2E0D9',
  text: '#1D1C19',
  textMuted: '#6B7565',
  /** Primary 버튼 배경, 선택 상태의 아이콘/배지 칠 등 — accent 대신 쓰는 다크 잉크. */
  ink: '#211F1A',
};

/**
 * 브랜드 고정 컬러. 로고(Frogress 워드마크)와 "연못" 내비게이션처럼
 * 항상 같은 톤으로 유지되는 요소 전용.
 */
const POND = '#1F7A8C';

/**
 * 고정 브랜드 액센트(그린). 프로그레스바, 선택된 카드 테두리, 캐릭터(FrogGrowth),
 * 완료 배지에만 쓴다 — 버튼이나 일반 배경에는 쓰지 않는다 (그 자리는 ink/neutral이 맡는다).
 * 사이클/도메인에 따라 바뀌지 않는 단일 값.
 */
const ACCENT = '#7BBE63';

export const colors = {
  ...neutral,

  pond: POND,

  accent: ACCENT,
  /** 진한 변형 — 프로그레스 도트, 선택된 카드 테두리, 완료 배지 아이콘/텍스트 (accent 파생값). */
  accentDark: lerpColor(ACCENT, '#000000', 0.28),
  /** 옅은 워시 — 완료 배지 배경 전용 (accent 파생값). */
  accentTint: lerpColor(ACCENT, neutral.surface, 0.82),
  /** 밝고 부드러운 변형 — 캐릭터 일러스트(FrogGrowth) 성장 그라데이션의 시작색. */
  accentSoft: lerpColor(ACCENT, neutral.surface, 0.45),

  danger: '#E4572E',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radii = {
  sm: 8,
  md: 16,
  lg: 24,
  pill: 999,
};

/**
 * SUIT 하나로 통일한 폰트 패밀리 토큰 — 한글/숫자 모두 같은 서체를 쓰고,
 * 위계는 패밀리가 아니라 굵기로만 표현한다:
 *   title(ExtraBold)    — 큰 제목/숫자 (예: "4/7일째")
 *   heading(Bold)       — 섹션 제목
 *   body~bodyBold       — 본문/라벨/버튼 (Regular~Bold)
 * app/_layout.tsx에서 useFonts로 로드하며, 실제 폰트 파일명과 1:1로 매핑된다.
 */
export const fonts = {
  title: 'SUIT_700Bold',
  titleBold: 'SUIT_800ExtraBold',
  body: 'SUIT_400Regular',
  bodyMedium: 'SUIT_500Medium',
  bodySemiBold: 'SUIT_600SemiBold',
  bodyBold: 'SUIT_700Bold',
};

export const typography = {
  title: { fontFamily: fonts.titleBold, fontSize: 28, color: colors.text },
  heading: { fontFamily: fonts.title, fontSize: 20, color: colors.text },
  body: { fontFamily: fonts.body, fontSize: 16, color: colors.text },
  caption: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textMuted },
};
