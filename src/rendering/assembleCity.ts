import {
  BufferGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  PlaneGeometry,
  Quaternion,
  Vector3,
  type Material,
  type Object3D,
} from 'three';
import { DRIVE_PATH_SCALE } from './FirstPersonCameraRig';
import { pathHeading, samplePathFrame } from './drivePath';
import { hash01 } from './surfaceTextures';
import { CENTRAL_AXIS_LANDMARKS, PASSAGE_HEROES } from './spatialContract';
import type { PassageId } from './passages';
import { dressRoadside } from './roadside';
import { createBracketGeometry, createCityWall, createMerlons, createStoneBridge, createTreeGroup, placedBox, placedCylinder } from './kit';
import {
  buildArrowTower,
  buildCityWallSegment,
  buildCornerTower,
  buildGateTower,
  buildGlassTower,
  buildOverpassPier,
  buildPailou,
  buildPalaceWallGate,
  buildPavilion,
  buildStreetGate,
  buildTeaHouse,
  buildTempleOfHeaven,
  buildWhiteDagoba,
  buildYongheCourtyard,
  createShopBay,
  type CityMaterials,
} from './buildings';

export type { CityMaterials };

export interface PlaqueOptions {
  width: number;
  height: number;
  background: string;
  border: string;
  color: string;
  font: string;
}

export interface CityHost {
  root: Group;
  mats: CityMaterials;
  begin(id: PassageId): void;
  place(object: Object3D, progress: number, offset: number, y: number, heading?: number): void;
  tag(object: Object3D): void;
  track(geometry: BufferGeometry): BufferGeometry;
  addLamp(progress: number, offset: number, cast: boolean): void;
  plaque(text: string, options: PlaqueOptions): Material | undefined;
}

interface Stamp {
  progress: number;
  offset: number;
  y?: number;
  heading?: number;
  scale?: number;
}

const UP = new Vector3(0, 1, 0);

function put(
  host: CityHost,
  object: Object3D,
  progress: number,
  offset: number,
  scale = 1,
  heading = 0,
): void {
  host.place(object, progress, offset, 0, heading);
  object.scale.setScalar(scale);
  host.tag(object);
  host.root.add(object);
}

function scatter(
  host: CityHost,
  geometry: BufferGeometry,
  material: Material,
  stamps: Stamp[],
  cast = false,
): void {
  if (stamps.length === 0) return;
  const mesh = new InstancedMesh(host.track(geometry), material, stamps.length);
  mesh.frustumCulled = false;
  mesh.castShadow = cast;
  mesh.receiveShadow = cast;
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

function hangPlaque(
  host: CityHost,
  parent: Object3D,
  text: string,
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
): void {
  const material = host.plaque(text, {
    width: 640,
    height: 220,
    background: '#123E46',
    border: '#D4AD5C',
    color: '#F3D78D',
    font: '700 112px "Songti SC", "STSong", serif',
  });
  if (!material) return;
  const panel = new Mesh(host.track(new PlaneGeometry(width, height)), material);
  panel.position.set(x, y, z);
  panel.rotation.y = Math.PI;
  parent.add(panel);
}

function faceRoad(offset: number): number {
  return offset > 0 ? Math.PI / 2 : -Math.PI / 2;
}

function scatterShops(
  host: CityHost,
  bays: Array<{ timber: BufferGeometry; wall: BufferGeometry; roof: BufferGeometry; opening: BufferGeometry; eave: BufferGeometry }>,
  stamps: Array<{ progress: number; offset: number }>,
): void {
  const rows: Array<Array<{ progress: number; offset: number }>> = [[], [], []];
  for (const stamp of stamps) {
    const roll = hash01(Math.round(stamp.progress * 1000), Math.round(Math.abs(stamp.offset) * 10));
    const slot = roll < 0.34 ? 0 : roll < 0.67 ? 1 : 2;
    rows[slot].push(stamp);
  }
  bays.forEach((bay, index) => {
    const row = rows[index];
    const placed = row.map((stamp) => ({ ...stamp, heading: faceRoad(stamp.offset) }));
    scatter(host, bay.timber, host.mats.timber, placed, true);
    scatter(host, bay.wall, host.mats.streetBrick, placed, true);
    scatter(host, bay.roof, host.mats.tile, placed, true);
    scatter(host, bay.eave, host.mats.gold, placed, false);
    scatter(host, bay.opening, host.mats.window, placed, false);
  });
}

/** Twelve passages assembled from the parametric kit. Anchors stay on the spatial contract. */
export function assembleCity(host: CityHost): void {
  const mats = host.mats;
  const bracket = host.track(createBracketGeometry());
  const doorBay = createShopBay('door');
  const windowBay = createShopBay('window');
  const screenBay = createShopBay('screen');
  const wallOptions = { length: 8, height: 4.2, depth: 2.5, merlons: 5 };
  const wallRun = createCityWall(wallOptions);
  const wallMerlons = createMerlons(wallOptions);

  host.begin('central-axis');
  const zhengyang = CENTRAL_AXIS_LANDMARKS.zhengyangmen;
  const gate = buildGateTower(mats, bracket, {
    openingHalf: 7.9,
    pierWidth: 4.4,
    pierDepth: 5.2,
    pierHeight: 8.4,
    bays: 5,
    eaves: 2,
  });
  hangPlaque(host, gate, '正阳门', 0, 9.2, -2.8, 3.6, 1.2);
  put(host, gate, zhengyang.progress, zhengyang.lateralOffset, zhengyang.scale);

  const tiananmen = CENTRAL_AXIS_LANDMARKS.tiananmen;
  const palace = buildPalaceWallGate(mats, bracket);
  hangPlaque(host, palace, '天安门', 0, 7.05, -2.45, 2.8, 0.95);
  put(host, palace, tiananmen.progress, tiananmen.lateralOffset, tiananmen.scale, tiananmen.headingOffset);
  host.addLamp(0.02, -6.6, false);
  host.addLamp(0.034, -6.6, true);
  host.addLamp(0.034, 6.6, false);
  host.addLamp(0.052, 6.6, true);

  host.begin('palace-moat');
  const moatWalls: Stamp[] = [];
  for (let index = 0; index < 6; index += 1) {
    moatWalls.push({ progress: 0.09 + index * 0.012, offset: -11.5, heading: Math.PI / 2, scale: 0.9 });
  }
  scatter(host, wallRun, mats.streetBrick, moatWalls, true);
  scatter(host, wallMerlons, mats.stone, moatWalls, true);
  const corner = PASSAGE_HEROES.cornerTower;
  put(host, buildCornerTower(mats, bracket), corner.progress, corner.lateralOffset, corner.scale);
  host.addLamp(0.096, 6.9, false);
  host.addLamp(0.13, -5.62, true);
  host.addLamp(0.158, 6.9, false);

  host.begin('shichahai');
  const bridge = new Group();
  bridge.add(new Mesh(createStoneBridge(), mats.stone));
  put(host, bridge, 0.226, -14.5, 1, Math.PI / 2);
  const dagoba = PASSAGE_HEROES.whiteDagoba;
  put(host, buildWhiteDagoba(mats), dagoba.progress, dagoba.lateralOffset, dagoba.scale);
  put(host, createTreeGroup(4.8, 'willow', mats.bark, mats.leaf), 0.185, -6.2, 1);
  host.addLamp(0.19, -5.62, true);
  host.addLamp(0.225, 6.5, false);
  host.addLamp(0.242, 6.5, true);

  host.begin('deshengmen');
  const arrow = PASSAGE_HEROES.deshengmen;
  put(host, buildArrowTower(mats, bracket), arrow.progress, arrow.lateralOffset, arrow.scale);
  const gantry = new Group();
  gantry.add(new Mesh(placedCylinder(0.14, 0.18, 4.2, -3.2, 2.1, 0, 8), mats.concrete));
  gantry.add(new Mesh(placedCylinder(0.14, 0.18, 4.2, 3.2, 2.1, 0, 8), mats.concrete));
  gantry.add(new Mesh(placedBox(7.2, 0.28, 0.28, 0, 4.3, 0), mats.concrete));
  hangPlaque(host, gantry, '二环', 0, 3.6, 0.2, 4.2, 0.9);
  put(host, gantry, 0.33, 0, 1);
  host.addLamp(0.258, -5.8, false);
  host.addLamp(0.322, -5.8, false);

  host.begin('second-ring-threshold');
  const ringWall = PASSAGE_HEROES.secondRingWall;
  put(host, buildCityWallSegment(mats, 10.2), ringWall.progress, ringWall.lateralOffset, ringWall.scale);
  const ringRun: Stamp[] = [];
  for (let index = 0; index < 5; index += 1) {
    ringRun.push({ progress: 0.352 + index * 0.012, offset: -11.4, heading: Math.PI / 2, scale: 0.75 });
  }
  scatter(host, wallRun, mats.streetBrick, ringRun, true);
  scatter(host, wallMerlons, mats.stone, ringRun, true);
  host.addLamp(0.345, -6.2, false);
  host.addLamp(0.389, 6.2, true);

  host.begin('bell-drum');
  const drum = PASSAGE_HEROES.drumTower;
  const bell = PASSAGE_HEROES.bellTower;
  put(host, buildPavilion(mats, bracket, true), drum.progress, drum.lateralOffset, drum.scale);
  put(host, buildPavilion(mats, bracket, false), bell.progress, bell.lateralOffset, bell.scale);
  scatterShops(host, [doorBay, windowBay, screenBay], [
    { progress: 0.424, offset: 8.6 },
    { progress: 0.424, offset: -8.6 },
    { progress: 0.432, offset: 8.6 },
  ]);
  host.addLamp(0.429, 6.5, true);
  host.addLamp(0.462, -6.4, true);
  host.addLamp(0.491, 6.5, false);

  host.begin('nanluo-wudaoying');
  const nanluo: Array<{ progress: number; offset: number }> = [];
  for (let index = 0; index < 9; index += 1) {
    const progress = 0.508 + index * 0.0062;
    if (Math.abs(progress - PASSAGE_HEROES.nanluoTeaHouse.progress) > 0.01) {
      nanluo.push({ progress, offset: 8.5 });
    }
    nanluo.push({ progress, offset: -8.5 });
  }
  scatterShops(host, [doorBay, windowBay, screenBay], nanluo);
  const tea = PASSAGE_HEROES.nanluoTeaHouse;
  put(host, buildTeaHouse(mats), tea.progress, tea.lateralOffset, tea.scale, faceRoad(tea.lateralOffset));
  host.addLamp(0.508, -6.4, true);
  host.addLamp(0.545, 6.4, false);

  host.begin('yonghegong');
  const yonghe = PASSAGE_HEROES.yonghegong;
  const courtyard = buildYongheCourtyard(mats, bracket);
  hangPlaque(host, courtyard, '雍和宫', 0, 4.6, -5.5, 3.2, 1.05);
  put(host, courtyard, yonghe.progress, yonghe.lateralOffset, yonghe.scale);
  host.addLamp(0.591, -6.4, true);
  host.addLamp(0.635, 6.4, false);
  host.addLamp(0.659, -6.4, true);

  host.begin('cbd-finance');
  const cbd = PASSAGE_HEROES.cbdHero;
  put(host, buildGlassTower(mats), cbd.progress, cbd.lateralOffset, cbd.scale);
  const plates: Stamp[] = [];
  for (let index = 0; index < 4; index += 1) {
    plates.push({
      progress: 0.706 + index * 0.004,
      offset: 11.5 + hash01(index, 77) * 1.5,
      scale: 0.7,
    });
  }
  scatter(host, placedBox(3.2, 7.5, 3.2, 0, 3.8, 0), mats.glass, plates, true);
  host.addLamp(0.675, -5.8, false);
  host.addLamp(0.712, 5.8, true);
  host.addLamp(0.742, -5.8, false);

  host.begin('temple-of-heaven');
  const temple = PASSAGE_HEROES.templeOfHeaven;
  const hall = buildTempleOfHeaven(mats, bracket);
  hangPlaque(host, hall, '祈年殿', 0, 3.2, -6.2, 3.2, 1.05);
  put(host, hall, temple.progress, temple.lateralOffset, temple.scale);
  for (let index = 0; index < 6; index += 1) {
    put(
      host,
      createTreeGroup(5.2, 'street', mats.bark, mats.leaf),
      0.758 + index * 0.012,
      -16,
      1,
    );
  }
  host.addLamp(0.761, -6.3, true);
  host.addLamp(0.795, 6.3, false);
  host.addLamp(0.825, -6.3, true);

  host.begin('qianmen-hutong');
  const qianmen: Array<{ progress: number; offset: number }> = [];
  for (let index = 0; index < 7; index += 1) {
    const progress = 0.838 + index * 0.006;
    qianmen.push({ progress, offset: 8.6 });
    if (index !== 4) qianmen.push({ progress, offset: -8.6 });
  }
  for (let index = 0; index < 6; index += 1) {
    qianmen.push({ progress: 0.876 + index * 0.0055, offset: index % 2 === 0 ? 8.2 : -8.2 });
  }
  scatterShops(host, [doorBay, windowBay, screenBay], qianmen);
  put(host, buildPailou(mats, bracket), 0.902, 0, 0.94);
  const dashilar = PASSAGE_HEROES.dashilarGate;
  put(
    host,
    buildStreetGate(mats),
    dashilar.progress,
    dashilar.lateralOffset,
    dashilar.scale,
    faceRoad(dashilar.lateralOffset),
  );
  host.addLamp(0.8365, -6.5, true);
  host.addLamp(0.851, 6.5, false);
  host.addLamp(0.8655, -6.5, true);
  host.addLamp(0.897, 5.25, true);
  host.addLamp(0.911, -5.25, false);

  host.begin('overpass');
  const pier = PASSAGE_HEROES.overpassPier;
  put(host, buildOverpassPier(mats), pier.progress, pier.lateralOffset, pier.scale);
  host.addLamp(0.925, -5.8, false);
  host.addLamp(0.958, 5.8, false);
  host.addLamp(0.985, -5.8, false);

  const trees: Stamp[] = [
    { progress: 0.024, offset: -12.3 },
    { progress: 0.05, offset: 12.1 },
    { progress: 0.112, offset: 12.6 },
    { progress: 0.205, offset: 8.8 },
    { progress: 0.442, offset: -13.2 },
    { progress: 0.606, offset: 12 },
    { progress: 0.652, offset: 11.8 },
    { progress: 0.86, offset: -11.8 },
  ];
  for (const stamp of trees) {
    const kind = hash01(Math.round(stamp.progress * 100), 4) > 0.7 ? 'locust' : 'street';
    put(
      host,
      createTreeGroup(4.2 + hash01(Math.round(stamp.progress * 80), 5), kind, mats.bark, mats.leaf),
      stamp.progress,
      stamp.offset,
      1,
    );
  }

  dressRoadside(host);

  const skyline: Stamp[] = [];
  const caps: Stamp[] = [];
  for (let index = 0; index < 32; index += 1) {
    const stamp = {
      progress: (index + 0.5) / 32,
      offset: (index % 2 === 0 ? -1 : 1) * (32 + hash01(index, 4) * 8),
      scale: 0.7 + hash01(index, 2) * 0.7,
    };
    skyline.push(stamp);
    if (index % 3 === 0) caps.push(stamp);
  }
  scatter(host, placedBox(5, 12, 5, 0, 6, 0), mats.glass, skyline, false);
  scatter(host, placedBox(5.6, 0.4, 5.6, 0, 12.4, 0), mats.tile, caps, false);
}
