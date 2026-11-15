import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { router, useLocalSearchParams } from 'expo-router';
import { Mic } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
/** 프레임 전환 크로스페이드 길이 — 다음 프레임이 이 시간 동안 투명도 0→1로 겹쳐 올라온다. */
const CROSSFADE_MS = 350;
/** "첫 기록 vs 마지막 기록" 비교 구간 — 다른 사진 프레임(700ms)의 약 2배. */
const COMPARISON_FRAME_MS = 1500;

type HighlightItem =
  | { kind: 'entry'; entry: Entry }
  | { kind: 'comparison'; first: Entry; last: Entry };

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

  const baseFrames = cycle ? visibleEntries(cycle.entries) : [];

  // 마지막 순서에 "첫 기록 vs 마지막 기록" 좌우 비교 구간을 추가한다 — 사진이 2장 이상이고
  // 처음/마지막이 둘 다 사진일 때만(동영상·음성은 나란히 비교할 정지 이미지가 없다).
  const items = useMemo<HighlightItem[]>(() => {
    const entryItems: HighlightItem[] = baseFrames.map((entry) => ({ kind: 'entry', entry }));
    const first = baseFrames[0];
    const last = baseFrames[baseFrames.length - 1];
    const showComparison =
      baseFrames.length >= 2 &&
      first.id !== last.id &&
      first.mediaType === 'photo' &&
      last.mediaType === 'photo';
    if (showComparison) {
      entryItems.push({ kind: 'comparison', first, last });
    }
    return entryItems;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycle]);

  const lastEntry = baseFrames[baseFrames.length - 1];
  const lastObservation =
    lastEntry && typeof lastEntry.metrics.observation === 'string'
      ? lastEntry.metrics.observation
      : undefined;

  const [frameIndex, setFrameIndex] = useState(0);
  // 전환 중에만 잠깐 존재하는 "직전 프레임" — 크로스페이드 동안 새 프레임 아래 그대로 깔아둔다.
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  // setFrameIndex의 함수형 업데이터 안에서 setPrevIndex/애니메이션 같은 부수효과를 직접
  // 실행하면 "다른 컴포넌트를 렌더링하는 중에 상태 업데이트" 경고가 뜬다 — ref로 최신
  // frameIndex를 들고 있다가, advance() 호출 시점(타이머 콜백, 렌더 중이 아님)에 한 번만
  // 읽어서 모든 상태 변경을 평범한 값으로 내보낸다.
  const frameIndexRef = useRef(0);
  useEffect(() => {
    frameIndexRef.current = frameIndex;
  }, [frameIndex]);

  const advance = useCallback(() => {
    if (items.length === 0) return;
    const current = frameIndexRef.current;
    const next = (current + 1) % items.length;
    if (items.length > 1) {
      setPrevIndex(current);
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: CROSSFADE_MS,
        useNativeDriver: true,
      }).start(() => {
        // 그 사이 더 빠른 전환이 또 일어났다면 그쪽이 이미 prevIndex를 새로 갱신했을 수 있다 —
        // 이번 애니메이션이 책임지던 값일 때만 지운다.
        setPrevIndex((p) => (p === current ? null : p));
      });
    }
    setFrameIndex(next);
  }, [items.length, fadeAnim]);

  if (!cycle) {
    return <ScreenContainer />;
  }

  const config = getDomainConfig(cycle.domain);
  const Icon = config.icon;
  const currentItem = items[frameIndex];
  const previousItem = prevIndex !== null ? items[prevIndex] : null;

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
        {previousItem && (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {renderFrameContent(previousItem, NOOP, true, lastObservation, `prev-${prevIndex}`)}
          </View>
        )}
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: items.length > 1 ? fadeAnim : 1 }]}
        >
          {currentItem &&
            renderFrameContent(currentItem, advance, false, lastObservation, `cur-${frameIndex}`)}
        </Animated.View>

        {currentItem?.kind === 'entry' && (
          <View style={styles.dateBadge}>
            <Text style={styles.dateBadgeText}>
              {new Date(currentItem.entry.date).toLocaleDateString('ko-KR', {
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.dots}>
        {items.map((_, i) => (
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

function NOOP() {}

function renderFrameContent(
  item: HighlightItem,
  onAdvance: () => void,
  frozen: boolean,
  observation: string | undefined,
  keyPrefix: string
) {
  if (item.kind === 'comparison') {
    return (
      <ComparisonFrame
        key={keyPrefix}
        first={item.first}
        last={item.last}
        onAdvance={onAdvance}
        observation={observation}
        frozen={frozen}
      />
    );
  }
  const entry = item.entry;
  if (entry.mediaType === 'photo') {
    return <PhotoFrame key={keyPrefix} entry={entry} onAdvance={onAdvance} frozen={frozen} />;
  }
  if (entry.mediaType === 'video') {
    return <VideoFrame key={keyPrefix} entry={entry} onAdvance={onAdvance} frozen={frozen} />;
  }
  return <AudioFrame key={keyPrefix} entry={entry} onAdvance={onAdvance} frozen={frozen} />;
}

function PhotoFrame({
  entry,
  onAdvance,
  frozen,
}: {
  entry: Entry;
  onAdvance: () => void;
  frozen?: boolean;
}) {
  // 켄 번즈(Ken Burns) 효과 — 사진이 떠 있는 동안 1.0배에서 1.08배로 아주 천천히 확대해서
  // 정적인 느낌을 줄인다. frozen(크로스페이드 중 아래 깔리는 직전 프레임)이면 애니메이션
  // 없이 확대가 끝난 상태(1.08)로 고정해서, 가려지는 와중에 줌이 리셋되는 게 안 보이게 한다.
  const scale = useRef(new Animated.Value(frozen ? 1.08 : 1)).current;

  useEffect(() => {
    if (frozen) return;
    scale.setValue(1);
    const zoom = Animated.timing(scale, {
      toValue: 1.08,
      duration: PHOTO_FRAME_MS + CROSSFADE_MS,
      useNativeDriver: true,
    });
    zoom.start();
    const timer = setTimeout(onAdvance, PHOTO_FRAME_MS);
    return () => {
      clearTimeout(timer);
      zoom.stop();
    };
    // entry/frozen이 바뀔 때만 새로 스케줄한다 — onAdvance는 items.length에서만 바뀌는 안정적인 콜백.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.id, frozen]);

  return (
    <Animated.Image
      source={{ uri: entry.processedMediaRef ?? entry.rawMediaRef }}
      style={[styles.frameImage, { transform: [{ scale }] }]}
    />
  );
}

function VideoFrame({
  entry,
  onAdvance,
  frozen,
}: {
  entry: Entry;
  onAdvance: () => void;
  frozen?: boolean;
}) {
  const firedRef = useRef(false);
  const fireOnce = useCallback(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    onAdvance();
  }, [onAdvance]);

  useEffect(() => {
    if (frozen) return;
    // 영상이 끝까지 재생되지 않아도(길이가 캡보다 길 때) 하이라이트가 늘어지지 않도록 캡을 둔다.
    const timer = setTimeout(fireOnce, MAX_MEDIA_FRAME_MS);
    return () => clearTimeout(timer);
  }, [fireOnce, frozen]);

  return (
    <VideoPreviewPlayer
      uri={entry.processedMediaRef ?? entry.rawMediaRef}
      style={styles.frameImage}
      loop={false}
      nativeControls={false}
      onEnd={frozen ? undefined : fireOnce}
    />
  );
}

function AudioFrame({
  entry,
  onAdvance,
  frozen,
}: {
  entry: Entry;
  onAdvance: () => void;
  frozen?: boolean;
}) {
  const player = useAudioPlayer(entry.rawMediaRef);
  const status = useAudioPlayerStatus(player);
  const firedRef = useRef(false);

  const fireOnce = useCallback(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    onAdvance();
  }, [onAdvance]);

  useEffect(() => {
    if (!frozen) player.play();
  }, [player, frozen]);

  useEffect(() => {
    if (frozen) return;
    const timer = setTimeout(fireOnce, MAX_MEDIA_FRAME_MS);
    return () => clearTimeout(timer);
  }, [fireOnce, frozen]);

  useEffect(() => {
    if (!frozen && status.didJustFinish) fireOnce();
  }, [status.didJustFinish, fireOnce, frozen]);

  return (
    <View style={styles.frameFallback}>
      <PulsingMicIcon playing={!frozen && status.playing} />
    </View>
  );
}

/** "첫 기록 vs 마지막 기록" 좌우 비교 구간 — 하이라이트 마지막 순서, 1.5초 유지. */
function ComparisonFrame({
  first,
  last,
  onAdvance,
  observation,
  frozen,
}: {
  first: Entry;
  last: Entry;
  onAdvance: () => void;
  observation?: string;
  frozen?: boolean;
}) {
  useEffect(() => {
    if (frozen) return;
    const timer = setTimeout(onAdvance, COMPARISON_FRAME_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frozen]);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  }

  return (
    <View style={styles.comparisonRow}>
      <View style={styles.comparisonHalf}>
        <Image
          source={{ uri: first.processedMediaRef ?? first.rawMediaRef }}
          style={styles.comparisonImage}
        />
        <View style={styles.comparisonLabelBadge}>
          <Text style={styles.comparisonLabelText}>시작 · {formatDate(first.date)}</Text>
        </View>
      </View>
      <View style={styles.comparisonDivider} />
      <View style={styles.comparisonHalf}>
        <Image
          source={{ uri: last.processedMediaRef ?? last.rawMediaRef }}
          style={styles.comparisonImage}
        />
        <View style={styles.comparisonLabelBadge}>
          <Text style={styles.comparisonLabelText}>완료 · {formatDate(last.date)}</Text>
        </View>
      </View>
      {observation && (
        <View style={styles.observationCaption} testID="highlight-observation-caption">
          <Text style={styles.observationCaptionText}>{observation}</Text>
        </View>
      )}
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
  comparisonRow: {
    flex: 1,
    flexDirection: 'row',
  },
  comparisonHalf: {
    flex: 1,
    overflow: 'hidden',
  },
  comparisonImage: {
    width: '100%',
    height: '100%',
  },
  comparisonDivider: {
    width: 2,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  comparisonLabelBadge: {
    position: 'absolute',
    top: spacing.sm,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  comparisonLabelText: { fontFamily: fonts.bodySemiBold, color: '#fff', fontSize: 11 },
  observationCaption: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  observationCaptionText: {
    fontFamily: fonts.body,
    color: '#fff',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
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
