import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FULL_RESUME, assertAccessibleResume } from './verify-resume.mjs';
import { readPublicProfile } from './generate-about.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const HTTP_ORIGIN = process.env.URL;
const publicProfile = await readPublicProfile();

async function read(relativePath) {
  return readFile(path.join(DIST, relativePath), 'utf8');
}

function assertPng(buffer, name) {
  assert.equal(buffer.subarray(1, 4).toString('ascii'), 'PNG', `${name}: invalid PNG signature`);
  assert.equal(buffer.readUInt32BE(16), 1200, `${name}: width must be 1200px`);
  assert.equal(buffer.readUInt32BE(20), 630, `${name}: height must be 630px`);
}

const POSITIONING = 'AI agent &amp; backend engineer — I take agents from demo to production: MCP tools, guardrails, evals, billing, real-time systems.';

/** Visible text of an HTML document: tags are removed until none remain, then whitespace collapses. */
function visibleText(html) {
  let text = html;
  let previous;
  do {
    previous = text;
    text = text.replace(/<[^>]*>/g, '');
  } while (text !== previous);
  return text.replace(/\s+/g, ' ');
}

const home = await read('index.html');
assert.match(home, /<link\b[^>]*rel=["']canonical["'][^>]*href=["']https:\/\/brickerp\.github\.io\/["']/i, 'dist landing canonical');
assert.ok(visibleText(home).includes(POSITIONING), 'dist landing must carry the one-line positioning');
assert.match(home, /"@type"\s*:\s*"WebSite"/, 'dist landing WebSite JSON-LD');
assert.doesNotMatch(home, /<script\b[^>]*src=/i, 'dist landing must stay static');
assert.match(home, /<a\b[^>]*href=["']\/beijing-loop\/["']/i, 'dist landing must keep the film reachable');

const film = await read('beijing-loop/index.html');
assert.match(film, /<link\b[^>]*rel=["']canonical["'][^>]*href=["']https:\/\/brickerp\.github\.io\/beijing-loop\/["']/i, 'dist film canonical');
assert.match(film, /"@type"\s*:\s*"CreativeWork"/, 'dist film CreativeWork JSON-LD');
assert.match(film, /<script\b[^>]*type=["']module["'][^>]*src=["'](?:\.\.\/|\/)assets\/[^"']+\.js["']/i, 'dist film must load the built runtime bundle');

const hire = await read('hire/index.html');
assert.match(hire, /<link\b[^>]*rel=["']canonical["'][^>]*href=["']https:\/\/brickerp\.github\.io\/hire\/["']/i, 'dist hire canonical');
assert.ok(visibleText(hire).includes(POSITIONING), 'dist hire must carry the one-line positioning');

const about = await read('about/index.html');
assert.match(about, /<link\b[^>]*rel=["']canonical["'][^>]*href=["']https:\/\/brickerp\.github\.io\/about\/["']/i, 'dist about canonical');
assert.match(about, /(?:property=["']og:image["'][^>]*content|content)=["']https:\/\/brickerp\.github\.io\/profile-preview\.png["']/i, 'dist about profile image');
assert.match(about, /"@type"\s*:\s*"ProfilePage"/, 'dist about ProfilePage JSON-LD');

const sheet = await read('work/quant/index.html');
assert.match(sheet, /<link\b[^>]*rel=["']canonical["'][^>]*href=["']https:\/\/brickerp\.github\.io\/work\/quant\/["']/i, 'dist technical sheet canonical');
assert.match(sheet, /"@type"\s*:\s*"TechArticle"/, 'dist technical sheet TechArticle JSON-LD');
assert.match(sheet, /<!-- PROGRAMME:STYLE:START -->\s*<style>/, 'dist technical sheet must inline the programme stylesheet');

const redirect = await read('poe2/guides/classes-explained.html');
assert.match(redirect, /name=["']robots["'][^>]*content=["']noindex,follow["']/i, 'nested redirect robots');
assert.match(redirect, /rel=["']canonical["'][^>]*href=["']https:\/\/brickerp\.github\.io\/poe2-build-lab\/guides\/classes-explained\.html["']/i, 'nested redirect canonical');
assert.match(redirect, /http-equiv=["']refresh["'][^>]*content=["']0; url=https:\/\/brickerp\.github\.io\/poe2-build-lab\/guides\/classes-explained\.html["']/i, 'nested redirect refresh');

assert.doesNotMatch(film, /name=["']robots["']/i, 'film page must be indexable, not a redirect stub');
assert.doesNotMatch(film, /http-equiv=["']refresh["']/i, 'film page must not redirect');

for (const image of ['social-preview.png', 'profile-preview.png']) {
  assertPng(await readFile(path.join(DIST, image)), `dist/${image}`);
}
assertAccessibleResume(await readFile(path.join(DIST, 'resume.pdf')), 'dist/resume.pdf', FULL_RESUME);

if (HTTP_ORIGIN) {
  const cases = [
    { pathname: '/', type: /^text\/html\b/i, body: /"WebSite"[\s\S]*I take agents from demo to production/ },
    { pathname: '/hire/', type: /^text\/html\b/i, body: /I take agents from demo to production[\s\S]*overlaps my employer/ },
    { pathname: '/about/', type: /^text\/html\b/i, body: /profile-preview\.png/ },
    { pathname: '/work/quant/', type: /^text\/html\b/i, body: /"TechArticle"[\s\S]*Pending re-measure/ },
    {
      pathname: '/beijing-loop/',
      type: /^text\/html\b/i,
      body: /"CreativeWork"[\s\S]*https:\/\/brickerp\.github\.io\/beijing-loop\//,
    },
    {
      pathname: '/poe2/guides/classes-explained.html',
      type: /^text\/html\b/i,
      body: /noindex,follow[\s\S]*poe2-build-lab\/guides\/classes-explained\.html/,
    },
    { pathname: '/social-preview.png', type: /^image\/png\b/i, png: true },
    { pathname: '/profile-preview.png', type: /^image\/png\b/i, png: true },
    { pathname: '/resume.pdf', type: /^application\/pdf\b/i, resume: true },
  ];
  for (const definition of cases) {
    const response = await fetch(new URL(definition.pathname, HTTP_ORIGIN));
    assert.equal(response.status, 200, `${definition.pathname}: expected HTTP 200`);
    assert.match(response.headers.get('content-type') ?? '', definition.type, `${definition.pathname}: wrong content type`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (definition.png) assertPng(bytes, definition.pathname);
    if (definition.resume) assertAccessibleResume(bytes, definition.pathname, FULL_RESUME);
    if (definition.body) assert.match(bytes.toString('utf8'), definition.body, `${definition.pathname}: response body contract`);
  }
}

if (HTTP_ORIGIN && process.env.VERIFY_LAYOUT === '1') {
  const { chromium } = await import('playwright');
  let browser;
  try {
    browser = process.env.PW_CHANNEL
      ? await chromium.launch({ channel: process.env.PW_CHANNEL })
      : await chromium.launch();
  } catch {
    browser = await chromium.launch({ channel: 'chrome' });
  }
  try {
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 320, height: 568 },
    ]) {
      const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
      await page.goto(new URL('/about/', HTTP_ORIGIN).href, { waitUntil: 'networkidle' });
      const result = await page.evaluate(() => ({
        innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        proofTargets: [...document.querySelectorAll('.proof-link')].map((link) => {
          const box = link.getBoundingClientRect();
          return { width: box.width, height: box.height };
        }),
      }));
      assert.equal(result.scrollWidth, result.innerWidth, `${viewport.width}px about page overflow`);
      assert.equal(result.proofTargets.length, publicProfile.publicProof.length, `${viewport.width}px proof target count`);
      for (const [index, box] of result.proofTargets.entries()) {
        assert.ok(box.width >= 44 && box.height >= 44, `${viewport.width}px proof target ${index + 1} is smaller than 44px`);
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

console.log(`Dist integrity verified${HTTP_ORIGIN ? ` over ${HTTP_ORIGIN}` : ' on disk'}: landing, film, hire, profile, redirects, previews, resume${process.env.VERIFY_LAYOUT === '1' ? ', and mobile proof targets' : ''}.`);
