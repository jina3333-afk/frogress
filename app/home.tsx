import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { FrogGrowth } from '../components/FrogGrowth';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { getDomainConfig } from '../lib/domains';
import { getActiveCycle, hasEntryToday } from '../lib/storage';
import { ActiveCycle } from '../lib/types';
import { colors, radii, spacing, typography } from '../theme';

export default function Home() {
  const [cycle, setCycle] = useState<ActiveCycle | null>(null);
  const [recordedToday, setRecordedToday] = useState(false);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const active = await getActiveCycle();
        if (!alive) return;
        if (!active) {
          router.replace('/onboarding');
          return;
        }
        setCycle(active);
        setRecordedToday(await hasEntryToday());
        setLoading(false);
      })();
      return () => {
        alive = false;
      };
    }, [])
  );

  if (loading || !cycle) {
    return <ScreenContainer />;
  }

  const config = getDomainConfig(cycle.domain);
  const progress = Math.min(1, cycle.entries.length / cycle.periodDays);
  const goalReached = cycle.entries.length >= cycle.periodDays;
  const daysLeft = Math.max(0, cycle.periodDays - cycle.entries.length);
  const recentEntries = [...cycle.entries].reverse().slice(0, 6);

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>
            {config.emoji} {config.label} 기록
          </Text>
          <Text style={typography.title}>
            {cycle.entries.length}/{cycle.periodDays}일째
          </Text>
        </View>
        <Text onPress={() => router.push('/pond')} style={styles.pondLink}>
          🪷 연못
        </Text>
      </View>

      <View style={styles.growthCard}>
        <FrogGrowth progress={progress} size={96} />
        <Text style={styles.growthText}>
          {goalReached
            ? '완전한 개구리가 되었어요! 하이라이트를 확인해보세요 🎉'
            : `${daysLeft}일만 더 기록하면 다음 단계로 성장해요`}
        </Text>
      </View>

      <View style={styles.actionArea}>
        {goalReached ? (
          <PrimaryButton label="하이라이트 보러가기" onPress={() => router.push('/highlight')} />
        ) : (
          <PrimaryButton
            label={recordedToday ? '오늘 기록 완료 ✓' : '오늘 기록하기'}
            onPress={() => router.push('/capture')}
            variant={recordedToday ? 'secondary' : 'primary'}
            disabled={recordedToday}
          />
        )}
      </View>

      <Text style={styles.sectionTitle}>최근 기록</Text>
      {recentEntries.length === 0 ? (
        <Text style={styles.emptyText}>아직 기록이 없어요. 첫 사진을 남겨보세요!</Text>
      ) : (
        <FlatList
          data={recentEntries}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbRow}
          renderItem={({ item }) => (
            <View style={styles.thumbWrap}>
              <Image source={{ uri: item.rawMediaRef }} style={styles.thumb} />
              <Text style={styles.thumbDate}>
                {new Date(item.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
              </Text>
            </View>
          )}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  eyebrow: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  pondLink: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
    paddingVertical: spacing.xs,
  },
  growthCard: {
    backgroundColor: colors.pond,
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  growthText: {
    textAlign: 'center',
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  actionArea: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.heading,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  emptyText: {
    color: colors.textMuted,
  },
  thumbRow: {
    gap: spacing.sm,
  },
  thumbWrap: {
    alignItems: 'center',
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: radii.md,
    backgroundColor: colors.border,
  },
  thumbDate: {
    marginTop: spacing.xs,
    fontSize: 12,
    color: colors.textMuted,
  },
});
