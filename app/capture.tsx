import { CameraMode, CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { Lightbulb, Mic } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  PermissionResponse,
  RecordingPresets,
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { getThumbnailAsync } from 'expo-video-thumbnails';
import { AudioPreviewPlayer } from '../components/AudioPreviewPlayer';
import { CaptureGuideOverlay } from '../components/CaptureGuideOverlay';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { VideoPreviewPlayer } from '../components/VideoPreviewPlayer';
import { analyzePhoto } from '../lib/analysis';
import { completeCycleIfReady } from '../lib/cycles';
import { getDomainConfig } from '../lib/domains';
import { formatDuration } from '../lib/format';
import { alignEntryMedia } from '../lib/highlight';
import { generateId } from '../lib/id';
import { addEntryToActiveCycle, getActiveCycleById, visibleEntries } from '../lib/storage';
import { Entry, MediaType } from '../lib/types';
import { colors, fonts, radii, spacing, typography } from '../theme';

/** 엔트리 저장 + 사이클 완료 여부에 따른 후속 네비게이션. 캡처 모드(사진/동영상/음성) 공통 로직. */
async function saveEntryAndNavigate(params: {
  cycleId: string;
  domain: string;
  mediaType: MediaType;
  rawMediaRef: string;
  processedMediaRef?: string;
  thumbnailRef?: string;
  metrics: Record<string, number | string>;
}) {
  const entry: Entry = {
    id: generateId('entry'),
    domain: params.domain,
    mediaType: params.mediaType,
    date: new Date().toISOString(),
    rawMediaRef: params.rawMediaRef,
    processedMediaRef: params.processedMediaRef,
    thumbnailRef: params.thumbnailRef,
    metrics: params.metrics,
  };

  await addEntryToActiveCycle(params.cycleId, entry);
  const completed = await completeCycleIfReady(params.cycleId);

  if (completed) {
    router.replace({ pathname: '/highlight', params: { cycleId: params.cycleId } });
  } else {
    router.replace({ pathname: '/home', params: { cycleId: params.cycleId } });
  }
}

export default function Capture() {
  const { cycleId } = useLocalSearchParams<{ cycleId?: string }>();
  const [cycleDomain, setCycleDomain] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!cycleId) {
        router.replace('/dashboard');
        return;
      }
      const cycle = await getActiveCycleById(cycleId);
      if (!cycle || cycle.isPaused) {
        router.replace('/dashboard');
        return;
      }
      setCycleDomain(cycle.domain);
    })();
  }, [cycleId]);

  if (!cycleDomain || !cycleId) {
    return <ScreenContainer />;
  }

  const config = getDomainConfig(cycleDomain);
  return config.mediaType === 'audio' ? (
    <AudioCapture domain={cycleDomain} cycleId={cycleId} />
  ) : (
    <PhotoVideoCapture domain={cycleDomain} cycleId={cycleId} />
  );
}

function PhotoVideoCapture({ domain, cycleId }: { domain: string; cycleId: string }) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [captureMode, setCaptureMode] = useState<CameraMode>('picture');
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [recordingMs, setRecordingMs] = useState(0);

  const config = getDomainConfig(domain);
  const guide = config.captureGuide.shots[0];
  const facing: CameraType = guide.angle === 'front' ? 'front' : 'back';

  useEffect(() => {
    if (!isRecordingVideo) return;
    const start = Date.now();
    const timer = setInterval(() => setRecordingMs(Date.now() - start), 200);
    return () => clearInterval(timer);
  }, [isRecordingVideo]);

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

  async function takePhoto() {
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.6 });
    if (photo?.uri) {
      setPhotoUri(photo.uri);
    }
  }

  async function startVideoRecording() {
    const existing = await getRecordingPermissionsAsync();
    if (!existing.granted) {
      const requested = await requestRecordingPermissionsAsync();
      if (!requested.granted) return;
    }
    setIsRecordingVideo(true);
    setRecordingMs(0);
    const result = await cameraRef.current?.recordAsync();
    setIsRecordingVideo(false);
    if (result?.uri) {
      setVideoUri(result.uri);
    }
  }

  function handleShutterPress() {
    if (captureMode === 'picture') {
      takePhoto();
      return;
    }
    if (isRecordingVideo) {
      cameraRef.current?.stopRecording();
    } else {
      startVideoRecording();
    }
  }

  async function confirmCapture() {
    const uri = photoUri ?? videoUri;
    if (!uri) return;
    setProcessing(true);

    if (photoUri) {
      // AI 정렬 보정 (스텁 — 다음 단계: MediaPipe 랜드마크 기반 2D 정렬). 사진에만 적용.
      const processedUri = await alignEntryMedia(photoUri);
      // 분석 실패(네트워크 오류, API 키 미설정 등)는 analyzePhoto가 null로 삼켜서
      // 돌려준다 — 사진 저장 자체는 분석 성공 여부와 무관하게 항상 진행된다.
      const activeCycle = await getActiveCycleById(cycleId);
      const previousEntries = activeCycle ? visibleEntries(activeCycle.entries) : [];
      const metrics = (await analyzePhoto(photoUri, domain, previousEntries)) ?? {};
      await saveEntryAndNavigate({
        cycleId,
        domain,
        mediaType: 'photo',
        rawMediaRef: photoUri,
        processedMediaRef: processedUri,
        metrics,
      });
    } else if (videoUri) {
      // 썸네일 생성 실패해도(코덱 문제 등) 동영상 저장 자체는 막지 않는다 — 실패하면
      // thumbnailRef 없이 저장되고, 홈/연못에서는 기존 아이콘 플레이스홀더로 대체된다.
      let thumbnailRef: string | undefined;
      try {
        const thumbnail = await getThumbnailAsync(videoUri, { time: 0 });
        thumbnailRef = thumbnail.uri;
      } catch {
        thumbnailRef = undefined;
      }
      await saveEntryAndNavigate({
        cycleId,
        domain,
        mediaType: 'video',
        rawMediaRef: videoUri,
        thumbnailRef,
        metrics: {},
      });
    }

    setProcessing(false);
  }

  if (photoUri || videoUri) {
    return (
      <ScreenContainer style={styles.previewContainer}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.previewImage} />
        ) : (
          <VideoPreviewPlayer uri={videoUri!} style={styles.previewImage} />
        )}
        {processing ? (
          <View style={styles.processingRow}>
            <ActivityIndicator color={colors.textMuted} />
            <Text style={styles.processingText}>저장 처리 중...</Text>
          </View>
        ) : (
          <View style={styles.previewActions}>
            <View style={styles.previewActionItem}>
              <PrimaryButton
                label={photoUri ? '다시 찍기' : '다시 촬영'}
                variant="secondary"
                onPress={() => {
                  setPhotoUri(null);
                  setVideoUri(null);
                }}
              />
            </View>
            <View style={styles.previewActionItem}>
              <PrimaryButton label="저장하기" onPress={confirmCapture} />
            </View>
          </View>
        )}
      </ScreenContainer>
    );
  }

  return (
    <View style={styles.fill}>
      {/* CameraView는 실기기에서 children을 지원하지 않는다(렌더링되지 않음) —
          가이드/버튼은 반드시 형제 엘리먼트로 절대위치 오버레이해야 한다. */}
      <CameraView ref={cameraRef} style={styles.fill} facing={facing} mode={captureMode} />
      <CaptureGuideOverlay guideType={guide.guideType} />
      {config.captureGuide.lightingCheck && !isRecordingVideo && (
        <View style={styles.tipBanner}>
          <Lightbulb size={14} color="#fff" strokeWidth={2.2} />
          <Text style={styles.tipText}>밝은 곳에서 정면을 향해 촬영해주세요</Text>
        </View>
      )}
      {isRecordingVideo && (
        <View style={styles.recordingBadge}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>{formatDuration(recordingMs)}</Text>
        </View>
      )}

      <View style={styles.captureFooter}>
        {!isRecordingVideo && (
          <View style={styles.modeToggle}>
            <Pressable
              onPress={() => setCaptureMode('picture')}
              style={[styles.modeOption, captureMode === 'picture' && styles.modeOptionActive]}
            >
              <Text
                style={[
                  styles.modeOptionText,
                  captureMode === 'picture' && styles.modeOptionTextActive,
                ]}
              >
                사진
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setCaptureMode('video')}
              style={[styles.modeOption, captureMode === 'video' && styles.modeOptionActive]}
            >
              <Text
                style={[
                  styles.modeOptionText,
                  captureMode === 'video' && styles.modeOptionTextActive,
                ]}
              >
                동영상
              </Text>
            </Pressable>
          </View>
        )}

        <View style={styles.controls}>
          <Text
            onPress={isRecordingVideo ? undefined : () => router.back()}
            style={[styles.cancelText, isRecordingVideo && styles.cancelTextDisabled]}
          >
            취소
          </Text>
          <View style={styles.shutterRing}>
            <Text
              onPress={handleShutterPress}
              style={[
                styles.shutter,
                captureMode === 'video' && styles.shutterVideo,
                isRecordingVideo && styles.shutterRecording,
              ]}
              accessibilityRole="button"
              testID="capture-shutter"
            />
          </View>
          <View style={styles.controlsSpacer} />
        </View>
      </View>
    </View>
  );
}

function AudioCapture({ domain, cycleId }: { domain: string; cycleId: string }) {
  const [permission, setPermission] = useState<PermissionResponse | null>(null);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  useEffect(() => {
    (async () => {
      setPermission(await getRecordingPermissionsAsync());
    })();
  }, []);

  async function requestPermission() {
    setPermission(await requestRecordingPermissionsAsync());
  }

  async function startRecording() {
    await recorder.prepareToRecordAsync();
    recorder.record();
  }

  async function stopRecording() {
    await recorder.stop();
    if (recorder.uri) {
      setRecordedUri(recorder.uri);
    }
  }

  async function confirmRecording() {
    if (!recordedUri) return;
    setProcessing(true);
    await saveEntryAndNavigate({
      cycleId,
      domain,
      mediaType: 'audio',
      rawMediaRef: recordedUri,
      metrics: {},
    });
    setProcessing(false);
  }

  if (!permission) {
    return <ScreenContainer />;
  }

  if (!permission.granted) {
    return (
      <ScreenContainer style={styles.centerContent}>
        <Text style={typography.heading}>마이크 접근이 필요해요</Text>
        <Text style={styles.permissionBody}>
          매일 기록 음성을 녹음하려면 마이크 권한을 허용해주세요.
        </Text>
        <PrimaryButton label="권한 허용하기" onPress={requestPermission} />
        <PrimaryButton label="취소" variant="ghost" onPress={() => router.back()} />
      </ScreenContainer>
    );
  }

  if (recordedUri) {
    return (
      <ScreenContainer style={styles.centerContent}>
        <Text style={typography.heading}>녹음을 확인해보세요</Text>
        <AudioPreviewPlayer uri={recordedUri} />
        {processing ? (
          <View style={styles.processingRowStatic}>
            <ActivityIndicator color={colors.textMuted} />
            <Text style={styles.processingText}>저장 처리 중...</Text>
          </View>
        ) : (
          <View style={styles.audioActions}>
            <View style={styles.previewActionItem}>
              <PrimaryButton
                label="다시 녹음"
                variant="secondary"
                onPress={() => setRecordedUri(null)}
              />
            </View>
            <View style={styles.previewActionItem}>
              <PrimaryButton label="저장하기" onPress={confirmRecording} />
            </View>
          </View>
        )}
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={styles.centerContent}>
      <Text style={typography.heading}>
        {recorderState.isRecording ? '녹음 중이에요' : '눌러서 녹음을 시작하세요'}
      </Text>
      <Text style={styles.audioTimer}>{formatDuration(recorderState.durationMillis)}</Text>

      <Pressable
        onPress={recorderState.isRecording ? stopRecording : startRecording}
        style={[styles.audioRecordButton, recorderState.isRecording && styles.audioRecordButtonActive]}
      >
        <Mic size={32} color={recorderState.isRecording ? colors.surface : colors.ink} strokeWidth={2.2} />
      </Pressable>

      <PrimaryButton label="취소" variant="ghost" onPress={() => router.back()} />
    </ScreenContainer>
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
    fontFamily: fonts.body,
    textAlign: 'center',
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  tipBanner: {
    position: 'absolute',
    top: spacing.xl,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  tipText: { fontFamily: fonts.bodySemiBold, color: '#fff', fontSize: 13 },
  recordingBadge: {
    position: 'absolute',
    top: spacing.xl,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  recordingText: { fontFamily: fonts.bodyBold, color: '#fff', fontSize: 13 },
  captureFooter: {
    position: 'absolute',
    bottom: spacing.xl,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: spacing.md,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: radii.pill,
    padding: 3,
    gap: 2,
  },
  modeOption: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
  },
  modeOptionActive: {
    backgroundColor: '#fff',
  },
  modeOptionText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: '#fff',
  },
  modeOptionTextActive: {
    color: colors.ink,
  },
  controls: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
  },
  cancelText: { fontFamily: fonts.bodySemiBold, color: '#fff', fontSize: 15, width: 60 },
  cancelTextDisabled: { opacity: 0.35 },
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
  shutterVideo: {
    backgroundColor: colors.danger,
  },
  shutterRecording: {
    width: 28,
    height: 28,
    borderRadius: 6,
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
  processingRowStatic: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  processingText: { fontFamily: fonts.bodySemiBold, color: colors.text },
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
  audioTimer: {
    fontFamily: fonts.titleBold,
    fontSize: 36,
    color: colors.text,
  },
  audioRecordButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.surface2,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioRecordButtonActive: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  audioActions: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
    paddingHorizontal: spacing.lg,
  },
});
