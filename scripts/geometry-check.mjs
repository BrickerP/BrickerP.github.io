import assert from 'node:assert/strict';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { Vector3 } from 'three';
import ts from 'typescript';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DRIVE_PATH_SOURCE = join(ROOT, 'src', 'rendering', 'drivePath.ts');
const TEMP_MODULE = join(ROOT, 'scripts', `.geometry-check-drive-path-${process.pid}.mjs`);
const EPSILON = 1e-8;
const G003_GEOMETRY_CASE = process.env.G003_GEOMETRY_CASE;
const runsGeometryCase = (name) => !G003_GEOMETRY_CASE || G003_GEOMETRY_CASE === name;

function sourceFiles(directory) {
  assert.ok(existsSync(directory), `required source directory is missing: ${directory}`);
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return extname(entry.name) === '.ts' ? [path] : [];
  });
}

function transpileDrivePath() {
  const source = readFileSync(DRIVE_PATH_SOURCE, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      isolatedModules: true,
    },
    fileName: DRIVE_PATH_SOURCE,
    reportDiagnostics: true,
  });
  const errors = (output.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  assert.deepEqual(errors, [], `drivePath.ts transpile errors: ${JSON.stringify(errors)}`);
  writeFileSync(TEMP_MODULE, output.outputText);
}

function transpileCameraModules(directory) {
  const modules = ['theme', 'drivePath', 'FirstPersonCameraRig'];
  for (const name of modules) {
    const sourcePath = join(ROOT, 'src', 'rendering', `${name}.ts`);
    const output = ts.transpileModule(readFileSync(sourcePath, 'utf8'), {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        isolatedModules: true,
      },
      fileName: sourcePath,
      reportDiagnostics: true,
    });
    const errors = (output.diagnostics ?? []).filter(
      (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
    );
    assert.deepEqual(errors, [], `${name}.ts transpile errors: ${JSON.stringify(errors)}`);
    const linkedOutput = output.outputText.replace(
      /from '(\.\/(?:theme|drivePath))'/g,
      "from '$1.mjs'",
    );
    writeFileSync(join(directory, `${name}.mjs`), linkedOutput);
  }
}

function vectorDelta(left, right) {
  return Math.hypot(left.x - right.x, left.y - right.y, left.z - right.z);
}

function finiteVector(vector, label) {
  assert.ok(
    vector && [vector.x, vector.y, vector.z].every(Number.isFinite),
    `${label}: expected a finite Vector3`,
  );
}

function median(values) {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.floor(ordered.length / 2)];
}

function orient(a, b, c) {
  return (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
}

function properIntersection(a, b, c, d) {
  const abC = orient(a, b, c);
  const abD = orient(a, b, d);
  const cdA = orient(c, d, a);
  const cdB = orient(c, d, b);
  return (
    ((abC > EPSILON && abD < -EPSILON) || (abC < -EPSILON && abD > EPSILON)) &&
    ((cdA > EPSILON && cdB < -EPSILON) || (cdA < -EPSILON && cdB > EPSILON))
  );
}

function assertNoPathCrossings(samples) {
  const segmentCount = samples.length - 1;
  for (let left = 0; left < segmentCount; left += 1) {
    for (let right = left + 1; right < segmentCount; right += 1) {
      const adjacent =
        Math.abs(left - right) <= 1 || (left === 0 && right === segmentCount - 1);
      if (adjacent) continue;
      assert.equal(
        properIntersection(
          samples[left],
          samples[left + 1],
          samples[right],
          samples[right + 1],
        ),
        false,
        `drive path crosses itself at sampled segments ${left} and ${right}`,
      );
    }
  }
}

function geometrySnapshot(geometry) {
  const position = geometry.getAttribute('position');
  const uv = geometry.getAttribute('uv');
  const index = geometry.getIndex();
  assert.ok(position && uv && index, 'road ribbon must expose position, uv, and index buffers');
  return {
    position: Array.from(position.array),
    uv: Array.from(uv.array),
    index: Array.from(index.array),
  };
}

transpileDrivePath();
let drive;
try {
  drive = await import(`${pathToFileURL(TEMP_MODULE).href}?run=${Date.now()}`);
} finally {
  unlinkSync(TEMP_MODULE);
}

const cameraTempDirectory = mkdtempSync(join(ROOT, 'scripts', '.geometry-camera-check-'));
let cameraModule;
try {
  transpileCameraModules(cameraTempDirectory);
  cameraModule = await import(
    `${pathToFileURL(join(cameraTempDirectory, 'FirstPersonCameraRig.mjs')).href}?run=${Date.now()}`
  );
} finally {
  rmSync(cameraTempDirectory, { recursive: true, force: true });
}

assert.ok(drive.DRIVE_PATH, 'drivePath.ts must export DRIVE_PATH');
assert.equal(drive.DRIVE_PATH.closed, true, 'first-person drive path must be closed');
assert.equal(typeof drive.samplePathFrame, 'function', 'missing samplePathFrame export');
assert.equal(typeof drive.createPathRibbon, 'function', 'missing createPathRibbon export');
assert.equal(typeof drive.wrapProgress, 'function', 'missing wrapProgress export');
assert.equal(drive.wrapProgress(0), 0, 'zero progress');
assert.equal(drive.wrapProgress(1), 0, 'unit progress wraps to zero');
assert.equal(drive.wrapProgress(-0.25), 0.75, 'negative progress wraps forward');

const sampleCount = 512;
const samples = [];
const tangents = [];
for (let index = 0; index <= sampleCount; index += 1) {
  const progress = index / sampleCount;
  const frame = drive.samplePathFrame(progress);
  finiteVector(frame.point, `path sample ${index} point`);
  finiteVector(frame.tangent, `path sample ${index} tangent`);
  finiteVector(frame.normal, `path sample ${index} normal`);
  assert.ok(Math.abs(frame.point.y) < EPSILON, `path sample ${index}: path must stay horizontal`);
  assert.ok(
    Math.abs(frame.tangent.length() - 1) < 1e-6,
    `path sample ${index}: tangent is not normalized`,
  );
  assert.ok(
    Math.abs(frame.normal.length() - 1) < 1e-6,
    `path sample ${index}: normal is not normalized`,
  );
  assert.ok(
    Math.abs(frame.tangent.dot(frame.normal)) < 1e-6,
    `path sample ${index}: path frame is not orthogonal`,
  );
  samples.push(frame.point.clone());
  tangents.push(frame.tangent.clone());
}

assert.ok(vectorDelta(samples[0], samples.at(-1)) < EPSILON, 'drive path endpoint mismatch');
assert.ok(vectorDelta(tangents[0], tangents.at(-1)) < EPSILON, 'drive tangent endpoint mismatch');

const segmentLengths = samples.slice(1).map((point, index) => point.distanceTo(samples[index]));
assert.ok(segmentLengths.every((length) => Number.isFinite(length) && length > EPSILON));
const pathLength = segmentLengths.reduce((sum, length) => sum + length, 0);
assert.ok(pathLength > 500 && pathLength < 5000, `implausible drive path length: ${pathLength}`);
assert.ok(
  Math.max(...segmentLengths) / median(segmentLengths) < 1.25,
  'arc-length sampling has an abrupt speed step',
);
assertNoPathCrossings(samples);

assert.equal(
  typeof cameraModule.FirstPersonCameraRig,
  'function',
  'missing FirstPersonCameraRig export',
);

function cameraSnapshot(aspect, phase) {
  const rig = new cameraModule.FirstPersonCameraRig(aspect);
  rig.update(phase, true);
  const direction = rig.camera.getWorldDirection(new Vector3());
  return {
    fov: rig.camera.fov,
    position: rig.camera.position.clone(),
    direction,
  };
}

const justPortrait = cameraSnapshot(0.999, 0.018);
const justLandscape = cameraSnapshot(1.001, 0.018);
if (runsGeometryCase('aspect-continuity')) {
  assert.ok(
    Math.abs(justPortrait.fov - justLandscape.fov) < 0.1,
    `camera FOV jumps around square aspect: ${justPortrait.fov} -> ${justLandscape.fov}`,
  );
  assert.ok(
    vectorDelta(justPortrait.position, justLandscape.position) < 0.05,
    `camera position jumps around square aspect: delta=${vectorDelta(justPortrait.position, justLandscape.position)}`,
  );
  assert.ok(
    vectorDelta(justPortrait.direction, justLandscape.direction) < 0.01,
    `camera heading jumps around square aspect: delta=${vectorDelta(justPortrait.direction, justLandscape.direction)}`,
  );
}

const resizedRig = new cameraModule.FirstPersonCameraRig(0.999);
resizedRig.update(0.018, true);
const beforeResize = {
  fov: resizedRig.camera.fov,
  position: resizedRig.camera.position.clone(),
  direction: resizedRig.camera.getWorldDirection(new Vector3()),
};
resizedRig.resize(1.001);
resizedRig.update(0.018, true);
if (runsGeometryCase('dynamic-resize')) {
  assert.ok(
    Math.abs(resizedRig.camera.fov - beforeResize.fov) < 0.1,
    `dynamic resize jumps camera FOV: ${beforeResize.fov} -> ${resizedRig.camera.fov}`,
  );
  assert.ok(
    vectorDelta(resizedRig.camera.position, beforeResize.position) < 0.05,
    `dynamic resize jumps camera position: delta=${vectorDelta(resizedRig.camera.position, beforeResize.position)}`,
  );
  assert.ok(
    vectorDelta(
      resizedRig.camera.getWorldDirection(new Vector3()),
      beforeResize.direction,
    ) < 0.01,
    'dynamic resize jumps camera heading around square aspect',
  );
}

if (runsGeometryCase('central-axis-clearance')) {
  for (const aspect of [0.75, 0.999, 1.001]) {
    for (const phase of [0.016, 0.018, 0.02, 0.056, 0.058, 0.06]) {
      const snapshot = cameraSnapshot(aspect, phase);
      const frame = drive.samplePathFrame(phase);
      const centre = frame.point.clone().multiplyScalar(cameraModule.DRIVE_PATH_SCALE);
      const lateralOffset = snapshot.position.clone().sub(centre).dot(frame.normal);
      assert.ok(
        Math.abs(lateralOffset) < 1.1,
        `aspect ${aspect} camera leaves the clear central-axis arch corridor at phase ${phase}: lateral=${lateralOffset}`,
      );
    }
  }
}

const repeatedSamples = [];
for (let index = 0; index <= sampleCount; index += 1) {
  const frame = drive.samplePathFrame(index / sampleCount);
  repeatedSamples.push([frame.point.x, frame.point.y, frame.point.z]);
}
assert.deepEqual(
  repeatedSamples,
  samples.map((point) => [point.x, point.y, point.z]),
  'drive path sampling is not deterministic',
);

const ribbonOptions = { centerScale: 0.19, segments: 96 };
const ribbonA = drive.createPathRibbon(-9, 9, 0, ribbonOptions);
const ribbonB = drive.createPathRibbon(-9, 9, 0, ribbonOptions);
const ribbonSnapshot = geometrySnapshot(ribbonA);
assert.deepEqual(geometrySnapshot(ribbonB), ribbonSnapshot, 'road ribbon is not deterministic');
assert.ok(ribbonSnapshot.position.every(Number.isFinite), 'road ribbon contains non-finite positions');
assert.ok(ribbonSnapshot.uv.every(Number.isFinite), 'road ribbon contains non-finite UVs');
assert.ok(ribbonSnapshot.index.every(Number.isInteger), 'road ribbon contains invalid indices');
assert.equal(ribbonSnapshot.position.length, (96 + 1) * 2 * 3, 'road ribbon vertex budget');
assert.equal(ribbonSnapshot.index.length, 96 * 6, 'road ribbon index budget');
ribbonA.dispose();
ribbonB.dispose();

const runtimeSources = [
  join(ROOT, 'src', 'main.ts'),
  ...sourceFiles(join(ROOT, 'src', 'app')),
  ...sourceFiles(join(ROOT, 'src', 'rendering')),
];
const combinedSource = runtimeSources.map((path) => readFileSync(path, 'utf8')).join('\n');
assert.doesNotMatch(combinedSource, /\bMath\.random\s*\(/, 'runtime scene uses unseeded Math.random');
assert.doesNotMatch(
  combinedSource,
  /\bcrypto\.getRandomValues\s*\(/,
  'runtime scene uses non-deterministic crypto randomness',
);
assert.match(combinedSource, /central[\s_-]*axis/i, 'scene config is missing the central-axis passage');
assert.match(combinedSource, /qianmen|dashilar/i, 'scene config is missing the Qianmen passage');
assert.match(combinedSource, /hutong/i, 'scene config is missing the hutong passage');
assert.match(combinedSource, /nanluo|wudaoying/i, 'scene config is missing the Nanluo/Wudaoying passage');
assert.match(combinedSource, /bell|drum/i, 'scene config is missing the Bell & Drum Tower passage');
assert.match(combinedSource, /yonghe/i, 'scene config is missing the Yonghegong passage');
assert.match(combinedSource, /water(front)?|shichahai/i, 'scene config is missing the waterfront passage');
assert.match(combinedSource, /moat|corner\s*tower/i, 'scene config is missing the palace-moat passage');
assert.match(combinedSource, /temple\s*of\s*heaven|祈年殿|qinian/i, 'scene config is missing the Temple of Heaven passage');
assert.match(combinedSource, /olympic|bird'?s?\s*nest|water\s*cube|鸟巢|水立方/i, 'scene config is missing the Olympic passage');
assert.match(combinedSource, /ring\s*road|arrow\s*tower|deshengmen|cbd|guomao/i, 'scene config is missing the ring-road/CBD passage');
assert.match(combinedSource, /overpass|flyover/i, 'scene config is missing the overpass passage');
assert.match(
  combinedSource,
  /(?:48_?000|LOOP_SECONDS\s*=\s*48|duration\s*:\s*48)/,
  'scene config is missing the canonical 48-second duration',
);

console.log('=== FIRST-PERSON GEOMETRY CHECK ===');
console.log(
  JSON.stringify(
    {
      deterministic: true,
      closed: drive.DRIVE_PATH.closed,
      pathSamples: samples.length,
      pathLength,
      medianSegmentLength: median(segmentLengths),
      maxSegmentLength: Math.max(...segmentLengths),
      endpointDelta: vectorDelta(samples[0], samples.at(-1)),
      tangentEndpointDelta: vectorDelta(tangents[0], tangents.at(-1)),
      ribbonVertices: ribbonSnapshot.position.length / 3,
      ribbonTriangles: ribbonSnapshot.index.length / 3,
      passages: [
        'central-axis',
        'palace-moat',
        'shichahai',
        'deshengmen',
        'olympic',
        'bell-drum',
        'nanluo-wudaoying',
        'yonghegong',
        'cbd-finance',
        'temple-of-heaven',
        'qianmen-hutong',
        'overpass',
      ],
      loopSeconds: 48,
    },
    null,
    2,
  ),
);
console.log('FIRST-PERSON GEOMETRY OK');
