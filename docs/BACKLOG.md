# Switchyard — Backlog

Epic/story breakdown for the build. Stories start `[ ]`; flip to `[x]` only
once their acceptance criteria are verifiably true. Story 1.1 is the wow
moment and must be reachable before anything else in this backlog is built.

## Epic 1 — Core puzzle loop (the wow moment)

- [x] **1.1 — Throw a switch, watch the train reroute and couple in**
      *(wow moment — build this first)*
      A single generated yard renders on canvas: a lead track with a mixed
      train, at least one switch, and at least one siding with a target
      car. Clicking/tapping a switch lever throws it; the train (all
      affected cars) animates along the new path in real time and, when a
      car reaches its target siding, a visible coupling animation plays
      alongside a synthesized "clunk" sound.
      - Acceptance: clicking a switch changes its visual state (thrown
        left/right) within one animation frame and the affected car(s)
        begin moving within 100ms — no instant teleport.
      - Acceptance: when a car reaches its correct siding, the siding
        visibly pulses/flashes and a coupling SFX fires (audible in a
        browser with sound on; no error thrown if `AudioContext` is
        unavailable).
      - Acceptance: the full sequence (load → throw switch → car couples)
        is completable with zero console errors.

- [x] **1.2 — Constraint-based procedural yard generator**
      Replace the placeholder single-siding generator with a real
      generator: it builds randomized track topology (lead + N switches +
      M sidings) and a car manifest, then runs an embedded solver against
      its own output before returning the yard, rejecting/regenerating any
      layout that isn't solvable.
      - Acceptance: `generateYard(seed)` called with 100 different seeds
        never returns a yard for which `solve(yard)` returns `null` (test
        asserts this).
      - Acceptance: `generateYard(seed)` is deterministic — the same seed
        always produces an identical yard (test asserts equality).
      - Acceptance: generated yards vary topology (siding count, switch
        count, or car count differs) across at least 3 of 10 sampled seeds.

- [x] **1.3 — Move counter, par, and win detection**
      The real solver (from 1.2) computes `parMoves` for the active yard.
      The UI tracks the player's move count live and detects a win when
      every car is on its target siding.
      - Acceptance: the on-screen move counter increments exactly once per
        switch throw that changes train position, not on redundant throws.
      - Acceptance: reaching the win state (all cars correctly sided)
        triggers a win screen within one render frame, showing the
        player's move count and the yard's par.

- [x] **1.4 — Undo and reset**
      Players can undo their last switch throw or reset the yard to its
      initial state without reloading the page.
      - Acceptance: pressing Undo after N throws returns the board to its
        state after N-1 throws, decrementing the move counter.
      - Acceptance: Reset restores the original car positions and switch
        states for the current seed and zeroes the move counter.

- [x] **1.5 — Design polish: board & switch juice**
      Apply `docs/DESIGN.md`'s juice plan to the core board: tweened
      movement (110–140ms ease-out), 2–4px impact shake on
      coupling/decoupling, siding scale-pop on success, and the
      `switch-throw` / `couple` / `decouple` synth SFX.
      - Acceptance: `prefers-reduced-motion: reduce` disables shake/particle
        effects while switch state and car position still update correctly.
      - Acceptance: every listed SFX (switch-throw, couple, decouple) has a
        corresponding WebAudio-generated sound with no bundled audio files
        in the repo.

## Epic 2 — Replayability & progression

- [x] **2.1 — "New Yard" flow with difficulty scaling**
      A "New Yard" control generates a fresh yard from a new seed;
      generator parameters (car count, siding count, switch count) scale
      up as the player completes more yards in a session.
      - Acceptance: clicking "New Yard" three times in a row produces
        three yards with different `id`/`seed` values and at least one
        differing topology parameter across the sequence.
      - Acceptance: the Nth yard in a session has parameters greater than
        or equal to the 1st (never gets easier within a session).

- [x] **2.2 — Win celebration and "solved in N moves" share card**
      On win, show a full celebration overlay (per DESIGN.md: stats,
      spark particles, "Next Yard" CTA) and generate a shareable image/card
      summarizing the result.
      - Acceptance: the win overlay displays move count, par, and a
        derived rating (e.g. par/at-par/over-par) without a page reload.
      - Acceptance: a "Share" or "Download" action produces an image
        (canvas-rendered) containing the move count and par text.

- [x] **2.3 — Persisted best score and stats**
      Track best (lowest) move count relative to par, and total yards
      solved, in `localStorage`, surfaced somewhere in the HUD.
      - Acceptance: solving a yard updates `localStorage` and the HUD
        stat immediately, without requiring a page refresh.
      - Acceptance: reloading the page after solving at least one yard
        still shows the previously recorded stats (persisted across
        reload).

- [x] **2.4 — Design polish: HUD, win overlay, and share card**
      Apply DESIGN.md tokens/type scale to the HUD sidebar (desktop) /
      stat strip (mobile), the win overlay, and the share card so all
      three read as the same brand as the board.
      - Acceptance: HUD, win overlay, and share card all use only colors
        from the DESIGN.md token table (no ad hoc hex values introduced).
      - Acceptance: the win overlay is reachable and legible at both
        390px and 1440px viewport widths with no overlapping content.

## Epic 3 — Ship-ready polish & accessibility

- [ ] **3.1 — Full synthesized SFX suite with persistent mute**
      Implement the complete SFX list from DESIGN.md (switch-throw,
      couple, decouple, siding-success, win-fanfare, invalid-move) plus a
      mute toggle whose state persists across reloads.
      - Acceptance: toggling mute silences all subsequent SFX calls
        immediately (no sound fires after mute is enabled).
      - Acceptance: mute state read from `localStorage` on load matches
        the state it was in when the page was last closed.

- [ ] **3.2 — Responsive layout and touch controls**
      The board + HUD layout composes correctly at 390px, 768px, and
      1440px per DESIGN.md's layout intent; switches are operable via
      touch tap, not just mouse click.
      - Acceptance: at 390px width there is no horizontal scrollbar and
        the board retains at least 60% of viewport height.
      - Acceptance: tapping a switch on a touch-simulated viewport throws
        it (same behavior as a mouse click).

- [ ] **3.3 — Keyboard accessibility**
      Switches and primary controls (New Yard, Undo, Reset, Mute) are
      operable via keyboard, with visible focus states and correct tab
      order.
      - Acceptance: tabbing through the page reaches every interactive
        control in a logical order, each with a visible focus ring.
      - Acceptance: pressing Enter/Space on a focused switch throws it,
        identically to a click.

- [ ] **3.4 — Landing content and brand consistency**
      The single-page app itself serves as the landing page (per the
      servable-project rule): above/around the board, include a short
      pitch, the animated wordmark, and a favicon — all matching
      DESIGN.md's direction, with no separate/differently-styled site.
      - Acceptance: the favicon is a custom SVG (not the default globe)
        matching the accent color from DESIGN.md.
      - Acceptance: the wordmark plays its draw-in animation on first load
        and on each "New Yard" action.

- [ ] **3.5 — Design polish: full self-review pass**
      Run the DESIGN.md §D3 self-review checklist end to end (resize
      390/768/1440, squint test, tab-through, play one full yard with
      sound) and fix anything that fails, per the ship gate in §D4.
      - Acceptance: no anti-generic-ban item from DESIGN.md §D4 is present
        anywhere in the shipped page (verified by manual checklist walk,
        noted in the QA run's STATUS `memory`).
      - Acceptance: a full play-through (load → solve a yard → win screen)
        completes with zero console errors at all three checked widths.
