import { createLowRise, createSkylineMass } from './buildings';
import type { CityHost } from './assembleCity';
import { blocked, claim } from './occupancy';
import { PATH_METRES } from './pathSweep';
import { faceRoad, scatter, type Stamp } from './stamps';
import { hash01 } from './surfaceTextures';

interface FabricRun {
  from: number;
  to: number;
  /** +1 right of the road, -1 left, 0 both. */
  side: 1 | -1 | 0;
  kind: 'old' | 'modern';
  /** Lateral distance of each row from the centre line. */
  rows: number[];
}

/** Where the ground between the roadside and the skyline is filled, and with what. */
const RUNS: FabricRun[] = [
  { from: 0.09, to: 0.164, side: 1, kind: 'old', rows: [15.5] },
  { from: 0.168, to: 0.246, side: 1, kind: 'old', rows: [15.5, 23] },
  { from: 0.256, to: 0.332, side: -1, kind: 'old', rows: [17, 24] },
  { from: 0.256, to: 0.332, side: 1, kind: 'modern', rows: [16, 25] },
  { from: 0.336, to: 0.378, side: 1, kind: 'old', rows: [17] },
  { from: 0.34, to: 0.41, side: -1, kind: 'old', rows: [16] },
  { from: 0.418, to: 0.5, side: 0, kind: 'old', rows: [17, 24] },
  { from: 0.505, to: 0.585, side: 0, kind: 'old', rows: [15.5, 22.5] },
  { from: 0.586, to: 0.66, side: -1, kind: 'old', rows: [15.5, 22.5] },
  { from: 0.59, to: 0.668, side: 1, kind: 'modern', rows: [16.5, 26] },
  { from: 0.672, to: 0.752, side: 0, kind: 'modern', rows: [17, 26] },
  { from: 0.756, to: 0.832, side: 1, kind: 'modern', rows: [16.5, 25] },
  { from: 0.842, to: 0.916, side: 0, kind: 'old', rows: [15.5, 22.5] },
  { from: 0.922, to: 0.99, side: 0, kind: 'modern', rows: [17, 25] },
];

/** Low houses and blocks in four shapes, scattered with seeded spacing, size, and tint. */
export function dressFabric(host: CityHost): void {
  const mats = host.mats;
  const shapes = [0, 1, 2, 3].map((variant) => createLowRise(variant));
  const walls = [mats.grayBrick, mats.grayBrick, mats.streetBrick, mats.concrete];
  const windows = [mats.window, mats.windowSlat, mats.windowDiamond, mats.window];
  const buckets: Stamp[][] = shapes.map(() => []);
  for (const run of RUNS) {
    for (const side of run.side === 0 ? [-1, 1] : [run.side]) {
      run.rows.forEach((row, rowIndex) => {
        let progress = run.from + hash01(rowIndex, Math.round(run.from * 1000)) * 0.003;
        let index = 0;
        while (progress < run.to) {
          const roll = hash01(index + rowIndex * 31, Math.round(progress * 1000) + side * 7);
          const variant = run.kind === 'old' ? Math.floor(roll * 3) : roll < 0.72 ? 3 : 2;
          const scale = 0.85 + hash01(index, rowIndex + 5) * 0.4;
          const offset = side * (row + hash01(index, 9 + rowIndex) * 2.2);
          const along = 9.4 * scale;
          if (!blocked(progress, offset, along, 7.4 * scale)) {
            claim(progress, offset, along, 7.4 * scale);
            const shade = 0.86 + hash01(index, 41 + rowIndex) * 0.26;
            buckets[variant].push({
              progress,
              offset,
              heading: faceRoad(offset),
              scale,
              tint: [shade, shade * (0.96 + hash01(index, 43) * 0.08), shade * (0.94 + hash01(index, 47) * 0.1)],
            });
          }
          progress += (along + 1.2 + hash01(index, 21) * 3.5) / PATH_METRES;
          index += 1;
        }
      });
    }
  }
  shapes.forEach((shape, variant) => {
    scatter(host, shape.wall, walls[variant], buckets[variant], false);
    if (shape.roof) scatter(host, shape.roof, mats.tile, buckets[variant], false);
    scatter(host, shape.glow, windows[variant], buckets[variant], false);
  });
}

/** Eight silhouettes at 34–48 m, stretched and tinted so no two read alike. */
export function dressSkyline(host: CityHost): void {
  const buckets: Stamp[][] = Array.from({ length: 8 }, () => []);
  const add = (index: number, progress: number, side: number, near: number, spread: number, tall: number) => {
    const variant = Math.floor(hash01(index, 31) * 8);
    const scale = 0.78 + hash01(index, 2) * 0.7;
    const cool = 0.9 + hash01(index, 6) * 0.2;
    buckets[variant].push({
      progress,
      offset: side * (near + hash01(index, 4) * spread),
      scale,
      scaleY: scale * (0.8 + hash01(index, 3) * 0.7) * tall,
      heading: hash01(index, 8) > 0.5 ? 0 : Math.PI / 2,
      tint: [cool * 0.94, cool, cool * (1.0 + hash01(index, 12) * 0.12)],
    });
  };
  for (let index = 0; index < 56; index += 1) {
    add(index, (index + 0.5) / 56, index % 2 === 0 ? -1 : 1, 34, 14, 1);
  }
  for (let index = 0; index < 14; index += 1) {
    add(100 + index, 0.668 + index * 0.0066, index % 2 === 0 ? -1 : 1, 24, 14, 1.35);
  }
  buckets.forEach((stamps, variant) => {
    scatter(host, createSkylineMass(variant), host.mats.glass, stamps, false);
  });
}
