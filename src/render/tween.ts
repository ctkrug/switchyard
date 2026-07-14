import type { WorldPoint } from "./layout";

/** Standard ease-out cubic — fast start, gentle settle. Used for all board motion. */
export function easeOutCubic(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - clamped, 3);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Linear interpolation along a multi-point path, using eased progress `t` in [0, 1]. */
export function pointAlongPath(path: readonly WorldPoint[], t: number): WorldPoint {
  if (path.length === 0) {
    return { x: 0, y: 0 };
  }
  if (path.length === 1 || t <= 0) {
    return path[0];
  }
  if (t >= 1) {
    return path[path.length - 1];
  }

  const segmentCount = path.length - 1;
  const scaled = t * segmentCount;
  const segmentIndex = Math.min(segmentCount - 1, Math.floor(scaled));
  const localT = scaled - segmentIndex;
  const from = path[segmentIndex];
  const to = path[segmentIndex + 1];
  return { x: lerp(from.x, to.x, localT), y: lerp(from.y, to.y, localT) };
}
