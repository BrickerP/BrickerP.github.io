import type p5 from 'p5';
import type { BeijingMap, MapPolyline } from '../data/mapTypes';
import type { Vec2 } from '../path/geometry';
import { RGB } from './theme';

/** One nested copy of the map in the fractal stack (or the single base map). */
export interface LayerParams {
  /** apparent scale of this copy about the anchor (1 = base size). */
  worldScale: number;
  /** 0..1 opacity multiplier for this layer. */
  alpha: number;
  /** 0..1 level of detail (streets/mountains fade in as this rises). */
  detail: number;
  /** pixels per world unit at the focal plane (for screen-stable widths). */
  pxPerUnit: number;
  /** world-space anchor the scaling pivots around. */
  anchor: Vec2;
  /** draw the soft filled land/core beneath the lines. */
  drawFill: boolean;
}

/**
 * Draws the artistic Beijing map (boundary, rings, axis, radials, streets,
 * water, mountains) as line art on the z=0 ground plane. All geometry is
 * pre-parsed; nothing here allocates per frame beyond p5's own vertex calls.
 *
 * Line widths are specified in screen pixels and converted to world units via
 * `pxPerUnit * worldScale`, so roads stay a stable thickness on screen no
 * matter how far the fractal zoom has scaled a given layer.
 */
export class MapRenderer {
  constructor(private readonly map: BeijingMap) {}

  /**
   * Draw one map layer. Point positions are scaled about `anchor` by
   * `worldScale`; stroke weights are given in SCREEN PIXELS and divided by
   * `pxPerUnit` (constant at the focal plane) — never multiplied by
   * worldScale — so lines stay a stable thickness on screen at any zoom.
   */
  draw(p: p5, L: LayerParams): void {
    const a = L.alpha;
    if (a <= 0.003) return;

    // soft land + core fills sit lowest
    if (L.drawFill) {
      this.fills(p, L, a);
    }

    // water (rivers thin, lakes filled) — low-key but present
    for (const pl of this.map.water) {
      if (pl.kind === 'lake') {
        this.poly(p, L, pl, null, [...RGB.water, 130 * a], true);
      } else {
        this.line(p, L, pl, RGB.water, 1.4, 0.72 * a);
      }
    }

    // mountains — hatch texture, fades in with detail
    if (L.detail > 0.18) {
      const ma = a * smooth(L.detail, 0.18, 0.5) * 0.72;
      for (const pl of this.map.mountains) this.line(p, L, pl, RGB.mountain, 1.0, ma);
    }

    // roads: streets (LOD-gated) -> radials -> rings -> axis, faint to bold
    for (const pl of this.map.roads) {
      switch (pl.kind) {
        case 'street': {
          if (L.detail <= 0.28) break;
          this.line(p, L, pl, RGB.road, 0.8, a * smooth(L.detail, 0.28, 0.6) * 0.66);
          break;
        }
        case 'radial':
          this.line(p, L, pl, RGB.road, 1.3, a * 0.85);
          break;
        case 'ring':
          if (pl.ring === 2) break; // 2nd ring is the orange loop, drawn separately
          this.line(p, L, pl, RGB.road, 1.7, a * 0.95);
          break;
        case 'axis':
          this.line(p, L, pl, RGB.axis, 2.4, a);
          break;
        default:
          this.line(p, L, pl, RGB.road, 1.2, a * 0.8);
      }
    }

    // municipal boundary — the brightest, calmest line
    for (const pl of this.map.boundary) {
      if (pl.kind === 'boundary') this.line(p, L, pl, RGB.boundary, 2.2, a);
    }
  }

  private fills(p: p5, L: LayerParams, a: number): void {
    for (const pl of this.map.boundary) {
      if (pl.kind === 'boundary') this.poly(p, L, pl, null, [22, 30, 40, 210 * a], true);
    }
    for (const pl of this.map.boundary) {
      if (pl.kind === 'core') this.poly(p, L, pl, null, [26, 36, 47, 150 * a], true);
    }
  }

  /** Transform a city-unit point into world space for layer L. */
  private tx(L: LayerParams, pt: Vec2): [number, number] {
    return [
      L.anchor.x + (pt.x - L.anchor.x) * L.worldScale,
      L.anchor.y + (pt.y - L.anchor.y) * L.worldScale,
    ];
  }

  /**
   * @param color RGB triple
   * @param px    stroke weight in SCREEN pixels
   * @param alpha 0..1 opacity (scaled to 0..255 internally)
   */
  private line(
    p: p5,
    L: LayerParams,
    pl: MapPolyline,
    color: readonly [number, number, number],
    px: number,
    alpha: number,
  ): void {
    if (alpha <= 0.002 || pl.points.length < 2) return;
    p.noFill();
    p.stroke(color[0], color[1], color[2], clampAlpha(alpha * 255));
    p.strokeWeight(px / L.pxPerUnit);
    p.beginShape();
    for (const pt of pl.points) {
      const [wx, wy] = this.tx(L, pt);
      p.vertex(wx, -wy, LINE_Z);
    }
    if (pl.closed) {
      const [wx, wy] = this.tx(L, pl.points[0]);
      p.vertex(wx, -wy, LINE_Z);
    }
    p.endShape();
  }

  private poly(
    p: p5,
    L: LayerParams,
    pl: MapPolyline,
    stroke: readonly [number, number, number] | null,
    fill: readonly [number, number, number, number],
    filled: boolean,
  ): void {
    if (pl.points.length < 3) return;
    if (filled) p.fill(fill[0], fill[1], fill[2], clampAlpha(fill[3]));
    else p.noFill();
    if (stroke) p.stroke(stroke[0], stroke[1], stroke[2]);
    else p.noStroke();
    p.beginShape();
    for (const pt of pl.points) {
      const [wx, wy] = this.tx(L, pt);
      p.vertex(wx, -wy, FILL_Z);
    }
    p.endShape(p.CLOSE);
  }
}

const LINE_Z = 0.6; // lift lines slightly above fills to avoid z-fighting
const FILL_Z = 0;

function clampAlpha(a: number): number {
  return a < 0 ? 0 : a > 255 ? 255 : a;
}

/** Smoothstep from edge0..edge1. */
function smooth(x: number, edge0: number, edge1: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}
function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

