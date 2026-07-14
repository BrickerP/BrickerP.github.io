import type { Vec2 } from '../path/geometry';

/** Kinds of features present in our artistic Beijing GeoJSON files. */
export type FeatureKind =
  | 'boundary'
  | 'core'
  | 'ring'
  | 'axis'
  | 'radial'
  | 'street'
  | 'water'
  | 'lake'
  | 'mountain'
  | 'loop';

/** A polyline (open) or polygon ring in our abstract planar units. */
export interface MapPolyline {
  kind: FeatureKind;
  points: Vec2[];
  /** true for closed rings/polygons (draw closed). */
  closed: boolean;
  /** ring number for 'ring' features (2..6). */
  ring?: number;
  /** radial spoke angle in degrees for 'radial' features. */
  deg?: number;
  name?: string;
}

/** Everything the renderers need, pre-parsed once at load time. */
export interface BeijingMap {
  boundary: MapPolyline[];
  roads: MapPolyline[];
  water: MapPolyline[];
  mountains: MapPolyline[];
  /** loop control points (city units), first !== last. */
  loopControl: Vec2[];
  /** axis-aligned bounds of everything, for camera framing. */
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

export type GeoFeature = {
  type: 'Feature';
  properties: Record<string, unknown> & { kind?: FeatureKind };
  geometry: {
    type: 'LineString' | 'Polygon' | 'MultiLineString';
    coordinates: number[][] | number[][][];
  };
};

export type GeoCollection = {
  type: 'FeatureCollection';
  features: GeoFeature[];
};
