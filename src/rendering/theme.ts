/** Shared LOOP roles plus retained, diegetic Beijing material colors. */
export const PALETTE = {
  night: '#07111B',
  asphalt: '#0B1F2E',
  warmWhite: '#ECE5D8',
  steel: '#71828B',
  signature: '#D9684B',
  skyTop: '#07111B',
  skyHorizon: '#27495C',
  fog: '#405563',
  pavement: '#53606A',
  stone: '#C8C4B8',
  wallRed: '#4F292B',
  palaceRed: '#642B28',
  roof: '#344148',
  roofEdge: '#9F7A48',
  lane: '#71828B',
  lamp: '#FFD38A',
  water: '#2F667A',
  foliage: '#365A43',
  text: '#ECE5D8',
} as const;

export const DRIVE = {
  /** Exact deterministic circuit period used by playback, seeking and export. */
  duration: 48,
  cameraHeight: 1.55,
  laneOffset: -1.72,
  roadHalfWidth: 4.2,
} as const;
