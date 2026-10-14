// Core card model. Pure logic, no UI.
export const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'] as const;
export type Rank = (typeof RANKS)[number];
export const SUITS = ['c', 'd', 'h', 's'] as const;
export type Suit = (typeof SUITS)[number];

export interface Card {
  rank: Rank;
  suit: Suit;
}

/** Animal-coded suits. Fixed mapping: Cats=Clubs, Dogs=Diamonds, Hogs=Hearts, Snakes=Spades. */
export const ANIMAL_SUITS: Record<Suit, { animal: string; suitName: string; letter: string }> = {
  c: { animal: 'Cat', suitName: 'Clubs', letter: 'C' },
  d: { animal: 'Dog', suitName: 'Diamonds', letter: 'D' },
  h: { animal: 'Hog', suitName: 'Hearts', letter: 'H' },
  s: { animal: 'Snake', suitName: 'Spades', letter: 'S' },
};

/** Numeric value: 2..14 (Ace high). */
export function rankValue(r: Rank): number {
  return 14 - RANKS.indexOf(r);
}

export function cardId(c: Card): string {
  return c.rank + c.suit;
}

export function parseCard(s: string): Card {
  const t = s.trim();
  if (t.length !== 2) throw new Error(`Invalid card "${s}"`);
  const rank = t[0].toUpperCase() as Rank;
  const suit = t[1].toLowerCase() as Suit;
  if (!RANKS.includes(rank)) throw new Error(`Invalid rank in "${s}"`);
  if (!SUITS.includes(suit)) throw new Error(`Invalid suit in "${s}"`);
  return { rank, suit };
}

export function fullDeck(): Card[] {
  const d: Card[] = [];
  for (const r of RANKS) for (const s of SUITS) d.push({ rank: r, suit: s });
  return d;
}

export function sameCard(a: Card, b: Card): boolean {
  return a.rank === b.rank && a.suit === b.suit;
}

/** Converts two hole cards into a 169-grid label: "AA", "AKs", "T9o". */
export function handLabel(a: Card, b: Card): string {
  if (sameCard(a, b)) throw new Error('Duplicate card');
  const [hi, lo] = rankValue(a.rank) >= rankValue(b.rank) ? [a, b] : [b, a];
  if (hi.rank === lo.rank) return hi.rank + lo.rank;
  return hi.rank + lo.rank + (hi.suit === lo.suit ? 's' : 'o');
}

/** Deterministic PRNG (mulberry32) so tests and simulations are reproducible. */
export function makeRng(seed = Date.now()): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
