/** Shared palette for the stylised blue-hour street drive. */
export const PALETTE = {
  skyTop: '#0E1B2D',
  skyHorizon: '#315F7B',
  fog: '#3B5B6D',
  asphalt: '#28333D',
  pavement: '#73777A',
  stone: '#C8C4B8',
  wallRed: '#8F2B22',
  palaceRed: '#B53A2B',
  roof: '#344148',
  roofEdge: '#C9A056',
  lane: '#E5DDCC',
  lamp: '#FFD38A',
  water: '#2F667A',
  foliage: '#365A43',
  text: '#F4E7D2',
} as const;

export const DRIVE = {
  /** Exact deterministic circuit period used by playback, seeking and export. */
  duration: 48,
  cameraHeight: 1.55,
  laneOffset: -1.72,
  roadHalfWidth: 4.2,
} as const;
