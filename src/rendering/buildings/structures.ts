import { BufferGeometry, Group, type Material } from 'three';
import {
  addBracketRing,
  addBracketRun,
  createArch,
  createArrowSlit,
  createCircularRailing,
  createCityWall,
  createColumnRing,
  createColumnRow,
  createCourtyardWall,
  createDoor,
  createMerlons,
  createPodium,
  createRailing,
  createRoof,
  createSumeru,
  createWindowOpening,
  mergeParts,
  placedBox,
  placedCylinder,
  placedFrustum,
  placedLathe,
} from '../kit';
import { beginAssembly } from './batch';
import { buildGateTower } from './gateTower';

type Mats = {
  palaceBrick: Material;
  streetBrick: Material;
  stone: Material;
  tile: Material;
  timber: Material;
  gold: Material;
  white: Material;
  window: Material;
  niche: Material;
  concrete: Material;
  glass: Material;
};

/** The set-back gate uses the same tower as Zhengyangmen: fewer bays, lower, with a niche. */
export function buildPalaceWallGate(mats: Mats, bracket: BufferGeometry): Group {
  return buildGateTower(mats, bracket, {
    openingHalf: 2.2,
    pierWidth: 6.2,
    pierDepth: 4.4,
    pierHeight: 6.0,
    bays: 3,
    eaves: 2,
    portrait: true,
  });
}

/** Corner tower: three battered storeys, four-way eaves, and a cross ridge. */
export function buildCornerTower(mats: Mats, bracket: BufferGeometry): Group {
  const group = new Group();
  const batch = beginAssembly(group);
  batch.add(createPodium({ width: 6.2, depth: 6.2, height: 1.05, steps: 0 }), mats.stone);
  const storeys = [
    { width: 5.5, depth: 5.5, body: 1.55, y: 1.95, roof: 6.6, rise: 0.72, eave: 3.15 },
    { width: 4.2, depth: 4.2, body: 1.15, y: 4.85, roof: 5.1, rise: 0.58, eave: 5.75 },
    { width: 3.0, depth: 3.0, body: 0.95, y: 6.95, roof: 3.8, rise: 0.78, eave: 7.7 },
  ];
  storeys.forEach((storey, index) => {
    batch.add(
      placedFrustum(
        storey.width,
        storey.width * 0.9,
        storey.depth,
        storey.depth * 0.9,
        storey.body,
        0,
        storey.y,
        0,
      ),
      mats.palaceBrick,
    );
    const roof = createRoof({
      width: storey.roof,
      depth: storey.roof,
      rise: storey.rise,
      kind: index === 2 ? 'pyramid' : 'hip',
      wingLift: index === 2 ? 0.12 : 0.2,
    });
    batch.add(roof, mats.tile, storey.eave);
  });
  batch.add(placedBox(0.16, 0.55, 0.16, 0, 9.05, 0), mats.gold, 0, 'skip');
  batch.finish();
  addBracketRun(group, bracket, mats.timber, 2.65, -2.55, 4.6);
  addBracketRun(group, bracket, mats.timber, 5.25, -2.05, 3.4);
  batchAddColumns(group, mats.timber, 1.15);
  return group;
}

function batchAddColumns(group: Group, material: Material, y: number): void {
  const batch = beginAssembly(group);
  batch.add(
    createColumnRow({ bays: 2, bayWidth: 1.7, depth: 3.2, height: 1.45, radius: 0.11, y }),
    material,
    0,
    'skip',
  );
  batch.finish();
}

/** Arrow tower: podium, three battered storeys of slit ranks, waist eaves, xieshan crown. */
export function buildArrowTower(mats: Mats, bracket: BufferGeometry): Group {
  void bracket;
  const group = new Group();
  const batch = beginAssembly(group);
  batch.add(createPodium({ width: 9.2, depth: 6.4, height: 1.3, steps: 3 }), mats.stone);
  for (let storey = 0; storey < 3; storey += 1) {
    const y = 1.5 + storey * 2.15;
    const shrink = 1 - storey * 0.08;
    const width = 8.4 * shrink;
    const depth = 5.6 * shrink;
    batch.add(
      placedFrustum(width, width * 0.94, depth, depth * 0.94, 1.65, 0, y + 0.7, 0),
      mats.palaceBrick,
    );
    for (let column = 0; column < 5; column += 1) {
      const slit = createArrowSlit();
      slit.translate(-2.4 * shrink + column * 1.2 * shrink, y + 0.85, -2.85 * shrink);
      batch.add(slit, mats.niche, 0, 'skip');
    }
    batch.add(
      createRoof({ width: 8.8 * shrink, depth: 6.2 * shrink, rise: 0.55, kind: 'hip', wingLift: 0.1 }),
      mats.tile,
      y + 1.95,
    );
  }
  batch.add(createRoof({ width: 7.2, depth: 5.2, rise: 1.15, kind: 'xieshan', wingLift: 0.18 }), mats.tile, 8.15);
  batch.finish();
  return group;
}

export function buildCityWallSegment(mats: Mats, length = 9): Group {
  const group = new Group();
  const batch = beginAssembly(group);
  const options = { length, height: 4.4, depth: 2.6, merlons: 6 };
  batch.add(createCityWall(options), mats.streetBrick);
  batch.add(createMerlons(options), mats.stone);
  batch.finish();
  return group;
}

/** Drum or bell pavilion. `wide` selects the drum proportions. Shared xieshan hall. */
export function buildPavilion(mats: Mats, bracket: BufferGeometry, wide: boolean): Group {
  const group = new Group();
  const batch = beginAssembly(group);
  const width = wide ? 8.4 : 5.6;
  const depth = wide ? 6.0 : 4.2;
  const overhang = wide ? 0.8 : 0.4;
  batch.add(createPodium({ width, depth, height: 1.6, steps: 4 }), mats.stone);
  const arch = createArch(wide ? 1.5 : 1.15, depth * 0.55, 0.24);
  arch.translate(0, 1.5, 0);
  batch.add(arch, mats.palaceBrick);
  batch.add(
    createColumnRow({ bays: wide ? 4 : 3, bayWidth: 1.5, depth: depth * 0.72, height: 2.05, y: 1.7 }),
    mats.timber,
    0,
    'skip',
  );
  const bodyDepth = depth * 0.78;
  const bodyZ = -(depth * 0.55) / 2 + 0.12 + bodyDepth / 2;
  batch.add(placedBox(width * 0.9, 2.45, bodyDepth, 0, 1.225, bodyZ), mats.palaceBrick, 1.65);
  batch.add(createRailing(width * 0.8, 1.75, -(depth * 0.38), wide ? 5 : 4), mats.stone);
  batch.add(
    createRoof({ width: width + overhang, depth: depth + overhang, rise: 1.15, kind: 'xieshan', wingLift: 0.16 }),
    mats.tile,
    4.5,
  );
  batch.add(placedBox(width * 0.62, 0.95, depth * 0.48, 0, 6.55, 0), mats.palaceBrick);
  batch.add(
    createRoof({ width: width * 0.7, depth: depth * 0.62, rise: 0.95, kind: 'xieshan', wingLift: 0.12 }),
    mats.tile,
    7.45,
  );
  batch.add(placedCylinder(0.12, 0.16, 0.7, 0, 8.8, 0, 8), mats.gold, 0, 'skip');
  batch.finish();
  addBracketRun(group, bracket, mats.timber, 4.0, -(depth * 0.42), width * 0.72);
  addBracketRun(group, bracket, mats.timber, 6.95, -(depth * 0.26), width * 0.42);
  return group;
}

/** One courtyard: front hall, side halls, yard walls, and a rear hall facing -Z. */
export function buildYongheCourtyard(mats: Mats, bracket: BufferGeometry): Group {
  const group = new Group();
  const batch = beginAssembly(group);
  const put = (
    geometry: BufferGeometry,
    material: Material,
    x: number,
    y: number,
    z: number,
    role: 'mass' | 'skip' = 'mass',
  ) => {
    geometry.translate(x, y, z);
    batch.add(geometry, material, 0, role);
  };
  batch.add(createSumeru(12.5, 14, 0.7), mats.stone);
  for (const side of [-1, 1]) {
    const wall = createCourtyardWall(4.6, 1.35);
    wall.rotateY(Math.PI / 2);
    wall.translate(side * 3.15, 0, 1.4);
    batch.add(wall, mats.streetBrick);
  }
  put(createColumnRow({ bays: 3, bayWidth: 1.8, depth: 2.4, height: 1.45, y: 0.7 }), mats.timber, 0, 0, 5.4, 'skip');
  put(placedBox(5.2, 1.7, 1.55, 0, 0.85, 0.15), mats.palaceBrick, 0, 0.7, 5.4);
  const frontDoor = createDoor(1.4, 2.0);
  frontDoor.translate(0, 0.7, -1.28);
  put(frontDoor, mats.timber, 0, 0, 5.4, 'skip');
  put(createRoof({ width: 6.4, depth: 3.6, rise: 0.9, kind: 'gable', wingLift: 0.12 }), mats.tile, 0, 2.9, 5.4);
  for (const side of [-1, 1]) {
    put(createColumnRow({ bays: 2, bayWidth: 1.6, depth: 2.2, height: 1.2, y: 0.7 }), mats.timber, side * 4.6, 0, 1.2, 'skip');
    put(placedBox(3.1, 1.35, 1.4, 0, 0.68, 0.12), mats.palaceBrick, side * 4.6, 0.7, 1.2);
    const wingWindow = createWindowOpening(1.05, 1.15);
    wingWindow.translate(0, 1.35, -1.15);
    put(wingWindow, mats.window, side * 4.6, 0, 1.2, 'skip');
    put(createRoof({ width: 4.2, depth: 3.2, rise: 0.75, kind: 'gable' }), mats.tile, side * 4.6, 2.55, 1.2);
  }
  put(createSumeru(8.4, 5.2, 1), mats.stone, 0, 0, -3.6);
  put(createColumnRow({ bays: 5, bayWidth: 1.35, depth: 3.4, height: 2.15, y: 1 }), mats.timber, 0, 0, -3.6, 'skip');
  put(placedBox(6.4, 2.2, 2.2, 0, 1.1, 0.2), mats.palaceBrick, 0, 1, -3.6);
  for (const x of [-2.2, -0.7, 0.7, 2.2]) {
    const door = createDoor(0.9, 2.2);
    door.translate(x, 1, -1.75);
    put(door, mats.timber, 0, 0, -3.6, 'skip');
  }
  const rail = createRailing(6.4, 1.05, -1.95, 5);
  put(rail, mats.stone, 0, 0, -3.6);
  put(createRoof({ width: 8.8, depth: 5.4, rise: 1.25, kind: 'xieshan', wingLift: 0.18 }), mats.tile, 0, 4.05, -3.6);
  put(placedBox(4.6, 0.42, 2.4, 0, 6.05, 0), mats.palaceBrick, 0, 0, -3.6);
  put(createRoof({ width: 5.8, depth: 3.8, rise: 0.9, kind: 'xieshan', wingLift: 0.12 }), mats.tile, 0, 6.6, -3.6);
  batch.finish();
  const runs: Array<[number, number, number, number, number]> = [
    [2.4, -1.55, 4.6, 0, 5.4],
    [2.05, -1.4, 3.0, -4.6, 1.2],
    [2.05, -1.4, 3.0, 4.6, 1.2],
    [3.55, -2.15, 6.4, 0, -3.6],
    [6.1, -1.55, 4.0, 0, -3.6],
  ];
  for (const [y, z, span, x, originZ] of runs) {
    const start = group.children.length;
    addBracketRun(group, bracket, mats.timber, y, z, span);
    for (const child of group.children.slice(start)) child.position.set(x, 0, originZ);
  }
  return group;
}

/** Triple-eave circular hall. Terraces, ring rails, and a column ring stay inside 7.2 / 13.2. */
export function buildTempleOfHeaven(mats: Mats, bracket: BufferGeometry): Group {
  const group = new Group();
  const batch = beginAssembly(group);
  const terraces = [
    { radius: 6.8, y: 0.35, posts: 16 },
    { radius: 5.6, y: 1.15, posts: 14 },
    { radius: 4.5, y: 1.95, posts: 12 },
  ];
  for (const terrace of terraces) {
    batch.add(placedCylinder(terrace.radius, terrace.radius, 0.45, 0, terrace.y, 0, 20), mats.white);
    batch.add(createCircularRailing(terrace.radius - 0.28, terrace.y + 0.2, terrace.posts), mats.white);
  }
  const tiers = [
    { radius: 4.2, y: 2.7, rise: 1.15, columns: 12 },
    { radius: 3.3, y: 5.5, rise: 1.05, columns: 10 },
    { radius: 2.4, y: 8.2, rise: 1.0, columns: 8 },
  ];
  for (const tier of tiers) {
    batch.add(placedCylinder(tier.radius * 0.72, tier.radius * 0.82, 1.7, 0, tier.y + 0.8, 0, 16), mats.palaceBrick);
    batch.add(
      createColumnRing({
        radius: tier.radius * 0.96,
        count: tier.columns,
        height: 1.35,
        y: tier.y,
        shaft: 0.08,
      }),
      mats.timber,
      0,
      'skip',
    );
    batch.add(
      createRoof({ width: tier.radius * 2.3, depth: tier.radius * 2.3, rise: tier.rise, kind: 'cone', wingLift: 0.08 }),
      mats.tile,
      tier.y + 1.75,
    );
  }
  batch.add(placedCylinder(0.18, 0.08, 1.15, 0, 12.15, 0, 8), mats.gold, 0, 'skip');
  batch.finish();
  for (const tier of tiers) {
    addBracketRing(group, bracket, mats.timber, tier.y + 1.25, tier.radius * 1.02, tier.columns);
  }
  return group;
}

/** Chamfered base, bowl, neck, thirteen discs, canopy, and jewel. Stays under 11.9 / 4.8. */
export function buildWhiteDagoba(mats: Mats): Group {
  const group = new Group();
  const batch = beginAssembly(group);
  batch.add(placedCylinder(3.45, 3.55, 0.42, 0, 0.21, 0, 8), mats.stone);
  batch.add(placedCylinder(2.55, 2.85, 0.36, 0, 0.58, 0, 8), mats.white);
  batch.add(
    placedLathe(
      [
        [0.85, 0],
        [1.85, 0.35],
        [2.2, 1.05],
        [2.05, 1.85],
        [1.25, 2.45],
        [0.7, 2.7],
      ],
      0,
      0.95,
      0,
      16,
    ),
    mats.white,
  );
  batch.add(placedCylinder(0.95, 1.35, 2.15, 0, 5.05, 0, 16), mats.white);
  batch.add(placedCylinder(0.42, 0.62, 1.25, 0, 6.7, 0, 12), mats.white);
  for (let index = 0; index < 13; index += 1) {
    const y = 7.15 + index * 0.22;
    const radius = 0.38 - index * 0.016;
    batch.add(placedCylinder(radius * 0.72, radius, 0.045, 0, y, 0, 10), mats.gold, 0, 'skip');
  }
  batch.add(placedCylinder(0.7, 0.7, 0.06, 0, 10.15, 0, 12), mats.gold, 0, 'skip');
  batch.add(
    placedLathe(
      [
        [0.05, 0],
        [0.16, 0.14],
        [0.22, 0.32],
        [0.12, 0.55],
        [0.04, 0.9],
      ],
      0,
      10.28,
      0,
      10,
    ),
    mats.gold,
    0,
    'skip',
  );
  batch.finish();
  return group;
}

/** Four posts, three bays, clamp stones, brackets, and a main roof plus two side roofs. */
export function buildPailou(mats: Mats, bracket: BufferGeometry): Group {
  const group = new Group();
  const batch = beginAssembly(group);
  const posts = [-7.6, -5.2, 5.2, 7.6];
  for (const x of posts) {
    const outward = Math.sign(x);
    batch.add(placedBox(0.55, 0.35, 0.55, x, 0.18, 0), mats.stone);
    batch.add(placedBox(0.28, 0.85, 0.42, x + outward * 0.34, 0.42, 0), mats.stone);
    batch.add(placedCylinder(0.16, 0.2, 4.7, x, 2.55, 0, 8), mats.palaceBrick);
  }
  batch.add(placedBox(15.6, 0.28, 0.32, 0, 5.08, 0), mats.timber, 0, 'skip');
  batch.add(placedBox(4.4, 0.62, 0.1, 0, 4.62, -0.22), mats.palaceBrick);
  batch.add(createRoof({ width: 16.2, depth: 2.4, rise: 0.72, kind: 'gable', wingLift: 0.08 }), mats.tile, 5.55);
  batch.finish();
  addBracketRun(group, bracket, mats.timber, 5.08, -0.85, 14.4);
  return group;
}

export type ShopKind = 'door' | 'window' | 'screen';

/** One shop bay. Three variants: door, window, or a wide screen with a tall sign. */
export function createShopBay(kind: boolean | ShopKind = 'door'): {
  timber: BufferGeometry;
  wall: BufferGeometry;
  roof: BufferGeometry;
  opening: BufferGeometry;
  eave: BufferGeometry;
} {
  const resolved: ShopKind = kind === true ? 'window' : kind === false ? 'door' : kind;
  const roof = createRoof({ width: 3.3, depth: 3.1, rise: 0.72, kind: 'gable', wingLift: 0.08 });
  roof.translate(0, 2.75, 0);
  const opening =
    resolved === 'door'
      ? createDoor(1.1, 2.1)
      : createWindowOpening(resolved === 'screen' ? 1.7 : 1.25, resolved === 'screen' ? 1.3 : 1.05);
  opening.translate(0, resolved === 'door' ? 0.05 : 1.35, -1.02);
  const sign = placedBox(1.35, 0.22, 0.05, 0, 2.22, -1.18);
  return {
    timber: mergeParts([
      createColumnRow({ bays: 1, bayWidth: 2.4, depth: 2.35, height: 1.95, radius: 0.09 }),
      sign,
    ]),
    wall: placedBox(2.45, 2.05, 1.45, 0, 1.02, 0.18),
    roof,
    opening,
    eave: placedBox(3.2, 0.08, 0.18, 0, 2.72, -1.55),
  };
}

/** Skirt, four setbacks, a spandrel on each tier, and an equipment cage. */
export function buildGlassTower(mats: Mats): Group {
  const group = new Group();
  const batch = beginAssembly(group);
  batch.add(placedBox(6.05, 0.45, 4.85, 0, 0.22, 0), mats.concrete);
  const tiers: Array<[number, number, number]> = [
    [6.1, 4.6, 0.35],
    [4.6, 4.2, 4.95],
    [3.3, 3.6, 9.15],
    [2.1, 2.8, 12.75],
  ];
  for (const [width, height, y] of tiers) {
    batch.add(placedBox(width, height, width * 0.82, 0, y + height / 2, 0), mats.glass, 0, 'skip');
    batch.add(placedBox(0.06, 0.1, width * 0.7, width / 2 + 0.04, y + height * 0.38, 0), mats.window, 0, 'skip');
    batch.add(placedBox(0.06, 0.1, width * 0.7, width / 2 + 0.04, y + height * 0.72, 0), mats.window, 0, 'skip');
  }
  batch.add(placedBox(1.3, 1.15, 1.1, 0, 16.85, 0), mats.concrete);
  batch.add(placedBox(1.55, 0.08, 0.08, 0, 17.5, 0.42), mats.concrete);
  batch.add(placedBox(1.55, 0.08, 0.08, 0, 17.5, -0.42), mats.concrete);
  batch.add(placedBox(0.08, 0.08, 1.15, 0.55, 17.5, 0), mats.concrete);
  batch.finish();
  return group;
}

/** Tea house: moon gate, gate drums, a door head, and a sill window. */
export function buildTeaHouse(mats: Mats): Group {
  const group = new Group();
  const batch = beginAssembly(group);
  batch.add(placedBox(3.6, 2.4, 3.2, 0, 1.2, 0), mats.streetBrick);
  batch.add(placedBox(3.1, 1.35, 2.4, 0, 3.35, 0.1), mats.timber, 0, 'skip');
  batch.add(createRoof({ width: 4.2, depth: 3.8, rise: 0.9, kind: 'gable', wingLift: 0.12 }), mats.tile, 4.15);
  batch.add(placedCylinder(0.72, 0.72, 0.16, 0, 1.35, -1.62, 16, Math.PI / 2), mats.timber, 0, 'skip');
  batch.add(placedCylinder(0.5, 0.5, 0.08, 0, 1.35, -1.72, 16, Math.PI / 2), mats.niche, 0, 'skip');
  batch.add(placedCylinder(0.22, 0.22, 0.28, -0.85, 0.2, -1.55, 8), mats.stone);
  batch.add(placedCylinder(0.22, 0.22, 0.28, 0.85, 0.2, -1.55, 8), mats.stone);
  const head = createRoof({ width: 1.9, depth: 0.7, rise: 0.32, kind: 'gable', wingLift: 0.05 });
  head.translate(0, 2.05, -1.7);
  batch.add(head, mats.tile);
  const window = createWindowOpening(1.2, 0.8);
  window.translate(0, 3.2, -1.35);
  batch.add(window, mats.window, 0, 'skip');
  batch.finish();
  return group;
}

/** A street gate: piers, drums, an open arch, a door head, and a roof. */
export function buildStreetGate(mats: Mats): Group {
  const group = new Group();
  const batch = beginAssembly(group);
  for (const side of [-1, 1]) {
    batch.add(placedBox(0.7, 0.4, 0.7, side * 1.35, 0.2, 0), mats.stone);
    batch.add(placedBox(0.55, 3.4, 1.8, side * 1.35, 1.9, 0), mats.streetBrick);
  }
  const arch = createArch(1.15, 1.5, 0.22);
  arch.translate(0, 0.35, 0);
  batch.add(arch, mats.streetBrick);
  batch.add(placedBox(3.4, 0.35, 1.9, 0, 3.55, 0), mats.timber, 0, 'skip');
  batch.add(createRoof({ width: 3.8, depth: 2.4, rise: 0.7, kind: 'gable', wingLift: 0.1 }), mats.tile, 3.9);
  batch.add(placedBox(1.4, 0.55, 0.06, 0, 3.15, -0.95), mats.window, 0, 'skip');
  batch.finish();
  return group;
}

/** A battered overpass pier with a footing, shaft, and cap beam. */
export function buildOverpassPier(mats: Mats): Group {
  const group = new Group();
  const batch = beginAssembly(group);
  batch.add(placedBox(4.6, 0.55, 3.6, 0, 0.28, 0), mats.concrete);
  batch.add(placedFrustum(1.7, 1.35, 1.7, 1.35, 7.2, 0, 4.15, 0), mats.concrete);
  batch.add(placedBox(5.0, 0.45, 3.9, 0, 7.95, 0), mats.concrete);
  batch.add(placedBox(4.4, 0.22, 0.55, 0, 8.25, 1.15), mats.concrete);
  batch.add(placedBox(0.7, 0.9, 0.08, -1.3, 5.2, 0.85), mats.window, 0, 'skip');
  batch.finish();
  return group;
}
