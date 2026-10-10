import { DRIVE_PATH_SCALE } from './FirstPersonCameraRig';
import { DRIVE_PATH, samplePathFrame } from './drivePath';
import type { SweepFrame } from './kit';

/** Length of the circuit in world metres. */
export const PATH_METRES = DRIVE_PATH.getLength() * DRIVE_PATH_SCALE;

/**
 * Stations along the road from `from` to `to`, `offset` metres to the left of the centre line.
 * Sweeps built on them follow the curve with no seams between segments.
 */
export function sweepFrames(from: number, to: number, offset: number, step = 1.5): SweepFrame[] {
  const count = Math.max(2, Math.ceil(((to - from) * PATH_METRES) / step) + 1);
  const frame = samplePathFrame(0);
  const frames: SweepFrame[] = [];
  for (let index = 0; index < count; index += 1) {
    samplePathFrame(from + ((to - from) * index) / (count - 1), frame);
    frames.push({
      x: frame.point.x * DRIVE_PATH_SCALE + frame.normal.x * offset,
      z: frame.point.z * DRIVE_PATH_SCALE + frame.normal.z * offset,
      nx: frame.normal.x,
      nz: frame.normal.z,
    });
  }
  return frames;
}
