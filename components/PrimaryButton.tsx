import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii, spacing } from '../theme';

interface Props {
  label: string;
  /** 라벨 아래 한 줄 부제. 버튼 여러 개를 한 화면에 늘어놓을 때 설명 수준을 맞추는 용도. */
  description?: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
}

export function PrimaryButton({
  label,
  description,
  onPress,
  variant = 'primary',
  disabled,
  loading,
}: Props) {
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        isPrimary && styles.primary,
        isSecondary && styles.secondary,
        variant === 'ghost' && styles.ghost,
        (disabled || loading) && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#fff' : colors.ink} />
      ) : (
        <View style={styles.textWrap}>
          <Text
            style={[
              styles.label,
              isPrimary && styles.labelPrimary,
              isSecondary && styles.labelSecondary,
              variant === 'ghost' && styles.labelGhost,
            ]}
          >
            {label}
          </Text>
          {description && (
            <Text
              style={[
                styles.description,
                isPrimary ? styles.descriptionPrimary : styles.descriptionSecondary,
              ]}
            >
              {description}
            </Text>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.pill,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.ink,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.ink,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
  textWrap: {
    alignItems: 'center',
    gap: 2,
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
  },
  labelPrimary: {
    color: '#FFFFFF',
  },
  labelSecondary: {
    color: colors.ink,
  },
  labelGhost: {
    color: colors.textMuted,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: 12,
  },
  descriptionPrimary: {
    color: 'rgba(255,255,255,0.75)',
  },
  descriptionSecondary: {
    color: colors.textMuted,
  },
});
