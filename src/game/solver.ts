import { advanceQueue } from "./track";
import type { SwitchState } from "./track";
import type { Move, Yard } from "./types";

function stateKey(queueIndex: number, switches: readonly Yard["switches"][number][], state: SwitchState): string {
  const branches = switches.map((sw) => (state[sw.id] === "right" ? "R" : "L")).join("");
  return `${queueIndex}:${branches}`;
}

/**
 * Breadth-first search over (next-car-index, switch-lever-state): finds
 * the shortest sequence of switch throws that delivers every car to its
 * target siding, or null if no such sequence exists.
 *
 * The state space is tiny (cars ≤ ~10, switches ≤ ~6 → at most a few
 * hundred states), so plain BFS is both simplest and fast enough to run
 * on every candidate yard at generation time.
 */
export function solve(yard: Yard): Move[] | null {
  const { cars, switches } = yard;
  if (cars.length === 0) {
    return [];
  }

  type Node = { queueIndex: number; state: SwitchState; moves: Move[] };

  const start: Node = { queueIndex: 0, state: {}, moves: [] };
  const visited = new Set<string>([stateKey(0, switches, {})]);
  const frontier: Node[] = [start];

  for (let head = 0; head < frontier.length; head++) {
    const current = frontier[head];

    for (const sw of switches) {
      for (const branch of ["left", "right"] as const) {
        if ((current.state[sw.id] ?? "left") === branch) {
          continue; // re-throwing to the same position is never useful
        }

        const nextState: SwitchState = { ...current.state, [sw.id]: branch };
        const { queueIndex, dispatches } = advanceQueue(switches, cars, current.queueIndex, nextState);
        const madeAMistake = dispatches.some((d) => !d.correct);
        if (madeAMistake) {
          continue; // dead end — a misrouted car can't be recovered
        }

        const moves = [...current.moves, { switchId: sw.id, branch }];
        if (queueIndex === cars.length) {
          return moves;
        }

        const key = stateKey(queueIndex, switches, nextState);
        if (visited.has(key)) {
          continue;
        }
        visited.add(key);
        frontier.push({ queueIndex, state: nextState, moves });
      }
    }
  }

  return null;
}
