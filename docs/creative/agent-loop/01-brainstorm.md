# Agent loop — Brainstorm

Status: direction A chosen by the user on 2026-10-05. Game-feel film,
not a game with a verb. The "leave the twelve passages untouched" clause
was challenged the same day. Revised position is in `02-landscape.md`:
update the drive in place, replace the image system, do not add a second
film. Design is not approved. No code yet.

Revision 1 (README silent loop of the existing film) was declined. That is a
small distribution tweak, not the work.

This file still does not replace the approved Profile brainstorm or the Human
Zine recall-test knife. It does not authorize editing LOOP 01.

## Hypothesis

Confidence: **74%**.

README and github.io should keep different jobs. README stays the overview.
github.io should stop being one film and become a small hall: LOOP 01 stays
up as the previous piece, and a new piece is the flagship. Do not remaster
the current drive in place. Its subject is still good. Its image is a
flat-shaded diorama, and that is why it looks old next to Opus 5.5 and
GPT-6-Astra films.

## How might we

How might we put one new, code-native piece on the site that has the light
and camera of a game screenshot, without turning the profile into that piece
and without repainting the twelve Beijing passages?

## What the current film actually is

LOOP 01 is not an abandoned WebGL demo from years ago. It is an authored
48-second spline, twelve passages, Three.js, ACES tone mapping, and
`MeshStandardMaterial` with `flatShading: true`. Shadows are off. A lot of
cards and signs drop to unlit `MeshBasicMaterial`. Fog is a linear color, not
a volume. Geometry is boxes, cylinders, and roofs in one ~2900-line scene.

That reads as an editorial model, not as a rendered frame. Newer model-made
films look like Blender because of light, wet surfaces, bloom, and shaders.
The ones worth copying are still code: WebGPU/TSL scenes, or a single
procedural shader world with no downloaded meshes.

References, 2026-10:

- [ektogamat/threejs-conference](https://github.com/ektogamat/threejs-conference)
  — rainy alley, WebGPU, wet pavement, GPU rain, cinematic post, first person.
- [Token-Gremlin/natural-disasters](https://github.com/Token-Gremlin/natural-disasters)
  — ocean and weather, every pixel on the GPU, no external art.

## Not for

- A reskin of the twelve passages with bloom added on top.
- Merging the zine and the film into one palette.
- A Godot or Blender project as the GitHub Page.
- A contribution-graph toy or a 67-style blank landing page.

## Variants

1. **In-place remaster** — same spline and landmarks, physical materials and
   post. Fast to start, ceiling is still the box vocabulary.
2. **New code film beside LOOP** — one camera, one light model, one shader
   family, repeated forms. Game-still quality. LOOP stays linked as the
   previous work.
3. **One-verb game** — the same image, plus one action. A week only if the
   verb is tiny.
4. **README loop only** — declined as too small.
5. **Replace the site with a cyberpunk rain alley** — matches the reference
   look and throws away Beijing.
6. **Offline Blender, upload a video** — can look richest, and the page stops
   being a live work.
7. **Skill pack and no new piece** — reusable, invisible.
8. **Rebuild all twelve passages in the new renderer** — the right film, the
   wrong week.

## Three directions

### A. Hall + new code film — recommended

- **Value:** the site structure matches the overview/work split. The new
  image can compete with current model demos. LOOP 01 is not thrown away.
- **Feasibility:** one week for a 20-second piece, not for twelve passages.
- **Difference:** new lighting and camera, old film kept as the archive.
- **Hidden assumption:** a short new piece is enough to make the site feel
  current. The zine can point at it later, after the recall test.

### B. Hall + one-verb game

- **Value:** "game feel" becomes an actual verb, not only a camera.
- **Feasibility:** a week if the verb is one button or one hold. Not if it
  needs levels, win states, or assets.
- **Difference:** someone can do something, not only watch.
- **Hidden assumption:** you want play more than a frame you would pause.

### C. Remaster LOOP 01

- **Value:** one URL, one film, no new concept.
- **Feasibility:** medium, and the landmarks fight the new look.
- **Difference:** continuity.
- **Hidden assumption:** better shading will make box roofs feel like those
  Opus and Astra frames. It will not.

## Recommendation

**A.** Keep README as the overview. Make github.io a hall of two works. Leave
LOOP 01's geometry alone. Build one new code piece: locked or slightly inert
camera, physical light, one shader family, no HUD, no second brand. A game
is direction B, and only with a single verb.

## Assumptions to test

- You want the new piece to feel like a game still, before you want a score
  or a goal.
- LOOP 01 can remain on the site as the earlier work without a reskin.
- The zine does not have to change in the same week.
