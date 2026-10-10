import { Group, Mesh, type BufferGeometry, type Material, type Object3D } from 'three';
import { PATH_METRES, sweepFrames } from './pathSweep';
import { hash01 } from './surfaceTextures';
import { CENTRAL_AXIS_LANDMARKS, PASSAGE_HEROES } from './spatialContract';
import type { PassageId } from './passages';
import { dressRoadside } from './roadside';
import { dressFabric, dressSkyline } from './fabric';
import { blocked, claim, resetOccupancy } from './occupancy';
import { hangFramedPlaque, hangInBay, hangPlaque, hangVerticalSign } from './plaques';
import { faceRoad, put, scatter, type Stamp } from './stamps';
import {
  BUTTRESS,
  createBracketGeometry,
  createButtress,
  createLantern,
  createSignBracket,
  createStoneBridge,
  createSweep,
  createTreeGroup,
  mergeParts,
  placedBox,
  placedCylinder,
  type SweepOutline,
} from './kit';
import {
  CORNER_BASTION,
  PALACE_GATE_OPTIONS,
  buildArrowTower,
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
  gateHalfWidth,
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
  /** Stack the characters top to bottom. */
  vertical?: boolean;
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

/** 0 door, 1 window, 2 screen. Stable for a progress/offset pair. */
function shopSlot(progress: number, offset: number): 0 | 1 | 2 {
  const roll = hash01(Math.round(progress * 1000), Math.round(Math.abs(offset) * 10));
  if (roll < 0.34) return 0;
  if (roll < 0.67) return 1;
  return 2;
}

/** Nudge a tree along the road until it clears the walls and buildings, or drop it. */
function clearOfWalls(progress: number, offset: number): { progress: number; offset: number } | undefined {
  let cursor = progress;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (!blocked(cursor, offset, 3.2, 3.2)) {
      claim(cursor, offset, 3.2, 3.2);
      return { progress: cursor, offset };
    }
    cursor += 0.006;
  }
  return undefined;
}

interface WallSpec {
  from: number;
  to: number;
  offset: number;
  height: number;
  base: number;
  top: number;
}

/**
 * One continuous city wall that follows the road: battered body, plinth, string course and coping.
 * The crenels stand on the face toward the road, as on the outer face of a real wall, with a low
 * parapet on the far side. Bastions project every few strides and the crenels step around them.
 */
function wallRun(host: CityHost, spec: WallSpec): void {
  const mats = host.mats;
  const { base, top, height } = spec;
  const roadSide = spec.offset < 0 ? 1 : -1;
  const lo = roadSide > 0 ? -top / 2 : top / 2 - 0.32;
  const hi = roadSide > 0 ? -top / 2 + 0.32 : top / 2;
  const stringY = height * 0.62;
  const stringHalf = (base + (top - base) * 0.62) / 2 + 0.07;
  const frames = sweepFrames(spec.from, spec.to, spec.offset);
  const body: SweepOutline[] = [
    [[-base / 2, 0], [base / 2, 0], [top / 2, height], [-top / 2, height]],
    [[lo, height], [hi, height], [hi, height + 0.7], [lo, height + 0.7]],
  ];
  const trim: SweepOutline[] = [
    [[-base / 2 - 0.12, 0], [base / 2 + 0.12, 0], [base / 2 + 0.12, 0.35], [-base / 2 - 0.12, 0.35]],
    [[-stringHalf, stringY], [stringHalf, stringY], [stringHalf, stringY + 0.16], [-stringHalf, stringY + 0.16]],
    [[-top / 2 - 0.08, height], [top / 2 + 0.08, height], [top / 2 + 0.08, height + 0.1], [-top / 2 - 0.08, height + 0.1]],
    [[lo - 0.06, height + 0.7], [hi + 0.06, height + 0.7], [hi + 0.06, height + 0.8], [lo - 0.06, height + 0.8]],
  ];
  const wall = new Mesh(host.track(createSweep(frames, body)), mats.grayBrick);
  const coping = new Mesh(host.track(createSweep(frames, trim)), mats.stone);
  for (const mesh of [wall, coping]) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    host.root.add(mesh);
  }
  const metres = (spec.to - spec.from) * PATH_METRES;
  const along = (index: number, count: number) => spec.from + ((spec.to - spec.from) * (index + 0.5)) / count;

  const bastions: Stamp[] = [];
  const bastionCount = Math.floor(metres / BUTTRESS.spacing);
  for (let index = 0; index < bastionCount; index += 1) {
    bastions.push({
      progress: along(index, bastionCount),
      offset: spec.offset,
      heading: roadSide > 0 ? Math.PI : 0,
    });
  }
  const bastion = createButtress({ height, base, top });
  scatter(host, bastion.body, mats.grayBrick, bastions, true);
  scatter(host, bastion.trim, mats.stone, bastions, true);

  const count = Math.max(2, Math.round(metres / 1.3));
  const crenels: Stamp[] = [];
  for (let index = 0; index < count; index += 1) {
    const progress = along(index, count);
    const clear = bastions.every(
      (stamp) => Math.abs(progress - stamp.progress) * PATH_METRES > BUTTRESS.length / 2 + 0.45,
    );
    if (!clear) continue;
    crenels.push({ progress, offset: spec.offset + roadSide * (top / 2 - 0.2), y: height + 0.1 });
  }
  scatter(host, placedBox(0.46, 0.72, 0.62, 0, 0.36, 0), mats.grayBrick, crenels, true);
  claim(
    (spec.from + spec.to) / 2,
    spec.offset + (roadSide * BUTTRESS.reach) / 2,
    metres,
    base + 0.6 + BUTTRESS.reach,
  );
}

/** A hanging vertical sign on a bracket, at the end of the shopfront nearest the oncoming driver. */
function shopSign(host: CityHost, text: string, progress: number, offset: number): void {
  const group = new Group();
  const arm = new Group();
  arm.position.set(offset > 0 ? -1.5 : 1.5, 2.55, -1.1);
  arm.add(new Mesh(host.track(createSignBracket()), host.mats.timber));
  hangVerticalSign(host, arm, text, 0, -0.7, -0.92, faceRoad(offset));
  group.add(arm);
  put(host, group, progress, offset, 1, faceRoad(offset));
}

const SIGN_TEXT = ['茶', '酒', '药', '當', '布', '飯', '茶莊', '綢緞', '醬園', '藥鋪', '布莊', '煤鋪'];

interface ShopBays {
  doorBay: ReturnType<typeof createShopBay>;
  windowBay: ReturnType<typeof createShopBay>;
  screenBay: ReturnType<typeof createShopBay>;
  lanterns: BufferGeometry;
}

function scatterShops(
  host: CityHost,
  shops: ShopBays,
  stamps: Array<{ progress: number; offset: number }>,
  signs = false,
): void {
  const mats = host.mats;
  const bays = [shops.doorBay, shops.windowBay, shops.screenBay];
  const walls = [mats.streetBrick, mats.grayBrick, mats.streetBrick];
  const windows = [mats.window, mats.windowDiamond, mats.windowSlat];
  const rows: Stamp[][] = [[], [], []];
  const all: Stamp[] = [];
  for (const stamp of stamps) {
    if (blocked(stamp.progress, stamp.offset, 3.3, 3.1)) continue;
    claim(stamp.progress, stamp.offset, 3.5, 3.4);
    const placed = { ...stamp, heading: faceRoad(stamp.offset) };
    rows[shopSlot(stamp.progress, stamp.offset)].push(placed);
    all.push(placed);
  }
  bays.forEach((bay, index) => {
    scatter(host, bay.timber, mats.timber, rows[index], true);
    scatter(host, bay.wall, walls[index], rows[index], true);
    scatter(host, bay.roof, mats.tile, rows[index], true);
    scatter(host, bay.eave, mats.gold, rows[index], false);
    scatter(host, bay.opening, windows[index], rows[index], false);
  });
  scatter(host, shops.lanterns, mats.lantern, all, false);
  if (!signs) return;
  all.forEach((stamp, index) => {
    if (hash01(index, Math.round(stamp.progress * 1000)) < 0.45) return;
    const text = SIGN_TEXT[Math.floor(hash01(index + 3, Math.round(stamp.progress * 997)) * SIGN_TEXT.length)];
    shopSign(host, text, stamp.progress, stamp.offset);
  });
}

/** Twelve passages assembled from the parametric kit. Anchors stay on the spatial contract. */
export function assembleCity(host: CityHost): void {
  resetOccupancy();
  const mats = host.mats;
  const bracket = host.track(createBracketGeometry());
  const shops: ShopBays = {
    doorBay: createShopBay('door'),
    windowBay: createShopBay('window'),
    screenBay: createShopBay('screen'),
    lanterns: mergeParts([
      createLantern(0.2).translate(-0.85, 2.5, -1.58),
      createLantern(0.2).translate(0.85, 2.5, -1.58),
    ]),
  };
  for (const hero of Object.values(PASSAGE_HEROES)) {
    claim(hero.progress, hero.lateralOffset, hero.solidHalfWidth * 2, hero.solidHalfWidth * 2);
  }

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
  const gateHalf = gateHalfWidth(PALACE_GATE_OPTIONS) * tiananmen.scale;
  claim(tiananmen.progress, tiananmen.lateralOffset, gateHalf * 2, (PALACE_GATE_OPTIONS.pierDepth + 1.1) * tiananmen.scale);
  host.addLamp(0.02, -6.6, false);
  host.addLamp(0.034, -6.6, true);
  host.addLamp(0.034, 6.6, false);
  host.addLamp(0.052, 6.6, true);

  host.begin('palace-moat');
  const corner = PASSAGE_HEROES.cornerTower;
  const bastionWorld = CORNER_BASTION.half * corner.scale;
  const bastionTop = CORNER_BASTION.height * corner.scale;
  const embed = 0.3 / PATH_METRES;
  wallRun(host, {
    from: tiananmen.progress + gateHalf / PATH_METRES - embed,
    to: corner.progress - bastionWorld / PATH_METRES + embed,
    offset: -13.4,
    height: bastionTop,
    base: 2.5,
    top: 2.15,
  });
  claim(corner.progress, corner.lateralOffset, bastionWorld * 2, bastionWorld * 2);
  put(host, buildCornerTower(mats, bracket), corner.progress, corner.lateralOffset, corner.scale);
  host.addLamp(0.096, 6.9, false);
  host.addLamp(0.13, -5.62, true);
  host.addLamp(0.158, 6.9, false);

  host.begin('shichahai');
  const bridge = new Group();
  bridge.add(new Mesh(host.track(createStoneBridge()), mats.white));
  put(host, bridge, 0.226, -14.5, 1);
  const dagoba = PASSAGE_HEROES.whiteDagoba;
  put(host, buildWhiteDagoba(mats), dagoba.progress, dagoba.lateralOffset, dagoba.scale);
  const willow = clearOfWalls(0.185, -6.2);
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
  wallRun(host, { from: 0.334, to: 0.4555, offset: -9.8, height: 3.96, base: 2.3, top: 2.0 });
  wallRun(host, { from: 0.41, to: 0.4625, offset: 11.2, height: 3.96, base: 2.3, top: 2.0 });
  host.addLamp(0.345, -6.2, false);
  host.addLamp(0.389, 6.2, true);

  host.begin('bell-drum');
  const drum = PASSAGE_HEROES.drumTower;
  const bell = PASSAGE_HEROES.bellTower;
  put(host, buildPavilion(mats, bracket, true), drum.progress, drum.lateralOffset, drum.scale);
  put(host, buildPavilion(mats, bracket, false), bell.progress, bell.lateralOffset, bell.scale);
  scatterShops(host, shops, [
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
  scatterShops(host, shops, nanluo, true);
  const tea = PASSAGE_HEROES.nanluoTeaHouse;
  put(host, buildTeaHouse(mats), tea.progress, tea.lateralOffset, tea.scale, faceRoad(tea.lateralOffset));
  host.addLamp(0.508, -6.4, true);
  host.addLamp(0.545, 6.4, false);

  host.begin('yonghegong');
  const yonghe = PASSAGE_HEROES.yonghegong;
  const courtyard = buildYongheCourtyard(mats, bracket);
  hangInBay(host, courtyard, '雍和宫', 2.0, 0.8);
  put(host, courtyard, yonghe.progress, yonghe.lateralOffset, yonghe.scale);
  host.addLamp(0.591, -6.4, true);
  host.addLamp(0.635, 6.4, false);
  host.addLamp(0.659, -6.4, true);

  host.begin('cbd-finance');
  const cbd = PASSAGE_HEROES.cbdHero;
  put(host, buildGlassTower(mats), cbd.progress, cbd.lateralOffset, cbd.scale);
  host.addLamp(0.675, -5.8, false);
  host.addLamp(0.712, 5.8, true);
  host.addLamp(0.742, -5.8, false);

  host.begin('temple-of-heaven');
  const temple = PASSAGE_HEROES.templeOfHeaven;
  const hall = buildTempleOfHeaven(mats, bracket);
  hangInBay(host, hall, '祈年殿', 1.6, 0.6);
  put(host, hall, temple.progress, temple.lateralOffset, temple.scale);
  for (let index = 0; index < 6; index += 1) {
    const cypress = clearOfWalls(0.818 + index * 0.006, -16.4);
    if (!cypress) continue;
    const cypressHeight = 4.4 + hash01(index, 17) * 2.1;
    put(host, createTreeGroup(cypressHeight, 'cypress', mats.bark, mats.leaf), cypress.progress, cypress.offset, 1);
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
  scatterShops(host, shops, qianmen, true);
  const pailou = buildPailou(mats, bracket);
  hangFramedPlaque(host, pailou, '前门', 0, 3.85, -0.24, 2.2, 0.5);
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
    const spot = clearOfWalls(stamp.progress, stamp.offset);
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

  dressRoadside(host);
  dressFabric(host);
  dressSkyline(host);
}
