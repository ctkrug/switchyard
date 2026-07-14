# Switchyard — Design Direction

This is the art-direction brief for Switchyard. Every build/QA pass follows
this document. Changing it later is allowed but must be deliberate — its own
commit, with a reason.

## 1. Aesthetic direction

**Switchyard is a night dispatcher's control room:** navy blueprint
linework, glowing amber signal lamps for active switches, and a crisp
technical monospace HUD — like reading a rail-yard schematic lit by lamp
light.

This is a `blueprint/technical` direction, chosen because it's the one theme
that's *diegetic* for a shunting puzzle: dispatchers really do read yards off
schematic diagrams and signal boards, so the chrome doubles as the game's
own fiction instead of sitting on top of it as decoration. It also reads
distinct from soft/warm/toy directions and from dark-glassy-card defaults —
this is technical-cartographic, not moody-cinematic.

## 2. Tokens

### Color

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0a1220` | page background (deep blueprint navy) |
| `--surface-1` | `#111c30` | panels, cards |
| `--surface-2` | `#1a2740` | raised panels, HUD chrome, hovered rows |
| `--line` | `#2b3c5c` | blueprint grid lines, hairline borders |
| `--text` | `#e7edf7` | primary text |
| `--text-muted` | `#7f8fae` | secondary/meta text |
| `--accent` | `#ffb020` | amber signal lamp — primary interactive accent |
| `--accent-support` | `#38bdf8` | blueprint cyan — secondary accent, track linework |
| `--success` | `#3ddc84` | clear signal / correct siding |
| `--danger` | `#ff5a5f` | stop signal / invalid move |

Background is never flat: a faint cyan grid (blueprint graph-paper lines at
~4–6% opacity) sits under everything, plus a soft vignette darkening the
corners so the yard reads as the lit center of a dark room.

### Type

- **Display** (wordmark, headings): [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk),
  weight 600–700 — geometric, engineered, slightly technical without being a
  gimmick font. Fallback: `"Segoe UI", system-ui, sans-serif`.
- **UI / HUD** (labels, move counter, body copy, numerals): [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono),
  weight 400–600 — monospace for anything numeric (move count, par, timers)
  so digits don't jitter in width as they change. Fallback: `"SFMono-Regular", Consolas, monospace`.
- Type scale: 1.25 ratio, base 16px → 20 → 25 → 31 → 39px for
  body/h4/h3/h2/h1.

### Spacing, radius, shadow, motion

- Spacing unit: **8px** scale (8/16/24/32/48/64).
- Corner radius: **6px** on panels/buttons, **3px** on small chips/badges —
  drafting-table crispness, not soft toy rounding.
- Elevation: layered shadows, not flat panels — e.g.
  `0 1px 0 rgba(255,255,255,.04) inset, 0 8px 24px rgba(0,0,0,.45)`. Active
  switches/lamps get an amber glow (`0 0 12px rgba(255,176,32,.55)`).
- Motion: UI transitions 150–200ms ease-out. Game feedback (car movement,
  coupling) 90–140ms ease-out. Respect `prefers-reduced-motion` by dropping
  shake/particle effects while keeping state changes instant-but-visible.

## 3. Layout intent

The **hero is the yard board** (the canvas: tracks, switches, cars). On
desktop (1440×900) the board takes the left ~65% of the viewport at full
height; a HUD sidebar (~35%) on the right holds the move counter vs. par,
the switch legend, run controls (undo/reset/new yard), and the mute toggle.
Header is a slim top bar with the animated wordmark — it does not compete
with the board for vertical space.

On phone (390×844) the board stacks first, full width, sized to ~60% of
viewport height so it's still the dominant element; the HUD collapses below
it into a compact single-row stat strip (moves / par / mute) with controls
as large tap targets underneath. No sidebar-squeezed-board layout on small
screens — the board always gets first claim on space.

## 4. Signature detail

The wordmark **"SWITCHYARD"** draws itself in on load like a pen plotting a
blueprint line — an SVG stroke-dasharray animation that traces each letter
in blueprint-cyan before it fills solid. It replays (briefly, subtly) each
time a new yard is generated, reinforcing "a new schematic has been drawn."

## 5. The juice plan (games/toys)

- **Movement tween:** cars ease along their track path segment-by-segment,
  110–140ms per segment, cubic ease-out — never a snap/teleport.
- **Impact feedback:** on coupling/decoupling, a 2–4px screen-shake on the
  board plus a brief amber flash at the coupling point.
- **Goal feedback:** when a car locks into its correct siding, that siding
  pulses green and the car gets a short scale-pop (1.0 → 1.06 → 1.0).
- **Win celebration:** a "dispatch ticket" overlay — move count vs. par,
  a rating, amber/cyan spark particles, and a clear "Next Yard" CTA.
- **Synth SFX (WebAudio, generated in code — no audio files):**
  - `switch-throw` — short square-wave blip, ~60ms, pitched by direction.
  - `couple` — low sine thud (~120Hz) layered with a short noise burst.
  - `decouple` — a quick descending click/clack, noise-based.
  - `siding-success` — ascending three-note sine chime.
  - `win-fanfare` — short major-key arpeggio, 4 notes.
  - `invalid-move` — short low sawtooth buzz.
  - All SFX at low default volume, rate-throttled so rapid input can't spam
    the mixer. Mute toggle persists to `localStorage`; `AudioContext` is
    created lazily on first user gesture and all SFX calls no-op safely if
    WebAudio is unavailable (e.g. under test).
