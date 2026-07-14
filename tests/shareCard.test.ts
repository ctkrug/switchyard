import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  drawShareCard,
  shareCardLines,
  SHARE_CARD_HEIGHT,
  SHARE_CARD_WIDTH,
  type ShareCardData,
} from "../src/render/shareCard";

const SAMPLE: ShareCardData = { moves: 12, par: 10, rating: "Solid run, just over par.", totalSolved: 3 };

describe("shareCardLines", () => {
  it("includes moves, par, rating, and total solved", () => {
    const lines = shareCardLines(SAMPLE);
    expect(lines).toEqual([
      "Solved in 12 moves",
      "Par 10",
      "Solid run, just over par.",
      "Yards solved this session: 3",
    ]);
  });

  it("renders a par-perfect, first-ever solve correctly", () => {
    const lines = shareCardLines({ moves: 5, par: 5, rating: "At par — a perfect dispatch.", totalSolved: 1 });
    expect(lines[0]).toBe("Solved in 5 moves");
    expect(lines[1]).toBe("Par 5");
    expect(lines[3]).toBe("Yards solved this session: 1");
  });
});

describe("drawShareCard", () => {
  it("sizes the canvas to the fixed share-card dimensions without throwing", () => {
    const canvas = document.createElement("canvas");
    expect(() => drawShareCard(canvas, SAMPLE)).not.toThrow();
    expect(canvas.width).toBe(SHARE_CARD_WIDTH);
    expect(canvas.height).toBe(SHARE_CARD_HEIGHT);
  });

  it("does not throw even when jsdom returns a null 2d context", () => {
    const canvas = document.createElement("canvas");
    expect(canvas.getContext("2d")).toBeNull();
    expect(() => drawShareCard(canvas, SAMPLE)).not.toThrow();
  });
});

describe("drawShareCard with a stubbed 2d context", () => {
  let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;
  const fillTextCalls: string[] = [];
  const fillRectCalls: number[][] = [];

  const fakeGradient = { addColorStop: () => {} };
  const fakeCtx = {
    createLinearGradient: () => fakeGradient,
    fillRect: (x: number, y: number, w: number, h: number) => {
      fillRectCalls.push([x, y, w, h]);
    },
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    fillText: (text: string) => {
      fillTextCalls.push(text);
    },
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    font: "",
  } as unknown as CanvasRenderingContext2D;

  beforeEach(() => {
    fillTextCalls.length = 0;
    fillRectCalls.length = 0;
    originalGetContext = HTMLCanvasElement.prototype.getContext;
    // @ts-expect-error -- stubbing to a minimal fake for a jsdom canvas with no real 2D context.
    HTMLCanvasElement.prototype.getContext = () => fakeCtx;
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  });

  it("draws the background and every share-card line as text", () => {
    const canvas = document.createElement("canvas");
    drawShareCard(canvas, SAMPLE);

    expect(fillRectCalls[0]).toEqual([0, 0, SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT]);
    expect(fillTextCalls).toEqual(
      expect.arrayContaining([
        "SWITCHYARD",
        "Dispatch complete",
        "Solved in 12 moves",
        "Par 10",
        "Solid run, just over par.",
        "Yards solved this session: 3",
      ]),
    );
  });

  it("renders a huge move count and an empty rating without throwing or truncating", () => {
    const canvas = document.createElement("canvas");
    const data: ShareCardData = { moves: 999_999, par: 1, rating: "", totalSolved: 0 };
    expect(() => drawShareCard(canvas, data)).not.toThrow();
    expect(fillTextCalls).toContain("Solved in 999999 moves");
    expect(fillTextCalls).toContain("Yards solved this session: 0");
  });
});
