// Ad-hoc verification harness (not part of the shipped app). Drives the page
// with Playwright, screenshots desktop + mobile, checks the canvas has the
// expected palette present, exercises controls/keys, and reports console
// errors + failed requests. Run: `node scripts/verify.mjs`.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const URL = process.env.URL || 'http://localhost:5173/';
const OUT = 'docs/verify';
mkdirSync(OUT, { recursive: true });

const viewports = [
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'desktop-1280', width: 1280, height: 720 },
  { name: 'mobile-390', width: 390, height: 844, mobile: true },
  { name: 'mobile-360', width: 360, height: 800, mobile: true },
];

// Sample the canvas pixels near native resolution (downscaling 6x averages
// thin 2px lines into the background and hides them) and bucket toward our
// palette anchors, tolerant of alpha compositing over the dark ground.
async function paletteReport(page) {
  return await page.evaluate(() => {
    const c = document.querySelector('canvas');
    if (!c) return { error: 'no canvas' };
    const off = document.createElement('canvas');
    const w = (off.width = Math.min(c.width, 1400));
    const h = (off.height = Math.round((c.height / c.width) * w));
    const ctx = off.getContext('2d');
    ctx.drawImage(c, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);
    let dark = 0,
      boundary = 0,
      orange = 0,
      red = 0,
      yellow = 0,
      water = 0,
      total = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i],
        g = data[i + 1],
        b = data[i + 2];
      total++;
      if (r < 40 && g < 48 && b < 55) dark++;
      // light bluish-white boundary (#D6DEE8), tolerant of dimming
      if (r > 110 && g > 120 && b > 128 && b >= r - 10 && b - r < 50) boundary++;
      // orange loop (#F08A24): warm, r>g>b with a clear spread
      if (r > 110 && g > 55 && g < r - 22 && b < g - 8 && r - b > 65) orange++;
      // red axis (#D64A3A): r dominant, g&b low and close
      if (r > 130 && g < 120 && b < 110 && r - g > 55 && Math.abs(g - b) < 55) red++;
      // highlight yellow (#F4D35E)
      if (r > 200 && g > 175 && b < 150 && r - b > 70 && Math.abs(r - g) < 60) yellow++;
      // water (#3D83A6): b dominant, mid green
      if (b > 110 && b > r + 25 && g > 80 && g < 190 && b - g < 90) water++;
    }
    return {
      w,
      h,
      total,
      darkPct: +((dark / total) * 100).toFixed(2),
      boundaryPct: +((boundary / total) * 100).toFixed(3),
      orangePct: +((orange / total) * 100).toFixed(3),
      redPct: +((red / total) * 100).toFixed(3),
      yellowPct: +((yellow / total) * 100).toFixed(3),
      waterPct: +((water / total) * 100).toFixed(3),
    };
  });
}

const browser = await chromium.launch(
  process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {},
);
const results = {};
const consoleErrors = [];
const failedRequests = [];

for (const vp of viewports) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.mobile ? 3 : 2,
    isMobile: !!vp.mobile,
    hasTouch: !!vp.mobile,
  });
  const page = await context.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(`[${vp.name}] ${m.text()}`);
  });
  page.on('requestfailed', (r) =>
    failedRequests.push(`[${vp.name}] ${r.url()} ${r.failure()?.errorText}`),
  );
  page.on('response', (r) => {
    if (r.status() >= 400) failedRequests.push(`[${vp.name}] ${r.status()} ${r.url()}`);
  });

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500); // let a few frames render

  // default (fractal) screenshot + palette
  await page.screenshot({ path: `${OUT}/${vp.name}-fractal.png` });
  results[`${vp.name}-fractal`] = await paletteReport(page);

  // follow mode
  await page.keyboard.press('1');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/${vp.name}-follow.png` });
  results[`${vp.name}-follow`] = await paletteReport(page);

  // overview mode
  await page.keyboard.press('2');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/${vp.name}-overview.png` });
  results[`${vp.name}-overview`] = await paletteReport(page);

  // debug on
  await page.keyboard.press('d');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/${vp.name}-debug.png` });
  const debugVisible = await page.locator('.ui-debug').isVisible();
  results[`${vp.name}-debugVisible`] = debugVisible;
  await page.keyboard.press('d');

  // back to fractal, sample two points in the cycle to confirm animation
  await page.keyboard.press('3');
  await page.waitForTimeout(400);
  const a = await paletteReport(page);
  await page.waitForTimeout(2500);
  const b = await paletteReport(page);
  results[`${vp.name}-animates`] =
    Math.abs(a.orangePct - b.orangePct) > 0.001 ||
    Math.abs(a.boundaryPct - b.boundaryPct) > 0.001 ||
    a.darkPct !== b.darkPct;

  await context.close();
}

await browser.close();

console.log('=== PALETTE REPORT ===');
console.log(JSON.stringify(results, null, 2));
console.log('=== CONSOLE ERRORS ===');
console.log(consoleErrors.length ? consoleErrors.join('\n') : '(none)');
console.log('=== FAILED REQUESTS ===');
console.log(failedRequests.length ? failedRequests.join('\n') : '(none)');

// exit non-zero if any core colour missing on the default fractal view across
// the desktop sizes (use the max, since a single phase can hide a colour)
const fract = [results['desktop-1440-fractal'], results['desktop-1280-fractal']];
const ov = results['desktop-1440-overview'];
const maxOf = (key) => Math.max(...fract.map((r) => (r ? r[key] : 0)), ov ? ov[key] : 0);
const problems = [];
if (maxOf('darkPct') < 20) problems.push('dark background too small');
if (maxOf('boundaryPct') < 0.03) problems.push('boundary not visible');
if (maxOf('orangePct') < 0.02) problems.push('orange loop not visible');
if (maxOf('redPct') < 0.01) problems.push('red axis not visible');
// console errors: ignore favicon 404 (harmless, no favicon shipped)
const realErrors = consoleErrors.filter((e) => !/favicon/i.test(e));
if (realErrors.length) problems.push('console errors present');
if (failedRequests.length) problems.push('failed requests present');
console.log('=== PROBLEMS ===');
console.log(problems.length ? problems.join('\n') : '(none)');
process.exit(problems.length ? 1 : 0);
