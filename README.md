# Beijing Infinite Loop / 北京无限环线

A quiet, generative-art tracer of Beijing's ring roads and central axis. A single
vehicle drives forever around an artistic **2nd-ring** loop while a smooth 3D
camera follows it, and the whole city recursively zooms into itself in a
seamless **infinite-loop** fractal — built to sit on a personal GitHub Pages
site and to export a clean looping clip for a GitHub profile README.

> **Artistic visualization, not for navigation.** The geometry is an authored
> abstraction of Beijing (rings, central axis, water, mountains), *not* survey
> data and *not* derived from any commercial map. See [Data & licensing](#data--licensing).

Inspired by the "Osaka Loop Line Tracer" p5.js sketch, re-imagined for Beijing
with an explicit **vector** path (no PNG pixel-colour navigation), arc-length
sampling, frame-rate-independent camera damping, and a mathematically seamless
recursive zoom.

- **Stack:** Vite · TypeScript · p5.js (WebGL) · plain CSS. No React.
- **Views:** Follow · Overview · Fractal.
- **Runs fully offline** once built — no runtime API calls.

---

## Quick start

```bash
npm install
npm run gen:map   # regenerate the artistic GeoJSON into public/data (also runs in build)
npm run dev       # http://localhost:5173/
```

Build & preview the production bundle:

```bash
npm run build     # gen:map -> tsc --noEmit -> vite build  (outputs dist/)
npm run preview
```

---

## Controls

| Action           | Mouse / Touch                    | Key     |
| ---------------- | -------------------------------- | ------- |
| Play / pause     | ▶︎/⏸ button (top-right)          | `Space` |
| Follow view      | segmented control                | `1`     |
| Overview view    | segmented control                | `2`     |
| Fractal view     | segmented control                | `3`     |
| Fullscreen       | ⛶ button                          | `F`     |
| Debug overlay    | —                                | `D`     |
| Record 12s loop  | ● button                          | `R`     |

Debug (off by default) shows FPS, loop progress, vehicle angle, fractal phase
and the current mode, plus the loop control points and car centre in 3D.

## The three views

- **Follow** — chase camera behind and above the car, à la the Osaka original,
  with room ahead to see the road coming.
- **Overview** — top-down, north-up framing of the whole artistic city; the car
  keeps looping the 2nd ring.
- **Fractal** *(default)* — the city recursively zooms into itself around a
  fixed anchor near the central-axis midpoint. This is the centrepiece.

### Why the fractal loop is seamless

Let `phase = (elapsed mod duration) / duration ∈ [0, 1)` (duration = 12s). A map
copy at integer depth `k` is drawn at world scale `S^(phase + k)` where `S` is
the fixed ratio between adjacent recursion layers. As `phase` runs 0→1, every
copy's log-scale slides up by exactly 1, so at `phase = 1` the *set* of copies
on screen is identical to `phase = 0` — only their integer labels shift by one.

Each copy's opacity is a **cubic B-spline** of its log-scale. The cubic B-spline
is a *partition of unity* (`Σ_k B(L+k) = 1` for all `L`), so the total on-screen
opacity is constant and the rendered frame is a continuous, periodic function of
`phase`. The result: no flash, black frame, or jump at the wrap. The vehicle is
drawn on **every** visible copy at that copy's scale from one continuous clock,
so it is self-similar too and never snaps back to the route start.

Line widths are specified in **screen pixels** and divided by pixels-per-unit,
so roads never balloon into thick blocks as a layer scales up.

## Architecture

```
src/
  main.ts                     p5 bootstrap, keyboard, visibility, fullscreen, recorder wiring
  app/BeijingLoopApp.ts       orchestrator: sim clock, per-frame update + render pipeline
  rendering/
    MapRenderer.ts            boundary, rings, axis, radials, streets, water, mountains (LOD)
    VehicleRenderer.ts        chamfered box + heading wedge + headlights + sensor whiskers
    FractalRenderer.ts        nested-layer stack + seamless B-spline opacity window
    CameraController.ts       3 view modes, exp-damped, aspect-aware perspective
    theme.ts                  palette + fractal constants
  path/
    pathSampler.ts            Catmull-Rom + arc-length sampling: getPointAt/Tangent/Length/wrap
    loopPath.ts               build loop from GeoJSON control points (+ fallback)
    distanceToPath.ts         spatial-grid nearest-distance for the sensors
    geometry.ts               vec math, angle interpolation, frame-rate-independent damping
  data/
    mapLoader.ts              fetch + parse all GeoJSON ONCE (base-URL aware)
    mapTypes.ts               shared types
  ui/
    controls.ts               top-right controls, status, debug panel (icons inline, a11y)
    recorder.ts               captureStream + MediaRecorder -> beijing-infinite-loop.webm
  styles/main.css             restrained overlay UI, safe-area + reduced-motion aware
public/data/*.geojson         generated artistic geometry (see below)
scripts/generate-map.mjs      deterministic generator for the GeoJSON
scripts/verify.mjs            Playwright screenshots + canvas pixel checks (dev-only)
```

### Path & sensors (no pixel-colour navigation)

The original Osaka sketch steers by sampling orange pixels in a PNG. This
project instead uses an explicit **closed vector path**
(`public/data/beijing-loop.geojson`, a `LineString`): control points →
Catmull-Rom spline → dense polyline with a cumulative arc-length table.
`PathSampler` exposes `getPointAt`, `getTangentAt`, `getAngleAt`, `getLength`
and `wrapProgress`; `progress ∈ [0,1)` wraps seamlessly and motion is constant
speed regardless of control-point spacing. Speed is `deltaTime`-based.

The Osaka **left/right sensor** visual language is kept: two forward whiskers
whose tips glow yellow near the line. "Nearness" comes from
`distanceToPath(point)`, backed by a uniform **spatial grid** over the
pre-sampled loop segments — the sensors never brute-force the raw map geometry.

## Performance & resilience

- `pixelDensity` capped at 2 (1 under reduced-motion).
- GeoJSON is parsed once; geometry and the arc-length table are cached at init.
- The p5 draw loop is **paused** when the tab is hidden, and `deltaTime` is
  clamped on resume so a long-backgrounded tab can't jump the simulation.
- `prefers-reduced-motion`: the fractal zoom freezes to a static full
  composition and the car crawls (low-frequency position updates only).
- Reduced allocations per frame; LOD hides streets/mountains on tiny layers.

## Responsive

Tested at 1440×900, 1280×720, 390×844, 360×800 (portrait) via
`scripts/verify.mjs`. Overview fits the whole city; Follow never hides the car
behind UI; Fractal never shows a blank canvas; buttons keep a ≥44×44px touch
target and respect `env(safe-area-inset-*)`.

## Data & licensing

**All map geometry is authored procedurally** by
`scripts/generate-map.mjs` — a deterministic (seeded) generator that draws an
*abstract* Beijing: an irregular municipal silhouette leaning toward the NW
mountains, five concentric ring roads (the 2nd ring is the orange vehicle
loop), a near-vertical central axis, a few radial spokes, a faint inner street
grid, low-key rivers/lakes, and hatched mountain texture in the north-west.

Coordinates are abstract **"city units"** (`x` = east, `y` = north, origin near
the central-axis midpoint), **not** longitude/latitude and **not** a precise
survey. No OpenStreetMap data, and **no** Baidu / AutoNavi (Amap) / Tencent map
tiles, screenshots, or scraped content are used — so there is nothing to
attribute to a third party and nothing fetched at runtime. If you later swap in
real OSM-derived GeoJSON, add the required `© OpenStreetMap contributors`
attribution here and in the on-screen footer.

Project code and the authored composition are released under the **MIT License**.

## Deploy to GitHub Pages

A workflow at `.github/workflows/deploy.yml` builds and deploys `dist/` on every
push to `main`.

1. Push this repo to GitHub.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. Push to `main`; the site publishes at
   `https://USERNAME.github.io/REPOSITORY/`.

`vite.config.ts` uses a **relative base** (`./`) for local builds, and the
workflow overrides it with `VITE_BASE=/REPOSITORY/` so assets resolve correctly
under the project subpath. No code changes needed for your repo name.

### Embed in your profile README

Replace `USERNAME` / `REPOSITORY` with your values:

```markdown
[![Beijing Infinite Loop](./docs/preview.gif)](https://USERNAME.github.io/REPOSITORY/)
```

## Record & export a looping preview

Press **`R`** (or the ● button). Recording resets the simulation to `phase = 0`,
captures exactly one 12-second cycle via `canvas.captureStream()` +
`MediaRecorder`, and downloads **`beijing-infinite-loop.webm`**.

GitHub READMEs don't embed WebM inline reliably, so convert to a looping GIF
with ffmpeg:

```bash
ffmpeg -i beijing-infinite-loop.webm \
  -vf "fps=24,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer" \
  -loop 0 docs/preview.gif
```

For a smaller file, drop to `fps=18,scale=720:-1`. Put the result at
`docs/preview.gif` to match the embed snippet above. (An MP4 also works if you
host the site; GIF is the safest for a profile README.)

## Attribution & limits

- Osaka Loop Line Tracer — conceptual inspiration only; no code or assets reused.
- This is a **visualization**, not a map: distances, shapes and counts are
  stylised. Do not use it to navigate.
- The WebM recorder depends on browser `MediaRecorder`/`captureStream` support
  (Chromium/Firefox fine; some Safari versions limited).
- The JS bundle is ~1 MB (mostly p5.js); acceptable for a single-canvas art
  piece but noted by Vite's chunk-size warning.
