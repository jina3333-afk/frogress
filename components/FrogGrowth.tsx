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
  const bodyColor = lerpColor(colors.speciesAccentSoft, colors.speciesAccent, p);
  const tailScale = Math.max(0, 1 - p * 1.6); // 60% 지점부터 꼬리 사라짐
  const legOpacity = Math.min(1, Math.max(0, (p - 0.35) / 0.4)); // 35~75% 구간에서 다리 등장

  const bodySize = size * 0.72; // 더 둥글고 통통하게
  const eyeSize = bodySize * 0.26;
  const eyeGap = bodySize * 0.3; // 눈 간격을 넓게
  const pupilSize = eyeSize * 0.52;
  const mouthWidth = bodySize * 0.32;
  const mouthHeight = mouthWidth * 0.55;
  const mouthStroke = Math.max(1.5, size * 0.022);

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
            left: size * 0.12,
            top: size * 0.68,
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
            right: size * 0.12,
            top: size * 0.68,
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
        <View style={[styles.eyesRow, { gap: eyeGap }]}>
          <View style={[styles.eye, { width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2 }]}>
            <View
              style={[
                styles.pupil,
                { width: pupilSize, height: pupilSize, borderRadius: pupilSize / 2 },
              ]}
            />
          </View>
          <View style={[styles.eye, { width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2 }]}>
            <View
              style={[
                styles.pupil,
                { width: pupilSize, height: pupilSize, borderRadius: pupilSize / 2 },
              ]}
            />
          </View>
        </View>

        {/* 웃는 입 */}
        <View
          style={{
            marginTop: eyeSize * 0.4,
            width: mouthWidth,
            height: mouthHeight,
            borderBottomLeftRadius: mouthHeight,
            borderBottomRightRadius: mouthHeight,
            borderBottomWidth: mouthStroke,
            borderColor: colors.text,
          }}
        />
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
  },
  eye: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pupil: {
    backgroundColor: colors.text,
  },
});
