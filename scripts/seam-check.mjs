import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const URL = process.env.URL || 'http://127.0.0.1:5173/';
const LOOP_SECONDS = 48;
const SAMPLE_STEP = 0.125;
const SAMPLE_COUNT = Math.round(LOOP_SECONDS / SAMPLE_STEP);
const REDUCED_POSTER_PHASE = 0.53 / 48;

async function launchBrowser() {
  if (process.env.PW_CHANNEL) return chromium.launch({ channel: process.env.PW_CHANNEL });
  try {
    return await chromium.launch();
  } catch {
    return chromium.launch({ channel: 'chrome' });
  }
}

async function waitForExperience(page) {
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('canvas');
  await page.waitForFunction(() => Boolean(window.__BEIJING_LOOP_TEST__));
}

async function seek(page, seconds) {
  await page.evaluate((time) => window.__BEIJING_LOOP_TEST__.seek(time), seconds);
  await page.waitForTimeout(12);
}

async function grab(page) {
  const screenshot = await page.locator('canvas').screenshot({ type: 'png' });
  return page.evaluate(async (encoded) => {
    const image = new Image();
    image.src = `data:image/png;base64,${encoded}`;
    await image.decode();
    const sample = document.createElement('canvas');
    sample.width = 180;
    sample.height = Math.max(
      1,
      Math.round((image.naturalHeight / image.naturalWidth) * sample.width),
    );
    const context = sample.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('sample 2d context unavailable');
    context.drawImage(image, 0, 0, sample.width, sample.height);
    return Array.from(context.getImageData(0, 0, sample.width, sample.height).data);
  }, screenshot.toString('base64'));
}

async function storeNativeEndpoint(page) {
  const screenshot = await page.locator('canvas').screenshot({ type: 'png' });
  return page.evaluate(async (encoded) => {
    const image = new Image();
    image.src = `data:image/png;base64,${encoded}`;
    await image.decode();
    const copy = document.createElement('canvas');
    copy.width = image.naturalWidth;
    copy.height = image.naturalHeight;
    const context = copy.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('native endpoint 2d context unavailable');
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, copy.width, copy.height);
    window.__BEIJING_LOOP_NATIVE_ENDPOINT__ = {
      width: copy.width,
      height: copy.height,
      data: pixels.data,
    };
    return { width: copy.width, height: copy.height, channels: pixels.data.length };
  }, screenshot.toString('base64'));
}

async function compareNativeEndpoint(page) {
  const screenshot = await page.locator('canvas').screenshot({ type: 'png' });
  return page.evaluate(async (encoded) => {
    const first = window.__BEIJING_LOOP_NATIVE_ENDPOINT__;
    if (!first) throw new Error('native start endpoint was not stored');
    const image = new Image();
    image.src = `data:image/png;base64,${encoded}`;
    await image.decode();
    const copy = document.createElement('canvas');
    copy.width = image.naturalWidth;
    copy.height = image.naturalHeight;
    const context = copy.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('native endpoint 2d context unavailable');
    context.drawImage(image, 0, 0);
    const second = context.getImageData(0, 0, copy.width, copy.height).data;
    if (
      first.width !== copy.width ||
      first.height !== copy.height ||
      first.data.length !== second.length
    ) {
      throw new Error(
        `native endpoint dimensions changed: ${first.width}x${first.height} -> ${copy.width}x${copy.height}`,
      );
    }

    let differingChannels = 0;
    let channelsOverTwo = 0;
    let maxDelta = 0;
    let absoluteDelta = 0;
    for (let index = 0; index < second.length; index += 1) {
      const delta = Math.abs(first.data[index] - second[index]);
      if (delta !== 0) differingChannels += 1;
      if (delta > 2) channelsOverTwo += 1;
      maxDelta = Math.max(maxDelta, delta);
      absoluteDelta += delta;
    }
    delete window.__BEIJING_LOOP_NATIVE_ENDPOINT__;
    return {
      width: copy.width,
      height: copy.height,
      channels: second.length,
      differingChannels,
      channelsOverTwo,
      maxDelta,
      mad: absoluteDelta / second.length,
    };
  }, screenshot.toString('base64'));
}

function meanAbsoluteDifference(left, right) {
  assert.equal(left.length, right.length, 'frame dimensions changed');
  let sum = 0;
  for (let index = 0; index < left.length; index += 4) {
    sum +=
      Math.abs(left[index] - right[index]) +
      Math.abs(left[index + 1] - right[index + 1]) +
      Math.abs(left[index + 2] - right[index + 2]);
  }
  return sum / ((left.length / 4) * 3);
}

function frameVariance(frame) {
  let sum = 0;
  let squares = 0;
  const pixels = frame.length / 4;
  for (let index = 0; index < frame.length; index += 4) {
    const luminance =
      frame[index] * 0.2126 + frame[index + 1] * 0.7152 + frame[index + 2] * 0.0722;
    sum += luminance;
    squares += luminance * luminance;
  }
  const mean = sum / pixels;
  return squares / pixels - mean * mean;
}

function percentile(values, fraction) {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.min(ordered.length - 1, Math.floor(ordered.length * fraction))];
}

const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 900, height: 640 }, deviceScaleFactor: 1 });
await waitForExperience(page);

const frames = [];
let nativeStart;
let nativeEndpoint;
for (let sample = 0; sample <= SAMPLE_COUNT; sample += 1) {
  const seconds = sample * SAMPLE_STEP;
  await seek(page, seconds);
  if (sample === 0) nativeStart = await storeNativeEndpoint(page);
  if (sample === SAMPLE_COUNT) nativeEndpoint = await compareNativeEndpoint(page);
  const frame = await grab(page);
  assert.ok(frameVariance(frame) > 8, `blank/flat first-person frame at ${seconds.toFixed(3)}s`);
  const state = await page.evaluate(() => window.__BEIJING_LOOP_TEST__.readState());
  assert.ok(
    state && [state.progress, state.phase, state.angle].every(Number.isFinite),
    `non-finite scene state at ${seconds.toFixed(3)}s`,
  );
  frames.push(frame);
}

const endpointDifference = meanAbsoluteDifference(frames[0], frames.at(-1));
assert.equal(
  endpointDifference,
  0,
  `${LOOP_SECONDS}s sampled endpoint mismatch: MAD=${endpointDifference}`,
);
assert.ok(nativeStart && nativeEndpoint, 'native endpoint comparison was not captured');
assert.equal(nativeEndpoint.width, nativeStart.width, 'native endpoint width');
assert.equal(nativeEndpoint.height, nativeStart.height, 'native endpoint height');
assert.equal(nativeEndpoint.channels, nativeStart.channels, 'native endpoint channel count');
assert.equal(
  nativeEndpoint.differingChannels,
  0,
  `native 0s/48s endpoints differ in ${nativeEndpoint.differingChannels} RGBA channels`,
);
assert.equal(nativeEndpoint.channelsOverTwo, 0, 'native endpoint has channels with delta > 2');
assert.equal(nativeEndpoint.maxDelta, 0, `native endpoint max delta: ${nativeEndpoint.maxDelta}`);
assert.equal(nativeEndpoint.mad, 0, `native endpoint MAD: ${nativeEndpoint.mad}`);

const adjacent = [];
for (let index = 1; index < frames.length; index += 1) {
  adjacent.push(meanAbsoluteDifference(frames[index - 1], frames[index]));
}
const medianAdjacent = percentile(adjacent, 0.5);
const p95Adjacent = percentile(adjacent, 0.95);
const maxAdjacent = Math.max(...adjacent);
const firstAdjacent = adjacent[0];
const seamAdjacent = adjacent.at(-1);
assert.ok(medianAdjacent > 0.015, `animation is effectively static: median MAD=${medianAdjacent}`);
assert.ok(
  p95Adjacent / medianAdjacent < 4.5,
  `widespread frame-difference spikes: p95/median=${p95Adjacent / medianAdjacent}`,
);
assert.ok(
  maxAdjacent / medianAdjacent < 8,
  `hard cut or geometry pop: max/median=${maxAdjacent / medianAdjacent}`,
);
assert.ok(
  seamAdjacent / medianAdjacent < 3.5,
  `near-seam motion spike: seam/median=${seamAdjacent / medianAdjacent}`,
);
assert.ok(
  Math.max(firstAdjacent, seamAdjacent) / Math.max(0.001, Math.min(firstAdjacent, seamAdjacent)) < 4,
  `motion speed changes at seam: first=${firstAdjacent}, seam=${seamAdjacent}`,
);

await seek(page, LOOP_SECONDS / 4);
const quarter = await page.evaluate(() => window.__BEIJING_LOOP_TEST__.readState());
assert.ok(Math.abs(quarter.phase - 0.25) < 1e-10, `phase slope mismatch: ${quarter.phase}`);
assert.ok(Math.abs(quarter.progress - 0.25) < 1e-10, `path period mismatch: ${quarter.progress}`);
await seek(page, LOOP_SECONDS);
const wrapped = await page.evaluate(() => window.__BEIJING_LOOP_TEST__.readState());
assert.ok(Math.abs(wrapped.phase) < 1e-10, `${LOOP_SECONDS}s phase does not wrap: ${wrapped.phase}`);
assert.ok(
  Math.abs(wrapped.progress) < 1e-10,
  `${LOOP_SECONDS}s progress does not wrap: ${wrapped.progress}`,
);
await page.close();

const reducedPage = await browser.newPage({ viewport: { width: 900, height: 640 }, deviceScaleFactor: 1 });
await reducedPage.emulateMedia({ reducedMotion: 'reduce' });
await waitForExperience(reducedPage);
const reducedBeforeState = await reducedPage.evaluate(() => window.__BEIJING_LOOP_TEST__.readState());
assert.equal(reducedBeforeState.reducedMotion, true, 'reduced-motion state');
assert.equal(reducedBeforeState.playing, false, 'reduced-motion must not autoplay');
assert.ok(
  Math.abs(reducedBeforeState.phase - REDUCED_POSTER_PHASE) < 1e-10,
  'reduced-motion poster phase',
);
assert.ok(
  Math.abs(reducedBeforeState.progress - REDUCED_POSTER_PHASE) < 1e-10,
  'reduced-motion poster progress',
);
const reducedBefore = await grab(reducedPage);
await reducedPage.waitForTimeout(450);
const reducedAfter = await grab(reducedPage);
const reducedAfterState = await reducedPage.evaluate(() => window.__BEIJING_LOOP_TEST__.readState());
assert.equal(reducedAfterState.playing, false, 'reduced-motion stays paused');
assert.equal(
  meanAbsoluteDifference(reducedBefore, reducedAfter),
  0,
  'reduced-motion poster changed over time',
);
await reducedPage.close();
await browser.close();

console.log('=== FIRST-PERSON SEAM CHECK ===');
console.log(
  JSON.stringify(
    {
      loopSeconds: LOOP_SECONDS,
      frames: frames.length,
      sampleStep: SAMPLE_STEP,
      endpointDifference,
      nativeEndpoint,
      medianAdjacentDifference: medianAdjacent,
      p95AdjacentDifference: p95Adjacent,
      maxAdjacentDifference: maxAdjacent,
      firstAdjacentDifference: firstAdjacent,
      seamAdjacentDifference: seamAdjacent,
      quarterPhase: quarter.phase,
      quarterProgress: quarter.progress,
      wrappedPhase: wrapped.phase,
      wrappedProgress: wrapped.progress,
      reducedMotionPosterPhase: REDUCED_POSTER_PHASE,
      reducedMotionStatic: true,
    },
    null,
    2,
  ),
);
console.log('FIRST-PERSON SEAM OK');
