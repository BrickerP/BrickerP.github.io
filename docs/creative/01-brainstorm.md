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
