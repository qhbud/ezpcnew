# Daily Price Update — GitHub Actions

`price-update.yml` runs the price scraper (`scripts/updateAllComponentPrices.js`)
in GitHub's cloud on a daily schedule, so your PC no longer needs to be on.
It replaces the local Windows Task Scheduler job **"PCBuilder-PriceUpdate"**.

## Structure: one parallel job per collection
The old single run was being cut short (PC sleeping / the 4h limit), leaving most
collections days stale. This workflow instead fans out **one parallel job per
component collection** (`cpus`, `gpus`, `motherboards`, `rams`, `storages`, `psus`,
`cases`, `coolers`, `addons`) via a build matrix, each running
`node scripts/updateAllComponentPrices.js --collection=<name>`. Benefits:

- The whole catalog updates every night (each collection finishes well within limits).
- `fail-fast: false` — one collection failing doesn't cancel the others.
- Each collection has its **own pass/fail status, log, and downloadable artifact**.
- A final **`freshness-summary`** job prints one table across all collections.

To re-run just one collection, use the Actions UI → the run → re-run that single job.

## One-time setup (required before it will work)

1. **Add the database secret.**
   Repo → **Settings → Secrets and variables → Actions → New repository secret**
   - Name: `MONGODB_URI`
   - Value: the `MONGODB_URI` line from your local `.env` (the `mongodb+srv://…` Atlas string)

2. **Let GitHub reach MongoDB Atlas.**
   GitHub's runners use changing datacenter IPs, so Atlas must accept them:
   Atlas → **Network Access → Add IP Address → Allow Access from Anywhere (`0.0.0.0/0`)**.
   Your connection-string username/password remain the security boundary.

3. **Push this workflow to GitHub** (it's on branch `main`). Once pushed, it shows
   up under the repo's **Actions** tab.

4. **Test it now** without waiting for the schedule:
   Actions → **Daily Price Update → Run workflow**. Watch the logs; confirm it
   connects to Atlas and starts updating components.

5. **Turn off the local job** once a cloud run succeeds, so you're not double-updating.
   In an **Administrator** PowerShell:
   ```powershell
   Disable-ScheduledTask -TaskName "PCBuilder-PriceUpdate"
   ```

## Schedule
Runs daily at **03:00 UTC** (≈10 PM US Eastern in winter / 11 PM in summer).
GitHub cron is always UTC and does **not** shift with daylight saving — change the
`cron:` line in `price-update.yml` to move the time.

## ⚠️ Before pushing — security
- `verify-atlas-data.js` has a **hardcoded Atlas connection string with credentials**.
  If this repo is public it's already exposed; if private it's still risky. **Rotate
  that database password and remove the hardcoded string** before relying on this.

## How to tell if a run worked (logging & verification)
Each per-collection job makes its green/red status meaningful:

- **Log environment** — Node/Chrome versions, start time; fails fast if the `MONGODB_URI`
  secret is missing or empty.
- **Pre-flight** — connects to Atlas and prints this collection's baseline freshness before
  the scrape (so a bad secret / Atlas-allowlist problem fails in seconds, not hours).
- **Run price update for `<collection>`** — start/end timestamps; full scrape output is also
  saved to `price-update-<collection>.log`.
- **Verify `<collection>` actually updated** (`ciCheckFreshness.js --collection=<name>
  --assert-min=1`) — counts what was written in the last 6h and **fails that job red if
  nothing was**. This is the real signal — `updateAllComponentPrices.js` always exits 0 even
  when it fails internally.
- **Artifact** — `price-update-<collection>.log` uploaded per job (Actions → run → Artifacts),
  kept 14 days.
- **`freshness-summary` job** — after all collections finish, prints one table of how many
  components in each collection updated, so you see the whole picture at a glance.

Run any of these checks locally too:
```
node scripts/ciCheckFreshness.js --window-hours=24                 # all collections
node scripts/ciCheckFreshness.js --collection=gpus --window-hours=24
node scripts/updateAllComponentPrices.js --collection=cpus        # update one collection
```

## Caveats
- **Datacenter IPs get blocked more by Amazon** than your home IP, so scrape success
  may drop. If it does, the real fix is the Amazon Product Advertising API (or a
  residential proxy).
- **The nightly run may not be finishing.** A freshness check on 2026-06-05 showed only
  storages + motherboards updated in the last 24h (cpus/gpus/rams/psus/cases/coolers = 0),
  which suggests the run hits the 4-hour limit before covering every collection
  (~1,839 components × scrape + 2s delay can exceed 4h). The new post-run log will make
  this visible each day — if it persists, consider splitting the job per-collection or
  raising throughput.
