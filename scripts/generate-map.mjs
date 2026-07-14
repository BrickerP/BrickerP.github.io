// Deterministic generator for Beijing's artistic map geometry.
//
// IMPORTANT: These are NOT geographic coordinates. They are hand-authored
// abstract "city units" (x = east, y = north, origin near the central axis)
// chosen to *evoke* Beijing's silhouette, ring roads and central axis as a
// generative-art composition. This is an artistic visualization, not survey
// data. See README for details. No commercial map tiles or scraped data are
// used — every point below is authored here.
//
// Run: `node scripts/generate-map.mjs` (also runs automatically in `npm run build`).

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'public', 'data');
mkdirSync(OUT, { recursive: true });

// ---- deterministic PRNG (mulberry32) so the composition never shifts ----
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260714);
const jit = (amp) => (rand() - 0.5) * 2 * amp;

// ---- shape helpers ----------------------------------------------------
const round2 = (n) => Math.round(n * 1000) / 1000;

// Superellipse (rounded rectangle) sampled densely so a plain polyline
// already reads as smooth. cx,cy centre; ex,ey half-extents; n exponent
// (2 = ellipse, higher = squarer); wob = seeded radial wobble amplitude.
function superellipse(cx, cy, ex, ey, n, count, wob = 0) {
  const pts = [];
  for (let i = 0; i < count; i++) {
    const t = (i / count) * Math.PI * 2;
    const c = Math.cos(t);
    const s = Math.sin(t);
    const w = 1 + (wob ? jit(wob) : 0);
    const x = cx + Math.sign(c) * Math.abs(c) ** (2 / n) * ex * w;
    const y = cy + Math.sign(s) * Math.abs(s) ** (2 / n) * ey * w;
    pts.push([round2(x), round2(y)]);
  }
  return pts;
}

function blob(cx, cy, r, count, wob) {
  const pts = [];
  for (let i = 0; i < count; i++) {
    const t = (i / count) * Math.PI * 2;
    const rr = r * (1 + jit(wob));
    pts.push([round2(cx + Math.cos(t) * rr), round2(cy + Math.sin(t) * rr * 0.85)]);
  }
  return pts;
}

// ---- feature assembly -------------------------------------------------
const feat = (kind, coords, type, extra = {}) => ({
  type: 'Feature',
  properties: { kind, ...extra },
  geometry: { type, coordinates: coords },
});
const fc = (features) => ({
  type: 'FeatureCollection',
  properties: {
    crs: 'artistic-planar',
    note: 'Abstract city units (x=east, y=north). Artistic visualization, not geographic survey data.',
  },
  features,
});

// =======================================================================
// COMPOSITION
// Coordinate frame: origin (0,0) sits near the central-axis midpoint.
// +x = east, +y = north. Units are abstract "city units".
// The five ring roads are concentric rounded rectangles (the 2nd ring is
// taller-than-wide, echoing the old city wall); rings grow by ~1.42x.
// =======================================================================

// Ring roads: [ring number, half-width, half-height, corner-exponent, wobble]
const RING_DEFS = [
  [2, 96, 122, 4.2, 0.006],
  [3, 140, 170, 3.6, 0.006],
  [4, 196, 232, 3.2, 0.008],
  [5, 268, 312, 2.9, 0.01],
  [6, 372, 424, 2.6, 0.014],
];

// ---- 2nd-ring vehicle loop (its own file) -----------------------------
// A moderate set of control points; the app smooths them with Catmull-Rom
// and resamples by arc length. Last point ≠ first (the loop is implicitly
// closed) so no duplicate seam vertex.
const loopPts = superellipse(0, 6, 96, 122, 4.2, 56, 0.004);
const loop = fc([
  feat('loop', loopPts, 'LineString', {
    name: 'Second Ring (artistic)',
    closed: true,
  }),
]);

// ---- boundary: irregular municipal silhouette -------------------------
// Beijing's real outline points toward the NW mountains; we evoke that with
// a large gently-wobbled superellipse pushed up and left, then smoothed so it
// reads as a deliberate silhouette rather than random noise.
function smoothClosed(pts, passes) {
  let out = pts;
  for (let k = 0; k < passes; k++) {
    out = out.map((_, i) => {
      const a = out[(i - 1 + out.length) % out.length];
      const b = out[i];
      const c = out[(i + 1) % out.length];
      return [round2((a[0] + 2 * b[0] + c[0]) / 4), round2((a[1] + 2 * b[1] + c[1]) / 4)];
    });
  }
  return out;
}
function beijingBoundary() {
  const base = superellipse(-20, 45, 470, 500, 2.6, 96, 0.012);
  // Lean the silhouette toward the NW mountains and tuck the SE plains in,
  // using bounded additive offsets (not multipliers) so it never runs away.
  const shaped = base.map(([x, y]) => {
    const nwF = clamp01((-x + y) / 900); // 0..1, peaks toward NW
    const seF = clamp01((x - y) / 900); // 0..1, peaks toward SE
    const push = nwF * 120; // outward along the NW diagonal
    const inv = 1 / Math.SQRT2;
    return [
      round2(x - push * inv - seF * 40),
      round2(y + push * inv - seF * 24),
    ];
  });
  return smoothClosed(shaped, 2);
}
function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
const boundary = fc([
  feat('boundary', [beijingBoundary()], 'Polygon', { name: 'Beijing (artistic outline)' }),
  // central built-up core (soft fill under the rings)
  feat('core', [superellipse(0, 10, 210, 250, 2.4, 80, 0.02)], 'Polygon', {
    name: 'Central city (artistic)',
  }),
]);

// ---- rings + axis + radials + street grid -> roads --------------------
const roadFeatures = [];

// concentric rings
for (const [ring, ex, ey, n, wob] of RING_DEFS) {
  const pts = superellipse(0, 6, ex, ey, n, 96, wob);
  pts.push(pts[0]); // rings are drawn closed
  roadFeatures.push(feat('ring', pts, 'LineString', { ring }));
}

// central axis — a gently jittered near-straight line, south to north
function centralAxis() {
  const pts = [];
  const y0 = -210;
  const y1 = 292;
  const steps = 60;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = y0 + (y1 - y0) * t;
    // very small sway so it reads as hand-drawn, still unmistakably vertical
    const x = Math.sin(t * Math.PI * 2) * 3 + jit(1.2);
    pts.push([round2(x), round2(y)]);
  }
  return pts;
}
roadFeatures.push(feat('axis', centralAxis(), 'LineString', { name: 'Central Axis (artistic)' }));

// major radial roads — straight-ish spokes crossing the rings
const RADIALS = [
  25, 68, 112, 158, 205, 250, 293, 338, // degrees, unevenly spaced on purpose
];
for (const deg of RADIALS) {
  const a = (deg / 180) * Math.PI;
  const pts = [];
  const rMax = 470;
  for (let r = 40; r <= rMax; r += 30) {
    const wob = jit(6);
    pts.push([
      round2(Math.cos(a) * r + wob),
      round2(6 + Math.sin(a) * r * 1.08 + jit(6)),
    ]);
  }
  roadFeatures.push(feat('radial', pts, 'LineString', { deg }));
}

// faint inner street grid (texture inside ~3rd ring), clipped to a disc
function insideCore(x, y) {
  return (x * x) / (150 * 150) + ((y - 6) * (y - 6)) / (185 * 185) <= 1;
}
const GRID = 26;
for (let gx = -160; gx <= 160; gx += GRID) {
  const pts = [];
  for (let gy = -190; gy <= 200; gy += 10) {
    if (insideCore(gx, gy)) pts.push([round2(gx + jit(2)), round2(gy + jit(2))]);
    else if (pts.length > 1) {
      roadFeatures.push(feat('street', pts.slice(), 'LineString', {}));
      pts.length = 0;
    }
  }
  if (pts.length > 1) roadFeatures.push(feat('street', pts, 'LineString', {}));
}
for (let gy = -190; gy <= 200; gy += GRID) {
  const pts = [];
  for (let gx = -170; gx <= 170; gx += 10) {
    if (insideCore(gx, gy)) pts.push([round2(gx + jit(2)), round2(gy + jit(2))]);
    else if (pts.length > 1) {
      roadFeatures.push(feat('street', pts.slice(), 'LineString', {}));
      pts.length = 0;
    }
  }
  if (pts.length > 1) roadFeatures.push(feat('street', pts, 'LineString', {}));
}
const roads = fc(roadFeatures);

// ---- water: low-key rivers + a couple of lakes ------------------------
const waterFeatures = [];
// a river sweeping through from NW to SE (evokes canal/rivers, abstract)
function river(seed, y0) {
  const r = mulberry32(seed);
  const pts = [];
  let x = -360;
  let y = y0;
  while (x < 420) {
    x += 16 + r() * 10;
    y += (r() - 0.45) * 26;
    pts.push([round2(x), round2(y)]);
  }
  return pts;
}
waterFeatures.push(feat('water', river(7, 210), 'LineString', { name: 'river-n' }));
waterFeatures.push(feat('water', river(29, -120), 'LineString', { name: 'river-s' }));
// lakes near the centre and NW (Houhai-ish, Kunming-ish — artistic)
waterFeatures.push(feat('lake', [blob(-18, 52, 16, 26, 0.28)], 'Polygon', {}));
waterFeatures.push(feat('lake', [blob(-150, 150, 26, 30, 0.32)], 'Polygon', {}));
const water = fc(waterFeatures);

// ---- mountains: hatch strokes forming a northern range ----------------
// The strokes sit in a broad band across the NORTH of the composition
// (high +y), leaning toward the upper corner, evoking Beijing's northern /
// north-west mountains. Purely artistic texture.
const mtnFeatures = [];
const mrand = mulberry32(4242);
for (let i = 0; i < 96; i++) {
  // northern band: y high, x spread across, denser toward one upper corner
  const cx = -300 + mrand() * 640;
  const bandY = 300 + mrand() * 250; // 300..550 (north)
  // dip the band a little lower on the eastern edge so it feels like a range
  const cy = bandY - Math.max(0, cx) * 0.18 + jit(24);
  if (cy < 210) continue;
  const len = 16 + mrand() * 30;
  const tilt = -0.35 + mrand() * 0.7; // roughly horizontal strokes
  const seg = [
    [round2(cx - Math.cos(tilt) * len), round2(cy - Math.sin(tilt) * len)],
    [round2(cx + Math.cos(tilt) * len), round2(cy + Math.sin(tilt) * len)],
  ];
  mtnFeatures.push(feat('mountain', seg, 'LineString', {}));
}
const mountains = fc(mtnFeatures);

// ---- write ------------------------------------------------------------
const files = {
  'beijing-boundary.geojson': boundary,
  'beijing-roads.geojson': roads,
  'beijing-water.geojson': water,
  'beijing-mountains.geojson': mountains,
  'beijing-loop.geojson': loop,
};
for (const [name, data] of Object.entries(files)) {
  writeFileSync(join(OUT, name), JSON.stringify(data));
  const n = data.features.length;
  console.log(`wrote public/data/${name} (${n} feature${n === 1 ? '' : 's'})`);
}

