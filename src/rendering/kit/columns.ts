import type { BufferGeometry } from 'three';
import { mergeParts, placedBox, placedCylinder } from './geom';

export interface ColumnRowOptions {
  bays: number;
  bayWidth: number;
  depth: number;
  height: number;
  radius?: number;
  y?: number;
}

/** A colonnade: bases, entasis shafts, and a lintel tying the bays. */
export function createColumnRow(options: ColumnRowOptions): BufferGeometry {
  const radius = options.radius ?? 0.16;
  const y = options.y ?? 0;
  const parts: BufferGeometry[] = [];
  const count = options.bays + 1;
  const span = options.bays * options.bayWidth;
  for (let index = 0; index < count; index += 1) {
    const x = -span / 2 + index * options.bayWidth;
    for (const z of [-options.depth / 2, options.depth / 2]) {
      parts.push(
        placedBox(radius * 2.4, 0.16, radius * 2.4, x, y + 0.08, z),
        placedCylinder(radius * 0.92, radius, options.height, x, y + 0.16 + options.height / 2, z, 10),
      );
    }
  }
  parts.push(
    placedBox(span + radius * 2, 0.22, 0.28, 0, y + options.height + 0.2, -options.depth / 2),
    placedBox(span + radius * 2, 0.16, 0.22, 0, y + options.height + 0.38, -options.depth / 2),
    placedBox(span + radius * 2, 0.22, 0.28, 0, y + options.height + 0.2, options.depth / 2),
  );
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
