import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { CaptureGuideOverlay } from '../components/CaptureGuideOverlay';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { getDomainConfig } from '../lib/domains';
import { PhotoTimelapseGenerator, alignEntryMedia } from '../lib/highlight';
import { generateId } from '../lib/id';
import {
  addEntryToActiveCycle,
  completeActiveCycle,
  getActiveCycle,
} from '../lib/storage';
import { Entry } from '../lib/types';
import { colors, radii, spacing, typography } from '../theme';

export default function Capture() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [cycleDomain, setCycleDomain] = useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      const cycle = await getActiveCycle();
      if (!cycle) {
        router.replace('/onboarding');
        return;
      }
      setCycleDomain(cycle.domain);
    })();
  }, []);

  if (!permission) {
    return <ScreenContainer />;
  }

  if (!permission.granted) {
    return (
      <ScreenContainer style={styles.centerContent}>
        <Text style={typography.heading}>카메라 접근이 필요해요</Text>
        <Text style={styles.permissionBody}>
          매일 기록 사진을 찍으려면 카메라 권한을 허용해주세요.
        </Text>
        <PrimaryButton label="권한 허용하기" onPress={requestPermission} />
        <PrimaryButton label="취소" variant="ghost" onPress={() => router.back()} />
      </ScreenContainer>
    );
  }

  if (!cycleDomain) {
    return <ScreenContainer />;
  }

  const domain: string = cycleDomain;
  const config = getDomainConfig(domain);
  const guide = config.captureGuide.shots[0];
  const facing: CameraType = guide.angle === 'front' ? 'front' : 'back';

  async function takePhoto() {
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.6 });
    if (photo?.uri) {
      setPhotoUri(photo.uri);
    }
  }

  async function confirmPhoto() {
    if (!photoUri) return;
    setProcessing(true);

    // AI 정렬 보정 (스텁 — 다음 단계: MediaPipe 랜드마크 기반 2D 정렬)
    const processedUri = await alignEntryMedia(photoUri);

    const entry: Entry = {
      id: generateId('entry'),
      domain,
      mediaType: 'photo',
      date: new Date().toISOString(),
      rawMediaRef: photoUri,
      processedMediaRef: processedUri,
      metrics: {},
    };

    const updatedCycle = await addEntryToActiveCycle(entry);
    setProcessing(false);

    if (updatedCycle && updatedCycle.entries.length >= updatedCycle.periodDays) {
      const generator = new PhotoTimelapseGenerator();
      const highlight = await generator.generate(updatedCycle.entries);
      await completeActiveCycle(highlight.ref);
      router.replace('/highlight');
    } else {
      router.replace('/home');
    }
  }

  if (photoUri) {
    return (
      <ScreenContainer style={styles.previewContainer}>
        <Image source={{ uri: photoUri }} style={styles.previewImage} />
        {processing ? (
          <View style={styles.processingRow}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.processingText}>정렬 보정 중...</Text>
          </View>
        ) : (
          <View style={styles.previewActions}>
            <View style={styles.previewActionItem}>
              <PrimaryButton label="다시 찍기" variant="secondary" onPress={() => setPhotoUri(null)} />
            </View>
            <View style={styles.previewActionItem}>
              <PrimaryButton label="저장하기" onPress={confirmPhoto} />
            </View>
          </View>
        )}
      </ScreenContainer>
    );
  }

  return (
    <View style={styles.fill}>
      <CameraView ref={cameraRef} style={styles.fill} facing={facing}>
        <CaptureGuideOverlay guideType={guide.guideType} />
        {config.captureGuide.lightingCheck && (
          <View style={styles.tipBanner}>
            <Text style={styles.tipText}>💡 밝은 곳에서 정면을 향해 촬영해주세요</Text>
          </View>
        )}
        <View style={styles.controls}>
          <Text onPress={() => router.back()} style={styles.cancelText}>
            취소
          </Text>
          <View style={styles.shutterRing}>
            <Text onPress={takePhoto} style={styles.shutter} accessibilityRole="button" />
          </View>
          <View style={styles.controlsSpacer} />
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  permissionBody: {
    textAlign: 'center',
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  tipBanner: {
    position: 'absolute',
    top: spacing.xl,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  tipText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  controls: {
    position: 'absolute',
    bottom: spacing.xl,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
  },
  cancelText: { color: '#fff', fontSize: 15, fontWeight: '600', width: 60 },
  controlsSpacer: { width: 60 },
  shutterRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  previewContainer: { padding: 0 },
  previewImage: { flex: 1, borderRadius: 0 },
  processingRow: {
    position: 'absolute',
    bottom: spacing.xxl,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  processingText: { fontWeight: '600', color: colors.text },
  previewActions: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
  },
  previewActionItem: {
    flex: 1,
  },
});
