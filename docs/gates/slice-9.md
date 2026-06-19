# Gates — Slice 9 (compatibility depth: PSU-connector + BIOS warnings; + S11 budget floor)

FROZEN before dispatch. Architect quotes these verbatim when judging. Any builder
edit to a file under `docs/gates/` (caught by `git diff`) = automatic FAIL.

Scope: extend the SINGLE `classifyCompatibilityIssues(build, wattageInfo)` in
`public/script.js` with TWO new data-backed WARNINGS (never hard problems), and
lower the wizard budget floor in `public/index.html`. NO physical-fit checks
(case/GPU-length/cooler-height/RAM-clearance/radiator) — those are data-blocked
and deferred to a separate track. NO server/model/scraper/styling changes.

Tests assume a local server at `http://localhost:3000` (`node server.js` with
local Mongo) — start it before G2/G3.

## G1 — Parse
`node --check public/script.js` exits 0. `node --check test/compat-depth-e2e.js`
exits 0. (index.html has no node check; covered by G2/G5.)

## G2 — Smoke (no regressions)
`npm test` (= `node test/smoke.js`) prints `CONSOLE ERRORS: 0` and
`PAGE ERRORS: 0`, exit 0.

## G3 — New behavior (`node test/compat-depth-e2e.js`, exit 0, every scenario PASS)
Drives the LIVE `partsDatabase.classifyCompatibilityIssues(build, wattageInfo)`
via `page.evaluate` (model on `test/compat-e2e.js`), using fixtures built from
real `/api/parts` data where possible or explicit field-only stub parts:

- **C1 (connector advisory FIRES):** build whose GPU has `tdp >= 300` →
  `warnings` contains an item whose title/detail references a 12VHPWR / 12V-2x6 /
  high-power power connector (ATX 3.0/3.1). It is in `warnings`, NOT `problems`.
- **C2 (no false positive):** build whose GPU has `tdp < 300` (e.g. 200) → that
  connector advisory is ABSENT.
- **C3 (BIOS trap FIRES):** CPU with `socket: 'AM5'` and a Ryzen-9000-class name
  (e.g. "AMD Ryzen 7 9700X") + motherboard whose `chipset` matches a 600-series
  AM5 board (A620/B650/B650E/X670/X670E) → `warnings` contains a BIOS-update
  advisory (title/detail references BIOS update / POST / BIOS Flashback). In
  `warnings`, NOT `problems`.
- **C4 (no false positive):** same Ryzen-9000 CPU + an 800-series board
  (B850/X870/X870E) → BIOS advisory ABSENT; AND a non-9000 AM5 CPU (e.g.
  "Ryzen 5 7600X") + 600-series board → BIOS advisory ABSENT.
- Every new warning object has a non-empty plain-language `detail` string.

## G4 — Diff review (architect, judged NEXT session)
- All new logic lives inside the single `classifyCompatibilityIssues` (plus at
  most small pure helpers in the same file); no second/duplicated rule engine.
- Diff to `public/script.js` is additive to the existing check set — existing
  socket/RAM/form-factor/wattage/cooler checks unchanged in behavior.
- New checks read ONLY existing build fields (`gpu.tdp`, `cpu.socket`, cpu name,
  `motherboard.chipset`); they must NOT depend on the 0%-coverage physical-fit
  fields (`maxClearance`, `dimensions.length`, etc.) and must NOT fabricate data.
- Both new items are WARNINGS (honest: connectors/BIOS can't be proven from data,
  only flagged). No new hard `problems`.
- No edits to `server.js`, `models/*`, `scripts/*`, other tests, `data/*`, or the
  render pipeline (existing render already iterates `warnings[]`).

## G5 — S11 budget floor
- In `public/index.html` the wizard `#budgetSlider` `min` attribute is `<= 500`
  (was `1000`); slider min/step/default remain internally consistent (default
  still within [min,max]).
- G2 smoke remains `0/0` (no console errors introduced by the lowered floor).
- Setting the budget to the new floor and running the wizard does not throw
  (verified either by an added scenario in compat-depth-e2e or by smoke staying
  clean with the wizard reachable).

## Slice verdict
PASS requires G1, G2, G3, G5 measured green AND G4 review clean. Then KILL/CONTINUE.
