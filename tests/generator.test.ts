import { describe, expect, it } from "vitest";
import { generateYard } from "../src/game/generator";

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
});
