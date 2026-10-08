import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  LatheGeometry,
  Matrix4,
  Vector2,
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
