import type p5 from 'p5';
import type { Vec2 } from '../path/geometry';
import { RGB } from './theme';

export interface SensorState {
  /** sensor tip position in CITY units. */
  pos: Vec2;
  /** 0 (far from line) .. 1 (right on the line). */
  onLine: number;
}

/** Everything needed to draw the vehicle, in raw CITY-unit space. */
export interface VehicleView {
  /** vehicle centre (city units). */
  pos: Vec2;
  /** heading angle (radians) in city space. Scale-invariant. */
  angle: number;
  left: SensorState;
  right: SensorState;
}

/** How to place a city-unit point for a given nested layer. */
export interface LayerTransform {
  anchor: Vec2;
  worldScale: number;
  /** 0..1 overall opacity for this layer's vehicle. */
  alpha: number;
}

// Body + sensor dimensions in CITY units (so the car is a fixed fraction of
// the ring at every fractal depth — true self-similarity). The 2nd ring is
// ~96×122 city units, so a ~9-unit car reads as a small vehicle on it.
const BODY_LEN = 9;
const BODY_WIDE = 4.6;
const BODY_TALL = 2.6;
const LIFT = 2.2; // hover height above the map plane (city units)

/**
 * Renders the vehicle as a simple low chamfered box that floats slightly above
 * the map plane, with a clear forward direction, faint warm headlights, and
 * two thin forward sensor whiskers whose tips glow yellow near the loop. No
 * external model, no heavy bloom.
 *
 * All sizes are CITY units multiplied by the layer's worldScale, so the car is
 * proportional to its map copy: big on the outer copy, tiny deep inside. From
 * one continuous clock this makes the car self-similar and seamless at the
 * fractal wrap.
 */
export class VehicleRenderer {
  draw(p: p5, v: VehicleView, L: LayerTransform): void {
    if (L.alpha <= 0.02) return;
    const w = L.worldScale;
    const a = clamp255(255 * L.alpha);

    const pos = this.tx(L, v.pos);
    const leftTip = this.tx(L, v.left.pos);
    const rightTip = this.tx(L, v.right.pos);

    // ---- sensor whiskers -------------------------------------------------
    this.sensor(p, pos, leftTip, v.left.onLine, w, L.alpha);
    this.sensor(p, pos, rightTip, v.right.onLine, w, L.alpha);

    // ---- vehicle body ----------------------------------------------------
    const len = BODY_LEN * w;
    const wide = BODY_WIDE * w;
    const tall = BODY_TALL * w;

    p.push();
    p.translate(pos[0], pos[1], LIFT * w + tall * 0.5);
    p.rotateZ(-v.angle); // world y is flipped, so negate heading

    // soft contact shadow just under the car (kept light so faint fractal
    // copies read as delicate marks, not dark blobs)
    p.push();
    p.translate(0, 0, -tall * 0.5 - LIFT * w * 0.6);
    p.noStroke();
    p.fill(0, 0, 0, 0.22 * a);
    p.ellipse(0, 0, len * 1.5, wide * 1.8);
    p.pop();

    // chamfered body (two stacked boxes read as a bevel, cheaply)
    p.noStroke();
    p.fill(236, 214, 152, a);
    p.box(len, wide, tall);
    p.fill(248, 228, 172, a);
    p.push();
    p.translate(0, 0, tall * 0.44);
    p.box(len * 0.68, wide * 0.72, tall * 0.72);
    p.pop();

    // forward wedge — makes the heading unmistakable
    p.fill(RGB.highlight[0], RGB.highlight[1], RGB.highlight[2], a);
    p.push();
    p.translate(len * 0.52, 0, tall * 0.05);
    p.box(len * 0.16, wide * 0.6, tall * 0.62);
    p.pop();

    // faint warm headlights
    p.fill(255, 238, 194, 0.85 * a);
    for (const side of [-1, 1]) {
      p.push();
      p.translate(len * 0.54, side * wide * 0.28, 0);
      p.box(len * 0.09, wide * 0.18, tall * 0.5);
      p.pop();
    }
    p.pop();
  }

  private tx(L: LayerTransform, pt: Vec2): [number, number] {
    const x = L.anchor.x + (pt.x - L.anchor.x) * L.worldScale;
    const y = L.anchor.y + (pt.y - L.anchor.y) * L.worldScale;
    return [x, -y];
  }

  private sensor(
    p: p5,
    origin: [number, number],
    tip: [number, number],
    glow: number,
    w: number,
    alpha: number,
  ): void {
    const r = lerp(0x5c, RGB.highlight[0], glow);
    const g = lerp(0x67, RGB.highlight[1], glow);
    const b = lerp(0x72, RGB.highlight[2], glow);
    const lift = LIFT * w;

    p.push();
    p.strokeWeight((0.7 + glow * 0.5) * w);
    p.stroke(r, g, b, (150 + glow * 95) * alpha);
    p.line(origin[0], origin[1], lift, tip[0], tip[1], lift);
    p.pop();

    // fixed-size tip node (size stable; only colour tracks state)
    p.push();
    p.translate(tip[0], tip[1], lift);
    p.noStroke();
    p.fill(r, g, b, (205 + glow * 50) * alpha);
    p.sphere(1.5 * w, 6, 4);
    p.pop();
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}
