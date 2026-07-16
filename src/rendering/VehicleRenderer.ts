import type p5 from 'p5';
import type { Vec2 } from '../path/geometry';
import { RGB } from './theme';

export interface SensorState {
  pos: Vec2;
  onLine: number;
}

export interface VehicleView {
  pos: Vec2;
  angle: number;
}

export interface LayerTransform {
  anchor: Vec2;
  worldScale: number;
  alpha: number;
}

/**
 * A single ivory route marker. Sensor whiskers belong to debug mode, so the
 * normal artwork stays free of small crossing lines and 3D model noise.
 */
export class VehicleRenderer {
  draw(p: p5, vehicle: VehicleView, layer: LayerTransform): void {
    if (layer.alpha <= 0.015) return;

    const [x, y] = this.transform(layer, vehicle.pos);
    const scale = layer.worldScale;
    const length = 8.4 * scale;
    const width = 4.6 * scale;
    const alpha = clamp255(layer.alpha * 255);

    p.push();
    p.translate(x, y, 2.2 * scale);
    p.rotateZ(-vehicle.angle);

    p.noStroke();
    p.fill(RGB.text[0], RGB.text[1], RGB.text[2], alpha);
    p.ellipse(0, 0, length, width);

    // A compact warm notch makes heading legible without headlights or bloom.
    p.fill(RGB.highlight[0], RGB.highlight[1], RGB.highlight[2], alpha);
    p.triangle(
      length * 0.26,
      -width * 0.24,
      length * 0.55,
      0,
      length * 0.26,
      width * 0.24,
    );
    p.pop();
  }

  private transform(layer: LayerTransform, point: Vec2): [number, number] {
    return [
      layer.anchor.x + (point.x - layer.anchor.x) * layer.worldScale,
      -(layer.anchor.y + (point.y - layer.anchor.y) * layer.worldScale),
    ];
  }
}

function clamp255(value: number): number {
  return value < 0 ? 0 : value > 255 ? 255 : value;
}
