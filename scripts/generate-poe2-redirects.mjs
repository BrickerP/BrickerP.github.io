import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_PREFIX = 'https://brickerp.github.io/poe2/';
const TARGET_PREFIX = 'https://brickerp.github.io/poe2-build-lab/';

export const redirectPaths = [
  '',
  'about.html',
  'builds/best-beginner-builds.html',
  'contact.html',
  'guides/beginner-guide.html',
  'guides/classes-explained.html',
  'guides/currency-guide.html',
  'guides/skill-gems-explained.html',
  'privacy-policy.html',
  'tools/beginner-build-checklist.html',
];

export function documentFor(route) {
  const target = `${TARGET_PREFIX}${route}`;
  const source = `${SOURCE_PREFIX}${route}`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,follow">
  <meta name="description" content="PoE2 Build Lab has moved to its own GitHub Pages site.">
  <link rel="canonical" href="${target}">
  <meta http-equiv="refresh" content="0; url=${target}">
  <title>PoE2 Build Lab has moved</title>
</head>
<body>
  <main>
    <h1>PoE2 Build Lab has moved</h1>
    <p>The page formerly published at <code>${source}</code> now lives at <a href="${target}">${target}</a>.</p>
  </main>
</body>
</html>
`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const route of redirectPaths) {
    const relativeFile = route === '' ? 'index.html' : route;
    const output = path.join(ROOT, 'public', 'poe2', relativeFile);
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, documentFor(route), 'utf8');
  }

  console.log(`Generated ${redirectPaths.length} PoE2 migration pages.`);
}
