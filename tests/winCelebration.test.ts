import { afterEach, describe, expect, it } from "vitest";
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
