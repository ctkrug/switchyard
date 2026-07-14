import { describe, expect, it } from "vitest";
import { confettiOpacity, createConfettiBurst, stepConfetti } from "../src/render/confetti";
import { createRng } from "../src/game/prng";

describe("createConfettiBurst", () => {
  it("spawns the requested particle count at the origin", () => {
    const particles = createConfettiBurst(100, 200, createRng(1), 10);
    expect(particles).toHaveLength(10);
    for (const p of particles) {
      expect(p.x).toBe(100);
      expect(p.y).toBe(200);
      expect(p.lifeMs).toBeGreaterThan(0);
      expect(p.ageMs).toBe(0);
    }
  });

  it("defaults to a non-empty burst when count is omitted", () => {
    expect(createConfettiBurst(0, 0, createRng(2)).length).toBeGreaterThan(0);
  });

  it("returns an empty array when count is 0", () => {
    expect(createConfettiBurst(0, 0, createRng(3), 0)).toEqual([]);
  });

  it("is deterministic for a given seed", () => {
    const a = createConfettiBurst(50, 50, createRng(42), 6);
    const b = createConfettiBurst(50, 50, createRng(42), 6);
    expect(a).toEqual(b);
  });
});

describe("stepConfetti", () => {
  it("moves particles and increases their age", () => {
    const [p0] = createConfettiBurst(0, 0, createRng(7), 1);
    const [stepped] = stepConfetti([p0], 16);
    expect(stepped.ageMs).toBe(16);
    expect(stepped.x).toBeCloseTo(p0.x + p0.vx * 16);
  });

  it("applies gravity by increasing vertical velocity over time", () => {
    const [p0] = createConfettiBurst(0, 0, createRng(9), 1);
    const [stepped] = stepConfetti([p0], 100);
    expect(stepped.vy).toBeGreaterThan(p0.vy);
  });

  it("prunes particles once their age reaches their lifeMs", () => {
    const particles = createConfettiBurst(0, 0, createRng(11), 5);
    const allDead = stepConfetti(particles, 10_000);
    expect(allDead).toEqual([]);
  });

  it("returns an empty array unchanged", () => {
    expect(stepConfetti([], 16)).toEqual([]);
  });
});

describe("confettiOpacity", () => {
  it("is 1 for a freshly spawned particle", () => {
    const [p] = createConfettiBurst(0, 0, createRng(1), 1);
    expect(confettiOpacity(p)).toBe(1);
  });

  it("decreases toward 0 as age approaches lifeMs", () => {
    const [p] = createConfettiBurst(0, 0, createRng(1), 1);
    const halfway = { ...p, ageMs: p.lifeMs / 2 };
    const almostDone = { ...p, ageMs: p.lifeMs - 1 };
    expect(confettiOpacity(halfway)).toBeCloseTo(0.5, 1);
    expect(confettiOpacity(almostDone)).toBeGreaterThan(0);
    expect(confettiOpacity(almostDone)).toBeLessThan(confettiOpacity(halfway));
  });

  it("never goes negative past expiry", () => {
    const [p] = createConfettiBurst(0, 0, createRng(1), 1);
    expect(confettiOpacity({ ...p, ageMs: p.lifeMs + 500 })).toBe(0);
  });
});
