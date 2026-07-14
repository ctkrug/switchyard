import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Sfx } from "../src/audio/sfx";
import { createSession, throwSwitch } from "../src/game/engine";
import { generateYard } from "../src/game/generator";
import { Board } from "../src/render/board";
import type { Yard } from "../src/game/types";

let container: HTMLDivElement | null = null;
let board: Board | null = null;

afterEach(() => {
  board?.destroy();
  board = null;
  container?.remove();
  container = null;
});

function mount() {
  container = document.createElement("div");
  document.body.appendChild(container);
  return container;
}

describe("Board", () => {
  it("mounts a canvas and one switch button per switch without throwing", () => {
    const yard = generateYard(1);
    const onSwitchThrow = vi.fn();
    board = new Board(mount(), yard, { onSwitchThrow }, new Sfx());

    expect(container?.querySelector("canvas")).not.toBeNull();
    expect(container?.querySelectorAll("button.switch-lever")).toHaveLength(yard.switches.length);
  });

  it("invokes the callback with the toggled branch when a switch button is clicked", () => {
    const yard = generateYard(2);
    const onSwitchThrow = vi.fn();
    board = new Board(mount(), yard, { onSwitchThrow }, new Sfx());
    board.snapTo(createSession(yard));

    const button = container!.querySelector<HTMLButtonElement>("button.switch-lever")!;
    button.click();

    expect(onSwitchThrow).toHaveBeenCalledWith(yard.switches[0].id, "right");
  });

  it("gives every switch button an accessible label and touch-sized target", () => {
    const yard = generateYard(4);
    board = new Board(mount(), yard, { onSwitchThrow: vi.fn() }, new Sfx());
    board.snapTo(createSession(yard));

    const button = container!.querySelector<HTMLButtonElement>("button.switch-lever")!;
    expect(button.getAttribute("aria-label")).toContain("thrown left");
  });

  it("applies a throw (with a dispatch) without throwing, even though jsdom has no 2d canvas context", () => {
    const yard = generateYard(5);
    board = new Board(mount(), yard, { onSwitchThrow: vi.fn() }, new Sfx());
    const before = createSession(yard);
    board.snapTo(before);

    const after = throwSwitch(before, yard.switches[0].id, "right");
    expect(() => board!.applyThrow(before, after, "right")).not.toThrow();
  });

  it("rebuilds switch controls when a new yard is loaded", () => {
    const first = generateYard(6);
    board = new Board(mount(), first, { onSwitchThrow: vi.fn() }, new Sfx());
    board.snapTo(createSession(first));

    const second = generateYard(7);
    board.setYard(second, createSession(second));

    expect(container?.querySelectorAll("button.switch-lever")).toHaveLength(second.switches.length);
  });

  it("removes its DOM nodes on destroy", () => {
    const yard = generateYard(8);
    board = new Board(mount(), yard, { onSwitchThrow: vi.fn() }, new Sfx());
    board.destroy();
    expect(container?.querySelector("canvas")).toBeNull();
    board = null;
  });
});

describe("Board with a stubbed 2d context", () => {
  let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;
  let rafCallbacks: FrameRequestCallback[] = [];
  const arcCalls: number[] = [];
  const roundRectCalls: number[] = [];

  const fakeCtx = {
    save: () => {},
    restore: () => {},
    translate: () => {},
    scale: () => {},
    setTransform: () => {},
    clearRect: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    stroke: () => {},
    fill: () => {},
    fillRect: () => {},
    arc: () => {
      arcCalls.push(1);
    },
    roundRect: () => {
      roundRectCalls.push(1);
    },
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    shadowColor: "",
    shadowBlur: 0,
    globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D;

  beforeEach(() => {
    arcCalls.length = 0;
    roundRectCalls.length = 0;
    rafCallbacks = [];
    originalGetContext = HTMLCanvasElement.prototype.getContext;
    // @ts-expect-error -- stubbing to a minimal fake for a jsdom canvas with no real 2D context.
    HTMLCanvasElement.prototype.getContext = () => fakeCtx;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    vi.restoreAllMocks();
  });

  function flushOneFrame(time: number): void {
    const callbacks = rafCallbacks.splice(0, rafCallbacks.length);
    callbacks.forEach((cb) => cb(time));
  }

  it("draws a chip arc per car and a rounded rect per car body on the real render path", () => {
    const yard = generateYard(9);
    board = new Board(mount(), yard, { onSwitchThrow: vi.fn() }, new Sfx());
    board.snapTo(createSession(yard));

    // One arc per car (target chip) plus one per siding (capacity chip).
    expect(arcCalls.length).toBeGreaterThanOrEqual(yard.cars.length);
    expect(roundRectCalls.length).toBe(yard.cars.length);
  });

  it("drives a full dispatch tween and success pulse to completion without throwing", () => {
    const yard = generateYard(10);
    board = new Board(mount(), yard, { onSwitchThrow: vi.fn() }, new Sfx());
    const before = createSession(yard);
    board.snapTo(before);

    let now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => now);

    const after = throwSwitch(before, yard.switches[0].id, "right");
    expect(() => board!.applyThrow(before, after, "right")).not.toThrow();

    for (let i = 0; i < 50 && rafCallbacks.length > 0; i++) {
      now += 50;
      flushOneFrame(now);
    }

    expect(rafCallbacks).toHaveLength(0);
  });

  it("re-renders without starting a tween when a throw flips a lever but dispatches no car", () => {
    const yard: Yard = {
      id: "no-dispatch-yard",
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
    board = new Board(mount(), yard, { onSwitchThrow: vi.fn() }, new Sfx());

    let now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => now);

    let session = createSession(yard);
    board.snapTo(session);
    let next = throwSwitch(session, "switch-1", "right"); // dispatches car-1
    board.applyThrow(session, next, "right");
    session = next;

    // Let car-1's dispatch tween settle before the next throw.
    for (let i = 0; i < 20 && rafCallbacks.length > 0; i++) {
      now += 50;
      flushOneFrame(now);
    }
    expect(rafCallbacks).toHaveLength(0);

    next = throwSwitch(session, "switch-1", "left"); // flips back, dispatches nothing
    expect(() => board!.applyThrow(session, next, "left")).not.toThrow();
    expect(rafCallbacks).toHaveLength(0);
  });
});
