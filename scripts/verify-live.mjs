import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXPECTED_ORIGIN = 'https://brickerp.github.io';
const expectedLiveOrigin = process.env.LIVE_ORIGIN ?? EXPECTED_ORIGIN;
const deploymentUrl = process.env.DEPLOYMENT_URL ?? process.argv[2];
const distDirectory = path.resolve(ROOT, process.env.DIST_DIR ?? 'dist');
const requestTimeoutMs = positiveInteger('REQUEST_TIMEOUT_MS', 8_000);
const retryDelayMs = positiveInteger('RETRY_DELAY_MS', 5_000);
const maxAttempts = positiveInteger('MAX_ATTEMPTS', 12);
const deadlineMs = positiveInteger('SMOKE_DEADLINE_MS', 120_000);

assert.ok(deploymentUrl, 'DEPLOYMENT_URL or a deployment URL argument is required');
const baseUrl = new URL(deploymentUrl);
assert.equal(baseUrl.origin, expectedLiveOrigin, `unexpected Pages origin: ${baseUrl.origin}`);
assert.equal(baseUrl.pathname, '/', `unexpected Pages base path: ${baseUrl.pathname}`);

function positiveInteger(name, defaultValue) {
  const value = Number(process.env[name] ?? defaultValue);
  assert.ok(Number.isSafeInteger(value) && value > 0, `${name} must be a positive integer`);
  return value;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function attribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}=(['\"])(.*?)\\1`, 'i'))?.[2];
}

function meta(html, key, value) {
  const expected = new RegExp(`^${escapeRegExp(value)}$`, 'i');
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    if (expected.test(attribute(tag, key) ?? '')) return attribute(tag, 'content');
  }
  return undefined;
}

function canonical(html) {
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    if ((attribute(tag, 'rel') ?? '').split(/\s+/).includes('canonical')) return attribute(tag, 'href');
  }
  return undefined;
}

function normalizedRobots(html) {
  return meta(html, 'name', 'robots')?.toLowerCase().replace(/\s/g, '');
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

async function distFiles(directory = distDirectory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) {
      files.push(...await distFiles(path.join(directory, entry.name), relative));
    } else if (entry.isFile()) {
      files.push(relative);
    }
  }
  return files.sort();
}

function livePath(relative) {
  if (relative === 'index.html') return '/';
  if (relative.endsWith('/index.html')) return `/${relative.slice(0, -'index.html'.length)}`;
  return `/${relative}`;
}

function expectedContentType(relative) {
  if (relative.endsWith('.html')) return /^text\/html\b/i;
  if (relative.endsWith('.css')) return /^text\/css\b/i;
  if (relative.endsWith('.js')) return /^(?:text|application)\/(?:javascript|ecmascript)\b/i;
  if (relative.endsWith('.png')) return /^image\/png\b/i;
  if (relative.endsWith('.pdf')) return /^application\/pdf\b/i;
  if (relative.endsWith('.txt')) return /^text\/plain\b/i;
  if (relative.endsWith('.xml')) return /^(?:application|text)\/xml\b/i;
  throw new Error(`unsupported deployed file type: ${relative}`);
}

async function expectedHash(relativePath) {
  return sha256(await readFile(path.join(ROOT, 'public', relativePath)));
}

const approvedHashes = new Map(await Promise.all(
  ['social-preview.png', 'profile-preview.png', 'resume.pdf'].map(async (file) => [file, await expectedHash(file)]),
));

async function fetchBytes(pathname, contentType) {
  const response = await fetch(new URL(pathname, baseUrl), {
    redirect: 'manual',
    headers: {
      'cache-control': 'no-cache',
      pragma: 'no-cache',
      'user-agent': 'BrickerP-post-deploy-smoke/1.0',
    },
    signal: AbortSignal.timeout(requestTimeoutMs),
  });
  assert.equal(response.status, 200, `${pathname}: expected HTTP 200, got ${response.status}`);
  assert.match(response.headers.get('content-type') ?? '', contentType, `${pathname}: wrong content type`);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.ok(bytes.length > 0, `${pathname}: empty response body`);
  return bytes;
}

async function fetchHtml(pathname) {
  return (await fetchBytes(pathname, /^text\/html\b/i)).toString('utf8');
}

async function verifyDistParity() {
  const files = await distFiles();
  assert.ok(files.length > 0, `immutable dist is empty: ${distDirectory}`);
  await Promise.all(files.map(async (relative) => {
    const expected = await readFile(path.join(distDirectory, relative));
    const pathname = livePath(relative);
    const live = await fetchBytes(pathname, expectedContentType(relative));
    assert.equal(live.length, expected.length, `${pathname}: deployed size differs from immutable dist`);
    assert.equal(sha256(live), sha256(expected), `${pathname}: deployed bytes differ from immutable dist`);
  }));
  return files;
}

function assertPage(html, pathname, expectedCanonical, expectedRobots) {
  assert.equal(canonical(html), expectedCanonical, `${pathname}: wrong canonical`);
  assert.equal(normalizedRobots(html), expectedRobots, `${pathname}: wrong robots directive`);
}

function criticalAssets(rootHtml) {
  const references = [];
  for (const tag of rootHtml.match(/<(?:script|link)\b[^>]*>/gi) ?? []) {
    const isScript = tag.toLowerCase().startsWith('<script');
    if (!isScript && !(attribute(tag, 'rel') ?? '').split(/\s+/).includes('stylesheet')) continue;
    const reference = attribute(tag, isScript ? 'src' : 'href');
    if (reference && /^(?:\.\/|\/)assets\//.test(reference)) {
      references.push(new URL(reference, baseUrl).pathname);
    }
  }
  return [...new Set(references)].sort();
}

async function verifyAttempt() {
  const nestedPath = '/poe2/guides/classes-explained.html';
  const nestedTarget = `${EXPECTED_ORIGIN}/poe2-build-lab/guides/classes-explained.html`;
  const deployedFiles = await verifyDistParity();
  const [rootHtml, aboutHtml, beijingHtml, nestedHtml, socialPreview, profilePreview, resume] = await Promise.all([
    fetchHtml('/'),
    fetchHtml('/about/'),
    fetchHtml('/beijing-loop/'),
    fetchHtml(nestedPath),
    fetchBytes('/social-preview.png', /^image\/png\b/i),
    fetchBytes('/profile-preview.png', /^image\/png\b/i),
    fetchBytes('/resume.pdf', /^application\/pdf\b/i),
  ]);

  assertPage(rootHtml, '/', `${EXPECTED_ORIGIN}/`, undefined);
  assert.equal(meta(rootHtml, 'property', 'og:image'), `${EXPECTED_ORIGIN}/social-preview.png`, '/: wrong social preview');
  assertPage(aboutHtml, '/about/', `${EXPECTED_ORIGIN}/about/`, undefined);
  assert.equal(meta(aboutHtml, 'property', 'og:image'), `${EXPECTED_ORIGIN}/profile-preview.png`, '/about/: wrong social preview');
  assertPage(beijingHtml, '/beijing-loop/', `${EXPECTED_ORIGIN}/`, 'noindex,follow');
  assert.equal(meta(beijingHtml, 'http-equiv', 'refresh'), '0; url=/', '/beijing-loop/: wrong refresh target');
  assertPage(nestedHtml, nestedPath, nestedTarget, 'noindex,follow');
  assert.equal(meta(nestedHtml, 'http-equiv', 'refresh'), `0; url=${nestedTarget}`, `${nestedPath}: wrong refresh target`);

  for (const [file, bytes] of [
    ['social-preview.png', socialPreview],
    ['profile-preview.png', profilePreview],
    ['resume.pdf', resume],
  ]) {
    assert.equal(sha256(bytes), approvedHashes.get(file), `/${file}: deployed bytes do not match the approved artifact`);
  }

  const assets = criticalAssets(rootHtml);
  assert.ok(assets.some((asset) => asset.endsWith('.js')), '/: no critical JavaScript asset found');
  await Promise.all(assets.map((asset) => fetchBytes(
    asset,
    asset.endsWith('.css') ? /^text\/css\b/i : /^(?:text|application)\/(?:javascript|ecmascript)\b/i,
  )));
  return { assets, deployedFiles };
}

const startedAt = Date.now();
let lastError;
for (let attempt = 1; attempt <= maxAttempts && Date.now() - startedAt < deadlineMs; attempt += 1) {
  try {
    const { assets, deployedFiles } = await verifyAttempt();
    console.log(`Live Pages smoke passed on attempt ${attempt}: ${baseUrl.href}`);
    console.log(`Exact immutable-dist parity: ${deployedFiles.length} files`);
    console.log(`Critical assets: ${assets.join(', ')}`);
    process.exit(0);
  } catch (error) {
    lastError = error;
    const elapsedMs = Date.now() - startedAt;
    console.error(`Attempt ${attempt}/${maxAttempts} failed after ${elapsedMs}ms: ${error.message}`);
    if (attempt < maxAttempts && elapsedMs + retryDelayMs < deadlineMs) {
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }
}

throw new Error(`Live Pages smoke failed within ${deadlineMs}ms`, { cause: lastError });
