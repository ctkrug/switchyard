# Switchyard — Architecture

A concise map of the codebase for anyone picking this up cold. Keep this
current as the build progresses — later phases run with fresh context and
lean on this to orient fast.

## Run it

```bash
npm install
npm run dev            # dev server at http://localhost:5173
npm test               # vitest, run once
npm run test:coverage   # vitest with a v8 coverage report
npm run build           # typecheck + production build to dist/
npm run lint            # typecheck only
```

## Data flow

```
generateYard(seed)          creates a Yard (cars, sidings, switches, parMoves)
        │
        ▼
createSession(yard)         wraps it in a Session { yard, present, past }
        │
        ▼  (player clicks a switch button)
throwSwitch(session, id, b) → new Session (pure — old one is untouched)
        │
        ▼
Board.applyThrow(prev, next, branch)   diffs old vs. new session,
        │                              tweens the dispatched car + plays SFX
        ▼
main.ts updates the HUD (moves/par/mistake banner) and, if isWin(session),
records the solve into stats (game/stats.ts, persisted to localStorage),
updates the Solved/Best HUD tiles, shows the win overlay, and bursts
confetti (render/winCelebration.ts) behind the win card.
```

Everything left of `Board` is pure and framework-free — no DOM, no canvas —
which is why `src/game/*` has the deepest coverage. `src/render/*` and
`main.ts` are imperative/DOM-driven but are still well covered by stubbing
the pieces jsdom doesn't implement (canvas 2D context, `requestAnimationFrame`)
rather than skipping their real logic — see "Testing notes" below.

## The puzzle model

The yard is a **ladder yard**: a single lead track carries the queued train
past a series of switches, each switch owning exactly one siding. `Yard.cars`
is the queue in delivery order (index 0 = next car up). A switch lever is
either:

- `"left"` — stay on the lead, continue toward the next switch, or
- `"right"` — divert into this switch's own siding.

`resolveDestination` (`src/game/track.ts`) walks the chain under a given
lever state and reports where the front car would end up (or `null` if it
runs off the end without diverting anywhere). `advanceQueue` wraps that: it
checks the *front* car only and dispatches it if the track resolves — **one
switch throw ever moves at most one car**. (An earlier version cascaded
through consecutive cars sharing an unchanged state, but that meant setting
up car A's path could immediately force-feed car B down the same, possibly
wrong, route in the same move — see the commit history around
`fix(game): dispatch at most one car per switch throw` for why that was
reverted.)

A dispatch is recorded whether it's *correct* (matches the car's
`targetSidingId`) or not — a wrong delivery is a permanent mistake in this
model (no way to pull a car back out of a siding), which is what
undo/reset exist to recover from.

## Modules

### `src/game/` — pure puzzle logic (framework-free, fully unit tested)

- **`types.ts`** — `Car`, `Siding`, `Switch`, `Move`, `Branch`, `Yard`.
- **`prng.ts`** — `createRng(seed)` (mulberry32) + `randInt`. Every random
  choice in generation must flow through this, never `Math.random()`, or
  the determinism guarantee (`generateYard(seed)` is pure) breaks.
- **`track.ts`** — `resolveDestination` and `advanceQueue`, the shared
  primitives both the solver and the runtime engine build on.
- **`solver.ts`** — `solve(yard): Move[] | null`. Breadth-first search over
  `(nextCarIndex, leverState)`; state space is tiny (cars × 2^switches), so
  plain BFS is fast enough to run at generation time as a solvability gate.
  Returns the shortest move sequence, or `null` if none exists.
- **`generator.ts`** — `generateYard(seed): Yard`. Randomizes switch/car
  count and each car's target siding from the seeded RNG, then verifies
  solvability through `solve()` before returning (the chain topology makes
  every assignment solvable by construction — see the code comment — so
  this is a defensive check, not a real gamble).
- **`engine.ts`** — `createSession`, `throwSwitch`, `undo`, `reset`,
  `isWin`, `hasMistake`. A `Session` is `{ yard, present, past }`; `present`
  is an immutable `GameState` snapshot (`switchState`, `queueIndex`,
  `dispatches`, `moveCount`). Undo pops the last snapshot off `past`; no
  inverse-replay logic needed. A throw to the lever's *current* position is
  a no-op (matches the solver's own move-generation rule, so the live move
  counter stays directly comparable to `yard.parMoves`).

### `src/audio/`

- **`sfx.ts`** — `Sfx` class: synthesized WebAudio SFX (oscillators +
  generated noise buffers, zero audio files) for switch-throw, couple,
  decouple, siding-success, win-fanfare, invalid-move. `AudioContext` is
  created lazily on the first play call (browser autoplay policy). Every
  method degrades to a silent no-op if WebAudio is unavailable or the
  player has muted — never throws. Mute persists to `localStorage`.

### `src/game/stats.ts`

Session-spanning progress, separate from a single yard's `Session`.
`recordSolve(stats, moves, par)` is pure — folds one solved run into
`{ totalSolved, bestDelta }` (`bestDelta` = moves − par, monotonically
improving, never regresses on a worse run). `loadStats`/`saveStats` are
the `localStorage` IO boundary, following the same
try/catch-degrades-to-default pattern as `sfx.ts`'s mute persistence.
`formatBestDelta` renders it for the HUD ("—" / "At par" / "+N").

### `src/render/` — canvas + DOM rendering (imperative, lightly tested)

- **`layout.ts`** — `computeLayout(yard): BoardLayout`. Pure function
  mapping a `Yard` onto a fixed virtual coordinate space (1000×600): lead
  track along the top, each siding peeling off into its own horizontal lane
  (staggered `y` per switch index) so lanes never overlap, queue slots
  lined up behind the throat. Canvas-independent and fully unit tested.
- **`tween.ts`** — `easeOutCubic`, `lerp`, `pointAlongPath` (multi-segment
  path interpolation). Pure, unit tested.
- **`board.ts`** — `Board` class. Owns a `<canvas>` (scenery + cars) plus a
  DOM overlay of real `<button>` elements, one per switch, absolutely
  positioned over the canvas so hover/focus/active/keyboard-activation and
  ARIA labels come from native controls instead of hand-rolled canvas
  hit-testing. `applyThrow(prevSession, nextSession, branch)` diffs the two
  sessions: if a new dispatch occurred, it tweens that car (and shifts the
  remaining queued cars) along `[from, switch.bendStart, switch.mouth, to]`,
  then on completion fires a siding pulse + brief board shake + SFX
  (`couple`+`sidingSuccess` if correct, `decouple`+`invalidMove` if not).
  `prefers-reduced-motion` collapses tween duration and skips shake, but
  state still updates. `snapTo(session)` instantly recomputes positions with
  no animation (used for undo/reset/new-yard). Resizing is DPR-aware via
  `ResizeObserver`; the virtual 1000×600 space is letterboxed into whatever
  the container's actual pixel size is.
- **`confetti.ts`** — pure particle system for the win celebration:
  `createConfettiBurst(originX, originY, rng, count)` fans particles
  upward from a point with seeded randomness (reuses `game/prng`'s `Rng`
  so bursts are reproducible in tests); `stepConfetti(particles, dtMs)`
  advances gravity/rotation and prunes expired particles;
  `confettiOpacity` fades a particle out near end of life. No canvas/DOM
  dependency, so it's fully unit tested like `layout.ts`/`tween.ts`.
- **`winCelebration.ts`** — `WinCelebration` class: owns the canvas layered
  behind the win card, drives `confetti.ts` through a `requestAnimationFrame`
  loop from `burst()` to completion, and `clear()`s on dismiss. `burst()`
  no-ops under `prefers-reduced-motion` — the win state itself doesn't
  depend on the animation.
- **`shareCard.ts`** — `shareCardLines(data)` is pure (the exact copy
  lines, in draw order); `drawShareCard(canvas, data)` paints them onto an
  800×450 canvas using DESIGN.md's token values directly (canvas can't
  read CSS custom properties, so the hexes are copied 1:1 from the token
  table); `downloadShareCard(canvas)` triggers a PNG download via a
  throwaway `<a download>`.

### `src/main.ts` — wiring

Builds the DOM shell (topbar/wordmark, board region, HUD sidebar, win
overlay + particles canvas), owns the mutable `yard`/`session`/`stats`
triple, and wires `Board` callbacks → `engine` calls → HUD updates →
win-overlay display → `WinCelebration` burst → share-card download. This
is the one place allowed to be imperative/stateful; keep game logic out
of it.

### `src/style.css`

Design tokens from `docs/DESIGN.md` (colors, type, spacing, motion) plus
the layout/HUD/board/win-overlay rules. Note: `[hidden]` elements need an
explicit `{ display: none }` rule if the same selector also sets a `display`
value elsewhere — an author style always beats the browser's default
`[hidden]` rule regardless of specificity, which caused the win overlay to
silently intercept clicks over the whole page until it was given one.

## Testing notes

- `src/game/*` and `src/render/layout.ts` / `tween.ts` / `confetti.ts` are
  pure and have thorough example + edge-case coverage (empty yards,
  unsolvable yards, determinism across seeds, undo-to-start, particle
  lifecycle, etc). Core game logic sits at ~99% line coverage
  (`npm run test:coverage`).
- `HTMLCanvasElement.getContext('2d')` returns `null` under jsdom (no
  `canvas` npm package installed, and it shouldn't be for a browser-only
  game), so `board.ts`, `winCelebration.ts`, and `shareCard.ts`'s actual
  draw code can't run against jsdom's own canvas. Rather than settling for
  "doesn't throw with a null context," their tests stub
  `HTMLCanvasElement.prototype.getContext` with a minimal fake (spied
  `fillRect`/`arc`/`fillText`/etc.) so the real `drawTrack`/`drawSidings`/
  `drawCars`, the confetti `render()` loop, and `drawShareCard`'s text
  layout all genuinely execute under test — paired with a mocked
  `requestAnimationFrame` to step animations to completion deterministically
  (see the "Board with a stubbed 2d context" / "WinCelebration with a
  stubbed 2d context" describe blocks). `main.ts`'s DOM wiring (win overlay,
  undo/reset/mute, share-card download) is driven the same way, importing
  the module fresh per test (`vi.resetModules`) against a `generateYard`
  seed made deterministic by stubbing `performance.now`/`Math.random`, then
  clicking real switch buttons in `solve()`'s own move order to reach a win.
  What's still only verified by actually running the app in a browser:
  layout composition at 390/768/1440, and genuine pixel/animation
  fidelity (see the QA phase's design self-review, or `npm run dev`).
- Pure core logic (`track.ts`'s one-car-per-throw invariant, `solver.ts`'s
  plans always winning cleanly when replayed, `generator.ts`'s
  solvability/determinism, `stats.ts`'s monotonic `bestDelta`) also has
  `fast-check` property tests alongside the example-based ones, run over a
  wide/adversarial input range (full safe-integer seeds, arbitrary switch
  states, arbitrary run sequences) rather than a handful of fixed cases.
