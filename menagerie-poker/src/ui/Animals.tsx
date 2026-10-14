import { useEffect, useRef, useState } from 'react';
import type { Suit } from '../poker/cards';
import { ANIMAL_SUITS } from '../poker/cards';
import { animalBus, type Mood } from '../state/store';

export const SUIT_COLOR: Record<Suit, string> = {
  c: 'var(--color-cat)', d: 'var(--color-dog)', h: 'var(--color-hog)', s: 'var(--color-snake)',
};

/** Line-art animal heads. Cat=Clubs, Dog=Diamonds, Hog=Hearts, Snake=Spades. */
export function AnimalIcon({ suit, size = 16, title }: { suit: Suit; size?: number; title?: string }) {
  const c = SUIT_COLOR[suit];
  const common = { fill: 'none', stroke: c, strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const label = title ?? `${ANIMAL_SUITS[suit].animal} (${ANIMAL_SUITS[suit].suitName})`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={label}>
      <title>{label}</title>
      {suit === 'c' && (
        <g {...common}>
          <path d="M5 9 L6 3.5 L10 7.2 M19 9 L18 3.5 L14 7.2" />
          <ellipse cx="12" cy="13" rx="7.5" ry="6.8" />
          <circle cx="9.3" cy="12.2" r="0.9" fill={c} /><circle cx="14.7" cy="12.2" r="0.9" fill={c} />
          <path d="M11.2 15 L12 15.8 L12.8 15 M3 14.5 L7 15 M3.5 17 L7 16.2 M21 14.5 L17 15 M20.5 17 L17 16.2" />
        </g>
      )}
      {suit === 'd' && (
        <g {...common}>
          <path d="M6.5 6 C3 6 2.5 12 4.5 14 L7 11" /><path d="M17.5 6 C21 6 21.5 12 19.5 14 L17 11" />
          <path d="M7 6 C8.5 4.5 15.5 4.5 17 6 L17.5 13 C17 18 14.5 20 12 20 C9.5 20 7 18 6.5 13 Z" />
          <circle cx="9.8" cy="11" r="0.9" fill={c} /><circle cx="14.2" cy="11" r="0.9" fill={c} />
          <ellipse cx="12" cy="15.2" rx="1.6" ry="1.1" fill={c} /><path d="M12 16.3 V17.6" />
        </g>
      )}
      {suit === 'h' && (
        <g {...common}>
          <path d="M5.5 8 L4.5 3.8 L9 6 M18.5 8 L19.5 3.8 L15 6" />
          <circle cx="12" cy="12.5" r="7.5" />
          <circle cx="9" cy="10.5" r="0.9" fill={c} /><circle cx="15" cy="10.5" r="0.9" fill={c} />
          <ellipse cx="12" cy="15" rx="3.2" ry="2.3" />
          <circle cx="10.8" cy="15" r="0.55" fill={c} /><circle cx="13.2" cy="15" r="0.55" fill={c} />
        </g>
      )}
      {suit === 's' && (
        <g {...common}>
          <path d="M4 20 C9 20 9 15 12 15 C16 15 16 10 12.5 9.5 C9 9 8.5 5 13 4.5" />
          <ellipse cx="15.5" cy="4.6" rx="2.6" ry="1.9" />
          <circle cx="16.2" cy="4.1" r="0.55" fill={c} />
          <path d="M18 5.2 L20.2 5.8 M20.2 5.8 L21.2 5.2 M20.2 5.8 L21 6.8" />
        </g>
      )}
    </svg>
  );
}

const QUIPS: Record<Suit, string[]> = {
  c: ['Cats are Clubs. Patience wins pots.', 'Fold more preflop. Nap later.', 'Position is a sunny windowsill.'],
  d: ['Dogs are Diamonds. Loyal to the plan.', 'Log the hands — fetch the data.', 'Good dog: stick to your limit.'],
  h: ['Hogs are Hearts. Don’t hog the pot with weak kickers.', 'Equity is just truffles, statistically.', 'Oink. Check the confidence level.'],
  s: ['Snakes are Spades. Strike when ranges are capped.', 'Ssstay under your spending limit.', 'Shed bad habits: review your history.'],
};

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
        if (a.x < 16) { a.x = 16; a.vx = Math.abs(a.vx); }
        if (a.x > W - 16) { a.x = W - 16; a.vx = -Math.abs(a.vx); }
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
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-14 z-30 h-0 md:bottom-0" aria-hidden={false}>
      {crit.current.map((a) => {
        const bob = Math.abs(Math.sin(a.x / 9)) * (Math.abs(a.vx) > 0.05 ? 2 : 0);
        const y = -26 - a.hop * Math.sin(a.hop * Math.PI) * 26 - bob;
        const flip = a.vx < 0 ? -1 : 1;
        return (
          <div key={a.suit} className="absolute" style={{ left: a.x - 13, top: y }}>
            {a.say && (
              <div className="fade-up absolute bottom-8 left-1/2 w-44 -translate-x-1/2 rounded border border-line bg-panel2 px-2 py-1 font-mono text-[10px] leading-snug text-fg shadow">
                {a.say}
              </div>
            )}
            <button
              data-critter
              className={`pointer-events-auto block rounded-full p-0.5 ${a.mood === 'sad' ? 'shake' : ''}`}
              style={{ transform: `scaleX(${flip}) rotate(${a.mood === 'curious' ? -8 : 0}deg)`, opacity: 0.85 }}
              onClick={() => {
                const q = QUIPS[a.suit];
                a.say = q[Math.floor(Math.random() * q.length)];
                a.sayUntil = performance.now() + 2600;
                a.hop = 1;
              }}
              aria-label={`${ANIMAL_SUITS[a.suit].animal} — ${ANIMAL_SUITS[a.suit].suitName}. Tap for a tip.`}
            >
              <AnimalIcon suit={a.suit} size={26} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
