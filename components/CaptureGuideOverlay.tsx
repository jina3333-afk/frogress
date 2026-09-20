import React from 'react';
import { StyleSheet, View } from 'react-native';
import { GuideType } from '../lib/types';

interface Props {
  guideType: GuideType;
}

/**
 * 촬영 가이드 실루엣 오버레이.
 * "큰 오차를 먼저 줄이는" 1차 정렬 역할 (아키텍처 문서: 정렬 보정 전략).
 */
export function CaptureGuideOverlay({ guideType }: Props) {
  if (guideType === 'face_oval') {
    return (
      <View style={styles.fill} pointerEvents="none">
        <View style={styles.faceOval} />
      </View>
    );
  }

  if (guideType === 'body_silhouette') {
    return (
      <View style={styles.fill} pointerEvents="none">
        <View style={styles.bodyHead} />
        <View style={styles.bodyTorso} />
      </View>
    );
  }

  return (
    <View style={styles.fill} pointerEvents="none">
      <View style={styles.customBox} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceOval: {
    width: '58%',
    height: '40%',
    borderRadius: 999,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.85)',
    borderStyle: 'dashed',
  },
  bodyHead: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.85)',
    borderStyle: 'dashed',
    marginBottom: 4,
  },
  bodyTorso: {
    width: '46%',
    height: '55%',
    borderRadius: 40,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.85)',
    borderStyle: 'dashed',
  },
  customBox: {
    width: '70%',
    height: '50%',
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.85)',
    borderStyle: 'dashed',
  },
});
