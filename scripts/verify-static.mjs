import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { documentFor, redirectPaths } from './generate-poe2-redirects.mjs';
import { assertAboutIsGenerated, escapeHtml, readPublicProfile } from './generate-about.mjs';
import {
  FULL_RESUME,
  ONE_PAGE_RESUME,
  RESUME_VARIANTS,
  ZH_RESUME,
  assertAccessibleResume,
  assertChineseParity,
  assertOnePageParity,
} from './verify-resume.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE_ORIGIN = 'https://brickerp.github.io';
const POE2_TARGET = `${SITE_ORIGIN}/poe2-build-lab/`;

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

function decodeHtml(value) {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&amp;', '&');
}

function meta(html, key, value) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const keyMatch = tag.match(new RegExp(`\\b${key}=["']${escapeRegExp(value)}["']`, 'i'));
    if (!keyMatch) continue;
    const content = tag.match(/\bcontent=["']([^"']+)["']/i)?.[1];
    return content === undefined ? undefined : decodeHtml(content);
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
    // Root-relative references resolve against public/ first, then against the
    // repository root, where Vite's HTML entries (such as /beijing-loop/) live.
    const candidates = clean.startsWith('/')
      ? [path.join(ROOT, 'public', clean.slice(1)), path.join(ROOT, clean.slice(1))]
      : [path.resolve(ROOT, path.dirname(file), clean)];
    const resolved = candidates.map((candidate) =>
      clean.endsWith('/') ? path.join(candidate, 'index.html') : candidate,
    );
    const found = await Promise.any(resolved.map((candidate) => access(candidate))).then(
      () => true,
      () => false,
    );
    if (!found) throw new Error(`${file}: missing local reference ${reference}`);
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
const filmHtml = await text('beijing-loop/index.html');
const aboutHtml = await text('public/about/index.html');
const sheetHtml = await text('public/work/quant/index.html');
const architectureHtml = await text('public/work/quant/architecture/index.html');
const hireHtml = await text('public/hire/index.html');
const profileLoopCard = await text('public/profile-loop-card.svg');
const controlsSource = await text('src/ui/controls.ts');
const stylesSource = await text('src/styles/main.css');
const themeSource = await text('src/rendering/theme.ts');
const designSource = await text('DESIGN.md');
const actionMarkup = controlsSource.match(
  /<div class="ui-actions"[\s\S]*?<\/div>/,
)?.[0] ?? '';
const publicProfile = await readPublicProfile();
await assertAboutIsGenerated();
assertPageMetadata(rootHtml, 'index.html', `${SITE_ORIGIN}/`, 'profile-preview.png');
assertPageMetadata(filmHtml, 'beijing-loop/index.html', `${SITE_ORIGIN}/beijing-loop/`, 'social-preview.png');
assertPageMetadata(aboutHtml, 'public/about/index.html', `${SITE_ORIGIN}/about/`, 'profile-preview.png');
assertPageMetadata(sheetHtml, 'public/work/quant/index.html', `${SITE_ORIGIN}/work/quant/`, 'profile-preview.png');
assertPageMetadata(architectureHtml, 'public/work/quant/architecture/index.html', `${SITE_ORIGIN}/work/quant/architecture/`, 'profile-preview.png');

// One positioning line, verbatim, on every public surface that introduces the author.
const POSITIONING = publicProfile.summary;
assert.ok(POSITIONING.includes(' — '), 'public profile: summary must start with the role followed by an em dash');
assert.equal(publicProfile.role, POSITIONING.split(' — ')[0], 'public profile: role must be the title clause of the positioning line');
for (const [file, html] of [
  ['index.html', rootHtml],
  ['public/about/index.html', aboutHtml],
]) {
  assert.ok(visibleText(html).includes(escapeHtml(POSITIONING)), `${file}: must carry the one-line positioning verbatim`);
}
for (const [file, html] of [
  ['index.html', rootHtml],
  ['beijing-loop/index.html', filmHtml],
  ['public/about/index.html', aboutHtml],
  ['public/hire/index.html', hireHtml],
  ['src/content/resume.html', await text('src/content/resume.html')],
  ['src/content/resume-1p.html', await text('src/content/resume-1p.html')],
]) {
  assert.doesNotMatch(html, /re-measure pending|pending re-measure/i, `${file}: no surface may lead with a pending measurement`);
  assert.doesNotMatch(html, /AI x Finance|markets (?:&|and) macro/i, `${file}: finance is an exhibit, not the positioning`);
}
for (const file of ['src/content/resume.html', 'src/content/resume-1p.html']) {
  assert.ok(
    (await text(file)).includes('<p class="headline">AI Agent &amp; Backend Engineer</p>'),
    `${file}: headline must state the engineering role`,
  );
}
const HIRE_TARGET = `${SITE_ORIGIN}/#contact`;
function documentTitle(html) {
  return decodeHtml(html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? '');
}
assert.equal(meta(hireHtml, 'name', 'robots')?.replace(/\s/g, ''), 'noindex,follow', 'hire: redirect must stay out of the index');
assert.match(hireHtml, new RegExp(`<link\\b[^>]*rel=["']canonical["'][^>]*href=["']${escapeRegExp(HIRE_TARGET)}["']`, 'i'), 'hire: canonical must be /#contact');
assert.equal(meta(hireHtml, 'property', 'og:url'), HIRE_TARGET, 'hire: og:url must be /#contact, not /hire/');
assert.equal(meta(hireHtml, 'http-equiv', 'refresh'), `0; url=${HIRE_TARGET}`, 'hire: must meta-refresh to /#contact');
assert.match(hireHtml, /location\.replace\(["']https:\/\/brickerp\.github\.io\/#contact["']\)/, 'hire: must replace the location with /#contact');
assert.match(hireHtml, /href=["']https:\/\/brickerp\.github\.io\/#contact["']/i, 'hire: must link /#contact');
assert.equal(documentTitle(hireHtml), documentTitle(rootHtml), 'hire: title must match the homepage contact story');
assert.equal(meta(hireHtml, 'name', 'description'), meta(rootHtml, 'name', 'description'), 'hire: description must match the homepage');
for (const [key, name] of [
  ['property', 'og:title'],
  ['property', 'og:description'],
  ['property', 'og:image'],
  ['property', 'og:image:alt'],
  ['name', 'twitter:card'],
  ['name', 'twitter:title'],
  ['name', 'twitter:description'],
  ['name', 'twitter:image'],
  ['name', 'twitter:image:alt'],
]) {
  assert.equal(meta(hireHtml, key, name), meta(rootHtml, key, name), `hire: ${name} must match the homepage`);
}
assert.doesNotMatch(hireHtml, /hire/i, 'hire: head and body must not say Hire or point at /hire/');
assert.doesNotMatch(visibleText(hireHtml), /I take agents from demo to production|overlaps my employer|Part-time \/ contract/i, 'hire: must not keep a visible marketing page');
assert.match(rootHtml, /id=["']contact["']/i, 'index.html: #contact must stay on the homepage');
assert.match(rootHtml, /overlaps my employer['’]s product/i, 'index.html: #contact must keep the employer no-overlap boundary');
assert.match(rootHtml, /<a\b[^>]*href=["'](?:\/hire\/|#contact)["']/i, 'index.html: landing must reach Contact (/#contact or /hire/)');
assert.match(rootHtml, /<a\b[^>]*href=["']\/beijing-loop\/["']/i, 'index.html: landing must keep the film reachable');
assert.match(filmHtml, /<a\b[^>]*href=["']\/["']/i, 'beijing-loop: film must link back to the landing page');
assert.match(
  controlsSource,
  /<p class="ui-eyebrow">LOOP 01<\/p>[\s\S]*?<h1 class="ui-title" id="experience-title">ENDLESS SECOND RING<\/h1>[\s\S]*?<p class="ui-sub">BEIJING <span lang="zh-CN">\/ 北京<\/span> <span aria-hidden="true">·<\/span> 48-SECOND GENERATIVE DRIVE<\/p>/,
  'controls: visible identity must follow the approved LOOP 01 mono hierarchy',
);
assert.equal(
  (actionMarkup.match(/\bdata-act="/g) ?? []).length,
  4,
  'controls: Open Circuit must retain exactly four public actions',
);
for (const [label, token, role, color] of [
  ['Night', '--sky', 'night', '#07111B'],
  ['Asphalt', '--asphalt', 'asphalt', '#0B1F2E'],
  ['Warm white', '--text', 'warmWhite', '#ECE5D8'],
  ['Steel', '--steel', 'steel', '#71828B'],
  ['Signature vermilion', '--vermilion', 'signature', '#D9684B'],
]) {
  assert.match(
    stylesSource,
    new RegExp(`${escapeRegExp(token)}:\\s*${escapeRegExp(color)}`, 'i'),
    `styles: missing approved ${token} identity token`,
  );
  assert.match(
    themeSource,
    new RegExp(`\\b${role}:\\s*['"]${escapeRegExp(color)}['"]`),
    `theme: missing approved ${role} identity role`,
  );
  assert.match(
    designSource,
    new RegExp(`${escapeRegExp(label)}:\\s*\`${escapeRegExp(color)}\``),
    `design: ${label} identity role drifted from the runtime theme`,
  );
}
for (const [label, role, color] of [
  ['Blue-hour horizon', 'skyHorizon', '#27495C'],
  ['Distance fog', 'fog', '#405563'],
  ['Pavement', 'pavement', '#53606A'],
  ['Stone', 'stone', '#C8C4B8'],
  ['Beijing wall red', 'wallRed', '#4F292B'],
  ['Palace oxblood', 'palaceRed', '#642B28'],
  ['Roof tile', 'roof', '#344148'],
  ['Roof edge', 'roofEdge', '#9F7A48'],
  ['Lane marking', 'lane', '#71828B'],
  ['Warm lamp', 'lamp', '#FFD38A'],
  ['Water', 'water', '#2F667A'],
  ['Foliage', 'foliage', '#365A43'],
  ['Text/accent', 'text', '#ECE5D8'],
]) {
  assert.match(
    themeSource,
    new RegExp(`\\b${role}:\\s*['"]${escapeRegExp(color)}['"]`),
    `theme: missing approved ${role} scene role`,
  );
  assert.match(
    designSource,
    new RegExp(`${escapeRegExp(label)}:\\s*\`${escapeRegExp(color)}\``),
    `design: ${label} scene role drifted from the runtime theme`,
  );
}
assert.match(
  stylesSource,
  /@media \(max-width: 700px\)[\s\S]*?\.ui-actions\s*\{[\s\S]*?top:\s*auto;[\s\S]*?bottom:\s*calc\(12px \+ var\(--safe-b\)\);/,
  'styles: portrait action rail must occupy the bottom safe area',
);
assert.match(
  profileLoopCard,
  /<svg\b(?=[^>]*\bwidth=["']560["'])(?=[^>]*\bheight=["']160["'])(?=[^>]*\bviewBox=["']0 0 560 160["'])[^>]*>/i,
  'profile-loop-card.svg: must be a 560×160 SVG',
);
assert.match(
  profileLoopCard,
  /<svg\b(?=[^>]*\brole=["']img["'])(?=[^>]*\baria-labelledby=["']loop-card-title loop-card-desc["'])[^>]*>/i,
  'profile-loop-card.svg: must expose its title and description as the image label',
);
assert.match(
  profileLoopCard,
  /<title\s+id=["']loop-card-title["']>Loop 01 — Endless Second Ring<\/title>/i,
  'profile-loop-card.svg: accessible title must name Loop 01 and Endless Second Ring',
);
assert.match(
  profileLoopCard,
  /<desc\s+id=["']loop-card-desc["']>[^<]*48-second[^<]*Beijing night drive[^<]*<\/desc>/i,
  'profile-loop-card.svg: accessible description must identify the 48-second Beijing night drive',
);
for (const label of [
  'LOOP 01',
  'ENDLESS SECOND RING',
  '48-SECOND GENERATIVE BEIJING NIGHT DRIVE',
]) {
  assert.ok(profileLoopCard.includes(label), `profile-loop-card.svg: missing visible label “${label}”`);
}
assert.match(
  profileLoopCard,
  /<path\b(?=[^>]*\bid=["']loop-road-carrier["'])(?=[^>]*\bd=["']M560 139L400 79["'])(?=[^>]*\bstroke=["']#ECE5D8["'])[^>]*>/i,
  'profile-loop-card.svg: warm-white road marking must converge on the handoff node',
);
assert.match(
  profileLoopCard,
  /<circle\b(?=[^>]*\bid=["']loop-road-node["'])(?=[^>]*\bcx=["']400["'])(?=[^>]*\bcy=["']79["'])(?=[^>]*\bfill=["']#D9684B["'])[^>]*>/i,
  'profile-loop-card.svg: missing vermilion handoff node at the road vanishing point',
);
assert.equal(
  (profileLoopCard.match(/#D9684B/gi) ?? []).length,
  1,
  'profile-loop-card.svg: must contain exactly one vermilion handoff node',
);
assert.doesNotMatch(
  profileLoopCard,
  /ENTER THE LOOP|<a\b|<button\b|role=["']button["']|cursor\s*:\s*pointer/i,
  'profile-loop-card.svg: action affordances belong to the surrounding link, not the artwork',
);
assert.doesNotMatch(
  profileLoopCard,
  /<(?:script|image|foreignObject|iframe|object)\b|(?:href|src)\s*=|@import|@font-face/i,
  'profile-loop-card.svg: must not load scripts, images, fonts, or other external resources',
);
const rootFavicon = linkHref(rootHtml, 'icon');
assert.ok(rootFavicon?.startsWith('data:image/svg+xml,'), 'index.html: missing inline SVG favicon');
assert.equal(linkHref(filmHtml, 'icon'), rootFavicon, 'beijing-loop: favicon must match the site identity');
assert.equal(linkHref(aboutHtml, 'icon'), rootFavicon, 'about: favicon must match the site identity');

const rootData = jsonLd(rootHtml, 'index.html').flatMap((item) => item['@graph'] ?? [item]);
assert.ok(rootData.some((item) => item['@type'] === 'WebSite'), 'index.html: WebSite JSON-LD missing');
assert.ok(rootData.some((item) => item['@type'] === 'WebPage'), 'index.html: WebPage JSON-LD missing');
assert.ok(!rootData.some((item) => item['@type'] === 'ProfilePage'), 'index.html: landing must not duplicate the About ProfilePage');
const filmData = jsonLd(filmHtml, 'beijing-loop/index.html').flatMap((item) => item['@graph'] ?? [item]);
assert.ok(filmData.some((item) => item['@type'] === 'WebSite'), 'beijing-loop: WebSite JSON-LD missing');
assert.ok(
  filmData.some((item) => item['@type'] === 'CreativeWork' && item.url === `${SITE_ORIGIN}/beijing-loop/`),
  'beijing-loop: CreativeWork JSON-LD must describe the film at its own route',
);
assert.ok(!filmData.some((item) => item['@type'] === 'ProfilePage'), 'beijing-loop: artwork must not claim ProfilePage');

const aboutData = jsonLd(aboutHtml, 'public/about/index.html');
const profile = aboutData.find((item) => item['@type'] === 'ProfilePage');
assert.equal(profile?.mainEntity?.['@type'], 'Person', 'about: ProfilePage mainEntity must be a Person');
const profileTitle = `${publicProfile.name} — ${publicProfile.role}`;
assert.equal(
  meta(aboutHtml, 'name', 'description'),
  `${publicProfile.name}. ${publicProfile.summary}`,
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
  ...publicProfile.primaryActions.map(({ label }) => label),
  ...publicProfile.experience.flatMap(({ org, title }) => [org, title]),
  ...publicProfile.education.map(({ school }) => school),
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
const email = publicProfile.primaryActions
  .find(({ id }) => id === publicProfile.identity.emailLinkId)
  ?.href.replace(/^mailto:/, '');
const sameAs = publicProfile.identity.sameAsLinkIds.map((id) =>
  publicProfile.primaryActions.find((action) => action.id === id)?.href,
);
assert.equal(profile.mainEntity.name, publicProfile.name, 'about: JSON-LD name drifted from public profile');
assert.equal(profile.mainEntity.jobTitle, publicProfile.role, 'about: JSON-LD role drifted from public profile');
assert.equal(profile.mainEntity.email, email, 'about: JSON-LD email drifted from public profile');
assert.deepEqual(profile.mainEntity.sameAs, sameAs, 'about: JSON-LD sameAs drifted from public profile');
assert.equal(profile.dateModified, publicProfile.dateModified, 'about: JSON-LD dateModified drifted from public profile');
assert.match(filmHtml, /<span\s+lang=["']zh-CN["']>北京<\/span>/, 'beijing-loop: Chinese text needs an explicit language span');
assert.match(filmHtml, /<script\b[^>]*type=["']module["'][^>]*src=["']\/src\/main\.ts["']/, 'beijing-loop: the film must boot from the shared runtime entry');
// Landing may load one small double-pendulum module; the film/Three.js runtime stays at /beijing-loop/.
const rootScriptSrcs = [...rootHtml.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)].map((m) => m[1]);
assert.deepEqual(
  rootScriptSrcs,
  ['/src/pendulum.ts'],
  'index.html: only the double-pendulum module may load on the landing page',
);
assert.doesNotMatch(rootHtml, /src\/orbit\.ts|orbit-body|orbit-path/, 'index.html: Kepler orbit figure must be gone');
const pendulumSvg = rootHtml.match(/<svg class="pendulum"[\s\S]*?<\/svg>/i)?.[0];
assert.ok(pendulumSvg, 'index.html: Fig. 1 pendulum figure missing');
assert.doesNotMatch(pendulumSvg, /stroke-dasharray/, 'index.html: Fig. 1 must not use decorative dashed strokes');
assert.match(pendulumSvg, /double pendulum/, 'index.html: Fig. 1 needs its double-pendulum label');
assert.match(rootHtml, /prefers-reduced-motion:\s*reduce/, 'index.html: reduced-motion rule missing');
assert.match(
  rootHtml,
  /\.pendulum \.trail-b0,\.pendulum \.trail-b1,\.pendulum \.trail-b2,\.pendulum \.trail-b3\{opacity:0\}/,
  'index.html: reduced motion must hide the pendulum trails',
);
assert.match(rootHtml, /id=["']pendulum-reset["']/, 'index.html: pendulum needs a Reset control');
assert.match(rootHtml, /id=["']pendulum-delta["']/, 'index.html: pendulum needs a Δθ control');
assert.match(rootHtml, /id=["']pendulum-twin-outer["']/, 'index.html: pendulum needs its twin');

function tagAttrs(html, id) {
  const tag = html.match(new RegExp(`<[a-z]+[^>]*\\bid=["']${id}["'][^>]*>`, 'i'))?.[0];
  assert.ok(tag, `index.html: #${id} missing`);
  return tag;
}
function tagAttr(tag, name) {
  const value = tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, 'i'))?.[1];
  assert.ok(value !== undefined, `missing ${name} on ${tag.slice(0, 48)}`);
  return value;
}
function svgData(name) {
  const value = pendulumSvg.match(new RegExp(`\\bdata-${name}=["']([^"']+)["']`, 'i'))?.[1];
  assert.ok(value !== undefined, `index.html: pendulum missing data-${name}`);
  return Number(value);
}
const arm1 = svgData('l1');
const arm2 = svgData('l2');
const originX = svgData('ox');
const originY = svgData('oy');
const theta1 = svgData('th1');
const theta2 = svgData('th2');
const calm1 = svgData('calm-th1');
const calm2 = svgData('calm-th2');
assert.ok(arm1 > 0 && arm2 > 0, 'index.html: pendulum arm lengths must be positive');
assert.ok(Math.abs(theta1) > 1 && Math.abs(theta2) > 1, 'index.html: release angles must leave the small-angle regime');
assert.ok(Math.abs(calm1) < 0.35 && Math.abs(calm2) < 0.35, 'index.html: reduced-motion pose must hang near vertical');
const releaseX1 = originX + arm1 * Math.sin(theta1);
const releaseY1 = originY + arm1 * Math.cos(theta1);
const releaseX2 = releaseX1 + arm2 * Math.sin(theta2);
const releaseY2 = releaseY1 + arm2 * Math.cos(theta2);
const innerTag = tagAttrs(pendulumSvg, 'pendulum-inner');
const outerTag = tagAttrs(pendulumSvg, 'pendulum-outer');
assert.ok(
  Math.hypot(Number(tagAttr(innerTag, 'cx')) - releaseX1, Number(tagAttr(innerTag, 'cy')) - releaseY1) < 0.03,
  'index.html: inner bob must sit at the release pose',
);
assert.ok(
  Math.hypot(Number(tagAttr(outerTag, 'cx')) - releaseX2, Number(tagAttr(outerTag, 'cy')) - releaseY2) < 0.03,
  'index.html: outer bob must sit at the release pose',
);
assert.equal(tagAttr(tagAttrs(pendulumSvg, 'pendulum-trail'), 'd'), '', 'index.html: trail starts empty for no-JS');
const delta = Number(tagAttr(tagAttrs(rootHtml, 'pendulum-delta'), 'value'));
assert.ok(delta >= 0.002 && delta <= 0.06, 'index.html: Δθ₂ must be a small perturbation');
const twinOuter = tagAttrs(pendulumSvg, 'pendulum-twin-outer');
const twinX = releaseX1 + arm2 * Math.sin(theta2 + delta);
const twinY = releaseY1 + arm2 * Math.cos(theta2 + delta);
assert.ok(
  Math.hypot(Number(tagAttr(twinOuter, 'cx')) - twinX, Number(tagAttr(twinOuter, 'cy')) - twinY) < 0.03,
  'index.html: twin outer bob must sit Δθ₂ off the release pose',
);
const pendulumSource = await text('src/pendulum.ts');
assert.doesNotMatch(
  pendulumSource,
  /(?:from\s+['"]three['"]|require\(['"]three['"]\)|WebGLRenderer)/,
  'src/pendulum.ts: pendulum module must not import Three.js',
);
assert.match(pendulumSource, /function rk4/, 'src/pendulum.ts: must integrate with RK4');
assert.match(pendulumSource, /prefers-reduced-motion/, 'src/pendulum.ts: must honor reduced motion');
assert.match(pendulumSource, /calmTh1/, 'src/pendulum.ts: must park at the calm pose');
assert.match(pendulumSource, /TRAIL_MS = 28_000/, 'src/pendulum.ts: trails must keep a long history');
assert.match(pendulumSource, /pointerdown/, 'src/pendulum.ts: bobs must be draggable');
assert.match(pendulumSource, /pendulum-delta/, 'src/pendulum.ts: must read the Δθ control');
assert.match(pendulumSource, /pendulum-twin-outer/, 'src/pendulum.ts: must draw the twin');
assert.doesNotMatch(filmHtml, /name=["']robots["']/i, 'beijing-loop: the film is an indexable page, not a redirect');

// The living notebook: paper ripple, onion skin, margin traces, pen marks.
// Every living piece must stay dependency-free and fold away under reduced motion.
const paperSource = await text('src/paper.ts');
const marginsSource = await text('src/margins.ts');
assert.match(pendulumSource, /from\s+['"]\.\/paper['"]/, 'src/pendulum.ts: must boot the paper ripple');
assert.match(pendulumSource, /from\s+['"]\.\/margins['"]/, 'src/pendulum.ts: must boot the margin traces');
assert.match(paperSource, /prefers-reduced-motion/, 'src/paper.ts: the ripple must honor reduced motion');
assert.doesNotMatch(paperSource, /\bthree\b/, 'src/paper.ts: the ripple stays dependency-free');
assert.match(marginsSource, /prefers-reduced-motion/, 'src/margins.ts: the walker must honor reduced motion');
assert.match(marginsSource, /notebook-page/, 'src/margins.ts: must count the notebook pages');
assert.match(marginsSource, /America\/Los_Angeles/, 'src/margins.ts: the stamp keeps Pacific time');
assert.match(rootHtml, /id=["']pendulum-onion["'][^>]*aria-pressed=["']true["']/, 'index.html: onion skin must start pressed');
assert.match(rootHtml, /id=["']pendulum-onions["']/, 'index.html: the onion layer must exist');
assert.match(rootHtml, /id=["']pendulum-burst["']/, 'index.html: the burst layer must exist');
assert.match(rootHtml, /id=["']notebook-stamp["']/, 'index.html: the live stamp must exist');
assert.match(rootHtml, /id=["']notebook-page["']/, 'index.html: the visit counter must exist');
assert.equal(
  (rootHtml.match(/class=["']pen["']/g) ?? []).length,
  (rootHtml.match(/class=["']lab\b/g) ?? []).length,
  'index.html: every lab entry needs its pen overlay',
);
assert.match(pendulumSvg, /id=["']pendulum-onions["'][\s\S]*?id=["']pendulum-burst["']/, 'index.html: onion and burst layers stay inside Fig. 1');

// Technical sheet № 01: the programme must reach it, it must reach back, and every
// number it prints must sit next to a method. No pending placeholder wording.
assert.match(aboutHtml, /<a\b[^>]*href=["']\/work\/quant\/["']/i, 'about: primary navigation must link the technical sheet');
assert.match(aboutHtml, /<nav\b[^>]*aria-label=["']Primary navigation["'][\s\S]*?<a\b[^>]*href=["']\/hire\/["'][\s\S]*?<\/nav>/i, 'about: primary navigation must reach /hire/');
assert.match(sheetHtml, /<a\b[^>]*href=["']\/about\/["']/i, 'work/quant: must link back to the full programme');
assert.match(sheetHtml, /<a\b[^>]*href=["']\/hire\/["']/i, 'work/quant: must reach /hire/');
assert.equal(linkHref(sheetHtml, 'icon'), rootFavicon, 'work/quant: favicon must match the site identity');
assert.match(sheetHtml, /<a\b[^>]*href=["']\/work\/quant\/architecture\/["']/i, 'work/quant: must link the architecture hub');
const sheetData = jsonLd(sheetHtml, 'public/work/quant/index.html');
const sheet = sheetData.find((item) => item['@type'] === 'TechArticle');
assert.equal(sheet?.author?.['@id'], profile.mainEntity['@id'], 'work/quant: TechArticle author must be the About Person');
assert.match(sheetHtml, /id=["']method-heading["']/, 'work/quant: the measured section needs its method box');
assert.doesNotMatch(sheetHtml, /Pending re-measure|re-measure pending|post-fix re-measure pending/i, 'work/quant: must not carry pending re-measure wording');
assert.match(sheetHtml, /Cron removed/, 'work/quant: post-fix cell must record that the cron was removed');
for (const fact of ['~2.4 s', '~9.2 s', '2026-10-08', '2026-10-09']) {
  assert.ok(sheetHtml.includes(fact), `work/quant: missing recorded fact “${fact}”`);
}
assert.ok(
  publicProfile.publicProof.some(({ href }) => href === `${SITE_ORIGIN}/work/quant/`),
  'public profile: Exhibits must include the technical sheet',
);

// Architecture hub: six positive eras, each figure linked, source README linked back.
const SOURCE_README = 'https://github.com/BrickerP/quant-trading/blob/develop/docs/architecture/README.md';
assert.equal(linkHref(architectureHtml, 'icon'), rootFavicon, 'work/quant/architecture: favicon must match the site identity');
assert.match(architectureHtml, /<a\b[^>]*href=["']\/work\/quant\/["']/i, 'work/quant/architecture: must link back to the technical sheet');
assert.match(architectureHtml, /<a\b[^>]*href=["']\/about\/["']/i, 'work/quant/architecture: must link back to the full programme');
assert.match(architectureHtml, /<a\b[^>]*href=["']\/hire\/["']/i, 'work/quant/architecture: must reach /hire/');
assert.match(
  architectureHtml,
  new RegExp(`<a\\b[^>]*href=["']${escapeRegExp(SOURCE_README)}["']`, 'i'),
  'work/quant/architecture: must link the quant-trading architecture README',
);
assert.doesNotMatch(
  architectureHtml,
  /NOT oakrelay|no CF yet|\babsent\b|\bfuture\b|foresight|placeholder|\bretired\b|\bgone\b|\bmissing\b|not yet|no gateway/i,
  'work/quant/architecture: eras stay positive; no foresight or absence labels',
);
const architectureData = jsonLd(architectureHtml, 'public/work/quant/architecture/index.html');
const architectureArticle = architectureData.find((item) => item['@type'] === 'TechArticle');
assert.equal(architectureArticle?.author?.['@id'], profile.mainEntity['@id'], 'work/quant/architecture: TechArticle author must be the About Person');
assert.equal(architectureArticle?.isPartOf?.['@id'], 'https://brickerp.github.io/work/quant/#sheet', 'work/quant/architecture: must belong to the technical sheet');
assert.equal(architectureArticle?.citation, SOURCE_README, 'work/quant/architecture: citation must be the source README');
const eraFigures = [
  ['fig-01', 'fig-01-92d444f.png', '92d444f'],
  ['fig-02', 'fig-02-a42ae99.png', 'a42ae99'],
  ['fig-03', 'fig-03-eafff22.png', 'eafff22'],
  ['fig-04', 'fig-04-c01b8f0.png', 'c01b8f0'],
  ['fig-05', 'fig-05-be85f71.png', 'be85f71'],
  ['fig-06', 'fig-06-cfa3bc9.png', 'cfa3bc9'],
];
for (const [id, file, shortsha] of eraFigures) {
  assert.match(architectureHtml, new RegExp(`id=["']${id}["']`), `work/quant/architecture: missing ${id}`);
  assert.match(architectureHtml, new RegExp(`href=["']#${id}["']`), `work/quant/architecture: era table must link ${id}`);
  assert.match(architectureHtml, new RegExp(`href=["']${file}["']`), `work/quant/architecture: must link ${file}`);
  assert.ok(architectureHtml.includes(shortsha), `work/quant/architecture: missing shortsha ${shortsha}`);
  const png = await readFile(path.join(ROOT, 'public/work/quant/architecture', file));
  assert.equal(png.subarray(1, 4).toString('ascii'), 'PNG', `${file} must be a real PNG`);
  assert.equal(png.readUInt32BE(16), 1900, `${file} width must be 1900px`);
  assert.equal(png.readUInt32BE(20), 1360, `${file} height must be 1360px`);
}

const sitemap = await text('public/sitemap.xml');
assert.match(sitemap, /<loc>https:\/\/brickerp\.github\.io\/<\/loc>/, 'sitemap: root URL missing');
assert.match(sitemap, /<loc>https:\/\/brickerp\.github\.io\/about\/<\/loc>/, 'sitemap: about URL missing');
assert.doesNotMatch(sitemap, /\/hire\//, 'sitemap: /hire/ is a compatibility redirect and must not be indexed');
assert.match(sitemap, /<loc>https:\/\/brickerp\.github\.io\/work\/quant\/<\/loc>/, 'sitemap: technical sheet URL missing');
assert.match(sitemap, /<loc>https:\/\/brickerp\.github\.io\/work\/quant\/architecture\/<\/loc>/, 'sitemap: architecture hub URL missing');
assert.match(sitemap, /<loc>https:\/\/brickerp\.github\.io\/beijing-loop\/<\/loc>/, 'sitemap: film URL missing');
assert.doesNotMatch(sitemap, /\/poe2\//, 'sitemap: legacy PoE2 redirects must not be indexed');

const notFound = await text('public/404.html');
assert.match(
  notFound,
  /href=["']https:\/\/brickerp\.github\.io\/poe2-build-lab\/["']/i,
  '404 page must link directly to the current PoE2 site',
);
assert.doesNotMatch(notFound, /href=["']\/poe2\/["']/i, '404 page must not advertise the legacy PoE2 archive');
assert.match(notFound, /href=["']\/["']/i, '404 page must link the home page');
assert.match(notFound, /href=["']\/beijing-loop\/["']/i, '404 page must link the film at its route');

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
await assertLocalReferences(filmHtml, 'beijing-loop/index.html');
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

for (const variant of RESUME_VARIANTS) {
  assertAccessibleResume(await readFile(path.join(ROOT, variant.output)), variant.output, variant);
}
assertOnePageParity(await text(FULL_RESUME.source), await text(ONE_PAGE_RESUME.source));
assertChineseParity(await text(FULL_RESUME.source), await text(ONE_PAGE_RESUME.source), await text(ZH_RESUME.source));

console.log(`Static integrity verified: landing, film, about, hire, technical sheet, architecture hub, sitemap, and ${redirectPaths.length} PoE2 redirects.`);
