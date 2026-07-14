# Switchyard — Vision

## The problem

Browser puzzle games almost always ship a fixed level pack — roughly 20
hand-authored puzzles, ordered by difficulty, and then the content runs out.
That's a real ceiling: once a player has solved every level, there's nothing
left but replaying for a faster time. It also means every player sees the
exact same puzzles in the exact same order, so there's no sense of a puzzle
being *theirs*.

Separately, the rail-yard/shunting-puzzle genre (classic examples: Zeeman
Games' shunting puzzles, "Rush Hour"-adjacent train games) is under-served
in modern browser gaming. It's a naturally readable constraint puzzle —
tracks, switches, sidings — that most players already understand
intuitively without a tutorial, but it's rarely been given a truly polished,
game-feel-first web implementation.

## Who it's for

Casual puzzle players who like games such as Rush Hour, Sokoban, or
Baba Is You's spatial-logic cousins, but want something with:
- a mechanical/industrial theme instead of another abstract grid,
- runs that are short enough for a coffee break (2–6 minutes per yard),
- and, crucially, **no end** — every session is a genuinely new puzzle,
  not a replay of one they've already solved.

## The core idea

Every time you load Switchyard (or hit "New Yard"), a **constraint-based
generator** builds a fresh rail yard: a lead track carrying a mixed train of
cars, a set of switches, and a set of sidings that need specific cars
delivered to them. Before the puzzle is ever shown to the player, the
generator runs its own solver against the layout to *guarantee* a solution
exists — so no yard is ever unfair or unsolvable, and the generator can also
report the **par** (minimum move count) for scoring.

The player throws switches to route cars from the lead onto the correct
sidings, shunting the train back and forth as needed. Every switch throw
reroutes the whole train live — cars visibly follow their new path, and
couplings audibly click into place when a car reaches its siding. Solving in
fewer moves than par is the skill ceiling; a "solved in N moves" share card
is the loop that gets someone to try the next yard.

## Key design decisions

- **The generator embeds the solver.** Rather than authoring content, we
  author *rules* (track topology generation + a shunting solver) and let
  the computer produce infinite, guaranteed-solvable content. Solvability is
  a build-time and runtime invariant, not a hope — see
  `docs/BACKLOG.md` epic 1 and the generator/solver tests.
- **Movement is the game feel, not a detail.** A shunting puzzle lives or
  dies on whether pulling a lever *feels* like it's steering a real train.
  Tweened movement, coupling feedback, and synthesized SFX are first-class
  requirements (see `docs/DESIGN.md`), not post-launch polish.
- **Static site, no backend.** The generator, solver, and renderer all run
  client-side in TypeScript/Canvas. This keeps the game free to host, fast
  to load, and trivially deployable as a static bundle
  (`apps.charliekrug.com/switchyard`).
- **Difficulty scales the constraint space, not hand-tuned levels.** More
  cars, more sidings, and trickier switch topology as a player progresses,
  driven by generator parameters rather than authored content.
- **Share card over leaderboard.** v1 favors a simple, no-backend "solved in
  N moves" share image over an online leaderboard — keeps the no-backend
  constraint intact while still giving players something to show off.

## What "v1 done" looks like

- The constraint-based generator reliably produces varied, guaranteed-
  solvable yards across a range of difficulty parameters, verified by tests.
- A player can load the game, see a generated yard, throw switches, watch
  cars reroute with tweened movement and coupling feedback, and reach a win
  state that reports moves vs. par.
- Win state includes a shareable "solved in N moves" card.
- Sound (synthesized, muteable) and visual feedback exist for every
  meaningful action: switch throw, coupling, siding success, win.
- The page matches `docs/DESIGN.md`'s direction end-to-end (board, HUD,
  win screen, landing content) at desktop and phone widths.
- Deployed as a static build to `apps.charliekrug.com/switchyard`.

## Out of scope for v1

- Accounts, persistence across devices, or an online leaderboard.
- Level editor / custom yard sharing.
- Multiplayer or timed competitive modes.
