import type { Sfx } from "../audio/sfx";
import type { Session } from "../game/engine";
import type { Branch, Yard } from "../game/types";
import { computeLayout, VIRTUAL_HEIGHT, VIRTUAL_WIDTH, type BoardLayout, type WorldPoint } from "./layout";
import { easeOutCubic, pointAlongPath } from "./tween";

const SEGMENT_DURATION_MS = 130;
const PULSE_DURATION_MS = 420;
const SHAKE_DURATION_MS = 150;
const SHAKE_MAGNITUDE = 3;

const CHIP_PALETTE = ["#ffb020", "#38bdf8", "#3ddc84", "#ff8fa3", "#c084fc", "#5eead4"];

interface Tween {
  carId: string;
  path: WorldPoint[];
  startedAt: number;
  duration: number;
  onComplete?: () => void;
}

interface Pulse {
  sidingId: string;
  correct: boolean;
  startedAt: number;
}

export interface BoardCallbacks {
  onSwitchThrow(switchId: string, branch: Branch): void;
}

function prefersReducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function chipColor(index: number): string {
  return CHIP_PALETTE[index % CHIP_PALETTE.length];
}

/**
 * Canvas + DOM-overlay renderer for the yard board. The canvas draws
 * scenery and cars; real `<button>` elements sit on top of each switch so
 * hover/focus/active states, keyboard activation, and ARIA labels come
 * from native controls instead of hand-rolled canvas hit-testing.
 */
export class Board {
  private readonly container: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly overlay: HTMLDivElement;
  private readonly callbacks: BoardCallbacks;
  private readonly sfx: Sfx;
  private readonly switchButtons = new Map<string, HTMLButtonElement>();
  private readonly resizeObserver: ResizeObserver | null;

  private yard: Yard;
  private layout: BoardLayout;
  private session: Session | null = null;
  private carVisual = new Map<string, WorldPoint>();
  private tweens: Tween[] = [];
  private pulses: Pulse[] = [];
  private shakeUntil = 0;
  private rafHandle: number | null = null;
  private sidingIndexById = new Map<string, number>();
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;

  constructor(container: HTMLElement, yard: Yard, callbacks: BoardCallbacks, sfx: Sfx) {
    this.container = container;
    this.callbacks = callbacks;
    this.sfx = sfx;
    this.yard = yard;
    this.layout = computeLayout(yard);

    this.canvas = document.createElement("canvas");
    this.canvas.className = "board-canvas";
    this.canvas.setAttribute("role", "img");
    this.canvas.setAttribute("aria-label", "The rail yard board");

    this.overlay = document.createElement("div");
    this.overlay.className = "board-overlay";

    container.classList.add("board-container");
    container.append(this.canvas, this.overlay);

    this.ctx = this.canvas.getContext("2d");

    this.rebuildSwitchIndex();
    this.buildSwitchButtons();

    this.resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => this.resize()) : null;
    this.resizeObserver?.observe(container);
    this.resize();
  }

  private rebuildSwitchIndex(): void {
    this.sidingIndexById = new Map(this.yard.switches.map((sw, i) => [sw.sidingId, i]));
  }

  private buildSwitchButtons(): void {
    this.overlay.innerHTML = "";
    this.switchButtons.clear();
    for (const sw of this.yard.switches) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "switch-lever";
      button.addEventListener("click", () => {
        const branch: Branch = (this.session?.present.switchState[sw.id] ?? "left") === "right" ? "left" : "right";
        this.callbacks.onSwitchThrow(sw.id, branch);
      });
      this.overlay.appendChild(button);
      this.switchButtons.set(sw.id, button);
    }
  }

  /** Loads a new yard: rebuilds layout and switch controls, snaps cars to their start positions. */
  setYard(yard: Yard, session: Session): void {
    this.yard = yard;
    this.layout = computeLayout(yard);
    this.rebuildSwitchIndex();
    this.buildSwitchButtons();
    this.tweens = [];
    this.pulses = [];
    this.snapTo(session);
    this.resize();
  }

  /** Instantly recomputes car positions from a session with no animation (undo/reset). */
  snapTo(session: Session): void {
    this.session = session;
    this.carVisual = this.computeTargetPositions(session);
    this.tweens = [];
    this.updateSwitchButtonState();
    this.render();
  }

  /**
   * Applies the result of a switch throw: updates lever visuals, and if a
   * car dispatched, tweens it (and the queue behind it) into place with
   * impact/goal feedback and SFX once the motion lands.
   */
  applyThrow(prevSession: Session, nextSession: Session, branch: Branch): void {
    this.session = nextSession;
    this.sfx.switchThrow(branch);
    this.updateSwitchButtonState();

    const targets = this.computeTargetPositions(nextSession);
    const newDispatch =
      nextSession.present.dispatches.length > prevSession.present.dispatches.length
        ? nextSession.present.dispatches[nextSession.present.dispatches.length - 1]
        : null;

    if (!newDispatch) {
      this.carVisual = targets;
      this.render();
      return;
    }

    const car = newDispatch.car;
    const from = this.carVisual.get(car.id) ?? this.layout.queueSlot(0);
    const siding = this.layout.sidings.get(newDispatch.sidingId);
    const to = targets.get(car.id) ?? from;
    const path = siding ? [from, siding.bendStart, siding.mouth, to] : [from, to];

    this.startTween(car.id, path, () => {
      this.pulses.push({ sidingId: newDispatch.sidingId, correct: newDispatch.correct, startedAt: performance.now() });
      if (!prefersReducedMotion()) {
        this.shakeUntil = performance.now() + SHAKE_DURATION_MS;
      }
      if (newDispatch.correct) {
        this.sfx.couple();
        this.sfx.sidingSuccess();
      } else {
        this.sfx.decouple();
        this.sfx.invalidMove();
      }
    });

    for (const [carId, target] of targets) {
      if (carId === car.id) continue;
      const current = this.carVisual.get(carId);
      if (current && (current.x !== target.x || current.y !== target.y)) {
        this.startTween(carId, [current, target]);
      } else if (!current) {
        this.carVisual.set(carId, target);
      }
    }

    this.ensureAnimating();
  }

  private computeTargetPositions(session: Session): Map<string, WorldPoint> {
    const positions = new Map<string, WorldPoint>();
    const perSidingCount = new Map<string, number>();

    for (const dispatch of session.present.dispatches) {
      const count = perSidingCount.get(dispatch.sidingId) ?? 0;
      const siding = this.layout.sidings.get(dispatch.sidingId);
      positions.set(dispatch.car.id, siding ? siding.slot(count) : { x: 0, y: 0 });
      perSidingCount.set(dispatch.sidingId, count + 1);
    }

    for (let i = session.present.queueIndex; i < session.yard.cars.length; i++) {
      positions.set(session.yard.cars[i].id, this.layout.queueSlot(i - session.present.queueIndex));
    }

    return positions;
  }

  private startTween(carId: string, path: WorldPoint[], onComplete?: () => void): void {
    const duration = prefersReducedMotion() ? 1 : SEGMENT_DURATION_MS * Math.max(1, path.length - 1);
    this.tweens = this.tweens.filter((t) => t.carId !== carId);
    this.tweens.push({ carId, path, startedAt: performance.now(), duration, onComplete });
    this.ensureAnimating();
  }

  private updateSwitchButtonState(): void {
    for (const sw of this.yard.switches) {
      const button = this.switchButtons.get(sw.id);
      if (!button) continue;
      const branch = this.session?.present.switchState[sw.id] ?? "left";
      const thrown = branch === "right";
      button.setAttribute("aria-pressed", String(thrown));
      button.setAttribute("aria-label", `Switch ${sw.id.replace("switch-", "")}, thrown ${branch}`);
      button.classList.toggle("switch-lever--thrown", thrown);
    }
  }

  private ensureAnimating(): void {
    if (this.rafHandle !== null) return;
    const step = () => {
      const now = performance.now();
      let stillAnimating = false;

      for (const tween of this.tweens) {
        const t = (now - tween.startedAt) / tween.duration;
        if (t >= 1) {
          const finalPoint = tween.path[tween.path.length - 1];
          this.carVisual.set(tween.carId, finalPoint);
          tween.onComplete?.();
        } else {
          stillAnimating = true;
          this.carVisual.set(tween.carId, pointAlongPath(tween.path, easeOutCubic(t)));
        }
      }
      this.tweens = this.tweens.filter((tween) => now - tween.startedAt < tween.duration);

      this.pulses = this.pulses.filter((p) => now - p.startedAt < PULSE_DURATION_MS);
      if (this.pulses.length > 0 || now < this.shakeUntil) {
        stillAnimating = true;
      }

      this.render();

      if (stillAnimating) {
        this.rafHandle = requestAnimationFrame(step);
      } else {
        this.rafHandle = null;
      }
    };
    this.rafHandle = requestAnimationFrame(step);
  }

  resize(): void {
    const dpr = typeof devicePixelRatio === "number" && devicePixelRatio > 0 ? devicePixelRatio : 1;
    const cssWidth = this.container.clientWidth || VIRTUAL_WIDTH;
    const cssHeight = this.container.clientHeight || VIRTUAL_HEIGHT;

    this.canvas.width = Math.max(1, Math.round(cssWidth * dpr));
    this.canvas.height = Math.max(1, Math.round(cssHeight * dpr));
    this.canvas.style.width = `${cssWidth}px`;
    this.canvas.style.height = `${cssHeight}px`;

    this.scale = Math.min(cssWidth / VIRTUAL_WIDTH, cssHeight / VIRTUAL_HEIGHT);
    this.offsetX = (cssWidth - VIRTUAL_WIDTH * this.scale) / 2;
    this.offsetY = (cssHeight - VIRTUAL_HEIGHT * this.scale) / 2;

    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.positionOverlayButtons();
    this.render();
  }

  private worldToScreen(point: WorldPoint): WorldPoint {
    return { x: this.offsetX + point.x * this.scale, y: this.offsetY + point.y * this.scale };
  }

  private positionOverlayButtons(): void {
    for (const sw of this.yard.switches) {
      const button = this.switchButtons.get(sw.id);
      const layoutSwitch = this.layout.switches.find((s) => s.id === sw.id);
      if (!button || !layoutSwitch) continue;
      const screen = this.worldToScreen(layoutSwitch.position);
      const size = Math.max(44, 26 * this.scale);
      button.style.left = `${screen.x - size / 2}px`;
      button.style.top = `${screen.y - size / 2}px`;
      button.style.width = `${size}px`;
      button.style.height = `${size}px`;
    }
  }

  private render(): void {
    const ctx = this.ctx;
    if (!ctx) return;

    const now = performance.now();
    const shaking = now < this.shakeUntil && !prefersReducedMotion();
    const shakeX = shaking ? (Math.random() * 2 - 1) * SHAKE_MAGNITUDE : 0;
    const shakeY = shaking ? (Math.random() * 2 - 1) * SHAKE_MAGNITUDE : 0;

    const cssWidth = this.canvas.width / (this.ctx ? devicePixelRatio || 1 : 1);
    const cssHeight = this.canvas.height / (this.ctx ? devicePixelRatio || 1 : 1);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    ctx.save();
    ctx.translate(this.offsetX + shakeX, this.offsetY + shakeY);
    ctx.scale(this.scale, this.scale);

    this.drawTrack(ctx);
    this.drawSidings(ctx, now);
    this.drawSwitchLevers(ctx);
    this.drawCars(ctx);

    ctx.restore();
  }

  private drawTrack(ctx: CanvasRenderingContext2D): void {
    const { leadY, throatX, endX } = this.layout;
    ctx.strokeStyle = "#2b3c5c";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(throatX - 160, leadY);
    ctx.lineTo(endX + 16, leadY);
    ctx.stroke();

    ctx.fillStyle = "#7f8fae";
    ctx.fillRect(endX + 10, leadY - 14, 6, 28);
  }

  private drawSidings(ctx: CanvasRenderingContext2D, now: number): void {
    for (const sw of this.yard.switches) {
      const siding = this.layout.sidings.get(sw.sidingId);
      const index = this.sidingIndexById.get(sw.sidingId) ?? 0;
      if (!siding) continue;

      const thrown = (this.session?.present.switchState[sw.id] ?? "left") === "right";
      ctx.strokeStyle = thrown ? "#ffb020" : "#2b3c5c";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(siding.bendStart.x, siding.bendStart.y);
      ctx.lineTo(siding.mouth.x, siding.mouth.y);
      ctx.lineTo(siding.stubEndX, siding.laneY);
      ctx.stroke();

      ctx.fillStyle = chipColor(index);
      ctx.beginPath();
      ctx.arc(siding.bendStart.x + 12, siding.laneY, 6, 0, Math.PI * 2);
      ctx.fill();

      const pulse = this.pulses.find((p) => p.sidingId === sw.sidingId);
      if (pulse) {
        const t = (now - pulse.startedAt) / PULSE_DURATION_MS;
        const radius = 6 + t * 22;
        ctx.globalAlpha = Math.max(0, 1 - t);
        ctx.strokeStyle = pulse.correct ? "#3ddc84" : "#ff5a5f";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(siding.bendStart.x + 12, siding.laneY, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }

  private drawSwitchLevers(ctx: CanvasRenderingContext2D): void {
    for (const sw of this.yard.switches) {
      const layoutSwitch = this.layout.switches.find((s) => s.id === sw.id);
      if (!layoutSwitch) continue;
      const thrown = (this.session?.present.switchState[sw.id] ?? "left") === "right";
      const { x, y } = layoutSwitch.position;
      const size = 9;

      if (thrown) {
        ctx.save();
        ctx.shadowColor = "rgba(255, 176, 32, 0.85)";
        ctx.shadowBlur = 10;
      }

      ctx.fillStyle = thrown ? "#ffb020" : "#111c30";
      ctx.strokeStyle = thrown ? "#ffb020" : "#7f8fae";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y - size);
      ctx.lineTo(x + size, y);
      ctx.lineTo(x, y + size);
      ctx.lineTo(x - size, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      if (thrown) {
        ctx.restore();
      }
    }
  }

  private drawCars(ctx: CanvasRenderingContext2D): void {
    const { carWidth, carHeight } = this.layout;
    for (const car of this.yard.cars) {
      const pos = this.carVisual.get(car.id);
      if (!pos) continue;

      const targetIndex = this.sidingIndexById.get(car.targetSidingId) ?? 0;

      ctx.fillStyle = "#1a2740";
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1.5;
      const x = pos.x - carWidth / 2;
      const y = pos.y - carHeight / 2;
      const radius = 5;
      ctx.beginPath();
      ctx.roundRect(x, y, carWidth, carHeight, radius);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = chipColor(targetIndex);
      ctx.beginPath();
      ctx.arc(x + carWidth - 9, y + carHeight / 2, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  destroy(): void {
    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle);
    }
    this.resizeObserver?.disconnect();
    this.container.classList.remove("board-container");
    this.canvas.remove();
    this.overlay.remove();
  }
}
