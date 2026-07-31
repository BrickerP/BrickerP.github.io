# GitHub Profile refinement — Step 5 implementation source

Status: approved for implementation on 2026-07-31

The user explicitly requested the complete approved design rather than a
reduced visual MVP. The implementation remains a small vertical slice because
it coordinates only three existing static surfaces.

## Prompt Architect

### Problem

The current GitHub Profile contains two strong works but presents them as small
side-by-side cards within a recruiter-first narrative. Visitors do not retain
one distinctive creator identity, and the smallest SVG text loses readability
on narrow screens.

### Primary user

An AI builder or creative technologist deciding whether to explore the work,
follow the practice, or start a collaboration conversation.

### Goal

Ship one end-to-end Profile journey:

**recognize LOOP / LEDGER → choose one full-width artifact → inspect it → open
an email conversation → optionally inspect breadth and background.**

### Must ship

1. A standalone LOOP 01 card without a faux internal button.
2. Generated LEDGER 02 light/dark cards with dynamic data and unchanged
   measurement semantics.
3. A Profile README using the approved sparse hierarchy and full-width stacked
   cards.
4. Qualitative image alternatives, native link focus, and image-disabled
   semantic fallback.
5. Existing GitHub Pages and AI Usage publication mechanisms only.

### Non-goals

- Changing AI Usage totals, cache calculation, tool colors, source collection,
  chart interaction, or report data.
- Changing the Beijing runtime, animation, controls, or About page.
- Adding a service, dependency, remote font, custom Profile CSS, dynamic
  endpoint, newsletter, feed, counter, badge, portrait, or GitHub widget.
- Repackaging professional history as new marketing claims.

### Acceptance criteria

- Profile reads `LOOP / LEDGER`, `Strange loops. Open ledgers.`, and
  `OPEN A LINE — EMAIL YUPENG`.
- LOOP and LEDGER appear as two full-width vertically stacked chapters.
- Each SVG is `560 × 160`, self-contained, titled/described, and contains
  exactly one vermilion handoff node.
- LOOP contains no drawn CTA.
- LEDGER values are generated from `usage.json`; light/dark cards retain
  recorded totals, range, cache disclosure, weekly tool stacks, and legend.
- Profile surrounding prose contains no copied dynamic total or date.
- Images-disabled and keyboard-only paths retain every essential destination.
- The Profile README, Loop Pages asset, and AI Usage Pages assets are read back
  from their public destinations after publication.

### Risks

- GitHub Profile Markdown has limited responsive control; avoid tables and
  custom layout assumptions.
- GitHub image caching can delay visible LEDGER refresh even after the public
  SVG URL has updated.
- The three repositories can publish at different times; verify each deployed
  artifact independently before claiming the whole journey is live.

## Scope Cop

### Keep

- One identity hook.
- Two full-width static artifact cards.
- One email CTA.
- Three stable breadth links.
- One collapsed professional-background disclosure.
- Existing generation and deployment pipelines.

### Cut

- Literal cross-image line alignment.
- Side-by-side card layout.
- Faux SVG controls.
- Repeated link row and full-scene poster.
- Project mini-case studies and duplicated career copy.
- Any new live surface.

### Defer

- A recent-work feed.
- Additional LOOP / LEDGER chapters.
- A custom website version of the Profile composition.
- Analytics for Profile click-through or contact conversion.

## Builder source of truth

| Surface | Owned change |
| --- | --- |
| `BrickerP.github.io` | LOOP SVG and its static contract |
| `ai-usage-report` | LEDGER generator, focused test, generated light/dark SVGs |
| `BrickerP/BrickerP` | Profile README narrative and responsive image structure |

Do not change any file outside these contracts unless a targeted check proves
the implementation cannot be completed without it.

## Reviewer checklist

- Compare the final diff against Must ship and Non-goals.
- Run one targeted check per changed repository; do not repeatedly rebuild.
- Confirm no unrelated worktree files are staged.
- Bind each deployment claim to the exact pushed commit and a public read-back.
