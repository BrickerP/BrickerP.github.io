import { BufferGeometry, InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three';
import type { Group, Material } from 'three';
import { mergeParts, placedBox, placedCylinder } from './geom';

/** One bracket set: block, two arms, and a small capital. Instanced along an eave. */
export function createBracketGeometry(): BufferGeometry {
  return mergeParts([
    placedBox(0.22, 0.1, 0.22, 0, 0.05, 0),
    placedBox(0.16, 0.12, 0.46, 0, 0.14, 0),
    placedBox(0.58, 0.08, 0.16, 0, 0.2, 0),
    placedBox(0.14, 0.1, 0.34, 0, 0.28, 0),
    placedBox(0.86, 0.06, 0.12, 0, 0.34, 0),
    placedCylinder(0.05, 0.05, 0.16, 0, 0.42, 0, 6),
  ]);
}

/** Centres along a straight eave, in the eave's local X. */
export function bracketOffsets(span: number, spacing = 1.1): number[] {
  const count = Math.max(3, Math.round(span / spacing));
  const step = span / count;
  const offsets: number[] = [];
  for (let index = 0; index < count; index += 1) {
    offsets.push(-span / 2 + step * (index + 0.5));
  }
  return offsets;
}

/** One instanced row of brackets under an eave. */
export function addBracketRun(
  parent: Group,
  geometry: BufferGeometry,
  material: Material,
  y: number,
  z: number,
  span: number,
  rotationY = 0,
): void {
  const offsets = bracketOffsets(span);
  const mesh = new InstancedMesh(geometry, material, offsets.length);
  mesh.frustumCulled = false;
  const local = new Matrix4();
  const quaternion = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), rotationY);
  const scale = new Vector3(1, 1, 1);
  offsets.forEach((x, index) => {
    local.compose(new Vector3(x, y, z), quaternion, scale);
    mesh.setMatrixAt(index, local);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.userData.shadowRole = 'skip';
  parent.add(mesh);
}

/** Brackets around a circular eave. Each one faces outward. */
export function addBracketRing(
  parent: Group,
  geometry: BufferGeometry,
  material: Material,
  y: number,
  radius: number,
  count = 12,
): void {
  const total = Math.max(8, count);
  const mesh = new InstancedMesh(geometry, material, total);
  mesh.frustumCulled = false;
  mesh.userData.shadowRole = 'skip';
  const local = new Matrix4();
  const outward = new Vector3();
  const quaternion = new Quaternion();
  const scale = new Vector3(1, 1, 1);
  const forward = new Vector3(0, 0, 1);
  for (let index = 0; index < total; index += 1) {
    const angle = (index / total) * Math.PI * 2;
    outward.set(Math.cos(angle), 0, Math.sin(angle));
    quaternion.setFromUnitVectors(forward, outward);
    local.compose(outward.clone().multiplyScalar(radius).setY(y), quaternion, scale);
    mesh.setMatrixAt(index, local);
  }
  mesh.instanceMatrix.needsUpdate = true;
  parent.add(mesh);
}
