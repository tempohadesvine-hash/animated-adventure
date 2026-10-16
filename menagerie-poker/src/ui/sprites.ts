// Pixel sprites in the Catgotchi style: 16×15 string grids, one letter per pixel, '.' = transparent.
// Drawn onto a tiny canvas and scaled up with image-rendering: pixelated.
// Fixed suit mapping: Cat = Clubs, Dog = Diamonds, Hog = Hearts, Snake = Spades.
import type { Suit } from '../poker/cards';

export const SPRITE_W = 16;
export const SPRITE_H = 15;
export const FRAMES = ['walk1', 'walk2', 'sit', 'happy', 'sad'] as const;
export type Frame = (typeof FRAMES)[number];
export type Grid = readonly string[];

/** Replace selected rows of a base grid (same trick as Catgotchi's `mod`). */
const mod = (base: Grid, rows: Record<number, string>): Grid => base.map((r, i) => rows[i] ?? r);

// ---------- Cat (Clubs) ----------
const CAT: Grid = [
  '..........o...o.',
  '.........ofo.ofo',
  '..o......offoffo',
  '.ofo.....offfffo',
  '.ofo.....ofefefo',
  '.ofo.....offnffo',
  '..ofo...offwwwfo',
  '..ofoooooffffoo.',
  '...offffffffffo.',
  '...offffffffffo.',
  '...offwwwwwwffo.',
  '...ooffffffffoo.',
  '....of.of.of.of.',
  '....oo.oo.oo.oo.',
  '................',
];
const CAT_SIT: Grid = [
  '................',
  '..........o...o.',
  '.........ofo.ofo',
  '.........offoffo',
  '.........offfffo',
  '.........ofefefo',
  '.........offnffo',
  '........offwwwfo',
  '.......offffffo.',
  '......offfffffo.',
  '.....offffwwffo.',
  '..oo.offffwwffo.',
  '.ofo.offffwwffo.',
  '.offoooffoowwoo.',
  '..ooooooooooooo.',
];

// ---------- Dog (Diamonds) ----------
const DOG: Grid = [
  '..........oooo..',
  '.........offffo.',
  '........ouufffo.',
  'o.......ouufefoo',
  'of......ouuffffn',
  '.of.....ouufffoo',
  '..of...oouuwwwo.',
  '..oooooooofffo..',
  '..offffffffffo..',
  '..offffffffffo..',
  '..offwwwwwwffo..',
  '..ooffffffffoo..',
  '...of.of..of.of.',
  '...oo.oo..oo.oo.',
  '................',
];
const DOG_SIT: Grid = [
  '................',
  '..........oooo..',
  '.........offffo.',
  '........ouufffo.',
  '........ouufefoo',
  '........ouuffffn',
  '........ouufffoo',
  '.......oouuwwwo.',
  '.......offfwwfo.',
  '......offffwwfo.',
  '.....offfffwwfo.',
  'oo...offfffwwfo.',
  '.of..offfffwwfo.',
  '..oooffffoowwoo.',
  '...oooooooooooo.',
];

// ---------- Hog (Hearts) ----------
const HOG: Grid = [
  '................',
  '..........oo....',
  '.........opfo...',
  '....ooooooffooo.',
  '...offffffffffo.',
  '.oooffffffffefoo',
  'o..ofuffffffffpp',
  '.o.offffffffffnp',
  '...offffffffffoo',
  '...offffffffffo.',
  '...offwwwwwwwfo.',
  '...ooffffffffoo.',
  '....of.of.of.of.',
  '....oo.oo.oo.oo.',
  '................',
];
const HOG_SIT: Grid = [
  '................',
  '................',
  '................',
  '..........oo....',
  '.........opfo...',
  '....ooooooffooo.',
  '...offffffffffo.',
  '.oooffffffffefoo',
  'o..ofuffffffffpp',
  '.o.offffffffffnp',
  '...offffffffffoo',
  '...offwwwwwwwfo.',
  '...offwwwwwwwfo.',
  '...ooffoooooffoo',
  '....oooo...oooo.',
];

// ---------- Snake (Spades) ----------
const SNAKE: Grid = [
  '................',
  '...........ooo..',
  '..........offeo.',
  '..........offffo',
  '...........offor',
  '...........ofo..',
  '...........ofo..',
  '...........ofo..',
  '...........ofo..',
  '....ooooooooffo.',
  '...offffffffffo.',
  '..offukfukfukffo',
  '.offffffffffffo.',
  '.oooooooooooooo.',
  '................',
];
const SNAKE_WALK2 = mod(SNAKE, {
  9: '.....ooooooooffo',
  10: '..ooffffffffffo.',
  11: '.offkfukfukffo..',
  12: '..offffffffffo..',
  13: '...ooooooooooo..',
});
const SNAKE_SIT: Grid = [
  '................',
  '................',
  '................',
  '................',
  '..........ooo...',
  '.........offeo..',
  '.........offffo.',
  '..........offor.',
  '..........ofo...',
  '.....oooooofo...',
  '....offffffffo..',
  '...offukfukfffo.',
  '..offffffffffffo',
  '..offukfukfukffo',
  '...ooooooooooooo',
];

export const SPRITES: Record<Suit, Record<Frame, Grid>> = {
  c: {
    walk1: CAT,
    walk2: mod(CAT, { 12: '...of..ofof..of.', 13: '..oo..oo..oo..oo' }),
    sit: CAT_SIT,
    happy: mod(CAT, { 4: '.ofo.....ofofofo', 5: '.ofo.....opfnfpo' }),
    sad: mod(CAT, { 0: '................', 1: '.........oo..oo.', 2: '.........offoffo', 3: '.........offfffo', 4: '.........ofefefo', 5: '.........ofbnffo', 6: '........offwwwfo', 7: '..ooooooooffffo.', 9: '.ofoffffffffffo.', 10: '.ofoffwwwwwwffo.', 11: '..oooffffffffoo.' }),
  },
  d: {
    walk1: DOG,
    walk2: mod(DOG, { 12: '..of..ofof..of..', 13: '.oo..oo..oo..oo.' }),
    sit: DOG_SIT,
    happy: mod(DOG, { 0: 'o.........oooo..', 1: 'of.......offffo.', 2: '.of.....ouufffo.', 3: '.of.....ouufofoo', 4: '..of....ouuffffn', 5: '..of....ouufffpo', 6: '..of...oouuwpwo.' }),
    sad: mod(DOG, { 3: '........ouufefoo', 4: '........ouufbffn', 5: '........ouufffoo', 6: '.......oouuwwwo.', 9: 'o.offffffffffo..', 10: 'ofoffwwwwwwffo..', 11: '.oooffffffffoo..' }),
  },
  h: {
    walk1: HOG,
    walk2: mod(HOG, { 12: '...of..ofof..of.', 13: '..oo..oo..oo..oo' }),
    sit: HOG_SIT,
    happy: mod(HOG, { 1: '..........oo....', 5: '.oooffffffffofoo', 6: 'o..ofuffffffpfpp', 7: '.o.offffffffffnp' }),
    sad: mod(HOG, { 1: '................', 2: '..........oo....', 3: '....oooooopfooo.', 5: '...offffffffefoo', 6: '...ofuffffffbfpp', 7: '...offffffffffnp', 8: '.oooffffffffffoo', 9: 'o..offffffffffo.' }),
  },
  s: {
    walk1: SNAKE,
    walk2: SNAKE_WALK2,
    sit: SNAKE_SIT,
    happy: mod(SNAKE, { 2: '..........offofo', 3: '..........opfffo' }),
    sad: mod(SNAKE, { 1: '................', 2: '................', 3: '...........ooo..', 4: '..........offeo.', 5: '..........ofbffo', 6: '...........offo.', 7: '...........ofo..' }),
  },
};

/** Per-suit colours. Keys match the letters in the grids. */
export const PALETTES: Record<Suit, Record<string, string>> = {
  c: { o: '#1f2a38', f: '#93a8c4', w: '#e3ebf5', e: '#0b0f14', n: '#e48aa0', p: '#f2a7b8', u: '#6f84a2', b: '#5aa9e6', k: '#000' },
  d: { o: '#3a2a16', f: '#cdb075', w: '#f3e6c4', e: '#120d06', n: '#1a120a', p: '#ef8f9e', u: '#8a5f2c', b: '#5aa9e6', k: '#000' },
  h: { o: '#4a2326', f: '#e6a7a9', w: '#f8dcdc', e: '#160a0b', n: '#7a3a3f', p: '#d77d84', u: '#c98389', b: '#5aa9e6', k: '#000' },
  s: { o: '#14301f', f: '#8fb79c', w: '#d8ecd9', e: '#0a140d', n: '#14301f', p: '#e48aa0', u: '#5f8b6d', b: '#5aa9e6', k: '#c9e2b7', r: '#e04848' },
};
