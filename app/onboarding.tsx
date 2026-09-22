import { Check, LucideIcon, Plus } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { FrogGrowth } from '../components/FrogGrowth';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { DOMAIN_CONFIGS, PERIOD_PRESETS, getDomainConfig } from '../lib/domains';
import { markOnboarded, startNewCycle } from '../lib/storage';
import { Domain } from '../lib/types';
import { colors, fonts, radii, spacing, typography } from '../theme';

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
        <View style={styles.wordmark}>
          <FrogGrowth progress={1} size={22} />
          <Text style={styles.eyebrow}>Frogress</Text>
        </View>
        <Text style={typography.title}>
          {step === 0 ? '무엇을 기록할까요?' : '얼마 동안 기록할까요?'}
        </Text>
        <Text style={styles.subtitle}>
          {step === 0
            ? '매일 사진 한 장으로 작은 변화를 쌓아가요.'
            : `${getDomainConfig(resolvedDomain || 'skin').label} 기록 기간을 정해주세요.`}
        </Text>

        {step === 0 && (
          <View style={styles.domainList}>
            {DOMAIN_CONFIGS.map((config) => (
              <DomainCard
                key={config.domain}
                icon={config.icon}
                label={config.label}
                description={config.description}
                selected={domain === config.domain}
                onPress={() => selectDomain(config.domain)}
              />
            ))}
            <DomainCard
              icon={Plus}
              label="커스텀"
              description="나만의 도메인을 직접 만들어요"
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
  icon: Icon,
  label,
  description,
  selected,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[styles.domainCard, selected && styles.domainCardSelected]}
      testID={`domain-card-${label}`}
    >
      <View style={[styles.domainIconWrap, selected && styles.domainIconWrapSelected]}>
        <Icon size={22} color={selected ? colors.surface : colors.speciesAccent} strokeWidth={2.2} />
      </View>
      <View style={styles.domainTextWrap}>
        <Text style={[styles.domainLabel, selected && styles.domainLabelSelected]}>{label}</Text>
        <Text style={styles.domainDescription}>{description}</Text>
      </View>
      {selected && (
        <View style={styles.checkBadge}>
          <Check size={14} color={colors.surface} strokeWidth={3} />
        </View>
      )}
    </Pressable>
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
    <Pressable
      onPress={onPress}
      style={[styles.card, styles.periodCard, selected && styles.cardSelected]}
    >
      <Text style={[styles.cardLabel, selected && styles.cardLabelSelected]}>{`${days}일`}</Text>
      {selected && (
        <View style={styles.periodCheckBadge}>
          <Check size={12} color={colors.surface} strokeWidth={3} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing.lg,
  },
  wordmark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  eyebrow: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.pond,
  },
  subtitle: {
    fontFamily: fonts.body,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    color: colors.textMuted,
    fontSize: 15,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.text,
  },
  domainList: {
    gap: spacing.sm,
  },
  domainCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  domainCardSelected: {
    borderWidth: 2,
    borderColor: colors.speciesAccentDark,
    backgroundColor: colors.speciesAccentTint,
  },
  domainIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.speciesAccentTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  domainIconWrapSelected: {
    backgroundColor: colors.speciesAccent,
  },
  domainTextWrap: {
    flex: 1,
    gap: 2,
  },
  domainLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: colors.text,
  },
  domainLabelSelected: {
    color: colors.speciesAccentDark,
  },
  domainDescription: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
  },
  checkBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.speciesAccentDark,
    alignItems: 'center',
    justifyContent: 'center',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: colors.text,
  },
  cardLabelSelected: {
    color: colors.speciesAccentDark,
  },
  periodCard: {
    width: '31%',
    aspectRatio: 1.4,
  },
  periodCheckBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.speciesAccentDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: colors.speciesAccentDark,
    backgroundColor: colors.speciesAccentTint,
  },
  input: {
    fontFamily: fonts.body,
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
    fontFamily: fonts.body,
    borderBottomWidth: 1.5,
    borderColor: colors.speciesAccent,
    minWidth: 60,
    textAlign: 'center',
    fontSize: 16,
    paddingVertical: spacing.xs,
  },
  footer: {
    paddingTop: spacing.md,
  },
});
