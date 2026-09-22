import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { getDomainConfig } from '../lib/domains';
import { getCompletedCycleById, getCompletedCycles } from '../lib/storage';
import { CompletedCycle } from '../lib/types';
import { colors, fonts, radii, spacing, typography } from '../theme';

const FRAME_INTERVAL_MS = 700;

export default function Highlight() {
  const { cycleId, mode } = useLocalSearchParams<{ cycleId?: string; mode?: string }>();
  const isReplay = mode === 'replay';
  const [cycle, setCycle] = useState<CompletedCycle | null>(null);
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    (async () => {
      const found = cycleId
        ? await getCompletedCycleById(cycleId)
        : (await getCompletedCycles())[0] ?? null;
      setCycle(found);
    })();
  }, [cycleId]);

  const frames = useMemo(
    () => cycle?.entries.map((e) => e.processedMediaRef ?? e.rawMediaRef) ?? [],
    [cycle]
  );

  useEffect(() => {
    if (frames.length < 2) return;
    const timer = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % frames.length);
    }, FRAME_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [frames.length]);

  if (!cycle) {
    return <ScreenContainer />;
  }

  const config = getDomainConfig(cycle.domain);
  const Icon = config.icon;
  const currentEntry = cycle.entries[frameIndex];

  return (
    <ScreenContainer>
      <View style={styles.eyebrowRow}>
        <Icon size={15} color={colors.textMuted} strokeWidth={2.4} />
        <Text style={styles.eyebrow}>
          {config.label} · {cycle.periodDays}일 하이라이트
        </Text>
      </View>
      <Text style={typography.title}>{cycle.entryCount}일간의 변화</Text>

      <View style={styles.frameBox}>
        {frames.length > 0 && (
          <Image source={{ uri: frames[frameIndex] }} style={styles.frameImage} />
        )}
        <View style={styles.dateBadge}>
          <Text style={styles.dateBadgeText}>
            {currentEntry
              ? new Date(currentEntry.date).toLocaleDateString('ko-KR', {
                  month: 'short',
                  day: 'numeric',
                })
              : ''}
          </Text>
        </View>
      </View>

      <View style={styles.dots}>
        {frames.map((_, i) => (
          <View key={i} style={[styles.dot, i === frameIndex && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.footer}>
        {isReplay ? (
          <PrimaryButton label="닫기" onPress={() => router.back()} variant="secondary" />
        ) : (
          <PrimaryButton
            label="다음으로"
            onPress={() =>
              router.replace({
                pathname: '/transition',
                params: { domain: cycle.domain, periodDays: String(cycle.periodDays) },
              })
            }
          />
        )}
      </View>
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
  frameBox: {
    marginTop: spacing.lg,
    flex: 1,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.border,
  },
  frameImage: {
    width: '100%',
    height: '100%',
  },
  dateBadge: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  dateBadgeText: { fontFamily: fonts.bodySemiBold, color: '#fff', fontSize: 12 },
  dots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.speciesAccent,
    width: 16,
  },
  footer: {
    marginTop: spacing.lg,
  },
});
