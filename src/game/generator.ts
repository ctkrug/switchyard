import { createRng, randInt } from "./prng";
import { solve } from "./solver";
import type { Car, Siding, Switch, Yard } from "./types";

const MIN_SWITCHES = 2;
const MAX_SWITCHES = 4;
const MIN_CARS = 3;
const MAX_CARS = 7;
const MAX_GENERATION_ATTEMPTS = 20;

function buildCandidate(seed: number): Yard {
  const rng = createRng(seed);
  const switchCount = randInt(rng, MIN_SWITCHES, MAX_SWITCHES);
  const carCount = randInt(rng, MIN_CARS, MAX_CARS);

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
 */
export function generateYard(seed: number): Yard {
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const candidate = buildCandidate(seed + attempt * 104_729);
    const plan = solve(candidate);
    if (plan !== null) {
      return { ...candidate, id: `yard-${seed}`, seed, parMoves: plan.length };
    }
  }
  throw new Error(`generateYard: failed to produce a solvable yard for seed ${seed}`);
}
