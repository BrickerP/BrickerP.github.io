import type { BufferGeometry } from 'three';
import { mergeParts, placedBox, placedCylinder } from './geom';

export interface CityWallOptions {
  length: number;
  height: number;
  depth: number;
  merlons?: number;
}

/** A battered wall run with a parapet and crenels. */
export function createCityWall(options: CityWallOptions): BufferGeometry {
  const merlons = options.merlons ?? Math.max(4, Math.round(options.length / 1.3));
  const parts: BufferGeometry[] = [
    placedBox(options.length, options.height * 0.18, options.depth + 0.35, 0, options.height * 0.09, 0),
    placedBox(options.length * 0.98, options.height * 0.72, options.depth, 0, options.height * 0.5, 0),
    placedBox(options.length, 0.16, options.depth + 0.12, 0, options.height * 0.9, 0),
  ];
  for (let index = 0; index < merlons; index += 1) {
    const x = -options.length / 2 + (options.length / merlons) * (index + 0.5);
    parts.push(
      placedBox(0.55, 0.48, options.depth * 0.55, x, options.height + 0.16, -options.depth * 0.12),
    );
  }
  return mergeParts(parts);
}

/** A semicircular arch ring standing in the XY plane, opening toward -Z. */
export function createArch(radius: number, depth: number, thickness = 0.28): BufferGeometry {
  const segments = 8;
  const parts: BufferGeometry[] = [];
  for (let index = 0; index <= segments; index += 1) {
    const angle = Math.PI * (index / segments);
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    parts.push(placedBox(thickness, thickness, depth, x, y, 0, 0, Math.PI / 2 - angle));
  }
  return mergeParts(parts);
}

/** Dark vault so a gate opening has depth instead of a flat gap. */
export function createVault(radius: number, depth: number): BufferGeometry {
  return placedCylinder(radius * 0.92, radius * 0.92, depth, 0, radius * 0.15, 0, 12, Math.PI / 2);
}
