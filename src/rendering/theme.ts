/** Central palette for the quiet, paper-cut city study. */
export const PALETTE = {
  pageBg: '#08090B',
  mapBg: '#111519',
  district: '#171D21',
  boundary: '#59636A',
  road: '#59636A',
  loop: '#F29A38',
  axis: '#A94C42',
  water: '#507783',
  mountain: '#697568',
  highlight: '#FFD080',
  text: '#E7E0D4',
  textDim: '#8B918E',
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
  district: rgb(PALETTE.district),
  boundary: rgb(PALETTE.boundary),
  road: rgb(PALETTE.road),
  loop: rgb(PALETTE.loop),
  axis: rgb(PALETTE.axis),
  water: rgb(PALETTE.water),
  mountain: rgb(PALETTE.mountain),
  highlight: rgb(PALETTE.highlight),
  text: rgb(PALETTE.text),
  textDim: rgb(PALETTE.textDim),
} as const;

export type ViewMode = 'overview' | 'fractal';

/** Fractal loop timing / geometry. */
export const FRACTAL = {
  /** seconds per full recursive zoom cycle. */
  duration: 12,
  /** linear scale ratio between adjacent recursion layers. */
  layerScale: 2.45,
  /** number of nested layers rendered simultaneously. */
  layers: 3,
};
