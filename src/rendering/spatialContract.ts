import { DRIVE } from './theme';

/** Minimum breathing room between a solid landmark and the asphalt edge. */
export const LANDMARK_CLEARANCE_MARGIN = 0.65;

export interface PassThroughLandmarkContract {
  id: string;
  progress: number;
  lateralOffset: number;
  scale: number;
  kind: 'pass-through';
  clearHalfWidth: number;
}

export interface SetBackLandmarkContract {
  id: string;
  progress: number;
  lateralOffset: number;
  scale: number;
  headingOffset: number;
  kind: 'set-back';
  solidHalfWidth: number;
}

export interface PassageHeroContract {
  id: string;
  passage: number;
  progress: number;
  lateralOffset: number;
  scale: number;
  solidHalfWidth: number;
}

/**
 * Authored spatial contract for the first four seconds. These values are used
 * by the scene and by geometry verification so visual intent cannot drift
 * back into a camera/landmark collision.
 */
export const CENTRAL_AXIS_LANDMARKS = {
  zhengyangmen: {
    id: 'zhengyangmen',
    progress: 0.041,
    lateralOffset: 0,
    scale: 0.64,
    kind: 'pass-through',
    clearHalfWidth: 5.02,
  },
  tiananmen: {
    id: 'tiananmen',
    progress: 0.071,
    lateralOffset: -13.2,
    scale: 0.58,
    headingOffset: Math.PI / 2,
    kind: 'set-back',
    solidHalfWidth: 3.25,
  },
} as const satisfies Record<
  string,
  PassThroughLandmarkContract | SetBackLandmarkContract
>;

/** Hero anchors stay inside their own four-second passage and off the road. */
export const PASSAGE_HEROES = {
  cornerTower: {
    id: 'corner-tower',
    passage: 1,
    progress: 0.16,
    lateralOffset: -12,
    scale: 0.72,
    solidHalfWidth: 3.03,
  },
  whiteDagoba: {
    id: 'white-dagoba',
    passage: 2,
    progress: 0.248,
    lateralOffset: -8.5,
    scale: 0.76,
    solidHalfWidth: 2.13,
  },
  deshengmen: {
    id: 'deshengmen',
    passage: 3,
    progress: 0.329,
    lateralOffset: -10.2,
    scale: 0.72,
    solidHalfWidth: 4.14,
  },
  birdsNest: {
    id: 'birds-nest',
    passage: 4,
    progress: 0.416,
    lateralOffset: -10.8,
    scale: 0.42,
    solidHalfWidth: 3.78,
  },
  waterCube: {
    id: 'water-cube',
    passage: 4,
    progress: 0.415,
    lateralOffset: 11.5,
    scale: 0.5,
    solidHalfWidth: 3,
  },
  drumTower: {
    id: 'drum-tower',
    passage: 5,
    progress: 0.498,
    lateralOffset: -10.5,
    scale: 0.72,
    solidHalfWidth: 3.68,
  },
  bellTower: {
    id: 'bell-tower',
    passage: 5,
    progress: 0.497,
    lateralOffset: 12.5,
    scale: 0.68,
    solidHalfWidth: 2.59,
  },
  yonghegong: {
    id: 'yonghegong',
    passage: 7,
    progress: 0.666,
    lateralOffset: -10.5,
    scale: 0.46,
    solidHalfWidth: 3.27,
  },
  cbdHero: {
    id: 'cbd-hero',
    passage: 8,
    progress: 0.746,
    lateralOffset: 7.5,
    scale: 0.48,
    solidHalfWidth: 2.45,
  },
  templeOfHeaven: {
    id: 'temple-of-heaven',
    passage: 9,
    progress: 0.832,
    lateralOffset: -10.8,
    scale: 0.44,
    solidHalfWidth: 2.75,
  },
} as const satisfies Record<string, PassageHeroContract>;

export const CENTRAL_AXIS_REQUIRED_CLEARANCE =
  DRIVE.roadHalfWidth + LANDMARK_CLEARANCE_MARGIN;
