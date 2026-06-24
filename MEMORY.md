# MEMORY

## Open priorities

- DONE (2026-06-23 eve): Fun Stats price/performance dot plot (`0144eac`) pushed to origin/main → Railway+Render redeploy. Adds read-only `GET /api/builds/points` + front-end plot.
- DONE/verified: scraper proxy-outage hardening (`cb845fc`) + outage guard (`095068a`) are on origin/main. The 06-23 Daily Price Update + Component Ingest are green again with the `ciCheckProxy.js` preflight in place; the earlier tunnel failure recovered.
- Repo still has local untracked scratch files that should not be committed unless explicitly needed: `.claude/`, `_full_meta.txt`, `scripts/.update_progress.json`, `scripts/_auditMobo.js`, `scripts/_checkPendingBatch.js`.
- Owner still needs to ensure GitHub Actions has `MONGODB_URI` and Atlas Network Access allows the runner before relying on the scheduled price workflow.
