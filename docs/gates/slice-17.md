# Gates — Slice 17 (P1): community builds — BACKEND API

FROZEN before dispatch. Read-only. Architect runs every gate at judgment and
compares against this verbatim text. A builder edit to any file under
`docs/gates/` is an automatic slice FAIL. Gate-pass is necessary, not sufficient.

Single lane (server only). The FRONTEND gallery is a SEPARATE later slice (18)
that builds on this API — do NOT build any UI here.

Context: Community/completed builds is PCPartPicker's biggest moat (launch-readiness
report P1 #2): users submit a build, others browse/sort/like it. EZPC already has
durable server-stored builds from Slice 11: `POST /api/builds` (server.js:2658)
stores a normalized slot→reference map under a URL-safe id in the `builds`
collection, reusing `normalizeSharedBuild(body)`, `createSharedBuildId()`,
`SHARED_BUILD_ID_PATTERN`, `SHARED_BUILD_KEYS`, `SHARED_BUILD_BODY_LIMIT_BYTES`,
`SHARED_BUILD_REFERENCE_PATTERN` (defined server.js ~62-75). `GET /api/builds/:id`
(2691) returns the stored map. Community builds REUSES this build-reference shape
and these helpers — it adds public metadata (title/author/likes) in a NEW
`community_builds` collection. Storage uses raw `db.collection(...)` (getDatabase()),
not mongoose models.

## FROZEN API CONTRACT (the shared contract this slice freezes for Slice 18)

New collection `community_builds`. Document:
`{ _id: <url-safe id via createSharedBuildId()>, title: String, author: String,
   build: <normalized reference map, same shape normalizeSharedBuild returns>,
   likes: Number (starts 0), createdAt: Date }`

1. `POST /api/community/builds`
   - Body JSON: `{ title, author, build }` where `build` is the same slot→reference
     map `POST /api/builds` accepts (validate via the EXISTING `normalizeSharedBuild`;
     reject if it returns `.error` or yields zero components).
   - `title`: required, trimmed, 1–100 chars after trim; `author`: required, trimmed,
     1–50 chars after trim. Both SANITIZED (strip HTML tags / angle brackets / control
     chars) before storing — no stored markup. Enforce a body-size limit (reuse/derive
     from `SHARED_BUILD_BODY_LIMIT_BYTES`, allowing headroom for title+author).
   - Success: HTTP 201 `{ id }`. Invalid input (missing/blank title or author after
     trim, invalid/empty build, oversized body): HTTP 400 `{ error }`. Stores likes:0,
     createdAt:new Date().
2. `GET /api/community/builds`
   - Query: `sort` = `newest` (default) | `likes`; `limit` default 20, capped 50;
     `skip` default 0 (both coerced to safe non-negative ints).
   - Response 200: `{ builds: [ { id, title, author, likes, createdAt, build } ... ],
     total }` where `total` = full count in the collection. `newest` = createdAt desc;
     `likes` = likes desc (tie-break createdAt desc).
3. `GET /api/community/builds/:id`
   - 200 `{ id, title, author, likes, createdAt, build }`; 404 `{ error }` if id fails
     `SHARED_BUILD_ID_PATTERN` or not found.
4. `POST /api/community/builds/:id/like`
   - ATOMIC `$inc` likes by 1 (findOneAndUpdate, returnDocument after). 200
     `{ id, likes }` with the new count; 404 if bad/nonexistent id. (No per-user
     dedup in v1 — explicitly out of scope.)

---

**G1 — Parse.** `node --check server.js` exits 0.

**G2 — Smoke (architect-run).** Local server on :3000, `npm test` prints
`CONSOLE ERRORS: 0` and `PAGE ERRORS: 0` (server still boots; existing pages fine).

**G3 — Community-API e2e (architect-run).** `node test/community-api-e2e.js`
against a running local server, all PASS (drive the REAL HTTP endpoints):
1. **Create + read round-trip.** POST a valid `{title,author,build}` → 201 with an
   id matching `SHARED_BUILD_ID_PATTERN`. GET /:id returns the same title, author,
   and an equivalent build map, with `likes === 0` and a `createdAt`.
2. **List + sort + paginate.** After creating ≥3 builds, GET list returns them with
   `total` ≥ created count; `sort=newest` is createdAt-desc and `sort=likes` is
   likes-desc; `limit`/`skip` page correctly (limit caps at 50).
3. **Like is atomic + reflected.** POST /:id/like returns the incremented count;
   two likes yield +2; the new count shows in GET /:id and in the list.
4. **Validation + 404s.** POST with blank/missing title → 400; blank/missing author
   → 400; empty/invalid build → 400; a title containing `<script>` is stored
   sanitized (GET /:id title has no `<`/`>`); GET and like on a malformed id and on
   a well-formed-but-nonexistent id → 404. No 500s on any of these.

**G4 — Diff review (architect).** All must hold:
- Reuses `normalizeSharedBuild` / `createSharedBuildId` / `SHARED_BUILD_ID_PATTERN`
  for build validation + id + lookups (no parallel reimplementation of build
  normalization).
- New `community_builds` collection; `POST /api/builds` (Slice 11) and all existing
  endpoints UNCHANGED in behavior.
- Likes use an ATOMIC `$inc` (no read-modify-write race).
- title/author validated (length, required) AND sanitized (no stored markup); body
  size bounded; ids validated before any DB call.
- No new dependency. No DB write on read paths.
- Only `server.js`, `test/community-api-e2e.js` (new), and `docs/lanes/slice-17-00.md`
  (new) changed. `public/*`, models, scripts, other tests untouched.

---
## Out of scope (not here — Slice 18 or later)
- ANY frontend/UI (gallery, submit modal, like button, browse view) — server only.
- Per-user like dedup, accounts/auth, photo upload, moderation/report, comments,
  rate-limiting beyond body-size, editing/deleting a submitted build.
