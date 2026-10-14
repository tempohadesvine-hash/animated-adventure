import { monteCarloEquity } from '../poker/equity';
import { ALL_HANDS, combosFor } from '../poker/matrix';

// Heads-up preflop equity vs one random hand, computed in-browser (not a lookup table).
export const EQ_SAMPLES = 1000;
const cache = new Map<string, number>();
let running = false;
const subs = new Set<() => void>();

export function getEquity(label: string): number | undefined { return cache.get(label); }
export function equityProgress(): number { return cache.size / ALL_HANDS.length; }
export function onEquity(cb: () => void) { subs.add(cb); return () => { subs.delete(cb); }; }

export function computeAllEquities() {
  if (running || cache.size === ALL_HANDS.length) return;
  running = true;
  let i = 0;
  const step = () => {
    const end = Math.min(ALL_HANDS.length, i + 6);
    for (; i < end; i++) {
      const h = ALL_HANDS[i];
      if (!cache.has(h)) cache.set(h, monteCarloEquity(combosFor(h)[0], 1, [], EQ_SAMPLES, i + 1).equity);
    }
    subs.forEach((s) => s());
    if (i < ALL_HANDS.length) setTimeout(step, 0);
    else running = false;
  };
  setTimeout(step, 0);
}
