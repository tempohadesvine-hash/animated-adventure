import type { ReactNode } from 'react';
import { ANIMAL_SUITS, type Card } from '../poker/cards';
import { STATUS_INFO, type DataStatus } from '../data/strategy';
import { AnimalIcon, SUIT_COLOR } from './Animals';

export function Panel({ title, right, children, className = '' }: { title?: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-md border border-line bg-panel ${className}`}>
      {title && (
        <header className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
          <h2 className="font-mono text-[11px] tracking-[0.14em] text-dim uppercase">{title}</h2>
          {right}
        </header>
      )}
      <div className="p-3">{children}</div>
    </section>
  );
}

export function Seg<T extends string | number>({ value, options, onChange, label }: {
  value: T; options: { v: T; label: string; disabled?: boolean }[]; onChange: (v: T) => void; label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-px overflow-hidden rounded border border-line bg-line">
      {options.map((o) => (
        <button
          key={String(o.v)}
          role="radio"
          aria-checked={o.v === value}
          disabled={o.disabled}
          onClick={() => onChange(o.v)}
          className={`flex-1 px-2.5 py-1.5 font-mono text-[11px] transition-colors disabled:opacity-30 ${
            o.v === value ? 'bg-panel2 text-fg' : 'bg-panel text-dim hover:text-fg'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function StatusBadge({ status }: { status: DataStatus }) {
  const tone = status === 'verified' || status === 'computed' ? 'text-acc border-acc/40' : 'text-warn border-warn/40';
  return (
    <span title={STATUS_INFO[status].desc} className={`inline-block rounded-sm border px-1.5 py-px font-mono text-[9px] tracking-widest ${tone}`}>
      {STATUS_INFO[status].label}
    </span>
  );
}

export function CardChip({ card, size = 'md', onClick, dim }: { card: Card; size?: 'sm' | 'md' | 'lg'; onClick?: () => void; dim?: boolean }) {
  const s = { sm: 'h-9 w-7 text-sm', md: 'h-14 w-10 text-lg', lg: 'h-20 w-14 text-2xl' }[size];
  const icon = { sm: 12, md: 16, lg: 22 }[size];
  const a = ANIMAL_SUITS[card.suit];
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      aria-label={`${card.rank} of ${a.suitName} (${a.animal})`}
      className={`relative flex flex-col items-center justify-center rounded border bg-panel2 font-mono font-semibold ${s} ${dim ? 'opacity-40' : ''}`}
      style={{ borderColor: SUIT_COLOR[card.suit], color: SUIT_COLOR[card.suit] }}
    >
      <span className="leading-none">{card.rank === 'T' ? '10' : card.rank}</span>
      <AnimalIcon suit={card.suit} size={icon} />
    </Tag>
  );
}

export function Btn({ children, onClick, tone = 'default', disabled, className = '', title }: {
  children: ReactNode; onClick?: () => void; tone?: 'default' | 'primary' | 'danger'; disabled?: boolean; className?: string; title?: string;
}) {
  const t = {
    default: 'border-line text-fg hover:bg-panel2',
    primary: 'border-acc/50 text-acc hover:bg-acc/10',
    danger: 'border-bad/50 text-bad hover:bg-bad/10',
  }[tone];
  return (
    <button title={title} disabled={disabled} onClick={onClick} className={`rounded border px-3 py-1.5 font-mono text-[11px] tracking-wide transition-colors disabled:opacity-35 ${t} ${className}`}>
      {children}
    </button>
  );
}

export const pct = (x: number, d = 1) => `${(x * 100).toFixed(d)}%`;
