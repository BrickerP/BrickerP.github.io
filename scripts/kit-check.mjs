import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { Box3, Vector3 } from 'three';
import ts from 'typescript';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_ROOT = join(ROOT, 'src', 'rendering');
const TEMP = mkdtempSync(join(ROOT, 'scripts', '.kit-check-'));

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return extname(entry.name) === '.ts' ? [path] : [];
  });
}

function rewriteSpecifiers(text, sourcePath) {
  return text.replace(/from '(\.[^']+)'/g, (_match, spec) => {
    const abs = resolve(dirname(sourcePath), spec);
    if (existsSync(`${abs}.ts`)) return `from '${spec}.mjs'`;
    if (existsSync(join(abs, 'index.ts'))) return `from '${spec}/index.mjs'`;
    return `from '${spec}'`;
  });
}

function transpileTree() {
  for (const sourcePath of sourceFiles(SOURCE_ROOT)) {
    const output = ts.transpileModule(readFileSync(sourcePath, 'utf8'), {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        isolatedModules: true,
      },
      fileName: sourcePath,
    });
    const rel = relative(SOURCE_ROOT, sourcePath).replace(/\.ts$/, '.mjs');
    const destination = join(TEMP, rel);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, rewriteSpecifiers(output.outputText, sourcePath));
  }
}

function boundsOf(object) {
  const box = new Box3().setFromObject(object);
  const size = new Vector3();
  const center = new Vector3();
  box.getSize(size);
  box.getCenter(center);
  return { box, size, center, height: box.max.y };
}

function assertHalf(label, object, half, height) {
  const { box, height: top } = boundsOf(object);
  assert.ok(box.max.x <= half + 0.05 && -box.min.x <= half + 0.05, `${label} half-width ${Math.max(box.max.x, -box.min.x)} exceeds ${half}`);
  assert.ok(top <= height + 0.05, `${label} height ${top} exceeds ${height}`);
  assert.ok([box.min, box.max].every((corner) => [corner.x, corner.y, corner.z].every(Number.isFinite)), `${label} bounds are not finite`);
}

transpileTree();

try {
  const buildings = await import(pathToFileURL(join(TEMP, 'buildings', 'index.mjs')).href);
  const kit = await import(pathToFileURL(join(TEMP, 'kit', 'index.mjs')).href);
  const mats = new Proxy({}, { get: () => ({}) });
  const bracketA = kit.createBracketGeometry();
  const bracketB = kit.createBracketGeometry();
  assert.deepEqual(
    Array.from(bracketA.getAttribute('position').array),
    Array.from(bracketB.getAttribute('position').array),
    'bracket geometry is not deterministic',
  );

  const gate = buildings.buildGateTower(mats, bracketA, {
    openingHalf: 7.9,
    pierWidth: 4.4,
    pierDepth: 5.2,
    pierHeight: 8.4,
    bays: 5,
    eaves: 2,
  });
  const gateBox = new Box3().setFromObject(gate);
  assert.ok(gateBox.min.x < -7.9 && gateBox.max.x > 7.9, 'gate piers do not flank the opening');
  assert.ok(gateBox.max.y > 8, 'gate tower is missing its upper hall');

  assertHalf('white dagoba', buildings.buildWhiteDagoba(mats), 4.8, 11.9);
  assertHalf('temple of heaven', buildings.buildTempleOfHeaven(mats, bracketA), 7.2, 13.2);
  assertHalf('yonghegong', buildings.buildYongheCourtyard(mats, bracketA), 7.4, 7.8);
  assertHalf('glass tower', buildings.buildGlassTower(mats), 3.21, 20);
  assertHalf('tea house', buildings.buildTeaHouse(mats), 3.1, 8);
  assertHalf('street gate', buildings.buildStreetGate(mats), 2.75, 6);
  assertHalf('drum pavilion', buildings.buildPavilion(mats, bracketA, true), 5.11, 12);
  assertHalf('bell pavilion', buildings.buildPavilion(mats, bracketA, false), 3.81, 12);
  assertHalf('arrow tower', buildings.buildArrowTower(mats, bracketA), 5.75, 14);
  assertHalf('corner tower', buildings.buildCornerTower(mats, bracketA), 4.2, 14);

  const bayA = buildings.createShopBay(false);
  const bayB = buildings.createShopBay(false);
  assert.equal(bayA.timber.getAttribute('position').count, bayB.timber.getAttribute('position').count, 'shop bay is not stable');
  for (const kind of ['door', 'window', 'screen']) {
    const bay = buildings.createShopBay(kind);
    assert.ok(bay.timber.getAttribute('position').count > 20, `${kind} bay is empty`);
    assert.ok(bay.roof.getAttribute('position').count > bay.timber.getAttribute('position').count * 0.05, `${kind} bay is missing its roof`);
  }

  const xieshan = kit.createRoof({ width: 6, depth: 4, rise: 1.2, kind: 'xieshan', wingLift: 0.16 });
  const hip = kit.createRoof({ width: 6, depth: 4, rise: 1.2, kind: 'hip', wingLift: 0.16 });
  assert.ok(xieshan.getAttribute('position').count > hip.getAttribute('position').count, 'xieshan roof is missing its gable boards');
  assert.ok(Number.isFinite(xieshan.getAttribute('position').getX(0)), 'xieshan roof is not finite');

  const palace = buildings.buildPalaceWallGate(mats, bracketA);
  const palaceBox = new Box3().setFromObject(palace);
  const palaceDepth = Math.max(palaceBox.max.z, -palaceBox.min.z);
  assert.ok(palaceDepth <= 5.43, `tiananmen depth ${palaceDepth} exceeds the set-back half-width`);
  assert.ok(palaceBox.max.y > 6, 'tiananmen tower is missing its hall');

  const buttress = kit.createButtress({ height: 4.2, base: 2.5, top: 2.15 });
  const reachLimit = 2.5 / 2 + kit.BUTTRESS.reach + 0.2;
  for (const [label, geometry] of Object.entries(buttress)) {
    const box = new Box3().setFromBufferAttribute(geometry.getAttribute('position'));
    assert.ok([box.min, box.max].every((corner) => [corner.x, corner.y, corner.z].every(Number.isFinite)), `buttress ${label} is not finite`);
    assert.ok(box.max.x <= reachLimit, `buttress ${label} reaches ${box.max.x}, past ${reachLimit}`);
    assert.ok(box.min.x >= -0.6, `buttress ${label} backs out of the wall at ${box.min.x}`);
    assert.ok(box.max.y > 4.2, `buttress ${label} stops below the wall top`);
  }

  // A tunnel cut as a hole that touches the outline leaves an upward face on the ground across the road.
  for (const [label, geometry] of [
    ['platform', kit.createGatePlatform(16.8, 6.35, 4.4, 2.2, 2.5, 2.2)],
    ['surround', kit.createGateSurround(2.2, 2.5, 2.2)],
  ]) {
    const position = geometry.getAttribute('position');
    const index = geometry.getIndex();
    const edge1 = new Vector3();
    const edge2 = new Vector3();
    const corners = [new Vector3(), new Vector3(), new Vector3()];
    for (let cursor = 0; cursor < index.count; cursor += 3) {
      corners.forEach((corner, slot) => corner.fromBufferAttribute(position, index.getX(cursor + slot)));
      edge1.subVectors(corners[1], corners[0]);
      edge2.subVectors(corners[2], corners[0]);
      const normal = edge1.cross(edge2).normalize();
      const grounded = corners.every((corner) => corner.y < 0.01);
      assert.ok(!(grounded && normal.y > 0.5), `gate ${label} has a face on the ground facing up`);
    }
  }
  console.log('kit check ok');
} finally {
  rmSync(TEMP, { recursive: true, force: true });
}
