import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { RESUME_VARIANTS, assertAccessibleResumeStructure } from './verify-resume.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_CHROME = {
  darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  linux: 'google-chrome',
  win32: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
};
const PDF_LITERAL = /\(((?:\\.|[^\\)])*)\)/;

function decodeHtml(value) {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&amp;', '&');
}

export function resumePaths(variant) {
  return { source: path.join(ROOT, variant.source), output: path.join(ROOT, variant.output) };
}

export function canonicalHref(href) {
  return new URL(href).href;
}

export function readResumeSource(html, sourcePath) {
  const lang = html.match(/<html\s+lang="([^"]+)"/i)?.[1];
  assert.equal(lang, 'en-US', 'resume source: <html lang> must be en-US');
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1];
  assert.ok(title, 'resume source: missing <title>');
  const meta = (name) => {
    const value = html.match(new RegExp(`<meta\\s+name="${name}"\\s+content="([^"]+)"`, 'i'))?.[1];
    assert.ok(value, `resume source: missing <meta name="${name}">`);
    return decodeHtml(value);
  };
  const modified = meta('dcterms.modified');
  assert.match(modified, /^\d{4}-\d{2}-\d{2}$/, 'resume source: dcterms.modified must use YYYY-MM-DD');
  const links = new Map();
  for (const [, attributes] of html.matchAll(/<a\b([^>]*)>/gi)) {
    const href = attributes.match(/\bhref="([^"]+)"/i)?.[1];
    const label = attributes.match(/\baria-label="([^"]+)"/i)?.[1];
    assert.ok(href && label, `resume source: every link needs href and aria-label: <a${attributes}>`);
    const key = canonicalHref(decodeHtml(href));
    const description = decodeHtml(label);
    assert.match(description, /^[\x20-\x7e]+$/, `resume source: link label must be printable ASCII: ${description}`);
    assert.ok(!links.has(key) || links.get(key) === description, `resume source: conflicting labels for ${key}`);
    links.set(key, description);
  }
  assert.ok(links.size > 0, 'resume source: expected hyperlinks');
  return {
    lang,
    title: decodeHtml(title),
    author: meta('author'),
    subject: meta('description'),
    keywords: meta('keywords'),
    modified,
    links,
    creator: `brickerp.github.io resume generator (${sourcePath})`,
  };
}

export function pdfLiteral(value) {
  assert.match(value, /^[\x20-\x7e]*$/, `pdf: literal strings must be printable ASCII: ${value}`);
  return `(${value.replace(/[\\()]/g, (character) => `\\${character}`)})`;
}

export function decodePdfLiteral(body) {
  const named = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '(': '(', ')': ')', '\\': '\\' };
  return body.replace(/\\([nrtbf()\\]|[0-7]{1,3})/g, (_, escape) => named[escape] ?? String.fromCharCode(parseInt(escape, 8)));
}

export function parsePdf(buffer) {
  const text = buffer.toString('latin1');
  const startxref = Number(text.match(/startxref\s+(\d+)\s+%%EOF\s*$/)?.[1]);
  assert.ok(Number.isInteger(startxref) && text.startsWith('xref', startxref), 'pdf: expected one classic cross-reference table');
  const trailerAt = text.indexOf('trailer', startxref);
  assert.ok(trailerAt > startxref, 'pdf: missing trailer');
  const table = text.slice(startxref, trailerAt);
  const subsections = [...table.matchAll(/^(\d+) (\d+)\s*$/gm)];
  assert.equal(subsections.length, 1, 'pdf: expected a single cross-reference subsection');
  const [first, count] = subsections[0].slice(1).map(Number);
  assert.equal(first, 0, 'pdf: cross-reference table must start at object 0');
  const entries = [...table.matchAll(/(\d{10}) (\d{5}) ([nf])/g)];
  assert.equal(entries.length, count, 'pdf: cross-reference entry count mismatch');
  const trailer = text.slice(trailerAt, text.lastIndexOf('startxref'));
  assert.doesNotMatch(trailer, /\/(?:Prev|Encrypt|XRefStm)\b/, 'pdf: incremental, encrypted, or hybrid files are not supported');
  const size = Number(trailer.match(/\/Size (\d+)/)?.[1]);
  const root = Number(trailer.match(/\/Root (\d+) 0 R/)?.[1]);
  const info = Number(trailer.match(/\/Info (\d+) 0 R/)?.[1]);
  assert.equal(size, count, 'pdf: trailer size must match the cross-reference table');
  assert.ok(Number.isInteger(root) && Number.isInteger(info), 'pdf: trailer needs /Root and /Info');
  const located = entries
    .map(([, offset, generation, kind], number) => ({ number, offset: Number(offset), generation: Number(generation), kind }))
    .filter(({ kind }) => kind === 'n');
  assert.ok(located.every(({ generation }) => generation === 0), 'pdf: only generation-zero objects are supported');
  located.sort((left, right) => left.offset - right.offset);
  const objects = new Map();
  located.forEach(({ number, offset }, index) => {
    const end = index + 1 < located.length ? located[index + 1].offset : startxref;
    const bytes = buffer.subarray(offset, end);
    const prefix = `${number} 0 obj`;
    assert.equal(bytes.subarray(0, prefix.length).toString('latin1'), prefix, `pdf: object ${number} is not at its recorded offset`);
    objects.set(number, bytes);
  });
  assert.equal(objects.size, size - 1, 'pdf: expected contiguous in-use objects');
  return { header: buffer.subarray(0, located[0].offset), objects, root, info };
}

export function serializePdf({ header, objects, root, info }) {
  const numbers = [...objects.keys()].sort((left, right) => left - right);
  numbers.forEach((number, index) => assert.equal(number, index + 1, 'pdf: object numbers must be contiguous'));
  const chunks = [header];
  const offsets = [];
  let offset = header.length;
  for (const number of numbers) {
    const bytes = objects.get(number);
    offsets.push(offset);
    chunks.push(bytes);
    offset += bytes.length;
  }
  const size = numbers.length + 1;
  const xref = [
    `xref\n0 ${size}\n0000000000 65535 f \n`,
    ...offsets.map((value) => `${String(value).padStart(10, '0')} 00000 n \n`),
  ].join('');
  const trailer = `trailer\n<</Size ${size}\n/Root ${root} 0 R\n/Info ${info} 0 R>>\nstartxref\n${offset}\n%%EOF\n`;
  return Buffer.concat([...chunks, Buffer.from(xref + trailer, 'latin1')]);
}

function dictionaryOf(objects, number) {
  const text = objects.get(number)?.toString('latin1');
  assert.ok(text, `pdf: missing object ${number}`);
  const match = text.match(/^\d+ 0 obj\s*(<<[\s\S]*>>)\s*endobj\s*$/);
  assert.ok(match && !text.includes('endstream'), `pdf: object ${number} is not a plain dictionary`);
  return match[1];
}

function objectBytes(number, dictionary) {
  return Buffer.from(`${number} 0 obj\n${dictionary}\nendobj\n`, 'latin1');
}

function withEntries(dictionary, entries) {
  return `${dictionary.slice(0, -2)}\n${entries.join('\n')}>>`;
}

function startsWithDictionary(objects, number, pattern) {
  return pattern.test(objects.get(number).subarray(0, 96).toString('latin1'));
}

function xmlText(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function xmpPacket(source, producer) {
  const timestamp = `${source.modified}T00:00:00Z`;
  return [
    '<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>',
    '<x:xmpmeta xmlns:x="adobe:ns:meta/">',
    '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">',
    '<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:pdf="http://ns.adobe.com/pdf/1.3/" xmlns:xmp="http://ns.adobe.com/xap/1.0/">',
    '<dc:format>application/pdf</dc:format>',
    `<dc:title><rdf:Alt><rdf:li xml:lang="x-default">${xmlText(source.title)}</rdf:li></rdf:Alt></dc:title>`,
    `<dc:creator><rdf:Seq><rdf:li>${xmlText(source.author)}</rdf:li></rdf:Seq></dc:creator>`,
    `<dc:description><rdf:Alt><rdf:li xml:lang="x-default">${xmlText(source.subject)}</rdf:li></rdf:Alt></dc:description>`,
    `<dc:language><rdf:Bag><rdf:li>${xmlText(source.lang)}</rdf:li></rdf:Bag></dc:language>`,
    `<pdf:Keywords>${xmlText(source.keywords)}</pdf:Keywords>`,
    `<pdf:Producer>${xmlText(producer)}</pdf:Producer>`,
    `<xmp:CreatorTool>${xmlText(source.creator)}</xmp:CreatorTool>`,
    `<xmp:CreateDate>${timestamp}</xmp:CreateDate>`,
    `<xmp:ModifyDate>${timestamp}</xmp:ModifyDate>`,
    `<xmp:MetadataDate>${timestamp}</xmp:MetadataDate>`,
    '</rdf:Description>',
    '</rdf:RDF>',
    '</x:xmpmeta>',
    '<?xpacket end="w"?>',
  ].join('\n');
}

function metadataStream(number, packet) {
  const body = Buffer.from(packet, 'utf8');
  return Buffer.concat([
    Buffer.from(`${number} 0 obj\n<</Type /Metadata\n/Subtype /XML\n/Length ${body.length}>>\nstream\n`, 'latin1'),
    body,
    Buffer.from('\nendstream\nendobj\n', 'latin1'),
  ]);
}

function describeLinks(objects, source) {
  for (const number of [...objects.keys()]) {
    if (!startsWithDictionary(objects, number, /^\d+ 0 obj\s*<<\/Type \/Annot\s*\/Subtype \/Link\b/)) continue;
    const dictionary = dictionaryOf(objects, number);
    assert.doesNotMatch(dictionary, /\/Contents\b/, `pdf: link annotation ${number} already has /Contents`);
    assert.match(dictionary, /\/StructParent\s+\d+/, `pdf: link annotation ${number} is not tagged`);
    const uri = dictionary.match(new RegExp(`/URI\\s*${PDF_LITERAL.source}`))?.[1];
    assert.ok(uri !== undefined, `pdf: link annotation ${number} has no URI action`);
    const href = canonicalHref(decodePdfLiteral(uri));
    const description = source.links.get(href);
    assert.ok(description, `pdf: no aria-label in the resume source for ${href}`);
    objects.set(number, objectBytes(number, withEntries(dictionary, [`/Contents ${pdfLiteral(description)}`])));
  }
}

function structureType(objects, number) {
  return dictionaryOf(objects, number).match(/\/Type\s*\/StructElem\s*\/S\s*\/(\w+)/)?.[1];
}

function wrapListBodies(objects, allocate) {
  for (const item of [...objects.keys()]) {
    if (!startsWithDictionary(objects, item, /^\d+ 0 obj\s*<<\/Type \/StructElem\s*\/S \/LI\b/)) continue;
    const dictionary = dictionaryOf(objects, item);
    const kids = dictionary.match(/\/K\s*\[([^\]]*)\]/)?.[1]?.trim() ?? '';
    assert.match(kids, /^\d+ 0 R(?:\s+\d+ 0 R)*$/, `pdf: list item ${item} must only contain structure elements`);
    const [label, ...content] = [...kids.matchAll(/(\d+) 0 R/g)].map(([, number]) => Number(number));
    assert.equal(structureType(objects, label), 'Lbl', `pdf: list item ${item} must start with a label`);
    assert.ok(content.length > 0, `pdf: list item ${item} has no body content`);
    const body = allocate();
    objects.set(body, objectBytes(body, `<</Type /StructElem\n/S /LBody\n/P ${item} 0 R\n/K [${content.map((kid) => `${kid} 0 R`).join(' ')}]>>`));
    for (const kid of content) {
      const kidDictionary = dictionaryOf(objects, kid);
      const parent = new RegExp(`/P ${item} 0 R\\b`, 'g');
      assert.equal(kidDictionary.match(parent)?.length, 1, `pdf: structure element ${kid} must name list item ${item} as its parent`);
      objects.set(kid, objectBytes(kid, kidDictionary.replace(parent, `/P ${body} 0 R`)));
    }
    objects.set(item, objectBytes(item, dictionary.replace(/\/K\s*\[[^\]]*\]/, `/K [${label} 0 R ${body} 0 R]`)));
  }
}

export function finalizeResumePdf(buffer, source) {
  const pdf = parsePdf(buffer);
  const objects = new Map(pdf.objects);
  let next = objects.size + 1;
  const allocate = () => next++;

  const catalog = dictionaryOf(objects, pdf.root);
  for (const [pattern, feature] of [
    [/\/Type\s*\/Catalog\b/, 'a catalog'],
    [/\/MarkInfo\s*<<[^>]*\/Marked\s+true/, 'tagged MarkInfo'],
    [/\/StructTreeRoot\s+\d+ 0 R/, 'a structure tree'],
    [/\/Outlines\s+\d+ 0 R/, 'a document outline'],
    [/\/ViewerPreferences\s*<<[^>]*\/DisplayDocTitle\s+true/, 'DisplayDocTitle'],
    [new RegExp(`/Lang\\s*\\(${source.lang}\\)`), `/Lang (${source.lang})`],
  ]) {
    assert.match(catalog, pattern, `pdf: Chrome output is missing ${feature}`);
  }
  assert.doesNotMatch(catalog, /\/Metadata\b/, 'pdf: Chrome output unexpectedly carries XMP metadata');

  const producerLiteral = dictionaryOf(objects, pdf.info).match(new RegExp(`/Producer\\s*${PDF_LITERAL.source}`))?.[1] ?? 'Skia/PDF';
  const producer = decodePdfLiteral(producerLiteral);
  const date = pdfLiteral(`D:${source.modified.replaceAll('-', '')}000000Z`);
  objects.set(
    pdf.info,
    objectBytes(
      pdf.info,
      [
        `<</Title ${pdfLiteral(source.title)}`,
        `/Author ${pdfLiteral(source.author)}`,
        `/Subject ${pdfLiteral(source.subject)}`,
        `/Keywords ${pdfLiteral(source.keywords)}`,
        `/Creator ${pdfLiteral(source.creator)}`,
        `/Producer ${pdfLiteral(producer)}`,
        `/CreationDate ${date}`,
        `/ModDate ${date}>>`,
      ].join('\n'),
    ),
  );

  describeLinks(objects, source);
  wrapListBodies(objects, allocate);

  const metadata = allocate();
  objects.set(metadata, metadataStream(metadata, xmpPacket(source, producer)));
  objects.set(pdf.root, objectBytes(pdf.root, withEntries(catalog, [`/Metadata ${metadata} 0 R`])));

  return serializePdf({ header: pdf.header, objects, root: pdf.root, info: pdf.info });
}

function printWithChrome(chrome, workspace, sourceFile) {
  const printed = path.join(workspace, 'chrome.pdf');
  const result = spawnSync(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${path.join(workspace, 'profile')}`,
      '--no-pdf-header-footer',
      '--export-tagged-pdf',
      '--generate-pdf-document-outline',
      `--print-to-pdf=${printed}`,
      pathToFileURL(sourceFile).href,
    ],
    { encoding: 'utf8', timeout: 120_000 },
  );
  assert.equal(result.status, 0, `Chrome could not print the resume: ${result.error ?? result.stderr}`);
  return readFile(printed);
}

export async function generateResume(variant, chrome = process.env.CHROME_PATH ?? DEFAULT_CHROME[process.platform]) {
  assert.ok(chrome, `no default Chrome path for ${process.platform}; set CHROME_PATH`);
  const paths = resumePaths(variant);
  const source = readResumeSource(await readFile(paths.source, 'utf8'), variant.source);
  const workspace = await mkdtemp(path.join(tmpdir(), 'brickerp-resume-'));
  try {
    const pdf = finalizeResumePdf(await printWithChrome(chrome, workspace, paths.source), source);
    assertAccessibleResumeStructure(pdf, `generated ${variant.id} resume`, variant.pages);
    await mkdir(path.dirname(paths.output), { recursive: true });
    await writeFile(paths.output, pdf);
    return pdf;
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const requested = process.argv.slice(2);
  const variants = requested.length
    ? requested.map((id) => {
        const variant = RESUME_VARIANTS.find((candidate) => candidate.id === id);
        assert.ok(variant, `unknown resume “${id}”; choose from ${RESUME_VARIANTS.map(({ id: known }) => known).join(', ')}`);
        return variant;
      })
    : RESUME_VARIANTS;
  for (const variant of variants) {
    const pdf = await generateResume(variant);
    const sha256 = createHash('sha256').update(pdf).digest('hex');
    console.log(`Generated ${variant.output} (${pdf.length} bytes, sha256 ${sha256}).`);
    console.log(
      sha256 === variant.sha256
        ? '  Already approved.'
        : `  Approve it by setting the sha256 of “${variant.id}” in scripts/verify-resume.mjs.`,
    );
  }
}
