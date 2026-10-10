import { Group, type BufferGeometry } from 'three';
import {
  addBracketRun,
  createColumnPerimeter,
  createRoof,
  placedBox,
  placedCylinder,
  roofHeightAt,
  type RoofKind,
  type RoofOptions,
} from '../kit';
import { beginAssembly } from './batch';
import type { CityMaterials } from './materials';

export type Glaze = 'tile' | 'glaze' | 'glazeBlue';

export interface PlaqueSeat {
  /** Underside of the big lintel, in the building's local metres. */
  lintelBottom: number;
  /** Centre of a board hung against the front of that lintel. */
  z: number;
  bayWidth: number;
}

export interface TierSpec {
  /** Wall footprint. */
  width: number;
  depth: number;
  wallHeight: number;
  /** Colonnade clearance outside the wall. */
  gallery: number;
  bays: number;
  depthBays?: number;
  /** Lattice doors in the middle bays of the front face, windows elsewhere. */
  front?: 'doors' | 'windows' | 'plain';
  roof: { kind: RoofKind; rise: number; overhang: number; wingLift: number };
  /** Clear height between the lintel and the eave. Small upper tiers use less. Default 0.82. */
  eaveGap?: number;
  glaze?: Glaze;
  finial?: boolean;
  /** Skip the stone floor slab when something else already carries the tier. */
  bare?: boolean;
}

export interface TierStack {
  top: number;
  seat: PlaqueSeat;
}

function minSoffit(roof: RoofOptions, eaveY: number, halfW: number, halfD: number): number {
  const thickness = roof.thickness ?? 0.14;
  const samples: Array<[number, number]> = [
    [halfW, halfD],
    [-halfW, halfD],
    [halfW, -halfD],
    [-halfW, -halfD],
    [0, halfD],
    [0, -halfD],
    [halfW, 0],
    [-halfW, 0],
  ];
  return Math.min(...samples.map(([x, z]) => eaveY + roofHeightAt(roof, x, z) - thickness));
}

/**
 * Stack halls from the bottom up. Each tier's floor is buried in the roof below, its walls rise to the
 * roof soffit above, and its columns, lintels, brackets and lattice are added around them.
 */
export function stackTiers(
  group: Group,
  mats: CityMaterials,
  bracket: BufferGeometry,
  baseY: number,
  tiers: TierSpec[],
): TierStack {
  const batch = beginAssembly(group);
  let y = baseY;
  let seat: PlaqueSeat | undefined;
  let top = baseY;
  tiers.forEach((tier, index) => {
    const outerWidth = tier.width + tier.gallery * 2;
    const outerDepth = tier.depth + tier.gallery * 2;
    const floorTop = y + (tier.bare ? 0 : 0.2);
    if (!tier.bare) batch.add(placedBox(outerWidth + 0.7, 0.2, outerDepth + 0.7, 0, y + 0.1, 0), mats.stone);
    const roofWidth = outerWidth + tier.roof.overhang * 2;
    const roofDepth = outerDepth + tier.roof.overhang * 2;
    const roof: RoofOptions = {
      width: roofWidth,
      depth: roofDepth,
      rise: tier.roof.rise,
      kind: tier.roof.kind,
      wingLift: tier.roof.wingLift,
      thickness: Math.min(0.26, 0.1 + roofWidth * 0.012),
    };
    const gap = tier.eaveGap ?? 0.82;
    const eaveY = floorTop + tier.wallHeight + gap;
    const wallTop = minSoffit(roof, eaveY, tier.width / 2, tier.depth / 2) - 0.03;
    const wallHeight = wallTop - floorTop;
    batch.add(placedBox(tier.width, wallHeight, tier.depth, 0, floorTop + wallHeight / 2, 0), mats.lacquer);
    batch.add(placedBox(tier.width + 0.06, 0.8, tier.depth + 0.06, 0, floorTop + 0.4, 0), mats.palaceBrick);
    const coreTop = minSoffit(roof, eaveY, tier.width / 2 - 0.3, tier.depth / 2 - 0.3) - 0.03;
    if (coreTop > wallTop + 0.05) {
      const coreHeight = coreTop - wallTop;
      batch.add(
        placedBox(tier.width - 0.6, coreHeight + 0.1, tier.depth - 0.6, 0, wallTop + coreHeight / 2 - 0.05, 0),
        mats.lacquer,
      );
    }
    const columns = createColumnPerimeter({
      width: outerWidth,
      depth: outerDepth,
      bays: tier.bays,
      depthBays: tier.depthBays ?? Math.max(2, Math.round((tier.bays * tier.depth) / tier.width)),
      height: tier.wallHeight,
      radius: 0.17,
      y: floorTop,
    });
    batch.add(columns.columns, mats.lacquer, 0, 'skip');
    batch.add(columns.beams, mats.paint, 0, 'skip');

    const bayWidth = outerWidth / tier.bays;
    const front = tier.front ?? 'windows';
    if (front !== 'plain') {
      const faceZ = -tier.depth / 2 - 0.03;
      for (let bay = 0; bay < tier.bays; bay += 1) {
        const x = -outerWidth / 2 + (bay + 0.5) * bayWidth;
        const middle = Math.abs(bay + 0.5 - tier.bays / 2) < Math.max(1.1, tier.bays * 0.2);
        const door = front === 'doors' && middle;
        const height = door ? tier.wallHeight * 0.86 : tier.wallHeight * 0.52;
        const lower = door ? 0.1 : tier.wallHeight * 0.3;
        batch.add(
          placedBox(bayWidth * (door ? 0.6 : 0.5), height, 0.05, x, floorTop + lower + height / 2, faceZ),
          mats.window,
          0,
          'skip',
        );
      }
    }
    const sideBays = tier.depthBays ?? Math.max(2, Math.round((tier.bays * tier.depth) / tier.width));
    const sideBay = outerDepth / sideBays;
    for (const side of [-1, 1]) {
      for (let bay = 0; bay < sideBays; bay += 1) {
        const z = -outerDepth / 2 + (bay + 0.5) * sideBay;
        const height = tier.wallHeight * 0.5;
        batch.add(
          placedBox(0.05, height, sideBay * 0.5, side * (tier.width / 2 + 0.03), floorTop + tier.wallHeight * 0.3 + height / 2, z),
          mats.window,
          0,
          'skip',
        );
      }
    }

    batch.add(createRoof(roof), mats[tier.glaze ?? 'tile'], eaveY);
    const bracketY = eaveY - Math.min(0.5, gap * 0.62);
    addBracketRun(group, bracket, mats.paint, bracketY, -outerDepth / 2 - 0.04, outerWidth);
    for (const sign of [-1, 1]) {
      const holder = new Group();
      holder.rotation.y = (sign < 0 ? 1 : -1) * (Math.PI / 2);
      holder.position.set(sign * (outerWidth / 2 + 0.04), 0, 0);
      addBracketRun(holder, bracket, mats.paint, bracketY, 0, outerDepth);
      group.add(holder);
    }

    if (index === 0) {
      seat = {
        lintelBottom: columns.lintelBottom,
        z: -outerDepth / 2 - 0.22,
        bayWidth,
      };
    }
    top = eaveY + tier.roof.rise;
    const next = tiers[index + 1];
    if (next) {
      const slabHalfW = (next.width + next.gallery * 2) / 2 + 0.35;
      const slabHalfD = (next.depth + next.gallery * 2) / 2 + 0.35;
      y = minSoffit(roof, eaveY, slabHalfW, slabHalfD) + roof.thickness! - 0.12;
    } else if (tier.finial) {
      batch.add(placedCylinder(0.08, 0.2, 0.9, 0, top + 0.3, 0, 8), mats.gold, 0, 'skip');
      top += 0.75;
    }
  });
  batch.finish();
  const result = { top, seat: seat! };
  group.userData.plaqueSeat = result.seat;
  return result;
}
