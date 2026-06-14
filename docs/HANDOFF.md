# HANDOFF — EZPC (pcbuilder2 / qhbud/ezpcnew)

> Repo memory for the Architect Loop. Builder (Codex) writes raw evidence only;
> architect (Claude) writes rulings/verdicts. Not in this file = didn't happen.

## TL;DR

- Goal: Make EZPC a full one-stop PC-build site that beats PCPartPicker on
  proactive compatibility, trust, and mobile UX.
- Last work: Slice 1 (proactive compatibility, two-tier severity) built + architect-
  verified GREEN and committed to main (2026-06-14).
- Next action: Human picks next slice — recommended **Slice 2** (sticky build dock)
  per roadmap, reconciling with the uncommitted June-session dock prototype first.

## Project goal

EZPC ("EZPC World", ezpc.world) is a Node/Express + vanilla-JS PC part picker with
MongoDB Atlas data and Amazon price scraping. "Done" for this campaign = a measurably
more useful builder than PCPartPicker on the axes in the roadmap PRD.

## Verification gate (exact commands)

**NONE EXISTS YET.** package.json has no test/lint/build script. Establishing one is
Slice 0. Planned gate: `npm test` = (1) `node --check` on changed JS, (2) a Puppeteer
smoke test that loads each tab against a local server and asserts **zero console
errors** (today there are 3: missing-filter null-guards).

## Roadmap / PRD

- `docs/prd/roadmap.md` — audit findings, cited competitor/user research, prioritized
  slices (0: foundation+gate, 1: proactive compatibility, 2: sticky build dock,
  3: explainable build review + price freshness, Tier-3 bets).
- Raw research: `.architect/research/01..03.md` (gitignored). Audit + screenshots:
  `.architect/audit/` (gitignored).

## Current slice

- **Slice 0** — verification harness (`npm test` puppeteer smoke) + filter-error fix.
- Gates: `docs/gates/slice-0.md`, frozen at commit d7c31b2 BEFORE dispatch.
- Lane: single lane `lane/slice0-00` in worktree `.architect/wt/slice0-00` (off
  d7c31b2, isolated from the uncommitted prior-session work). Effort: high.
- Status: PASS / CONTINUE (architect-verified 2026-06-14). Gates G1/G2/G3 all
  green on independent run (`node --check` ok; smoke `CONSOLE ERRORS: 0 PAGE
  ERRORS: 0`; console.error path removed). Dispatch required
  `--dangerously-bypass-approvals-and-sandbox` — Codex write-sandbox is not
  effective on Windows; `--sandbox workspace-write` fails safe to read-only.
- **Slice 1** — proactive compatibility, two-tier severity (problems vs warnings).
- Gates: `docs/gates/slice-1.md`, frozen at commit 8301b05 BEFORE dispatch.
- Lane: `docs/lanes/slice-1-00.md` (builder worked in main tree, not a worktree).
- Status: **PASS / MERGED** (architect-verified 2026-06-14). Independent run of all
  4 gates: G1 `node --check` exit 0; G2 smoke `CONSOLE ERRORS: 0 / PAGE ERRORS: 0`;
  G3 `compat-e2e` S1 problem / S2 warning-only / S3 none all PASS; G4 single pure
  `classifyCompatibilityIssues(build,wattageInfo)→{problems,warnings}` (script.js:4180,
  called once at :4334), every issue has a plain-language WHY, no fabricated fields
  (case max-GPU-length / max-cooler-height absent in live data → those checks
  correctly skipped). Screenshots: `.architect/slice1-shots/` (gitignored).
- Boundaries honored: only public/script.js (classifier + render), public/styles-v5.css,
  test/compat-e2e.js. index.html/server.js/models/scripts untouched.
- Next: Slice 2 (sticky build dock) — surfacing compatibility on component tabs is
  also still a later slice.

## Decisions log (architect + human)

| Date | Decision | Why |
|------|----------|-----|
| 2026-06-13 | Run discovery research + audit before building | Request is discovery-scale; build features blind = backwards |
| 2026-06-13 | Slice 0 must establish a verification gate | Loop needs a gate; repo has none + 3 live console errors |

## Session log

| Date | Role | Slice | Commits | Gates P/F | Notes |
|------|------|-------|---------|-----------|-------|
| 2026-06-13 | Architect | discovery | (docs only) | n/a | 3 researchers + audit; roadmap PRD written |
| 2026-06-14 | Builder | slice-1 | (uncommitted) | self: G1/G2/G3 pass | classifier + grouped render + compat-e2e; STATUS COMPLETE_WITH_CONCERNS (no real case clearance fields) |
| 2026-06-14 | Architect | slice-1 | committed to main | G1✓ G2✓ G3✓ G4✓ | independent gate run + 3 UI screenshots; merged, not pushed |

## Notes for next session

- Prior-session UX prototypes (build-review panel, sticky-dock, filter null-guards)
  were committed as baseline `ad6c470` before the Slice 1 gate freeze. Slice 2/3
  overlap them; reconcile before dispatching builders on those files.
- Slice 1 is committed to main locally but **not pushed** — push when ready.
- Untracked local-only files remain: `.claude/`, `scripts/.update_progress.json`
  (not part of the slice; left alone).
- GPU price-history feature shipped to main (commit 13832b6) and is live.
