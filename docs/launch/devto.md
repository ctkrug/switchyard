---
title: "Building Switchyard: a train shunting puzzle that generates its own levels"
published: false
tags: gamedev, typescript, canvas, webdev
---

I like puzzle games until they run out. Most browser puzzles ship twenty
hand-authored levels, and once you've solved them the only thing left is
replaying for a faster time. So for [Switchyard](https://apps.charliekrug.com/switchyard/)
I wanted the opposite: a train shunting puzzle where the levels never end and
none of them are unfair. Here are the two decisions that shaped the build.

## The generator embeds a solver

A "shunting puzzle" is a small rail yard. A train of mixed cars sits on a lead
track, each siding wants one specific car, and you throw switches to route each
car to the right place in as few moves as possible.

The naive way to make infinite levels is to scatter cars and switches at
random. The problem is you have no idea whether the result is solvable, or how
hard it is. So instead of authoring levels, I authored rules and let the
computer produce content that meets them.

The generator randomizes the track topology and the car manifest from a seeded
PRNG, then hands the candidate to a solver before the player ever sees it. The
solver is a breadth-first search over the state `(index of the next car to
deliver, position of every switch lever)`:

```ts
export function solve(yard: Yard): Move[] | null {
  // BFS: expand every legal switch throw, prune states that misroute a
  // car (a wrong delivery can't be recovered), stop when every car is home.
  // Returns the shortest move sequence, or null if none exists.
}
```

The state space is tiny (cars are capped around ten, switches around six), so
plain BFS runs in well under a millisecond per candidate. If the solver finds a
plan, the yard ships and the plan's length becomes **par**, the score to beat.
If it somehow can't, the generator reseeds and tries again. The player only
ever sees solvable yards, and every yard arrives with a known-optimal move
count for free. Determinism matters here too: every random choice flows through
one seeded PRNG, so the same seed always rebuilds the same yard, which makes the
whole generator unit-testable.

## The bug that rewrote the rules: one car per throw

My first engine cascaded. After a switch throw, it would dispatch every car
whose path now resolved under the current lever state. That felt efficient
until I watched a car I had lined up drag the car behind it down the same track
in the same move, straight into the wrong siding. The state didn't know it was
supposed to stop after one car.

The fix was a rule, not a patch: **one switch throw moves at most one car.**
`advanceQueue` now checks only the front car and dispatches just that one. It
made the puzzle honest (you set up each car deliberately) and, as a bonus, made
the live move counter directly comparable to the solver's par, since both count
throws the same way.

## Testing a Canvas game without a browser

Canvas is fun to render and annoying to test, because `getContext('2d')`
returns `null` under jsdom. Rather than settle for "it doesn't throw with a
null context," I stubbed `getContext` with a tiny fake whose methods
(`fillRect`, `arc`, `fillText`, and friends) are spies. Now the real drawing
code actually executes under test, paired with a mocked `requestAnimationFrame`
that steps animations to completion. That, plus property tests with `fast-check`
over the pure game core, took coverage from around 66% to 98%.

## What I'd do differently

The difficulty curve is still coarse: it widens the car and switch counts as
you clear yards, but it doesn't measure how *tangled* a yard is. Par length is
a decent proxy, but I'd like the generator to target a difficulty band directly
rather than plateauing on raw counts.

The code is on [GitHub](https://github.com/ctkrug/switchyard) and the game is
playable at [apps.charliekrug.com/switchyard](https://apps.charliekrug.com/switchyard/).
If you find a yard that feels unfair, I want to hear about it.
