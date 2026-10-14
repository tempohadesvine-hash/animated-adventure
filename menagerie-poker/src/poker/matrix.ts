import { RANKS, SUITS, type Card, type Rank, rankValue } from './cards';

export type HandKind = 'pair' | 'suited' | 'offsuit';

export interface MatrixCell {
  label: string;
  row: number;
  col: number;
  kind: HandKind;
  combos: number;
}

/** Standard 13x13 grid: pairs on the diagonal, suited above, offsuit below. */
export function buildMatrix(): MatrixCell[][] {
  return RANKS.map((r1, row) =>
    RANKS.map((r2, col) => {
      if (row === col) return { label: r1 + r2, row, col, kind: 'pair', combos: 6 };
      if (row < col) return { label: r1 + r2 + 's', row, col, kind: 'suited', combos: 4 };
      return { label: r2 + r1 + 'o', row, col, kind: 'offsuit', combos: 12 };
    }),
  );
}

export const ALL_HANDS: string[] = buildMatrix().flat().map((c) => c.label);

export function parseLabel(label: string): { hi: Rank; lo: Rank; kind: HandKind } {
  const hi = label[0] as Rank;
  const lo = label[1] as Rank;
  if (!RANKS.includes(hi) || !RANKS.includes(lo)) throw new Error(`Bad hand label "${label}"`);
  if (hi === lo) {
    if (label.length !== 2) throw new Error(`Bad hand label "${label}"`);
    return { hi, lo, kind: 'pair' };
  }
  if (rankValue(hi) < rankValue(lo)) throw new Error(`High card must come first in "${label}"`);
  if (label[2] === 's') return { hi, lo, kind: 'suited' };
  if (label[2] === 'o') return { hi, lo, kind: 'offsuit' };
  throw new Error(`Bad hand label "${label}"`);
}

/** Every concrete two-card combo for a label (6 / 4 / 12). */
export function combosFor(label: string): [Card, Card][] {
  const { hi, lo, kind } = parseLabel(label);
  const out: [Card, Card][] = [];
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++) {
      const a = { rank: hi, suit: SUITS[i] }, b = { rank: lo, suit: SUITS[j] };
      if (kind === 'pair' && j <= i) continue;
      if (kind === 'suited' && i !== j) continue;
      if (kind === 'offsuit' && i === j) continue;
      out.push([a, b]);
    }
  return out;
}

/** Chen formula (Bill Chen): a published, simple starting-hand score. Not a solver output. */
export function chenScore(label: string): number {
  const { hi, lo, kind } = parseLabel(label);
  const base = (r: Rank) => ({ A: 10, K: 8, Q: 7, J: 6 } as Record<string, number>)[r] ?? rankValue(r) / 2;
  if (kind === 'pair') return Math.max(5, base(hi) * 2);
  let s = base(hi);
  if (kind === 'suited') s += 2;
  const gap = rankValue(hi) - rankValue(lo) - 1;
  s -= [0, 1, 2, 4][gap] ?? 5;
  if (gap <= 1 && rankValue(hi) < 12) s += 1;
  return Math.ceil(s);
}
