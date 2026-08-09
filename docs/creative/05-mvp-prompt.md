# Human Zine — Step 5 implementation source

Status: **Step 5 active; implementation authorized by the user on 2026-08-09.**

This is the sole active Step 5 source. The July LOOP / LEDGER implementation
plan is historical and has no compatibility requirements.

## Prompt Architect

### Problem

Someone arriving through one work lacks a short, concrete way to understand
Yupeng's interests, judgment, and creative range. Scattered artifacts and
occupational facts make it hard to decide whether to explore, follow, or start a
conversation.

### Target

An AI builder or creative technologist who wants to judge the person behind the
work. Recruiter verification remains a secondary route.

### Goal

Ship the approved Human Zine as the canonical GitHub Profile experience, using
one sparse README and four static spreads to make selected work and process
evidence understandable without turning the Profile into a résumé or a runtime.

### One journey

**cover → artifact spread → process spread → open artifact/contact**

1. Recognize the person and issue.
2. Encounter the film and playable archive as independent works.
3. Inspect attributed process evidence.
4. Open a native artifact or contact link.

### Product boundary

Product implementation happens only in `BrickerP/BrickerP`:

- `README.md`;
- `assets/human-zine-cover.svg`;
- `assets/human-zine-artifact.svg`;
- `assets/human-zine-process.svg`;
- `assets/human-zine-open-line.svg`;
- `scripts/verify-profile.mjs`, only as necessary to verify this contract.

The four SVGs are hand-authored and precommitted; the script is a verifier, not
a generator. This repository, `BrickerP.github.io`, supplies documentation and
film evidence only. `BrickerP/ai-usage-report` supplies AI Usage evidence only.
Neither evidence repository receives Step 5 product changes.

### Non-goals

- No product edit to Loop / Endless Second Ring, AI Usage, or `/about/`.
- No `/zine` route, second site, new repository, service, API, generator,
  dependency, remote font, live metric, or theme-dependent asset.
- No LOOP / LEDGER compatibility layer, matched card system, dynamic card,
  animation, hover-only route, image hit zone, or fake SVG control.
- No extra biography, trait label, chart, before/after story, or generated
  pseudo-diff.

## Scope Cop

### Keep

- One README, one ordered journey, and exactly four full-width SVG spreads.
- The exact Step 4 copy, four alt strings, and two native link rows.
- Three independent film receipts and two attributed medium rules.
- Fixed-paper rendering, `320px` readability, image-failure fallback, and remote
  verification.

### Cut

- The July LOOP / LEDGER plan and all three-repository product coordination.
- Any internal SVG action, responsive alternate asset, runtime data, or visual
  reconciliation of the film, game, and zine.
- Any file outside the six-file `BrickerP/BrickerP` boundary above.

### Defer

- Visitor research and analytics beyond the approved self-check.
- New Profile issues, additional spreads, alternate editions, and new personal
  fragments.
- Product work in Loop, AI Usage, and About.

## Acceptance contract

### Four precommitted assets

| File | Exact dimensions | Exact `viewBox` |
| --- | ---: | --- |
| `assets/human-zine-cover.svg` | `1200 × 630` | `0 0 1200 630` |
| `assets/human-zine-artifact.svg` | `1200 × 720` | `0 0 1200 720` |
| `assets/human-zine-process.svg` | `1200 × 720` | `0 0 1200 720` |
| `assets/human-zine-open-line.svg` | `1200 × 360` | `0 0 1200 360` |

Each SVG is self-contained, hand-authored, committed beside the README, and
embedded full-width in one column. Each is pure display: no `<a>`, `<script>`,
event handler, animation element or CSS animation, interactive region, fake
button, `href`, `xlink:href`, or remote resource. There is no build-time or
runtime generation.

### Frozen visible copy

Capitalization and punctuation must match Step 4 exactly:

```text
YUPENG LU
FIELD NOTES · ISSUE 00
THINGS I KEEP RETURNING TO
ENDLESS SECOND RING
A 48-SECOND BEIJING NIGHT DRIVE.
REAL MODEL HISTORY, MADE PLAYABLE.
AI USAGE
THREE ATTEMPTS. ONE QUESTION: WHAT BELONGS HERE?
FROM THE FILM
5E8F667 / RECOGNIZABLE LANDMARKS
B9EF619 / CLEAR THE FORECOURT
520E83F / REPLACE THE OLYMPIC SCENE
FILM RULE
ARTISTIC COMPOSITION. NOT FOR NAVIGATION.
GAME RULE
HISTORY PATTERN. NOT MODEL CAPABILITY.
OPEN A LINE
```

The README plus SVGs contain no more than **85 visible words**, including native
link labels. Alt text and non-visible accessibility metadata are excluded. No
other visible heading, caption, fallback sentence, metric, date, or label is
added.

### README order, alts, and native links

1. Cover alt: `Yupeng Lu. Field Notes, Issue 00. Things I keep returning to.`
2. Artifact alt: `Two independent works: Endless Second Ring, a 48-second Beijing night drive; and AI Usage, real model history made playable.`
3. Immediately after Artifact: `[WATCH FILM →](https://brickerp.github.io/) · [PLAY ARCHIVE →](https://brickerp.github.io/ai-usage-report/)`
4. Process alt: `Three independent film design attempts ask what belongs in one scene, beside two attributed rules: film is artistic composition, not navigation; game history pattern is not model capability.`
5. Open line alt: `Open a line.`
6. Immediately after Open line: `[EMAIL YUPENG →](mailto:yplmicro@gmail.com) · [RESUME →](https://brickerp.github.io/resume.pdf) · [GITHUB →](https://github.com/BrickerP)`

The four alts and both link rows are exact. Images have no enclosing link. If
images fail, the alts preserve meaning and the ordinary Markdown links preserve
every artifact and contact destination.

### Evidence integrity

The Process spread presents three independent receipts, never an ancestor chain
or sequential transformation:

- `5E8F667 / RECOGNIZABLE LANDMARKS` → `5e8f66756afc9b483beb0070524ac4cc4d7f3856`;
- `B9EF619 / CLEAR THE FORECOURT` → `b9ef61997260c359005aa175a62dcb370c2007e8`;
- `520E83F / REPLACE THE OLYMPIC SCENE` → `520e83f32ed20efc0beb64982b1db45c7600db9e`.

The verifier binds each visible short receipt to its complete SHA. Film evidence
is attributed to `src/rendering/BeijingDriveScene.ts` at
`7d4b0bf9876fdaa7b303ba40b4075170a73b4a6c`; AI Usage evidence is attributed to
`BrickerP/ai-usage-report` at
`6bae0fa23492ece45ae49ad57093d4f003883215`. The visible rules remain exactly
`ARTISTIC COMPOSITION. NOT FOR NAVIGATION.` and
`HISTORY PATTERN. NOT MODEL CAPABILITY.`.

### Readability and theme behavior

- At a `320px` GitHub render, all essential copy remains readable without a
  mobile-specific asset; Process body copy is at least `60px` at source size and
  receipt identifiers are at least `54px`.
- Every asset starts with an opaque `#F4F0E3` paper field covering its viewBox.
  Light and dark GitHub themes render the same paper, ink, and contrast.
- No `prefers-color-scheme`, inherited theme color, animation, hover, or hidden
  state is required. Native links retain browser focus, keyboard, touch, and
  pointer behavior.

### Verification and release gate

`scripts/verify-profile.mjs` uses only Node built-ins to fail on any dimension,
viewBox, asset count/order, copy, alt, link, word-budget, receipt, attribution,
paper-field, or prohibited-SVG violation above. It must not generate or rewrite
an asset.

- Do not install dependencies or run a local compile, build, or test. The only
  local check is `git diff --check`.
- Push the exact six-file implementation to a remote branch and open a PR in
  `BrickerP/BrickerP`.
- Remote CI must run the verifier and finish green for the pushed full SHA.
- Read back the README and four SVG blobs from that exact remote commit. After
  merge/publication, read back the rendered GitHub Profile, verify all native
  destinations, and confirm the fixed paper and readable layout in light and
  dark themes before claiming the Human Zine live.
