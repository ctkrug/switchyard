import { describe, expect, it } from "vitest";
import { generateYard } from "../src/game/generator";
import { solve } from "../src/game/solver";

describe("generateYard", () => {
  it("produces a yard whose cars all target an existing siding", () => {
    const yard = generateYard(42);
    const sidingIds = new Set(yard.sidings.map((s) => s.id));

    for (const car of yard.cars) {
      expect(sidingIds.has(car.targetSidingId)).toBe(true);
    }
  });

  it("is deterministic for a given seed", () => {
    const a = generateYard(7);
    const b = generateYard(7);
    expect(a).toEqual(b);
  });

  it("never produces an unsolvable yard, across 100 seeds", () => {
    for (let seed = 0; seed < 100; seed++) {
      const yard = generateYard(seed);
      expect(solve(yard)).not.toBeNull();
    }
  });

  it("reports parMoves matching the solver's own shortest plan", () => {
    for (let seed = 0; seed < 20; seed++) {
      const yard = generateYard(seed);
      const plan = solve(yard);
      expect(plan).not.toBeNull();
      expect(yard.parMoves).toBe(plan?.length);
    }
  });

  it("varies topology (siding, switch, or car count) across sampled seeds", () => {
    const signatures = new Set<string>();
    for (let seed = 0; seed < 10; seed++) {
      const yard = generateYard(seed);
      signatures.add(`${yard.switches.length}:${yard.sidings.length}:${yard.cars.length}`);
    }
    expect(signatures.size).toBeGreaterThanOrEqual(3);
  });

  it("always includes at least one car and one switch", () => {
    for (let seed = 0; seed < 20; seed++) {
      const yard = generateYard(seed);
      expect(yard.cars.length).toBeGreaterThan(0);
      expect(yard.switches.length).toBeGreaterThan(0);
    }
  });

  it("gives every siding capacity for at least the cars targeting it", () => {
    const yard = generateYard(3);
    for (const siding of yard.sidings) {
      const demand = yard.cars.filter((car) => car.targetSidingId === siding.id).length;
      expect(siding.capacity).toBeGreaterThanOrEqual(demand);
    }
  });
});
