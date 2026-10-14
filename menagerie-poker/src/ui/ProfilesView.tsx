import { useState } from 'react';
import { computeStats, cryptoId, EXPLOIT_TIPS, newProfile, type ObservedAction, type PlayerProfile, type PlayerType } from '../poker/profile';
import { Btn, Panel, pct } from './kit';
import { animalBus, buzz, useStore } from '../state/store';

const ACTS: { a: ObservedAction; label: string; group: 'pre' | 'post' }[] = [
  { a: 'pf_fold', label: 'Fold', group: 'pre' }, { a: 'pf_call', label: 'Limp/Call', group: 'pre' }, { a: 'pf_raise', label: 'Raise', group: 'pre' },
  { a: 'bet', label: 'Bet/Raise', group: 'post' }, { a: 'call', label: 'Call', group: 'post' }, { a: 'check', label: 'Check', group: 'post' }, { a: 'fold', label: 'Fold', group: 'post' },
];
const TYPES: PlayerType[] = ['Unknown', 'Nit', 'TAG', 'LAG', 'Calling station', 'Loose-passive', 'Maniac'];
const CONF_COLOR = { none: 'text-faint', low: 'text-bad', medium: 'text-warn', high: 'text-acc' };

export function ProfilesView() {
  const { s, d } = useStore();
  const [sel, setSel] = useState<string | null>(s.profiles[0]?.id ?? null);
  const [name, setName] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const p = s.profiles.find((x) => x.id === sel) ?? null;

  const add = () => {
    try {
      const np = newProfile(name);
      d({ t: 'profile/add', p: np }); setSel(np.id); setName(''); setErr(null);
    } catch (e) { setErr((e as Error).message); }
  };

  return (
    <div className="grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">
      <Panel title={`Players · ${s.profiles.length}`}>
        <form className="mb-2 flex gap-1" onSubmit={(e) => { e.preventDefault(); add(); }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seat / nickname" maxLength={40}
            className="min-w-0 flex-1 rounded border border-line bg-panel2 px-2 py-1.5 text-[12px] placeholder:text-faint" />
          <Btn tone="primary">Add</Btn>
        </form>
        {err && <p role="alert" className="mb-2 font-mono text-[11px] text-bad">{err}</p>}
        <ul className="grid gap-1">
          {s.profiles.map((x) => {
            const st = computeStats(x);
            return (
              <li key={x.id}>
                <button onClick={() => setSel(x.id)} className={`w-full rounded border px-2 py-1.5 text-left transition-colors ${sel === x.id ? 'border-acc/50 bg-panel2' : 'border-line hover:bg-panel2'}`}>
                  <div className="truncate text-[12px]">{x.name}</div>
                  <div className="font-mono text-[10px] text-dim">{st.type} · <span className={CONF_COLOR[st.confidence]}>{st.confidence}</span> · {st.hands}h</div>
                </button>
              </li>
            );
          })}
          {!s.profiles.length && <li className="text-[12px] text-dim">No players yet. Add one above.</li>}
        </ul>
      </Panel>
      {p ? <ProfileDetail key={p.id} p={p} onDeleted={() => setSel(null)} /> : <Panel title="Profile"><p className="text-[12px] text-dim">Select or add a player.</p></Panel>}
    </div>
  );
}

function ProfileDetail({ p, onDeleted }: { p: PlayerProfile; onDeleted: () => void }) {
  const { s, d } = useStore();
  const [draft, setDraft] = useState<ObservedAction[]>([]);
  const [confirmDel, setConfirmDel] = useState(false);
  const st = computeStats(p);

  const push = (a: ObservedAction) => {
    const isPre = a.startsWith('pf_');
    if (isPre && draft.some((x) => x.startsWith('pf_'))) return; // one preflop decision per hand
    if (!isPre && !draft.length) return;
    if (!isPre && draft[0] === 'pf_fold') return;
    setDraft([...draft, a]);
    buzz(s.settings.haptics, 8);
  };
  const commit = () => {
    if (!draft.length) return;
    d({ t: 'profile/observe', id: p.id, obs: { id: cryptoId(), ts: Date.now(), actions: draft } });
    setDraft([]);
    animalBus.emit('curious');
  };
  const setOverride = (k: 'vpip' | 'pfr' | 'af', raw: string) => {
    let v: number | null = null;
    if (raw.trim() !== '') {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0) return;
      v = k === 'af' ? Math.min(n, 20) : Math.min(n, 100) / 100;
    }
    d({ t: 'profile/update', id: p.id, patch: { override: { ...p.override, [k]: v } } });
  };

  return (
    <div className="grid content-start gap-3">
      <Panel title={p.name} right={
        confirmDel
          ? <span className="flex gap-1"><Btn tone="danger" onClick={() => { d({ t: 'profile/remove', id: p.id }); onDeleted(); }}>Confirm</Btn><Btn onClick={() => setConfirmDel(false)}>Cancel</Btn></span>
          : <Btn tone="danger" onClick={() => setConfirmDel(true)}>Delete</Btn>
      }>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="VPIP" v={pct(st.vpip, 0)} sub={st.hands ? `95% CI ${pct(st.vpipCI[0], 0)}–${pct(st.vpipCI[1], 0)}` : 'no data'} over={p.override.vpip !== null} />
          <Stat label="PFR" v={pct(st.pfr, 0)} over={p.override.pfr !== null} />
          <Stat label="AF" v={st.af.toFixed(1)} sub="bets÷calls postflop" over={p.override.af !== null} />
          <Stat label="Confidence" v={st.confidence} sub={`${st.hands} hands`} cls={CONF_COLOR[st.confidence]} />
        </div>
        <div className="mt-3 rounded border border-line bg-panel2 p-2.5">
          <div className="font-mono text-[10px] text-dim">READ {st.typeIsOverride && '· MANUAL'}</div>
          <div className="font-mono text-lg text-acc">{st.type}</div>
          <p className="text-[12px] text-dim">{EXPLOIT_TIPS[st.type]}</p>
          <p className="mt-1 font-mono text-[9px] text-faint">Classification cut-offs are common rules of thumb (not validated). Low-sample reads are unreliable.</p>
        </div>
      </Panel>

      <Panel title="Log a hand" right={<Btn onClick={() => d({ t: 'profile/undo', id: p.id })} disabled={!p.hands.length}>Undo last</Btn>}>
        {(['pre', 'post'] as const).map((g) => (
          <div key={g} className="mb-2">
            <div className="mb-1 font-mono text-[10px] text-dim">{g === 'pre' ? 'PREFLOP (one)' : 'POSTFLOP (any order)'}</div>
            <div className="flex flex-wrap gap-1">
              {ACTS.filter((x) => x.group === g).map((x) => <Btn key={x.a} onClick={() => push(x.a)}>{x.label}</Btn>)}
            </div>
          </div>
        ))}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <code className="min-h-7 flex-1 rounded border border-line bg-ink px-2 py-1 font-mono text-[11px] text-dim">{draft.length ? draft.join(' → ') : 'Tap actions as you see them…'}</code>
          <Btn onClick={() => setDraft([])} disabled={!draft.length}>Clear</Btn>
          <Btn tone="primary" onClick={commit} disabled={!draft.length}>Save hand</Btn>
        </div>
      </Panel>

      <Panel title="Edit tendencies">
        <div className="grid grid-cols-3 gap-2">
          {(['vpip', 'pfr', 'af'] as const).map((k) => (
            <label key={k} className="grid gap-1">
              <span className="font-mono text-[10px] text-dim uppercase">{k}{k !== 'af' && ' %'}</span>
              <input type="number" min={0} max={k === 'af' ? 20 : 100} step={k === 'af' ? 0.1 : 1} placeholder="auto"
                defaultValue={p.override[k] === null ? '' : k === 'af' ? p.override[k]! : Math.round(p.override[k]! * 100)}
                onBlur={(e) => setOverride(k, e.target.value)}
                className="rounded border border-line bg-panel2 px-2 py-1.5 font-mono text-[12px] placeholder:text-faint" />
            </label>
          ))}
        </div>
        <label className="mt-2 grid gap-1">
          <span className="font-mono text-[10px] text-dim">TYPE</span>
          <select value={p.override.type ?? ''} onChange={(e) => d({ t: 'profile/update', id: p.id, patch: { override: { ...p.override, type: (e.target.value || null) as PlayerType | null } } })}
            className="rounded border border-line bg-panel2 px-2 py-1.5 text-[12px]">
            <option value="">Auto (from stats)</option>
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label className="mt-2 grid gap-1">
          <span className="font-mono text-[10px] text-dim">NOTES</span>
          <textarea defaultValue={p.notes} onBlur={(e) => d({ t: 'profile/update', id: p.id, patch: { notes: e.target.value } })} rows={2} maxLength={1000}
            className="rounded border border-line bg-panel2 px-2 py-1.5 text-[12px]" />
        </label>
        <p className="mt-1 font-mono text-[9px] text-faint">Leave a field blank to use observed stats. Saved on blur.</p>
      </Panel>
    </div>
  );
}

function Stat({ label, v, sub, over, cls = '' }: { label: string; v: string; sub?: string; over?: boolean; cls?: string }) {
  return (
    <div className="rounded border border-line bg-panel2 px-2 py-1.5">
      <div className="font-mono text-[10px] text-dim">{label}{over && <span className="text-warn"> · edited</span>}</div>
      <div className={`font-mono text-lg ${cls}`}>{v}</div>
      {sub && <div className="font-mono text-[9px] text-faint">{sub}</div>}
    </div>
  );
}
