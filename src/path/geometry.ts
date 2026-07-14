// Geometry primitives shared across path + rendering. Kept dependency-free
// so the path modules are trivially unit-testable and framework-agnostic.

export type Vec2 = { x: number; y: number };

export const vec = (x: number, y: number): Vec2 => ({ x, y });
export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Vec2, s: number): Vec2 => ({ x: a.x * s, y: a.y * s });
export const len = (a: Vec2): number => Math.hypot(a.x, a.y);
export const dist = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);

/** Shortest signed difference between two angles, in (-PI, PI]. */
export function angleDelta(from: number, to: number): number {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * Frame-rate-independent angular damping toward a target.
 * `damping` is a rate (1/seconds); higher = snappier.
 */
export function dampAngle(current: number, target: number, damping: number, dt: number): number {
  const alpha = 1 - Math.exp(-damping * dt);
  return current + angleDelta(current, target) * alpha;
}

/** Frame-rate-independent scalar damping. */
export function damp(current: number, target: number, damping: number, dt: number): number {
  const alpha = 1 - Math.exp(-damping * dt);
  return current + (target - current) * alpha;
}

/** Frame-rate-independent 2D damping. */
export function dampVec(current: Vec2, target: Vec2, damping: number, dt: number): Vec2 {
  const alpha = 1 - Math.exp(-damping * dt);
  return {
    x: current.x + (target.x - current.x) * alpha,
    y: current.y + (target.y - current.y) * alpha,
  };
}

export const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Distance from point p to segment ab, plus the closest point. */
export function pointSegmentDistance(p: Vec2, a: Vec2, b: Vec2): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const apx = p.x - a.x;
  const apy = p.y - a.y;
  const denom = abx * abx + aby * aby;
  let t = denom > 0 ? (apx * abx + apy * aby) / denom : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const cx = a.x + abx * t;
  const cy = a.y + aby * t;
  return Math.hypot(p.x - cx, p.y - cy);
}
