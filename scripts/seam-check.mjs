import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const URL = process.env.URL || 'http://127.0.0.1:5173/';

async function launchBrowser() {
  if (process.env.PW_CHANNEL) return chromium.launch({ channel: process.env.PW_CHANNEL });
  try {
    return await chromium.launch();
  } catch {
    return chromium.launch({ channel: 'chrome' });
  }
}

async function grab(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const sample = document.createElement('canvas');
    sample.width = 120;
    sample.height = Math.round((canvas.height / canvas.width) * sample.width);
    const context = sample.getContext('2d');
    context.drawImage(canvas, 0, 0, sample.width, sample.height);
    return Array.from(context.getImageData(0, 0, sample.width, sample.height).data);
  });
}

async function storeNativeEndpoint(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error('missing native canvas');
    const copy = document.createElement('canvas');
    copy.width = canvas.width;
    copy.height = canvas.height;
    const context = copy.getContext('2d');
    if (!context) throw new Error('native endpoint 2d context unavailable');
    context.drawImage(canvas, 0, 0);
    const image = context.getImageData(0, 0, copy.width, copy.height);
    window.__BEIJING_LOOP_NATIVE_ENDPOINT__ = {
      width: copy.width,
      height: copy.height,
      data: image.data,
    };
    return { width: copy.width, height: copy.height, channels: image.data.length };
  });
}

async function compareNativeEndpoint(page) {
  return page.evaluate(() => {
    const first = window.__BEIJING_LOOP_NATIVE_ENDPOINT__;
    if (!first) throw new Error('native start endpoint was not stored');
    const canvas = document.querySelector('canvas');
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error('missing native canvas');
    const copy = document.createElement('canvas');
    copy.width = canvas.width;
    copy.height = canvas.height;
    const context = copy.getContext('2d');
    if (!context) throw new Error('native endpoint 2d context unavailable');
    context.drawImage(canvas, 0, 0);
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
    let maxDelta = 0;
    let absoluteDelta = 0;
    for (let index = 0; index < second.length; index += 1) {
      const delta = Math.abs(first.data[index] - second[index]);
      if (delta !== 0) differingChannels += 1;
      if (delta > maxDelta) maxDelta = delta;
      absoluteDelta += delta;
    }
    delete window.__BEIJING_LOOP_NATIVE_ENDPOINT__;
    return {
      width: copy.width,
      height: copy.height,
      channels: second.length,
      differingChannels,
      maxDelta,
      mad: absoluteDelta / second.length,
    };
  });
}

function meanAbsoluteDifference(left, right) {
  let sum = 0;
  for (let index = 0; index < left.length; index += 4) {
    sum +=
      Math.abs(left[index] - right[index]) +
      Math.abs(left[index + 1] - right[index + 1]) +
      Math.abs(left[index + 2] - right[index + 2]);
  }
  return sum / ((left.length / 4) * 3);
}

function foregroundPercent(frame) {
  let foreground = 0;
  for (let index = 0; index < frame.length; index += 4) {
    if (Math.max(frame[index], frame[index + 1], frame[index + 2]) > 42) foreground += 1;
  }
  return (foreground / (frame.length / 4)) * 100;
}

const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 900, height: 640 } });
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForSelector('canvas');
assert.ok(await page.evaluate(() => Boolean(window.__BEIJING_LOOP_TEST__)), 'missing DEV seam hook');
await page.evaluate(() => window.__BEIJING_LOOP_TEST__.setMode('fractal'));

const frames = [];
const sampleStep = 0.1;
let nativeStart = null;
let nativeEndpoint = null;
for (let sample = 0; sample <= 120; sample += 1) {
  const seconds = sample * sampleStep;
  await page.evaluate((time) => window.__BEIJING_LOOP_TEST__.seek(time), seconds);
  await page.waitForTimeout(8);
  if (sample === 0) nativeStart = await storeNativeEndpoint(page);
  if (sample === 120) nativeEndpoint = await compareNativeEndpoint(page);
  const frame = await grab(page);
  const foreground = foregroundPercent(frame);
  assert.ok(foreground > 0.04, `blank/near-blank frame at ${seconds.toFixed(1)}s`);
  frames.push(frame);
}

const endpointDifference = meanAbsoluteDifference(frames[0], frames.at(-1));
assert.ok(endpointDifference <= 0.15, `12s endpoint mismatch: MAD=${endpointDifference}`);
assert.ok(nativeStart && nativeEndpoint, 'native endpoint comparison was not captured');
assert.equal(nativeEndpoint.width, nativeStart.width, 'native endpoint width');
assert.equal(nativeEndpoint.height, nativeStart.height, 'native endpoint height');
assert.equal(nativeEndpoint.channels, nativeStart.channels, 'native endpoint channel count');
assert.equal(
  nativeEndpoint.differingChannels,
  0,
  `native endpoints differ in ${nativeEndpoint.differingChannels} RGBA channels`,
);
assert.equal(nativeEndpoint.maxDelta, 0, `native endpoint max delta: ${nativeEndpoint.maxDelta}`);
assert.equal(nativeEndpoint.mad, 0, `native endpoint MAD: ${nativeEndpoint.mad}`);

const adjacent = [];
for (let index = 1; index < frames.length; index += 1) {
  adjacent.push(meanAbsoluteDifference(frames[index - 1], frames[index]));
}
const ordered = [...adjacent].sort((left, right) => left - right);
const median = ordered[Math.floor(ordered.length / 2)];
const max = Math.max(...adjacent);
assert.ok(median > 0.01, `animation median difference is too small: ${median}`);
assert.ok(max / median < 6, `frame-difference spike: max/median=${max / median}`);

await page.evaluate(() => window.__BEIJING_LOOP_TEST__.seek(3));
await page.waitForTimeout(8);
const quarter = await page.evaluate(() => window.__BEIJING_LOOP_TEST__.readState());
assert.ok(Math.abs(quarter.phase - 0.25) < 1e-8, `phase slope mismatch: ${quarter.phase}`);
assert.ok(Math.abs(quarter.progress - 0.25) < 0.002, `vehicle period mismatch: ${quarter.progress}`);
await page.close();

const reducedPage = await browser.newPage({ viewport: { width: 900, height: 640 } });
await reducedPage.emulateMedia({ reducedMotion: 'reduce' });
await reducedPage.goto(URL, { waitUntil: 'networkidle' });
await reducedPage.waitForSelector('canvas');
await reducedPage.evaluate(() => window.__BEIJING_LOOP_TEST__.seek(6));
await reducedPage.waitForTimeout(8);
const reduced = await reducedPage.evaluate(() => window.__BEIJING_LOOP_TEST__.readState());
assert.equal(reduced.reducedMotion, true, 'reduced-motion state');
assert.ok(Math.abs(reduced.phase) < 1e-8, `reduced-motion fractal moved: ${reduced.phase}`);
await reducedPage.close();
await browser.close();

console.log('=== SEAM CHECK ===');
console.log(
  JSON.stringify(
    {
      frames: frames.length,
      sampleStep,
      endpointDifference,
      nativeEndpoint,
      medianAdjacentDifference: median,
      maxAdjacentDifference: max,
      maxMedianRatio: max / median,
      quarterPhase: quarter.phase,
      quarterProgress: quarter.progress,
      reducedMotionPhase: reduced.phase,
    },
    null,
    2,
  ),
);
console.log('SEAM OK');
