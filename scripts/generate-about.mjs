import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  creditsMarkup,
  educationMarkup,
  emailAddress,
  escapeHtml,
  firstReelLabel,
  focusMarkup,
  identityMarkup,
  monthIndex,
  nameMarkup,
  programmeNumber,
  proofMarkup,
  reelsBody,
  sectionMarkup,
  spineMarkup,
  stampMarkup,
  stubMarkup,
} from '../src/ui/programme.ts';

export { escapeHtml };

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ABOUT_PATH = path.join(ROOT, 'public/about/index.html');
export const SHEET_PATHS = ['public/work/quant/index.html'].map((file) => path.join(ROOT, file));
const PROFILE_PATH = path.join(ROOT, 'src/content/public-profile.json');
const PROGRAMME_CSS_PATH = path.join(ROOT, 'src/styles/programme.css');
const MONTH = /^\d{4}-(?:0[1-9]|1[0-2])$/;

function actionById(profile, id) {
  const action = profile.primaryActions.find((item) => item.id === id);
  assert.ok(action, `public profile: missing primary action “${id}”`);
  return action;
}

function isHttpsHref(href) {
  try {
    return new URL(href).protocol === 'https:';
  } catch {
    return false;
  }
}

function isSupportedActionHref(href) {
  if (href.startsWith('/') && !href.startsWith('//')) return true;
  try {
    return ['https:', 'mailto:'].includes(new URL(href).protocol);
  } catch {
    return false;
  }
}

function assertText(value, label) {
  assert.equal(typeof value, 'string', `public profile: ${label} must be a string`);
  assert.ok(value.length > 0, `public profile: ${label} must not be empty`);
}

export function validatePublicProfile(profile) {
  for (const key of ['name', 'role', 'dateModified', 'status', 'summary', 'experienceNote', 'focus']) {
    assertText(profile[key], key);
  }
  assert.match(profile.dateModified, /^\d{4}-\d{2}-\d{2}$/, 'public profile: dateModified must use YYYY-MM-DD');
  assert.ok(Array.isArray(profile.publicProof) && profile.publicProof.length > 0, 'public profile: publicProof must not be empty');
  assert.ok(Array.isArray(profile.primaryActions) && profile.primaryActions.length > 0, 'public profile: primaryActions must not be empty');
  assert.ok(Array.isArray(profile.experience) && profile.experience.length > 0, 'public profile: experience must not be empty');
  assert.ok(Array.isArray(profile.education), 'public profile: education must be a list');
  for (const proof of profile.publicProof) {
    assert.ok(proof.label && proof.detail && proof.href, 'public profile: every public proof needs label, detail, and href');
    assert.ok(isHttpsHref(proof.href), 'public profile: public proof hrefs must use https');
  }
  for (const action of profile.primaryActions) {
    assert.ok(action.id && action.label && action.note && action.href, 'public profile: every primary action needs id, label, note, and href');
    assert.ok(isSupportedActionHref(action.href), 'public profile: primary action hrefs must use https, mailto, or a root-relative path');
  }
  assert.equal(
    new Set(profile.primaryActions.map(({ id }) => id)).size,
    profile.primaryActions.length,
    'public profile: primary action ids must be unique',
  );
  const email = actionById(profile, profile.identity.emailLinkId);
  assert.ok(email.href.startsWith('mailto:'), 'public profile: identity email link must use mailto');
  assert.equal(
    new Set(profile.identity.sameAsLinkIds).size,
    profile.identity.sameAsLinkIds.length,
    'public profile: identity sameAs linkIds must be unique',
  );
  for (const id of profile.identity.sameAsLinkIds) {
    assert.ok(isHttpsHref(actionById(profile, id).href), 'public profile: identity sameAs links must use https');
  }
  const issued = monthIndex(profile.dateModified.slice(0, 7));
  for (const role of profile.experience) {
    for (const key of ['id', 'org', 'title', 'note']) assertText(role[key], `experience ${key}`);
    assert.match(role.start, MONTH, `public profile: ${role.id} start must use YYYY-MM`);
    assert.ok(monthIndex(role.start) <= issued, `public profile: ${role.id} must start before dateModified`);
    if (role.end !== null) {
      assert.match(role.end, MONTH, `public profile: ${role.id} end must use YYYY-MM or null`);
      assert.ok(monthIndex(role.end) >= monthIndex(role.start), `public profile: ${role.id} must end after it starts`);
    }
    assert.ok(Array.isArray(role.summary) && role.summary.length > 0, `public profile: ${role.id} needs a summary`);
    assert.ok(Array.isArray(role.details), `public profile: ${role.id} details must be a list`);
    for (const line of [...role.summary, ...role.details]) assertText(line, `${role.id} line`);
  }
  assert.equal(
    new Set(profile.experience.map(({ id }) => id)).size,
    profile.experience.length,
    'public profile: experience ids must be unique',
  );
  for (const item of profile.education) {
    assertText(item.school, 'education school');
    assertText(item.detail, 'education detail');
  }
}

export function serializeJsonForScript(value, space = 2) {
  return JSON.stringify(value, null, space).replace(/[<>&\u2028\u2029]/g, (character) => {
    switch (character) {
      case '<': return '\\u003c';
      case '>': return '\\u003e';
      case '&': return '\\u0026';
      case '\u2028': return '\\u2028';
      case '\u2029': return '\\u2029';
      default: throw new Error('unreachable JSON script escape');
    }
  });
}

function indent(text, spaces) {
  const padding = ' '.repeat(spaces);
  return text
    .split('\n')
    .map((line) => (line ? `${padding}${line}` : line))
    .join('\n');
}

function jsonLd(profile) {
  const sameAs = profile.identity.sameAsLinkIds.map((id) => actionById(profile, id).href);
  return indent(
    serializeJsonForScript(
      {
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        '@id': 'https://brickerp.github.io/about/#profile',
        url: 'https://brickerp.github.io/about/',
        name: `${profile.name} — ${profile.role}`,
        description: `Profile of ${profile.role} ${profile.name}.`,
        dateModified: profile.dateModified,
        mainEntity: {
          '@type': 'Person',
          '@id': 'https://brickerp.github.io/about/#yupeng-lu',
          name: profile.name,
          url: 'https://brickerp.github.io/about/',
          jobTitle: profile.role,
          email: emailAddress(profile),
          sameAs,
          knowsAbout: [
            'live trading systems',
            'execution safety',
            'SQLite',
            'performance engineering',
            'AI agents',
            'Model Context Protocol',
            'tool-use contracts',
            'evidence-gated software releases',
            'WebGL',
          ],
        },
      },
      2,
    ),
    4,
  );
}

function hero(profile) {
  return [
    '<header class="about-cover">',
    '  <img class="about-plate" src="/programme/cover-qianmen.png" alt="Two-colour halftone of the Qianmen passage: a Dashilar gateway over the night road, printed from the film." width="2080" height="1120" decoding="async">',
    '  <p class="about-film">Loop 01 · Endless Second Ring</p>',
    `  <p class="about-film programme-issue">Programme № ${programmeNumber(profile)}<br>Beijing<br>Passage 11 / 12 · 00:40</p>`,
    '  <p class="about-cjk" lang="zh-CN">前门 · 大栅栏</p>',
    `  ${nameMarkup(profile, 'h1', 'profile-name')}`,
    '</header>',
    '<div class="programme-title">',
    `  <div class="about-ident">${stampMarkup(profile)}${identityMarkup(profile, 'Profile · Builder · Engineer', 'profile-summary')}</div>`,
    `  <div class="programme-billing">${creditsMarkup(profile)}${focusMarkup(profile)}</div>`,
    '</div>',
  ].join('\n');
}

function colophon(profile) {
  const email = emailAddress(profile);
  return `<p class="about-colophon"><span class="programme-swatches" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span><span>Ink · oxblood · one vermilion spot on warm stock</span><span>Halftones printed from the film · Updated ${escapeHtml(profile.dateModified)}</span><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>`;
}

function renderRegions(profile, programmeCss) {
  const email = actionById(profile, profile.identity.emailLinkId);
  const resume = actionById(profile, 'resume');
  const title = `${profile.name} — ${profile.role}`;
  const description = `${title}. ${profile.summary}`;
  const imageAlt = `${title} profile card.`;
  const reelsMeta = `${profile.experience.length} reels · ${firstReelLabel(profile)} – now<br>Overlaps are concurrent work`;
  return {
    HEAD: `  <meta name="description" content="${escapeHtml(description)}">\n  <link rel="canonical" href="https://brickerp.github.io/about/">\n  <meta property="og:title" content="${escapeHtml(title)}">\n  <meta property="og:description" content="${escapeHtml(profile.summary)}">\n  <meta property="og:type" content="profile">\n  <meta property="og:url" content="https://brickerp.github.io/about/">\n  <meta property="og:site_name" content="${escapeHtml(profile.name)} — BrickerP">\n  <meta property="og:image" content="https://brickerp.github.io/profile-preview.png">\n  <meta property="og:image:width" content="1200">\n  <meta property="og:image:height" content="630">\n  <meta property="og:image:alt" content="${escapeHtml(imageAlt)}">\n  <meta name="twitter:card" content="summary_large_image">\n  <meta name="twitter:title" content="${escapeHtml(title)}">\n  <meta name="twitter:description" content="${escapeHtml(profile.summary)}">\n  <meta name="twitter:image" content="https://brickerp.github.io/profile-preview.png">\n  <meta name="twitter:image:alt" content="${escapeHtml(imageAlt)}">\n  <title>${escapeHtml(title)}</title>`,
    JSON_LD: `  <script type="application/ld+json">\n${jsonLd(profile)}\n  </script>`,
    STYLE: `  <style>\n${indent(programmeCss.trimEnd(), 4)}\n  </style>`,
    NAV: `    <nav aria-label="Primary navigation">\n      <a href="/">Generative artwork</a>\n      <a href="/work/quant/">Work</a>\n      <a href="${escapeHtml(resume.href)}">Resume</a>\n      <a href="${escapeHtml(email.href)}">Email</a>\n    </nav>`,
    SPINE: indent(spineMarkup(profile), 6),
    HERO: indent(hero(profile), 8),
    REELS: indent(sectionMarkup('reels-heading', 'h2', 'The reels', reelsMeta, reelsBody(profile, 'h3', 930)), 10),
    LOWER: indent(
      `<div class="programme-lower">\n${sectionMarkup('proof-heading', 'h2', 'Exhibits', 'Public work', proofMarkup(profile))}\n${sectionMarkup('schooling-heading', 'h2', 'Schooling', '', educationMarkup(profile))}\n</div>`,
      8,
    ),
    STUB: indent(`${stubMarkup(profile)}\n${colophon(profile)}`, 8),
    FOOTER: `  <footer class="site-foot"><p>© ${escapeHtml(profile.dateModified.slice(0, 4))} ${escapeHtml(profile.name)} · <a href="/">Beijing — Endless Second Ring</a></p></footer>`,
  };
}

function replaceRegions(template, prefix, regions, file) {
  const marker = new RegExp(`<!--\\s*${prefix}:([A-Z_]+):([A-Z]+)\\s*-->`, 'g');
  const expectedMarkers = Object.keys(regions).flatMap((name) => [
    `${name}:START`,
    `${name}:END`,
  ]);
  const actualMarkers = [...template.matchAll(marker)].map(
    ([, name, boundary]) => `${name}:${boundary}`,
  );
  assert.deepEqual(
    actualMarkers,
    expectedMarkers,
    `${file}: profile marker sequence must contain exactly one ordered START/END pair per known region`,
  );
  let rendered = template;
  for (const [name, content] of Object.entries(regions)) {
    const start = `<!-- ${prefix}:${name}:START -->`;
    const end = `<!-- ${prefix}:${name}:END -->`;
    const pattern = new RegExp(`(^[ \\t]*)${start}[\\s\\S]*?${end}`, 'm');
    assert.match(rendered, pattern, `${file}: missing ${name} generator markers`);
    rendered = rendered.replace(pattern, (_, indentation) =>
      `${indentation}${start}\n${content}\n${indentation}${end}`,
    );
  }
  return rendered;
}

export function renderAbout(template, profile, programmeCss) {
  validatePublicProfile(profile);
  return replaceRegions(template, 'PUBLIC_PROFILE', renderRegions(profile, programmeCss), 'public/about/index.html');
}

export function renderSheet(template, programmeCss, file = 'technical sheet') {
  return replaceRegions(
    template,
    'PROGRAMME',
    { STYLE: `  <style>\n${indent(programmeCss.trimEnd(), 4)}\n  </style>` },
    file,
  );
}

export async function readPublicProfile() {
  return JSON.parse(await readFile(PROFILE_PATH, 'utf8'));
}

export async function readProgrammeCss() {
  return readFile(PROGRAMME_CSS_PATH, 'utf8');
}

export async function expectedAbout() {
  const [template, profile, programmeCss] = await Promise.all([
    readFile(ABOUT_PATH, 'utf8'),
    readPublicProfile(),
    readProgrammeCss(),
  ]);
  return { actual: template, expected: renderAbout(template, profile, programmeCss) };
}

export async function expectedSheets() {
  const programmeCss = await readProgrammeCss();
  return Promise.all(
    SHEET_PATHS.map(async (file) => {
      const template = await readFile(file, 'utf8');
      const relative = path.relative(ROOT, file);
      return { file, relative, actual: template, expected: renderSheet(template, programmeCss, relative) };
    }),
  );
}

const DRIFT = 'public/about/index.html drifted from src/content/public-profile.json or src/styles/programme.css; run npm run generate:about';

export async function assertAboutIsGenerated() {
  const { actual, expected } = await expectedAbout();
  assert.equal(actual, expected, DRIFT);
  for (const sheet of await expectedSheets()) {
    assert.equal(sheet.actual, sheet.expected, `${sheet.relative} drifted from src/styles/programme.css; run npm run generate:about`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--check')) {
    await assertAboutIsGenerated();
    console.log('Static About and technical sheets match the public profile and programme stylesheet.');
  } else {
    const { expected } = await expectedAbout();
    await writeFile(ABOUT_PATH, expected);
    for (const sheet of await expectedSheets()) await writeFile(sheet.file, sheet.expected);
    console.log('Generated static About profile regions and technical sheet stylesheets.');
  }
}
