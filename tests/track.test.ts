import { describe, expect, it } from "vitest";
import { advanceQueue, resolveDestination } from "../src/game/track";
import type { Car, Switch } from "../src/game/types";

const switches: Switch[] = [
  { id: "switch-1", sidingId: "siding-1" },
  { id: "switch-2", sidingId: "siding-2" },
  { id: "switch-3", sidingId: "siding-3" },
];

describe("resolveDestination", () => {
  it("diverts into the first switch thrown right", () => {
    const dest = resolveDestination(switches, { "switch-1": "right" });
    expect(dest).toBe("siding-1");
  });

  it("passes through switches left of the diverting one", () => {
    const dest = resolveDestination(switches, {
      "switch-1": "left",
      "switch-2": "right",
    });
    expect(dest).toBe("siding-2");
  });

  it("stops at the first diverting switch, ignoring later ones", () => {
    const dest = resolveDestination(switches, {
      "switch-1": "right",
      "switch-2": "right",
    });
    expect(dest).toBe("siding-1");
  });

  it("returns null when every switch is left (overruns the bump post)", () => {
    const dest = resolveDestination(switches, {});
    expect(dest).toBeNull();
  });

  it("returns null for an empty switch chain", () => {
    expect(resolveDestination([], {})).toBeNull();
  });

  it("treats a switch missing from state as left", () => {
    const dest = resolveDestination(switches, { "switch-2": "right" });
    expect(dest).toBe("siding-2");
  });
});

const cars: Car[] = [
  { id: "car-1", targetSidingId: "siding-1" },
  { id: "car-2", targetSidingId: "siding-1" },
  { id: "car-3", targetSidingId: "siding-2" },
];

describe("advanceQueue", () => {
  it("does not move the queue when the track doesn't resolve", () => {
    const result = advanceQueue(switches, cars, 0, {});
    expect(result.queueIndex).toBe(0);
    expect(result.dispatches).toEqual([]);
  });

  it("dispatches a single car to its correct siding", () => {
    const soloCar: Car[] = [{ id: "car-1", targetSidingId: "siding-1" }];
    const result = advanceQueue(switches, soloCar, 0, { "switch-1": "right" });
    expect(result.queueIndex).toBe(1);
    expect(result.dispatches).toEqual([{ car: soloCar[0], sidingId: "siding-1", correct: true }]);
  });

  it("cascades through consecutive cars sharing the same correct destination", () => {
    // car-1 and car-2 both target siding-1; a single throw routes both of
    // them in one cascade before car-3 (which wants siding-2) breaks it.
    const result = advanceQueue(switches, cars, 0, { "switch-1": "right" });
    expect(result.queueIndex).toBe(3);
    expect(result.dispatches).toEqual([
      { car: cars[0], sidingId: "siding-1", correct: true },
      { car: cars[1], sidingId: "siding-1", correct: true },
      { car: cars[2], sidingId: "siding-1", correct: false },
    ]);
  });

  it("halts the cascade on the first mistake, leaving later cars untouched", () => {
    // car-1 targets siding-1 but the state routes it to siding-2.
    const result = advanceQueue(switches, cars, 0, { "switch-1": "left", "switch-2": "right" });
    expect(result.queueIndex).toBe(1);
    expect(result.dispatches).toEqual([{ car: cars[0], sidingId: "siding-2", correct: false }]);
  });

  it("returns no-op for an empty queue", () => {
    const result = advanceQueue(switches, [], 0, { "switch-1": "right" });
    expect(result.queueIndex).toBe(0);
    expect(result.dispatches).toEqual([]);
  });

  it("is a no-op once the queue index is past the end", () => {
    const result = advanceQueue(switches, cars, cars.length, { "switch-1": "right" });
    expect(result.queueIndex).toBe(cars.length);
    expect(result.dispatches).toEqual([]);
  });
});
