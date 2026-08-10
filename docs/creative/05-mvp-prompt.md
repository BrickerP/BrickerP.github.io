# Human Zine — Step 5 implementation source

Status: **Step 5 active; implementation authorized by the user on 2026-08-09.**

This is the sole active Step 5 source. The July LOOP / LEDGER implementation
plan is historical and has no compatibility requirements. The first Human Zine
draft used one combined Artifact poster and standalone Markdown action rows;
creator dogfood falsified that interaction path. This source supersedes only
that active interaction portion while retaining the prior draft in git history.

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
one sparse README and five static spreads to make selected work and process
evidence understandable without turning the Profile into a résumé or a runtime.

### One journey

**cover → film portal → AI Usage portal → process spread → open line portal**

1. Recognize the person and issue.
2. Enter the film poster as one independent work.
3. Play the AI Usage poster as a separate independent work.
4. Inspect attributed process evidence.
5. Open the email portal.

### Product boundary

Product implementation happens only in `BrickerP/BrickerP`:

- `README.md`;
- `assets/human-zine-cover.svg`;
- `assets/human-zine-film.svg`;
- `assets/human-zine-ai-usage.svg`;
- `assets/human-zine-process.svg`;
- `assets/human-zine-open-line.svg`;
- `scripts/verify-profile.mjs`, only as necessary to verify this contract.

The five SVGs are hand-authored and precommitted; the script is a verifier, not
a generator. This repository, `BrickerP.github.io`, supplies documentation and
film evidence only. `BrickerP/ai-usage-report` supplies AI Usage evidence only.
Neither evidence repository receives Step 5 product changes.
The former `assets/human-zine-artifact.svg` must be deleted; do not retain an
alias, fallback asset, or compatibility layer.

### Non-goals

- No product edit to Loop / Endless Second Ring, AI Usage, or `/about/`.
- No `/zine` route, second site, new repository, service, API, generator,
  dependency, remote font, live metric, or theme-dependent asset.
- No LOOP / LEDGER compatibility layer, matched card system, dynamic card,
  animation, hover-only route, SVG anchor, multi-region image hit zone, or fake
  control. Film, AI Usage, and Open line are each one native README outer
  anchor around the whole poster; Cover and Process are plain images.
- No extra biography, trait label, chart, before/after story, or generated
  pseudo-diff.

## Scope Cop

### Keep

- One README, one ordered journey, and exactly five full-width SVG spreads.
- The exact Step 4 copy, five alt strings, and three native outer anchors.
- Three independent film receipts and two attributed medium rules.
- Fixed-paper rendering, `320px` readability, image-failure fallback, and remote
  verification.

### Cut

- The July LOOP / LEDGER plan and all three-repository product coordination.
- Any internal SVG action, responsive alternate asset, runtime data, standalone
  text-link row, or visual reconciliation of the film, game, and zine.
- Any file outside the seven-file `BrickerP/BrickerP` boundary above.

### Defer

- Visitor research and analytics beyond the approved self-check.
- New Profile issues, additional spreads, alternate editions, and new personal
  fragments.
- Product work in Loop, AI Usage, and About.

## Acceptance contract

### Five precommitted assets

| File | Exact dimensions | Exact `viewBox` |
| --- | ---: | --- |
| `assets/human-zine-cover.svg` | `1200 × 630` | `0 0 1200 630` |
| `assets/human-zine-film.svg` | `1200 × 720` | `0 0 1200 720` |
| `assets/human-zine-ai-usage.svg` | `1200 × 720` | `0 0 1200 720` |
| `assets/human-zine-process.svg` | `1200 × 720` | `0 0 1200 720` |
| `assets/human-zine-open-line.svg` | `1200 × 360` | `0 0 1200 360` |

The Cover composition is fixed: giant `YUPENG LU` across the upper half,
`FIELD NOTES · ISSUE 00` at lower left, the signal-red circled `THINGS I KEEP
RETURNING TO` at lower right, and the approved crop/halftone treatment across
the upper/right field. The issue title must not dominate the left middle. The
Open-line composition is also fixed: giant left-aligned `OPEN A LINE`, a cobalt
brush mark at upper right, and generous empty paper; it is never centered.

Each SVG is self-contained, hand-authored, committed beside the README, and
embedded full-width in one column. Each is pure display: no `<a>`, `<script>`,
event handler, animation element or CSS animation, interactive region, fake
button, `href`, `xlink:href`, or remote resource. The README wraps the complete
Film, AI Usage, and Open line `<img>` in exactly one native outer `<a>` each;
Cover and Process are not anchors. There is no build-time or runtime generation.

The visible poster affordance is composition, not a control: Film includes
`ENTER`, AI Usage includes `PLAY`, and Open line includes `OPEN A LINE`.
The outer anchor supplies the route. This is not a button or shared card, and a
single image never promises two hot zones. Splitting Film and AI Usage is
required because GitHub Profile Markdown cannot provide two reliable native
targets or keyboard destinations inside one image.

### Frozen visible copy

Capitalization and punctuation must match Step 4 exactly:

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

Within Film, `ENDLESS SECOND RING`, `A 48-SECOND BEIJING NIGHT DRIVE.`, and
`ENTER` each appear exactly once. Within AI Usage, `AI USAGE`, `REAL MODEL
HISTORY, MADE PLAYABLE.`, and `PLAY` each appear exactly once. Process begins
with the question and `FROM THE FILM`; it must not repeat `AI USAGE`.

The README plus SVGs contain no more than **85 visible words**, including native
link labels. Alt text and non-visible accessibility metadata are excluded. No
other visible heading, caption, fallback sentence, metric, date, or label is
added.

### README order, alts, and native links

1. Cover alt: `Yupeng Lu. Field Notes, Issue 00. Things I keep returning to.`
2. Film alt: `Enter Endless Second Ring, a 48-second Beijing night drive.` The
   complete `<img>` is wrapped in one native outer `<a
   href="https://brickerp.github.io/">`.
3. AI Usage alt: `Play AI Usage Chronicle, a bounded AI-tool history with
   sources, freshness, and limits disclosed.` The complete `<img>` is wrapped in
   one native outer `<a href="https://brickerp.github.io/ai-usage-report/">`.
4. Process alt: `Three independent film design attempts ask what belongs in one
   scene, beside two attributed rules: film is artistic composition, not
   navigation; game history pattern is not model capability.` It is a plain
   `<img>` with no anchor.
5. Open line alt: `Open a line with Yupeng by email.` The complete `<img>` is
   wrapped in one native outer `<a href="mailto:yplmicro@gmail.com">`.

The three outer anchors are the only action surfaces. Their image `alt` text is
the keyboard and image-failure fallback; Cover and Process remain meaningful
plain images. Do not add a standalone text-link row, button, shared card, or
internal SVG anchor.

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
  mobile-specific asset. In Process, every receipt caption/title
  (`RECOGNIZABLE LANDMARKS`, `CLEAR THE FORECOURT`, and `REPLACE THE OLYMPIC
  SCENE`), each rule, the headline, and all body prose are at least `60px` at
  source size. Only the short SHA identifiers `5E8F667`, `B9EF619`, and
  `520E83F` may use `54px`.
- Every asset starts with an opaque `#F4F0E3` paper field covering its viewBox.
  Light and dark GitHub themes render the same paper, ink, and contrast.
- No `prefers-color-scheme`, inherited theme color, animation, hover, or hidden
  state is required. Native links retain browser focus, keyboard, touch, and
  pointer behavior.

### Verification and release gate

`scripts/verify-profile.mjs` uses only Node built-ins to fail on any dimension,
viewBox, asset count/order, Cover/Open-line layout invariant, Process typography
minimum, copy order/uniqueness, Process `AI USAGE` repetition, alt, link,
word-budget, receipt, attribution, paper-field, or prohibited-SVG violation
above. It must also enforce the five-file order, exactly one outer anchor for
Film, AI Usage, and Open line, no anchor for Cover or Process, the three exact
destinations, and no standalone action-link rows. It must not generate or
rewrite an asset.

- Do not install dependencies or run a local compile, build, or test. The only
  local check is `git diff --check`.
- Push the exact seven-file implementation to a remote branch and open a PR in
  `BrickerP/BrickerP`.
- Remote CI must run the verifier and finish green for the pushed full SHA.
- Read back the README and five SVG blobs from that exact remote commit. After
  merge/publication, read back the rendered GitHub Profile, verify all native
  destinations, and confirm the fixed paper and readable layout in light and
  dark themes before claiming the Human Zine live.

## 2026-08-10 Step 5 override — A Profile with Memory

Status: **implementation authorized by the user on 2026-08-10.** This section is
the sole active Step 5 source. It supersedes the seven-file clickable-portal
implementation above as the next change while retaining that shipped contract
as history.

### Exact implementation boundary

Implementation happens only in `BrickerP/BrickerP` and changes exactly these
five files:

| File | Responsibility |
| --- | --- |
| `README.md` | Present one free-form current intrusion and wrap the whole image in one native relative link to `experiments/001-a-profile-with-memory/`. Do not add a fixed `CURRENT OBSESSION` card or `PAST FIXATIONS` in issue 001. |
| `assets/a-profile-with-memory.svg` | One static, pure-display intrusion for issue 001, using torn, misregistered, visibly stitched fragments grounded in the four approved Profile commits. |
| `experiments/README.md` | Keep the evolving experiment index and link issue 001. It is not a template, feed, schedule, or generated manifest. |
| `experiments/001-a-profile-with-memory/README.md` | Record `A PROFILE WITH MEMORY`, the question `HOW MANY PAST SELVES SHOULD A PROFILE REMEMBER?`, and the real evidence chain `91a7a77` → `35aa305` → `b130094` → `d71f9f3`. |
| `scripts/verify-profile.mjs` | Verify the README portal, issue path, one-SVG boundary, exact question and commit identifiers, and prohibited automation/template paths. It remains a verifier, never a generator. |

No other README asset, product repository, runtime, or deployment mechanism is
in scope. Do not add a compatibility layer for the five-spread layout, a second
current-entry path, a template, publishing cadence, API, cron job, generator, or
dynamic service. `PAST FIXATIONS` is deferred until issue 002 creates a real
past/current distinction.

### Evidence contract

The product must derive its visible history from the four real commits on the
Profile repository's `main` ancestry:

- `91a7a77faf8492d1aaedd975cca404dc3890657e`;
- `35aa3052a2765879a5c0973260f11042b81ca55e`;
- `b130094cb5f273bbb20cec5cff163eafb511f638`;
- `d71f9f3c92a1c615d6b49a59da9bf1f40ddfffb1`.

The torn/misregistered/stitched treatment may edit scale, crop, overlap, and
registration, but it must not invent a Profile state, commit, sequence, or
receipt. The image-generation preview is mood/reference only and is neither a
release asset nor proof. The issue README names the evidence plainly enough for
a visitor to inspect it.

## 2026-08-10 Step 5 override — Found experiments

Status: **implementation authorized by the user on 2026-08-10.** This is the
sole active Step 5 source. It supersedes the five-file boundary above while
preserving the shipped issue 001 detail and memory SVG unchanged.

Current implementation baseline: `BrickerP/BrickerP` `main` at
`e2cb7525eb656a5c4fafbbe87a9e1798eabc6df7`. At that baseline the Profile memory
portal opens issue 001 directly and `experiments/README.md` contains only the
issue 001 text entry.

### Exact seven-file implementation boundary

Implementation happens only in `BrickerP/BrickerP` and changes exactly these
seven files:

| File | Responsibility |
| --- | --- |
| `README.md` | Keep the existing six-spread order and existing `assets/human-zine-memory.svg`; change that image's sole local outer-anchor destination to `experiments/README.md` and update its alt to identify the Thought Experiments archive, current issue, and found experiments. Add no spread, image, or second experiment entry on the Profile root. |
| `experiments/README.md` | Keep issue 001 as the current numbered issue, then present `FOUND EXPERIMENTS / BEFORE ISSUE 001` with exactly two whole-image native portals: Get-Date-Love first and quant-trading second. Include the fixed private-history verification limitation below. Do not add `PAST FIXATIONS`. |
| `experiments/found/get-date-love/portal.svg` | Hand-author one pure-display anonymous-communication case-file portal. It is not a screenshot or a generated raster wrapper. |
| `experiments/found/get-date-love/README.md` | Publish only the approved high-level case-file framing and private-source boundary; include no original repository link, conversation, identity, configuration, metric, or claimed result. |
| `experiments/found/quant-trading/portal.svg` | Hand-author one pure-display continuous-form, perforated research-sheet portal, visually distinct from the case file. |
| `experiments/found/quant-trading/README.md` | Publish only the approved paper-research framing and private-source boundary; include no original repository link, screenshot, source/configuration detail, identity data, metric, return, revenue, performance, or live-production claim. |
| `scripts/verify-profile.mjs` | Extend the existing read-only verifier with the archive, classification, privacy, and distinct-portal semantic gates below. It remains a verifier and never creates or rewrites content. |

Do not modify `assets/human-zine-memory.svg`,
`experiments/001-a-profile-with-memory/README.md`, another existing Human Zine
asset, a product repository, or a deployment mechanism. Do not add an issue
directory or label numbered `000`, `002`, or `003`; the found paths above are
deliberately unnumbered. Delete no shipped issue-001 evidence.

### Archive and visible-copy contract

The archive index keeps one ordinary current entry for
`001 — A Profile With Memory`. Beneath it, the exact section label is:

```text
FOUND EXPERIMENTS / BEFORE ISSUE 001
```

The existing root memory image receives destination-oriented alt text. It must
include `Thought Experiments archive` and communicate that the destination
contains current issue 001 plus found experiments. For example:

```text
Open the Thought Experiments archive: current issue 001 and found experiments
from before issue 001.
```

The verifier checks those destination semantics, not the exact full alt string.

Immediately beneath the archive section label, the public index includes this
exact limitation:

```text
The before-issue-001 classification is author-reported from private source
history and is not independently verifiable from this public page.
```

Each found portal is one complete `<img>` wrapped by one native relative outer
anchor to its sibling `README.md`. The portal alts identify the work, editorial
form, and destination without exposing private evidence. There is no internal
SVG anchor, drawn button, second hot zone, or standalone action-link row.

Each portal is exactly `1200 × 720` with `viewBox="0 0 1200 720"`. The allowed
portal copy and archive alt are intentionally qualitative:

- Get-Date-Love: `FOUND EXPERIMENT`, `GET-DATE-LOVE`, `ANONYMOUS COMMUNICATION
  CASE FILE`, and `ENTER THE CASE FILE`; alt: `Enter Get-Date-Love, a found
  anonymous-communication case file from before issue 001.`
- quant-trading: `FOUND EXPERIMENT`, `QUANT-TRADING`, `CONTINUOUS-FORM RESEARCH
  SHEET`, `PAPER RESEARCH. NOT INVESTMENT PERFORMANCE.`, and `ENTER THE
  RESEARCH SHEET`; alt: `Enter quant-trading, a found paper-research sheet from
  before issue 001.`

The two detail pages use exactly this public-safe body, with the matching title
and subsection selected for each file:

```text
# Get-Date-Love
[← Thought Experiments](../../README.md)
## Anonymous communication case file
An anonymous-communication experiment recovered from before issue 001.
The source repository remains private. This public case file contains no source
link, screenshot, conversation, identity, configuration, or metric.

# quant-trading
[← Thought Experiments](../../README.md)
## Continuous-form research sheet
A paper-research experiment recovered from before issue 001.
The source repository remains private. This public research sheet contains no
source link, screenshot, source or configuration detail, identity data, metric,
return, revenue, performance, or live-production claim.
```

No date, count, percentage, currency, score, account, person, location,
conversation excerpt, source path, configuration value, or operational state is
added to either portal or detail page beyond the required `ISSUE 001`
classification. The approved project names are labels, not links to their
private repositories.

### Pure-SVG and privacy gate

Both portal SVGs are precommitted, self-contained, fixed-viewBox display
documents with one `<title>`, one `<desc>`, an opaque background, and readable
essential copy at approximately `320px`. They contain no `<image>`, `<a>`,
`<script>`, `<style>`, `<foreignObject>`, animation element, event handler,
interactive role, remote URL/resource, font import, theme branch, or generated
text.

The image-generation previews named in Step 4 are review-only mood references.
They are not copied, embedded, traced as evidence, committed, or served.

### Verifier semantic gate

Using Node built-ins only, `scripts/verify-profile.mjs` must fail unless all of
the following are true:

1. the Profile root retains its existing six images and order, contains exactly
   one local experiment anchor, reuses `assets/human-zine-memory.svg`, and sends
   that anchor to `experiments/README.md`; its alt identifies the Thought
   Experiments archive and communicates both current issue 001 and found
   experiments without requiring one exact sentence;
2. the archive contains exactly one numbered issue entry (`001`) plus exactly
   two found portals in the approved order and relative destinations, with no
   issue label/path `000`, `002`, or `003` and no `PAST FIXATIONS`; it states
   that the classification is author-reported from private source history and
   is not independently verifiable from the public page;
3. both found portal targets and both SVG sources resolve inside
   `experiments/found/`, and each whole image has exactly one outer anchor while
   neither SVG contains an interactive or embedded element;
4. Get-Date-Love contains the approved case-file semantics and excludes the
   Quant-only research-sheet semantics; quant-trading contains the approved
   perforated research-sheet semantics and excludes the case-file/redaction
   semantics;
5. the portal and detail-file public corpus contains only the approved
   qualitative copy and privacy statements, contains no external URL or
   embedded image, and contains no private evidence or quantitative/performance
   claim; the archive limitation preserves both the private-source and
   not-publicly-verifiable meanings; and
6. the verifier performs reads and assertions only. It does not create a
   template, generator, manifest, API, cron path, schedule, migration, or
   compatibility layer.

Do not install dependencies or run a local compile, build, or test. The local
documentation check remains `git diff --check`; product verification runs in
remote CI on the eventual Profile implementation branch.
