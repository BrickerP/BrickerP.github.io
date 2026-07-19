import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const URL = process.env.URL || 'http://127.0.0.1:5173/';
const OUT = 'docs/verify';
const LOOP_SECONDS = 48;
const REDUCED_POSTER_PHASE = 0.53 / 48;
mkdirSync(OUT, { recursive: true });

const EBML_ID = 0x1a45dfa3;
const SEGMENT_ID = 0x18538067;
const CLUSTER_ID = 0x1f43b675;
const TIMECODE_SCALE_ID = 0x2ad7b1;
const CLUSTER_TIMECODE_ID = 0xe7;
const SIMPLE_BLOCK_ID = 0xa3;
const BLOCK_GROUP_ID = 0xa0;
const BLOCK_ID = 0xa1;
const CLUSTER_SIGNATURE = Buffer.from([0x1f, 0x43, 0xb6, 0x75]);
const SEGMENT_SIGNATURE = Buffer.from([0x18, 0x53, 0x80, 0x67]);
const TIMECODE_SCALE_SIGNATURE = Buffer.from([0x2a, 0xd7, 0xb1]);

/** Read an EBML variable-length integer without relying on a media library. */
function readEbmlVint(bytes, offset, preserveMarker) {
  assert.ok(offset >= 0 && offset < bytes.length, `EBML VINT offset ${offset} is out of range`);
  const first = bytes[offset];
  assert.notEqual(first, 0, `invalid EBML VINT at byte ${offset}`);

  let length = 1;
  let marker = 0x80;
  while ((first & marker) === 0) {
    marker >>= 1;
    length += 1;
  }
  assert.ok(length <= 8, `invalid EBML VINT length ${length} at byte ${offset}`);
  assert.ok(offset + length <= bytes.length, `truncated EBML VINT at byte ${offset}`);

  let value = BigInt(preserveMarker ? first : first & (marker - 1));
  for (let index = 1; index < length; index += 1) {
    value = (value << 8n) | BigInt(bytes[offset + index]);
  }
  const unknown =
    !preserveMarker && value === (1n << BigInt(length * 7)) - 1n;
  assert.ok(
    unknown || value <= BigInt(Number.MAX_SAFE_INTEGER),
    `EBML VINT at byte ${offset} exceeds Number.MAX_SAFE_INTEGER`,
  );
  return { length, value: unknown ? null : Number(value), unknown };
}

function readEbmlElement(bytes, offset, limit = bytes.length) {
  assert.ok(offset < limit, `missing EBML element at byte ${offset}`);
  const id = readEbmlVint(bytes, offset, true);
  assert.ok(id.length <= 4, `invalid EBML element ID length ${id.length} at byte ${offset}`);
  const size = readEbmlVint(bytes, offset + id.length, false);
  const dataStart = offset + id.length + size.length;
  const dataEnd = size.unknown ? limit : dataStart + size.value;
  assert.ok(dataStart <= limit, `truncated EBML element header at byte ${offset}`);
  assert.ok(dataEnd <= limit, `EBML element 0x${id.value.toString(16)} overruns its parent`);
  return {
    id: id.value,
    start: offset,
    dataStart,
    dataEnd,
    unknownSize: size.unknown,
  };
}

function readEbmlUnsigned(bytes, start, end) {
  assert.ok(end > start && end - start <= 8, `invalid EBML unsigned integer at byte ${start}`);
  let value = 0n;
  for (let offset = start; offset < end; offset += 1) {
    value = (value << 8n) | BigInt(bytes[offset]);
  }
  assert.ok(value <= BigInt(Number.MAX_SAFE_INTEGER), `EBML integer at byte ${start} is too large`);
  return Number(value);
}

function parseBlockTimestamp(bytes, block, clusterTimecode) {
  const track = readEbmlVint(bytes, block.dataStart, false);
  const timecodeOffset = block.dataStart + track.length;
  assert.ok(timecodeOffset + 3 <= block.dataEnd, `truncated WebM block at byte ${block.start}`);
  const unsignedTimecode = bytes.readUInt16BE(timecodeOffset);
  const relativeTimecode =
    unsignedTimecode & 0x8000 ? unsignedTimecode - 0x1_0000 : unsignedTimecode;
  const flags = bytes[timecodeOffset + 2];
  const lacing = (flags & 0x06) >> 1;
  return {
    track: track.value,
    timecode: clusterTimecode + relativeTimecode,
    lacing,
  };
}

function collectBlockGroup(bytes, group, clusterTimecode, blocks) {
  let cursor = group.dataStart;
  while (cursor < group.dataEnd) {
    const child = readEbmlElement(bytes, cursor, group.dataEnd);
    if (child.id === BLOCK_ID) blocks.push(parseBlockTimestamp(bytes, child, clusterTimecode));
    assert.ok(child.dataEnd > cursor, `zero-length BlockGroup child at byte ${cursor}`);
    cursor = child.dataEnd;
  }
}

function clusterLooksValid(bytes, offset) {
  try {
    const cluster = readEbmlElement(bytes, offset);
    if (cluster.id !== CLUSTER_ID) return false;
    const probeEnd = Math.min(cluster.dataEnd, cluster.dataStart + 4096);
    let cursor = cluster.dataStart;
    for (let elements = 0; cursor < probeEnd && elements < 12; elements += 1) {
      const child = readEbmlElement(bytes, cursor, cluster.dataEnd);
      if (child.id === CLUSTER_TIMECODE_ID) return true;
      if (child.dataEnd <= cursor) return false;
      cursor = child.dataEnd;
    }
  } catch {
    return false;
  }
  return false;
}

function findNextCluster(bytes, from) {
  let offset = bytes.indexOf(CLUSTER_SIGNATURE, from);
  while (offset >= 0) {
    if (clusterLooksValid(bytes, offset)) return offset;
    offset = bytes.indexOf(CLUSTER_SIGNATURE, offset + 1);
  }
  return -1;
}

/**
 * Parse the downloaded WebM's real block timeline. Chrome currently writes a
 * placeholder Info/Duration for MediaRecorder output, so the regression uses
 * Cluster timecodes and SimpleBlock/Block timestamps instead of that field.
 */
function parseWebmTimeline(bytes) {
  assert.ok(Buffer.isBuffer(bytes), 'downloaded recording was not read as bytes');
  assert.ok(bytes.length > 1024, `downloaded recording is implausibly small (${bytes.length} bytes)`);

  const header = readEbmlElement(bytes, 0);
  assert.equal(header.id, EBML_ID, 'download does not begin with an EBML header');
  assert.notEqual(bytes.indexOf(Buffer.from('webm'), header.dataStart), -1, 'EBML DocType is not WebM');

  const segmentOffset = bytes.indexOf(SEGMENT_SIGNATURE, header.dataEnd);
  assert.ok(segmentOffset >= header.dataEnd, 'WebM Segment element is missing');
  const segment = readEbmlElement(bytes, segmentOffset);
  assert.equal(segment.id, SEGMENT_ID, 'invalid WebM Segment element');

  const firstClusterOffset = findNextCluster(bytes, segment.dataStart);
  assert.ok(firstClusterOffset >= 0, 'WebM contains no valid Cluster');

  let timecodeScaleNs = 1_000_000;
  const timecodeScaleOffset = bytes.indexOf(
    TIMECODE_SCALE_SIGNATURE,
    segment.dataStart,
  );
  if (timecodeScaleOffset >= 0 && timecodeScaleOffset < firstClusterOffset) {
    const timecodeScale = readEbmlElement(bytes, timecodeScaleOffset, firstClusterOffset);
    assert.equal(timecodeScale.id, TIMECODE_SCALE_ID, 'invalid WebM TimecodeScale element');
    timecodeScaleNs = readEbmlUnsigned(bytes, timecodeScale.dataStart, timecodeScale.dataEnd);
  }
  assert.ok(
    timecodeScaleNs >= 1_000 && timecodeScaleNs <= 1_000_000_000,
    `implausible WebM TimecodeScale ${timecodeScaleNs}ns`,
  );

  const blocks = [];
  let clusterCount = 0;
  let clusterOffset = firstClusterOffset;
  while (clusterOffset >= 0) {
    const cluster = readEbmlElement(bytes, clusterOffset);
    assert.equal(cluster.id, CLUSTER_ID, `invalid Cluster at byte ${clusterOffset}`);
    const nextClusterOffset = findNextCluster(bytes, cluster.dataStart);
    const clusterEnd = cluster.unknownSize
      ? nextClusterOffset >= 0
        ? nextClusterOffset
        : bytes.length
      : cluster.dataEnd;

    let clusterTimecode = null;
    let cursor = cluster.dataStart;
    while (cursor < clusterEnd) {
      const child = readEbmlElement(bytes, cursor, clusterEnd);
      if (child.id === CLUSTER_TIMECODE_ID) {
        clusterTimecode = readEbmlUnsigned(bytes, child.dataStart, child.dataEnd);
      } else if (child.id === SIMPLE_BLOCK_ID) {
        assert.notEqual(clusterTimecode, null, `SimpleBlock precedes Cluster timecode at byte ${cursor}`);
        blocks.push(parseBlockTimestamp(bytes, child, clusterTimecode));
      } else if (child.id === BLOCK_GROUP_ID) {
        assert.notEqual(clusterTimecode, null, `BlockGroup precedes Cluster timecode at byte ${cursor}`);
        collectBlockGroup(bytes, child, clusterTimecode, blocks);
      }
      assert.ok(child.dataEnd > cursor, `zero-length Cluster child at byte ${cursor}`);
      cursor = child.dataEnd;
    }
    assert.notEqual(clusterTimecode, null, `Cluster at byte ${clusterOffset} has no timecode`);
    clusterCount += 1;

    const searchFrom = cluster.unknownSize ? clusterEnd : cluster.dataEnd;
    clusterOffset = findNextCluster(bytes, searchFrom);
  }

  assert.ok(blocks.length > 1, `WebM contains too few media blocks (${blocks.length})`);
  assert.deepEqual(
    [...new Set(blocks.map(({ track }) => track))],
    [1],
    'canvas recording should contain exactly video track 1',
  );
  assert.equal(
    blocks.filter(({ lacing }) => lacing !== 0).length,
    0,
    'laced video blocks are not supported by this frame-count regression',
  );

  const timestamps = blocks.map(({ timecode }) => timecode);
  for (let index = 1; index < timestamps.length; index += 1) {
    assert.ok(
      timestamps[index] >= timestamps[index - 1],
      `WebM block timecode regressed at block ${index}`,
    );
  }
  const secondsPerTick = timecodeScaleNs / 1_000_000_000;
  const firstTimestampSeconds = timestamps[0] * secondsPerTick;
  const lastTimestampSeconds = timestamps.at(-1) * secondsPerTick;
  const timelineSeconds = lastTimestampSeconds - firstTimestampSeconds;
  const averageFps = (blocks.length - 1) / timelineSeconds;
  return {
    bytes: bytes.length,
    clusterCount,
    blockCount: blocks.length,
    timecodeScaleNs,
    firstTimestampSeconds,
    lastTimestampSeconds,
    timelineSeconds,
    averageFps,
  };
}

const viewports = [
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'desktop-1280', width: 1280, height: 720 },
  { name: 'mobile-390', width: 390, height: 844, mobile: true },
  { name: 'mobile-360', width: 360, height: 800, mobile: true },
  { name: 'mobile-320', width: 320, height: 568, mobile: true },
];

const passages = [
  { name: 'central-axis', seconds: 0.4 },
  { name: 'palace-moat', seconds: 6 },
  { name: 'shichahai', seconds: 9 },
  { name: 'deshengmen', seconds: 14 },
  { name: 'olympic', seconds: 18 },
  { name: 'bell-drum', seconds: 22 },
  { name: 'nanluo-wudaoying', seconds: 26 },
  { name: 'yonghegong', seconds: 30 },
  { name: 'cbd-finance', seconds: 34 },
  { name: 'temple-of-heaven', seconds: 37.2 },
  { name: 'qianmen-hutong', seconds: 41.8 },
  { name: 'overpass', seconds: 47 },
];

const SMALL_TEXT_MIN_CONTRAST = 4.5;
const smallTextSelectors = [
  { name: 'eyebrow', selector: '.ui-eyebrow' },
  { name: 'eyebrow detail', selector: '.ui-eyebrow span' },
  { name: 'subtitle', selector: '.ui-sub' },
  { name: 'footer', selector: '.ui-footer' },
];

function parseCssColor(value, label) {
  const color = value.trim();
  const hex = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const expanded =
      hex[1].length === 3
        ? [...hex[1]].map((channel) => `${channel}${channel}`).join('')
        : hex[1];
    return {
      red: Number.parseInt(expanded.slice(0, 2), 16),
      green: Number.parseInt(expanded.slice(2, 4), 16),
      blue: Number.parseInt(expanded.slice(4, 6), 16),
      alpha: 1,
    };
  }

  const rgb = color.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i);
  assert.ok(rgb, `${label}: unsupported computed color ${JSON.stringify(value)}`);
  const alpha = rgb[4]?.endsWith('%')
    ? Number.parseFloat(rgb[4]) / 100
    : Number.parseFloat(rgb[4] ?? '1');
  return {
    red: Number.parseFloat(rgb[1]),
    green: Number.parseFloat(rgb[2]),
    blue: Number.parseFloat(rgb[3]),
    alpha,
  };
}

function compositeColor(foreground, background) {
  const inverseAlpha = 1 - foreground.alpha;
  return {
    red: foreground.red * foreground.alpha + background.red * inverseAlpha,
    green: foreground.green * foreground.alpha + background.green * inverseAlpha,
    blue: foreground.blue * foreground.alpha + background.blue * inverseAlpha,
    alpha: 1,
  };
}

function relativeLuminance(color) {
  const linear = (channel) => {
    const srgb = channel / 255;
    return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  };
  return linear(color.red) * 0.2126 + linear(color.green) * 0.7152 + linear(color.blue) * 0.0722;
}

function contrastRatio(foreground, background) {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  return (
    (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
  );
}

async function smallTextContrastReport(page, label) {
  const computed = await page.evaluate((checks) => {
    const sky = getComputedStyle(document.documentElement).getPropertyValue('--sky').trim();
    return checks.map(({ name, selector }) => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) {
        return { name, selector, missing: true, visible: false, color: '', sky };
      }
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const clippedToOnePixel =
        rect.width <= 1 &&
        rect.height <= 1 &&
        style.overflow === 'hidden' &&
        style.clip !== 'auto';
      const visible =
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        Number(style.opacity) > 0 &&
        rect.width > 0 &&
        rect.height > 0 &&
        !clippedToOnePixel;
      return { name, selector, missing: false, visible, color: style.color, sky };
    });
  }, smallTextSelectors);

  const checked = [];
  for (const item of computed) {
    assert.equal(item.missing, false, `${label}: missing small-text element ${item.selector}`);
    if (!item.visible) continue;
    const sky = parseCssColor(item.sky, `${label}/${item.name} background`);
    const text = compositeColor(parseCssColor(item.color, `${label}/${item.name}`), sky);
    const ratio = contrastRatio(text, sky);
    assert.ok(
      ratio >= SMALL_TEXT_MIN_CONTRAST,
      `${label}: ${item.name} contrast ${ratio.toFixed(3)}:1 is below ${SMALL_TEXT_MIN_CONTRAST}:1 ` +
        `(computed ${item.color} over --sky ${item.sky})`,
    );
    checked.push({ name: item.name, color: item.color, sky: item.sky, ratio });
  }
  return checked;
}

async function launchBrowser() {
  const args = process.env.SOFTWARE_WEBGL === '1'
    ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
    : [];
  if (process.env.PW_CHANNEL) return chromium.launch({ channel: process.env.PW_CHANNEL, args });
  try {
    return await chromium.launch({ args });
  } catch {
    return chromium.launch({ channel: 'chrome', args });
  }
}

async function readStartupSnapshot(page) {
  return page.evaluate(() => {
    const boot = document.querySelector('.boot');
    const bootError = document.querySelector('.boot.error');
    const canvas = document.querySelector('canvas');
    const hook = window.__BEIJING_LOOP_TEST__;
    let qaState = null;
    let qaStateCause = null;
    if (hook) {
      try {
        const state = hook.readState();
        qaState = {
          progress: state.progress,
          phase: state.phase,
          angle: state.angle,
          playing: state.playing,
          finite: [state.progress, state.phase, state.angle].every(Number.isFinite),
        };
      } catch (cause) {
        qaStateCause = cause instanceof Error
          ? `${cause.name}: ${cause.message}`
          : String(cause);
      }
    }
    const canvasSnapshot = canvas instanceof HTMLCanvasElement
      ? (() => {
          const rect = canvas.getBoundingClientRect();
          const style = getComputedStyle(canvas);
          const clientRects = canvas.getClientRects().length;
          const ready =
            clientRects > 0 &&
            Number.isFinite(rect.width) &&
            Number.isFinite(rect.height) &&
            rect.width > 0 &&
            rect.height > 0 &&
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.visibility !== 'collapse' &&
            Number(style.opacity) > 0 &&
            canvas.width > 0 &&
            canvas.height > 0;
          return {
            ready,
            rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
            style: {
              display: style.display,
              visibility: style.visibility,
              opacity: style.opacity,
            },
            backing: { width: canvas.width, height: canvas.height },
            clientRects,
          };
        })()
      : null;

    return {
      readyState: document.readyState,
      bootClass: boot?.getAttribute('class') ?? null,
      bootText: (boot?.textContent ?? '').trim(),
      bootError: bootError
        ? { text: (bootError.textContent ?? '').trim() }
        : null,
      canvasCount: document.querySelectorAll('canvas').length,
      canvas: canvasSnapshot,
      hook: Boolean(hook),
      qaState,
      qaStateCause,
      body: (document.body?.innerText ?? '').slice(0, 1000),
    };
  });
}

function describeCause(cause) {
  return cause instanceof Error
    ? `${cause.name}: ${cause.message}`
    : String(cause);
}

function isRetryableStartupEvaluationError(cause) {
  return /execution context was destroyed|cannot find context with specified id|most likely because of a navigation/i
    .test(describeCause(cause));
}

async function waitForExperience(
  page,
  label = 'experience',
  runtimeErrors = [],
  { suppressScreenshot = false } = {},
) {
  const deadline = performance.now() + 30_000;
  let lastSnapshot = null;
  let lastEvaluateCause = null;
  try {
    await page.goto(URL, {
      waitUntil: 'networkidle',
      timeout: Math.max(1, Math.ceil(deadline - performance.now())),
    });

    const expectedUrl = new globalThis.URL(URL);
    const actualUrl = new globalThis.URL(page.url());
    if (
      actualUrl.origin !== expectedUrl.origin ||
      actualUrl.pathname !== expectedUrl.pathname ||
      actualUrl.search !== expectedUrl.search
    ) {
      throw new Error(`${label}: unexpected startup URL ${actualUrl.href}`);
    }

    while (performance.now() < deadline) {
      try {
        lastSnapshot = await readStartupSnapshot(page);
      } catch (cause) {
        lastEvaluateCause = describeCause(cause);
        if (page.isClosed() || !isRetryableStartupEvaluationError(cause)) throw cause;
      }

      if (lastSnapshot?.bootError) {
        throw new Error(
          `${label}: boot error: ${lastSnapshot.bootError.text || '(empty boot error)'}`,
        );
      }
      if (
        lastSnapshot?.hook &&
        lastSnapshot.qaState?.finite &&
        lastSnapshot.canvasCount === 1 &&
        lastSnapshot.canvas?.ready
      ) return;

      const remainingMs = deadline - performance.now();
      if (remainingMs <= 0) break;
      await new Promise((resolve) => setTimeout(resolve, Math.min(100, remainingMs)));
    }

    throw new Error(`${label}: semantic startup state was not ready within 30000ms`);
  } catch (cause) {
    const inspect = async (callback, fallback) => {
      try {
        return await callback();
      } catch {
        return fallback;
      }
    };
    const safeLabel = label.replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '') || 'experience';
    if (!lastSnapshot) {
      try {
        lastSnapshot = await readStartupSnapshot(page);
      } catch (diagnosticCause) {
        lastEvaluateCause = describeCause(diagnosticCause);
      }
    }
    const diagnostics = {
      label,
      url: page.url(),
      snapshot: lastSnapshot,
      evaluateCause: lastEvaluateCause,
      runtimeErrors: runtimeErrors.filter((entry) => entry.startsWith(`[${label}]`)),
    };
    if (!suppressScreenshot) {
      await inspect(
        () => page.screenshot({ path: `${OUT}/${safeLabel}-startup-failure.png`, fullPage: true }),
        undefined,
      );
    }
    throw new Error(
      `${label}: startup failed: ${cause instanceof Error ? cause.message : String(cause)}\n` +
        `diagnostics=${JSON.stringify(diagnostics)}`,
      { cause },
    );
  }
}

assert.doesNotMatch(
  `${readStartupSnapshot.toString()}\n${waitForExperience.toString()}`,
  /\.waitFor(?:Selector|Function)\s*\(/,
  'startup helper must use Node-driven semantic snapshots instead of Playwright selector polling',
);

async function waitForLiveMessage(page, regex, options = {}) {
  const pattern = { source: regex.source, flags: regex.flags };
  await page.waitForFunction(
    ({ source, flags }) => {
      const liveRegion = document.querySelector('[data-ui-live]');
      return new RegExp(source, flags).test(liveRegion?.textContent ?? '');
    },
    pattern,
    options,
  );
  return (await page.locator('[data-ui-live]').textContent()) ?? '';
}

async function seek(page, seconds) {
  await page.evaluate((time) => window.__BEIJING_LOOP_TEST__.seek(time), seconds);
  await page.waitForTimeout(20);
}

async function canvasReport(page) {
  const screenshot = await page.locator('canvas').screenshot({ type: 'png' });
  return page.evaluate(async (encoded) => {
    const image = new Image();
    image.src = `data:image/png;base64,${encoded}`;
    await image.decode();
    const sample = document.createElement('canvas');
    sample.width = Math.min(360, image.naturalWidth);
    sample.height = Math.max(
      1,
      Math.round((image.naturalHeight / image.naturalWidth) * sample.width),
    );
    const context = sample.getContext('2d', { willReadFrequently: true });
    if (!context) return { error: 'missing 2d sample context' };
    context.drawImage(image, 0, 0, sample.width, sample.height);
    const data = context.getImageData(0, 0, sample.width, sample.height).data;

    let sum = 0;
    let sumSquares = 0;
    let blueHour = 0;
    let vermilion = 0;
    let warm = 0;
    let bright = 0;
    let black = 0;
    let opaque = 0;
    let lowerCentrePixels = 0;
    let road = 0;
    let horizonPixels = 0;
    let horizonSignal = 0;

    for (let y = 0; y < sample.height; y += 1) {
      for (let x = 0; x < sample.width; x += 1) {
        const index = (y * sample.width + x) * 4;
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        const a = data[index + 3];
        const luminance = r * 0.2126 + g * 0.7152 + b * 0.0722;
        sum += luminance;
        sumSquares += luminance * luminance;
        if (b > r * 1.18 && b > g * 1.06 && b - r > 8) blueHour += 1;
        if (r > 72 && r > g * 1.28 && r > b * 1.25) vermilion += 1;
        // Warm ivory/amber survives filmic tone mapping with less red/green
        // separation than its source hex, so key this signal against blue.
        if (r > 150 && g > 105 && b > 65 && b < r * 0.92 && r > b * 1.08) warm += 1;
        if (luminance > 90) bright += 1;
        if (luminance < 4) black += 1;
        if (a > 250) opaque += 1;

        const inLowerCentre =
          x >= sample.width * 0.27 &&
          x <= sample.width * 0.73 &&
          y >= sample.height * 0.59 &&
          y <= sample.height * 0.98;
        if (inLowerCentre) {
          lowerCentrePixels += 1;
          const channelSpread = Math.max(r, g, b) - Math.min(r, g, b);
          if (luminance < 78 && channelSpread < 42) road += 1;
        }

        const inHorizon =
          x >= sample.width * 0.18 &&
          x <= sample.width * 0.82 &&
          y >= sample.height * 0.25 &&
          y <= sample.height * 0.59;
        if (inHorizon) {
          horizonPixels += 1;
          if (b > r * 1.12 && b > g * 1.025 && b - r > 6) horizonSignal += 1;
        }
      }
    }

    const pixels = data.length / 4;
    const mean = sum / pixels;
    return {
      width: sample.width,
      height: sample.height,
      mean,
      variance: sumSquares / pixels - mean * mean,
      blueHourPct: (blueHour / pixels) * 100,
      vermilionPct: (vermilion / pixels) * 100,
      warmPct: (warm / pixels) * 100,
      brightPct: (bright / pixels) * 100,
      blackPct: (black / pixels) * 100,
      opaquePct: (opaque / pixels) * 100,
      roadPct: (road / Math.max(1, lowerCentrePixels)) * 100,
      horizonPct: (horizonSignal / Math.max(1, horizonPixels)) * 100,
    };
  }, screenshot.toString('base64'));
}

function overlapArea(left, right) {
  const width = Math.max(
    0,
    Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x),
  );
  const height = Math.max(
    0,
    Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y),
  );
  return width * height;
}

async function visibleOverlayBoxes(page) {
  return page.evaluate(() => {
    const selectors = ['.ui-brand', '.ui-actions', '.ui-footer', '.ui-rec', '.ui-debug'];
    return selectors.flatMap((selector) => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) return [];
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        Number(style.opacity) === 0 ||
        rect.width * rect.height <= 4
      ) {
        return [];
      }
      return [{ selector, x: rect.x, y: rect.y, width: rect.width, height: rect.height }];
    });
  });
}

function assertOverlaySafety(boxes, viewport, label) {
  for (const box of boxes) {
    assert.ok(box.x >= -0.5, `${label}: ${box.selector} leaves the left edge`);
    assert.ok(box.y >= -0.5, `${label}: ${box.selector} leaves the top edge`);
    assert.ok(
      box.x + box.width <= viewport.width + 0.5,
      `${label}: ${box.selector} leaves the right edge`,
    );
    assert.ok(
      box.y + box.height <= viewport.height + 0.5,
      `${label}: ${box.selector} leaves the bottom edge`,
    );
  }
  for (let left = 0; left < boxes.length; left += 1) {
    for (let right = left + 1; right < boxes.length; right += 1) {
      assert.equal(
        overlapArea(boxes[left], boxes[right]),
        0,
        `${label}: ${boxes[left].selector} overlaps ${boxes[right].selector}`,
      );
    }
  }

  const vanishingPointZone = {
    x: viewport.width * 0.35,
    y: viewport.height * 0.3,
    width: viewport.width * 0.3,
    height: viewport.height * 0.3,
  };
  for (const box of boxes.filter((item) => item.selector !== '.ui-debug')) {
    assert.equal(
      overlapArea(box, vanishingPointZone),
      0,
      `${label}: ${box.selector} covers the forward vanishing-point zone`,
    );
  }
}

function assertFirstPersonFrame(report, label) {
  assert.ok(!('error' in report), `${label}: canvas capture failed`);
  assert.ok(report.opaquePct > 99, `${label}: canvas is unexpectedly transparent`);
  assert.ok(report.mean > 5 && report.mean < 150, `${label}: implausible scene luminance`);
  assert.ok(report.variance > 18, `${label}: scene is blank or nearly flat`);
  assert.ok(report.blueHourPct > 3, `${label}: Beijing blue-hour palette is missing`);
  assert.ok(report.horizonPct > 3, `${label}: forward horizon signal is missing`);
  assert.ok(report.roadPct > 14, `${label}: lower-centre road corridor is not legible`);
}

function attachRuntimeDiagnostics(page, label, errors) {
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`[${label}] console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`[${label}] page: ${error.message}`));
  page.on('requestfailed', (request) =>
    errors.push(`[${label}] request: ${request.url()} ${request.failure()?.errorText}`),
  );
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`[${label}] ${response.status()} ${response.url()}`);
  });
}

async function runG003FocusedBrowserRegressions() {
  const focusedCase = process.env.G003_BROWSER_CASE ?? 'all';
  const focusedBrowser = await launchBrowser();
  try {
    const runtimeErrors = [];
    const lowFpsContext = await focusedBrowser.newContext({
      viewport: { width: 900, height: 640 },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
    });
    await lowFpsContext.addInitScript(() => {
      let nextFrameId = 1;
      let virtualNow = 0;
      let documentHidden = false;
      const callbacks = new Map();

      Object.defineProperty(performance, 'now', {
        configurable: true,
        value: () => virtualNow,
      });
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: () => documentHidden,
      });
      window.requestAnimationFrame = (callback) => {
        const id = nextFrameId;
        nextFrameId += 1;
        callbacks.set(id, callback);
        return id;
      };
      window.cancelAnimationFrame = (id) => callbacks.delete(id);
      window.__G003_VIRTUAL_RAF__ = {
        step(milliseconds) {
          virtualNow += milliseconds;
          const pending = [...callbacks.values()];
          callbacks.clear();
          for (const callback of pending) callback(virtualNow);
          return pending.length;
        },
        advance(milliseconds) {
          virtualNow += milliseconds;
        },
        setHidden(hidden) {
          documentHidden = hidden;
          document.dispatchEvent(new Event('visibilitychange'));
        },
      };
    });
    const lowFpsPage = await lowFpsContext.newPage();
    attachRuntimeDiagnostics(lowFpsPage, 'g003-low-fps', runtimeErrors);
    await waitForExperience(lowFpsPage, 'g003-low-fps', runtimeErrors);

    const runVisibleFrame = async (milliseconds) => {
      await seek(lowFpsPage, 0);
      await lowFpsPage.locator('[data-act="play"]').click();
      const before = await lowFpsPage.evaluate(
        () => window.__BEIJING_LOOP_TEST__.readState().progress,
      );
      const callbackCount = await lowFpsPage.evaluate(
        (elapsed) => window.__G003_VIRTUAL_RAF__.step(elapsed),
        milliseconds,
      );
      const after = await lowFpsPage.evaluate(
        () => window.__BEIJING_LOOP_TEST__.readState().progress,
      );
      return {
        callbackCount,
        sceneAdvance: ((after - before + 1) % 1) * LOOP_SECONDS,
      };
    };

    const visible2500ms = await runVisibleFrame(2500);
    const visible6000ms = await runVisibleFrame(6000);
    const suspension12000ms = await runVisibleFrame(12000);
    const postSuspension100ms = await lowFpsPage.evaluate(() => {
      const before = window.__BEIJING_LOOP_TEST__.readState().progress;
      const callbackCount = window.__G003_VIRTUAL_RAF__.step(100);
      const after = window.__BEIJING_LOOP_TEST__.readState().progress;
      return { before, after, callbackCount };
    });
    const postSuspensionAdvance =
      ((postSuspension100ms.after - postSuspension100ms.before + 1) % 1) * LOOP_SECONDS;

    await seek(lowFpsPage, 0);
    await lowFpsPage.locator('[data-act="play"]').click();
    const visibilityReturn = await lowFpsPage.evaluate(() => {
      window.__G003_VIRTUAL_RAF__.setHidden(true);
      const before = window.__BEIJING_LOOP_TEST__.readState().progress;
      window.__G003_VIRTUAL_RAF__.advance(6000);
      window.__G003_VIRTUAL_RAF__.setHidden(false);
      const callbackCount = window.__G003_VIRTUAL_RAF__.step(100);
      const after = window.__BEIJING_LOOP_TEST__.readState().progress;
      return { before, after, callbackCount };
    });
    const visibilityReturnAdvance =
      ((visibilityReturn.after - visibilityReturn.before + 1) % 1) * LOOP_SECONDS;
    const cadenceReport = {
      visible2500ms,
      visible6000ms,
      suspension12000ms,
      postSuspension100ms: {
        callbackCount: postSuspension100ms.callbackCount,
        sceneAdvance: postSuspensionAdvance,
      },
      visibilityReturn100ms: {
        callbackCount: visibilityReturn.callbackCount,
        sceneAdvance: visibilityReturnAdvance,
      },
    };
    console.log('=== G003 VIRTUAL RAF CADENCE ===');
    console.log(JSON.stringify(cadenceReport, null, 2));

    if (focusedCase === 'all' || focusedCase === 'low-fps') {
      assert.equal(visible2500ms.callbackCount, 1, '2.5s case did not execute exactly one frame');
      assert.ok(
        Math.abs(visible2500ms.sceneAdvance - 2.5) < 0.001,
        `visible 2.5s frame advanced ${visible2500ms.sceneAdvance.toFixed(3)}s`,
      );
      assert.equal(visible6000ms.callbackCount, 1, '6s case did not execute exactly one frame');
      assert.ok(
        Math.abs(visible6000ms.sceneAdvance - 6) < 0.001,
        `visible 6s frame advanced ${visible6000ms.sceneAdvance.toFixed(3)}s`,
      );
      assert.equal(
        suspension12000ms.callbackCount,
        1,
        '12s suspension case did not execute exactly one frame',
      );
      assert.ok(
        suspension12000ms.sceneAdvance < 0.001,
        `12s suspension advanced ${suspension12000ms.sceneAdvance.toFixed(3)}s`,
      );
      assert.equal(
        postSuspension100ms.callbackCount,
        1,
        'post-suspension case did not execute exactly one frame',
      );
      assert.ok(
        Math.abs(postSuspensionAdvance - 0.1) < 0.001,
        `post-suspension 0.1s frame advanced ${postSuspensionAdvance.toFixed(3)}s`,
      );
    }
    if (focusedCase === 'all' || focusedCase === 'visibility') {
      assert.equal(
        visibilityReturn.callbackCount,
        1,
        'visibility-return case did not execute exactly one frame',
      );
      assert.ok(
        Math.abs(visibilityReturnAdvance - 0.1) < 0.001,
        `visibility return 0.1s frame advanced ${visibilityReturnAdvance.toFixed(3)}s`,
      );
    }
    await lowFpsContext.close();

    const posterContext = await focusedBrowser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
      reducedMotion: 'reduce',
    });
    const posterPage = await posterContext.newPage();
    attachRuntimeDiagnostics(posterPage, 'g003-reduced-poster', runtimeErrors);
    await waitForExperience(posterPage, 'g003-reduced-poster', runtimeErrors);
    const posterReport = await canvasReport(posterPage);
    if (focusedCase === 'all' || focusedCase === 'poster') {
      assertFirstPersonFrame(posterReport, 'reduced-motion portrait poster');
      const intentionallyFramed = posterReport.blackPct < 55;
      assert.ok(
        intentionallyFramed,
        `reduced-motion portrait poster is predominantly black: ${posterReport.blackPct.toFixed(3)}%`,
      );
    }
    await posterContext.close();
    assert.deepEqual(runtimeErrors, [], `G003 runtime failures:\n${runtimeErrors.join('\n')}`);
    console.log('=== G003 FOCUSED BROWSER REGRESSIONS ===');
    console.log(JSON.stringify({ cadenceReport, posterReport }, null, 2));
    console.log('G003 FOCUSED BROWSER OK');
  } finally {
    await focusedBrowser.close();
  }
}

if (process.env.G003_FOCUSED === '1') {
  await runG003FocusedBrowserRegressions();
  process.exit(0);
}
await runG003FocusedBrowserRegressions();

let browser = await launchBrowser();
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
  attachRuntimeDiagnostics(page, viewport.name, runtimeErrors);
  await waitForExperience(page, viewport.name, runtimeErrors);

  const canvas = page.locator('canvas');
  assert.equal(await canvas.count(), 1, `${viewport.name}: expected one renderer canvas`);
  assert.equal(await canvas.getAttribute('role'), 'img', `${viewport.name}: canvas role`);
  const canvasName = (await canvas.getAttribute('aria-label')) ?? '';
  assert.match(canvasName, /Beijing|北京/i, `${viewport.name}: canvas name is not Beijing-specific`);
  const descriptionId = await canvas.getAttribute('aria-describedby');
  assert.ok(descriptionId, `${viewport.name}: canvas description reference`);
  const description = ((await page.locator(`#${descriptionId}`).textContent()) ?? '').trim();
  assert.match(description, /first-person|street|driver|drive/i, `${viewport.name}: first-person description`);
  assert.doesNotMatch(description, /overhead|bird'?s?-eye|route map|plan view/i);

  assert.equal(await page.locator('.ui-rec').isVisible(), false, `${viewport.name}: record badge hidden`);
  assert.equal(await page.locator('.ui-debug').isVisible(), false, `${viewport.name}: debug hidden`);
  assert.equal(await page.locator('.ui-mode, .ui-dock, .ui-mode-btn').count(), 0, `${viewport.name}: mode UI removed`);
  assert.equal(
    await page.getByRole('button', { name: /plan|map|overview|infinite view/i }).count(),
    0,
    `${viewport.name}: overhead/Plan control leaked into public UI`,
  );

  const bodyText = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
  assert.doesNotMatch(bodyText, /\bPLAN(?: VIEW)?\b/i, `${viewport.name}: Plan copy leaked into UI`);

  const buttons = page.getByRole('button');
  assert.equal(await buttons.count(), 4, `${viewport.name}: exactly four public controls`);
  for (const action of ['play', 'record', 'fs', 'about']) {
    assert.equal(await page.locator(`[data-act="${action}"]`).count(), 1, `${viewport.name}: ${action} control`);
  }
  for (let index = 0; index < 4; index += 1) {
    const button = buttons.nth(index);
    assert.ok((await button.getAttribute('aria-label'))?.trim(), `${viewport.name}: button ${index} name`);
    const box = await button.boundingBox();
    assert.ok(box && box.width >= 44 && box.height >= 44, `${viewport.name}: button ${index} target`);
  }
  assert.match(
    (await page.locator('[data-act="play"]').getAttribute('aria-label')) ?? '',
    /pause|resume|play/i,
    `${viewport.name}: play control name`,
  );
  assert.match(
    (await page.locator('[data-act="record"]').getAttribute('aria-label')) ?? '',
    /record.*loop|record.*complete/i,
    `${viewport.name}: record control name`,
  );
  assert.match(
    (await page.locator('[data-act="fs"]').getAttribute('aria-label')) ?? '',
    /fullscreen/i,
    `${viewport.name}: fullscreen control name`,
  );
  assert.match(
    (await page.locator('[data-act="about"]').getAttribute('aria-label')) ?? '',
    /personal intro|about/i,
    `${viewport.name}: about control name`,
  );
  assert.equal(await page.locator('[data-act="record"]').isDisabled(), false, `${viewport.name}: record supported`);
  assert.equal(await page.locator('[data-act="fs"]').isDisabled(), false, `${viewport.name}: fullscreen supported`);
  assert.equal(await page.locator('[data-act="about"]').isDisabled(), false, `${viewport.name}: about supported`);
  assert.equal(
    await page.locator('.about-root').isVisible(),
    false,
    `${viewport.name}: about panel hidden by default`,
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
  assertOverlaySafety(boxes, viewport, viewport.name);
  const smallTextContrast = await smallTextContrastReport(page, viewport.name);
  assert.ok(
    smallTextContrast.some(({ name }) => name === 'eyebrow'),
    `${viewport.name}: eyebrow contrast was not checked`,
  );
  assert.ok(
    smallTextContrast.some(({ name }) => name === 'eyebrow detail'),
    `${viewport.name}: eyebrow detail contrast was not checked`,
  );
  if (!viewport.mobile) {
    for (const name of ['subtitle', 'footer']) {
      assert.ok(
        smallTextContrast.some((entry) => entry.name === name),
        `${viewport.name}: ${name} contrast was not checked`,
      );
    }
  }

  const passageReports = {};
  for (const passage of passages) {
    await seek(page, passage.seconds);
    const state = await page.evaluate(() => window.__BEIJING_LOOP_TEST__.readState());
    assert.ok(state && [state.progress, state.phase, state.angle].every(Number.isFinite));
    assert.ok(
      Math.abs(state.phase - passage.seconds / LOOP_SECONDS) < 1e-10,
      `${viewport.name}/${passage.name}: phase mismatch ${state.phase}`,
    );
    await page.screenshot({ path: `${OUT}/${viewport.name}-${passage.name}.png` });
    const report = await canvasReport(page);
    assertFirstPersonFrame(report, `${viewport.name}/${passage.name}`);
    passageReports[passage.name] = report;
  }
  const vermilionSignal = Object.values(passageReports).reduce(
    (maximum, report) => Math.max(maximum, report.vermilionPct),
    0,
  );
  const warmSignal = Object.values(passageReports).reduce(
    (maximum, report) => Math.max(maximum, report.warmPct),
    0,
  );
  assert.ok(vermilionSignal > 0.025, `${viewport.name}: Beijing vermilion signal is missing`);
  assert.ok(warmSignal > 0.01, `${viewport.name}: warm lantern/window signal is missing`);

  // `seek` pauses deterministically. Resuming must advance, and pausing must freeze.
  const playButton = page.locator('[data-act="play"]');
  const pausedAt = await page.evaluate(() => window.__BEIJING_LOOP_TEST__.readState().progress);
  assert.equal(
    await page.evaluate(() => window.__BEIJING_LOOP_TEST__.readState().playing),
    false,
    `${viewport.name}: seek pauses playback`,
  );
  await playButton.click();
  // Require more than one 20 Hz tick of loop progress so a single stale frame
  // cannot satisfy the normal-playback assertion.
  const minimumProgressDelta = 1 / (LOOP_SECONDS * 20);
  await page.waitForFunction(
    ({ pausedAt, minimumProgressDelta }) => {
      const state = window.__BEIJING_LOOP_TEST__.readState();
      return state.playing && Math.abs(state.progress - pausedAt) > minimumProgressDelta;
    },
    { pausedAt, minimumProgressDelta },
    { timeout: 45_000 },
  );
  const moving = await page.evaluate(() => window.__BEIJING_LOOP_TEST__.readState());
  assert.equal(moving.playing, true, `${viewport.name}: play resumes`);
  assert.ok(
    Math.abs(moving.progress - pausedAt) > minimumProgressDelta,
    `${viewport.name}: drive advances`,
  );
  await playButton.click();
  const pauseBefore = await page.evaluate(() => window.__BEIJING_LOOP_TEST__.readState().progress);
  await page.waitForTimeout(360);
  const pauseAfter = await page.evaluate(() => window.__BEIJING_LOOP_TEST__.readState().progress);
  assert.ok(Math.abs(pauseAfter - pauseBefore) < 1e-10, `${viewport.name}: pause stability`);

  await playButton.focus();
  await playButton.press('Space');
  assert.equal(
    await page.evaluate(() => window.__BEIJING_LOOP_TEST__.readState().playing),
    true,
    `${viewport.name}: focused Space activates play exactly once`,
  );
  await playButton.press('Space');
  assert.equal(
    await page.evaluate(() => window.__BEIJING_LOOP_TEST__.readState().playing),
    false,
    `${viewport.name}: focused Space activates pause exactly once`,
  );

  await page.locator('body').click({ position: { x: viewport.width / 2, y: viewport.height * 0.68 } });
  await page.keyboard.press('d');
  assert.equal(await page.locator('.ui-debug').isVisible(), true, `${viewport.name}: debug opens`);
  const debugBoxes = await visibleOverlayBoxes(page);
  assertOverlaySafety(debugBoxes, viewport, `${viewport.name}/debug`);
  await page.screenshot({ path: `${OUT}/${viewport.name}-debug.png` });
  await page.keyboard.press('d');
  assert.equal(await page.locator('.ui-debug').isVisible(), false, `${viewport.name}: debug closes`);

  reports[viewport.name] = {
    passages: passageReports,
    overlays: boxes,
    debugOverlays: debugBoxes,
    smallTextContrast,
    vermilionSignal,
    warmSignal,
  };
  await context.close();
}

// The full DPR 1 visual matrix creates hundreds of WebGL render targets over
// several minutes. Start DPR 2 in a fresh Chromium/GPU process so its smoke
// checks do not inherit driver/resource pressure from the capture matrix.
await browser.close();
browser = await launchBrowser();

// DPR 2 smoke matrix: verify the responsive CSS viewport and the renderer's
// bounded backing-store ratio without repeating the 5 x 12 visual captures.
const dpr2Reports = {};
for (const viewport of viewports) {
  const label = `${viewport.name}-dpr2`;
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 2,
    isMobile: Boolean(viewport.mobile),
    hasTouch: Boolean(viewport.mobile),
  });
  try {
    const page = await context.newPage();
    attachRuntimeDiagnostics(page, label, runtimeErrors);
    await waitForExperience(page, label, runtimeErrors);

    const smoke = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const state = window.__BEIJING_LOOP_TEST__?.readState();
      const canvasRect = canvas?.getBoundingClientRect();
      return {
        hook: Boolean(window.__BEIJING_LOOP_TEST__),
        state,
        viewport: [innerWidth, innerHeight],
        canvasCss: [canvasRect?.width ?? 0, canvasRect?.height ?? 0],
        canvasBacking: [canvas?.width ?? 0, canvas?.height ?? 0],
        brandVisible: Boolean(document.querySelector('.ui-brand')?.getClientRects().length),
        toolbarVisible: Boolean(document.querySelector('.ui-actions')?.getClientRects().length),
        controlCount: document.querySelectorAll('[data-act]').length,
      };
    });
    const cappedRatio = viewport.mobile ? 1.35 : 1.8;
    const expectedBacking = [viewport.width * cappedRatio, viewport.height * cappedRatio];
    assert.equal(smoke.hook, true, `${label}: QA hook missing`);
    assert.ok(
      smoke.state && [smoke.state.progress, smoke.state.phase, smoke.state.angle].every(Number.isFinite),
      `${label}: scene state is invalid`,
    );
    assert.deepEqual(smoke.viewport, [viewport.width, viewport.height], `${label}: CSS viewport`);
    assert.deepEqual(smoke.canvasCss, [viewport.width, viewport.height], `${label}: canvas CSS size`);
    assert.ok(
      Math.abs(smoke.canvasBacking[0] - expectedBacking[0]) <= 1 &&
        Math.abs(smoke.canvasBacking[1] - expectedBacking[1]) <= 1,
      `${label}: canvas backing ${smoke.canvasBacking.join('x')} does not honor the ${cappedRatio} cap`,
    );
    assert.equal(smoke.brandVisible, true, `${label}: brand overlay hidden`);
    assert.equal(smoke.toolbarVisible, true, `${label}: control overlay hidden`);
    assert.equal(smoke.controlCount, 4, `${label}: expected four controls`);
    dpr2Reports[label] = {
      cssViewport: smoke.viewport,
      canvasCss: smoke.canvasCss,
      canvasBacking: smoke.canvasBacking,
      cappedRatio,
      controls: smoke.controlCount,
    };
  } finally {
    await context.close();
  }
}
reports['dpr2-smoke-matrix'] = dpr2Reports;

// One live mobile page must survive both orientation transitions without
// resetting or freezing the normal drive.
const orientationContext = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
});
const orientationPage = await orientationContext.newPage();
attachRuntimeDiagnostics(orientationPage, 'orientation-playback', runtimeErrors);
await waitForExperience(orientationPage);
if (!(await orientationPage.evaluate(() => window.__BEIJING_LOOP_TEST__.readState().playing))) {
  await orientationPage.locator('[data-act="play"]').click();
}
const orientationSamples = [];
let previousOrientationProgress = await orientationPage.evaluate(
  () => window.__BEIJING_LOOP_TEST__.readState().progress,
);
for (const viewport of [
  { name: 'portrait-before', width: 390, height: 844 },
  { name: 'landscape', width: 844, height: 390 },
  { name: 'portrait-after', width: 390, height: 844 },
]) {
  await orientationPage.setViewportSize({ width: viewport.width, height: viewport.height });
  await orientationPage.waitForFunction(
    ({ width, height, previous }) => {
      const state = window.__BEIJING_LOOP_TEST__.readState();
      const delta = (state.progress - previous + 1) % 1;
      return innerWidth === width && innerHeight === height && state.playing && delta > 0.001;
    },
    { width: viewport.width, height: viewport.height, previous: previousOrientationProgress },
  );
  const state = await orientationPage.evaluate(() => window.__BEIJING_LOOP_TEST__.readState());
  const layout = await orientationPage.evaluate(() => ({
    viewport: [innerWidth, innerHeight],
    canvas: [
      document.querySelector('canvas')?.getBoundingClientRect().width ?? 0,
      document.querySelector('canvas')?.getBoundingClientRect().height ?? 0,
    ],
    controls: document.querySelectorAll('[data-act]').length,
  }));
  assert.deepEqual(layout.viewport, [viewport.width, viewport.height], `${viewport.name}: viewport`);
  assert.deepEqual(layout.canvas, [viewport.width, viewport.height], `${viewport.name}: canvas layout`);
  assert.equal(layout.controls, 4, `${viewport.name}: controls remain mounted`);
  assertOverlaySafety(await visibleOverlayBoxes(orientationPage), viewport, `orientation/${viewport.name}`);
  orientationSamples.push({ ...viewport, progress: state.progress });
  previousOrientationProgress = state.progress;
}
reports['orientation-playback'] = { transitions: orientationSamples, sceneAdvanced: true };
await orientationContext.close();

// Exercise the real touchscreen input path by tapping element centres rather
// than dispatching synthetic click events.
const touchContext = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
  acceptDownloads: true,
});
const touchPage = await touchContext.newPage();
attachRuntimeDiagnostics(touchPage, 'touch-controls', runtimeErrors);
await waitForExperience(touchPage);
let touchDownloads = 0;
touchPage.on('download', () => {
  touchDownloads += 1;
});
async function tapLocator(page, locator, label) {
  const box = await locator.boundingBox();
  assert.ok(box, `${label}: touch target has no box`);
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
}
const touchPlay = touchPage.locator('[data-act="play"]');
const touchInitiallyPlaying = await touchPage.evaluate(
  () => window.__BEIJING_LOOP_TEST__.readState().playing,
);
await tapLocator(touchPage, touchPlay, 'touch play');
assert.equal(
  await touchPage.evaluate(() => window.__BEIJING_LOOP_TEST__.readState().playing),
  !touchInitiallyPlaying,
  'touch play toggles playback',
);
assert.match((await touchPlay.getAttribute('aria-label')) ?? '', /resume|pause/i, 'touch play label');
await tapLocator(touchPage, touchPlay, 'touch resume');
assert.equal(
  await touchPage.evaluate(() => window.__BEIJING_LOOP_TEST__.readState().playing),
  touchInitiallyPlaying,
  'touch play restores playback',
);

const touchAbout = touchPage.locator('[data-act="about"]');
await tapLocator(touchPage, touchAbout, 'touch about');
await touchPage.waitForSelector('.about-root.is-visible .about-panel', { state: 'visible' });
assert.equal(await touchAbout.getAttribute('aria-pressed'), 'true', 'touch about opens dialog');
await tapLocator(touchPage, touchPage.locator('[data-about-close]'), 'touch about close');
await touchPage.waitForFunction(() => !document.body.classList.contains('is-about-open'));
assert.equal(await touchAbout.getAttribute('aria-pressed'), 'false', 'touch about closes dialog');

const touchRecord = touchPage.locator('[data-act="record"]');
await tapLocator(touchPage, touchRecord, 'touch record');
await touchPage.waitForFunction(
  () => window.__BEIJING_LOOP_TEST__.readRecording().status === 'recording',
);
assert.equal(await touchRecord.getAttribute('aria-label'), 'Cancel recording', 'touch record starts');
await tapLocator(touchPage, touchRecord, 'touch cancel');
await touchPage.waitForFunction(
  () => window.__BEIJING_LOOP_TEST__.readRecording().status === 'cancelled',
);
const touchCancelLive = await waitForLiveMessage(
  touchPage,
  /recording cancelled.*no video was downloaded/i,
);
assert.match(touchCancelLive, /recording cancelled.*no video was downloaded/i, 'touch cancel announced');
assert.equal(await touchRecord.getAttribute('aria-label'), 'Record one complete loop', 'touch cancel label');
assert.equal(touchDownloads, 0, 'touch cancel downloaded a video');
reports['touch-controls'] = {
  playPause: true,
  aboutOpenClose: true,
  recordingStartCancel: true,
  downloads: touchDownloads,
};
await touchContext.close();

// Keyboard success-path fixture plus focus-order/focus-visible coverage.
const keyboardContext = await browser.newContext({
  viewport: { width: 900, height: 640 },
  deviceScaleFactor: 1,
  acceptDownloads: true,
});
await keyboardContext.addInitScript(() => {
  window.__BEIJING_MOCK_FULLSCREEN__ = false;
  Object.defineProperty(Document.prototype, 'fullscreenElement', {
    configurable: true,
    get: () => (window.__BEIJING_MOCK_FULLSCREEN__ ? document.documentElement : null),
  });
  Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
    configurable: true,
    value: () => {
      window.__BEIJING_MOCK_FULLSCREEN__ = true;
      document.dispatchEvent(new Event('fullscreenchange'));
      return Promise.resolve();
    },
  });
  Object.defineProperty(Document.prototype, 'exitFullscreen', {
    configurable: true,
    value: () => {
      window.__BEIJING_MOCK_FULLSCREEN__ = false;
      document.dispatchEvent(new Event('fullscreenchange'));
      return Promise.resolve();
    },
  });
});
const keyboardPage = await keyboardContext.newPage();
attachRuntimeDiagnostics(keyboardPage, 'keyboard-focus', runtimeErrors);
await waitForExperience(keyboardPage);
let keyboardDownloads = 0;
keyboardPage.on('download', () => {
  keyboardDownloads += 1;
});
await keyboardPage.locator('canvas').click({ position: { x: 450, y: 400 } });
const keyboardInitiallyPlaying = await keyboardPage.evaluate(
  () => window.__BEIJING_LOOP_TEST__.readState().playing,
);
await keyboardPage.keyboard.press('Space');
assert.equal(
  await keyboardPage.evaluate(() => window.__BEIJING_LOOP_TEST__.readState().playing),
  !keyboardInitiallyPlaying,
  'body Space toggles playback',
);
await keyboardPage.keyboard.press('Space');
assert.equal(
  await keyboardPage.evaluate(() => window.__BEIJING_LOOP_TEST__.readState().playing),
  keyboardInitiallyPlaying,
  'body Space restores playback',
);

await keyboardPage.keyboard.press('r');
await keyboardPage.waitForFunction(
  () => window.__BEIJING_LOOP_TEST__.readRecording().status === 'recording',
);
assert.equal(
  await keyboardPage.locator('[data-act="record"]').getAttribute('aria-label'),
  'Cancel recording',
  'R starts recording',
);
await keyboardPage.keyboard.press('r');
await keyboardPage.waitForFunction(
  () => window.__BEIJING_LOOP_TEST__.readRecording().status === 'cancelled',
);
const keyboardCancelLive = await waitForLiveMessage(
  keyboardPage,
  /recording cancelled.*no video was downloaded/i,
);
assert.match(keyboardCancelLive, /recording cancelled.*no video was downloaded/i, 'R cancel announced');
assert.equal(keyboardDownloads, 0, 'R cancel downloaded a video');

const keyboardFullscreen = keyboardPage.locator('[data-act="fs"]');
await keyboardPage.keyboard.press('f');
await keyboardPage.waitForFunction(
  () => document.querySelector('[data-act="fs"]')?.getAttribute('aria-pressed') === 'true',
);
assert.equal(await keyboardFullscreen.getAttribute('aria-pressed'), 'true', 'F enters fullscreen');
assert.equal(await keyboardFullscreen.getAttribute('aria-label'), 'Exit fullscreen', 'fullscreen exit label');
assert.doesNotMatch(
  (await keyboardPage.locator('[data-ui-live]').textContent()) ?? '',
  /could not.*fullscreen|fullscreen is unavailable/i,
  'fullscreen success emitted a false live-region failure',
);
await keyboardPage.keyboard.press('f');
await keyboardPage.waitForFunction(
  () => document.querySelector('[data-act="fs"]')?.getAttribute('aria-pressed') === 'false',
);
assert.equal(await keyboardFullscreen.getAttribute('aria-pressed'), 'false', 'F exits fullscreen');
assert.equal(await keyboardFullscreen.getAttribute('aria-label'), 'Enter fullscreen', 'fullscreen enter label');
assert.doesNotMatch(
  (await keyboardPage.locator('[data-ui-live]').textContent()) ?? '',
  /could not.*fullscreen|fullscreen is unavailable/i,
  'fullscreen exit emitted a false live-region failure',
);

await keyboardPage.evaluate(() => {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
});
const tabOrder = [];
let firstFocusStyle;
for (const action of ['play', 'record', 'fs', 'about']) {
  await keyboardPage.keyboard.press('Tab');
  const focused = await keyboardPage.evaluate(() => document.activeElement?.getAttribute('data-act'));
  assert.equal(focused, action, `Tab focuses ${action} in toolbar order`);
  tabOrder.push(focused);
  if (!firstFocusStyle) {
    firstFocusStyle = await keyboardPage.locator(`[data-act="${action}"]`).evaluate((element) => {
      const style = getComputedStyle(element);
      return { outlineWidth: style.outlineWidth, outlineStyle: style.outlineStyle, boxShadow: style.boxShadow };
    });
  }
}
assert.ok(
  (Number.parseFloat(firstFocusStyle.outlineWidth) > 0 && firstFocusStyle.outlineStyle !== 'none') ||
    firstFocusStyle.boxShadow !== 'none',
  `focus-visible style is missing: ${JSON.stringify(firstFocusStyle)}`,
);
await keyboardPage.keyboard.press('Enter');
await keyboardPage.waitForSelector('.about-root.is-visible .about-panel', { state: 'visible' });
await keyboardPage.waitForFunction(() => document.activeElement?.classList.contains('about-panel'));
assert.equal(
  await keyboardPage.evaluate(() => document.activeElement?.getAttribute('role')),
  'dialog',
  'About opening moves semantic focus to the dialog',
);
await keyboardPage.keyboard.press('Escape');
await keyboardPage.waitForFunction(() => !document.body.classList.contains('is-about-open'));
assert.equal(
  await keyboardPage.evaluate(() => document.activeElement?.getAttribute('data-act')),
  'about',
  'Escape restores focus to About',
);
reports['keyboard-focus'] = {
  bodySpace: true,
  recordShortcut: 'start-cancel',
  fullscreenShortcut: 'enter-exit',
  fullscreenLiveState: 'no false failure',
  tabOrder,
  focusVisible: firstFocusStyle,
  dialogFocusRestored: true,
};
await keyboardContext.close();

// Personal intro overlay: curated dialog over the continuing drive.
for (const aboutViewport of [
  { name: 'about-desktop', width: 1280, height: 720, mobile: false },
  { name: 'about-mobile', width: 390, height: 844, mobile: true },
]) {
  const aboutContext = await browser.newContext({
    viewport: { width: aboutViewport.width, height: aboutViewport.height },
    deviceScaleFactor: 1,
    isMobile: Boolean(aboutViewport.mobile),
    hasTouch: Boolean(aboutViewport.mobile),
  });
  const aboutPage = await aboutContext.newPage();
  attachRuntimeDiagnostics(aboutPage, aboutViewport.name, runtimeErrors);
  await waitForExperience(aboutPage);

  const aboutButton = aboutPage.locator('[data-act="about"]');
  await aboutButton.focus();
  await aboutButton.click();
  await aboutPage.waitForSelector('.about-root.is-visible .about-panel', { state: 'visible' });
  await aboutPage.waitForFunction(() => {
    const panel = document.querySelector('.about-panel');
    if (!(panel instanceof HTMLElement)) return false;
    const style = getComputedStyle(panel);
    return Number(style.opacity) > 0.95 && panel.getBoundingClientRect().left >= -0.5;
  });
  assert.equal(
    await aboutPage.locator('.about-panel').getAttribute('role'),
    'dialog',
    `${aboutViewport.name}: about dialog role`,
  );
  assert.equal(
    await aboutPage.locator('.about-panel').getAttribute('aria-modal'),
    'true',
    `${aboutViewport.name}: about dialog is modal`,
  );
  assert.match(
    ((await aboutPage.locator('#about-name').textContent()) ?? '').trim(),
    /Yupeng Lu/i,
    `${aboutViewport.name}: about name`,
  );
  assert.match(
    ((await aboutPage.locator('.about-role').textContent()) ?? '').trim(),
    /AI Agent Engineer/i,
    `${aboutViewport.name}: about role`,
  );
  assert.equal(
    await aboutPage.evaluate(() => document.body.classList.contains('is-about-open')),
    true,
    `${aboutViewport.name}: about open body class`,
  );

  const playingBefore = await aboutPage.evaluate(
    () => window.__BEIJING_LOOP_TEST__.readState().playing,
  );
  await aboutPage.keyboard.press(' ');
  assert.equal(
    await aboutPage.evaluate(() => window.__BEIJING_LOOP_TEST__.readState().playing),
    playingBefore,
    `${aboutViewport.name}: Space ignored while about is open`,
  );

  const detailList = aboutPage.locator('[data-detail-list="cookiy"]');
  assert.equal(await detailList.isVisible(), false, `${aboutViewport.name}: details collapsed`);
  const expandCookiy = aboutPage.locator('[data-expand="cookiy"]');
  await expandCookiy.scrollIntoViewIfNeeded();
  await expandCookiy.click();
  assert.equal(await detailList.isVisible(), true, `${aboutViewport.name}: details expanded`);
  assert.ok(
    (await detailList.locator('li').count()) >= 3,
    `${aboutViewport.name}: expanded experience reveals additional bullets`,
  );

  const aboutLayout = await aboutPage.evaluate(() => ({
    viewportWidth: innerWidth,
    viewportHeight: innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    panelLeft: document.querySelector('.about-panel')?.getBoundingClientRect().left ?? -1,
    panelWidth: document.querySelector('.about-panel')?.getBoundingClientRect().width ?? 0,
  }));
  assert.ok(
    aboutLayout.scrollWidth <= aboutLayout.viewportWidth + 1,
    `${aboutViewport.name}: horizontal overflow while about open`,
  );
  assert.ok(aboutLayout.panelWidth > 0, `${aboutViewport.name}: about panel has width`);
  assert.ok(aboutLayout.panelLeft >= -0.5, `${aboutViewport.name}: about panel leaves left edge`);

  await aboutPage.keyboard.press('Escape');
  await aboutPage.waitForFunction(() => !document.body.classList.contains('is-about-open'));
  await aboutPage.waitForSelector('.about-root[hidden]', { state: 'attached' });
  assert.equal(
    await aboutPage.locator('.about-root').isVisible(),
    false,
    `${aboutViewport.name}: Escape closes about`,
  );
  assert.equal(
    await aboutPage.evaluate(() => document.activeElement?.getAttribute('data-act') === 'about'),
    true,
    `${aboutViewport.name}: focus returns to about control`,
  );

  reports[aboutViewport.name] = {
    opened: true,
    expanded: true,
    closedByEscape: true,
  };
  await aboutContext.close();
}

// Capability degradation must be explicit and accessible rather than a reset,
// alert, or inert control that appears usable.
const unsupportedContext = await browser.newContext({
  viewport: { width: 800, height: 600 },
  deviceScaleFactor: 1,
});
await unsupportedContext.addInitScript(() => {
  Object.defineProperty(HTMLCanvasElement.prototype, 'captureStream', {
    configurable: true,
    value: undefined,
  });
  Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
    configurable: true,
    value: undefined,
  });
  Object.defineProperty(Document.prototype, 'exitFullscreen', {
    configurable: true,
    value: undefined,
  });
});
const unsupportedPage = await unsupportedContext.newPage();
attachRuntimeDiagnostics(unsupportedPage, 'unsupported-capabilities', runtimeErrors);
await waitForExperience(unsupportedPage);
const unsupportedRecord = unsupportedPage.locator('[data-act="record"]');
const unsupportedFullscreen = unsupportedPage.locator('[data-act="fs"]');
assert.equal(await unsupportedRecord.isDisabled(), true, 'unsupported recording is disabled');
assert.equal(await unsupportedFullscreen.isDisabled(), true, 'unsupported fullscreen is disabled');
assert.equal(await unsupportedRecord.getAttribute('aria-disabled'), 'true', 'record aria-disabled');
assert.equal(await unsupportedFullscreen.getAttribute('aria-disabled'), 'true', 'fullscreen aria-disabled');
assert.match(
  (await unsupportedRecord.getAttribute('aria-label')) ?? '',
  /recording unavailable/i,
  'recording capability label',
);
assert.match(
  (await unsupportedFullscreen.getAttribute('aria-label')) ?? '',
  /fullscreen unavailable/i,
  'fullscreen capability label',
);
assert.match(
  (await unsupportedPage.locator('#record-capability').textContent()) ?? '',
  /unavailable.*cannot capture/i,
  'recording capability explanation',
);
assert.match(
  (await unsupportedPage.locator('#fullscreen-capability').textContent()) ?? '',
  /fullscreen is unavailable/i,
  'fullscreen capability explanation',
);
await unsupportedPage.locator('body').click({ position: { x: 400, y: 420 } });
await unsupportedPage.keyboard.press('r');
const unsupportedRecordingLive = await waitForLiveMessage(
  unsupportedPage,
  /recording is unavailable/i,
);
assert.match(
  unsupportedRecordingLive,
  /recording is unavailable/i,
  'keyboard recording failure is announced',
);
await unsupportedPage.keyboard.press('f');
const unsupportedFullscreenLive = await waitForLiveMessage(
  unsupportedPage,
  /fullscreen is unavailable/i,
);
assert.match(
  unsupportedFullscreenLive,
  /fullscreen is unavailable/i,
  'keyboard fullscreen failure is announced',
);
reports['unsupported-capabilities'] = {
  recordDisabled: true,
  fullscreenDisabled: true,
  accessibleExplanations: true,
};
await unsupportedContext.close();

// Fullscreen capability can exist while the user agent rejects a particular
// request. Both enter and exit failures must be announced without an uncaught
// rejection or a false fullscreen state transition.
const fullscreenRejectContext = await browser.newContext({
  viewport: { width: 800, height: 600 },
  deviceScaleFactor: 1,
});
await fullscreenRejectContext.addInitScript(() => {
  window.__BEIJING_MOCK_FULLSCREEN__ = false;
  Object.defineProperty(Document.prototype, 'fullscreenElement', {
    configurable: true,
    get: () =>
      window.__BEIJING_MOCK_FULLSCREEN__ ? document.documentElement : null,
  });
  Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
    configurable: true,
    value: () => Promise.reject(new DOMException('intentional enter rejection', 'NotAllowedError')),
  });
  Object.defineProperty(Document.prototype, 'exitFullscreen', {
    configurable: true,
    value: () => Promise.reject(new DOMException('intentional exit rejection', 'NotAllowedError')),
  });
});
const fullscreenRejectPage = await fullscreenRejectContext.newPage();
attachRuntimeDiagnostics(fullscreenRejectPage, 'fullscreen-promise-rejection', runtimeErrors);
await waitForExperience(fullscreenRejectPage);
const fullscreenRejectButton = fullscreenRejectPage.locator('[data-act="fs"]');
assert.equal(await fullscreenRejectButton.isDisabled(), false, 'rejecting fullscreen API is available');
await fullscreenRejectButton.click();
const rejectedEnterLive = await waitForLiveMessage(
  fullscreenRejectPage,
  /could not enter fullscreen.*denied/i,
);
assert.match(rejectedEnterLive, /could not enter fullscreen.*denied/i, 'rejected enter is announced');
assert.equal(
  await fullscreenRejectButton.getAttribute('aria-pressed'),
  'false',
  'rejected enter request falsely enabled fullscreen state',
);

await fullscreenRejectPage.evaluate(() => {
  window.__BEIJING_MOCK_FULLSCREEN__ = true;
  document.dispatchEvent(new Event('fullscreenchange'));
});
assert.equal(
  await fullscreenRejectButton.getAttribute('aria-pressed'),
  'true',
  'exit rejection fixture did not expose fullscreen state',
);
await fullscreenRejectButton.click();
const rejectedExitLive = await waitForLiveMessage(
  fullscreenRejectPage,
  /could not exit fullscreen.*denied/i,
);
assert.match(rejectedExitLive, /could not exit fullscreen.*denied/i, 'rejected exit is announced');
assert.equal(
  await fullscreenRejectButton.getAttribute('aria-pressed'),
  'true',
  'rejected exit request falsely cleared fullscreen state',
);
reports['fullscreen-promise-rejection'] = {
  enterAnnounced: true,
  exitAnnounced: true,
  statePreserved: true,
};
await fullscreenRejectContext.close();

// A browser that exposes MediaRecorder but rejects every WebM MIME must not
// offer recording or silently fall back to an MP4 download named `.webm`.
const rejectedWebmContext = await browser.newContext({
  viewport: { width: 800, height: 600 },
  deviceScaleFactor: 1,
  acceptDownloads: true,
});
await rejectedWebmContext.addInitScript(() => {
  window.__BEIJING_CAPTURE_CALLS__ = 0;
  const nativeCaptureStream = HTMLCanvasElement.prototype.captureStream;
  HTMLCanvasElement.prototype.captureStream = function (...args) {
    window.__BEIJING_CAPTURE_CALLS__ += 1;
    return nativeCaptureStream.apply(this, args);
  };
  const NativeMediaRecorder = window.MediaRecorder;
  class NoWebmMediaRecorder extends NativeMediaRecorder {
    static isTypeSupported() {
      return false;
    }
  }
  Object.defineProperty(window, 'MediaRecorder', {
    configurable: true,
    value: NoWebmMediaRecorder,
  });
});
const rejectedWebmPage = await rejectedWebmContext.newPage();
let rejectedWebmDownloads = 0;
rejectedWebmPage.on('download', () => {
  rejectedWebmDownloads += 1;
});
attachRuntimeDiagnostics(rejectedWebmPage, 'recorder-no-webm-support', runtimeErrors);
await waitForExperience(rejectedWebmPage);
assert.equal(
  await rejectedWebmPage.locator('[data-act="record"]').isDisabled(),
  true,
  'all rejected WebM MIME types disable recording',
);
await rejectedWebmPage.locator('body').click({ position: { x: 400, y: 420 } });
await rejectedWebmPage.keyboard.press('r');
const rejectedWebmLive = await waitForLiveMessage(
  rejectedWebmPage,
  /recording is unavailable.*WebM/i,
);
assert.equal(
  await rejectedWebmPage.evaluate(() => window.__BEIJING_CAPTURE_CALLS__),
  0,
  'WebM-rejected browser still created a capture stream',
);
assert.equal(rejectedWebmDownloads, 0, 'WebM-rejected browser created a download');
assert.match(
  rejectedWebmLive,
  /recording is unavailable.*WebM/i,
  'WebM rejection is announced',
);
reports['recorder-no-webm-support'] = { disabled: true, captureCalls: 0, downloads: 0 };
await rejectedWebmContext.close();

// Older implementations may omit isTypeSupported(). In that case construction
// is allowed, but a non-WebM selected mimeType is rejected and its track freed.
const selectedMp4Context = await browser.newContext({
  viewport: { width: 800, height: 600 },
  deviceScaleFactor: 1,
  acceptDownloads: true,
});
await selectedMp4Context.addInitScript(() => {
  window.__BEIJING_TRACK_STOPS__ = 0;
  const nativeStop = MediaStreamTrack.prototype.stop;
  MediaStreamTrack.prototype.stop = function (...args) {
    window.__BEIJING_TRACK_STOPS__ += 1;
    return nativeStop.apply(this, args);
  };
  class Mp4OnlyMediaRecorder {
    state = 'inactive';
    mimeType = 'video/mp4';
  }
  Object.defineProperty(window, 'MediaRecorder', {
    configurable: true,
    value: Mp4OnlyMediaRecorder,
  });
});
const selectedMp4Page = await selectedMp4Context.newPage();
let selectedMp4Downloads = 0;
selectedMp4Page.on('download', () => {
  selectedMp4Downloads += 1;
});
attachRuntimeDiagnostics(selectedMp4Page, 'recorder-selected-mp4', runtimeErrors);
await waitForExperience(selectedMp4Page);
assert.equal(
  await selectedMp4Page.locator('[data-act="record"]').isDisabled(),
  false,
  'missing MIME capability API defers the decision until construction',
);
await selectedMp4Page.locator('[data-act="record"]').click();
const selectedMp4Live = await waitForLiveMessage(
  selectedMp4Page,
  /recording could not start/i,
);
const selectedMp4Recording = await selectedMp4Page.evaluate(() => ({
  recording: window.__BEIJING_LOOP_TEST__.readRecording(),
  trackStops: window.__BEIJING_TRACK_STOPS__,
}));
assert.equal(selectedMp4Recording.recording.status, 'failed', 'MP4 fallback status');
assert.match(
  selectedMp4Recording.recording.error ?? '',
  /selected video\/mp4 instead of a WebM container/i,
  'MP4 fallback retains a structured error',
);
assert.ok(selectedMp4Recording.trackStops >= 1, 'MP4 fallback leaked its capture track');
assert.match(selectedMp4Live, /recording could not start/i, 'MP4 rejection announced');
assert.equal(selectedMp4Downloads, 0, 'MP4 fallback was mislabeled and downloaded as WebM');
reports['recorder-selected-mp4'] = {
  failed: true,
  trackStops: selectedMp4Recording.trackStops,
  downloads: 0,
};
await selectedMp4Context.close();

// A MediaRecorder constructor failure happens after captureStream() succeeds.
// Its freshly-created track still has to be stopped and playback restored.
const constructorFailureContext = await browser.newContext({
  viewport: { width: 800, height: 600 },
  deviceScaleFactor: 1,
});
await constructorFailureContext.addInitScript(() => {
  window.__BEIJING_TRACK_STOPS__ = 0;
  const nativeStop = MediaStreamTrack.prototype.stop;
  MediaStreamTrack.prototype.stop = function (...args) {
    window.__BEIJING_TRACK_STOPS__ += 1;
    return nativeStop.apply(this, args);
  };
  const NativeMediaRecorder = window.MediaRecorder;
  class BrokenMediaRecorder {
    static isTypeSupported(type) {
      return NativeMediaRecorder.isTypeSupported(type);
    }

    constructor() {
      throw new Error('intentional MediaRecorder constructor failure');
    }
  }
  Object.defineProperty(window, 'MediaRecorder', {
    configurable: true,
    value: BrokenMediaRecorder,
  });
});
const constructorFailurePage = await constructorFailureContext.newPage();
attachRuntimeDiagnostics(constructorFailurePage, 'recorder-constructor-failure', runtimeErrors);
await waitForExperience(constructorFailurePage);
assert.equal(
  await constructorFailurePage.locator('[data-act="record"]').isDisabled(),
  false,
  'constructor-failure setup still advertises the API capability',
);
await constructorFailurePage.locator('[data-act="record"]').click();
const constructorFailureLive = await waitForLiveMessage(
  constructorFailurePage,
  /recording could not start/i,
);
const constructorFailureRecording = await constructorFailurePage.evaluate(() => ({
  recording: window.__BEIJING_LOOP_TEST__.readRecording(),
  capturePerformance: window.__BEIJING_LOOP_TEST__.readCapturePerformance(),
}));
assert.equal(constructorFailureRecording.recording.status, 'failed', 'constructor failure status');
assert.match(
  constructorFailureRecording.recording.error ?? '',
  /intentional MediaRecorder constructor failure/i,
  'constructor failure evidence is retained',
);
assert.equal(
  constructorFailureRecording.capturePerformance.active,
  false,
  'constructor failure left capture material mode active',
);
assert.equal(
  constructorFailureRecording.capturePerformance.proxiedMeshCount,
  0,
  'constructor failure did not restore original mesh materials',
);
assert.ok(
  (await constructorFailurePage.evaluate(() => window.__BEIJING_TRACK_STOPS__)) >= 1,
  'constructor failure leaked the canvas capture track',
);
assert.equal(
  await constructorFailurePage.locator('.ui-rec').isVisible(),
  false,
  'failed recording badge clears',
);
assert.match(
  constructorFailureLive,
  /recording could not start/i,
  'constructor failure is announced',
);
assert.equal(
  await constructorFailurePage.evaluate(() => window.__BEIJING_LOOP_TEST__.readState().playing),
  true,
  'constructor failure restores previous playback',
);
reports['recorder-constructor-failure'] = { trackStopped: true, playbackRestored: true };
await constructorFailureContext.close();

// A caller-side render/UI exception on the synchronous first capture tick must
// abort the just-started recorder, release its track, and create no download.
const tickFailureContext = await browser.newContext({
  viewport: { width: 800, height: 600 },
  deviceScaleFactor: 1,
  acceptDownloads: true,
});
await tickFailureContext.addInitScript(() => {
  window.__BEIJING_TRACK_STOPS__ = 0;
  const nativeStop = MediaStreamTrack.prototype.stop;
  MediaStreamTrack.prototype.stop = function (...args) {
    window.__BEIJING_TRACK_STOPS__ += 1;
    return nativeStop.apply(this, args);
  };
});
const tickFailurePage = await tickFailureContext.newPage();
let tickFailureDownloads = 0;
tickFailurePage.on('download', () => {
  tickFailureDownloads += 1;
});
attachRuntimeDiagnostics(tickFailurePage, 'recorder-initial-tick-failure', runtimeErrors);
await waitForExperience(tickFailurePage);
await tickFailurePage.evaluate(() => {
  const recordingTime = document.querySelector('.rec-time');
  if (!(recordingTime instanceof HTMLElement)) throw new Error('missing recording timer fixture');
  Object.defineProperty(recordingTime, 'textContent', {
    configurable: true,
    get: () => '',
    set: () => {
      throw new Error('intentional recording tick failure');
    },
  });
});
await tickFailurePage.locator('[data-act="record"]').click();
const tickFailureLive = await waitForLiveMessage(
  tickFailurePage,
  /recording could not start/i,
);
const tickFailure = await tickFailurePage.evaluate(() => ({
  recording: window.__BEIJING_LOOP_TEST__.readRecording(),
  capturePerformance: window.__BEIJING_LOOP_TEST__.readCapturePerformance(),
  trackStops: window.__BEIJING_TRACK_STOPS__,
}));
assert.equal(tickFailure.recording.active, false, 'initial tick failure left recorder active');
assert.equal(tickFailure.recording.status, 'failed', 'initial tick failure status');
assert.match(
  tickFailure.recording.error ?? '',
  /intentional recording tick failure/i,
  'initial tick failure reason is retained',
);
assert.ok(tickFailure.trackStops >= 1, 'initial tick failure leaked its capture track');
assert.match(tickFailureLive, /recording could not start/i, 'initial tick failure announced');
assert.equal(tickFailureDownloads, 0, 'initial tick failure created a download');
assert.equal(
  tickFailure.capturePerformance.active,
  false,
  'initial tick failure left capture material mode active',
);
assert.equal(
  tickFailure.capturePerformance.proxiedMeshCount,
  0,
  'initial tick failure did not restore original mesh materials',
);
assert.equal(
  await tickFailurePage.locator('[data-act="record"]').isDisabled(),
  false,
  'record control stayed locked after initial tick failure',
);
reports['recorder-initial-tick-failure'] = {
  failed: true,
  trackStops: tickFailure.trackStops,
  downloads: 0,
};
await tickFailureContext.close();

// A recorder that stops without an error event must never become a successful
// export merely because enough wall time passed. Likewise, a requested complete
// capture with no data must fail rather than announcing an empty download.
const falseSuccessContext = await browser.newContext({
  viewport: { width: 800, height: 600 },
  deviceScaleFactor: 1,
  acceptDownloads: true,
});
await falseSuccessContext.addInitScript(() => {
  window.__BEIJING_TRACK_STOPS__ = 0;
  window.__BEIJING_RECORDER_OPTIONS__ = [];
  let clockOffset = 0;
  const nativeNow = performance.now.bind(performance);
  Object.defineProperty(performance, 'now', {
    configurable: true,
    value: () => nativeNow() + clockOffset,
  });
  window.__BEIJING_ADVANCE_RECORDER_CLOCK__ = () => {
    clockOffset += 49_000;
  };

  const nativeStop = MediaStreamTrack.prototype.stop;
  MediaStreamTrack.prototype.stop = function (...args) {
    window.__BEIJING_TRACK_STOPS__ += 1;
    return nativeStop.apply(this, args);
  };

  let startCount = 0;
  class FalseSuccessMediaRecorder {
    static isTypeSupported(type) {
      return /^video\/webm/i.test(type);
    }

    state = 'inactive';
    mimeType = 'video/webm';
    ondataavailable = null;
    onerror = null;
    onstop = null;

    constructor(_stream, options) {
      this.attempt = ++startCount;
      window.__BEIJING_RECORDER_OPTIONS__.push(options);
    }

    start() {
      this.state = 'recording';
      if (this.attempt === 1) {
        setTimeout(() => {
          this.state = 'inactive';
          this.onstop?.(new Event('stop'));
        }, 30);
      }
    }

    requestData() {
      if (this.attempt !== 3 || this.drainStopScheduled) return;
      this.drainStopScheduled = true;
      setTimeout(() => {
        if (this.state !== 'recording') return;
        this.ondataavailable?.({
          data: new Blob(['truncated-drain-data'], { type: 'video/webm' }),
        });
        this.state = 'inactive';
        this.onstop?.(new Event('stop'));
      }, 0);
    }

    stop() {
      this.state = 'inactive';
      this.onstop?.(new Event('stop'));
    }
  }

  Object.defineProperty(window, 'MediaRecorder', {
    configurable: true,
    value: FalseSuccessMediaRecorder,
  });
});
const falseSuccessPage = await falseSuccessContext.newPage();
let falseSuccessDownloads = 0;
falseSuccessPage.on('download', () => {
  falseSuccessDownloads += 1;
});
attachRuntimeDiagnostics(falseSuccessPage, 'recorder-false-success', runtimeErrors);
await waitForExperience(falseSuccessPage);

await falseSuccessPage.locator('[data-act="record"]').click();
await falseSuccessPage.waitForFunction(
  () => window.__BEIJING_LOOP_TEST__.readRecording().status === 'failed',
);
const unexpectedStop = await falseSuccessPage.evaluate(() =>
  window.__BEIJING_LOOP_TEST__.readRecording(),
);
assert.match(
  unexpectedStop.result?.error ?? '',
  /stopped.*unexpectedly/i,
  'unexpected stop evidence',
);
assert.equal(unexpectedStop.result?.blobSize, 0, 'unexpected stop empty blob');

await falseSuccessPage.locator('[data-act="record"]').click();
await falseSuccessPage.evaluate(() => window.__BEIJING_ADVANCE_RECORDER_CLOCK__());
await falseSuccessPage.waitForFunction(
  () => window.__BEIJING_LOOP_TEST__.readRecording().status === 'failed',
);
const emptyCompletion = await falseSuccessPage.evaluate(() => ({
  recording: window.__BEIJING_LOOP_TEST__.readRecording(),
  options: window.__BEIJING_RECORDER_OPTIONS__,
  trackStops: window.__BEIJING_TRACK_STOPS__,
  live: document.querySelector('[data-ui-live]')?.textContent ?? '',
}));
assert.match(
  emptyCompletion.recording.result?.error ?? '',
  /empty recording/i,
  'empty recording evidence',
);
assert.equal(emptyCompletion.recording.result?.blobSize, 0, 'empty completion blob');
assert.equal(
  emptyCompletion.options[0].mimeType,
  'video/webm;codecs=vp8',
  'supported WebM MIME is passed explicitly',
);
assert.equal(
  emptyCompletion.options[1].mimeType,
  'video/webm;codecs=vp8',
  'WebM MIME remains explicit on retry',
);
assert.equal(
  emptyCompletion.recording.result?.tracksStopped,
  emptyCompletion.recording.result?.trackCount,
  'empty recording leaked a track',
);
assert.ok(emptyCompletion.trackStops >= 2, 'false-success attempts leaked capture tracks');
assert.doesNotMatch(emptyCompletion.live, /recording complete/i, 'empty recording announced success');

// Even after the terminal frame is rendered, completion is not committed until
// our own post-drain stop call. A recorder that emits non-empty partial data and
// stops by itself inside the drain window must still fail without downloading.
await falseSuccessPage.locator('[data-act="record"]').click();
await falseSuccessPage.evaluate(() => window.__BEIJING_ADVANCE_RECORDER_CLOCK__());
await falseSuccessPage.waitForFunction(
  () => window.__BEIJING_LOOP_TEST__.readRecording().status === 'failed',
);
await falseSuccessPage.waitForTimeout(40);
const drainWindowStop = await falseSuccessPage.evaluate(() => ({
  recording: window.__BEIJING_LOOP_TEST__.readRecording(),
  trackStops: window.__BEIJING_TRACK_STOPS__,
  live: document.querySelector('[data-ui-live]')?.textContent ?? '',
}));
assert.match(
  drainWindowStop.recording.result?.error ?? '',
  /stopped.*unexpectedly/i,
  'drain-window unexpected stop evidence',
);
assert.ok(
  drainWindowStop.recording.result?.blobSize > 0,
  'drain-window fixture did not produce non-empty partial data',
);
assert.equal(
  drainWindowStop.recording.result?.tracksStopped,
  drainWindowStop.recording.result?.trackCount,
  'drain-window unexpected stop leaked a track',
);
assert.ok(drainWindowStop.trackStops >= 3, 'drain-window attempt leaked its capture track');
assert.equal(falseSuccessDownloads, 0, 'an incomplete drain-window recording was downloaded');
assert.doesNotMatch(
  drainWindowStop.live,
  /recording complete/i,
  'drain-window unexpected stop announced success',
);
reports['recorder-false-success'] = {
  unexpectedStopFailed: true,
  emptyCompletionFailed: true,
  drainWindowStopFailed: true,
  drainWindowPartialBlobSize: drainWindowStop.recording.result?.blobSize,
  downloads: falseSuccessDownloads,
  explicitWebmMime: true,
  trackStops: drainWindowStop.trackStops,
};
await falseSuccessContext.close();

const recorderErrorContext = await browser.newContext({
  viewport: { width: 800, height: 600 },
  deviceScaleFactor: 1,
});
await recorderErrorContext.addInitScript(() => {
  window.__BEIJING_TRACK_STOPS__ = 0;
  const nativeStop = MediaStreamTrack.prototype.stop;
  MediaStreamTrack.prototype.stop = function (...args) {
    window.__BEIJING_TRACK_STOPS__ += 1;
    return nativeStop.apply(this, args);
  };
  const NativeMediaRecorder = window.MediaRecorder;
  class ErrorMediaRecorder {
    static isTypeSupported(type) {
      return NativeMediaRecorder.isTypeSupported(type);
    }

    state = 'inactive';
    ondataavailable = null;
    onerror = null;
    onstop = null;

    start() {
      this.state = 'recording';
      setTimeout(() => this.onerror?.(new Event('error')), 30);
    }

    requestData() {}

    stop() {
      this.state = 'inactive';
      this.onstop?.(new Event('stop'));
    }
  }
  Object.defineProperty(window, 'MediaRecorder', {
    configurable: true,
    value: ErrorMediaRecorder,
  });
});
const recorderErrorPage = await recorderErrorContext.newPage();
attachRuntimeDiagnostics(recorderErrorPage, 'recorder-runtime-error', runtimeErrors);
await waitForExperience(recorderErrorPage);
await recorderErrorPage.locator('[data-act="record"]').click();
await recorderErrorPage.waitForFunction(
  () => window.__BEIJING_LOOP_TEST__.readRecording().status === 'failed',
);
const recorderErrorLive = await waitForLiveMessage(recorderErrorPage, /recording failed/i);
assert.ok(
  (await recorderErrorPage.evaluate(() => window.__BEIJING_TRACK_STOPS__)) >= 1,
  'MediaRecorder error leaked the canvas capture track',
);
assert.match(
  recorderErrorLive,
  /recording failed/i,
  'MediaRecorder runtime error is announced',
);
assert.equal(
  await recorderErrorPage.evaluate(() => window.__BEIJING_LOOP_TEST__.readState().playing),
  true,
  'MediaRecorder error restores previous playback',
);
reports['recorder-runtime-error'] = { trackStopped: true, playbackRestored: true };
await recorderErrorContext.close();

// Real 48-second capture regression. A 1.2-second main-thread stall must not
// shorten the scene traversal: the next frame catches up from wall time, the
// final non-duplicate frame is 2879/60s, and the UI returns to the exact seam.
const recordingContext = await browser.newContext({
  viewport: { width: 900, height: 640 },
  deviceScaleFactor: 1,
  acceptDownloads: true,
});
await recordingContext.addInitScript(() => {
  window.__BEIJING_TERMINAL_FRAME_REQUESTS__ = 0;
  window.__BEIJING_CAPTURE_STREAM_RATES__ = [];
  window.__BEIJING_CAPTURE_STREAM_SIZES__ = [];
  const nativeCaptureStream = HTMLCanvasElement.prototype.captureStream;
  HTMLCanvasElement.prototype.captureStream = function (...args) {
    window.__BEIJING_CAPTURE_STREAM_RATES__.push(args[0]);
    window.__BEIJING_CAPTURE_STREAM_SIZES__.push([this.width, this.height]);
    const stream = nativeCaptureStream.apply(this, args);
    for (const track of stream.getVideoTracks()) {
      if (typeof track.requestFrame !== 'function') continue;
      const nativeRequestFrame = track.requestFrame.bind(track);
      Object.defineProperty(track, 'requestFrame', {
        configurable: true,
        value: () => {
          window.__BEIJING_TERMINAL_FRAME_REQUESTS__ += 1;
          nativeRequestFrame();
        },
      });
    }
    return stream;
  };
});
const recordingPage = await recordingContext.newPage();
attachRuntimeDiagnostics(recordingPage, 'recording-stall', runtimeErrors);
await waitForExperience(recordingPage);
await seek(recordingPage, 0);
assert.equal(
  await recordingPage.evaluate(() => window.__BEIJING_LOOP_TEST__.readState().playing),
  false,
  'recording fixture starts paused',
);
const recordingDownloadPromise = recordingPage.waitForEvent('download', { timeout: 70_000 });
await recordingPage.locator('[data-act="record"]').click();
await recordingPage.waitForFunction(
  () => window.__BEIJING_LOOP_TEST__.readRecording().status === 'recording',
);
const activeCapturePerformance = await recordingPage.evaluate(() =>
  window.__BEIJING_LOOP_TEST__.readCapturePerformance(),
);
assert.equal(activeCapturePerformance.active, true, 'capture material mode is inactive');
assert.ok(
  activeCapturePerformance.proxiedMeshCount > 0,
  'capture material mode did not replace any lit meshes',
);
assert.ok(
  activeCapturePerformance.cachedProxyMaterialCount > 0,
  'capture material mode did not cache basic material proxies',
);
assert.equal(
  activeCapturePerformance.visibleLampLightCount,
  0,
  'capture material mode left point lights visible',
);
assert.deepEqual(
  await recordingPage.locator('canvas').evaluate((canvas) => [canvas.width, canvas.height]),
  [320, 180],
  'recording starts with the fixed software-safe backing size',
);
assert.equal(await recordingPage.locator('.ui-rec').isVisible(), true, 'record badge visible');
assert.equal(await recordingPage.locator('[data-act="play"]').isDisabled(), true, 'play locked during capture');
assert.equal(await recordingPage.locator('[data-act="record"]').isDisabled(), false, 'record stays available to cancel');
assert.equal(
  await recordingPage.locator('[data-act="record"]').getAttribute('aria-label'),
  'Cancel recording',
  'record control offers cancel while active',
);
assert.equal(await recordingPage.locator('[data-act="about"]').isDisabled(), true, 'about locked during capture');

await recordingPage.locator('body').click({ position: { x: 450, y: 500 } });
await recordingPage.keyboard.press('d');
assert.equal(await recordingPage.locator('.ui-debug').isVisible(), true, 'debug opens during recording');
const recordingDebugBoxes = await visibleOverlayBoxes(recordingPage);
assertOverlaySafety(recordingDebugBoxes, { width: 900, height: 640 }, 'recording/debug');
await recordingPage.setViewportSize({ width: 320, height: 568 });
await recordingPage.waitForTimeout(60);
assert.deepEqual(
  await recordingPage.locator('canvas').evaluate((canvas) => [canvas.width, canvas.height]),
  [320, 180],
  'mobile viewport resize changed the active capture track dimensions',
);
const recordingMobileDebugBoxes = await visibleOverlayBoxes(recordingPage);
assertOverlaySafety(
  recordingMobileDebugBoxes,
  { width: 320, height: 568 },
  'recording/debug/mobile-320',
);
await recordingPage.setViewportSize({ width: 900, height: 640 });
await recordingPage.waitForTimeout(60);
assert.deepEqual(
  await recordingPage.locator('canvas').evaluate((canvas) => [canvas.width, canvas.height]),
  [320, 180],
  'desktop viewport restore changed the active capture track dimensions',
);

await recordingPage.waitForTimeout(900);
await recordingPage.evaluate(() => {
  const until = performance.now() + 1200;
  while (performance.now() < until) {
    // Deliberately block rAF to reproduce the old short-lap recorder bug.
  }
});
await recordingPage.waitForTimeout(80);
const postStall = await recordingPage.evaluate(() => ({
  recording: window.__BEIJING_LOOP_TEST__.readRecording(),
  state: window.__BEIJING_LOOP_TEST__.readState(),
}));
assert.ok(postStall.recording.elapsedSeconds > 1.9, 'recording wall clock did not include the stall');
assert.ok(postStall.recording.sceneSeconds > 1.85, 'scene clock did not catch up after the stall');
assert.ok(
  Math.abs(postStall.state.phase * LOOP_SECONDS - postStall.recording.sceneSeconds) < 1e-10,
  'recording scene phase diverged from its authoritative frame time',
);

await recordingPage.waitForFunction(
  () => window.__BEIJING_LOOP_TEST__.readRecording().status === 'complete',
  undefined,
  { timeout: 70_000 },
);
const completedRecordingLive = await waitForLiveMessage(
  recordingPage,
  /recording complete.*48-second WebM/i,
  { timeout: 70_000 },
);
const completedRecording = await recordingPage.evaluate(() => ({
  recording: window.__BEIJING_LOOP_TEST__.readRecording(),
  state: window.__BEIJING_LOOP_TEST__.readState(),
  terminalFrameRequests: window.__BEIJING_TERMINAL_FRAME_REQUESTS__,
  captureStreamRates: window.__BEIJING_CAPTURE_STREAM_RATES__,
  captureStreamSizes: window.__BEIJING_CAPTURE_STREAM_SIZES__,
  capturePerformance: window.__BEIJING_LOOP_TEST__.readCapturePerformance(),
  canvasSize: [document.querySelector('canvas')?.width, document.querySelector('canvas')?.height],
}));
const recordingResult = completedRecording.recording.result;
assert.ok(recordingResult, 'recording completion result missing');
assert.equal(recordingResult.status, 'complete', 'recording result status');
assert.ok(
  recordingResult.elapsedSeconds >= 48 && recordingResult.elapsedSeconds < 49,
  `recording duration is unreasonable: ${recordingResult.elapsedSeconds}`,
);
assert.equal(recordingResult.totalFrames, 2880, 'recording frame budget');
assert.equal(recordingResult.finalFrameIndex, 2879, 'recording final non-duplicate frame');
assert.ok(
  Math.abs(recordingResult.finalSceneSeconds - 2879 / 60) < 1e-10,
  `recording final scene time: ${recordingResult.finalSceneSeconds}`,
);
assert.ok(recordingResult.blobSize > 0, 'recording blob is empty');
assert.ok(recordingResult.trackCount >= 1, 'recording stream has no video track');
assert.equal(
  recordingResult.tracksStopped,
  recordingResult.trackCount,
  'normal completion leaked a media stream track',
);
assert.equal(completedRecording.state.playing, false, 'recording restores previous paused state');
assert.ok(Math.abs(completedRecording.state.phase) < 1e-10, 'recording returns to the exact seam');
assert.equal(
  completedRecording.capturePerformance.active,
  false,
  'capture material mode remained active after recording',
);
assert.equal(
  completedRecording.capturePerformance.proxiedMeshCount,
  0,
  'capture material mode did not restore original mesh materials',
);
assert.ok(
  completedRecording.capturePerformance.visibleLampLightCount > 0,
  'capture material mode did not restore point lights',
);
assert.match(completedRecordingLive, /recording complete.*48-second WebM/i, 'completion announced');
assert.equal(await recordingPage.locator('.ui-rec').isVisible(), false, 'record badge clears');
assert.equal(await recordingPage.locator('[data-act="play"]').isDisabled(), false, 'play unlocks');
assert.equal(await recordingPage.locator('[data-act="record"]').isDisabled(), false, 'record unlocks');
assert.deepEqual(
  completedRecording.captureStreamRates,
  [60],
  'recording must use one automatic 60fps capture stream',
);
assert.deepEqual(
  completedRecording.captureStreamSizes,
  [[320, 180]],
  'recording stream was not created from the fixed software-safe backing size',
);
assert.deepEqual(
  completedRecording.canvasSize,
  [900, 640],
  'renderer backing size was not restored after recording',
);
assert.equal(
  completedRecording.terminalFrameRequests,
  1,
  'only the terminal frame may use manual requestFrame capture',
);
const recordingDownload = await recordingDownloadPromise;
assert.equal(
  recordingDownload.suggestedFilename(),
  'beijing-first-person-loop.webm',
  'recording download filename',
);
const recordingDownloadPath = await recordingDownload.path();
assert.ok(recordingDownloadPath, 'recording download has no readable artifact path');
const recordingBytes = readFileSync(recordingDownloadPath);
assert.equal(
  recordingBytes.length,
  recordingResult.blobSize,
  'downloaded WebM byte length differs from recorder result',
);
const webmTimeline = parseWebmTimeline(recordingBytes);
assert.ok(
  webmTimeline.lastTimestampSeconds >= 47.9 && webmTimeline.lastTimestampSeconds <= 48.3,
  `downloaded WebM ends at ${webmTimeline.lastTimestampSeconds.toFixed(3)}s instead of one loop`,
);
// captureStream(60) is still requested; software-GL CI may only deliver ~30
// encoded blocks/sec while keeping the 48s timeline intact.
assert.ok(
  webmTimeline.averageFps >= 28 && webmTimeline.averageFps <= 65,
  `downloaded WebM block rate ${webmTimeline.averageFps.toFixed(3)}fps is outside 28–65fps`,
);
reports['recording-stall'] = {
  elapsedSeconds: recordingResult.elapsedSeconds,
  finalFrameIndex: recordingResult.finalFrameIndex,
  finalSceneSeconds: recordingResult.finalSceneSeconds,
  blobSize: recordingResult.blobSize,
  tracksStopped: recordingResult.tracksStopped,
  trackCount: recordingResult.trackCount,
  restoredPhase: completedRecording.state.phase,
  combinedOverlaySafe: ['desktop-900', 'mobile-320'],
  terminalFrameRequests: completedRecording.terminalFrameRequests,
  captureStreamRates: completedRecording.captureStreamRates,
  captureStreamSizes: completedRecording.captureStreamSizes,
  downloadedWebm: webmTimeline,
};
await recordingContext.close();

const cancelContext = await browser.newContext({
  viewport: { width: 900, height: 640 },
  deviceScaleFactor: 1,
  acceptDownloads: true,
});
const cancelPage = await cancelContext.newPage();
attachRuntimeDiagnostics(cancelPage, 'recording-cancel', runtimeErrors);
await waitForExperience(cancelPage);
let cancelDownloaded = false;
cancelPage.on('download', () => {
  cancelDownloaded = true;
});
await cancelPage.locator('[data-act="record"]').click();
await cancelPage.waitForFunction(
  () => window.__BEIJING_LOOP_TEST__.readRecording().status === 'recording',
);
await cancelPage.waitForTimeout(400);
await cancelPage.locator('[data-act="record"]').click();
await cancelPage.waitForFunction(
  () => window.__BEIJING_LOOP_TEST__.readRecording().status === 'cancelled',
);
const cancelledRecordingLive = await waitForLiveMessage(
  cancelPage,
  /recording cancelled.*no video was downloaded/i,
);
const cancelledRecording = await cancelPage.evaluate(() => ({
  recording: window.__BEIJING_LOOP_TEST__.readRecording(),
}));
assert.equal(cancelledRecording.recording.active, false, 'cancelled recording left recorder active');
assert.equal(cancelledRecording.recording.status, 'cancelled', 'cancelled recording status');
assert.ok(
  (cancelledRecording.recording.result?.elapsedSeconds ?? 0) < 48,
  'cancelled recording ran a full loop before stopping',
);
assert.match(
  cancelledRecordingLive,
  /recording cancelled.*no video was downloaded/i,
  'cancel is announced',
);
assert.equal(cancelDownloaded, false, 'cancel must not download a WebM');
assert.equal(await cancelPage.locator('.ui-rec').isVisible(), false, 'cancel clears record badge');
assert.equal(
  await cancelPage.locator('[data-act="record"]').getAttribute('aria-label'),
  'Record one complete loop',
  'cancel restores record label',
);
reports['recording-cancel'] = {
  status: cancelledRecording.recording.status,
  elapsedSeconds: cancelledRecording.recording.result?.elapsedSeconds ?? 0,
  downloaded: cancelDownloaded,
};
await cancelContext.close();

const reducedContext = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
  reducedMotion: 'reduce',
});
const reducedPage = await reducedContext.newPage();
attachRuntimeDiagnostics(reducedPage, 'reduced-motion', runtimeErrors);
await waitForExperience(reducedPage);
const reducedInitial = await reducedPage.evaluate(() => window.__BEIJING_LOOP_TEST__.readState());
assert.equal(reducedInitial.reducedMotion, true, 'reduced-motion preference exposed');
assert.equal(reducedInitial.playing, false, 'reduced-motion does not autoplay');
assert.ok(
  Math.abs(reducedInitial.phase - REDUCED_POSTER_PHASE) < 1e-10,
  'reduced-motion poster phase',
);
assert.ok(
  Math.abs(reducedInitial.progress - REDUCED_POSTER_PHASE) < 1e-10,
  'reduced-motion poster progress',
);
const reducedReport = await canvasReport(reducedPage);
assertFirstPersonFrame(reducedReport, 'reduced-motion poster');
await reducedPage.waitForTimeout(420);
const reducedLater = await reducedPage.evaluate(() => window.__BEIJING_LOOP_TEST__.readState());
assert.equal(reducedLater.playing, false, 'reduced-motion remains paused');
assert.ok(
  Math.abs(reducedLater.phase - REDUCED_POSTER_PHASE) < 1e-10,
  'reduced-motion phase remains fixed',
);
assert.ok(
  Math.abs(reducedLater.progress - REDUCED_POSTER_PHASE) < 1e-10,
  'reduced-motion progress remains fixed',
);
await reducedPage.locator('[data-act="play"]').click();
const reducedOptInDelta = 1 / (LOOP_SECONDS * 20);
await reducedPage.waitForFunction(
  ({ posterPhase, reducedOptInDelta }) => {
    const state = window.__BEIJING_LOOP_TEST__.readState();
    return state.playing && state.progress > posterPhase + reducedOptInDelta;
  },
  { posterPhase: REDUCED_POSTER_PHASE, reducedOptInDelta },
  { timeout: 45_000 },
);
const reducedOptIn = await reducedPage.evaluate(() => window.__BEIJING_LOOP_TEST__.readState());
assert.equal(reducedOptIn.playing, true, 'reduced-motion explicit Play opts into travel');
assert.ok(
  reducedOptIn.progress > REDUCED_POSTER_PHASE + reducedOptInDelta && reducedOptIn.progress < 0.2,
  `reduced-motion Play must continue smoothly from the poster: ${reducedOptIn.progress}`,
);
reports['reduced-motion'] = { ...reducedReport, optInProgress: reducedOptIn.progress };
await reducedContext.close();

const webglUnavailableContext = await browser.newContext({
  viewport: { width: 800, height: 600 },
  deviceScaleFactor: 1,
});
const webglUnavailablePage = await webglUnavailableContext.newPage();
const webglDiagnosticErrors = [];
attachRuntimeDiagnostics(webglUnavailablePage, 'webgl-unavailable-startup', webglDiagnosticErrors);
await webglUnavailablePage.addInitScript(() => {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...args) {
    if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null;
    return originalGetContext.call(this, type, ...args);
  };
});
const webglDiagnosticStartedAt = performance.now();
await assert.rejects(
  () =>
    waitForExperience(
      webglUnavailablePage,
      'webgl-unavailable-startup',
      webglDiagnosticErrors,
      { suppressScreenshot: true },
    ),
  (error) => {
    assert.match(error.message, /boot error/i, 'startup diagnostic identifies the boot error');
    assert.match(error.message, /WebGL/i, 'startup diagnostic preserves the full WebGL message');
    return true;
  },
  'WebGL-unavailable startup must fail through the diagnostic helper',
);
const webglDiagnosticMs = performance.now() - webglDiagnosticStartedAt;
assert.ok(
  webglDiagnosticMs < 5_000,
  `WebGL startup diagnostic took ${webglDiagnosticMs.toFixed(0)}ms instead of failing promptly`,
);
const webglError = webglUnavailablePage.locator('.boot.error');
assert.equal(await webglError.getAttribute('role'), 'alert', 'WebGL error role');
assert.equal(await webglError.getAttribute('aria-live'), 'assertive', 'WebGL error live region');
assert.equal(await webglError.getAttribute('aria-atomic'), 'true', 'WebGL error atomicity');
assert.match((await webglError.textContent()) ?? '', /WebGL/i, 'WebGL error text');
assert.equal(await webglUnavailablePage.locator('canvas').count(), 0, 'WebGL error has no canvas');
reports['webgl-unavailable'] = {
  accessibleAlert: true,
  canvasCount: 0,
  diagnosticMs: webglDiagnosticMs,
};
await webglUnavailableContext.close();

if (process.env.EXPECT_PRODUCTION === '1') {
  const productionUrl = new globalThis.URL(URL);
  productionUrl.searchParams.delete('qa');
  const productionContext = await browser.newContext({
    viewport: { width: 900, height: 640 },
    deviceScaleFactor: 1,
  });
  const productionPage = await productionContext.newPage();
  attachRuntimeDiagnostics(productionPage, 'production-no-hook', runtimeErrors);
  await productionPage.goto(productionUrl.href, { waitUntil: 'networkidle' });
  await productionPage.waitForSelector('canvas');
  await productionPage.waitForTimeout(80);
  assert.equal(
    await productionPage.evaluate(() => typeof window.__BEIJING_LOOP_TEST__),
    'undefined',
    'production test hook leaked without ?qa=1',
  );
  reports['production-no-hook'] = { explicitQaRequired: true };
  await productionContext.close();
}

await browser.close();
assert.deepEqual(runtimeErrors, [], `runtime failures:\n${runtimeErrors.join('\n')}`);
console.log('=== FIRST-PERSON BROWSER VERIFY ===');
console.log(JSON.stringify(reports, null, 2));
console.log('FIRST-PERSON BROWSER OK');
