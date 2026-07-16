import type p5 from 'p5';
import type { BeijingMap, MapPolyline } from '../data/mapTypes';
import type { Vec2 } from '../path/geometry';
import { RGB } from './theme';

/** Placement and opacity for one rendered map or loop layer. */
export interface LayerParams {
  worldScale: number;
  alpha: number;
  detail: number;
  pxPerUnit: number;
  anchor: Vec2;
  drawFill: boolean;
}

/**
 * Draws the static Beijing context once: a soft city plate, courtyard masses,
 * broken outer arcs, gate marks, one lake and six northern ridges. The recursive
 * motion is intentionally owned by the orange loop, not by this context.
 */
export class MapRenderer {
  constructor(private readonly map: BeijingMap) {}

  draw(p: p5, layer: LayerParams): void {
    const alpha = layer.alpha;
    if (alpha <= 0.003) return;

    if (layer.drawFill) this.drawLand(p, layer, alpha);

    for (const polyline of this.map.roads) {
      switch (polyline.kind) {
        case 'street':
          if (polyline.closed) {
            this.polygon(p, layer, polyline, [...RGB.district, 188 * alpha], 0.3);
          } else {
            this.line(p, layer, polyline, RGB.road, 1.05, 0.3 * alpha);
          }
          break;
        case 'radial':
          this.line(p, layer, polyline, RGB.road, 1.35, 0.5 * alpha);
          break;
        case 'axis':
          this.line(p, layer, polyline, RGB.axis, 1.65, 0.7 * alpha);
          break;
        case 'ring':
          // Ring 2 is sampled and drawn as the orange hero route by the app.
          if (polyline.ring !== 2) {
            this.line(p, layer, polyline, RGB.road, 1.05, 0.28 * alpha);
          }
          break;
        default:
          break;
      }
    }

    for (const polyline of this.map.water) {
      if (polyline.kind === 'lake') {
        this.polygon(p, layer, polyline, [...RGB.water, 120 * alpha], 0.45);
      } else {
        this.line(p, layer, polyline, RGB.water, 1.15, 0.5 * alpha);
      }
    }

    for (const polyline of this.map.mountains) {
      this.line(p, layer, polyline, RGB.mountain, 0.95, 0.4 * alpha);
    }

    // The municipal edge is deliberately recessive; the loop owns contrast.
    for (const polyline of this.map.boundary) {
      if (polyline.kind === 'boundary') {
        this.line(p, layer, polyline, RGB.boundary, 0.9, 0.22 * alpha);
      }
    }
  }

  private drawLand(p: p5, layer: LayerParams, alpha: number): void {
    for (const polyline of this.map.boundary) {
      if (polyline.kind === 'boundary') {
        this.polygon(p, layer, polyline, [...RGB.mapBg, 214 * alpha], -0.3);
      } else if (polyline.kind === 'core') {
        this.polygon(p, layer, polyline, [...RGB.district, 82 * alpha], 0);
      }
    }
  }

  private transform(layer: LayerParams, point: Vec2): [number, number] {
    return [
      layer.anchor.x + (point.x - layer.anchor.x) * layer.worldScale,
      layer.anchor.y + (point.y - layer.anchor.y) * layer.worldScale,
    ];
  }

  private line(
    p: p5,
    layer: LayerParams,
    polyline: MapPolyline,
    color: readonly [number, number, number],
    pixels: number,
    alpha: number,
  ): void {
    if (alpha <= 0.002 || polyline.points.length < 2) return;
    p.noFill();
    p.stroke(color[0], color[1], color[2], clamp255(alpha * 255));
    p.strokeWeight(pixels / layer.pxPerUnit);
    p.beginShape();
    for (const point of polyline.points) {
      const [x, y] = this.transform(layer, point);
      p.vertex(x, -y, LINE_Z);
    }
    if (polyline.closed && !samePoint(polyline.points[0], polyline.points.at(-1)!)) {
      const [x, y] = this.transform(layer, polyline.points[0]);
      p.vertex(x, -y, LINE_Z);
    }
    p.endShape();
  }

  private polygon(
    p: p5,
    layer: LayerParams,
    polyline: MapPolyline,
    fill: readonly [number, number, number, number],
    z: number,
  ): void {
    if (polyline.points.length < 3) return;
    p.noStroke();
    p.fill(fill[0], fill[1], fill[2], clamp255(fill[3]));
    p.beginShape();
    for (const point of polyline.points) {
      const [x, y] = this.transform(layer, point);
      p.vertex(x, -y, z);
    }
    p.endShape(p.CLOSE);
  }
}

const LINE_Z = 0.7;
function clamp255(value: number): number {
  return value < 0 ? 0 : value > 255 ? 255 : value;
}

function samePoint(a: Vec2, b: Vec2): boolean {
  return a.x === b.x && a.y === b.y;
}
