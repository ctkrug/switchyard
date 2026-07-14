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

  describe("with a stubbed AudioContext", () => {
    let oscillatorCount = 0;
    let originalAudioContext: unknown;

    class FakeOscillator {
      type = "sine";
      frequency = { setValueAtTime: () => {} };
      connect() {
        return this;
      }
      start() {}
      stop() {}
    }

    class FakeGain {
      gain = { setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} };
      connect() {
        return this;
      }
    }

    class FakeAudioContext {
      currentTime = 0;
      sampleRate = 44100;
      destination = {};
      createOscillator() {
        oscillatorCount++;
        return new FakeOscillator();
      }
      createGain() {
        return new FakeGain();
      }
      createBuffer() {
        return { getChannelData: () => new Float32Array(1) };
      }
      createBufferSource() {
        const node = { connect: () => node, start: () => {} };
        return node;
      }
    }

    beforeEach(() => {
      oscillatorCount = 0;
      originalAudioContext = (globalThis as { AudioContext?: unknown }).AudioContext;
      (globalThis as { AudioContext?: unknown }).AudioContext = FakeAudioContext;
    });

    afterEach(() => {
      (globalThis as { AudioContext?: unknown }).AudioContext = originalAudioContext;
    });

    it("suppresses a rapid repeat of the same effect within the throttle window", () => {
      const sfx = new Sfx();
      sfx.switchThrow("left");
      sfx.switchThrow("right"); // same "switch-throw" key, immediately after
      expect(oscillatorCount).toBe(1);
    });

    it("does not throttle two different effect keys played back to back", () => {
      const sfx = new Sfx();
      sfx.switchThrow("left");
      sfx.couple();
      expect(oscillatorCount).toBe(2);
    });

    it("plays every remaining SFX method against a real context without throwing", () => {
      const sfx = new Sfx();
      expect(() => sfx.decouple()).not.toThrow();
      expect(() => sfx.sidingSuccess()).not.toThrow();
      expect(() => sfx.winFanfare()).not.toThrow();
      expect(() => sfx.invalidMove()).not.toThrow();
      // decouple(1 tone) + sidingSuccess(3 tones) + winFanfare(4 notes) + invalidMove(1 tone).
      expect(oscillatorCount).toBe(9);
    });
  });
});
