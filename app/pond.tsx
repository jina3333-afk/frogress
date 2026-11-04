import { router, useFocusEffect } from 'expo-router';
import { ChevronLeft, Mic, PauseCircle, Video as VideoIcon, Waves } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { FrogGrowth } from '../components/FrogGrowth';
import { PeriodPicker } from '../components/PeriodPicker';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { SensitiveThumbnail } from '../components/SensitiveThumbnail';
import { lerpColor } from '../lib/color';
import { getDomainConfig } from '../lib/domains';
import {
  getActiveCycleByDomain,
  getActiveCycles,
  getCompletedCycles,
  getPausedCycles,
  resumeCycle,
  startNewCycle,
  visibleCycles,
  visibleEntries,
} from '../lib/storage';
import { ActiveCycle, CompletedCycle, Domain } from '../lib/types';
import { colors, fonts, radii, spacing, typography } from '../theme';

// 카드가 아직 몇 장 없을 때, 그리드 끝에 "다음 개구리를 기다리는 중" 빈 슬롯을 보여주는 기준.
const EMPTY_SLOT_THRESHOLD = 4;

type PondListItem = { kind: 'cycle'; cycle: CompletedCycle } | { kind: 'placeholder' };

export default function Pond() {
  const [cycles, setCycles] = useState<CompletedCycle[]>([]);
  const [pausedCycles, setPausedCycles] = useState<ActiveCycle[]>([]);
  const [hasActive, setHasActive] = useState(false);
  const [selectedPaused, setSelectedPaused] = useState<ActiveCycle | null>(null);
  const [resuming, setResuming] = useState(false);
  const [actionCycle, setActionCycle] = useState<CompletedCycle | null>(null);
  const [periodRestartCycle, setPeriodRestartCycle] = useState<CompletedCycle | null>(null);
  const [restartDraftPeriod, setRestartDraftPeriod] = useState<number | null>(null);
  const [restarting, setRestarting] = useState(false);
  const [revealedCardId, setRevealedCardId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setCycles(await getCompletedCycles());
        setPausedCycles(await getPausedCycles());
        setHasActive(visibleCycles(await getActiveCycles()).length > 0);
      })();
      // 화면을 벗어나면(포커스를 잃으면) 공개해둔 민감한 커버도 다시 블러 상태로 되돌린다.
      return () => setRevealedCardId(null);
    }, [])
  );

  async function handleResume() {
    if (!selectedPaused) return;
    setResuming(true);
    await resumeCycle(selectedPaused.id);
    setResuming(false);
    setSelectedPaused(null);
    router.replace('/dashboard');
  }

  async function handleRestartFresh() {
    if (!selectedPaused) return;
    setResuming(true);
    await startNewCycle(selectedPaused.domain, selectedPaused.periodDays);
    setResuming(false);
    setSelectedPaused(null);
    router.replace('/dashboard');
  }

  /** 해당 도메인에 지금 진행 중인(멈추지 않은) 활성 사이클이 있으면 막는다 — 사이클 중복 생성 방지. */
  async function warnIfDomainBusy(domain: Domain): Promise<boolean> {
    const existing = await getActiveCycleByDomain(domain);
    if (existing) {
      Alert.alert(
        '이미 진행 중인 기록이 있어요',
        `${getDomainConfig(domain).label} 기록이 지금 대시보드에서 진행 중이에요. 완료하거나 잠시 멈춘 뒤에 새로 시작할 수 있어요.`
      );
      return true;
    }
    return false;
  }

  function handleReplayFromMenu() {
    if (!actionCycle) return;
    const cycleId = actionCycle.id;
    setActionCycle(null);
    router.push({ pathname: '/highlight', params: { cycleId, mode: 'replay' } });
  }

  async function handleRestartSameFromMenu() {
    if (!actionCycle) return;
    const cycle = actionCycle;
    if (await warnIfDomainBusy(cycle.domain)) {
      setActionCycle(null);
      return;
    }
    setRestarting(true);
    await startNewCycle(cycle.domain, cycle.periodDays);
    setRestarting(false);
    setActionCycle(null);
    router.replace('/dashboard');
  }

  async function handleOpenPeriodRestart() {
    if (!actionCycle) return;
    const cycle = actionCycle;
    if (await warnIfDomainBusy(cycle.domain)) {
      setActionCycle(null);
      return;
    }
    setActionCycle(null);
    setRestartDraftPeriod(cycle.periodDays);
    setPeriodRestartCycle(cycle);
  }

  async function handleConfirmPeriodRestart() {
    if (!periodRestartCycle || !restartDraftPeriod) return;
    const cycle = periodRestartCycle;
    if (await warnIfDomainBusy(cycle.domain)) {
      setPeriodRestartCycle(null);
      return;
    }
    setRestarting(true);
    await startNewCycle(cycle.domain, restartDraftPeriod);
    setRestarting(false);
    setPeriodRestartCycle(null);
    router.replace('/dashboard');
  }

  const items: PondListItem[] = cycles.map((cycle) => ({ kind: 'cycle', cycle }));
  if (cycles.length > 0 && cycles.length < EMPTY_SLOT_THRESHOLD) {
    items.push({ kind: 'placeholder' });
  }

  return (
    <ScreenContainer>
      <Pressable style={styles.fill} onPress={() => setRevealedCardId(null)}>
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

        {pausedCycles.length > 0 && (
          <View style={styles.pausedSection}>
            <View style={styles.pausedHeaderRow}>
              <PauseCircle size={14} color={colors.textMuted} strokeWidth={2.4} />
              <Text style={styles.pausedSectionTitle}>잠시 멈춘 도메인 {pausedCycles.length}개</Text>
            </View>
            <View style={styles.pausedList}>
              {pausedCycles.map((cycle) => (
                <PausedDomainRow
                  key={cycle.id}
                  cycle={cycle}
                  onPress={() => setSelectedPaused(cycle)}
                />
              ))}
            </View>
          </View>
        )}

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
              item.kind === 'cycle' ? (
                <PondCard
                  cycle={item.cycle}
                  onLongPress={() => setActionCycle(item.cycle)}
                  revealed={revealedCardId === item.cycle.id}
                  onReveal={() => setRevealedCardId(item.cycle.id)}
                />
              ) : (
                <PondEmptySlotCard />
              )
            }
          />
        )}
      </Pressable>

      <Modal
        visible={!!selectedPaused}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPaused(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedPaused(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            {selectedPaused && (
              <>
                <Text style={typography.heading}>{getDomainConfig(selectedPaused.domain).label}</Text>
                <Text style={styles.modalSubtitle}>
                  {visibleEntries(selectedPaused.entries).length}/{selectedPaused.periodDays}일
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
                    onPress={() => setSelectedPaused(null)}
                  />
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={!!actionCycle}
        transparent
        animationType="fade"
        onRequestClose={() => setActionCycle(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setActionCycle(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            {actionCycle && (
              <>
                <Text style={typography.heading}>{getDomainConfig(actionCycle.domain).label}</Text>
                <Text style={styles.modalSubtitle}>
                  {actionCycle.periodDays}일 ·{' '}
                  {new Date(actionCycle.completedAt).toLocaleDateString('ko-KR')} 완료
                </Text>
                <View style={styles.modalActions} testID="pond-card-action-menu">
                  <PrimaryButton
                    label="하이라이트 다시 보기"
                    onPress={handleReplayFromMenu}
                    testID="pond-action-replay"
                  />
                  <PrimaryButton
                    label="같은 방식으로 다시 시작"
                    variant="secondary"
                    onPress={handleRestartSameFromMenu}
                    loading={restarting}
                    testID="pond-action-restart-same"
                  />
                  <PrimaryButton
                    label="기간 바꿔서 다시 시작"
                    variant="secondary"
                    onPress={handleOpenPeriodRestart}
                    testID="pond-action-restart-period"
                  />
                  <PrimaryButton label="취소" variant="ghost" onPress={() => setActionCycle(null)} />
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={!!periodRestartCycle}
        transparent
        animationType="fade"
        onRequestClose={() => setPeriodRestartCycle(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setPeriodRestartCycle(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            {periodRestartCycle && (
              <>
                <Text style={typography.heading}>기간을 정해주세요</Text>
                <Text style={styles.modalSubtitle}>
                  {getDomainConfig(periodRestartCycle.domain).label}을(를) 어떤 기간으로 새로
                  시작할까요?
                </Text>
                <PeriodPicker value={restartDraftPeriod} onChange={setRestartDraftPeriod} />
                <View style={styles.modalActions}>
                  <PrimaryButton
                    label="다시 시작하기"
                    onPress={handleConfirmPeriodRestart}
                    disabled={!restartDraftPeriod}
                    loading={restarting}
                  />
                  <PrimaryButton
                    label="취소"
                    variant="ghost"
                    onPress={() => setPeriodRestartCycle(null)}
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

function PausedDomainRow({ cycle, onPress }: { cycle: ActiveCycle; onPress: () => void }) {
  const config = getDomainConfig(cycle.domain);
  const Icon = config.icon;
  const entries = visibleEntries(cycle.entries);

  return (
    <Pressable style={styles.pausedRow} onPress={onPress} testID={`paused-cycle-${cycle.id}`}>
      <View style={styles.pausedIconWrap}>
        <Icon size={18} color={colors.textMuted} strokeWidth={2.2} />
      </View>
      <View style={styles.pausedRowBody}>
        <Text style={styles.pausedRowTitle}>{config.label}</Text>
        <Text style={styles.pausedRowMeta}>
          {entries.length}/{cycle.periodDays}일 진행 중이었어요
        </Text>
      </View>
    </Pressable>
  );
}

function PondCard({
  cycle,
  onLongPress,
  revealed,
  onReveal,
}: {
  cycle: CompletedCycle;
  onLongPress: () => void;
  revealed: boolean;
  onReveal: () => void;
}) {
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
      onLongPress={onLongPress}
      testID="pond-card"
    >
      <SensitiveThumbnail
        uri={coverUri}
        style={styles.cardImage}
        iconSize={28}
        tintColor={coverTint}
        iconColor={config.accentColor}
        icon={lastEntry?.mediaType === 'audio' ? Mic : lastEntry?.mediaType === 'video' ? VideoIcon : undefined}
        isSensitive={config.isSensitive}
        revealed={revealed}
        onRevealPress={onReveal}
        onLongPress={onLongPress}
        testID="pond-card-blur"
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
  fill: {
    flex: 1,
  },
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
  pausedSection: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  pausedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pausedSectionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.textMuted,
  },
  pausedList: {
    gap: spacing.sm,
  },
  pausedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pausedIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pausedRowBody: {
    flex: 1,
    gap: 2,
  },
  pausedRowTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.text,
  },
  pausedRowMeta: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textMuted,
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
