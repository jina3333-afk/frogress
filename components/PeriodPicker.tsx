import { Check } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputInstance, View } from 'react-native';
import { PERIOD_PRESETS } from '../lib/domains';
import { colors, fonts, radii, spacing } from '../theme';

interface Props {
  value: number | null;
  onChange: (days: number | null) => void;
  inputRef?: React.RefObject<TextInputInstance | null>;
  onInputFocus?: () => void;
}

/** 온보딩과 "기록 기간 수정하기"(home.tsx)가 함께 쓰는 기간 선택 UI (7/30/90일 + 직접입력). */
export function PeriodPicker({ value, onChange, inputRef, onInputFocus }: Props) {
  const [customPeriod, setCustomPeriod] = useState(
    value && !PERIOD_PRESETS.includes(value) ? String(value) : ''
  );

  return (
    <View style={styles.grid}>
      {PERIOD_PRESETS.map((preset) => (
        <PeriodCard
          key={preset}
          days={preset}
          selected={value === preset}
          onPress={() => {
            setCustomPeriod('');
            onChange(preset);
          }}
        />
      ))}
      <View style={styles.customPeriodRow}>
        <Text style={styles.body}>직접 입력</Text>
        <TextInput
          ref={inputRef}
          style={styles.periodInput}
          keyboardType="number-pad"
          placeholder="일"
          placeholderTextColor={colors.textMuted}
          value={customPeriod}
          onChangeText={(text) => {
            setCustomPeriod(text);
            const n = parseInt(text, 10);
            onChange(Number.isFinite(n) && n > 0 ? n : null);
          }}
          onFocus={onInputFocus}
        />
      </View>
    </View>
  );
}

function PeriodCard({
  days,
  selected,
  onPress,
}: {
  days: number;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, styles.periodCard, selected && styles.cardSelected]}
    >
      <Text style={[styles.cardLabel, selected && styles.cardLabelSelected]}>{`${days}일`}</Text>
      {selected && (
        <View style={styles.periodCheckBadge}>
          <Check size={12} color={colors.surface} strokeWidth={3} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.text,
  },
  card: {
    width: '31%',
    aspectRatio: 1,
    paddingVertical: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: colors.text,
  },
  cardLabelSelected: {
    color: colors.text,
  },
  periodCard: {
    width: '31%',
    aspectRatio: undefined,
    paddingVertical: spacing.xl,
  },
  periodCheckBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSelected: {
    borderWidth: 1.5,
    borderColor: colors.ink,
    backgroundColor: colors.surface2,
  },
  customPeriodRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  periodInput: {
    fontFamily: fonts.body,
    borderBottomWidth: 1.5,
    borderColor: colors.ink,
    minWidth: 60,
    textAlign: 'center',
    fontSize: 16,
    paddingVertical: spacing.xs,
  },
});
