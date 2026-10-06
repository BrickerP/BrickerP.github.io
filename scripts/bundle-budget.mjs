import assert from 'node:assert/strict';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const OUTPUT = join(
  ROOT,
  '.omx',
  'handoff',
  'animation-deep-refinement',
  'bundle-budget.json',
);
const BUDGET = {
  javascript: {
    originMainGzipBaselineBytes: 153_080,
    maximumGrowthRatio: 0.05,
    absoluteGzipMaximumBytes: 170_000,
    rawMaximumBytes: 650_000,
  },
  css: { gzipMaximumBytes: 4_096 },
};

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map(async (entry) => {
        const path = join(directory, entry.name);
        return entry.isDirectory() ? filesUnder(path) : [path];
      }),
    )
  ).flat();
}

async function describe(path) {
  const contents = await readFile(path);
  return {
    path: relative(ROOT, path),
    rawBytes: (await stat(path)).size,
    gzipBytes: gzipSync(contents, { level: 9 }).byteLength,
  };
}

let report;
try {
  const paths = await filesUnder(DIST);
  const javascript = await Promise.all(paths.filter((path) => extname(path) === '.js').map(describe));
  const css = await Promise.all(paths.filter((path) => extname(path) === '.css').map(describe));
  assert.ok(javascript.length > 0, 'no JavaScript bundle found under dist');
  assert.ok(css.length > 0, 'no CSS bundle found under dist');
  const primaryJavascript = [...javascript].sort((left, right) => right.rawBytes - left.rawBytes)[0];
  const primaryCss = [...css].sort((left, right) => right.rawBytes - left.rawBytes)[0];
  const allowedBaselineGzipBytes = Math.floor(
    BUDGET.javascript.originMainGzipBaselineBytes * (1 + BUDGET.javascript.maximumGrowthRatio),
  );
  const checks = {
    javascriptBaselineGrowth:
      primaryJavascript.gzipBytes <= allowedBaselineGzipBytes,
    javascriptAbsoluteGzip:
      primaryJavascript.gzipBytes <= BUDGET.javascript.absoluteGzipMaximumBytes,
    javascriptRaw: primaryJavascript.rawBytes <= BUDGET.javascript.rawMaximumBytes,
    cssGzip: primaryCss.gzipBytes <= BUDGET.css.gzipMaximumBytes,
  };
  report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    distDirectory: relative(ROOT, DIST),
    methodology: 'Largest emitted JS and CSS assets; gzip uses node:zlib level 9.',
    budget: {
      ...BUDGET,
      javascript: {
        ...BUDGET.javascript,
        allowedBaselineGzipBytes,
      },
    },
    primaryJavascript,
    primaryCss,
    assets: { javascript, css },
    checks,
    pass: Object.values(checks).every(Boolean),
  };
} catch (error) {
  report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    distDirectory: relative(ROOT, DIST),
    budget: BUDGET,
    pass: false,
    error: error instanceof Error ? error.stack || error.message : String(error),
  };
}

await mkdir(dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
console.log(`Bundle evidence: ${OUTPUT}`);
if (report.error) throw new Error(report.error);
assert.ok(report.pass, `bundle budget failed; inspect ${OUTPUT}`);
