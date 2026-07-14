import { randInt, type Rng } from "../game/prng";

export interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  size: number;
  ageMs: number;
  lifeMs: number;
}

const GRAVITY_PX_PER_MS2 = 0.0011;
const PALETTE = ["#ffb020", "#38bdf8", "#3ddc84", "#ff8fa3", "#c084fc", "#5eead4"];

/** Pure: spawns a burst of confetti particles fanning outward/upward from a point. */
export function createConfettiBurst(originX: number, originY: number, rng: Rng, count = 28): ConfettiParticle[] {
  const particles: ConfettiParticle[] = [];
  for (let i = 0; i < count; i++) {
    const angleDeg = randInt(rng, 200, 340); // upward-biased fan (0deg = +x, 270deg = straight up)
    const angle = (angleDeg * Math.PI) / 180;
    const speed = randInt(rng, 90, 220) / 1000; // px/ms
    particles.push({
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rotation: randInt(rng, 0, 359),
      rotationSpeed: (randInt(rng, -180, 180) / 1000),
      color: PALETTE[randInt(rng, 0, PALETTE.length - 1)],
      size: randInt(rng, 4, 8),
      ageMs: 0,
      lifeMs: randInt(rng, 650, 1100),
    });
  }
  return particles;
}

/** Pure: advances every particle by dtMs (gravity + rotation), pruning any that expired. */
export function stepConfetti(particles: ConfettiParticle[], dtMs: number): ConfettiParticle[] {
  const next: ConfettiParticle[] = [];
  for (const p of particles) {
    const ageMs = p.ageMs + dtMs;
    if (ageMs >= p.lifeMs) continue;
    next.push({
      ...p,
      x: p.x + p.vx * dtMs,
      y: p.y + p.vy * dtMs,
      vy: p.vy + GRAVITY_PX_PER_MS2 * dtMs,
      rotation: p.rotation + p.rotationSpeed * dtMs,
      ageMs,
    });
  }
  return next;
}

/** 1 → just spawned, 0 → about to expire. Used to fade particles out near end of life. */
export function confettiOpacity(particle: ConfettiParticle): number {
  return Math.max(0, 1 - particle.ageMs / particle.lifeMs);
}
