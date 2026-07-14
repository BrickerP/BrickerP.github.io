import type { Vec2 } from './geometry';
import { pointSegmentDistance } from './geometry';
import type { PathSampler } from './pathSampler';

/**
 * Fast nearest-distance-to-path query.
 *
 * The loop is pre-sampled into a fixed number of segments (from the
 * PathSampler's baked polyline) and indexed into a uniform spatial grid.
 * distanceTo() only tests segments in the query point's cell and its 8
 * neighbours, so we never brute-force every map point every frame.
 *
 * Used by the vehicle's left/right sensors to decide "am I on the line?".
 */
export class DistanceField {
  private readonly segA: Vec2[] = [];
  private readonly segB: Vec2[] = [];
  private readonly grid = new Map<number, number[]>();
  private minX = Infinity;
  private minY = Infinity;
  private readonly cell: number;
  private readonly cols: number;

  constructor(sampler: PathSampler, cellSize = 24) {
    this.cell = cellSize;
    const pts = sampler.getSamples();
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of pts) {
      if (p.x < this.minX) this.minX = p.x;
      if (p.y < this.minY) this.minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    // pad so points just outside the loop still land in a valid column
    this.minX -= cellSize;
    this.minY -= cellSize;
    maxX += cellSize;
    maxY += cellSize;
    this.cols = Math.max(1, Math.ceil((maxX - this.minX) / cellSize) + 1);

    // build closed set of segments and bucket each by the cells it touches
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const idx = this.segA.length;
      this.segA.push(a);
      this.segB.push(b);
      this.insertSegment(a, b, idx);
    }
  }

  private key(cx: number, cy: number): number {
    return cy * this.cols + cx;
  }

  private cellCoords(p: Vec2): { cx: number; cy: number } {
    return {
      cx: Math.floor((p.x - this.minX) / this.cell),
      cy: Math.floor((p.y - this.minY) / this.cell),
    };
  }

  private insertSegment(a: Vec2, b: Vec2, idx: number): void {
    // rasterise the segment's bounding-box cells (segments are short after
    // baking, so this is a couple of cells at most)
    const ca = this.cellCoords(a);
    const cb = this.cellCoords(b);
    const x0 = Math.min(ca.cx, cb.cx);
    const x1 = Math.max(ca.cx, cb.cx);
    const y0 = Math.min(ca.cy, cb.cy);
    const y1 = Math.max(ca.cy, cb.cy);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const k = this.key(cx, cy);
        let arr = this.grid.get(k);
        if (!arr) this.grid.set(k, (arr = []));
        arr.push(idx);
      }
    }
  }

  /** Nearest distance from `p` to the loop. Returns Infinity if grid empty. */
  distanceTo(p: Vec2): number {
    const { cx, cy } = this.cellCoords(p);
    let best = Infinity;
    let found = false;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const arr = this.grid.get(this.key(cx + dx, cy + dy));
        if (!arr) continue;
        for (const idx of arr) {
          found = true;
          const d = pointSegmentDistance(p, this.segA[idx], this.segB[idx]);
          if (d < best) best = d;
        }
      }
    }
    // Fallback: if no segment sat in the 3x3 neighbourhood (query far from the
    // loop), scan all segments. Rare, and still bounded by segment count.
    if (!found) {
      for (let i = 0; i < this.segA.length; i++) {
        const d = pointSegmentDistance(p, this.segA[i], this.segB[i]);
        if (d < best) best = d;
      }
    }
    return best;
  }
}

/**
 * Convenience free function matching the spec's `distanceToPath(point)`.
 * Prefer constructing a DistanceField once and reusing it; this helper
 * lazily caches one field per sampler instance.
 */
const fieldCache = new WeakMap<PathSampler, DistanceField>();
export function distanceToPath(sampler: PathSampler, point: Vec2): number {
  let field = fieldCache.get(sampler);
  if (!field) fieldCache.set(sampler, (field = new DistanceField(sampler)));
  return field.distanceTo(point);
}
