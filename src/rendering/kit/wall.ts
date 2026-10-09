import { BufferGeometry, Float32BufferAttribute } from 'three';
import { mergeParts, placedBox, placedCylinder, placedFrustum } from './geom';

export interface CityWallOptions {
  length: number;
  height: number;
  depth: number;
  merlons?: number;
}

/** A solid battered wall. The face runs from the ground to the parapet bed. */
export function createCityWall(options: CityWallOptions): BufferGeometry {
  const { length, height, depth } = options;
  const body = height * 0.94;
  return mergeParts([
    placedFrustum(length, length * 0.985, depth, depth * 0.9, body, 0, body / 2, 0),
    placedBox(length * 0.99, 0.14, depth * 0.62, 0, body * 0.58, 0),
  ]);
}

export interface HallOpening {
  x?: number;
  width: number;
  height: number;
  /** Bottom of the hole, metres above the shell base. */
  y?: number;
}

/**
 * A hall shell: back wall, two sides, and a front on -Z.
 * Openings are gaps in the front so a door or arch can sit in the bay.
 */
export function createEnclosedHall(
  width: number,
  height: number,
  depth: number,
  openings: HallOpening[] = [],
): BufferGeometry {
  const thickness = 0.16;
  const parts: BufferGeometry[] = [
    placedBox(width, height, thickness, 0, height / 2, depth / 2 - thickness / 2),
    placedBox(thickness, height, depth, -width / 2 + thickness / 2, height / 2, 0),
    placedBox(thickness, height, depth, width / 2 - thickness / 2, height / 2, 0),
  ];
  const frontZ = -depth / 2 + thickness / 2;
  const sorted = [...openings].sort((left, right) => (left.x ?? 0) - (right.x ?? 0));
  if (sorted.length === 0) {
    parts.push(placedBox(Math.max(0.1, width - thickness * 2), height, thickness, 0, height / 2, frontZ));
    return mergeParts(parts);
  }
  let cursor = -width / 2;
  for (const opening of sorted) {
    const center = opening.x ?? 0;
    const left = center - opening.width / 2;
    const right = center + opening.width / 2;
    const bottom = opening.y ?? 0;
    if (left - cursor > 0.05) {
      const span = left - cursor;
      parts.push(placedBox(span, height, thickness, cursor + span / 2, height / 2, frontZ));
    }
    if (bottom > 0.05) {
      parts.push(placedBox(opening.width, bottom, thickness, center, bottom / 2, frontZ));
    }
    const top = bottom + opening.height;
    if (height - top > 0.05) {
      const span = height - top;
      parts.push(placedBox(opening.width, span, thickness, center, top + span / 2, frontZ));
    }
    cursor = Math.max(cursor, right);
  }
  if (width / 2 - cursor > 0.05) {
    const span = width / 2 - cursor;
    parts.push(placedBox(span, height, thickness, cursor + span / 2, height / 2, frontZ));
  }
  return mergeParts(parts);
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
  const bed = options.height * 0.94;
  const merlonHeight = 0.58;
  for (let index = 0; index < merlons; index += 1) {
    const x = -options.length / 2 + (options.length / merlons) * (index + 0.5);
    parts.push(
      placedBox(0.72, merlonHeight, options.depth * 0.46, x, bed + merlonHeight / 2 - 0.1, 0),
    );
  }
  return mergeParts(parts);
}

/**
 * An open semicircular vault, springing on the X axis and running through Z.
 * Ribs stay inside the ring thickness so the carriageway is not pinched.
 */
export function createArch(radius: number, depth: number, thickness = 0.28): BufferGeometry {
  const segments = 48;
  const positions: number[] = [];
  const indices: number[] = [];
  const inner = Math.max(0.2, radius - thickness / 2);
  const outer = radius + thickness / 2;
  const z0 = -depth / 2;
  const z1 = depth / 2;
  const add = (x: number, y: number, z: number) => {
    positions.push(x, y, z);
    return positions.length / 3 - 1;
  };
  const quad = (a: number, b: number, c: number, d: number) => {
    indices.push(a, b, c, a, c, d);
  };
  for (let index = 0; index < segments; index += 1) {
    const a0 = Math.PI * (index / segments);
    const a1 = Math.PI * ((index + 1) / segments);
    const c0 = Math.cos(a0);
    const s0 = Math.sin(a0);
    const c1 = Math.cos(a1);
    const s1 = Math.sin(a1);
    const innerFront0 = add(c0 * inner, s0 * inner, z0);
    const outerFront0 = add(c0 * outer, s0 * outer, z0);
    const innerFront1 = add(c1 * inner, s1 * inner, z0);
    const outerFront1 = add(c1 * outer, s1 * outer, z0);
    const innerBack0 = add(c0 * inner, s0 * inner, z1);
    const outerBack0 = add(c0 * outer, s0 * outer, z1);
    const innerBack1 = add(c1 * inner, s1 * inner, z1);
    const outerBack1 = add(c1 * outer, s1 * outer, z1);
    quad(innerFront0, outerFront0, outerFront1, innerFront1);
    quad(outerBack0, innerBack0, innerBack1, outerBack1);
    quad(outerFront0, outerBack0, outerBack1, outerFront1);
    quad(innerBack0, innerFront0, innerFront1, innerBack1);
  }
  const ring = new BufferGeometry();
  ring.setAttribute('position', new Float32BufferAttribute(new Float32Array(positions), 3));
  ring.setIndex(indices);
  ring.computeVertexNormals();
  return ring;
}

/** Dark vault so a gate opening has depth instead of a flat gap. */
export function createVault(radius: number, depth: number): BufferGeometry {
  return placedCylinder(radius * 0.92, radius * 0.92, depth, 0, radius * 0.15, 0, 12, Math.PI / 2);
}
