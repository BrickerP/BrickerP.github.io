import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateSync } from 'node:zlib';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const OUT = path.join(PUBLIC, 'programme');
const FILM_URL = process.env.URL ?? 'https://brickerp.github.io/beijing-loop/?qa=1';
const PREVIEW_ORIGIN = 'https://brickerp.github.io';

const PAPER = [0xec, 0xe5, 0xd8];
const INK = [0x13, 0x20, 0x2b];
const OXBLOOD = [0x9a, 0x3a, 0x2c];
const LEVELS = 4;

const COVER = { focusY: 0.5, lift: 1.8, gamma: 0.95, radius: 0.72 };
const FRAME = { width: 288, height: 180, cell: 3.2, focusY: 0.5, lift: 2.6, gamma: 1.15, radius: 0.64 };
const CIRCUIT_SECONDS = [0.4, 6, 9, 14, 18, 22, 26, 30, 34, 37.2, 41.8, 46.5];
const PLATES = [
  { file: 'cover-axis.png', seconds: 0.4, width: 1280, height: 560, cell: 8, ...COVER, focusY: 0.15 },
  { file: 'cover-qianmen.png', seconds: 41.8, width: 2080, height: 1120, cell: 9, ...COVER, focusY: 0.42, lift: 1.7, gamma: 0.9, radius: 0.74 },
  ...CIRCUIT_SECONDS.map((seconds, index) => ({
    file: `circuit-${String(index + 1).padStart(2, '0')}.png`,
    seconds,
    ...FRAME,
  })),
];

function palette() {
  const colors = [];
  for (let ink = 0; ink < LEVELS; ink += 1) {
    for (let ox = 0; ox < LEVELS; ox += 1) {
      const a = ink / (LEVELS - 1);
      const b = ox / (LEVELS - 1);
      colors.push(
        PAPER.map((paper, channel) =>
          Math.round(paper * (1 - a * (1 - INK[channel] / paper)) * (1 - b * (1 - OXBLOOD[channel] / paper))),
        ),
      );
    }
  }
  return colors;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, checksum]);
}

function encodeIndexedPng(indices, width, height) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 4;
  header[9] = 3;
  const rowBytes = Math.ceil(width / 2);
  const raw = Buffer.alloc((rowBytes + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (rowBytes + 1);
    for (let x = 0; x < width; x += 1) {
      const value = indices[y * width + x];
      raw[row + 1 + (x >> 1)] |= x % 2 === 0 ? value << 4 : value;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('PLTE', Buffer.from(palette().flat())),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function sampler(rgba, width, height) {
  return (x, y) => {
    const px = Math.min(width - 1, Math.max(0, Math.round(x)));
    const py = Math.min(height - 1, Math.max(0, Math.round(y)));
    const index = (py * width + px) * 4;
    return [rgba[index] / 255, rgba[index + 1] / 255, rgba[index + 2] / 255];
  };
}

function plateCoverage(width, height, { cell, degrees, shift, radius, amount }) {
  const angle = (degrees * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const cx = width / 2 + shift[0];
  const cy = height / 2 + shift[1];
  const reach = Math.ceil(Math.hypot(width, height) / 2 / cell) + 2;
  const side = reach * 2 + 1;
  const radii = new Float32Array(side * side);
  for (let j = -reach; j <= reach; j += 1) {
    for (let i = -reach; i <= reach; i += 1) {
      const x = cx + (i * cos - j * sin) * cell;
      const y = cy + (i * sin + j * cos) * cell;
      if (x < -cell || y < -cell || x > width + cell || y > height + cell) continue;
      const value = amount(x, y);
      radii[(j + reach) * side + (i + reach)] = value > 0.02 ? cell * radius * Math.sqrt(Math.min(1, value)) : 0;
    }
  }
  const coverage = new Uint8Array(width * height);
  for (let py = 0; py < height; py += 1) {
    for (let px = 0; px < width; px += 1) {
      const dx = px + 0.5 - cx;
      const dy = py + 0.5 - cy;
      const u = (dx * cos + dy * sin) / cell;
      const v = (-dx * sin + dy * cos) / cell;
      const i0 = Math.floor(u);
      const j0 = Math.floor(v);
      let best = 0;
      for (let j = j0; j <= j0 + 1; j += 1) {
        for (let i = i0; i <= i0 + 1; i += 1) {
          const r = radii[(j + reach) * side + (i + reach)];
          if (!r) continue;
          const distance = Math.hypot(u - i, v - j) * cell;
          best = Math.max(best, Math.min(1, Math.max(0, r - distance + 0.5)));
        }
      }
      coverage[py * width + px] = Math.round(best * (LEVELS - 1));
    }
  }
  return coverage;
}

function halftone(rgba, plate) {
  const { width, height, cell, lift, gamma, radius } = plate;
  const sample = sampler(rgba, width, height);
  const average = (x, y) => {
    const taps = [[0, 0], [-cell / 3, 0], [cell / 3, 0], [0, -cell / 3], [0, cell / 3]];
    const sum = [0, 0, 0];
    for (const [dx, dy] of taps) {
      const color = sample(x + dx, y + dy);
      for (let channel = 0; channel < 3; channel += 1) sum[channel] += color[channel] / taps.length;
    }
    return sum;
  };
  const ink = plateCoverage(width, height, {
    cell,
    degrees: 45,
    shift: [0, 0],
    radius,
    amount: (x, y) => {
      const [r, g, b] = average(x, y);
      return Math.pow(Math.max(0, 1 - (0.2126 * r + 0.7152 * g + 0.0722 * b) * lift), gamma);
    },
  });
  const oxblood = plateCoverage(width, height, {
    cell,
    degrees: 15,
    shift: [cell * 0.12, cell * 0.072],
    radius,
    amount: (x, y) => {
      const [r, g, b] = average(x, y);
      return (r - Math.max(g, b)) * 4.2 - 0.06;
    },
  });
  const indices = new Uint8Array(width * height);
  for (let index = 0; index < indices.length; index += 1) indices[index] = ink[index] * LEVELS + oxblood[index];
  return encodeIndexedPng(indices, width, height);
}

async function launch() {
  if (process.env.PW_CHANNEL) return chromium.launch({ channel: process.env.PW_CHANNEL });
  try {
    return await chromium.launch();
  } catch {
    return chromium.launch({ channel: 'chrome' });
  }
}

async function capturePlates(browser) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
  await page.goto(FILM_URL, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__BEIJING_LOOP_TEST__ && !document.querySelector('.boot'));
  await mkdir(OUT, { recursive: true });
  for (const plate of PLATES) {
    const pixels = await page.evaluate(({ seconds, width, height, focusY }) => {
      window.__BEIJING_LOOP_TEST__.seek(seconds);
      window.__BEIJING_LOOP_TEST__.redraw();
      const film = document.querySelector('canvas');
      const target = document.createElement('canvas');
      target.width = width;
      target.height = height;
      const context = target.getContext('2d', { willReadFrequently: true });
      context.imageSmoothingQuality = 'high';
      const scale = Math.max(width / film.width, height / film.height);
      const drawWidth = film.width * scale;
      const drawHeight = film.height * scale;
      context.drawImage(film, (width - drawWidth) / 2, (height - drawHeight) * focusY, drawWidth, drawHeight);
      const data = context.getImageData(0, 0, width, height).data;
      let binary = '';
      for (let index = 0; index < data.length; index += 0x8000) {
        binary += String.fromCharCode(...data.subarray(index, index + 0x8000));
      }
      return btoa(binary);
    }, plate);
    const png = halftone(new Uint8Array(Buffer.from(pixels, 'base64')), plate);
    await writeFile(path.join(OUT, plate.file), png);
    console.log(`${plate.file}: ${plate.width}×${plate.height}, ${png.length} bytes`);
  }
  await page.close();
}

async function captureProfilePreview(browser) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.route(`${PREVIEW_ORIGIN}/**`, async (route) => {
    const { pathname } = new URL(route.request().url());
    const file = path.join(PUBLIC, pathname.endsWith('/') ? `${pathname}index.html` : pathname);
    await route.fulfill({ body: await readFile(file), contentType: file.endsWith('.html') ? 'text/html' : undefined });
  });
  await page.goto(`${PREVIEW_ORIGIN}/about/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    const name = document.querySelector('.about-name');
    const bottom = name.getBoundingClientRect().bottom + window.scrollY;
    window.scrollTo(0, Math.max(0, bottom + 28 - window.innerHeight));
  });
  await page.screenshot({ path: path.join(PUBLIC, 'profile-preview.png') });
  await page.close();
  console.log('profile-preview.png: 1200×630');
}

const browser = await launch();
try {
  if (!process.argv.includes('--preview-only')) await capturePlates(browser);
  await captureProfilePreview(browser);
} finally {
  await browser.close();
}
