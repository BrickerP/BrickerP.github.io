# Human Zine — Step 6 dogfood

Status: **corrective dogfood failed on 2026-08-09; the previous mechanical
baseline is retained below for traceability but is superseded for interaction
affordance.**

The live GitHub Profile passed the executable self-dogfood checks below. This
was operational verification, not participant research, and it did not expose
the primary-path affordance failure found by creator dogfood. The old
four-spread combined Artifact and standalone action rows are no longer the
active contract; Step 5 must ship the five-spread clickable-portal correction
before any real visitor test resumes.

## Creator dogfood — clickable visual portal failure

### Script

1. Open the live Profile as the creator in a fresh session.
2. Treat the visually dominant Film/AI Usage and Open line spreads as the
   likely entry points, without reading implementation notes first.
3. Try to enter each work from the poster itself, then inspect the text below
   the image only if the poster does not feel actionable.

### Result

- The combined Artifact poster did not make two destinations feel like two
  separate visual portals; the low-salience Markdown action row below it became
  the actual route.
- The Open line poster likewise read as a static image followed by text rather
  than a clickable visual invitation.
- This is a **FAIL — primary-path affordance**, not a participant-recall
  result. The main path is visually present but not behaviorally discoverable.

### Required correction

Replace the combined Artifact and every standalone action row with five
independent spreads: Cover, Film, AI Usage, Process, and Open line. Wrap the
complete Film, AI Usage, and Open line images in one native README outer anchor
each; keep Cover and Process plain. The posters must carry visible `ENTER`,
`PLAY`, and `OPEN A LINE` copy as composition while the SVGs remain pure
display. Verify keyboard focus, image `alt` fallback, exact destinations, and
the absence of old text-link rows before declaring dogfood recovered.

## Historical mechanical baseline — superseded

The following checks were green for the prior four-spread implementation. They
prove HTTP, rendering, and recruiter-route health only; they do not override the
creator-dogfood failure above and must not be reused as proof of the clickable
portal correction.

## Script 1 — first visitor, fresh session

### Script

1. Open <https://github.com/BrickerP> in a fresh browser session.
2. Confirm the author is visible in the first viewport.
3. Scroll once by `701px` and choose each work in turn.
4. Return to the Profile after the first work, then inspect the four historical
   spreads and
   browser console.

### Live result

- The author was visible in the first viewport.
- One `701px` scroll revealed two visibly distinct works.
- The former film destination returned HTTP `200`, title `Beijing — Endless
  Second Ring`, in `1772ms`.
- After returning to the Profile, the former archive destination returned HTTP
  `200` with the title `BrickerP AI Usage Chronicle` in `2304ms`.
- All four SVG requests returned HTTP `200`; there were no broken images and no
  console errors.

Result: **PASS**.

## Script 2 — mobile

### Script

1. Open the live Profile at `320 × 844` and `390 × 844`.
2. Compare `document.documentElement.scrollWidth` with `clientWidth`.
3. Inspect each SVG's completion state and natural dimensions.
4. Exercise the historical artifact and contact destinations.

### Live result

| Check | `320 × 844` | `390 × 844` |
| --- | --- | --- |
| Horizontal geometry | `scrollWidth == clientWidth == 320` | `scrollWidth == clientWidth == 390` |
| Cover | complete; natural `1200 × 630` | complete; natural `1200 × 630` |
| Artifact | complete; natural `1200 × 720` | complete; natural `1200 × 720` |
| Process | complete; natural `1200 × 720` | complete; natural `1200 × 720` |
| Open line | complete; natural `1200 × 360` | complete; natural `1200 × 360` |

- No horizontal overflow or clipped spread content was observed at either
  viewport.
- The native work and contact destinations remained visible and operable. The
  mailto behavior, PDF destination, and expected profile destination all
  resolved.
- Browser zoom is **NOT_RUN** because gstack exposes no zoom command; this is a
  recorded tool limitation, not a passed zoom claim.

Result: **PASS** for both available viewport scripts.

## Script 3 — recruiter route

### Script

1. Open the Profile at `1440 × 1000`.
2. Confirm role and location are available at the top.
3. Use two `PageDown` actions and inspect the contact row.
4. Verify the historical contact destinations and the Website fallback.

### Live result

- Role and location were visible at the top of the Profile.
- The contact row was visible after two `PageDown` actions.
- The email action exposed the expected `mailto:yplmicro@gmail.com` href.
- The PDF destination returned HTTP `200`, `application/pdf`, `50,918` bytes,
  and `2` pages.
- The profile destination resolved to <https://github.com/BrickerP>.
- Website retained the structured `personal-intro` fallback.

Result: **PASS**.

## Severity and disposition

There are no P0 or P1 findings, and Step 6 requires no product fix.

| P2 observation | Evidence | Disposition |
| --- | --- | --- |
| Native links render about `17px` high, below the `44px` touch-target guidance. | They are underlined, keyboard reachable, and operable in both mobile viewports. | Defer; keep GitHub-native links. |
| Contact requires two `PageDown` actions at `1440 × 1000`. | Artifact and process evidence intentionally precede contact. | Defer; preserve the approved editorial hierarchy. |
| AI Usage reports `2 sources delayed`. | The archive discloses its own source freshness rather than hiding it. | Defer as a separate transparency/operations item. |
| The structured Website fallback takes one icon action to open. | Role, location, and the three historical contact destinations remain directly available from the Profile. | Defer; do not duplicate professional prose in the zine. |

## Cold-start path

The existing live flow is the cold start:

**Open Profile → one scroll → choose a visual work portal → continue to the
Open line portal.**

No new explanatory prose is warranted; adding it would violate the approved
Human Zine word budget.

Temporary screenshot runtime paths produced during the session are evidence
for that session only. No screenshot binaries are committed to the repository.

## Completion checklist

- First-visitor live journey: **PASS**
- `320 × 844` and `390 × 844` responsive geometry: **PASS**
- Four historical live SVGs and browser console: **PASS**
- Historical artifact/contact destinations and recruiter route: **PASS**
- P0/P1 remediation: **PASS — none required**
- Browser zoom: **NOT_RUN — gstack has no zoom command**
- Real-human qualitative inference: **NOT_VALIDATED**

All executable Step 6 checks passed. The only unanswered product question is
whether real first-time visitors infer a specific person, creative judgment,
and range from the evidence; that requires Step 7 participants.

## Current recovery gate

The clickable-portal implementation and live readback are **NOT_RUN** in this
documentation-only correction. Do not resume the five-person visitor test or
call the Human Zine ready for participants until the exact remote Profile
commit proves five spreads, three whole-image outer anchors, two plain images,
keyboard focus, image-failure alt fallback, exact destinations, and no
standalone action-link rows.

## 2026-08-10 five-person feedback readback

Five people saw the shipped Profile. The common reaction was positive, with a
recurring qualification that it felt slightly simple or sparse. This is useful
directional feedback: the visual portals work well enough to preserve as a
historical issue, while the next experiment needs a richer idea rather than more
decoration on the same layout.

This was informal qualitative feedback, not the queued 90-second protocol. No
per-participant answers, evidence citations, task outcomes, or scored counts were
recorded. Therefore it does **not** satisfy the earlier `4/5` recall or `3/5`
specific-action thresholds, and it must not be reported as quantitative
acceptance. “Generally liked, but slightly simple” is the complete supported
claim.

The feedback closes the need to keep waiting before choosing a next creative
question; it does not validate a permanent layout. The approved response is the
`A PROFILE WITH MEMORY` current intrusion and `experiments/` archive recorded in
Steps 4 and 5, not a fixed `CURRENT OBSESSION` card.

## 2026-08-10 Found experiments live dogfood

Status: **PASS.** The Found Experiments release is merged on
`BrickerP/BrickerP` `main` at
`1b2d47a817d02cbb8b3c70c23f2c0b2b4ee377cc` and was checked against the live
GitHub Profile at desktop width `1440px` and mobile width `320px`.

### Exact live journey

The verified route was:

**Profile root (six images) → memory portal → Thought Experiments archive.**

- The root retained exactly six images, and the existing memory image opened
  the archive instead of adding another root spread.
- The archive presented current issue 001 first, followed by Get Date Love and
  Quant Trading; this records display order, not a click through issue 001.
- The Get Date Love portal opened its matching detail page and returned through
  its archive backlink. The Quant Trading portal independently opened its
  matching detail page and returned through its archive backlink.
- Both found portal SVGs reported natural dimensions of `1200 × 720`.

### Rendering and runtime checks

- Neither the `1440px` desktop route nor the `320px` mobile route produced
  horizontal overflow.
- No image was broken, no checked request returned status `>= 400`, and no
  product console error appeared.
- One analytics request was aborted. It did not affect the Profile, archive,
  portal, detail, or backlink journey and is recorded as a non-product failure.
- gstack could not start twice because its headless-shell runtime was missing.
  The live checks therefore used an isolated system Chrome fallback rather than
  reporting the unavailable gstack run as a pass.

### Severity and disposition

P0: **none.** P1: **none.** P2: **none.** No product correction follows from
this dogfood pass.

This evidence verifies the shipped navigation and rendering only. It does not
invent a publication cadence or claim that the private source history is
publicly verifiable.
