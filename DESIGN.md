# Design

## Source of truth

- Status: Active. The user-approved Visual Ralph refinement direction is the current product contract.
- Last refreshed: 2026-07-19.
- Product: A full-viewport, first-person, deterministic Beijing endless-drive artwork.
- Direction: Preserve and refine the 48-second, twelve-passage journey. Improve composition, clearance, depth, atmosphere, transition flow, responsive framing, and interface restraint without changing the product into a map, route planner, driving game, or geographic simulation.
- Superseded concepts: Overhead maps, ring-road plans, recursive route diagrams, route labels, dense line fields, and `Plan`/`Infinite` mode switching.

## Product and experience contract

- The visitor travels forward at street height through an authored Beijing-inspired environment.
- One normalized phase, `phase = (elapsed % 48000) / 48000`, owns camera, geometry state, light, fog, reflections, materials, and secondary motion.
- The camera stays first-person, predominantly forward, and at human/vehicle eye height. It may rise or bank subtly but never becomes aerial, third-person, orbital, or top-down.
- Pace is continuous and measured: no stop, teleport, reverse, whip pan, hard cut, or acceleration spike.
- Geometry is locally authored and artistic. It evokes Beijing without claiming geographic, navigation, traffic, or survey accuracy.
- The visual completion gate is a final Visual Ralph score of at least `90`, with the final accepted result recorded as `90` or higher and all functional, seam, responsive, accessibility, recording, performance, bundle, and deployment gates green.

## Forty-eight-second sequence

The circuit contains twelve four-second passages in this order:

1. `0–4s` — Central axis: Zhengyangmen, followed by a distinct **天安门** wall with five arches, double eaves, plaque, huabiao, and white balustrades.
2. `4–8s` — Palace moat: long red wall and Forbidden City corner tower across water.
3. `8–12s` — Shichahai: willows, humpback bridge, lantern string, and a bright white Beihai dagoba across water.
4. `12–16s` — Deshengmen / Second Ring: arrow tower and 二环 gantry.
5. `16–20s` — Olympic: Bird's Nest lattice shell and Water Cube skyline.
6. `20–24s` — Bell and Drum Tower plaza: Drum Tower near-field and Bell Tower offset behind.
7. `24–28s` — Nanluo / Wudaoying: denser alley, warm windows, and 五道营 / 南锣鼓巷 signs.
8. `28–32s` — Yonghegong: yellow multi-eave temple mass with 雍和宫 plaque.
9. `32–36s` — CBD and finance skyline: east CBD hero cluster and west finance plates.
10. `36–40s` — Temple of Heaven: triple-eave circular hall silhouette and cypress band.
11. `40–44s` — Qianmen / Dashilar and hutong: pailou, shop signs, lanterns, courtyard gates, and locust canopy.
12. `44–48s` — Overpass return: concrete compression hides the seam and reopens the central-axis horizon.

Adjacent passages overlap through shared silhouettes, fog occlusion, walls, trees, water, or underpass darkness. At every four-second boundary, passage identity must come from geometry and composition rather than a sign alone.

## Visual language

- Personality: Cinematic, calm, architectural, distinctly Beijing, restrained, and slightly dreamlike.
- Palette, exactly synchronized with `src/rendering/theme.ts`:
  - Night sky: `#0E1B2D`
  - Blue-hour horizon: `#315F7B`
  - Distance fog: `#3B5B6D`
  - Asphalt: `#28333D`
  - Pavement: `#73777A`
  - Stone: `#C8C4B8`
  - Beijing wall red: `#8F2B22`
  - Palace vermilion: `#B53A2B`
  - Roof tile: `#344148`
  - Roof edge: `#C9A056`
  - Lane marking: `#E5DDCC`
  - Warm lamp: `#FFD38A`
  - Water: `#2F667A`
  - Foliage: `#365A43`
  - Text/accent: `#F4E7D2`
- Cool navy, blue-grey, charcoal, and fog dominate. Vermilion and amber are localized anchors, not global neon accents.
- Use filled planes, extruded silhouettes, and large tonal masses. Seeded boot-once atlases may add brick, tile, bark, glass, stone, asphalt, lattice, and blue-panel rhythm, but never become photo skins or sticker identity.
- Prefer a foreground occluder, midground street/structure, and distant skyline. Avoid more than three dominant architectural layers in one frame.
- Preserve deliberate quiet fields of sky, road, fog, and water while keeping foreground, midground, and distance readable.
- Use system sans for product title/actions and system monospace only for optional recording/debug status. No downloaded font.
- Motion is limited to forward parallax, subtle phase-derived camera movement, and restrained lamp/water modulation. No random shake, strobe, recursive zoom, or temporal feedback.

## Composition and responsive contract

- The road is a continuous lower-central visual floor, and the forward opening remains legible in every passage.
- The vanishing point stays within the central 30% of viewport width and 32–52% of viewport height, except during the intentional overpass compression.
- No gate, sign, wall, tree, or column may intersect the driver-eye path or dominate more than roughly one-third of the frame for longer than a brief transition.
- Water must read across consecutive samples as a horizontal blue-toned plane distinct from road and sky, supported by parapet, reflection, shoreline, or vegetation.
- Supported DPR-1 verification viewports: `1440×900`, `1280×720`, `390×844`, `360×800`, and `320×568`.
- Desktop horizon target: 40–48% of viewport height. Portrait horizon target: 34–43%, with sufficient road depth below it.
- Portrait framing may use a wider bounded field of view, more central lane offset, and farther look-ahead. It must not merely crop the desktop image until the road or landmark disappears.
- Brand/title sits top-left and the action toolbar top-right on wide screens. Narrow layouts keep the same hierarchy within safe areas with zero collision among title, toolbar, status, and vanishing point.
- `ENDLESS SECOND RING` is exact product-title text. At `390×844` and `320×568`, it uses no more than two calm lines and remains subordinate to the scene.
- The reduced-motion `390×844` poster is a centered central-axis composition with legible road, gate, and sky, no clipped landmark, and no unintended blank/black band larger than 8% of viewport height.

## Interface and content contract

- Public controls are exactly four: play/pause, record one loop, enter/exit fullscreen, and open/close personal intro.
- Recording and fullscreen are progressive enhancements. Unsupported actions remain disabled with an accessible explanation and never block playback.
- The personal intro is an overlay over the continuing drive, not a separate route.
- `D` toggles private maintainer telemetry. It is not a public toolbar action and must not collide with title, toolbar, or recording status.
- Forbidden UI and terms: `Plan`, `Map`, `Route`, `Overview`, mini-map, compass, progress map, route selection, and non-diegetic street-name labels. Physical signs inside the 3D streetscape are valid.
- Preferred visible text includes `BEIJING / 北京`, `ENDLESS SECOND RING`, `PLAY`, `PAUSE`, `FULLSCREEN`, `RECORD LOOP`, `PERSONAL INTRO` / `ABOUT`, and `ARTISTIC COMPOSITION · NOT FOR NAVIGATION`.

## Interaction and accessibility

- Target WCAG 2.2 AA where applicable to an experimental canvas artwork.
- Every public action is a semantic button, has an accessible name, provides visible `:focus-visible` treatment, and exposes a target of at least `44×44` CSS pixels.
- Space toggles playback only when focus is not inside an interactive/editable control. `R` starts or cancels recording, `F` toggles fullscreen, `D` toggles private telemetry, and `Escape` closes the intro. Global shortcuts must not double-fire native control activation.
- The canvas has a concise accessible name and linked description. Playback state is exposed by label and pressed state; recording announcements use a polite live region.
- `prefers-reduced-motion: reduce` starts on one authored static central-axis poster with no camera, parallax, water, fog, or light motion. Only an explicit Play opts the current session into motion.
- Opening the intro, pausing, hiding the tab, losing capabilities, cancelling a recording, or completing a recording must preserve a coherent playback state and restore focus where applicable.
- Recording starts at phase zero, captures exactly one 48-second circuit, stops without a duplicate terminal frame, allows a second press to cancel without download, and restores the prior playback and render-size state.

## Runtime boundaries

- `src/main.ts`: boot/error handling, capabilities, shortcuts, visibility/resizing, recording coordination, and explicit QA-hook boundary.
- `src/app/BeijingLoopApp.ts`: deterministic clock, phase seeking, render lifecycle, playback state, and reduced-motion poster.
- `src/rendering/BeijingDriveScene.ts`: authored world, twelve passages, lighting, fog, materials, water, and skyline.
- `src/rendering/surfaceTextures.ts`: deterministic boot-once material atlases.
- `src/rendering/FirstPersonCameraRig.ts`: phase- and aspect-derived driver-eye camera.
- `src/rendering/drivePath.ts`: closed authored spline, stable path frame, heading, and ribbon helpers.
- `src/rendering/theme.ts`: duration, road/camera dimensions, and renderer palette.
- `src/ui/controls.ts`, `src/ui/about.ts`, `src/ui/recorder.ts`: four controls, intro/focus lifecycle, and deterministic capture.

The implementation uses Vite, TypeScript, Three.js, and plain CSS. It adds no map SDK, tile service, runtime data service, UI framework, or downloaded font.

The authored world currently contains roughly `2052` scene objects whose transforms become static after construction. Construction resolves their world matrices once and disables automatic scene world-matrix updates; any future dynamic scene transform must explicitly update its world matrix or deliberately restore automatic updates. The camera remains outside this static scene hierarchy and updates independently.

## Determinism, lifecycle, and compatibility

- Seed all authored variation and perform no unseeded randomness after boot.
- Keep real elapsed time, normalized scene phase, and capture timestamps separate. Derive visible animation from normalized phase, not accumulated frame deltas, screenshot timing, physics history, or temporal framebuffer feedback.
- Direct seek and natural playback at the same phase must produce the same visible state.
- Visible frame gaps up to and including `10s` preserve wall-clock playback; gaps above `10s` are treated as suspension and skipped, while hidden-tab restoration resets the elapsed-time baseline before requesting the next frame.
- WebGL-capable evergreen browsers are the compatibility target. `MediaRecorder` plus `canvas.captureStream` and the Fullscreen API are optional capabilities.
- Development exposes `window.__BEIJING_LOOP_TEST__`. Production exposes it only for explicit `?qa=1`; the normal production URL must not expose the hook.
- Relative assets and the Vite base remain compatible with GitHub Pages at `https://brickerp.github.io/`.

## Seam and visual acceptance

- Rendering phase `1` wraps to the exact phase-`0` state for camera, FOV, transforms, visibility, materials, light, fog, water, and playback-independent UI.
- At `900×640`, DPR 1, native deterministic `0ms` and `48000ms` captures have zero differing RGBA channels, zero maximum delta, and zero mean absolute difference.
- The `385`-frame check samples every `0.125s`, rejects flat frames, and requires `p95 / median < 4.5`, `max / median < 8`, `seam / median < 3.5`, and first-versus-seam adjacent-frame ratio below `4`.
- Canonical contact sheets capture DPR-1 frames at `0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44` seconds plus `47.875` and `0` seam-adjacent frames.
- Contact sheets prove composition only. The fine-grained continuity check and one observed full-speed circuit are required to close transition risk.
- Every passage must be recognizable without explanatory titles, retain road/horizon direction, use filled tonal masses, and show atmospheric separation without featureless black clipping.
- Local production and deployed `?qa=1` captures at equal viewport, DPR, motion preference, and phase must preserve the same composition and passage identity; GPU-level pixel variance is recorded separately.

## Performance and bundle budgets

- Local performance evidence runs against a production preview with Playwright Chromium. The harness owns preview startup/readiness/shutdown unless an explicit `URL` points to an externally managed server.
- Each DPR-1 case warms for `4000ms`, then samples one full `48000ms` circuit using real `requestAnimationFrame` callback timestamps from the rendered page. WebM block rate and the in-app smoothed FPS label are not performance evidence.
- The report includes browser/version, host, viewport, DPR, warm-up, sample duration, frame count, achieved FPS, median/p95/p99 interval, counts and ratios above `33.3ms` and `50ms`, maximum consecutive `>50ms` cluster, twelve four-second passage summaries, and ±`250ms` boundary-window summaries.
- Desktop `1440×900`: achieved FPS `>=55`, median `<=20ms`, p95 `<=33.4ms`.
- Mobile `390×844`: achieved FPS `>=30`, median `<=33.4ms`, p95 `<=50ms`.
- Both cases: intervals above `50ms` are `<=2%`, and the maximum consecutive `>50ms` cluster is `<=5`.
- The real `LoopRecorder` gate measures successful render callbacks from its own `requestAnimationFrame` loop and requires an average of at least `28fps`. The test injects a `1.2s` main-thread stall; the maximum callback gap must be at least `1.2s` to prove the injection occurred and no more than `2.5s` to reject an extreme freeze. A fresh browser before this real-time recording is test-harness resource isolation only, not product behavior or a relaxed gate.
- The downloaded WebM must be non-empty and byte-complete, contain exactly one monotonic video-block timeline, include the single requested terminal frame, begin at `0–0.1s`, end at `47.9–48.3s`, and span `47.8–48.3s`. Encoded block density of `18–65fps` is an artifact-health bound; it is not renderer or recorder render-throughput evidence.
- Bundle evidence measures the largest emitted production JS and CSS assets with Node `zlib` gzip level 9.
- Primary JS: raw `<=650000` bytes, gzip `<=170000` bytes, and gzip growth `<=5%` over the Node zlib level-9 `153080`-byte `origin/main` baseline (`<=160734` bytes).
- Primary CSS: gzip `<=4096` bytes.
- Performance and bundle thresholds are release gates. A failing machine result is recorded and investigated; thresholds are not silently relaxed.

## Release acceptance

- Before deployment: geometry verification and TypeScript checks pass, production build succeeds, bundle budget passes, browser/responsive/capability/accessibility/recording checks pass against the built preview, and seam verification passes.
- The local full-circuit performance gate runs outside CI because it requires two real-time 48-second samples; its JSON evidence must be current for a release candidate.
- GitHub Pages uploads only the verified `dist` artifact. The deployed normal route omits the QA hook, the deployed `?qa=1` route exposes it, and live/local composition parity is rechecked after deployment.

## Open questions

- None blocking.
