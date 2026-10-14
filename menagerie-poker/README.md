# Menagerie / Poker — Animal-Coded Poker Companion (proof of concept)

React 19 + TypeScript + Tailwind CSS v4 + Vite. Vitest + Testing Library for tests.

Suits: **Cats = Clubs · Dogs = Diamonds · Hogs = Hearts · Snakes = Spades** (fixed everywhere; never used as player-type labels).

## Setup

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 30 tests: poker logic + UI flows
npm run build      # typecheck + production build to dist/
SINGLE=1 npx vite build --outDir dist-single   # one self-contained index.html
```

Requires Node 20+.

## Layout

```
src/poker/     pure logic, no React: cards, 7-card evaluator, 169 matrix + Chen score,
               Monte Carlo equity, player profiling, quiz + session-limit logic
src/data/      strategy.ts (replaceable StrategyPack), samples.ts (sample players/ideas)
src/state/     reducer store, localStorage persistence (try/catch), animal event bus, haptics
src/ui/        views: Hand, Matrix, Players, Practice, History, Watch; animals; idea queue
tests/         poker.test.ts (logic), ui.test.tsx (flows)
```

To use your own ranges, implement `StrategyPack.decide(hand, pos, stack, scenario)` and point `ACTIVE_PACK` at it. Set `status` honestly.

## Data honesty

| Label | Meaning | Where |
|---|---|---|
| COMPUTED | Calculated in-app by Monte Carlo from the rules of poker, with a 95% error bar | Equity calculator, matrix equity view, equity drill |
| APPROX | Published heuristic (Bill Chen's starting-hand formula) | Chen score |
| ILLUSTRATIVE | Author-chosen thresholds for demo purposes | Every Raise/Call/3bet/Jam/Fold recommendation |

No GTO/solver data is included. Equity code is checked in tests against widely published values (AA ≈ 85.2%, 72o ≈ 34.6% vs a random hand). Player-type cut-offs and exploit tips are rules of thumb, labelled as such.

## Completed features

- 169-hand matrix with position (UTG–BB), stack (10/20/40/100bb) and scenario (Open, vs Open, Push/Fold) selectors; colour by pack action, Chen score, or computed equity; range % per action; per-hand detail.
- One-tap 52-card picker by animal row + keyboard entry (rank then c/d/h/s, ⌫ undo), random/clear, optional board (3–5).
- Equity calculator vs 1–8 random hands (5,000 sims, win/tie, ±95%) saved to history.
- Animated cat/dog/hog/snake wander the bottom edge, scatter from the pointer, investigate taps, hop on correct answers, shake on wrong ones, give tips on tap, and warn near the loss limit. Toggleable; respects reduced motion.
- Player profiles: tap-log observed actions, VPIP / PFR / AF with Wilson 95% interval, confidence by sample size, editable overrides, type override, notes, undo.
- Practice: range quiz (keys 1–3, Enter for next) with streaks; equity-guess drill.
- History & results: per-scenario accuracy, history log, session net with a **maximum loss limit** (default CA$20) that warns at 75% and blocks further loss entries at 100%; JSON export (copy or download); reset.
- Galaxy Watch 5 concept: round 396px-style face, bezel rotation (wheel/buttons), swipe/arrow screen nav, quick-hand lookup, session ring, mini quiz, Vibration-API haptics.
- Idea queue window (zero-cost flag, done, add/remove).
- Responsive: bottom tab bar on mobile, top tabs on desktop. Error boundary per view; corrupt storage falls back to defaults.

## Limitations

- Recommendations are illustrative thresholds, not strategy. Import real solver ranges for serious study.
- Equity is vs random hands only (no range-vs-range yet).
- Watch is an in-browser concept, not a Wear OS app. Haptics only fire where the Vibration API exists (Android Chrome; not iOS Safari or desktop).
- Data lives in this browser's localStorage only — no sync or accounts.
- In the hosted claude.ai demo, Download is blocked by the viewer; use Copy JSON there.
- Matrix equity uses 1,000 runouts per hand (±~1.5%).
