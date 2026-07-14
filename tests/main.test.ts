import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateYard } from "../src/game/generator";
import { solve } from "../src/game/solver";

/**
 * main.ts wires the DOM directly (no exported functions), so these tests
 * drive the real page through a full win by clicking the rendered switch
 * buttons in the solver's own move order — the same buttons and the same
 * mechanism a player uses.
 */
describe("main: win overlay focus containment", () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = '<div id="app"></div>';
    vi.spyOn(performance, "now").mockReturnValue(0);
    vi.spyOn(Math, "random").mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  async function playToWin(): Promise<void> {
    await import("../src/main");

    // nextSeed() = floor(performance.now() * 1000 + Math.random() * 1e6),
    // both stubbed to 0 above, so main.ts generates generateYard(0, 0).
    const yard = generateYard(0, 0);
    const plan = solve(yard);
    expect(plan).not.toBeNull();

    for (const move of plan!) {
      const num = move.switchId.replace("switch-", "");
      const button = document.querySelector<HTMLButtonElement>(`button[aria-label^="Switch ${num},"]`);
      expect(button).not.toBeNull();
      button!.click();
    }
  }

  it("makes the board/HUD inert while the win overlay is open", async () => {
    await playToWin();

    const winOverlay = document.querySelector<HTMLElement>("#win-overlay")!;
    expect(winOverlay.hidden).toBe(false);

    const layout = document.querySelector<HTMLElement>(".layout")!;
    expect(layout.inert).toBe(true);
  });

  it("restores background interactivity once the win overlay closes", async () => {
    await playToWin();

    document.querySelector<HTMLButtonElement>("#win-next-btn")!.click();

    const layout = document.querySelector<HTMLElement>(".layout")!;
    expect(layout.inert).toBe(false);
  });
});
