import { useEffect, useState } from 'react';
import { type Card, fullDeck, handLabel, makeRng, shuffle } from '../poker/cards';
import { chenScore } from '../poker/matrix';
import { monteCarloEquity } from '../poker/equity';
import { makeQuestion, summarize, type QuizQuestion } from '../poker/practice';
import { cryptoId } from '../poker/profile';
import { ACTIVE_PACK, SCENARIOS, type Action, type Scenario } from '../data/strategy';
import { Btn, CardChip, Panel, Seg, StatusBadge, pct } from './kit';
import { animalBus, buzz, useStore } from '../state/store';

const rng = makeRng(Date.now());

export function PracticeView() {
  const [drill, setDrill] = useState<'range' | 'equity'>('range');
  return (
    <div className="grid gap-3">
      <Seg label="Drill" value={drill} onChange={setDrill} options={[{ v: 'range', label: 'Range quiz' }, { v: 'equity', label: 'Equity guess' }]} />
      {drill === 'range' ? <RangeQuiz /> : <EquityDrill />}
    </div>
  );
}

function RangeQuiz() {
  const { s, d } = useStore();
  const [filter, setFilter] = useState<Scenario | 'mixed'>('mixed');
  const [q, setQ] = useState<QuizQuestion>(() => makeQuestion(ACTIVE_PACK, rng));
  const [given, setGiven] = useState<Action | null>(null);
  const sum = summarize(s.quiz);

  const next = (f = filter) => { setQ(makeQuestion(ACTIVE_PACK, rng, f === 'mixed' ? undefined : f)); setGiven(null); };
  const answer = (a: Action) => {
    if (given) return;
    const correct = a === q.answer;
    setGiven(a);
    d({ t: 'quiz/add', r: { id: cryptoId(), ts: Date.now(), hand: q.hand, pos: q.pos, stack: q.stack, scenario: q.scenario, answer: q.answer, given: a, correct, packId: ACTIVE_PACK.id } });
    animalBus.emit(correct ? 'happy' : 'sad');
    buzz(s.settings.haptics, correct ? 25 : [40, 60, 40]);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      const i = Number(e.key) - 1;
      if (!given && i >= 0 && i < q.choices.length) answer(q.choices[i]);
      if (given && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); next(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
      <Panel title="What does the pack do here?" right={<StatusBadge status={ACTIVE_PACK.status} />}>
        <Seg label="Scenario filter" value={filter} onChange={(f) => { setFilter(f); next(f); }}
          options={[{ v: 'mixed', label: 'Mixed' }, ...SCENARIOS.map((x) => ({ v: x.id, label: x.name }))]} />
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="flex gap-2">{q.cards.map((c) => <CardChip key={c.rank + c.suit} card={c} size="lg" />)}</div>
          <div className="font-mono text-[12px] leading-6">
            <div><span className="text-dim">Hand </span>{q.hand}</div>
            <div><span className="text-dim">Seat </span>{q.pos} · {q.stack}bb</div>
            <div><span className="text-dim">Spot </span>{SCENARIOS.find((x) => x.id === q.scenario)!.name}</div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {q.choices.map((c, i) => {
            const state = !given ? '' : c === q.answer ? 'border-acc text-acc' : c === given ? 'border-bad text-bad shake' : 'opacity-40';
            return (
              <button key={c} onClick={() => answer(c)} disabled={!!given}
                className={`min-w-24 flex-1 rounded border border-line bg-panel2 px-3 py-3 font-mono text-sm uppercase transition-all ${state}`}>
                <span className="mr-1 text-[9px] text-faint">{i + 1}</span>{c}
              </button>
            );
          })}
        </div>
        {given && (
          <div className="fade-up mt-3 flex flex-wrap items-center justify-between gap-2 rounded border border-line bg-ink px-3 py-2">
            <p className="text-[12px]">
              {given === q.answer ? <b className="text-acc">Correct.</b> : <b className="text-bad">Pack says {q.answer}.</b>}{' '}
              <span className="text-dim">Chen score {chenScore(q.hand)}. Thresholds are illustrative.</span>
            </p>
            <Btn tone="primary" onClick={() => next()}>Next ⏎</Btn>
          </div>
        )}
      </Panel>
      <Panel title="Results">
        <dl className="grid grid-cols-2 gap-y-1 font-mono text-[12px]">
          <dt className="text-dim">Answered</dt><dd>{sum.total}</dd>
          <dt className="text-dim">Accuracy</dt><dd className="text-acc">{pct(sum.accuracy, 0)}</dd>
          <dt className="text-dim">Streak</dt><dd>{sum.streak}</dd>
          <dt className="text-dim">Best</dt><dd>{sum.bestStreak}</dd>
        </dl>
        <ul className="mt-3 grid gap-1">
          {s.quiz.slice(0, 8).map((r) => (
            <li key={r.id} className="flex justify-between font-mono text-[10px]">
              <span className="text-dim">{r.hand} {r.pos} {r.stack}bb</span>
              <span style={{ color: r.correct ? 'var(--color-acc)' : 'var(--color-bad)' }}>{r.given}{!r.correct && ` → ${r.answer}`}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

const BUCKETS: { lo: number; hi: number; label: string }[] = [
  { lo: 0, hi: 0.4, label: '<40%' }, { lo: 0.4, hi: 0.5, label: '40–50' }, { lo: 0.5, hi: 0.6, label: '50–60' },
  { lo: 0.6, hi: 0.7, label: '60–70' }, { lo: 0.7, hi: 1.01, label: '70%+' },
];

function deal(): { hero: [Card, Card]; board: Card[] } {
  const deck = shuffle(fullDeck(), rng);
  const street = [0, 3, 4][Math.floor(rng() * 3)];
  return { hero: [deck[0], deck[1]], board: deck.slice(2, 2 + street) };
}

function EquityDrill() {
  const { s, d } = useStore();
  const [spot, setSpot] = useState(deal);
  const [res, setRes] = useState<{ eq: number; err: number; pick: number } | null>(null);
  const drills = s.history.filter((h) => h.kind === 'drill');
  const hits = drills.filter((h) => h.title.startsWith('✓')).length;

  const guess = (i: number) => {
    if (res) return;
    const r = monteCarloEquity(spot.hero, 1, spot.board, 3000, Math.floor(rng() * 1e9));
    const b = BUCKETS[i];
    const ok = r.equity >= b.lo && r.equity < b.hi;
    setRes({ eq: r.equity, err: r.stdErr * 1.96, pick: i });
    animalBus.emit(ok ? 'happy' : 'sad');
    buzz(s.settings.haptics, ok ? 25 : [40, 60, 40]);
    d({ t: 'history/add', h: { id: cryptoId(), ts: Date.now(), kind: 'drill',
      title: `${ok ? '✓' : '✗'} ${handLabel(spot.hero[0], spot.hero[1])}${spot.board.length ? ' on ' + spot.board.map((c) => c.rank + c.suit).join('') : ' preflop'}`,
      detail: `guessed ${b.label}, actual ${pct(r.equity)} vs 1 random hand` } });
  };

  return (
    <Panel title="Guess your equity vs one random hand" right={<span className="font-mono text-[10px] text-dim">{hits}/{drills.length} hit</span>}>
      <div className="flex flex-wrap items-center gap-2">
        {spot.hero.map((c) => <CardChip key={c.rank + c.suit} card={c} size="lg" />)}
        <span className="mx-2 font-mono text-[10px] text-faint">{spot.board.length ? 'BOARD' : 'PREFLOP'}</span>
        {spot.board.map((c) => <CardChip key={c.rank + c.suit} card={c} size="md" />)}
      </div>
      <div className="mt-4 grid grid-cols-5 gap-1">
        {BUCKETS.map((b, i) => {
          const hit = res && res.eq >= b.lo && res.eq < b.hi;
          return (
            <button key={b.label} onClick={() => guess(i)} disabled={!!res}
              className={`rounded border px-1 py-3 font-mono text-[11px] transition-all ${hit ? 'border-acc text-acc' : res?.pick === i ? 'border-bad text-bad' : 'border-line bg-panel2'}`}>
              {b.label}
            </button>
          );
        })}
      </div>
      {res && (
        <div className="fade-up mt-3 flex items-center justify-between gap-2">
          <p className="font-mono text-[12px]">Actual <span className="text-warn">{pct(res.eq)}</span> <span className="text-dim">±{pct(res.err)}</span> <StatusBadge status="computed" /></p>
          <Btn tone="primary" onClick={() => { setSpot(deal()); setRes(null); }}>Deal next</Btn>
        </div>
      )}
    </Panel>
  );
}
