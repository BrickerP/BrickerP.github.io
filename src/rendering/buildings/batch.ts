import { Mesh, type BufferGeometry, type Group, type Material } from 'three';
import { mergeParts } from '../kit';

export type ShadowRole = 'mass' | 'skip';

/** Merge same-material parts into one draw. Brackets and balusters stay instanced. */
export function beginAssembly(group: Group) {
  const buckets = new Map<string, { material: Material; role: ShadowRole; parts: BufferGeometry[] }>();
  return {
    add(geometry: BufferGeometry, material: Material, y = 0, role: ShadowRole = 'mass') {
      if (y !== 0) geometry.translate(0, y, 0);
      const key = `${role}:${material.uuid}`;
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { material, role, parts: [] };
        buckets.set(key, bucket);
      }
      bucket.parts.push(geometry);
    },
    finish() {
      for (const bucket of buckets.values()) {
        const mesh = new Mesh(mergeParts(bucket.parts), bucket.material);
        mesh.userData.shadowRole = bucket.role;
        group.add(mesh);
      }
    },
  };
}
