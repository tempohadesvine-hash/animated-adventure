import { useEffect, useRef, useState } from 'react';
import { limitStatus, sessionNet, summarize, validateAmount } from '../poker/practice';
import { cryptoId } from '../poker/profile';
import { Btn, Panel, pct } from './kit';
import { animalBus, buzz, useStore } from '../state/store';

export function HistoryView() {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <SessionPanel />
      <LogPanel />
    </div>
  );
}

function SessionPanel() {
  const { s, d } = useStore();
  const { entries, limit } = s.session;
  const [amt, setAmt] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [limitDraft, setLimitDraft] = useState(String(limit.maxLoss));
  const net = sessionNet(entries);
  const status = limitStatus(entries, limit);
  const prev = useRef(status);
  const used = Math.min(1, Math.max(0, -net / Math.max(limit.maxLoss, 0.01)));

  useEffect(() => {
    if (status !== prev.current && status !== 'ok') {
      animalBus.emit('alert');
      buzz(s.settings.haptics, status === 'stop' ? [200, 100, 200] : [80, 60, 80]);
    }
    prev.current = status;
  }, [status, s.settings.haptics]);

  const add = () => {
    try {
      const v = validateAmount(amt);
      d({ t: 'session/add', e: { id: cryptoId(), ts: Date.now(), amount: v, note: note.trim().slice(0, 80) } });
      setAmt(''); setNote(''); setErr(null);
    } catch (e) { setErr((e as Error).message); }
  };
  const saveLimit = () => {
    const v = Number(limitDraft);
    if (!Number.isFinite(v) || v <= 0 || v > 100000) { setErr('Limit must be a positive number.'); return; }
    d({ t: 'session/limit', limit: { ...limit, maxLoss: Math.round(v * 100) / 100 } }); setErr(null);
  };

  const tone = status === 'stop' ? 'text-bad' : status === 'warn' ? 'text-warn' : 'text-acc';
  return (
    <Panel title="Session results · spending limit">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] text-dim">NET THIS SESSION</div>
          <div className={`font-mono text-3xl ${net < 0 ? 'text-bad' : 'text-acc'}`}>{net >= 0 ? '+' : '−'}{limit.currency}{Math.abs(net).toFixed(2)}</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-[10px] text-dim">MAX LOSS</div>
          <div className="flex items-center gap-1">
            <span className="font-mono text-[12px] text-dim">{limit.currency}</span>
            <input aria-label="Maximum loss" value={limitDraft} onChange={(e) => setLimitDraft(e.target.value)} onBlur={saveLimit} inputMode="decimal"
              className="w-16 rounded border border-line bg-panel2 px-1.5 py-1 text-right font-mono text-[12px]" />
          </div>
        </div>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded bg-panel2" role="meter" aria-valuenow={Math.round(used * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Share of loss limit used">
        <div className={`h-full transition-all duration-500 ${status === 'stop' ? 'bg-bad' : status === 'warn' ? 'bg-warn' : 'bg-acc'}`} style={{ width: pct(used) }} />
      </div>
      <p className={`mt-1 font-mono text-[11px] ${tone} ${status !== 'ok' ? 'blink' : ''}`}>
        {status === 'stop' ? 'LIMIT REACHED — stop playing this session.' : status === 'warn' ? `75% of limit used · ${limit.currency}${(limit.maxLoss + net).toFixed(2)} left` : `${limit.currency}${(limit.maxLoss + Math.min(0, net)).toFixed(2)} of ${limit.currency}${limit.maxLoss} left`}
      </p>
      <form className="mt-3 flex flex-wrap gap-1" onSubmit={(e) => { e.preventDefault(); add(); }}>
        <input value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="−5 or 12.50" inputMode="decimal" aria-label="Amount"
          className="w-28 rounded border border-line bg-panel2 px-2 py-1.5 font-mono text-[12px] placeholder:text-faint" />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="note (optional)" aria-label="Note"
          className="min-w-0 flex-1 rounded border border-line bg-panel2 px-2 py-1.5 text-[12px] placeholder:text-faint" />
        <Btn tone="primary" disabled={status === 'stop' && Number(amt) < 0} title={status === 'stop' ? 'Limit reached' : undefined}>Log</Btn>
      </form>
      {err && <p role="alert" className="mt-1 font-mono text-[11px] text-bad">{err}</p>}
      <ul className="mt-2 grid max-h-48 gap-1 overflow-auto">
        {entries.map((e) => (
          <li key={e.id} className="flex items-center justify-between gap-2 font-mono text-[11px]">
            <span className="text-dim">{new Date(e.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {e.note}</span>
            <span className="flex items-center gap-2">
              <span className={e.amount < 0 ? 'text-bad' : 'text-acc'}>{e.amount > 0 ? '+' : ''}{e.amount.toFixed(2)}</span>
              <button aria-label="Remove entry" className="text-faint hover:text-bad" onClick={() => d({ t: 'session/remove', id: e.id })}>×</button>
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-2"><Btn onClick={() => d({ t: 'session/reset' })} disabled={!entries.length}>New session</Btn></div>
    </Panel>
  );
}

function LogPanel() {
  const { s, d } = useStore();
  const [confirm, setConfirm] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const copyJson = () => {
    navigator.clipboard?.writeText(JSON.stringify(s, null, 2))
      .then(() => setCopied('Copied'), () => setCopied('Copy blocked here — use Download'))
      ?? setCopied('Clipboard unavailable — use Download');
    setTimeout(() => setCopied(null), 2500);
  };
  const sum = summarize(s.quiz);
  const exportJson = () => {
    const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `animal-poker-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const byScenario = (['RFI', 'vsOpen', 'pushFold'] as const).map((sc) => {
    const r = s.quiz.filter((q) => q.scenario === sc);
    return { sc, n: r.length, acc: r.length ? r.filter((q) => q.correct).length / r.length : 0 };
  });
  return (
    <Panel title="Hand history & stats" right={<span className="flex items-center gap-1">{copied && <span className="font-mono text-[10px] text-dim">{copied}</span>}<Btn onClick={copyJson}>Copy JSON</Btn><Btn onClick={exportJson}>Download</Btn></span>}>
      <div className="grid grid-cols-3 gap-2">
        {byScenario.map((b) => (
          <div key={b.sc} className="rounded border border-line bg-panel2 px-2 py-1.5">
            <div className="font-mono text-[10px] text-dim">{b.sc}</div>
            <div className="font-mono text-lg">{b.n ? pct(b.acc, 0) : '—'}</div>
            <div className="font-mono text-[9px] text-faint">{b.n} quiz</div>
          </div>
        ))}
      </div>
      <p className="mt-1 font-mono text-[10px] text-dim">Overall {pct(sum.accuracy, 0)} over {sum.total} · best streak {sum.bestStreak}</p>
      <ul className="mt-3 grid max-h-72 gap-1 overflow-auto">
        {s.history.map((h) => (
          <li key={h.id} className="group flex items-start justify-between gap-2 rounded border border-line px-2 py-1.5">
            <div className="min-w-0">
              <div className="truncate font-mono text-[11px]"><span className="text-faint">{h.kind.toUpperCase()}</span> {h.title}</div>
              <div className="truncate font-mono text-[10px] text-dim">{h.detail}</div>
            </div>
            <button aria-label="Delete history item" className="text-faint hover:text-bad" onClick={() => d({ t: 'history/remove', id: h.id })}>×</button>
          </li>
        ))}
        {!s.history.length && <li className="text-[12px] text-dim">Nothing yet — save an equity run or play an equity drill.</li>}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <Btn onClick={() => d({ t: 'history/clear' })} disabled={!s.history.length}>Clear history</Btn>
        <Btn onClick={() => d({ t: 'quiz/clear' })} disabled={!s.quiz.length}>Clear quiz stats</Btn>
        {confirm
          ? <><Btn tone="danger" onClick={() => { d({ t: 'reset' }); setConfirm(false); }}>Confirm reset</Btn><Btn onClick={() => setConfirm(false)}>Cancel</Btn></>
          : <Btn tone="danger" onClick={() => setConfirm(true)}>Reset all data</Btn>}
      </div>
    </Panel>
  );
}
