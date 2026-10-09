import { BufferGeometry, Group, type Material } from 'three';
import {
  addBalusterRun,
  addBracketRun,
  createArch,
  createBalusterGeometry,
  createColumnRow,
  createRailPanel,
  createRoof,
  createSumeru,
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

export interface PlaqueSeat {
  /** Bottom of the upper lintel, local metres. */
  lintelBottom: number;
  /** 0.25 m in front of the road-facing column line. */
  z: number;
  bayWidth: number;
}

/** Half-width of the lower roof, local metres. The wall run butts into this. */
export function gateRoofHalfWidth(options: GateTowerOptions): number {
  const center = options.openingHalf + options.pierWidth / 2;
  const span = center * 2 + options.pierWidth;
  return (span * 1.04) / 2;
}

interface GateLayout {
  center: number;
  span: number;
  hallY: number;
  hallDepth: number;
  columnY: number;
  columnHeight: number;
  columnDepth: number;
  frontColumnZ: number;
  seat: PlaqueSeat;
}

function layoutGate(options: GateTowerOptions): GateLayout {
  const center = options.openingHalf + options.pierWidth / 2;
  const span = center * 2 + options.pierWidth;
  const hallY = options.pierHeight;
  const hallDepth = options.pierDepth * 0.72;
  const archCrown = 0.55 + options.openingHalf + 0.15;
  const columnY = Math.max(hallY + 0.2, archCrown + 0.2);
  const columnHeight = 1.7;
  const columnDepth = Math.min(2.4, hallDepth * 0.55);
  const frontColumnZ = -(options.pierDepth / 2) + 0.55;
  const bayWidth = span / options.bays;
  return {
    center,
    span,
    hallY,
    hallDepth,
    columnY,
    columnHeight,
    columnDepth,
    frontColumnZ,
    seat: {
      lintelBottom: columnY + columnHeight + 0.3,
      z: frontColumnZ - 0.25,
      bayWidth,
    },
  };
}

/**
 * A gate tower: battered piers, an open vault, a columned hall,
 * bracket rows, and one or two xieshan roofs with main, vertical, and hip ridges.
 * The upper storey grows down into the lower roof. The name board hangs in the centre bay.
 */
export function buildGateTower(
  mats: {
    palaceBrick: Material;
    stone: Material;
    tile: Material;
    timber: Material;
    gold: Material;
    white: Material;
    window: Material;
    niche?: Material;
  },
  bracket: BufferGeometry,
  options: GateTowerOptions,
): Group {
  const group = new Group();
  const batch = beginAssembly(group);
  const gate = layoutGate(options);
  const { center, span, hallY, hallDepth } = gate;
  for (const side of [-1, 1]) {
    const footing = createSumeru(
      Math.max(1.6, options.pierWidth - 0.7),
      Math.max(1.6, options.pierDepth - 0.15),
      0.62,
    );
    footing.translate(side * center, 0, 0);
    batch.add(footing, mats.white);
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
    const nicheArch = createArch(0.6, 0.22, 0.12);
    nicheArch.translate(side * center, 2.15, -(options.pierDepth / 2) - 0.02);
    batch.add(nicheArch, mats.palaceBrick);
    batch.add(
      placedBox(1.08, 2.05, 0.12, side * center, 1.78, -(options.pierDepth / 2) + 0.14),
      mats.niche ?? mats.window,
      0,
      'skip',
    );
  }
  const arch = createArch(options.openingHalf + 0.15, options.pierDepth * 0.92, 0.34);
  arch.translate(0, 0.55, 0);
  batch.add(arch, mats.palaceBrick);
  const row = createColumnRow({
    bays: options.bays,
    bayWidth: gate.seat.bayWidth,
    depth: gate.columnDepth,
    height: gate.columnHeight,
    radius: 0.13,
    y: gate.columnY,
  });
  row.translate(0, 0, gate.frontColumnZ + gate.columnDepth / 2);
  batch.add(row, mats.timber, 0, 'skip');
  batch.add(
    placedBox(
      span * 0.98,
      0.16,
      gate.columnDepth + 0.2,
      0,
      gate.columnY - 0.08,
      gate.frontColumnZ + gate.columnDepth / 2,
    ),
    mats.stone,
  );
  const archCrown = 0.55 + options.openingHalf + 0.15;
  const wallBottom = Math.max(hallY, archCrown + 0.28);
  const wallTop = hallY + 2.05;
  const wallHeight = Math.max(0.4, wallTop - wallBottom);
  batch.add(
    placedBox(span * 0.7, wallHeight, 0.38, 0, wallHeight / 2, hallDepth * 0.22),
    mats.palaceBrick,
    wallBottom,
  );
  batch.add(placedBox(span * 0.62, 0.32, 0.36, 0, hallY + 2.05, hallDepth * 0.12), mats.palaceBrick);
  const parapetH = 0.85;
  const parapetZ = -(options.pierDepth / 2) + 0.08;
  batch.add(
    placedBox(span * 0.88, parapetH, 0.24, 0, hallY + parapetH / 2, parapetZ),
    mats.palaceBrick,
  );
  batch.add(placedBox(span * 0.9, 0.07, 0.32, 0, hallY + parapetH + 0.03, parapetZ), mats.stone);
  const lowerEave = hallY + 3.2;
  const lowerRoof = createRoof({
    width: span * 1.04,
    depth: options.pierDepth + 1.1,
    rise: 1.35,
    kind: 'xieshan',
    wingLift: 0.22,
  });
  lowerRoof.translate(0, lowerEave, 0);
  batch.add(lowerRoof, mats.tile);
  const upperEave = hallY + 6.1;
  if (options.eaves > 1) {
    const upperBottom = lowerEave + 0.15;
    const upperHeight = upperEave - upperBottom;
    batch.add(
      placedBox(span * 0.48, upperHeight, hallDepth * 0.42, 0, upperBottom + upperHeight / 2, 0),
      mats.palaceBrick,
    );
    const upper = createRoof({
      width: span * 0.68,
      depth: options.pierDepth * 0.72,
      rise: 1.05,
      kind: 'xieshan',
      wingLift: 0.16,
    });
    upper.translate(0, upperEave, 0);
    batch.add(upper, mats.tile);
  }
  if (options.portrait && mats.niche) {
    const niche = placedBox(1.5, 2.0, 0.06, 0, hallY - 1.5, -(options.pierDepth / 2 + 0.08));
    batch.add(niche, mats.niche, 0, 'skip');
  }
  batch.finish();
  group.userData.plaqueSeat = gate.seat;
  addBracketRun(group, bracket, mats.timber, hallY + 2.55, -(hallDepth * 0.42), span * 0.72);
  if (options.eaves > 1) {
    addBracketRun(group, bracket, mats.timber, upperEave - 0.42, -(hallDepth * 0.22), span * 0.42);
  }
  addBalusterRun(
    group,
    createBalusterGeometry(),
    createRailPanel(),
    mats.stone,
    hallY + parapetH,
    parapetZ,
    span * 0.72,
    options.bays + 2,
  );
  return group;
}
