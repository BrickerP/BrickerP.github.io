/** Shared palette for the stylised blue-hour street drive. */
export const PALETTE = {
  skyTop: '#101B2D',
  skyHorizon: '#355B73',
  fog: '#607786',
  asphalt: '#24292C',
  pavement: '#756F64',
  stone: '#D1C7B5',
  wallRed: '#8F2B22',
  palaceRed: '#B53A2B',
  roof: '#303936',
  roofEdge: '#C9A056',
  lane: '#E5DDCC',
  lamp: '#FFD38A',
  water: '#315F70',
  foliage: '#35513D',
  text: '#F4E7D2',
} as const;

export const DRIVE = {
  /** Exact deterministic circuit period used by playback, seeking and export. */
  duration: 16,
  cameraHeight: 1.55,
  laneOffset: -1.72,
  roadHalfWidth: 4.2,
} as const;
