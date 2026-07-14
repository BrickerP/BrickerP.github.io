import type { Vec2 } from '../path/geometry';
import type {
  BeijingMap,
  GeoCollection,
  GeoFeature,
  MapPolyline,
  FeatureKind,
} from './mapTypes';
import { controlPointsFromGeoJSON, fallbackLoopControlPoints } from '../path/loopPath';

/**
 * Loads and parses all Beijing GeoJSON files ONCE. Coordinates are our
 * abstract planar "city units", not lon/lat. Everything the renderers use is
 * cached in the returned object — nothing re-parses GeoJSON per frame.
 *
 * All fetches are relative to import.meta.env.BASE_URL so the site works from
 * a GitHub Pages project subpath. No third-party APIs are contacted.
 */
export async function loadBeijingMap(): Promise<BeijingMap> {
  const base = import.meta.env.BASE_URL;
  const url = (f: string) => `${base}data/${f}`.replace(/\/\/+data/, '/data');

  const [boundaryGeo, roadsGeo, waterGeo, mountainsGeo, loopGeo] = await Promise.all([
    fetchJSON(url('beijing-boundary.geojson')),
    fetchJSON(url('beijing-roads.geojson')),
    fetchJSON(url('beijing-water.geojson')),
    fetchJSON(url('beijing-mountains.geojson')),
    fetchJSON(url('beijing-loop.geojson')),
  ]);

  const boundary = toPolylines(boundaryGeo);
  const roads = toPolylines(roadsGeo);
  const water = toPolylines(waterGeo);
  const mountains = toPolylines(mountainsGeo);

  let loopControl: Vec2[];
  try {
    loopControl = controlPointsFromGeoJSON(loopGeo);
  } catch {
    loopControl = fallbackLoopControlPoints();
  }

  const bounds = computeBounds([...boundary, ...roads, ...water, ...mountains]);
  return { boundary, roads, water, mountains, loopControl, bounds };
}

async function fetchJSON(u: string): Promise<GeoCollection> {
  const res = await fetch(u);
  if (!res.ok) throw new Error(`failed to load ${u}: ${res.status}`);
  return (await res.json()) as GeoCollection;
}

function toPolylines(geo: GeoCollection): MapPolyline[] {
  const out: MapPolyline[] = [];
  for (const f of geo.features ?? []) {
    const kind = (f.properties?.kind ?? 'street') as FeatureKind;
    pushFeature(out, f, kind);
  }
  return out;
}

function pushFeature(out: MapPolyline[], f: GeoFeature, kind: FeatureKind): void {
  const { geometry, properties } = f;
  const ring = typeof properties.ring === 'number' ? properties.ring : undefined;
  const deg = typeof properties.deg === 'number' ? properties.deg : undefined;
  const name = typeof properties.name === 'string' ? properties.name : undefined;

  if (geometry.type === 'LineString') {
    out.push({
      kind,
      points: (geometry.coordinates as number[][]).map(([x, y]) => ({ x, y })),
      closed: kind === 'ring' || properties.closed === true,
      ring,
      deg,
      name,
    });
  } else if (geometry.type === 'Polygon') {
    for (const rng of geometry.coordinates as number[][][]) {
      out.push({
        kind,
        points: rng.map(([x, y]) => ({ x, y })),
        closed: true,
        name,
      });
    }
  } else if (geometry.type === 'MultiLineString') {
    for (const line of geometry.coordinates as number[][][]) {
      out.push({
        kind,
        points: line.map(([x, y]) => ({ x, y })),
        closed: properties.closed === true,
        ring,
        deg,
        name,
      });
    }
  }
}

function computeBounds(all: MapPolyline[]): BeijingMap['bounds'] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const pl of all) {
    for (const p of pl.points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }
  if (!isFinite(minX)) return { minX: -600, minY: -600, maxX: 600, maxY: 600 };
  return { minX, minY, maxX, maxY };
}
