import {
  CylinderGeometry,
  Group,
  Mesh,
  type BufferGeometry,
  type Material,
  type MeshStandardMaterial,
  type Object3D,
} from 'three';
import type { SurfaceAtlasId } from './surfaceTextures';
import type { PassageHeroContract } from './spatialContract';

/**
 * Helpers a passage module may use. New poster geometry belongs in a module
 * like this one, not as another method on the drive scene.
 */
export interface FabricKit {
  place(
    object: Object3D,
    progress: number,
    offset: number,
    y: number,
    headingOffset?: number,
  ): void;
  box(width: number, height: number, depth: number, material: Material): Mesh;
  cylinder(radius: number, height: number, material: Material): Mesh;
  standard(
    color: string,
    options?: {
      emissive?: string;
      emissiveIntensity?: number;
      metalness?: number;
      roughness?: number;
    },
  ): MeshStandardMaterial;
  textured(
    color: string,
    atlasId: SurfaceAtlasId,
    options?: {
      emissive?: string;
      emissiveIntensity?: number;
      metalness?: number;
      roughness?: number;
    },
  ): MeshStandardMaterial;
  tagHero(object: Object3D): void;
  add(object: Object3D): void;
  upturnedRoof(
    width: number,
    height: number,
    depth: number,
    material: Material,
  ): Mesh;
  windowMaterial: Material;
  trackGeometry<T extends BufferGeometry>(geometry: T): T;
}

/** Nanluo poster: one tea house above the low shop row, plus the two named gates. */
export function buildNanluoTeaHouse(kit: FabricKit, hero: PassageHeroContract): void {
  const brick = kit.textured('#5A6365', 'brick', { roughness: 1 });
  const timber = kit.standard('#4A3A28', { roughness: 0.94 });
  const roof = kit.textured('#4A5352', 'tileRoof', { roughness: 1 });
  const opening = kit.standard('#14110E', { roughness: 1 });

  const house = new Group();
  kit.place(house, hero.progress, hero.lateralOffset, 0);
  house.scale.setScalar(hero.scale);

  const body = kit.box(4.4, 4.05, 3.5, brick);
  body.position.set(0, 2.02, 0);
  const upper = kit.box(4.05, 2.15, 3.15, timber);
  upper.position.set(0, 5.05, 0);
  const eave = kit.upturnedRoof(3.6, 1.15, 5.2, roof);
  eave.position.y = 6.55;
  const finial = kit.cylinder(0.06, 0.7, timber);
  finial.position.y = 7.45;

  const moonGate = new Mesh(
    kit.trackGeometry(new CylinderGeometry(0.78, 0.78, 0.16, 20)),
    timber,
  );
  moonGate.rotation.z = Math.PI / 2;
  moonGate.position.set(2.22, 1.55, 0);
  const moonVoid = new Mesh(
    kit.trackGeometry(new CylinderGeometry(0.62, 0.62, 0.2, 20)),
    opening,
  );
  moonVoid.rotation.z = Math.PI / 2;
  moonVoid.position.set(2.28, 1.55, 0);
  const upperPane = kit.box(0.08, 0.7, 1.5, kit.windowMaterial);
  upperPane.position.set(2.05, 5.05, 0);

  house.add(body, upper, eave, finial, moonGate, moonVoid, upperPane);
  kit.tagHero(house);
  kit.add(house);
}

/** Qianmen poster: the pailou still leads; this gate is the one shop that is not a repeated bay. */
export function buildDashilarGate(kit: FabricKit, hero: PassageHeroContract): void {
  const brick = kit.textured('#5C4038', 'brick', { roughness: 0.92 });
  const timber = kit.standard('#3F3224', { roughness: 0.95 });
  const roof = kit.textured('#3A4341', 'tileRoof', { roughness: 1 });
  const voidMat = kit.standard('#120E0C', { roughness: 1 });

  const gate = new Group();
  kit.place(gate, hero.progress, hero.lateralOffset, 0);
  gate.scale.setScalar(hero.scale);

  const pierL = kit.box(0.7, 4.4, 2.4, brick);
  pierL.position.set(-1.7, 2.2, 0);
  const pierR = kit.box(0.7, 4.4, 2.4, brick);
  pierR.position.set(1.7, 2.2, 0);
  const lintel = kit.box(4.4, 0.55, 2.6, timber);
  lintel.position.y = 4.55;
  const arch = new Mesh(
    kit.trackGeometry(
      new CylinderGeometry(1.15, 1.15, 0.42, 16, 1, false, 0, Math.PI),
    ),
    brick,
  );
  arch.rotation.z = Math.PI / 2;
  arch.rotation.y = Math.PI / 2;
  arch.position.set(0, 3.35, 1.15);
  const throat = kit.box(1.7, 2.5, 0.2, voidMat);
  throat.position.set(0, 1.7, 1.25);
  const eave = kit.upturnedRoof(2.8, 0.85, 5.4, roof);
  eave.position.y = 5.15;
  const lantern = kit.box(0.08, 0.55, 0.7, kit.windowMaterial);
  lantern.position.set(0, 4.15, 1.35);

  gate.add(pierL, pierR, lintel, arch, throat, eave, lantern);
  kit.tagHero(gate);
  kit.add(gate);
}

/** Overpass poster: one battered pier, not another row of columns. The vermilion node stays on the road. */
export function buildOverpassPier(kit: FabricKit, hero: PassageHeroContract): void {
  const concrete = kit.standard('#6E7C84', {
    emissive: '#24323A',
    emissiveIntensity: 0.12,
    roughness: 0.86,
  });
  const deep = kit.standard('#4E5C64', {
    emissive: '#1A262C',
    emissiveIntensity: 0.16,
    roughness: 0.9,
  });

  const pier = new Group();
  kit.place(pier, hero.progress, hero.lateralOffset, 0);
  pier.scale.setScalar(hero.scale);

  const footing = kit.box(5.4, 0.7, 4.2, deep);
  footing.position.y = 0.35;
  const shaft = new Mesh(
    kit.trackGeometry(new CylinderGeometry(0.72, 1, 1, 10)),
    concrete,
  );
  shaft.scale.set(2.3, 8.2, 2.3);
  shaft.position.y = 4.5;
  const cap = kit.box(5.8, 0.7, 4.6, deep);
  cap.position.y = 8.85;
  const slot = kit.box(0.16, 1.4, 1.1, kit.windowMaterial);
  slot.position.set(-1.15, 5.4, 0);

  pier.add(footing, shaft, cap, slot);
  kit.tagHero(pier);
  kit.add(pier);
}
