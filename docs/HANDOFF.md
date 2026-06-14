# HANDOFF — EZPC (pcbuilder2 / qhbud/ezpcnew)

> Repo memory for the Architect Loop. Builder (Codex) writes raw evidence only;
> architect (Claude) writes rulings/verdicts. Not in this file = didn't happen.

## TL;DR

- Goal: Make EZPC a full one-stop PC-build site that beats PCPartPicker on
  proactive compatibility, trust, and mobile UX.
- Last work: Slice 5 (CPU↔GPU bottleneck/balance meter) built + architect-verified
  GREEN and committed to main (2026-06-14, commit a51bfbb).
- Next action: **Slice 6** (public build showcase, NO accounts — curated gallery +
  Copy-Link share) — NOT YET DISPATCHED (spec it, then dispatch). Then **Slice 7**
  (agent component auto-ingestion). Slices 0–5 merged to main. Autonomous loop:
  dispatch next slice as each completes; Quinn approved working through these.

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

- **Slice 2** — sticky build dock (component tabs + mobile), severity-aware.
- Gates: `docs/gates/slice-2.md`, frozen at THIS commit BEFORE dispatch.
- Lane: single lane, dispatched in main checkout (`.architect/slice2.block.md`,
  `--dangerously-bypass-approvals-and-sandbox`). Builder block also reusable via
  `/goal`. Effort: xhigh.
- Status: **PASS / MERGED** (architect-verified 2026-06-14). Builder paused at
  PHASE 0 with 2 disagreements (server route wording; mobile.html statically
  reachable) — both ACCEPTED, scope unchanged (see decisions log); resumed same
  lane to build. Independent gate run: G1 `node --check` 0; G2 smoke 0/0; G3
  `dock-e2e` D1 visibility / D2 metrics / D3 severity / D4 mobile-anchored all
  PASS; G4 diff — dock status derives from the single `classifyCompatibilityIssues`
  (no duplicated rules), distinct problem(red)/warning(amber)/clean states,
  mobile `position:fixed` bottom dock + active-tab bottom padding, Slice-1 logic
  untouched. Screenshots: `.architect/slice2-shots/` (gitignored).

- **Slice 3** — explainable build review + visible price freshness.
- Gates: `docs/gates/slice-3.md`, frozen at THIS commit BEFORE dispatch.
- Lane: single lane, main checkout (`.architect/slice3.block.md`, bypass-sandbox).
  Effort: xhigh. NOTE: this slice touches public/index.html (the wizard RESULT
  build-review panel `renderBuildReviewPanel`/`getBuildReviewNotes` ~3088-3215,
  inline) + public/script.js price-render points — a different file set than
  Slices 1/2.
- Status: **PASS / MERGED** (architect-verified 2026-06-14, after one bounce).
  Part A (explainable review) passed first cut. Part B (price freshness) was
  initially wired into DEAD `createXCard` renderers (`renderParts()` early-returns
  for all component tabs; live badge sweep = 0) — REJECTED at G4 despite R3
  passing in isolation. Resumed same lane with exact live render-point targets;
  builder moved badges into the listing renderers (`renderGpuListingsSection`
  etc., script.js ~12939+) and strengthened R3 to drive real tabs. Re-judged:
  G1 0, G2 0/0, G3 R1/R2/R3 PASS, independent live sweep now shows a freshness
  badge per tab; G4 — badges in live renderers only, Slice-1/2 + wizard flow
  untouched. Screenshots `.architect/slice3-shots/` (incl. freshness-live.png).
  Caveat: volatility badge rarely shows in listings (priceHistory is lazy-loaded,
  not present on listing objects) — honest (no fabrication), acceptable.

- **Slice 4** — preset budget-tier starter builds (Entry/Mainstream/Enthusiast).
- Gates: `docs/gates/slice-4.md`, frozen at commit ede864d BEFORE dispatch.
- Lane: single lane, main checkout (`.architect/slice4.block.md`). Effort: xhigh.
- Status: **PASS / MERGED** (architect-verified 2026-06-14, commit 41cb983).
  Independent gate run: G1 `node --check` 0; G2 smoke 0/0; G3 `presets-e2e`
  P1 tiers render / P2 complete real-parts builds / P3 zero hard problems / P4
  one-click load / P5 tiers differentiated all PASS; G4 — presets assembled
  client-side from live `/api/parts`, validated via existing
  `classifyCompatibilityIssues` + `calculateEstimatedWattage` (wattage reuses the
  existing calc via a save/restore of `currentBuild`), loaded via existing
  `applyBuildData`; script.js diff +487/-0 (purely additive), Slice-1/2/3 +
  wizard untouched. Live totals Entry $797.98 / Mainstream $1439.32 / Enthusiast
  $2640.65 (strictly increasing). presets-e2e P2 verifies every part id against
  live `/api/parts` (anti-fabrication).

- **Slice 5** — CPU↔GPU bottleneck / balance meter on the active build.
- Gates: `docs/gates/slice-5.md`, frozen at THIS commit BEFORE dispatch.
- Lane: single lane, main checkout (`.architect/slice5.block.md`, bypass-sandbox).
  Effort: xhigh. Reuses existing `getGpuPerformance`/`getCpuPerformance`/
  `getCpuMultiThreadPerformance` (script.js ~4355-4400); mounts via ONE added
  call in the live build-refresh path; no fabricated benchmark numbers.
- Status: **PASS / MERGED** (architect-verified 2026-06-14, commit a51bfbb).
  Independent gate run: G1 `node --check` 0; G2 smoke 0/0; G3 `bottleneck-e2e`
  B1 renders / B2 differentiates direction / B3 neutral when incomplete / B4
  plain-language / B5 scores==helpers all PASS; G4 — scores derive only from
  existing `getCpuPerformance`/`getCpuMultiThreadPerformance`/`getGpuPerformance`
  (no fabricated benchmarks), mounted via ONE call in `checkCompatibility()`,
  diff +346/-0 additive, Slice-1/2/3/4 + wizard untouched. Thresholds: ratio
  gpu/cpu ≥1.25 → CPU-limited, ≤0.80 → GPU-bound, else Balanced; position =
  log2(ratio) mapping. Explanations hedged (1080p/CPU-heavy framing), honest.

## Decisions log (architect + human)

| Date | Decision | Why |
|------|----------|-----|
| 2026-06-13 | Run discovery research + audit before building | Request is discovery-scale; build features blind = backwards |
| 2026-06-13 | Slice 0 must establish a verification gate | Loop needs a gate; repo has none + 3 live console errors |
| 2026-06-14 | Slice 2 PHASE-0 disagreements both ACCEPTED, scope unchanged | (1) server.js has only `app.get('/')`+static, no catch-all — immaterial, dock injects into index.html served at `/`; (2) mobile.html is statically reachable but NOT the served experience (no UA redirect), stays OUT OF SCOPE. Gate frozen as-is; ruling governs reading of "not served". |
| 2026-06-14 | Tier-3 scope (Quinn) | BUILD: preset budget-tier builds (S4); bottleneck/balance meter (S5); public build showcase WITHOUT accounts/logins, on Copy-Link share + curated gallery (S6); agent-driven component auto-ingestion from Amazon for new GPU/mobo listings (S7, ties to findNewComponents.js + flaky-scraper fix). DEFER: accounts/email, multi-retailer pricing, standalone AI assistant. |

## Session log

| Date | Role | Slice | Commits | Gates P/F | Notes |
|------|------|-------|---------|-----------|-------|
| 2026-06-13 | Architect | discovery | (docs only) | n/a | 3 researchers + audit; roadmap PRD written |
| 2026-06-14 | Builder | slice-1 | (uncommitted) | self: G1/G2/G3 pass | classifier + grouped render + compat-e2e; STATUS COMPLETE_WITH_CONCERNS (no real case clearance fields) |
| 2026-06-14 | Architect | slice-1 | committed to main | G1✓ G2✓ G3✓ G4✓ | independent gate run + 3 UI screenshots; merged, not pushed |
| 2026-06-14 | Builder | slice-2 | (uncommitted) | self: G1/G2/G3 pass | paused PHASE 0 w/ 2 disagreements, resumed after rulings; dock severity + mobile + dock-e2e; STATUS COMPLETE |
| 2026-06-14 | Architect | slice-2 | committed to main | G1✓ G2✓ G3✓ G4✓ | independent gate run + 4 dock screenshots (incl. mobile); merged, not pushed |
| 2026-06-14 | Builder | slice-3 | (uncommitted) | self: G1/G2/G3 pass | Part A review explanations + Part B freshness badges; STATUS COMPLETE (Part B in dead code) |
| 2026-06-14 | Architect | slice-3 | sent back | G4 reject Part B | freshness badges in dead createXCard renderers; live sweep = 0 badges; resumed lane |
| 2026-06-14 | Builder | slice-3 fix | (uncommitted) | self: G1/G2/G3 pass | moved badges to live listing renderers; R3 now drives real tabs |
| 2026-06-14 | Architect | slice-3 | committed to main | G1✓ G2✓ G3✓ G4✓ | independent re-judge; live sweep shows badges; review + freshness screenshots; merged, not pushed |
| 2026-06-14 | Builder | slice-4 | (uncommitted) | self: G1/G2/G3 pass | client-side preset assembly + presets-e2e; STATUS COMPLETE |
| 2026-06-14 | Architect | slice-4 | committed to main 41cb983 | G1✓ G2✓ G3✓ G4✓ | independent gate run; reuse-verified (applyBuildData + classifier + wattage), additive diff, live totals strictly increasing; merged, not pushed |
| 2026-06-14 | Architect | slice-5 | (freeze + dispatch) | n/a | gates frozen `docs/gates/slice-5.md`; builder dispatched for balance meter |
| 2026-06-14 | Builder | slice-5 | (uncommitted) | self: G1/G2/G3 pass | balance meter compute/render + bottleneck-e2e B1-B5; STATUS COMPLETE |
| 2026-06-14 | Architect | slice-5 | committed to main a51bfbb | G1✓ G2✓ G3✓ G4✓ | independent gate run; scores==helpers verified, additive diff, one hook call; merged, not pushed |

## Notes for next session

- Prior-session UX prototypes (build-review panel, sticky-dock, filter null-guards)
  were committed as baseline `ad6c470` before the Slice 1 gate freeze. Slice 2/3
  overlap them; reconcile before dispatching builders on those files.
- Slice 1 is committed to main locally but **not pushed** — push when ready.
- Untracked local-only files remain: `.claude/`, `scripts/.update_progress.json`
  (not part of the slice; left alone).
- GPU price-history feature shipped to main (commit 13832b6) and is live.
