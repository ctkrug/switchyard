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
 * Advances the car queue under a fixed switch state: repeatedly resolves
 * and dispatches the front car as long as the track routes it somewhere.
 * Models "one switch throw can move several cars in one flowing motion" —
 * if car after car happens to already be pointed at its correct siding,
 * they all go in the same cascade. Stops at the first car that has
 * nowhere to go (still on the lead) or the first one sent to the wrong
 * siding (a mistake commits — the cascade halts so the player can see it
 * and undo, rather than silently misrouting the rest of the train).
 */
export function advanceQueue(
  switches: readonly Switch[],
  cars: readonly Car[],
  queueIndex: number,
  state: SwitchState,
): { queueIndex: number; dispatches: Dispatch[] } {
  const dispatches: Dispatch[] = [];
  let index = queueIndex;

  while (index < cars.length) {
    const destination = resolveDestination(switches, state);
    if (destination === null) {
      break;
    }
    const car = cars[index];
    const correct = destination === car.targetSidingId;
    dispatches.push({ car, sidingId: destination, correct });
    index++;
    if (!correct) {
      break;
    }
  }

  return { queueIndex: index, dispatches };
}
