import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateId } from './id';
import { ActiveCycle, CompletedCycle, Domain, Entry } from './types';

const KEYS = {
  onboarded: 'frogress:onboarded',
  /** 도메인별로 동시에 여러 개가 진행될 수 있어 배열로 저장한다 (도메인당 최대 1개). */
  activeCycles: 'frogress:activeCycles',
  /** 이전 버전에서 쓰던 단일 사이클 키 — 마이그레이션 용도로만 읽는다. */
  legacyActiveCycle: 'frogress:activeCycle',
  completedCycles: 'frogress:completedCycles',
  /** 커스텀 도메인 이름 → 선택한 아이콘 키. */
  customDomainIcons: 'frogress:customDomainIcons',
};

// AsyncStorage 네이티브 모듈이 죽어있거나(버전 불일치), 디스크 I/O가 실패하는 등
// 어떤 이유로든 읽기/쓰기가 거부될 수 있다 — 이 레이어가 그 예외를 전부 삼켜서,
// 호출부(화면들)는 항상 "그냥 빈 상태"를 받고 영구 로딩에 멈추지 않도록 한다.
async function readJson<T>(key: string): Promise<T | null> {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(key);
  } catch (error) {
    console.warn(`[storage] getItem(${key}) failed`, error);
    return null;
  }
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`[storage] setItem(${key}) failed`, error);
  }
}

export async function hasOnboarded(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEYS.onboarded)) === '1';
  } catch (error) {
    console.warn('[storage] hasOnboarded failed', error);
    return false;
  }
}

export async function markOnboarded(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.onboarded, '1');
  } catch (error) {
    console.warn('[storage] markOnboarded failed', error);
  }
}

export async function getActiveCycles(): Promise<ActiveCycle[]> {
  const list = await readJson<ActiveCycle[]>(KEYS.activeCycles);
  if (list) return list;

  // 단일-사이클 시절 데이터가 남아있으면 배열 형태로 1회 마이그레이션한다.
  const legacy = await readJson<ActiveCycle>(KEYS.legacyActiveCycle);
  if (legacy) {
    await writeJson(KEYS.activeCycles, [legacy]);
    try {
      await AsyncStorage.removeItem(KEYS.legacyActiveCycle);
    } catch (error) {
      console.warn('[storage] removing legacy key failed', error);
    }
    return [legacy];
  }
  return [];
}

export async function getActiveCycleById(cycleId: string): Promise<ActiveCycle | null> {
  const list = await getActiveCycles();
  return list.find((c) => c.id === cycleId) ?? null;
}

/** 보관된 사이클을 제외한 목록 — 대시보드 등 "활성" 목록에 쓴다. */
export function visibleCycles(cycles: ActiveCycle[]): ActiveCycle[] {
  return cycles.filter((c) => !c.isArchived);
}

export async function getActiveCycleByDomain(domain: Domain): Promise<ActiveCycle | null> {
  const list = await getActiveCycles();
  return list.find((c) => c.domain === domain && !c.isArchived) ?? null;
}

/**
 * 같은 도메인의 기존 활성(보관되지 않은) 사이클이 있으면 교체하고, 없으면 추가한다.
 * 보관된 사이클은 건드리지 않는다 — "처음부터 다시 시작"이 바로 이 함수를 재사용해서,
 * 기존 보관된 기록은 그대로 둔 채 같은 도메인의 새 사이클을 나란히 만들 수 있게 한다.
 */
export async function startNewCycle(domain: Domain, periodDays: number): Promise<ActiveCycle> {
  const cycle: ActiveCycle = {
    id: generateId('cycle'),
    domain,
    periodDays,
    startDate: new Date().toISOString(),
    entries: [],
  };
  const list = await getActiveCycles();
  const next = [...list.filter((c) => c.domain !== domain || c.isArchived), cycle];
  await writeJson(KEYS.activeCycles, next);
  return cycle;
}

/** 도메인을 보관 처리한다 — entries는 그대로 두고 대시보드 활성 목록에서만 뺀다. */
export async function archiveCycle(cycleId: string): Promise<void> {
  const list = await getActiveCycles();
  const next = list.map((c) =>
    c.id === cycleId ? { ...c, isArchived: true, archivedAt: new Date().toISOString() } : c
  );
  await writeJson(KEYS.activeCycles, next);
}

/**
 * 보관 해제 — 도메인당 활성 사이클은 최대 1개여야 하므로, 같은 도메인에 이미 다른
 * 활성 사이클이 있으면(예: 보관해둔 사이 "처음부터 다시 시작"을 눌렀던 경우) 그것부터
 * 보관 처리한 뒤 대상 사이클을 복귀시킨다.
 */
export async function unarchiveCycle(cycleId: string): Promise<void> {
  const list = await getActiveCycles();
  const target = list.find((c) => c.id === cycleId);
  if (!target) return;
  const next = list.map((c) => {
    if (c.id === cycleId) {
      return { ...c, isArchived: false, archivedAt: undefined };
    }
    if (c.domain === target.domain && !c.isArchived) {
      return { ...c, isArchived: true, archivedAt: new Date().toISOString() };
    }
    return c;
  });
  await writeJson(KEYS.activeCycles, next);
}

/** 보관된 도메인(사이클)을 최근 보관된 순으로 모아온다 ("최근 삭제" 화면용). */
export async function getArchivedCycles(): Promise<ActiveCycle[]> {
  const list = await getActiveCycles();
  return list
    .filter((c) => c.isArchived)
    .sort(
      (a, b) =>
        new Date(b.archivedAt ?? b.startDate).getTime() -
        new Date(a.archivedAt ?? a.startDate).getTime()
    );
}

/** 삭제(보관 처리)된 엔트리를 제외한 목록 — 진행률/통계/하이라이트 등 모든 소비처에서 써야 한다. */
export function visibleEntries(entries: Entry[]): Entry[] {
  return entries.filter((e) => !e.isArchived);
}

export async function hasEntryToday(cycleId: string): Promise<boolean> {
  const cycle = await getActiveCycleById(cycleId);
  if (!cycle) return false;
  const today = new Date().toDateString();
  return visibleEntries(cycle.entries).some((e) => new Date(e.date).toDateString() === today);
}

export async function addEntryToActiveCycle(
  cycleId: string,
  entry: Entry
): Promise<ActiveCycle | null> {
  const list = await getActiveCycles();
  const idx = list.findIndex((c) => c.id === cycleId);
  if (idx === -1) return null;
  const updated: ActiveCycle = { ...list[idx], entries: [...list[idx].entries, entry] };
  const next = [...list];
  next[idx] = updated;
  await writeJson(KEYS.activeCycles, next);
  return updated;
}

export async function isCycleComplete(cycle: ActiveCycle): Promise<boolean> {
  return visibleEntries(cycle.entries).length >= cycle.periodDays;
}

export async function getCompletedCycles(): Promise<CompletedCycle[]> {
  const list = await readJson<CompletedCycle[]>(KEYS.completedCycles);
  return list ?? [];
}

export async function completeActiveCycle(
  cycleId: string,
  highlightVideoRef: string
): Promise<CompletedCycle | null> {
  const list = await getActiveCycles();
  const cycle = list.find((c) => c.id === cycleId);
  if (!cycle) return null;

  const completed: CompletedCycle = {
    id: cycle.id,
    domain: cycle.domain,
    periodDays: cycle.periodDays,
    completedAt: new Date().toISOString(),
    entryCount: visibleEntries(cycle.entries).length,
    highlightVideoRef,
    // 보관 처리된 엔트리도 포함해서 그대로 들고 간다 — 완료 후에도 "최근 삭제"에서 계속 복구할 수 있어야 한다.
    entries: cycle.entries,
  };

  const existing = await getCompletedCycles();
  await writeJson(KEYS.completedCycles, [completed, ...existing]);
  await writeJson(
    KEYS.activeCycles,
    list.filter((c) => c.id !== cycleId)
  );
  return completed;
}

export async function getCompletedCycleById(id: string): Promise<CompletedCycle | null> {
  const list = await getCompletedCycles();
  return list.find((c) => c.id === id) ?? null;
}

/** 진행 중/완료된 사이클을 통틀어 엔트리 id로 단일 기록을 찾는다 (최근 기록 상세보기용). */
export async function getEntryById(entryId: string): Promise<Entry | null> {
  const active = await getActiveCycles();
  for (const cycle of active) {
    const match = cycle.entries.find((e) => e.id === entryId);
    if (match) return match;
  }

  const completed = await getCompletedCycles();
  for (const cycle of completed) {
    const match = cycle.entries.find((e) => e.id === entryId);
    if (match) return match;
  }
  return null;
}

/** entryId를 활성/완료 사이클 전체에서 찾아 isArchived를 바꾸고 저장한다. */
async function setEntryArchived(entryId: string, archived: boolean): Promise<void> {
  function withUpdatedEntry<T extends { entries: Entry[] }>(cycle: T): { cycle: T; changed: boolean } {
    const idx = cycle.entries.findIndex((e) => e.id === entryId);
    if (idx === -1) return { cycle, changed: false };
    const entries = [...cycle.entries];
    entries[idx] = {
      ...entries[idx],
      isArchived: archived,
      archivedAt: archived ? new Date().toISOString() : undefined,
    };
    return { cycle: { ...cycle, entries }, changed: true };
  }

  const activeList = await getActiveCycles();
  let activeChanged = false;
  const nextActive = activeList.map((cycle) => {
    const result = withUpdatedEntry(cycle);
    if (result.changed) activeChanged = true;
    return result.cycle;
  });
  if (activeChanged) {
    await writeJson(KEYS.activeCycles, nextActive);
    return;
  }

  const completedList = await getCompletedCycles();
  let completedChanged = false;
  const nextCompleted = completedList.map((cycle) => {
    const result = withUpdatedEntry(cycle);
    if (result.changed) completedChanged = true;
    return result.cycle;
  });
  if (completedChanged) {
    await writeJson(KEYS.completedCycles, nextCompleted);
  }
}

export async function archiveEntry(entryId: string): Promise<void> {
  await setEntryArchived(entryId, true);
}

export async function unarchiveEntry(entryId: string): Promise<void> {
  await setEntryArchived(entryId, false);
}

/** 삭제(보관 처리)된 엔트리를 최근 삭제된 순으로 전부 모아온다 ("최근 삭제" 화면용). */
export async function getArchivedEntries(): Promise<Entry[]> {
  const active = await getActiveCycles();
  const completed = await getCompletedCycles();
  const all: Entry[] = [];
  for (const cycle of active) all.push(...cycle.entries);
  for (const cycle of completed) all.push(...cycle.entries);
  return all
    .filter((e) => e.isArchived)
    .sort(
      (a, b) =>
        new Date(b.archivedAt ?? b.date).getTime() - new Date(a.archivedAt ?? a.date).getTime()
    );
}

export async function getCustomDomainIcons(): Promise<Record<string, string>> {
  const map = await readJson<Record<string, string>>(KEYS.customDomainIcons);
  return map ?? {};
}

export async function saveCustomDomainIcon(domain: string, iconKey: string): Promise<void> {
  const map = await getCustomDomainIcons();
  await writeJson(KEYS.customDomainIcons, { ...map, [domain]: iconKey });
}

export async function resetAll(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      KEYS.onboarded,
      KEYS.activeCycles,
      KEYS.legacyActiveCycle,
      KEYS.completedCycles,
      KEYS.customDomainIcons,
    ]);
  } catch (error) {
    console.warn('[storage] resetAll failed', error);
  }
}
