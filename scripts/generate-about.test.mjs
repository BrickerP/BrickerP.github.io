import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  SHEET_PATHS,
  readProgrammeCss,
  readPublicProfile,
  renderAbout,
  renderSheet,
  serializeJsonForScript,
  validatePublicProfile,
} from './generate-about.mjs';

async function fixture() {
  return Promise.all([
    readFile(new URL('../public/about/index.html', import.meta.url), 'utf8'),
    readPublicProfile(),
    readProgrammeCss(),
  ]);
}

test('committed About regions are generated and reject visible-content drift', async () => {
  const [about, profile, css] = await fixture();
  assert.equal(renderAbout(about, profile, css), about);
  const drifted = about.replace(profile.summary, 'stale summary');
  assert.notEqual(renderAbout(drifted, profile, css), drifted);
});

test('the static page inlines the programme stylesheet shared with the intro', async () => {
  const [about, profile, css] = await fixture();
  const style = about.match(/<!-- PUBLIC_PROFILE:STYLE:START -->([\s\S]*?)<!-- PUBLIC_PROFILE:STYLE:END -->/)?.[1] ?? '';
  for (const rule of css.match(/^\.[a-z-]+ \{$/gm) ?? []) {
    assert.ok(style.includes(rule), `inline programme stylesheet is missing ${rule}`);
  }
  const changed = renderAbout(about, profile, `${css}\n.about-panel {\n  outline: 0;\n}\n`);
  assert.match(changed, /<!-- PUBLIC_PROFILE:STYLE:START -->[\s\S]*outline: 0;[\s\S]*<!-- PUBLIC_PROFILE:STYLE:END -->/);
});

test('technical sheets inline the same programme stylesheet and reject stylesheet drift', async () => {
  const css = await readProgrammeCss();
  for (const file of SHEET_PATHS) {
    const sheet = await readFile(file, 'utf8');
    assert.equal(renderSheet(sheet, css), sheet);
    const style = sheet.match(/<!-- PROGRAMME:STYLE:START -->([\s\S]*?)<!-- PROGRAMME:STYLE:END -->/)?.[1] ?? '';
    for (const rule of css.match(/^\.[a-z-]+ \{$/gm) ?? []) {
      assert.ok(style.includes(rule), `technical sheet stylesheet is missing ${rule}`);
    }
    const changed = renderSheet(sheet, `${css}\n.about-panel {\n  outline: 0;\n}\n`);
    assert.notEqual(changed, sheet);
    assert.throws(() => renderSheet(sheet.replace('<!-- PROGRAMME:STYLE:START -->', ''), css), /marker sequence/);
  }
});

test('JSON-LD serialization is script-safe and lossless for hostile strings', async () => {
  const [about, profile, css] = await fixture();
  const hostile = '</script><script>alert(1)</script>&>\u2028\u2029';
  const serialized = serializeJsonForScript({ hostile });
  assert.doesNotMatch(serialized, /<\/script/i);
  assert.doesNotMatch(serialized, /[<>&\u2028\u2029]/);
  assert.equal(JSON.parse(serialized).hostile, hostile);

  const hostileProfile = structuredClone(profile);
  hostileProfile.name = hostile;
  const rendered = renderAbout(about, hostileProfile, css);
  const payload = rendered.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(payload, 'generated About must contain JSON-LD');
  assert.doesNotMatch(payload, /<\/script/i);
  assert.equal(JSON.parse(payload).mainEntity.name, hostile);
  assert.doesNotMatch(rendered, /<\/script><script>alert/);
});

test('identity fields regenerate head metadata and reject manual head drift', async () => {
  const [about, profile, css] = await fixture();
  const changed = structuredClone(profile);
  changed.name = 'Ada Example';
  changed.role = 'Agent Systems Builder';
  changed.summary = 'A changed public summary.';
  const rendered = renderAbout(about, changed, css);
  assert.match(rendered, /<title>Ada Example — Agent Systems Builder<\/title>/);
  assert.match(rendered, /<meta property="og:description" content="A changed public summary\."/);
  assert.match(rendered, /<meta property="og:site_name" content="Ada Example — BrickerP"/);
  assert.match(rendered, /<meta name="twitter:title" content="Ada Example — Agent Systems Builder"/);
  assert.match(rendered, /<h1 class="about-name" id="profile-name">Ada Example<\/h1>/);
  const drifted = about.replace('<title>', '<title>Manual ');
  assert.notEqual(renderAbout(drifted, profile, css), drifted);
  assert.equal(renderAbout(drifted, profile, css), about);
});

test('generator rejects missing, duplicate, orphan, and out-of-order profile markers', async () => {
  const [about, profile, css] = await fixture();
  const start = '<!-- PUBLIC_PROFILE:NAV:START -->';
  const end = '<!-- PUBLIC_PROFILE:NAV:END -->';
  const cases = {
    missing: about.replace(start, ''),
    duplicate: about.replace(start, `${start}\n    ${start}`),
    orphan: about.replace('</body>', '  <!-- PUBLIC_PROFILE:UNKNOWN:START -->\n</body>'),
    order: about.replace(start, '__NAV_MARKER__').replace(end, start).replace('__NAV_MARKER__', end),
  };
  for (const [name, template] of Object.entries(cases)) {
    assert.throws(
      () => renderAbout(template, profile, css),
      /profile marker sequence/,
      `${name} marker corruption must fail`,
    );
  }
});

test('identity links must resolve to primary actions', async () => {
  const profile = await readPublicProfile();
  const broken = structuredClone(profile);
  broken.identity.sameAsLinkIds = ['missing-link'];
  assert.throws(() => validatePublicProfile(broken), /missing primary action/);
});

test('public profile rejects unsafe link schemes and duplicate action targets', async () => {
  const profile = await readPublicProfile();
  const unsafeProof = structuredClone(profile);
  unsafeProof.publicProof[0].href = 'javascript:alert(1)';
  assert.throws(() => validatePublicProfile(unsafeProof), /public proof hrefs must use https/);

  const unsafeAction = structuredClone(profile);
  unsafeAction.primaryActions[0].href = 'data:text/html,unsafe';
  assert.throws(() => validatePublicProfile(unsafeAction), /primary action hrefs/);

  const wrongEmail = structuredClone(profile);
  wrongEmail.primaryActions.find(({ id }) => id === 'email').href = 'https://example.com/email';
  assert.throws(() => validatePublicProfile(wrongEmail), /identity email link must use mailto/);

  const duplicateAction = structuredClone(profile);
  duplicateAction.primaryActions[1].id = duplicateAction.primaryActions[0].id;
  assert.throws(() => validatePublicProfile(duplicateAction), /primary action ids must be unique/);
});

test('experience reels use YYYY-MM months that never run backwards', async () => {
  const profile = await readPublicProfile();
  const loose = structuredClone(profile);
  loose.experience[0].start = '2026-7';
  assert.throws(() => validatePublicProfile(loose), /start must use YYYY-MM/);

  const backwards = structuredClone(profile);
  backwards.experience.find(({ end }) => end !== null).end = '2020-01';
  assert.throws(() => validatePublicProfile(backwards), /must end after it starts/);

  const future = structuredClone(profile);
  future.experience[0].start = '2099-01';
  assert.throws(() => validatePublicProfile(future), /must start before dateModified/);
});
