import { Group, type BufferGeometry } from 'three';
import {
  createDoorway,
  createGatePlatform,
  createGateSurround,
  createSumeru,
  placedBox,
} from '../kit';
import { beginAssembly } from './batch';
import type { CityMaterials } from './materials';
import { stackTiers, type Glaze, type TierSpec } from './tiers';

export type { PlaqueSeat } from './tiers';

export interface GateTowerOptions {
  /** Inner face of each pier, local metres. The drive-through opening is twice this. */
  openingHalf: number;
  pierWidth: number;
  pierDepth: number;
  pierHeight: number;
  bays: number;
  eaves: 1 | 2;
  /** Flank each pier with an arched door, as the set-back palace gate does. */
  portrait?: boolean;
  glaze?: Glaze;
}

/** Half the platform length, local metres. Walls butt into this. */
export function gateHalfWidth(options: GateTowerOptions): number {
  return options.openingHalf + options.pierWidth;
}

/**
 * A gate: a solid platform with a tunnel, stone surrounds, a crenellated parapet, and a one- or
 * two-storey hall on top. The name board hangs on the lintel of the middle bay.
 */
export function buildGateTower(
  mats: CityMaterials,
  bracket: BufferGeometry,
  options: GateTowerOptions,
): Group {
  const group = new Group();
  const batch = beginAssembly(group);
  const center = options.openingHalf + options.pierWidth / 2;
  const span = gateHalfWidth(options) * 2;
  const platformTop = options.pierHeight + 0.35;
  const vertical = Math.min(options.openingHalf, options.pierHeight - 1.3);
  const spring = options.pierHeight - 1.3 - vertical;
  const depth = options.pierDepth;

  batch.add(createGatePlatform(span, platformTop, depth, options.openingHalf, spring, vertical), mats.palaceBrick);
  for (const side of [-1, 1]) {
    const footing = createSumeru(options.pierWidth + 0.5, depth + 0.5, 0.55);
    footing.translate(side * center, 0, 0);
    batch.add(footing, mats.white);
    batch.add(placedBox(options.pierWidth + 0.3, 0.2, depth + 0.3, side * center, platformTop - 1.1, 0), mats.stone);
  }
  for (const face of [-1, 1]) {
    const surround = createGateSurround(options.openingHalf, spring, vertical);
    surround.translate(0, 0, face * (depth / 2 + 0.13));
    batch.add(surround, mats.stone);
  }
  batch.add(placedBox(span + 0.5, 0.26, depth + 0.5, 0, platformTop + 0.05, 0), mats.stone);

  const parapetZ = depth / 2 - 0.17;
  for (const face of [-1, 1]) {
    batch.add(placedBox(span, 0.8, 0.34, 0, platformTop + 0.58, face * parapetZ), mats.palaceBrick);
    batch.add(placedBox(span + 0.1, 0.1, 0.44, 0, platformTop + 1.03, face * parapetZ), mats.stone);
    const merlons = Math.round(span / 1.15);
    for (let index = 0; index < merlons; index += 1) {
      const x = -span / 2 + (span / merlons) * (index + 0.5);
      batch.add(placedBox(0.6, 0.5, 0.34, x, platformTop + 1.33, face * parapetZ), mats.palaceBrick);
    }
  }

  if (options.portrait) {
    for (const side of [-1, 1]) {
      const place = (geometry: BufferGeometry) => {
        geometry.translate(side * center, 0.55, -depth / 2 - 0.3);
        return geometry;
      };
      const parts = createDoorway(1.5, 3.4);
      batch.add(place(parts.stone), mats.stone);
      batch.add(place(parts.door), mats.lacquer);
      batch.add(place(parts.studs), mats.gold, 0, 'skip');
      batch.add(place(parts.dark), mats.niche, 0, 'skip');
      batch.add(placedBox(2.8, 0.3, 0.7, side * center, 0.15, -depth / 2 - 0.55), mats.stone);
    }
  }

  const hallDepth = Math.min(options.pierDepth * 0.5, options.pierDepth - 2.5);
  const lower: TierSpec = {
    width: span * (options.portrait ? 0.54 : 0.48),
    depth: hallDepth,
    wallHeight: options.portrait ? 2.2 : 2.6,
    gallery: options.portrait ? 0.55 : 0.8,
    bays: options.bays,
    front: 'doors',
    roof: {
      kind: 'xieshan',
      rise: options.portrait ? 1.6 : 1.8,
      overhang: options.portrait ? 1.3 : 1.7,
      wingLift: options.portrait ? 0.6 : 0.75,
    },
    glaze: options.glaze ?? 'tile',
  };
  const upper: TierSpec = {
    width: span * (options.portrait ? 0.3 : 0.28),
    depth: hallDepth * 0.8,
    wallHeight: options.portrait ? 1.7 : 2.0,
    gallery: options.portrait ? 0.5 : 0.7,
    bays: 3,
    front: 'windows',
    roof: {
      kind: 'xieshan',
      rise: options.portrait ? 1.7 : 1.9,
      overhang: options.portrait ? 1.2 : 1.6,
      wingLift: options.portrait ? 0.6 : 0.8,
    },
    glaze: options.glaze ?? 'tile',
    finial: true,
  };
  batch.finish();
  stackTiers(group, mats, bracket, platformTop + 0.1, options.eaves > 1 ? [lower, upper] : [{ ...lower, finial: true }]);
  return group;
}
