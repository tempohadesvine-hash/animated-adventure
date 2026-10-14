import { Component, useState, type ReactNode } from 'react';
import { ANIMAL_SUITS, SUITS, type Card, handLabel } from './poker/cards';
import { useStore } from './state/store';
import { AnimalIcon, WanderLayer } from './ui/Animals';
import { HandView } from './ui/HandView';
import { MatrixView, type Spot } from './ui/MatrixView';
import { ProfilesView } from './ui/ProfilesView';
import { PracticeView } from './ui/PracticeView';
import { HistoryView } from './ui/HistoryView';
import { WatchView } from './ui/WatchView';
import { IdeaQueue } from './ui/IdeaQueue';

const TABS = [
  { id: 'hand', label: 'Hand', glyph: '◇' },
  { id: 'matrix', label: 'Matrix', glyph: '▦' },
  { id: 'players', label: 'Players', glyph: '◎' },
  { id: 'practice', label: 'Practice', glyph: '▶' },
  { id: 'history', label: 'History', glyph: '≡' },
  { id: 'watch', label: 'Watch', glyph: '◯' },
] as const;
type Tab = (typeof TABS)[number]['id'];

class Boundary extends Component<{ children: ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null };
  static getDerivedStateFromError(err: Error) { return { err }; }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div role="alert" className="rounded border border-bad/40 bg-bad/5 p-3 font-mono text-[12px] text-bad">
        Something broke in this view: {this.state.err.message}
        <button className="ml-2 underline" onClick={() => this.setState({ err: null })}>Retry</button>
      </div>
    );
  }
}

export default function App() {
  const { s, d } = useStore();
  const [tab, setTab] = useState<Tab>('hand');
  const [hole, setHole] = useState<Card[]>([{ rank: 'A', suit: 'h' }, { rank: 'Q', suit: 'h' }]);
  const [spot, setSpot] = useState<Spot>({ pos: 'CO', stack: 100, scenario: 'RFI' });
  const label = hole.length === 2 ? handLabel(hole[0], hole[1]) : undefined;

  return (
    <div className="scanline min-h-full pb-24 md:pb-10">
      <header className="sticky top-0 z-20 border-b border-line bg-ink/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-acc shadow-[0_0_8px_var(--color-acc)]" />
            <h1 className="font-mono text-[12px] tracking-[0.2em] text-fg">MENAGERIE<span className="text-dim">/poker</span></h1>
          </div>
          <div className="hidden items-center gap-3 sm:flex" aria-label="Suit legend">
            {SUITS.map((x) => (
              <span key={x} className="flex items-center gap-1 font-mono text-[10px] text-dim" title={`${ANIMAL_SUITS[x].animal}s = ${ANIMAL_SUITS[x].suitName}`}>
                <AnimalIcon suit={x} size={14} />{ANIMAL_SUITS[x].animal}={ANIMAL_SUITS[x].suitName[0]}
              </span>
            ))}
          </div>
          <div className="flex gap-1">
            <Toggle on={s.settings.animals} onClick={() => d({ t: 'settings', patch: { animals: !s.settings.animals } })} label="Animals" />
            <Toggle on={s.settings.haptics} onClick={() => d({ t: 'settings', patch: { haptics: !s.settings.haptics } })} label="Haptics" />
          </div>
        </div>
        <nav className="mx-auto hidden max-w-6xl gap-1 px-4 md:flex" aria-label="Sections">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}
              className={`border-b px-3 py-2 font-mono text-[11px] tracking-wide transition-colors ${tab === t.id ? 'border-acc text-fg' : 'border-transparent text-dim hover:text-fg'}`}>
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-3 py-3 sm:px-4">
        <div className="mb-3 flex items-center gap-3 font-mono text-[10px] text-dim sm:hidden" aria-label="Suit legend">
          {SUITS.map((x) => <span key={x} className="flex items-center gap-0.5"><AnimalIcon suit={x} size={12} />{ANIMAL_SUITS[x].suitName}</span>)}
        </div>
        <Boundary key={tab}>
          <div className="fade-up">
            {tab === 'hand' && <HandView hole={hole} setHole={setHole} spot={spot} setSpot={setSpot} onOpenMatrix={() => setTab('matrix')} />}
            {tab === 'matrix' && <MatrixView spot={spot} setSpot={setSpot} highlight={label} />}
            {tab === 'players' && <ProfilesView />}
            {tab === 'practice' && <PracticeView />}
            {tab === 'history' && <HistoryView />}
            {tab === 'watch' && <WatchView />}
          </div>
        </Boundary>
        <p className="mt-6 text-center font-mono text-[9px] text-faint">
          Strategy labels: COMPUTED = in-app Monte Carlo · APPROX = published heuristic · ILLUSTRATIVE = example thresholds. No GTO solutions are included.
        </p>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-line bg-panel/95 backdrop-blur md:hidden" aria-label="Sections">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}
            className={`flex flex-col items-center gap-0.5 py-2 font-mono text-[9px] ${tab === t.id ? 'text-acc' : 'text-dim'}`}>
            <span className="text-sm leading-none">{t.glyph}</span>{t.label}
          </button>
        ))}
      </nav>

      <WanderLayer enabled={s.settings.animals} />
      <IdeaQueue />
    </div>
  );
}

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} aria-pressed={on} className={`rounded border px-2 py-1 font-mono text-[10px] ${on ? 'border-acc/40 text-acc' : 'border-line text-faint'}`}>
      {label}
    </button>
  );
}
