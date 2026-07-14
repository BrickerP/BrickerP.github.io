import type { Vec2 } from '../path/geometry';
import type { LayerParams } from './MapRenderer';
import { FRACTAL } from './theme';

/**
 * Produces the stack of nested map layers for the seamless infinite-zoom
 * "Fractal" mode.
 *
 * Why the wrap is seamless (this is the heart of the project):
 *   phase = (elapsed % duration) / duration                    ∈ [0, 1)
 *   A copy at integer depth k has log-scale  L = phase + k  and world scale
 *   S^L  (S = layerScale). As phase runs 0→1 every copy's L slides up by 1,
 *   so at phase=1 the SET of (scale, role) pairs on screen is identical to
 *   phase=0 — only the integer labels shift by one.
 *
 *   Each copy's opacity is a CUBIC B-SPLINE of L. The cubic B-spline is a
 *   partition of unity: Σ_k B(L + k) = 1 for every L. Therefore the total
 *   opacity is constant, and because the geometry set is identical at phase 0
 *   and 1, the rendered frame is a continuous, periodic function of phase —
 *   no flash, black frame, or jump at the wrap. Its support has width 4, so
 *   3–4 nested copies are always visible at once (spec: "≥3 layers").
 *
 * The vehicle is drawn ON every visible copy (see the app) at that copy's
 * scale, from one continuous clock. The stack is thus fully self-similar, so
 * the car — like the map — lands exactly on its next-copy position at the
 * wrap and never jumps back to the route start.
 */
export class FractalRenderer {
  private readonly S = FRACTAL.layerScale;
  private readonly depths = [-2, -1, 0, 1, 2];

  /** Cycle phase in [0,1) from elapsed seconds. */
  phase(elapsed: number): number {
    const d = FRACTAL.duration;
    return (((elapsed % d) + d) % d) / d;
  }

  /**
   * Nested layers for Fractal mode, ordered back-to-front (largest world
   * scale first) so smaller inner copies paint on top toward the anchor.
   */
  fractalLayers(phase: number, anchor: Vec2, pxPerUnit: number): LayerParams[] {
    const layers: LayerParams[] = [];
    // the copy whose log-scale is closest to 0 is the dominant one; only it
    // paints the solid land fill, so offset copies don't ghost the silhouette.
    let domK = this.depths[0];
    let domDist = Infinity;
    for (const k of this.depths) {
      const d = Math.abs(phase + k);
      if (d < domDist) {
        domDist = d;
        domK = k;
      }
    }
    for (const k of this.depths) {
      const L = phase + k;
      const alpha = bspline3(L);
      if (alpha <= 0.004) continue;
      const worldScale = Math.pow(this.S, L);
      const detail = smoothstep(0.45, 1.7, worldScale);
      layers.push({
        worldScale,
        alpha,
        detail,
        pxPerUnit,
        anchor,
        drawFill: k === domK,
      });
    }
    layers.sort((a, b) => b.worldScale - a.worldScale);
    return layers;
  }

  /** Single opaque full-detail layer for Follow / Overview modes. */
  baseLayers(anchor: Vec2, pxPerUnit: number): LayerParams[] {
    return [{ worldScale: 1, alpha: 1, detail: 1, pxPerUnit, anchor, drawFill: true }];
  }
}

/**
 * Cubic B-spline basis centred at 0 — a partition of unity under unit shifts,
 * which is exactly what makes the summed opacity (and the whole composite)
 * continuous across the phase 1→0 wrap. Peak 2/3 at L=0, 1/6 at |L|=1, 0 at
 * |L|≥2.
 */
function bspline3(L: number): number {
  const t = Math.abs(L);
  if (t < 1) return 2 / 3 - t * t + (t * t * t) / 2;
  if (t < 2) {
    const u = 2 - t;
    return (u * u * u) / 6;
  }
  return 0;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
