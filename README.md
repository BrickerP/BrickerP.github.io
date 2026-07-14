# brickerp.github.io

Personal homepage for **Yupeng Lu** — AI Agent & Backend Platform Engineer.

## Structure

- `/` — personal homepage (`index.html` + `home.css`). The full-screen
  animated backdrop is the **Beijing Infinite Loop** piece, embedded from
  `/beijing-loop/?embed=1`.
- `/beijing-loop/` — the standalone interactive generative-art app
  (Vite + TypeScript + p5.js build output). Source lives in a separate project;
  this directory holds the compiled `dist/`.
- `/poe2/` — the earlier **PoE2 Build Lab** static site, kept and relocated
  under a subpath. Its `sitegen.py`, `styles.css`, and `docs/` moved with it.
- Root SEO/infra files stay at root: `robots.txt`, `sitemap.xml`, `ads.txt`,
  the Google Search Console verification file, and `404.html`.

## Deploy

GitHub Pages, legacy build from `main` branch, root path. Push to `main` and
Pages publishes `https://brickerp.github.io/`.

## Updating the Beijing Loop backdrop

Rebuild the app project with base `/beijing-loop/` and copy its `dist/` here:

```bash
# in the beijing-loop project
VITE_BASE=/beijing-loop/ npm run build
cp -R dist/* /path/to/brickerp.github.io/beijing-loop/
```
