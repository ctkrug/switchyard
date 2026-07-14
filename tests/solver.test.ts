import { describe, expect, it } from "vitest";
import { solve } from "../src/game/solver";
import type { Yard } from "../src/game/types";

function yardOf(fields: Partial<Yard>): Yard {
  return {
    id: "test-yard",
    seed: 0,
    cars: [],
    sidings: [],
    switches: [],
    parMoves: 0,
    ...fields,
  };
}

describe("solve", () => {
  it("returns an empty plan for a yard with no cars", () => {
    expect(solve(yardOf({}))).toEqual([]);
  });

  it("solves a single car behind a single switch in one move", () => {
    const yard = yardOf({
      cars: [{ id: "car-1", targetSidingId: "siding-1" }],
      sidings: [{ id: "siding-1", capacity: 1 }],
      switches: [{ id: "switch-1", sidingId: "siding-1" }],
    });

    expect(solve(yard)).toEqual([{ switchId: "switch-1", branch: "right" }]);
  });

  it("routes a car past an earlier switch that must stay left", () => {
    const yard = yardOf({
      cars: [{ id: "car-1", targetSidingId: "siding-2" }],
      sidings: [
        { id: "siding-1", capacity: 1 },
        { id: "siding-2", capacity: 1 },
      ],
      switches: [
        { id: "switch-1", sidingId: "siding-1" },
        { id: "switch-2", sidingId: "siding-2" },
      ],
    });

    // switch-1 already defaults left, so only switch-2 needs a throw.
    expect(solve(yard)).toEqual([{ switchId: "switch-2", branch: "right" }]);
  });

  it("finds a multi-car plan that re-throws a shared switch between cars", () => {
    const yard = yardOf({
      cars: [
        { id: "car-1", targetSidingId: "siding-1" },
        { id: "car-2", targetSidingId: "siding-2" },
      ],
      sidings: [
        { id: "siding-1", capacity: 1 },
        { id: "siding-2", capacity: 1 },
      ],
      switches: [
        { id: "switch-1", sidingId: "siding-1" },
        { id: "switch-2", sidingId: "siding-2" },
      ],
    });

    const moves = solve(yard);
    expect(moves).toEqual([
      { switchId: "switch-1", branch: "right" },
      { switchId: "switch-1", branch: "left" },
      { switchId: "switch-2", branch: "right" },
    ]);
  });

  it("returns null when a car has no siding it can ever reach", () => {
    const yard = yardOf({
      cars: [{ id: "car-1", targetSidingId: "siding-99" }],
      sidings: [{ id: "siding-1", capacity: 1 }],
      switches: [{ id: "switch-1", sidingId: "siding-1" }],
    });

    expect(solve(yard)).toBeNull();
  });

  it("returns null when the yard has cars but no switches to route them", () => {
    const yard = yardOf({
      cars: [{ id: "car-1", targetSidingId: "siding-1" }],
      sidings: [{ id: "siding-1", capacity: 1 }],
      switches: [],
    });

    expect(solve(yard)).toBeNull();
  });
});
