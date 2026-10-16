import { describe, expect, it } from 'vitest';
import { SUITS } from '../src/poker/cards';
import { FRAMES, PALETTES, SPRITES, SPRITE_H, SPRITE_W } from '../src/ui/sprites';

describe('pixel sprites', () => {
  it('every suit has every sprite frame', () => {
    for (const suit of SUITS) {
      for (const f of ['walk1', 'walk2', 'sit', 'happy', 'sad'] as const) {
        expect(FRAMES).toContain(f);
        expect(SPRITES[suit][f], `${suit}:${f}`).toBeDefined();
      }
      expect(Object.keys(SPRITES[suit]).sort()).toEqual([...FRAMES].sort());
    }
  });

  it('sprite rows are equal width and grids are 16×15', () => {
    for (const suit of SUITS) {
      for (const f of FRAMES) {
        const g = SPRITES[suit][f];
        expect(g, `${suit}:${f} height`).toHaveLength(SPRITE_H);
        for (const [i, row] of g.entries()) expect(row.length, `${suit}:${f} row ${i}`).toBe(SPRITE_W);
      }
    }
  });

  it('every letter used in a sprite has a palette colour', () => {
    for (const suit of SUITS) {
      const used = new Set(FRAMES.flatMap((f) => SPRITES[suit][f].join('').split('')).filter((ch) => ch !== '.'));
      for (const ch of used) expect(PALETTES[suit][ch], `${suit} palette '${ch}'`).toBeTruthy();
    }
  });

  it('walk frames differ so the walk actually animates', () => {
    for (const suit of SUITS) expect(SPRITES[suit].walk1.join()).not.toBe(SPRITES[suit].walk2.join());
  });
});
