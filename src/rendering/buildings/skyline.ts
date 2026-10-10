import type { BufferGeometry } from 'three';
import { createRoof, mergeParts, placedBox, placedCylinder, placedFrustum } from '../kit';

/** Eight distinct skyline silhouettes. All glass, base on y = 0, footprint within 3.8 m of the origin. */
export function createSkylineMass(variant: number): BufferGeometry {
  switch (((variant % 8) + 8) % 8) {
    case 0:
      return mergeParts([
        placedBox(5.4, 3.2, 4.2, 0, 1.6, 0),
        placedBox(3.2, 11.4, 2.6, 0, 8.9, 0),
        placedBox(1.6, 3.4, 1.6, 0, 16.3, 0),
        placedCylinder(0.05, 0.08, 4, 0, 19, 0, 5),
      ]);
    case 1:
      return mergeParts([
        placedBox(7.4, 2.2, 5.2, 0, 1.1, 0),
        placedBox(5.2, 7.4, 3.6, 0.4, 5.9, 0),
        placedBox(2.2, 4.6, 2.2, -1.2, 11.9, 0),
        placedBox(0.9, 1.4, 0.9, -1.2, 14.9, 0),
      ]);
    case 2:
      return mergeParts([
        placedBox(6.6, 3.4, 4.8, 0, 1.7, 0),
        placedBox(3.6, 6.2, 3.2, 0, 6.5, 0),
        placedBox(2.2, 4.4, 2.2, 0, 11.8, 0),
        placedBox(1.1, 2.4, 1.1, 0, 15.2, 0),
      ]);
    case 3:
      return mergeParts([
        placedCylinder(1.9, 2.0, 15, 0, 7.5, 0, 8),
        placedCylinder(2.1, 2.1, 0.3, 0, 4, 0, 8),
        placedCylinder(2.1, 2.1, 0.3, 0, 8.5, 0, 8),
        placedCylinder(2.05, 2.05, 0.3, 0, 13, 0, 8),
        placedCylinder(0.3, 1.9, 2.4, 0, 16.2, 0, 8),
        placedCylinder(0.04, 0.07, 3, 0, 18.9, 0, 5),
      ]);
    case 4:
      return mergeParts([
        placedBox(2.2, 15.5, 2.4, -1.6, 7.75, 0),
        placedBox(2.2, 15.5, 2.4, 1.6, 7.75, 0),
        placedBox(1.2, 1.4, 1.8, 0, 11.2, 0),
        placedBox(2.6, 0.8, 2.6, -1.6, 15.9, 0),
        placedBox(2.6, 0.8, 2.6, 1.6, 15.9, 0),
      ]);
    case 5:
      return mergeParts([
        placedBox(3.6, 12, 3.2, 0, 6, 0),
        placedFrustum(3.6, 1.6, 3.2, 1.4, 3.4, 0, 13.7, 0),
        placedBox(0.5, 3, 0.5, 0, 17, 0),
      ]);
    case 6:
      return mergeParts([
        placedBox(1.8, 14, 2.4, -1.9, 7, 0),
        placedBox(1.8, 14, 2.4, 1.9, 7, 0),
        placedBox(5.6, 3.2, 2.8, 0, 15.6, 0),
        placedBox(3.2, 1.2, 2.2, 0, 17.8, 0),
      ]);
    default:
      return mergeParts([
        placedBox(2.4, 19.5, 2.4, 0, 9.75, 0),
        placedFrustum(2.4, 3.6, 2.4, 3.6, 2.4, 0, 20.7, 0),
        placedBox(3.6, 0.5, 3.6, 0, 22.15, 0),
        placedCylinder(0.05, 0.1, 5, 0, 24.9, 0, 5),
      ]);
  }
}

export interface LowRise {
  wall: BufferGeometry;
  /** Flat-roofed blocks have none. */
  roof?: BufferGeometry;
  glow: BufferGeometry;
}

/**
 * Four low buildings for the ground between the road and the skyline. They face -Z and stay under
 * 9 m wide, so a stamp can be scattered along either side of the street.
 */
export function createLowRise(variant: number): LowRise {
  switch (((variant % 4) + 4) % 4) {
    case 0:
      return {
        wall: placedBox(8.0, 3.0, 4.6, 0, 1.5, 0),
        roof: createRoof({ width: 8.9, depth: 5.6, rise: 1.5, kind: 'gable', wingLift: 0.3 }),
        glow: mergeParts([
          placedBox(1.1, 1.0, 0.06, -2.4, 1.7, -2.33),
          placedBox(1.1, 1.0, 0.06, 0, 1.7, -2.33),
          placedBox(1.1, 1.0, 0.06, 2.4, 1.7, -2.33),
        ]),
      };
    case 1:
      return {
        wall: mergeParts([
          placedBox(10, 2.2, 0.5, 0, 1.1, -1.4),
          placedBox(3.4, 3.2, 2.6, 0, 1.6, 0),
          placedBox(4.6, 3.6, 3.2, 0, 1.8, 3.4),
        ]),
        roof: mergeParts([
          createRoof({ width: 4.2, depth: 3.4, rise: 1.2, kind: 'gable', wingLift: 0.3 }).translate(0, 3.2, 0),
          createRoof({ width: 5.6, depth: 4.0, rise: 1.6, kind: 'gable', wingLift: 0.3 }).translate(0, 3.6, 3.4),
        ]),
        glow: mergeParts([
          placedBox(1.0, 1.7, 0.06, 0, 1.0, -1.33),
          placedBox(1.2, 0.9, 0.06, 0, 1.9, 1.8),
        ]),
      };
    case 2:
      return {
        wall: mergeParts([placedBox(7.2, 4.4, 5.4, 0, 2.2, 0), placedBox(7.6, 0.2, 5.8, 0, 2.3, 0)]),
        roof: createRoof({ width: 8.4, depth: 6.6, rise: 1.5, kind: 'hip', wingLift: 0.5 }).translate(0, 4.4, 0),
        glow: mergeParts([
          placedBox(1.1, 1.1, 0.06, -2.2, 1.2, -2.73),
          placedBox(1.1, 1.1, 0.06, 0, 1.2, -2.73),
          placedBox(1.1, 1.1, 0.06, 2.2, 1.2, -2.73),
          placedBox(1.1, 1.1, 0.06, -2.2, 3.4, -2.73),
          placedBox(1.1, 1.1, 0.06, 0, 3.4, -2.73),
          placedBox(1.1, 1.1, 0.06, 2.2, 3.4, -2.73),
        ]),
      };
    default:
      return {
        wall: mergeParts([
          placedBox(9, 6.4, 7.4, 0, 3.2, 0),
          placedBox(9.3, 0.3, 7.7, 0, 6.55, 0),
          placedBox(2.2, 1.2, 2.2, 2.4, 7.3, 1.0),
        ]),
        glow: mergeParts([
          placedBox(7.8, 0.9, 0.06, 0, 1.4, -3.73),
          placedBox(7.8, 0.9, 0.06, 0, 3.0, -3.73),
          placedBox(7.8, 0.9, 0.06, 0, 4.6, -3.73),
        ]),
      };
  }
}
