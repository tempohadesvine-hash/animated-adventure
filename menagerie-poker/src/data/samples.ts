// Illustrative sample data so the app isn't empty on first run. Safe to delete in-app.
import { makeRng } from '../poker/cards';
import type { HandObservation, ObservedAction, PlayerProfile } from '../poker/profile';
import type { Idea } from '../state/store';

function synth(seed: number, n: number, vpip: number, pfrShare: number, aggr: number): HandObservation[] {
  const rng = makeRng(seed);
  return Array.from({ length: n }, (_, i) => {
    const acts: ObservedAction[] = [];
    if (rng() < vpip) {
      acts.push(rng() < pfrShare ? 'pf_raise' : 'pf_call');
      const streets = 1 + Math.floor(rng() * 3);
      for (let k = 0; k < streets; k++) acts.push(rng() < aggr ? 'bet' : rng() < 0.7 ? 'call' : 'check');
    } else acts.push('pf_fold');
    return { id: `s${seed}-${i}`, ts: Date.now() - (n - i) * 60000, actions: acts };
  });
}

const blank = { vpip: null, pfr: null, af: null, type: null };

export const SAMPLE_PROFILES = (): PlayerProfile[] => [
  { id: 'sample-1', name: 'Seat 2 · grey hoodie (sample)', hands: synth(11, 42, 0.55, 0.15, 0.15), notes: 'Calls down light. Sample data.', override: { ...blank } },
  { id: 'sample-2', name: 'Seat 5 · reg (sample)', hands: synth(23, 64, 0.22, 0.8, 0.55), notes: 'Sample data.', override: { ...blank } },
  { id: 'sample-3', name: 'Seat 7 · new arrival (sample)', hands: synth(37, 6, 0.1, 0.9, 0.6), notes: 'Only a few hands — low confidence. Sample data.', override: { ...blank } },
];

export const SAMPLE_IDEAS = (): Idea[] => [
  { id: 'i1', text: 'Keyboard shortcuts in card picker (rank then suit letter)', zeroCost: true, done: true },
  { id: 'i2', text: 'Animals react when the session loss limit is near', zeroCost: true, done: true },
  { id: 'i3', text: 'Import solver ranges from CSV into a StrategyPack', zeroCost: false, done: false },
  { id: 'i4', text: 'Native Wear OS build of the watch companion', zeroCost: false, done: false },
];
