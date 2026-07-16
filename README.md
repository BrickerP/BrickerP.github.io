# Beijing Infinite Loop / 北京无限环线

A quiet generative study of **one ring, one axis, and one seamless breath**.
A single route marker completes an artistic Beijing second-ring loop while the
orange route recursively scales into itself over a still paper-cut city plate.

> **Artistic visualization, not for navigation.** Every coordinate is an
> authored abstract “city unit,” not survey data. No commercial map tiles,
> scraped coordinates, runtime APIs, or third-party map services are used.

The project intentionally rejects literal street density. Beijing is evoked
through twelve courtyard plates, four gate marks, a broken central axis, eight
outer arcs, one lake, and six north-west ridge contours. The context is rendered
once; only the second-ring motif recurs.

- **Stack:** Vite · TypeScript · p5.js WebGL · plain CSS
- **Public views:** Infinite · Plan
- **Runtime:** Fully offline after build
- **Recording:** One exact 12-second seamless WebM cycle

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

`npm run build` regenerates the deterministic GeoJSON, typechecks the project,
and creates `dist/`.

## Controls

| Action | UI | Keyboard |
| --- | --- | --- |
| Play / pause | Top-right button | `Space` |
| Infinite view | Bottom dock | `1` or `3` |
| Plan view | Bottom dock | `2` |
| Record one cycle | Top-right dot | `R` |
| Fullscreen | Top-right corners | `F` |
| Debug overlay | Hidden utility | `D` |

All public controls are semantic buttons with visible focus, pressed state, and
at least a 44×44px target. Global shortcuts ignore focused controls and editable
content, preventing native button activation from firing twice.

## The visual system

### Infinite

The default hero view keeps a fixed north-up camera and static city context.
Nested copies of the orange route scale around the central anchor. Faint copies
bridge the seam; one route marker remains dominant and crossfades only when two
adjacent scales share the transition.

### Plan

A full-city inspection view shows the paper-cut municipal plate, courtyard
masses, outer arcs, lake, gate marks, internal axis, and northern ridges. It is
not a geographic plan and contains no POIs or navigational information.

## Why the 12-second cycle is seamless

Let `phase = (elapsed mod 12) / 12`. A loop copy at integer depth `k` is drawn at
scale `S^(phase + k)`, where `S = 2.45`. When phase wraps from 1 to 0, the set of
copies is unchanged after shifting the integer depth labels. Each copy’s opacity
is a continuous cubic B-spline-derived function, so the transition has no frame
jump.

The route marker uses the same 12-second clock and completes exactly one lap per
cycle. The city context and camera are static in Infinite mode. Consequently the
entire exported frame—not only the abstract scale set—returns to the same state
at 12 seconds.

`scripts/seam-check.mjs` validates 121 deterministic samples, checks every frame
is nonblank, bounds adjacent-frame difference spikes, and compares exact 0s and
12s endpoints.

## Sparse geometry contract

`scripts/generate-map.mjs` emits the same GeoJSON filenames and `FeatureKind`
boundary used by the renderer, but keeps a strict visual budget:

- at most **28 road features** and **500 road points**;
- exactly **12** closed courtyard plates;
- exactly **4** gate marks;
- exactly **8** broken outer arcs;
- exactly **3** internal axis segments;
- **1** lake and **6** north-west ridges;
- **0** street×street intersections;
- a single non-self-intersecting vehicle loop.

The generator fails if its feature contract changes. `scripts/geometry-check.mjs`
also regenerates twice, verifies byte-identical output, validates finite and
nonduplicate segments, checks self-intersections, and enforces the budgets.

## Architecture

```text
src/
  main.ts                     p5 bootstrap, a11y semantics, shortcuts, test hook
  app/BeijingLoopApp.ts       single 12s clock and render orchestration
  rendering/
    MapRenderer.ts            one static sparse context layer
    FractalRenderer.ts        seamless recursive loop-layer scales/opacities
    VehicleRenderer.ts        minimal ivory route marker
    CameraController.ts       fixed Infinite + framed Plan cameras
    theme.ts                  shared palette and fractal constants
  path/
    pathSampler.ts            Catmull-Rom + arc-length loop sampling
    loopPath.ts               GeoJSON loop control points + fallback
    distanceToPath.ts         debug sensor distance field
    geometry.ts               vector math and frame-rate-independent damping
  data/
    mapLoader.ts              one-time local GeoJSON loading and parsing
    mapTypes.ts               shared feature/data types
  ui/
    controls.ts               semantic overlay controls and debug/record states
    recorder.ts               exact-cycle canvas MediaRecorder export
  styles/main.css             tokens, responsive dock, focus and hidden states
public/data/*.geojson         deterministic authored output
scripts/
  generate-map.mjs            sparse artistic composition generator
  geometry-check.mjs          deterministic/topology/feature-budget gate
  verify.mjs                  browser, layout, a11y and runtime assertions
  seam-check.mjs              121-frame periodicity and nonblank gate
```

## Accessibility and resilience

- Persistent pause control satisfying long-running motion requirements.
- `prefers-reduced-motion` freezes recursive scaling and slows the route marker.
- Canvas exposes a concise accessible name and linked text description.
- Exactly one public mode reports `aria-pressed="true"`.
- Recording/debug elements use authoritative hidden-state CSS.
- All supported mobile/desktop layouts are checked for overflow and overlay
  collisions.
- WebGL and local-data failures show readable recovery messages.
- The draw loop stops while the document is hidden; elapsed time is clamped on
  resume.
- Pixel density is capped at 2 and reduced to 1 under reduced motion.

## Verification

Static checks:

```bash
npm run verify           # deterministic geometry + TypeScript
npm run build            # regenerate + typecheck + production bundle
```

Browser and seam checks require a running dev server. The scripts use the
bundled Playwright browser when available and otherwise support installed Chrome:

```bash
npm run dev -- --host 127.0.0.1

PW_CHANNEL=chrome URL=http://127.0.0.1:5173/ npm run verify:browser
PW_CHANNEL=chrome URL=http://127.0.0.1:5173/ npm run verify:seam
```

Browser verification covers 1440×900, 1280×720, 390×844, and 360×800. It
asserts canvas semantics, control names/targets, hidden states, selected mode,
no overlay collisions or overflow, nonblank/low-density artwork, loop presence,
pause stability, focused-key behavior, debug behavior, recording state, console
errors, failed requests, and refreshed screenshots under `docs/verify/`.

## Record and export

Press `R` or the record button. Recording seeks to cycle start and exports one
12-second `beijing-infinite-loop.webm` file.

For a GitHub README GIF:

```bash
ffmpeg -i beijing-infinite-loop.webm \
  -vf "fps=24,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer" \
  -loop 0 docs/preview.gif
```

## Deploy to GitHub Pages

`.github/workflows/deploy-pages.yml` builds and deploys `dist/` to the root user
site at <https://brickerp.github.io/>. The workflow sets `VITE_BASE=/` so built
assets and local data resolve from the GitHub Pages root.

1. Push the repository to GitHub.
2. Select **Settings → Pages → Build and deployment → GitHub Actions**.
3. Push `main`; the workflow publishes the production build.

## Data, licensing, and limits

Coordinates are abstract planar units (`x` east, `y` north), not longitude or
latitude. The composition is not suitable for navigation, distance measurement,
or geographic analysis. If real OSM-derived data is introduced later, the
required `© OpenStreetMap contributors` attribution must be added both on screen
and here.

Project code and the authored composition are released under the MIT License.
The WebM recorder depends on browser `MediaRecorder` and `canvas.captureStream`
support. The main JavaScript bundle remains relatively large because p5.js is
bundled for a single-canvas WebGL artwork.
