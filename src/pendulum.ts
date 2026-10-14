/**
 * Fig. 1 — double pendulum for the homepage hero.
 *
 * Equal masses, ℓ₂/ℓ₁ = 0.86. A pale twin is released from the same pose
 * plus a small Δθ₂, so the two outer trails split. Drag a bob to choose the
 * release, or move Δθ₂. Both trails keep a long history and fade with age;
 * Reset clears them and restores the marked initial conditions.
 * Classical RK4 on the Lagrangian equations (θ = 0 hangs down).
 * Reduced motion parks both arms near the vertical and drops the trails.
 * The primary arm can leave an onion skin of its last poses; a run of
 * rapid clicks releases fifty twins. The homepage also boots the paper
 * ripple and the margin traces. Homepage only; no Three.js.
 */

import { bootPaper } from './paper';
import { bootMargins } from './margins';

const G = 9.81;
const M1 = 1;
const M2 = 1;
/** Physics length of the inner rod. The outer rod is ℓ₂/ℓ₁ from the figure. */
const L1 = 1;
const STEP = 1 / 240;
const TIME_SCALE = 0.42;
const MAX_FRAME_S = 0.05;
/** Wall-clock history kept on each outer bob. Old ink fades; Reset clears it. */
const TRAIL_MS = 28_000;
const TRAIL_BANDS = 4;
const TRAIL_CAP = 720;
const DEFAULT_DELTA = 0.015;
/** Onion skin: a stop-motion row of past poses for the primary arm. */
const ONION_MS = 110;
const ONION_KEEP = 12;
const ONION_LIFE = 1400;
/** The easter egg: rapid clicks on the figure release fifty twins. */
const BURST_COUNT = 50;
const BURST_MS = 7000;
const CLICK_COUNT = 5;
const CLICK_WINDOW_MS = 2600;
const CLICK_COOLDOWN_MS = 9000;
const NS = 'http://www.w3.org/2000/svg';

type State = [number, number, number, number];
type Sample = { x: number; y: number; t: number };
type Drag = 'inner' | 'outer';

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

/** Angle from the downward vertical toward +x (screen y grows downward). */
function angleFrom(x: number, y: number, px: number, py: number): number {
  return Math.atan2(x - px, y - py);
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
  const grabInner = root.querySelector<SVGCircleElement>('#pendulum-grab-inner');
  const grabOuter = root.querySelector<SVGCircleElement>('#pendulum-grab-outer');
  const twinRodA = root.querySelector<SVGLineElement>('#pendulum-twin-rod-a');
  const twinRodB = root.querySelector<SVGLineElement>('#pendulum-twin-rod-b');
  const twinInner = root.querySelector<SVGCircleElement>('#pendulum-twin-inner');
  const twinOuter = root.querySelector<SVGCircleElement>('#pendulum-twin-outer');
  const deltaInput = document.querySelector<HTMLInputElement>('#pendulum-delta');
  const deltaRead = document.querySelector<HTMLElement>('#pendulum-delta-read');
  const resetBtn = document.querySelector<HTMLButtonElement>('#pendulum-reset');
  const l1 = readNum(root.dataset, 'l1');
  const l2px = readNum(root.dataset, 'l2');
  const ox = readNum(root.dataset, 'ox');
  const oy = readNum(root.dataset, 'oy');
  const release1 = readNum(root.dataset, 'th1');
  const release2 = readNum(root.dataset, 'th2');
  const calm1 = readNum(root.dataset, 'calmTh1');
  const calm2 = readNum(root.dataset, 'calmTh2');
  if (!rodA || !rodB || !inner || !outer || !grabInner || !grabOuter) return;
  if (!twinRodA || !twinRodB || !twinInner || !twinOuter) return;
  if (l1 === null || l2px === null || ox === null || oy === null) return;
  if (release1 === null || release2 === null || calm1 === null || calm2 === null) return;
  if (l1 <= 0 || l2px <= 0) return;

  const primaryBands = [0, 1, 2, 3].map((band) =>
    root.querySelector<SVGPathElement>(`.trail--primary.trail-b${band}`),
  );
  const twinBands = [0, 1, 2, 3].map((band) =>
    root.querySelector<SVGPathElement>(`.trail--twin.trail-b${band}`),
  );
  if (primaryBands.some((band) => !band) || twinBands.some((band) => !band)) return;

  const l2 = l2px / l1;
  const primaryTrail: Sample[] = [];
  const twinTrail: Sample[] = [];
  let delta = clampDelta(deltaInput ? Number(deltaInput.value) : DEFAULT_DELTA);
  let state: State = [release1, 0, release2, 0];
  let twin: State = [release1, 0, release2 + delta, 0];
  let drag: Drag | null = null;
  let running = false;
  let raf = 0;
  let last = 0;

  const onionBtn = document.querySelector<HTMLButtonElement>('#pendulum-onion');
  const onionLayer = root.querySelector<SVGGElement>('#pendulum-onions');
  const burstLayer = root.querySelector<SVGGElement>('#pendulum-burst');

  // Onion skin — the primary arm leaves a short row of its past poses,
  // sampled at a stop-motion cadence so the fan stays readable.
  type Onion = { a: number; b: number; t: number };
  type OnionSlot = {
    g: SVGGElement;
    rod1: SVGLineElement;
    rod2: SVGLineElement;
    bob1: SVGCircleElement;
    bob2: SVGCircleElement;
  };
  const onions: Onion[] = [];
  const onionPool: OnionSlot[] = [];
  let onionOn = !onionBtn || onionBtn.getAttribute('aria-pressed') !== 'false';
  let nextOnion = 0;

  const onionSlot = (index: number): OnionSlot => {
    const existing = onionPool[index];
    if (existing) return existing;
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'onion');
    g.setAttribute('opacity', '0');
    const rod1 = document.createElementNS(NS, 'line');
    rod1.setAttribute('class', 'rod');
    const rod2 = document.createElementNS(NS, 'line');
    rod2.setAttribute('class', 'rod');
    const bob1 = document.createElementNS(NS, 'circle');
    bob1.setAttribute('class', 'bob bob--inner');
    bob1.setAttribute('r', '4.2');
    const bob2 = document.createElementNS(NS, 'circle');
    bob2.setAttribute('class', 'bob bob--outer');
    bob2.setAttribute('r', '5');
    g.append(rod1, rod2, bob1, bob2);
    onionLayer?.appendChild(g);
    const slot: OnionSlot = { g, rod1, rod2, bob1, bob2 };
    onionPool[index] = slot;
    return slot;
  };

  const clearOnions = (): void => {
    onions.length = 0;
    nextOnion = 0;
    for (const slot of onionPool) slot.g.setAttribute('opacity', '0');
  };

  const paintOnions = (now: number): void => {
    while (onions.length > 0 && now - onions[0]!.t > ONION_LIFE) onions.shift();
    for (let i = 0; i < onions.length; i += 1) {
      const pose = onions[i]!;
      const slot = onionSlot(i);
      const age = (now - pose.t) / ONION_LIFE;
      const { x1, y1, x2, y2 } = joints(pose.a, pose.b);
      slot.rod1.setAttribute('x1', ox.toFixed(1));
      slot.rod1.setAttribute('y1', oy.toFixed(1));
      slot.rod1.setAttribute('x2', x1.toFixed(1));
      slot.rod1.setAttribute('y2', y1.toFixed(1));
      slot.rod2.setAttribute('x1', x1.toFixed(1));
      slot.rod2.setAttribute('y1', y1.toFixed(1));
      slot.rod2.setAttribute('x2', x2.toFixed(1));
      slot.rod2.setAttribute('y2', y2.toFixed(1));
      slot.bob1.setAttribute('cx', x1.toFixed(1));
      slot.bob1.setAttribute('cy', y1.toFixed(1));
      slot.bob2.setAttribute('cx', x2.toFixed(1));
      slot.bob2.setAttribute('cy', y2.toFixed(1));
      slot.g.setAttribute('opacity', (0.3 * (1 - age)).toFixed(3));
    }
    for (let i = onions.length; i < onionPool.length; i += 1) {
      onionPool[i]!.g.setAttribute('opacity', '0');
    }
  };

  // The easter egg — a run of quick clicks releases fifty twins that
  // spread with the current Δθ₂ and fade out together.
  let burst: State[] | null = null;
  let burstBorn = 0;
  let burstPaths: SVGPathElement[] = [];
  let burstDots: SVGCircleElement[] = [];
  let clicks: number[] = [];
  let clicksLocked = 0;
  let downWasDrag = false;
  const burstOrigin = `M${ox.toFixed(1)} ${oy.toFixed(1)}`;

  const endBurst = (): void => {
    for (const path of burstPaths) path.remove();
    for (const dot of burstDots) dot.remove();
    burst = null;
    burstPaths = [];
    burstDots = [];
    burstLayer?.setAttribute('opacity', '0');
  };

  const release = (): void => {
    if (mq.matches || burst || !burstLayer) return;
    const next: State[] = [];
    for (let i = 0; i < BURST_COUNT; i += 1) {
      const spread = (i / (BURST_COUNT - 1) - 0.5) * 0.06;
      next.push([state[0] + spread * 0.3, 0, state[2] + spread, 0]);
    }
    burst = next;
    burstBorn = performance.now();
    burstPaths = next.map(() => {
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('class', 'burst');
      burstLayer.appendChild(path);
      return path;
    });
    burstDots = next.map(() => {
      const dot = document.createElementNS(NS, 'circle');
      dot.setAttribute('class', 'burst-dot');
      dot.setAttribute('r', '2');
      burstLayer.appendChild(dot);
      return dot;
    });
    start();
  };

  const paintBurst = (now: number, wall: number): void => {
    if (!burst) return;
    const age = now - burstBorn;
    if (age >= BURST_MS) {
      endBurst();
      return;
    }
    const fade = Math.min(1, (BURST_MS - age) / 1500) * 0.32;
    burstLayer?.setAttribute('opacity', fade.toFixed(3));
    for (let i = 0; i < burst.length; i += 1) {
      const pose = advance(burst[i]!, wall, l2);
      burst[i] = pose;
      const { x1, y1, x2, y2 } = joints(pose[0], pose[2]);
      burstPaths[i]!.setAttribute(
        'd',
        `${burstOrigin}L${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`,
      );
      burstDots[i]!.setAttribute('cx', x2.toFixed(1));
      burstDots[i]!.setAttribute('cy', y2.toFixed(1));
    }
  };

  const showDelta = (): void => {
    if (deltaInput) deltaInput.value = delta.toFixed(3);
    if (deltaRead) deltaRead.textContent = delta.toFixed(3);
  };

  const joints = (a: number, b: number) => {
    const x1 = ox + l1 * Math.sin(a);
    const y1 = oy + l1 * Math.cos(a);
    return { x1, y1, x2: x1 + l2px * Math.sin(b), y2: y1 + l2px * Math.cos(b) };
  };

  const paintArm = (
    a: number,
    b: number,
    rod1: SVGLineElement,
    rod2: SVGLineElement,
    bob1: SVGCircleElement,
    bob2: SVGCircleElement,
    grab1: SVGCircleElement | null,
    grab2: SVGCircleElement | null,
  ): { x: number; y: number } => {
    const { x1, y1, x2, y2 } = joints(a, b);
    rod1.setAttribute('x1', ox.toFixed(2));
    rod1.setAttribute('y1', oy.toFixed(2));
    rod1.setAttribute('x2', x1.toFixed(2));
    rod1.setAttribute('y2', y1.toFixed(2));
    rod2.setAttribute('x1', x1.toFixed(2));
    rod2.setAttribute('y1', y1.toFixed(2));
    rod2.setAttribute('x2', x2.toFixed(2));
    rod2.setAttribute('y2', y2.toFixed(2));
    bob1.setAttribute('cx', x1.toFixed(2));
    bob1.setAttribute('cy', y1.toFixed(2));
    bob2.setAttribute('cx', x2.toFixed(2));
    bob2.setAttribute('cy', y2.toFixed(2));
    if (grab1) {
      grab1.setAttribute('cx', x1.toFixed(2));
      grab1.setAttribute('cy', y1.toFixed(2));
    }
    if (grab2) {
      grab2.setAttribute('cx', x2.toFixed(2));
      grab2.setAttribute('cy', y2.toFixed(2));
    }
    return { x: x2, y: y2 };
  };

  const place = (): { primary: { x: number; y: number }; twin: { x: number; y: number } } => ({
    primary: paintArm(state[0], state[2], rodA, rodB, inner, outer, grabInner, grabOuter),
    twin: paintArm(twin[0], twin[2], twinRodA, twinRodB, twinInner, twinOuter, null, null),
  });

  const clearTrails = (): void => {
    primaryTrail.length = 0;
    twinTrail.length = 0;
    for (const band of [...primaryBands, ...twinBands]) band?.setAttribute('d', '');
  };

  const paintTrail = (bands: Array<SVGPathElement | null>, points: Sample[], now: number): void => {
    const cutoff = now - TRAIL_MS;
    while (points.length > 2 && points[0]!.t < cutoff) points.shift();
    while (points.length > TRAIL_CAP) points.shift();
    const slices: Sample[][] = Array.from({ length: TRAIL_BANDS }, () => []);
    let previous = 0;
    for (let i = 0; i < points.length; i += 1) {
      const point = points[i]!;
      const age = Math.min(1, Math.max(0, (now - point.t) / TRAIL_MS));
      const band = Math.min(TRAIL_BANDS - 1, Math.floor(age * TRAIL_BANDS));
      if (i > 0 && band !== previous) slices[previous]!.push(point);
      slices[band]!.push(point);
      previous = band;
    }
    for (let band = 0; band < TRAIL_BANDS; band += 1) {
      bands[band]?.setAttribute('d', pathOf(slices[band]!));
    }
  };

  const remember = (points: Sample[], x: number, y: number, now: number): void => {
    const prev = points[points.length - 1];
    if (prev) {
      const dx = x - prev.x;
      const dy = y - prev.y;
      if (dx * dx + dy * dy < 2.4) {
        prev.x = x;
        prev.y = y;
        prev.t = now;
        return;
      }
    }
    points.push({ x, y, t: now });
  };

  const reseed = (a: number, b: number): void => {
    state = [a, 0, b, 0];
    twin = [a, 0, b + delta, 0];
    place();
    clearTrails();
    clearOnions();
    last = performance.now();
  };

  const parkCalm = (): void => {
    state = [calm1, 0, calm2, 0];
    twin = [calm1, 0, calm2 + delta, 0];
    place();
    clearTrails();
    clearOnions();
  };

  const stop = (): void => {
    running = false;
    cancelAnimationFrame(raf);
  };

  const tick = (now: number): void => {
    if (!running || drag) return;
    const wall = last === 0 ? 0 : (now - last) / 1000;
    last = now;
    if (wall > 0) {
      state = advance(state, wall, l2);
      twin = advance(twin, wall, l2);
    }
    const tips = place();
    remember(primaryTrail, tips.primary.x, tips.primary.y, now);
    remember(twinTrail, tips.twin.x, tips.twin.y, now);
    paintTrail(primaryBands, primaryTrail, now);
    paintTrail(twinBands, twinTrail, now);
    if (onionOn && !mq.matches) {
      if (now >= nextOnion) {
        onions.push({ a: state[0], b: state[2], t: now });
        nextOnion = now + ONION_MS;
        while (onions.length > ONION_KEEP) onions.shift();
      }
      paintOnions(now);
    }
    paintBurst(now, wall);
    raf = requestAnimationFrame(tick);
  };

  const start = (): void => {
    if (running || drag) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(tick);
  };

  const svgPoint = (event: PointerEvent): { x: number; y: number } | null => {
    const ctm = root.getScreenCTM();
    if (!ctm) return null;
    const point = root.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const local = point.matrixTransform(ctm.inverse());
    return { x: local.x, y: local.y };
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    const target = event.target;
    if (target instanceof Element && target.closest('text')) return;
    const point = svgPoint(event);
    if (!point || point.y > 236) return;
    const { x1, y1, x2, y2 } = joints(state[0], state[2]);
    const toInner = Math.hypot(point.x - x1, point.y - y1);
    const toOuter = Math.hypot(point.x - x2, point.y - y2);
    if (Math.min(toInner, toOuter) > 56) return;
    drag = toInner <= toOuter ? 'inner' : 'outer';
    downWasDrag = true;
    root.setPointerCapture(event.pointerId);
    stop();
    clearTrails();
    event.preventDefault();
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (!drag) return;
    const point = svgPoint(event);
    if (!point) return;
    if (drag === 'inner') state[0] = angleFrom(point.x, point.y, ox, oy);
    else {
      const { x1, y1 } = joints(state[0], state[2]);
      state[2] = angleFrom(point.x, point.y, x1, y1);
    }
    state[1] = 0;
    state[3] = 0;
    twin = [state[0], 0, state[2] + delta, 0];
    place();
  };

  const onPointerUp = (): void => {
    if (!drag) return;
    drag = null;
    reseed(state[0], state[2]);
    if (!mq.matches) start();
  };

  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  showDelta();
  if (prefersReducedMotion()) parkCalm();
  else reseed(release1, release2);

  if (!mq.matches) start();

  mq.addEventListener('change', (event) => {
    drag = null;
    downWasDrag = false;
    if (event.matches) {
      stop();
      endBurst();
      parkCalm();
      return;
    }
    reseed(release1, release2);
    start();
  });

  document.addEventListener('visibilitychange', () => {
    if (mq.matches || drag) return;
    if (document.hidden) {
      stop();
      return;
    }
    start();
  });

  root.addEventListener('pointerdown', onPointerDown);
  root.addEventListener('pointermove', onPointerMove);
  root.addEventListener('pointerup', onPointerUp);
  root.addEventListener('pointercancel', onPointerUp);

  // Count quick tap-taps on the figure; a run of them releases the twins.
  root.addEventListener('pointerup', (event) => {
    if (downWasDrag) {
      downWasDrag = false;
      return;
    }
    if (event.button !== 0 || mq.matches) return;
    const now = performance.now();
    if (now < clicksLocked) return;
    clicks = clicks.filter((t) => now - t < CLICK_WINDOW_MS);
    clicks.push(now);
    if (clicks.length >= CLICK_COUNT) {
      clicks = [];
      clicksLocked = now + CLICK_COOLDOWN_MS;
      release();
    }
  });

  deltaInput?.addEventListener('input', () => {
    delta = clampDelta(Number(deltaInput.value));
    showDelta();
    reseed(state[0], state[2]);
    if (!mq.matches) start();
  });

  resetBtn?.addEventListener('click', () => {
    drag = null;
    delta = clampDelta(deltaInput ? Number(deltaInput.defaultValue) : DEFAULT_DELTA);
    showDelta();
    if (mq.matches) {
      stop();
      parkCalm();
      return;
    }
    reseed(release1, release2);
    start();
  });

  onionBtn?.addEventListener('click', () => {
    onionOn = !onionOn;
    onionBtn.setAttribute('aria-pressed', onionOn ? 'true' : 'false');
    if (!onionOn) clearOnions();
  });
}

function clampDelta(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_DELTA;
  return Math.min(0.06, Math.max(0.002, value));
}

boot();
bootPaper();
bootMargins();
