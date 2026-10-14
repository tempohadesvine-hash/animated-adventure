import { type Card, rankValue } from './cards';

export const CATEGORIES = [
  'High card',
  'Pair',
  'Two pair',
  'Trips',
  'Straight',
  'Flush',
  'Full house',
  'Quads',
  'Straight flush',
] as const;

/** Packs category + up to 5 tiebreak values into one comparable number. */
function pack(cat: number, kick: number[]): number {
  let v = cat;
  for (let i = 0; i < 5; i++) v = v * 16 + (kick[i] ?? 0);
  return v;
}

/** Highest straight top-card in a rank bitmask (bit n = rank n present), or 0. */
function straightHigh(mask: number): number {
  if (mask & (1 << 14)) mask |= 1 << 1; // wheel: Ace plays low
  for (let hi = 14; hi >= 5; hi--) {
    const need = 0b11111 << (hi - 4);
    if ((mask & need) === need) return hi;
  }
  return 0;
}

/** Evaluates the best 5-card hand from 5–7 cards. Higher score wins. */
export function evaluate(cards: Card[]): number {
  if (cards.length < 5 || cards.length > 7) throw new Error('evaluate needs 5–7 cards');
  const counts = new Array(15).fill(0);
  const suitMasks: Record<string, number> = { c: 0, d: 0, h: 0, s: 0 };
  const suitCounts: Record<string, number> = { c: 0, d: 0, h: 0, s: 0 };
  let mask = 0;
  for (const c of cards) {
    const v = rankValue(c.rank);
    counts[v]++;
    mask |= 1 << v;
    suitMasks[c.suit] |= 1 << v;
    suitCounts[c.suit]++;
  }

  const flushSuit = (Object.keys(suitCounts) as string[]).find((s) => suitCounts[s] >= 5);
  if (flushSuit) {
    const sf = straightHigh(suitMasks[flushSuit]);
    if (sf) return pack(8, [sf]);
  }

  const quads: number[] = [], trips: number[] = [], pairs: number[] = [], singles: number[] = [];
  for (let v = 14; v >= 2; v--) {
    if (counts[v] === 4) quads.push(v);
    else if (counts[v] === 3) trips.push(v);
    else if (counts[v] === 2) pairs.push(v);
    else if (counts[v] === 1) singles.push(v);
  }

  if (quads.length) {
    const kicker = Math.max(...[...trips, ...pairs, ...singles], 0);
    return pack(7, [quads[0], kicker]);
  }
  if (trips.length && (trips.length > 1 || pairs.length)) {
    const pairPart = Math.max(trips[1] ?? 0, pairs[0] ?? 0);
    return pack(6, [trips[0], pairPart]);
  }
  if (flushSuit) {
    const vals: number[] = [];
    for (let v = 14; v >= 2 && vals.length < 5; v--) if (suitMasks[flushSuit] & (1 << v)) vals.push(v);
    return pack(5, vals);
  }
  const st = straightHigh(mask);
  if (st) return pack(4, [st]);
  if (trips.length) return pack(3, [trips[0], ...singles.slice(0, 2)]);
  if (pairs.length >= 2) {
    const kicker = Math.max(pairs[2] ?? 0, singles[0] ?? 0);
    return pack(2, [pairs[0], pairs[1], kicker]);
  }
  if (pairs.length) return pack(1, [pairs[0], ...singles.slice(0, 3)]);
  return pack(0, singles.slice(0, 5));
}

export function categoryOf(score: number): string {
  return CATEGORIES[Math.floor(score / 16 ** 5)];
}
