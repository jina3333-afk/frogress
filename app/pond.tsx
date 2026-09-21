import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { getDomainConfig } from '../lib/domains';
import { getActiveCycle, getCompletedCycles } from '../lib/storage';
import { CompletedCycle } from '../lib/types';
import { colors, radii, spacing, typography } from '../theme';

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
          <Text style={styles.eyebrow}>🪷 나의 연못</Text>
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
          <Text style={styles.emptyEmoji}>🐸</Text>
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
          <Text style={{ fontSize: 32 }}>🐸</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>
          {config.emoji} {config.label}
        </Text>
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
  eyebrow: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  backLink: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
    paddingVertical: spacing.xs,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  emptyEmoji: { fontSize: 48 },
  emptyText: {
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
  cardTitle: {
    fontWeight: '700',
    color: colors.text,
    fontSize: 14,
  },
  cardMeta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
});
