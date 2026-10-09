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
import { DRIVE_PATH, pathHeading, samplePathFrame } from './drivePath';
import { hash01 } from './surfaceTextures';
import { CENTRAL_AXIS_LANDMARKS, PASSAGE_HEROES } from './spatialContract';
import type { PassageId } from './passages';
import { dressRoadside } from './roadside';
import {
  createBracketGeometry,
  createCityWall,
  createMerlons,
  createPlaqueFrame,
  createStoneBridge,
  createTreeGroup,
  placedBox,
  placedCylinder,
} from './kit';
import {
  CORNER_BASTION,
  PALACE_GATE_OPTIONS,
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
  createSkylineMass,
  gateRoofHalfWidth,
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

function plaqueMaterial(host: CityHost, text: string, canvasHeight: number) {
  return host.plaque(text, {
    width: 640,
    height: canvasHeight,
    background: '#123E46',
    border: '#D4AD5C',
    color: '#F3D78D',
    font: '700 112px "Songti SC", "STSong", serif',
  });
}

/** Road gantry board. Building names use the framed board instead. */
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
  const material = plaqueMaterial(host, text, 220);
  if (!material) return;
  const panel = new Mesh(host.track(new PlaneGeometry(width, height)), material);
  panel.position.set(x, y, z);
  panel.rotation.y = Math.PI;
  parent.add(panel);
}

/** Frame, corbels, and the painted board, centred on the given point and facing -Z. */
function hangFramedPlaque(
  host: CityHost,
  parent: Object3D,
  text: string,
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
): void {
  const frame = new Mesh(host.track(createPlaqueFrame(width, height)), host.mats.gold);
  frame.position.set(x, y, z);
  parent.add(frame);
  const material = plaqueMaterial(host, text, 220);
  if (!material) return;
  const panel = new Mesh(
    host.track(new PlaneGeometry(Math.max(0.2, width - 0.12), Math.max(0.12, height - 0.12))),
    material,
  );
  panel.position.set(x, y, z - 0.045);
  panel.rotation.y = Math.PI;
  parent.add(panel);
}

interface PlaqueSeat {
  lintelBottom: number;
  z: number;
  bayWidth: number;
}

function hangInBay(
  host: CityHost,
  parent: Object3D,
  text: string,
  width: number,
  height: number,
): void {
  const seat = parent.userData.plaqueSeat as PlaqueSeat | undefined;
  if (!seat || !Number.isFinite(seat.lintelBottom) || !Number.isFinite(seat.bayWidth)) {
    if (import.meta.env.DEV) console.assert(false, `${text} has no column bay to hang from`);
    return;
  }
  hangFramedPlaque(
    host,
    parent,
    text,
    0,
    seat.lintelBottom - height / 2 - 0.05,
    seat.z,
    Math.min(width, Math.max(0.6, seat.bayWidth - 0.35)),
    height,
  );
}

function faceRoad(offset: number): number {
  return offset > 0 ? -Math.PI / 2 : Math.PI / 2;
}

interface Span {
  p0: number;
  p1: number;
  l0: number;
  l1: number;
}

const PATH_METRES = DRIVE_PATH.getLength() * DRIVE_PATH_SCALE;
const occupied: Span[] = [];

function claim(progress: number, offset: number, along: number, across: number): void {
  const dp = along / 2 / PATH_METRES;
  const dl = across / 2;
  occupied.push({ p0: progress - dp, p1: progress + dp, l0: offset - dl, l1: offset + dl });
}

function blocked(progress: number, offset: number, along: number, across: number): boolean {
  const dp = along / 2 / PATH_METRES;
  const dl = across / 2;
  const span = { p0: progress - dp, p1: progress + dp, l0: offset - dl, l1: offset + dl };
  return occupied.some(
    (wall) => span.p1 > wall.p0 + 1e-4 && wall.p1 > span.p0 + 1e-4 && span.l1 > wall.l0 + 1e-4 && wall.l1 > span.l0 + 1e-4,
  );
}

function rejectOverlap(label: string, progress: number, offset: number, along: number, across: number): boolean {
  if (!blocked(progress, offset, along, across)) return false;
  if (import.meta.env.DEV) console.assert(false, `${label} overlaps a wall at ${progress.toFixed(3)}, ${offset}`);
  return true;
}

function clearOfWalls(
  progress: number,
  offset: number,
  label: string,
): { progress: number; offset: number } | undefined {
  let cursor = progress;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (!blocked(cursor, offset, 4.4, 4.4)) {
      if (attempt > 0 && import.meta.env.DEV) {
        console.assert(false, `${label} overlaps a wall at ${progress.toFixed(3)}, ${offset}`);
      }
      return { progress: cursor, offset };
    }
    cursor += 0.01;
  }
  if (import.meta.env.DEV) console.assert(false, `${label} stays inside a wall at ${progress.toFixed(3)}, ${offset}`);
  return undefined;
}

/** 0 door, 1 window, 2 screen. Stable for a progress/offset pair. */
function shopSlot(progress: number, offset: number): 0 | 1 | 2 {
  const roll = hash01(Math.round(progress * 1000), Math.round(Math.abs(offset) * 10));
  if (roll < 0.34) return 0;
  if (roll < 0.67) return 1;
  return 2;
}

function scatterShops(
  host: CityHost,
  bays: Array<{ timber: BufferGeometry; wall: BufferGeometry; roof: BufferGeometry; opening: BufferGeometry; eave: BufferGeometry }>,
  stamps: Array<{ progress: number; offset: number }>,
): void {
  const rows: Array<Array<{ progress: number; offset: number }>> = [[], [], []];
  for (const stamp of stamps) {
    if (rejectOverlap('shop', stamp.progress, stamp.offset, 3.3, 3.1)) continue;
    rows[shopSlot(stamp.progress, stamp.offset)].push(stamp);
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
  occupied.length = 0;
  const mats = host.mats;
  const bracket = host.track(createBracketGeometry());
  const doorBay = createShopBay('door');
  const windowBay = createShopBay('window');
  const screenBay = createShopBay('screen');
  const wallOptions = { length: 13.5, height: 4.6, depth: 2.7, merlons: 8 };
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
  hangInBay(host, gate, '正阳门', 3.6, 1.2);
  put(host, gate, zhengyang.progress, zhengyang.lateralOffset, zhengyang.scale);

  const tiananmen = CENTRAL_AXIS_LANDMARKS.tiananmen;
  const palace = buildPalaceWallGate(mats, bracket);
  hangInBay(host, palace, '天安门', 2.8, 0.95);
  put(host, palace, tiananmen.progress, tiananmen.lateralOffset, tiananmen.scale, tiananmen.headingOffset);
  claim(
    tiananmen.progress,
    tiananmen.lateralOffset,
    gateRoofHalfWidth(PALACE_GATE_OPTIONS) * 2 * tiananmen.scale,
    (PALACE_GATE_OPTIONS.pierDepth + 1.1) * tiananmen.scale,
  );
  host.addLamp(0.02, -6.6, false);
  host.addLamp(0.034, -6.6, true);
  host.addLamp(0.034, 6.6, false);
  host.addLamp(0.052, 6.6, true);

  host.begin('palace-moat');
  const corner = PASSAGE_HEROES.cornerTower;
  const cornerTower = buildCornerTower(mats, bracket);
  const bastionWorld = CORNER_BASTION.half * corner.scale;
  const bastionTop = CORNER_BASTION.height * corner.scale;
  const moatScale = 0.92;
  const moatDepth = 2.7;
  const roofHalf = gateRoofHalfWidth(PALACE_GATE_OPTIONS) * tiananmen.scale;
  const embed = 0.18 / PATH_METRES;
  const runP0 = tiananmen.progress + roofHalf / PATH_METRES - embed;
  const runP1 = corner.progress - bastionWorld / PATH_METRES + embed;
  if (import.meta.env.DEV) console.assert(runP1 > runP0, 'moat wall has no run between the gate and the bastion');
  const runWorld = Math.max(0, runP1 - runP0) * PATH_METRES;
  const segCount = Math.max(1, Math.round(runWorld / 12.4));
  const segWorld = runWorld / segCount;
  const moatWall = createCityWall({
    length: segWorld / moatScale,
    height: bastionTop / moatScale / 0.94,
    depth: moatDepth,
  });
  const moatMerlons = createMerlons({
    length: segWorld / moatScale,
    height: bastionTop / moatScale / 0.94,
    depth: moatDepth,
  });
  const moatWalls: Stamp[] = [];
  for (let index = 0; index < segCount; index += 1) {
    const progress = runP0 + ((index + 0.5) * (runP1 - runP0)) / segCount;
    moatWalls.push({ progress, offset: -13.4, heading: Math.PI / 2, scale: moatScale });
    claim(progress, -13.4, segWorld, moatDepth * moatScale);
  }
  scatter(host, moatWall, mats.streetBrick, moatWalls, true);
  scatter(host, moatMerlons, mats.stone, moatWalls, true);
  claim(corner.progress, corner.lateralOffset, bastionWorld * 2, bastionWorld * 2);
  put(host, cornerTower, corner.progress, corner.lateralOffset, corner.scale);
  host.addLamp(0.096, 6.9, false);
  host.addLamp(0.13, -5.62, true);
  host.addLamp(0.158, 6.9, false);

  host.begin('shichahai');
  const bridge = new Group();
  bridge.add(new Mesh(createStoneBridge(), mats.stone));
  put(host, bridge, 0.226, -14.5, 1);
  const dagoba = PASSAGE_HEROES.whiteDagoba;
  put(host, buildWhiteDagoba(mats), dagoba.progress, dagoba.lateralOffset, dagoba.scale);
  const willow = clearOfWalls(0.185, -6.2, 'willow');
  if (willow) put(host, createTreeGroup(4.8, 'willow', mats.bark, mats.leaf), willow.progress, willow.offset, 1);
  host.addLamp(0.19, -5.62, true);
  host.addLamp(0.225, 6.5, false);
  host.addLamp(0.242, 6.5, true);

  host.begin('deshengmen');
  const arrow = PASSAGE_HEROES.deshengmen;
  put(host, buildArrowTower(mats, bracket), arrow.progress, arrow.lateralOffset, arrow.scale);
  const gantry = new Group();
  gantry.add(new Mesh(placedCylinder(0.14, 0.18, 4.2, -3.2, 2.1, 0, 8), mats.concrete));
  gantry.add(new Mesh(placedCylinder(0.14, 0.18, 4.2, 3.2, 2.1, 0, 8), mats.concrete));
  gantry.add(new Mesh(placedBox(7.4, 0.42, 0.55, 0, 4.35, 0), mats.concrete));
  gantry.add(new Mesh(placedBox(6.2, 1.15, 0.16, 0, 3.55, -0.12), mats.concrete));
  gantry.add(new Mesh(placedBox(0.55, 0.28, 0.55, -3.2, 4.15, 0), mats.concrete));
  gantry.add(new Mesh(placedBox(0.55, 0.28, 0.55, 3.2, 4.15, 0), mats.concrete));
  hangPlaque(host, gantry, '二环', 0, 3.55, -0.24, 3.6, 0.78);
  put(host, gantry, 0.33, 0, 1);
  host.addLamp(0.258, -5.8, false);
  host.addLamp(0.322, -5.8, false);

  host.begin('second-ring-threshold');
  const ringWall = PASSAGE_HEROES.secondRingWall;
  put(
    host,
    buildCityWallSegment(mats, 10.2),
    ringWall.progress,
    ringWall.lateralOffset,
    ringWall.scale,
    Math.PI / 2,
  );
  claim(ringWall.progress, ringWall.lateralOffset, 10.2 * ringWall.scale, 2.6 * ringWall.scale);
  const ringRun: Stamp[] = [];
  for (let index = 0; index < 8; index += 1) {
    ringRun.push({ progress: 0.346 + index * 0.014, offset: -9.8, heading: Math.PI / 2, scale: 0.86 });
  }
  for (let index = 0; index < 4; index += 1) {
    ringRun.push({ progress: 0.41 + index * 0.014, offset: 11.2, heading: Math.PI / 2, scale: 0.86 });
  }
  for (const stamp of ringRun) claim(stamp.progress, stamp.offset, 13.5 * 0.86, 2.7 * 0.86);
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
    { progress: 0.46, offset: -8.6 },
    { progress: 0.468, offset: 8.6 },
    { progress: 0.476, offset: 8.6 },
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
  hangFramedPlaque(host, courtyard, '雍和宫', 0, 3.05, -5.55, 1.15, 0.5);
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
  hangFramedPlaque(host, hall, '祈年殿', 0, 3.95, -4.25, 1.4, 0.55);
  put(host, hall, temple.progress, temple.lateralOffset, temple.scale);
  for (let index = 0; index < 6; index += 1) {
    const cypress = clearOfWalls(0.818 + index * 0.006, -16.4, 'cypress');
    if (!cypress) continue;
    put(host, createTreeGroup(5.4, 'cypress', mats.bark, mats.leaf), cypress.progress, cypress.offset, 1);
  }
  host.addLamp(0.761, -6.3, true);
  host.addLamp(0.795, 6.3, false);
  host.addLamp(0.825, -6.3, true);

  host.begin('qianmen-hutong');
  const qianmen: Array<{ progress: number; offset: number }> = [];
  for (let index = 0; index < 7; index += 1) {
    const progress = 0.852 + index * 0.006;
    qianmen.push({ progress, offset: 8.6 });
    if (index !== 4) qianmen.push({ progress, offset: -8.6 });
  }
  for (let index = 0; index < 6; index += 1) {
    qianmen.push({ progress: 0.876 + index * 0.0055, offset: index % 2 === 0 ? 8.2 : -8.2 });
  }
  scatterShops(host, [doorBay, windowBay, screenBay], qianmen);
  const pailou = buildPailou(mats, bracket);
  hangFramedPlaque(host, pailou, '前门', 0, 4.62, -0.32, 2.2, 0.55);
  put(host, pailou, 0.902, 0, 0.94);
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
    const spot = clearOfWalls(stamp.progress, stamp.offset, 'tree');
    if (!spot) continue;
    const kind = hash01(Math.round(stamp.progress * 100), 4) > 0.7 ? 'locust' : 'street';
    put(
      host,
      createTreeGroup(4.2 + hash01(Math.round(stamp.progress * 80), 5), kind, mats.bark, mats.leaf),
      spot.progress,
      spot.offset,
      1,
    );
  }

  const shopNames = ['茶莊', '綢緞', '醬園', '藥鋪', '布莊', '煤鋪'];
  const namedBays = nanluo.filter((stamp) => shopSlot(stamp.progress, stamp.offset) !== 1);
  shopNames.forEach((name, index) => {
    const stamp = namedBays[index];
    if (!stamp) return;
    if (rejectOverlap('shop name', stamp.progress, stamp.offset, 3.3, 3.1)) return;
    const sign = new Group();
    hangFramedPlaque(host, sign, name, 0, 2.15, -1.35, 1.3, 0.42);
    put(host, sign, stamp.progress, stamp.offset, 1, faceRoad(stamp.offset));
  });

  dressRoadside(host, blocked);

  for (const variant of [0, 1, 2]) {
    const skyline: Stamp[] = [];
    for (let index = variant; index < 32; index += 3) {
      skyline.push({
        progress: (index + 0.5) / 32,
        offset: (index % 2 === 0 ? -1 : 1) * (32 + hash01(index, 4) * 8),
        scale: 0.7 + hash01(index, 2) * 0.7,
      });
    }
    scatter(host, createSkylineMass(variant), mats.glass, skyline, false);
  }
}
