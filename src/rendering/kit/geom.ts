import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  LatheGeometry,
  Matrix4,
  Quaternion,
  Vector2,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const matrix = new Matrix4();

/** A unit part moved into local building space. Callers merge, then dispose the parts. */
export function placedBox(
  width: number,
  height: number,
  depth: number,
  x: number,
  y: number,
  z: number,
  rotationY = 0,
  rotationZ = 0,
): BufferGeometry {
  const geometry = new BoxGeometry(width, height, depth);
  matrix.makeRotationY(rotationY);
  if (rotationZ !== 0) {
    const tilt = new Matrix4().makeRotationZ(rotationZ);
    matrix.multiply(tilt);
  }
  matrix.setPosition(x, y, z);
  geometry.applyMatrix4(matrix);
  return geometry;
}

export function placedCylinder(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  x: number,
  y: number,
  z: number,
  segments = 10,
  rotationX = 0,
  rotationZ = 0,
): BufferGeometry {
  const geometry = new CylinderGeometry(radiusTop, radiusBottom, height, segments);
  matrix.identity();
  if (rotationX !== 0) matrix.makeRotationX(rotationX);
  if (rotationZ !== 0) {
    const tilt = new Matrix4().makeRotationZ(rotationZ);
    matrix.multiply(tilt);
  }
  matrix.setPosition(x, y, z);
  geometry.applyMatrix4(matrix);
  return geometry;
}

export function placedLathe(
  points: Array<[number, number]>,
  x: number,
  y: number,
  z: number,
  segments = 16,
  scale = 1,
): BufferGeometry {
  const geometry = new LatheGeometry(
    points.map(([radius, height]) => new Vector2(radius, height)),
    segments,
  );
  matrix.makeScale(scale, scale, scale);
  matrix.setPosition(x, y, z);
  geometry.applyMatrix4(matrix);
  return geometry;
}

/** A beam from A to B. Thickness stays off the endpoints by half its section. */
export function placedBeam(
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  thickness: number,
): BufferGeometry {
  const direction = new Vector3(bx - ax, by - ay, bz - az);
  const length = direction.length();
  if (length < 1e-4) return new BoxGeometry(thickness, thickness, thickness);
  direction.multiplyScalar(1 / length);
  const geometry = new BoxGeometry(thickness, length, thickness);
  const quaternion = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction);
  matrix.makeRotationFromQuaternion(quaternion);
  matrix.setPosition((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
  geometry.applyMatrix4(matrix);
  return geometry;
}

/**
 * A wall body wider at the base. Y is the centre. Normals point outward
 * so a FrontSide brick wall stays visible at night.
 */
export function placedFrustum(
  bottomWidth: number,
  topWidth: number,
  bottomDepth: number,
  topDepth: number,
  height: number,
  x: number,
  y: number,
  z: number,
): BufferGeometry {
  const y0 = y - height / 2;
  const y1 = y + height / 2;
  const hw0 = bottomWidth / 2;
  const hw1 = topWidth / 2;
  const hd0 = bottomDepth / 2;
  const hd1 = topDepth / 2;
  const bottom = [
    [x - hw0, y0, z - hd0],
    [x + hw0, y0, z - hd0],
    [x + hw0, y0, z + hd0],
    [x - hw0, y0, z + hd0],
  ];
  const top = [
    [x - hw1, y1, z - hd1],
    [x + hw1, y1, z - hd1],
    [x + hw1, y1, z + hd1],
    [x - hw1, y1, z + hd1],
  ];
  const positions: number[] = [];
  const indices: number[] = [];
  const face = (a: number[], b: number[], c: number[], d: number[]) => {
    const base = positions.length / 3;
    for (const point of [a, b, c, d]) positions.push(point[0], point[1], point[2]);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  face(bottom[0], bottom[1], top[1], top[0]);
  face(bottom[2], bottom[1], top[1], top[2]);
  face(bottom[3], bottom[2], top[2], top[3]);
  face(bottom[0], bottom[3], top[3], top[0]);
  face(top[3], top[2], top[1], top[0]);
  face(bottom[0], bottom[1], bottom[2], bottom[3]);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(positions), 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Merge parts and dispose them. One draw for a constructed assembly. */
export function mergeParts(parts: BufferGeometry[]): BufferGeometry {
  const live = parts.filter((part) => part !== undefined);
  if (live.length === 0) return new BoxGeometry(0.05, 0.05, 0.05);
  for (const part of live) {
    if (!part.getAttribute('uv')) {
      const count = part.getAttribute('position').count;
      part.setAttribute('uv', new Float32BufferAttribute(new Float32Array(count * 2), 2));
    }
  }
  const merged = mergeGeometries(live, false);
  for (const part of live) part.dispose();
  if (!merged) throw new Error('parametric kit failed to merge geometry');
  merged.computeVertexNormals();
  merged.computeBoundingSphere();
  return merged;
}
