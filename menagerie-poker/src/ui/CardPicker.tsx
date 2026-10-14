import { useEffect, useRef } from 'react';
import { ANIMAL_SUITS, RANKS, SUITS, type Card, type Rank, type Suit, fullDeck, makeRng, sameCard, shuffle } from '../poker/cards';
import { AnimalIcon, SUIT_COLOR } from './Animals';
import { animalBus } from '../state/store';

/**
 * One-tap card grid (rows = animal suits). Keyboard: type rank then suit letter, e.g. "a" "h" → A of Hogs (Hearts).
 * Backspace removes the last card.
 */
export function CardPicker({ value, onChange, max, blocked = [], keyboard = true, label }: {
  value: Card[]; onChange: (c: Card[]) => void; max: number; blocked?: Card[]; keyboard?: boolean; label: string;
}) {
  const pending = useRef<Rank | null>(null);
  const toggle = (c: Card) => {
    if (blocked.some((b) => sameCard(b, c))) return;
    if (value.some((v) => sameCard(v, c))) return onChange(value.filter((v) => !sameCard(v, c)));
    const next = value.length >= max ? [...value.slice(1), c] : [...value, c];
    animalBus.emit('curious', c.suit);
    onChange(next);
  };

  useEffect(() => {
    if (!keyboard) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const k = e.key.toUpperCase();
      if (e.key === 'Backspace') { onChange(value.slice(0, -1)); return; }
      if (k === '1' || k === '0') { pending.current = 'T'; return; }
      if ((RANKS as readonly string[]).includes(k)) { pending.current = k as Rank; return; }
      const suit = k.toLowerCase() as Suit;
      if (pending.current && (SUITS as readonly string[]).includes(suit)) {
        toggle({ rank: pending.current, suit });
        pending.current = null;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const random = () => {
    const avail = fullDeck().filter((c) => !blocked.some((b) => sameCard(b, c)));
    onChange(shuffle(avail, makeRng(Date.now())).slice(0, max));
  };

  return (
    <div aria-label={label}>
      <div className="grid gap-1" style={{ gridTemplateColumns: 'auto repeat(13, minmax(0,1fr))' }}>
        {SUITS.map((s) => (
          <Row key={s} suit={s} value={value} blocked={blocked} onPick={toggle} />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 font-mono text-[10px] text-faint">
        <span className="hidden sm:inline">Keys: rank + c/d/h/s · ⌫ undo</span>
        <span className="sm:hidden">{value.length}/{max} picked</span>
        <span className="flex gap-1">
          <button className="rounded border border-line px-2 py-1 text-dim hover:text-fg" onClick={random}>Random</button>
          <button className="rounded border border-line px-2 py-1 text-dim hover:text-fg disabled:opacity-30" disabled={!value.length} onClick={() => onChange([])}>Clear</button>
        </span>
      </div>
    </div>
  );
}

function Row({ suit, value, blocked, onPick }: { suit: Suit; value: Card[]; blocked: Card[]; onPick: (c: Card) => void }) {
  return (
    <>
      <div className="flex items-center pr-1" title={`${ANIMAL_SUITS[suit].animal}s = ${ANIMAL_SUITS[suit].suitName}`}>
        <AnimalIcon suit={suit} size={16} />
      </div>
      {RANKS.map((r) => {
        const c = { rank: r, suit };
        const on = value.some((v) => sameCard(v, c));
        const off = blocked.some((b) => sameCard(b, c));
        return (
          <button
            key={r}
            disabled={off}
            onClick={() => onPick(c)}
            aria-pressed={on}
            aria-label={`${r} of ${ANIMAL_SUITS[suit].suitName} (${ANIMAL_SUITS[suit].animal})`}
            className="h-8 min-w-0 rounded-sm border font-mono text-[11px] transition-all disabled:opacity-15"
            style={{
              borderColor: on ? SUIT_COLOR[suit] : 'var(--color-line)',
              background: on ? `color-mix(in srgb, ${SUIT_COLOR[suit]} 22%, transparent)` : 'var(--color-panel2)',
              color: on ? 'var(--color-fg)' : SUIT_COLOR[suit],
            }}
          >
            {r}
          </button>
        );
      })}
    </>
  );
}
