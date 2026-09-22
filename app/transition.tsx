import { router, useLocalSearchParams } from 'expo-router';
import { PartyPopper, Waves } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { getDomainConfig } from '../lib/domains';
import { startNewCycle } from '../lib/storage';
import { colors, fonts, spacing, typography } from '../theme';

export default function Transition() {
  const { domain, periodDays } = useLocalSearchParams<{ domain: string; periodDays: string }>();
  const [busy, setBusy] = useState(false);
  const config = getDomainConfig(domain);

  async function handleContinueSame() {
    setBusy(true);
    await startNewCycle(domain, parseInt(periodDays, 10));
    setBusy(false);
    router.replace('/home');
  }

  return (
    <ScreenContainer>
      <View style={styles.eyebrowRow}>
        <PartyPopper size={15} color={colors.textMuted} strokeWidth={2.4} />
        <Text style={styles.eyebrow}>한 사이클 완주!</Text>
      </View>
      <Text style={typography.title}>다음엔 어떻게 할까요?</Text>
      <Text style={styles.subtitle}>
        {config.label} 기록이 연못에 저장됐어요. 계속 이어가볼까요?
      </Text>

      <View style={styles.options}>
        <PrimaryButton
          label={`같은 방식으로 계속하기 (${config.label} · ${periodDays}일)`}
          onPress={handleContinueSame}
          loading={busy}
        />
        <PrimaryButton
          label="기간 변경하기"
          variant="secondary"
          onPress={() =>
            router.push({ pathname: '/onboarding', params: { mode: 'change_period', domain } })
          }
        />
        <PrimaryButton
          label="새 도메인 추가하기"
          variant="secondary"
          onPress={() => router.push({ pathname: '/onboarding', params: { mode: 'new_domain' } })}
        />
      </View>

      <Pressable style={styles.pondLink} onPress={() => router.replace('/pond')}>
        <Waves size={15} color={colors.pond} strokeWidth={2.2} />
        <Text style={styles.pondLinkText}>연못에서 지금까지의 기록 보기</Text>
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.xs,
  },
  eyebrow: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.textMuted,
  },
  subtitle: {
    fontFamily: fonts.body,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    color: colors.textMuted,
    fontSize: 15,
  },
  options: {
    gap: spacing.md,
  },
  pondLink: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pondLinkText: {
    fontFamily: fonts.bodySemiBold,
    color: colors.pond,
    fontSize: 14,
  },
});
