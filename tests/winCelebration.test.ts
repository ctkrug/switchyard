import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WinCelebration } from "../src/render/winCelebration";

let celebration: WinCelebration | null = null;

afterEach(() => {
  celebration?.destroy();
  celebration = null;
});

describe("WinCelebration", () => {
  it("constructs against a canvas without throwing, even with no 2d context in jsdom", () => {
    const canvas = document.createElement("canvas");
    expect(() => {
      celebration = new WinCelebration(canvas);
    }).not.toThrow();
  });

  it("resizes the backing canvas to the given CSS box", () => {
    const canvas = document.createElement("canvas");
    celebration = new WinCelebration(canvas);
    celebration.resize(300, 150);
    expect(canvas.style.width).toBe("300px");
    expect(canvas.style.height).toBe("150px");
  });

  it("does not throw when bursting or clearing without a real 2d context", () => {
    const canvas = document.createElement("canvas");
    celebration = new WinCelebration(canvas);
    celebration.resize(200, 200);
    expect(() => celebration!.burst(100, 100, 1)).not.toThrow();
    expect(() => celebration!.clear()).not.toThrow();
  });

  it("is idempotent when cleared or destroyed repeatedly", () => {
    const canvas = document.createElement("canvas");
    celebration = new WinCelebration(canvas);
    celebration.burst(0, 0, 5);
    expect(() => {
      celebration!.clear();
      celebration!.clear();
      celebration!.destroy();
    }).not.toThrow();
  });
});

describe("WinCelebration with a stubbed 2d context", () => {
  let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;
  let rafCallbacks: FrameRequestCallback[] = [];
  let fillRectCalls = 0;

  const fakeCtx = {
    save: () => {},
    restore: () => {},
    translate: () => {},
    rotate: () => {},
    clearRect: () => {},
    setTransform: () => {},
    fillRect: () => {
      fillRectCalls++;
    },
    fillStyle: "",
    globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D;

  beforeEach(() => {
    fillRectCalls = 0;
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

  it("draws each particle onto the canvas via fillRect", () => {
    const canvas = document.createElement("canvas");
    celebration = new WinCelebration(canvas);
    celebration.resize(300, 300);
    vi.spyOn(performance, "now").mockReturnValue(0);

    celebration.burst(150, 150, 42);
    expect(rafCallbacks).toHaveLength(1);

    flushOneFrame(16);
    expect(fillRectCalls).toBeGreaterThan(0);
  });

  it("stops scheduling frames once every particle's lifetime has elapsed", () => {
    const canvas = document.createElement("canvas");
    celebration = new WinCelebration(canvas);
    celebration.resize(300, 300);
    let now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => now);

    celebration.burst(150, 150, 42);
    for (let i = 0; i < 30 && rafCallbacks.length > 0; i++) {
      now += 100;
      flushOneFrame(now);
    }

    expect(rafCallbacks).toHaveLength(0);
  });
});
