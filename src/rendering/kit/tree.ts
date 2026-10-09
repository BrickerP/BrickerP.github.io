import { BufferGeometry, Group, Matrix4, Mesh, SphereGeometry, type Material } from 'three';
import { mergeParts, placedCylinder } from './geom';

export type TreeKind = 'street' | 'locust' | 'willow' | 'cypress';

function blob(radius: number, x: number, y: number, z: number, scaleY = 1): BufferGeometry {
  const geometry = new SphereGeometry(radius, 6, 5);
  geometry.applyMatrix4(new Matrix4().makeScale(1, scaleY, 1));
  geometry.translate(x, y, z);
  return geometry;
}

/** Tapered trunk and a volumetric crown. Willows hang; cypresses stack. */
export function createTree(height: number, kind: TreeKind = 'street'): {
  wood: BufferGeometry;
  leaves: BufferGeometry;
} {
  const lean = kind === 'willow' ? 0.35 : kind === 'cypress' ? 0.02 : kind === 'locust' ? 0.22 : 0.08;
  const crown = height * (kind === 'cypress' ? 0.86 : 0.7);
  const wood = mergeParts([
    placedCylinder(height * 0.028, height * 0.05, height * 0.62, 0, height * 0.31, 0, 8, 0, lean * 0.35),
    placedCylinder(height * 0.014, height * 0.024, height * 0.28, lean * height * 0.1, crown, 0.04, 6, 0, lean),
    placedCylinder(height * 0.012, height * 0.018, height * 0.22, -lean * height * 0.06, crown * 0.88, -0.08, 6, 0, -lean * 0.6),
  ]);
  const leafX = lean * height * 0.08;
  const leaves =
    kind === 'cypress'
      ? mergeParts([
          blob(height * 0.16, 0, height * 0.42, 0, 1.3),
          blob(height * 0.13, 0, height * 0.58, 0, 1.35),
          blob(height * 0.1, 0, height * 0.74, 0, 1.4),
          blob(height * 0.06, 0, height * 0.88, 0, 1.5),
        ])
      : kind === 'willow'
        ? mergeParts([
            blob(height * 0.16, leafX, crown * 0.78, 0, 0.7),
            blob(height * 0.1, leafX - height * 0.08, crown * 0.48, 0.04, 1.7),
            blob(height * 0.09, leafX + height * 0.06, crown * 0.42, -0.05, 1.8),
            blob(height * 0.08, leafX, crown * 0.32, 0.08, 1.9),
            blob(height * 0.07, leafX + height * 0.1, crown * 0.36, 0.02, 1.6),
            blob(height * 0.07, leafX - height * 0.04, crown * 0.28, -0.06, 1.7),
          ])
        : mergeParts([
            blob(height * 0.22, leafX, crown * 0.9, 0, 0.85),
            blob(height * 0.16, leafX + height * 0.12, crown * 0.78, 0.06, 0.9),
            blob(height * 0.15, leafX - height * 0.1, crown * 0.74, -0.05, 0.9),
            blob(height * 0.12, leafX, crown * 0.62, 0.08, 0.8),
            blob(height * 0.1, leafX + height * 0.06, crown * 1.02, -0.04, 0.75),
          ]);
  return { wood, leaves };
}

export function createTreeGroup(
  height: number,
  kind: TreeKind,
  woodMaterial: Material,
  leafMaterial: Material,
): Group {
  const parts = createTree(height, kind);
  const group = new Group();
  const wood = new Mesh(parts.wood, woodMaterial);
  const leaves = new Mesh(parts.leaves, leafMaterial);
  wood.userData.shadowRole = 'skip';
  leaves.userData.shadowRole = 'skip';
  group.add(wood, leaves);
  return group;
}
