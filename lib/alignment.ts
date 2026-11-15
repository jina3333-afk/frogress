import { LandmarkPoints } from './types';

/** 두 기준점의 거리가 사진 가로/세로 대비 이 비율보다 가까우면(거의 겹쳐 보임) 계산이
 * 불안정해지므로 신뢰하지 않는다. */
const MIN_NORMALIZED_DISTANCE = 0.02;
/** 보정에 필요한 확대/축소 비율이 이 범위를 벗어나면 좌표 추정이 잘못됐다고 보고 포기한다 —
 * 일상 사진에서 이 정도로 크게 다시 찍힐 일은 거의 없다. */
const MAX_SCALE_RATIO = 2;
/** 회전 보정 각도가 이 값을 넘으면 포기한다 — 약간의 기울어짐을 바로잡는 용도일 뿐, 큰
 * 회전은 모델이 좌표를 잘못 짚었을 가능성이 더 크다. */
const MAX_ROTATION_DEG = 30;

export interface SimilarityTransform {
  /** 확대/축소 배율. */
  scale: number;
  /** 회전각(도). */
  rotationDeg: number;
  /** 두 기준점 중점을 피벗으로 회전/확대한 뒤 추가로 옮겨야 할 양 — target 사진 가로/세로에 대한 비율. */
  translateX: number;
  translateY: number;
  /** 회전/확대의 기준점(target 사진 자신의 두 기준점 중점) — target 가로/세로에 대한 비율. */
  pivotX: number;
  pivotY: number;
}

function isFiniteLandmarks(points: LandmarkPoints): boolean {
  return [points.left.x, points.left.y, points.right.x, points.right.y].every((n) => Number.isFinite(n));
}

/**
 * target 사진의 landmarkPoints(눈 중심/어깨 등 대응점 2개)를 reference 사진의 것과 비교해서,
 * target을 reference에 맞춰 보여주기 위한 이동/회전/확대축소 값을 계산한다 — 표준적인 2점
 * 유사변환(similarity transform) 공식: 두 점을 잇는 벡터의 길이 비(scale)와 각도 차(rotation)를
 * 구하고, 두 점의 중점이 겹치도록 평행이동(translate)을 더한다.
 *
 * 좌표는 각 사진 자신의 가로/세로에 대한 0~1 비율로 저장되어 있다. 화면에 어떤 크기로
 * 그리든(React Native Image, resizeMode="cover") 렌더링 폭/높이를 곱하기만 하면 그대로 쓸 수
 * 있다 — 완벽한 기하 보정이 아니라 "보기 좋게 맞춰주는" 용도라 이 정도 근사로 충분하다.
 *
 * reference/target 중 하나라도 없거나, confidence가 'low'이거나, 두 점이 사실상 겹쳐있거나,
 * 계산된 보정값이 비정상적으로 크면(모델이 좌표를 잘못 짚었을 가능성) null을 반환한다 —
 * 호출부는 이 경우 보정 없이 원본 그대로 보여줘야 한다.
 */
export function computeSimilarityTransform(
  reference: LandmarkPoints | null | undefined,
  target: LandmarkPoints | null | undefined
): SimilarityTransform | null {
  if (!reference || !target) return null;
  if (reference.confidence === 'low' || target.confidence === 'low') return null;
  if (!isFiniteLandmarks(reference) || !isFiniteLandmarks(target)) return null;

  const refDx = reference.right.x - reference.left.x;
  const refDy = reference.right.y - reference.left.y;
  const refDist = Math.hypot(refDx, refDy);

  const tgtDx = target.right.x - target.left.x;
  const tgtDy = target.right.y - target.left.y;
  const tgtDist = Math.hypot(tgtDx, tgtDy);

  if (refDist < MIN_NORMALIZED_DISTANCE || tgtDist < MIN_NORMALIZED_DISTANCE) return null;

  const scale = refDist / tgtDist;
  if (!Number.isFinite(scale) || scale < 1 / MAX_SCALE_RATIO || scale > MAX_SCALE_RATIO) return null;

  const refAngle = Math.atan2(refDy, refDx);
  const tgtAngle = Math.atan2(tgtDy, tgtDx);
  const rotationDeg = ((refAngle - tgtAngle) * 180) / Math.PI;
  if (Math.abs(rotationDeg) > MAX_ROTATION_DEG) return null;

  const refMidX = (reference.left.x + reference.right.x) / 2;
  const refMidY = (reference.left.y + reference.right.y) / 2;
  const tgtMidX = (target.left.x + target.right.x) / 2;
  const tgtMidY = (target.left.y + target.right.y) / 2;

  return {
    scale,
    rotationDeg,
    translateX: refMidX - tgtMidX,
    translateY: refMidY - tgtMidY,
    pivotX: tgtMidX,
    pivotY: tgtMidY,
  };
}

/**
 * computeSimilarityTransform의 결과(비율 좌표계)를 실제 렌더링 크기(픽셀)에 맞춰 React
 * Native의 transform 스타일 배열로 바꾼다. 피벗 기준으로 회전/확대한 뒤 제자리로 되돌리고
 * 최종 이동을 더하는, transform-origin이 없는 RN에서 흔히 쓰는 방식이다.
 */
export function buildAlignmentTransform(
  transform: SimilarityTransform,
  renderedWidth: number,
  renderedHeight: number
) {
  const pivotX = transform.pivotX * renderedWidth;
  const pivotY = transform.pivotY * renderedHeight;
  const translateX = transform.translateX * renderedWidth;
  const translateY = transform.translateY * renderedHeight;

  return [
    { translateX },
    { translateY },
    { translateX: pivotX },
    { translateY: pivotY },
    { rotate: `${transform.rotationDeg}deg` },
    { scale: transform.scale },
    { translateX: -pivotX },
    { translateY: -pivotY },
  ];
}

/** Entry.metrics.landmarkPoints 값을 LandmarkPoints로 안전하게 좁힌다(number | string일 수도 있으므로). */
export function asLandmarkPoints(value: unknown): LandmarkPoints | null {
  if (typeof value !== 'object' || value === null) return null;
  const candidate = value as Partial<LandmarkPoints>;
  if (!candidate.left || !candidate.right || !candidate.confidence) return null;
  return candidate as LandmarkPoints;
}
