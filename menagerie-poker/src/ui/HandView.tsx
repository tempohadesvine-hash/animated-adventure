import { useState } from 'react';
import { type Card, handLabel } from '../poker/cards';
import { monteCarloEquity, type EquityResult } from '../poker/equity';
import { ACTIVE_PACK, spotUnavailableReason } from '../data/strategy';
import { computeStats, EXPLOIT_TIPS, cryptoId } from '../poker/profile';
import { CardPicker } from './CardPicker';
import { ACTION_COLOR, SpotSelectors, type Spot } from './MatrixView';
import { Btn, CardChip, Panel, Seg, StatusBadge, pct } from './kit';
import { animalBus, buzz, useStore } from '../state/store';

export function HandView({ hole, setHole, spot, setSpot, onOpenMatrix }: {
  hole: Card[]; setHole: (c: Card[]) => void; spot: Spot; setSpot: (s: Spot) => void; onOpenMatrix: () => void;
}) {
  const { s, d } = useStore();
  const [board, setBoard] = useState<Card[]>([]);
  const [opps, setOpps] = useState(1);
  const [villain, setVillain] = useState<string>('');
  const [eq, setEq] = useState<EquityResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showBoard, setShowBoard] = useState(false);

  const label = hole.length === 2 ? handLabel(hole[0], hole[1]) : null;
  const unavailable = spotUnavailableReason(spot.pos, spot.stack, spot.scenario);
  const action = label && !unavailable ? ACTIVE_PACK.decide(label, spot.pos, spot.stack, spot.scenario) : null;
  const vp = s.profiles.find((p) => p.id === villain);
  const vStats = vp ? computeStats(vp) : null;

  const run = () => {
    if (hole.length !== 2) { setErr('Pick two hole cards first.'); return; }
    if (board.length > 0 && board.length < 3) { setErr('Board must be empty, or 3–5 cards.'); return; }
    setErr(null); setBusy(true);
    setTimeout(() => {
      try {
        const r = monteCarloEquity(hole as [Card, Card], opps, board, 5000, Date.now() % 1e9);
        setEq(r);
        animalBus.emit(r.equity >= 0.5 ? 'happy' : 'curious');
        buzz(s.settings.haptics, 20);
      } catch (e) {
        setErr((e as Error).message);
      } finally { setBusy(false); }
    }, 10);
  };

  const save = () => {
    if (!eq || !label) return;
    d({ t: 'history/add', h: {
      id: cryptoId(), ts: Date.now(), kind: 'equity',
      title: `${hole.map((c) => c.rank + c.suit).join(' ')}${board.length ? ' | ' + board.map((c) => c.rank + c.suit).join(' ') : ''}`,
      detail: `${pct(eq.equity)} ±${pct(eq.stdErr * 1.96)} vs ${opps} random · ${spot.pos} ${spot.stack}bb ${spot.scenario} → ${action ?? 'n/a'}`,
    } });
  };

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel title="Hole cards" right={<span className="font-mono text-[10px] text-faint">{label ?? 'pick 2'}</span>}>
        <div className="mb-3 flex items-center gap-2">
          {hole.map((c) => <CardChip key={c.rank + c.suit} card={c} size="lg" onClick={() => setHole(hole.filter((h) => h !== c))} />)}
          {Array.from({ length: 2 - hole.length }).map((_, i) => (
            <div key={i} className="flex h-20 w-14 items-center justify-center rounded border border-dashed border-line font-mono text-[10px] text-faint">?</div>
          ))}
          {board.length > 0 && <span className="mx-1 text-faint">|</span>}
          {board.map((c) => <CardChip key={c.rank + c.suit} card={c} size="sm" />)}
        </div>
        <CardPicker label="Hole card picker" value={hole} onChange={(c) => { setHole(c); setEq(null); }} max={2} blocked={board} />
        <div className="mt-3">
          <Btn onClick={() => setShowBoard((v) => !v)}>{showBoard ? 'Hide board' : `Board (${board.length})`}</Btn>
          {showBoard && (
            <div className="fade-up mt-2">
              <CardPicker label="Board picker" keyboard={false} value={board} onChange={(c) => { setBoard(c); setEq(null); }} max={5} blocked={hole} />
            </div>
          )}
        </div>
      </Panel>

      <div className="grid content-start gap-3">
        <Panel title="Spot & recommendation" right={<StatusBadge status={ACTIVE_PACK.status} />}>
          <SpotSelectors spot={spot} setSpot={setSpot} />
          <div className="mt-3 flex items-center justify-between gap-3 rounded border border-line bg-panel2 px-3 py-2.5">
            <div>
              <div className="font-mono text-[10px] text-dim">PACK SAYS</div>
              <div className="font-mono text-2xl uppercase" style={{ color: action && action !== 'fold' ? ACTION_COLOR[action] : 'var(--color-dim)' }}>
                {unavailable ? '—' : action ?? '…'}
              </div>
            </div>
            <Btn onClick={onOpenMatrix} disabled={!label}>See in matrix</Btn>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-dim">{unavailable ?? 'Illustrative thresholds over the Chen score — a teaching aid, not a solver result.'}</p>
        </Panel>

        <Panel title="Equity calculator" right={<StatusBadge status="computed" />}>
          <div className="mb-2 font-mono text-[10px] text-dim">OPPONENTS (random hands)</div>
          <Seg label="Opponents" value={opps} onChange={(v) => { setOpps(v); setEq(null); }} options={[1, 2, 3, 4, 5, 6, 8].map((n) => ({ v: n, label: String(n) }))} />
          <div className="mt-3 flex gap-2">
            <Btn tone="primary" onClick={run} disabled={busy}>{busy ? 'Running…' : 'Run 5,000 sims'}</Btn>
            <Btn onClick={save} disabled={!eq}>Save to history</Btn>
          </div>
          {err && <p role="alert" className="shake mt-2 font-mono text-[11px] text-bad">{err}</p>}
          {eq && (
            <div className="fade-up mt-3">
              <div className="flex items-baseline gap-2 font-mono">
                <span className="text-3xl text-warn">{pct(eq.equity)}</span>
                <span className="text-[11px] text-dim">±{pct(eq.stdErr * 1.96)} (95%)</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded bg-panel2">
                <div className="h-full bg-warn transition-all duration-500" style={{ width: pct(eq.equity) }} />
              </div>
              <p className="mt-1 font-mono text-[10px] text-dim">win {pct(eq.win)} · tie {pct(eq.tie)} · {eq.samples.toLocaleString()} runouts</p>
            </div>
          )}
        </Panel>

        <Panel title="Opponent read">
          <select value={villain} onChange={(e) => setVillain(e.target.value)} className="w-full rounded border border-line bg-panel2 px-2 py-1.5 text-[12px]">
            <option value="">No opponent selected</option>
            {s.profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {vStats && (
            <p className="fade-up mt-2 text-[12px] leading-relaxed">
              <span className="font-mono text-acc">{vStats.type}</span>
              <span className="font-mono text-[10px] text-dim"> · {vStats.confidence} confidence · {vStats.hands} hands</span><br />
              <span className="text-dim">{EXPLOIT_TIPS[vStats.type]}</span>
              <span className="mt-1 block font-mono text-[9px] text-faint">Heuristic advice, not validated data.</span>
            </p>
          )}
        </Panel>
      </div>
    </div>
  );
}
