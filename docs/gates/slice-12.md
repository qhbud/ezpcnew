# Gates — Slice 12 (P0): compatibility filter toggle + PSU-undersize compatibility

FROZEN before dispatch. Read-only. Architect runs every gate at judgment and
compares against this verbatim text. A builder edit to any file under
`docs/gates/` is an automatic slice FAIL. Gate-pass is necessary, not sufficient —
architect reads the diff against intent too.

Single lane.

Context: component lists already compute per-row incompatibility via the single
predicate `isCompatibleWithBuild(kind, item)` (public/script.js ~10745) and grey
incompatible rows (`mobo-row-incompat` / "may not fit build"). There is NO way to
FILTER the list to compatible parts (every competitor has this). Also
`isCompatibleWithBuild` has no PSU branch, so an undersized PSU is never greyed.
A PSU 80%-headroom WARNING already exists in `classifyCompatibilityIssues`
(~5780-5791) and must stay; this slice does NOT touch that warning.

---

**G1 — Parse.** `node --check public/script.js` exits 0. (If server.js is touched
at all — it should not be — `node --check server.js` also exits 0.)

**G2 — Smoke (architect-run).** With a local server on :3000, `npm test`
(test/smoke.js) prints `CONSOLE ERRORS: 0` and `PAGE ERRORS: 0`. The toggle must
not throw on any tab, including a cold load with an empty build.

**G3 — Compat-filter e2e (architect-run).** `node test/compat-filter-e2e.js`
against a running local server, driving the LIVE app (`window.partsDatabase`) on
real `/api/parts` data (no reimplemented compatibility logic in the test), all
assertions PASS:
1. **Toggle present.** Every component list tab that renders a list
   (gpu, cpu, motherboard, ram, psu, cooler, case, addon) exposes a
   "compatible only" filter control in its list header.
2. **Filter hides incompatibles.** With a build that renders some items
   incompatible (e.g. choose a motherboard of one socket, then on the CPU tab),
   turning the filter ON yields a visible row set whose every remaining item
   satisfies `partsDatabase.isCompatibleWithBuild(kind, item) === true`, and the
   visible count is <= the unfiltered count; turning it OFF restores the full set.
3. **PSU undersize is incompatible.** For a build whose estimated draw
   (`calculateEstimatedWattage().total`) is > 0, a PSU whose `wattage` is below
   that draw returns `isCompatibleWithBuild('psu', psu) === false`; a PSU with
   ample wattage returns `true`. Null/unknown wattage or zero draw → `true`
   (never falsely incompatible).
4. **Empty state, no crash.** When the filter removes every row, the list shows a
   non-empty, human-readable empty/notice message (not a blank container) and no
   console/page error is produced.

**G4 — Diff review (architect).** All must hold in the diff:
- The filter reuses the SINGLE existing `isCompatibleWithBuild` predicate — NO
  duplicated/parallel compatibility rules anywhere.
- Filter state is shared and re-renders the affected list(s); the SAME filter is
  honored by EVERY list renderer that computes incompat — the generic
  `_renderTabList` (~15044) AND the GPU custom list (~15769) AND the motherboard
  custom list (~17067). No list renderer silently ignores it.
- The new PSU branch in `isCompatibleWithBuild` is additive and null-safe: an
  undersized PSU (`wattage` > 0 AND estimated draw > 0 AND wattage < draw) is the
  only new false; unknown wattage or zero draw stays compatible. Uses the existing
  `calculateEstimatedWattage`; adds no fabricated field.
- The existing PSU 80%-headroom warning and GPU-length warnings in
  `classifyCompatibilityIssues` are UNCHANGED (not removed, not duplicated).
- Sorting, row selection, scatter<->list sync, and status badges still work
  (filter composes with sort; it does not break selection).
- No new dependency. Toggle is keyboard-reachable and labeled.
- Only `public/script.js`, `public/styles-v5.css`, `test/compat-filter-e2e.js`
  (new), and `docs/lanes/slice-12-00.md` (new) changed. `index.html`, `server.js`,
  models, scripts, other tests untouched.

---

## Out of scope for Slice 12 (do NOT build here)
- GPU-length / cooler-height physical clearance filtering → BLOCKED (live Atlas
  0/111 case clearance fields; Track B). Keep the existing length WARNING only.
- Empty/loading/error states for the rest of the app, leftover UX null-guards,
  mobile-responsive verification → Slice 13.
- Global search, export, multi-retailer, accounts → P1.
