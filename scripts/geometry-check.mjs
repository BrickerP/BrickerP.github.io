import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'public', 'data');
const GENERATOR = join(ROOT, 'scripts', 'generate-map.mjs');
const FILES = [
  'beijing-boundary.geojson',
  'beijing-roads.geojson',
  'beijing-water.geojson',
  'beijing-mountains.geojson',
  'beijing-loop.geojson',
];
const EPSILON = 1e-8;

const readOutputs = () =>
  new Map(FILES.map((name) => [name, readFileSync(join(DATA, name))]));
const hash = (buffer) => createHash('sha256').update(buffer).digest('hex');
const generate = () =>
  execFileSync(process.execPath, [GENERATOR], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();

const checkedIn = readOutputs();
const generatorLog = generate();
const first = readOutputs();
generate();
const second = readOutputs();
for (const name of FILES) {
  assert.deepEqual(first.get(name), checkedIn.get(name), `${name} is stale; run npm run gen:map`);
  assert.deepEqual(second.get(name), first.get(name), `${name} is not deterministic`);
}

function pathsOf(feature) {
  const { type, coordinates } = feature.geometry;
  if (type === 'LineString') return [coordinates];
  if (type === 'MultiLineString' || type === 'Polygon') return coordinates;
  assert.fail(`unsupported geometry type: ${String(type)}`);
}

function samePoint(left, right) {
  return Math.abs(left[0] - right[0]) < EPSILON && Math.abs(left[1] - right[1]) < EPSILON;
}

function segmentsOf(feature) {
  const output = [];
  for (const [pathIndex, points] of pathsOf(feature).entries()) {
    const closes =
      feature.geometry.type === 'Polygon' ||
      feature.properties?.closed === true ||
      feature.properties?.kind === 'ring';
    for (let index = 1; index < points.length; index += 1) {
      output.push({ a: points[index - 1], b: points[index], pathIndex, index: index - 1 });
    }
    if (closes && !samePoint(points[0], points.at(-1))) {
      output.push({ a: points.at(-1), b: points[0], pathIndex, index: points.length - 1 });
    }
  }
  return output;
}

function pointKey(point) {
  return `${point[0]},${point[1]}`;
}

function segmentKey({ a, b }) {
  const forward = `${pointKey(a)}>${pointKey(b)}`;
  const reverse = `${pointKey(b)}>${pointKey(a)}`;
  return forward < reverse ? forward : reverse;
}

function orient(a, b, c) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function between(value, left, right) {
  return value >= Math.min(left, right) - EPSILON && value <= Math.max(left, right) + EPSILON;
}

function onSegment(point, a, b) {
  return (
    Math.abs(orient(a, b, point)) < EPSILON &&
    between(point[0], a[0], b[0]) &&
    between(point[1], a[1], b[1])
  );
}

function intersectionKind(left, right) {
  const { a, b } = left;
  const { a: c, b: d } = right;
  if (
    Math.max(a[0], b[0]) < Math.min(c[0], d[0]) - EPSILON ||
    Math.max(c[0], d[0]) < Math.min(a[0], b[0]) - EPSILON ||
    Math.max(a[1], b[1]) < Math.min(c[1], d[1]) - EPSILON ||
    Math.max(c[1], d[1]) < Math.min(a[1], b[1]) - EPSILON
  ) {
    return 'none';
  }

  const o1 = orient(a, b, c);
  const o2 = orient(a, b, d);
  const o3 = orient(c, d, a);
  const o4 = orient(c, d, b);
  if (
    ((o1 > EPSILON && o2 < -EPSILON) || (o1 < -EPSILON && o2 > EPSILON)) &&
    ((o3 > EPSILON && o4 < -EPSILON) || (o3 < -EPSILON && o4 > EPSILON))
  ) {
    return 'cross';
  }

  const touches = [a, b, c, d].filter(
    (point, index) => (index < 2 ? onSegment(point, c, d) : onSegment(point, a, b)),
  );
  if (touches.length === 0) return 'none';
  const unique = new Set(touches.map(pointKey));
  if (
    unique.size === 1 &&
    [...unique].every(
      (key) =>
        (key === pointKey(a) || key === pointKey(b)) &&
        (key === pointKey(c) || key === pointKey(d)),
    )
  ) {
    return 'shared-endpoint';
  }
  return 'touch-or-overlap';
}

function validateFeature(feature, label) {
  assert.equal(feature.type, 'Feature', `${label}: expected Feature`);
  assert.equal(typeof feature.properties?.kind, 'string', `${label}: missing kind`);
  const seenSegments = new Set();
  for (const [pathIndex, points] of pathsOf(feature).entries()) {
    assert.ok(points.length >= 2, `${label} path ${pathIndex}: too few points`);
    for (const [pointIndex, point] of points.entries()) {
      assert.ok(
        Array.isArray(point) && point.length === 2 && point.every(Number.isFinite),
        `${label} path ${pathIndex} point ${pointIndex}: invalid coordinate`,
      );
      if (pointIndex > 0) {
        assert.ok(
          !samePoint(point, points[pointIndex - 1]),
          `${label} path ${pathIndex}: zero-length segment at ${pointIndex - 1}`,
        );
      }
    }
  }
  for (const segment of segmentsOf(feature)) {
    const key = segmentKey(segment);
    assert.ok(!seenSegments.has(key), `${label}: duplicate segment ${key}`);
    seenSegments.add(key);
  }
}

function assertNoSelfIntersections(feature, label) {
  const segments = segmentsOf(feature);
  for (let left = 0; left < segments.length; left += 1) {
    for (let right = left + 1; right < segments.length; right += 1) {
      const a = segments[left];
      const b = segments[right];
      const adjacent =
        a.pathIndex === b.pathIndex &&
        (Math.abs(a.index - b.index) === 1 ||
          (left === 0 && right === segments.length - 1));
      if (adjacent) continue;
      assert.equal(
        intersectionKind(a, b),
        'none',
        `${label}: self-intersection between segments ${left} and ${right}`,
      );
    }
  }
}

const collections = new Map(
  FILES.map((name) => [name, JSON.parse(readFileSync(join(DATA, name), 'utf8'))]),
);
for (const [name, collection] of collections) {
  assert.equal(collection.type, 'FeatureCollection', `${name}: expected FeatureCollection`);
  for (const [index, feature] of collection.features.entries()) {
    validateFeature(feature, `${name} feature ${index}`);
  }
}

const roads = collections.get('beijing-roads.geojson');
const loopCollection = collections.get('beijing-loop.geojson');
const roadPoints = roads.features.reduce(
  (sum, feature) => sum + pathsOf(feature).flat().length,
  0,
);
assert.ok(roads.features.length <= 28, `road feature budget exceeded: ${roads.features.length}`);
assert.ok(roadPoints <= 500, `road point budget exceeded: ${roadPoints}`);
assert.equal(roads.features.filter((feature) => feature.properties.kind === 'radial').length, 4);
assert.equal(roads.features.filter((feature) => feature.properties.kind === 'axis').length, 3);
assert.equal(roads.features.filter((feature) => feature.properties.plate === true).length, 12);
assert.equal(loopCollection.features.length, 1, 'expected one vehicle loop');
const loopFeature = loopCollection.features[0];
assert.equal(loopFeature.geometry.type, 'LineString', 'canonical loop must be a LineString');
const canonicalLoopCoordinates = pathsOf(loopFeature)[0];
const ring2Features = roads.features.filter(
  (feature) => feature.properties.kind === 'ring' && feature.properties.ring === 2,
);
assert.equal(ring2Features.length, 1, 'expected exactly one ring 2 road feature');
const ring2Feature = ring2Features[0];
assert.equal(ring2Feature.geometry.type, 'LineString', 'ring 2 must be a LineString');
const ring2Coordinates = pathsOf(ring2Feature)[0];
assert.deepEqual(
  ring2Coordinates.at(-1),
  ring2Coordinates[0],
  'ring 2 must be explicitly closed by a duplicated endpoint',
);
assert.deepEqual(
  ring2Coordinates.slice(0, -1),
  canonicalLoopCoordinates,
  'ring 2 coordinates must exactly match the canonical vehicle loop',
);
const loopMatchesRing2 = true;
assertNoSelfIntersections(loopFeature, 'vehicle loop');
for (const [index, ring] of roads.features
  .filter((feature) => feature.properties.kind === 'ring')
  .entries()) {
  assertNoSelfIntersections(ring, `ring ${index}`);
}

const indexedRoads = roads.features.map((feature, index) => ({
  feature,
  index,
  kind: feature.properties.kind,
  segments: segmentsOf(feature),
}));
let totalIntersections = 0;
let streetIntersections = 0;
const intersectionRecords = [];
for (let left = 0; left < indexedRoads.length; left += 1) {
  for (let right = left + 1; right < indexedRoads.length; right += 1) {
    const a = indexedRoads[left];
    const b = indexedRoads[right];
    for (const leftSegment of a.segments) {
      for (const rightSegment of b.segments) {
        const kind = intersectionKind(leftSegment, rightSegment);
        if (kind === 'none' || kind === 'shared-endpoint') continue;
        totalIntersections += 1;
        intersectionRecords.push({ left: a.index, right: b.index, kinds: [a.kind, b.kind], kind });
        if (a.kind === 'street' && b.kind === 'street') streetIntersections += 1;
      }
    }
  }
}
assert.equal(
  streetIntersections,
  0,
  `street×street intersections: ${JSON.stringify(intersectionRecords.filter((record) => record.kinds.every((kind) => kind === 'street')))}`,
);
assert.ok(totalIntersections <= 8, `unintentional road intersections: ${totalIntersections}`);

console.log('=== GEOMETRY CHECK ===');
console.log(
  JSON.stringify(
    {
      deterministic: true,
      generatorLog,
      hashes: Object.fromEntries(FILES.map((name) => [name, hash(first.get(name))])),
      roadFeatures: roads.features.length,
      roadPoints,
      totalIntersections,
      streetIntersections,
      loopPoints: canonicalLoopCoordinates.length,
      loopMatchesRing2,
    },
    null,
    2,
  ),
);
console.log('loopMatchesRing2:true');
console.log('GEOMETRY OK');
