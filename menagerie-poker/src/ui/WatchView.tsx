import { useRef, useState } from 'react';
import { RANKS, makeRng, rankValue } from '../poker/cards';
import { ACTIVE_PACK, POSITIONS, type Position } from '../data/strategy';
import { limitStatus, makeQuestion, sessionNet } from '../poker/practice';
import { cryptoId } from '../poker/profile';
import { Panel, pct } from './kit';
import { AnimalIcon } from './Animals';
import { ACTION_COLOR } from './MatrixView';
import { animalBus, buzz, useStore } from '../state/store';

const SCREENS = ['Hand', 'Session', 'Quiz'] as const;
const HAPTICS: Record<string, number[]> = { tick: [6], confirm: [25], wrong: [40, 60, 40], limit: [200, 100, 200] };
const rng = makeRng(99);

/** Galaxy Watch 5 concept: 396×396 round display (40mm), touch bezel → rotate, swipe → screens. */
export function WatchView() {
  const { s, d } = useStore();
  const [screen, setScreen] = useState(0);
  const [field, setField] = useState<0 | 1 | 2 | 3>(0);
  const [hand, setHand] = useState({ r1: 0, r2: 1, suited: true, pos: 3 });
  const [q, setQ] = useState(() => makeQuestion(ACTIVE_PACK, rng, 'RFI'));
  const [qRes, setQRes] = useState<boolean | null>(null);
  const [lastBuzz, setLastBuzz] = useState('—');
  const touch = useRef<number | null>(null);

  const hap = (k: keyof typeof HAPTICS) => { const ok = buzz(s.settings.haptics, HAPTICS[k]); setLastBuzz(`${k} ${JSON.stringify(HAPTICS[k])}${ok ? '' : ' (no vibration API — shown only)'}`); };
  const go = (dir: number) => { setScreen((x) => (x + dir + SCREENS.length) % SCREENS.length); hap('tick'); };
  const rotate = (dir: number) => {
    hap('tick');
    if (screen !== 0) return go(dir);
    setHand((h) => {
      if (field === 0) return { ...h, r1: (h.r1 + dir + 13) % 13 };
      if (field === 1) return { ...h, r2: (h.r2 + dir + 13) % 13 };
      if (field === 2) return { ...h, suited: !h.suited };
      return { ...h, pos: (h.pos + dir + POSITIONS.length) % POSITIONS.length };
    });
  };

  const r1 = RANKS[hand.r1], r2 = RANKS[hand.r2];
  const [hi, lo] = rankValue(r1) >= rankValue(r2) ? [r1, r2] : [r2, r1];
  const label = hi === lo ? hi + lo : hi + lo + (hand.suited ? 's' : 'o');
  const pos = POSITIONS[hand.pos] as Position;
  const act = pos === 'BB' ? null : ACTIVE_PACK.decide(label, pos, 100, 'RFI');

  const net = sessionNet(s.session.entries);
  const st = limitStatus(s.session.entries, s.session.limit);
  const used = Math.min(1, Math.max(0, -net / s.session.limit.maxLoss));

  const answer = (a: 'raise' | 'fold') => {
    if (qRes !== null) { setQ(makeQuestion(ACTIVE_PACK, rng, 'RFI')); setQRes(null); return; }
    const ok = a === q.answer;
    setQRes(ok); hap(ok ? 'confirm' : 'wrong');
    animalBus.emit(ok ? 'happy' : 'sad');
    d({ t: 'quiz/add', r: { id: cryptoId(), ts: Date.now(), hand: q.hand, pos: q.pos, stack: q.stack, scenario: q.scenario, answer: q.answer, given: a, correct: ok, packId: ACTIVE_PACK.id } });
  };

  return (
    <div className="grid gap-3 lg:grid-cols-[auto_minmax(0,1fr)]">
      <Panel title="Galaxy Watch 5 · concept">
        <div className="flex flex-col items-center gap-3">
          <div
            className="relative grid aspect-square w-[min(78vw,300px)] select-none place-items-center rounded-full border-[10px] border-[#24282c] bg-black shadow-[0_0_0_2px_#33383d,0_10px_40px_rgba(0,0,0,.6)]"
            onWheel={(e) => rotate(e.deltaY > 0 ? 1 : -1)}
            onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => { if (touch.current === null) return; const dx = e.changedTouches[0].clientX - touch.current; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); touch.current = null; }}
            role="application" aria-label="Watch face. Scroll or use bezel buttons to rotate; swipe to change screen."
          >
            <div className="absolute top-[9%] flex gap-1">{SCREENS.map((_, i) => <i key={i} className={`h-1 w-1 rounded-full ${i === screen ? 'bg-fg' : 'bg-faint'}`} />)}</div>
            {screen === 0 && (
              <div className="fade-up flex flex-col items-center gap-1 font-mono">
                <div className="text-[9px] text-dim">QUICK HAND · 100bb RFI</div>
                <div className="flex items-center gap-1 text-3xl">
                  {[r1, r2].map((r, i) => (
                    <button key={i} onClick={() => setField(i as 0 | 1)} className={`rounded px-1.5 ${field === i ? 'bg-panel2 text-fg' : 'text-dim'}`}>{r}</button>
                  ))}
                </div>
                <div className="flex gap-1 text-[11px]">
                  <button onClick={() => setField(2)} className={`rounded px-1.5 py-0.5 ${field === 2 ? 'bg-panel2' : 'text-dim'}`}>{hi === lo ? 'pair' : hand.suited ? 'suited' : 'offsuit'}</button>
                  <button onClick={() => setField(3)} className={`rounded px-1.5 py-0.5 ${field === 3 ? 'bg-panel2' : 'text-dim'}`}>{pos}</button>
                </div>
                <button onClick={() => hap('confirm')} className="mt-1 text-2xl uppercase" style={{ color: act && act !== 'fold' ? ACTION_COLOR[act] : 'var(--color-dim)' }}>{act ?? 'n/a'}</button>
                <div className="text-[8px] text-faint">illustrative pack</div>
              </div>
            )}
            {screen === 1 && (
              <div className="fade-up relative grid place-items-center font-mono">
                <svg width="150" height="150" viewBox="0 0 100 100" className="-rotate-90">
                  <circle cx="50" cy="50" r="44" fill="none" stroke="#1b1f23" strokeWidth="6" />
                  <circle cx="50" cy="50" r="44" fill="none" strokeWidth="6" strokeLinecap="round"
                    stroke={st === 'stop' ? 'var(--color-bad)' : st === 'warn' ? 'var(--color-warn)' : 'var(--color-acc)'}
                    strokeDasharray={`${used * 276.5} 276.5`} className="transition-all duration-500" />
                </svg>
                <div className="absolute text-center">
                  <div className="text-[9px] text-dim">NET</div>
                  <div className={`text-xl ${net < 0 ? 'text-bad' : 'text-acc'}`}>{net.toFixed(2)}</div>
                  <div className="text-[9px] text-dim">limit {s.session.limit.currency}{s.session.limit.maxLoss}</div>
                  {st !== 'ok' && <div className="blink text-[9px] text-bad">{st === 'stop' ? 'STOP' : 'NEAR LIMIT'}</div>}
                </div>
              </div>
            )}
            {screen === 2 && (
              <div className="fade-up flex flex-col items-center gap-1.5 font-mono">
                <div className="text-[9px] text-dim">{q.pos} · {q.stack}bb · open?</div>
                <div className="flex items-center gap-1 text-2xl">
                  {q.cards.map((c) => <span key={c.rank + c.suit} className="flex items-center">{c.rank}<AnimalIcon suit={c.suit} size={16} /></span>)}
                </div>
                <div className="flex gap-2">
                  {(['fold', 'raise'] as const).map((a) => (
                    <button key={a} onClick={() => answer(a)} className="rounded-full border border-line px-3 py-1.5 text-[11px] uppercase">{a}</button>
                  ))}
                </div>
                <div className="h-3 text-[10px]">{qRes === null ? '' : qRes ? <span className="text-acc">✓ tap for next</span> : <span className="text-bad">pack: {q.answer} · tap</span>}</div>
              </div>
            )}
          </div>
          <div className="flex gap-2 font-mono text-[11px]">
            <button className="rounded border border-line px-3 py-1.5" onClick={() => rotate(-1)} aria-label="Rotate bezel counter-clockwise">⟲ bezel</button>
            <button className="rounded border border-line px-3 py-1.5" onClick={() => go(-1)} aria-label="Previous screen">‹</button>
            <button className="rounded border border-line px-3 py-1.5" onClick={() => go(1)} aria-label="Next screen">›</button>
            <button className="rounded border border-line px-3 py-1.5" onClick={() => rotate(1)} aria-label="Rotate bezel clockwise">bezel ⟳</button>
          </div>
        </div>
      </Panel>
      <Panel title="Companion notes">
        <ul className="grid gap-1.5 text-[12px] text-dim">
          <li><b className="text-fg">Concept, running in the browser.</b> Not a Wear OS build; the Galaxy Watch 5 shape and touch bezel are simulated.</li>
          <li>Navigation: rotate bezel (scroll wheel / buttons) to change the focused field, swipe or ‹ › to switch screens.</li>
          <li>Haptics use the Vibration API (works on Android Chrome). Last pattern: <code className="font-mono text-fg">{lastBuzz}</code></li>
          <li>Haptic map: tick 6ms · confirm 25ms · wrong 40-60-40 · loss limit 200-100-200.</li>
          <li>Session ring mirrors the History tab; it buzzes and flashes when the loss limit is near.</li>
          <li>Quiz answers sync to your results ({s.quiz.length} logged, {pct(s.quiz.length ? s.quiz.filter((r) => r.correct).length / s.quiz.length : 0, 0)} correct).</li>
        </ul>
      </Panel>
    </div>
  );
}
