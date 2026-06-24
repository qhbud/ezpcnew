# Gates — Slice 19 (Release Hardening)

Frozen before dispatch. Architect runs every gate independently at judgment and
compares against this verbatim text. Builder edits to anything under
`docs/gates/` = automatic slice FAIL. Local dev server: `node server.js` on
:3000. Puppeteer harnesses live in `scripts/_*.js`.

## Global (all lanes, run at integration)

- **GG1 — parse:** `node --check server.js` exit 0 AND `node --check
  public/script.js` exit 0.
- **GG2 — smoke:** load `http://localhost:3000/` headless; **0 console errors**
  and **0 pageerrors** (the prior favicon.ico 404 must also be gone). Reuse
  `scripts/_consoleAudit.js`.
- **GG3 — builder regression:** the Fun Stats button still lights when a build
  is complete and the multi-slot add-ons still route (reuse
  `scripts/_testReady.js` + `scripts/_testSlotRoute.js`): all assertions hold.

## Lane A — server hardening (server.js, package.json, package-lock.json)

- **GA1 — deps present & install clean:** `helmet` and `express-rate-limit` in
  `package.json` dependencies; `npm ci` (or `npm install`) exits 0;
  `node --check server.js` exit 0.
- **GA2 — security headers:** `curl -sI http://localhost:3000/` shows
  `X-Content-Type-Options: nosniff` AND `X-Frame-Options` (or
  `Content-Security-Policy`-frame-ancestors equivalent). CSP MAY be absent/off
  by design — that is acceptable this slice.
- **GA3 — site still works under helmet:** GG2 smoke passes (0 errors) AND
  `curl -s http://localhost:3000/api/parts/gpus` returns a non-empty JSON array.
- **GA4 — query operator injection neutralized:** `curl -s
  'http://localhost:3000/api/parts/gpus?manufacturer[$ne]=zzz'` does NOT 500 and
  does NOT return more rows than the unfiltered `?manufacturer=zzz` would (i.e.
  the operator is coerced to a string, not honored as a Mongo operator). Record
  both row counts.
- **GA5 — category whitelist:** `curl -s -o /dev/null -w "%{http_code}"
  'http://localhost:3000/api/parts/__notacollection__'` returns 400 (or 404),
  NOT 500 and NOT a Mongo error.
- **GA6 — clear-cache locked:** `curl -s -o /dev/null -w "%{http_code}"
  http://localhost:3000/api/clear-cache` (no token) returns 401/403 (or the
  route no longer exists → 404). With the correct token it returns 200.
- **GA7 — rate limiting:** a burst of >120 rapid requests to a write route
  (e.g. POST `/api/builds/snapshot`) eventually returns HTTP 429; AND a single
  normal page load (which fires several `/api/parts` GETs) does NOT get 429.
  Record the request count at first 429.
- **GA8 — cache TTL:** the parts/price route cache TTL constant is 60000 ms (or
  less), not 300000. Grep/inspect `server.js`.
- **GA9 — boundary:** `git status` in the lane worktree shows ONLY server.js,
  package.json, package-lock.json, and the lane report. No other files.

## Lane B — frontend JS (public/script.js ONLY)

- **GB1 — parse:** `node --check public/script.js` exit 0.
- **GB2 — no coming-soon alert:** `grep -ni "coming soon" public/script.js`
  returns 0 lines (the placeholder buttons + their alert handlers are gone).
- **GB3 — tab-crash fixed:** headless, rapidly switch through gpu→cpu→
  motherboard→ram→psu→cooler→storage tabs immediately on load (before data
  settles); **0 pageerrors / 0 uncaught exceptions**. (Architect writes a small
  puppeteer driver at judgment.)
- **GB4 — global-search resilience:** with `/api/parts` made to fail once,
  global search shows no uncaught rejection AND a later search succeeds (the
  rejected promise is not cached). Architect drives this.
- **GB5 — output escaping:** a component whose `name`/`title` contains
  `<img src=x onerror=alert(1)>` renders as visible TEXT (no element created, no
  alert). Architect injects via the live data path / a crafted item and checks
  the DOM has no injected `<img>`.
- **GB6 — rel=noopener:** every `target="_blank"` anchor string built in
  script.js also contains `rel="noopener` (grep: count of `target="_blank"`
  occurrences == count that also have `rel="noopener"`).
- **GB7 — dead community JS gone:** `grep -nE
  "loadCommunityBuilds|switchTab\('community'\)|toggleDebugMode" public/script.js`
  returns 0 lines.
- **GB8 — prod console silencer present but dev-safe:** on `localhost`,
  `console.log` still works (GG2 driver runs on localhost so this is implicit);
  the guard must NOT disable `console.error`/`console.warn`.
- **GB9 — boundary:** `git status` shows ONLY public/script.js + the lane report.

## Lane C — markup / a11y / mobile / static

- **GC1 — fake rating gone:** `grep -ni "aggregateRating\|ratingValue\|ratingCount"
  public/index.html` returns 0 lines.
- **GC2 — debug button gone:** `grep -n 'id="debugBtn"' public/index.html`
  returns 0 lines.
- **GC3 — dead community markup gone:** `grep -n 'id="community-tab"'
  public/index.html` returns 0 lines.
- **GC4 — favicon request resolved:** index.html contains a
  `<link rel="icon" …>` pointing at an existing asset; headless load of `/` has
  **0** failed-request / 404 for a favicon (GG2 covers this).
- **GC5 — robots.txt:** `curl -s -o /dev/null -w "%{http_code}"
  http://localhost:3000/robots.txt` == 200 and body has `User-agent: *`.
- **GC6 — a11y:** every builder `<select>` and price `<input>` in index.html has
  a `<label>` or `aria-label` (architect spot-checks; 0 unlabeled interactive
  controls in the builder form).
- **GC7 — mobile:** at 360px width headless, the builder page body has **0
  horizontal overflow** (`document.documentElement.scrollWidth <=
  window.innerWidth + 1`) and the component modal, when open, fits the viewport.
- **GC8 — site loads:** GG2 smoke passes.
- **GC9 — boundary:** `git status` shows ONLY public/index.html,
  public/styles-v5.css, public/robots.txt, the favicon asset(s), + lane report.

## Lane D — secret scrub (12 tracked files)

- **GD1 — no live Atlas creds anywhere tracked:** `git grep -nE
  "mongodb\+srv://[A-Za-z0-9_]+:[^@<>]+@"` returns 0 lines across the repo
  (placeholders like `<user>:<password>@` or `$MONGODB_URI` are fine).
- **GD2 — no Amazon secret literal:** the previously-committed Amazon PA-API
  secret key string appears in 0 tracked files (architect greps the known value
  at judgment).
- **GD3 — scripts still parse & use env:** `node --check migrate-to-atlas.js`,
  `node --check test-atlas-connection.js`, `node --check verify-atlas-data.js`
  all exit 0; each references `process.env.MONGODB_URI` (grep) and contains no
  hardcoded credential.
- **GD4 — boundary:** `git status` shows ONLY the 12 named files + lane report;
  `.env`/`.env.atlas` remain untracked.

## Deferred (flagged, NOT gated this slice)

- Credential rotation (owner declined).
- Git-history secret rewrite + force-push (separate owner decision).
- Domain-dependent SEO: canonical tag, OG/Twitter image URL, sitemap.xml,
  custom HTML 404 page (blocked on `ezpcworld.com` vs `ezpc.world`).
- Per-IP rating/like dedupe beyond rate-limiting (optional; note if done).
- A full CSP (relies on inline handlers; bigger refactor).
