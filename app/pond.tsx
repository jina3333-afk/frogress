import { router, useFocusEffect } from 'expo-router';
import { Waves } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { FrogGrowth } from '../components/FrogGrowth';
import { ScreenContainer } from '../components/ScreenContainer';
import { getDomainConfig } from '../lib/domains';
import { getActiveCycle, getCompletedCycles } from '../lib/storage';
import { CompletedCycle } from '../lib/types';
import { colors, fonts, radii, spacing, typography } from '../theme';

export default function Pond() {
  const [cycles, setCycles] = useState<CompletedCycle[]>([]);
  const [hasActive, setHasActive] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setCycles(await getCompletedCycles());
        setHasActive(!!(await getActiveCycle()));
      })();
    }, [])
  );

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <View>
          <View style={styles.eyebrowRow}>
            <Waves size={15} color={colors.primary} strokeWidth={2.4} />
            <Text style={styles.eyebrow}>나의 연못</Text>
          </View>
          <Text style={typography.title}>완성된 기록 {cycles.length}개</Text>
        </View>
        {hasActive && (
          <Text style={styles.backLink} onPress={() => router.replace('/home')}>
            홈으로
          </Text>
        )}
      </View>

      {cycles.length === 0 ? (
        <View style={styles.empty}>
          <FrogGrowth progress={1} size={64} />
          <Text style={styles.emptyText}>
            아직 완성된 기록이 없어요.{'\n'}첫 사이클을 끝내면 여기 연못에 개구리가 나타나요.
          </Text>
        </View>
      ) : (
        <FlatList
          data={cycles}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <PondCard cycle={item} />}
        />
      )}
    </ScreenContainer>
  );
}

function PondCard({ cycle }: { cycle: CompletedCycle }) {
  const config = getDomainConfig(cycle.domain);
  const Icon = config.icon;
  const coverUri = cycle.entries[cycle.entries.length - 1]?.rawMediaRef;

  return (
    <Pressable
      style={styles.card}
      onPress={() =>
        router.push({ pathname: '/highlight', params: { cycleId: cycle.id, mode: 'replay' } })
      }
      testID="pond-card"
    >
      {coverUri ? (
        <Image source={{ uri: coverUri }} style={styles.cardImage} />
      ) : (
        <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
          <FrogGrowth progress={1} size={40} />
        </View>
      )}
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Icon size={13} color={colors.primary} strokeWidth={2.4} />
          <Text style={styles.cardTitle}>{config.label}</Text>
        </View>
        <Text style={styles.cardMeta}>
          {cycle.periodDays}일 · {new Date(cycle.completedAt).toLocaleDateString('ko-KR')}
        </Text>
      </View>
    </Pressable>
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
    color: colors.primary,
  },
  backLink: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.textMuted,
    paddingVertical: spacing.xs,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  emptyText: {
    fontFamily: fonts.body,
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  list: {
    gap: spacing.md,
  },
  row: {
    gap: spacing.md,
  },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.border,
  },
  cardImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    padding: spacing.sm,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardTitle: {
    fontFamily: fonts.bodyBold,
    color: colors.text,
    fontSize: 14,
  },
  cardMeta: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
});
