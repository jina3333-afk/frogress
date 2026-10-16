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
};

async function readJson<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function hasOnboarded(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(KEYS.onboarded);
  return raw === '1';
}

export async function markOnboarded(): Promise<void> {
  await AsyncStorage.setItem(KEYS.onboarded, '1');
}

export async function getActiveCycles(): Promise<ActiveCycle[]> {
  const list = await readJson<ActiveCycle[]>(KEYS.activeCycles);
  if (list) return list;

  // 단일-사이클 시절 데이터가 남아있으면 배열 형태로 1회 마이그레이션한다.
  const legacy = await readJson<ActiveCycle>(KEYS.legacyActiveCycle);
  if (legacy) {
    await writeJson(KEYS.activeCycles, [legacy]);
    await AsyncStorage.removeItem(KEYS.legacyActiveCycle);
    return [legacy];
  }
  return [];
}

export async function getActiveCycleById(cycleId: string): Promise<ActiveCycle | null> {
  const list = await getActiveCycles();
  return list.find((c) => c.id === cycleId) ?? null;
}

export async function getActiveCycleByDomain(domain: Domain): Promise<ActiveCycle | null> {
  const list = await getActiveCycles();
  return list.find((c) => c.domain === domain) ?? null;
}

/** 같은 도메인의 기존 활성 사이클이 있으면 교체하고, 없으면 추가한다. */
export async function startNewCycle(domain: Domain, periodDays: number): Promise<ActiveCycle> {
  const cycle: ActiveCycle = {
    id: generateId('cycle'),
    domain,
    periodDays,
    startDate: new Date().toISOString(),
    entries: [],
  };
  const list = await getActiveCycles();
  const next = [...list.filter((c) => c.domain !== domain), cycle];
  await writeJson(KEYS.activeCycles, next);
  return cycle;
}

export async function hasEntryToday(cycleId: string): Promise<boolean> {
  const cycle = await getActiveCycleById(cycleId);
  if (!cycle) return false;
  const today = new Date().toDateString();
  return cycle.entries.some((e) => new Date(e.date).toDateString() === today);
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
  return cycle.entries.length >= cycle.periodDays;
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
    entryCount: cycle.entries.length,
    highlightVideoRef,
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

export async function resetAll(): Promise<void> {
  await AsyncStorage.multiRemove([
    KEYS.onboarded,
    KEYS.activeCycles,
    KEYS.legacyActiveCycle,
    KEYS.completedCycles,
  ]);
}
