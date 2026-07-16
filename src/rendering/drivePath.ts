import {
  BufferGeometry,
  CatmullRomCurve3,
  Float32BufferAttribute,
  Vector3,
} from 'three';

/**
 * A locally-authored, closed street circuit in abstract city units. The curve
 * is intentionally broad and self-contained: it suggests a tour around central
 * Beijing without claiming geographic accuracy or loading map data.
 */
const CONTROL_POINTS = [
  [0, -214],
  [78, -208],
  [154, -178],
  [205, -116],
  [228, -30],
  [221, 66],
  [188, 151],
  [126, 211],
  [38, 241],
  [-60, 230],
  [-143, 190],
  [-201, 121],
  [-227, 37],
  [-217, -53],
  [-176, -136],
  [-104, -190],
].map(([x, z]) => new Vector3(x, 0, z));

export const DRIVE_PATH = new CatmullRomCurve3(
  CONTROL_POINTS,
  true,
  'catmullrom',
  0.18,
);

export interface PathFrame {
  point: Vector3;
  tangent: Vector3;
  normal: Vector3;
}

export interface PathRibbonOptions {
  from?: number;
  to?: number;
  centerScale?: number;
  segments?: number;
}

export function wrapProgress(value: number): number {
  return ((value % 1) + 1) % 1;
}

/** Sample a stable horizontal frame on the closed road. */
export function samplePathFrame(
  progress: number,
  target: PathFrame = {
    point: new Vector3(),
    tangent: new Vector3(),
    normal: new Vector3(),
  },
): PathFrame {
  const t = wrapProgress(progress);
  DRIVE_PATH.getPointAt(t, target.point);
  DRIVE_PATH.getTangentAt(t, target.tangent).setY(0).normalize();
  target.normal.set(-target.tangent.z, 0, target.tangent.x).normalize();
  return target;
}

/** Heading for a local object's +Z axis to follow the drive direction. */
export function pathHeading(tangent: Vector3): number {
  return Math.atan2(tangent.x, tangent.z);
}

/**
 * Build a path-following horizontal ribbon between two signed offsets. Full
 * and partial spans share this helper for roads, sidewalks, water and flyovers.
 */
export function createPathRibbon(
  minOffset: number,
  maxOffset: number,
  y: number,
  {
    from = 0,
    to = 1,
    centerScale = 1,
    segments = 384,
  }: PathRibbonOptions = {},
): BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const frame = samplePathFrame(0);

  for (let index = 0; index <= segments; index += 1) {
    const mix = index / segments;
    const progress = from + (to - from) * mix;
    samplePathFrame(progress, frame);
    for (const [side, offset] of [minOffset, maxOffset].entries()) {
      positions.push(
        frame.point.x * centerScale + frame.normal.x * offset,
        y,
        frame.point.z * centerScale + frame.normal.z * offset,
      );
      uvs.push(mix, side);
    }
  }

  for (let index = 0; index < segments; index += 1) {
    const left = index * 2;
    indices.push(left, left + 1, left + 2, left + 1, left + 3, left + 2);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}
