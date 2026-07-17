# BEIJING / 北京 — ENDLESS SECOND RING

A seamless **first-person night drive** through an imagined Beijing. The camera
travels at driver-eye height through twelve authored passages in Second-Ring
relative order — Tiananmen on the central axis, the palace moat, Shichahai with
the white dagoba, Deshengmen, the Olympic skyline, Bell & Drum Towers,
Nanluo/Wudaoying, Yonghegong, a CBD/finance skyline, the Temple of Heaven,
Qianmen's Dashilar with hutong density, and an overpass return — then arrives
back at the same frame every forty-eight seconds.

> **Artistic composition, not for navigation.** This is not a driving aid, road
> simulation or reconstruction of real streets. The road and city are
> procedurally authored for the artwork; no commercial tiles, scraped coordinates,
> live APIs or third-party location services are used.

- **Stack:** Vite · TypeScript · Three.js · plain CSS
- **View:** one first-person drive, with no cockpit or alternate camera mode
- **Loop:** deterministic 48-second closed journey across twelve Beijing passages
- **Recording:** one complete loop exported as WebM when the browser supports it

## Quick start

```bash
npm install
npm run dev
# http://localhost:5173/
```

Production build:

```bash
npm run build
npm run preview
```

## Controls

| Action | UI | Keyboard |
| --- | --- | --- |
| Play / pause | Top-right play control | `Space` |
| Record one 48-second loop / cancel without download | Top-right record control | `R` |
| Enter / exit fullscreen | Top-right fullscreen control | `F` |
| Private developer telemetry | No public control | `D` |

Play/pause, record, fullscreen and the personal intro are the four public
controls. They are semantic buttons with visible keyboard focus, pressed state
and at least a 44×44px target. Pressing record again while a capture is running
cancels it without downloading. `D` toggles a private telemetry panel for
maintainers; it is not a toolbar action. Global shortcuts ignore buttons, links
and editable content so native keyboard activation never fires twice. On narrow
screens the toolbar stays at the top-right inside the safe area.

## Experience contract

The composition is built around a single uninterrupted viewpoint:

- a driver-eye camera approximately **1.55m** above the road;
- forward motion on a closed procedural spline;
- no vehicle model or cockpit blocking the view;
- no speedometer, compass, navigation overlay or game HUD;
- calm editorial type and a compact toolbar kept outside the visual focus;
- Beijing suggested through material, rhythm and silhouette rather than literal
  geographic reconstruction.

Each 4-second passage carries one strong identity anchor rather than scattered
props: Tiananmen and Zhengyangmen on the axis, the moat corner tower,
Shichahai's bridge and white dagoba, Deshengmen with the 二环 gantry, the Bird's
Nest and Water Cube, Drum and Bell Towers, Nanluo/Wudaoying signs, Yonghegong's
yellow eaves, a CBD skyline with secondary finance-street plates, the Temple of
Heaven's triple-eave hall, the Dashilar pailou with hutong courtyard gates, and
the overpass that folds the journey back into its first frame. Mid-tier surface
atlases add brick, tile, bark and glass rhythm under the same flat-shaded masses.

The city palette combines a deep blue-black sky and asphalt with grey brick,
dark red walls, restrained vermilion, warm amber lamps, stone lane markings and
occasional dark water. Lighting is cinematic but graphic: legibility and a clear
vanishing point take priority over decorative line density.

## Why the 48-second loop closes

The runtime derives the full scene from one normalized phase:

```text
phase = (elapsed mod 48) / 48
```

The camera position is sampled from a closed spline at `phase`; its direction is
derived from the same path. Roadside architecture, lamp and water luminance,
and the small camera bob are deterministic functions of that clock. At
forty-eight seconds, phase returns to zero, so camera and animated scene state
return to their starting values together rather than relying on accumulated
frame-to-frame motion.

Recording pauses ordinary playback, seeks to the cycle origin, and lets the
capture clock address canonical scene frames directly. It exports one 48-second
period and then restores the previous play/pause state. Pressing the record
control again cancels the capture and discards it.

## Reduced motion

When `prefers-reduced-motion: reduce` is active, the experience opens paused at
a deliberate poster frame and secondary camera bob stays disabled. The
persistent play control remains available, so forward travel begins only after
an explicit user action.

## Architecture

```text
src/
  main.ts                     browser lifecycle, shortcuts, a11y and recording
  app/BeijingLoopApp.ts       deterministic 48s clock and render orchestration
  rendering/
    BeijingDriveScene.ts      procedural road, twelve passages, lamps, atmosphere
    surfaceTextures.ts        seeded mid-tier surface atlases
    FirstPersonCameraRig.ts   phase-derived driver-eye camera pose
    drivePath.ts              closed spline and road-ribbon geometry helpers
    theme.ts                  48s timing, palette and scene constants
  ui/
    controls.ts               semantic play, record and fullscreen controls
    recorder.ts               exact-cycle canvas MediaRecorder export
  styles/main.css             cinematic HUD tokens, safe areas and focus states
index.html                    metadata and accessible artwork description
scripts/                      build and browser/seam verification
```

The scene is generated locally at runtime. It requests no spatial or live data
after the production assets have been served.

## Accessibility and resilience

- The WebGL canvas has a concise accessible name and a linked text description.
- Long-running motion always has a persistent pause control.
- Reduced-motion preference is respected before animation starts.
- Recording state is announced through an atomic polite live region.
- Fullscreen state is reflected through the control's accessible name and
  pressed state.
- Recording and fullscreen are progressive enhancements. If either browser API
  is unavailable, its button is disabled with an accessible explanation.
- Desktop and mobile layouts account for safe-area insets.
- Pointer targets remain at least 44×44px and keyboard focus is always visible.
- WebGL failures produce a readable status message instead of a blank page.
- Rendering pauses while the document is hidden and resumes without a large
  time-step jump.

## Verification

```bash
npm run verify       # deterministic geometry + TypeScript
npm run build        # typecheck + production bundle
```

When running the local development server, the repository's browser and seam
checks can also be used:

```bash
PW_CHANNEL=chrome URL=http://127.0.0.1:5173/ npm run verify:browser
PW_CHANNEL=chrome URL=http://127.0.0.1:5173/ npm run verify:seam
```

The seam check compares the beginning and end of the deterministic cycle. Browser
coverage should include desktop and narrow mobile viewports, control target sizes,
focus behaviour, pause stability, recording state, overflow and console errors.

Production bundles expose the deterministic browser hook only when the explicit
`?qa=1` query is present. That query is for automated verification, not a public
view or camera mode. For a local production check:

```bash
npm run preview -- --host 127.0.0.1 --port 4173
URL='http://127.0.0.1:4173/?qa=1' EXPECT_PRODUCTION=1 npm run verify:browser
URL='http://127.0.0.1:4173/?qa=1' npm run verify:seam
```

The GitHub Pages workflow runs these production browser and seam checks before
uploading the bundle. A normal production URL without `?qa=1` does not install
the test hook.

## Deploy to GitHub Pages

`.github/workflows/deploy-pages.yml` builds and publishes the production bundle
to the root user site at <https://brickerp.github.io/>. The workflow uses
`VITE_BASE=/` so static assets resolve from the GitHub Pages root.

1. In the repository's **Settings → Pages**, select **GitHub Actions** as the
   build source.
2. Push `main`.
3. Wait for the Pages workflow to finish, then open the site URL above.

## Licensing and limits

Project code and the authored composition are released under the MIT License.
The recorder depends on browser support for `MediaRecorder` and
`canvas.captureStream`; fullscreen depends on the Fullscreen API. Unsupported
enhancements are disabled without blocking playback. The experience is an
artistic scene only and must not be used for navigation, distance measurement or
geographic analysis.
