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
- If `resolution` is absent/invalid, server defaults it to the budget tier's
  highest sensible target (see tiers below; e.g. a $700 build defaults to 1080p).
- Budget floor is **500** (was 1000) in the server guard AND the client
  guards/inputs.

ADAPTIVE QUESTIONING (budget-tier gating — frozen thresholds, tunable later):
The wizard must NOT ask questions whose answers the budget can't support, and the
server must DEFENSIVELY enforce the same ceilings even if a client sends past them.
- `MONITOR_MIN = 800`: the monitor question is shown ONLY when budget >= 800.
  Below that, the question is skipped and `includeMonitor` is effectively false.
- Resolution options offered by budget:
  - budget <  1000  → 1080p ONLY (resolution question auto-resolves to 1080p / is
    skipped since there is one option).
  - 1000 <= budget < 2000 → 1080p, 1440p.
  - budget >= 2000 → 1080p, 1440p, 4k.
- SERVER DEFENSE (do not trust the client): clamp an incoming `resolution` DOWN to
  the budget tier's ceiling (e.g. `4k` at a $1200 budget → treated as `1440p`); and
  treat a monitor as the LAST optional add — include it only when a COMPLETE,
  compatible tower already fits and real headroom remains. If a monitor would break
  the budget or the core build, omit it (response reflects no monitor) rather than
  compromise the tower. A 4k monitor is only ever paired with a build whose budget
  tier unlocks 4k.

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
- **W8 adaptive ceilings (server defense):** (a) a request with budget < 800 +
  `includeMonitor:true` returns a build with NO monitor (monitor omitted, tower
  intact); (b) a request with budget < 2000 + `resolution:'4k'` is clamped — the
  returned build does NOT contain a 4k monitor and its GPU sizing reflects at most
  the tier ceiling (<= 1440p), never 4k. Add explicit scenarios:
  600/single/4k+monitor and 1200/single/4k+monitor for this.
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

## G5 — Client (adaptive resolution/monitor questions + floor)
- A new resolution question (options gated by budget tier per the contract:
  <1000 → 1080p only/skip; 1000–1999 → 1080p+1440p; >=2000 → +4k) is reachable;
  `wizardData.resolution` is set and included in the `/api/ai-build` POST body.
- The monitor question is SHOWN only when budget >= 800 and SKIPPED below it
  (verified by driving the wizard at a <800 budget and confirming the monitor
  step does not appear / `includeMonitor` ends false).
- 4k is NOT offered as a selectable resolution when budget < 2000 (verified by
  driving the wizard at a mid budget).
- `#budgetSlider` min <= 500, `#budgetInput` min <= 500, and the client validation
  guard (`index.html:~2454`) accepts budgets down to 500.
- G2 smoke remains `0/0`; the wizard is navigable end-to-end at a low budget
  (questions correctly skipped) and a high budget (all questions shown) without
  throwing.

## Slice verdict
PASS requires G1, G2, G3, G5 measured green AND G4 review clean. Then KILL/CONTINUE.
High-stakes (server algorithm + persistence-shape contract) → architect adds a
cross-model `codex review` pass before the verdict.
