import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { DOMAIN_CONFIGS, getDomainConfig, registerDomainSensitivity } from '../lib/domains';
import { getCustomDomainIcons, setDomainSensitivity } from '../lib/storage';
import { Domain } from '../lib/types';
import { colors, fonts, radii, spacing, typography } from '../theme';

export default function Settings() {
  const [domains, setDomains] = useState<Domain[]>(DOMAIN_CONFIGS.map((d) => d.domain));
  // getDomainConfig()는 모듈 캐시(domainSensitivityOverrides)를 동기로 읽어서, 토글 직후
  // registerDomainSensitivity로 캐시를 갱신해도 리렌더가 따로 트리거되지 않는다 — 강제로 리렌더시킨다.
  const [, forceRerender] = useState(0);

  useEffect(() => {
    (async () => {
      const customIcons = await getCustomDomainIcons();
      setDomains([...DOMAIN_CONFIGS.map((d) => d.domain), ...Object.keys(customIcons)]);
    })();
  }, []);

  async function handleToggle(domain: Domain, value: boolean) {
    registerDomainSensitivity(domain, value);
    forceRerender((n) => n + 1);
    await setDomainSensitivity(domain, value);
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          testID="settings-back"
        >
          <ChevronLeft size={20} color={colors.textMuted} strokeWidth={2.4} />
        </Pressable>
        <Text style={typography.title}>설정</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>민감한 기록으로 표시</Text>
        <Text style={styles.sectionDescription}>
          켜두면 연못·완주 화면에서 이 도메인의 사진을 기본적으로 블러 처리해요. 탭하면 그
          자리에서 바로 볼 수 있고, 다른 곳을 탭하거나 화면을 벗어나면 다시 가려져요.
        </Text>
        <View style={styles.list}>
          {domains.map((domain) => {
            const config = getDomainConfig(domain);
            const Icon = config.icon;
            return (
              <View key={domain} style={styles.row} testID={`sensitivity-row-${domain}`}>
                <View style={styles.rowIconWrap}>
                  <Icon size={16} color={colors.textMuted} strokeWidth={2.2} />
                </View>
                <Text style={styles.rowLabel}>{config.label}</Text>
                <Switch
                  value={config.isSensitive}
                  onValueChange={(value) => handleToggle(domain, value)}
                  trackColor={{ false: colors.border, true: colors.accentDark }}
                  testID={`sensitivity-switch-${domain}`}
                />
              </View>
            );
          })}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingBottom: spacing.lg,
  },
  sectionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 19,
    marginBottom: spacing.md,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rowIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.text,
  },
});
