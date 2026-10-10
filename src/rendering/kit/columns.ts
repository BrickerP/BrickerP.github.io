import type { BufferGeometry } from 'three';
import { mergeParts, placedBeam, placedBox, placedCylinder } from './geom';

export interface ColumnPerimeterOptions {
  /** Centre-to-centre width along X and depth along Z. */
  width: number;
  depth: number;
  bays: number;
  depthBays: number;
  height: number;
  radius?: number;
  y?: number;
}

/** A colonnade on all four sides. Columns and the painted lintels come back separately. */
export function createColumnPerimeter(options: ColumnPerimeterOptions): {
  columns: BufferGeometry;
  beams: BufferGeometry;
  /** Underside of the big lintel, relative to the base y. */
  lintelBottom: number;
} {
  const radius = options.radius ?? 0.16;
  const y = options.y ?? 0;
  const halfW = options.width / 2;
  const halfD = options.depth / 2;
  const columns: BufferGeometry[] = [];
  const post = (x: number, z: number) => {
    columns.push(
      placedBox(radius * 2.4, 0.16, radius * 2.4, x, y + 0.08, z),
      placedCylinder(radius * 0.92, radius, options.height, x, y + 0.16 + options.height / 2, z, 10),
    );
  };
  for (let index = 0; index <= options.bays; index += 1) {
    const x = -halfW + (options.width * index) / options.bays;
    post(x, -halfD);
    post(x, halfD);
  }
  for (let index = 1; index < options.depthBays; index += 1) {
    const z = -halfD + (options.depth * index) / options.depthBays;
    post(-halfW, z);
    post(halfW, z);
  }
  const top = y + options.height;
  const reach = radius * 2;
  const beams = [
    placedBox(options.width + reach, 0.22, 0.3, 0, top + 0.2, -halfD),
    placedBox(options.width + reach, 0.16, 0.22, 0, top + 0.4, -halfD),
    placedBox(options.width + reach, 0.22, 0.3, 0, top + 0.2, halfD),
    placedBox(0.3, 0.22, options.depth + reach, -halfW, top + 0.2, 0),
    placedBox(0.3, 0.22, options.depth + reach, halfW, top + 0.2, 0),
  ];
  return {
    columns: mergeParts(columns),
    beams: mergeParts(beams),
    lintelBottom: top + 0.09,
  };
}

/**
 * Columns on a circle, with a lintel segment between each pair. Columns and lintels come back
 * separately so a hall can paint them differently. A bay, not a column, faces -Z.
 */
export function createColumnRingParts(options: {
  radius: number;
  count: number;
  height: number;
  y?: number;
  shaft?: number;
}): { columns: BufferGeometry; beams: BufferGeometry; lintelBottom: number } {
  const y = options.y ?? 0;
  const shaft = options.shaft ?? 0.1;
  const columns: BufferGeometry[] = [];
  const beams: BufferGeometry[] = [];
  const count = Math.max(6, options.count);
  for (let index = 0; index < count; index += 1) {
    const angle = -Math.PI / 2 + ((index + 0.5) / count) * Math.PI * 2;
    const x = Math.cos(angle) * options.radius;
    const z = Math.sin(angle) * options.radius;
    columns.push(
      placedBox(shaft * 2.2, 0.12, shaft * 2.2, x, y + 0.06, z),
      placedCylinder(shaft * 0.9, shaft, options.height, x, y + 0.12 + options.height / 2, z, 8),
    );
    const next = -Math.PI / 2 + ((index + 1.5) / count) * Math.PI * 2;
    beams.push(
      placedBeam(
        x,
        y + options.height + 0.2,
        z,
        Math.cos(next) * options.radius,
        y + options.height + 0.2,
        Math.sin(next) * options.radius,
        shaft * 1.8,
      ),
    );
  }
  return {
    columns: mergeParts(columns),
    beams: mergeParts(beams),
    lintelBottom: y + options.height + 0.2 - shaft * 0.9,
  };
}

/** Posts and a handrail around a circular terrace. The radius is to the post centres. */
export function createCircularRailing(radius: number, y: number, posts = 12): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const count = Math.max(8, posts);
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2;
    const next = ((index + 1) / count) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    parts.push(placedBox(0.1, 0.46, 0.1, x, y + 0.23, z));
    parts.push(
      placedBeam(
        x,
        y + 0.4,
        z,
        Math.cos(next) * radius,
        y + 0.4,
        Math.sin(next) * radius,
        0.06,
      ),
    );
  }
  return mergeParts(parts);
}

export function createRailing(
  length: number,
  y: number,
  z: number,
  posts = 8,
): BufferGeometry {
  const parts: BufferGeometry[] = [
    placedBox(length, 0.08, 0.08, 0, y + 0.42, z),
    placedBox(length, 0.06, 0.05, 0, y + 0.22, z),
  ];
  for (let index = 0; index <= posts; index += 1) {
    const x = -length / 2 + (length / posts) * index;
    parts.push(placedBox(0.1, 0.5, 0.1, x, y + 0.25, z));
  }
  return mergeParts(parts);
}
