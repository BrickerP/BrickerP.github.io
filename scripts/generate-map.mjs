// Deterministic generator for the sparse Beijing Loop composition.
//
// These coordinates are hand-authored abstract "city units". They are not
// geographic data and make no survey claim. The entire visual vocabulary is
// intentionally small: one second-ring loop, one broken central axis, twelve
// courtyard plates, four gate marks, eight outer arcs, one lake and six
// northern ridges.
//
// Run: node scripts/generate-map.mjs

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'public', 'data');
mkdirSync(OUT, { recursive: true });

const round = (value) => Math.round(value * 1000) / 1000;

const feature = (kind, coordinates, type, properties = {}) => ({
  type: 'Feature',
  properties: { kind, ...properties },
  geometry: { type, coordinates },
});

const collection = (features) => ({
  type: 'FeatureCollection',
  properties: {
    crs: 'artistic-planar',
    note: 'Hand-authored abstract city units; artistic visualization, not geographic survey data.',
  },
  features,
});

function closed(points) {
  const ring = points.map(([x, y]) => [round(x), round(y)]);
  const [x0, y0] = ring[0];
  const [xn, yn] = ring[ring.length - 1];
  if (x0 !== xn || y0 !== yn) ring.push([x0, y0]);
  return ring;
}

function superellipse(cx, cy, rx, ry, exponent, count) {
  const points = [];
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    points.push([
      round(cx + Math.sign(cos) * Math.abs(cos) ** (2 / exponent) * rx),
      round(cy + Math.sign(sin) * Math.abs(sin) ** (2 / exponent) * ry),
    ]);
  }
  return points;
}

function superellipseArc(cx, cy, rx, ry, exponent, start, end, count) {
  const points = [];
  for (let index = 0; index < count; index += 1) {
    const t = index / (count - 1);
    const angle = start + (end - start) * t;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    points.push([
      round(cx + Math.sign(cos) * Math.abs(cos) ** (2 / exponent) * rx),
      round(cy + Math.sign(sin) * Math.abs(sin) ** (2 / exponent) * ry),
    ]);
  }
  return points;
}

function courtyard(cx, cy, width, height, cut = 8) {
  const x0 = cx - width / 2;
  const x1 = cx + width / 2;
  const y0 = cy - height / 2;
  const y1 = cy + height / 2;
  return closed([
    [x0 + cut, y0],
    [x1 - cut, y0],
    [x1, y0 + cut],
    [x1, y1 - cut],
    [x1 - cut, y1],
    [x0 + cut, y1],
    [x0, y1 - cut],
    [x0, y0 + cut],
  ]);
}

const loopPoints = superellipse(0, 6, 96, 122, 4.2, 48);
const loop = collection([
  feature('loop', loopPoints, 'LineString', {
    name: 'Second Ring (artistic)',
    ring: 2,
    closed: true,
  }),
]);

const boundary = collection([
  feature(
    'boundary',
    [
      closed([
        [-332, -370],
        [-178, -404],
        [32, -398],
        [218, -372],
        [346, -276],
        [382, -94],
        [366, 116],
        [318, 288],
        [194, 384],
        [12, 416],
        [-158, 398],
        [-292, 330],
        [-382, 192],
        [-404, 8],
        [-386, -190],
      ]),
    ],
    'Polygon',
    { name: 'Beijing paper-cut outline' },
  ),
  feature('core', [closed(superellipse(0, 8, 274, 310, 2.8, 48))], 'Polygon', {
    name: 'Central city plate',
  }),
]);

const roadFeatures = [
  feature('ring', [...loopPoints, loopPoints[0]], 'LineString', {
    name: 'Second Ring structural copy',
    ring: 2,
  }),
];

const courtyardSpecs = [
  [-218, -240, 76, 50],
  [-236, -170, 92, 48],
  [-205, -72, 68, 54],
  [-234, 42, 88, 52],
  [-204, 154, 70, 50],
  [-226, 264, 84, 48],
  [212, -242, 82, 48],
  [230, -168, 70, 52],
  [202, -66, 88, 50],
  [232, 44, 72, 54],
  [204, 154, 86, 48],
  [226, 266, 74, 50],
];
for (let index = 0; index < courtyardSpecs.length; index += 1) {
  const [cx, cy, width, height] = courtyardSpecs[index];
  roadFeatures.push(
    feature('street', [courtyard(cx, cy, width, height)], 'Polygon', {
      name: `Courtyard plate ${index + 1}`,
      plate: true,
    }),
  );
}

for (const [name, points] of [
  ['East gate', [[104, 6], [138, 6]]],
  ['West gate', [[-104, 6], [-138, 6]]],
  ['North gate', [[0, 136], [0, 158]]],
  ['South gate', [[0, -124], [0, -146]]],
]) {
  roadFeatures.push(feature('radial', points, 'LineString', { name, gate: true }));
}

const arcHalfWidth = (12 * Math.PI) / 180;
for (let index = 0; index < 8; index += 1) {
  const centre = (index * Math.PI) / 4 + Math.PI / 8;
  roadFeatures.push(
    feature(
      'street',
      superellipseArc(
        0,
        8,
        308,
        344,
        3.0,
        centre - arcHalfWidth,
        centre + arcHalfWidth,
        11,
      ),
      'LineString',
      { name: `Broken outer arc ${index + 1}`, contextArc: true },
    ),
  );
}

for (const [name, points] of [
  ['South axis', [[0, -106], [0, -40]]],
  ['Inner axis', [[0, -24], [0, 26]]],
  ['North axis', [[0, 42], [0, 108]]],
]) {
  roadFeatures.push(feature('axis', points, 'LineString', { name }));
}

const roads = collection(roadFeatures);

const water = collection([
  feature(
    'lake',
    [closed(superellipse(-48, 70, 18, 31, 2.4, 24))],
    'Polygon',
    { name: 'Northern canal lake' },
  ),
]);

const ridgeLines = [
  [[-350, 264], [-326, 286], [-300, 274], [-276, 302], [-248, 292]],
  [[-326, 304], [-300, 326], [-274, 314], [-248, 340], [-218, 330]],
  [[-288, 346], [-260, 368], [-232, 354], [-204, 378], [-174, 366]],
  [[-216, 296], [-190, 316], [-164, 306], [-138, 330], [-110, 320]],
  [[-156, 350], [-130, 368], [-106, 358], [-82, 376], [-56, 368]],
  [[-92, 300], [-68, 318], [-44, 310], [-20, 326], [4, 318]],
];
const mountains = collection(
  ridgeLines.map((points, index) =>
    feature('mountain', points, 'LineString', { name: `Northern ridge ${index + 1}` }),
  ),
);

function pointCount(value) {
  if (!Array.isArray(value)) return 0;
  if (value.length === 2 && typeof value[0] === 'number' && typeof value[1] === 'number') {
    return 1;
  }
  return value.reduce((sum, item) => sum + pointCount(item), 0);
}

const roadPointCount = roads.features.reduce(
  (sum, item) => sum + pointCount(item.geometry.coordinates),
  0,
);
const kindCount = (kind) => roads.features.filter((item) => item.properties.kind === kind).length;
if (roads.features.length !== 28 || roadPointCount > 500) {
  throw new Error(`Sparse-road budget changed: ${roads.features.length} features / ${roadPointCount} points`);
}
if (
  kindCount('street') !== 20 ||
  kindCount('radial') !== 4 ||
  kindCount('ring') !== 1 ||
  kindCount('axis') !== 3 ||
  water.features.length !== 1 ||
  mountains.features.length !== 6
) {
  throw new Error('Sparse composition feature contract changed unexpectedly');
}

for (const [name, data] of [
  ['beijing-boundary.geojson', boundary],
  ['beijing-roads.geojson', roads],
  ['beijing-water.geojson', water],
  ['beijing-mountains.geojson', mountains],
  ['beijing-loop.geojson', loop],
]) {
  writeFileSync(join(OUT, name), `${JSON.stringify(data, null, 2)}\n`);
}

console.log(
  `Generated sparse Beijing composition: ${roads.features.length} road features / ${roadPointCount} road points.`,
);
