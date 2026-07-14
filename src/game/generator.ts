import { createRng, randInt } from "./prng";
import { solve } from "./solver";
import type { Car, Siding, Switch, Yard } from "./types";

const BASE_MIN_SWITCHES = 2;
const SWITCH_WINDOW = 2; // [min, min+1] possible switch counts at a given difficulty
const BASE_MIN_CARS = 3;
const CAR_WINDOW = 3; // [min, min+2] possible car counts at a given difficulty
const MAX_DIFFICULTY = 2; // difficulty plateaus here to keep late yards legible and playable
const MAX_GENERATION_ATTEMPTS = 20;

/**
 * Difficulty windows never overlap between levels (each window is exactly
 * `*_WINDOW` wide and levels are spaced by that same width), so a yard
 * generated at a higher difficulty always has a switch/car count at least
 * as large as one generated at any lower difficulty — "never gets easier
 * within a session" (backlog 2.1) holds per-instance, not just on average.
 */
function difficultyWindow(base: number, width: number, difficulty: number): [number, number] {
  const level = Math.max(0, Math.min(MAX_DIFFICULTY, Math.floor(difficulty)));
  const min = base + level * width;
  return [min, min + width - 1];
}

function buildCandidate(seed: number, difficulty: number): Yard {
  const rng = createRng(seed);
  const [minSwitches, maxSwitches] = difficultyWindow(BASE_MIN_SWITCHES, SWITCH_WINDOW, difficulty);
  const [minCars, maxCars] = difficultyWindow(BASE_MIN_CARS, CAR_WINDOW, difficulty);
  const switchCount = randInt(rng, minSwitches, maxSwitches);
  const carCount = randInt(rng, minCars, maxCars);

  const switches: Switch[] = Array.from({ length: switchCount }, (_, i) => ({
    id: `switch-${i + 1}`,
    sidingId: `siding-${i + 1}`,
  }));

  const cars: Car[] = Array.from({ length: carCount }, (_, i) => {
    const targetIndex = randInt(rng, 0, switchCount - 1);
    return { id: `car-${i + 1}`, targetSidingId: `siding-${targetIndex + 1}` };
  });

  const sidings: Siding[] = switches.map((sw) => ({
    id: sw.sidingId,
    capacity: cars.filter((car) => car.targetSidingId === sw.sidingId).length || 1,
  }));

  return { id: `yard-${seed}`, seed, cars, sidings, switches, parMoves: 0 };
}

/**
 * Builds a randomized-but-guaranteed-solvable yard for the given seed:
 * a lead track carrying `carCount` cars past `switchCount` switches, each
 * owning one siding. The chain topology makes every assignment solvable
 * by construction (any earlier switch can always be re-thrown back to
 * "left" before routing the next car) — the embedded solver call is a
 * defensive verification of that invariant, not a coin flip, so a retry
 * is only ever needed if the invariant itself is ever violated by a
 * future change here.
 *
 * `difficulty` (default 0) widens the switch/car count windows as a
 * player completes more yards in a session — see `difficultyWindow`.
 */
export function generateYard(seed: number, difficulty = 0): Yard {
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const candidate = buildCandidate(seed + attempt * 104_729, difficulty);
    const plan = solve(candidate);
    if (plan !== null) {
      return { ...candidate, id: `yard-${seed}`, seed, parMoves: plan.length };
    }
  }
  throw new Error(`generateYard: failed to produce a solvable yard for seed ${seed}`);
}
