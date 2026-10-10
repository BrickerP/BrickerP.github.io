import { ExtrudeGeometry, Path, Shape, type BufferGeometry } from 'three';
import { indexed, mergeParts, placedBeam, placedBox } from './geom';

/** Centre, half-span and crown height in metres, for the default 11 m bridge with 1.7 m of rise. */
const ARCHES = [
  [-3.4, 1.15, 0.9],
  [0, 1.7, 1.45],
  [3.4, 1.15, 0.9],
] as const;

/**
 * A three-arch stone bridge along X: the deck rises in one curve over solid piers, with an arch
 * cut through each span and a balustrade of posts and rails on both sides. The origin is the
 * middle of the deck at ground level; the arches spring from the ground, so water shows through.
 */
export function createStoneBridge(length = 11, rise = 1.7): BufferGeometry {
  const width = 2.2;
  const half = length / 2;
  const deckAt = (x: number) => 0.5 + rise * Math.sin(((x + half) / length) * Math.PI);

  const shape = new Shape();
  shape.moveTo(-half, -0.3);
  shape.lineTo(half, -0.3);
  const samples = 28;
  for (let index = 0; index <= samples; index += 1) {
    const x = half - (length * index) / samples;
    shape.lineTo(x, deckAt(x));
  }
  shape.lineTo(-half, -0.3);
  const scaleX = length / 11;
  const scaleY = rise / 1.7;
  for (const [centre, span, crown] of ARCHES) {
    const hole = new Path();
    hole.moveTo((centre - span) * scaleX, 0.02);
    hole.absellipse(centre * scaleX, 0.02, span * scaleX, crown * scaleY, Math.PI, 0, true, 0);
    hole.lineTo((centre - span) * scaleX, 0.02);
    shape.holes.push(hole);
  }
  const body = new ExtrudeGeometry(shape, { depth: width, bevelEnabled: false, curveSegments: 24 });
  body.translate(0, 0, -width / 2);

  const parts: BufferGeometry[] = [indexed(body)];
  const posts = 10;
  for (const side of [-1, 1]) {
    const z = side * (width / 2 - 0.12);
    for (let index = 0; index <= posts; index += 1) {
      const x = -half + (length * index) / posts;
      const top = deckAt(x);
      parts.push(placedBox(0.2, 0.62, 0.2, x, top + 0.31, z), placedBox(0.27, 0.08, 0.27, x, top + 0.66, z));
      if (index === posts) continue;
      const next = -half + (length * (index + 1)) / posts;
      parts.push(
        placedBeam(x, top + 0.5, z, next, deckAt(next) + 0.5, z, 0.1),
        placedBeam(x, top + 0.2, z, next, deckAt(next) + 0.2, z, 0.12),
      );
    }
  }
  return mergeParts(parts);
}
