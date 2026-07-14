import type { Yard } from "./types";

/**
 * Placeholder generator: produces a trivially solvable single-siding yard.
 * The real constraint-based generator (multi-siding, guaranteed-solvable via
 * an embedded solver check) lands in a later build pass — see
 * docs/BACKLOG.md, epic 1.
 */
export function generateYard(seed: number): Yard {
  return {
    id: `yard-${seed}`,
    seed,
    cars: [{ id: "car-1", targetSidingId: "siding-1" }],
    sidings: [{ id: "siding-1", capacity: 1 }],
    parMoves: 1,
  };
}
