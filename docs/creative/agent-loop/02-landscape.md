# Agent loop — Landscape

Status: draft, 2026-10-05. Waiting for a yes on the one-sentence position.

Direction already chosen: a film that looks like a game still. Not a game.

## One sentence

Revise the October 5 draft. The user asked why the film cannot be updated in
place. It can. The piece that stays is the 48-second Beijing drive. What
changes is the image system along that path. A bloom pass on the current
boxes will not look like a game still. A second, unrelated film was the wrong
way to protect the drive.

Still true: watchable, not a walking level. README stays the overview.

## Comparisons

| Name | What it solves | Pain | Borrow | We do not |
|---|---|---|---|---|
| LOOP 01, this repo | A closed Beijing night drive on github.io | Flat shading, no shadows, unlit cards, linear fog, box landmarks. Reads as a diorama. | Twelve-passage writing, deterministic loop, no HUD, separate from the README zine | Repainting those passages and calling it a remaster |
| [Threejs-Punk](https://github.com/ektogamat/threejs-conference) | A rainy alley that looks like a game screenshot, still in the browser | WebGPU-only, GLTF city, walk mode, BVH collision, cyberpunk preset. Too much scene for one week, and the subject is not ours | Wet ground, bloom and depth of field, GPU rain, a camera with weight, one post stack. Their note that it is not a game engine | First-person walking, collision, a neon alley, a settings menu |
| [ABYSSAL](https://github.com/Token-Gremlin/natural-disasters) | A cinematic ocean with no downloaded art | A simulation showcase. The sandbox (fly the camera, spawn disasters) is the part that turns it into a toy | One automatic shot that plays itself; water and sky sharing one light; everything generated in code | FFT oceans, a free-fly camera, a sandbox of effects |
| Bruno Simon's portfolio, and the many car-physics copies | A personal site you drive through | Becomes a 2019 toy portfolio. Physics and a vehicle are the product | The feeling that the camera has mass | A car, rapier or cannon, a drivable résumé |
| Blender still, or a screen recording of LOOP | The richest single frame, or a README preview | The live site stays the old diorama. A video file is not the work | Offline renders only as reference frames for the code piece | Shipping a movie as the GitHub Page |
| HyperFrames / Remotion | HTML or React turned into an MP4 | A file to post, not a page to open | Later, if the README needs a silent excerpt | Making the new piece an export instead of a live page |

## What to copy as interaction

- The film starts alone. No enter-to-walk, no look-around, no quality sandbox.
- One camera move with a little inertia or drift, then a loop back.
- One light rig shared by ground, fog, and the hero shape.
- A small post stack: bloom on lamps, a hint of depth of field. Not a stack of every effect.
- Materials vary roughness. Flat shading is the thing that dates LOOP 01.

## What to avoid

- Collision, scores, vehicles, an inventory of landmarks.
- WebGPU-only if the page must open for a normal visitor. Punk needs WebGPU. ABYSSAL stays on WebGL2 and still looks current. Prefer that reach unless we accept a fallback poster.
- Adding bloom to the existing boxes.
- Merging this look into the Human Zine.

## Trend

As of 2026-10, the frames people point at from Opus 5.5 and GPT-6-Astra are code renders: physical light, wet or specular surfaces, particles, a heavy camera. The impressive GitHub pieces split into a walkable tech demo (Punk) and a self-playing shader world (ABYSSAL). The personal-site version of "game feel" keeps sliding into a driving portfolio. That slide is the failure mode.
