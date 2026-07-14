import { describe, expect, it } from "vitest";
import { createSession, hasMistake, isWin, reset, throwSwitch, undo } from "../src/game/engine";
import type { Yard } from "../src/game/types";

const yard: Yard = {
  id: "test-yard",
  seed: 0,
  cars: [
    { id: "car-1", targetSidingId: "siding-1" },
    { id: "car-2", targetSidingId: "siding-2" },
  ],
  sidings: [
    { id: "siding-1", capacity: 1 },
    { id: "siding-2", capacity: 1 },
  ],
  switches: [
    { id: "switch-1", sidingId: "siding-1" },
    { id: "switch-2", sidingId: "siding-2" },
  ],
  parMoves: 3,
};

describe("createSession", () => {
  it("starts with switches home, no dispatches, zero moves", () => {
    const session = createSession(yard);
    expect(session.present.switchState).toEqual({});
    expect(session.present.queueIndex).toBe(0);
    expect(session.present.dispatches).toEqual([]);
    expect(session.present.moveCount).toBe(0);
    expect(session.past).toEqual([]);
  });
});

describe("throwSwitch", () => {
  it("increments the move counter and dispatches the front car when its path resolves", () => {
    const session = throwSwitch(createSession(yard), "switch-1", "right");
    expect(session.present.moveCount).toBe(1);
    expect(session.present.queueIndex).toBe(1);
    expect(session.present.dispatches).toEqual([{ car: yard.cars[0], sidingId: "siding-1", correct: true }]);
  });

  it("does not count or apply a redundant throw to the lever's current position", () => {
    const first = throwSwitch(createSession(yard), "switch-1", "left");
    // switch-1 already defaults to "left" — this should be a no-op.
    expect(first.present.moveCount).toBe(0);
    expect(first.past).toEqual([]);
  });

  it("counts a throw that flips the lever even when no car dispatches", () => {
    // Sending switch-1 back to "left" after it dispatched car-1 leaves no
    // switch diverting — the lever still moved, but nothing resolves.
    let session = throwSwitch(createSession(yard), "switch-1", "right");
    session = throwSwitch(session, "switch-1", "left");
    expect(session.present.moveCount).toBe(2);
    expect(session.present.dispatches).toHaveLength(1);
    expect(session.present.queueIndex).toBe(1);
  });

  it("records a mistake without blocking further throws", () => {
    // switch-1 (checked first in the chain) stays left, so throwing
    // switch-2 sends car-1 — which actually wants siding-1 — to siding-2.
    const session = throwSwitch(createSession(yard), "switch-2", "right");
    expect(hasMistake(session)).toBe(true);
    expect(session.present.dispatches[0]).toEqual({ car: yard.cars[0], sidingId: "siding-2", correct: false });
    expect(session.present.queueIndex).toBe(1);
  });
});

describe("isWin / hasMistake", () => {
  it("is not won at the start", () => {
    expect(isWin(createSession(yard))).toBe(false);
  });

  it("wins once every car dispatches to its correct siding", () => {
    let session = createSession(yard);
    session = throwSwitch(session, "switch-1", "right");
    session = throwSwitch(session, "switch-1", "left");
    session = throwSwitch(session, "switch-2", "right");
    expect(isWin(session)).toBe(true);
    expect(hasMistake(session)).toBe(false);
  });

  it("never reports a win if any car was misrouted, even after the queue empties", () => {
    let session = createSession(yard);
    session = throwSwitch(session, "switch-1", "right"); // car-1 -> siding-1, correct
    session = throwSwitch(session, "switch-1", "left");
    session = throwSwitch(session, "switch-1", "right"); // car-2 -> siding-1, wrong
    expect(session.present.queueIndex).toBe(2);
    expect(isWin(session)).toBe(false);
    expect(hasMistake(session)).toBe(true);
  });
});

describe("undo", () => {
  it("reverts the last throw, decrementing the move counter", () => {
    const afterThrow = throwSwitch(createSession(yard), "switch-1", "right");
    const reverted = undo(afterThrow);
    expect(reverted.present.moveCount).toBe(0);
    expect(reverted.present.queueIndex).toBe(0);
    expect(reverted.present.dispatches).toEqual([]);
  });

  it("is a no-op with nothing to undo", () => {
    const session = createSession(yard);
    expect(undo(session)).toEqual(session);
  });

  it("can be applied repeatedly to walk all the way back to the start", () => {
    let session = createSession(yard);
    session = throwSwitch(session, "switch-1", "right");
    session = throwSwitch(session, "switch-1", "left");
    session = throwSwitch(session, "switch-2", "right");
    expect(session.present.moveCount).toBe(3);

    session = undo(session);
    session = undo(session);
    session = undo(session);
    expect(session.present.moveCount).toBe(0);
    expect(session.present.queueIndex).toBe(0);
    expect(session.past).toEqual([]);
  });
});

describe("reset", () => {
  it("restores the original state and clears undo history", () => {
    let session = createSession(yard);
    session = throwSwitch(session, "switch-1", "right");
    session = throwSwitch(session, "switch-2", "right");

    const restarted = reset(session);
    expect(restarted.present.switchState).toEqual({});
    expect(restarted.present.queueIndex).toBe(0);
    expect(restarted.present.dispatches).toEqual([]);
    expect(restarted.present.moveCount).toBe(0);
    expect(restarted.past).toEqual([]);
  });
});
