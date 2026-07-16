import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { chromium } from 'playwright';

const URL = process.env.URL || 'http://127.0.0.1:5173/';
const OUT = 'docs/verify';
mkdirSync(OUT, { recursive: true });

const viewports = [
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'desktop-1280', width: 1280, height: 800 },
  { name: 'mobile-390', width: 390, height: 844, mobile: true },
  { name: 'mobile-360', width: 360, height: 800, mobile: true },
  { name: 'mobile-320', width: 320, height: 568, mobile: true },
];

async function launchBrowser() {
  if (process.env.PW_CHANNEL) return chromium.launch({ channel: process.env.PW_CHANNEL });
  try {
    return await chromium.launch();
  } catch {
    return chromium.launch({ channel: 'chrome' });
  }
}

async function canvasReport(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return { error: 'missing canvas' };
    const sample = document.createElement('canvas');
    sample.width = Math.min(480, canvas.width);
    sample.height = Math.max(1, Math.round((canvas.height / canvas.width) * sample.width));
    const context = sample.getContext('2d');
    context.drawImage(canvas, 0, 0, sample.width, sample.height);
    const data = context.getImageData(0, 0, sample.width, sample.height).data;
    let bright = 0;
    let orange = 0;
    let red = 0;
    let sum = 0;
    let sumSquares = 0;
    const pixels = data.length / 4;
    for (let index = 0; index < data.length; index += 4) {
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const luminance = r * 0.2126 + g * 0.7152 + b * 0.0722;
      sum += luminance;
      sumSquares += luminance * luminance;
      if (Math.max(r, g, b) > 42) bright += 1;
      if (r > 125 && g > 65 && g < r - 25 && b < 95) orange += 1;
      if (r > 80 && r > g * 1.35 && r > b * 1.2) red += 1;
    }
    const mean = sum / pixels;
    return {
      width: sample.width,
      height: sample.height,
      brightPct: (bright / pixels) * 100,
      orangePct: (orange / pixels) * 100,
      redPct: (red / pixels) * 100,
      variance: sumSquares / pixels - mean * mean,
    };
  });
}

function overlapArea(left, right) {
  const width = Math.max(0, Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x));
  const height = Math.max(0, Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y));
  return width * height;
}

async function visibleOverlayBoxes(page) {
  return page.evaluate(() => {
    const selectors = [
      '.ui-brand',
      '.ui-actions',
      '.ui-dock',
      '.ui-footer',
      '.ui-rec',
      '.ui-debug',
    ];
    return selectors.flatMap((selector) => {
      const element = document.querySelector(selector);
      if (!element) return [];
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      if (style.display === 'none' || style.visibility === 'hidden' || rect.width * rect.height <= 4) {
        return [];
      }
      return [{ selector, x: rect.x, y: rect.y, width: rect.width, height: rect.height }];
    });
  });
}

function assertNoOverlayCollisions(boxes, label) {
  for (let left = 0; left < boxes.length; left += 1) {
    for (let right = left + 1; right < boxes.length; right += 1) {
      assert.equal(
        overlapArea(boxes[left], boxes[right]),
        0,
        `${label}: ${boxes[left].selector} overlaps ${boxes[right].selector}`,
      );
    }
  }
}

async function downloadedBytes(download) {
  const path = await download.path();
  if (path) return (await stat(path)).size;

  const stream = await download.createReadStream();
  assert.ok(stream, 'recording download stream is unavailable');
  let bytes = 0;
  for await (const chunk of stream) bytes += chunk.length;
  return bytes;
}

const browser = await launchBrowser();
const reports = {};
const runtimeErrors = [];

for (const viewport of viewports) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    isMobile: Boolean(viewport.mobile),
    hasTouch: Boolean(viewport.mobile),
  });
  const page = await context.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(`[${viewport.name}] ${message.text()}`);
  });
  page.on('pageerror', (error) => runtimeErrors.push(`[${viewport.name}] ${error.message}`));
  page.on('requestfailed', (request) =>
    runtimeErrors.push(`[${viewport.name}] failed ${request.url()} ${request.failure()?.errorText}`),
  );
  page.on('response', (response) => {
    if (response.status() >= 400) runtimeErrors.push(`[${viewport.name}] ${response.status()} ${response.url()}`);
  });

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('canvas');
  await page.waitForTimeout(200);

  const canvas = page.locator('canvas');
  await assert.doesNotReject(() => canvas.waitFor({ state: 'visible' }));
  assert.equal(await canvas.getAttribute('role'), 'img', `${viewport.name}: canvas role`);
  assert.ok(await canvas.getAttribute('aria-label'), `${viewport.name}: canvas accessible name`);
  const descriptionId = await canvas.getAttribute('aria-describedby');
  assert.ok(descriptionId, `${viewport.name}: canvas description reference`);
  assert.ok(
    (await page.locator(`#${descriptionId}`).textContent())?.trim(),
    `${viewport.name}: canvas description text`,
  );

  assert.equal(await page.locator('.ui-rec').isVisible(), false, `${viewport.name}: record badge hidden`);
  assert.equal(await page.locator('.ui-debug').isVisible(), false, `${viewport.name}: debug hidden`);
  assert.equal(
    await page.locator('.ui-rec').evaluate((element) => getComputedStyle(element).display),
    'none',
    `${viewport.name}: record computed display`,
  );

  const buttons = page.getByRole('button');
  const buttonCount = await buttons.count();
  assert.equal(buttonCount, 5, `${viewport.name}: public control count`);
  for (let index = 0; index < buttonCount; index += 1) {
    const button = buttons.nth(index);
    assert.ok(await button.getAttribute('aria-label'), `${viewport.name}: button ${index} name`);
    const box = await button.boundingBox();
    assert.ok(box && box.width >= 44 && box.height >= 44, `${viewport.name}: button ${index} target`);
  }
  assert.equal(
    await page.locator('.ui-mode-btn[aria-pressed="true"]').count(),
    1,
    `${viewport.name}: exactly one active mode`,
  );

  const layout = await page.evaluate(() => ({
    viewportWidth: innerWidth,
    viewportHeight: innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
  }));
  assert.ok(layout.scrollWidth <= layout.viewportWidth, `${viewport.name}: horizontal overflow`);
  assert.ok(layout.scrollHeight <= layout.viewportHeight, `${viewport.name}: vertical overflow`);
  const boxes = await visibleOverlayBoxes(page);
  assertNoOverlayCollisions(boxes, viewport.name);

  await page.evaluate(() => window.__BEIJING_LOOP_TEST__?.seek(0));
  await page.waitForTimeout(180);
  await page.screenshot({ path: `${OUT}/${viewport.name}-infinite.png` });
  const infinite = await canvasReport(page);
  assert.ok(!('error' in infinite), `${viewport.name}: canvas exists`);
  assert.ok(infinite.brightPct > 0.04, `${viewport.name}: Infinite not blank`);
  assert.ok(infinite.brightPct < 16, `${viewport.name}: Infinite ink density too high`);
  assert.ok(infinite.orangePct > 0.015, `${viewport.name}: Infinite loop missing`);
  assert.ok(infinite.variance > 4, `${viewport.name}: Infinite luminance variance`);

  await page.getByRole('button', { name: 'Plan view' }).click();
  await page.waitForTimeout(180);
  await page.screenshot({ path: `${OUT}/${viewport.name}-plan.png` });
  const plan = await canvasReport(page);
  assert.ok(plan.brightPct > 0.02, `${viewport.name}: Plan not blank`);
  assert.ok(plan.brightPct < 12, `${viewport.name}: Plan ink density too high`);
  assert.ok(plan.orangePct > 0.005, `${viewport.name}: Plan loop missing`);
  assert.equal(await page.getByRole('button', { name: 'Plan view' }).getAttribute('aria-pressed'), 'true');

  await page.getByRole('button', { name: 'Infinite view' }).click();
  await page.getByRole('button', { name: 'Play animation' }).click();
  await page.waitForTimeout(420);
  const moving = await page.evaluate(() => window.__BEIJING_LOOP_TEST__?.readState());
  assert.ok(moving && moving.progress > 0, `${viewport.name}: animation advances`);
  await page.getByRole('button', { name: 'Pause animation' }).click();
  const pausedBefore = await page.evaluate(() => window.__BEIJING_LOOP_TEST__?.readState().progress);
  await page.waitForTimeout(420);
  const pausedAfter = await page.evaluate(() => window.__BEIJING_LOOP_TEST__?.readState().progress);
  assert.ok(Math.abs(pausedAfter - pausedBefore) < 1e-8, `${viewport.name}: pause stability`);

  const play = page.getByRole('button', { name: 'Play animation' });
  await play.focus();
  await play.press('Space');
  const keyboardPlaying = await page.evaluate(() => window.__BEIJING_LOOP_TEST__?.readState().playing);
  assert.equal(keyboardPlaying, true, `${viewport.name}: focused Space toggles once`);
  await page.getByRole('button', { name: 'Pause animation' }).click();

  await page.locator('body').click({ position: { x: viewport.width / 2, y: 120 } });
  await page.keyboard.press('d');
  assert.equal(await page.locator('.ui-debug').isVisible(), true, `${viewport.name}: debug opens`);
  const debugBoxes = await visibleOverlayBoxes(page);
  assertNoOverlayCollisions(debugBoxes, `${viewport.name} debug-open`);
  await page.screenshot({ path: `${OUT}/${viewport.name}-debug.png` });
  await page.keyboard.press('d');
  assert.equal(await page.locator('.ui-debug').isVisible(), false, `${viewport.name}: debug closes`);

  if (viewport.name === 'desktop-1440') {
    await page.evaluate(() => {
      window.__BEIJING_LOOP_TEST__?.setMode('fractal');
      window.__BEIJING_LOOP_TEST__?.seek(0);
    });
    const recordingStartState = await page.evaluate(() =>
      window.__BEIJING_LOOP_TEST__?.readState(),
    );
    assert.equal(recordingStartState?.mode, 'fractal', 'recording starts in Infinite view');
    assert.equal(recordingStartState?.playing, false, 'recording starts from paused state');
    assert.equal(
      await page.getByRole('button', { name: 'Infinite view' }).getAttribute('aria-pressed'),
      'true',
      'Infinite action is selected before recording',
    );
    assert.equal(
      await page.locator('[data-act="record"]').getAttribute('aria-pressed'),
      'false',
      'record action starts idle',
    );

    const downloadPromise = page.waitForEvent('download', { timeout: 20_000 });
    const wallStarted = performance.now();
    await page.getByRole('button', { name: 'Record one 12-second loop' }).click();
    await page.waitForFunction(
      () =>
        !document.querySelector('.ui-rec')?.hasAttribute('hidden') &&
        document.querySelector('[data-act="record"]')?.getAttribute('aria-pressed') === 'true',
    );
    await page.waitForTimeout(180);
    assert.equal(await page.locator('.ui-rec').isVisible(), true, 'recording badge appears');
    assert.match(await page.locator('.ui-rec').innerText(), /REC\s+0\.[0-9]s/, 'recording badge ticks');
    assert.equal(
      await page.locator('[data-act="record"]').getAttribute('aria-pressed'),
      'true',
      'record action is pressed during recording',
    );
    assert.equal(
      (await page.evaluate(() => window.__BEIJING_LOOP_TEST__?.readState().playing)) ?? false,
      true,
      'recording advances the real animation clock',
    );
    const recordingBoxes = await visibleOverlayBoxes(page);
    const rec = recordingBoxes.find((box) => box.selector === '.ui-rec');
    const actions = recordingBoxes.find((box) => box.selector === '.ui-actions');
    assert.ok(rec && actions && overlapArea(rec, actions) === 0, 'record badge avoids actions');

    const download = await downloadPromise;
    const wallSeconds = (performance.now() - wallStarted) / 1000;
    assert.ok(
      wallSeconds >= 11.5 && wallSeconds <= 18,
      `recording wall duration ${wallSeconds.toFixed(3)}s is not approximately one 12s cycle`,
    );
    assert.equal(
      download.suggestedFilename(),
      'beijing-infinite-loop.webm',
      'recording download filename',
    );
    assert.equal(await download.failure(), null, 'recording download succeeds');
    await page.waitForFunction(
      () =>
        document.querySelector('.ui-rec')?.hasAttribute('hidden') === true &&
        document.querySelector('[data-act="record"]')?.getAttribute('aria-pressed') === 'false',
      undefined,
      { timeout: 2_000 },
    );
    const recordingEndState = await page.evaluate(() =>
      window.__BEIJING_LOOP_TEST__?.readState(),
    );
    assert.ok(recordingEndState, 'recording end state is available');
    const phaseSeamDistance = Math.min(
      recordingEndState.phase,
      1 - recordingEndState.phase,
    );
    const progressSeamDistance = Math.min(
      recordingEndState.progress,
      1 - recordingEndState.progress,
    );
    assert.ok(phaseSeamDistance < 0.04, `recording phase missed seam: ${recordingEndState.phase}`);
    assert.ok(
      progressSeamDistance < 0.04,
      `recording progress missed seam: ${recordingEndState.progress}`,
    );
    assert.equal(await page.locator('.ui-rec').isVisible(), false, 'recording badge clears');
    assert.equal(
      await page.locator('[data-act="record"]').getAttribute('aria-pressed'),
      'false',
      'record action returns idle',
    );
    const bytes = await downloadedBytes(download);
    assert.ok(bytes >= 16 * 1024, `recording is unexpectedly small: ${bytes} bytes`);
    reports.recording = {
      wallSeconds,
      suggestedFilename: download.suggestedFilename(),
      bytes,
      phase: recordingEndState.phase,
      progress: recordingEndState.progress,
    };
  }

  reports[viewport.name] = { infinite, plan, overlays: boxes, debugOverlays: debugBoxes };
  await context.close();
}

// The authored loop has a built-in fail-safe so malformed local loop data
// cannot leave the artwork without its primary route.
const fallbackContext = await browser.newContext({
  viewport: { width: 800, height: 600 },
  deviceScaleFactor: 1,
});
const fallbackPage = await fallbackContext.newPage();
await fallbackPage.route('**/data/beijing-loop.geojson', (route) =>
  route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ type: 'FeatureCollection', features: [] }),
  }),
);
await fallbackPage.goto(URL, { waitUntil: 'networkidle' });
await fallbackPage.waitForSelector('canvas');
const fallback = await canvasReport(fallbackPage);
assert.ok(!('error' in fallback), 'loop fallback: canvas exists');
assert.ok(fallback.orangePct > 0.015, 'loop fallback: route remains visible');
reports['loop-fallback'] = fallback;
await fallbackContext.close();

const webglUnavailableContext = await browser.newContext({
  viewport: { width: 800, height: 600 },
  deviceScaleFactor: 1,
});
const webglUnavailablePage = await webglUnavailableContext.newPage();
await webglUnavailablePage.addInitScript(() => {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...args) {
    if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null;
    return originalGetContext.call(this, type, ...args);
  };
});
await webglUnavailablePage.goto(URL, { waitUntil: 'networkidle' });
const webglError = webglUnavailablePage.locator('.boot.error');
await webglError.waitFor({ state: 'visible' });
const expectedWebglError =
  'This visualization needs WebGL, which is unavailable or disabled in this browser. ' +
  'Enable hardware acceleration / WebGL and reload.';
assert.equal(await webglError.getAttribute('role'), 'alert', 'WebGL error role');
assert.equal(await webglError.getAttribute('aria-live'), 'assertive', 'WebGL error live region');
assert.equal(await webglError.getAttribute('aria-atomic'), 'true', 'WebGL error atomicity');
assert.equal((await webglError.textContent())?.trim(), expectedWebglError, 'WebGL error text');
assert.equal(await webglUnavailablePage.locator('canvas').count(), 0, 'WebGL error has no canvas');
reports['webgl-unavailable'] = {
  visible: await webglError.isVisible(),
  role: await webglError.getAttribute('role'),
  ariaLive: await webglError.getAttribute('aria-live'),
  ariaAtomic: await webglError.getAttribute('aria-atomic'),
  canvasCount: await webglUnavailablePage.locator('canvas').count(),
};
await webglUnavailableContext.close();

await browser.close();
assert.deepEqual(runtimeErrors, [], `runtime failures:\n${runtimeErrors.join('\n')}`);
console.log('=== BROWSER VERIFY ===');
console.log(JSON.stringify(reports, null, 2));
console.log('BROWSER OK');
