import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export const APPROVED_RESUME_SHA256 = 'de68cbb3d943e7ed0533c0fc9c7bbad3385943257109f77bfcb805d8ff713524';

function countMatches(text, pattern) {
  return text.match(pattern)?.length ?? 0;
}

export function assertAccessibleResume(buffer, name) {
  assert.equal(buffer.subarray(0, 5).toString('ascii'), '%PDF-', `${name}: invalid PDF signature`);
  assert.equal(buffer.length, 50_918, `${name}: unexpected tagged artifact size`);
  assert.equal(createHash('sha256').update(buffer).digest('hex'), APPROVED_RESUME_SHA256, `${name}: unapproved resume revision`);

  const pdf = buffer.toString('latin1');
  assert.match(pdf, /%%EOF\s*$/, `${name}: missing final PDF end marker`);
  assert.equal(countMatches(pdf, /\/Type\s+\/Page\b/g), 2, `${name}: expected two pages`);
  assert.ok(!pdf.toLowerCase().includes('yupeng-dev'), `${name}: stale GitHub identity`);
  assert.match(pdf, /\/StructTreeRoot\b/, `${name}: missing tagged-PDF structure tree`);
  assert.match(pdf, /\/MarkInfo\s*<<[\s\S]*?\/Marked\s+true[\s\S]*?>>/, `${name}: PDF is not marked as tagged`);
  assert.match(pdf, /\/Lang\s*\(en\\055US\)/, `${name}: document language must be en-US`);
  assert.match(pdf, /\/Title\s*\(Yupeng Lu \\055 AI Agent Engineer\)/, `${name}: accessible document title is missing`);
  assert.match(pdf, /\/Author\s*\(Yupeng Lu\)/, `${name}: document author is missing`);
  assert.match(pdf, /\/Metadata\s+\d+\s+0\s+R\b/, `${name}: XMP metadata stream is missing`);
  assert.match(pdf, /\/ViewerPreferences\s*<<[\s\S]*?\/DisplayDocTitle\s+true[\s\S]*?>>/, `${name}: title display preference is missing`);
  assert.equal(countMatches(pdf, /\/Tabs\s+\/S\b/g), 2, `${name}: both pages must use structural tab order`);
  assert.equal(countMatches(pdf, /\/StructParents\s+[01]\b/g), 2, `${name}: both pages need structure-parent indices`);
  assert.match(pdf, /\/ParentTreeNextKey\s+13\b/, `${name}: parent tree must cover pages and link annotations`);
  assert.equal(countMatches(pdf, /\/S\s+\/Document\b/g), 1, `${name}: expected one document structure root`);
  assert.equal(countMatches(pdf, /\/S\s+\/Sect\b/g), 10, `${name}: expected ten semantic sections`);
  assert.equal(countMatches(pdf, /\/S\s+\/P\b/g), 12, `${name}: expected 12 paragraphs`);
  assert.equal(countMatches(pdf, /\/S\s+\/H1\b/g), 1, `${name}: expected one H1`);
  assert.equal(countMatches(pdf, /\/S\s+\/H2\b/g), 4, `${name}: expected four H2 headings`);
  assert.equal(countMatches(pdf, /\/S\s+\/H3\b/g), 6, `${name}: expected six H3 headings`);
  assert.equal(countMatches(pdf, /\/S\s+\/L\b/g), 5, `${name}: expected five semantic lists`);
  assert.equal(countMatches(pdf, /\/S\s+\/LI\b/g), 22, `${name}: expected 22 list items`);
  assert.equal(countMatches(pdf, /\/S\s+\/LBody\b/g), 22, `${name}: every list item needs a list body`);
  assert.equal(countMatches(pdf, /\/S\s+\/Link\b/g), 11, `${name}: expected 11 tagged links`);
  assert.equal(countMatches(pdf, /\/StructParent\s+\d+\b/g), 11, `${name}: every link annotation needs a structure parent`);
  assert.equal(countMatches(pdf, /\/Type\s+\/OBJR\b/g), 11, `${name}: every tagged link needs an object reference`);
  assert.equal(countMatches(pdf, /\/Contents\s*\([^\r\n]*\)/g), 11, `${name}: every link needs an accessible description`);
  assert.ok(countMatches(pdf, /\/ToUnicode\s+\d+\s+0\s+R\b/g) >= 2, `${name}: fonts need Unicode maps`);
  assert.match(pdf, /\/Outlines\s+\d+\s+0\s+R\b/, `${name}: section bookmarks are missing`);
  assert.doesNotMatch(
    pdf,
    /\/(?:JavaScript|JS|OpenAction|AA|Launch|EmbeddedFile|AcroForm|Encrypt)\b/,
    `${name}: active, embedded, form, or encrypted content is forbidden`,
  );
}
