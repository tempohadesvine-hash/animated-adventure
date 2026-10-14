import { type Card, fullDeck, makeRng, sameCard } from './cards';
import { evaluate } from './evaluator';

export interface EquityResult {
  equity: number; // win + tie share, 0..1
  win: number;
  tie: number;
  samples: number;
  stdErr: number; // standard error of the equity estimate
}

/**
 * Monte Carlo equity of `hero` vs `opponents` random hands, given an optional partial board.
 * This is real computation (exact rules, random sampling) — not a lookup or a guess.
 */
export function monteCarloEquity(
  hero: [Card, Card],
  opponents = 1,
  board: Card[] = [],
  samples = 4000,
  seed = 1,
): EquityResult {
  if (opponents < 1 || opponents > 8) throw new Error('Opponents must be 1–8');
  if (board.length > 5) throw new Error('Board has at most 5 cards');
  const used = [...hero, ...board];
  for (let i = 0; i < used.length; i++)
    for (let j = i + 1; j < used.length; j++)
      if (sameCard(used[i], used[j])) throw new Error('Duplicate card in input');

  const rest = fullDeck().filter((c) => !used.some((u) => sameCard(u, c)));
  const rng = makeRng(seed);
  let equitySum = 0, sqSum = 0, wins = 0, ties = 0;
  const need = opponents * 2 + (5 - board.length);

  for (let n = 0; n < samples; n++) {
    // partial Fisher–Yates: only shuffle what we draw
    const d = rest.slice();
    for (let i = 0; i < need; i++) {
      const j = i + Math.floor(rng() * (d.length - i));
      [d[i], d[j]] = [d[j], d[i]];
    }
    const runout = board.concat(d.slice(opponents * 2, need));
    const heroScore = evaluate([...hero, ...runout]);
    let best = 0, tiedWith = 0;
    for (let o = 0; o < opponents; o++) {
      const s = evaluate([d[o * 2], d[o * 2 + 1], ...runout]);
      if (s > best) { best = s; tiedWith = 0; }
      if (s === best && s === heroScore) tiedWith++;
    }
    let share = 0;
    if (heroScore > best) { share = 1; wins++; }
    else if (heroScore === best) { share = 1 / (tiedWith + 1); ties++; }
    equitySum += share;
    sqSum += share * share;
  }
  const mean = equitySum / samples;
  const variance = Math.max(0, sqSum / samples - mean * mean);
  return { equity: mean, win: wins / samples, tie: ties / samples, samples, stdErr: Math.sqrt(variance / samples) };
}
