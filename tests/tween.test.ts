import { describe, expect, it } from "vitest";
import { easeOutCubic, lerp, pointAlongPath } from "../src/render/tween";

describe("easeOutCubic", () => {
  it("starts at 0 and ends at 1", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
  });

  it("clamps values outside [0, 1]", () => {
    expect(easeOutCubic(-0.5)).toBe(0);
    expect(easeOutCubic(1.5)).toBe(1);
  });

  it("front-loads progress (eases out, not linear)", () => {
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });
});

describe("lerp", () => {
  it("interpolates linearly between two values", () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
  });
});

describe("pointAlongPath", () => {
  const path = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
  ];

  it("returns the start point at t=0 and the end point at t=1", () => {
    expect(pointAlongPath(path, 0)).toEqual({ x: 0, y: 0 });
    expect(pointAlongPath(path, 1)).toEqual({ x: 10, y: 10 });
  });

  it("interpolates within the first segment", () => {
    expect(pointAlongPath(path, 0.25)).toEqual({ x: 5, y: 0 });
  });

  it("interpolates within the second segment", () => {
    expect(pointAlongPath(path, 0.75)).toEqual({ x: 10, y: 5 });
  });

  it("returns the single point for a one-point path", () => {
    expect(pointAlongPath([{ x: 3, y: 4 }], 0.5)).toEqual({ x: 3, y: 4 });
  });

  it("returns the origin for an empty path", () => {
    expect(pointAlongPath([], 0.5)).toEqual({ x: 0, y: 0 });
  });
});
