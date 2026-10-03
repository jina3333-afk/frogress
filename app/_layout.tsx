// 배럴(barrel) import 대신 개별 weight 서브모듈에서 가져온다.
// Metro는 배럴 파일의 미사용 named export까지 전부 번들에 포함시키므로,
// @expo-google-fonts/* 배럴에서 import하면 사용하지 않는 모든 폰트 웨이트(각 약 18개)가
// 앱에 딸려 들어간다. 서브모듈 경로로 직접 import하면 실제 사용하는 파일만 번들된다.
//
// 제목/숫자: Noto Serif KR (한글 글리프를 포함하는 세리프 - Fraunces는 라틴 전용이라
// 한글 제목이 시스템 폰트로 폴백됐다). Pretendard는 Google Fonts에 없는 한국어 전용
// 오픈소스 서체라 @expo-google-fonts 패키지가 없고, npm의 `pretendard` 패키지가 배포하는
// 정적 OTF 파일을 require()로 직접 로드한다 (Metro는 require()한 파일만 번들하므로
// barrel 문제도 없다).
import { NotoSerifKR_600SemiBold } from '@expo-google-fonts/noto-serif-kr/600SemiBold';
import { NotoSerifKR_700Bold } from '@expo-google-fonts/noto-serif-kr/700Bold';
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
    NotoSerifKR_600SemiBold,
    NotoSerifKR_700Bold,
    Pretendard_400Regular: require('pretendard/dist/public/static/Pretendard-Regular.otf'),
    Pretendard_500Medium: require('pretendard/dist/public/static/Pretendard-Medium.otf'),
    Pretendard_600SemiBold: require('pretendard/dist/public/static/Pretendard-SemiBold.otf'),
    Pretendard_700Bold: require('pretendard/dist/public/static/Pretendard-Bold.otf'),
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
