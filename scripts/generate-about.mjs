import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ABOUT_PATH = path.join(ROOT, 'public/about/index.html');
const PROFILE_PATH = path.join(ROOT, 'src/content/public-profile.json');
const PROFILE_MARKER = /<!--\s*PUBLIC_PROFILE:([A-Z_]+):([A-Z]+)\s*-->/g;

export function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function linkById(profile, id) {
  const link = profile.elsewhere.find((item) => item.id === id);
  assert.ok(link, `public profile: missing elsewhere link “${id}”`);
  return link;
}

function isHttpsHref(href) {
  try {
    return new URL(href).protocol === 'https:';
  } catch {
    return false;
  }
}

function isSupportedElsewhereHref(href) {
  if (href.startsWith('/') && !href.startsWith('//')) return true;
  try {
    return ['https:', 'mailto:'].includes(new URL(href).protocol);
  } catch {
    return false;
  }
}

export function validatePublicProfile(profile) {
  for (const key of ['name', 'role', 'dateModified', 'status', 'summary', 'experienceNote', 'focus']) {
    assert.equal(typeof profile[key], 'string', `public profile: ${key} must be a string`);
    assert.ok(profile[key].length > 0, `public profile: ${key} must not be empty`);
  }
  assert.match(profile.dateModified, /^\d{4}-\d{2}-\d{2}$/, 'public profile: dateModified must use YYYY-MM-DD');
  assert.ok(Array.isArray(profile.publicProof) && profile.publicProof.length > 0, 'public profile: publicProof must not be empty');
  assert.ok(Array.isArray(profile.primaryActions) && profile.primaryActions.length > 0, 'public profile: primaryActions must not be empty');
  assert.ok(Array.isArray(profile.elsewhere) && profile.elsewhere.length > 0, 'public profile: elsewhere must not be empty');
  const ids = profile.elsewhere.map(({ id }) => id);
  assert.equal(new Set(ids).size, ids.length, 'public profile: elsewhere ids must be unique');
  for (const proof of profile.publicProof) {
    assert.ok(proof.label && proof.detail && proof.href, 'public profile: every public proof needs label, detail, and href');
    assert.ok(isHttpsHref(proof.href), 'public profile: public proof hrefs must use https');
  }
  for (const link of profile.elsewhere) {
    assert.ok(link.id && link.label && link.href, 'public profile: every elsewhere link needs id, label, and href');
    assert.ok(isSupportedElsewhereHref(link.href), 'public profile: elsewhere hrefs must use https, mailto, or a root-relative path');
  }
  for (const action of profile.primaryActions) {
    linkById(profile, action.linkId);
    assert.ok(action.label && action.staticLabel, 'public profile: every primary action needs modal and static labels');
    assert.ok(['primary', 'secondary'].includes(action.style), 'public profile: primary action style must be primary or secondary');
    assert.ok(Number.isFinite(action.modalOrder), 'public profile: every primary action needs modalOrder');
    assert.ok(Number.isFinite(action.staticOrder), 'public profile: every primary action needs staticOrder');
  }
  assert.equal(
    new Set(profile.primaryActions.map(({ linkId }) => linkId)).size,
    profile.primaryActions.length,
    'public profile: primary action linkIds must be unique',
  );
  assert.equal(
    new Set(profile.primaryActions.map(({ modalOrder }) => modalOrder)).size,
    profile.primaryActions.length,
    'public profile: modal action order values must be unique',
  );
  assert.equal(
    new Set(profile.primaryActions.map(({ staticOrder }) => staticOrder)).size,
    profile.primaryActions.length,
    'public profile: static action order values must be unique',
  );
  const email = linkById(profile, profile.identity.emailLinkId);
  assert.ok(email.href.startsWith('mailto:'), 'public profile: identity email link must use mailto');
  assert.equal(
    new Set(profile.identity.sameAsLinkIds).size,
    profile.identity.sameAsLinkIds.length,
    'public profile: identity sameAs linkIds must be unique',
  );
  for (const id of profile.identity.sameAsLinkIds) {
    assert.ok(isHttpsHref(linkById(profile, id).href), 'public profile: identity sameAs links must use https');
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

function jsonLd(profile) {
  const email = linkById(profile, profile.identity.emailLinkId).href.replace(/^mailto:/, '');
  const sameAs = profile.identity.sameAsLinkIds.map((id) => linkById(profile, id).href);
  return serializeJsonForScript(
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
        email,
        sameAs,
        knowsAbout: [
          'AI agents',
          'Model Context Protocol',
          'tool-use contracts',
          'OpenAPI',
          'realtime voice systems',
          'evidence-gated software releases',
        ],
      },
    },
    2,
  )
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n');
}

function primaryActions(profile) {
  return [...profile.primaryActions]
    .sort((left, right) => left.staticOrder - right.staticOrder)
    .map((action) => {
      const link = linkById(profile, action.linkId);
      const secondary = action.style === 'secondary' ? ' secondary' : '';
      return `          <a class="button${secondary}" href="${escapeHtml(link.href)}">${escapeHtml(action.staticLabel)}</a>`;
    })
    .join('\n');
}

function proofCards(profile) {
  return profile.publicProof
    .map(
      (proof) =>
        `        <li><a class="proof-link" href="${escapeHtml(proof.href)}"><strong>${escapeHtml(proof.label)}</strong><span>${escapeHtml(proof.detail)}</span></a></li>`,
    )
    .join('\n');
}

function renderRegions(profile) {
  const email = linkById(profile, profile.identity.emailLinkId);
  const resume = linkById(profile, 'resume');
  const github = linkById(profile, 'github');
  const publicWork = linkById(profile, 'public-work');
  const cli = linkById(profile, 'cli');
  const title = `${profile.name} — ${profile.role}`;
  const description = `${title}. ${profile.summary}`;
  const imageAlt = `${title} profile card.`;
  return {
    HEAD: `  <meta name="description" content="${escapeHtml(description)}">\n  <link rel="canonical" href="https://brickerp.github.io/about/">\n  <meta property="og:title" content="${escapeHtml(title)}">\n  <meta property="og:description" content="${escapeHtml(profile.summary)}">\n  <meta property="og:type" content="profile">\n  <meta property="og:url" content="https://brickerp.github.io/about/">\n  <meta property="og:site_name" content="${escapeHtml(profile.name)} — BrickerP">\n  <meta property="og:image" content="https://brickerp.github.io/profile-preview.png">\n  <meta property="og:image:width" content="1200">\n  <meta property="og:image:height" content="630">\n  <meta property="og:image:alt" content="${escapeHtml(imageAlt)}">\n  <meta name="twitter:card" content="summary_large_image">\n  <meta name="twitter:title" content="${escapeHtml(title)}">\n  <meta name="twitter:description" content="${escapeHtml(profile.summary)}">\n  <meta name="twitter:image" content="https://brickerp.github.io/profile-preview.png">\n  <meta name="twitter:image:alt" content="${escapeHtml(imageAlt)}">\n  <title>${escapeHtml(title)}</title>`,
    JSON_LD: `  <script type="application/ld+json">\n${jsonLd(profile)}\n  </script>`,
    NAV: `    <nav aria-label="Primary navigation">\n      <a href="/">Generative artwork</a>\n      <a href="${escapeHtml(resume.href)}">Resume</a>\n      <a href="${escapeHtml(email.href)}">Email</a>\n    </nav>`,
    HERO: `    <section class="hero" aria-labelledby="profile-name">\n      <div>\n        <p class="eyebrow">Profile · Builder · Engineer</p>\n        <h1 id="profile-name">${escapeHtml(profile.name)}</h1>\n        <p class="role">${escapeHtml(profile.role)}</p>\n        <p class="summary">${escapeHtml(profile.summary)}</p>\n        <div class="actions" aria-label="Profile links">\n${primaryActions(profile)}\n        </div>\n      </div>\n      <p class="status"><strong>Work status</strong><br>${escapeHtml(profile.status)}</p>\n    </section>`,
    PROOF: `      <ul class="proof-grid">\n${proofCards(profile)}\n      </ul>`,
    FOCUS: `      <p class="experience-note"><strong>Current roles:</strong> ${escapeHtml(profile.experienceNote)}</p>\n      <p>${escapeHtml(profile.focus)}</p>\n      <p>See the full chronology and project evidence in the <a href="${escapeHtml(resume.href)}">resume PDF</a>, inspect the public <a href="${escapeHtml(publicWork.href)}">research skill</a> and <a href="${escapeHtml(cli.href)}">CLI</a>, or explore the <a href="${escapeHtml(github.href)}">personal GitHub</a>.</p>`,
    FOOTER: `  <footer><p>© 2026 ${escapeHtml(profile.name)} · <a href="/">Beijing — Endless Second Ring</a></p></footer>`,
  };
}

export function renderAbout(template, profile) {
  validatePublicProfile(profile);
  const regions = renderRegions(profile);
  const expectedMarkers = Object.keys(regions).flatMap((name) => [
    `${name}:START`,
    `${name}:END`,
  ]);
  const actualMarkers = [...template.matchAll(PROFILE_MARKER)].map(
    ([, name, boundary]) => `${name}:${boundary}`,
  );
  assert.deepEqual(
    actualMarkers,
    expectedMarkers,
    'public/about/index.html: profile marker sequence must contain exactly one ordered START/END pair per known region',
  );
  let rendered = template;
  for (const [name, content] of Object.entries(regions)) {
    const start = `<!-- PUBLIC_PROFILE:${name}:START -->`;
    const end = `<!-- PUBLIC_PROFILE:${name}:END -->`;
    const pattern = new RegExp(`(^[ \\t]*)${start}[\\s\\S]*?${end}`, 'm');
    assert.match(rendered, pattern, `public/about/index.html: missing ${name} generator markers`);
    rendered = rendered.replace(pattern, (_, indentation) =>
      `${indentation}${start}\n${content}\n${indentation}${end}`,
    );
  }
  return rendered;
}

export async function readPublicProfile() {
  return JSON.parse(await readFile(PROFILE_PATH, 'utf8'));
}

export async function expectedAbout() {
  const [template, profile] = await Promise.all([
    readFile(ABOUT_PATH, 'utf8'),
    readPublicProfile(),
  ]);
  return { actual: template, expected: renderAbout(template, profile) };
}

export async function assertAboutIsGenerated() {
  const { actual, expected } = await expectedAbout();
  assert.equal(actual, expected, 'public/about/index.html drifted from src/content/public-profile.json; run npm run generate:about');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { actual, expected } = await expectedAbout();
  if (process.argv.includes('--check')) {
    assert.equal(actual, expected, 'public/about/index.html drifted from src/content/public-profile.json; run npm run generate:about');
    console.log('Static About matches the public profile source.');
  } else {
    await writeFile(ABOUT_PATH, expected);
    console.log('Generated static About profile regions.');
  }
}
