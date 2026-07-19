import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { documentFor, redirectPaths } from './generate-poe2-redirects.mjs';
import { assertAboutIsGenerated, escapeHtml, readPublicProfile } from './generate-about.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE_ORIGIN = 'https://brickerp.github.io';
const POE2_TARGET = `${SITE_ORIGIN}/poe2-build-lab/`;
const APPROVED_RESUME_SHA256 = '3a4ceeebef174745fa8117dafee31d5741eb63f23891b60f47e1c94ad9eeff7e';

async function text(relativePath) {
  return readFile(path.join(ROOT, relativePath), 'utf8');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function attribute(html, selector, name) {
  const tags = html.match(new RegExp(`<${selector}\\b[^>]*>`, 'gi')) ?? [];
  for (const tag of tags) {
    const match = tag.match(new RegExp(`\\b${name}=["']([^"']+)["']`, 'i'));
    if (match) return match[1];
  }
  return undefined;
}

function meta(html, key, value) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const keyMatch = tag.match(new RegExp(`\\b${key}=["']${escapeRegExp(value)}["']`, 'i'));
    if (!keyMatch) continue;
    return tag.match(/\bcontent=["']([^"']+)["']/i)?.[1];
  }
  return undefined;
}

function linkHref(html, rel) {
  const tags = html.match(/<link\b[^>]*>/gi) ?? [];
  return tags.find((tag) => new RegExp(`\\brel=["']${rel}["']`, 'i').test(tag))
    ?.match(/\bhref=(["'])(.*?)\1/i)?.[2];
}

function jsonLd(html, file) {
  const blocks = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  assert.ok(blocks.length > 0, `${file}: missing JSON-LD`);
  return blocks.map((block, index) => {
    try {
      return JSON.parse(block[1]);
    } catch (error) {
      throw new Error(`${file}: JSON-LD block ${index + 1} is invalid: ${error.message}`);
    }
  });
}

function assertPageMetadata(html, file, canonical, previewImage) {
  assert.equal(attribute(html, 'html', 'lang'), 'en', `${file}: document language must be English`);
  assert.match(html, new RegExp(`<link\\b[^>]*rel=["']canonical["'][^>]*href=["']${escapeRegExp(canonical)}["']`, 'i'), `${file}: wrong canonical`);
  assert.equal(meta(html, 'property', 'og:url'), canonical, `${file}: wrong og:url`);
  assert.equal(meta(html, 'property', 'og:image'), `${SITE_ORIGIN}/${previewImage}`, `${file}: wrong og:image`);
  assert.equal(meta(html, 'name', 'twitter:card'), 'summary_large_image', `${file}: missing Twitter card`);
  assert.equal(meta(html, 'name', 'twitter:image'), `${SITE_ORIGIN}/${previewImage}`, `${file}: wrong Twitter image`);
  assert.ok(meta(html, 'property', 'og:title'), `${file}: missing og:title`);
  assert.ok(meta(html, 'property', 'og:description'), `${file}: missing og:description`);
  assert.ok(meta(html, 'name', 'twitter:title'), `${file}: missing twitter:title`);
  assert.ok(meta(html, 'name', 'twitter:description'), `${file}: missing twitter:description`);
}

async function assertLocalReferences(html, file) {
  const references = [...html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)].map((match) => match[1]);
  for (const reference of references) {
    if (/^(?:https?:|mailto:|data:|#)/i.test(reference)) continue;
    if (reference.startsWith('/src/')) {
      await access(path.join(ROOT, reference.slice(1)));
      continue;
    }
    const clean = reference.split(/[?#]/, 1)[0];
    if (!clean || clean === '/') continue;
    const candidate = clean.startsWith('/')
      ? path.join(ROOT, 'public', clean.slice(1))
      : path.resolve(ROOT, path.dirname(file), clean);
    const resolved = clean.endsWith('/') ? path.join(candidate, 'index.html') : candidate;
    await access(resolved).catch(() => {
      throw new Error(`${file}: missing local reference ${reference}`);
    });
  }
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const resolved = path.join(directory, entry.name);
    files.push(...(entry.isDirectory() ? await walk(resolved) : [resolved]));
  }
  return files;
}

const rootHtml = await text('index.html');
const aboutHtml = await text('public/about/index.html');
const publicProfile = await readPublicProfile();
await assertAboutIsGenerated();
assertPageMetadata(rootHtml, 'index.html', `${SITE_ORIGIN}/`, 'social-preview.png');
assertPageMetadata(aboutHtml, 'public/about/index.html', `${SITE_ORIGIN}/about/`, 'profile-preview.png');
const rootFavicon = linkHref(rootHtml, 'icon');
assert.ok(rootFavicon?.startsWith('data:image/svg+xml,'), 'index.html: missing inline SVG favicon');
assert.equal(linkHref(aboutHtml, 'icon'), rootFavicon, 'about: favicon must match the root artwork identity');

const rootData = jsonLd(rootHtml, 'index.html').flatMap((item) => item['@graph'] ?? [item]);
assert.ok(rootData.some((item) => item['@type'] === 'WebSite'), 'index.html: WebSite JSON-LD missing');
assert.ok(rootData.some((item) => item['@type'] === 'CreativeWork'), 'index.html: CreativeWork JSON-LD missing');
assert.ok(!rootData.some((item) => item['@type'] === 'ProfilePage'), 'index.html: artwork must not claim ProfilePage');

const aboutData = jsonLd(aboutHtml, 'public/about/index.html');
const profile = aboutData.find((item) => item['@type'] === 'ProfilePage');
assert.equal(profile?.mainEntity?.['@type'], 'Person', 'about: ProfilePage mainEntity must be a Person');
const profileTitle = `${publicProfile.name} — ${publicProfile.role}`;
assert.equal(
  meta(aboutHtml, 'name', 'description'),
  `${profileTitle}. ${publicProfile.summary}`,
  'about: description drifted from public profile',
);
assert.equal(meta(aboutHtml, 'property', 'og:title'), profileTitle, 'about: og:title drifted from public profile');
assert.equal(meta(aboutHtml, 'property', 'og:description'), publicProfile.summary, 'about: og:description drifted from public profile');
assert.equal(meta(aboutHtml, 'property', 'og:site_name'), `${publicProfile.name} — BrickerP`, 'about: og:site_name drifted from public profile');
assert.equal(meta(aboutHtml, 'property', 'og:image:alt'), `${profileTitle} profile card.`, 'about: og:image:alt drifted from public profile');
assert.equal(meta(aboutHtml, 'name', 'twitter:title'), profileTitle, 'about: twitter:title drifted from public profile');
assert.equal(meta(aboutHtml, 'name', 'twitter:description'), publicProfile.summary, 'about: twitter:description drifted from public profile');
assert.equal(meta(aboutHtml, 'name', 'twitter:image:alt'), `${profileTitle} profile card.`, 'about: twitter:image:alt drifted from public profile');
assert.ok(aboutHtml.includes(`<title>${escapeHtml(profileTitle)}</title>`), 'about: title drifted from public profile');
for (const visibleText of [
  publicProfile.name,
  publicProfile.role,
  publicProfile.status,
  publicProfile.summary,
  publicProfile.experienceNote,
  publicProfile.focus,
  ...publicProfile.primaryActions.map(({ staticLabel }) => staticLabel),
]) {
  assert.ok(aboutHtml.includes(escapeHtml(visibleText)), `about: missing visible content “${visibleText}”`);
}
for (const { href: proofUrl } of publicProfile.publicProof) {
  assert.match(
    aboutHtml,
    new RegExp(`<a\\b[^>]*href=["']${escapeRegExp(proofUrl)}["']`, 'i'),
    `about: public proof must link to ${proofUrl}`,
  );
}
assert.equal(
  (aboutHtml.match(/<a\b[^>]*class=["'][^"']*proof-link[^"']*["']/gi) ?? []).length,
  publicProfile.publicProof.length,
  'about: each public proof card must expose one full-card link target',
);
const email = publicProfile.elsewhere
  .find(({ id }) => id === publicProfile.identity.emailLinkId)
  ?.href.replace(/^mailto:/, '');
const sameAs = publicProfile.identity.sameAsLinkIds.map((id) =>
  publicProfile.elsewhere.find((link) => link.id === id)?.href,
);
assert.equal(profile.mainEntity.name, publicProfile.name, 'about: JSON-LD name drifted from public profile');
assert.equal(profile.mainEntity.jobTitle, publicProfile.role, 'about: JSON-LD role drifted from public profile');
assert.equal(profile.mainEntity.email, email, 'about: JSON-LD email drifted from public profile');
assert.deepEqual(profile.mainEntity.sameAs, sameAs, 'about: JSON-LD sameAs drifted from public profile');
assert.equal(profile.dateModified, publicProfile.dateModified, 'about: JSON-LD dateModified drifted from public profile');
assert.match(rootHtml, /<span\s+lang=["']zh-CN["']>北京<\/span>/, 'index.html: Chinese text needs an explicit language span');

const sitemap = await text('public/sitemap.xml');
assert.match(sitemap, /<loc>https:\/\/brickerp\.github\.io\/<\/loc>/, 'sitemap: root URL missing');
assert.match(sitemap, /<loc>https:\/\/brickerp\.github\.io\/about\/<\/loc>/, 'sitemap: about URL missing');
assert.doesNotMatch(sitemap, /\/poe2\//, 'sitemap: legacy PoE2 redirects must not be indexed');

const notFound = await text('public/404.html');
assert.match(
  notFound,
  /href=["']https:\/\/brickerp\.github\.io\/poe2-build-lab\/["']/i,
  '404 page must link directly to the current PoE2 site',
);
assert.doesNotMatch(notFound, /href=["']\/poe2\/["']/i, '404 page must not advertise the legacy PoE2 archive');

const legacyBeijingLoop = await text('public/beijing-loop/index.html');
assert.equal(
  meta(legacyBeijingLoop, 'name', 'robots'),
  'noindex, follow',
  'public/beijing-loop/index.html: wrong robots directive',
);
assert.equal(
  linkHref(legacyBeijingLoop, 'canonical'),
  `${SITE_ORIGIN}/`,
  'public/beijing-loop/index.html: wrong target canonical',
);
assert.equal(
  meta(legacyBeijingLoop, 'http-equiv', 'refresh'),
  '0; url=/',
  'public/beijing-loop/index.html: wrong instant redirect',
);
assert.match(
  legacyBeijingLoop,
  /<a\b[^>]*href=["']\/["']/i,
  'public/beijing-loop/index.html: missing accessible destination link',
);

for (const route of redirectPaths) {
  const file = `public/poe2/${route || 'index.html'}`;
  const html = await text(file);
  const expected = `${POE2_TARGET}${route}`;
  assert.equal(html, documentFor(route), `${file}: committed redirect drifted from its generator`);
  assert.equal(meta(html, 'name', 'robots')?.replace(/\s/g, ''), 'noindex,follow', `${file}: wrong robots directive`);
  assert.match(html, new RegExp(`<link\\b[^>]*rel=["']canonical["'][^>]*href=["']${escapeRegExp(expected)}["']`, 'i'), `${file}: wrong target canonical`);
  assert.equal(meta(html, 'http-equiv', 'refresh'), `0; url=${expected}`, `${file}: wrong instant redirect`);
  assert.match(html, new RegExp(`<a\\b[^>]*href=["']${escapeRegExp(expected)}["']`, 'i'), `${file}: missing accessible destination link`);
}

const publicFiles = await walk(path.join(ROOT, 'public'));
for (const file of publicFiles) {
  const relative = path.relative(path.join(ROOT, 'public'), file);
  assert.ok(!file.endsWith('.py'), `public/${relative}: Python source must not be deployed`);
  assert.notEqual(path.basename(file), 'OPERATIONS.md', `public/${relative}: operations notes must not be deployed`);
}
const poe2Files = publicFiles.filter((file) => file.includes(`${path.sep}poe2${path.sep}`));
const actualRedirectFiles = poe2Files
  .filter((file) => file.endsWith('.html'))
  .map((file) => path.relative(path.join(ROOT, 'public', 'poe2'), file))
  .sort();
const expectedRedirectFiles = redirectPaths.map((route) => route || 'index.html').sort();
assert.deepEqual(actualRedirectFiles, expectedRedirectFiles, 'public/poe2: every deployed HTML file must have an explicit redirect mapping');
for (const file of poe2Files.filter((entry) => entry.endsWith('.html'))) {
  assert.doesNotMatch(await readFile(file, 'utf8'), /adsbygoogle|pagead2\.googlesyndication\.com/i, `${path.relative(ROOT, file)}: legacy AdSense must not load`);
}

await assertLocalReferences(rootHtml, 'index.html');
for (const file of publicFiles.filter((entry) => entry.endsWith('.html'))) {
  const relative = path.relative(ROOT, file);
  await assertLocalReferences(await readFile(file, 'utf8'), relative);
}

for (const previewName of ['social-preview.png', 'profile-preview.png']) {
  const preview = await readFile(path.join(ROOT, 'public', previewName)).catch(() => {
    throw new Error(`public/${previewName}: missing approved 1200×630 capture`);
  });
  assert.equal(preview.subarray(1, 4).toString('ascii'), 'PNG', `${previewName} must be a real PNG`);
  assert.equal(preview.readUInt32BE(16), 1200, `${previewName} width must be 1200px`);
  assert.equal(preview.readUInt32BE(20), 630, `${previewName} height must be 630px`);
}

const resume = await readFile(path.join(ROOT, 'public', 'resume.pdf'));
assert.equal(resume.subarray(0, 5).toString('ascii'), '%PDF-', 'public/resume.pdf must be a PDF');
assert.equal(createHash('sha256').update(resume).digest('hex'), APPROVED_RESUME_SHA256, 'public/resume.pdf must match the visually approved revision');
assert.ok(!resume.toString('latin1').toLowerCase().includes('yupeng-dev'), 'public/resume.pdf must not retain the stale GitHub identity');

console.log(`Static integrity verified: root, about, sitemap, and ${redirectPaths.length} PoE2 redirects.`);
