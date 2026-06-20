# Gates — Slice 11-P2 (Lane-A follow-up): malformed shared-build JSON → 400

FROZEN before dispatch. Read-only. Architect runs every gate at judgment and
compares against this verbatim text. A builder edit to any file under
`docs/gates/` is an automatic FAIL.

Context: `POST /api/builds` currently returns HTTP 500 when the request body is
syntactically invalid JSON under the 16KB cap (express body-parser raises
`entity.parse.failed`), because the error middleware only maps
`entity.too.large`→413. It should return 400 for client-side bad input.

---

**P-G1 — Parse.** `node --check server.js` AND `node --check test/share-e2e.js`
both exit 0.

**P-G2 — Malformed JSON → 400 (architect-run).** Against a running local server,
`POST /api/builds` with a syntactically-invalid JSON body (e.g. `{"cpu":` ) of
size under the 16KB cap returns **HTTP 400** (a JSON error body), NOT 500 and NOT
413. Proven by a NEW assertion in `test/share-e2e.js` and re-run by the architect.

**P-G3 — No regression (architect-run).** `node test/share-e2e.js` against a
running local server: ALL prior assertions still PASS (the existing 9 +
the new malformed-JSON one). `npm test` smoke prints `CONSOLE ERRORS: 0` and
`PAGE ERRORS: 0`.

**P-G4 — Diff review (architect).** All must hold:
- The fix lives in the EXISTING shared-build error handling (the middleware near
  server.js ~1568 that already maps `entity.too.large`→413), extended to also map
  a body-parser JSON parse error (`err.type === 'entity.parse.failed'`, or an
  express `SyntaxError` with `err.status === 400`/`err.statusCode === 400`) to a
  400 JSON response for shared-build POSTs only.
- No change to the happy path, to `GET /api/builds/:id`, to validation, to the
  413 oversized behavior, or to any other route's error handling.
- No new dependency. No new top-level routes.
- ONLY `server.js` and `test/share-e2e.js` changed (plus the lane report
  `docs/lanes/slice-11p2.md`). Nothing else.
