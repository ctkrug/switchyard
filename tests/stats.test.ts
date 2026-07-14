import { describe, expect, it, beforeEach } from "vitest";
import { formatBestDelta, INITIAL_STATS, loadStats, recordSolve, saveStats, type Stats } from "../src/game/stats";

describe("recordSolve", () => {
  it("sets bestDelta and totalSolved on the first solve", () => {
    const next = recordSolve(INITIAL_STATS, 12, 10);
    expect(next).toEqual({ totalSolved: 1, bestDelta: 2 });
  });

  it("records a par-perfect run as delta 0", () => {
    const next = recordSolve(INITIAL_STATS, 8, 8);
    expect(next.bestDelta).toBe(0);
  });

  it("improves bestDelta when a later run is better", () => {
    const first = recordSolve(INITIAL_STATS, 15, 10);
    const better = recordSolve(first, 11, 10);
    expect(better).toEqual({ totalSolved: 2, bestDelta: 1 });
  });

  it("never regresses bestDelta on a worse run", () => {
    const first = recordSolve(INITIAL_STATS, 11, 10);
    const worse = recordSolve(first, 20, 10);
    expect(worse).toEqual({ totalSolved: 2, bestDelta: 1 });
  });

  it("always increments totalSolved regardless of delta", () => {
    let stats: Stats = INITIAL_STATS;
    for (let i = 0; i < 5; i++) {
      stats = recordSolve(stats, 10 + i, 10);
    }
    expect(stats.totalSolved).toBe(5);
  });
});

describe("formatBestDelta", () => {
  it("shows an em dash before any solve", () => {
    expect(formatBestDelta(null)).toBe("—");
  });

  it("labels a zero delta as at par", () => {
    expect(formatBestDelta(0)).toBe("At par");
  });

  it("prefixes a positive delta with +", () => {
    expect(formatBestDelta(3)).toBe("+3");
  });

  it("renders a negative delta plainly, without a + prefix", () => {
    // bestDelta can't go negative today (moves can't be fewer than par),
    // but the formatter is defensive against it anyway.
    expect(formatBestDelta(-2)).toBe("-2");
  });
});

describe("loadStats / saveStats", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns INITIAL_STATS when nothing has been saved", () => {
    expect(loadStats()).toEqual(INITIAL_STATS);
  });

  it("round-trips a saved value", () => {
    const stats: Stats = { totalSolved: 4, bestDelta: 2 };
    saveStats(stats);
    expect(loadStats()).toEqual(stats);
  });

  it("falls back to INITIAL_STATS on malformed JSON", () => {
    localStorage.setItem("switchyard:stats", "{not json");
    expect(loadStats()).toEqual(INITIAL_STATS);
  });

  it("falls back to INITIAL_STATS on a well-formed but shape-invalid value", () => {
    localStorage.setItem("switchyard:stats", JSON.stringify({ totalSolved: "four" }));
    expect(loadStats()).toEqual(INITIAL_STATS);
  });

  it.each([
    ["a bare number", "5"],
    ["a bare string", '"stats"'],
    ["an array", "[]"],
    ["null", "null"],
  ])("falls back to INITIAL_STATS when the saved value is %s, not an object", (_label, raw) => {
    localStorage.setItem("switchyard:stats", raw);
    expect(loadStats()).toEqual(INITIAL_STATS);
  });
});
