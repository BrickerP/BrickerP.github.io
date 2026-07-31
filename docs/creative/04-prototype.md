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
