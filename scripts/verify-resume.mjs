import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

/** Every resume this repo prints. Approve a revision by setting its sha256. */
export const FULL_RESUME = {
  id: 'full',
  source: 'src/content/resume.html',
  output: 'public/resume.pdf',
  lang: 'en-US',
  title: 'Yupeng Lu - AI Agent & Backend Engineer',
  pages: 2,
  sha256: '4a80d018aefe1492817a0b92141e3f0e8208e8e742e780c34e02c7da1b7853bb',
};
export const ONE_PAGE_RESUME = {
  id: 'one-page',
  source: 'src/content/resume-1p.html',
  output: 'applications/resume-1p.pdf',
  lang: 'en-US',
  title: 'Yupeng Lu - AI Agent & Backend Engineer',
  pages: 1,
  sha256: '2d968417b3152eade0de0af72b90bc45e69f7932a8b326e334d7da0c39fa1f10',
};
export const ZH_RESUME = {
  id: 'zh',
  source: 'src/content/resume-zh.html',
  output: 'applications/resume-zh.pdf',
  lang: 'zh-CN',
  title: 'Yupeng Lu - AI Agent Engineer - Chinese resume',
  pages: 1,
  sha256: 'd8d5187a914b894a73b1ad10e6bfbae8ec4a611eb162077875705487d23a1bca',
};
export const RESUME_VARIANTS = [FULL_RESUME, ONE_PAGE_RESUME, ZH_RESUME];

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

const PDF_HYPHEN = '(?:-|\\\\055)';

/** A regular expression for `text` as it appears in a PDF literal string, where `\`, `(`, `)` are backslash-escaped. */
export function pdfTextPattern(text) {
  return [...text]
    .map((character) => {
      if (character === '-') return PDF_HYPHEN;
      const pattern = character.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return '\\()'.includes(character) ? `\\\\${pattern}` : pattern;
    })
    .join('');
}

function assertDocumentMetadata(pdf, name, variant) {
  assert.match(pdf, new RegExp(`/Lang\\s*\\(${pdfTextPattern(variant.lang)}\\)`), `${name}: document language must be ${variant.lang}`);
  assert.match(pdf, new RegExp(`/Title\\s*\\(${pdfTextPattern(variant.title)}\\)`), `${name}: accessible document title “${variant.title}” is missing`);
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

export function assertAccessibleResumeStructure(buffer, name, variant) {
  assert.equal(buffer.subarray(0, 5).toString('ascii'), '%PDF-', `${name}: invalid PDF signature`);
  const pdf = buffer.toString('latin1');
  assert.match(pdf, /%%EOF\s*$/, `${name}: missing final PDF end marker`);
  const pages = countMatches(pdf, /\/Type\s*\/Page\b/g);
  assert.equal(pages, variant.pages, `${name}: expected ${variant.pages} pages`);
  for (const identity of STALE_IDENTITIES) {
    assert.ok(!pdf.toLowerCase().includes(identity), `${name}: stale identity “${identity}”`);
  }
  assertDocumentMetadata(pdf, name, variant);
  assertTaggedStructure(pdf, name, pages);
  assertTaggedLinks(pdf, name, pages);
  assertEmbeddedFonts(pdf, name);
  assert.doesNotMatch(pdf, ACTIVE_CONTENT, `${name}: active, embedded, form, or encrypted content is forbidden`);
}

export function assertAccessibleResume(buffer, name, variant) {
  assertAccessibleResumeStructure(buffer, name, variant);
  assert.equal(
    createHash('sha256').update(buffer).digest('hex'),
    variant.sha256,
    `${name}: unapproved resume revision; run npm run generate:resume and approve its SHA-256 in scripts/verify-resume.mjs`,
  );
}

const ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  middot: '·',
  ndash: '–',
  mdash: '—',
  harr: '↔',
  rarr: '→',
  times: '×',
  minus: '−',
};

function textOf(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&([a-z]+);/gi, (match, name) => {
      assert.ok(name in ENTITIES, `resume source: unknown HTML entity ${match}`);
      return ENTITIES[name];
    })
    .replace(/\s+/g, ' ')
    .trim();
}

function resumeFacts(html) {
  const body = html.slice(html.indexOf('<body'));
  const all = (pattern) => [...body.matchAll(pattern)].map(([, inner]) => textOf(inner));
  const normalize = (token) => token.replace(/^[("'[]+|[)"',.;:\]]+$/g, '').toLowerCase();
  const roleLines = all(/<div class="role-line">([\s\S]*?)<\/div>/g);
  return {
    masthead: [...all(/<h1>([\s\S]*?)<\/h1>/g), ...all(/<p class="contact">([\s\S]*?)<\/p>/g)],
    roleLines,
    current: roleLines.filter((line) => line.includes('Present')),
    numbers: new Set(textOf(body).split(' ').map(normalize).filter((token) => /\d/.test(token))),
    modified: html.match(/<meta\s+name="dcterms\.modified"\s+content="([^"]+)"/)?.[1] ?? '',
  };
}

/**
 * The one-page resume is a hand-curated subset aimed at one kind of role, so its headline and summary may
 * differ from the full resume. Facts may not: every name, contact line, role line, and number it states
 * must also be in the full resume, and every current role must be listed, so the two are updated together.
 */
export function assertOnePageParity(fullHtml, onePageHtml) {
  const full = resumeFacts(fullHtml);
  const one = resumeFacts(onePageHtml);
  const together = 'update both resumes together';
  for (const line of one.masthead) {
    assert.ok(full.masthead.includes(line), `one-page resume: header “${line}” is not in ${FULL_RESUME.source}; ${together}`);
  }
  for (const line of one.roleLines) {
    assert.ok(full.roleLines.includes(line), `one-page resume: role line “${line}” does not match ${FULL_RESUME.source}; ${together}`);
  }
  for (const line of full.current) {
    assert.ok(one.roleLines.includes(line), `one-page resume: current role “${line}” is missing; ${together}`);
  }
  for (const number of one.numbers) {
    assert.ok(full.numbers.has(number), `one-page resume: “${number}” is not in ${FULL_RESUME.source}; ${together}`);
  }
  assert.ok(one.modified >= full.modified, `one-page resume: older than the full resume; review ${ONE_PAGE_RESUME.source} and bump its dcterms.modified`);
}

const MONTH_NUMBER = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };

function bodyText(html) {
  return textOf(html.slice(html.indexOf('<body')));
}

function monthKey(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** Role periods as `YYYY-MM~YYYY-MM` or `YYYY-MM~now`, read from "Jul 2026 – Present" and "2026年7月 – 至今". */
function periods(html) {
  const text = bodyText(html);
  const found = new Set();
  for (const [, startMonth, startYear, endMonth, endYear] of text.matchAll(/\b([A-Z][a-z]{2}) (\d{4}) – (?:([A-Z][a-z]{2}) (\d{4})|Present)/g)) {
    if (!(startMonth in MONTH_NUMBER) || (endMonth && !(endMonth in MONTH_NUMBER))) continue;
    found.add(`${monthKey(startYear, MONTH_NUMBER[startMonth])}~${endMonth ? monthKey(endYear, MONTH_NUMBER[endMonth]) : 'now'}`);
  }
  for (const [, startYear, startMonth, endYear, endMonth] of text.matchAll(/(\d{4})年(\d{1,2})月 – (?:(\d{4})年(\d{1,2})月|至今)/g)) {
    found.add(`${monthKey(startYear, startMonth)}~${endYear ? monthKey(endYear, endMonth) : 'now'}`);
  }
  return found;
}

/** Digit runs in the resume body (not the header, where a phone number may go) outside dates. */
function numberRuns(html) {
  const text = bodyText(html.replace(/<header[\s\S]*?<\/header>/, '')).replace(/\b[A-Z][a-z]{2} \d{4}\b/g, ' ').replace(/\d{4}年(?:\d{1,2}月)?/g, ' ');
  return new Set(text.match(/\d+(?:[.,]\d+)*/g) ?? []);
}

function links(html) {
  return new Set([...html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)].map(([, href]) => href).filter((href) => !href.startsWith('tel:')));
}

function modifiedOf(html) {
  return html.match(/<meta\s+name="dcterms\.modified"\s+content="([^"]+)"/)?.[1] ?? '';
}

function assertSameSet(actual, expected, describe) {
  for (const item of actual) assert.ok(expected.has(item), describe(item, 'extra'));
  for (const item of expected) assert.ok(actual.has(item), describe(item, 'missing'));
}

const CHINESE_FORBIDDEN_TEXT = ['永久居民', '绿卡', 'Permanent Resident', 'Green Card'];

/**
 * The Chinese resume translates the one-page resume, so its text cannot be compared line by line. Its role
 * periods, links, and numbers must be exactly the one-page resume's (a phone number may sit in the header),
 * which in turn only repeats the full resume; it may not be dated before the one-page resume, and it leaves
 * out the work-authorization line the English resumes carry.
 */
export function assertChineseParity(fullHtml, onePageHtml, chineseHtml) {
  const together = 'translate every change';
  for (const word of CHINESE_FORBIDDEN_TEXT) {
    assert.ok(!chineseHtml.toLowerCase().includes(word.toLowerCase()), `Chinese resume: must not mention work authorization (“${word}”); the owner asked for it to be left out`);
  }
  const chinesePeriods = periods(chineseHtml);
  assert.ok(chinesePeriods.size > 0, 'Chinese resume: no role periods found (write them as “2026年7月 – 至今”)');
  assertSameSet(chinesePeriods, periods(onePageHtml), (period, kind) =>
    kind === 'extra'
      ? `Chinese resume: period ${period} is not in ${ONE_PAGE_RESUME.source}; ${together}`
      : `Chinese resume: period ${period} of ${ONE_PAGE_RESUME.source} is missing; ${together}`);
  const fullPeriods = periods(fullHtml);
  for (const period of chinesePeriods) assert.ok(fullPeriods.has(period), `Chinese resume: period ${period} is not in ${FULL_RESUME.source}`);
  assertSameSet(numberRuns(chineseHtml), numberRuns(onePageHtml), (number, kind) =>
    kind === 'extra'
      ? `Chinese resume: “${number}” is not in ${ONE_PAGE_RESUME.source}; ${together}`
      : `Chinese resume: “${number}” of ${ONE_PAGE_RESUME.source} is missing; ${together}`);
  assertSameSet(links(chineseHtml), links(onePageHtml), (href, kind) =>
    kind === 'extra'
      ? `Chinese resume: link ${href} is not in ${ONE_PAGE_RESUME.source}; ${together}`
      : `Chinese resume: link ${href} of ${ONE_PAGE_RESUME.source} is missing; ${together}`);
  assert.ok(
    modifiedOf(chineseHtml) >= modifiedOf(onePageHtml),
    `Chinese resume: older than the one-page resume; review ${ZH_RESUME.source} and bump its dcterms.modified`,
  );
}
