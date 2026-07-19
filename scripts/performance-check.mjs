import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { cpus, platform, release } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = join(
  ROOT,
  '.omx',
  'handoff',
  'animation-deep-refinement',
  'performance.json',
);
const DEFAULT_ORIGIN = 'http://127.0.0.1:4173';
const TARGET_URL = process.env.URL || `${DEFAULT_ORIGIN}/?qa=1`;
const WARMUP_MS = 4_000;
const SAMPLE_MS = 48_000;
const BOUNDARY_WINDOW_MS = 250;

const CASES = [
  {
    name: 'desktop-1440x900',
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    budget: {
      achievedFpsMinimum: 55,
      medianMsMaximum: 20,
      p95MsMaximum: 33.4,
      over50MsRatioMaximum: 0.02,
      consecutiveOver50MsMaximum: 5,
    },
  },
  {
    name: 'mobile-390x844',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    budget: {
      achievedFpsMinimum: 30,
      medianMsMaximum: 33.4,
      p95MsMaximum: 50,
      over50MsRatioMaximum: 0.02,
      consecutiveOver50MsMaximum: 5,
    },
  },
];

function percentile(values, fraction) {
  assert.ok(values.length > 0, 'cannot compute a percentile without frame intervals');
  const sorted = [...values].sort((left, right) => left - right);
  const rank = (sorted.length - 1) * fraction;
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (rank - lower);
}

function round(value, digits = 3) {
  return Number(value.toFixed(digits));
}

function summarizeIntervals(intervals) {
  assert.ok(intervals.length > 0, 'no requestAnimationFrame intervals were captured');
  let longestOver50MsCluster = 0;
  let currentOver50MsCluster = 0;
  for (const interval of intervals) {
    if (interval > 50) {
      currentOver50MsCluster += 1;
      longestOver50MsCluster = Math.max(longestOver50MsCluster, currentOver50MsCluster);
    } else {
      currentOver50MsCluster = 0;
    }
  }
  const over33 = intervals.filter((interval) => interval > 33.3).length;
  const over50 = intervals.filter((interval) => interval > 50).length;
  const elapsed = intervals.reduce((sum, interval) => sum + interval, 0);
  return {
    intervalCount: intervals.length,
    elapsedMs: round(elapsed),
    achievedFps: round((intervals.length * 1000) / elapsed),
    medianMs: round(percentile(intervals, 0.5)),
    p95Ms: round(percentile(intervals, 0.95)),
    p99Ms: round(percentile(intervals, 0.99)),
    over33_3Ms: { count: over33, ratio: round(over33 / intervals.length, 6) },
    over50Ms: { count: over50, ratio: round(over50 / intervals.length, 6) },
    maximumConsecutiveOver50Ms: longestOver50MsCluster,
  };
}

function analyzeSample(sample) {
  const intervals = sample.timestamps.slice(1).map((value, index) => value - sample.timestamps[index]);
  const intervalMidpoints = intervals.map(
    (interval, index) => sample.timestamps[index] - sample.timestamps[0] + interval / 2,
  );
  const overall = summarizeIntervals(intervals);
  const segments = Array.from({ length: 12 }, (_, index) => {
    const startMs = index * 4_000;
    const endMs = startMs + 4_000;
    const values = intervals.filter(
      (_interval, frameIndex) =>
        intervalMidpoints[frameIndex] >= startMs && intervalMidpoints[frameIndex] < endMs,
    );
    return {
      passage: index + 1,
      startMs,
      endMs,
      ...(values.length > 0 ? summarizeIntervals(values) : { intervalCount: 0 }),
    };
  });
  const boundaries = Array.from({ length: 11 }, (_, index) => {
    const boundaryMs = (index + 1) * 4_000;
    const values = intervals.filter(
      (_interval, frameIndex) =>
        Math.abs(intervalMidpoints[frameIndex] - boundaryMs) <= BOUNDARY_WINDOW_MS,
    );
    return {
      boundaryMs,
      windowMs: BOUNDARY_WINDOW_MS,
      ...(values.length > 0 ? summarizeIntervals(values) : { intervalCount: 0 }),
    };
  });
  return { overall, segments, boundaries };
}

function evaluateBudget(metrics, budget) {
  const checks = {
    achievedFps: metrics.achievedFps >= budget.achievedFpsMinimum,
    medianMs: metrics.medianMs <= budget.medianMsMaximum,
    p95Ms: metrics.p95Ms <= budget.p95MsMaximum,
    over50MsRatio: metrics.over50Ms.ratio <= budget.over50MsRatioMaximum,
    consecutiveOver50Ms:
      metrics.maximumConsecutiveOver50Ms <= budget.consecutiveOver50MsMaximum,
  };
  return { pass: Object.values(checks).every(Boolean), checks };
}

async function waitForServer(url, child) {
  const deadline = Date.now() + 30_000;
  let lastError;
  while (Date.now() < deadline) {
    if (child && child.exitCode !== null) {
      throw new Error(`preview server exited before becoming ready (code ${child.exitCode})`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`preview server did not become ready: ${lastError?.message || 'timeout'}`);
}

async function stopServer(child) {
  if (!child || child.exitCode !== null) return;
  child.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 3_000)),
  ]);
  if (child.exitCode === null) child.kill('SIGKILL');
}

async function launchBrowser() {
  if (process.env.PW_CHANNEL) {
    return {
      browser: await chromium.launch({ channel: process.env.PW_CHANNEL }),
      launchMode: `channel:${process.env.PW_CHANNEL}`,
    };
  }
  try {
    return { browser: await chromium.launch(), launchMode: 'playwright-chromium' };
  } catch {
    return { browser: await chromium.launch({ channel: 'chrome' }), launchMode: 'channel:chrome' };
  }
}

async function measureCase(browser, definition) {
  const context = await browser.newContext({
    viewport: definition.viewport,
    deviceScaleFactor: definition.deviceScaleFactor,
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();
  try {
    await page.goto(TARGET_URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('canvas');
    await page.waitForFunction(() => Boolean(window.__BEIJING_LOOP_TEST__));
    await page.waitForTimeout(WARMUP_MS);

    await page.evaluate(() => window.__BEIJING_LOOP_TEST__.seek(0));
    await page.locator('[data-act="play"]').click();
    await page.waitForFunction(() => window.__BEIJING_LOOP_TEST__.readState().playing);

    const sample = await page.evaluate(
      ({ durationMs }) =>
        new Promise((resolve) => {
          const timestamps = [];
          const begin = requestAnimationFrame((firstTimestamp) => {
            timestamps.push(firstTimestamp);
            const collect = (timestamp) => {
              timestamps.push(timestamp);
              if (timestamp - firstTimestamp >= durationMs) {
                resolve({
                  timestamps,
                  state: window.__BEIJING_LOOP_TEST__.readState(),
                  visibilityState: document.visibilityState,
                });
                return;
              }
              requestAnimationFrame(collect);
            };
            requestAnimationFrame(collect);
          });
          window.addEventListener('pagehide', () => cancelAnimationFrame(begin), { once: true });
        }),
      { durationMs: SAMPLE_MS },
    );

    assert.equal(sample.visibilityState, 'visible', `${definition.name}: page became hidden`);
    assert.equal(sample.state.playing, true, `${definition.name}: playback stopped during sampling`);
    const analysis = analyzeSample(sample);
    const budgetResult = evaluateBudget(analysis.overall, definition.budget);
    return {
      name: definition.name,
      viewport: definition.viewport,
      deviceScaleFactor: definition.deviceScaleFactor,
      warmupMs: WARMUP_MS,
      requestedSampleDurationMs: SAMPLE_MS,
      frameCount: sample.timestamps.length,
      metrics: analysis.overall,
      passageSegments: analysis.segments,
      passageBoundaryWindows: analysis.boundaries,
      budget: definition.budget,
      budgetResult,
    };
  } finally {
    await context.close();
  }
}

let server;
let serverLog = '';
const ownsServer = !process.env.URL;
const startedAt = new Date().toISOString();
const report = {
  schemaVersion: 1,
  generatedAt: startedAt,
  targetUrl: TARGET_URL,
  methodology: {
    clock: 'real requestAnimationFrame callback timestamps from the rendered page',
    warmupMs: WARMUP_MS,
    sampleDurationMs: SAMPLE_MS,
    passageDurationMs: 4_000,
    boundaryWindowMs: BOUNDARY_WINDOW_MS,
    note: 'WebM block rate and the in-app smoothed FPS label are not used.',
  },
  server: {
    ownership: ownsServer ? 'script-started-and-stopped' : 'external-URL',
    command: ownsServer ? 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort' : null,
  },
  host: {
    platform: platform(),
    release: release(),
    logicalCpuCount: cpus().length,
    cpuModel: cpus()[0]?.model || 'unknown',
  },
  cases: [],
  pass: false,
};

let browser;
try {
  if (ownsServer) {
    server = spawn(
      process.platform === 'win32' ? 'npm.cmd' : 'npm',
      ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4173', '--strictPort'],
      { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    server.stdout.on('data', (chunk) => {
      serverLog += chunk;
    });
    server.stderr.on('data', (chunk) => {
      serverLog += chunk;
    });
  }
  await waitForServer(TARGET_URL, server);
  const launched = await launchBrowser();
  browser = launched.browser;
  report.browser = {
    engine: 'chromium',
    version: browser.version(),
    launchMode: launched.launchMode,
  };
  for (const definition of CASES) {
    console.log(
      `Measuring ${definition.name}: ${WARMUP_MS / 1000}s warm-up + ${SAMPLE_MS / 1000}s sample...`,
    );
    const result = await measureCase(browser, definition);
    report.cases.push(result);
    console.log(
      `${definition.name}: ${result.metrics.achievedFps} fps, median ${result.metrics.medianMs}ms, p95 ${result.metrics.p95Ms}ms`,
    );
  }
  report.pass = report.cases.every((entry) => entry.budgetResult.pass);
} catch (error) {
  report.error = error instanceof Error ? error.stack || error.message : String(error);
  if (serverLog) report.server.log = serverLog.slice(-4_000);
} finally {
  if (browser) await browser.close();
  await stopServer(server);
  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
}

console.log(`Performance evidence: ${OUTPUT}`);
if (report.error) throw new Error(report.error);
assert.ok(report.pass, `performance budget failed; inspect ${OUTPUT}`);
