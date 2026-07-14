import { createRng } from "../game/prng";
import { confettiOpacity, createConfettiBurst, stepConfetti, type ConfettiParticle } from "./confetti";

function prefersReducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Owns the canvas behind the win overlay and animates a confetti burst on
 * it. Reduced-motion users still get the win state (stats, rating, CTA) —
 * `burst` just no-ops the particle animation for them, per D2.
 */
export class WinCelebration {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private particles: ConfettiParticle[] = [];
  private rafHandle: number | null = null;
  private lastFrameAt = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
  }

  /** Sizes the backing canvas to the overlay's current CSS box, DPR-aware. */
  resize(cssWidth: number, cssHeight: number): void {
    const dpr = typeof devicePixelRatio === "number" && devicePixelRatio > 0 ? devicePixelRatio : 1;
    this.canvas.width = Math.max(1, Math.round(cssWidth * dpr));
    this.canvas.height = Math.max(1, Math.round(cssHeight * dpr));
    this.canvas.style.width = `${cssWidth}px`;
    this.canvas.style.height = `${cssHeight}px`;
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /** Spawns a confetti burst at (originX, originY) in CSS pixels and animates it to completion. */
  burst(originX: number, originY: number, seed: number): void {
    this.clear();
    if (prefersReducedMotion()) return;
    this.particles = createConfettiBurst(originX, originY, createRng(seed));
    this.lastFrameAt = performance.now();
    this.ensureAnimating();
  }

  /** Stops any in-flight animation and blanks the canvas. */
  clear(): void {
    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }
    this.particles = [];
    this.ctx?.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private ensureAnimating(): void {
    if (this.rafHandle !== null) return;
    const step = () => {
      const now = performance.now();
      const dt = now - this.lastFrameAt;
      this.lastFrameAt = now;
      this.particles = stepConfetti(this.particles, dt);
      this.render();
      this.rafHandle = this.particles.length > 0 ? requestAnimationFrame(step) : null;
    };
    this.rafHandle = requestAnimationFrame(step);
  }

  private render(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const dpr = typeof devicePixelRatio === "number" && devicePixelRatio > 0 ? devicePixelRatio : 1;
    ctx.clearRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = confettiOpacity(p);
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    }
  }

  destroy(): void {
    this.clear();
  }
}
