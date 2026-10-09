import type { BufferGeometry } from 'three';
import { mergeParts, placedBox, placedCylinder } from './geom';

/**
 * Base, shaft, a closing ring, and a bowl.
 * The glowing head is a separate unlit mesh seated in the bowl, on the shaft axis.
 */
export function createLampPole(): BufferGeometry {
  return mergeParts([
    placedBox(0.28, 0.08, 0.28, 0, 0.04, 0),
    placedCylinder(0.055, 0.075, 3.45, 0, 1.8, 0, 10),
    placedCylinder(0.09, 0.12, 0.14, 0, 3.59, 0, 10),
    placedCylinder(0.16, 0.14, 0.08, 0, 3.68, 0, 12),
  ]);
}
