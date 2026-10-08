import { BufferGeometry, Float32BufferAttribute } from 'three';
import { mergeParts, placedBox, placedCylinder, placedFrustum } from './geom';

export interface CityWallOptions {
  length: number;
  height: number;
  depth: number;
  merlons?: number;
}

/** A battered wall body with a waist course. Crenels are separate so they can read as stone. */
export function createCityWall(options: CityWallOptions): BufferGeometry {
  const { length, height, depth } = options;
  return mergeParts([
    placedFrustum(length, length * 0.94, depth + 0.42, depth * 0.78, height * 0.82, 0, height * 0.41, 0),
    placedBox(length * 0.98, 0.12, depth + 0.08, 0, height * 0.62, 0),
    placedBox(length * 0.96, 0.2, depth * 0.72, 0, height * 0.9, 0),
  ]);
}

/** A low courtyard wall with a tiled cap. Length runs along local X. */
export function createCourtyardWall(length: number, height = 1.45): BufferGeometry {
  return mergeParts([
    placedFrustum(length, length * 0.96, 0.42, 0.28, height * 0.86, 0, height * 0.43, 0),
    placedBox(length + 0.08, 0.1, 0.36, 0, height * 0.9, 0),
    placedBox(length + 0.02, 0.08, 0.22, 0, height * 0.98, 0),
  ]);
}

export function createMerlons(options: CityWallOptions): BufferGeometry {
  const merlons = options.merlons ?? Math.max(4, Math.round(options.length / 1.3));
  const parts: BufferGeometry[] = [];
  for (let index = 0; index < merlons; index += 1) {
    const x = -options.length / 2 + (options.length / merlons) * (index + 0.5);
    parts.push(
      placedBox(0.55, 0.48, options.depth * 0.55, x, options.height + 0.16, -options.depth * 0.12),
    );
  }
  return mergeParts(parts);
}

/**
 * An open semicircular vault, springing on the X axis and running through Z.
 * Ribs stay inside the ring thickness so the carriageway is not pinched.
 */
export function createArch(radius: number, depth: number, thickness = 0.28): BufferGeometry {
  const segments = 18;
  const positions: number[] = [];
  const indices: number[] = [];
  const inner = Math.max(0.2, radius - thickness / 2);
  const outer = radius + thickness / 2;
  const z0 = -depth / 2;
  const z1 = depth / 2;
  for (let index = 0; index <= segments; index += 1) {
    const angle = Math.PI * (index / segments);
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    positions.push(
      c * inner, s * inner, z0,
      c * outer, s * outer, z0,
      c * inner, s * inner, z1,
      c * outer, s * outer, z1,
    );
    if (index === segments) continue;
    const n = index * 4;
    indices.push(
      n + 1, n + 5, n + 3, n + 1, n + 7, n + 5,
      n, n + 2, n + 4, n + 2, n + 6, n + 4,
      n + 1, n + 3, n, n + 3, n + 2, n,
      n + 4, n + 6, n + 5, n + 6, n + 7, n + 5,
    );
  }
  const ring = new BufferGeometry();
  ring.setAttribute('position', new Float32BufferAttribute(new Float32Array(positions), 3));
  ring.setIndex(indices);
  ring.computeVertexNormals();
  const ribs: BufferGeometry[] = [ring];
  for (let index = 1; index <= 4; index += 1) {
    const angle = Math.PI * (index / 5);
    ribs.push(
      placedBox(
        thickness * 0.7,
        0.1,
        depth * 0.92,
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        0,
        0,
        angle - Math.PI / 2,
      ),
    );
  }
  return mergeParts(ribs);
}

/** Dark vault so a gate opening has depth instead of a flat gap. */
export function createVault(radius: number, depth: number): BufferGeometry {
  return placedCylinder(radius * 0.92, radius * 0.92, depth, 0, radius * 0.15, 0, 12, Math.PI / 2);
}
