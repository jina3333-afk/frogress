// SUIT 하나로 통일 — 위계는 패밀리가 아니라 굵기로 표현한다 (theme/index.ts의 fonts 참고).
// Google Fonts에 없는 한국어 전용 서체라 @expo-google-fonts 패키지가 없고, npm의
// `@sun-typeface/suit` 패키지가 배포하는 정적 OTF 파일을 require()로 직접 로드한다.
// require()한 파일만 Metro 번들에 포함되므로 barrel import의 전체 웨이트 번들링 문제가 없다.
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SUIT_400Regular: require('@sun-typeface/suit/fonts/static/otf/SUIT-Regular.otf'),
    SUIT_500Medium: require('@sun-typeface/suit/fonts/static/otf/SUIT-Medium.otf'),
    SUIT_600SemiBold: require('@sun-typeface/suit/fonts/static/otf/SUIT-SemiBold.otf'),
    SUIT_700Bold: require('@sun-typeface/suit/fonts/static/otf/SUIT-Bold.otf'),
    SUIT_800ExtraBold: require('@sun-typeface/suit/fonts/static/otf/SUIT-ExtraBold.otf'),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="home" />
        <Stack.Screen name="capture" />
        <Stack.Screen name="highlight" />
        <Stack.Screen name="transition" />
        <Stack.Screen name="pond" />
      </Stack>
    </SafeAreaProvider>
  );
}
