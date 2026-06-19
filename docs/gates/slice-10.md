# Gates — Slice 10 (PC-builder wizard recommendation-engine REWORK)

FROZEN before dispatch. Architect quotes verbatim when judging. Any builder edit
to a file under `docs/gates/` (caught by `git diff`) = automatic FAIL.

Scope: completely rework the wizard recommendation algorithm (the ~2000-line
`POST /api/ai-build` handler in `server.js:~1488-3552`) into a clean,
compatibility-aware, fail-fast allocator; add a resolution question to the client
wizard; lower the budget floor to $500. Same REQUEST/RESPONSE contract (below) so
the rest of the client keeps working. New integration test. Tests assume a local
server at `http://localhost:3000` (`node server.js` + local Mongo).

## Frozen contract (read-only once set)
REQUEST `POST /api/ai-build` — existing fields PLUS new `resolution`:
`{ budget: number|'unlimited', performance: 'single'|'multi', storage: <GB>,
   includeMonitor: boolean, resolution: '1080p'|'1440p'|'4k' }`
- If `resolution` is absent/invalid, server defaults it to `'1440p'` (back-compat).
- Budget floor is **500** (was 1000) in the server guard AND the client
  guards/inputs.

RESPONSE — UNCHANGED success shape:
`{ success:true, build:{cpu,gpu,motherboard,ram,storage,psu,case,cooler,
   monitor?...}, totalCost, budget, underBudget, wizardData, debug }`
- NEW fail-fast shape when no viable build exists at the target:
  `{ success:false, error:<msg>, reason:<short machine reason> }` (HTTP 200).
  The handler must NEVER return `success:true` with a missing/undefined/null
  core component (cpu, gpu, motherboard, ram, storage, psu, case).

## G1 — Parse
`node --check server.js`, `node --check public/script.js` (if touched), and
`node --check test/wizard-rec-e2e.js` each exit 0.

## G2 — Smoke (no regressions)
`npm test` (= `node test/smoke.js`) prints `CONSOLE ERRORS: 0` and
`PAGE ERRORS: 0`, exit 0.

## G3 — Wizard integration test (`node test/wizard-rec-e2e.js`, exit 0, all PASS)
Hits the LIVE running server's `POST /api/ai-build` over a representative matrix
(at least these ~10 scenarios; builder may add more):
  [budget × perf × resolution]: 700/single/1080p, 800/multi/1080p,
  1200/single/1440p, 1200/multi/1440p, 2000/single/1440p, 2000/single/4k,
  3500/single/4k, 3500/multi/4k, unlimited/single/4k, 900/single/1080p+monitor.
For EVERY `success:true` build, assert:
- **W1 completeness:** `cpu, gpu, motherboard, ram, storage, psu, case` are all
  present (not null/undefined); a cooler is present unless the CPU includes a
  stock cooler; every selected part has a non-empty name AND a numeric price > 0.
- **W2 compatibility (zero hard violations):** `cpu.socket === motherboard.socket`;
  RAM `memoryType` is supported by the motherboard; `psu.wattage >=` the derived
  recommended wattage (approx `gpu.tdp + cpu.tdp + 150`, your formula stated in
  code); motherboard form factor fits the case form factor.
- **W3 budget:** for finite budgets `totalCost <= budget`; utilization is
  reasonable (`totalCost >= 0.70 * budget` for budgets `>= 800`) — i.e. it does
  not leave large money unspent.
- **W4 resolution drives GPU:** holding budget+performance fixed, the chosen GPU's
  performance score (via the repo's GPU benchmark index / `getGpuPerformance`) is
  **non-decreasing** as resolution goes 1080p → 1440p → 4k (proves resolution
  actually sizes the GPU). Test at a fixed budget (e.g. 2000/single).
- **W5 fail-fast:** at least one deliberately unsatisfiable target returns
  `success:false` with a `reason`, and NO scenario ever returns `success:true`
  with a missing core part (W1 covers the positive side).
- **W6 anti-fabrication:** every returned part exists in live `/api/parts/<cat>`
  data (match by id/asin/name) — the algorithm must not invent parts.
- **W7 sub-$1000:** the 700/single/1080p scenario returns `success:true` with a
  complete, W2-compatible build (proves the floor was lowered and the low-budget
  path works).
Print `PASS <id>` / `FAIL <id>: <why>` per assertion; `process.exitCode = 1` on
any failure.

## G4 — Diff review (architect, judged NEXT session)
- The new algorithm is a coherent, readable pipeline (named selection/allocation
  helpers) — NOT the old 2000-line procedural block reshuffled. No dead branches
  left behind.
- Response success shape preserved exactly; new `success:false` failure path used
  instead of ever emitting a partial build.
- Reuses existing data/helpers where they exist (GPU benchmark index /
  `getGpuPerformance`, `getCPUTDP`, the `/api/parts` collections). No fabricated
  parts, no hardcoded part lists.
- Concrete prior bugs fixed: case & cooler no longer sorted by *highest* price;
  the `storages` collection name is used consistently (no `'storage'` singular
  typo); unlimited-budget output is coherent (no 2×GPU / 3×monitor gimmick unless
  PSU/case/cooler scale with it); monitor (when included) matches the chosen
  resolution, not just "cheapest".
- Client error handling: a `success:false` response is shown to the user
  gracefully (no console error, no blank modal).
- Budget floor lowered to 500 in BOTH the server guard and the client guards.

## G5 — Client (resolution question + floor)
- A new resolution question (1080p / 1440p / 4k) is reachable in the wizard flow;
  `wizardData.resolution` is set and included in the `/api/ai-build` POST body.
- `#budgetSlider` min ≤ 500, `#budgetInput` min ≤ 500, and the client validation
  guard (`index.html:~2454`) accepts budgets down to 500.
- G2 smoke remains `0/0`; the full wizard (all questions) is navigable without
  throwing.

## Slice verdict
PASS requires G1, G2, G3, G5 measured green AND G4 review clean. Then KILL/CONTINUE.
High-stakes (server algorithm + persistence-shape contract) → architect adds a
cross-model `codex review` pass before the verdict.
