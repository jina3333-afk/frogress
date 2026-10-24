import { router, useFocusEffect } from 'expo-router';
import { ChevronLeft, Mic, RotateCcw, Trash2, Video as VideoIcon } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { ThumbnailImage } from '../components/ThumbnailImage';
import { getDomainConfig } from '../lib/domains';
import { getArchivedEntries, unarchiveEntry } from '../lib/storage';
import { Entry } from '../lib/types';
import { colors, fonts, radii, spacing, typography } from '../theme';

export default function Trash() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setEntries(await getArchivedEntries());
        setLoading(false);
      })();
    }, [])
  );

  async function handleRestore(entryId: string) {
    setEntries((prev) => prev.filter((e) => e.id !== entryId));
    await unarchiveEntry(entryId);
  }

  if (loading) {
    return <ScreenContainer />;
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <ChevronLeft size={16} color={colors.textMuted} strokeWidth={2.4} />
          <Text style={styles.backLinkText}>뒤로</Text>
        </Pressable>
        <View style={styles.eyebrowRow}>
          <Trash2 size={15} color={colors.textMuted} strokeWidth={2.4} />
          <Text style={styles.eyebrow}>최근 삭제</Text>
        </View>
        <Text style={typography.title}>삭제된 기록 {entries.length}개</Text>
      </View>

      {entries.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>삭제된 기록이 없어요.</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <TrashRow entry={item} onRestore={handleRestore} />}
        />
      )}
    </ScreenContainer>
  );
}

function TrashRow({ entry, onRestore }: { entry: Entry; onRestore: (entryId: string) => void }) {
  const config = getDomainConfig(entry.domain);
  const Icon = config.icon;
  const thumbUri =
    entry.mediaType === 'photo'
      ? entry.rawMediaRef
      : entry.mediaType === 'video'
        ? entry.thumbnailRef
        : undefined;
  const dateLabel = new Date(entry.date).toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
  });
  const archivedLabel = entry.archivedAt
    ? new Date(entry.archivedAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
    : null;

  return (
    <View style={styles.row}>
      <ThumbnailImage
        uri={thumbUri}
        style={styles.thumb}
        iconSize={18}
        icon={entry.mediaType === 'audio' ? Mic : entry.mediaType === 'video' ? VideoIcon : undefined}
      />
      <View style={styles.rowBody}>
        <View style={styles.rowTitleRow}>
          <Icon size={13} color={colors.textMuted} strokeWidth={2.4} />
          <Text style={styles.rowTitle}>{config.label}</Text>
        </View>
        <Text style={styles.rowMeta}>
          {dateLabel} 기록{archivedLabel ? ` · ${archivedLabel} 삭제됨` : ''}
        </Text>
      </View>
      <Pressable
        style={styles.restoreButton}
        onPress={() => onRestore(entry.id)}
        accessibilityRole="button"
        testID={`restore-${entry.id}`}
      >
        <RotateCcw size={14} color={colors.ink} strokeWidth={2.2} />
        <Text style={styles.restoreButtonText}>복구</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.lg,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: spacing.sm,
    alignSelf: 'flex-start',
  },
  backLinkText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.textMuted,
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
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: fonts.body,
    color: colors.textMuted,
    fontSize: 15,
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: radii.sm,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.text,
  },
  rowMeta: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textMuted,
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.ink,
  },
  restoreButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.ink,
  },
});
