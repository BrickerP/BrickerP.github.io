# 06 — Dogfood

Dogfooded against the production bundle on 2026-07-31.

## Task 1 — Enter and control the desktop loop

Viewport: `1440×900`, DPR 1.

- `LOOP 01` reads before the work title and metadata.
- The warm-white carrier leads to Zhengyangmen without obscuring the scene.
- The one vermilion closure node remains small and legible.
- Play/pause, fullscreen, About, and recording keep their existing behavior.
- About closes by Escape and restores focus to its trigger.

Result: **PASS**

## Task 2 — Use the complete work on mobile

Viewport: `390×844`, DPR 1 and DPR 2.

- The identity stack, landmark, road, and carrier remain readable.
- The four-action rail occupies the bottom safe area and does not collide with
  the title.
- Touch pause, About open/close, and recording cancel all announce their state.
- Portrait → landscape → portrait preserves playback progress.

Result: **PASS**

## Task 3 — Respect motion preference and export one circuit

- Reduced motion opens on the authored LOOP poster and stays still until Play.
- The exported WebM spans `48.005s`, begins at the loop seam, and contains
  healthy media-block density.
- The renderer returns to its original viewport and playback phase after export.
- Phase `1` and phase `0` are pixel-identical; native endpoint delta is `0`.

Result: **PASS**

## Quality evidence

- Visual Ralph: **93 / 100**
- Browser matrix: **PASS**
- Chrome performance:
  - Desktop `1440×900`: about `120 fps`, maximum product gap `14.8ms`
  - Mobile `390×844`: about `120 fps`, maximum product gap `13.5ms`
- Bundle budgets: JavaScript and CSS **PASS**
- Production-layout and static-route checks: **PASS**

The Playwright-bundled Chromium run was retained as a diagnostic failure because
its software renderer produced implausibly low desktop throughput. The repository
release gate passed unchanged in the documented local Chrome channel.

## Decision

Ship the current iteration. Further carrier or node reduction is optional polish,
not a launch blocker. Do not add more overlays, nodes, panels, or public controls.
