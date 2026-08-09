# Human Zine — Step 6 dogfood

Status: **completed on 2026-08-09.**

The live GitHub Profile passed the executable self-dogfood checks below. This
was operational verification, not participant research: automated self-dogfood
does **not** validate whether real visitors infer personality or creative
judgment from the issue.

## Script 1 — first visitor, fresh session

### Script

1. Open <https://github.com/BrickerP> in a fresh browser session.
2. Confirm the author is visible in the first viewport.
3. Scroll once by `701px` and choose each work in turn.
4. Return to the Profile after the first work, then inspect the four spreads and
   browser console.

### Live result

- The author was visible in the first viewport.
- One `701px` scroll revealed two visibly distinct works.
- `WATCH FILM →` returned HTTP `200`, title `Beijing — Endless Second Ring`, in
  `1772ms`.
- After returning to the Profile, `PLAY ARCHIVE →` returned HTTP `200` with the
  title `BrickerP AI Usage Chronicle` in `2304ms`.
- All four SVG requests returned HTTP `200`; there were no broken images and no
  console errors.

Result: **PASS**.

## Script 2 — mobile

### Script

1. Open the live Profile at `320 × 844` and `390 × 844`.
2. Compare `document.documentElement.scrollWidth` with `clientWidth`.
3. Inspect each SVG's completion state and natural dimensions.
4. Exercise the artifact links and the Email, Resume, and GitHub actions.

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
- The native work and contact links remained visible and operable. Email kept
  its `mailto:` behavior, Resume opened the PDF destination, and GitHub opened
  the expected profile destination.
- Browser zoom is **NOT_RUN** because gstack exposes no zoom command; this is a
  recorded tool limitation, not a passed zoom claim.

Result: **PASS** for both available viewport scripts.

## Script 3 — recruiter route

### Script

1. Open the Profile at `1440 × 1000`.
2. Confirm role and location are available at the top.
3. Use two `PageDown` actions and inspect the contact row.
4. Verify Email, Resume, GitHub, and the Website fallback.

### Live result

- Role and location were visible at the top of the Profile.
- The contact row was visible after two `PageDown` actions.
- Email exposed the expected `mailto:yplmicro@gmail.com` href.
- Resume returned HTTP `200`, `application/pdf`, `50,918` bytes, and `2` pages.
- GitHub resolved to <https://github.com/BrickerP>.
- Website retained the structured `personal-intro` fallback.

Result: **PASS**.

## Severity and disposition

There are no P0 or P1 findings, and Step 6 requires no product fix.

| P2 observation | Evidence | Disposition |
| --- | --- | --- |
| Native links render about `17px` high, below the `44px` touch-target guidance. | They are underlined, keyboard reachable, and operable in both mobile viewports. | Defer; keep GitHub-native links. |
| Contact requires two `PageDown` actions at `1440 × 1000`. | Artifact and process evidence intentionally precede contact. | Defer; preserve the approved editorial hierarchy. |
| AI Usage reports `2 sources delayed`. | The archive discloses its own source freshness rather than hiding it. | Defer as a separate transparency/operations item. |
| The structured Website fallback takes one icon action to open. | Role, location, Resume, Email, and GitHub remain directly available from the Profile. | Defer; do not duplicate professional prose in the zine. |

## Cold-start path

The existing live flow is the cold start:

**Open Profile → one scroll → choose `WATCH FILM` or `PLAY ARCHIVE` → continue
to `OPEN A LINE`.**

No new explanatory prose is warranted; adding it would violate the approved
Human Zine word budget.

Temporary screenshot runtime paths produced during the session are evidence
for that session only. No screenshot binaries are committed to the repository.

## Completion checklist

- First-visitor live journey: **PASS**
- `320 × 844` and `390 × 844` responsive geometry: **PASS**
- Four live SVGs and browser console: **PASS**
- Artifact/contact links and recruiter route: **PASS**
- P0/P1 remediation: **PASS — none required**
- Browser zoom: **NOT_RUN — gstack has no zoom command**
- Real-human qualitative inference: **NOT_VALIDATED**

All executable Step 6 checks passed. The only unanswered product question is
whether real first-time visitors infer a specific person, creative judgment,
and range from the evidence; that requires Step 7 participants.
