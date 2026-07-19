import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  readPublicProfile,
  renderAbout,
  serializeJsonForScript,
  validatePublicProfile,
} from './generate-about.mjs';

async function fixture() {
  return Promise.all([
    readFile(new URL('../public/about/index.html', import.meta.url), 'utf8'),
    readPublicProfile(),
  ]);
}

test('committed About regions are generated and reject visible-content drift', async () => {
  const [about, profile] = await fixture();
  assert.equal(renderAbout(about, profile), about);
  const drifted = about.replace(profile.summary, 'stale summary');
  assert.notEqual(renderAbout(drifted, profile), drifted);
});

test('JSON-LD serialization is script-safe and lossless for hostile strings', async () => {
  const [about, profile] = await fixture();
  const hostile = '</script><script>alert(1)</script>&>\u2028\u2029';
  const serialized = serializeJsonForScript({ hostile });
  assert.doesNotMatch(serialized, /<\/script/i);
  assert.doesNotMatch(serialized, /[<>&\u2028\u2029]/);
  assert.equal(JSON.parse(serialized).hostile, hostile);

  const hostileProfile = structuredClone(profile);
  hostileProfile.name = hostile;
  const rendered = renderAbout(about, hostileProfile);
  const payload = rendered.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(payload, 'generated About must contain JSON-LD');
  assert.doesNotMatch(payload, /<\/script/i);
  assert.equal(JSON.parse(payload).mainEntity.name, hostile);
});

test('identity fields regenerate head metadata and reject manual head drift', async () => {
  const [about, profile] = await fixture();
  const changed = structuredClone(profile);
  changed.name = 'Ada Example';
  changed.role = 'Agent Systems Builder';
  changed.summary = 'A changed public summary.';
  const rendered = renderAbout(about, changed);
  assert.match(rendered, /<title>Ada Example — Agent Systems Builder<\/title>/);
  assert.match(rendered, /<meta property="og:description" content="A changed public summary\."/);
  assert.match(rendered, /<meta property="og:site_name" content="Ada Example — BrickerP"/);
  assert.match(rendered, /<meta name="twitter:title" content="Ada Example — Agent Systems Builder"/);
  const drifted = about.replace('<title>', '<title>Manual ');
  assert.notEqual(renderAbout(drifted, profile), drifted);
  assert.equal(renderAbout(drifted, profile), about);
});

test('generator rejects missing, duplicate, orphan, and out-of-order profile markers', async () => {
  const [about, profile] = await fixture();
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
      () => renderAbout(template, profile),
      /profile marker sequence/,
      `${name} marker corruption must fail`,
    );
  }
});

test('profile actions must resolve through the shared elsewhere links', async () => {
  const profile = await readPublicProfile();
  const broken = structuredClone(profile);
  broken.primaryActions[0].linkId = 'missing-link';
  assert.throws(() => renderAbout('', broken), /missing elsewhere link/);
});

test('public profile rejects unsafe link schemes and duplicate action targets', async () => {
  const profile = await readPublicProfile();
  const unsafeProof = structuredClone(profile);
  unsafeProof.publicProof[0].href = 'javascript:alert(1)';
  assert.throws(() => validatePublicProfile(unsafeProof), /public proof hrefs must use https/);

  const unsafeElsewhere = structuredClone(profile);
  unsafeElsewhere.elsewhere[0].href = 'data:text/html,unsafe';
  assert.throws(() => validatePublicProfile(unsafeElsewhere), /elsewhere hrefs/);

  const wrongEmail = structuredClone(profile);
  wrongEmail.elsewhere.find(({ id }) => id === 'email').href = 'https://example.com/email';
  assert.throws(() => validatePublicProfile(wrongEmail), /identity email link must use mailto/);

  const duplicateAction = structuredClone(profile);
  duplicateAction.primaryActions[1].linkId = duplicateAction.primaryActions[0].linkId;
  assert.throws(() => validatePublicProfile(duplicateAction), /primary action linkIds must be unique/);
});
