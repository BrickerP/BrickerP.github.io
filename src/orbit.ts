/**
 * Fig. 1 — Kepler / equal-area orbit for the homepage hero.
 *
 * The red body stays on the stroked SVG path via getPointAtLength. Timing
 * follows Kepler's second law (equal areas in equal times): mean anomaly
 * advances uniformly, eccentric anomaly is solved, then mapped onto path
 * length. A short on-path trail and SVG glow polish the body. Homepage-only;
 * no Three.js.
 */

const PERIOD_MS = 18_000;
const E_SAMPLES = 256;
const PATH_SAMPLES = 720;
/** Trail length as a fraction of the full orbit path. */
const TRAIL_FRAC = 0.09;
const TRAIL_STEPS = 14;

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Newton solve of Kepler's equation M = E − e sin E. */
function eccentricAnomaly(M: number, e: number): number {
  const twoPi = Math.PI * 2;
  let m = M % twoPi;
  if (m < 0) m += twoPi;
  let E = m;
  for (let i = 0; i < 10; i += 1) {
    const f = E - e * Math.sin(E) - m;
    const fp = 1 - e * Math.cos(E);
    E -= f / fp;
  }
  return E;
}

type PathSample = { s: number; x: number; y: number };

function samplePath(path: SVGPathElement): PathSample[] {
  const total = path.getTotalLength();
  const samples: PathSample[] = new Array(PATH_SAMPLES + 1);
  for (let i = 0; i <= PATH_SAMPLES; i += 1) {
    const s = (i / PATH_SAMPLES) * total;
    const p = path.getPointAtLength(s);
    samples[i] = { s, x: p.x, y: p.y };
  }
  return samples;
}

function nearestLength(samples: PathSample[], x: number, y: number): number {
  let best = samples[0]!.s;
  let bestD = Infinity;
  for (let i = 0; i < samples.length; i += 1) {
    const sample = samples[i]!;
    const dx = sample.x - x;
    const dy = sample.y - y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = sample.s;
    }
  }
  return best;
}

function parametricPoint(
  cx: number,
  cy: number,
  a: number,
  b: number,
  tiltRad: number,
  E: number,
): { x: number; y: number } {
  const ex = a * Math.cos(E);
  const ey = b * Math.sin(E);
  const cos = Math.cos(tiltRad);
  const sin = Math.sin(tiltRad);
  return {
    x: cx + ex * cos - ey * sin,
    y: cy + ex * sin + ey * cos,
  };
}

/** Path length at equal eccentric-anomaly stations (index 0 = periapsis). */
function buildEccentricLengthLut(path: SVGPathElement): Float64Array {
  const a = Number(path.dataset.a);
  const b = Number(path.dataset.b);
  const cx = Number(path.dataset.cx);
  const cy = Number(path.dataset.cy);
  const tiltRad = (Number(path.dataset.tilt) * Math.PI) / 180;
  const total = path.getTotalLength();
  const samples = samplePath(path);
  const length = new Float64Array(E_SAMPLES + 1);

  for (let i = 0; i <= E_SAMPLES; i += 1) {
    const E = (i / E_SAMPLES) * Math.PI * 2;
    const p = parametricPoint(cx, cy, a, b, tiltRad, E);
    length[i] = nearestLength(samples, p.x, p.y);
  }

  length[0] = 0;
  for (let i = 1; i <= E_SAMPLES; i += 1) {
    if (length[i]! < length[i - 1]!) length[i] = length[i - 1]!;
  }
  length[E_SAMPLES] = total;
  return length;
}

function lengthForEccentricAnomaly(lengthLut: Float64Array, E: number): number {
  const twoPi = Math.PI * 2;
  let e = E % twoPi;
  if (e < 0) e += twoPi;
  const scaled = (e / twoPi) * E_SAMPLES;
  const lo = Math.min(E_SAMPLES - 1, Math.floor(scaled));
  const hi = lo + 1;
  const t = scaled - lo;
  return lengthLut[lo]! + (lengthLut[hi]! - lengthLut[lo]!) * t;
}

function placeBody(body: SVGCircleElement, x: number, y: number): void {
  body.setAttribute('cx', x.toFixed(2));
  body.setAttribute('cy', y.toFixed(2));
}

/** Short trail along the same SVG path, behind the body. */
function paintTrail(
  path: SVGPathElement,
  trail: SVGPathElement,
  s: number,
  total: number,
): void {
  const span = total * TRAIL_FRAC;
  let d = '';
  for (let i = TRAIL_STEPS; i >= 0; i -= 1) {
    let t = s - (span * i) / TRAIL_STEPS;
    while (t < 0) t += total;
    const p = path.getPointAtLength(t);
    d += `${i === TRAIL_STEPS ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }
  trail.setAttribute('d', d);
}

function clearTrail(trail: SVGPathElement | null): void {
  trail?.setAttribute('d', '');
}

function boot(): void {
  if (prefersReducedMotion()) return;

  const root = document.querySelector<SVGSVGElement>('svg.orbit');
  if (!root) return;

  const path = root.querySelector<SVGPathElement>('#orbit-path');
  const body = root.querySelector<SVGCircleElement>('#orbit-body');
  const trail = root.querySelector<SVGPathElement>('#orbit-trail');
  if (!path || !body) return;

  const e = Number(path.dataset.eccentricity);
  const lengthLut = buildEccentricLengthLut(path);
  const total = path.getTotalLength();

  const parkPeriapsis = () => {
    const p = path.getPointAtLength(lengthForEccentricAnomaly(lengthLut, 0));
    placeBody(body, p.x, p.y);
    clearTrail(trail);
  };
  parkPeriapsis();

  let raf = 0;
  let t0 = performance.now();
  let running = true;

  const tick = (now: number) => {
    if (!running) return;
    const M = ((now - t0) / PERIOD_MS) * Math.PI * 2;
    const E = eccentricAnomaly(M, e);
    const s = lengthForEccentricAnomaly(lengthLut, E);
    const p = path.getPointAtLength(s);
    placeBody(body, p.x, p.y);
    if (trail) paintTrail(path, trail, s, total);
    raf = requestAnimationFrame(tick);
  };

  raf = requestAnimationFrame(tick);

  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const onMotion = (event: MediaQueryListEvent) => {
    if (event.matches) {
      running = false;
      cancelAnimationFrame(raf);
      parkPeriapsis();
    } else {
      running = true;
      t0 = performance.now();
      raf = requestAnimationFrame(tick);
    }
  };
  mq.addEventListener('change', onMotion);
}

boot();
