import { BlurView } from 'expo-blur';
import { EyeOff, LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { ThumbnailImage } from './ThumbnailImage';

interface Props {
  uri?: string;
  style?: StyleProp<ViewStyle>;
  iconSize?: number;
  tintColor?: string;
  iconColor?: string;
  icon?: LucideIcon;
  /** 민감한 도메인이면 기본적으로 블러 처리한다. */
  isSensitive: boolean;
  /** 지금 선명하게 공개된 상태인지 — 상위 화면이 관리한다(한 번에 하나만, 다른 곳을 탭하거나 화면을 벗어나면 초기화). */
  revealed: boolean;
  /** 블러된 상태에서 탭했을 때 — 상위 화면이 revealed를 true로 바꿔준다. */
  onRevealPress: () => void;
  /** 블러 오버레이가 탭을 가로채는 동안에도 길게 누르기는 그대로 동작해야 하는 화면(연못 카드)에서 전달. */
  onLongPress?: () => void;
  testID?: string;
}

/**
 * ThumbnailImage 위에 민감한 기록용 블러 오버레이를 얹는다. 블러 상태에서 탭하면
 * onRevealPress만 호출하고(상위의 onPress로는 전파되지 않는다 — Pressable 중첩이라 터치를
 * 이 오버레이가 가로챈다), 공개된 뒤에는 오버레이가 사라져 평소처럼 아래 콘텐츠가 탭을 받는다.
 */
export function SensitiveThumbnail({
  uri,
  style,
  iconSize,
  tintColor,
  iconColor,
  icon,
  isSensitive,
  revealed,
  onRevealPress,
  onLongPress,
  testID,
}: Props) {
  const blurred = isSensitive && !revealed;

  return (
    <View style={[style, styles.clip]}>
      <ThumbnailImage
        uri={uri}
        style={styles.fill}
        iconSize={iconSize}
        tintColor={tintColor}
        iconColor={iconColor}
        icon={icon}
      />
      {blurred && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onRevealPress}
          onLongPress={onLongPress}
          testID={testID}
        >
          <BlurView intensity={80} tint="default" style={styles.blur}>
            <EyeOff size={(iconSize ?? 20) + 2} color="#fff" strokeWidth={2.2} />
          </BlurView>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  blur: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
