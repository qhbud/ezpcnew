# Gates — Slice 6: public build showcase (curated themed gallery, NO accounts)

Frozen BEFORE dispatch. Read-only after. Architect runs every gate itself
against the live DB-backed server on :3000. A builder edit to any file under
docs/gates/ (caught by git diff) is an automatic slice FAIL.

## G1 — JS parses
- `node --check public/script.js` exits 0.

## G2 — smoke regression
- `npm test` (== `node test/smoke.js`) prints `CONSOLE ERRORS: 0` and
  `PAGE ERRORS: 0`, exit 0.

## G3 — showcase behavior (architect runs `node test/showcase-e2e.js` against
   :3000; builder writes the test). One PASS/FAIL line per check; exit nonzero on
   any FAIL. The test loads real /api/parts data and drives the live UI (pattern
   from test/presets-e2e.js).
- **S1 gallery renders:** a "Showcase"/"Featured Builds" UI exposes at least 4
  distinct curated themed builds (each card has a `[data-showcase-build-id]` /
  `[data-showcase-theme]`, a human use-case name, and a total price).
- **S2 complete real-parts builds:** each themed build contains at minimum cpu,
  gpu, motherboard, ram, psu, case, storage — every part id present in the live
  `/api/parts` data (real ids/names; no fabricated parts).
- **S3 compatibility-correct:** each themed build, run through the existing
  `classifyCompatibilityIssues(build, wattageInfo)`, yields ZERO hard problems
  (warnings allowed).
- **S4 themes differentiated:** the themed builds are not all the same machine —
  the set of build part-maps is pairwise distinct (no two themes resolve to an
  identical cpu+gpu+motherboard+ram+psu+case+storage set).
- **S5 one-click load:** loading a themed build populates the builder — after
  load, `window.partsDatabase.currentBuild` contains that build's
  cpu+gpu+motherboard (at least) and the active tab is the builder.
- **S6 Copy-Link share round-trips:** each card exposes a shareable URL (via a
  callable method e.g. `partsDatabase.getShowcaseShareUrl(id)` and/or a
  `data-share-url` attribute — NOT only through the clipboard) of the form
  `...?build=<base64>`; decoding `<base64>` (atob → JSON) yields that card's
  `{type:id}` build map, and that map is the same format the existing
  `loadBuildFromURL()` consumes.

## G4 — intent (architect reads the diff)
- Themed builds LOAD via the existing `applyBuildData(...)` path and VALIDATE via
  the existing `classifyCompatibilityIssues` — no duplicated load or compatibility
  logic. The share URL uses the SAME `?build=<btoa(JSON.stringify({type:id}))>`
  encoding the existing share/`loadBuildFromURL` path uses — no second share
  scheme.
- Themed parts come only from live data; no hardcoded/fabricated component specs
  or prices.
- NO new server routes, NO DB writes (the showcase must not require persistence;
  per-card share builds the URL client-side; it must not depend on
  `incrementComponentSaveCounts` or any write).
- Slice-1 classifier, Slice-2 dock, Slice-3 review/freshness, Slice-4
  starter-build functions, Slice-5 balance meter, and the wizard question/submit
  flow are unchanged (the showcase may CALL shared helpers, not edit them).

## Out of scope — touching these FAILS the slice
- `server.js`, `models/`, `scripts/`, `package.json`, `public/mobile.html`.
- The Slice-1/2/3/4/5 internals listed above and the wizard question/submit flow.
- Accounts/logins, user-submitted builds, persistence/DB, email/price alerts,
  multi-retailer pricing, component auto-ingestion (Slice 7).
