# Switchyard

[![CI](https://github.com/ctkrug/switchyard/actions/workflows/ci.yml/badge.svg)](https://github.com/ctkrug/switchyard/actions/workflows/ci.yml)

A modern, procedurally-generated train-shunting puzzle. Route every car to its
correct siding using the fewest moves — pull levers, watch the whole train
reroute, and listen for the couplings to click home.

## What it is

Switchyard is a browser-based puzzle game built on HTML5 Canvas. Each level is
a small rail yard: a train of mixed cars sits on the lead track, and a set of
sidings need specific cars delivered to them. You throw switches to steer cars
onto the right siding as the train shunts back and forth. Solve it in as few
moves as possible, then share your score.

Unlike a fixed level pack, every yard in Switchyard is generated on the fly by
a constraint solver that guarantees a solution exists — so there's always a
next puzzle, and it's never unfair.

## Why

Most browser puzzle games ship ~20 hand-authored levels and call it done —
fun for an afternoon, then over. Switchyard is built around infinite,
guaranteed-solvable procedural content instead, so the puzzle itself is the
product, not a level pack. The rail-yard theme is also under-explored in
casual web games, despite offering a natural, readable metaphor for
constraint puzzles (tracks, switches, sidings) that most players already
understand intuitively.

## Planned features

- **Procedural yard generation** — a constraint-based generator builds each
  layout (leads, sidings, switches) and the car manifest together, verifying
  a solution exists before the puzzle is ever shown to the player.
- **Physics-feeling train movement** — cars ease in and out, couple and
  uncouple with visible/audible feedback, and the whole train reacts when a
  switch is thrown mid-motion.
- **Move counter & par** — every yard reports a par (the solver's optimal
  move count); beat it for a better score.
- **"Solved in N moves" share card** — a generated image/card summarizing
  your run, ready to share.
- **Increasing difficulty** — more cars, more sidings, and trickier switch
  topology as you progress.
- **Undo & reset** — experiment freely without losing a run to a misclick.

## Stack

- **TypeScript** for game logic, the level generator, and the solver.
- **HTML5 Canvas** (2D context) for rendering — crisp at any resolution via
  `devicePixelRatio`-aware drawing.
- **Vite** for dev server and static production builds.
- **Vitest** for unit tests (generator solvability, solver correctness, move
  validation).
- No backend, no build-time server dependency — ships as a static site.

## Status

Early scaffold. See [`docs/VISION.md`](docs/VISION.md) for the full design,
[`docs/DESIGN.md`](docs/DESIGN.md) for the art direction, and
[`docs/BACKLOG.md`](docs/BACKLOG.md) for the build plan.

## Development

```bash
npm install
npm run dev       # local dev server
npm test          # run the test suite
npm run build     # production build to dist/
npm run lint      # typecheck + lint
```

## License

MIT — see [LICENSE](LICENSE).
