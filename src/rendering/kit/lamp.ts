import type { BufferGeometry } from 'three';
import { mergeParts, placedBox, placedCylinder } from './geom';

/**
 * Plinth, fluted shaft with a collar, a closing ring, a bowl, and a finial.
 * The glowing head is a separate unlit mesh seated in the bowl, on the shaft axis.
 */
export function createLampPole(): BufferGeometry {
  return mergeParts([
    placedBox(0.34, 0.1, 0.34, 0, 0.05, 0),
    placedBox(0.24, 0.16, 0.24, 0, 0.18, 0),
    placedCylinder(0.055, 0.075, 3.5, 0, 1.85, 0, 10),
    placedCylinder(0.11, 0.11, 0.1, 0, 2.4, 0, 10),
    placedCylinder(0.09, 0.12, 0.14, 0, 3.59, 0, 10),
    placedCylinder(0.16, 0.14, 0.08, 0, 3.68, 0, 12),
    placedCylinder(0.02, 0.06, 0.22, 0, 4.2, 0, 6),
  ]);
}
