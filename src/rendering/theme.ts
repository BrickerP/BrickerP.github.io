/** Central palette — the whole project's restrained, city-planning look. */
export const PALETTE = {
  pageBg: '#080B0F',
  mapBg: '#10161D',
  boundary: '#D6DEE8',
  road: '#34414D',
  loop: '#F08A24',
  axis: '#D64A3A',
  water: '#3D83A6',
  mountain: '#496A55',
  highlight: '#F4D35E',
  textDim: '#8D99A6',
} as const;

/** Parse '#rrggbb' into [r,g,b] 0..255. */
export function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

export const RGB = {
  pageBg: rgb(PALETTE.pageBg),
  mapBg: rgb(PALETTE.mapBg),
  boundary: rgb(PALETTE.boundary),
  road: rgb(PALETTE.road),
  loop: rgb(PALETTE.loop),
  axis: rgb(PALETTE.axis),
  water: rgb(PALETTE.water),
  mountain: rgb(PALETTE.mountain),
  highlight: rgb(PALETTE.highlight),
  textDim: rgb(PALETTE.textDim),
} as const;

export type ViewMode = 'follow' | 'overview' | 'fractal';

/** Fractal loop timing / geometry. */
export const FRACTAL = {
  /** seconds per full recursive zoom cycle. */
  duration: 12,
  /** linear scale ratio between adjacent recursion layers. */
  layerScale: 3.0,
  /** number of nested layers rendered simultaneously. */
  layers: 3,
};
