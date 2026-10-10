import { BufferAttribute, BufferGeometry } from 'three';
import { mergeParts, placedBeam, placedBox, placedCylinder, pushOriented } from './geom';

export type RoofKind = 'hip' | 'xieshan' | 'gable' | 'pyramid' | 'cone';

export interface RoofOptions {
  width: number;
  depth: number;
  rise: number;
  kind?: RoofKind;
  /** Corner lift, in metres, so the eave turns upward. */
  wingLift?: number;
  /** Tile shell thickness in metres. */
  thickness?: number;
}

interface Resolved {
  width: number;
  depth: number;
  rise: number;
  kind: RoofKind;
  wingLift: number;
  thickness: number;
}

type Point = [number, number];

/** Share of the half-width that stays a flat ridge. */
const RIDGE_SHARE: Record<RoofKind, number> = {
  hip: 0.34,
  xieshan: 0.58,
  gable: 0,
  pyramid: 0,
  cone: 0,
};

function resolve(options: RoofOptions): Resolved {
  return {
    width: options.width,
    depth: options.depth,
    rise: options.rise,
    kind: options.kind ?? 'hip',
    wingLift: options.wingLift ?? Math.min(0.5, options.width * 0.04),
    thickness: options.thickness ?? Math.min(0.26, 0.1 + options.width * 0.012),
  };
}

/** Steep near the ridge and flat toward the eave: the 举折 curve. 0 at the ridge, 1 at the eave. */
function juzhe(span: number): number {
  const knots = [0, 0.3, 0.62, 1];
  const drop = [0, 0.44, 0.78, 1];
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
  const ridge = RIDGE_SHARE[kind];
  if (ax < ridge) return az;
  return Math.max(az, (ax - ridge) / (1 - ridge));
}

/** Only the outer half of an edge turns up, so the middle of the eave stays straight. */
function lift(share: number): number {
  const t = Math.max(0, (share - 0.5) * 2);
  return t * t;
}

function heightAt(x: number, z: number, o: Resolved): number {
  if (o.kind === 'cone') {
    const r = Math.min(1, Math.hypot(x, z) / (Math.max(o.width, o.depth) / 2));
    return o.rise * (1 - juzhe(r)) + o.wingLift * r * r;
  }
  const ax = Math.min(1, Math.abs(x) / (o.width / 2));
  const az = Math.min(1, Math.abs(z) / (o.depth / 2));
  return o.rise * (1 - juzhe(spanAt(ax, az, o.kind))) + o.wingLift * lift(ax) * lift(az);
}

/** Roof surface height above the eave plane, so an upper storey can sit inside the shell. */
export function roofHeightAt(options: RoofOptions, x: number, z: number): number {
  return heightAt(x, z, resolve(options));
}

/** A roof surface whose eave plane is y = 0. Ridges, beasts and the drip board are separate beams. */
export function createRoofSurface(options: RoofOptions): BufferGeometry {
  const o = resolve(options);
  const cone = o.kind === 'cone';
  const columns = cone ? 24 : 16;
  const rows = cone ? 6 : 8;
  const positions: number[] = [];
  const halfW = o.width / 2;
  const halfD = o.depth / 2;
  for (let row = 0; row <= rows; row += 1) {
    for (let column = 0; column <= columns; column += 1) {
      const u = column / columns;
      const v = row / rows;
      let x = -halfW + o.width * u;
      let z = -halfD + o.depth * v;
      if (cone) {
        const radius = (1 - v) * Math.max(halfW, halfD);
        x = Math.cos(u * Math.PI * 2) * radius;
        z = Math.sin(u * Math.PI * 2) * radius;
      }
      positions.push(x, heightAt(x, z, o), z);
    }
  }
  const indices: number[] = [];
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

function sampleLine(from: Point, to: Point, count: number): Point[] {
  return Array.from({ length: count + 1 }, (_, index) => [
    from[0] + ((to[0] - from[0]) * index) / count,
    from[1] + ((to[1] - from[1]) * index) / count,
  ]);
}

function segmentsFor(from: Point, to: Point): number {
  return Math.min(9, Math.max(3, Math.round(Math.hypot(to[0] - from[0], to[1] - from[1]) / 0.85)));
}

/** A beam chain that rides the shell, so ridges never float above or sink below the tile. */
function chain(parts: BufferGeometry[], line: Point[], o: Resolved, up: number, thickness: number): void {
  for (let index = 0; index < line.length - 1; index += 1) {
    const [x0, z0] = line[index];
    const [x1, z1] = line[index + 1];
    parts.push(placedBeam(x0, heightAt(x0, z0, o) + up, z0, x1, heightAt(x1, z1, o) + up, z1, thickness));
  }
}

/** Small ridge beasts on every inner point, and a larger one at the tip. */
function beasts(parts: BufferGeometry[], line: Point[], o: Resolved, size: number): void {
  for (let index = 1; index < line.length; index += 1) {
    const [x, z] = line[index];
    const tip = index === line.length - 1;
    const s = tip ? size * 1.5 : size;
    parts.push(placedBox(s, s * 1.5, s, x, heightAt(x, z, o) + s * 1.05, z));
  }
}

/** Dragon-head ridge ends, one per side of the main ridge. */
function ridgeEnds(parts: BufferGeometry[], x: number, y: number, k: number): void {
  for (const side of [-1, 1]) {
    parts.push(
      placedBox(0.22 * k, 0.5 * k, 0.18 * k, side * x, y + 0.22 * k, 0),
      placedBox(0.13 * k, 0.28 * k, 0.13 * k, side * (x - 0.07 * k), y + 0.55 * k, 0, 0, -side * 0.5),
    );
  }
}

/** Eave board that follows the lifted corners instead of staying on one plane. */
function fascia(parts: BufferGeometry[], o: Resolved): void {
  const loop: Point[] = [];
  const halfW = o.width / 2;
  const halfD = o.depth / 2;
  if (o.kind === 'cone') {
    const radius = Math.max(halfW, halfD);
    for (let index = 0; index < 24; index += 1) {
      const angle = (index / 24) * Math.PI * 2;
      loop.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
    }
  } else {
    const across = Math.max(6, Math.round(o.width / 1.2));
    const along = Math.max(4, Math.round(o.depth / 1.2));
    for (let index = 0; index < across; index += 1) loop.push([-halfW + (o.width * index) / across, -halfD]);
    for (let index = 0; index < along; index += 1) loop.push([halfW, -halfD + (o.depth * index) / along]);
    for (let index = 0; index < across; index += 1) loop.push([halfW - (o.width * index) / across, halfD]);
    for (let index = 0; index < along; index += 1) loop.push([-halfW, halfD - (o.depth * index) / along]);
  }
  const board = Math.min(0.22, o.thickness + 0.06);
  for (let index = 0; index < loop.length; index += 1) {
    const [x0, z0] = loop[index];
    const [x1, z1] = loop[(index + 1) % loop.length];
    const y0 = heightAt(x0, z0, o) - o.thickness * 0.4;
    const y1 = heightAt(x1, z1, o) - o.thickness * 0.4;
    parts.push(placedBeam(x0, y0, z0, x1, y1, z1, board));
  }
}

/** Main ridge, hip ridges, ridge ends, beasts, and the drip board. */
export function createRoofFrame(options: RoofOptions): BufferGeometry {
  const o = resolve(options);
  const halfW = o.width / 2;
  const halfD = o.depth / 2;
  const k = Math.min(1.4, Math.max(0.45, o.width / 9));
  const ridgeBeam = 0.1 + 0.06 * k;
  const hipBeam = 0.08 + 0.05 * k;
  const beastSize = 0.09 + 0.05 * k;
  const parts: BufferGeometry[] = [];
  fascia(parts, o);
  if (o.kind === 'cone') {
    const reach = Math.max(halfW, halfD);
    for (let rib = 0; rib < 8; rib += 1) {
      const angle = (rib / 8) * Math.PI * 2;
      const line = sampleLine([0, 0], [Math.cos(angle) * reach, Math.sin(angle) * reach], 6);
      chain(parts, line, o, 0.04, hipBeam * 0.8);
    }
    parts.push(placedCylinder(0.05 * k + 0.03, 0.17 * k + 0.05, 0.42 * k, 0, o.rise + 0.16 * k, 0, 8));
    return mergeParts(parts);
  }
  if (o.kind === 'pyramid') {
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const end: Point = [sx * halfW * 0.985, sz * halfD * 0.985];
        const line = sampleLine([0, 0], end, segmentsFor([0, 0], end));
        chain(parts, line, o, 0.05, hipBeam);
        beasts(parts, line, o, beastSize);
      }
    }
    parts.push(placedBox(0.24 * k, 0.4 * k, 0.24 * k, 0, o.rise + 0.16 * k, 0));
    return mergeParts(parts);
  }
  if (o.kind === 'gable') {
    const half = o.width * 0.46;
    chain(parts, [[-half, 0], [half, 0]], o, 0.05, ridgeBeam);
    ridgeEnds(parts, half, o.rise, k);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const x = sx * (halfW - 0.07);
        const from: Point = [x, 0];
        const to: Point = [x, sz * halfD * 0.98];
        const line = sampleLine(from, to, segmentsFor(from, to));
        chain(parts, line, o, 0.04, hipBeam);
        beasts(parts, line, o, beastSize * 0.8);
      }
    }
    parts.push(gableBoards(o));
    return mergeParts(parts);
  }
  const ridgeEnd = RIDGE_SHARE[o.kind] * halfW;
  if (ridgeEnd > 0.05) {
    chain(parts, [[-ridgeEnd, 0], [ridgeEnd, 0]], o, 0.05, ridgeBeam);
    ridgeEnds(parts, ridgeEnd, o.rise, k);
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const from: Point = [sx * ridgeEnd, 0];
      const to: Point = [sx * halfW * 0.985, sz * halfD * 0.985];
      const line = sampleLine(from, to, segmentsFor(from, to));
      chain(parts, line, o, 0.05, hipBeam);
      beasts(parts, line, o, beastSize);
    }
  }
  if (o.kind === 'xieshan') {
    const board = o.rise * 0.42;
    for (const side of [-1, 1]) {
      parts.push(placedBox(0.08, board, halfD * 0.54, side * ridgeEnd, o.rise + 0.06 - board / 2, 0));
    }
  }
  return mergeParts(parts);
}

/** Two thin boards under the verges of a gable roof, cut to the shell profile. */
function gableBoards(o: Resolved): BufferGeometry {
  const halfD = o.depth / 2;
  const steps = 10;
  const zs: number[] = [];
  for (let step = 0; step <= steps; step += 1) zs.push(-halfD + (o.depth * step) / steps);
  const base = -0.14;
  const half = 0.06;
  const positions: number[] = [];
  const indices: number[] = [];
  const add = (x: number, y: number, z: number) => {
    positions.push(x, y, z);
    return positions.length / 3 - 1;
  };
  for (const side of [-1, 1]) {
    const x = side * (o.width / 2 - 0.07);
    const tops = zs.map((z) => heightAt(x, z, o) + 0.02);
    for (const face of [-1, 1]) {
      const fx = x + face * half;
      const toward: [number, number, number] = [face, 0, 0];
      for (let step = 0; step < steps; step += 1) {
        const a = add(fx, tops[step], zs[step]);
        const b = add(fx, base, zs[step]);
        const c = add(fx, tops[step + 1], zs[step + 1]);
        const d = add(fx, base, zs[step + 1]);
        pushOriented(positions, indices, a, b, c, toward);
        pushOriented(positions, indices, c, b, d, toward);
      }
    }
    for (let step = 0; step < steps; step += 1) {
      const a = add(x - half, tops[step], zs[step]);
      const b = add(x + half, tops[step], zs[step]);
      const c = add(x - half, tops[step + 1], zs[step + 1]);
      const d = add(x + half, tops[step + 1], zs[step + 1]);
      pushOriented(positions, indices, a, b, c, [0, 1, 0]);
      pushOriented(positions, indices, c, b, d, [0, 1, 0]);
    }
    for (const end of [0, steps]) {
      const z = zs[end];
      const a = add(x - half, tops[end], z);
      const b = add(x + half, tops[end], z);
      const c = add(x - half, base, z);
      const d = add(x + half, base, z);
      const toward: [number, number, number] = [0, 0, end === 0 ? -1 : 1];
      pushOriented(positions, indices, a, b, c, toward);
      pushOriented(positions, indices, c, b, d, toward);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function createRoof(options: RoofOptions): BufferGeometry {
  const o = resolve(options);
  return mergeParts([thickenRoof(createRoofSurface(o), o.thickness), createRoofFrame(o)]);
}
