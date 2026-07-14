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

  it("inerts the top bar and the below-fold section too, then restores them", async () => {
    // The marketing/FAQ section lives outside #app in the real page; stand it
    // up here so the win trap's handling of it is exercised.
    const extras = document.createElement("section");
    extras.className = "page-extras";
    document.body.appendChild(extras);

    await playToWin();

    const topbar = document.querySelector<HTMLElement>(".topbar")!;
    expect(topbar.inert).toBe(true);
    expect(extras.inert).toBe(true);

    document.querySelector<HTMLButtonElement>("#win-next-btn")!.click();
    expect(topbar.inert).toBe(false);
    expect(extras.inert).toBe(false);
  });

  it("restores background interactivity once the win overlay closes", async () => {
    await playToWin();

    document.querySelector<HTMLButtonElement>("#win-next-btn")!.click();

    const layout = document.querySelector<HTMLElement>(".layout")!;
    expect(layout.inert).toBe(false);
  });

  it("downloads a share card from the win overlay without throwing", async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,fake");

    await playToWin();

    const shareBtn = document.querySelector<HTMLButtonElement>("#win-share-btn")!;
    expect(() => shareBtn.click()).not.toThrow();
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });
});

describe("main: HUD controls", () => {
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

  it("undo reverts the last switch throw and decrements the move counter", async () => {
    await import("../src/main");
    const button = document.querySelector<HTMLButtonElement>(`button[aria-label^="Switch 1,"]`)!;
    button.click();

    const moveCountEl = document.querySelector<HTMLElement>("#move-count")!;
    expect(moveCountEl.textContent).toBe("1");

    document.querySelector<HTMLButtonElement>("#undo-btn")!.click();
    expect(moveCountEl.textContent).toBe("0");
  });

  it("reset restores the yard to its initial state", async () => {
    await import("../src/main");
    const button = document.querySelector<HTMLButtonElement>(`button[aria-label^="Switch 1,"]`)!;
    button.click();
    button.click();

    document.querySelector<HTMLButtonElement>("#reset-btn")!.click();
    const moveCountEl = document.querySelector<HTMLElement>("#move-count")!;
    expect(moveCountEl.textContent).toBe("0");
  });

  it("mute toggles the button label and persists across reload", async () => {
    await import("../src/main");
    const muteBtn = document.querySelector<HTMLButtonElement>("#mute-btn")!;
    const muteLabel = document.querySelector<HTMLElement>("#mute-label")!;
    expect(muteLabel.textContent).toBe("Sound on");

    muteBtn.click();
    expect(muteLabel.textContent).toBe("Sound off");
    expect(muteBtn.getAttribute("aria-pressed")).toBe("true");

    vi.resetModules();
    document.body.innerHTML = '<div id="app"></div>';
    await import("../src/main");
    expect(document.querySelector<HTMLElement>("#mute-label")!.textContent).toBe("Sound off");
  });
});
