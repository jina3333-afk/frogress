import { router, useFocusEffect } from 'expo-router';
import { PartyPopper, Waves } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { FrogGrowth } from '../components/FrogGrowth';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { getDomainConfig } from '../lib/domains';
import { getActiveCycle, hasEntryToday } from '../lib/storage';
import { ActiveCycle } from '../lib/types';
import { colors, fonts, radii, spacing, typography } from '../theme';

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

  return (
    <ScreenContainer>
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
    backgroundColor: colors.border,
  },
  thumbDate: {
    fontFamily: fonts.bodyMedium,
    marginTop: spacing.xs,
    fontSize: 12,
    color: colors.textMuted,
  },
});
