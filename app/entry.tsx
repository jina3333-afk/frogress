import { router, useLocalSearchParams } from 'expo-router';
import { Sparkles, Trash2, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  // 사진/동영상 뷰어는 전체 화면을 꽉 채워야 해서 ScreenContainer(SafeAreaView)를 안 쓴다 —
  // 그 위에 겹치는 닫기/삭제 버튼은 노치/상태바를 직접 피해야 한다.
  const insets = useSafeAreaInsets();

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

  // analyzePhoto가 채워주는 AI 분석 지표 — 사진 엔트리에만, 그것도 분석이 성공했을 때만 있다.
  // observation이 없으면(분석 실패/미설정/영상·음성 엔트리) 분석 섹션 자체를 숨긴다.
  const observation =
    typeof entry.metrics.observation === 'string' ? entry.metrics.observation : undefined;
  const puffiness = typeof entry.metrics.puffiness === 'number' ? entry.metrics.puffiness : undefined;
  const toneEvenness =
    typeof entry.metrics.toneEvenness === 'number' ? entry.metrics.toneEvenness : undefined;
  const hasAnalysis = !!observation;

  function handleDelete() {
    if (!entry) return;
    const entryId = entry.id;
    Alert.alert('이 기록을 삭제할까요?', '삭제해도 "최근 삭제"에서 다시 복구할 수 있어요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          // 저장 쓰기가 끝나길 기다렸다가 돌아가면, 그 사이 화면이 깨진 미리보기 상태로
          // 멈춰 보일 수 있다 — 확인 즉시 돌아가고, 보관 처리는 백그라운드에서 끝낸다.
          router.back();
          archiveEntry(entryId);
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
      <Pressable
        onPress={() => router.back()}
        style={[styles.closeButton, { top: insets.top + spacing.sm }]}
      >
        <X size={20} color="#fff" strokeWidth={2.4} />
      </Pressable>
      <Pressable
        onPress={handleDelete}
        style={[styles.deleteButton, { top: insets.top + spacing.sm }]}
        testID="entry-delete"
      >
        <Trash2 size={20} color="#fff" strokeWidth={2.4} />
      </Pressable>
      <View style={[styles.bottomStack, { bottom: insets.bottom + spacing.lg }]}>
        {hasAnalysis && (
          <View style={styles.analysisCard} testID="entry-analysis">
            <View style={styles.analysisHeaderRow}>
              <Sparkles size={13} color="#fff" strokeWidth={2.4} />
              <Text style={styles.analysisHeaderText}>AI 분석</Text>
            </View>
            {(puffiness !== undefined || toneEvenness !== undefined) && (
              <View style={styles.analysisMetricsRow}>
                {puffiness !== undefined && (
                  <Text style={styles.analysisMetricText}>붓기 {puffiness}/5</Text>
                )}
                {toneEvenness !== undefined && (
                  <Text style={styles.analysisMetricText}>톤 균일도 {toneEvenness}/5</Text>
                )}
              </View>
            )}
            <Text style={styles.analysisObservationText}>{observation}</Text>
          </View>
        )}
        <View style={styles.dateBadge}>
          <Text style={styles.dateBadgeText}>
            {config.label} · {dateLabel}
          </Text>
        </View>
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
    right: spacing.lg,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomStack: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  dateBadge: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  dateBadgeText: { fontFamily: fonts.bodySemiBold, color: '#fff', fontSize: 13 },
  analysisCard: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  analysisHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  analysisHeaderText: {
    fontFamily: fonts.bodyBold,
    color: '#fff',
    fontSize: 12,
  },
  analysisMetricsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  analysisMetricText: {
    fontFamily: fonts.bodySemiBold,
    color: '#fff',
    fontSize: 13,
  },
  analysisObservationText: {
    fontFamily: fonts.body,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    lineHeight: 19,
  },
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
