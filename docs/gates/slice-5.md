# Gates — Slice 5: CPU↔GPU bottleneck / balance meter

Frozen BEFORE dispatch. Read-only after. Architect runs every gate itself
against the live DB-backed server on :3000. A builder edit to any file under
docs/gates/ (caught by git diff) is an automatic slice FAIL.

## G1 — JS parses
- `node --check public/script.js` exits 0.

## G2 — smoke regression
- `npm test` (== `node test/smoke.js`) prints `CONSOLE ERRORS: 0` and
  `PAGE ERRORS: 0`, exit 0.

## G3 — balance-meter behavior (architect runs `node test/bottleneck-e2e.js`
   against :3000; builder writes the test). One PASS/FAIL line per check; exit
   nonzero on any FAIL. The test loads real parts from /api/parts and drives the
   live UI (pattern from test/presets-e2e.js / test/compat-e2e.js).
- **B1 meter renders:** with a CPU and a GPU in `window.partsDatabase.currentBuild`,
  a balance-meter element (`[data-balance-meter]`) is present and visible and
  exposes a discrete state/label plus a 0–100 balance position.
- **B2 differentiates direction:** a build pairing a top-ranked CPU with a
  bottom-ranked GPU and a build pairing a bottom-ranked CPU with a top-ranked GPU
  yield DIFFERENT meter states. The weak-CPU + strong-GPU build is flagged as
  CPU-limited (a "CPU bottleneck"/CPU-limited state); the strong-CPU + weak-GPU
  build is NOT labeled a CPU bottleneck.
- **B3 neutral when incomplete:** with a CPU but no GPU (or a GPU but no CPU),
  the meter shows a neutral "add the other part" state — no fabricated score,
  no bottleneck verdict.
- **B4 plain-language explanation:** the rendered meter includes a non-empty,
  human-readable sentence explaining the verdict (not just a number).
- **B5 derives from existing perf functions (anti-fabrication):** the meter's
  computed CPU and GPU scores, read from its state, equal
  `partsDatabase.getCpuPerformance(cpu)` / `getGpuPerformance(gpu)` (or the
  multi-thread variant) for the loaded parts — no invented benchmark numbers.

## G4 — intent (architect reads the diff)
- Balance scores derive ONLY from the existing `getGpuPerformance`,
  `getCpuPerformance`, `getCpuMultiThreadPerformance` — no new hardcoded
  benchmark tables or fabricated TFLOP/FPS constants.
- The meter mounts into the live build-refresh path via ONE added call site
  (named by the builder in PHASE 0); it does NOT alter the Slice-1 classifier,
  Slice-2 dock functions, Slice-3 review/freshness, Slice-4 starter-build
  functions, or the wizard question/submit flow.
- No duplicated compatibility logic; the meter is presentation over existing
  performance metrics.

## Out of scope — touching these FAILS the slice
- `server.js`, `models/`, `scripts/`, `package.json`, `public/mobile.html`.
- The Slice-1 classifier internals, Slice-2 dock functions, Slice-3 review/
  freshness functions, Slice-4 starter-build functions, and the wizard
  question/submit flow (the meter may CALL performance helpers, not edit them).
- Public build showcase (Slice 6), component auto-ingestion (Slice 7),
  multi-retailer pricing, accounts/alerts.
