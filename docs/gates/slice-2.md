# Gates — Slice 2: sticky build dock (component tabs + mobile, severity-aware)

Frozen BEFORE dispatch. Read-only after. Architect runs every gate itself
against the live DB-backed server on :3000. A builder edit to any file under
docs/gates/ (caught by git diff) is an automatic slice FAIL.

## G1 — JS parses
- `node --check public/script.js` exits 0.

## G2 — smoke regression (no new console errors)
- `npm test` (== `node test/smoke.js`) prints `CONSOLE ERRORS: 0` and
  `PAGE ERRORS: 0`, exit 0.

## G3 — dock behavior (architect runs `node test/dock-e2e.js` against :3000;
   builder writes the test). One PASS/FAIL line per check; exit nonzero on any FAIL.
- **D1 visibility:** `#buildDock` is hidden on the builder tab and on initial
  page load (home), and is visible on at least one component tab (e.g. `gpu`).
- **D2 metrics:** after a known build is assigned and the dock updated, the dock
  part-count and total ($) reflect that build (count matches number of selected
  components; total matches `totalPrice`).
- **D3 severity (reconciled with Slice 1):** driving the same three scenarios as
  Slice 1 —
  - hard-incompatible build → dock status conveys a **problem** state (distinct
    problem class/styling, not the generic warning state);
  - tight-PSU-only build → dock status conveys a **warning** state with **no**
    problem state;
  - fully compatible build → dock status conveys a **clean / no-issues** state.
- **D4 mobile anchored:** at a phone viewport (e.g. 390×844) the `#buildDock`
  bounding rect is fully within the viewport height while a component tab is
  active (the build is not buried below the fold).

## G4 — intent (architect reads the diff)
- Dock severity is derived from the **single Slice-1 classifier**
  (`classifyCompatibilityIssues`) or its rendered result — NOT a second,
  duplicated set of compatibility rules in the dock.
- Dock status visually distinguishes hard **problem** vs soft **warning** vs
  **clean**, consistent with the Slice-1 panel.
- The mobile dock is anchored/visible (fixed or sticky to the viewport on narrow
  widths), addressing the "build buried at page bottom on mobile" hole.
- Slice-1 behavior is unchanged: `classifyCompatibilityIssues` and
  `checkCompatibility` are not modified (read-only use only).

## Out of scope — touching these FAILS the slice
- `public/index.html` structure, `public/mobile.html` (legacy, not served),
  `server.js`, `models/`, `scripts/`, `package.json` deps.
- The Slice-1 compatibility classifier / panel logic, the wizard, the
  build-review panel (Slice 3), and component-tab card rendering.
- Per-card "select for your build & return" affordance and inline on-card
  compatibility — explicitly a LATER slice. No new data/scraping, no DB writes.
