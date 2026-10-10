import type { BufferGeometry } from 'three';
import { mergeParts, placedBox } from './geom';

/**
 * A name board: gold frame, corner caps, and a small canopy with two hooks.
 * The painted characters sit on a separate panel in the opening, facing -Z.
 * The top of the canopy is `height / 2 + 0.23`, which is where the lintel meets the hooks.
 */
export function createPlaqueFrame(width: number, height: number): BufferGeometry {
  const border = 0.09;
  const depth = 0.14;
  const side = Math.max(0.04, height - border * 2);
  const parts = [
    placedBox(width, border, depth, 0, height / 2 - border / 2, 0),
    placedBox(width, border, depth, 0, -height / 2 + border / 2, 0),
    placedBox(border, side, depth, -width / 2 + border / 2, 0, 0),
    placedBox(border, side, depth, width / 2 - border / 2, 0, 0),
    placedBox(width + 0.34, 0.07, 0.36, 0, height / 2 + 0.13, 0.02),
    placedBox(width + 0.1, 0.06, 0.14, 0, height / 2 + 0.2, 0.02),
  ];
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      parts.push(placedBox(0.17, 0.17, 0.2, sx * (width / 2 - 0.05), sy * (height / 2 - 0.05), 0));
    }
    parts.push(placedBox(0.05, 0.14, 0.05, sx * (width / 2 - 0.3), height / 2 + 0.07, 0));
  }
  return mergeParts(parts);
}

/** Total height above the board centre, so callers can seat the canopy under a lintel. */
export function plaqueCanopyTop(height: number): number {
  return height / 2 + 0.23;
}
