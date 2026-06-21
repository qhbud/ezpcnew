# Gates — Slice 14 (P0): mobile regression guard + remove orphan mobile.html

FROZEN before dispatch. Read-only. Architect runs every gate at judgment and
compares against this verbatim text. A builder edit to any file under
`docs/gates/` is an automatic slice FAIL. Gate-pass is necessary, not sufficient.

Single lane.

Context (architect recon 2026-06-20): the responsive main app (`index.html`) is
already clean on mobile — at 390x844 there is ZERO horizontal overflow on all
tabs/views (gpu/cpu/motherboard/ram/psu/cooler/case/storage/addon/builder/wizard)
and ZERO console errors; tap targets are adequate (main tabs 34px, action buttons
60px, nav scrolls). `public/mobile.html` (3507 lines) is a TRUE ORPHAN — referenced
by no link, no `<script>`, no server route, and the server has NO user-agent
redirect (mobile users already get `index.html`). This slice (1) locks in the good
mobile state with a regression-guard e2e and (2) deletes the dead `mobile.html`.

---

**G1 — Parse.** `node --check test/mobile-e2e.js` exits 0.

**G2 — Smoke (architect-run).** With a local server on :3000, `npm test`
(test/smoke.js) prints `CONSOLE ERRORS: 0` and `PAGE ERRORS: 0` (deleting
mobile.html must not affect the served app).

**G3 — Mobile e2e (architect-run).** `node test/mobile-e2e.js` against a running
local server, driving the live app with Puppeteer at viewport 390x844
(isMobile, hasTouch), all assertions PASS:
1. **No horizontal overflow.** On initial load AND after switching to each tab
   (gpu, cpu, motherboard, ram, psu, cooler, case, storage, addon, builder,
   wizard), `document.documentElement.scrollWidth <= window.innerWidth + 2`.
2. **No errors.** Across that walk, 0 uncaught page errors and 0 console errors
   (excluding benign `Failed to load resource` network noise).
3. **Key controls present & usable.** The tab nav (`.main-nav`/`.main-tab`), the
   build summary (`.build-summary-box`), and at least one component list/featured
   card render with non-zero size at mobile width; the component-list compat filter
   toggle (`.compat-only-toggle`) is present on a list tab.
4. **Orphan removed.** `GET /mobile.html` returns HTTP 404 (the file is deleted and
   no longer served).

**G4 — Diff review (architect).** All must hold:
- `public/mobile.html` is DELETED. Confirm it was referenced nowhere before
  deletion (no link/script/route) — record the search; a real inbound reference
  would make deletion a FAIL (fix the reference or keep the file instead).
- `test/mobile-e2e.js` drives the LIVE app (real `window.partsDatabase` / real DOM
  at a mobile viewport) — it does not hardcode/fake layout numbers.
- No change to `index.html`, `script.js`, `server.js`, styles, models, or any other
  test. No new dependency.
- Only `test/mobile-e2e.js` (new), the deletion of `public/mobile.html`, and
  `docs/lanes/slice-14-00.md` (new) appear in the diff.
