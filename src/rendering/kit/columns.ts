import { InstancedMesh, Matrix4, Quaternion, Vector3, type BufferGeometry, type Group, type Material } from 'three';
import { mergeParts, placedBeam, placedBox, placedCylinder } from './geom';

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

/** Columns on a circle, with a lintel segment between each pair. */
export function createColumnRing(options: {
  radius: number;
  count: number;
  height: number;
  y?: number;
  shaft?: number;
}): BufferGeometry {
  const y = options.y ?? 0;
  const shaft = options.shaft ?? 0.1;
  const parts: BufferGeometry[] = [];
  const count = Math.max(6, options.count);
  for (let index = 0; index < count; index += 1) {
    // Half a step, so a bay — not a column — faces the road (-Z).
    const angle = -Math.PI / 2 + ((index + 0.5) / count) * Math.PI * 2;
    const x = Math.cos(angle) * options.radius;
    const z = Math.sin(angle) * options.radius;
    parts.push(
      placedBox(shaft * 2.2, 0.12, shaft * 2.2, x, y + 0.06, z),
      placedCylinder(shaft * 0.9, shaft, options.height, x, y + 0.12 + options.height / 2, z, 8),
    );
    const next = -Math.PI / 2 + ((index + 1.5) / count) * Math.PI * 2;
    parts.push(
      placedBeam(
        x,
        y + options.height + 0.16,
        z,
        Math.cos(next) * options.radius,
        y + options.height + 0.16,
        Math.sin(next) * options.radius,
        shaft * 1.4,
      ),
    );
  }
  return mergeParts(parts);
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

/** One baluster. Repeated runs are instanced. */
export function createBalusterGeometry(): BufferGeometry {
  return mergeParts([
    placedBox(0.12, 0.42, 0.12, 0, 0.21, 0),
    placedBox(0.18, 0.06, 0.16, 0, 0.45, 0),
  ]);
}

/** A rail panel filling the bay between two balusters. */
export function createRailPanel(): BufferGeometry {
  return placedBox(0.72, 0.26, 0.05, 0, 0.2, 0);
}

/** Instanced balusters and the panels between them, along local X. */
export function addBalusterRun(
  parent: Group,
  baluster: BufferGeometry,
  panel: BufferGeometry,
  material: Material,
  y: number,
  z: number,
  span: number,
  count = 7,
): void {
  const posts = Math.max(3, count);
  const step = span / (posts - 1);
  const postMesh = new InstancedMesh(baluster, material, posts);
  const panelMesh = new InstancedMesh(panel, material, posts - 1);
  postMesh.frustumCulled = false;
  panelMesh.frustumCulled = false;
  postMesh.userData.shadowRole = 'skip';
  panelMesh.userData.shadowRole = 'skip';
  const local = new Matrix4();
  const identity = new Quaternion();
  const postScale = new Vector3(1, 1, 1);
  const panelScale = new Vector3(Math.min(1.15, (step * 0.82) / 0.72), 1, 1);
  for (let index = 0; index < posts; index += 1) {
    const x = -span / 2 + step * index;
    local.compose(new Vector3(x, y, z), identity, postScale);
    postMesh.setMatrixAt(index, local);
    if (index === posts - 1) continue;
    local.compose(new Vector3(x + step / 2, y, z), identity, panelScale);
    panelMesh.setMatrixAt(index, local);
  }
  postMesh.instanceMatrix.needsUpdate = true;
  panelMesh.instanceMatrix.needsUpdate = true;
  parent.add(postMesh, panelMesh);
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
