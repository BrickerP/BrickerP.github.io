# Agent loop — Landing plan

Status: approved by the user on 2026-10-05 and landed in the scene.
Vermilion stays the single closure node from `DESIGN.md`. Repeating it once
per passage would turn the signature into a sticker. Software recording still
proxies repeated street meshes and hides point lights so the 48-second WebM
can finish; road, water, and lamps stay lit. The live frame is the full image.

Scope the user set: all twelve passages, one closed loop, enough time to
finish. Not a single-passage sample.

## Visual stance

Physical light on a designed city, not a scanned city. Each four seconds is
one poster. Surfaces may repeat (brick course, window rhythm, water).
Landmarks may not. The existing palette stays. No photoreal asset pack, no
neon alley, no extra palette.

Colors, already in `src/rendering/theme.ts`:

- Night `#07111B`
- Horizon `#27495C`
- Warm white `#ECE5D8`
- Vermilion `#D9684B`
- Stone `#C8C4B8`
- Lamp `#FFD38A`

Type stays off the city. The toolbar stays the small editorial control that
already exists. Signature: the warm-white road carrier, plus one vermilion
face in each passage and nowhere else.

## What stays

- 48 seconds, twelve passages, the order in `DESIGN.md`.
- First person, about 1.55 m, no cockpit, no HUD, not a driving game.
- Artistic Beijing, not a map.
- README remains the overview. This page remains the film.
- Deterministic phase. Record still exports one loop.

## What changes in the image

- One light rig for sky, road, water, and the hero. Shadows on for the hero
  mass only, not for every prop.
- Fog is depth and color from that rig, not a flat distance tint.
- Road and water respond to the light (roughness, a wet lane, lamps that
  bloom). `flatShading` on everything is retired.
- Unlit `MeshBasicMaterial` stops being the look. Recording may simplify
  particles. It may not swap the city back to unlit cards.
- Post is three things: tone mapping we already have, a short bloom on lamps,
  a little depth of field on the hero. No stack of effects.

WebGL2 first, same reach as ABYSSAL. The image rig is a seam, so a later
WebGPU post path can replace it without rewriting passages.

## Passage contract

Each passage is a module with:

- time window and overlap into the next
- one sentence that states the poster
- one hero silhouette, unique to that sentence
- which shared surface roles it uses
- how it hides the cut (wall, fog, water, underpass)

Shared code is the rig, the road, the camera, and the surface roles.
`BeijingDriveScene.ts` stops being the place where a new passage is typed.

Heroes that already have a spatial contract stay the subject of their
passage: Zhengyangmen and Tiananmen, the moat tower, the white dagoba,
Deshengmen, the Second-Ring wall, Drum and Bell, Yonghegong, the CBD mass,
the Temple of Heaven. Three passages are street fabric today and have no
hero in `spatialContract.ts`: Nanluo / Wudaoying, Qianmen / Dashilar, and
the overpass return. Those three get a poster sentence before any extra
geometry. Otherwise they become the repeated-kit section.

## Extensibility

- A thirteenth passage is a new module plus a register on the timeline.
- A second film later uses the rig interface and its own palette file. It
  does not import Beijing colors, and it does not merge with the Human Zine.
- Surface roles are a short list (asphalt, stone, wall red, roof, water,
  foliage, lamp). A new role needs a reason. A new mesh does not invent a
  new material.
- The spatial numbers (progress, lateral offset, clearance) stay data, as
  they are now, so a look change cannot move a building into the car.

## Order of work, one delivery

Done means all twelve, the closed seam, and a still from each boundary.
Internal order, not a release cut:

1. Write the image rules into the film contract. Retire flat-shaded-everything
   and shadows-off as the look. Keep the sequence and the no-HUD rules.
2. Build the rig and the road under the existing camera path.
3. Rebuild all twelve modules to the poster test. The three fabric passages
   are written first as sentences, then as geometry, so they are not leftover
   street.
4. Close second 48 into second 0.
5. Check twelve stills and one recorded loop.

## We do not

- Ship a bloom pass on the current boxes.
- Fill gaps with instanced houses.
- Add walk mode, collision, or a vehicle.
- Split a "demo passage" as the finished work.
