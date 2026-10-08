import { BufferAttribute, BufferGeometry } from 'three';
import { mergeParts, placedBox } from './geom';

export type RoofKind = 'hip' | 'gable' | 'pyramid' | 'cone';

export interface RoofOptions {
  width: number;
  depth: number;
  rise: number;
  kind?: RoofKind;
  /** Corner lift, in metres, so the eave turns upward. */
  wingLift?: number;
}

function push(positions: number[], x: number, y: number, z: number): void {
  positions.push(x, y, z);
}

function heightAt(x: number, z: number, options: Required<RoofOptions>): number {
  const halfW = options.width / 2;
  const halfD = options.depth / 2;
  const ax = Math.min(1, Math.abs(x) / halfW);
  const az = Math.min(1, Math.abs(z) / halfD);
  let span = 1;
  if (options.kind === 'gable') span = az;
  else if (options.kind === 'pyramid' || options.kind === 'cone') span = Math.max(ax, az);
  else {
    const ridge = 0.34;
    span = ax < ridge ? az : Math.max(az, (ax - ridge) / (1 - ridge));
  }
  const wing = options.wingLift * ax * ax * az * az;
  return options.rise * (1 - span) + wing;
}

/** A roof surface whose eave sits on y = 0. Ridges are separate beams. */
export function createRoofSurface(options: RoofOptions): BufferGeometry {
  const resolved: Required<RoofOptions> = {
    width: options.width,
    depth: options.depth,
    rise: options.rise,
    kind: options.kind ?? 'hip',
    wingLift: options.wingLift ?? Math.min(0.35, options.rise * 0.18),
  };
  const columns = resolved.kind === 'cone' ? 14 : 8;
  const rows = 5;
  const positions: number[] = [];
  const indices: number[] = [];
  const halfW = resolved.width / 2;
  const halfD = resolved.depth / 2;
  for (let row = 0; row <= rows; row += 1) {
    for (let column = 0; column <= columns; column += 1) {
      const u = column / columns;
      const v = row / rows;
      let x = 0;
      let z = 0;
      if (resolved.kind === 'cone') {
        const radius = (1 - v) * Math.max(halfW, halfD);
        const angle = u * Math.PI * 2;
        x = Math.cos(angle) * radius;
        z = Math.sin(angle) * radius;
        push(positions, x, v * resolved.rise, z);
      } else {
        x = -halfW + resolved.width * u;
        z = -halfD + resolved.depth * v;
        push(positions, x, heightAt(x, z, resolved), z);
      }
    }
  }
  const stride = columns + 1;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * stride + column;
      indices.push(index, index + stride, index + 1, index + 1, index + stride, index + stride + 1);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Ridge, hip beams, and a drip edge under the eave. */
export function createRoofFrame(options: RoofOptions): BufferGeometry {
  const kind = options.kind ?? 'hip';
  const rise = options.rise;
  const halfW = options.width / 2;
  const halfD = options.depth / 2;
  const parts: BufferGeometry[] = [
    placedBox(options.width + 0.3, 0.08, 0.16, 0, 0.02, -halfD),
    placedBox(options.width + 0.3, 0.08, 0.16, 0, 0.02, halfD),
    placedBox(0.16, 0.08, options.depth + 0.3, -halfW, 0.02, 0),
    placedBox(0.16, 0.08, options.depth + 0.3, halfW, 0.02, 0),
  ];
  if (kind === 'cone' || kind === 'pyramid') {
    parts.push(placedBox(0.28, 0.34, 0.28, 0, rise, 0));
  } else {
    const ridge = kind === 'gable' ? options.width * 0.92 : options.width * 0.42;
    parts.push(placedBox(ridge, 0.16, 0.22, 0, rise, 0));
    if (kind === 'hip') {
      parts.push(
        placedBox(0.14, 0.12, halfD, -ridge / 2, rise * 0.55, 0),
        placedBox(0.14, 0.12, halfD, ridge / 2, rise * 0.55, 0),
      );
    }
  }
  return mergeParts(parts);
}

export function createRoof(options: RoofOptions): BufferGeometry {
  return mergeParts([createRoofSurface(options), createRoofFrame(options)]);
}
