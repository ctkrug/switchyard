const STATS_STORAGE_KEY = "switchyard:stats";

export interface Stats {
  totalSolved: number;
  /** Lowest (moves - par) ever recorded; 0 means a par-perfect run. Null until a first solve. */
  bestDelta: number | null;
}

export const INITIAL_STATS: Stats = { totalSolved: 0, bestDelta: null };

/** Pure: folds one solved run into a stats snapshot without ever regressing bestDelta. */
export function recordSolve(stats: Stats, moves: number, par: number): Stats {
  const delta = moves - par;
  const bestDelta = stats.bestDelta === null ? delta : Math.min(stats.bestDelta, delta);
  return { totalSolved: stats.totalSolved + 1, bestDelta };
}

function isStats(value: unknown): value is Stats {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.totalSolved === "number" &&
    (candidate.bestDelta === null || typeof candidate.bestDelta === "number")
  );
}

export function loadStats(): Stats {
  try {
    const raw = globalThis.localStorage?.getItem(STATS_STORAGE_KEY);
    if (!raw) return INITIAL_STATS;
    const parsed: unknown = JSON.parse(raw);
    return isStats(parsed) ? parsed : INITIAL_STATS;
  } catch {
    return INITIAL_STATS;
  }
}

export function saveStats(stats: Stats): void {
  try {
    globalThis.localStorage?.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // localStorage unavailable (private browsing, disabled cookies) — stats
    // just won't survive a reload, which is a fine degradation.
  }
}

/** Human-readable form of bestDelta for the HUD: "—" until a first solve, then "At par" or "+N". */
export function formatBestDelta(bestDelta: number | null): string {
  if (bestDelta === null) return "—";
  if (bestDelta === 0) return "At par";
  return bestDelta > 0 ? `+${bestDelta}` : `${bestDelta}`;
}
