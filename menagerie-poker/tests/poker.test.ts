import { describe, expect, it } from 'vitest';
import { ANIMAL_SUITS, handLabel, makeRng, parseCard } from '../src/poker/cards';
import { categoryOf, evaluate } from '../src/poker/evaluator';
import { ALL_HANDS, buildMatrix, chenScore, combosFor, parseLabel } from '../src/poker/matrix';
import { monteCarloEquity } from '../src/poker/equity';
import { classify, computeStats, newProfile, wilson } from '../src/poker/profile';
import { limitStatus, makeQuestion, summarize, validateAmount } from '../src/poker/practice';
import { ACTIVE_PACK, CHEN_PACK, spotUnavailableReason } from '../src/data/strategy';

const cs = (s: string) => s.split(' ').map(parseCard);

describe('cards', () => {
  it('keeps the animal suit mapping fixed', () => {
    expect(ANIMAL_SUITS.c.animal).toBe('Cat');
    expect(ANIMAL_SUITS.d.animal).toBe('Dog');
    expect(ANIMAL_SUITS.h.animal).toBe('Hog');
    expect(ANIMAL_SUITS.s.animal).toBe('Snake');
  });
  it('labels hands in canonical order', () => {
    expect(handLabel(parseCard('Kh'), parseCard('Ah'))).toBe('AKs');
    expect(handLabel(parseCard('9c'), parseCard('Td'))).toBe('T9o');
    expect(handLabel(parseCard('7s'), parseCard('7d'))).toBe('77');
  });
  it('rejects bad input', () => {
    expect(() => parseCard('1x')).toThrow();
    expect(() => handLabel(parseCard('As'), parseCard('As'))).toThrow();
  });
});

describe('matrix', () => {
  it('has 169 unique hands covering 1326 combos', () => {
    expect(new Set(ALL_HANDS).size).toBe(169);
    const total = buildMatrix().flat().reduce((s, c) => s + c.combos, 0);
    expect(total).toBe(1326);
    expect(combosFor('AA')).toHaveLength(6);
    expect(combosFor('AKs')).toHaveLength(4);
    expect(combosFor('AKo')).toHaveLength(12);
  });
  it('validates labels', () => {
    expect(() => parseLabel('KAs')).toThrow();
    expect(() => parseLabel('AKx')).toThrow();
  });
  it('matches published Chen formula examples', () => {
    expect(chenScore('AA')).toBe(20);
    expect(chenScore('KK')).toBe(16);
    expect(chenScore('22')).toBe(5);
    expect(chenScore('AKs')).toBe(12);
    expect(chenScore('JTs')).toBe(9);
    expect(chenScore('72o')).toBe(-1);
  });
});

describe('evaluator', () => {
  it('ranks categories correctly', () => {
    expect(categoryOf(evaluate(cs('As Ks Qs Js Ts 2d 3c')))).toBe('Straight flush');
    expect(categoryOf(evaluate(cs('9c 9d 9h 9s 2c 3d 4h')))).toBe('Quads');
    expect(categoryOf(evaluate(cs('9c 9d 9h 2s 2c 3d 4h')))).toBe('Full house');
    expect(categoryOf(evaluate(cs('Ah 2d 3c 4s 5h 9d Kc')))).toBe('Straight');
    expect(categoryOf(evaluate(cs('Ah 3h 7h 9h Jh 2c 2d')))).toBe('Flush');
  });
  it('compares kickers and wheel correctly', () => {
    expect(evaluate(cs('6h 2d 3c 4s 5h'))).toBeGreaterThan(evaluate(cs('Ah 2d 3c 4s 5h')));
    expect(evaluate(cs('Ah Ad Kc 7s 2h'))).toBeGreaterThan(evaluate(cs('As Ac Qc 7d 2s')));
    expect(evaluate(cs('9c 9d 9h 8s 8c 8d 2h'))).toBe(evaluate(cs('9c 9d 9h 8s 8c 2d 3h')));
  });
});

describe('equity (Monte Carlo)', () => {
  // Reference heads-up preflop equities vs a random hand are widely published
  // (AA ≈ 85.2%, 72o ≈ 34.6%). We allow ~4 standard errors of tolerance.
  it('AA vs random ≈ 85%', () => {
    const r = monteCarloEquity([parseCard('As'), parseCard('Ah')], 1, [], 6000, 7);
    expect(Math.abs(r.equity - 0.852)).toBeLessThan(4 * r.stdErr + 0.005);
  });
  it('72o vs random ≈ 35%', () => {
    const r = monteCarloEquity([parseCard('7s'), parseCard('2h')], 1, [], 6000, 9);
    expect(Math.abs(r.equity - 0.346)).toBeLessThan(4 * r.stdErr + 0.005);
  });
  it('is deterministic with a seed and validates input', () => {
    const h: [any, any] = [parseCard('Kd'), parseCard('Qd')];
    expect(monteCarloEquity(h, 2, [], 500, 3).equity).toBe(monteCarloEquity(h, 2, [], 500, 3).equity);
    expect(() => monteCarloEquity(h, 1, [parseCard('Kd')])).toThrow();
    expect(() => monteCarloEquity(h, 9)).toThrow();
  });
  it('a made royal flush on the river always wins', () => {
    const r = monteCarloEquity([parseCard('As'), parseCard('Ks')], 3, cs('Qs Js Ts 2d 3c'), 300);
    expect(r.equity).toBe(1);
  });
});

describe('profiling', () => {
  it('computes VPIP/PFR/AF and confidence', () => {
    const p = newProfile('Villain');
    for (let i = 0; i < 20; i++)
      p.hands.push({ id: String(i), ts: i, actions: i % 2 ? ['pf_call', 'call', 'call'] : ['pf_fold'] });
    const s = computeStats(p);
    expect(s.vpip).toBeCloseTo(0.5);
    expect(s.pfr).toBe(0);
    expect(s.af).toBe(0);
    expect(s.confidence).toBe('medium');
    expect(s.type).toBe('Calling station');
  });
  it('honours overrides', () => {
    const p = newProfile('X');
    p.override.type = 'Nit';
    expect(computeStats(p).type).toBe('Nit');
    expect(computeStats(p).typeIsOverride).toBe(true);
  });
  it('classifies and bounds uncertainty', () => {
    expect(classify(0.1, 0.08, 2, 100)).toBe('Nit');
    expect(classify(0.22, 0.18, 2, 100)).toBe('TAG');
    expect(classify(0.2, 0.1, 1, 2)).toBe('Unknown');
    const [lo, hi] = wilson(1, 4);
    expect(lo).toBeGreaterThanOrEqual(0);
    expect(hi).toBeLessThanOrEqual(1);
    expect(hi - lo).toBeGreaterThan(0.5);
    expect(() => newProfile('  ')).toThrow();
  });
});

describe('strategy pack + practice', () => {
  it('is labelled honestly', () => {
    expect(ACTIVE_PACK.status).not.toBe('verified');
    expect(CHEN_PACK.source.length).toBeGreaterThan(10);
  });
  it('returns null for spots it does not model', () => {
    expect(CHEN_PACK.decide('AA', 'BB', 100, 'RFI')).toBeNull();
    expect(spotUnavailableReason('BB', 100, 'RFI')).toBeTruthy();
    expect(CHEN_PACK.decide('AA', 'BTN', 100, 'pushFold')).toBeNull();
  });
  it('makes sane decisions at the extremes', () => {
    expect(CHEN_PACK.decide('AA', 'UTG', 100, 'RFI')).toBe('raise');
    expect(CHEN_PACK.decide('72o', 'BTN', 100, 'RFI')).toBe('fold');
    expect(CHEN_PACK.decide('AA', 'CO', 100, 'vsOpen')).toBe('3bet');
    expect(CHEN_PACK.decide('AA', 'SB', 10, 'pushFold')).toBe('jam');
  });
  it('generates valid quiz questions', () => {
    const rng = makeRng(42);
    for (let i = 0; i < 50; i++) {
      const q = makeQuestion(CHEN_PACK, rng);
      expect(q.choices).toContain(q.answer);
      expect(CHEN_PACK.decide(q.hand, q.pos, q.stack, q.scenario)).toBe(q.answer);
    }
  });
  it('summarizes streaks (newest first)', () => {
    const base = { id: '', ts: 0, hand: 'AA', pos: 'BTN', stack: 100, scenario: 'RFI', answer: 'raise', given: 'raise', packId: 'x' } as const;
    const s = summarize([{ ...base, correct: true }, { ...base, correct: true }, { ...base, correct: false }]);
    expect(s).toMatchObject({ total: 3, correct: 2, streak: 2, bestStreak: 2 });
  });
  it('enforces the session loss limit', () => {
    const lim = { maxLoss: 20, currency: '$' };
    const e = (amount: number) => ({ id: '', ts: 0, amount, note: '' });
    expect(limitStatus([e(-5)], lim)).toBe('ok');
    expect(limitStatus([e(-16)], lim)).toBe('warn');
    expect(limitStatus([e(-10), e(-10)], lim)).toBe('stop');
    expect(() => validateAmount('abc')).toThrow();
    expect(validateAmount('-4.257')).toBe(-4.26);
  });
});
