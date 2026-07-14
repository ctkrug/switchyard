import type { Move, Yard } from "./types";

/**
 * Placeholder solver: handles only the single-siding placeholder yard shape
 * produced by generator.ts today. The real solver (BFS/A* over switch
 * states for arbitrary yard topology) lands alongside the full generator —
 * see docs/BACKLOG.md, epic 1.
 */
export function solve(yard: Yard): Move[] | null {
  if (yard.cars.length === 0) {
    return [];
  }
  if (yard.sidings.length === 1 && yard.cars.every((car) => car.targetSidingId === yard.sidings[0].id)) {
    return [{ switchId: "switch-1", branch: "left" }];
  }
  return null;
}
