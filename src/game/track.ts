import type { Branch, Car, Switch } from "./types";

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

/** One car's arrival at a siding, correct or not, during a cascade. */
export interface Dispatch {
  car: Car;
  sidingId: string;
  correct: boolean;
}

/**
 * Checks whether the front car of the queue can complete its journey
 * under the given switch state and, if so, dispatches it — one switch
 * throw ever moves at most one car. (An earlier cascading design that
 * chained through consecutive cars under an unchanged state turned out
 * to over-eagerly misroute the *next* car the instant its predecessor's
 * path was set, since the state doesn't know it should stop at one.)
 * Returns a same-shaped `dispatches` array (0 or 1 entries) so callers
 * don't need to special-case the count.
 */
export function advanceQueue(
  switches: readonly Switch[],
  cars: readonly Car[],
  queueIndex: number,
  state: SwitchState,
): { queueIndex: number; dispatches: Dispatch[] } {
  if (queueIndex >= cars.length) {
    return { queueIndex, dispatches: [] };
  }

  const destination = resolveDestination(switches, state);
  if (destination === null) {
    return { queueIndex, dispatches: [] };
  }

  const car = cars[queueIndex];
  const correct = destination === car.targetSidingId;
  return { queueIndex: queueIndex + 1, dispatches: [{ car, sidingId: destination, correct }] };
}
