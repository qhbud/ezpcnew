# HANDOFF — EZPC (pcbuilder2 / qhbud/ezpcnew)

> Repo memory for the Architect Loop. Builder (Codex) writes raw evidence only;
> architect (Claude) writes rulings/verdicts. Not in this file = didn't happen.

## TL;DR

- Goal: Make EZPC a full one-stop PC-build site that beats PCPartPicker on
  proactive compatibility, trust, and mobile UX.
- Last work: Slice 7 (builder-page UX refinement) + an interactive polish round
  with Quinn (image-dominant cards, uniform Choose-button grid, balance meter only
  on full CPU+GPU, full-width Performance Statistics, deduped price-history
  snapshots + hover tooltip) — architect-verified GREEN and **PUSHED to origin/main
  2026-06-15** (all of Slices 0–7).
- Next action: **Slice 13** — DISPATCHED 2026-06-20 (lane `lane/slice-13-00`, worktree
  `.architect/wt/slice-13-00`, freeze a7cb5b7, xhigh). Scope = resilient loading/error/
  empty states: null-safe `showLoading/hideLoading/showError/hideError` (~3667, bare
  getElementById throws today) + consistent error states across category loaders
  (`loadAllStorage`/`loadAllCases`/`loadAllAddons` ~2299-2366 only console.error today →
  silent blank tab; `loadAllGPUs` ~2368 is the reference pattern). Gate
  `docs/gates/slice-13.md` (G1 parse, G2 smoke, G3 resilience-e2e R1-R4, G4 diff).
  JUDGE NEXT (dispatched this session). Builder writes `docs/lanes/slice-13-00.md`.
  DE-SCOPED from S13: mobile-responsive verify → **Slice 14** (separate audit task);
  mass null-guarding of the ~56 unrelated getElementById sites (no current crash —
  smoke 0/0). The "leftover UX experiments" (sticky dock / wizard build-review flags)
  from MEMORY are already shipped in prior slices; no uncommitted experiments remain.
- **Slice 12 (P0: compat filter toggle + PSU-undersize compatibility) — DONE + PUSHED
  to origin/main 2026-06-20 (commit ae68295, `d15937a..ae68295`).** Prod auto-deploys
  via Railway+Render. Architect-verified green (parse 0, compat-filter-e2e F1-F4 on the
  live predicate/real data, smoke 0/0, diff clean — shared `_compatOnly` across all 3
  renderers reusing single `isCompatibleWithBuild`, PSU branch null-safe, existing
  warnings untouched). Worktree+lane branch cleaned. S0–S12 all live in prod.
- **Slice 11 (P0 launch-hygiene part 1) — DONE + PUSHED to origin/main 2026-06-20
  (commit 9a305d6, `ec731e4..9a305d6`).** Prod auto-deploys via Railway+Render.
  Shipped: durable server-stored shareable builds (Lane A) + trust/legal pages +
  FTC disclosure + Plausible analytics scaffold (Lane B) + malformed-JSON→400 fix
  (P2 follow-up). All architect-verified green pre-push (share-e2e 10/10, trust-e2e
  23/0, smoke 0/0; integration GREEN). Worktrees + lane/slice branches cleaned up.
  S0–S11 all live in prod.
- **POST-DEPLOY TODO (next session):** confirm the Railway+Render deploy went green
  and the new endpoints/pages are live (curl prod `/privacy.html` 200, `POST
  /api/builds` round-trip). Before relying on analytics, Quinn must register
  `ezpc.world` in Plausible (or swap provider) — the scaffold is a placeholder.
- **Reconcile 2026-06-20:** S9 (a4ebe53,1c6010d) and S10 (16149b0; verified
  64/64 e2e) are DONE + PUSHED to prod (per workspace MEMORY.md). The "judge next
  session" notes below for S9/S10 are CLOSED — both passed and shipped.
- Note: repo also advanced OUTSIDE the loop in regular sessions through ec731e4
  (CPU+GPU single-collection consolidation, REAL multi-source GPU+CPU benchmark
  tables, ingest hardening, availability sweep/hide, case/addon selectable lists,
  on-sale/refurbished status tags, GPU scatter coincident-dot fix). In MEMORY.md,
  not re-narrated here. **Launch-readiness report:** workspace
  `memory/2026-06-20-launch-readiness-report.md` (the P0 list this campaign drains).

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

- **Slice 6** — public build showcase: curated themed gallery + Copy-Link share,
  NO accounts/persistence.
- Gates: `docs/gates/slice-6.md`, frozen at THIS commit BEFORE dispatch.
- Lane: single lane, main checkout (`.architect/slice6.block.md`, bypass-sandbox).
  Effort: xhigh. Reuses Slice-4 assembly helpers (by CALL), `applyBuildData`,
  `classifyCompatibilityIssues`, and the existing `?build=<btoa>` share encoding
  (`shareBuild`/`loadBuildFromURL`). No server routes, no DB writes.
- Status: **PASS / MERGED** (architect-verified 2026-06-14, commit b995fee).
  Independent gate run: G1 `node --check` 0; G2 smoke 0/0; G3 `showcase-e2e`
  S1 gallery (4 distinct cards) / S2 complete real-parts builds / S3 zero hard
  problems / S4 themes pairwise distinct / S5 one-click load / S6 Copy-Link
  round-trips all PASS; G4 — assembled by CALLING Slice-4 helpers (new showcase
  methods, no edits to S4), load via `applyBuildData`, validate via
  `classifyCompatibilityIssues`, share URL via the existing `?build=<btoa>`
  encoding, NO `incrementComponentSaveCounts`/server write, diff +707/-0 additive,
  Slice-1..5 + wizard untouched. Live themes: Budget 1080p $930.74 / 1440p
  $1618.81 / Streaming-Creator $2118.92 / 4K Ultra $2924.30, all 0/0.

- **Slice 7** — builder-page UX refinement (from Quinn's 2026-06-14 local review).
- Gates: `docs/gates/slice-7.md`, frozen at THIS commit BEFORE dispatch.
- Lane: single lane, main checkout (`.architect/slice7.block.md`, bypass-sandbox).
  Effort: xhigh. INTENTIONALLY revises Slice-2 dock + Slice-4/6 presets presentation;
  must preserve Slice-1/3/5 logic. Six fixes: (1) merge starter+showcase into ONE
  collapsible "quick-start" strip curated to 4 [A1]; (2) component cards ~4:3 +
  more detail when selected; (3) wider build-summary (min-width); (4) fix
  change-component scroll anchor (lands on selection section, not mid-tab); (5)
  REMOVE Guides tab (keep wizard+review); (6) merge dock INTO tab strip, drop
  redundant `#buildDockBuilderBtn` [B2].
- Status: **PASS / MERGED + PUSHED** (architect-verified 2026-06-15). Independent
  full-suite gate run all PASS: G1 parse 0; G2 smoke 0/0; refine-e2e R1–R7;
  presets P1–P5; showcase S1–S6; dock D1–D4; bottleneck B1–B5; compat S1–S3.
- **Polish round with Quinn (2026-06-14/15, all done + verified + pushed):**
  1. Selected component cards: product image dominates, info above (same-lane
     resume bfw1f9kof). Approved by Quinn.
  2. "Choose" buttons made a uniform 2-col grid (CSS: `.component-row` →
     `grid-template-columns: repeat(2, minmax(0,1fr))`, container `align-items:
     stretch`); all slots 423×210. Approved.
  3. Balance meter (`#buildBalanceSection`) now hidden by default in markup +
     `updateBuildBalanceMeter` shows it only on a real CPU+GPU verdict (states
     balanced/cpu-limited/gpu-bound). Verified hidden when empty/CPU-only.
  4. Performance Statistics (`#buildStatisticsSection`) full-width override (it
     carries `.build-summary-box` only for styling) → 3 charts top row, 2 bottom.
  5. GPU price history: `generatePriceHistory` collapses consecutive unchanged
     snapshots (keeps first + changes + latest); `drawPriceChart` +
     `attachPriceChartHover` adds a $price • date hover tooltip.
  (Quick-start preset-strip restyle proposal was offered but superseded — Quinn
  moved on to the above; revisit only if he raises it again.)

- **Slice 8** — new-component scraper → `pending_components` review queue, run on
  GitHub Actions. Discovers components not yet in the catalog, saves icon/name/
  link/price + type-specific `fields` (mapped from models/*) for human review
  before any go-live. SAFETY INVARIANT: writes ONLY to `pending_components`, never
  the live collections. Promotion-to-live deferred to a later slice.
- Gates: `docs/gates/slice-8.md`, frozen at THIS commit BEFORE dispatch.
- Lane: single lane, main checkout (`.architect/slice8.block.md`, bypass-sandbox).
  Effort: xhigh. Reuses `findNewComponents.js` + `scripts/scrapers/*`; deterministic
  format test (`buildPendingComponent`) since live Amazon scraping is flaky.
- Status: **PASS / MERGED + PUSHED** (architect-verified 2026-06-15). Independent
  gate run: G1 both scripts parse 0; G2 `test/ingest-format.js` F1–F4 PASS; G3
  `--dry-run` "no DB writes" upserted 0 exit 0; G4 — only write target is
  `pending_components` (upsert guarded behind `!dryRun`), live collections read-only
  for `alreadyInLive`, fields mapped from models, reuses existing scrapers, valid
  `component-ingest.yml` (schedule + dispatch + MONGODB_URI + log artifact),
  package.json scripts-only. Dry-run pulled a real RTX 4090 → full pending doc
  (icon/name/link/$3999/type-specific fields, alreadyInLive:true). Bumped the
  workflow `npm ci` timeout 25→40 (GPU Review Update failed on a 25-min npm ci
  timeout 2026-06-14). Pushed to origin/main; first manual `Component Ingest`
  dispatch fired to populate `pending_components`.
- TEST (2026-06-15): first GitHub dispatch failed on a plain `npm ci` hanging on
  Puppeteer's Chromium postinstall (the documented stall in price-update.yml).
  Fixed `component-ingest.yml` to use price-update's retry-capped install
  (`timeout 480 npm ci` × 3, clean tree between) — commit fb527ee. Re-run
  (27528145908) SUCCEEDED: upserted 3 RTX 4090 GPUs into Atlas `pending_components`
  (all alreadyInLive:true — search terms hit known cards; tune terms / filter
  alreadyInLive:false to surface genuinely new parts). NOTE: local `.env` points to
  a different DB than Atlas — use `.env.atlas` MONGODB_URI to review the queue
  locally. Ingest now SKIPS already-in-live candidates (only queues new parts; 5
  new/type via `--type=all --limit=5`); `--include-existing` overrides. Test-batch
  of 3 alreadyInLive GPUs was deleted from pending_components 2026-06-15 (queue=0).
- `gpu-review-update.yml`: had the plain-`npm ci` Chromium-stall bug (failed
  2026-06-14). Quinn chose to **disable** it (`gh workflow disable`, state
  `disabled_manually`, 2026-06-15) rather than fix — do NOT re-enable without
  Quinn; if re-enabling, apply the price-update retry-install first.
- Next: review the queued `pending_components` (via `npm run review-pending`), then
  a later slice for promotion-to-live tooling/UI.

- **Slice 9** — compatibility depth (data-backed) + wizard budget floor (S11).
- Gates: `docs/gates/slice-9.md`, frozen at THIS commit BEFORE dispatch.
- Lane: single lane, main checkout (`.architect/slice9.block.md`, bypass-sandbox).
  Effort: xhigh. Extends the SINGLE `classifyCompatibilityIssues` with TWO new
  WARNINGS only: (1) high-power-GPU 12VHPWR/12V-2x6 connector advisory (fires on
  `gpu.tdp >= 300`; PSU connector fields are 0% populated so it's a verify-this
  warning, not pass/fail); (2) AM5 Ryzen-9000-on-600-series BIOS-update trap
  (`cpu.socket` AM5 + Ryzen-9xxx name + `motherboard.chipset` A620/B650/X670 →
  warn). Plus S11: `#budgetSlider` min 1000→500 in index.html.
- DATA-DRIVEN RE-SCOPE (architect, 2026-06-19): Quinn asked for S9 = "physical-fit
  compatibility." Live Atlas probe showed it is NOT buildable — cases have 0/111
  max-GPU-length, 0/111 max-cooler-height, 0/111 radiatorSupport; only ~3/111 even
  mention GPU length in any text; `cases.specifications` = {color,hasRGB,window}.
  GPU length is 96% populated but useless with no case clearance to compare to.
  Wiring those checks would ship no-ops/fabrication. Re-scoped (Quinn: "A then B")
  to the data-backed checks above. TRUE physical-fit deferred to **Track B** below.
- Status: **PASS / CONTINUE** (independent cold-session judge, 2026-06-19).
  Tamper-check clean (`git diff a4ebe53 -- docs/gates/` empty); boundary clean
  (only script.js +26 / index.html ±1 / test/compat-depth-e2e.js new / lane
  report). Cold live re-run: G1 parse 0; G2 smoke 0/0; G3 compat-depth-e2e
  C1–C4 all PASS (drives the LIVE classifier via page.evaluate on real
  `/api/parts`, fails if advisory leaks into `problems`); G4 — both items
  push to `warnings` not `problems`, read only gpu.tdp / cpu.socket / cpu name
  (via existing getName) / motherboard.chipset, null-safe (tdp>=300 gate),
  BIOS fires AM5+Ryzen-9xxx+{A620,B650,B650E,X670,X670E} and not on 800-series
  / non-9000, additive (no second rule engine); G5 slider min 500, smoke 0/0.
  Committed locally to main; **NOT pushed** (push = Railway+Render prod deploy,
  awaiting Quinn).
- **S11 FOLLOW-UP (open, my spec gap):** lowering `#budgetSlider` min satisfied
  the verbatim G5, but the wizard still REJECTS sub-$1000 budgets via two guards
  left OUT of the frozen boundary — client `public/index.html:~2454`
  (`budget < 1000` → validation error) and server `server.js:~1515` (HTTP 400
  `Minimum budget is $1000`). To actually allow sub-$1000 wizard builds, a small
  follow-up slice (S9b) must lower/remove both to 500. Also confirm the slider
  and the separate `budgetInput` number field share one value (judge flagged
  only the slider floor was lowered).

- **Slice 10** — PC-builder WIZARD recommendation-engine REWORK + resolution
  question + $500 floor (this SUPERSEDES the S9b budget-guard follow-up).
- Gates: `docs/gates/slice-10.md`, frozen at THIS commit BEFORE dispatch.
- Lane: single lane, main checkout (`.architect/slice10.block.md`, bypass-sandbox).
  Effort: xhigh. One lane because the server rewrite + new client question share
  one frozen request/response contract and the integration test spans both.
- Why: the wizard engine is a ~2000-line procedural `POST /api/ai-build` handler
  (`server.js` ~1488-3552) that can return builds with undefined core components
  (no fail-fast), sorts cases/coolers by HIGHEST price, queries `'storage'`
  (singular) for extra SSDs, never asks/uses display resolution (cheapest monitor
  regardless of GPU), has incoherent unlimited-budget output, non-adaptive % splits,
  and thin compatibility enforcement. Mapped in full by an Explore pass 2026-06-19.
- Frozen contract: REQUEST adds `resolution:'1080p'|'1440p'|'4k'` (defaults 1440p);
  budget floor 500; RESPONSE success shape UNCHANGED + new fail-fast
  `{success:false,error,reason}`; NEVER success:true with a missing core part.
- Quinn approved both defaults ("go", 2026-06-19): ADD resolution question + lower
  floor to $500. THEN amended (2026-06-19) to ADAPTIVE QUESTIONING: skip the monitor
  question below $800; gate resolution options by budget (1080p<$1000; +1440p
  $1000-1999; +4k >=$2000); server clamps resolution to tier + adds monitor only as
  last optional item. First dispatch was KILLED at end of PHASE 0 (no files touched)
  to fold this in; gates re-frozen, re-dispatched.
- Status: **RE-DISPATCHED 2026-06-19** (adaptive-questioning amendment), judge next
  session (high-stakes → architect adds a cross-model `codex review` before the
  verdict). Builder writes raw results to `docs/lanes/slice-10-00.md`.

- **Slice 11** — P0 launch-hygiene part 1: durable shareable builds + trust pages.
  Drains the launch-readiness report's P0 list (workspace memory). Two DISJOINT
  parallel lanes (file sets verified non-overlapping), dispatched 2026-06-20.
- Gates: `docs/gates/slice-11.md`, frozen at THIS commit BEFORE dispatch.
- **Lane 11-A** (worktree `.architect/wt/slice-11-A`, branch `lane/slice-11-A`,
  effort xhigh): durable shareable builds. Replaces the brittle base64-in-URL
  share with server-stored builds: `POST /api/builds`→short id, `GET
  /api/builds/:id`, load via `?build=<id>`; new Mongo `builds` collection;
  legacy base64 links must still load. Files: server.js, public/script.js,
  test/share-e2e.js, docs/lanes/slice-11-A.md. High-stakes (persistence/API) →
  cross-model `codex review` at judgment.
- **Lane 11-B** (worktree `.architect/wt/slice-11-B`, branch `lane/slice-11-B`,
  effort high): trust & launch hygiene. New privacy/terms/about static pages +
  FTC affiliate disclosure + footer links + privacy-friendly analytics scaffold
  (placeholder domain, NO secret). Files: public/index.html, public/privacy.html,
  public/terms.html, public/about.html, public/styles-v5.css, test/trust-e2e.js,
  docs/lanes/slice-11-B.md.
- Status (2026-06-20 judge session):
  - **Lane 11-A — PASS / committed `lane/slice-11-A` (00129a6).** Architect ran all
    gates independently in the worktree: A-G1 `node --check` server.js+script.js exit 0;
    A-G3 `node test/share-e2e.js` 9/9 PASS (POST→{id} 12-char base64url, GET round-trip
    deep-equal, Mongo doc shape, 404 missing, unknown-key 400, nested-field/XSS-payload
    400, oversized 413, client short-id+legacy branches); A-G2 smoke 0/0; A-G4 diff —
    new `builds` collection only (no component-collection writes), `crypto.randomBytes(9)
    .toString('base64url')` unguessable id (not ObjectId/sequential), reference-only
    validation w/ prototype-pollution guards + 16KB cap, shareBuild POST + `?build=<id>`,
    legacy base64 back-compat via `/^[A-Za-z0-9_-]{12}$/` discriminator, reuses
    serializeBuild/applyBuildData; boundary clean (only the 4 declared files); tamper
    clean (`git diff 6db6677 -- docs/gates/` empty). Cross-model `codex review
    --uncommitted`: core flow sound, ONE finding logged below.
  - **Lane 11-A FOLLOW-UP (P2, logged — fix in next server-touching change):**
    `POST /api/builds` with malformed (syntactically invalid) JSON under the 16KB cap
    raises express `entity.parse.failed`; the error middleware (server.js ~1568) only
    maps `entity.too.large`→413, so bad JSON returns 500 instead of 400. Low severity
    (our own client always sends valid JSON; no security/back-compat impact; all frozen
    gates pass) → not blocking, but a launch-hygiene endpoint should return 400. Fix:
    add `entity.parse.failed`/`SyntaxError(status 400)`→400 in that handler + a
    share-e2e assertion. Needs server.js, so it can't ride Lane B (script/index only).
  - **Lane 11-B — JUDGED PASS / committed `lane/slice-11-B` (dbc22e7).** First two runs
    halted at PHASE 0 (plan + 4 disagreements, zero files). Architect ruled on all 4 and
    re-dispatched with a no-halt operating rule; the 3rd run built the full scope.
    Architect-run gates (clean local server, fresh port — a stale :3000 server first gave
    a FALSE 404 fail; killed it + re-ran): B-G1 `node test/trust-e2e.js` **23/0 PASS**
    (3 pages 200 + >500 bytes + exact title/h1 + FTC disclosure each; index footer links
    to all 3; index disclosure; Plausible placeholder snippet in <head>; Quinn launch
    comment; NEGATIVE assertion = no secret/Sentry/GA id); B-G2 smoke **0/0**; B-G3 diff —
    static pages only, FTC wording clear/unburied, NO server.js/script.js edits, only the
    7 declared files, footer/legal CSS reuses site tokens. Boundary + gates-tamper clean.
  - **INTEGRATED → `slice/11` (6af356e), verified GREEN, AWAITING PUSH.** `git checkout
    -b slice/11 6db6677`; merged `lane/slice-11-A` (a4c3835) then `lane/slice-11-B`
    (6af356e) — both clean, no conflicts (lanes disjoint). Integration smoke on the
    merged tree: parse 0, share-e2e PASS, trust-e2e 23/0, smoke 0/0; server identity
    confirmed both features coexist (privacy.html 200 AND /api/builds bogus-id 404).
- **REMAINING (awaiting Quinn's GO):** merge `slice/11` → main + `git push origin main`
  (= Railway+Render prod deploy). Then remove worktrees (`git worktree remove
  .architect/wt/slice-11-A` + `-B`) + delete lane branches. Optional: fold the Lane-A P2
  (malformed-JSON→400, server.js ~1568 + a share-e2e assertion) before/with the push.
  3. Then merge `slice/11` → main + push (= Railway+Render prod deploy — CONFIRM w/
     Quinn before pushing). Remove worktrees + lane branches after.
  4. Optionally fold the Lane-A P2 (malformed-JSON→400) into a tiny server follow-up
     before/with the push.
- **P0 items NOT in Slice 11 (queued/flagged):**
  - **Slice 12 (next):** compat filter toggle (P0-2) + PSU-headroom warning
    (P0-3 buildable part) + empty/loading/error states + leftover UX null-guards
    (P0-6) + mobile-responsive verification (P0-4, main app is responsive; no UA
    redirect, mobile.html is an orphan — verify/clean, don't sync). All touch
    script.js/index.html → conflicts with S11, must follow.
  - **BLOCKED:** P0-3 GPU-length & cooler-height clearance — live Atlas 0/111
    case clearance fields → Track B prerequisite (the launch report's "data
    exists" claim was wrong; corrected here).
  - **NEEDS QUINN:** P0-8 live analytics IDs / Sentry DSN (accounts).
  - **GREEN (architect-verified 2026-06-20):** P0-7 data accuracy — availability
    sweep working (hidden priceless parts: 51 GPU / 97 RAM / 49 storage / 11
    mobo / 8 PSU / 11 case / etc.); confirm the GH Actions price-update cron is
    passing.

## Track B (queued, NOT a frontend slice) — physical-fit data acquisition
True physical-fit (GPU-length-in-case, cooler-height clearance, RAM clearance,
radiator fit) is blocked on missing dimensions data with NO reliable in-repo
source (Amazon ingest already yields ~0% case clearance; cases turn over too fast
to hand-curate like the 60-GPU benchmark table). Track B = a research/spike to
find a dimensions data source (manufacturer spec pages / a parts dataset) and a
sustainable population path, THEN a follow-on slice turns the checks on. Queued
behind Slice 9 per Quinn ("A then B"). Run via `/architect-research` when picked up.

## Decisions log (architect + human)

| Date | Decision | Why |
|------|----------|-----|
| 2026-06-13 | Run discovery research + audit before building | Request is discovery-scale; build features blind = backwards |
| 2026-06-13 | Slice 0 must establish a verification gate | Loop needs a gate; repo has none + 3 live console errors |
| 2026-06-14 | Slice 2 PHASE-0 disagreements both ACCEPTED, scope unchanged | (1) server.js has only `app.get('/')`+static, no catch-all — immaterial, dock injects into index.html served at `/`; (2) mobile.html is statically reachable but NOT the served experience (no UA redirect), stays OUT OF SCOPE. Gate frozen as-is; ruling governs reading of "not served". |
| 2026-06-14 | Tier-3 scope (Quinn) | BUILD: preset budget-tier builds (S4); bottleneck/balance meter (S5); public build showcase WITHOUT accounts/logins, on Copy-Link share + curated gallery (S6); agent-driven component auto-ingestion from Amazon for new GPU/mobo listings (S7, ties to findNewComponents.js + flaky-scraper fix). DEFER: accounts/email, multi-retailer pricing, standalone AI assistant. |
| 2026-06-14 | Slice 6 = curated themed gallery (Quinn) | Chose curated gallery over a localStorage "your shared builds" list — without accounts/DB, curated themed builds (assembled from live parts + Copy-Link share) are a credible public showcase; localStorage would be a personal-history feature, not a showcase. |
| 2026-06-14 | Slice 7 UX refinement after local review (Quinn) | Reviewed S1-S6 locally; builder page too cluttered. Decided: A1 (one collapsible quick-start strip) + B2 (merge dock into tab strip) + curate presets to 4; also remove Guides page, fix component cards to ~4:3 w/ more detail, widen build-summary, fix change-component scroll anchor. Auto-ingestion renumbered S6→S8. |
| 2026-06-19 | S9 re-scoped from physical-fit to data-backed compat depth; "A then B" (Quinn) | Atlas probe: physical-fit checks have 0% case-clearance data, no reliable source → would be no-ops/fabrication. Re-scoped S9 to GPU-connector (tdp≥300) + AM5-BIOS warnings (both data-backed) + S11 budget floor. True physical-fit moved to Track B (data-acquisition spike), queued behind S9. |
| 2026-06-19 | S9 verdict PASS/CONTINUE (independent judge); committed local 1c6010d, NOT pushed | Cold-session judge re-ran G1-G5 green, tamper/boundary clean. Push deferred (= prod deploy, ask Quinn). |
| 2026-06-19 | Slice 10 = full wizard-engine rework; add resolution Q + $500 floor ("go", Quinn) | Wizard `/api/ai-build` is a 2000-line procedural handler returning broken/partial builds. Rework into a clean fail-fast compatibility-aware allocator; add 1080p/1440p/4k question to size the GPU; lower floor to 500. Supersedes S9b. Same req/resp contract + new success:false failure path. |
| 2026-06-20 | Run the whole P0 launch list through the loop (Quinn) | Drives off `memory/2026-06-20-launch-readiness-report.md`. Started as Slice 11 (2 disjoint lanes: durable share + trust pages). |
| 2026-06-20 | P0 physical-clearance (GPU-len/cooler-height) BLOCKED, not in S11 (architect) | Live Atlas probe: cases 0/111 maxGpuLength, 0/111 maxCpuCoolerHeight, 0/111 radiatorSupport. Report's "data exists" was wrong. Only PSU-headroom is buildable (→ S12); GPU/cooler clearance needs Track B data acquisition. |
| 2026-06-20 | Mobile P0 de-scoped (architect) | server.js has NO UA redirect to mobile.html → mobile users get the responsive index.html; mobile.html (3507 lines) is an orphan. P0-4 = verify/clean the responsive main app (S12), not sync the dead file. |
| 2026-06-20 | S11 Lane A PASS; one P2 logged not fixed (architect) | All frozen gates green on independent run + cross-model review clean except malformed-JSON→500 (P2). Endpoint safe/correct for all real inputs; not worth churning a verified lane. Logged for next server-touching change. |
| 2026-06-20 | S11 Lane B PHASE-0 rulings, re-dispatched with no-halt rule (architect) | B halted at PHASE 0 twice (plan+disagreements, no files). All 4 disagreements ruled (footer classes OK; describe shipping server-store behavior; leave OG metadata; Plausible placeholder satisfies scaffold). Re-dispatched with an explicit "do not stop after PHASE 0" operating rule. |

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
| 2026-06-14 | Architect | slice-6 | (freeze + dispatch) | n/a | gates frozen `docs/gates/slice-6.md`; builder dispatched for curated showcase |
| 2026-06-14 | Builder | slice-6 | (uncommitted) | self: G1/G2/G3 pass | 4 themed builds via S4-helper reuse + showcase-e2e S1-S6; STATUS COMPLETE |
| 2026-06-14 | Architect | slice-6 | committed to main b995fee | G1✓ G2✓ G3✓ G4✓ | independent gate run; reuse-verified (applyBuildData + classifier + ?build= share, no server write), additive diff, 4 distinct 0/0 builds; merged, not pushed |
| 2026-06-14 | Architect | slice-7 | (freeze + dispatch) | n/a | gates frozen `docs/gates/slice-7.md`; builder dispatched for builder-page UX refinement (A1+B2, curate to 4, remove Guides); judge next session |
| 2026-06-20 | Architect | slice-11 | lane/slice-11-A 00129a6 | A: G1✓ G2✓ G3✓ G4✓ | Lane A (durable share) judged PASS, committed to lane branch; cross-model review = 1 P2 logged. Lane B halted at PHASE 0 twice → ruled + re-dispatched (no-halt). Integration deferred until B judged. |
| 2026-06-20 | Builder | slice-11-B | lane/slice-11-B dbc22e7 | self: trust 23/0, smoke 0/0 (UNJUDGED) | 3rd run (post no-halt rule) built full scope: 3 trust pages + footer + FTC disclosure + Plausible scaffold + trust-e2e. Boundary/tamper clean, checkpointed to lane branch; architect judges next session. |
| 2026-06-20 | Architect | slice-11 | slice/11 6af356e | B: G1✓ G2✓ G3✓; integ ✓ | Quinn OK'd same-session judge. Lane B judged PASS (architect-run trust-e2e 23/0 after killing a stale :3000 server that gave a false 404; smoke 0/0; diff clean). Merged both lanes → slice/11, integration GREEN (share+trust+smoke). HELD at push awaiting Quinn's go. |
| 2026-06-20 | Builder+Architect | slice-11p2 | c6e9044 / merged 9a305d6 | P-G1✓ P-G2✓ P-G3✓ P-G4✓ | Quinn chose "fold P2 then push". Froze micro-gate (5aa9854), dispatched 1-line fix (malformed JSON→400) + test assertion; verified malformed→400, share-e2e 10/10, smoke 0/0. Merged → slice/11 → **main + PUSHED origin/main (9a305d6)**. Prod deploy triggered. Worktrees/branches cleaned. |
| 2026-06-20 | Builder+Architect | slice-12 | 25f3346 / merged f682719 | G1✓ G2✓ G3✓ G4✓ | Compat filter toggle + PSU-undersize compatibility. Freeze e2fbb8e, xhigh. Architect-run (Quinn OK'd same-session): parse 0, compat-filter-e2e F1-F4 (live predicate/real data), smoke 0/0, diff clean (3 renderers reuse single predicate, warnings untouched). Merged to local main (f682719); worktree/branch cleaned. **HELD at push awaiting Quinn's go.** |

## Notes for next session

- Prior-session UX prototypes (build-review panel, sticky-dock, filter null-guards)
  were committed as baseline `ad6c470` before the Slice 1 gate freeze. Slice 2/3
  overlap them; reconcile before dispatching builders on those files.
- Slice 1 is committed to main locally but **not pushed** — push when ready.
- Untracked local-only files remain: `.claude/`, `scripts/.update_progress.json`
  (not part of the slice; left alone).
- GPU price-history feature shipped to main (commit 13832b6) and is live.
