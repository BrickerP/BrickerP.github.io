import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export const APPROVED_RESUME_SHA256 = 'b56d169549ae9c74fe9a403fa65d714afc694a1ebe4302a9f0dfdc5f9ab8406c';
export const RESUME_PAGE_COUNT = 2;
const STALE_IDENTITIES = ['yupeng-dev'];
const ACTIVE_CONTENT = /\/(?:JavaScript|JS|OpenAction|AA|Launch|EmbeddedFile|AcroForm|Encrypt)\b/;

function countMatches(text, pattern) {
  return text.match(pattern)?.length ?? 0;
}

function structureCounts(pdf) {
  const counts = new Map();
  for (const [, type] of pdf.matchAll(/\/Type\s*\/StructElem\s*\/S\s*\/(\w+)/g)) {
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }
  return counts;
}

function assertDocumentMetadata(pdf, name) {
  assert.match(pdf, /\/Lang\s*\(en(?:-|\\055)US\)/, `${name}: document language must be en-US`);
  assert.match(
    pdf,
    /\/Title\s*\(Yupeng Lu (?:-|\\055) Backend Engineer (?:-|\\055) Live Trading Systems & AI Platforms\)/,
    `${name}: accessible document title is missing`,
  );
  assert.match(pdf, /\/Author\s*\(Yupeng Lu\)/, `${name}: document author is missing`);
  assert.match(pdf, /\/Metadata\s+\d+\s+0\s+R\b/, `${name}: XMP metadata stream is missing`);
  assert.match(pdf, /\/ViewerPreferences\s*<<[\s\S]*?\/DisplayDocTitle\s+true[\s\S]*?>>/, `${name}: title display preference is missing`);
  assert.match(pdf, /\/Outlines\s+\d+\s+0\s+R\b/, `${name}: section bookmarks are missing`);
}

function assertTaggedStructure(pdf, name, pages) {
  assert.match(pdf, /\/StructTreeRoot\b/, `${name}: missing tagged-PDF structure tree`);
  assert.match(pdf, /\/MarkInfo\s*<<[\s\S]*?\/Marked\s+true[\s\S]*?>>/, `${name}: PDF is not marked as tagged`);
  assert.equal(countMatches(pdf, /\/Tabs\s*\/S\b/g), pages, `${name}: every page must use structural tab order`);
  assert.equal(countMatches(pdf, /\/StructParents\s+\d+\b/g), pages, `${name}: every page needs a structure-parent index`);

  const structure = structureCounts(pdf);
  const listItems = structure.get('LI') ?? 0;
  assert.equal(structure.get('Document'), 1, `${name}: expected one document structure root`);
  assert.equal(structure.get('H1'), 1, `${name}: expected one H1`);
  assert.ok((structure.get('H2') ?? 0) >= 4, `${name}: expected section headings`);
  assert.ok((structure.get('H3') ?? 0) >= 1, `${name}: expected role headings`);
  assert.ok(listItems > 0, `${name}: expected semantic list items`);
  assert.equal(structure.get('Lbl') ?? 0, listItems, `${name}: every list item needs a label`);
  assert.equal(structure.get('LBody') ?? 0, listItems, `${name}: every list item needs a list body`);
  assert.ok((structure.get('Link') ?? 0) > 0, `${name}: expected tagged link elements`);
}

function assertTaggedLinks(pdf, name, pages) {
  const links = countMatches(pdf, /\/Subtype\s*\/Link\b/g);
  assert.ok(links > 0, `${name}: expected hyperlink annotations`);
  assert.equal(countMatches(pdf, /\/StructParent\s+\d+\b/g), links, `${name}: every link annotation needs a structure parent`);
  assert.equal(countMatches(pdf, /\/Type\s*\/OBJR\b/g), links, `${name}: every link annotation needs an object reference`);
  assert.equal(countMatches(pdf, /\/Contents\s*\((?:\\.|[^\\)])+\)/g), links, `${name}: every link needs an accessible description`);
  assert.match(
    pdf,
    new RegExp(`/ParentTreeNextKey\\s+${pages + links}\\b`),
    `${name}: parent tree must cover every page and link annotation`,
  );
}

function assertEmbeddedFonts(pdf, name) {
  const fonts = countMatches(pdf, /\/Subtype\s*\/Type0\b/g);
  assert.ok(fonts > 0, `${name}: expected embedded composite fonts`);
  assert.ok(countMatches(pdf, /\/ToUnicode\s+\d+\s+0\s+R\b/g) >= fonts, `${name}: every font needs a Unicode map`);
}

export function assertAccessibleResumeStructure(buffer, name) {
  assert.equal(buffer.subarray(0, 5).toString('ascii'), '%PDF-', `${name}: invalid PDF signature`);
  const pdf = buffer.toString('latin1');
  assert.match(pdf, /%%EOF\s*$/, `${name}: missing final PDF end marker`);
  const pages = countMatches(pdf, /\/Type\s*\/Page\b/g);
  assert.equal(pages, RESUME_PAGE_COUNT, `${name}: expected ${RESUME_PAGE_COUNT} pages`);
  for (const identity of STALE_IDENTITIES) {
    assert.ok(!pdf.toLowerCase().includes(identity), `${name}: stale identity “${identity}”`);
  }
  assertDocumentMetadata(pdf, name);
  assertTaggedStructure(pdf, name, pages);
  assertTaggedLinks(pdf, name, pages);
  assertEmbeddedFonts(pdf, name);
  assert.doesNotMatch(pdf, ACTIVE_CONTENT, `${name}: active, embedded, form, or encrypted content is forbidden`);
}

export function assertAccessibleResume(buffer, name) {
  assertAccessibleResumeStructure(buffer, name);
  assert.equal(
    createHash('sha256').update(buffer).digest('hex'),
    APPROVED_RESUME_SHA256,
    `${name}: unapproved resume revision; run npm run generate:resume and approve its SHA-256`,
  );
}
