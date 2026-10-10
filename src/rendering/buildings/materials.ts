import type { MeshBasicMaterial, MeshStandardMaterial } from 'three';

/** Shared surface slots. Patterns live in the material, not in a texture atlas. */
export interface CityMaterials {
  streetBrick: MeshStandardMaterial;
  palaceBrick: MeshStandardMaterial;
  /** Grey city brick for walls, hutong houses, and the drum and bell tower bases. */
  grayBrick: MeshStandardMaterial;
  tile: MeshStandardMaterial;
  /** Yellow glazed tile for the palace roofs. */
  glaze: MeshStandardMaterial;
  /** Blue glazed tile for the Temple of Heaven. */
  glazeBlue: MeshStandardMaterial;
  stone: MeshStandardMaterial;
  concrete: MeshStandardMaterial;
  /** Lit concrete for flyover decks, piers and portals: their faces turn away from the key light. */
  soffit: MeshStandardMaterial;
  bark: MeshStandardMaterial;
  glass: MeshStandardMaterial;
  timber: MeshStandardMaterial;
  /** Vermilion lacquer for columns and painted walls. */
  lacquer: MeshStandardMaterial;
  /** Blue-green painted beams and brackets. */
  paint: MeshStandardMaterial;
  gold: MeshStandardMaterial;
  white: MeshStandardMaterial;
  window: MeshStandardMaterial;
  /** The same lit panes in a diamond lattice. */
  windowDiamond: MeshStandardMaterial;
  /** The same lit panes as vertical slats. */
  windowSlat: MeshStandardMaterial;
  leaf: MeshStandardMaterial;
  niche: MeshStandardMaterial;
  lampPole: MeshStandardMaterial;
  lampHead: MeshBasicMaterial;
  lantern: MeshStandardMaterial;
}
