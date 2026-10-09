import { BufferAttribute, BufferGeometry } from 'three';
import { mergeParts, placedBeam, placedBox, placedCylinder } from './geom';

export type RoofKind = 'hip' | 'xieshan' | 'gable' | 'pyramid' | 'cone';

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

/** Two or three straight pitches. 0 at the ridge, 1 at the eave. */
function juzhe(span: number): number {
  const knots = [0, 0.34, 0.67, 1];
  const drop = [0, 0.22, 0.55, 1];
  const t = Math.min(1, Math.max(0, span));
  for (let index = 0; index < 3; index += 1) {
    if (t <= knots[index + 1]) {
      const u = (t - knots[index]) / (knots[index + 1] - knots[index]);
      return drop[index] + (drop[index + 1] - drop[index]) * u;
    }
  }
  return 1;
}

function spanAt(ax: number, az: number, kind: RoofKind): number {
  if (kind === 'gable') return az;
  if (kind === 'pyramid' || kind === 'cone') return Math.max(ax, az);
  const ridge = kind === 'xieshan' ? 0.58 : 0.34;
  if (ax < ridge) return az;
  return Math.max(az, (ax - ridge) / (1 - ridge));
}

function heightAt(x: number, z: number, options: Required<RoofOptions>): number {
  const halfW = options.width / 2;
  const halfD = options.depth / 2;
  const ax = Math.min(1, Math.abs(x) / halfW);
  const az = Math.min(1, Math.abs(z) / halfD);
  const wing = options.wingLift * ax * ax * az * az;
  return options.rise * (1 - juzhe(spanAt(ax, az, options.kind))) + wing;
}

/** A roof surface whose eave sits on y = 0. Ridges and drip tiles are separate beams. */
export function createRoofSurface(options: RoofOptions): BufferGeometry {
  const resolved: Required<RoofOptions> = {
    width: options.width,
    depth: options.depth,
    rise: options.rise,
    kind: options.kind ?? 'hip',
    wingLift: options.wingLift ?? Math.min(0.35, options.rise * 0.18),
  };
  const columns = resolved.kind === 'cone' ? 16 : 10;
  const rows = 6;
  const positions: number[] = [];
  const indices: number[] = [];
  const halfW = resolved.width / 2;
  const halfD = resolved.depth / 2;
  for (let row = 0; row <= rows; row += 1) {
    for (let column = 0; column <= columns; column += 1) {
      const u = column / columns;
      const v = row / rows;
      if (resolved.kind === 'cone') {
        const radius = (1 - v) * Math.max(halfW, halfD);
        const angle = u * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const wing = resolved.wingLift * (1 - v) * (1 - v);
        push(positions, x, resolved.rise * (1 - juzhe(1 - v)) + wing, z);
      } else {
        const x = -halfW + resolved.width * u;
        const z = -halfD + resolved.depth * v;
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

/** One fascia board per eave, so the tile edge is a board and not a row of cubes. */
function fascia(parts: BufferGeometry[], width: number, depth: number): void {
  const halfW = width / 2;
  const halfD = depth / 2;
  const lip = 0.16;
  parts.push(
    placedBox(width + lip, 0.16, 0.14, 0, -0.06, -halfD),
    placedBox(width + lip, 0.16, 0.14, 0, -0.06, halfD),
    placedBox(0.14, 0.16, depth + lip, -halfW, -0.06, 0),
    placedBox(0.14, 0.16, depth + lip, halfW, -0.06, 0),
  );
}

/** The tile surface plus a soffit, so a roof reads as a shell instead of a sheet. */
function thickenRoof(surface: BufferGeometry, thickness: number): BufferGeometry {
  const soffit = surface.clone();
  const position = soffit.getAttribute('position');
  for (let index = 0; index < position.count; index += 1) {
    position.setY(index, position.getY(index) - thickness);
  }
  const index = soffit.getIndex();
  if (index) {
    for (let cursor = 0; cursor < index.count; cursor += 3) {
      const first = index.getX(cursor);
      index.setX(cursor, index.getX(cursor + 1));
      index.setX(cursor + 1, first);
    }
  }
  soffit.computeVertexNormals();
  return mergeParts([surface, soffit]);
}

/** Main ridge, hip or gable ridges, and a drip-tile band under the eave. */
export function createRoofFrame(options: RoofOptions): BufferGeometry {
  const kind = options.kind ?? 'hip';
  const rise = options.rise;
  const wing = options.wingLift ?? Math.min(0.35, rise * 0.18);
  const halfW = options.width / 2;
  const halfD = options.depth / 2;
  const parts: BufferGeometry[] = [];
  const yEave = wing * 0.35;
  if (kind === 'cone') {
    parts.push(placedCylinder(0.05, 0.16, 0.42, 0, rise + 0.16, 0, 8));
  } else if (kind === 'pyramid') {
    parts.push(
      placedBeam(-halfW * 0.92, yEave, 0, 0, rise, 0, 0.1),
      placedBeam(halfW * 0.92, yEave, 0, 0, rise, 0, 0.1),
      placedBeam(0, rise, 0, 0, yEave, -halfD * 0.92, 0.1),
      placedBeam(0, rise, 0, 0, yEave, halfD * 0.92, 0.1),
      placedBox(0.22, 0.34, 0.22, 0, rise + 0.12, 0),
    );
  } else if (kind === 'gable') {
    const ridge = options.width * 0.9;
    parts.push(placedBeam(-ridge / 2, rise + 0.04, 0, ridge / 2, rise + 0.04, 0, 0.14));
    for (const side of [-1, 1]) {
      parts.push(
        placedBeam(side * ridge / 2, rise, 0, side * halfW * 0.96, yEave, -halfD * 0.96, 0.09),
        placedBeam(side * ridge / 2, rise, 0, side * halfW * 0.96, yEave, halfD * 0.96, 0.09),
      );
    }
  } else {
    const ridge = options.width * (kind === 'xieshan' ? 0.56 : 0.4);
    parts.push(placedBeam(-ridge / 2, rise + 0.05, 0, ridge / 2, rise + 0.05, 0, 0.14));
    if (kind === 'xieshan') {
      const boardHeight = rise * 0.46;
      parts.push(
        placedBox(0.08, boardHeight, halfD * 0.55, ridge / 2, rise - boardHeight * 0.35, 0),
        placedBox(0.08, boardHeight, halfD * 0.55, -ridge / 2, rise - boardHeight * 0.35, 0),
      );
      const breakZ = halfD * 0.58;
      const breakY = rise * 0.5;
      for (const side of [-1, 1]) {
        for (const end of [-1, 1]) {
          parts.push(
            placedBeam(side * ridge / 2, rise, 0, side * ridge / 2, breakY, end * breakZ, 0.1),
            placedBeam(side * ridge / 2, breakY, end * breakZ, side * halfW * 0.96, yEave, end * halfD * 0.96, 0.1),
          );
        }
      }
    } else {
      for (const side of [-1, 1]) {
        for (const end of [-1, 1]) {
          parts.push(
            placedBeam(side * ridge / 2, rise, 0, side * halfW * 0.96, yEave, end * halfD * 0.96, 0.1),
          );
        }
      }
    }
  }
  if (kind !== 'cone') fascia(parts, options.width, options.depth);
  return mergeParts(parts);
}

export function createRoof(options: RoofOptions): BufferGeometry {
  return mergeParts([thickenRoof(createRoofSurface(options), 0.14), createRoofFrame(options)]);
}
