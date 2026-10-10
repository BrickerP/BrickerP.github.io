import { BufferGeometry, Group } from 'three';
import {
  addBracketRing,
  addBracketRun,
  createArch,
  createArrowSlit,
  createCircularRailing,
  createColumnRingParts,
  createCourtyardWall,
  createDoor,
  createDoorway,
  createEnclosedHall,
  createPierBent,
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
  roofHeightAt,
  type RoofOptions,
} from '../kit';
import { beginAssembly } from './batch';
import { buildGateTower, type GateTowerOptions } from './gateTower';
import type { CityMaterials } from './materials';
import { stackTiers, type PlaqueSeat, type TierSpec } from './tiers';

export { createLowRise, createSkylineMass } from './skyline';

/** Shared with the moat wall, so the wall can butt into this gate's platform. */
export const PALACE_GATE_OPTIONS: GateTowerOptions = {
  openingHalf: 2.2,
  pierWidth: 6.2,
  pierDepth: 4.4,
  pierHeight: 6.0,
  bays: 3,
  eaves: 2,
  portrait: true,
  glaze: 'glaze',
};

/** The set-back gate uses the same tower as Zhengyangmen, with doors in both piers and yellow tile. */
export function buildPalaceWallGate(mats: CityMaterials, bracket: BufferGeometry): Group {
  return buildGateTower(mats, bracket, PALACE_GATE_OPTIONS);
}

/**
 * Bastion sized so the corner tower's 0.72 scale is 4.2 m tall and 2.38 m
 * half-wide — the city-wall height, inside the 3.03 m clearance.
 */
export const CORNER_BASTION = {
  half: 2.38 / 0.72,
  height: 4.2 / 0.72,
} as const;

/** A small hall that juts from a tier face, with its own gable roof pointing outward. */
function addAnnexes(
  group: Group,
  mats: CityMaterials,
  floorTop: number,
  reach: number,
  hallHeight: number,
): void {
  const batch = beginAssembly(group);
  for (const [dx, dz] of [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ]) {
    const along = dz !== 0;
    const x = dx * reach;
    const z = dz * reach;
    batch.add(
      placedBox(along ? 1.7 : 1.0, hallHeight, along ? 1.0 : 1.7, x, floorTop + hallHeight / 2, z),
      mats.lacquer,
    );
    batch.add(
      placedBox(along ? 1.0 : 0.05, hallHeight * 0.55, along ? 0.05 : 1.0, x + dx * 0.53, floorTop + hallHeight * 0.55, z + dz * 0.53),
      mats.window,
      0,
      'skip',
    );
    const roof = createRoof({ width: 1.9, depth: 2.3, rise: 0.8, kind: 'gable', wingLift: 0.28 });
    if (along) roof.rotateY(Math.PI / 2);
    roof.translate(x + dx * 0.25, floorTop + hallHeight + 0.5, z + dz * 0.25);
    batch.add(roof, mats.tile);
  }
  batch.finish();
}

/** Corner tower: a bastion, three halls each buried in the roof below, and four small gabled annexes. */
export function buildCornerTower(mats: CityMaterials, bracket: BufferGeometry): Group {
  const group = new Group();
  const batch = beginAssembly(group);
  const half = CORNER_BASTION.half;
  const base = CORNER_BASTION.height;
  batch.add(placedFrustum(half * 2, half * 1.8, half * 2, half * 1.8, base, 0, base / 2, 0), mats.grayBrick);
  const widthAt = (y: number) => half * 2 - half * 0.2 * (y / base);
  batch.add(placedBox(half * 2 + 0.34, 0.49, half * 2 + 0.34, 0, 0.245, 0), mats.stone);
  batch.add(placedBox(widthAt(base * 0.62) + 0.2, 0.22, widthAt(base * 0.62) + 0.2, 0, base * 0.62, 0), mats.stone);
  batch.add(placedBox(half * 1.8 + 0.45, 0.24, half * 1.8 + 0.45, 0, base + 0.02, 0), mats.stone);
  const ring = half * 0.9 + 0.05;
  for (let index = 0; index < 5; index += 1) {
    const t = -ring + ((2 * ring) / 5) * (index + 0.5);
    for (const side of [-1, 1]) {
      batch.add(placedBox(0.6, 0.5, 0.4, t, base + 0.39, side * ring), mats.stone);
      batch.add(placedBox(0.4, 0.5, 0.6, side * ring, base + 0.39, t), mats.stone);
    }
  }
  batch.finish();
  const tiers: TierSpec[] = [
    {
      width: 3.3,
      depth: 3.3,
      wallHeight: 1.5,
      gallery: 0.6,
      bays: 3,
      eaveGap: 0.7,
      roof: { kind: 'xieshan', rise: 1.0, overhang: 1.25, wingLift: 0.62 },
    },
    {
      width: 2.1,
      depth: 2.1,
      wallHeight: 1.2,
      gallery: 0.5,
      bays: 3,
      eaveGap: 0.6,
      roof: { kind: 'xieshan', rise: 1.0, overhang: 1.05, wingLift: 0.55 },
    },
    {
      width: 1.1,
      depth: 1.1,
      wallHeight: 1.0,
      gallery: 0.4,
      bays: 2,
      eaveGap: 0.55,
      roof: { kind: 'pyramid', rise: 1.2, overhang: 0.85, wingLift: 0.45 },
    },
  ];
  stackTiers(group, mats, bracket, base + 0.14, tiers);
  addAnnexes(group, mats, base + 0.34, 2.75, 1.45);
  return group;
}

/** Arrow tower: a battered brick body with four rows of arrow windows, and a two-storey hall above. */
export function buildArrowTower(mats: CityMaterials, bracket: BufferGeometry): Group {
  const group = new Group();
  const batch = beginAssembly(group);
  const podium = 0.9;
  const rows = 4;
  const rowHeight = 1.3;
  const body = rows * rowHeight + 0.3;
  const width0 = 8.6;
  const width1 = 7.9;
  const depth0 = 5.8;
  const depth1 = 5.2;
  batch.add(createPodium({ width: 9.0, depth: 6.2, height: podium, steps: 0 }), mats.stone);
  batch.add(placedFrustum(width0, width1, depth0, depth1, body, 0, podium + body / 2, 0), mats.grayBrick);
  for (let floor = 1; floor <= rows; floor += 1) {
    const y = podium + floor * rowHeight - 0.02;
    const t = (y - podium) / body;
    batch.add(
      placedBox(
        width0 - (width0 - width1) * t + 0.22,
        0.14,
        depth0 - (depth0 - depth1) * t + 0.22,
        0,
        y,
        0,
      ),
      mats.stone,
    );
  }
  for (let row = 0; row < rows; row += 1) {
    const y = podium + 0.72 + row * rowHeight;
    const t = (y - podium) / body;
    const halfD = depth0 / 2 - ((depth0 - depth1) / 2) * t;
    const halfW = width0 / 2 - ((width0 - width1) / 2) * t;
    const frame = (x: number, z: number, turn: number) => {
      const slit = createArrowSlit();
      slit.rotateY(turn);
      slit.translate(x, y, z);
      batch.add(slit, mats.niche, 0, 'skip');
      const lintel = placedBox(turn === 0 ? 0.52 : 0.14, 0.1, turn === 0 ? 0.14 : 0.52, x, y + 0.45, z);
      const sill = placedBox(turn === 0 ? 0.46 : 0.16, 0.07, turn === 0 ? 0.16 : 0.46, x, y - 0.4, z);
      batch.add(lintel, mats.stone);
      batch.add(sill, mats.stone);
    };
    for (let column = 0; column < 7; column += 1) frame(-3.3 + column * 1.1, -halfD - 0.03, 0);
    for (let column = 0; column < 3; column += 1) {
      frame(halfW + 0.03, -1.4 + column * 1.4, -Math.PI / 2);
      frame(-halfW - 0.03, -1.4 + column * 1.4, Math.PI / 2);
    }
  }
  const topY = podium + body;
  batch.add(placedBox(width1 + 0.5, 0.24, depth1 + 0.5, 0, topY + 0.1, 0), mats.stone);
  const ring = 0.5;
  for (let index = 0; index < 8; index += 1) {
    const x = -width1 / 2 + 0.4 + ((width1 - 0.8) / 7) * index;
    for (const side of [-1, 1]) {
      batch.add(placedBox(0.5, 0.45, 0.34, x, topY + 0.46, side * (depth1 / 2 - ring + 0.1)), mats.stone);
    }
  }
  batch.finish();
  const tiers: TierSpec[] = [
    {
      width: 5.6,
      depth: 3.2,
      wallHeight: 1.7,
      gallery: 0.65,
      bays: 5,
      front: 'windows',
      eaveGap: 0.75,
      roof: { kind: 'xieshan', rise: 1.3, overhang: 1.35, wingLift: 0.65 },
    },
    {
      width: 3.2,
      depth: 1.9,
      wallHeight: 1.3,
      gallery: 0.5,
      bays: 3,
      front: 'windows',
      eaveGap: 0.65,
      roof: { kind: 'xieshan', rise: 1.4, overhang: 1.1, wingLift: 0.6 },
      finial: true,
    },
  ];
  stackTiers(group, mats, bracket, topY + 0.24, tiers);
  return group;
}

/** Drum or bell tower: a battered brick base with arched doors, a balcony, and a two-storey hall. */
export function buildPavilion(mats: CityMaterials, bracket: BufferGeometry, wide: boolean): Group {
  const group = new Group();
  const batch = beginAssembly(group);
  const width = wide ? 8.4 : 5.6;
  const depth = wide ? 6.0 : 4.2;
  const baseHeight = wide ? 3.4 : 3.0;
  batch.add(createPodium({ width: width + 0.5, depth: depth + 0.5, height: 0.5, steps: 0 }), mats.stone);
  batch.add(
    placedFrustum(width + 0.2, width - 0.2, depth + 0.2, depth - 0.2, baseHeight - 0.5, 0, 0.5 + (baseHeight - 0.5) / 2, 0),
    mats.grayBrick,
  );
  batch.add(placedBox(width + 0.6, 0.22, depth + 0.6, 0, baseHeight + 0.01, 0), mats.stone);
  const doors = wide ? 3 : 1;
  for (let index = 0; index < doors; index += 1) {
    const x = (index - (doors - 1) / 2) * 2.7;
    const parts = createDoorway(wide ? 1.5 : 1.3, wide ? 2.6 : 2.3);
    for (const [geometry, material, role] of [
      [parts.stone, mats.stone, 'mass'],
      [parts.door, mats.lacquer, 'mass'],
      [parts.studs, mats.gold, 'skip'],
      [parts.dark, mats.niche, 'skip'],
    ] as const) {
      geometry.translate(x, 0.5, -depth / 2 - 0.25);
      batch.add(geometry, material, 0, role);
    }
  }
  const rail = createRailing(width * 0.86, baseHeight + 0.12, -(depth / 2 - 0.45), wide ? 7 : 5);
  const back = createRailing(width * 0.86, baseHeight + 0.12, depth / 2 - 0.45, wide ? 7 : 5);
  batch.add(rail, mats.stone);
  batch.add(back, mats.stone);
  for (const side of [-1, 1]) {
    const flank = createRailing(depth * 0.8, baseHeight + 0.12, 0, 4);
    flank.rotateY(Math.PI / 2);
    flank.translate(side * (width / 2 - 0.45), 0, 0);
    batch.add(flank, mats.stone);
  }
  batch.finish();
  const tiers: TierSpec[] = [
    {
      width: width * 0.76,
      depth: depth * 0.5,
      wallHeight: 2.0,
      gallery: 0.6,
      bays: wide ? 5 : 3,
      front: 'doors',
      eaveGap: 0.75,
      roof: { kind: 'xieshan', rise: 1.4, overhang: wide ? 1.1 : 0.85, wingLift: 0.55 },
    },
    {
      width: width * 0.42,
      depth: depth * 0.3,
      wallHeight: 1.3,
      gallery: 0.45,
      bays: 3,
      front: 'windows',
      eaveGap: 0.65,
      roof: { kind: 'xieshan', rise: 1.5, overhang: wide ? 1.0 : 0.8, wingLift: 0.5 },
      finial: true,
    },
  ];
  stackTiers(group, mats, bracket, baseHeight + 0.22, tiers);
  return group;
}

/** One courtyard: a rear hall facing -Z with two eaves, side halls, a front hall, and yard walls. */
export function buildYongheCourtyard(mats: CityMaterials, bracket: BufferGeometry): Group {
  const group = new Group();
  const batch = beginAssembly(group);
  batch.add(createSumeru(12.5, 14, 0.7), mats.stone);
  for (const side of [-1, 1]) {
    const wall = createCourtyardWall(4.6, 1.35);
    wall.rotateY(Math.PI / 2);
    wall.translate(side * 3.15, 0, 1.4);
    batch.add(wall, mats.grayBrick);
  }
  const platform = createSumeru(9.4, 5.8, 1.0);
  platform.translate(0, 0, -3.6);
  batch.add(platform, mats.stone);
  batch.finish();

  const rear = new Group();
  rear.position.set(0, 0, -3.6);
  const rearTiers: TierSpec[] = [
    {
      width: 6.2,
      depth: 2.6,
      wallHeight: 1.9,
      gallery: 0.7,
      bays: 5,
      front: 'doors',
      eaveGap: 0.75,
      bare: true,
      roof: { kind: 'xieshan', rise: 1.2, overhang: 1.2, wingLift: 0.6 },
      glaze: 'glaze',
    },
    {
      width: 3.4,
      depth: 1.5,
      wallHeight: 1.0,
      gallery: 0.45,
      bays: 3,
      front: 'windows',
      eaveGap: 0.6,
      roof: { kind: 'xieshan', rise: 1.1, overhang: 1.0, wingLift: 0.5 },
      glaze: 'glaze',
    },
  ];
  const rearStack = stackTiers(rear, mats, bracket, 1.0, rearTiers);
  group.add(rear);
  group.userData.plaqueSeat = {
    lintelBottom: rearStack.seat.lintelBottom,
    z: rearStack.seat.z - 3.6,
    bayWidth: rearStack.seat.bayWidth,
  } satisfies PlaqueSeat;

  const front = new Group();
  front.position.set(0, 0, 5.4);
  stackTiers(front, mats, bracket, 0.7, [
    {
      width: 4.2,
      depth: 2.0,
      wallHeight: 1.6,
      gallery: 0.5,
      bays: 3,
      front: 'doors',
      eaveGap: 0.65,
      roof: { kind: 'xieshan', rise: 1.0, overhang: 1.0, wingLift: 0.5 },
      glaze: 'glaze',
    },
  ]);
  group.add(front);
  for (const side of [-1, 1]) {
    const hall = new Group();
    hall.position.set(side * 4.6, 0, 1.2);
    hall.rotation.y = side * (Math.PI / 2);
    stackTiers(hall, mats, bracket, 0.7, [
      {
        width: 3.6,
        depth: 1.8,
        wallHeight: 1.4,
        gallery: 0.4,
        bays: 3,
        front: 'windows',
        eaveGap: 0.6,
        roof: { kind: 'hip', rise: 1.0, overhang: 0.9, wingLift: 0.4 },
      },
    ]);
    group.add(hall);
  }
  return group;
}

/** Triple-eave circular hall with blue glaze. Terraces, rails, and colonnades stay inside 7.2 / 13.2. */
export function buildTempleOfHeaven(mats: CityMaterials, bracket: BufferGeometry): Group {
  const group = new Group();
  const batch = beginAssembly(group);
  const terraces = [
    { radius: 6.8, y: 0.35, posts: 28 },
    { radius: 5.6, y: 1.15, posts: 24 },
    { radius: 4.5, y: 1.95, posts: 20 },
  ];
  for (const terrace of terraces) {
    batch.add(placedCylinder(terrace.radius, terrace.radius, 0.45, 0, terrace.y, 0, 28), mats.white);
    batch.add(createCircularRailing(terrace.radius - 0.28, terrace.y + 0.2, terrace.posts), mats.white);
  }
  const tiers = [
    { column: 3.95, wall: 3.15, height: 1.8, roof: 5.5, rise: 1.4, bays: 12, gap: 0.7 },
    { column: 3.1, wall: 2.45, height: 1.6, roof: 4.3, rise: 1.3, bays: 10, gap: 0.62 },
    { column: 2.25, wall: 1.75, height: 1.3, roof: 3.2, rise: 1.5, bays: 8, gap: 0.55 },
  ];
  let y = 2.2;
  const thickness = 0.18;
  tiers.forEach((tier, index) => {
    batch.add(placedCylinder(tier.column + 0.35, tier.column + 0.45, 0.2, 0, y + 0.1, 0, 28), mats.white);
    const floor = y + 0.2;
    const eave = floor + tier.height + tier.gap;
    const roof: RoofOptions = {
      width: tier.roof * 2,
      depth: tier.roof * 2,
      rise: tier.rise,
      kind: 'cone',
      wingLift: 0.45,
      thickness,
    };
    const wallTop = eave + roofHeightAt(roof, tier.wall, 0) - thickness - 0.03;
    batch.add(placedCylinder(tier.wall, tier.wall + 0.04, wallTop - floor, 0, (floor + wallTop) / 2, 0, 28), mats.lacquer);
    const coreRadius = tier.wall - 0.5;
    const coreTop = eave + roofHeightAt(roof, coreRadius, 0) - thickness - 0.03;
    if (coreTop > wallTop + 0.05) {
      batch.add(
        placedCylinder(coreRadius, coreRadius, coreTop - wallTop + 0.1, 0, (coreTop + wallTop) / 2, 0, 24),
        mats.lacquer,
      );
    }
    const ringParts = createColumnRingParts({
      radius: tier.column,
      count: tier.bays,
      height: tier.height,
      y: floor,
      shaft: 0.14,
    });
    batch.add(ringParts.columns, mats.lacquer, 0, 'skip');
    batch.add(ringParts.beams, mats.paint, 0, 'skip');
    const chord = 2 * tier.column * Math.sin(Math.PI / tier.bays);
    for (let bay = 0; bay < tier.bays; bay += 1) {
      const angle = -Math.PI / 2 + ((bay + 1) / tier.bays) * Math.PI * 2;
      const x = Math.cos(angle) * (tier.wall + 0.03);
      const z = Math.sin(angle) * (tier.wall + 0.03);
      const door = index === 0 && bay % 3 === (tier.bays - 1) % 3;
      const height = door ? tier.height * 0.84 : tier.height * 0.5;
      batch.add(
        placedBox(chord * 0.5, height, 0.05, x, floor + (door ? 0.1 : tier.height * 0.3) + height / 2, z, Math.PI / 2 - angle),
        mats.window,
        0,
        'skip',
      );
    }
    batch.add(createRoof(roof), mats.glazeBlue, eave);
    addBracketRing(group, bracket, mats.paint, eave - 0.5, tier.column + 0.05, tier.bays);
    if (index === 0) {
      group.userData.plaqueSeat = {
        lintelBottom: ringParts.lintelBottom,
        z: -tier.column - 0.2,
        bayWidth: chord,
      } satisfies PlaqueSeat;
    }
    const next = tiers[index + 1];
    if (next) {
      y = eave + roofHeightAt(roof, next.column + 0.4, 0) - thickness - 0.1;
    } else {
      batch.add(placedCylinder(0.2, 0.08, 1.2, 0, eave + tier.rise + 0.4, 0, 8), mats.gold, 0, 'skip');
      batch.add(placedLathe([[0.0, 0], [0.18, 0.1], [0.14, 0.26], [0.04, 0.5]], 0, eave + tier.rise + 0.95, 0, 8), mats.gold, 0, 'skip');
    }
  });
  batch.finish();
  return group;
}

/** Terraces, a lotus band, a bottle body, a square neck, thirteen heavens, a canopy, and a gilded spire. */
export function buildWhiteDagoba(mats: CityMaterials): Group {
  const group = new Group();
  const batch = beginAssembly(group);
  batch.add(createSumeru(8.8, 8.8, 0.9), mats.stone);
  const second = createSumeru(6.4, 6.4, 0.7);
  second.translate(0, 0.9, 0);
  batch.add(second, mats.white);
  for (const x of [-3.9, 3.9]) {
    for (const z of [-3.9, 3.9]) batch.add(placedBox(0.34, 1.0, 0.34, x, 1.3, z), mats.stone);
  }
  batch.add(placedCylinder(2.55, 2.7, 0.3, 0, 1.75, 0, 20), mats.white);
  batch.add(
    placedLathe(
      [
        [1.9, 0],
        [2.35, 0.25],
        [2.62, 0.95],
        [2.55, 1.7],
        [2.2, 2.45],
        [1.6, 3.05],
        [1.15, 3.45],
        [1.0, 3.65],
      ],
      0,
      1.9,
      0,
      20,
    ),
    mats.white,
  );
  batch.add(placedCylinder(2.66, 2.66, 0.16, 0, 2.2, 0, 20), mats.gold, 0, 'skip');
  const neck = createSumeru(2.1, 2.1, 0.7);
  neck.translate(0, 5.55, 0);
  batch.add(neck, mats.white);
  for (let index = 0; index < 13; index += 1) {
    const y = 6.3 + index * 0.2;
    const radius = 0.98 - index * 0.04;
    batch.add(
      placedCylinder(radius * 0.86, radius, 0.19, 0, y, 0, 16),
      index % 4 === 3 ? mats.gold : mats.white,
      0,
      'skip',
    );
  }
  batch.add(placedCylinder(1.5, 1.55, 0.14, 0, 9.05, 0, 20), mats.gold, 0, 'skip');
  for (let index = 0; index < 14; index += 1) {
    const angle = (index / 14) * Math.PI * 2;
    batch.add(placedBox(0.07, 0.34, 0.07, Math.cos(angle) * 1.46, 8.82, Math.sin(angle) * 1.46), mats.gold, 0, 'skip');
  }
  batch.add(placedCylinder(0.34, 0.64, 0.6, 0, 9.42, 0, 12), mats.gold, 0, 'skip');
  batch.add(
    placedLathe(
      [
        [0.05, 0],
        [0.2, 0.12],
        [0.28, 0.36],
        [0.16, 0.6],
        [0.05, 0.9],
      ],
      0,
      9.72,
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

/** Four posts with stone drums, three painted lintels, a high central roof and two lower side roofs. */
export function buildPailou(mats: CityMaterials, bracket: BufferGeometry): Group {
  const group = new Group();
  const batch = beginAssembly(group);
  const posts = [-7.6, -5.2, 5.2, 7.6];
  for (const x of posts) {
    const outward = Math.sign(x);
    batch.add(placedBox(0.72, 0.4, 0.72, x, 0.2, 0), mats.stone);
    batch.add(placedBox(0.5, 1.45, 0.3, x, 1.12, 0.43), mats.stone);
    batch.add(placedBox(0.5, 1.45, 0.3, x, 1.12, -0.43), mats.stone);
    batch.add(placedCylinder(0.42, 0.42, 0.3, x + outward * 0.62, 0.52, 0, 16, Math.PI / 2), mats.stone);
    batch.add(placedCylinder(0.18, 0.22, 5.35, x, 3.07, 0, 12), mats.lacquer);
    batch.add(placedCylinder(0.03, 0.2, 0.34, x, 5.9, 0, 8), mats.gold, 0, 'skip');
  }
  const bays: Array<[number, number]> = [
    [-5.2, 5.2],
    [-7.6, -5.2],
    [5.2, 7.6],
  ];
  for (const [x0, x1] of bays) {
    const centre = (x0 + x1) / 2;
    const length = x1 - x0;
    batch.add(placedBox(length, 0.42, 0.42, centre, 4.4, 0), mats.paint, 0, 'skip');
    batch.add(placedBox(length, 0.26, 0.34, centre, 3.3, 0), mats.paint, 0, 'skip');
    batch.add(placedBox(length - 0.3, 0.66, 0.16, centre, 3.85, 0), mats.lacquer);
  }
  batch.add(
    createRoof({ width: 12.4, depth: 3.4, rise: 1.4, kind: 'hip', wingLift: 0.8, thickness: 0.2 }),
    mats.tile,
    5.2,
  );
  for (const side of [-1, 1]) {
    const roof = createRoof({ width: 3.6, depth: 2.6, rise: 0.95, kind: 'hip', wingLift: 0.5 });
    roof.translate(side * 6.4, 0, 0);
    batch.add(roof, mats.tile, 4.7);
  }
  batch.finish();
  addBracketRun(group, bracket, mats.paint, 4.78, -0.36, 10.6);
  for (const side of [-1, 1]) {
    const holder = new Group();
    holder.position.x = side * 6.4;
    addBracketRun(holder, bracket, mats.paint, 4.3, -0.34, 2.2);
    group.add(holder);
  }
  return group;
}

export type ShopKind = 'door' | 'window' | 'screen';

/** One shop bay: a closed hall with a front opening toward -Z, a lifted gable roof, and an eave beam. */
export function createShopBay(kind: boolean | ShopKind = 'door'): {
  timber: BufferGeometry;
  wall: BufferGeometry;
  roof: BufferGeometry;
  opening: BufferGeometry;
  eave: BufferGeometry;
} {
  const resolved: ShopKind = kind === true ? 'window' : kind === false ? 'door' : kind;
  const roof = createRoof({ width: 3.6, depth: 3.3, rise: 0.95, kind: 'gable', wingLift: 0.34 });
  roof.translate(0, 2.7, 0);
  const holeWidth = resolved === 'door' ? 1.15 : resolved === 'screen' ? 1.7 : 1.2;
  const holeBottom = resolved === 'door' ? 0.02 : 0.95;
  const holeHeight = resolved === 'door' ? 1.85 : resolved === 'screen' ? 1.05 : 0.9;
  const opening =
    resolved === 'door' ? createDoor(holeWidth, holeHeight) : createWindowOpening(holeWidth, holeHeight);
  opening.translate(0, resolved === 'door' ? holeBottom : holeBottom + holeHeight / 2, -1.08);
  return {
    timber: mergeParts([
      createColumnRowForShop(),
      placedBox(2.9, 0.16, 0.2, 0, 2.28, -1.12),
      placedBox(0.16, 0.5, 0.18, -1.38, 2.1, -1.12),
      placedBox(0.16, 0.5, 0.18, 1.38, 2.1, -1.12),
    ]),
    wall: createEnclosedHall(2.55, 2.15, 2.2, [{ width: holeWidth, height: holeHeight, y: holeBottom }]),
    roof,
    opening,
    eave: placedBox(3.3, 0.08, 0.16, 0, 2.62, -1.62),
  };
}

function createColumnRowForShop(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  for (const x of [-1.2, 1.2]) {
    for (const z of [-1.1, 1.1]) {
      parts.push(placedBox(0.24, 0.14, 0.24, x, 0.07, z));
      parts.push(placedCylinder(0.085, 0.1, 1.9, x, 1.0, z, 8));
    }
  }
  return mergeParts(parts);
}

/** Skirt, four setbacks with corner fins, floor bands set into the glass, and a lit crown. */
export function buildGlassTower(mats: CityMaterials): Group {
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
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        batch.add(
          placedBox(0.18, height + 0.1, 0.18, sx * (width / 2 - 0.02), y + height / 2, sz * (width * 0.41 - 0.02)),
          mats.concrete,
        );
      }
    }
    const floors = Math.max(3, Math.round(height / 1.35));
    for (let floor = 1; floor < floors; floor += 1) {
      const floorY = y + (height * floor) / floors;
      batch.add(placedBox(width * 0.72, 0.06, 0.04, 0, floorY, width * 0.41 - 0.02), mats.window, 0, 'skip');
      batch.add(placedBox(0.04, 0.06, width * 0.62, width / 2 - 0.04, floorY, 0), mats.window, 0, 'skip');
    }
    batch.add(placedBox(width + 0.12, 0.14, width * 0.82 + 0.12, 0, y + height + 0.07, 0), mats.concrete);
  }
  batch.add(placedBox(1.3, 1.15, 1.1, 0, 16.85, 0), mats.concrete);
  batch.add(placedBox(1.55, 0.08, 0.08, 0, 17.5, 0.42), mats.concrete);
  batch.add(placedBox(1.55, 0.08, 0.08, 0, 17.5, -0.42), mats.concrete);
  batch.add(placedBox(0.08, 0.08, 1.15, 0.55, 17.5, 0), mats.concrete);
  batch.add(placedBox(1.7, 0.18, 1.5, 0, 16.2, 0), mats.window, 0, 'skip');
  batch.add(placedCylinder(0.04, 0.07, 2.2, 0, 18.6, 0, 5), mats.concrete);
  batch.finish();
  return group;
}

/** Tea house: moon gate, gate drums, a door head, and a sill window under a lifted hip roof. */
export function buildTeaHouse(mats: CityMaterials): Group {
  const group = new Group();
  const batch = beginAssembly(group);
  batch.add(placedBox(3.6, 2.4, 3.2, 0, 1.2, 0), mats.grayBrick);
  batch.add(placedBox(3.1, 1.35, 2.4, 0, 3.35, 0.1), mats.lacquer, 0, 'skip');
  batch.add(createRoof({ width: 4.8, depth: 4.2, rise: 1.2, kind: 'hip', wingLift: 0.45 }), mats.tile, 4.0);
  batch.add(placedCylinder(0.95, 0.95, 0.18, 0, 1.25, -1.68, 24, Math.PI / 2), mats.stone, 0, 'skip');
  batch.add(placedCylinder(0.72, 0.72, 0.1, 0, 1.25, -1.8, 24, Math.PI / 2), mats.niche, 0, 'skip');
  batch.add(placedCylinder(0.22, 0.22, 0.28, -0.85, 0.2, -1.55, 8), mats.stone);
  batch.add(placedCylinder(0.22, 0.22, 0.28, 0.85, 0.2, -1.55, 8), mats.stone);
  const head = createRoof({ width: 2.1, depth: 0.9, rise: 0.4, kind: 'gable', wingLift: 0.15 });
  head.translate(0, 2.05, -1.7);
  batch.add(head, mats.tile);
  const window = createWindowOpening(1.2, 0.8);
  window.translate(0, 3.2, -1.35);
  batch.add(window, mats.window, 0, 'skip');
  batch.finish();
  return group;
}

/** A street gate: piers, drums, an open arch, a door head, and a lifted gable roof. */
export function buildStreetGate(mats: CityMaterials): Group {
  const group = new Group();
  const batch = beginAssembly(group);
  for (const side of [-1, 1]) {
    batch.add(placedBox(0.7, 0.4, 0.7, side * 1.35, 0.2, 0), mats.stone);
    batch.add(placedBox(0.55, 3.4, 1.8, side * 1.35, 1.9, 0), mats.grayBrick);
  }
  const arch = createArch(1.15, 1.5, 0.22);
  arch.translate(0, 0.35, 0);
  batch.add(arch, mats.grayBrick);
  batch.add(placedBox(3.4, 0.35, 1.9, 0, 3.55, 0), mats.paint, 0, 'skip');
  batch.add(createRoof({ width: 4.6, depth: 2.9, rise: 1.0, kind: 'gable', wingLift: 0.4 }), mats.tile, 3.9);
  batch.add(placedBox(1.4, 0.55, 0.06, 0, 3.15, -0.95), mats.window, 0, 'skip');
  batch.finish();
  return group;
}

/** A flyover bent: footing, battered shaft, and a flared cap that carries the deck. */
export function buildOverpassPier(mats: CityMaterials): Group {
  const group = new Group();
  const batch = beginAssembly(group);
  batch.add(createPierBent(8.2), mats.concrete);
  batch.finish();
  return group;
}
