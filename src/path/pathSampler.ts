import type { Vec2 } from './geometry';
import { dist } from './geometry';

/**
 * Arc-length-parameterised closed path built from a Catmull-Rom spline
 * through control points. The curve is baked once into a dense polyline and a
 * cumulative-length table so that:
 *   - getPointAt(progress) moves at constant speed regardless of control-point
 *     spacing (uniform arc-length parameterisation), and
 *   - progress wraps seamlessly in [0, 1): progress 1 === progress 0.
 *
 * The path is CLOSED: control points do not repeat the first vertex; the
 * spline connects the last control point back to the first.
 */
export class PathSampler {
  private readonly samples: Vec2[] = [];
  private readonly cumLen: number[] = [];
  private total = 0;

  /**
   * @param control  closed loop control points (first !== last)
   * @param subdiv   spline samples generated per control-point segment
   */
  constructor(
    private readonly control: Vec2[],
    subdiv = 24,
  ) {
    if (control.length < 3) {
      throw new Error('PathSampler needs at least 3 control points');
    }
    this.bake(subdiv);
  }

  private bake(subdiv: number): void {
    const n = this.control.length;
    const p = (i: number) => this.control[((i % n) + n) % n];

    // Catmull-Rom (centripetal-ish, standard uniform) evaluated per segment.
    for (let i = 0; i < n; i++) {
      const p0 = p(i - 1);
      const p1 = p(i);
      const p2 = p(i + 1);
      const p3 = p(i + 2);
      for (let s = 0; s < subdiv; s++) {
        const t = s / subdiv;
        this.samples.push(catmullRom(p0, p1, p2, p3, t));
      }
    }

    // cumulative arc length, closing the loop back to sample[0]
    this.cumLen.push(0);
    for (let i = 1; i < this.samples.length; i++) {
      this.total += dist(this.samples[i - 1], this.samples[i]);
      this.cumLen.push(this.total);
    }
    this.total += dist(this.samples[this.samples.length - 1], this.samples[0]);
  }

  getLength(): number {
    return this.total;
  }

  /** Baked polyline — handy for renderers and distance queries. */
  getSamples(): readonly Vec2[] {
    return this.samples;
  }

  /** Wrap any real progress into [0, 1). */
  wrapProgress(progress: number): number {
    let t = progress % 1;
    if (t < 0) t += 1;
    return t;
  }

  /** Position at progress in [0,1); wraps automatically. Constant speed. */
  getPointAt(progress: number): Vec2 {
    const target = this.wrapProgress(progress) * this.total;
    const { i, frac } = this.locate(target);
    const a = this.samples[i];
    const b = this.samples[(i + 1) % this.samples.length];
    return { x: a.x + (b.x - a.x) * frac, y: a.y + (b.y - a.y) * frac };
  }

  /** Unit tangent (direction of travel) at progress; wraps automatically. */
  getTangentAt(progress: number): Vec2 {
    const target = this.wrapProgress(progress) * this.total;
    const { i } = this.locate(target);
    const a = this.samples[i];
    const b = this.samples[(i + 1) % this.samples.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const m = Math.hypot(dx, dy) || 1;
    return { x: dx / m, y: dy / m };
  }

  /** Heading angle (atan2) at progress. */
  getAngleAt(progress: number): number {
    const t = this.getTangentAt(progress);
    return Math.atan2(t.y, t.x);
  }

  /** Binary-search the segment containing arc length `target`. */
  private locate(target: number): { i: number; frac: number } {
    const arr = this.cumLen;
    let lo = 0;
    let hi = arr.length - 1;
    if (target <= 0) return { i: 0, frac: 0 };
    if (target >= this.total) {
      // in the closing segment (last sample -> sample[0])
      const last = arr.length - 1;
      const segLen = this.total - arr[last];
      const frac = segLen > 0 ? (target - arr[last]) / segLen : 0;
      return { i: last, frac };
    }
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (arr[mid] <= target) lo = mid + 1;
      else hi = mid;
    }
    const i = lo - 1;
    const segLen = arr[i + 1] - arr[i];
    const frac = segLen > 0 ? (target - arr[i]) / segLen : 0;
    return { i, frac };
  }
}

function catmullRom(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, t: number): Vec2 {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x:
      0.5 *
      (2 * p1.x +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y:
      0.5 *
      (2 * p1.y +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  };
}
