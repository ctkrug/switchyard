import { advanceQueue } from "./track";
import type { Dispatch, SwitchState } from "./track";
import type { Branch, Yard } from "./types";

/** A pure snapshot of play progress against a fixed yard. */
export interface GameState {
  switchState: SwitchState;
  /** Index of the next car in `yard.cars` still waiting to dispatch. */
  queueIndex: number;
  /** Every dispatch so far, in order, correct or not. */
  dispatches: Dispatch[];
  moveCount: number;
}

/** A yard plus its live play state and undo history. */
export interface Session {
  yard: Yard;
  present: GameState;
  past: GameState[];
}

function initialState(): GameState {
  return { switchState: {}, queueIndex: 0, dispatches: [], moveCount: 0 };
}

export function createSession(yard: Yard): Session {
  return { yard, present: initialState(), past: [] };
}

/** True once every car has dispatched and none of them went to the wrong siding. */
export function isWin(session: Session): boolean {
  const { present, yard } = session;
  return present.queueIndex === yard.cars.length && present.dispatches.every((d) => d.correct);
}

/** True if any dispatch so far sent a car to the wrong siding. */
export function hasMistake(session: Session): boolean {
  return session.present.dispatches.some((d) => !d.correct);
}

/**
 * Throws one switch. A throw to the lever's current position is a no-op
 * (redundant — no move counted, no history entry, matching the solver's
 * own move-generation rule). Otherwise the lever flips, the front car is
 * re-checked against the new track shape, and — if its path now resolves
 * — it dispatches, correct or not.
 */
export function throwSwitch(session: Session, switchId: string, branch: Branch): Session {
  const { present, yard } = session;
  const currentBranch = present.switchState[switchId] ?? "left";
  if (currentBranch === branch) {
    return session;
  }

  const nextSwitchState: SwitchState = { ...present.switchState, [switchId]: branch };
  const { queueIndex, dispatches } = advanceQueue(yard.switches, yard.cars, present.queueIndex, nextSwitchState);
  const newDispatch = dispatches[0];

  const next: GameState = {
    switchState: nextSwitchState,
    queueIndex,
    dispatches: newDispatch ? [...present.dispatches, newDispatch] : present.dispatches,
    moveCount: present.moveCount + 1,
  };

  return { yard, present: next, past: [...session.past, present] };
}

/** Reverts the last switch throw. A no-op if there's nothing to undo. */
export function undo(session: Session): Session {
  if (session.past.length === 0) {
    return session;
  }
  const past = session.past.slice(0, -1);
  const present = session.past[session.past.length - 1];
  return { yard: session.yard, present, past };
}

/** Restores the yard's initial state (switches home, no cars dispatched) and clears undo history. */
export function reset(session: Session): Session {
  return { yard: session.yard, present: initialState(), past: [] };
}
