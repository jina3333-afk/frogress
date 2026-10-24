import { router, useLocalSearchParams } from 'expo-router';
import { Trash2, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { AudioPreviewPlayer } from '../components/AudioPreviewPlayer';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { VideoPreviewPlayer } from '../components/VideoPreviewPlayer';
import { getDomainConfig } from '../lib/domains';
import { archiveEntry, getEntryById } from '../lib/storage';
import { Entry } from '../lib/types';
import { colors, fonts, radii, spacing, typography } from '../theme';

export default function EntryViewer() {
  const { entryId } = useLocalSearchParams<{ entryId?: string }>();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setEntry(entryId ? await getEntryById(entryId) : null);
      setLoading(false);
    })();
  }, [entryId]);

  if (loading) {
    return <ScreenContainer />;
  }

  if (!entry) {
    return (
      <ScreenContainer style={styles.centerContent}>
        <Text style={typography.heading}>기록을 찾을 수 없어요</Text>
        <PrimaryButton label="닫기" variant="secondary" onPress={() => router.back()} />
      </ScreenContainer>
    );
  }

  const config = getDomainConfig(entry.domain);
  const dateLabel = new Date(entry.date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  function handleDelete() {
    if (!entry) return;
    Alert.alert('이 기록을 삭제할까요?', '삭제해도 "최근 삭제"에서 다시 복구할 수 있어요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          await archiveEntry(entry.id);
          router.back();
        },
      },
    ]);
  }

  if (entry.mediaType === 'audio') {
    return (
      <ScreenContainer style={styles.audioContainer}>
        <View style={styles.audioTopRow}>
          <Pressable onPress={() => router.back()} style={styles.audioCloseButton}>
            <X size={20} color={colors.textMuted} strokeWidth={2.2} />
          </Pressable>
          <Pressable onPress={handleDelete} style={styles.audioCloseButton} testID="entry-delete">
            <Trash2 size={18} color={colors.danger} strokeWidth={2.2} />
          </Pressable>
        </View>
        <View style={styles.audioBody}>
          <Text style={styles.entryLabel}>
            {config.label} · {dateLabel}
          </Text>
          <AudioPreviewPlayer uri={entry.rawMediaRef} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <View style={styles.fill}>
      {entry.mediaType === 'photo' ? (
        <Image
          source={{ uri: entry.processedMediaRef ?? entry.rawMediaRef }}
          style={styles.media}
        />
      ) : (
        <VideoPreviewPlayer uri={entry.rawMediaRef} style={styles.media} />
      )}
      <Pressable onPress={() => router.back()} style={styles.closeButton}>
        <X size={20} color="#fff" strokeWidth={2.4} />
      </Pressable>
      <Pressable onPress={handleDelete} style={styles.deleteButton} testID="entry-delete">
        <Trash2 size={20} color="#fff" strokeWidth={2.4} />
      </Pressable>
      <View style={styles.dateBadge}>
        <Text style={styles.dateBadgeText}>
          {config.label} · {dateLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
  media: { flex: 1 },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.xl,
    left: spacing.lg,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    position: 'absolute',
    top: spacing.xl,
    right: spacing.lg,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateBadge: {
    position: 'absolute',
    bottom: spacing.xl,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  dateBadgeText: { fontFamily: fonts.bodySemiBold, color: '#fff', fontSize: 13 },
  audioContainer: {
    flex: 1,
  },
  audioTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  audioCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  entryLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.textMuted,
  },
});
