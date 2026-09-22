import { Camera } from 'lucide-react-native';
import React, { useState } from 'react';
import { Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '../theme';

interface Props {
  uri?: string;
  style?: StyleProp<ViewStyle>;
  iconSize?: number;
}

/**
 * 기록 사진 썸네일. uri가 없거나 로드에 실패하면 카메라 아이콘 플레이스홀더로 대체한다.
 * 실제 캡처 파이프라인과 무관하게 항상 같은 최소한의 빈 상태를 보여준다.
 */
export function ThumbnailImage({ uri, style, iconSize = 20 }: Props) {
  const [failed, setFailed] = useState(false);
  const showImage = !!uri && !failed;

  return (
    <View style={[styles.wrap, style]}>
      {showImage ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          onError={() => setFailed(true)}
        />
      ) : (
        <Camera size={iconSize} color={colors.speciesAccent} strokeWidth={2} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.speciesAccentTint,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
