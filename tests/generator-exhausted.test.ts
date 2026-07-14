import { describe, expect, it, vi } from "vitest";

// Isolated in its own file: mocking the solver module affects every test in
// this file, so generateYard's normal-path tests (which need a real solver)
// live in generator.test.ts instead.
vi.mock("../src/game/solver", () => ({ solve: () => null }));

describe("generateYard when every attempt is unsolvable", () => {
  it("gives up after MAX_GENERATION_ATTEMPTS and throws instead of looping forever", async () => {
    const { generateYard } = await import("../src/game/generator");
    expect(() => generateYard(123)).toThrow(/failed to produce a solvable yard for seed 123/);
  });
});
