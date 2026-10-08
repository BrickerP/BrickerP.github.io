import { BufferGeometry, Group, Matrix4, Mesh, PlaneGeometry, type Material } from 'three';
import { mergeParts, placedCylinder } from './geom';

export type TreeKind = 'street' | 'locust' | 'willow';

function leafCard(
  width: number,
  height: number,
  x: number,
  y: number,
  z: number,
  rotY: number,
  rotX = 0,
): BufferGeometry {
  const geometry = new PlaneGeometry(width, height);
  const matrix = new Matrix4().makeRotationY(rotY).multiply(new Matrix4().makeRotationX(rotX));
  matrix.setPosition(x, y, z);
  geometry.applyMatrix4(matrix);
  return geometry;
}

/** Tapered trunk, main limbs, secondary twigs, and three crossed leaf discs. */
export function createTree(height: number, kind: TreeKind = 'street'): {
  wood: BufferGeometry;
  leaves: BufferGeometry;
} {
  const lean = kind === 'willow' ? 0.42 : kind === 'locust' ? 0.28 : 0.08;
  const droop = kind === 'willow' ? 0.85 : 0.12;
  const crown = height * 0.7;
  const wood = mergeParts([
    placedCylinder(height * 0.03, height * 0.055, height * 0.62, 0, height * 0.31, 0, 8, 0, lean * 0.35),
    placedCylinder(height * 0.016, height * 0.026, height * 0.32, lean * height * 0.12, crown, 0.04, 6, 0, lean),
    placedCylinder(height * 0.014, height * 0.02, height * 0.26, -lean * height * 0.08, crown * 0.9, -0.1, 6, 0, -lean * 0.7),
    placedCylinder(0.018, 0.026, height * 0.2, lean * height * 0.18, crown * 0.78, 0.14, 6, 0, lean * 1.1),
    placedCylinder(0.012, 0.018, height * 0.16, lean * height * 0.22, crown * 0.62, -0.08, 5, 0.4, lean),
    placedCylinder(0.012, 0.016, height * 0.14, -lean * height * 0.12, crown * 0.66, 0.12, 5, -0.3, -lean * 0.5),
  ]);
  const leafWidth = kind === 'willow' ? height * 0.34 : height * 0.5;
  const leafHeight = kind === 'willow' ? height * 0.62 : height * 0.4;
  const leafY = kind === 'willow' ? crown * 0.42 : crown * 0.78;
  const leafX = lean * height * 0.12;
  const leaves = mergeParts([
    leafCard(leafWidth, leafHeight, leafX, leafY, 0, 0, droop),
    leafCard(leafWidth * 0.92, leafHeight * 0.92, leafX, leafY - height * 0.02, 0.04, 1.05, droop * 0.85),
    leafCard(leafWidth * 0.88, leafHeight * 0.9, leafX, leafY - height * 0.04, -0.03, 2.1, droop * 0.7),
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
