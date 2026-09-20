import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { FrogGrowth } from '../components/FrogGrowth';
import { getActiveCycle, hasOnboarded } from '../lib/storage';
import { colors } from '../theme';

export default function SplashRedirect() {
  useEffect(() => {
    (async () => {
      const onboarded = await hasOnboarded();
      if (!onboarded) {
        router.replace('/onboarding');
        return;
      }
      const active = await getActiveCycle();
      router.replace(active ? '/home' : '/onboarding');
    })();
  }, []);

  return (
    <View style={styles.container}>
      <FrogGrowth progress={0.5} size={96} />
      <ActivityIndicator style={styles.spinner} color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    marginTop: 24,
  },
});
