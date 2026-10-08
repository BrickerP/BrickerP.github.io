import { BufferGeometry, Group, type Material } from 'three';
import {
  addBalusterRun,
  addBracketRun,
  createArch,
  createBalusterGeometry,
  createColumnRow,
  createPodium,
  createRailPanel,
  createRoof,
  placedBox,
} from '../kit';
import { beginAssembly } from './batch';

export interface GateTowerOptions {
  /** Inner face of each pier, local metres. The drive-through opening is twice this. */
  openingHalf: number;
  pierWidth: number;
  pierDepth: number;
  pierHeight: number;
  bays: number;
  eaves: 1 | 2;
  /** A centred niche above the arch, used by the set-back gate. */
  portrait?: boolean;
}

/**
 * A gate tower: battered piers, an open vault, a columned hall,
 * bracket rows, and one or two xieshan roofs with main, vertical, and hip ridges.
 */
export function buildGateTower(
  mats: {
    palaceBrick: Material;
    stone: Material;
    tile: Material;
    timber: Material;
    gold: Material;
    window: Material;
    niche?: Material;
  },
  bracket: BufferGeometry,
  options: GateTowerOptions,
): Group {
  const group = new Group();
  const batch = beginAssembly(group);
  const center = options.openingHalf + options.pierWidth / 2;
  const span = center * 2 + options.pierWidth;
  const hallY = options.pierHeight;
  const hallDepth = options.pierDepth * 0.72;
  for (const side of [-1, 1]) {
    const footing = createPodium({
      width: Math.max(0.8, options.pierWidth - 0.4),
      depth: Math.max(0.8, options.pierDepth - 0.5),
      height: 0.7,
      steps: 0,
    });
    footing.translate(side * center, 0, 0);
    batch.add(footing, mats.stone);
    batch.add(
      placedBox(
        options.pierWidth,
        options.pierHeight,
        options.pierDepth,
        side * center,
        options.pierHeight / 2 + 0.35,
        0,
      ),
      mats.palaceBrick,
    );
  }
  const arch = createArch(options.openingHalf + 0.15, options.pierDepth * 0.92, 0.34);
  arch.translate(0, 0.55, 0);
  batch.add(arch, mats.palaceBrick);
  batch.add(
    createColumnRow({
      bays: options.bays,
      bayWidth: (span * 0.72) / options.bays,
      depth: hallDepth,
      height: 2.1,
      y: hallY,
    }),
    mats.timber,
    0,
    'skip',
  );
  batch.add(placedBox(span * 0.96, 0.9, hallDepth + 0.4, 0, hallY + 2.55, 0), mats.palaceBrick);
  const lowerRoof = createRoof({
    width: span * 1.04,
    depth: options.pierDepth + 1.1,
    rise: 1.35,
    kind: 'xieshan',
    wingLift: 0.22,
  });
  lowerRoof.translate(0, hallY + 3.2, 0);
  batch.add(lowerRoof, mats.tile);
  if (options.eaves > 1) {
    const upperY = hallY + 4.7;
    batch.add(placedBox(span * 0.62, 0.7, hallDepth * 0.7, 0, upperY, 0), mats.palaceBrick);
    const upper = createRoof({
      width: span * 0.68,
      depth: options.pierDepth * 0.72,
      rise: 1.05,
      kind: 'xieshan',
      wingLift: 0.16,
    });
    upper.translate(0, upperY + 0.9, 0);
    batch.add(upper, mats.tile);
  }
  for (const side of [-1, 1]) {
    const slot = placedBox(0.22, 1.6, 0.08, side * (options.openingHalf + 0.55), 2.4, -(options.pierDepth / 2 + 0.02));
    batch.add(slot, mats.window, 0, 'skip');
  }
  if (options.portrait && mats.niche) {
    const niche = placedBox(1.5, 2.0, 0.06, 0, hallY - 1.5, -(options.pierDepth / 2 + 0.08));
    batch.add(niche, mats.niche, 0, 'skip');
  }
  batch.finish();
  addBracketRun(group, bracket, mats.timber, hallY + 3.15, -(hallDepth / 2 + 0.05), span * 0.9);
  if (options.eaves > 1) {
    addBracketRun(group, bracket, mats.timber, hallY + 5.55, -(hallDepth * 0.28), span * 0.55);
  }
  addBalusterRun(
    group,
    createBalusterGeometry(),
    createRailPanel(),
    mats.stone,
    hallY + 0.15,
    -(hallDepth / 2 + 0.15),
    span * 0.7,
    options.bays + 2,
  );
  return group;
}
