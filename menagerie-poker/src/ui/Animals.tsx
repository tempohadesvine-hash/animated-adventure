import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Suit } from '../poker/cards';
import { ANIMAL_SUITS } from '../poker/cards';
import { animalBus, type Mood } from '../state/store';
import { PALETTES, SPRITES, SPRITE_H, SPRITE_W, type Frame } from './sprites';

export const SUIT_COLOR: Record<Suit, string> = {
  c: 'var(--color-cat)', d: 'var(--color-dog)', h: 'var(--color-hog)', s: 'var(--color-snake)',
};

const IS_JSDOM = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);

/** Paint a sprite grid 1:1 onto a 16×15 canvas; CSS scales it up crisp (Catgotchi style). */
export function paintSprite(ctx: CanvasRenderingContext2D, grid: readonly string[], pal: Record<string, string>) {
  ctx.clearRect(0, 0, SPRITE_W, SPRITE_H);
  grid.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || !pal[ch]) continue;
      ctx.fillStyle = pal[ch];
      ctx.fillRect(x, y, 1, 1);
    }
  });
}

/** Integer pixel scale so sprites never blur: 16, 32, 48… px wide. */
export const spriteScale = (size: number) => Math.max(1, Math.round(size / SPRITE_W));

export function PixelSprite({ suit, frame = 'sit', size = 16, title, className = '', style }: {
  suit: Suit; frame?: Frame; size?: number; title?: string; className?: string; style?: CSSProperties;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c || IS_JSDOM) return;
    const ctx = c.getContext('2d');
    if (ctx) paintSprite(ctx, SPRITES[suit][frame], PALETTES[suit]);
  }, [suit, frame]);
  const k = spriteScale(size);
  const label = title ?? `${ANIMAL_SUITS[suit].animal} (${ANIMAL_SUITS[suit].suitName})`;
  return (
    <canvas
      ref={ref}
      width={SPRITE_W}
      height={SPRITE_H}
      role="img"
      aria-label={label}
      title={label}
      data-sprite={`${suit}:${frame}`}
      className={`pixelated inline-block shrink-0 ${className}`}
      style={{ width: SPRITE_W * k, height: SPRITE_H * k, ...style }}
    />
  );
}

/** Pixel animal for a suit. Cat=Clubs, Dog=Diamonds, Hog=Hearts, Snake=Spades. */
export function AnimalIcon({ suit, size = 16, title, frame = 'sit' }: { suit: Suit; size?: number; title?: string; frame?: Frame }) {
  return <PixelSprite suit={suit} frame={frame} size={size} title={title} />;
}

const QUIPS: Record<Suit, string[]> = {
  c: ['Cats are Clubs. Patience wins pots.', 'Fold more preflop. Nap later.', 'Position is a sunny windowsill.'],
  d: ['Dogs are Diamonds. Loyal to the plan.', 'Log the hands — fetch the data.', 'Good dog: stick to your limit.'],
  h: ['Hogs are Hearts. Don’t hog the pot with weak kickers.', 'Equity is just truffles, statistically.', 'Oink. Check the confidence level.'],
  s: ['Snakes are Spades. Strike when ranges are capped.', 'Ssstay under your spending limit.', 'Shed bad habits: review your history.'],
};

const WANDER_K = 3; // 48×45px on screen

interface Critter { suit: Suit; x: number; vx: number; target: number | null; hop: number; say: string | null; sayUntil: number; mood: Mood | null; moodUntil: number }

/** Animals that wander along the bottom edge, flee the pointer, investigate taps and react to results. */
export function WanderLayer({ enabled }: { enabled: boolean }) {
  const [, force] = useState(0);
  const crit = useRef<Critter[]>([]);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (!enabled) return;
    const w = window.innerWidth;
    crit.current = (['c', 'd', 'h', 's'] as Suit[]).map((suit, i) => ({
      suit, x: ((i + 0.5) / 4) * w, vx: (i % 2 ? -1 : 1) * (0.25 + i * 0.07), target: null, hop: 0, say: null, sayUntil: 0, mood: null, moodUntil: 0,
    }));
    let raf = 0, last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(50, now - last) / 16.7; last = now;
      const W = window.innerWidth, H = window.innerHeight;
      for (const a of crit.current) {
        const p = pointer.current;
        if (p && H - p.y < 90 && Math.abs(p.x - a.x) < 70) a.vx = (a.x < p.x ? -1.6 : 1.6); // scatter
        else if (a.target !== null) {
          const d = a.target - a.x;
          a.vx = Math.sign(d) * Math.min(1.4, Math.abs(d) / 20 + 0.3);
          if (Math.abs(d) < 4) { a.target = null; a.vx = 0; a.mood = 'curious'; a.moodUntil = now + 1200; }
        } else if (Math.random() < 0.004) a.vx = (Math.random() - 0.5) * 0.9;
        if (!reduced) a.x += a.vx * dt;
        if (a.x < 24) { a.x = 24; a.vx = Math.abs(a.vx); }
        if (a.x > W - 24) { a.x = W - 24; a.vx = -Math.abs(a.vx); }
        if (a.hop > 0) a.hop = Math.max(0, a.hop - 0.06 * dt);
        if (a.say && now > a.sayUntil) a.say = null;
        if (a.mood && now > a.moodUntil) a.mood = null;
      }
      force((n) => (n + 1) % 1e6);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const move = (e: PointerEvent) => { pointer.current = { x: e.clientX, y: e.clientY }; };
    const down = (e: PointerEvent) => {
      if ((e.target as HTMLElement)?.closest?.('[data-critter]')) return;
      // nearest animal goes to investigate what you tapped
      const near = [...crit.current].sort((a, b) => Math.abs(a.x - e.clientX) - Math.abs(b.x - e.clientX))[0];
      if (near && Math.random() < 0.5) near.target = e.clientX;
    };
    const off = animalBus.on((m, suit) => {
      const now = performance.now();
      for (const a of crit.current) {
        if (suit && a.suit !== suit && m !== 'happy' && m !== 'sad') continue;
        a.mood = m; a.moodUntil = now + 1500;
        if (m === 'happy') a.hop = 1;
        if (m === 'alert' && a.suit === 'd') { a.say = 'Limit close — consider stopping.'; a.sayUntil = now + 2500; }
      }
    });
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerdown', down);
    return () => { cancelAnimationFrame(raf); off(); window.removeEventListener('pointermove', move); window.removeEventListener('pointerdown', down); };
  }, [enabled, reduced]);

  if (!enabled) return null;
  const clock = performance.now();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-14 z-30 h-0 md:bottom-0" aria-hidden={false}>
      {crit.current.map((a) => {
        const moving = Math.abs(a.vx) > 0.05 && !reduced;
        const frame: Frame = a.mood === 'happy' ? 'happy' : a.mood === 'sad' ? 'sad'
          : moving ? (Math.floor(clock / 160 + a.suit.charCodeAt(0)) % 2 ? 'walk2' : 'walk1') : 'sit';
        const y = -SPRITE_H * WANDER_K - a.hop * Math.sin(a.hop * Math.PI) * 30;
        const flip = a.vx < 0 ? -1 : 1;
        return (
          <div key={a.suit} className="absolute" style={{ left: a.x - (SPRITE_W * WANDER_K) / 2, top: y }}>
            {a.say && (
              <div className="fade-up absolute bottom-[52px] left-1/2 w-44 -translate-x-1/2 rounded border-2 border-[#3b2a20] bg-[#e9dcc5] px-2 py-1 font-pixel text-[10px] leading-snug text-[#3b2a20] shadow">
                {a.say}
              </div>
            )}
            <button
              data-critter
              data-frame={frame}
              className={`pointer-events-auto block p-0 ${a.mood === 'sad' ? 'shake' : ''}`}
              style={{ transform: `scaleX(${flip}) rotate(${a.mood === 'curious' ? -8 : 0}deg)` }}
              onClick={() => {
                const q = QUIPS[a.suit];
                a.say = q[Math.floor(Math.random() * q.length)];
                a.sayUntil = performance.now() + 2600;
                a.hop = 1; a.mood = 'happy'; a.moodUntil = performance.now() + 900;
              }}
              aria-label={`${ANIMAL_SUITS[a.suit].animal} — ${ANIMAL_SUITS[a.suit].suitName}. Tap for a tip.`}
            >
              <PixelSprite suit={a.suit} frame={frame} size={SPRITE_W * WANDER_K} title={`${ANIMAL_SUITS[a.suit].animal} (${ANIMAL_SUITS[a.suit].suitName})`} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
