import { BufferGeometry, ExtrudeGeometry, Float32BufferAttribute, Shape } from 'three';
import { indexed, mergeParts, placedBox, placedFrustum } from './geom';

/**
 * A solid gate platform with a real tunnel. The opening is a rectangle that turns into a
 * half-ellipse of height `vertical` above `spring`. Faces run along X; depth runs along Z.
 * One outline with the tunnel cut into its bottom edge: a hole that touches the outline leaves a
 * zero-height strip across the carriageway that fights the road for the same pixels.
 */
export function createGatePlatform(
  span: number,
  height: number,
  depth: number,
  openingHalf: number,
  spring: number,
  vertical: number,
): BufferGeometry {
  const shape = new Shape();
  shape.moveTo(-span / 2, 0);
  shape.lineTo(-openingHalf, 0);
  shape.lineTo(-openingHalf, spring);
  shape.absellipse(0, spring, openingHalf, vertical, Math.PI, 0, true, 0);
  shape.lineTo(openingHalf, 0);
  shape.lineTo(span / 2, 0);
  shape.lineTo(span / 2, height);
  shape.lineTo(-span / 2, height);
  shape.lineTo(-span / 2, 0);
  const geometry = new ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 32 });
  geometry.translate(0, 0, -depth / 2);
  return indexed(geometry);
}

/** A stone frame around a tunnel mouth. Place one flush against each face of the platform. */
export function createGateSurround(
  openingHalf: number,
  spring: number,
  vertical: number,
  border = 0.4,
  depth = 0.26,
): BufferGeometry {
  const outer = openingHalf + border;
  const shape = new Shape();
  shape.moveTo(-outer, 0);
  shape.lineTo(-outer, spring);
  shape.absellipse(0, spring, outer, vertical + border, Math.PI, 0, true, 0);
  shape.lineTo(outer, 0);
  shape.lineTo(openingHalf, 0);
  shape.lineTo(openingHalf, spring);
  shape.absellipse(0, spring, openingHalf, vertical, 0, Math.PI, false, 0);
  shape.lineTo(-openingHalf, 0);
  shape.lineTo(-outer, 0);
  const geometry = new ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 32 });
  geometry.translate(0, 0, -depth / 2);
  return indexed(geometry);
}

/** Spacing and size of a wall bastion, shared by the generator and the placer. */
export const BUTTRESS = { reach: 1.5, length: 3.8, spacing: 16 } as const;

export interface ButtressOptions {
  /** Wall height at the face the bastion stands against. */
  height: number;
  /** Wall width at the foot and at the coping, so the bastion batters like the wall. */
  base: number;
  top: number;
}

/**
 * A projecting bastion (马面) for a wall face. It reaches toward +X, runs along Z, and its back is
 * buried in the wall. The brick body carries the crenels; plinth, string course and cap are stone.
 */
export function createButtress(options: ButtressOptions): { body: BufferGeometry; trim: BufferGeometry } {
  const { height, base, top } = options;
  const { reach, length } = BUTTRESS;
  const batter = base - top;
  const buried = 0.4;
  const frontBase = base / 2 + reach;
  const centre = (frontBase - buried) / 2;
  const widthBase = frontBase + buried;
  const widthTop = widthBase - batter;
  const lengthTop = length - batter;
  const frontTop = centre + widthTop / 2;
  const capTop = height + 0.1;
  const crenelY = capTop + 0.36;

  const body: BufferGeometry[] = [placedFrustum(widthBase, widthTop, length, lengthTop, height, centre, height / 2, 0)];
  const rows = Math.max(3, Math.round(lengthTop / 1.05));
  for (let index = 0; index < rows; index += 1) {
    const z = -lengthTop / 2 + 0.3 + (index * (lengthTop - 0.6)) / (rows - 1);
    body.push(placedBox(0.46, 0.72, 0.6, frontTop, crenelY, z));
  }
  for (const side of [-1, 1]) {
    for (const step of [1, 2]) {
      body.push(placedBox(0.6, 0.72, 0.46, frontTop - 1.05 * step, crenelY, side * (lengthTop / 2 - 0.11)));
    }
  }

  const bandY = height * 0.62;
  const widthBand = widthBase - batter * 0.62;
  const lengthBand = length - batter * 0.62;
  const frontBand = centre + widthBand / 2;
  const trim: BufferGeometry[] = [
    placedBox(widthBase + 0.2, 0.34, length + 0.2, centre, 0.17, 0),
    placedBox(0.12, 0.16, lengthBand + 0.24, frontBand + 0.04, bandY, 0),
    placedBox(widthTop + 0.16, 0.14, lengthTop + 0.16, centre, height + 0.03, 0),
  ];
  for (const side of [-1, 1]) {
    trim.push(placedBox(widthBand, 0.16, 0.12, centre, bandY, side * (lengthBand / 2 + 0.04)));
  }
  return { body: mergeParts(body), trim: mergeParts(trim) };
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
