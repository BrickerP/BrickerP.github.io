import type { Vec2 } from '../path/geometry';
import type { LayerParams } from './MapRenderer';
import { FRACTAL } from './theme';

/**
 * Produces a seamless stack for the orange loop motif only. The city context is
 * rendered once by BeijingLoopApp, which prevents recursive copies from turning
 * the quiet background into a mesh.
 *
 * `phase + k` is invariant as a set when phase wraps from 1 back to 0 and k is
 * shifted by one. Every scale and opacity is therefore periodic at the seam.
 */
export class FractalRenderer {
  private readonly depths = [-2, -1, 0, 1, 2];

  phase(elapsed: number): number {
    const duration = FRACTAL.duration;
    return (((elapsed % duration) + duration) % duration) / duration;
  }

  fractalLayers(phase: number, anchor: Vec2, pxPerUnit: number): LayerParams[] {
    const layers: LayerParams[] = [];
    for (const depth of this.depths) {
      const logScale = phase + depth;
      const rawAlpha = bspline3(logScale);
      if (rawAlpha <= 0.003) continue;

      // Compress faint echoes while keeping the function continuous. At most
      // two copies read strongly; the remaining copy is a quiet seam bridge.
      const normalized = rawAlpha / (2 / 3);
      const alpha = Math.min(1, Math.pow(normalized, 1.55) * 0.96);
      if (alpha <= 0.012) continue;

      layers.push({
        worldScale: Math.pow(FRACTAL.layerScale, logScale),
        alpha,
        detail: smoothstep(0.08, 0.42, alpha),
        pxPerUnit,
        anchor,
        drawFill: false,
      });
    }
    layers.sort((left, right) => right.worldScale - left.worldScale);
    return layers;
  }

  baseLayers(anchor: Vec2, pxPerUnit: number): LayerParams[] {
    return [{ worldScale: 1, alpha: 1, detail: 1, pxPerUnit, anchor, drawFill: true }];
  }
}

function bspline3(value: number): number {
  const distance = Math.abs(value);
  if (distance < 1) {
    return 2 / 3 - distance * distance + (distance * distance * distance) / 2;
  }
  if (distance < 2) {
    const remainder = 2 - distance;
    return (remainder * remainder * remainder) / 6;
  }
  return 0;
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
