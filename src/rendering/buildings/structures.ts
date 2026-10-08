import { BufferGeometry, Group, Mesh, type Material } from 'three';
import {
  addBracketRun,
  createArch,
  createArrowSlit,
  createCityWall,
  createMerlons,
  createColumnRow,
  createDoor,
  createPodium,
  createRailing,
  createRoof,
  createSumeru,
  createWindowOpening,
  mergeParts,
  placedBox,
  placedCylinder,
} from '../kit';

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

function add(group: Group, geometry: BufferGeometry, material: Material, y = 0): Mesh {
  const mesh = new Mesh(geometry, material);
  mesh.position.y = y;
  group.add(mesh);
  return mesh;
}

/** Five-bay palace gate, long in local X, shallow in Z. The face is -Z. */
export function buildPalaceWallGate(mats: Mats, bracket: BufferGeometry): Group {
  const group = new Group();
  const width = 24;
  const depth = 4.2;
  add(group, createPodium({ width, depth, height: 1.05, steps: 4 }), mats.stone);
  const openings = [-8.2, -4.1, 0, 4.1, 8.2];
  add(group, placedBox(width, 2.2, depth, 0, 5.5, 0), mats.palaceBrick);
  for (const x of [-11.2, -6.15, -2.05, 2.05, 6.15, 11.2]) {
    add(group, placedBox(1.7, 4.2, depth + 0.15, x, 3.3, 0), mats.palaceBrick);
  }
  for (const x of openings) {
    const arch = add(group, createArch(x === 0 ? 1.7 : 1.25, depth * 0.7, 0.22), mats.palaceBrick, 1.15);
    arch.position.x = x;
    const sill = add(group, placedBox(x === 0 ? 1.5 : 1.05, 0.08, 0.08, 0, 0, 0), mats.window);
    sill.position.set(x, 1.35, -(depth / 2 + 0.08));
  }
  add(group, createColumnRow({ bays: 7, bayWidth: 2.6, depth: 3.1, height: 2.2, y: 6.5 }), mats.timber);
  addBracketRun(group, bracket, mats.timber, 9.05, -1.7, 20);
  add(group, createRoof({ width: 22, depth: 5.4, rise: 1.45, kind: 'hip', wingLift: 0.2 }), mats.tile, 9.15);
  add(group, placedBox(14, 0.8, 2.8, 0, 11.1, 0), mats.palaceBrick);
  addBracketRun(group, bracket, mats.timber, 12.05, -1.2, 12);
  add(group, createRoof({ width: 15, depth: 3.6, rise: 1.05, kind: 'hip', wingLift: 0.14 }), mats.tile, 12.1);
  add(group, createRailing(16, 6.6, -1.85, 8), mats.stone);
  const portrait = add(group, placedBox(1.5, 2.0, 0.08, 0, 0, 0), mats.niche);
  portrait.position.set(0, 3.6, -(depth / 2 + 0.12));
  return group;
}

/** Corner tower: podium, battered body, three roof tiers, cross ridge. */
export function buildCornerTower(mats: Mats, bracket: BufferGeometry): Group {
  const group = new Group();
  add(group, createPodium({ width: 6.4, depth: 6.4, height: 1.1, steps: 0 }), mats.stone);
  add(group, placedBox(5.2, 2.4, 5.2, 0, 2.3, 0), mats.palaceBrick);
  add(group, createColumnRow({ bays: 2, bayWidth: 1.8, depth: 3.4, height: 1.6, radius: 0.12, y: 3.4 }), mats.timber);
  addBracketRun(group, bracket, mats.timber, 5.3, -1.85, 5.2);
  add(group, createRoof({ width: 6.6, depth: 6.6, rise: 1.15, kind: 'hip', wingLift: 0.28 }), mats.tile, 5.35);
  add(group, placedBox(3.6, 1.3, 3.6, 0, 6.9, 0), mats.palaceBrick);
  addBracketRun(group, bracket, mats.timber, 8.35, -1.3, 3.4);
  add(group, createRoof({ width: 4.4, depth: 4.4, rise: 0.95, kind: 'pyramid', wingLift: 0.2 }), mats.tile, 8.4);
  add(group, placedBox(0.16, 0.7, 0.16, 0, 9.7, 0), mats.gold);
  return group;
}

/** Arrow tower: podium, three storeys of slit ranks, waist eaves, hip roof. */
export function buildArrowTower(mats: Mats, bracket: BufferGeometry): Group {
  const group = new Group();
  add(group, createPodium({ width: 9.2, depth: 6.4, height: 1.3, steps: 3 }), mats.stone);
  for (let storey = 0; storey < 3; storey += 1) {
    const y = 1.5 + storey * 2.15;
    const shrink = 1 - storey * 0.08;
    add(group, placedBox(8.4 * shrink, 1.7, 5.6 * shrink, 0, y + 0.7, 0), mats.palaceBrick);
    for (let column = 0; column < 5; column += 1) {
      const slit = add(group, createArrowSlit(), mats.niche);
      slit.position.set(-2.4 * shrink + column * 1.2 * shrink, y + 0.85, -2.85 * shrink);
    }
    addBracketRun(group, bracket, mats.timber, y + 1.75, -2.9 * shrink, 7.2 * shrink);
    add(
      group,
      createRoof({ width: 8.8 * shrink, depth: 6.2 * shrink, rise: 0.55, kind: 'hip', wingLift: 0.1 }),
      mats.tile,
      y + 1.8,
    );
  }
  add(group, createRoof({ width: 7.2, depth: 5.2, rise: 1.15, kind: 'hip', wingLift: 0.18 }), mats.tile, 8.15);
  return group;
}

export function buildCityWallSegment(mats: Mats, length = 9): Group {
  const group = new Group();
  const options = { length, height: 4.4, depth: 2.6, merlons: 6 };
  add(group, createCityWall(options), mats.streetBrick);
  add(group, createMerlons(options), mats.stone);
  return group;
}

/** Drum or bell pavilion. `wide` selects the drum proportions. */
export function buildPavilion(mats: Mats, bracket: BufferGeometry, wide: boolean): Group {
  const group = new Group();
  const width = wide ? 8.4 : 5.6;
  const depth = wide ? 6.0 : 4.2;
  const overhang = wide ? 0.8 : 0.4;
  add(group, createPodium({ width, depth, height: 1.6, steps: 4 }), mats.stone);
  add(group, createArch(wide ? 1.5 : 1.15, depth * 0.55, 0.24), mats.palaceBrick, 1.5);
  add(group, createColumnRow({ bays: wide ? 4 : 3, bayWidth: 1.5, depth: depth * 0.7, height: 2.4, y: 1.7 }), mats.timber);
  add(group, createRailing(width * 0.8, 1.75, -(depth * 0.38), wide ? 5 : 4), mats.stone);
  addBracketRun(group, bracket, mats.timber, 4.45, -(depth * 0.4), width * 0.85);
  add(group, createRoof({ width: width + overhang, depth: depth + overhang, rise: 1.15, kind: 'hip', wingLift: 0.18 }), mats.tile, 4.5);
  add(group, placedBox(width * 0.62, 1.1, depth * 0.55, 0, 6.15, 0), mats.palaceBrick);
  addBracketRun(group, bracket, mats.timber, 7.4, -(depth * 0.28), width * 0.5);
  add(group, createRoof({ width: width * 0.7, depth: depth * 0.62, rise: 0.95, kind: 'hip', wingLift: 0.14 }), mats.tile, 7.45);
  add(group, placedCylinder(0.12, 0.16, 0.7, 0, 8.8, 0, 8), mats.gold);
  return group;
}

/** One courtyard: front hall, two side halls, a taller rear hall facing -Z. */
export function buildYongheCourtyard(mats: Mats, bracket: BufferGeometry): Group {
  const group = new Group();
  add(group, createSumeru(12.5, 14, 0.7), mats.stone);
  const front = new Group();
  front.position.set(0, 0, 5.4);
  add(front, createColumnRow({ bays: 3, bayWidth: 1.8, depth: 2.4, height: 1.8, y: 0.7 }), mats.timber);
  add(front, createDoor(1.4, 2.0), mats.timber).position.y = 0.7;
  addBracketRun(front, bracket, mats.timber, 2.85, -1.35, 5.2);
  add(front, createRoof({ width: 6.4, depth: 3.6, rise: 0.9, kind: 'gable', wingLift: 0.12 }), mats.tile, 2.9);
  group.add(front);
  for (const side of [-1, 1]) {
    const wing = new Group();
    wing.position.set(side * 4.6, 0, 1.2);
    add(wing, createColumnRow({ bays: 2, bayWidth: 1.6, depth: 2.2, height: 1.5, y: 0.7 }), mats.timber);
    addBracketRun(wing, bracket, mats.timber, 2.5, -1.2, 3.4);
    add(wing, createRoof({ width: 4.2, depth: 3.2, rise: 0.75, kind: 'gable' }), mats.tile, 2.55);
    group.add(wing);
  }
  const hall = new Group();
  hall.position.set(0, 0, -3.6);
  add(hall, createSumeru(8.4, 5.2, 1), mats.stone);
  add(hall, createColumnRow({ bays: 5, bayWidth: 1.35, depth: 3.4, height: 2.6, y: 1 }), mats.timber);
  for (const x of [-2.2, -0.7, 0.7, 2.2]) {
    const door = add(hall, createDoor(0.9, 2.2), mats.timber);
    door.position.set(x, 1, -1.75);
  }
  add(hall, createRailing(6.4, 1.05, -1.95, 5), mats.stone);
  addBracketRun(hall, bracket, mats.timber, 4.0, -1.9, 7.2);
  add(hall, createRoof({ width: 8.8, depth: 5.4, rise: 1.25, kind: 'hip', wingLift: 0.2 }), mats.tile, 4.05);
  add(hall, placedBox(5.2, 0.7, 3.2, 0, 5.7, 0), mats.palaceBrick);
  addBracketRun(hall, bracket, mats.timber, 6.55, -1.35, 4.6);
  add(hall, createRoof({ width: 5.8, depth: 3.8, rise: 0.9, kind: 'hip', wingLift: 0.14 }), mats.tile, 6.6);
  group.add(hall);
  return group;
}

/** Triple-eave circular hall on three railed terraces. Fits the calibrated 13.2 / 7.2 model. */
export function buildTempleOfHeaven(mats: Mats, bracket: BufferGeometry): Group {
  const group = new Group();
  const terraces = [
    { radius: 6.8, y: 0.35 },
    { radius: 5.6, y: 1.15 },
    { radius: 4.5, y: 1.95 },
  ];
  for (const terrace of terraces) {
    add(group, placedCylinder(terrace.radius, terrace.radius, 0.45, 0, terrace.y, 0, 20), mats.white);
    add(group, createRailing(terrace.radius * 1.5, terrace.y + 0.15, -terrace.radius * 0.72, 6), mats.white);
  }
  const tiers = [
    { radius: 4.2, y: 2.7, rise: 1.15 },
    { radius: 3.3, y: 5.5, rise: 1.05 },
    { radius: 2.4, y: 8.2, rise: 1.0 },
  ];
  for (const tier of tiers) {
    add(group, placedCylinder(tier.radius * 0.72, tier.radius * 0.82, 1.7, 0, tier.y + 0.8, 0, 16), mats.palaceBrick);
    add(group, createColumnRow({ bays: 6, bayWidth: tier.radius * 0.32, depth: tier.radius * 0.9, height: 1.5, radius: 0.1, y: tier.y }), mats.timber);
    addBracketRun(group, bracket, mats.timber, tier.y + 1.7, -tier.radius * 0.55, tier.radius * 1.6);
    add(
      group,
      createRoof({ width: tier.radius * 2.3, depth: tier.radius * 2.3, rise: tier.rise, kind: 'cone', wingLift: 0 }),
      mats.tile,
      tier.y + 1.75,
    );
  }
  add(group, placedCylinder(0.18, 0.08, 1.2, 0, 12.2, 0, 8), mats.gold);
  return group;
}

/** White dagoba inside the calibrated 11.9 height and 4.8 half-width. */
export function buildWhiteDagoba(mats: Mats): Group {
  const group = new Group();
  add(group, placedBox(7.2, 0.45, 7.2, 0, 0.25, 0), mats.stone);
  add(group, placedBox(5.4, 0.4, 5.4, 0, 0.7, 0), mats.white);
  add(
    group,
    placedCylinder(2.3, 1.7, 2.4, 0, 2.1, 0, 16),
    mats.white,
  );
  add(group, placedCylinder(1.15, 1.35, 2.8, 0, 4.6, 0, 16), mats.white);
  add(group, placedCylinder(0.55, 0.7, 1.6, 0, 6.7, 0, 12), mats.white);
  for (let index = 0; index < 7; index += 1) {
    const y = 7.7 + index * 0.38;
    const radius = 0.42 - index * 0.04;
    add(group, placedCylinder(radius, radius + 0.04, 0.12, 0, y, 0, 10), mats.gold);
  }
  add(group, placedCylinder(0.7, 0.7, 0.08, 0, 10.5, 0, 12), mats.gold);
  add(group, placedCylinder(0.1, 0.16, 0.9, 0, 11.0, 0, 8), mats.gold);
  return group;
}

/** Four-post, three-bay pailou. Inner posts stay outside the carriageway. */
export function buildPailou(mats: Mats, bracket: BufferGeometry): Group {
  const group = new Group();
  const posts = [-7.6, -5.2, 5.2, 7.6];
  for (const x of posts) {
    add(group, placedBox(0.55, 0.35, 0.55, x, 0.18, 0), mats.stone);
    add(group, placedCylinder(0.16, 0.2, 5.4, x, 3.05, 0, 8), mats.palaceBrick);
  }
  add(group, placedBox(15.6, 0.32, 0.36, 0, 5.55, 0), mats.timber);
  add(group, placedBox(15.2, 0.22, 0.28, 0, 5.9, 0), mats.gold);
  addBracketRun(group, bracket, mats.timber, 6.15, 0, 14.2);
  add(group, createRoof({ width: 6.4, depth: 1.8, rise: 0.85, kind: 'gable', wingLift: 0.1 }), mats.tile, 6.35);
  for (const side of [-1, 1]) {
    const sideRoof = add(
      group,
      createRoof({ width: 3.2, depth: 1.5, rise: 0.6, kind: 'gable' }),
      mats.tile,
      5.85,
    );
    sideRoof.position.x = side * 6;
  }
  return group;
}

/** One shop bay split by material so a street can instance it. */
export function createShopBay(windowed: boolean): {
  timber: BufferGeometry;
  roof: BufferGeometry;
  opening: BufferGeometry;
  eave: BufferGeometry;
} {
  const roof = createRoof({ width: 3.3, depth: 3.1, rise: 0.72, kind: 'gable', wingLift: 0.08 });
  roof.translate(0, 2.75, 0);
  const opening = windowed ? createWindowOpening(1.25, 1.05) : createDoor(1.1, 2.1);
  opening.translate(0, windowed ? 1.55 : 0.05, -1.2);
  return {
    timber: mergeParts([
      createColumnRow({ bays: 1, bayWidth: 2.4, depth: 2.2, height: 2.45, radius: 0.1 }),
      placedBox(0.55, 1.15, 0.06, 0.95, 2.15, -1.25),
    ]),
    roof,
    opening,
    eave: placedBox(3.2, 0.08, 0.18, 0, 2.72, -1.55),
  };
}

/** Stepped glass tower. The widest tier stays inside the contract half-width. */
export function buildGlassTower(mats: Mats): Group {
  const group = new Group();
  const tiers: Array<[number, number, number]> = [
    [6.1, 4.6, 0],
    [4.6, 4.2, 4.6],
    [3.3, 3.6, 8.8],
    [2.1, 2.8, 12.4],
  ];
  for (const [width, height, y] of tiers) {
    add(group, placedBox(width, height, width * 0.82, 0, y + height / 2, 0), mats.glass);
    add(group, placedBox(0.06, 0.12, width * 0.7, width / 2 + 0.04, y + height * 0.55, 0), mats.window);
  }
  add(group, placedBox(1.3, 1.4, 1.1, 0, 16.6, 0), mats.concrete);
  return group;
}

/** Two-storey tea house with a moon gate on +X. */
export function buildTeaHouse(mats: Mats): Group {
  const group = new Group();
  add(group, placedBox(3.6, 2.4, 3.2, 0, 1.2, 0), mats.streetBrick);
  add(group, placedBox(3.3, 1.8, 2.9, 0, 3.5, 0), mats.timber);
  add(group, createRoof({ width: 4.2, depth: 3.8, rise: 0.9, kind: 'gable', wingLift: 0.12 }), mats.tile, 4.45);
  add(group, placedCylinder(0.72, 0.72, 0.2, 1.85, 1.3, 0, 16, 0, Math.PI / 2), mats.timber);
  add(group, placedCylinder(0.55, 0.55, 0.12, 1.95, 1.3, 0, 16, 0, Math.PI / 2), mats.niche);
  add(group, createWindowOpening(1.2, 0.8), mats.window).position.set(0, 3.5, -1.5);
  return group;
}

/** A street gate: two piers, an arch, a door head, and a roof. */
export function buildStreetGate(mats: Mats): Group {
  const group = new Group();
  for (const side of [-1, 1]) {
    add(group, placedBox(0.55, 3.4, 1.8, side * 1.35, 1.7, 0), mats.streetBrick);
  }
  add(group, createArch(1.15, 1.5, 0.22), mats.streetBrick, 0.2);
  add(group, placedBox(3.4, 0.4, 1.9, 0, 3.6, 0), mats.timber);
  add(group, createRoof({ width: 3.8, depth: 2.4, rise: 0.7, kind: 'gable', wingLift: 0.1 }), mats.tile, 4.0);
  add(group, placedBox(0.5, 0.7, 0.06, 0, 3.15, -0.85), mats.window);
  return group;
}

/** A battered overpass pier with a cap and a footing. */
export function buildOverpassPier(mats: Mats): Group {
  const group = new Group();
  add(group, placedBox(4.6, 0.55, 3.6, 0, 0.28, 0), mats.concrete);
  add(group, placedCylinder(0.85, 1.15, 7.4, 0, 4.2, 0, 8), mats.concrete);
  add(group, placedBox(5.0, 0.55, 3.9, 0, 8.1, 0), mats.concrete);
  add(group, placedBox(0.7, 0.9, 0.08, -1.3, 5.2, 1.6), mats.window);
  return group;
}

