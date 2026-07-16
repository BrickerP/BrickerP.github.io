# Design

## Source of truth
- Status: Active
- Last refreshed: 2026-07-16
- Primary product surfaces: Full-viewport generative canvas; public `Infinite` and `Plan` views; playback, recording, fullscreen, and debug states.
- Evidence reviewed: `README.md`, `scripts/generate-map.mjs`, `scripts/geometry-check.mjs`, `scripts/verify.mjs`, `scripts/seam-check.mjs`, `src/app/BeijingLoopApp.ts`, `src/rendering/*`, `src/ui/controls.ts`, `src/styles/main.css`, and `.omx/artifacts/visual-ralph/beijing-rebuild/*`.
- Rejected direction: `.omx/artifacts/visual-ralph/beijing-dense-map/reference.png`; the dense road/radial/hatch field created crossed-line noise and is not a valid future baseline.

## Brand
- Personality: Quiet, architectural, nocturnal, measured, and distinctly authored.
- Trust signals: Deterministic local geometry; explicit artistic/non-navigation labeling; visible motion controls; no external map data or runtime services.
- Avoid: Street meshes, full-map recursive ghosts, neon bloom, bright municipal outlines, random hatching, dashboard chrome, faux geographic precision, or equally weighted feature classes.

## Product goals
- Goals: Make the orange second-ring loop immediately legible; express Beijing through one ring, one broken central axis, courtyards, gates, water, and northern ridges; produce a truly periodic 12-second recording; preserve calm negative space on desktop and mobile.
- Non-goals: Navigation, survey accuracy, POI lookup, real-time data, commercial tiles, route planning, or a conventional map dashboard.
- Success signals: The loop remains the highest-contrast mark at every sampled phase; context is rendered once; the 12-second endpoint is visually identical to the start; geometry budgets and responsive browser assertions pass.

## Personas and jobs
- Primary personas: Portfolio visitors, generative-art viewers, creative-coding peers, and maintainers tuning the authored system.
- User jobs: Watch a calm seamless artwork; switch between the recursive study and full plan; pause motion; record one exact cycle; understand that the work is artistic.
- Key contexts of use: Desktop portfolio, portrait phone, fullscreen ambient display, and GitHub profile-preview export.

## Information architecture
- Primary navigation: Top-right playback/export actions and a bottom-center two-option view dock.
- Core routes/screens: One route; `Infinite` (recursive loop motif) and `Plan` (static full composition).
- Content hierarchy: Orange loop and marker; sparse city context; title/mode; controls; short non-navigation footer.

## Design principles
- **One Ring, One Axis, One Breath:** Every element supports the loop rather than competing with it.
- **Mass before mesh:** Courtyard plates imply streets through gaps; never draw a dense street grid.
- **Context once, motif recursively:** The city plate is static. Only the orange route and its marker recur.
- **Negative space is content:** Empty page background is an intentional part of the composition.
- **Motion remains controllable:** Pause, reduced-motion, deterministic seeking, and exact periodicity are product requirements.
- Tradeoffs: Prefer fewer authored marks and stable hierarchy over literal detail; preserve the proven loader/path/recorder boundaries instead of replacing the stack.

## Visual language
- Color: Page `#08090B`; land `#111519`; courtyard plates `#171D21`; context `#59636A`; loop `#F29A38`; loop highlight `#FFD080`; axis `#A94C42`; water `#507783`; ridges `#697568`; primary text `#E7E0D4`; dim text `#8B918E`.
- Typography: System sans for the title; system monospace for labels, modes, diagnostics, and status. No downloaded font.
- Spacing/layout rhythm: 4–6px internal increments, 16–26px viewport offsets, 44–48px controls, and safe-area insets on every edge.
- Shape/radius/elevation: Chamfered courtyard plates; rounded second-ring route; 11–16px UI radii; thin cool panel borders; no glow or drop-shadow effects.
- Motion: One 12-second route/fractal clock. Fixed north-up camera in `Infinite`; no orbit or breathing. Reduced motion freezes recursion.
- Imagery/iconography: Code-native line icons and deterministic vector geometry only.

## Geometry contract
- Roads: At most 28 features and 500 points.
- Courtyards: Exactly 12 closed, non-overlapping polygon plates.
- Gate marks: Exactly four short stubs outside the loop exclusion halo.
- Outer context: Eight broken arcs; no closed chord across an arc.
- Axis: Three internal segments that do not cross the orange route.
- Water: One filled lake.
- Mountains: Six separated north-west ridge contours.
- Intersections: Zero street×street intersections; at most eight intentional road-feature intersections overall.
- Loop: One non-self-intersecting closed path, independently sampled for constant-speed vehicle motion.

## Components
- Existing components to reuse: `BeijingLoopApp`, `MapRenderer`, `FractalRenderer`, `VehicleRenderer`, `CameraController`, `Controls`, `LoopRecorder`, `PathSampler`, and the GeoJSON loader.
- New/changed components: `MapRenderer` renders polygon courtyard masses; `FractalRenderer` returns loop-motif layers only; `scripts/geometry-check.mjs` protects the sparse contract.
- Variants and states: Infinite/Plan; playing/paused; recording inactive/active; debug hidden/visible; fullscreen; loading; WebGL unavailable; data-load error; reduced motion.
- Token/component ownership: Canvas palette and fractal constants in `src/rendering/theme.ts`; matching DOM tokens in `src/styles/main.css`; UI state in `src/ui/controls.ts`.

## Accessibility
- Target standard: WCAG 2.2 AA where applicable to this experimental artwork.
- Keyboard/focus behavior: Semantic buttons; Space toggles playback; 1/3 select Infinite; 2 selects Plan; F fullscreen; D debug; R record. Global shortcuts ignore focused interactive/editable targets so native activation never double-fires.
- Contrast/readability: Essential controls and copy remain legible against the darkest and brightest canvas regions; selection and recording use shape/background plus color.
- Screen-reader semantics: Canvas has an accessible name and linked description; controls expose names and pressed states; exactly one public mode is selected.
- Reduced motion and sensory considerations: Freeze recursive zoom, avoid camera motion and flashing, retain persistent pause, and keep recording/export user initiated.

## Responsive behavior
- Supported baselines: 1440×900, 1280×720, 390×844, and 360×800 at device scale factor 1 for layout verification.
- Layout adaptations: Brand top-left; actions top-right; view dock bottom-center; footer visually hidden but screen-reader available on mobile.
- Artwork framing: Mobile Infinite loop occupies roughly 68–78% viewport width with at least 24px side clearance. Portrait Plan keeps the full city plate inside the viewport.
- Touch/hover differences: Every public target is at least 44×44px; no action requires hover.

## Interaction states
- Loading: Centered uppercase boot status.
- Empty: Not valid; a blank or near-blank frame fails verification.
- Error: Centered WebGL/data-load recovery message.
- Success: Active mode and playback state are visible; recording produces one 12-second WebM cycle.
- Disabled: Duplicate recording starts are ignored; unsupported recording reports a browser capability error.
- Offline/slow network: Production uses only bundled code and local generated GeoJSON.

## Content voice
- Tone: Calm, factual, compact, and transparent.
- Terminology: `BEIJING / 北京`, `SECOND RING`, `INFINITE`, `PLAN`, `INFINITE STUDY`, and `ARTISTIC STUDY · NOT FOR NAVIGATION`.
- Microcopy rules: Never call the composition navigational; icon-only actions require accessible names and titles; errors use direct recovery language.

## Implementation constraints
- Framework/styling system: Vite, TypeScript, p5.js WebGL, and plain CSS. No React, utility framework, runtime API, or external asset pipeline.
- Design-token constraints: Extend the shared palette/CSS variables; do not introduce a second token layer.
- Performance constraints: Parse geometry once; render context once; avoid per-frame data rebuilding; cap pixel density; pause the draw loop in hidden tabs.
- Compatibility constraints: WebGL-capable evergreen browsers; recording/fullscreen remain progressive enhancements; relative Vite base remains GitHub Pages compatible.
- Test/screenshot expectations: `npm run verify`, `npm run build`, `npm run verify:geometry`, `PW_CHANNEL=chrome npm run verify:browser`, and `PW_CHANNEL=chrome npm run verify:seam` against a running dev server.

## Open questions
- [ ] Future exploration: Should recorded output include an optional title-free presentation mode? Owner: product. Impact: export composition only.
