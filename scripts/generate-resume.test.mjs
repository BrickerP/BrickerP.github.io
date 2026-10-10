import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  canonicalHref,
  decodePdfLiteral,
  parsePdf,
  pdfLiteral,
  readResumeSource,
  resumePaths,
  serializePdf,
} from './generate-resume.mjs';
import {
  FULL_RESUME,
  ONE_PAGE_RESUME,
  RESUME_VARIANTS,
  assertAccessibleResume,
  assertAccessibleResumeStructure,
  assertOnePageParity,
} from './verify-resume.mjs';

const LINK_ANNOTATION = /\/Subtype \/Link\b[\s\S]*?\/URI \(((?:\\.|[^\\)])*)\)[\s\S]*?\/Contents \(((?:\\.|[^\\)])*)\)/g;

async function fixture(variant) {
  const paths = resumePaths(variant);
  const [html, pdf] = await Promise.all([readFile(paths.source, 'utf8'), readFile(paths.output)]);
  return { source: readResumeSource(html, variant.source), pdf };
}

async function sources() {
  const [full, onePage] = await Promise.all(
    [FULL_RESUME, ONE_PAGE_RESUME].map((variant) => readFile(resumePaths(variant).source, 'utf8')),
  );
  return { full, onePage };
}

for (const variant of RESUME_VARIANTS) {
  test(`${variant.id} resume passes accessibility checks and round-trips through the serializer`, async () => {
    const { pdf } = await fixture(variant);
    assertAccessibleResume(pdf, variant.output, variant);
    assert.ok(serializePdf(parsePdf(pdf)).equals(pdf), 'serializer must reproduce the approved bytes');
  });

  test(`${variant.id} resume metadata and link descriptions match the HTML source`, async () => {
    const { source, pdf } = await fixture(variant);
    const text = pdf.toString('latin1');
    for (const [key, value] of [
      ['Title', source.title],
      ['Author', source.author],
      ['Subject', source.subject],
      ['Keywords', source.keywords],
    ]) {
      assert.ok(text.includes(`/${key} ${pdfLiteral(value)}`), `${key} drifted from ${variant.source}`);
    }
    const annotations = [...text.matchAll(LINK_ANNOTATION)].map(([, uri, contents]) => ({
      href: canonicalHref(decodePdfLiteral(uri)),
      contents: decodePdfLiteral(contents),
    }));
    assert.ok(annotations.length > 0, 'expected link annotations');
    for (const { href, contents } of annotations) {
      assert.equal(contents, source.links.get(href), `link description drifted for ${href}`);
    }
    assert.deepEqual(new Set(annotations.map(({ href }) => href)), new Set(source.links.keys()));
  });
}

test('structure checks reject stale identities, unlabeled links, and the wrong page count', async () => {
  const { pdf } = await fixture(FULL_RESUME);
  const text = pdf.toString('latin1');
  const stale = Buffer.from(text.replace('github.com/BrickerP', 'github.com/yupeng-dev'), 'latin1');
  assert.throws(() => assertAccessibleResumeStructure(stale, 'stale', FULL_RESUME), /stale identity/);
  const unlabeled = Buffer.from(text.replace(/\/Contents \((?:\\.|[^\\)])+\)/, '/Contents 0 0 R'), 'latin1');
  assert.throws(() => assertAccessibleResumeStructure(unlabeled, 'unlabeled', FULL_RESUME), /accessible description/);
  assert.throws(() => assertAccessibleResumeStructure(pdf, 'pages', { ...FULL_RESUME, pages: 1 }), /expected 1 pages/);
  assert.throws(() => assertAccessibleResumeStructure(pdf, 'title', { ...FULL_RESUME, title: ONE_PAGE_RESUME.title }), /accessible document title/);
});

test('the one-page resume only repeats headers, roles, and numbers from the full resume', async () => {
  const { full, onePage } = await sources();
  assertOnePageParity(full, onePage);
  assert.throws(() => assertOnePageParity(full, onePage.replace('600+', '700+')), /700\+/);
  assert.throws(() => assertOnePageParity(full, onePage.replace('Jul 2026 – Present', 'Jul 2026 – Aug 2026')), /role line/);
  assert.throws(() => assertOnePageParity(full, onePage.replace('<h1>Yupeng Lu</h1>', '<h1>Y. Lu</h1>')), /header/);
});

test('the one-page resume keeps every current role and is never older than the full resume', async () => {
  const { full, onePage } = await sources();
  const withoutQuant = onePage.replace(/<article class="entry">(?:(?!<article)[\s\S])*?Quant Trading Systems Venture[\s\S]*?<\/article>/, '');
  assert.notEqual(withoutQuant, onePage, 'fixture must remove the Quant entry');
  assert.throws(() => assertOnePageParity(full, withoutQuant), /current role/);
  const newer = full.replace(/(name="dcterms\.modified" content=")[^"]+/, '$12099-01-01');
  assert.throws(() => assertOnePageParity(newer, onePage), /older than the full resume/);
});
