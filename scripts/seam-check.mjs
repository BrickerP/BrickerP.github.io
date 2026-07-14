// Seam check: sample the canvas across a full fractal cycle and confirm the
// frame-to-frame difference has no spike at the phase 1->0 wrap. The whole
// scene is a function of one continuous clock, so a seam would show as a
// large mean-abs-diff between two adjacent frames straddling the wrap.
import { chromium } from 'playwright';

const URL = process.env.URL || 'http://localhost:5173/';
const browser = await chromium.launch(
  process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {},
);
const page = await browser.newPage({ viewport: { width: 900, height: 640 } });
await page.goto(URL, { waitUntil: 'networkidle' });

// force fractal mode, ensure playing
await page.keyboard.press('3');
await page.waitForTimeout(500);

async function grab() {
  return await page.evaluate(() => {
    const c = document.querySelector('canvas');
    const off = document.createElement('canvas');
    off.width = 300;
    off.height = Math.round((c.height / c.width) * 300);
    const ctx = off.getContext('2d');
    ctx.drawImage(c, 0, 0, off.width, off.height);
    return Array.from(ctx.getImageData(0, 0, off.width, off.height).data);
  });
}
function mad(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i += 4) {
    s += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
  }
  return s / ((a.length / 4) * 3);
}

// sample ~1 frame every 150ms for ~13s (> one 12s cycle)
const frames = [];
const times = [];
const t0 = Date.now();
while (Date.now() - t0 < 13000) {
  frames.push(await grab());
  times.push((Date.now() - t0) / 1000);
  await page.waitForTimeout(150);
}

const diffs = [];
for (let i = 1; i < frames.length; i++) diffs.push(mad(frames[i - 1], frames[i]));
const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length;
const max = Math.max(...diffs);
const maxIdx = diffs.indexOf(max);
const sorted = [...diffs].sort((a, b) => a - b);
const median = sorted[Math.floor(sorted.length / 2)];

console.log(`frames=${frames.length} meanDiff=${mean.toFixed(3)} median=${median.toFixed(3)} max=${max.toFixed(3)} at t=${times[maxIdx + 1].toFixed(2)}s`);
console.log(`max/median ratio=${(max / median).toFixed(2)} (a hard seam would spike this >> normal motion)`);

// A seamless loop: the max frame diff should be within a small multiple of
// the median (normal per-frame motion). A jump/flash/black frame would make
// max hugely larger than median.
const ratio = max / median;
await browser.close();
if (ratio > 4.5) {
  console.log('SEAM SUSPECTED: frame-diff spike detected');
  process.exit(1);
}
console.log('SEAM OK: no abnormal frame-diff spike across the cycle');
