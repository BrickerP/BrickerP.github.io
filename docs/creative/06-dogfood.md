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
