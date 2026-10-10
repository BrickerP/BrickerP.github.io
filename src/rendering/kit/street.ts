import { Matrix4, SphereGeometry, type BufferGeometry } from 'three';
import { createArch } from './wall';
import { mergeParts, placedBox, placedCylinder, placedFrustum, placedLathe } from './geom';
import { createSweep } from './sweep';

/** A slatted park bench. Sitters face -Z. */
export function createBench(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  for (let slat = 0; slat < 3; slat += 1) {
    parts.push(placedBox(1.8, 0.04, 0.12, 0, 0.46, -0.15 + slat * 0.15));
    parts.push(placedBox(1.8, 0.1, 0.03, 0, 0.64 + slat * 0.14, 0.26 + slat * 0.03));
  }
  for (const x of [-0.82, 0.82]) {
    parts.push(placedBox(0.06, 0.44, 0.52, x, 0.22, 0));
    parts.push(placedBox(0.08, 0.05, 0.56, x, 0.7, 0.04));
    parts.push(placedBox(0.06, 0.34, 0.06, x, 0.6, 0.3, 0, 0.12));
  }
  return mergeParts(parts);
}

/** Lakeside balustrade post: plinth, shaft, collar, and a lotus finial. Origin on the ground. */
export function createBalustradePost(): BufferGeometry {
  return mergeParts([
    placedBox(0.32, 0.16, 0.32, 0, 0.08, 0),
    placedBox(0.2, 0.62, 0.2, 0, 0.47, 0),
    placedBox(0.28, 0.08, 0.28, 0, 0.82, 0),
    placedBox(0.16, 0.12, 0.16, 0, 0.92, 0),
    placedCylinder(0.0, 0.1, 0.14, 0, 1.05, 0, 8),
  ]);
}

/** One carved panel between two posts, running along local Z. */
export function createBalustradePanel(length = 2.0): BufferGeometry {
  return mergeParts([
    placedBox(0.12, 0.09, length, 0, 0.76, 0),
    placedBox(0.14, 0.1, length, 0, 0.22, 0),
    placedBox(0.1, 0.44, length - 0.16, 0, 0.49, 0),
    placedBox(0.12, 0.2, length * 0.5, 0, 0.5, 0),
  ]);
}

/** A concrete road barrier along local Z. Origin on the ground. */
export function createBarrier(length = 2.3): BufferGeometry {
  const frames = [
    { x: 0, z: -length / 2, nx: 1, nz: 0 },
    { x: 0, z: length / 2, nx: 1, nz: 0 },
  ];
  return createSweep(frames, [
    [[-0.27, 0], [0.27, 0], [0.15, 0.68], [-0.15, 0.68]],
    [[-0.2, 0.68], [0.2, 0.68], [0.2, 0.78], [-0.2, 0.78]],
  ]);
}

/** A white marble ornamental column: plinth, shaft, cloud plate, disc, and a beast. Origin on the ground. */
export function createHuabiao(): BufferGeometry {
  return mergeParts([
    placedBox(1.3, 0.4, 1.3, 0, 0.2, 0),
    placedBox(1.0, 0.3, 1.0, 0, 0.55, 0),
    placedCylinder(0.24, 0.3, 5.0, 0, 3.2, 0, 12),
    placedBox(2.0, 0.14, 0.34, 0, 4.6, 0),
    placedBox(0.34, 0.14, 2.0, 0, 4.9, 0),
    placedCylinder(0.52, 0.4, 0.18, 0, 5.78, 0, 16),
    placedBox(0.28, 0.34, 0.28, 0, 6.04, 0),
    placedCylinder(0.0, 0.14, 0.24, 0, 6.33, 0, 6),
  ]);
}

/** A paper lantern with caps and a tassel. Origin at the hanging point. */
export function createLantern(radius = 0.2): BufferGeometry {
  const body = new SphereGeometry(radius, 10, 8);
  body.applyMatrix4(new Matrix4().makeScale(1, 1.18, 1));
  body.translate(0, -radius * 1.4, 0);
  return mergeParts([
    body,
    placedCylinder(radius * 0.55, radius * 0.62, 0.06, 0, -radius * 0.2, 0, 10),
    placedCylinder(radius * 0.6, radius * 0.5, 0.06, 0, -radius * 2.62, 0, 10),
    placedBox(0.02, radius * 1.2, 0.02, 0, -radius * 3.3, 0),
    placedLathe([[0.0, 0], [0.04, 0.05], [0.0, 0.14]], 0, -radius * 3.9, 0, 6),
  ]);
}

/** A bracket arm and board frame for a vertical shop sign. The board hangs 0.9 m out, facing local ±X. */
export function createSignBracket(): BufferGeometry {
  return mergeParts([
    placedBox(0.07, 0.07, 1.0, 0, 0, -0.5),
    placedBox(0.05, 0.05, 0.62, 0, -0.26, -0.28, 0, 0),
    placedBox(0.34, 0.06, 0.12, 0, -0.1, -0.92),
    placedBox(0.34, 0.06, 0.12, 0, -1.3, -0.92),
    placedBox(0.06, 1.26, 0.12, -0.16, -0.7, -0.92),
    placedBox(0.06, 1.26, 0.12, 0.16, -0.7, -0.92),
  ]);
}

/**
 * Bent column for the flyover: footing, battered shaft, and a flared cap that carries the girder.
 * Origin on the ground. `height` is the underside of the girder.
 */
export function createPierBent(height: number): BufferGeometry {
  const capHeight = 0.9;
  const shaft = height - capHeight;
  return mergeParts([
    placedBox(1.7, 0.5, 1.7, 0, 0.25, 0),
    placedFrustum(1.15, 0.8, 1.15, 0.8, shaft - 0.5, 0, 0.5 + (shaft - 0.5) / 2, 0),
    placedFrustum(0.8, 1.9, 0.8, 1.5, capHeight, 0, shaft + capHeight / 2, 0),
    placedBox(2.05, 0.18, 1.65, 0, height - 0.09, 0),
  ]);
}

export interface DoorwayParts {
  stone: BufferGeometry;
  door: BufferGeometry;
  studs: BufferGeometry;
  dark: BufferGeometry;
}

/**
 * An arched door in a stone frame, built to stand against a wall face. It faces -Z; the origin is
 * the bottom centre of the frame's front plane, and the frame runs 0.3 m back into +Z, so a caller
 * puts the origin 0.3 m in front of the wall. The leaves sit inside the frame, which reads as a recess.
 */
export function createDoorway(width: number, height: number): DoorwayParts {
  const radius = width / 2;
  const spring = height - radius;
  const jamb = 0.3;
  const depth = 0.3;
  const stone = mergeParts([
    placedBox(jamb, spring, depth, -(radius + jamb / 2), spring / 2, depth / 2),
    placedBox(jamb, spring, depth, radius + jamb / 2, spring / 2, depth / 2),
    (() => {
      const ring = createArch(radius + jamb / 2, depth, jamb);
      ring.translate(0, spring, depth / 2);
      return ring;
    })(),
    placedBox(width + jamb * 2 + 0.2, 0.12, depth + 0.2, 0, 0.06, depth / 2 - 0.1),
  ]);
  const leafWidth = (width - 0.06) / 2;
  const door = mergeParts([
    placedBox(leafWidth, spring, 0.06, -leafWidth / 2 - 0.01, spring / 2, 0.18),
    placedBox(leafWidth, spring, 0.06, leafWidth / 2 + 0.01, spring / 2, 0.18),
  ]);
  const studParts: BufferGeometry[] = [];
  const columns = Math.max(3, Math.round(leafWidth / 0.3));
  const rows = Math.max(4, Math.round(spring / 0.32));
  for (const side of [-1, 1]) {
    for (let column = 0; column < columns; column += 1) {
      for (let row = 0; row < rows; row += 1) {
        const x = side * (0.12 + ((column + 0.5) * (leafWidth - 0.16)) / columns);
        const y = 0.18 + ((row + 0.5) * (spring - 0.3)) / rows;
        studParts.push(placedBox(0.09, 0.09, 0.06, x, y, 0.13));
      }
    }
  }
  return {
    stone,
    door,
    studs: mergeParts(studParts),
    dark: placedCylinder(radius, radius, 0.05, 0, spring, 0.23, 20, Math.PI / 2),
  };
}
