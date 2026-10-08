import { BufferGeometry, Group, Mesh, type Material } from 'three';
import { addBracketRun, createArch, createColumnRow, createPodium, createRailing, createRoof, placedBox } from '../kit';

export interface GateTowerOptions {
  /** Inner face of each pier, local metres. The drive-through opening is twice this. */
  openingHalf: number;
  pierWidth: number;
  pierDepth: number;
  pierHeight: number;
  bays: number;
  eaves: 1 | 2;
}

function add(group: Group, geometry: BufferGeometry, material: Material): Mesh {
  const mesh = new Mesh(geometry, material);
  group.add(mesh);
  return mesh;
}

/**
 * A gate tower: battered piers, a vaulted opening, a columned hall,
 * bracket rows, and one or two roofs with ridges.
 */
export function buildGateTower(
  mats: {
    palaceBrick: Material;
    stone: Material;
    tile: Material;
    timber: Material;
    gold: Material;
    window: Material;
  },
  bracket: BufferGeometry,
  options: GateTowerOptions,
): Group {
  const group = new Group();
  const center = options.openingHalf + options.pierWidth / 2;
  const span = center * 2 + options.pierWidth;
  const hallY = options.pierHeight;
  add(group, createPodium({ width: span, depth: options.pierDepth + 0.4, height: 0.7, steps: 0 }), mats.stone);
  for (const side of [-1, 1]) {
    const pier = placedBox(
      options.pierWidth,
      options.pierHeight,
      options.pierDepth,
      side * center,
      options.pierHeight / 2 + 0.35,
      0,
    );
    add(group, pier, mats.palaceBrick);
  }
  add(group, createArch(options.openingHalf + 0.15, options.pierDepth * 0.92, 0.34), mats.palaceBrick);
  const arch = group.children[group.children.length - 1] as Mesh;
  arch.position.y = 0.55;

  const hallDepth = options.pierDepth * 0.72;
  add(
    group,
    createColumnRow({
      bays: options.bays,
      bayWidth: (span * 0.72) / options.bays,
      depth: hallDepth,
      height: 2.1,
      y: hallY,
    }),
    mats.timber,
  );
  add(
    group,
    placedBox(span * 0.96, 0.9, hallDepth + 0.4, 0, hallY + 2.55, 0),
    mats.palaceBrick,
  );
  addBracketRun(group, bracket, mats.timber, hallY + 3.15, -(hallDepth / 2 + 0.05), span * 0.9);
  add(
    group,
    createRoof({ width: span * 1.04, depth: options.pierDepth + 1.1, rise: 1.35, kind: 'hip', wingLift: 0.22 }),
    mats.tile,
  );
  const lowerRoof = group.children[group.children.length - 1] as Mesh;
  lowerRoof.position.y = hallY + 3.2;
  add(group, createRailing(span * 0.7, hallY + 0.15, -(hallDepth / 2 + 0.15), options.bays), mats.stone);

  if (options.eaves > 1) {
    const upperY = hallY + 4.7;
    add(group, placedBox(span * 0.62, 0.7, hallDepth * 0.7, 0, upperY, 0), mats.palaceBrick);
    addBracketRun(group, bracket, mats.timber, upperY + 0.85, -(hallDepth * 0.28), span * 0.55);
    add(
      group,
      createRoof({
        width: span * 0.68,
        depth: options.pierDepth * 0.72,
        rise: 1.05,
        kind: 'hip',
        wingLift: 0.16,
      }),
      mats.tile,
    );
    const upper = group.children[group.children.length - 1] as Mesh;
    upper.position.y = upperY + 0.9;
  }

  const glow = new Mesh(placedBox(0.9, 2.4, 0.08, 0, 2.2, -(options.pierDepth / 2 + 0.06)), mats.window);
  group.add(glow);
  return group;
}
