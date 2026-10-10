import { BufferAttribute, BufferGeometry } from 'three';
import { pushOriented } from './geom';

/** One station along a sweep: a centre point and the unit lateral direction (positive = left of travel). */
export interface SweepFrame {
  x: number;
  z: number;
  nx: number;
  nz: number;
}

/** A closed outline in (lateral, height), counter-clockwise when lateral points right and height up. */
export type SweepOutline = Array<[number, number]>;

/**
 * Sweep convex outlines along a run of frames. Every outline edge gets its own
 * vertices so corners stay hard, and the two ends are capped.
 */
export function createSweep(frames: SweepFrame[], outlines: SweepOutline[]): BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  const add = (frame: SweepFrame, u: number, y: number) => {
    positions.push(frame.x + frame.nx * u, y, frame.z + frame.nz * u);
    return positions.length / 3 - 1;
  };
  for (const outline of outlines) {
    const count = outline.length;
    for (let edge = 0; edge < count; edge += 1) {
      const [u0, y0] = outline[edge];
      const [u1, y1] = outline[(edge + 1) % count];
      const du = u1 - u0;
      const dy = y1 - y0;
      const length = Math.hypot(du, dy);
      if (length < 1e-5) continue;
      const lateral = dy / length;
      const up = -du / length;
      let previous: [number, number] | undefined;
      for (let step = 0; step < frames.length; step += 1) {
        const frame = frames[step];
        const a = add(frame, u0, y0);
        const b = add(frame, u1, y1);
        if (previous) {
          const [pa, pb] = previous;
          const toward: [number, number, number] = [frame.nx * lateral, up, frame.nz * lateral];
          pushOriented(positions, indices, pa, a, pb, toward);
          pushOriented(positions, indices, pb, a, b, toward);
        }
        previous = [a, b];
      }
    }
    for (const end of [0, frames.length - 1]) {
      const frame = frames[end];
      const other = frames[end === 0 ? 1 : frames.length - 2];
      const tx = frame.x - other.x;
      const tz = frame.z - other.z;
      const centre = add(
        frame,
        outline.reduce((sum, [u]) => sum + u, 0) / count,
        outline.reduce((sum, [, y]) => sum + y, 0) / count,
      );
      const ring = outline.map(([u, y]) => add(frame, u, y));
      for (let index = 0; index < count; index += 1) {
        pushOriented(positions, indices, centre, ring[index], ring[(index + 1) % count], [tx, 0, tz]);
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}
