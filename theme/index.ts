export const colors = {
  background: '#F3FAF4',
  surface: '#FFFFFF',
  pond: '#E3F3E9',
  primary: '#2E9E5B',
  primaryDark: '#1F7A44',
  selectedBg: '#CDEEDA',
  selectedBorder: '#1F7A44',
  accent: '#FFC94A',
  text: '#1E2B23',
  textMuted: '#6B7C71',
  border: '#DCEBDF',
  danger: '#E4572E',
  tadpole: '#4A4A46',
  frog: '#39A35C',
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
