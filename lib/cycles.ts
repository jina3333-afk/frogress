import { PhotoTimelapseGenerator } from './highlight';
import { completeActiveCycle, getActiveCycleById, visibleEntries } from './storage';
import { CompletedCycle } from './types';

/**
 * periodDays만큼 기록이 이미 차 있으면(엔트리를 새로 추가했을 때든, periodDays 자체를
 * 줄였을 때든) 사이클을 완료 처리한다. 캡처 직후와 "기록 기간 수정하기" 양쪽에서 쓰는
 * 공통 완료 로직 — 완료 시 하이라이트가 생성되고 completedCycles로 옮겨진다.
 */
export async function completeCycleIfReady(cycleId: string): Promise<CompletedCycle | null> {
  const cycle = await getActiveCycleById(cycleId);
  if (!cycle) return null;
  const entries = visibleEntries(cycle.entries);
  if (entries.length < cycle.periodDays) return null;

  const generator = new PhotoTimelapseGenerator();
  const highlight = await generator.generate(entries);
  return completeActiveCycle(cycleId, highlight.ref);
}
