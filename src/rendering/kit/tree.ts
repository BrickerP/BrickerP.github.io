import { BufferAttribute, BufferGeometry, type Material, Group, Mesh } from 'three';
import { mergeParts, placedCylinder } from './geom';

export type TreeKind = 'street' | 'locust' | 'willow';

function leafCard(width: number, height: number, y: number, rotationY: number): BufferGeometry {
  const geometry = new BufferGeometry();
  const positions = new Float32Array([
    -width / 2, 0, 0,
    width / 2, 0, 0,
    width / 2, height, 0,
    -width / 2, height, 0,
  ]);
  const uvs = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]);
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
  geometry.setAttribute('normal', new BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]), 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3, 0, 2, 1, 0, 3, 2]);
  geometry.translate(0, y, 0);
  geometry.rotateY(rotationY);
  return geometry;
}

/** Trunk, main limbs, and three crossing leaf masses. */
export function createTree(height: number, kind: TreeKind = 'street'): {
  wood: BufferGeometry;
  leaves: BufferGeometry;
} {
  const lean = kind === 'willow' ? 0.35 : kind === 'locust' ? 0.22 : 0.08;
  const trunk = placedCylinder(height * 0.035, height * 0.055, height * 0.62, 0, height * 0.31, 0, 8, 0, lean * 0.4);
  const crown = height * 0.72;
  const wood = mergeParts([
    trunk,
    placedCylinder(height * 0.02, height * 0.028, height * 0.34, lean * height * 0.12, crown, 0.05, 6, 0, lean),
    placedCylinder(height * 0.016, height * 0.022, height * 0.28, -lean * height * 0.05, crown * 0.92, -0.12, 6, 0, -lean * 0.8),
    placedCylinder(0.02, 0.03, height * 0.22, lean * height * 0.2, crown * 0.8, 0.16, 6, 0, lean * 1.2),
  ]);
  const leafWidth = kind === 'willow' ? height * 0.28 : height * 0.42;
  const leafHeight = kind === 'willow' ? height * 0.55 : height * 0.32;
  const leafY = kind === 'willow' ? crown * 0.55 : crown * 0.82;
  const leaves = mergeParts([
    leafCard(leafWidth, leafHeight, leafY, 0),
    leafCard(leafWidth * 0.9, leafHeight, leafY - 0.05, Math.PI / 3),
    leafCard(leafWidth * 0.85, leafHeight * 0.9, leafY - 0.08, -Math.PI / 3),
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
  group.add(wood, leaves);
  return group;
}
