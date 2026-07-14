import { describe, expect, it } from "vitest";
import { computeLayout, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from "../src/render/layout";
import type { Yard } from "../src/game/types";

const yard: Yard = {
  id: "test-yard",
  seed: 0,
  cars: [
    { id: "car-1", targetSidingId: "siding-1" },
    { id: "car-2", targetSidingId: "siding-2" },
    { id: "car-3", targetSidingId: "siding-1" },
  ],
  sidings: [
    { id: "siding-1", capacity: 2 },
    { id: "siding-2", capacity: 1 },
  ],
  switches: [
    { id: "switch-1", sidingId: "siding-1" },
    { id: "switch-2", sidingId: "siding-2" },
  ],
  parMoves: 3,
};

describe("computeLayout", () => {
  it("reports the fixed virtual canvas size", () => {
    const layout = computeLayout(yard);
    expect(layout.width).toBe(VIRTUAL_WIDTH);
    expect(layout.height).toBe(VIRTUAL_HEIGHT);
  });

  it("places one layout entry per switch and per siding", () => {
    const layout = computeLayout(yard);
    expect(layout.switches).toHaveLength(2);
    expect(layout.sidings.size).toBe(2);
  });

  it("orders switches left-to-right with increasing x", () => {
    const layout = computeLayout(yard);
    expect(layout.switches[1].position.x).toBeGreaterThan(layout.switches[0].position.x);
  });

  it("keeps every switch strictly between the throat and the end of the lead", () => {
    const layout = computeLayout(yard);
    for (const sw of layout.switches) {
      expect(sw.position.x).toBeGreaterThan(layout.throatX);
      expect(sw.position.x).toBeLessThan(layout.endX);
    }
  });

  it("stacks siding lanes at increasing y so they never overlap", () => {
    const layout = computeLayout(yard);
    const lanes = [...layout.sidings.values()].map((s) => s.laneY);
    expect(new Set(lanes).size).toBe(lanes.length);
    expect(Math.max(...lanes)).toBeGreaterThan(layout.leadY);
  });

  it("gives a wider siding stub to a siding with more capacity", () => {
    const layout = computeLayout(yard);
    const wide = layout.sidings.get("siding-1")!;
    const narrow = layout.sidings.get("siding-2")!;
    expect(wide.stubEndX - wide.mouth.x).toBeGreaterThan(narrow.stubEndX - narrow.mouth.x);
  });

  it("gives each siding slot a distinct, increasing x position", () => {
    const layout = computeLayout(yard);
    const siding = layout.sidings.get("siding-1")!;
    const slot0 = siding.slot(0);
    const slot1 = siding.slot(1);
    expect(slot1.x).toBeGreaterThan(slot0.x);
    expect(slot0.y).toBe(siding.laneY);
  });

  it("places queue slots to the left of the throat in front-to-back order", () => {
    const layout = computeLayout(yard);
    const front = layout.queueSlot(0);
    const behind = layout.queueSlot(1);
    expect(front.x).toBeLessThan(layout.throatX);
    expect(behind.x).toBeLessThan(front.x);
  });

  it("handles a yard with no switches or cars without throwing", () => {
    const empty: Yard = { id: "empty", seed: 0, cars: [], sidings: [], switches: [], parMoves: 0 };
    expect(() => computeLayout(empty)).not.toThrow();
    const layout = computeLayout(empty);
    expect(layout.switches).toEqual([]);
    expect(layout.sidings.size).toBe(0);
  });

  it("compresses lane spacing so a large switch count still fits inside the virtual canvas", () => {
    const bigYard: Yard = {
      id: "big",
      seed: 0,
      cars: [],
      sidings: Array.from({ length: 14 }, (_, i) => ({ id: `siding-${i + 1}`, capacity: 1 })),
      switches: Array.from({ length: 14 }, (_, i) => ({ id: `switch-${i + 1}`, sidingId: `siding-${i + 1}` })),
      parMoves: 0,
    };
    const layout = computeLayout(bigYard);
    for (const siding of layout.sidings.values()) {
      expect(siding.laneY).toBeLessThan(VIRTUAL_HEIGHT);
    }
  });

  it("keeps queue spacing above a legible minimum even with many cars", () => {
    const manyCars: Yard = {
      id: "many-cars",
      seed: 0,
      cars: Array.from({ length: 30 }, (_, i) => ({ id: `car-${i + 1}`, targetSidingId: "siding-1" })),
      sidings: [{ id: "siding-1", capacity: 30 }],
      switches: [{ id: "switch-1", sidingId: "siding-1" }],
      parMoves: 0,
    };
    const layout = computeLayout(manyCars);
    const slot0 = layout.queueSlot(0);
    const slot1 = layout.queueSlot(1);
    expect(slot0.x - slot1.x).toBeGreaterThanOrEqual(28);
  });
});
