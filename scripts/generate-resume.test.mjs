import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  RESUME_OUTPUT_PATH,
  RESUME_SOURCE_PATH,
  canonicalHref,
  decodePdfLiteral,
  parsePdf,
  pdfLiteral,
  readResumeSource,
  serializePdf,
} from './generate-resume.mjs';
import { assertAccessibleResume, assertAccessibleResumeStructure } from './verify-resume.mjs';

const LINK_ANNOTATION = /\/Subtype \/Link\b[\s\S]*?\/URI \(((?:\\.|[^\\)])*)\)[\s\S]*?\/Contents \(((?:\\.|[^\\)])*)\)/g;

async function fixture() {
  const [html, pdf] = await Promise.all([readFile(RESUME_SOURCE_PATH, 'utf8'), readFile(RESUME_OUTPUT_PATH)]);
  return { source: readResumeSource(html), pdf };
}

test('approved resume passes accessibility checks and round-trips through the serializer', async () => {
  const { pdf } = await fixture();
  assertAccessibleResume(pdf, 'public/resume.pdf');
  assert.ok(serializePdf(parsePdf(pdf)).equals(pdf), 'serializer must reproduce the approved bytes');
});

test('resume metadata and link descriptions match the HTML source', async () => {
  const { source, pdf } = await fixture();
  const text = pdf.toString('latin1');
  for (const [key, value] of [
    ['Title', source.title],
    ['Author', source.author],
    ['Subject', source.subject],
    ['Keywords', source.keywords],
  ]) {
    assert.ok(text.includes(`/${key} ${pdfLiteral(value)}`), `${key} drifted from src/content/resume.html`);
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

test('structure checks reject stale identities and unlabeled links', async () => {
  const { pdf } = await fixture();
  const text = pdf.toString('latin1');
  const stale = Buffer.from(text.replace('github.com/BrickerP', 'github.com/yupeng-dev'), 'latin1');
  assert.throws(() => assertAccessibleResumeStructure(stale, 'stale'), /stale identity/);
  const unlabeled = Buffer.from(text.replace(/\/Contents \((?:\\.|[^\\)])+\)/, '/Contents 0 0 R'), 'latin1');
  assert.throws(() => assertAccessibleResumeStructure(unlabeled, 'unlabeled'), /accessible description/);
});
