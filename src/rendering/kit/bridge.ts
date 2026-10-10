import type { BufferGeometry } from 'three';
import { mergeParts, placedBox } from './geom';

/** A stone arch bridge: one rising deck, parapets, and an arch tucked under the crown. */
export function createStoneBridge(length = 11, rise = 1.7): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const segments = 9;
  for (let index = 0; index < segments; index += 1) {
    const t = (index + 0.5) / segments;
    const x = -length / 2 + length * t;
    const arch = Math.sin(t * Math.PI);
    const deckY = 0.42 + rise * arch;
    const span = length / segments + 0.85;
    parts.push(placedBox(span, 0.36, 2.2, x, deckY, 0));
    parts.push(placedBox(span, 0.36, 0.22, x, deckY + 0.32, -0.95));
    parts.push(placedBox(span, 0.36, 0.22, x, deckY + 0.32, 0.95));
  }
  parts.push(
    placedBox(1.2, 0.55, 1.8, -length / 2 + 0.4, 0.28, 0),
    placedBox(1.2, 0.55, 1.8, length / 2 - 0.4, 0.28, 0),
  );
  return mergeParts(parts);
}
