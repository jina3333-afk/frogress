import React from 'react';
import { StyleSheet, View } from 'react-native';
import { lerpColor } from '../lib/color';
import { colors } from '../theme';

interface Props {
  /** 0~1 진행률. 0=알, 1=완전한 개구리 */
  progress: number;
  size?: number;
}

/**
 * "가랑비에 옷 젖듯" 컨셉을 표현하는 성장 인디케이터.
 * 진행률에 따라 올챙이(꼬리) -> 개구리(다리)로 형태와 색이 서서히 바뀐다.
 */
export function FrogGrowth({ progress, size = 72 }: Props) {
  const p = Math.max(0, Math.min(1, progress));
  const bodyColor = lerpColor(colors.tadpole, colors.speciesAccent, p);
  const tailScale = Math.max(0, 1 - p * 1.6); // 60% 지점부터 꼬리 사라짐
  const legOpacity = Math.min(1, Math.max(0, (p - 0.35) / 0.4)); // 35~75% 구간에서 다리 등장

  const bodySize = size * 0.62;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      {tailScale > 0 && (
        <View
          style={[
            styles.tail,
            {
              backgroundColor: bodyColor,
              width: size * 0.5 * tailScale,
              height: bodySize * 0.34,
              left: size * 0.02,
              top: size * 0.5 - (bodySize * 0.34) / 2,
              opacity: Math.min(1, tailScale + 0.2),
            },
          ]}
        />
      )}

      {/* 뒷다리 */}
      <View
        style={[
          styles.leg,
          {
            backgroundColor: bodyColor,
            opacity: legOpacity,
            left: size * 0.14,
            top: size * 0.66,
            transform: [{ rotate: '25deg' }],
          },
        ]}
      />
      <View
        style={[
          styles.leg,
          {
            backgroundColor: bodyColor,
            opacity: legOpacity,
            right: size * 0.14,
            top: size * 0.66,
            transform: [{ rotate: '-25deg' }],
          },
        ]}
      />

      {/* 몸통 */}
      <View
        style={[
          styles.body,
          {
            width: bodySize,
            height: bodySize,
            borderRadius: bodySize / 2,
            backgroundColor: bodyColor,
            left: size / 2 - bodySize / 2,
            top: size / 2 - bodySize / 2,
          },
        ]}
      >
        <View style={styles.eyesRow}>
          <View style={styles.eye}>
            <View style={styles.pupil} />
          </View>
          <View style={styles.eye}>
            <View style={styles.pupil} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: '20%',
  },
  tail: {
    position: 'absolute',
    borderRadius: 40,
  },
  leg: {
    position: 'absolute',
    width: 14,
    height: 8,
    borderRadius: 4,
  },
  eyesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  eye: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pupil: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#1E2B23',
  },
});
