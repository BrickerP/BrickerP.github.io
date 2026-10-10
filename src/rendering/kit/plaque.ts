import type { BufferGeometry } from 'three';
import { mergeParts, placedBox } from './geom';

/**
 * A name board: gold frame and two corbels.
 * The painted characters sit on a separate panel in the opening, facing -Z.
 */
export function createPlaqueFrame(width: number, height: number): BufferGeometry {
  const border = 0.09;
  const depth = 0.14;
  const inset = Math.min(0.18, Math.max(0.08, width * 0.2));
  const side = Math.max(0.04, height - border * 2);
  return mergeParts([
    placedBox(width, border, depth, 0, height / 2 - border / 2, 0),
    placedBox(width, border, depth, 0, -height / 2 + border / 2, 0),
    placedBox(border, side, depth, -width / 2 + border / 2, 0, 0),
    placedBox(border, side, depth, width / 2 - border / 2, 0, 0),
    placedBox(0.1, 0.14, 0.1, -width / 2 + inset, -height / 2 - 0.04, 0),
    placedBox(0.1, 0.14, 0.1, width / 2 - inset, -height / 2 - 0.04, 0),
  ]);
}
