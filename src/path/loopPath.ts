import type { Vec2 } from './geometry';
import { PathSampler } from './pathSampler';

/**
 * Builds the vehicle's closed loop (Beijing's artistic 2nd ring) as an
 * arc-length {@link PathSampler}. The control points come from a GeoJSON
 * LineString (public/data/beijing-loop.geojson); if that ever fails to load
 * we fall back to a built-in ring so the app never shows an empty path.
 *
 * NOTE: the loop is an *artistic* closed curve, not survey data. See README.
 */
export function buildLoopPath(control: Vec2[]): PathSampler {
  return new PathSampler(control, 20);
}

/**
 * Extract a ring of control points from a GeoJSON FeatureCollection whose
 * first LineString feature is the loop. Coordinates are our abstract
 * "city units" [x, y], not lon/lat. A trailing point equal to the first is
 * dropped so the closed spline has no duplicate seam vertex.
 */
export function controlPointsFromGeoJSON(geo: unknown): Vec2[] {
  const fc = geo as {
    features?: Array<{ geometry?: { type?: string; coordinates?: number[][] } }>;
  };
  const feature = fc.features?.find((f) => f.geometry?.type === 'LineString');
  const coords = feature?.geometry?.coordinates;
  if (!coords || coords.length < 3) {
    throw new Error('loop geojson missing a LineString with >=3 points');
  }
  const pts: Vec2[] = coords.map(([x, y]) => ({ x, y }));
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (Math.hypot(first.x - last.x, first.y - last.y) < 1e-6) pts.pop();
  return pts;
}

/** Built-in fallback loop (rounded rectangle) — used only if data fails. */
export function fallbackLoopControlPoints(): Vec2[] {
  const pts: Vec2[] = [];
  const count = 48;
  const ex = 96;
  const ey = 122;
  const n = 4.2;
  for (let i = 0; i < count; i++) {
    const t = (i / count) * Math.PI * 2;
    const c = Math.cos(t);
    const s = Math.sin(t);
    pts.push({
      x: Math.sign(c) * Math.abs(c) ** (2 / n) * ex,
      y: 6 + Math.sign(s) * Math.abs(s) ** (2 / n) * ey,
    });
  }
  return pts;
}
