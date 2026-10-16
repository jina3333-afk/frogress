import { Camera, LucideIcon } from 'lucide-react-native';
import React, { useState } from 'react';
import { Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '../theme';

interface Props {
  uri?: string;
  style?: StyleProp<ViewStyle>;
  iconSize?: number;
  /** 플레이스홀더 배경색. 기본은 중립 surface2 — 연못 카드처럼 도메인별로 살짝 다르게 쓸 때만 지정. */
  tintColor?: string;
  /** 플레이스홀더 아이콘 색. 기본은 중립 textMuted. */
  iconColor?: string;
  /** 플레이스홀더 아이콘. 기본은 Camera — 음성 엔트리처럼 성격이 다른 미디어엔 다른 아이콘을 지정. */
  icon?: LucideIcon;
}

/**
 * 기록 사진/동영상 썸네일. uri가 없거나 로드에 실패하면 아이콘 플레이스홀더로 대체한다.
 * 실제 캡처 파이프라인과 무관하게 항상 같은 최소한의 빈 상태를 보여준다.
 */
export function ThumbnailImage({
  uri,
  style,
  iconSize = 20,
  tintColor,
  iconColor,
  icon: Icon = Camera,
}: Props) {
  const [failed, setFailed] = useState(false);
  const showImage = !!uri && !failed;

  return (
    <View style={[styles.wrap, style, tintColor ? { backgroundColor: tintColor } : null]}>
      {showImage ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          onError={() => setFailed(true)}
        />
      ) : (
        <Icon size={iconSize} color={iconColor ?? colors.textMuted} strokeWidth={2} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
