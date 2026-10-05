import { router, useLocalSearchParams } from 'expo-router';
import { PartyPopper, Waves } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { ThumbnailImage } from '../components/ThumbnailImage';
import { getDomainConfig } from '../lib/domains';
import { getCompletedCycleById, startNewCycle } from '../lib/storage';
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
  const config = getDomainConfig(domain);

  useEffect(() => {
    if (!cycleId) return;
    (async () => {
      setCompletedCycle(await getCompletedCycleById(cycleId));
    })();
  }, [cycleId]);

  async function handleContinueSame() {
    setBusy(true);
    await startNewCycle(domain, parseInt(periodDays, 10));
    setBusy(false);
    router.replace('/home');
  }

  const recentThumbs = completedCycle ? [...completedCycle.entries].reverse().slice(0, 3) : [];

  return (
    <ScreenContainer>
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
              {recentThumbs.map((entry, i) => (
                <ThumbnailImage
                  key={entry.id}
                  uri={entry.rawMediaRef}
                  iconSize={14}
                  style={[styles.summaryThumb, i > 0 && styles.summaryThumbOverlap]}
                />
              ))}
            </View>
            <Text style={styles.summaryText}>
              <Text style={styles.summaryStrong}>{completedCycle.entryCount}일</Text> 동안
              기록했어요
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
            onPress={() =>
              router.push({ pathname: '/onboarding', params: { mode: 'change_period', domain } })
            }
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
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
  },
  summaryThumb: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.surface2,
  },
  summaryThumbOverlap: {
    marginLeft: -12,
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
