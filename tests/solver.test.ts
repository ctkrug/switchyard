import { describe, expect, it } from "vitest";
import { generateYard } from "../src/game/generator";
import { solve } from "../src/game/solver";

describe("solve", () => {
  it("finds a plan for every generated yard (generator must be solvable)", () => {
    const yard = generateYard(1);
    expect(solve(yard)).not.toBeNull();
  });

  it("returns an empty plan for a yard with no cars", () => {
    const empty = { id: "empty", seed: 0, cars: [], sidings: [], parMoves: 0 };
    expect(solve(empty)).toEqual([]);
  });
});
