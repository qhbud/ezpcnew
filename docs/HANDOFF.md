# HANDOFF — EZPC (pcbuilder2 / qhbud/ezpcnew)

> Repo memory for the Architect Loop. Builder (Codex) writes raw evidence only;
> architect (Claude) writes rulings/verdicts. Not in this file = didn't happen.
> Pre-slice-19 history archived in `docs/HANDOFF-archive-pre-s19.md`.

## TL;DR

- Goal: full one-stop PC-build site beating PCPartPicker on compatibility,
  trust, mobile UX. Deploys from `origin/main` via Railway + Render. **Repo is
  PUBLIC.**
- Prior roadmap **Slices 0–18 are DONE and on origin/main** (drained; detail in
  the archive). Plus a large interactive UI session (Fun Stats rework, Amazon
  cart-on-total, multi-slot storage/add-ons, Needs-X, Community-tab removal,
  Fun-Stats-ready) — all pushed through `413c1e4`.
- **NEW EPIC: Release Hardening (Slice 19)** — fix pre-public-release audit
  findings. Owner decision: **do NOT rotate creds**; scrub them from the
  working tree instead (git-history rewrite is a SEPARATE owner decision, NOT
  in this slice). Domain unresolved (`ezpcworld.com` vs `ezpc.world`) →
  domain-dependent SEO (canonical/OG-url/sitemap.xml/custom-404) DEFERRED, flagged.

## Open disagreements

(none — fresh epic)

## Current slice

- **Slice 19 (Release Hardening) — SPEC FROZEN, gates at `docs/gates/slice-19.md`,
  DISPATCHED 4 parallel lanes (A/B/C/D), AWAITING ARCHITECT VERDICT next session.**
  Lanes are disjoint by file set:
  - **A — server hardening** (`server.js`, `package.json`, `package-lock.json`):
    helmet (CSP off), express-rate-limit, query/category sanitization,
    clear-cache auth, parts/price cache TTL 300s→60s.
  - **B — frontend JS** (`public/script.js` only): hide coming-soon `alert()`
    buttons, kill legacy filter crash, global-search `.catch`, `_escapeHtml`
    scraped fields, `rel=noopener` on JS links, remove dead Community JS +
    debug toggle, prod console silencer.
  - **C — markup/a11y/mobile/static** (`public/index.html`, `styles-v5.css`,
    `robots.txt`, favicon link): remove fake aggregateRating, remove #debugBtn,
    remove dead Community markup, a11y labels/alt, mobile fixes, favicon link +
    robots.txt.
  - **D — secret scrub** (12 tracked files): replace Atlas URI + Amazon secret
    with env placeholders; the 3 JS scripts read `process.env`.
  - HIGH-STAKES (server security surface) → run `codex review` on Lane A before
    its verdict. TO JUDGE next session: run all gates independently per lane,
    check boundary + gate-tamper, then integrate passing lanes onto
    `slice/19-release-hardening` with integration smoke after each merge.

## History pointer

Slices 0–18 + interactive polish: see `docs/HANDOFF-archive-pre-s19.md` and
`docs/gates/slice-0.md … slice-18.md`. Roadmap: `docs/prd/roadmap.md`.
