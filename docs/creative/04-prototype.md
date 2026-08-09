# GitHub Profile refinement — Step 4 prototype

Status: approved on 2026-07-31

## Decision carried forward

The approved identity is:

> **LOOP / LEDGER**
>
> **Strange loops. Open ledgers.**

The Profile is a compact creator surface for AI builders and creative
technologists. Recruiter comprehension remains a secondary route. The page
must feel authored and memorable without becoming a custom landing page,
newsletter funnel, or GitHub-widget wall.

## Current-state evidence

- Assessed Profile README:
  [`BrickerP/BrickerP@f6207a1`](https://github.com/BrickerP/BrickerP/commit/f6207a15f12a93fcf88cea92ce0b81b74915deb8).
- Current LOOP card:
  [`public/profile-loop-card.svg`](../../public/profile-loop-card.svg), a
  self-contained `560 × 160` SVG.
- Current LEDGER cards:
  [`ai-usage-card-light.svg`](https://github.com/BrickerP/ai-usage-report/blob/main/public/ai-usage-card-light.svg)
  and
  [`ai-usage-card-dark.svg`](https://github.com/BrickerP/ai-usage-report/blob/main/public/ai-usage-card-dark.svg),
  both `560 × 160` and generated from current report data.

The existing Profile places both cards side by side at `49%` width. That
preserves the diptych on desktop but makes the cards' smallest text
unreadable on narrow screens. GitHub Profile Markdown also provides no durable
custom breakpoint or cross-card positioning mechanism.

## One core journey

1. **Recognize** — read `LOOP / LEDGER` and retain “Strange loops. Open
   ledgers.”
2. **Decode** — understand that one work is an enterable world and one is a
   bounded, inspectable usage trace.
3. **Choose** — open either LOOP 01 or LEDGER 02 from a full-width chapter.
4. **Inspect** — experience the closed Beijing journey or inspect the
   Chronicle's sources, cache disclosure, freshness, and limits.
5. **Relate** — open an email conversation; optionally inspect breadth and
   professional background.

This is one journey with one choice point, not two competing page flows.

## Responsive layout decision

Use one left-aligned column and stack the two cards at the full available
README width. Do not use a two-column table.

The road-to-skyline idea becomes a **repeated transformation**, not a fragile
literal bridge between separate images:

- in LOOP, the road marking converges on one vermilion node;
- in LEDGER, the same node begins the chart baseline and Skyline;
- each card remains complete when viewed alone, stacked, resized, or shared.

### Desktop wireframe

```text
GitHub Profile content column
┌──────────────────────────────────────────────────────────────┐
│ YUPENG LU / BRICKERP                         LOOP / LEDGER   │
│                                                              │
│ Strange loops. Open ledgers.                                 │
│ I build strange AI loops and keep the ledger open.           │
│                                                              │
│ Building a strange AI experiment—an agent tool or visual     │
│ world?  OPEN A LINE — EMAIL YUPENG                            │
│                                                              │
│ 01 / LOOP — ENDLESS SECOND RING                  ENTER ↗     │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ LOOP 01                        road ───────→ ●            │ │
│ │ 48-second generative Beijing night drive                │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ 02 / LEDGER — AI USAGE CHRONICLE                INSPECT ↗   │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ LEDGER 02                 ● ─────── weekly Skyline       │ │
│ │ [dynamic total] [range] [cache disclosure] [tool bars]  │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ MORE SYSTEMS                                                 │
│ Research skill · Context recommender · STT Bench             │
│                                                              │
│ ▸ PROFESSIONAL BACKGROUND                                    │
└──────────────────────────────────────────────────────────────┘
```

### Mobile wireframe

```text
┌──────────────────────────────┐
│ YUPENG LU / BRICKERP         │
│ LOOP / LEDGER                │
│                              │
│ Strange loops.               │
│ Open ledgers.                │
│                              │
│ I build strange AI loops and │
│ keep the ledger open.        │
│                              │
│ Building a strange AI        │
│ experiment—an agent tool or  │
│ visual world?                │
│ OPEN A LINE — EMAIL YUPENG   │
│                              │
│ 01 / LOOP            ENTER ↗ │
│ ┌──────────────────────────┐ │
│ │ LOOP 01      road → ●    │ │
│ │ ENDLESS SECOND RING      │ │
│ └──────────────────────────┘ │
│                              │
│ 02 / LEDGER       INSPECT ↗ │
│ ┌──────────────────────────┐ │
│ │ LEDGER 02  ● ─ skyline   │ │
│ │ total / cache / range    │ │
│ └──────────────────────────┘ │
│                              │
│ MORE SYSTEMS                 │
│ Three stable links           │
│                              │
│ ▸ PROFESSIONAL BACKGROUND    │
└──────────────────────────────┘
```

The mobile layout is not a fallback. It is the canonical order, with desktop
receiving only more horizontal breathing room.

## Proposed visible copy

This is the target information architecture, not yet the committed README:

```markdown
# Yupeng Lu / BRICKERP

`LOOP / LEDGER`

## Strange loops. Open ledgers.

I build strange AI loops and keep the ledger open.

Building a strange AI experiment—an agent tool or visual world?
**[OPEN A LINE — EMAIL YUPENG](mailto:yplmicro@gmail.com)**

### [01 / LOOP — Endless Second Ring ↗](https://brickerp.github.io/)

A 48-second generative Beijing night drive: enter the world.

[Full-width LOOP card]

### [02 / LEDGER — AI Usage Chronicle ↗](https://brickerp.github.io/ai-usage-report/)

A bounded AI-tool usage trace with sources, coverage, freshness, and limits
disclosed.

[Full-width light/dark LEDGER card]

### More systems

[Research skill] · [Context Intent Recommender] · [STT Bench]

<details>
<summary>Professional background</summary>

AI Platform / Product Engineer · San Francisco Bay Area · US permanent
resident; no sponsorship required.

[Resume] · [LinkedIn]
</details>
```

The Profile contains one relationship CTA. Artifact headings and linked images
remain exploration routes. The visible CTA expands the distinctive phrase into
an unambiguous email action.

## Card contract

### Shared

- Both cards remain self-contained static SVGs with the same dimensions,
  radius, outer stroke, grid rhythm, label syntax, and accessibility metadata.
- The top identity labels become `LOOP 01` and `LEDGER 02`.
- The vermilion node appears exactly once in each card.
- Tiny text may reinforce the visual but cannot carry meaning that is absent
  from the adjacent Markdown and image `alt`.
- The whole embedded image is one link. There are no drawn controls that
  appear independently clickable.

### LOOP 01

- Preserve the dark, cinematic Beijing composition and deterministic
  48-second claim.
- Keep the road, vanishing point, skyline, and restrained amber windows.
- Remove the faux button inside the SVG; the linked Markdown chapter supplies
  the action.
- Resolve the road marking at the vermilion node instead of requiring it to
  connect to another image at a particular viewport width.

### LEDGER 02

- Preserve the dynamic calculation, all-time default, recorded-token wording,
  date range, cache amount/share, tool series, and weekly aggregation.
- Rename the identity line to `LEDGER 02 / AI USAGE CHRONICLE`.
- Reuse the monospace label role and structural grid from LOOP, while
  preserving the existing semantic colors for Codex, Claude Code, Cursor, and
  One API.
- Start the Skyline baseline at the vermilion node.
- Continue generating fixed light and dark SVGs during AI Usage publication;
  add no endpoint or dynamic card service.

## Design brief

### Subject

One AI builder expressed through two inspectable modes: an authored world and
an honest trace of the tools used around the work.

### Audience

AI builders and creative technologists deciding whether to explore, follow, or
start a collaboration conversation. Recruiters are a secondary audience.

### The page's only job

Make `LOOP / LEDGER` memorable, route the visitor into one real artifact, and
leave one clear path to a human conversation.

### Six-color brand palette

| Role | Color | Use |
| --- | --- | --- |
| Night | `#07111B` | LOOP field and deepest dark surface |
| Asphalt | `#0B1F2E` | Road, dark secondary surfaces |
| Paper | `#FFFFFF` | LEDGER light surface |
| Warm white | `#ECE5D8` | Primary dark-mode lettering and carrier line |
| Steel | `#71828B` | Grids, borders, muted structure |
| Handoff vermilion | `#D9684B` | One node and sparse action emphasis |

The four tool-series colors remain semantic data colors inside LEDGER. They do
not become Profile decoration.

### Typography roles

- **Identity and artifact labels:** `ui-monospace`, `SFMono-Regular`, Menlo,
  Consolas, monospace; uppercase, compact, deliberate.
- **Primary card number:** the same mono family at a larger, heavier weight.
- **README explanation:** GitHub-native sans; no attempt to simulate a custom
  website inside Markdown.

Do not add a remote webfont dependency to either SVG.

### Signature element

A single carrier line changes meaning:

```text
perspective road ─────→ ●       ● ─────→ measured Skyline
                       LOOP     LEDGER
```

The node is a handoff between imagination and inspection. No glow, gradient,
animation, repeated dots, robot image, neural mesh, or circuit-board pattern is
added.

## Accessibility and degradation contract

- Each linked image has concise Markdown/HTML `alt` that names the work,
  describes its role, and communicates the link destination without depending
  on internal SVG text.
- With images disabled, the identity, work names, one-sentence meanings,
  artifact links, email action, breadth links, resume, and LinkedIn remain
  understandable.
- All actions are ordinary GitHub-rendered links with native keyboard focus.
- Color is not the sole distinction between works or tool series; names and
  accessible descriptions remain present.
- Both cards must be checked at approximately `320px` and desktop width.
- The AI Usage `alt` stays qualitative so Profile prose never hard-codes a
  dynamic total or date.

Recommended image alternatives:

- `Open LOOP 01 — Endless Second Ring, a 48-second generative Beijing night
  drive.`
- `Open LEDGER 02 — AI Usage Chronicle, a bounded all-time AI-tool usage
  timeline with cache disclosure.`

## Self-questioning

### Does stacking the cards make the signature less distinctive?

No. The literal seam was fragile and disappeared on mobile. Repeating the same
road/node/baseline transformation makes the pair recognizable while allowing
each card to survive independently.

### Is `LOOP / LEDGER` just a naming trick?

No. LOOP already closes deterministically after 48 seconds. LEDGER already
publishes a dated, cache-disclosed usage history. The names expose an existing
relationship instead of inventing an unsupported persona.

### Does “open ledger” overclaim completeness?

It could without qualification. The adjacent sentence therefore calls it a
**bounded AI-tool usage trace** and explicitly names sources, coverage,
freshness, and limits. Report freshness is not described as productivity or
human activity.

### Is `OPEN A LINE` too cryptic?

Alone, yes. The visible action becomes `OPEN A LINE — EMAIL YUPENG`, preserving
the creator phrase while making the destination and relationship semantics
clear.

### Are the internal SVG labels accessible?

Not reliably when the SVG is embedded as an image. Essential semantics live in
the surrounding Markdown and image `alt`; the internal SVG title and
description remain useful reinforcement, not the only source of meaning.

### Is this becoming a custom landing page inside GitHub?

No. It uses headings, prose, two linked static images, three stable links, and
one disclosure. There is no custom CSS, script, animation, live service, or
responsive layout trick.

## Explicit cuts

- Remove the side-by-side `49%` card layout.
- Remove the repeated action row beneath the current cards.
- Remove the redundant full-scene poster disclosure.
- Reduce three project mini-descriptions to three stable breadth links.
- Move role, location, work authorization, resume, and LinkedIn into one
  compact `Professional background` disclosure.
- Do not add a portrait, banner, animated header, terminal UI, follower count,
  newsletter, booking link, GitHub stats, streaks, badges, tool inventory, or
  manually maintained `Now` feed.

## Implementation boundary after approval

Step 5 would coordinate exactly three existing surfaces:

1. `BrickerP/BrickerP` — Profile README structure and copy;
2. this repository — LOOP card visual contract;
3. `BrickerP/ai-usage-report` — generated LEDGER light/dark card contract.

No new repository, service, dependency, data source, or deployment mechanism is
required.

## Step 4 recommendation

Approve one responsive direction:

**a full-width vertical diptych, joined by a repeated road → node → Skyline
transformation rather than a viewport-dependent seam.**

## 2026-08-09 Human Zine prototype

Status: Step 4 approved by the user on 2026-08-09. This section supersedes the
July unified LOOP / LEDGER diptych as the active Profile brief; the July section
remains a dated baseline and is not deleted. The combined four-spread Artifact
version was then falsified by creator dogfood because its Markdown text links
did not make the visual path feel clickable. The clickable-portal correction
below is the active interaction contract and explicitly supersedes that
Artifact/link-row portion of this dated baseline.

The approval gate is satisfied. Step 5 product implementation is authorized
only in `BrickerP/BrickerP`: README content, five static precommitted SVG
spreads, and the necessary profile verifier. A new repository and product changes to
Endless Second Ring / Loop or AI Usage remain out of scope.
The former `assets/human-zine-artifact.svg` is deleted in this direction; no
alias, fallback asset, or compatibility layer is permitted.

### Canonical surface and boundaries

The GitHub Profile README itself is the canonical Human Zine. Do not create a
`/zine` route, a second publishing site, or a new runtime.

- `/about/` remains the structured professional fallback for role, location,
  work authorization, resume, LinkedIn, and machine-readable profile facts.
- Endless Second Ring / Loop remains its existing self-contained film and card.
- AI Usage remains its existing independent game and generated card; its data,
  cadence, cache disclosure, and visual contract do not change here.
- The README owns selection, sequence, and context. Each artifact keeps its own
  stable destination and medium.
- The local review artifact
  `/Users/yupeng/.codex/generated_images/019fb2f0-8de4-74d2-b95b-a7aa913d5587/exec-f6df645c-b05d-4121-8709-89ab516aba58.png`
  is a mood/layout prototype for this design review only. Its receipt body
  small text and graphic marks are placeholder texture, not evidence. It is not
  a release asset or a publishable README image; Step 5 may use only real
  `git show --stat` evidence or deliberately abstract lines, never generated
  pseudo-diff.

### One journey

The README has one ordered editorial journey, with no alternate navigation mode:

1. **Cover** — recognize the person and the issue before seeing a résumé.
2. **Film portal** — enter the authored film as a complete work.
3. **AI Usage portal** — play the bounded archive as a separate work.
4. **Process spread** — inspect the living trace and the judgment behind it.
5. **Open line portal** — open a human conversation.

The sequence is **cover → film portal → AI Usage portal → process spread → open
line portal**. A visitor may skip to a native anchor, but the visual order must
never require a hover, animation, or hidden state to understand the route.

### Five static SVG spreads

The README uses exactly five full-width, precommitted SVG spreads. Every SVG has
an exact `width`, `height`, and `viewBox`; there is no loading state, runtime
data, animation, API call, theme query, or generated text. All five SVGs are
pure display: they contain no internal anchor, pointer hit zone, fake button,
or independently clickable drawing. Film, AI Usage, and Open line are each
wrapped by one native README outer anchor; Cover and Process remain plain
images. There are no separate Markdown text-link rows.

| Spread | Exact SVG size | Concrete layout | README interaction and fallback |
| --- | ---: | --- | --- |
| Cover | `1200 × 630` | Fixed paper field. Giant `YUPENG LU` spans the upper half. `FIELD NOTES · ISSUE 00` sits at the lower left; a misregistered signal-red circle containing `THINGS I KEEP RETURNING TO` sits at the lower right. Preserve the approved crop marks and halftone texture across the upper/right field. | Plain `<img>` only; no anchor or action. |
| Film | `1200 × 720` | A complete, independent visual poster for `ENDLESS SECOND RING` and `A 48-SECOND BEIJING NIGHT DRIVE.` Keep the film crop, road/skyline composition, and editorial margin self-contained. Include visible `ENTER` as poster typography, never as a control. | One native outer anchor around the whole image to `https://brickerp.github.io/`; the image `alt` names the film and destination, so the anchor remains the image-failure fallback. |
| AI Usage | `1200 × 720` | A complete, independent visual poster for `AI USAGE` and `REAL MODEL HISTORY, MADE PLAYABLE.` Keep the archive identity, bounded-history meaning, and editorial margin self-contained. Include visible `PLAY` as poster typography, never as a control. | One native outer anchor around the whole image to `https://brickerp.github.io/ai-usage-report/`; the image `alt` names the archive and destination, so the anchor remains the image-failure fallback. |
| Process | `1200 × 720` | Left `(64,72)–(776,648)` is a paper-and-ink evidence field with `FROM THE FILM`, one headline, and three independent commit receipts; right `(824,72)–(1136,648)` carries attributed `FILM RULE` and `GAME RULE` text. `AI USAGE` does not repeat here. No before/after panel, trait label, live total, or chart is rendered. | Plain `<img>` only; no anchor or action. |
| Open line | `1200 × 360` | Giant `OPEN A LINE` is left-aligned on the fixed paper field. A cobalt brush mark occupies the upper right; the rest remains deliberately open paper. The SVG contains no email, résumé, GitHub label, button, or drawn link. Include visible `OPEN A LINE` as poster typography, never as a control. | One native outer anchor around the whole image to `mailto:yplmicro@gmail.com`; the image `alt` states the email action and remains the image-failure fallback. |

The affordance is the combination of poster-internal `ENTER`, `PLAY`, or
`OPEN A LINE` copy and one native outer anchor around the complete visual. These are
not buttons and not a shared card: each poster is an independent work and has
at most one destination. The SVGs remain pure display; only the README anchor
is interactive. A single image cannot provide two reliable GitHub-native hot
zones or two keyboard targets, so Film and AI Usage must be separate posters.

### Process evidence, not self-description

The Process spread freezes the following evidence instead of displaying
self-awarded traits or a fake before/after story:

```text
THREE ATTEMPTS. ONE QUESTION: WHAT BELONGS HERE?
FROM THE FILM
5E8F667 / RECOGNIZABLE LANDMARKS
B9EF619 / CLEAR THE FORECOURT
520E83F / REPLACE THE OLYMPIC SCENE
FILM RULE
ARTISTIC COMPOSITION. NOT FOR NAVIGATION.
GAME RULE
HISTORY PATTERN. NOT MODEL CAPABILITY.
```

The three receipts are independent design attempts verifiable in the current
repository. They are not an ancestor chain and must not be narrated as a
sequential replacement chain or inherited progression:

- `5E8F667 / RECOGNIZABLE LANDMARKS` →
  `5e8f66756afc9b483beb0070524ac4cc4d7f3856`.
- `B9EF619 / CLEAR THE FORECOURT` →
  `b9ef61997260c359005aa175a62dcb370c2007e8`.
- `520E83F / REPLACE THE OLYMPIC SCENE` →
  `520e83f32ed20efc0beb64982b1db45c7600db9e`.

The film source is the current repository file `src/rendering/BeijingDriveScene.ts`
with commit `7d4b0bf9876fdaa7b303ba40b4075170a73b4a6c`; the independent attempts
reference the `buildOlympic` and `buildSecondRingThreshold` implementations. The receipts are
independent snapshots of design attempts, not a claimed ancestor sequence. The
AI Usage rule is sourced from the external repository
`/Users/yupeng/Projects/ai-usage-report`, commit
`6bae0fa23492ece45ae49ad57093d4f003883215`; it is not a ref in this repository.
The two rules are attributed evidence for visitors to interpret, not claims that
the author prints about themself. The material lets a visitor infer the approved
dimensions from actual decisions rather than being told a flattering trait label.

### Fixed zine palette and type roles

All five spreads use an opaque, fixed paper field in both GitHub light and dark
themes. They never switch colors from `prefers-color-scheme` and never inherit
the surrounding page theme.

- Paper: `#F4F0E3`
- Ink: `#111111`
- Cobalt: `#1457FF`
- Signal red: `#FF4B35`
- Acid yellow: `#FFD83D`
- Mint: `#63E2B7`

The signature element belongs only to the Human Zine: one misregistered signal-
red editorial circle paired with crop marks. It must not be copied into the
Loop card, the Endless Second Ring runtime, or the AI Usage card.

Typography has three roles:

- **Condensed grotesk:** issue label, spread headings, and artifact names.
- **Body grotesk:** explanatory copy and fallback prose.
- **Marker:** sparse marginal annotation only; it may add tone but never carries
  an essential fact, action, date, metric, or destination.

Use available system fallbacks for each role. Do not load a remote font or make
font availability a prerequisite for meaning.

### Exact visible copy

All release-facing copy, alt text, and fallback text are frozen below.
Capitalization and punctuation are exact; Step 5 must not paraphrase them.

```text
YUPENG LU
FIELD NOTES · ISSUE 00
THINGS I KEEP RETURNING TO
ENDLESS SECOND RING
A 48-SECOND BEIJING NIGHT DRIVE.
ENTER
AI USAGE
REAL MODEL HISTORY, MADE PLAYABLE.
PLAY
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

README order and frozen fallback are exactly:

1. **Cover SVG** — alt: `Yupeng Lu. Field Notes, Issue 00. Things I keep returning to.`
2. **Film SVG** — native outer anchor to `https://brickerp.github.io/`; alt: `Enter Endless Second Ring, a 48-second Beijing night drive.`
3. **AI Usage SVG** — native outer anchor to `https://brickerp.github.io/ai-usage-report/`; alt: `Play AI Usage Chronicle, a bounded AI-tool history with sources, freshness, and limits disclosed.`
4. **Process SVG** — plain image; alt: `Three independent film design attempts ask what belongs in one scene, beside two attributed rules: film is artistic composition, not navigation; game history pattern is not model capability.`
5. **Open line SVG** — native outer anchor to `mailto:yplmicro@gmail.com`; alt: `Open a line with Yupeng by email.`

The Film, AI Usage, and Open line anchors wrap the complete `<img>` and are
the only interactive surfaces. Cover and Process have no anchor. If an image
fails, its alt text remains the readable link label for the outer anchor; no
separate text-link row is added.

The total visible authored copy is **no more than 85 words**, counting poster
copy and the native anchor's image fallback labels; this remains a deliberately
low-text page. Alt text is the fixed accessibility fallback and is not
additional visible copy. No other fallback sentence, internal SVG label, or
dynamic metric may be introduced.

### Desktop wireframe

```text
README content column (one column; five full-width SVG spreads)
┌──────────────────────────────────────────────────────────────┐
│ YUPENG LU                                  halftone / crop   │
│ [ giant type spanning the upper half ]                       │
│                                                              │
│ FIELD NOTES · ISSUE 00       ( THINGS I KEEP RETURNING TO )  │
│ [ COVER SVG — 1200 × 630 — pure display ]                    │
│                                                              │
│ [ FILM POSTER — ENTER / native outer anchor ]                  │
│ ENDLESS SECOND RING                                           │
│ A 48-SECOND BEIJING NIGHT DRIVE.                              │
│ [ AI USAGE POSTER — PLAY / native outer anchor ]              │
│ AI USAGE                                                      │
│ REAL MODEL HISTORY, MADE PLAYABLE.                            │
│                                                              │
│ THREE ATTEMPTS. ONE QUESTION: WHAT BELONGS HERE?              │
│ FROM THE FILM                                                 │
│ 5E8F667 / RECOGNIZABLE LANDMARKS                              │
│ B9EF619 / CLEAR THE FORECOURT                                 │
│ 520E83F / REPLACE THE OLYMPIC SCENE                           │
│ FILM RULE                                                     │
│ ARTISTIC COMPOSITION. NOT FOR NAVIGATION.                     │
│ GAME RULE                                                     │
│ HISTORY PATTERN. NOT MODEL CAPABILITY.                        │
│ [ PROCESS SVG — 1200 × 720 — pure display ]                   │
│                                                              │
│ OPEN A LINE                              [ cobalt brush ]     │
│                                                              │
│ [ OPEN-LINE SVG — 1200 × 360 — native mailto outer anchor ]  │
└──────────────────────────────────────────────────────────────┘
```

### Mobile wireframe

```text
┌──────────────────────────────┐
│ YUPENG LU        halftone   │
│ [ giant upper-half type ]   │
│                              │
│ FIELD NOTES · ISSUE 00      │
│       (THINGS I KEEP        │
│        RETURNING TO)        │
│ [ COVER 1200 × 630 ]        │
│                              │
│ ENDLESS SECOND RING         │
│ A 48-SECOND BEIJING NIGHT   │
│ DRIVE.                      │
│ [ FILM 1200 × 720 / ENTER ] │
│ AI USAGE                    │
│ REAL MODEL HISTORY, MADE    │
│ PLAYABLE.                   │
│ [ AI USAGE 1200 × 720 /    │
│   PLAY ]                    │
│                              │
│ THREE ATTEMPTS. ONE        │
│ QUESTION: WHAT BELONGS     │
│ HERE?                      │
│ FROM THE FILM              │
│ 5E8F667 / RECOGNIZABLE     │
│ LANDMARKS                  │
│ B9EF619 / CLEAR THE        │
│ FORECOURT                  │
│ 520E83F / REPLACE THE      │
│ OLYMPIC SCENE              │
│ FILM RULE                  │
│ ARTISTIC COMPOSITION. NOT  │
│ FOR NAVIGATION.            │
│ GAME RULE                  │
│ HISTORY PATTERN. NOT MODEL │
│ CAPABILITY.                │
│ [ PROCESS 1200 × 720 ]      │
│                              │
│               [blue brush] │
│ OPEN A LINE                 │
│                              │
│ [ OPEN LINE 1200 × 360 /    │
│   native mailto anchor ]    │
└──────────────────────────────┘
```

The layout is a single responsive column. Images scale to the available width,
never crop essential text, and never rely on a desktop two-column table. The
SVGs remain pure display at every viewport. The three native outer anchors expose
whole-poster actions to focus, touch, keyboard, and pointer users; no hover-only
affordance or standalone text-link row exists.

The desktop and mobile wireframes use the same Process SVG. At its `1200px`
source width, the headline, every receipt caption/title (`RECOGNIZABLE
LANDMARKS`, `CLEAR THE FORECOURT`, and `REPLACE THE OLYMPIC SCENE`), both rules,
and all other body prose use a source font size of at least `60px`, which remains
`16px` equivalent at a `320px` GitHub render. Only the seven-character SHA
receipt identifiers (`5E8F667`, `B9EF619`, and `520E83F`) may use `54px`. If the
host cannot preserve the required reading size, Step 5 must use a viewBox/crop
within this same static SVG rather than ship a mobile-specific asset.

### Accessibility and degradation

- The five exact alts are frozen in README order: `Yupeng Lu. Field Notes, Issue
  00. Things I keep returning to.`; `Enter Endless Second Ring, a 48-second
  Beijing night drive.`; `Play AI Usage Chronicle, a bounded AI-tool history
  with sources, freshness, and limits disclosed.`; `Three independent film
  design attempts ask what belongs in one scene, beside two attributed rules:
  film is artistic composition, not navigation; game history pattern is not
  model capability.`; `Open a line with Yupeng by email.`
- Every SVG is pure display with no internal anchor, hit zone, fake button, or
  essential action. Film, AI Usage, and Open line each have exactly one native
  README outer anchor around the whole image; Cover and Process have none.
- With images disabled, the outer anchors expose their alt text as keyboard- and
  pointer-reachable fallback labels for the film, archive, and email targets;
  Cover and Process alts still preserve their meaning. No standalone text-link
  row is required.
- No essential information is handwritten-only. Marker annotations are repeated
  in body grotesk or frozen fallback text when they carry meaning.
- Color never carries the only distinction between an artifact, evidence, rule,
  or action. Focus is visible on every native link, and targets remain usable on
  keyboard and touch.
- Fixed paper remains legible in GitHub light and dark themes without a theme
  branch; reduced motion has no effect because the spreads do not animate.

### Non-goals and cuts

- No `/zine` route or separate publishing surface.
- No shared LOOP / LEDGER visual system, matched cards, or repeated road→node
  motif; those belong to the old unified brief or to the existing film/card.
- No anchor inside an SVG, fake button, or multi-region click promise. The three
  portal images use one native README outer anchor each; Cover and Process are
  plain images, and there are no standalone text-link rows.
- No dynamic service, API, live total, loading state, or automatically changing
  README image.
- No 3D scene, canvas, hover gallery, carousel, or interaction required to read
  the page.
- No resume wall, job-title hero, follower counter, stats grid, newsletter,
  booking funnel, or duplicate About biography.
- No edits to Endless Second Ring or AI Usage product code, generated cards, or
  runtime contracts under this Step 4 brief.
- The referenced local preview is only a mood prototype and contains the old
  false click affordances. It is not a release asset; Step 5 must redraw five
  independent spreads under this pure-display and frozen-fallback contract.

### Self-questioning

#### Why is the README itself canonical?

It is the durable discovery surface people already reach from GitHub work. It
keeps one low-maintenance, shareable issue in the same place as the repositories
without inventing a second route whose ownership would drift.

#### Why is this not `/about/`?

`/about/` remains the structured professional fallback and machine-readable
profile. Its biography semantics are useful for verification but would pull the
Human Zine back toward a résumé before the selected fragments can speak.

#### Why is there no unified visual system?

The film, usage game, and zine are independent media. Forcing their colors,
cards, or interaction grammar to match would make the index more legible at the
cost of making each artifact less truthful.

#### Where does the click affordance come from?

Each portal poster carries visible `ENTER`, `PLAY`, or `OPEN A LINE` copy as part of
its composition, and the README wraps that complete image in one native outer
anchor. The copy signals an invitation; the anchor supplies the actual route.
It is not a button and not a shared card, and the SVG itself remains pure
display.

#### Why is the Film/AI Usage split mandatory?

GitHub Profile Markdown cannot provide two dependable native hot zones or two
keyboard targets inside one image. A combined poster would force one ambiguous
destination or return to low-affordance text links. Two independent posters let
each whole image have one honest destination and make the route testable.

#### What do keyboard, alt, and image-failure users get?

The outer anchors are ordinary focusable links. Their image `alt` text names
the destination and remains the fallback label if the SVG does not load; Cover
and Process use plain-image alts because they are intentionally not clickable.
No internal SVG text is the sole source of meaning, and no hover state is
required.

#### Why are the process receipts better than author traits?

The three complete SHAs are independent film attempts in this repository, with
`buildOlympic` and `buildSecondRingThreshold` as source anchors. The external
AI Usage rule is attributed to `/Users/yupeng/Projects/ai-usage-report` at
`6bae0fa23492ece45ae49ad57093d4f003883215`, not to this repository. The two
rules state boundaries, not virtues. A visitor may infer the approved dimensions
from those materials; the README must not print them as self-congratulation.

#### What is deliberately removed?

The paired LOOP / LEDGER hero, repeated card seam, combined Film/AI Usage
poster, low-affordance standalone link rows, long role summary, dynamic
metrics, matched proof cards, résumé wall, hidden hover discovery, multi-hot-zone
image promises, fake buttons, self-labels, and any extra section that asks the
visitor to understand the portfolio before meeting the person.

### Step 4 approval gate

Status: **approved by the user on 2026-08-09; Step 5 implementation authorized**.
Step 5 may implement the README, five static SVG spreads, three native outer
anchors (Film, AI Usage, Open line), two plain images (Cover, Process), alt text,
fallback copy, and the necessary verifier in `BrickerP/BrickerP` only. A new
route, a dynamic service, standalone text-link rows, and product changes to
Loop / Endless Second Ring / AI Usage remain out of scope.
