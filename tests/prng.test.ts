import { describe, expect, it } from "vitest";
import { createRng, randInt } from "../src/game/prng";

describe("createRng", () => {
  it("is deterministic for a given seed", () => {
    const a = createRng(42);
    const b = createRng(42);
    const sequenceA = Array.from({ length: 10 }, () => a());
    const sequenceB = Array.from({ length: 10 }, () => b());
    expect(sequenceA).toEqual(sequenceB);
  });

  it("produces different sequences for different seeds", () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(a()).not.toBe(b());
  });

  it("always returns values in [0, 1)", () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe("randInt", () => {
  it("returns the single option when min equals max", () => {
    const rng = createRng(3);
    expect(randInt(rng, 5, 5)).toBe(5);
  });

  it("stays within an inclusive [min, max] range", () => {
    const rng = createRng(11);
    for (let i = 0; i < 500; i++) {
      const value = randInt(rng, 2, 6);
      expect(value).toBeGreaterThanOrEqual(2);
      expect(value).toBeLessThanOrEqual(6);
    }
  });
});
