# Gates — Slice 1: proactive compatibility (two-tier severity)

Frozen BEFORE dispatch. Read-only after. Architect runs every gate itself
against the live DB-backed server on :3000.

## G1 — JS parses
- `node --check public/script.js` exits 0.

## G2 — smoke regression (no new console errors)
- `npm test` (== `node test/smoke.js`) prints `CONSOLE ERRORS: 0` and
  `PAGE ERRORS: 0`, exit 0.

## G3 — severity classification works (architect runs `node test/compat-e2e.js`
   against :3000; builder writes the test)
The harness drives the real builder UI and asserts the compatibility panel
(`#compatibilityResults` / heading `#compatibilityCheckHeading`) for 3 scenarios.
Print one `PASS`/`FAIL` line per scenario; exit nonzero if any FAIL.
- S1 HARD INCOMPATIBLE: a CPU + motherboard with mismatched sockets selected →
  panel classifies at least one issue as a **problem** (distinct problem styling,
  not just generic warning), and the heading reflects a problem state.
- S2 SOFT WARNING ONLY: a compatible set whose only issue is tight PSU headroom
  (estimated draw > 80% of PSU wattage) → panel shows a **warning**, and shows
  **zero problems**.
- S3 ALL GOOD: a fully compatible set → panel shows no problems and no warnings
  ("all compatible"/"no issues").

## G4 — intent (architect reads the diff)
- A single source of truth classifies issues into `{problems, warnings}` (e.g. a
  helper returning that shape) used by `checkCompatibility` for rendering — not
  duplicated ad-hoc strings.
- Every issue message states the WHY in plain language (not just "⚠️ X").
- Any NEW physical-fit check (case max GPU length, cooler height vs case) is
  added ONLY if the field exists in live data (builder must verify against
  /api/parts/* and record which fields exist); absent fields → skip + note, no
  fabricated data.

## Out of scope — touching these FAILS the slice
- `public/index.html`, `server.js`, models/, scripts/.
- Build dock, wizard, build-review panel, component-tab rendering (surfacing
  compatibility while browsing tabs is a LATER slice).
- No new dependencies, no DB writes, no refactor beyond extracting the classifier.
