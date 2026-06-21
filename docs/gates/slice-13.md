# Gates — Slice 13 (P0): resilient loading / error / empty states across tabs

FROZEN before dispatch. Read-only. Architect runs every gate at judgment and
compares against this verbatim text. A builder edit to any file under
`docs/gates/` is an automatic slice FAIL. Gate-pass is necessary, not sufficient —
architect reads the diff against intent too.

Single lane.

Context (grounded 2026-06-20): the app has global `#loading` / `#error` elements
(index.html:1703/1708) and `showLoading/hideLoading/showError/hideError` helpers
(public/script.js ~3667-3681) that do BARE `getElementById('loading').classList…`
(throw if the element is ever absent). Category loaders are INCONSISTENT:
`loadAllGPUs` (~2368) shows loading + error states, but `loadAllStorage` (~2299),
`loadAllCases` (~2322) and `loadAllAddons` (~2345) only `console.error` on failure —
a failed/slow fetch leaves those tabs silently blank. This slice makes
loading/error handling consistent and null-safe so no tab silently breaks.

OUT OF SCOPE (do NOT do here): mobile-responsive verification → Slice 14; mass
null-guarding of all 56 unrelated `getElementById(...).X` sites (no current crash —
smoke is 0/0); any new feature; global search/export/etc.

---

**G1 — Parse.** `node --check public/script.js` exits 0.

**G2 — Smoke (architect-run).** With a local server on :3000, `npm test`
(test/smoke.js) prints `CONSOLE ERRORS: 0` and `PAGE ERRORS: 0` (cold load still
clean).

**G3 — Resilience e2e (architect-run).** `node test/resilience-e2e.js` against a
running local server, driving the live app with Puppeteer, all PASS:
1. **R1 cold load clean.** Page loads with 0 console errors (excluding benign
   `Failed to load resource` network noise) and 0 uncaught page errors; `#loading`
   ends hidden; switching to every component tab (gpu, cpu, motherboard, ram, psu,
   cooler, case, storage, addon) throws nothing.
2. **R2 failed category fetch degrades gracefully.** With Puppeteer request
   interception aborting one category endpoint (e.g. `**/api/parts/storages` —
   pick one of the previously-unhandled loaders), triggering that category's load
   surfaces a VISIBLE, human-readable error state (the global `#error` shown OR a
   per-tab/list error notice present in that tab's container) AND produces NO
   uncaught page error. A different, non-aborted category still loads its list
   normally (partial failure is isolated).
3. **R3 null-safe state helpers.** After removing `#loading` AND `#error` from the
   DOM, calling `showLoading()`, `hideLoading()`, `showError()`, `hideError()` each
   returns without throwing.
4. **R4 empty state.** A component list rendered with zero items shows a non-empty,
   human-readable empty/notice message (not a blank container) and no error.

**G4 — Diff review (architect).** All must hold:
- `showLoading` / `hideLoading` / `showError` / `hideError` are null-safe (guard the
  `getElementById` result before touching `.classList`); they no-op when the element
  is absent instead of throwing.
- EVERY category loader that can fetch (`loadAllStorage`, `loadAllCases`,
  `loadAllAddons`, and any other loader that previously only `console.error`-ed)
  now surfaces a visible error state on a failed/non-ok fetch — consistent with the
  `loadAllGPUs` pattern — and never throws out of the loader. The happy-path data
  shape/filtering is unchanged.
- The error surface reuses the existing `#error`/`#loading` elements and/or the
  existing list empty-notice pattern (`mobo-results-empty`); no fabricated data, no
  new dependency.
- Changes are scoped to the state helpers + the loaders + their error surfacing —
  NOT a mass rewrite of unrelated `getElementById` sites or list rendering.
- Slice 12's compat filter, sorting, selection, and existing empty states still work.
- Only `public/script.js`, `public/styles-v5.css` (error/empty styling only, if
  needed), `test/resilience-e2e.js` (new), and `docs/lanes/slice-13-00.md` (new)
  changed. `index.html`, `server.js`, models, scripts, other tests untouched.
