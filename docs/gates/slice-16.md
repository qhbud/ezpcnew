# Gates — Slice 16 (P1): global component search

FROZEN before dispatch. Read-only. Architect runs every gate at judgment and
compares against this verbatim text. A builder edit to any file under
`docs/gates/` is an automatic slice FAIL. Gate-pass is necessary, not sufficient.

Single lane.

Context: EZPC has only per-tab filter inputs — no way to search across ALL
categories at once (a PCPartPicker/competitor table-stakes feature, per the
2026-06-20 launch-readiness report). `GET /api/parts` already returns every
priced part across the 8 component collections (cpus, motherboards, gpus, rams,
storages, psus, cases, coolers) with a `category` field attached and invalid
prices filtered out — but via a REDUCED `LIST_PARTS_PROJECTION`, so those docs
are NOT safe to feed straight into the build/selection engine. The frontend
already has `switchTab(tabName)`, lazy per-tab loaders (`loadAllCPUs`, etc.)
that fetch FULL docs into `this.allCPUs`/`this.allGPUs`/… and render them into
per-tab result containers, plus `showToast`. Per-component display name =
`title||name`, price = `salePrice||currentPrice||basePrice||price`.

---

**G1 — Parse.** `node --check public/script.js` exits 0.

**G2 — Smoke (architect-run).** Local server on :3000, `npm test` prints
`CONSOLE ERRORS: 0` and `PAGE ERRORS: 0` (global search does not break any tab).

**G3 — Global-search e2e (architect-run).** `node test/global-search-e2e.js`
against a running local server, driving the LIVE app (`window.partsDatabase`,
real parts), all PASS:
1. **Cross-category results.** Typing a query that exists in more than one
   category (the test picks a substring that real data shares across ≥2 of the 8
   categories) opens a results panel whose items span ≥2 distinct categories;
   each rendered result shows the component display name, a category label, and a
   price. (Drive via the real search input/UI; assert against the app's own
   rendered results, do not reimplement matching in the test.)
2. **Substring + case-insensitive.** A lowercased substring of a known product's
   real name returns that product among the results; an UPPERCASE version of the
   same substring returns the same product (case-insensitive).
3. **Click navigates + selects/locates the real part.** Clicking a result for a
   component in category C: (a) makes C's component tab the active tab
   (`switchTab`), AND (b) the clicked component is either selected into
   `this.currentBuild` at its slot using a FULL document (not the projected
   search doc) OR is highlighted/scrolled-to in C's tab list with a marker the
   test can read (a highlight class on the matching row). Assert whichever the
   build implements, against app state — not the test's own copy.
4. **No-match + dismiss guarded.** A query with no matches shows a visible
   "no results"/empty message (no crash, no console error). Clearing the input
   (or pressing Escape) closes/empties the results panel. Searching with the
   parts not yet loaded does not throw.

**G4 — Diff review (architect).** All must hold:
- Pure CLIENT-SIDE: search reads parts from ONE cached `GET /api/parts` fetch
  (or already-loaded per-tab arrays) and filters in the browser. NO `server.js`
  change, no new route, no DB write, no new server `$text` index dependency.
- Click-through does NOT feed the reduced-projection search doc into the build
  engine: it routes through the existing full-data per-tab path (re-using
  `switchTab` + the tab's loaded full docs / `selectComponent`), so build
  statistics never receive a partial document.
- Result names are inserted safely (escaped) — a product title containing
  `<`, `>`, `&`, or quotes cannot inject markup into the results panel.
- Input is debounced (no fetch/filter storm per keystroke); the `/api/parts`
  fetch happens at most once and is reused.
- Empty/no-match and not-yet-loaded paths are guarded (no throw).
- Existing per-tab filters, Slice-12 compat filter, Slice-13 states, and
  Slice-15 export still work.
- No new dependency.
- Only `public/script.js`, `public/index.html` (search input + results-panel
  markup only), `public/styles-v5.css`, `test/global-search-e2e.js` (new), and
  `docs/lanes/slice-16-00.md` (new) changed. `server.js`, models, scripts, other
  tests untouched.

---
## Out of scope (not here)
- Server-side search endpoint / `$text` index, fuzzy/typo-tolerant ranking,
  search-by-spec filters, addons in search scope, search analytics, keyboard
  arrow-key navigation of results (Escape-to-close is required; arrow nav is not).
  Name-substring search across the 8 priced categories + click-to-locate only.
