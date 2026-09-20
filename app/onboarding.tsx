import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { DOMAIN_CONFIGS, PERIOD_PRESETS, getDomainConfig } from '../lib/domains';
import { markOnboarded, startNewCycle } from '../lib/storage';
import { Domain } from '../lib/types';
import { colors, radii, spacing, typography } from '../theme';

type Mode = 'new_domain' | 'change_period';

export default function Onboarding() {
  const params = useLocalSearchParams<{ mode?: Mode; domain?: string }>();
  const mode: Mode = params.mode === 'change_period' ? 'change_period' : 'new_domain';
  const lockedDomain = mode === 'change_period' ? (params.domain as Domain | undefined) : undefined;

  const [step, setStep] = useState<0 | 1>(lockedDomain ? 1 : 0);
  const [domain, setDomain] = useState<Domain | null>(lockedDomain ?? null);
  const [customDomain, setCustomDomain] = useState('');
  const [periodDays, setPeriodDays] = useState<number | null>(
    lockedDomain ? getDomainConfig(lockedDomain).defaultPeriodDays : null
  );
  const [customPeriod, setCustomPeriod] = useState('');
  const [starting, setStarting] = useState(false);

  const resolvedDomain = domain === 'custom' ? customDomain.trim() : domain;

  function selectDomain(value: Domain | 'custom') {
    setDomain(value);
    if (value !== 'custom') {
      setPeriodDays(getDomainConfig(value).defaultPeriodDays);
    }
  }

  async function handleStart() {
    if (!resolvedDomain || !periodDays) return;
    setStarting(true);
    await markOnboarded();
    await startNewCycle(resolvedDomain, periodDays);
    setStarting(false);
    router.replace('/home');
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>🐸 Frogress</Text>
        <Text style={typography.title}>
          {step === 0 ? '무엇을 기록할까요?' : '얼마 동안 기록할까요?'}
        </Text>
        <Text style={styles.subtitle}>
          {step === 0
            ? '매일 사진 한 장으로 작은 변화를 쌓아가요.'
            : `${getDomainConfig(resolvedDomain || 'skin').label} 기록 기간을 정해주세요.`}
        </Text>

        {step === 0 && (
          <View style={styles.grid}>
            {DOMAIN_CONFIGS.map((config) => (
              <DomainCard
                key={config.domain}
                emoji={config.emoji}
                label={config.label}
                selected={domain === config.domain}
                onPress={() => selectDomain(config.domain)}
              />
            ))}
            <DomainCard
              emoji="➕"
              label="커스텀"
              selected={domain === 'custom'}
              onPress={() => selectDomain('custom')}
            />
            {domain === 'custom' && (
              <TextInput
                style={styles.input}
                placeholder="예: 독서, 명상, 식단..."
                placeholderTextColor={colors.textMuted}
                value={customDomain}
                onChangeText={setCustomDomain}
              />
            )}
          </View>
        )}

        {step === 1 && (
          <View style={styles.grid}>
            {PERIOD_PRESETS.map((preset) => (
              <PeriodCard
                key={preset}
                days={preset}
                selected={periodDays === preset}
                onPress={() => {
                  setPeriodDays(preset);
                  setCustomPeriod('');
                }}
              />
            ))}
            <View style={styles.customPeriodRow}>
              <Text style={styles.body}>직접 입력</Text>
              <TextInput
                style={styles.periodInput}
                keyboardType="number-pad"
                placeholder="일"
                placeholderTextColor={colors.textMuted}
                value={customPeriod}
                onChangeText={(text) => {
                  setCustomPeriod(text);
                  const n = parseInt(text, 10);
                  setPeriodDays(Number.isFinite(n) && n > 0 ? n : null);
                }}
              />
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step === 0 ? (
          <PrimaryButton
            label="다음"
            onPress={() => setStep(1)}
            disabled={!resolvedDomain}
          />
        ) : (
          <PrimaryButton
            label={`${periodDays ?? ''}일 기록 시작하기`}
            onPress={handleStart}
            disabled={!periodDays}
            loading={starting}
          />
        )}
      </View>
    </ScreenContainer>
  );
}

function DomainCard({
  emoji,
  label,
  selected,
  onPress,
}: {
  emoji: string;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Text
      onPress={onPress}
      style={[styles.card, selected && styles.cardSelected]}
      accessibilityRole="button"
    >
      {emoji + '\n' + label}
    </Text>
  );
}

function PeriodCard({
  days,
  selected,
  onPress,
}: {
  days: number;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Text onPress={onPress} style={[styles.card, styles.periodCard, selected && styles.cardSelected]}>
      {`${days}일`}
    </Text>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing.lg,
  },
  eyebrow: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    color: colors.textMuted,
    fontSize: 15,
  },
  body: {
    fontSize: 16,
    color: colors.text,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  card: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    overflow: 'hidden',
  },
  periodCard: {
    width: '31%',
    aspectRatio: 1.4,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.pond,
  },
  input: {
    width: '100%',
    marginTop: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    fontSize: 16,
    backgroundColor: colors.surface,
  },
  customPeriodRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  periodInput: {
    borderBottomWidth: 1.5,
    borderColor: colors.primary,
    minWidth: 60,
    textAlign: 'center',
    fontSize: 16,
    paddingVertical: spacing.xs,
  },
  footer: {
    paddingTop: spacing.md,
  },
});
