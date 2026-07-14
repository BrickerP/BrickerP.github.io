# PoE2 Build Lab operations

Live site: https://brickerp.github.io/
Repository: https://github.com/BrickerP/BrickerP.github.io
Search Console property: URL-prefix `https://brickerp.github.io/`

## Current launch state

- Hosting: GitHub Pages, public repo, `main` branch root.
- Search Console: ownership verified with `googlead1eaf93276e5fa5.html`.
- Sitemap: submitted in Search Console as `sitemap.xml` on 2026-06-16.
- AdSense: account exists as `pub-1111218417177666`; site code and `ads.txt` are configured. Actual ads still depend on Google site review/serving status.

## Daily monitoring: natural traffic

Open Google Search Console for the property and check:

1. **效果 / Performance**
   - Total impressions: early signal that Google has discovered pages.
   - Total clicks: real organic traffic.
   - Queries: exact long-tail keywords users searched.
   - Pages: which guide pages are getting impressions.
2. **网页 / Pages**
   - Indexed pages vs not indexed pages.
   - Any crawl or duplicate/canonical issues.
3. **站点地图 / Sitemaps**
   - Confirm `sitemap.xml` eventually changes from temporary fetch failure to successful processing.

Early expectation: Search Console may show little or no data for several days after launch.

## Weekly content loop

Each week:

1. Pull Search Console queries with impressions but low CTR.
2. Rewrite titles/meta descriptions for those pages.
3. Add 2-5 new long-tail pages based on PoE2 player questions.
4. Update patch labels when official PoE2 patch notes change mechanics.
5. Add first-hand screenshots/testing notes once a PoE2 account is available.

Priority content backlog:

- Best Monk beginner build
- Best Mercenary beginner build
- Best Sorceress beginner build
- How to respec in PoE2
- PoE2 Spirit explained
- PoE2 campaign progression checklist
- PoE2 early gear upgrade guide
- PoE2 beginner defensive layers

## Revenue path

AdSense is now configured in code, but revenue starts only after Google accepts/serves ads for the site. Required next steps:

1. In AdSense onboarding, use the Website step to check/confirm code detection.
2. Wait for Google site review/serving status to pass.
3. Keep `ads.txt` as `google.com, pub-1111218417177666, DIRECT, f08c47fec0942fa0`.
4. Track revenue in AdSense reports: page RPM, impressions, clicks, estimated earnings.

Do not add fake ad units or placeholder slot IDs. Current setup uses Auto ads script only; manual ad units need real slot IDs from AdSense.

## What increases revenue

- More indexed pages with search demand.
- Better CTR from Search Console query/title tuning.
- More original value: screenshots, tables, checklists, tools.
- Patch freshness: update pages quickly after official changes.
- Avoid thin/AI-only pages; they increase Search/AdSense policy risk.

## Research cadence

Before adding build pages, review `docs/research/README.md`. Each new repeated player pain point should get its own Markdown card under `docs/research/` before it becomes a page or tool.
