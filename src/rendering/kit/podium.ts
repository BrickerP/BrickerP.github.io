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

/** Two-tier marble terrace used under a hall. */
export function createSumeru(width: number, depth: number, height = 1.1): BufferGeometry {
  return mergeParts([
    placedBox(width + 0.8, 0.22, depth + 0.8, 0, 0.11, 0),
    placedBox(width + 0.35, 0.28, depth + 0.35, 0, 0.36, 0),
    placedBox(width, height - 0.5, depth, 0, 0.5 + (height - 0.5) / 2, 0),
  ]);
}
