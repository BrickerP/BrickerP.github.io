import type { BufferGeometry } from 'three';
import { mergeParts, placedBox } from './geom';

export interface PodiumOptions {
  width: number;
  depth: number;
  height?: number;
  steps?: number;
  /** Which local face receives the stair: -1 or +1 along Z. */
  stepFace?: -1 | 1;
}

/** Straight stone podium with a short flight of steps on one face. */
export function createPodium(options: PodiumOptions): BufferGeometry {
  const height = options.height ?? 0.9;
  const steps = options.steps ?? 3;
  const parts: BufferGeometry[] = [
    placedBox(options.width + 0.4, height * 0.45, options.depth + 0.5, 0, height * 0.22, 0),
    placedBox(options.width, height * 0.55, options.depth, 0, height * 0.72, 0),
  ];
  const face = options.stepFace ?? -1;
  for (let index = 0; index < steps; index += 1) {
    const tread = 0.34;
    parts.push(
      placedBox(
        options.width * 0.46,
        0.16,
        tread,
        0,
        0.08 + index * 0.16,
        face * (options.depth / 2 + tread * (index + 0.5)),
      ),
    );
  }
  return mergeParts(parts);
}

/**
 * A sumeru base: plinth, guijiao, lower beam, narrow waist, upper beam.
 * The top stays at `height`, and the spread stays inside width + 0.7.
 */
export function createSumeru(width: number, depth: number, height = 1.1): BufferGeometry {
  const h = height;
  return mergeParts([
    placedBox(width + 0.7, h * 0.16, depth + 0.7, 0, h * 0.08, 0),
    placedBox(width + 0.42, h * 0.12, depth + 0.42, 0, h * 0.2, 0),
    placedBox(width + 0.22, h * 0.16, depth + 0.22, 0, h * 0.34, 0),
    placedBox(width - 0.12, h * 0.2, depth - 0.12, 0, h * 0.52, 0),
    placedBox(width + 0.18, h * 0.14, depth + 0.18, 0, h * 0.68, 0),
    placedBox(width, h * 0.24, depth, 0, h * 0.88, 0),
  ]);
}
