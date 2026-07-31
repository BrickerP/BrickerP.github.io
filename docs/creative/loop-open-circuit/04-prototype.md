# 04 — Prototype

## One core journey

1. Enter from the Profile LOOP card.
2. Read `LOOP 01 / ENDLESS SECOND RING`.
3. Follow the warm-white road carrier through the Beijing circuit.
4. Encounter the single vermilion closure node during the return.
5. Pause, record, fullscreen, or open About through the existing four actions.

## Desktop wireframe

```text
┌ LOOP 01                                      ┌ ─ ─ ─ ─ ┐
│ ENDLESS SECOND RING                          │ 4 actions │
│ BEIJING / 北京 · 48-SECOND GENERATIVE DRIVE └───────────┘
│
│                  authored Beijing horizon
│                         • closure node
│                       ╱
│                     ╱ warm-white carrier
└──────────────────────────────────────────────────────────
```

## Portrait wireframe

```text
┌ LOOP 01
│ ENDLESS SECOND RING
│ BEIJING / 北京 · 48-SECOND GENERATIVE DRIVE
│
│          authored horizon
│                 •
│                ╱
│               ╱ carrier
│
├───────────────────────────┐
│ pause  record  full  about│  bottom safe-area rail
└───────────────────────────┘
```

## Design brief

- Subject: an imagined first-person Beijing night circuit.
- Audience: creative technologists, AI builders, and collaborators.
- Page's only job: let the visitor enter and recognize one authored loop.
- Colors:
  - Night `#07111B`
  - Asphalt `#0B1F2E`
  - Warm white `#ECE5D8`
  - Steel `#71828B`
  - Signature vermilion `#D9684B`
  - Local amber for diegetic windows only
- Typography:
  - Mono for artifact identity, metadata, controls, and status
  - System sans only for longer About copy
- Signature: one warm-white carrier resolving at one non-glowing vermilion node.

## State notes

- Playing: carrier and scene advance from normalized phase.
- Paused: frame and node remain stable; pressed state stays explicit.
- Recording: same scene-native identity appears in the WebM.
- Reduced motion: authored static poster; no camera or environmental motion
  before explicit Play.
- About: existing modal and focus lifecycle remain unchanged.

## Guardrails

No grid overlay, scan lines, charts, progress map, chapter navigation, extra
panels, repeated signature dots, or additional public control.

Approved by the user on 2026-07-31.
