import { type Card, fullDeck, handLabel, shuffle } from './cards';
import {
  type Action, type Position, type Scenario, type StackDepth, type StrategyPack,
  POSITIONS, STACKS, spotUnavailableReason,
} from '../data/strategy';

export interface QuizQuestion {
  cards: [Card, Card];
  hand: string;
  pos: Position;
  stack: StackDepth;
  scenario: Scenario;
  answer: Action;
  choices: Action[];
}

export function choicesFor(s: Scenario): Action[] {
  if (s === 'RFI') return ['raise', 'fold'];
  if (s === 'pushFold') return ['jam', 'fold'];
  return ['3bet', 'call', 'fold'];
}

/** Draws a random valid spot. Retries past spots the pack doesn't model. */
export function makeQuestion(pack: StrategyPack, rng: () => number, scenario?: Scenario): QuizQuestion {
  for (let tries = 0; tries < 200; tries++) {
    const sc: Scenario = scenario ?? (['RFI', 'vsOpen', 'pushFold'] as Scenario[])[Math.floor(rng() * 3)];
    const pos = POSITIONS[Math.floor(rng() * POSITIONS.length)];
    const stacks = sc === 'pushFold' ? STACKS.filter((s) => s <= 20) : STACKS;
    const stack = stacks[Math.floor(rng() * stacks.length)];
    if (spotUnavailableReason(pos, stack, sc)) continue;
    const [a, b] = shuffle(fullDeck(), rng);
    const hand = handLabel(a, b);
    const answer = pack.decide(hand, pos, stack, sc);
    if (!answer) continue;
    return { cards: [a, b], hand, pos, stack, scenario: sc, answer, choices: choicesFor(sc) };
  }
  throw new Error('Could not generate a valid question');
}

export interface QuizRecord {
  id: string;
  ts: number;
  hand: string;
  pos: Position;
  stack: StackDepth;
  scenario: Scenario;
  answer: Action;
  given: Action;
  correct: boolean;
  packId: string;
}

export interface QuizSummary { total: number; correct: number; accuracy: number; streak: number; bestStreak: number }

export function summarize(records: QuizRecord[]): QuizSummary {
  let correct = 0, streak = 0, best = 0;
  // records are stored newest-first
  for (const r of [...records].reverse()) {
    if (r.correct) { correct++; streak++; best = Math.max(best, streak); } else streak = 0;
  }
  return { total: records.length, correct, accuracy: records.length ? correct / records.length : 0, streak, bestStreak: best };
}

// ---- Session results with a hard spending limit ----

export interface SessionEntry { id: string; ts: number; amount: number; note: string }
export interface SessionLimit { maxLoss: number; currency: string }

export function sessionNet(entries: SessionEntry[]): number {
  return Math.round(entries.reduce((s, e) => s + e.amount, 0) * 100) / 100;
}

/** 'ok' | 'warn' (≥75% of limit lost) | 'stop' (limit reached). */
export function limitStatus(entries: SessionEntry[], limit: SessionLimit): 'ok' | 'warn' | 'stop' {
  const net = sessionNet(entries);
  if (limit.maxLoss <= 0) return 'stop';
  if (net <= -limit.maxLoss) return 'stop';
  if (net <= -0.75 * limit.maxLoss) return 'warn';
  return 'ok';
}

export function validateAmount(raw: string): number {
  const v = Number(raw);
  if (!raw.trim() || !Number.isFinite(v)) throw new Error('Enter a number, e.g. -5 or 12.50');
  if (Math.abs(v) > 100000) throw new Error('Amount looks too large');
  return Math.round(v * 100) / 100;
}
