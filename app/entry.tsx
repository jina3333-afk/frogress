import { router, useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { AudioPreviewPlayer } from '../components/AudioPreviewPlayer';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { VideoPreviewPlayer } from '../components/VideoPreviewPlayer';
import { getDomainConfig } from '../lib/domains';
import { getEntryById } from '../lib/storage';
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

  if (entry.mediaType === 'audio') {
    return (
      <ScreenContainer style={styles.audioContainer}>
        <Pressable onPress={() => router.back()} style={styles.audioCloseButton}>
          <X size={20} color={colors.textMuted} strokeWidth={2.2} />
        </Pressable>
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
