/**
 * Registration seam for the twelve-passage drive.
 * A new passage is a new entry here plus one builder that calls beginPassage.
 * Builders stay beside the shared road and light rig so a passage cannot
 * invent its own palette or camera.
 */
export interface PassageSpec {
  id: string;
  poster: string;
}

export const PASSAGES = [
  {
    id: 'central-axis',
    poster: 'Zhengyangmen spans the road; Tiananmen sits back across a forecourt.',
  },
  {
    id: 'palace-moat',
    poster: 'A long red wall and one corner tower across dark water.',
  },
  {
    id: 'shichahai',
    poster: 'Willows, one humpback bridge, and the white dagoba over the lake.',
  },
  {
    id: 'deshengmen',
    poster: 'The arrow tower stands beside the ring-road gantry.',
  },
  {
    id: 'second-ring-threshold',
    poster: 'A low city wall and one curved flyover, then the road opens.',
  },
  {
    id: 'bell-drum',
    poster: 'Drum tower near the road, bell tower set behind, shops kept low.',
  },
  {
    id: 'nanluo-wudaoying',
    poster: 'A low hutong, one moon-gate tea house, and two named gates.',
  },
  {
    id: 'yonghegong',
    poster: 'One yellow multi-eave hall, not a row of temples.',
  },
  {
    id: 'cbd-finance',
    poster: 'One stepped tower against a quieter finance plate.',
  },
  {
    id: 'temple-of-heaven',
    poster: 'The triple-eave hall and a band of cypress, nothing else competing.',
  },
  {
    id: 'qianmen-hutong',
    poster: 'The pailou leads; one Dashilar gate stands back from the shop row.',
  },
  {
    id: 'overpass',
    poster: 'One concrete pier holds the deck, and the warm carrier closes the loop.',
  },
] as const satisfies readonly PassageSpec[];

export type PassageId = (typeof PASSAGES)[number]['id'];

const PASSAGE_IDS = new Set<string>(PASSAGES.map((passage) => passage.id));

export function assertPassageId(id: string): PassageId {
  if (!PASSAGE_IDS.has(id)) {
    throw new Error(`Unknown passage: ${id}`);
  }
  return id as PassageId;
}
