import type { MeshBasicMaterial, MeshStandardMaterial } from 'three';

/** Shared surface slots. Patterns live in the material, not in a texture atlas. */
export interface CityMaterials {
  streetBrick: MeshStandardMaterial;
  palaceBrick: MeshStandardMaterial;
  tile: MeshStandardMaterial;
  stone: MeshStandardMaterial;
  concrete: MeshStandardMaterial;
  bark: MeshStandardMaterial;
  glass: MeshStandardMaterial;
  timber: MeshStandardMaterial;
  gold: MeshStandardMaterial;
  white: MeshStandardMaterial;
  window: MeshStandardMaterial;
  leaf: MeshStandardMaterial;
  niche: MeshStandardMaterial;
  lampPole: MeshStandardMaterial;
  lampHead: MeshBasicMaterial;
  lantern: MeshStandardMaterial;
}
