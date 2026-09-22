import { lerpColor } from '../lib/color';

/**
 * 뉴트럴 베이스 — 배경/카드/테두리/텍스트. speciesAccent(세이지그린)와 같은 계열로
 * 어울리도록 아주 옅게 그린 기가 도는 그레이 톤을 쓴다.
 * 종(species)이 바뀌어도 이 톤들은 변하지 않는다.
 */
const neutral = {
  background: '#F6F7F3',
  surface: '#FBFCF9',
  /** 이미지 플레이스홀더, 비활성 도트 등 surface보다 한 단 가라앉은 보조 배경. */
  surface2: '#EEF1EA',
  border: '#DDE3D6',
  text: '#232A20',
  textMuted: '#6B7565',
};

/**
 * 브랜드 고정 컬러. 로고(Frogress 워드마크)와 "연못" 내비게이션처럼
 * 어떤 종을 기르든 항상 같은 톤으로 유지되는 요소 전용.
 */
const POND = '#1F7A8C';

/**
 * 현재 종(개구리)의 액센트 컬러. 선택 상태 / 진행률(FrogGrowth) / Primary 버튼에서만 쓴다.
 * 다른 종을 추가할 때는 이 값 하나만 바꾸면 파생 톤(dark/tint)까지 자동으로 따라온다.
 */
const SPECIES_ACCENT = '#2E9E5B';

export const colors = {
  ...neutral,

  pond: POND,

  speciesAccent: SPECIES_ACCENT,
  /** 선택 라벨/체크뱃지 등 대비가 필요한 곳에 쓰는 진한 변형 (speciesAccent 파생값). */
  speciesAccentDark: lerpColor(SPECIES_ACCENT, '#000000', 0.28),
  /** 선택된 카드 배경, 진행 카드 배경 등 옅은 워시가 필요한 곳에 쓰는 변형 (speciesAccent 파생값). */
  speciesAccentTint: lerpColor(SPECIES_ACCENT, neutral.surface, 0.82),

  danger: '#E4572E',
  /** 유생(올챙이) 단계 색 — 종과 무관하게 고정. */
  tadpole: '#4A4A46',
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
 * Fraunces(세리프, 제목용) / Inter(본문용) 폰트 패밀리 토큰.
 * app/_layout.tsx에서 useFonts로 로드하며, 실제 폰트 파일명과 1:1로 매핑된다.
 */
export const fonts = {
  title: 'Fraunces_600SemiBold',
  titleBold: 'Fraunces_700Bold',
  titleItalic: 'Fraunces_600SemiBold_Italic',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
};

export const typography = {
  title: { fontFamily: fonts.titleBold, fontSize: 28, color: colors.text },
  heading: { fontFamily: fonts.title, fontSize: 20, color: colors.text },
  body: { fontFamily: fonts.body, fontSize: 16, color: colors.text },
  caption: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textMuted },
};
