# Gates — Slice 7: builder-page UX refinement

Frozen BEFORE dispatch. Read-only after. Architect runs every gate itself
against the live DB-backed server on :3000. A builder edit to any file under
docs/gates/ (caught by git diff) is an automatic slice FAIL.

This slice INTENTIONALLY revises Slice-2 (dock), Slice-4 (starter builds), and
Slice-6 (showcase) presentation. It must PRESERVE their underlying behavior and
the Slice-1 classifier, Slice-3 wizard+review, and Slice-5 balance meter LOGIC
(relocate/restyle/de-duplicate only — do not gut). Note: aesthetic quality is
judged by the human in the running app; these gates check only objective
structure/behavior.

## G1 — JS parses
- `node --check public/script.js` exits 0.

## G2 — smoke regression
- `npm test` (== `node test/smoke.js`) prints `CONSOLE ERRORS: 0` and
  `PAGE ERRORS: 0`, exit 0 (after guides removal, dock merge, and consolidation).

## G3 — refinement behavior (architect runs `node test/refine-e2e.js` against
   :3000; builder writes it). One PASS/FAIL line per check; exit nonzero on any
   FAIL. Drives the live UI (pattern from test/presets-e2e.js).
- **R1 guides removed:** no `[data-tab="guides"]` nav control and no `#guides-tab`
  element exist; the main tab strip still renders the remaining tabs and switching
  between them throws no error.
- **R2 wizard still launches:** a visible wizard-launch control exists on the
  builder tab; activating it opens the build wizard modal (the
  `openBudgetModal()` path), so the Slice-3 wizard→review flow survives guides
  removal.
- **R3 quick-start consolidated to ONE element, 4 presets:** exactly ONE
  quick-start/preset container exists on the builder tab (the separate second
  starter/showcase row is gone); it exposes exactly 4 curated preset builds; it
  is COLLAPSED by default (preset cards not visible until a toggle is activated).
  After expanding and loading a preset: `window.partsDatabase.currentBuild` gains
  that preset's cpu+gpu+motherboard, the active tab is the builder, and the
  loaded build passes `classifyCompatibilityIssues` with ZERO hard problems.
- **R4 dock integrated with the tab strip, no duplicate Builder nav:** the
  persistent build-status element is merged into / anchored with the main tab
  strip (B2), and there is NO redundant in-dock "Builder" navigation control
  (the old `#buildDockBuilderBtn`) — Builder navigation lives only in the tab
  strip. The status still reflects severity derived from
  `classifyCompatibilityIssues` (distinct clean / warning / problem states).
- **R5 change-component scroll anchor:** invoking a component's
  change/select action navigates to that component's tab AND scrolls so the
  selectable list/filters region for that type is at/near the top of the
  viewport (its top within ~150px of the scroll container top) — NOT the middle
  of the tab.
- **R6 selected-card detail + shape:** a selected component's builder card
  exposes expanded detail (at least 3 spec/detail fields beyond name+price that
  are absent on an empty slot) and its rendered box aspect ratio is ~4:3
  (width/height between 1.1 and 1.6).
- **R7 balance meter survives:** with a CPU+GPU loaded, the Slice-5 balance meter
  still renders a state derived from the existing performance helpers (regression
  guard).

## G4 — intent (architect reads the diff)
- Presets/showcase still LOAD via the existing `applyBuildData` and VALIDATE via
  the existing `classifyCompatibilityIssues` — consolidation is presentational,
  not a reimplementation. The curated 4 still come from live data.
- Guides removal deletes only the guides tab/nav/content and dead guides-only
  code; it does NOT remove the wizard modal, the wizard launch path, or the
  Slice-3 review.
- The Slice-1 classifier internals, Slice-3 `renderBuildReviewPanel`/
  `getBuildReviewNotes` + price-freshness, and Slice-5 balance compute are not
  gutted (may be relocated/recalled, not rewritten).
- Existing e2e tests that the structural changes break (presets-e2e, showcase-e2e,
  dock-e2e) are UPDATED to the new DOM while preserving their behavioral intent —
  not deleted to dodge coverage.

## Out of scope — touching these FAILS the slice
- `server.js`, `models/`, `scripts/`, `package.json`, `public/mobile.html`.
- The compatibility RULES (Slice-1 severity logic), the wizard QUESTION/scoring
  logic, the balance-score MATH, and the price/data layer — this slice is layout/
  navigation/consolidation only.
- Component auto-ingestion (a later slice), accounts, multi-retailer pricing.
