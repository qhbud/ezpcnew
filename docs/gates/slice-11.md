# Gates — Slice 11 (P0 launch hygiene, part 1): durable share + trust pages

FROZEN before dispatch. Read-only. Architect runs every gate at judgment and
compares against this verbatim text. A builder edit to any file under
`docs/gates/` is an automatic slice FAIL. Gate-pass is necessary, not
sufficient — architect reads the diff against intent too.

Two disjoint lanes; each lane passes independently.

---

## Lane 11-A — Durable shareable builds (server.js + public/script.js)

**A-G1 — Parse.** `node --check server.js` AND `node --check public/script.js`
both exit 0.

**A-G2 — Smoke (architect-run, outside sandbox).** With a local server on
:3000, `npm test` (test/smoke.js) prints `CONSOLE ERRORS: 0` and
`PAGE ERRORS: 0`. (Builder may be unable to run Puppeteer under the sandbox —
record node --check + the logic test; architect runs the browser smoke.)

**A-G3 — Round-trip (architect-run).** `node test/share-e2e.js` against a
running local server + the configured Mongo, all assertions PASS:
1. `POST /api/builds` with a valid serialized build → HTTP 200, JSON `{ id }`,
   `id` matches `/^[A-Za-z0-9_-]{6,16}$/`.
2. `GET /api/builds/<id>` → HTTP 200 and the returned build deep-equals the
   posted build (after the same normalization the endpoint applies).
3. `GET /api/builds/<bogus-id>` → HTTP 404.
4. `POST /api/builds` with an oversized body (> the documented cap) OR a body
   containing an unknown top-level key → HTTP 4xx (rejected, not stored).
   The test cleans up any docs it creates.

**A-G4 — Diff review (architect).** All must hold in the diff:
- New Mongo collection (e.g. `builds`) in db `pcbuilder`; NO writes to any
  component/live collection from these routes.
- Short, unguessable id (random ≥6 chars; NOT a Mongo ObjectId in the URL and
  NOT sequential).
- Stored payload is **part references only** (ids/asin/collection/title/qty) —
  NOT arbitrary HTML/markup (no stored-XSS vector); body size-capped and
  top-level keys validated against known component types.
- `shareBuild` POSTs the build and copies a `?build=<id>` URL (short id form).
- Build loading handles BOTH the new short id (fetch `/api/builds/:id`) AND a
  legacy base64 `?build=` blob (decoded client-side) — **old shared links must
  still load** (back-compat), proven by an assertion or a documented manual check.
- Reuses existing `serializeBuild` / `applyBuildData`; no auth, no PII.
- Only `server.js`, `public/script.js`, `test/share-e2e.js`,
  `docs/lanes/slice-11-A.md` changed.
- HIGH-STAKES: architect runs a cross-model `codex review` before the verdict.

---

## Lane 11-B — Trust & launch hygiene (index.html + new pages + css)

**B-G1 — Pages serve + wiring (architect-run).** `node test/trust-e2e.js`
against a running local server, all PASS:
1. `GET /privacy.html`, `/terms.html`, `/about.html` each → HTTP 200, body
   length > 500 chars, and each contains its expected `<h1>`/title text.
2. `public/index.html` contains footer links to all three pages.
3. An FTC-style affiliate disclosure (matches
   `/affiliate|qualifying purchases|earn .*commission|As an Amazon/i`) is
   present in index.html (footer or near buy actions) AND on the pages.
4. A privacy-friendly analytics snippet is present in index.html `<head>`
   (e.g. Plausible `data-domain`), using a placeholder/config value — NOT a
   committed secret/DSN.

**B-G2 — Smoke (architect-run).** `npm test` (smoke) prints
`CONSOLE ERRORS: 0` and `PAGE ERRORS: 0` — the footer/analytics additions do
not break any tab.

**B-G3 — Diff review (architect).** All must hold:
- Static pages only; consistent site styling (reuses styles-v5.css patterns).
- Affiliate wording is FTC-appropriate (clear, not buried).
- Analytics/error scaffold commits NO secret (placeholder domain + a comment
  telling Quinn what to fill in); any error hook is null-safe and non-blocking.
- Footer links wired from index.html.
- NO edits to `server.js` or `public/script.js`.
- Only `public/index.html`, `public/privacy.html`, `public/terms.html`,
  `public/about.html`, `public/styles-v5.css`, `test/trust-e2e.js`,
  `docs/lanes/slice-11-B.md` changed.

---

## Out of scope for Slice 11 (do NOT build here)
- Compatibility filter toggle, PSU-headroom warning, empty/error states,
  mobile-responsive fixes → Slice 12 (share script.js/index.html with these
  lanes; must follow).
- GPU-length / cooler-height physical clearance → BLOCKED: live Atlas has
  0/111 case clearance fields (maxGpuLength / maxCpuCoolerHeight /
  radiatorSupport). Track B (data acquisition) prerequisite.
- Live analytics account IDs / Sentry DSN → need Quinn's accounts.
