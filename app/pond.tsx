import { router, useFocusEffect } from 'expo-router';
import { ChevronLeft, Mic, Video as VideoIcon, Waves } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { FrogGrowth } from '../components/FrogGrowth';
import { ScreenContainer } from '../components/ScreenContainer';
import { ThumbnailImage } from '../components/ThumbnailImage';
import { lerpColor } from '../lib/color';
import { getDomainConfig } from '../lib/domains';
import { getActiveCycles, getCompletedCycles, visibleCycles, visibleEntries } from '../lib/storage';
import { CompletedCycle } from '../lib/types';
import { colors, fonts, radii, spacing, typography } from '../theme';

// 카드가 아직 몇 장 없을 때, 그리드 끝에 "다음 개구리를 기다리는 중" 빈 슬롯을 보여주는 기준.
const EMPTY_SLOT_THRESHOLD = 4;

type PondListItem = { kind: 'cycle'; cycle: CompletedCycle } | { kind: 'placeholder' };

export default function Pond() {
  const [cycles, setCycles] = useState<CompletedCycle[]>([]);
  const [hasActive, setHasActive] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setCycles(await getCompletedCycles());
        setHasActive(visibleCycles(await getActiveCycles()).length > 0);
      })();
    }, [])
  );

  const items: PondListItem[] = cycles.map((cycle) => ({ kind: 'cycle', cycle }));
  if (cycles.length > 0 && cycles.length < EMPTY_SLOT_THRESHOLD) {
    items.push({ kind: 'placeholder' });
  }

  return (
    <ScreenContainer>
      {hasActive && (
        <Pressable
          onPress={() => router.replace('/dashboard')}
          style={styles.backButton}
          accessibilityRole="button"
          testID="pond-back"
        >
          <ChevronLeft size={20} color={colors.textMuted} strokeWidth={2.4} />
        </Pressable>
      )}
      <View style={styles.header}>
        <View>
          <View style={styles.eyebrowRow}>
            <Waves size={15} color={colors.textMuted} strokeWidth={2.4} />
            <Text style={styles.eyebrow}>나의 연못</Text>
          </View>
          <Text style={typography.title}>완성된 기록 {cycles.length}개</Text>
        </View>
        <Text style={styles.backLink} onPress={() => router.push('/trash')}>
          최근 삭제
        </Text>
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
          data={items}
          keyExtractor={(item) => (item.kind === 'cycle' ? item.cycle.id : 'placeholder')}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          renderItem={({ item }) =>
            item.kind === 'cycle' ? <PondCard cycle={item.cycle} /> : <PondEmptySlotCard />
          }
        />
      )}
    </ScreenContainer>
  );
}

function PondCard({ cycle }: { cycle: CompletedCycle }) {
  const config = getDomainConfig(cycle.domain);
  const Icon = config.icon;
  const entries = visibleEntries(cycle.entries);
  const lastEntry = entries[entries.length - 1];
  // 영상/음성 파일은 <Image>로 디코딩할 수 없으니 사진은 원본을, 동영상은 생성된
  // 썸네일을 쓴다 — 그 외(음성, 썸네일 없는 동영상)는 ThumbnailImage의 아이콘으로 떨어진다.
  const coverUri =
    lastEntry?.mediaType === 'photo'
      ? lastEntry.rawMediaRef
      : lastEntry?.mediaType === 'video'
        ? lastEntry.thumbnailRef
        : undefined;
  // 도메인별로 살짝 다른 커버 톤 — 연한 워시라 전체 뉴트럴 톤을 해치지 않는다.
  const coverTint = lerpColor(config.accentColor, colors.surface, 0.85);

  return (
    <Pressable
      style={styles.card}
      onPress={() =>
        router.push({ pathname: '/highlight', params: { cycleId: cycle.id, mode: 'replay' } })
      }
      testID="pond-card"
    >
      <ThumbnailImage
        uri={coverUri}
        style={styles.cardImage}
        iconSize={28}
        tintColor={coverTint}
        iconColor={config.accentColor}
        icon={lastEntry?.mediaType === 'audio' ? Mic : lastEntry?.mediaType === 'video' ? VideoIcon : undefined}
      />
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Icon size={13} color={config.accentColor} strokeWidth={2.4} />
          <Text style={styles.cardTitle}>{config.label}</Text>
        </View>
        <Text style={styles.cardMeta}>
          {cycle.periodDays}일 · {new Date(cycle.completedAt).toLocaleDateString('ko-KR')}
        </Text>
      </View>
    </Pressable>
  );
}

function PondEmptySlotCard() {
  return (
    <View style={styles.placeholderCard}>
      <FrogGrowth progress={0.05} size={36} />
      <Text style={styles.placeholderText}>다음 개구리를{'\n'}기다리는 중</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
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
    aspectRatio: 16 / 9,
  },
  cardBody: {
    padding: spacing.sm,
    backgroundColor: colors.surface,
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
  placeholderCard: {
    flex: 1,
    minHeight: 140,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.surface2,
  },
  placeholderText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 17,
  },
});
