import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react';
import type { PlayerProfile, HandObservation } from '../poker/profile';
import type { QuizRecord, SessionEntry, SessionLimit } from '../poker/practice';
import { SAMPLE_PROFILES, SAMPLE_IDEAS } from '../data/samples';

export interface HistoryItem {
  id: string;
  ts: number;
  kind: 'equity' | 'hand' | 'drill';
  title: string;
  detail: string;
}
export interface Idea { id: string; text: string; zeroCost: boolean; done: boolean }
export interface Settings { animals: boolean; haptics: boolean }

export interface AppState {
  version: 1;
  profiles: PlayerProfile[];
  quiz: QuizRecord[];
  history: HistoryItem[];
  session: { entries: SessionEntry[]; limit: SessionLimit };
  ideas: Idea[];
  settings: Settings;
}

export const initialState = (): AppState => ({
  version: 1,
  profiles: SAMPLE_PROFILES(),
  quiz: [],
  history: [],
  session: { entries: [], limit: { maxLoss: 20, currency: 'CA$' } },
  ideas: SAMPLE_IDEAS(),
  settings: { animals: true, haptics: true },
});

export type Act =
  | { t: 'profile/add'; p: PlayerProfile }
  | { t: 'profile/remove'; id: string }
  | { t: 'profile/update'; id: string; patch: Partial<PlayerProfile> }
  | { t: 'profile/observe'; id: string; obs: HandObservation }
  | { t: 'profile/undo'; id: string }
  | { t: 'quiz/add'; r: QuizRecord }
  | { t: 'quiz/clear' }
  | { t: 'history/add'; h: HistoryItem }
  | { t: 'history/remove'; id: string }
  | { t: 'history/clear' }
  | { t: 'session/add'; e: SessionEntry }
  | { t: 'session/remove'; id: string }
  | { t: 'session/reset' }
  | { t: 'session/limit'; limit: SessionLimit }
  | { t: 'idea/add'; idea: Idea }
  | { t: 'idea/update'; id: string; patch: Partial<Idea> }
  | { t: 'idea/remove'; id: string }
  | { t: 'settings'; patch: Partial<Settings> }
  | { t: 'reset' };

const cap = <T,>(a: T[], n = 500) => a.slice(0, n);

export function reducer(s: AppState, a: Act): AppState {
  switch (a.t) {
    case 'profile/add': return { ...s, profiles: [a.p, ...s.profiles] };
    case 'profile/remove': return { ...s, profiles: s.profiles.filter((p) => p.id !== a.id) };
    case 'profile/update': return { ...s, profiles: s.profiles.map((p) => (p.id === a.id ? { ...p, ...a.patch } : p)) };
    case 'profile/observe':
      return { ...s, profiles: s.profiles.map((p) => (p.id === a.id ? { ...p, hands: cap([a.obs, ...p.hands], 2000) } : p)) };
    case 'profile/undo':
      return { ...s, profiles: s.profiles.map((p) => (p.id === a.id ? { ...p, hands: p.hands.slice(1) } : p)) };
    case 'quiz/add': return { ...s, quiz: cap([a.r, ...s.quiz], 1000) };
    case 'quiz/clear': return { ...s, quiz: [] };
    case 'history/add': return { ...s, history: cap([a.h, ...s.history]) };
    case 'history/remove': return { ...s, history: s.history.filter((h) => h.id !== a.id) };
    case 'history/clear': return { ...s, history: [] };
    case 'session/add': return { ...s, session: { ...s.session, entries: [a.e, ...s.session.entries] } };
    case 'session/remove': return { ...s, session: { ...s.session, entries: s.session.entries.filter((e) => e.id !== a.id) } };
    case 'session/reset': return { ...s, session: { ...s.session, entries: [] } };
    case 'session/limit': return { ...s, session: { ...s.session, limit: a.limit } };
    case 'idea/add': return { ...s, ideas: [...s.ideas, a.idea] };
    case 'idea/update': return { ...s, ideas: s.ideas.map((i) => (i.id === a.id ? { ...i, ...a.patch } : i)) };
    case 'idea/remove': return { ...s, ideas: s.ideas.filter((i) => i.id !== a.id) };
    case 'settings': return { ...s, settings: { ...s.settings, ...a.patch } };
    case 'reset': return initialState();
  }
}

const KEY = 'animal-poker/v1';

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw) as AppState;
    if (parsed?.version !== 1 || !Array.isArray(parsed.profiles)) return initialState();
    return { ...initialState(), ...parsed, settings: { ...initialState().settings, ...parsed.settings } };
  } catch {
    return initialState(); // storage blocked or corrupt — run in-memory
  }
}

function saveState(s: AppState) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable */ }
}

const Ctx = createContext<{ s: AppState; d: (a: Act) => void } | null>(null);

export function StoreProvider({ children, init }: { children: ReactNode; init?: AppState }) {
  const [s, d] = useReducer(reducer, undefined, () => init ?? loadState());
  useEffect(() => saveState(s), [s]);
  return <Ctx.Provider value={{ s, d }}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore outside provider');
  return v;
}

// ---- tiny event bus so the animals can react to what happens in the UI ----
export type Mood = 'happy' | 'sad' | 'curious' | 'alert';
type Listener = (m: Mood, suit?: string) => void;
const listeners = new Set<Listener>();
export const animalBus = {
  emit(m: Mood, suit?: string) { listeners.forEach((l) => l(m, suit)); },
  on(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; },
};

/** Haptics: Vibration API where supported (Android/Chrome); silently no-ops elsewhere. */
export function buzz(enabled: boolean, pattern: number | number[]) {
  if (!enabled) return false;
  try {
    if ('vibrate' in navigator) return navigator.vibrate(pattern);
  } catch { /* ignore */ }
  return false;
}
