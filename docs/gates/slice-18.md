# Gates — Slice 18 (P1): community builds — FRONTEND gallery

FROZEN before dispatch. Read-only. Architect runs every gate at judgment and
compares against this verbatim text. A builder edit to any file under
`docs/gates/` is an automatic slice FAIL. Gate-pass is necessary, not sufficient.

Single lane (frontend only — all the frontend files overlap, so no split).

Context: Slice 17 shipped the community-builds BACKEND (now on main). This slice
adds the USER-FACING gallery on top of it: browse/sort/like community builds and
submit your own. The API is FROZEN in docs/gates/slice-17.md — consume it exactly:
- `POST /api/community/builds` body `{title, author, build}` → 201 `{id}` (400 on
  invalid). `build` is the SAME ref map `serializeBuild()` already produces for
  `POST /api/builds`.
- `GET /api/community/builds?sort=newest|likes&limit=&skip=` → `{builds:[{id,title,
  author,likes,createdAt,build}],total}`.
- `GET /api/community/builds/:id` → `{id,title,author,likes,createdAt,build}` | 404.
- `POST /api/community/builds/:id/like` → `{id,likes}` | 404.

Existing reusable frontend (public/script.js): `serializeBuild()` (~7344) builds the
ref map; `applyBuildData(buildData,{sourceLabel,notify})` (~7855) loads a ref map
into the builder (community GET returns `build` in exactly that shape — pass it
straight in); `showToast`; `this.currentBuild`; `switchTab(tabName)` (~701) driven by
`data-tab` main-nav buttons (~index.html:124). Slice-13 loading/error/empty-state
helpers (`showLoading/showError`/empty notices) and the existing modal/overlay pattern
(e.g. the export modal from Slice 15) exist — reuse them.

---

**G1 — Parse.** `node --check public/script.js` exits 0.

**G2 — Smoke (architect-run).** Local server on :3000, `npm test` prints
`CONSOLE ERRORS: 0` and `PAGE ERRORS: 0` (the community UI does not break any tab).

**G3 — Community-UI e2e (architect-run).** `node test/community-ui-e2e.js` against a
running local server, driving the LIVE app + REAL community API, all PASS:
1. **Submit.** From a non-empty build, the submit action opens a form (title +
   author); submitting POSTs to `/api/community/builds` and on success the new build
   appears in the gallery (assert via the app: a gallery card with that title shows
   up, or a success toast + the build is fetchable). An empty build or blank title is
   blocked client-side with a message (no POST, no crash).
2. **Browse + sort.** The gallery renders cards from `GET /api/community/builds`, each
   card showing title, author, total price or key parts, like count, and date.
   Toggling sort newest↔most-liked re-requests with the right `sort` param and the
   rendered order matches the API's returned order.
3. **Like.** Clicking a card's like control POSTs `/api/community/builds/:id/like` and
   the displayed like count increases to the value the API returns (verify it
   persists via a re-fetch / GET :id).
4. **Load into builder.** Clicking a gallery build loads it into the builder via
   `applyBuildData` (assert `this.currentBuild` is populated from that build and the
   builder view is shown) — it does NOT duplicate build-apply logic.
5. **Guards + escaping.** Empty gallery shows a readable empty state; an API failure
   shows a visible error state (no uncaught console error); a title/author containing
   HTML (`<img src=x onerror=...>` / `<b>`) renders as TEXT, not markup (no injection)
   — verify the gallery uses textContent/escaping, not raw innerHTML, for title/author.

**G4 — Diff review (architect).** All must hold:
- Consumes the frozen Slice-17 API only. NO `server.js` change, no new route, no DB
  access — pure frontend.
- Reuses `serializeBuild()` for submit and `applyBuildData()` for load (no
  reimplementation of build serialize/apply); reuses `showToast`, the existing
  modal/overlay pattern, and Slice-13 loading/error/empty helpers.
- title/author/any user text rendered with textContent/escaping (defense-in-depth even
  though the server sanitizes) — no raw innerHTML interpolation of API strings.
- Submit guards empty build + blank title/author client-side; like updates from the
  API response (not a blind local increment); loading/error/empty states present.
- No new dependency.
- Slice-12 compat filter, Slice-13 states, Slice-15 export, and Slice-16 global search
  still work.
- Only `public/index.html`, `public/script.js`, `public/styles-v5.css`,
  `test/community-ui-e2e.js` (new), and `docs/lanes/slice-18-00.md` (new) changed.
  `server.js`, models, scripts, other tests untouched.

---
## Out of scope (not here)
- Accounts/auth, per-user like dedup (the API allows repeat likes — fine for v1),
  photo upload, comments, moderation/report, editing/deleting a submitted build,
  pagination beyond a simple "load more" (a load-more or first-N is enough; infinite
  scroll not required), server changes of any kind.
