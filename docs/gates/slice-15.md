# Gates — Slice 15 (P1): export part list (Markdown / Plain text / BBCode)

FROZEN before dispatch. Read-only. Architect runs every gate at judgment and
compares against this verbatim text. A builder edit to any file under
`docs/gates/` is an automatic slice FAIL. Gate-pass is necessary, not sufficient.

Single lane.

Context: PCPartPicker's most-loved cheap feature is "export this part list"
(Markdown/Reddit/BBCode/plain) — drives forum backlinks. EZPC has no export. The
build lives in `this.currentBuild` (full component objects keyed by slot:
cpu/cooler/motherboard/ram/gpu/storage[2-6]/psu/case/addon[2-6]); per-component
name = `title||name`, price = `salePrice||currentPrice||basePrice||price`, link =
`sourceUrl||url`. `serializeBuild()` (~6934), `addToAmazonCart()` (~7018, uses
AssociateTag `qhezpc-20`), `showToast`, and an inline clipboard helper already
exist. Build action buttons are in index.html (~1570, `.build-actions`).

---

**G1 — Parse.** `node --check public/script.js` exits 0.

**G2 — Smoke (architect-run).** Local server on :3000, `npm test` prints
`CONSOLE ERRORS: 0` and `PAGE ERRORS: 0` (the export UI does not break any tab).

**G3 — Export e2e (architect-run).** `node test/export-e2e.js` against a running
local server, driving the LIVE app (`window.partsDatabase`, real parts), all PASS:
1. **Generates all formats.** With a real multi-part build set, the export produces
   three text outputs — Markdown, Plain text, BBCode — each NON-empty and each
   containing every selected component's display name AND the formatted total price.
   (Drive via the real export method/UI; do not reimplement formatting in the test —
   assert against the app's own output.)
2. **Formats are distinct & well-formed.** The three outputs are pairwise different;
   the Markdown output contains a table (`|` columns + a header separator row of
   dashes); the BBCode output contains BBCode tags (e.g. `[b]`/`[/b]` or `[url]`),
   balanced; the Plain-text output contains neither `|`-table syntax nor `[tag]`
   markup.
2b. **Prices & links.** Each format lists a price for each priced component and the
   build total; component links (where `sourceUrl`/`url` exists) use the EXISTING
   affiliate associate tag (`qhezpc-20`) — no newly-hardcoded different tag.
3. **Copy works.** Triggering "copy" for the active format calls
   `navigator.clipboard.writeText` (or the existing fallback) with EXACTLY the active
   format's generated text (verify by spying on `navigator.clipboard.writeText`), and
   the user gets feedback (toast/label change).
4. **Empty build guarded + FTC.** With an empty build, export is disabled or shows a
   clear "add components first" message (no crash, no console error). The generated
   output (non-empty build) contains an FTC affiliate-disclosure line (matches
   `/affiliate|As an Amazon|qualifying purchases/i`).

**G4 — Diff review (architect).** All must hold:
- Pure CLIENT-SIDE: export reads `this.currentBuild` and reuses existing helpers
  (serialize/name/price accessors, `showToast`, the existing clipboard helper, the
  existing modal/overlay pattern). NO `server.js` change, no new route, no DB write.
- Affiliate links reuse the EXISTING `qhezpc-20` associate-tag constant/approach —
  not a new hardcoded tag; an FTC disclosure line is included in the output.
- Output escaping: component names are inserted safely (no broken table/markup from
  a `|` or `[` in a product title — escape or sanitize as needed).
- The empty-build path is guarded (no throw).
- Existing build actions (Clear/Copy Link/Save/Add to Amazon Cart), Slice-12 compat
  filter, and Slice-13 states still work.
- No new dependency.
- Only `public/script.js`, `public/index.html` (export button + modal/container
  markup only), `public/styles-v5.css`, `test/export-e2e.js` (new), and
  `docs/lanes/slice-15-00.md` (new) changed. `server.js`, models, scripts, other
  tests untouched.

---
## Out of scope (not here)
- Shareable-image export, CSV/JSON download, per-retailer pricing in the export,
  global search, accounts. Markdown/Plain/BBCode text export + copy only.
