import { router, useFocusEffect } from 'expo-router';
import { CircleCheck, PartyPopper, Waves } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FrogGrowth } from '../components/FrogGrowth';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { ThumbnailImage } from '../components/ThumbnailImage';
import { getDomainConfig } from '../lib/domains';
import { getActiveCycle, hasEntryToday } from '../lib/storage';
import { ActiveCycle, Entry } from '../lib/types';
import { colors, fonts, radii, spacing, typography } from '../theme';

/** 오늘(또는 어제, 아직 오늘 기록 전이면) 부터 거슬러 올라가며 연속 기록일 수를 센다. */
function calculateStreak(entries: Entry[]): number {
  const dates = new Set(entries.map((e) => new Date(e.date).toDateString()));
  const cursor = new Date();
  if (!dates.has(cursor.toDateString())) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (dates.has(cursor.toDateString())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

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
  const Icon = config.icon;
  const progress = Math.min(1, cycle.entries.length / cycle.periodDays);
  const goalReached = cycle.entries.length >= cycle.periodDays;
  const daysLeft = Math.max(0, cycle.periodDays - cycle.entries.length);
  const recentEntries = [...cycle.entries].reverse().slice(0, 6);

  const streak = calculateStreak(cycle.entries);
  const expectedCompletionDate = new Date(cycle.startDate);
  expectedCompletionDate.setDate(expectedCompletionDate.getDate() + cycle.periodDays);

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <View style={styles.eyebrowRow}>
              <Icon size={15} color={colors.textMuted} strokeWidth={2.4} />
              <Text style={styles.eyebrow}>{config.label} 기록</Text>
            </View>
            <Text style={typography.title}>
              {cycle.entries.length}/{cycle.periodDays}일째
            </Text>
          </View>
          <Pressable onPress={() => router.push('/pond')} style={styles.pondLink}>
            <Waves size={16} color={colors.pond} strokeWidth={2.2} />
            <Text style={styles.pondLinkText}>연못</Text>
          </Pressable>
        </View>

        <View style={styles.growthCard}>
          <FrogGrowth progress={progress} size={96} />
          <View style={styles.growthTextRow}>
            <Text style={styles.growthText}>
              {goalReached
                ? '완전한 개구리가 되었어요! 하이라이트를 확인해보세요'
                : `${daysLeft}일만 더 기록하면 다음 단계로 성장해요`}
            </Text>
            {goalReached && <PartyPopper size={16} color={colors.text} strokeWidth={2.2} />}
          </View>
        </View>

        <View style={styles.actionArea}>
          {goalReached ? (
            <PrimaryButton label="하이라이트 보러가기" onPress={() => router.push('/highlight')} />
          ) : recordedToday ? (
            <View style={styles.completedBadge}>
              <CircleCheck size={18} color={colors.speciesAccentDark} strokeWidth={2.2} />
              <Text style={styles.completedBadgeText}>오늘 기록 완료</Text>
            </View>
          ) : (
            <PrimaryButton label="오늘 기록하기" onPress={() => router.push('/capture')} />
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
                <ThumbnailImage uri={item.rawMediaRef} style={styles.thumb} iconSize={22} />
                <Text style={styles.thumbDate}>
                  {new Date(item.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                </Text>
              </View>
            )}
          />
        )}

        <Text style={styles.statsSectionTitle}>이번 사이클</Text>
        <View style={styles.statsCard}>
          <View style={styles.statTile}>
            <Text style={styles.statValue}>{cycle.entries.length}</Text>
            <Text style={styles.statLabel}>기록한 날</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statTile}>
            <Text style={styles.statValue}>{streak}</Text>
            <Text style={styles.statLabel}>연속 기록</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statTile}>
            <Text style={styles.statValue}>
              {expectedCompletionDate.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
            </Text>
            <Text style={styles.statLabel}>예상 완료일</Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
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
  pondLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.xs,
  },
  pondLinkText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.pond,
  },
  growthCard: {
    backgroundColor: colors.speciesAccentTint,
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  growthTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  growthText: {
    fontFamily: fonts.bodySemiBold,
    textAlign: 'center',
    color: colors.text,
    fontSize: 14,
  },
  actionArea: {
    marginBottom: spacing.lg,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.speciesAccentTint,
  },
  completedBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.speciesAccentDark,
  },
  sectionTitle: {
    ...typography.heading,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontFamily: fonts.body,
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
  },
  thumbDate: {
    fontFamily: fonts.bodyMedium,
    marginTop: spacing.xs,
    fontSize: 12,
    color: colors.textMuted,
  },
  statsSectionTitle: {
    ...typography.heading,
    fontSize: 16,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
  },
  statTile: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontFamily: fonts.titleBold,
    fontSize: 20,
    color: colors.text,
  },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
});
