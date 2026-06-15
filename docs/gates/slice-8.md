# Gates — Slice 8: new-component scraper → review queue (GitHub-run)

Frozen BEFORE dispatch. Read-only after. A builder edit to any file under
docs/gates/ (git diff) is an automatic slice FAIL.

SAFETY INVARIANT (load-bearing): the scraper writes ONLY to the new
`pending_components` collection. It must NEVER insert/update/delete the live
component collections (`cpus`, `gpus`, `motherboards`, `rams`, `storages`,
`psus`, `cases`, `coolers`, `addons`). Any write to a live collection FAILS the
slice.

## G1 — JS parses
- `node --check scripts/ingestNewComponents.js` exits 0.
- `node --check scripts/reviewPendingComponents.js` exits 0.

## G2 — pending-doc FORMAT (deterministic; architect runs
   `node test/ingest-format.js`; builder writes it). No network/DB — it calls the
   script's exported pure builder on FIXED sample input. One PASS/FAIL line per
   check; nonzero exit on any FAIL.
- **F1 required keys:** `buildPendingComponent(type, rawProduct)` returns a doc
  with ALL of: `componentType`, `name`, `imageUrl`, `productUrl`, `price`,
  `source`, a dedup key (`asin` or normalized-name key), `scrapedAt`,
  `status === 'pending'`, and a `fields` object.
- **F2 type-specific fields:** for at least gpu, cpu, and ram sample inputs, the
  `fields` object contains keys appropriate to that component type (e.g. gpu →
  memory/chipset-ish; cpu → socket/cores-ish; ram → capacity/speed-ish), derived
  from the raw product, not hardcoded fabricated specs.
- **F3 icon+name+link present:** `imageUrl`, `name`, and `productUrl` are
  non-empty strings for valid sample input; `productUrl` carries the configured
  affiliate tag if the source URL is Amazon.
- **F4 idempotent key:** two builds from the same raw product produce the same
  dedup key (stable across runs).

## G3 — dry-run writes NOTHING (architect runs it). The script must support
   `--dry-run`: `node scripts/ingestNewComponents.js --dry-run --limit=1
   --type=gpu` exits 0, prints the candidate pending docs it WOULD store, and
   performs ZERO database writes (guarded behind `!dryRun`). Architect verifies no
   write occurred (the run prints a clear "DRY RUN — no DB writes" line; pending
   count unchanged). Live Amazon scraping may yield 0 candidates (flaky/bot
   detection) — that is acceptable for this gate as long as it exits cleanly and
   writes nothing.

## G4 — intent + safety (architect reads the diff)
- The ONLY collection the script writes to is `pending_components`; grep the diff
  — no `insertOne/insertMany/updateOne/updateMany/bulkWrite/replaceOne/delete*`
  targets any live component collection. Writes are idempotent upserts keyed by
  the dedup key.
- Type-specific `fields` are mapped from the existing per-type model shapes
  (`models/*.js`) — reused by reading, NOT by editing the models.
- Discovery/scraping reuses the existing infra (`scripts/findNewComponents.js`
  search terms and/or `scripts/scrapers/*`) rather than a parallel reimplementation
  where reasonable.
- New GitHub workflow `.github/workflows/component-ingest.yml` is valid YAML with
  BOTH `schedule` and `workflow_dispatch`, uses the `MONGODB_URI` secret, installs
  node + headless-chrome libs, runs the ingest script with a `--limit`, and
  uploads a log artifact (mirrors `gpu-review-update.yml`). It does NOT run with
  `--dry-run` removed in a way that could write live collections (it targets
  pending_components only by construction).
- `reviewPendingComponents.js` is READ-ONLY (lists/summarizes pending docs; no
  writes, no promotion to live).

## Out of scope — touching these FAILS the slice
- `server.js`, `models/` (no schema edits), `public/`, existing scripts
  (`findNewComponents.js` etc. — reuse by reading/requiring, do not modify),
  existing workflows.
- package.json: may ONLY add entries to the `scripts` section (no dependency
  changes — mongodb/puppeteer/dotenv already present).
- PROMOTION of pending components into live collections (a later slice). No writes
  to live component collections at all.
- Any UI/review-page work (later).
