import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { router, useLocalSearchParams } from 'expo-router';
import { Mic } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { VideoPreviewPlayer } from '../components/VideoPreviewPlayer';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { getDomainConfig } from '../lib/domains';
import { getCompletedCycleById, visibleEntries } from '../lib/storage';
import { CompletedCycle, Entry } from '../lib/types';
import { colors, fonts, radii, spacing, typography } from '../theme';

const PHOTO_FRAME_MS = 700;
/** 동영상/음성 프레임이 재생 종료 전에 넘어가기까지 기다리는 최대 시간 — 하이라이트가 늘어지지 않도록 캡. */
const MAX_MEDIA_FRAME_MS = 3000;

export default function Highlight() {
  const { cycleId, mode } = useLocalSearchParams<{ cycleId?: string; mode?: string }>();
  const isReplay = mode === 'replay';
  const [cycle, setCycle] = useState<CompletedCycle | null>(null);

  useEffect(() => {
    if (!cycleId) {
      router.replace('/dashboard');
      return;
    }
    (async () => {
      const found = await getCompletedCycleById(cycleId);
      if (!found) {
        router.replace('/dashboard');
        return;
      }
      setCycle(found);
    })();
  }, [cycleId]);

  const [frameIndex, setFrameIndex] = useState(0);
  const frames = cycle ? visibleEntries(cycle.entries) : [];

  // 각 프레임(사진/동영상/음성)이 자기 타입에 맞는 시점에 직접 호출한다 —
  // 프레임이 1개뿐이면 (prev+1)%1이 그대로 0이라 상태가 안 바뀌어 자연히 멈춘다.
  const advance = useCallback(() => {
    setFrameIndex((prev) => (frames.length > 0 ? (prev + 1) % frames.length : 0));
  }, [frames.length]);

  if (!cycle) {
    return <ScreenContainer />;
  }

  const config = getDomainConfig(cycle.domain);
  const Icon = config.icon;
  const currentEntry = frames[frameIndex];

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
        {currentEntry &&
          (currentEntry.mediaType === 'photo' ? (
            <PhotoFrame key={currentEntry.id} entry={currentEntry} onAdvance={advance} />
          ) : currentEntry.mediaType === 'video' ? (
            <VideoFrame key={currentEntry.id} entry={currentEntry} onAdvance={advance} />
          ) : (
            <AudioFrame key={currentEntry.id} entry={currentEntry} onAdvance={advance} />
          ))}
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
                params: {
                  domain: cycle.domain,
                  periodDays: String(cycle.periodDays),
                  cycleId: cycle.id,
                },
              })
            }
          />
        )}
      </View>
    </ScreenContainer>
  );
}

function PhotoFrame({ entry, onAdvance }: { entry: Entry; onAdvance: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onAdvance, PHOTO_FRAME_MS);
    return () => clearTimeout(timer);
    // entry가 바뀔 때만 새로 스케줄한다 — onAdvance는 frames.length에서만 바뀌는 안정적인 콜백.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.id]);

  return (
    <Image
      source={{ uri: entry.processedMediaRef ?? entry.rawMediaRef }}
      style={styles.frameImage}
    />
  );
}

function VideoFrame({ entry, onAdvance }: { entry: Entry; onAdvance: () => void }) {
  const firedRef = useRef(false);
  const fireOnce = useCallback(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    onAdvance();
  }, [onAdvance]);

  useEffect(() => {
    // 영상이 끝까지 재생되지 않아도(길이가 캡보다 길 때) 하이라이트가 늘어지지 않도록 캡을 둔다.
    const timer = setTimeout(fireOnce, MAX_MEDIA_FRAME_MS);
    return () => clearTimeout(timer);
  }, [fireOnce]);

  return (
    <VideoPreviewPlayer
      uri={entry.processedMediaRef ?? entry.rawMediaRef}
      style={styles.frameImage}
      loop={false}
      nativeControls={false}
      onEnd={fireOnce}
    />
  );
}

function AudioFrame({ entry, onAdvance }: { entry: Entry; onAdvance: () => void }) {
  const player = useAudioPlayer(entry.rawMediaRef);
  const status = useAudioPlayerStatus(player);
  const firedRef = useRef(false);

  const fireOnce = useCallback(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    onAdvance();
  }, [onAdvance]);

  useEffect(() => {
    player.play();
  }, [player]);

  useEffect(() => {
    const timer = setTimeout(fireOnce, MAX_MEDIA_FRAME_MS);
    return () => clearTimeout(timer);
  }, [fireOnce]);

  useEffect(() => {
    if (status.didJustFinish) fireOnce();
  }, [status.didJustFinish, fireOnce]);

  return (
    <View style={styles.frameFallback}>
      <PulsingMicIcon playing={status.playing} />
    </View>
  );
}

function PulsingMicIcon({ playing }: { playing: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!playing) {
      scale.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.2, duration: 450, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 450, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [playing, scale]);

  return (
    <Animated.View style={[styles.audioPulseCircle, { transform: [{ scale }] }]}>
      <Mic size={32} color={colors.surface} strokeWidth={2.2} />
    </Animated.View>
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
    backgroundColor: colors.surface2,
  },
  frameImage: {
    width: '100%',
    height: '100%',
  },
  frameFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioPulseCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: colors.surface2,
  },
  dotActive: {
    backgroundColor: colors.accent,
    width: 16,
  },
  footer: {
    marginTop: spacing.lg,
  },
});
