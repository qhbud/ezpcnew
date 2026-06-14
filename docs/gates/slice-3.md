# Gates — Slice 3: explainable build review + visible price freshness

Frozen BEFORE dispatch. Read-only after. Architect runs every gate itself
against the live DB-backed server on :3000. A builder edit to any file under
docs/gates/ (caught by git diff) is an automatic slice FAIL.

## G1 — JS parses
- `node --check public/script.js` exits 0.

## G2 — smoke regression (no new console errors)
- `npm test` (== `node test/smoke.js`) prints `CONSOLE ERRORS: 0` and
  `PAGE ERRORS: 0`, exit 0. (Inline JS errors in index.html surface here.)

## G3 — review + freshness behavior (architect runs
   `node test/build-review-e2e.js` against :3000; builder writes the test).
   One PASS/FAIL line per check; exit nonzero on any FAIL.
- **R1 explanation present:** for a normal complete build, the build-review panel
  (`#buildReviewPanel`) shows at least one EXPLANATION note (an `info`-type
  "why this pick"/quality note), not only warnings. The panel must explain the
  build, not merely flag problems.
- **R2 warnings still fire:** the existing warning cases still produce their
  warning notes — at minimum, a build with a clearly undersized PSU yields the
  "PSU headroom is tight" warning. (Regression guard on getBuildReviewNotes.)
- **R3 price freshness visible & honest:** a displayed/selected part that HAS a
  price-timestamp field (`updatedAt`/`lastUpdated`/`priceHistory[].date`) renders
  an "updated …" freshness badge; a part with NO timestamp renders NO badge
  (absent data is never fabricated into a date).

## G4 — intent (architect reads the diff)
- Build-review explanations are plain-language and derived from the actual build
  data (the wizard `data.build`); no fabricated specs or claims.
- Price-freshness / volatility uses ONLY existing data fields
  (`updatedAt`/`lastUpdated`/`priceHistory`); badge is hidden when the field is
  absent. No new scraping, no server changes, no DB writes.
- Slice-1 (`classifyCompatibilityIssues`/`checkCompatibility`) and Slice-2 dock
  (`ensureBuildDock`/`updateBuildDock`) are unchanged.
- The wizard question/submit flow (`submitWizard` + question handlers) is
  unchanged — this slice only finishes the RESULT review panel + freshness UI.

## Out of scope — touching these FAILS the slice
- `server.js`, `models/`, `scripts/`, `package.json`, `public/mobile.html`.
- The Slice-1 classifier/panel, the Slice-2 dock, the wizard question/submit flow.
- Tier-3 bets: preset builds, bottleneck/balance meter, price-drop alerts,
  multi-retailer pricing, public build showcase, AI assistant. No new data sources.
