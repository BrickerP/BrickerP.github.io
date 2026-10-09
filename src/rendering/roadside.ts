import { Group, Mesh } from 'three';
import { hash01 } from './surfaceTextures';
import { CENTRAL_AXIS_LANDMARKS } from './spatialContract';
import { mergeParts, placedBox, placedCylinder } from './kit';
import type { CityHost } from './assembleCity';
import { InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three';
import { DRIVE_PATH_SCALE } from './FirstPersonCameraRig';
import { pathHeading, samplePathFrame } from './drivePath';
import type { BufferGeometry, Material } from 'three';

interface Stamp {
  progress: number;
  offset: number;
  y?: number;
  heading?: number;
  scale?: number;
}

const UP = new Vector3(0, 1, 0);

function scatter(
  host: CityHost,
  geometry: BufferGeometry,
  material: Material,
  stamps: Stamp[],
): void {
  if (stamps.length === 0) return;
  const mesh = new InstancedMesh(host.track(geometry), material, stamps.length);
  mesh.frustumCulled = false;
  const matrix = new Matrix4();
  const position = new Vector3();
  const quaternion = new Quaternion();
  const scale = new Vector3();
  stamps.forEach((stamp, index) => {
    const frame = samplePathFrame(stamp.progress);
    position.set(
      frame.point.x * DRIVE_PATH_SCALE + frame.normal.x * stamp.offset,
      stamp.y ?? 0,
      frame.point.z * DRIVE_PATH_SCALE + frame.normal.z * stamp.offset,
    );
    quaternion.setFromAxisAngle(UP, pathHeading(frame.tangent) + (stamp.heading ?? 0));
    scale.setScalar(stamp.scale ?? 1);
    matrix.compose(position, quaternion, scale);
    mesh.setMatrixAt(index, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  host.root.add(mesh);
}

function marker(
  host: CityHost,
  progress: number,
  offset: number,
  name: string,
  blocked: (progress: number, offset: number, along: number, across: number) => boolean,
): void {
  if (blocked(progress, offset, 0.8, 3.8)) {
    if (import.meta.env.DEV) console.assert(false, `${name} overlaps a wall`);
    return;
  }
  const group = new Group();
  host.place(group, progress, offset, 0);
  group.add(new Mesh(placedBox(0.46, 2.3, 0.46, -1.5, 1.15, 0), host.mats.streetBrick));
  group.add(new Mesh(placedBox(0.46, 2.3, 0.46, 1.5, 1.15, 0), host.mats.streetBrick));
  group.add(new Mesh(placedBox(3.6, 0.28, 0.5, 0, 2.4, 0), host.mats.timber));
  group.add(new Mesh(placedBox(3.8, 0.1, 0.7, 0, 2.6, 0), host.mats.gold));
  const plaque = host.plaque(name, {
    width: 640,
    height: 176,
    background: '#1C3A2E',
    border: '#C9A056',
    color: '#EFD494',
    font: '700 92px "Songti SC", "STSong", serif',
  });
  if (plaque) {
    const panel = new Mesh(host.track(placedBox(2.4, 0.55, 0.04, 0, 0, 0)), plaque);
    panel.position.set(0, 2.35, -0.3);
    group.add(panel);
  }
  host.root.add(group);
}

/** Roadside layers the kit passage lost: rails, lanterns, signs, benches, and the far bank. */
export function dressRoadside(
  host: CityHost,
  blocked: (progress: number, offset: number, along: number, across: number) => boolean,
): void {
  const { mats } = host;
  const axisWalls: Stamp[] = [];
  for (let index = 0; index < 7; index += 1) {
    const progress = 0.012 + index * 0.01;
    axisWalls.push({ progress, offset: -10.2, scale: 1 });
    axisWalls.push({ progress, offset: 10.2, scale: 1 });
  }
  scatter(host, placedBox(3.2, 2.1, 4.2, 0, 1.05, 0), mats.streetBrick, axisWalls);

  const tiananmen = CENTRAL_AXIS_LANDMARKS.tiananmen;
  for (const delta of [-0.006, 0.006]) {
    const column = new Group();
    host.place(column, tiananmen.progress + delta, tiananmen.lateralOffset + 4.6, 0);
    column.add(new Mesh(placedCylinder(0.24, 0.28, 5.6, 0, 2.8, 0, 8), mats.stone));
    column.add(new Mesh(placedBox(0.9, 0.18, 0.4, 0, 5.7, 0), mats.gold));
    host.root.add(column);
  }

  const rails: Stamp[] = [];
  for (let index = 0; index < 12; index += 1) {
    const progress = 0.05 + index * 0.0016;
    rails.push({ progress, offset: -7.1, y: 0.5 });
    rails.push({ progress, offset: 7.1, y: 0.5 });
  }
  scatter(host, placedBox(0.26, 1.0, 0.26, 0, 0.5, 0), mats.stone, rails);

  const sign = new Group();
  host.place(sign, 0.031, -12.4, 0);
  sign.add(new Mesh(placedCylinder(0.08, 0.08, 3.0, 0, 1.5, 0, 8), mats.concrete));
  const board = host.plaque('长安街', {
    width: 900,
    height: 210,
    background: '#1F5E86',
    border: '#E7F0EE',
    color: '#F6F7E9',
    font: '800 86px "PingFang SC", "Microsoft YaHei", sans-serif',
  });
  if (board) {
    const panel = new Mesh(host.track(placedBox(4.2, 0.9, 0.08, 0, 0, 0)), board);
    panel.position.y = 3.15;
    sign.add(panel);
  }
  host.root.add(sign);

  const bankPosts: Stamp[] = [];
  const bankRails: Stamp[] = [];
  for (let index = 0; index < 16; index += 1) {
    const progress = 0.172 + index * 0.0042;
    const low = index >= 11;
    bankPosts.push({ progress, offset: -6.4, y: low ? 0.45 : 0.7, scale: low ? 0.8 : 1 });
    bankRails.push({ progress, offset: -6.4, y: low ? 0.85 : 1.15 });
  }
  scatter(host, placedBox(0.22, 0.85, 0.22, 0, 0.42, 0), mats.stone, bankPosts);
  scatter(host, placedBox(0.12, 0.1, 3.1, 0, 0.72, 0), mats.stone, bankRails);
  const shore: Stamp[] = [];
  for (let index = 0; index < 6; index += 1) {
    shore.push({ progress: 0.168 + index * 0.01, offset: -6.1, y: 0.04 });
  }
  scatter(host, placedBox(1.1, 0.16, 6.2, 0, 0.08, 0), mats.stone, shore);

  const bars: Stamp[] = [];
  for (let index = 0; index < 8; index += 1) {
    bars.push({
      progress: 0.176 + index * 0.0075,
      offset: -22,
      scale: 0.85 + hash01(index, 61) * 0.25,
    });
  }
  scatter(host, placedBox(4.4, 3.2, 5, 0, 1.6, 0), mats.streetBrick, bars);
  const lanterns: Stamp[] = [];
  for (let index = 0; index < 14; index += 1) {
    lanterns.push({
      progress: 0.178 + index * 0.0044,
      offset: -18.5,
      y: index % 2 === 0 ? 2.3 : 2.05,
    });
  }
  scatter(
    host,
    host.track(
      mergeParts([
        placedBox(0.16, 0.26, 0.16, 0, 0, 0),
        placedBox(0.24, 0.05, 0.24, 0, 0.15, 0),
        placedCylinder(0.015, 0.015, 0.18, 0, 0.26, 0, 5),
      ]),
    ),
    mats.lantern,
    lanterns,
  );

  const bench = new Group();
  host.place(bench, 0.202, -5.75, 0);
  bench.add(new Mesh(placedBox(1.6, 0.1, 0.45, 0, 0.55, 0), mats.timber));
  bench.add(new Mesh(placedBox(1.6, 0.5, 0.08, 0, 0.85, -0.18), mats.timber));
  host.root.add(bench);

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

  marker(host, 0.503, 6.3, '南锣鼓巷', blocked);
  marker(host, 0.566, -6.3, '五道营', blocked);

  for (let index = 0; index < 8; index += 1) {
    const progress = 0.338 + index * 0.008;
    for (const side of [-1, 1]) {
      const guard = new Mesh(placedBox(0.28, 0.7, 2.4, 0, 0.35, 0), mats.concrete);
      host.place(guard, progress, side * 6.9, 0);
      host.root.add(guard);
    }
  }
}
