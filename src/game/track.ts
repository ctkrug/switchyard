import type { Branch, Switch } from "./types";

/**
 * Switch lever positions, keyed by switch id. Any switch missing from the
 * map is treated as "left" (straight through) by default.
 */
export type SwitchState = Readonly<Record<string, Branch>>;

/**
 * Follows the lead track from the throat (switch index 0) under the given
 * switch state and reports where a car ends up.
 *
 * - Hits a switch thrown "right": the car diverts into that switch's
 *   siding — returns the siding id.
 * - Runs off the end of the chain (every switch thrown "left"): the car
 *   overruns the bump post and doesn't arrive anywhere — returns null.
 */
export function resolveDestination(switches: readonly Switch[], state: SwitchState): string | null {
  for (const sw of switches) {
    const branch = state[sw.id] ?? "left";
    if (branch === "right") {
      return sw.sidingId;
    }
  }
  return null;
}
