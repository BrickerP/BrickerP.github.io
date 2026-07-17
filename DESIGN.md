# Design

## Source of truth
- Status: Active
- Last refreshed: 2026-07-17
- Primary product surface: One full-viewport, first-person Beijing endless-drive artwork.
- Evidence reviewed: `README.md`, `scripts/geometry-check.mjs`, `scripts/verify.mjs`, `scripts/seam-check.mjs`, `.github/workflows/deploy-pages.yml`, `src/main.ts`, `src/app/BeijingLoopApp.ts`, `src/rendering/BeijingDriveScene.ts`, `src/rendering/surfaceTextures.ts`, `src/rendering/FirstPersonCameraRig.ts`, `src/rendering/drivePath.ts`, `src/rendering/theme.ts`, `src/ui/controls.ts`, `src/ui/recorder.ts`, `src/styles/main.css`, and current responsive Visual Ralph captures.
- Superseded direction: Every overhead map, ring-road plan, recursive route diagram, `Infinite`/`Plan` mode switch, and dense line-field composition. None is a valid implementation or visual baseline.
- Product definition: The visitor is at street height, moving forward through an authored Beijing-inspired environment. The experience is cinematic generative art, not a map, route planner, driving game, or geographic simulation.

## Brand
- Personality: Cinematic, calm, architectural, distinctly Beijing, restrained, and slightly dreamlike.
- Trust signals: Deterministic local geometry, explicit artistic framing, visible playback controls, no commercial map data, no runtime services, and an exact reproducible loop.
- Avoid: Bird's-eye views, mini-maps, route lines, map labels, radial meshes, crossed-line noise, wireframe cities, neon cyberpunk, generic sci-fi tunnels, photorealistic imitation, dashboard chrome, steering wheels, speedometers, gamified HUDs, or faux geographic precision.

## Product goals
- Goals:
  - Deliver an unmistakably first-person Beijing journey from the opening frame.
  - Tell one continuous 48-second visual journey through twelve environments: central axis (Tiananmen), Qianmen/Dashilar, deep hutong, Nanluo/Wudaoying, Bell & Drum Tower plaza, Yonghegong, Shichahai waterfront, palace moat, Temple of Heaven, Olympic (Bird's Nest/Water Cube), Deshengmen ring with CBD/finance skyline, and overpass return.
  - Make the scene feel rich through composition, silhouette, light, fog, mid-tier surface rhythm under mass forms, and a few solid landmark anchors rather than photoreal skins or sticker props.
  - Return to the opening pose, lighting, geometry state, and atmosphere without a visible cut or speed change.
  - Remain legible, controllable, and calm on desktop and portrait mobile.
- Non-goals: Overhead maps, road-network visualization, Plan mode, navigation, POI lookup, survey accuracy, real-time traffic, commercial tiles, open-world exploration, collision physics, or a conventional driving interface.
- Success signals:
  - A five-second glance reads as “moving through Beijing,” never “looking at a map.”
  - The road corridor and horizon remain immediately legible at every phase.
  - Each of the twelve passages has a distinct silhouette and material cue while sharing one palette, mid-tier surface rhythm, and camera language.
  - Start and endpoint frames meet the seam acceptance thresholds below.
  - Essential controls remain usable with keyboard, touch, screen reader, and reduced-motion preferences.

## Personas and jobs
- Primary personas: Portfolio visitors, motion-design viewers, creative-coding peers, and maintainers tuning the authored world.
- User jobs: Enter a short atmospheric Beijing journey, watch a seamless cycle, pause on a composed frame, enter fullscreen, and record one exact loop when browser support is available (a second press cancels without downloading).
- Key contexts of use: Desktop portfolio, portrait phone, fullscreen ambient display, and a GitHub Pages landing experience.

## Information architecture
- Primary navigation: None. The artwork has a single public view and no route or mode navigation.
- Core route/screen: One full-viewport first-person experience.
- Content hierarchy:
  1. Street-level vanishing point, road, and Beijing architectural silhouettes.
  2. Atmosphere, lighting, water reflections, and restrained motion cues.
  3. Compact brand/title and playback actions.
  4. Short artistic/non-navigation description for assistive technology.
- Public controls: Exactly four—play/pause, record one loop, enter/exit fullscreen, and open/close the personal intro. Recording and fullscreen are progressive enhancements; unsupported actions remain disabled with an accessible explanation. The personal intro is a progressive overlay over the continuing drive, not a separate route.
- Developer-only state: `D` toggles private telemetry for maintainers. It is not a public toolbar action and must never appear as navigation or collide with the title, toolbar, or recording status.
- Forbidden UI: `Plan`, `Infinite`, overview, route selection, mini-map, compass, progress map, non-diegetic street-name labels, and any diagram of the loop. Physical signs authored inside the 3D streetscape remain valid Beijing identity cues.

## Experience sequence
- Duration: Exactly 48 seconds per cycle.
- Clock: One normalized phase, `phase = (elapsed % 48000) / 48000`, owns camera, scenery, light, fog, reflections, materials, and all secondary motion.
- Camera: Always first-person at human/vehicle eye height, aimed predominantly forward. It may rise or bank subtly with the road but never becomes aerial, third-person, orbital, or top-down.
- Pace: Continuous and measured. No stop, teleport, whip pan, hard cut, reverse, or acceleration spike.
- Surface craft: Unified mid-tier for all devices — seeded boot-once canvas atlases add brick/tile/bark/glass rhythm under flat-shaded masses. No desktop-only high tier; no photo-skin.
- **0–4s — Central axis:** Zhengyangmen then a larger **天安门** plaque gate with huabiao columns and white balustrades.
- **4–8s — Qianmen / Dashilar:** Pailou, hanging shop signs, lanterns, warm mullioned shopfronts.
- **8–12s — Deep hutong:** Courtyard gates, door piers, bark-mapped locust canopy, poles and wires.
- **12–16s — Nanluo / Wudaoying:** Denser commercial alley with 五道营 / 南锣鼓巷 signs and warm windows.
- **16–20s — Bell & Drum Tower plaza:** Drum Tower near-field, Bell Tower offset behind.
- **20–24s — Yonghegong:** Yellow multi-eave temple mass with 雍和宫 plaque.
- **24–28s — Shichahai:** Willows, humpback bridge, lantern string, white dagoba across water.
- **28–32s — Palace moat:** Long red wall and Forbidden City corner tower across the moat.
- **32–36s — Temple of Heaven:** Triple-eave circular Hall of Prayer silhouette and cypress band.
- **36–40s — Olympic:** Bird's Nest lattice shell and Water Cube blue panel mass.
- **40–44s — Deshengmen / Second Ring + CBD:** Arrow tower and 二环 sign near-field; CBD tower cluster as skyline hero; Xidan/Financial Street as secondary glass plates.
- **44–48s — Overpass return:** Concrete compression that hides the seam and reopens the central-axis horizon.
- Transitions: Adjacent environments overlap through shared silhouettes, fog occlusion, walls, trees, water continuity, or underpass darkness.

## Design principles
- **Eye level or it fails:** Every compositional decision reinforces forward street-level travel.
- **Beijing through sequence, not symbols pasted on top:** Axis, grey brick, tiled roofs, vermilion masses, water edges, and ring-road concrete create identity through spatial experience.
- **Mass before line:** Use filled planes, extruded silhouettes, and large tonal blocks. Mid-tier atlases add surface rhythm under those masses; they must not become photo-skins or sticker identity crutches. Lines are limited to necessary edges, lane marks, and fine accents.
- **One journey, one clock:** All motion derives from the same deterministic 48-second phase.
- **Occlusion is the edit:** Geometry and atmosphere conceal transitions; there are no cuts between four separate scenes.
- **Negative space preserves depth:** Sky, road, fog, and water are deliberate quiet fields, not empty areas to fill with detail.
- **Interface yields to the world:** Controls remain discoverable and accessible but visually secondary.
- Tradeoffs: Prefer authored recognition and seamless rhythm over geographic literalness; prefer a small number of reusable modular forms over unique high-detail assets; prefer stable frame pacing over particle count or shader spectacle.

## Visual language
- Color:
  - Night sky: `#101B2D`
  - Blue-hour horizon: `#355B73`
  - Distance fog: `#607786`
  - Road: `#24292C`
  - Pavement: `#756F64`
  - Stone and lane markings: `#D1C7B5` / `#E5DDCC`
  - Beijing wall red: `#8F2B22`
  - Palace vermilion: `#B53A2B`
  - Dark roof tile: `#303936`
  - Roof edge: `#C9A056`
  - Warm lamp: `#FFD38A`
  - Water: `#315F70`
  - Foliage: `#35513D`
  - Renderer text/accent: `#F4E7D2`
- Palette rule: The base is Beijing blue hour—cool navy, blue-grey, charcoal, and restrained fog. Vermilion and amber are localized anchors, never global neon accents.
- Typography: System sans for the title and essential actions; system monospace only for optional recording/debug status. No downloaded font.
- Spacing/layout rhythm: 4–8px internal increments, 16–28px viewport offsets, 44–48px controls, and safe-area-aware edge spacing.
- Shape/radius/elevation: Solid architectural planes, low-poly curves only where needed, thin cool UI borders, 10–14px panel radii, and no ornamental glow or heavy drop shadow.
- Motion: Forward parallax, a small phase-derived camera bob, and slow lamp/water luminance modulation. No random shake, recursive zoom, strobe, or full-frame feedback.
- Imagery/iconography: Code-native solid geometry and simple line icons. No external photography, map tiles, or generated image backplates in the production scene.

## Geometry and composition contract
- World construction: A closed, authored forward path may be used internally, but the path is never shown to the visitor.
- Geometry style: Sparse solid geometry—filled ground planes, walls, roofs, columns, parapets, trees, and bridge surfaces. Do not substitute wireframes or thousands of polylines.
- Silhouette budget: At any frame, no more than three dominant architectural layers—foreground occluder, midground street wall/structure, and distant skyline.
- Vanishing point: Remains within the central 30% of viewport width and between 32–52% of viewport height, except for brief overpass occlusion.
- Road corridor: A continuous traversable visual floor occupies the lower central frame; it cannot disappear into abstract line noise.
- Repetition: Reuse modular bays, walls, lamps, trees, columns, and roof profiles with deterministic variation. Repetition must support rhythm without exposing an obvious short tile.
- Edge treatment: Use lighting, fog, material contrast, and selective bevel/highlight edges. Do not outline every polygon.
- Density: Each scene is recognizable from fewer, larger forms. Additional detail is accepted only when it improves depth or Beijing identity at the target viewport.
- Geographic framing: All geometry is artistic and locally authored. It evokes Beijing but makes no geographic or navigation claim.

## Components
- Actual runtime boundaries:
  - `src/main.ts`: owns boot/error handling, browser-capability detection, global shortcuts, visibility/resizing, recording coordination, and the explicit QA hook boundary.
  - `src/app/BeijingLoopApp.ts`: owns the deterministic 48-second clock, phase seeking, render lifecycle, playback state, and reduced-motion poster selection.
  - `src/rendering/BeijingDriveScene.ts`: builds and updates the solid Beijing-inspired road and the twelve authored passages — Tiananmen axis, Dashilar, hutong, Nanluo/Wudaoying, Bell & Drum, Yonghegong, Shichahai, palace moat, Temple of Heaven, Olympic, Deshengmen/CBD ring, overpass — plus lamps, water, fog, and skyline.
  - `src/rendering/surfaceTextures.ts`: owns seeded boot-once mid-tier surface atlases (brick, tile, bark, glass, stone, asphalt, lattice, blue panel) reused across the scene.
  - `src/rendering/FirstPersonCameraRig.ts`: derives the driver-eye camera pose and aspect-aware lens from phase and viewport shape.
  - `src/rendering/drivePath.ts`: defines the closed authored spline, stable path frame, heading, and ribbon geometry helpers.
  - `src/rendering/theme.ts`: owns the 48-second duration, driver-eye height, road dimensions, and renderer palette.
  - `src/ui/controls.ts`: owns the four public controls, private debug panel, capability-disabled states, and live announcements.
  - `src/ui/about.ts`: owns the personal-intro dialog overlay, expanders, focus restore, and Esc/backdrop close.
  - `src/content/profile.ts`: owns curated resume content for the personal intro.
  - `src/ui/recorder.ts`: owns the `MediaRecorder`/canvas stream lifecycle and one-cycle deterministic capture.
- Variants and states: Playing, paused, reduced-motion poster, recording inactive/active, about open/closed, fullscreen, loading, WebGL unavailable, and private developer debug.
- Token/component ownership: One renderer palette and motion-duration source; DOM CSS tokens reuse the same blue-hour, vermilion, amber, and neutral vocabulary rather than forming a competing design system.

## Accessibility
- Target standard: WCAG 2.2 AA where applicable to an experimental canvas artwork.
- Keyboard/focus behavior:
  - Every public action is a semantic button with visible `:focus-visible` treatment.
  - Space toggles play/pause only when focus is not on an interactive or editable control.
  - `R` records one complete 48-second loop, or cancels an active recording without downloading; `F` toggles fullscreen; `D` toggles private developer telemetry.
  - Global shortcuts ignore focused interactive/editable targets so native activation never double-fires.
- Contrast/readability: Text and control icons meet AA contrast over their backing surface. State is communicated through label, icon, and/or shape, never color alone.
- Screen-reader semantics: The canvas has an accessible name and a concise linked description of the first-person Beijing sequence. Playback state is exposed through the play button's label and pressed state; recording status uses polite live announcements. Decorative canvas internals are not exposed as hundreds of meaningless nodes.
- Reduced motion and sensory considerations:
  - `prefers-reduced-motion: reduce` starts on a fixed authored poster frame from the central-axis passage.
  - The poster has no camera travel, parallax, water animation, fog drift, pulsing light, or full-frame transition.
  - An explicit Play action may opt into motion for the current session; the experience never autoplays again after the preference is detected.
  - No flashing, rapid luminance inversion, camera shake, or unavoidable motion.
- Pointer/touch: Every action target is at least 44×44 CSS pixels and no essential action depends on hover.

## Responsive behavior
- Supported verification viewports: 1440×900, 1280×720, 390×844, 360×800, and 320×568 at device scale factor 1.
- Canvas: Always fills the visual viewport, accounts for dynamic mobile browser chrome, and respects safe-area insets for UI placement.
- Camera framing:
  - Desktop horizon target: 40–48% of viewport height.
  - Portrait horizon target: 34–43% of viewport height, preserving more road depth below it.
  - Vertical field of view adapts within a bounded range; the implementation must not stretch or simply crop a desktop render until the road disappears.
- Scene adaptation: Portrait layouts use a wider bounded field of view, a more central lane offset, and a farther path look-ahead so the road corridor and Beijing anchors remain legible without replacing or shrinking the authored world geometry.
- UI layout: Brand/title sits top-left and actions top-right on wide screens. On narrow screens, the same three actions form a compact top-right toolbar inside the top/right safe area while the title remains clear of both controls and horizon.
- Collision rule: At every supported viewport, title, status, controls, debug state, and safe areas have zero overlap; no public UI may cover the central vanishing point.
- Touch/hover differences: Hover decoration is optional; pressed, selected, recording, and disabled states remain visible on touch devices.

## Interaction states
- Loading: Show a centered, concise loading status over the blue-hour page palette; never expose a blank white canvas.
- Empty: Not valid. A blank, overhead, or near-abstract line-only frame fails verification.
- Error: Replace the loading status with a centered, readable WebGL/scene-start alert instead of leaving a blank canvas.
- Success: The first-person world appears, the road and horizon are legible, playback state is visible, and supported browsers can record one 48-second cycle.
- Paused: Freeze on the current deterministic frame without idle camera drift.
- Recording: Disable ordinary playback controls, announce start/completion/cancellation/failure, keep the record control active as a cancel action that discards the capture, render from deterministic phase zero, and restore the prior play/pause state after capture.
- Disabled: Keep unsupported fullscreen or recording actions disabled with an accessible description of the missing capability; playback remains available.
- Offline/slow network: Production uses bundled code and locally authored assets; it does not wait for map tiles, fonts, or runtime APIs.

## Content voice
- Tone: Calm, cinematic, factual, and compact.
- Preferred title: `BEIJING / 北京` with the product label `ENDLESS SECOND RING`.
- Terminology: `PLAY`, `PAUSE`, `FULLSCREEN`, `RECORD LOOP`, `PERSONAL INTRO` / `ABOUT`, and `ARTISTIC COMPOSITION · NOT FOR NAVIGATION`.
- Forbidden terminology: `PLAN`, `MAP`, `ROUTE`, `OVERVIEW`, `SECOND RING VIEW`, `INFINITE MAP`, or language implying real driving directions.
- Microcopy rules: Icon-only actions require accessible names and titles; errors use direct recovery language; do not pile explanatory paragraphs onto the closed drive HUD. Long-form personal copy belongs only inside the About overlay, where the default view stays curated and additional bullets expand on demand.

## Implementation constraints
- Framework/styling system: Vite, TypeScript, Three.js, and plain CSS. No UI framework, map SDK, tile service, downloaded font, or runtime data service is part of the product.
- Rendering direction: First-person Three.js/WebGL solid geometry with depth, fog, and ACES filmic tone mapping.
- Determinism:
  - Seed all authored variation.
  - Perform no unseeded randomness after boot.
  - Derive every visible animated value from normalized phase, not accumulated frame deltas.
  - Do not use temporal framebuffer feedback, physics state, or particle histories that cannot be reconstructed exactly for an arbitrary phase.
- Performance:
  - Target a stable 60 fps on a representative desktop and 30+ fps on a mid-range mobile device.
  - Cap device pixel ratio, batch repeated geometry, cull hidden segments, reuse materials, and avoid per-frame allocation or geometry rebuilding.
  - Pause rendering in hidden tabs and on a static reduced-motion poster.
- Compatibility: WebGL-capable evergreen browsers. Recording requires `MediaRecorder` plus `canvas.captureStream`; fullscreen requires the Fullscreen API. Both are progressive enhancements, and their unavailable states must not block playback. Relative asset paths and Vite base remain compatible with GitHub Pages at `https://brickerp.github.io/`.
- Production QA boundary: Development builds install the deterministic test hook automatically. Production installs it only for the explicit `?qa=1` query used by automated verification; the normal production URL must not expose it.
- Test/screenshot expectations: Geometry, typecheck, build, deterministic screenshot capture, responsive browser assertions, capability/keyboard/accessibility smoke tests, reduced-motion capture, and seam verification must pass before deployment. The GitHub Pages workflow runs browser and seam checks against the built preview before upload.

## Loop and seam acceptance criteria
- Canonical duration: `48000ms`; there is no secondary camera, environment, or shader clock.
- Endpoint identity: Rendering phase `1` resolves through modulo to the exact state of phase `0` for camera transform, field of view, world transforms, visibility, materials, light, fog, water, and UI playback-independent visuals.
- Path continuity: Camera position and forward tangent are continuous across the boundary. Speed, heading, pitch, roll, and their first derivatives have no perceptible step from `47.999s` to `0s`.
- Transition continuity: The closed authored world requires no tile recycling. The overpass-return passage frames the re-emerging central-axis horizon, and no object pops into view at the seam.
- Reproducibility: Seeking directly to any phase yields the same image as naturally playing to that phase from zero.
- Automated endpoint check: At 900×640 and DPR 1, native-size deterministic captures at `0ms` and `48000ms` must have zero differing RGBA channels, zero maximum delta, and zero mean absolute difference.
- Motion continuity check: Sample 385 frames at 0.125-second intervals, reject flat frames, and bound difference spikes with `p95 / median < 4.5`, `max / median < 8`, `seam / median < 3.5`, and a first-versus-seam adjacent-frame ratio below 4. Responsive composition is verified separately at all supported viewports.
- Loop recording: Export begins at phase zero, contains exactly one 48-second cycle, and ends without appending a duplicate terminal frame.

## Visual acceptance criteria
- Opening frame is first-person and street-level; no reviewer can reasonably classify it as an overhead map.
- All twelve passages—including Tiananmen, Nanluo/Wudaoying, Yonghegong, Temple of Heaven, Olympic, and CBD/finance skyline—are distinguishable in sampled frames without titles explaining them.
- The scene uses filled geometry and tonal mass; dense crossing lines, map rings, recursive route outlines, and wireframe clutter are absent.
- Beijing blue hour dominates; vermilion and amber remain selective accents.
- Road, horizon, and forward direction stay legible in every sampled frame, including 320×568 portrait.
- Public UI contains no Plan/map/route control and does not cover the vanishing point.
- Reduced-motion capture is a deliberate central-axis poster, not a broken first animation frame.
- Desktop and mobile captures feel composed for their aspect ratios rather than merely scaled versions of one another.

## Open questions
- None blocking. This contract intentionally resolves viewpoint, sequence, duration, palette, geometry style, navigation, accessibility, responsive behavior, and seam quality for implementation.
