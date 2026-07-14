const MUTE_STORAGE_KEY = "switchyard:muted";
const MIN_REPLAY_INTERVAL_MS = 40;

type ToneShape = "sine" | "square" | "sawtooth" | "triangle";

interface ToneSpec {
  freq: number;
  type: ToneShape;
  duration: number;
  gain: number;
  delay?: number;
}

interface NoiseSpec {
  duration: number;
  gain: number;
  delay?: number;
}

function readStoredMute(): boolean {
  try {
    return globalThis.localStorage?.getItem(MUTE_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function writeStoredMute(muted: boolean): void {
  try {
    globalThis.localStorage?.setItem(MUTE_STORAGE_KEY, String(muted));
  } catch {
    // localStorage unavailable (private browsing, disabled cookies) — mute
    // state just won't survive a reload, which is a fine degradation.
  }
}

function getAudioContextCtor(): typeof AudioContext | undefined {
  const w = globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext };
  return w.AudioContext ?? w.webkitAudioContext;
}

/**
 * Synthesized SFX for every player action, built with oscillators/noise —
 * zero bundled audio files. Every method is safe to call even when
 * WebAudio is unavailable (e.g. under test) or the player has muted: it
 * silently no-ops rather than throwing. The AudioContext itself is only
 * created on the first play call after a user gesture, per browser
 * autoplay policy.
 */
export class Sfx {
  private ctx: AudioContext | null = null;
  private muted: boolean;
  private lastPlayedAt = new Map<string, number>();

  constructor() {
    this.muted = readStoredMute();
  }

  isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    writeStoredMute(muted);
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  private getContext(): AudioContext | null {
    if (this.ctx) {
      return this.ctx;
    }
    const Ctor = getAudioContextCtor();
    if (!Ctor) {
      return null;
    }
    this.ctx = new Ctor();
    return this.ctx;
  }

  private throttled(key: string): boolean {
    const now = Date.now();
    const last = this.lastPlayedAt.get(key) ?? -Infinity;
    if (now - last < MIN_REPLAY_INTERVAL_MS) {
      return true;
    }
    this.lastPlayedAt.set(key, now);
    return false;
  }

  private tone(ctx: AudioContext, spec: ToneSpec): void {
    const start = ctx.currentTime + (spec.delay ?? 0);
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = spec.type;
    osc.frequency.setValueAtTime(spec.freq, start);
    gainNode.gain.setValueAtTime(0, start);
    gainNode.gain.linearRampToValueAtTime(spec.gain, start + 0.008);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, start + spec.duration);
    osc.connect(gainNode).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + spec.duration + 0.02);
  }

  private noise(ctx: AudioContext, spec: NoiseSpec): void {
    const start = ctx.currentTime + (spec.delay ?? 0);
    const frameCount = Math.max(1, Math.floor(ctx.sampleRate * spec.duration));
    const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / frameCount);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(spec.gain, start);
    source.connect(gainNode).connect(ctx.destination);
    source.start(start);
  }

  private play(key: string, effect: (ctx: AudioContext) => void): void {
    if (this.muted || this.throttled(key)) {
      return;
    }
    const ctx = this.getContext();
    if (!ctx) {
      return;
    }
    effect(ctx);
  }

  switchThrow(direction: "left" | "right"): void {
    this.play("switch-throw", (ctx) => {
      this.tone(ctx, { freq: direction === "right" ? 660 : 440, type: "square", duration: 0.06, gain: 0.08 });
    });
  }

  couple(): void {
    this.play("couple", (ctx) => {
      this.tone(ctx, { freq: 120, type: "sine", duration: 0.14, gain: 0.14 });
      this.noise(ctx, { duration: 0.06, gain: 0.05 });
    });
  }

  decouple(): void {
    this.play("decouple", (ctx) => {
      this.tone(ctx, { freq: 300, type: "square", duration: 0.03, gain: 0.06 });
      this.noise(ctx, { duration: 0.05, gain: 0.06, delay: 0.02 });
    });
  }

  sidingSuccess(): void {
    this.play("siding-success", (ctx) => {
      this.tone(ctx, { freq: 523.25, type: "sine", duration: 0.09, gain: 0.09 });
      this.tone(ctx, { freq: 659.25, type: "sine", duration: 0.09, gain: 0.09, delay: 0.08 });
      this.tone(ctx, { freq: 783.99, type: "sine", duration: 0.12, gain: 0.1, delay: 0.16 });
    });
  }

  winFanfare(): void {
    this.play("win-fanfare", (ctx) => {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        this.tone(ctx, { freq, type: "triangle", duration: 0.16, gain: 0.11, delay: i * 0.1 });
      });
    });
  }

  invalidMove(): void {
    this.play("invalid-move", (ctx) => {
      this.tone(ctx, { freq: 110, type: "sawtooth", duration: 0.12, gain: 0.07 });
    });
  }
}
