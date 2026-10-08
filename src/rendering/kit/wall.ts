import { BufferGeometry, Float32BufferAttribute } from 'three';
import { mergeParts, placedBox, placedCylinder } from './geom';

export interface CityWallOptions {
  length: number;
  height: number;
  depth: number;
  merlons?: number;
}

/** A battered wall body. Crenels are separate so they can read as stone. */
export function createCityWall(options: CityWallOptions): BufferGeometry {
  return mergeParts([
    placedBox(options.length, options.height * 0.18, options.depth + 0.35, 0, options.height * 0.09, 0),
    placedBox(options.length * 0.98, options.height * 0.72, options.depth, 0, options.height * 0.5, 0),
    placedBox(options.length, 0.16, options.depth + 0.12, 0, options.height * 0.9, 0),
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

/** A continuous semicircular arch ring, opening along Z, springing on the X axis. */
export function createArch(radius: number, depth: number, thickness = 0.28): BufferGeometry {
  const segments = 16;
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
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(positions), 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Dark vault so a gate opening has depth instead of a flat gap. */
export function createVault(radius: number, depth: number): BufferGeometry {
  return placedCylinder(radius * 0.92, radius * 0.92, depth, 0, radius * 0.15, 0, 12, Math.PI / 2);
}
