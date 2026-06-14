# Gates — Slice 4: preset budget-tier starter builds

Frozen BEFORE dispatch. Read-only after. Architect runs every gate itself
against the live DB-backed server on :3000. A builder edit to any file under
docs/gates/ (caught by git diff) is an automatic slice FAIL.

## G1 — JS parses
- `node --check public/script.js` exits 0.

## G2 — smoke regression
- `npm test` (== `node test/smoke.js`) prints `CONSOLE ERRORS: 0` and
  `PAGE ERRORS: 0`, exit 0.

## G3 — preset behavior (architect runs `node test/presets-e2e.js` against :3000;
   builder writes the test). One PASS/FAIL line per check; exit nonzero on any FAIL.
- **P1 tiers render:** a preset/"Starter Builds" UI exposes at least 3 distinct
  tiers (e.g. Entry / Mainstream / Enthusiast).
- **P2 complete builds from real data:** each tier resolves to a build containing
  at minimum cpu, gpu, motherboard, ram, psu, case, and storage, every part drawn
  from the live /api/parts data (real ids/names — no fabricated parts).
- **P3 compatibility-correct:** each preset build, run through the existing
  `classifyCompatibilityIssues(build, wattageInfo)`, yields ZERO hard problems.
  (Warnings are allowed; hard problems are not.)
- **P4 one-click load:** loading a preset populates the builder — after load,
  `window.partsDatabase.currentBuild` contains the preset's cpu+gpu+motherboard
  (at least), and the active tab is the builder.
- **P5 tiers differentiated:** preset totals are strictly increasing
  Entry < Mainstream < Enthusiast, with Entry under ~$1100 and Enthusiast over
  ~$1800 (sanity band; builder confirms feasibility vs live data in PHASE 0).

## G4 — intent (architect reads the diff)
- Presets LOAD via the existing `applyBuildData(...)` (or `loadAndAddComponentById`)
  path and validate compatibility via the existing `classifyCompatibilityIssues`
  — no duplicated build-loading or compatibility logic.
- Preset parts come only from live data; no hardcoded/fabricated component specs
  or prices.
- Slice-1 classifier, Slice-2 dock, Slice-3 review/freshness, and the wizard
  question/submit flow are unchanged (presets may CALL the classifier, not edit it).

## Out of scope — touching these FAILS the slice
- `server.js`, `models/`, `scripts/`, `package.json`, `public/mobile.html`.
- The Slice-1 classifier internals, Slice-2 dock functions, Slice-3 review/
  freshness functions, and the wizard question/submit flow.
- No new server routes, no DB writes, no `/api/ai-build` dependency required
  (client-side assembly preferred; if the builder reuses /api/ai-build it must
  justify latency/determinism in PHASE 0).
- Bottleneck meter (Slice 5), showcase (Slice 6), auto-ingestion (Slice 7).
