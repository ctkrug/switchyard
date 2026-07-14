import { describe, expect, it } from "vitest";
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
