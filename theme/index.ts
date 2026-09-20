export const colors = {
  background: '#F3FAF4',
  surface: '#FFFFFF',
  pond: '#E3F3E9',
  primary: '#2E9E5B',
  primaryDark: '#1F7A44',
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

export const typography = {
  title: { fontSize: 28, fontWeight: '700' as const, color: colors.text },
  heading: { fontSize: 20, fontWeight: '700' as const, color: colors.text },
  body: { fontSize: 16, fontWeight: '400' as const, color: colors.text },
  caption: { fontSize: 13, fontWeight: '500' as const, color: colors.textMuted },
};
