# GitHub Profile refinement — Step 6 dogfood

Status: local acceptance passed on 2026-07-31; public read-back follows release

## Task 1 — recognize and choose

### Script

1. Open the Profile source at the top.
2. Read for five seconds.
3. Identify the creator hook, relationship action, and two primary works.

### Result

Pass.

- `LOOP / LEDGER` and `Strange loops. Open ledgers.` appear before career
  information.
- `OPEN A LINE — EMAIL YUPENG` resolves the distinctive phrase into an
  unambiguous `mailto:` action.
- LOOP 01 and LEDGER 02 are separate full-width linked chapters.

### Friction found and fixed

The first implementation draft used a newly invented invitation and described
the Ledger as making practice “accountable.” Both were replaced with the
approved invitation and the bounded-trace disclosure to avoid expanding the
evidence claim.

## Task 2 — narrow screen and image-disabled path

### Script

1. Read the README in canonical single-column order.
2. Ignore all image contents.
3. Confirm that every essential meaning and destination remains available.

### Result

Pass.

- No table or two-column dependency remains.
- Work names, one-sentence meanings, artifact links, email, three breadth
  links, resume, and LinkedIn remain in ordinary Markdown/HTML.
- Both image alternatives name the artifact and explain its role without
  copying a dynamic total or date.
- Professional facts remain reachable in one disclosure rather than competing
  with the creator hook.

## Task 3 — regenerate and inspect the living card

### Script

1. Generate cards from a controlled fixture.
2. Generate cards from the current `usage.json`.
3. Build the production `docs/` artifact.
4. Render LOOP, LEDGER light, and LEDGER dark at `560 × 160`.

### Result

Pass.

- Six focused generator tests passed.
- The production AI Usage build passed.
- Totals, date range, cache amount/share, weekly aggregation, and all four tool
  series remain derived from report data.
- Both generated themes contain exactly one vermilion Skyline-origin node.
- LOOP contains one road/vanishing-point node and no drawn control.
- Rendered cards remain legible and visually related without requiring an
  edge-to-edge seam.

### Environment-only retry

The first AI Usage build attempt used a read-only `node_modules` symlink in the
temporary worktree, so TypeScript could not write its build cache. Copying the
already-installed dependencies into the writable temporary worktree resolved
the environment issue; the one subsequent production build passed.

## P0 status

No unresolved P0 remains in the approved Profile journey.

Public publication is a release check, not a substitute for these task scripts:
the Profile README, LOOP card, and both LEDGER themes must still be read back
from their public URLs before completion is claimed.

## Cold-start path

The Profile itself is the three-line cold start:

> `LOOP / LEDGER`
>
> **Strange loops. Open ledgers.**
>
> I build strange AI loops and keep the ledger open.
