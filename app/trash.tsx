import { router, useFocusEffect } from 'expo-router';
import { ChevronLeft, Mic, RotateCcw, Trash2, Video as VideoIcon } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { ThumbnailImage } from '../components/ThumbnailImage';
import { getDomainConfig } from '../lib/domains';
import {
  getArchivedCycles,
  getArchivedEntries,
  startNewCycle,
  unarchiveCycle,
  unarchiveEntry,
  visibleEntries,
} from '../lib/storage';
import { ActiveCycle, Entry } from '../lib/types';
import { colors, fonts, radii, spacing, typography } from '../theme';

export default function Trash() {
  const [cycles, setCycles] = useState<ActiveCycle[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCycle, setSelectedCycle] = useState<ActiveCycle | null>(null);
  const [resuming, setResuming] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setCycles(await getArchivedCycles());
        setEntries(await getArchivedEntries());
        setLoading(false);
      })();
    }, [])
  );

  async function handleRestoreEntry(entryId: string) {
    setEntries((prev) => prev.filter((e) => e.id !== entryId));
    await unarchiveEntry(entryId);
  }

  async function handleResume() {
    if (!selectedCycle) return;
    setResuming(true);
    await unarchiveCycle(selectedCycle.id);
    setResuming(false);
    setSelectedCycle(null);
    router.replace('/dashboard');
  }

  async function handleRestartFresh() {
    if (!selectedCycle) return;
    setResuming(true);
    await startNewCycle(selectedCycle.domain, selectedCycle.periodDays);
    setResuming(false);
    setSelectedCycle(null);
    router.replace('/dashboard');
  }

  if (loading) {
    return <ScreenContainer />;
  }

  const isEmpty = cycles.length === 0 && entries.length === 0;

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
        <Text style={typography.title}>보관 및 삭제 기록</Text>
      </View>

      {isEmpty ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>보관하거나 삭제한 기록이 없어요.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {cycles.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>보관된 도메인 {cycles.length}개</Text>
              <View style={styles.list}>
                {cycles.map((cycle) => (
                  <ArchivedCycleRow
                    key={cycle.id}
                    cycle={cycle}
                    onPress={() => setSelectedCycle(cycle)}
                  />
                ))}
              </View>
            </View>
          )}

          {entries.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>삭제된 기록 {entries.length}개</Text>
              <View style={styles.list}>
                {entries.map((entry) => (
                  <TrashRow key={entry.id} entry={entry} onRestore={handleRestoreEntry} />
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}

      <Modal
        visible={!!selectedCycle}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedCycle(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedCycle(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            {selectedCycle && (
              <>
                <Text style={typography.heading}>{getDomainConfig(selectedCycle.domain).label}</Text>
                <Text style={styles.modalSubtitle}>
                  {visibleEntries(selectedCycle.entries).length}/{selectedCycle.periodDays}일
                  진행 중이었어요
                </Text>
                <View style={styles.modalActions}>
                  <PrimaryButton label="이어서 하기" onPress={handleResume} loading={resuming} />
                  <PrimaryButton
                    label="처음부터 다시 시작"
                    variant="secondary"
                    onPress={handleRestartFresh}
                    loading={resuming}
                  />
                  <PrimaryButton
                    label="취소"
                    variant="ghost"
                    onPress={() => setSelectedCycle(null)}
                  />
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}

function ArchivedCycleRow({ cycle, onPress }: { cycle: ActiveCycle; onPress: () => void }) {
  const config = getDomainConfig(cycle.domain);
  const Icon = config.icon;
  const entries = visibleEntries(cycle.entries);
  const archivedLabel = cycle.archivedAt
    ? new Date(cycle.archivedAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
    : null;

  return (
    <Pressable style={styles.row} onPress={onPress} testID={`archived-cycle-${cycle.id}`}>
      <View style={styles.cycleIconWrap}>
        <Icon size={20} color={colors.textMuted} strokeWidth={2.2} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{config.label}</Text>
        <Text style={styles.rowMeta}>
          {entries.length}/{cycle.periodDays}일 진행 중이었음{archivedLabel ? ` · ${archivedLabel} 보관됨` : ''}
        </Text>
      </View>
    </Pressable>
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
  scroll: {
    paddingBottom: spacing.lg,
    gap: spacing.xl,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.heading,
    fontSize: 16,
  },
  list: {
    gap: spacing.sm,
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
  cycleIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radii.sm,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  modalSubtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  modalActions: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
});
