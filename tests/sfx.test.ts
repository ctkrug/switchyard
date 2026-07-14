import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Sfx } from "../src/audio/sfx";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe("Sfx", () => {
  it("starts unmuted when localStorage has no stored preference", () => {
    expect(new Sfx().isMuted()).toBe(false);
  });

  it("restores muted state from a previous session", () => {
    localStorage.setItem("switchyard:muted", "true");
    expect(new Sfx().isMuted()).toBe(true);
  });

  it("persists mute state changes to localStorage", () => {
    const sfx = new Sfx();
    sfx.setMuted(true);
    expect(localStorage.getItem("switchyard:muted")).toBe("true");
    sfx.setMuted(false);
    expect(localStorage.getItem("switchyard:muted")).toBe("false");
  });

  it("toggleMute flips and returns the new state", () => {
    const sfx = new Sfx();
    expect(sfx.toggleMute()).toBe(true);
    expect(sfx.isMuted()).toBe(true);
    expect(sfx.toggleMute()).toBe(false);
  });

  it("never throws when WebAudio is unavailable (e.g. under test)", () => {
    const sfx = new Sfx();
    expect(() => sfx.switchThrow("left")).not.toThrow();
    expect(() => sfx.switchThrow("right")).not.toThrow();
    expect(() => sfx.couple()).not.toThrow();
    expect(() => sfx.decouple()).not.toThrow();
    expect(() => sfx.sidingSuccess()).not.toThrow();
    expect(() => sfx.winFanfare()).not.toThrow();
    expect(() => sfx.invalidMove()).not.toThrow();
  });

  it("does not throw when muted and a play method is called", () => {
    const sfx = new Sfx();
    sfx.setMuted(true);
    expect(() => sfx.couple()).not.toThrow();
  });
});
