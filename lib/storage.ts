import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateId } from './id';
import { ActiveCycle, CompletedCycle, Domain, Entry } from './types';

const KEYS = {
  onboarded: 'frogress:onboarded',
  activeCycle: 'frogress:activeCycle',
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

export async function getActiveCycle(): Promise<ActiveCycle | null> {
  return readJson<ActiveCycle>(KEYS.activeCycle);
}

export async function startNewCycle(domain: Domain, periodDays: number): Promise<ActiveCycle> {
  const cycle: ActiveCycle = {
    id: generateId('cycle'),
    domain,
    periodDays,
    startDate: new Date().toISOString(),
    entries: [],
  };
  await writeJson(KEYS.activeCycle, cycle);
  return cycle;
}

export async function hasEntryToday(): Promise<boolean> {
  const cycle = await getActiveCycle();
  if (!cycle) return false;
  const today = new Date().toDateString();
  return cycle.entries.some((e) => new Date(e.date).toDateString() === today);
}

export async function addEntryToActiveCycle(entry: Entry): Promise<ActiveCycle | null> {
  const cycle = await getActiveCycle();
  if (!cycle) return null;
  const updated: ActiveCycle = { ...cycle, entries: [...cycle.entries, entry] };
  await writeJson(KEYS.activeCycle, updated);
  return updated;
}

export async function isCycleComplete(cycle: ActiveCycle): Promise<boolean> {
  return cycle.entries.length >= cycle.periodDays;
}

export async function getCompletedCycles(): Promise<CompletedCycle[]> {
  const list = await readJson<CompletedCycle[]>(KEYS.completedCycles);
  return list ?? [];
}

export async function completeActiveCycle(highlightVideoRef: string): Promise<CompletedCycle | null> {
  const cycle = await getActiveCycle();
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
  await AsyncStorage.removeItem(KEYS.activeCycle);
  return completed;
}

export async function getCompletedCycleById(id: string): Promise<CompletedCycle | null> {
  const list = await getCompletedCycles();
  return list.find((c) => c.id === id) ?? null;
}

/** 진행 중/완료된 사이클을 통틀어 엔트리 id로 단일 기록을 찾는다 (최근 기록 상세보기용). */
export async function getEntryById(entryId: string): Promise<Entry | null> {
  const active = await getActiveCycle();
  const activeMatch = active?.entries.find((e) => e.id === entryId);
  if (activeMatch) return activeMatch;

  const completed = await getCompletedCycles();
  for (const cycle of completed) {
    const match = cycle.entries.find((e) => e.id === entryId);
    if (match) return match;
  }
  return null;
}

export async function resetAll(): Promise<void> {
  await AsyncStorage.multiRemove([KEYS.onboarded, KEYS.activeCycle, KEYS.completedCycles]);
}
