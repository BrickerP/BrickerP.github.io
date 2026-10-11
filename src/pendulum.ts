/**
 * Fig. 1 — double pendulum for the homepage hero.
 *
 * Equal masses, ℓ₂/ℓ₁ = 0.86, released from rest. The state is integrated
 * with classical RK4 on the Lagrangian equations (θ = 0 hangs down). The
 * outer bob leaves a short fading trail. No-JS shows the release pose.
 * Reduced motion parks both arms near the vertical and drops the trail.
 * Homepage only; no Three.js.
 */

const G = 9.81;
const M1 = 1;
const M2 = 1;
/** Physics length of the inner rod. The outer rod is ℓ₂/ℓ₁ from the figure. */
const L1 = 1;
const STEP = 1 / 240;
const TIME_SCALE = 0.42;
const MAX_FRAME_S = 0.05;
const TRAIL_MS = 1800;
const FADE_AT = 0.45;

type State = [number, number, number, number];
type Sample = { x: number; y: number; t: number };

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function readNum(data: DOMStringMap, key: string): number | null {
  const value = Number(data[key]);
  return Number.isFinite(value) ? value : null;
}

/** θ1'', θ2'' for a planar double pendulum. Angles are from the downward vertical. */
function deriv(s: State, l2: number): State {
  const [th1, w1, th2, w2] = s;
  const delta = th1 - th2;
  const den = 2 * M1 + M2 - M2 * Math.cos(2 * th1 - 2 * th2);
  const a1 =
    (-G * (2 * M1 + M2) * Math.sin(th1) -
      M2 * G * Math.sin(th1 - 2 * th2) -
      2 * Math.sin(delta) * M2 * (w2 * w2 * l2 + w1 * w1 * L1 * Math.cos(delta))) /
    (L1 * den);
  const a2 =
    (2 *
      Math.sin(delta) *
      (w1 * w1 * L1 * (M1 + M2) + G * (M1 + M2) * Math.cos(th1) + w2 * w2 * l2 * M2 * Math.cos(delta))) /
    (l2 * den);
  return [w1, a1, w2, a2];
}

function axpy(s: State, k: State, h: number): State {
  return [s[0] + k[0] * h, s[1] + k[1] * h, s[2] + k[2] * h, s[3] + k[3] * h];
}

function rk4(s: State, dt: number, l2: number): State {
  const k1 = deriv(s, l2);
  const k2 = deriv(axpy(s, k1, dt / 2), l2);
  const k3 = deriv(axpy(s, k2, dt / 2), l2);
  const k4 = deriv(axpy(s, k3, dt), l2);
  const h = dt / 6;
  return [
    s[0] + (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]) * h,
    s[1] + (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]) * h,
    s[2] + (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]) * h,
    s[3] + (k1[3] + 2 * k2[3] + 2 * k3[3] + k4[3]) * h,
  ];
}

function advance(s: State, wallSeconds: number, l2: number): State {
  let remain = Math.min(MAX_FRAME_S, Math.max(0, wallSeconds)) * TIME_SCALE;
  let next = s;
  while (remain > 1e-6) {
    const h = Math.min(STEP, remain);
    next = rk4(next, h, l2);
    remain -= h;
  }
  return next.every(Number.isFinite) ? next : s;
}

function pathOf(points: readonly Sample[]): string {
  if (points.length < 2) return '';
  let d = `M${points[0]!.x.toFixed(1)} ${points[0]!.y.toFixed(1)}`;
  for (let i = 1; i < points.length; i += 1) {
    const point = points[i]!;
    d += `L${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
  }
  return d;
}

function boot(): void {
  const root = document.querySelector<SVGSVGElement>('svg.pendulum');
  if (!root) return;

  const rodA = root.querySelector<SVGLineElement>('#pendulum-rod-a');
  const rodB = root.querySelector<SVGLineElement>('#pendulum-rod-b');
  const inner = root.querySelector<SVGCircleElement>('#pendulum-inner');
  const outer = root.querySelector<SVGCircleElement>('#pendulum-outer');
  const fade = root.querySelector<SVGPathElement>('#pendulum-trail-fade');
  const ink = root.querySelector<SVGPathElement>('#pendulum-trail');
  const l1 = readNum(root.dataset, 'l1');
  const l2px = readNum(root.dataset, 'l2');
  const ox = readNum(root.dataset, 'ox');
  const oy = readNum(root.dataset, 'oy');
  const th1 = readNum(root.dataset, 'th1');
  const th2 = readNum(root.dataset, 'th2');
  const calm1 = readNum(root.dataset, 'calmTh1');
  const calm2 = readNum(root.dataset, 'calmTh2');
  if (!rodA || !rodB || !inner || !outer || !fade || !ink) return;
  if (l1 === null || l2px === null || ox === null || oy === null) return;
  if (th1 === null || th2 === null || calm1 === null || calm2 === null) return;
  if (l1 <= 0 || l2px <= 0) return;

  const l2 = l2px / l1;
  const trail: Sample[] = [];

  const place = (a: number, b: number): { x: number; y: number } => {
    const x1 = ox + l1 * Math.sin(a);
    const y1 = oy + l1 * Math.cos(a);
    const x2 = x1 + l2px * Math.sin(b);
    const y2 = y1 + l2px * Math.cos(b);
    rodA.setAttribute('x1', ox.toFixed(2));
    rodA.setAttribute('y1', oy.toFixed(2));
    rodA.setAttribute('x2', x1.toFixed(2));
    rodA.setAttribute('y2', y1.toFixed(2));
    rodB.setAttribute('x1', x1.toFixed(2));
    rodB.setAttribute('y1', y1.toFixed(2));
    rodB.setAttribute('x2', x2.toFixed(2));
    rodB.setAttribute('y2', y2.toFixed(2));
    inner.setAttribute('cx', x1.toFixed(2));
    inner.setAttribute('cy', y1.toFixed(2));
    outer.setAttribute('cx', x2.toFixed(2));
    outer.setAttribute('cy', y2.toFixed(2));
    return { x: x2, y: y2 };
  };

  const clearTrail = (): void => {
    trail.length = 0;
    fade.setAttribute('d', '');
    ink.setAttribute('d', '');
  };

  const paintTrail = (now: number): void => {
    const cutoff = now - TRAIL_MS;
    while (trail.length > 2 && trail[0]!.t < cutoff) trail.shift();
    const split = cutoff + TRAIL_MS * FADE_AT;
    let index = 0;
    while (index < trail.length && trail[index]!.t < split) index += 1;
    const head = Math.max(0, index - 1);
    fade.setAttribute('d', pathOf(trail.slice(0, head + 1)));
    ink.setAttribute('d', pathOf(trail.slice(head)));
  };

  const remember = (x: number, y: number, now: number): void => {
    const prev = trail[trail.length - 1];
    if (prev) {
      const dx = x - prev.x;
      const dy = y - prev.y;
      if (dx * dx + dy * dy < 1.7) {
        prev.x = x;
        prev.y = y;
        prev.t = now;
        return;
      }
    }
    trail.push({ x, y, t: now });
  };

  let state: State = [th1, 0, th2, 0];
  let running = false;
  let raf = 0;
  let last = 0;

  const park = (a: number, b: number): void => {
    state = [a, 0, b, 0];
    place(a, b);
    clearTrail();
  };

  const stop = (): void => {
    running = false;
    cancelAnimationFrame(raf);
  };

  const tick = (now: number): void => {
    if (!running) return;
    const wall = last === 0 ? 0 : (now - last) / 1000;
    last = now;
    if (wall > 0) state = advance(state, wall, l2);
    const tip = place(state[0], state[2]);
    remember(tip.x, tip.y, now);
    paintTrail(now);
    raf = requestAnimationFrame(tick);
  };

  const start = (): void => {
    if (running) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(tick);
  };

  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (prefersReducedMotion()) park(calm1, calm2);
  else start();

  mq.addEventListener('change', (event) => {
    if (event.matches) {
      stop();
      park(calm1, calm2);
      return;
    }
    park(th1, th2);
    start();
  });

  document.addEventListener('visibilitychange', () => {
    if (mq.matches) return;
    if (document.hidden) {
      stop();
      return;
    }
    start();
  });
}

boot();
