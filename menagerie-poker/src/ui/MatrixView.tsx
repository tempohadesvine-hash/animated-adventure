import { useEffect, useMemo, useState } from 'react';
import { buildMatrix, chenScore, combosFor } from '../poker/matrix';
import {
  ACTIVE_PACK, POSITIONS, SCENARIOS, STACKS, spotUnavailableReason,
  type Action, type Position, type Scenario, type StackDepth,
} from '../data/strategy';
import { EQ_SAMPLES, computeAllEquities, equityProgress, getEquity, onEquity } from './equityCache';
import { Panel, Seg, StatusBadge, pct } from './kit';

export interface Spot { pos: Position; stack: StackDepth; scenario: Scenario }

export const ACTION_COLOR: Record<Action, string> = {
  raise: '#86ab9d', jam: '#86ab9d', '3bet': '#a990c2', call: '#5c7d77', fold: 'transparent',
};

export function SpotSelectors({ spot, setSpot }: { spot: Spot; setSpot: (s: Spot) => void }) {
  return (
    <div className="grid gap-2">
      <Seg label="Position" value={spot.pos} onChange={(pos) => setSpot({ ...spot, pos })} options={POSITIONS.map((p) => ({ v: p, label: p }))} />
      <div className="grid gap-2 sm:grid-cols-2">
        <Seg label="Stack depth" value={spot.stack} onChange={(stack) => setSpot({ ...spot, stack })}
          options={STACKS.map((s) => ({ v: s, label: `${s}bb` }))} />
        <Seg label="Scenario" value={spot.scenario} onChange={(scenario) => setSpot({ ...spot, scenario })}
          options={SCENARIOS.map((s) => ({ v: s.id, label: s.name }))} />
      </div>
    </div>
  );
}

type Mode = 'strategy' | 'chen' | 'equity';

export function MatrixView({ spot, setSpot, highlight }: { spot: Spot; setSpot: (s: Spot) => void; highlight?: string }) {
  const grid = useMemo(buildMatrix, []);
  const [mode, setMode] = useState<Mode>('strategy');
  const [sel, setSel] = useState<string>(highlight ?? 'AKs');
  const [, tick] = useState(0);
  useEffect(() => { if (highlight) setSel(highlight); }, [highlight]);
  useEffect(() => onEquity(() => tick((n) => n + 1)), []);
  useEffect(() => { if (mode === 'equity') computeAllEquities(); }, [mode]);

  const unavailable = spotUnavailableReason(spot.pos, spot.stack, spot.scenario);
  const decide = (h: string) => (unavailable ? null : ACTIVE_PACK.decide(h, spot.pos, spot.stack, spot.scenario));

  const freq = useMemo(() => {
    const tally: Partial<Record<Action, number>> = {};
    if (!unavailable) for (const c of grid.flat()) { const a = decide(c.label)!; tally[a] = (tally[a] ?? 0) + c.combos; }
    return tally;
  }, [spot, grid]);

  const cellStyle = (h: string) => {
    if (mode === 'chen') {
      const s = chenScore(h);
      const t = Math.max(0, Math.min(1, (s + 1) / 21));
      return { background: `color-mix(in srgb, #86ab9d ${Math.round(t * 85)}%, var(--color-panel2))` };
    }
    if (mode === 'equity') {
      const e = getEquity(h);
      if (e === undefined) return { background: 'var(--color-panel2)' };
      const t = Math.max(0, (e - 0.3) / 0.56);
      return { background: `color-mix(in srgb, #c8a768 ${Math.round(t * 85)}%, var(--color-panel2))` };
    }
    const a = decide(h);
    return { background: a && a !== 'fold' ? ACTION_COLOR[a] : 'var(--color-panel2)', color: a && a !== 'fold' ? '#0e1012' : undefined };
  };

  const selAction = decide(sel);
  const selEq = getEquity(sel);

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
      <Panel title="Starting-hand matrix · 169" right={<StatusBadge status={mode === 'equity' ? 'computed' : mode === 'chen' ? 'approximation' : ACTIVE_PACK.status} />}>
        <div className="mb-3 grid gap-2">
          <SpotSelectors spot={spot} setSpot={setSpot} />
          <Seg label="Colour by" value={mode} onChange={setMode} options={[
            { v: 'strategy', label: 'Pack action' }, { v: 'chen', label: 'Chen score' }, { v: 'equity', label: 'Equity vs random' },
          ]} />
        </div>
        {unavailable && mode === 'strategy' && (
          <p className="mb-2 rounded border border-warn/30 bg-warn/5 px-2 py-1.5 font-mono text-[11px] text-warn">{unavailable}</p>
        )}
        <div role="grid" aria-label="Hand matrix" className="mx-auto grid max-w-[640px] gap-px" style={{ gridTemplateColumns: 'repeat(13, minmax(0,1fr))' }}>
          {grid.flat().map((c) => (
            <button
              key={c.label}
              role="gridcell"
              aria-selected={sel === c.label}
              onClick={() => setSel(c.label)}
              className={`aspect-square min-w-0 overflow-hidden rounded-[2px] font-mono text-[8px] leading-none text-fg transition-[background] duration-300 sm:text-[10px] ${
                sel === c.label ? 'ring-1 ring-fg ring-offset-1 ring-offset-ink' : ''
              } ${c.kind === 'pair' ? 'font-semibold' : ''}`}
              style={cellStyle(c.label)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] text-dim">
          {mode === 'strategy' && !unavailable && (Object.keys(freq) as Action[]).map((a) => (
            <span key={a} className="flex items-center gap-1">
              <i className="inline-block h-2 w-2 rounded-sm border border-line" style={{ background: ACTION_COLOR[a] }} />
              {a} {pct((freq[a] ?? 0) / 1326)}
            </span>
          ))}
          {mode === 'equity' && <span>{equityProgress() < 1 ? `Computing… ${pct(equityProgress(), 0)}` : `${EQ_SAMPLES} Monte Carlo runouts per hand · ±~1.5%`}</span>}
          {mode === 'chen' && <span>Darker = higher Chen score (−1 … 20)</span>}
        </div>
      </Panel>

      <Panel title={`Hand · ${sel}`}>
        <dl className="grid grid-cols-2 gap-y-1.5 font-mono text-[12px]">
          <dt className="text-dim">Combos</dt><dd>{combosFor(sel).length}</dd>
          <dt className="text-dim">Chen score</dt><dd>{chenScore(sel)} <StatusBadge status="approximation" /></dd>
          <dt className="text-dim">Eq. vs random</dt><dd>{selEq !== undefined ? <>{pct(selEq)} <StatusBadge status="computed" /></> : <button className="text-acc underline" onClick={() => { setMode('equity'); computeAllEquities(); }}>compute</button>}</dd>
          <dt className="text-dim">Pack action</dt>
          <dd className="uppercase" style={{ color: selAction && selAction !== 'fold' ? ACTION_COLOR[selAction] : undefined }}>{selAction ?? '—'}</dd>
        </dl>
        <p className="mt-3 border-t border-line pt-2 text-[11px] leading-relaxed text-dim">
          <b className="text-fg">{ACTIVE_PACK.name}</b> — {ACTIVE_PACK.notes}
        </p>
      </Panel>
    </div>
  );
}
