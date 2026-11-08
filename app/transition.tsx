import { router, useLocalSearchParams } from 'expo-router';
import { PartyPopper, Waves } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { PeriodPicker } from '../components/PeriodPicker';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { SensitiveThumbnail } from '../components/SensitiveThumbnail';
import { completeCycleIfReady } from '../lib/cycles';
import { getDomainConfig } from '../lib/domains';
import {
  getActiveCycleByDomain,
  getCompletedCycleById,
  reactivateCompletedCycle,
  startNewCycle,
} from '../lib/storage';
import { CompletedCycle } from '../lib/types';
import { colors, fonts, radii, spacing, typography } from '../theme';

export default function Transition() {
  const { domain, periodDays, cycleId } = useLocalSearchParams<{
    domain: string;
    periodDays: string;
    cycleId?: string;
  }>();
  const [busy, setBusy] = useState(false);
  const [completedCycle, setCompletedCycle] = useState<CompletedCycle | null>(null);
  const [thumbsRevealed, setThumbsRevealed] = useState(false);
  const [periodModalOpen, setPeriodModalOpen] = useState(false);
  const [draftPeriod, setDraftPeriod] = useState<number | null>(null);
  const [changingPeriod, setChangingPeriod] = useState(false);
  const config = getDomainConfig(domain);

  useEffect(() => {
    if (!cycleId) return;
    (async () => {
      setCompletedCycle(await getCompletedCycleById(cycleId));
    })();
  }, [cycleId]);

  async function handleContinueSame() {
    setBusy(true);
    const cycle = await startNewCycle(domain, parseInt(periodDays, 10));
    setBusy(false);
    router.replace({ pathname: '/home', params: { cycleId: cycle.id } });
  }

  function openPeriodChange() {
    if (!cycleId) return;
    setDraftPeriod(parseInt(periodDays, 10));
    setPeriodModalOpen(true);
  }

  // "기간 변경하기"는 방금 완료한 그 사이클을 entries 그대로 유지한 채 기간만 바꿔서
  // 이어서 기록하는 것 — startNewCycle로 새 사이클을 만들면 방금 기록한 날들이
  // (연못의 완료 기록으로는 남지만) 새 사이클에서는 사라진 것처럼 보이는 문제가 있었다.
  async function handleConfirmPeriodChange() {
    if (!cycleId || !draftPeriod) return;
    const existing = await getActiveCycleByDomain(domain);
    if (existing) {
      setPeriodModalOpen(false);
      Alert.alert(
        '이미 진행 중인 기록이 있어요',
        `${config.label} 기록이 지금 대시보드에서 진행 중이에요. 완료하거나 잠시 멈춘 뒤에 기간을 바꿀 수 있어요.`
      );
      return;
    }
    setChangingPeriod(true);
    await reactivateCompletedCycle(cycleId, draftPeriod);
    const completed = await completeCycleIfReady(cycleId);
    setChangingPeriod(false);
    setPeriodModalOpen(false);
    if (completed) {
      router.replace({ pathname: '/highlight', params: { cycleId } });
    } else {
      router.replace({ pathname: '/home', params: { cycleId } });
    }
  }

  const recentThumbs = completedCycle ? [...completedCycle.entries].reverse().slice(0, 3) : [];

  return (
    <ScreenContainer>
      <Pressable style={styles.fill} onPress={() => setThumbsRevealed(false)}>
        <View style={styles.centerWrap}>
          <View style={styles.eyebrowRow}>
            <PartyPopper size={15} color={colors.textMuted} strokeWidth={2.4} />
            <Text style={styles.eyebrow}>한 사이클 완주!</Text>
          </View>
          <Text style={typography.title}>다음엔 어떻게 할까요?</Text>
          <Text style={styles.subtitle}>
            {config.label} 기록이 연못에 저장됐어요. 계속 이어가볼까요?
          </Text>

          {completedCycle && (
            <View style={styles.summaryCard}>
              <View style={styles.summaryThumbs}>
                {recentThumbs.map((entry) => (
                  <SensitiveThumbnail
                    key={entry.id}
                    uri={entry.rawMediaRef}
                    iconSize={14}
                    style={styles.summaryThumb}
                    isSensitive={config.isSensitive}
                    revealed={thumbsRevealed}
                    onRevealPress={() => setThumbsRevealed(true)}
                  />
                ))}
              </View>
              <Text style={styles.summaryText}>
                기록한 날{' '}
                <Text style={styles.summaryStrong}>
                  {completedCycle.entryCount}/{completedCycle.periodDays}일
                </Text>
              </Text>
            </View>
          )}

          <View style={styles.options}>
            <PrimaryButton
              label="같은 방식으로 계속하기"
              description={`${config.label} · ${periodDays}일`}
              onPress={handleContinueSame}
              loading={busy}
            />
            <PrimaryButton
              label="기간 변경하기"
              description={`${config.label} 기록은 유지하고 기간만 바꿔요`}
              variant="secondary"
              onPress={openPeriodChange}
            />
            <PrimaryButton
              label="새 도메인 추가하기"
              description="다른 영역을 새로 기록해봐요"
              variant="secondary"
              onPress={() => router.push({ pathname: '/onboarding', params: { mode: 'new_domain' } })}
            />
          </View>

          <Pressable style={styles.pondLink} onPress={() => router.replace('/pond')}>
            <Waves size={15} color={colors.pond} strokeWidth={2.2} />
            <Text style={styles.pondLinkText}>연못에서 지금까지의 기록 보기</Text>
          </Pressable>
        </View>
      </Pressable>

      <Modal
        visible={periodModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPeriodModalOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setPeriodModalOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={typography.heading}>기간을 정해주세요</Text>
            <Text style={styles.modalSubtitle}>{config.label}을(를) 며칠로 이어서 기록할까요?</Text>
            <PeriodPicker value={draftPeriod} onChange={setDraftPeriod} />
            {completedCycle && draftPeriod !== null && draftPeriod <= completedCycle.entryCount && (
              <Text style={styles.modalWarning}>
                {draftPeriod}일로 설정하면 지금까지 기록한 {completedCycle.entryCount}일로 바로 다시
                완료돼요.
              </Text>
            )}
            <View style={styles.modalActions}>
              <PrimaryButton
                label="기간 바꿔서 이어가기"
                onPress={handleConfirmPeriodChange}
                disabled={!draftPeriod}
                loading={changingPeriod}
              />
              <PrimaryButton
                label="취소"
                variant="ghost"
                onPress={() => setPeriodModalOpen(false)}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
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
  modalWarning: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.danger,
    marginTop: spacing.sm,
  },
  modalActions: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
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
  subtitle: {
    fontFamily: fonts.body,
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 15,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface2,
  },
  summaryThumbs: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  summaryThumb: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
  },
  summaryText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text,
  },
  summaryStrong: {
    fontFamily: fonts.bodyBold,
    color: colors.text,
  },
  options: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  pondLink: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pondLinkText: {
    fontFamily: fonts.bodySemiBold,
    color: colors.pond,
    fontSize: 14,
  },
});
