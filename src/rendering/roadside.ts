import { Group, Mesh, type Material } from 'three';
import {
  createBalustradePanel,
  createBalustradePost,
  createBarrier,
  createBench,
  createHuabiao,
  createRoof,
  createSweep,
  placedBox,
  placedCylinder,
  type SweepFrame,
  type SweepOutline,
} from './kit';
import { createLowRise } from './buildings';
import { CENTRAL_AXIS_LANDMARKS } from './spatialContract';
import { hash01 } from './surfaceTextures';
import { blocked, claim } from './occupancy';
import { PATH_METRES, sweepFrames } from './pathSweep';
import { hangFramedPlaque } from './plaques';
import { faceRoad, scatter, type Stamp } from './stamps';
import type { CityHost } from './assembleCity';

function addSweep(
  host: CityHost,
  frames: SweepFrame[],
  outlines: SweepOutline[],
  material: Material,
  cast = true,
): void {
  const mesh = new Mesh(host.track(createSweep(frames, outlines)), material);
  mesh.frustumCulled = false;
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  host.root.add(mesh);
}

/** Marble posts and carved panels along one side of the road, every 2.4 m. */
function balustrade(host: CityHost, from: number, to: number, offset: number, y: number): void {
  const metres = (to - from) * PATH_METRES;
  const count = Math.max(2, Math.round(metres / 2.4));
  const posts: Stamp[] = [];
  const panels: Stamp[] = [];
  for (let index = 0; index <= count; index += 1) {
    posts.push({ progress: from + ((to - from) * index) / count, offset, y });
    if (index < count) panels.push({ progress: from + ((to - from) * (index + 0.5)) / count, offset, y });
  }
  scatter(host, createBalustradePost(), host.mats.white, posts, false);
  scatter(host, createBalustradePanel(2.0), host.mats.white, panels, false);
}

/** A small gateway over the pavement: two posts, a painted beam, a lifted roof, and a framed name. */
function marker(host: CityHost, progress: number, offset: number, name: string): void {
  if (blocked(progress, offset, 0.8, 3.8)) return;
  claim(progress, offset, 1.2, 4.2);
  const { mats } = host;
  const group = new Group();
  for (const x of [-1.7, 1.7]) {
    group.add(new Mesh(placedBox(0.5, 0.3, 0.5, x, 0.15, 0), mats.stone));
    group.add(new Mesh(placedCylinder(0.15, 0.18, 2.9, x, 1.75, 0, 10), mats.lacquer));
  }
  group.add(new Mesh(placedBox(4.0, 0.26, 0.34, 0, 2.75, 0), mats.paint));
  const roof = new Mesh(host.track(createRoof({ width: 4.8, depth: 2.2, rise: 0.7, kind: 'gable', wingLift: 0.3 })), mats.tile);
  roof.position.y = 2.98;
  group.add(roof);
  hangFramedPlaque(host, group, name, 0, 2.1, -0.24, 2.6, 0.5);
  host.place(group, progress, offset, 0);
  host.root.add(group);
}

/** Roadside layers: the red axis wall, huabiao, balustrades, the lake edge, signs, benches, and barriers. */
export function dressRoadside(host: CityHost): void {
  const { mats } = host;
  const tiananmen = CENTRAL_AXIS_LANDMARKS.tiananmen;

  const redWall: SweepOutline[] = [[[-0.72, 0], [0.72, 0], [0.58, 2.5], [-0.58, 2.5]]];
  const plinth: SweepOutline[] = [[[-0.88, 0], [0.88, 0], [0.88, 0.4], [-0.88, 0.4]]];
  const glazedCap: SweepOutline[] = [[[-0.84, 2.5], [0.84, 2.5], [0.7, 2.84], [0, 3.12], [-0.7, 2.84]]];
  for (const [side, to] of [[-1, 0.054], [1, 0.078]] as const) {
    const frames = sweepFrames(0.012, to, side * 10.2);
    addSweep(host, frames, redWall, mats.palaceBrick);
    addSweep(host, frames, plinth, mats.stone);
    addSweep(host, frames, glazedCap, mats.glaze);
    claim((0.012 + to) / 2, side * 10.2, (to - 0.012) * PATH_METRES, 2);
  }

  scatter(
    host,
    createHuabiao(),
    mats.white,
    [-0.006, 0.006].map((delta) => ({
      progress: tiananmen.progress + delta,
      offset: tiananmen.lateralOffset + 4.6,
      y: 0.04,
    })),
    true,
  );
  balustrade(host, 0.05, 0.068, -7.1, 0.04);
  balustrade(host, 0.05, 0.068, 7.1, 0.04);

  const sign = new Group();
  host.place(sign, 0.031, -12.4, 0);
  for (const x of [-1.9, 1.9]) sign.add(new Mesh(placedCylinder(0.08, 0.1, 3.4, x, 1.7, 0, 8), mats.concrete));
  sign.add(new Mesh(placedBox(4.6, 1.15, 0.12, 0, 3.15, 0.07), mats.concrete));
  const board = host.plaque('长安街', {
    width: 900,
    height: 210,
    background: '#1F5E86',
    border: '#E7F0EE',
    color: '#F6F7E9',
    font: '800 86px "PingFang SC", "Microsoft YaHei", sans-serif',
  });
  if (board) {
    const panel = new Mesh(host.track(placedBox(4.2, 0.9, 0.06, 0, 0, 0)), board);
    panel.position.set(0, 3.15, -0.02);
    sign.add(panel);
  }
  host.root.add(sign);

  addSweep(host, sweepFrames(0.168, 0.248, 0), [[[-6.95, -0.5], [-6.4, -0.5], [-6.4, 0.06], [-6.95, 0.06]]], mats.stone, false);
  balustrade(host, 0.172, 0.246, -6.62, 0.06);
  scatter(
    host,
    createBench(),
    mats.paint,
    [0.189, 0.2, 0.211].map((progress) => ({ progress, offset: -5.75, heading: -Math.PI / 2, y: 0.04 })),
    false,
  );
  const bankShapes = [0, 1, 2].map((variant) => createLowRise(variant));
  const bankWalls = [mats.grayBrick, mats.grayBrick, mats.streetBrick];
  const bankWindows = [mats.window, mats.windowSlat, mats.windowDiamond];
  const bank: Stamp[][] = [[], [], []];
  for (let index = 0; index < 9; index += 1) {
    const progress = 0.178 + index * 0.0078;
    const variant = Math.floor(hash01(index, 61) * 3);
    const shade = 0.88 + hash01(index, 62) * 0.22;
    bank[variant].push({
      progress,
      offset: -27 - hash01(index, 63) * 1.5,
      heading: faceRoad(-27),
      scale: 1.05 + hash01(index, 64) * 0.3,
      tint: [shade, shade, shade],
    });
  }
  bankShapes.forEach((shape, variant) => {
    scatter(host, shape.wall, bankWalls[variant], bank[variant], false);
    if (shape.roof) scatter(host, shape.roof, mats.tile, bank[variant], false);
    scatter(host, shape.glow, bankWindows[variant], bank[variant], false);
  });

  const bikes = new Group();
  host.place(bikes, 0.535, 6.8, 0);
  for (let index = 0; index < 3; index += 1) {
    const x = index * 0.85;
    bikes.add(new Mesh(placedBox(0.05, 0.04, 0.9, x, 0.48, 0), mats.concrete));
    bikes.add(new Mesh(placedBox(0.04, 0.28, 0.04, x, 0.62, -0.28), mats.concrete));
    bikes.add(new Mesh(placedCylinder(0.22, 0.22, 0.04, x, 0.24, 0.32, 10, Math.PI / 2), mats.timber));
    bikes.add(new Mesh(placedCylinder(0.22, 0.22, 0.04, x, 0.24, -0.32, 10, Math.PI / 2), mats.timber));
  }
  host.root.add(bikes);

  const shelter = new Group();
  host.place(shelter, 0.704, 7.1, 0);
  shelter.add(new Mesh(placedBox(0.1, 2.2, 3.2, 0.4, 1.15, 0), mats.glass));
  shelter.add(new Mesh(placedBox(1.2, 0.1, 3.4, 0, 2.3, 0), mats.concrete));
  host.root.add(shelter);

  marker(host, 0.503, 6.3, '南锣鼓巷');
  marker(host, 0.566, -6.3, '五道营');

  const barriers: Stamp[] = [];
  for (let index = 0; index < 8; index += 1) {
    const progress = 0.338 + index * 0.008;
    for (const side of [-1, 1]) barriers.push({ progress, offset: side * 6.9, y: 0.04 });
  }
  scatter(host, createBarrier(), mats.concrete, barriers, false);
}
