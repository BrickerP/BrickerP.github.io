# GitHub Profile refinement — Brainstorm

Status: approved on 2026-07-31

## Hypothesis

Confidence: 82%.

The next improvement is not adding more decoration to either SVG card. It is
turning the rest of the Profile into one coherent signature: a builder who
creates systems people can enter and systems people can audit.

## How Might We

How might we let a visitor understand that signature within five seconds,
choose one of the two flagship works, and still discover credible engineering
depth without turning the Profile back into a wall of text or badges?

## Not for

- People looking for a complete resume inside GitHub.
- Badge, trophy, language-chart, or contribution-widget collectors.
- A social feed that needs daily manual maintenance.
- A dynamic card service with another cache, endpoint, or uptime burden.
- Visitors who need every private project or technology enumerated.

## Variants explored

1. **The diptych** — make “Enter” and “Audit” the two permanent halves of the
   identity; everything else becomes supporting evidence.
2. **The operator's log** — foreground what is being built now, followed by a
   compact live ledger and a small archive.
3. **The museum label** — treat each flagship work like an exhibit with one
   sentence, one artifact, and one entrance.
4. **The living changelog** — show the latest meaningful build or release;
   fresh, but creates maintenance pressure.
5. **Proof before biography** — use a few live facts as credibility anchors;
   useful, but easily slips into vanity metrics.
6. **The builder's principles** — expose three short working beliefs instead
   of another skills list; memorable, but the copy must feel earned.
7. **The one-screen profile** — keep the authored README above the fold and
   let pinned repositories and the contribution graph handle the archive.

## Three directions

### A. Enter / Audit diptych — recommended

- **User value:** immediate recognition and a clear choice between two works.
- **Feasibility:** high; the two-card foundation already exists.
- **Difference:** the profile reads like one authored body of work, not a
  collection of GitHub widgets.
- **Hidden assumption:** visitors will understand the conceptual contrast
  without a long explanation.
- **Likely refinement:** preserve the cards, sharpen the line above them, then
  reduce the lower half to “Now” plus three compact proof links.

### B. Living operator's log

- **User value:** communicates active practice rather than a static portfolio.
- **Feasibility:** medium; AI Usage can stay automatic, but “Now” needs a clear
  update rule.
- **Difference:** feels like a public working notebook.
- **Hidden assumption:** visible recency matters more than a timeless identity.

### C. AI creator studio

- **User value:** makes the person, point of view, and ways to follow or
  collaborate more prominent.
- **Feasibility:** high for copy and structure.
- **Difference:** closer to an AI creator landing page than an engineering CV.
- **Hidden assumption:** audience-building is the primary job of the Profile.

## Recommendation

Choose **A: Enter / Audit diptych**, and borrow only one element from C: a
short, human point of view. Keep AI Usage as the living proof, keep the Loop
card timeless, and avoid adding another auto-updating surface.

## Assumptions to validate

- Confirmed: the primary audience is AI builders and creative technologists;
  recruiters are a secondary audience.
- The Profile's job is recognition and routing, not exhaustive proof.
- Two flagship works are stronger than six equal project tiles.
- “Selected systems” should support the signature rather than start a second
  portfolio below it.
- A stable Loop card is more valuable than a frequently refreshed thumbnail.

## 2026-08-09 brand-system audit

Status: rejected by the user on 2026-08-09. The convergence premise is
superseded by the divergence reset below; no implementation is authorized by
this section.

### Hypothesis

BrickerP already reads as one creator at roughly 70% confidence: the shared
night palette, instrument-like rules, monospace metadata, public evidence, and
`LOOP / LEDGER` naming are coherent. The missing 30% is not a new visual theme.
It is authorship, routing, and a plain explanation of why these two very
different artifacts belong together.

**How might we make a visitor recognize one AI builder across GitHub Profile,
Endless Second Ring, and AI Usage within five seconds, while allowing each
artifact to keep its own world?**

This is not for:

- visitors seeking a conventional resume-first portfolio;
- turning AI Usage back into a Beijing-road experience;
- making Endless Second Ring the logo or visual theme for every project;
- forcing GitHub, the animation, and the archive into one layout or motion
  system;
- adding a third auto-updating profile surface or a site-wide runtime package.

### Current-source readback

- GitHub Profile is the strongest bridge today: `Yupeng Lu / BRICKERP`,
  `Strange loops. Open ledgers.`, `01 / LOOP`, and `02 / LEDGER` already form a
  memorable index.
- Endless Second Ring is a cinematic artifact with a well-labelled control
  bar, but its creator/work entry is an icon and the intro opens with job and
  sponsorship framing before collaboration intent.
- AI Usage is the strongest interactive proof, but it is almost anonymous as a
  standalone destination: no stable BrickerP signature and no path back to the
  Profile or other work.
- The two owned surfaces already share dark ink, warm paper, fine rules,
  monospace metadata, status disclosure, and restrained controls. Their
  differences are useful rather than accidental.
- The Profile cards and live AI Usage both showed `134B` through Aug 9 on this
  audit. The current static-card/live-page publishing contract appeared
  aligned after a fresh load; delayed-source disclosure remains visible.

### Seven variants considered

1. **One costume** — apply one shell, palette, type scale, and navigation to
   every surface.
2. **Numbered artifact archive** — treat `LOOP 01` and `LEDGER 02` as two
   flagship editions by the same creator.
3. **Dual engine** — make the relationship explicit: strange experiments are
   the imagination engine; open ledgers are the evidence engine.
4. **Signal rail** — connect surfaces with a shared thin route/index motif and
   reciprocal navigation.
5. **Creator console** — turn Profile into a live command deck containing both
   artifacts and current signals.
6. **Curated anthology** — keep every artifact visually independent and let
   Profile alone provide the editorial frame.
7. **Personal operating system** — create a shared component/runtime package
   and render every project inside it.

### Direction comparison

#### A. One costume

- **User value:** immediate visual recognition.
- **Feasibility:** medium; repeated CSS and surface changes.
- **Difference:** a polished, unified portfolio suite.
- **Hidden assumption:** consistency is more valuable than the identity of each
  work.
- **Risk:** flattens the animation and archive into themed product pages.

#### B. Numbered dual-engine archive — recommended

- **User value:** visitors understand one creator through two complementary
  proofs: an immersive experiment and an inspectable history.
- **Feasibility:** high; mostly naming, authorship, routing, CTA hierarchy, and
  static-card composition.
- **Difference:** `Strange loops. Open ledgers.` becomes an operating principle,
  not decorative copy.
- **Hidden assumption:** two flagship works are enough to establish a memorable
  creator signature.
- **Brand grammar:** low-key `YUPENG LU / BRICKERP` authorship; `TYPE + NUMBER`;
  one-sentence proposition; state/evidence; one next action. Palette and motion
  remain artifact-specific.

#### C. Curated anthology

- **User value:** maximum artistic freedom and lowest maintenance.
- **Feasibility:** very high; Profile receives the only meaningful change.
- **Difference:** reads like a small gallery rather than a product family.
- **Hidden assumption:** every visitor enters through GitHub Profile.
- **Risk:** direct links to either owned page still feel anonymous and isolated.

### Recommended first cut

Choose Direction B and make the smallest complete brand loop:

1. AI Usage identifies itself as `LEDGER 02 · BY BRICKERP` and offers quiet
   `PROFILE / SOURCE` exits without changing its archive/game world.
2. Endless Second Ring keeps `LOOP 01`; its creator icon becomes a readable
   `YUPENG / WORK` entry.
3. The personal intro leads with what is being built and what collaboration is
   welcome; residency and sponsorship move into the secondary professional
   section.
4. GitHub Profile keeps both flagship cards and the warm avatar, but changes
   the primary CTA from generic email contact to an explicit collaboration
   invitation.
5. Both static cards share information structure and numbering, not color or
   imagery. The AI Usage card keeps its truthful weekly summary rather than
   imitating the interactive Run Archive.

### Assumptions to validate in Step 2

- Direct-entry visitors notice a creator signature without it competing with
  the hero artifact.
- `LOOP 01 / LEDGER 02` feels like a deliberate edition system rather than
  portfolio decoration.
- Collaboration-first copy improves creator recognition without hiding
  professional credibility.
- Reciprocal links are enough; a new standalone index page is unnecessary.
- Shared grammar can be implemented per repository without introducing a
  shared runtime dependency.

Approval gate: proceed to Step 2 only if Direction B and the “same grammar,
different worlds” boundary are accepted.

## 2026-08-09 divergence reset

Status: Step 1 awaiting approval. This section supersedes the recommendation
above; no implementation is authorized yet.

### Corrected hypothesis

The portfolio should not spend attention proving that its surfaces are related.
It should make each surface so complete, authored, and unlike the others that a
visitor reads the difference as creative range rather than inconsistency.

**Confidence: 92%.** The user's desired signal is not “one disciplined brand
system.” It is “this builder can invent multiple worlds, mediums, and modes of
interaction.”

**How might we turn AI Usage, the personal Profile, and Endless Second Ring
into three uncompromised mediums whose contrast is the portfolio statement,
without explaining or styling them into a family?**

This is not for:

- visitors who need a conventional corporate identity system;
- design-system consistency scores across repositories;
- shared navigation, numbering, palette, typography, motion, or component
  packages;
- explanatory copy that tells visitors why the works belong together;
- making one flagship act as the visual source for the other two.

### Eight divergence experiments

1. **Game / zine / film** — AI Usage becomes a playable data world, Profile an
   editorial self-portrait, and Endless Second Ring a real-time night film.
2. **Three fictional studios** — give every surface its own art direction as if
   it came from a different specialist studio.
3. **Hard genre cuts** — deliberately switch typography, density, color,
   movement, soundlessness, and interaction model at every doorway.
4. **No shared chrome** — remove the expectation of a common header, footer,
   signature, numbering scheme, or route back.
5. **Cover, not card system** — every project receives a native poster/cover;
   Profile juxtaposes them without matching their composition.
6. **Different time models** — Profile is an edited present, AI Usage is an
   accumulating history, and the drive is an endless repeating moment.
7. **Different visitor roles** — reader on Profile, player in AI Usage, passenger
   in Endless Second Ring.
8. **Deliberate collision** — Profile can place incompatible artifacts beside
   each other with whitespace and scale instead of visual reconciliation.

### Direction comparison

#### A. Three mediums, no house style — recommended

- **Personal Profile: Human zine.** An editorial, image-led self-portrait with
  sharp cropping, irregular rhythm, selective personal notes, and very little
  career prose above the fold.
- **AI Usage: Playable data relic.** Commit harder to pixel/2D game logic,
  model-specific terrain, discovery, tactile controls, and history-as-world.
- **Endless Second Ring: Real-time night film.** Preserve uninterrupted
  cinematic space, architectural detail, atmosphere, and driver/passenger
  presence; do not add portfolio UI to the scene.
- **User value:** the visitor experiences breadth directly instead of reading a
  claim about versatility.
- **Feasibility:** high because each repository evolves independently.
- **Difference:** the portfolio is memorable for range, not for a reusable
  visual motif.
- **Hidden assumption:** strong individual art direction prevents divergence
  from looking unfinished.

#### B. Cabinet of incompatible curiosities

- Profile becomes the only deliberately composed collision: oversized previews,
  mismatched covers, uneven scale, and almost no connective copy.
- The projects remain fully autonomous and are never reskinned for the cabinet.
- **User value:** immediate surprise and browseability.
- **Feasibility:** medium; Profile needs a new editorial composition.
- **Difference:** curation comes from juxtaposition, not taxonomy.
- **Hidden assumption:** the Profile itself can remain legible while refusing a
  grid system.

#### C. Rotating identities

- The Profile periodically chooses one current obsession and changes its entire
  visual identity around it; older works retain their original worlds.
- **User value:** the creator appears active and unpredictable.
- **Feasibility:** low; high editorial and asset maintenance.
- **Difference:** even the hub refuses to become a stable brand surface.
- **Hidden assumption:** frequent transformation produces anticipation rather
  than disorientation.

### Recommended first cut

Choose Direction A. Do not add connective labels or shared navigation. Increase
the native identity of each surface instead:

1. Push AI Usage further from dashboard to authored 2D game: deeper model-world
   differences, meaningful traversal, discoveries, and stronger scene changes.
2. Let Endless Second Ring remain a self-contained film and spend its next
   effort on world detail, motion, atmosphere, and spatial credibility.
3. Rebuild Profile as a human zine/launcher with two or three visually
   incompatible covers, less resume prose, and no matched card template.
4. Retire `LOOP / LEDGER` numbering as a cross-project constraint. It may remain
   in historical copy, but it must not determine future art direction.
5. Judge success by whether a visitor remembers three different experiences
   and the builder's range, not whether they notice a shared system.

### Assumptions to validate in Step 2

- Visitors reward authored range more than cross-page consistency in an AI
  creator portfolio.
- A human-zine Profile can orient visitors without explaining relationships.
- Each work is already strong enough to survive without shared branding cues.
- Radical genre separation will feel intentional when each surface has a clear
  subject, interaction role, and finish quality.
- The best references will come from multidisciplinary digital artists, game
  portfolios, interactive studios, and creative technologists rather than
  conventional developer profiles.

Approval gate: proceed to Step 2 only if “game / zine / film” and radical
artifact autonomy are accepted as the new direction.
