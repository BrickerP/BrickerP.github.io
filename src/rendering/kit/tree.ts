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
  const crown = height * 0.7;
  const wood = mergeParts([
    placedCylinder(height * 0.03, height * 0.055, height * 0.62, 0, height * 0.31, 0, 8, 0, lean * 0.35),
    placedCylinder(height * 0.016, height * 0.026, height * 0.32, lean * height * 0.12, crown, 0.04, 6, 0, lean),
    placedCylinder(height * 0.014, height * 0.02, height * 0.26, -lean * height * 0.08, crown * 0.9, -0.1, 6, 0, -lean * 0.7),
    placedCylinder(0.018, 0.026, height * 0.2, lean * height * 0.18, crown * 0.78, 0.14, 6, 0, lean * 1.1),
    placedCylinder(0.012, 0.018, height * 0.16, lean * height * 0.22, crown * 0.62, -0.08, 5, 0.4, lean),
    placedCylinder(0.012, 0.016, height * 0.14, -lean * height * 0.12, crown * 0.66, 0.12, 5, -0.3, -lean * 0.5),
  ]);
  const leafWidth = kind === 'willow' ? height * 0.42 : height * 0.46;
  const leafHeight = kind === 'willow' ? height * 0.28 : height * 0.34;
  const leafY = kind === 'willow' ? crown * 0.72 : crown * 0.82;
  const leafX = lean * height * 0.1;
  const leaves = mergeParts([
    leafCard(leafWidth, leafHeight, leafX, leafY, 0, 0, 0.15),
    leafCard(leafWidth * 0.9, leafHeight * 0.9, leafX, leafY, 0, 1.05, 0.2),
    leafCard(leafWidth * 0.85, leafHeight * 0.85, leafX, leafY - height * 0.04, 0, 2.1, 0.1),
    leafCard(leafWidth * 0.7, leafHeight * 0.75, leafX + height * 0.08, leafY - height * 0.08, 0.06, 0.4, -0.35),
    leafCard(leafWidth * 0.65, leafHeight * 0.7, leafX - height * 0.06, leafY - height * 0.1, -0.05, 1.7, -0.4),
    ...(kind === 'willow'
      ? [0, 1, 2, 3, 4].map((index) => {
          const side = index - 2;
          return leafCard(
            height * 0.16,
            height * 0.55,
            leafX + side * height * 0.08,
            crown * 0.28,
            side * 0.05,
            side * 0.4,
            1.15,
          );
        })
      : [
          leafCard(leafWidth * 0.55, leafHeight * 0.6, leafX, leafY + height * 0.06, 0.08, 0.6, 0.5),
        ]),
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
