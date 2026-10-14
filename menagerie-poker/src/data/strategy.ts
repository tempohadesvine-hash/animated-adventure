import { chenScore } from '../poker/matrix';

// Replaceable strategy data. Swap `ACTIVE_PACK` for any object that satisfies `StrategyPack`
// (e.g. ranges exported from a solver you own). Nothing here is presented as GTO.

export type Position = 'UTG' | 'MP' | 'CO' | 'BTN' | 'SB' | 'BB';
export const POSITIONS: Position[] = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'];
export type StackDepth = 10 | 20 | 40 | 100;
export const STACKS: StackDepth[] = [10, 20, 40, 100];
export type Scenario = 'RFI' | 'vsOpen' | 'pushFold';
export const SCENARIOS: { id: Scenario; name: string }[] = [
  { id: 'RFI', name: 'Open' },
  { id: 'vsOpen', name: 'vs Open' },
  { id: 'pushFold', name: 'Push/Fold' },
];

export type Action = 'raise' | 'call' | 'fold' | 'jam' | '3bet';
export type DataStatus = 'verified' | 'computed' | 'approximation' | 'illustrative';

export interface StrategyPack {
  id: string;
  name: string;
  status: DataStatus;
  source: string;
  notes: string;
  /** Returns null when the spot doesn't exist (e.g. BB open-raise). */
  decide(hand: string, pos: Position, stack: StackDepth, scenario: Scenario): Action | null;
}

export const STATUS_INFO: Record<DataStatus, { label: string; desc: string }> = {
  verified: { label: 'VERIFIED', desc: 'Checked against a cited external source.' },
  computed: { label: 'COMPUTED', desc: 'Calculated in-app from the rules of poker (Monte Carlo), with stated error.' },
  approximation: { label: 'APPROX', desc: 'Rule of thumb from a published heuristic; not solver output.' },
  illustrative: { label: 'ILLUSTRATIVE', desc: 'Example data for demonstrating the UI. Do not treat as strategy.' },
};


// Thresholds chosen by the app author to give sensible-looking ranges. They are NOT derived
// from a solver. Bill Chen's formula itself is published; these cut-offs are illustrative.
const RFI_MIN: Record<Position, number | null> = { UTG: 9, MP: 8, CO: 7, BTN: 5, SB: 6, BB: null };
const THREEBET_MIN: Record<Position, number> = { UTG: 12, MP: 12, CO: 11, BTN: 10, SB: 11, BB: 10 };
const CALL_MIN: Record<Position, number> = { UTG: 10, MP: 9, CO: 8, BTN: 7, SB: 9, BB: 6 };
const JAM_MIN: Record<10 | 20, Record<Position, number>> = {
  10: { UTG: 7, MP: 6, CO: 5, BTN: 4, SB: 3, BB: 7 },
  20: { UTG: 9, MP: 8, CO: 7, BTN: 6, SB: 5, BB: 9 },
};

export const CHEN_PACK: StrategyPack = {
  id: 'chen-illustrative-v1',
  name: 'Chen-score thresholds',
  status: 'illustrative',
  source: "Bill Chen's starting-hand formula (score) + author-chosen per-position cut-offs",
  notes:
    'Hand scores follow the published Chen formula. The position/stack cut-offs are hand-tuned examples, not solver results. Replace with your own data for real study.',
  decide(hand, pos, stack, scenario) {
    const s = chenScore(hand);
    if (scenario === 'pushFold') {
      if (stack > 20) return null;
      return s >= JAM_MIN[stack as 10 | 20][pos] ? 'jam' : 'fold';
    }
    // Deep stacks reward suited/connected speculative hands a little more.
    const deepBonus = stack === 100 && /s$/.test(hand) ? 1 : stack <= 20 ? -1 : 0;
    const adj = s + deepBonus;
    if (scenario === 'RFI') {
      const min = RFI_MIN[pos];
      if (min === null) return null;
      return adj >= min ? 'raise' : 'fold';
    }
    if (adj >= THREEBET_MIN[pos]) return '3bet';
    if (adj >= CALL_MIN[pos]) return 'call';
    return 'fold';
  },
};

export const ACTIVE_PACK: StrategyPack = CHEN_PACK;

export function spotUnavailableReason(pos: Position, stack: StackDepth, scenario: Scenario): string | null {
  if (scenario === 'RFI' && pos === 'BB') return 'BB never opens: if everyone folds, the blind wins.';
  if (scenario === 'pushFold' && stack > 20) return 'Push/fold is only modelled at 10–20bb.';
  return null;
}
