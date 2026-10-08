import type { BufferGeometry } from 'three';
import { mergeParts, placedBox } from './geom';

/** A recessed window: frame, sill, and a dark opening. The glazed face is separate. */
export function createWindowOpening(width: number, height: number, depth = 0.12): BufferGeometry {
  const frame = 0.06;
  return mergeParts([
    placedBox(width, frame, depth, 0, height / 2 - frame / 2, 0),
    placedBox(width, frame, depth, 0, -height / 2 + frame / 2, 0),
    placedBox(frame, height, depth, -width / 2 + frame / 2, 0, 0),
    placedBox(frame, height, depth, width / 2 - frame / 2, 0, 0),
    placedBox(width * 0.86, height * 0.8, 0.04, 0, 0, -0.02),
  ]);
}

/** Lattice door: two leaves, a sill, and a lintel. */
export function createDoor(width: number, height: number): BufferGeometry {
  return mergeParts([
    placedBox(width, 0.08, 0.16, 0, 0.04, 0),
    placedBox(width, 0.12, 0.18, 0, height - 0.06, 0),
    placedBox(width * 0.42, height * 0.86, 0.08, -width * 0.22, height * 0.46, 0),
    placedBox(width * 0.42, height * 0.86, 0.08, width * 0.22, height * 0.46, 0),
  ]);
}

/** Narrow arrow slit used in ranks on a tower face. */
export function createArrowSlit(): BufferGeometry {
  return mergeParts([
    placedBox(0.16, 0.72, 0.18, 0, 0, 0),
    placedBox(0.08, 0.58, 0.08, 0, 0, -0.08),
  ]);
}
