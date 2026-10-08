import type { BufferGeometry } from 'three';
import { mergeParts, placedBox, placedCylinder } from './geom';

/** A stone arch bridge: vault, rising deck, parapet, and posts. */
export function createStoneBridge(length = 11, rise = 1.7): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const segments = 7;
  for (let index = 0; index < segments; index += 1) {
    const t = (index + 0.5) / segments;
    const x = -length / 2 + length * t;
    const arch = Math.sin(t * Math.PI);
    const deckY = 0.35 + rise * arch;
    parts.push(placedBox(length / segments + 0.08, 0.28, 3.1, x, deckY, 0));
    parts.push(placedBox(length / segments + 0.05, 0.22, 0.16, x, deckY + 0.28, -1.45));
    parts.push(placedBox(length / segments + 0.05, 0.22, 0.16, x, deckY + 0.28, 1.45));
    if (index % 2 === 0) {
      parts.push(placedBox(0.16, 0.42, 0.16, x, deckY + 0.5, -1.45));
      parts.push(placedBox(0.16, 0.42, 0.16, x, deckY + 0.5, 1.45));
    }
  }
  parts.push(
    placedCylinder(1.15, 1.15, 2.4, 0, 0.7, 0, 12, Math.PI / 2),
    placedBox(1.3, 0.7, 2.6, -length / 2 + 0.4, 0.35, 0),
    placedBox(1.3, 0.7, 2.6, length / 2 - 0.4, 0.35, 0),
  );
  return mergeParts(parts);
}
