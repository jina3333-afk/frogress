import { router, useFocusEffect } from 'expo-router';
import { CircleCheck, Plus, Waves } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FrogGrowth } from '../components/FrogGrowth';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { getDomainConfig } from '../lib/domains';
import { getActiveCycles, hasOnboarded, visibleEntries } from '../lib/storage';
import { ActiveCycle } from '../lib/types';
import { colors, fonts, radii, spacing, typography } from '../theme';

export default function Dashboard() {
  const [cycles, setCycles] = useState<ActiveCycle[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const onboarded = await hasOnboarded();
        if (!alive) return;
        if (!onboarded) {
          router.replace('/onboarding');
          return;
        }
        const active = await getActiveCycles();
        if (!alive) return;
        if (active.length === 0) {
          router.replace('/onboarding');
          return;
        }
        setCycles(active);
        setLoading(false);
      })();
      return () => {
        alive = false;
      };
    }, [])
  );

  if (loading) {
    return <ScreenContainer />;
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={typography.title}>나의 기록</Text>
          <Pressable onPress={() => router.push('/pond')} style={styles.pondLink}>
            <Waves size={16} color={colors.textMuted} strokeWidth={2.2} />
            <Text style={styles.pondLinkText}>연못</Text>
          </Pressable>
        </View>

        <View style={styles.cardList}>
          {cycles.map((cycle) => (
            <DomainCard key={cycle.id} cycle={cycle} />
          ))}
        </View>

        <PrimaryButton
          label="새 기록 추가하기"
          variant="secondary"
          onPress={() => router.push({ pathname: '/onboarding', params: { mode: 'new_domain' } })}
        />
      </ScrollView>
    </ScreenContainer>
  );
}

function DomainCard({ cycle }: { cycle: ActiveCycle }) {
  const config = getDomainConfig(cycle.domain);
  const Icon = config.icon;
  const entries = visibleEntries(cycle.entries);
  const progress = Math.min(1, entries.length / cycle.periodDays);
  const recordedToday = entries.some(
    (e) => new Date(e.date).toDateString() === new Date().toDateString()
  );

  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push({ pathname: '/home', params: { cycleId: cycle.id } })}
    >
      <FrogGrowth progress={progress} size={48} />
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Icon size={13} color={colors.textMuted} strokeWidth={2.4} />
          <Text style={styles.cardLabel}>{config.label}</Text>
        </View>
        <Text style={styles.cardProgress}>
          {entries.length}/{cycle.periodDays}일째
        </Text>
      </View>
      {recordedToday && <CircleCheck size={20} color={colors.accentDark} strokeWidth={2.2} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  pondLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.xs,
  },
  pondLinkText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.textMuted,
  },
  cardList: {
    gap: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.textMuted,
  },
  cardProgress: {
    fontFamily: fonts.titleBold,
    fontSize: 18,
    color: colors.text,
  },
});
