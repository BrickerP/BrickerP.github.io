import type { BufferGeometry } from 'three';
import { mergeParts, placedBox, placedCylinder } from './geom';

/** Base, shaft, and a short arm. The glowing head stays a separate unlit mesh. */
export function createLampPole(): BufferGeometry {
  return mergeParts([
    placedBox(0.28, 0.08, 0.28, 0, 0.04, 0),
    placedCylinder(0.055, 0.075, 3.45, 0, 1.8, 0, 10),
    placedBox(0.42, 0.06, 0.08, 0.16, 3.52, 0),
  ]);
}
