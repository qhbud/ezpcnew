| File | What |
|---|---|
| public/index.html | build review panel wording and derived info notes |
| public/script.js | price freshness/volatility helpers and live listing product-card badges |
| public/styles-v5.css | info-note and price badge styles |
| test/build-review-e2e.js | R1/R2/R3 Puppeteer regression test |
| docs/lanes/slice-3-00.md | raw lane report |

| Scenario | Notes |
|---|---|
| normal | GPU is the performance anchor [info]; CPU/GPU spend looks balanced [info]; Storage is fast NVMe [info]; PSU has usable headroom [info]; Platform is current-generation [info] |
| older platform | Older platform for this budget [warning]; GPU is the performance anchor [info]; CPU/GPU spend looks balanced [info]; Storage is fast NVMe [info]; PSU has usable headroom [info] |
| cheap motherboard | Motherboard looks unusually cheap [warning]; GPU is the performance anchor [info]; CPU/GPU spend looks balanced [info]; Storage is fast NVMe [info]; PSU has usable headroom [info] |
| weak storage | Storage value may be weak [warning]; GPU is the performance anchor [info]; CPU/GPU spend looks balanced [info]; Storage trades speed for value [info]; PSU has usable headroom [info] |
| cheap cooler | Cooler is very low cost [warning]; GPU is the performance anchor [info]; CPU/GPU spend looks balanced [info]; Storage is fast NVMe [info]; PSU has usable headroom [info] |
| tight psu | PSU headroom is tight [warning]; GPU is the performance anchor [info]; CPU/GPU spend looks balanced [info]; Storage is fast NVMe [info]; Platform is current-generation [info] |

| Field | Endpoint | Exists | Sample |
|---|---|---|---|
| updatedAt | http://localhost:3000/api/parts/gpus?groupByModel=false | True | 2026-06-11T03:18:19.080Z |
| lastUpdated | http://localhost:3000/api/parts/gpus?groupByModel=false | True | 2026-02-09T02:13:44.518Z |
| embedded priceHistory[].date | http://localhost:3000/api/parts/gpus?groupByModel=false | False |  |
| priceHistory[].date | http://localhost:3000/api/parts/gpus/698942d847ac738ed70aa5a2/price-history | True | 2026-02-10T04:17:51.532Z |
| updatedAt | http://localhost:3000/api/parts/cpus | True | 2026-06-11T02:39:41.421Z |
| lastUpdated | http://localhost:3000/api/parts/cpus | False |  |
| embedded priceHistory[].date | http://localhost:3000/api/parts/cpus | False |  |
| priceHistory[].date | http://localhost:3000/api/parts/cpus/68bc95c9702c814909567746/price-history | True | 2025-10-23T04:22:35.267Z |

| Price badge item | Value |
|---|---|
| Render points | public/script.js _renderGpuProductCard; _renderCpuProductCard; _renderCoolerProductCard; _renderMoboProductCard; _renderRamProductCard; _renderPsuProductCard; _renderGenericProductCard for case/storage/addon |
| Freshness rule | newest valid updatedAt, lastUpdated, or priceHistory[].date; no price badge when no valid timestamp or no displayed price |
| Volatility rule | sort valid priceHistory points newest-first; use last 5; show swing badge when (max price - min price) / current displayed price >= 0.12 |

| R3 live tab evidence | Card | Price text | Freshness badges | First badge |
|---|---|---|---|---|
| gpu | #gpuProductCard | $199.99 | 1 | Updated 3 days ago |
| cpu | #cpuProductCard | $140.95 | 1 | Updated 3 days ago |

```text
node --check public/script.js
EXIT CODE: 0
```

```text
node test/smoke.js
CONSOLE ERRORS: 0
PAGE ERRORS: 0
EXIT CODE: 0
```

```text
node test/build-review-e2e.js
PASS R1 explanation present
PASS R2 PSU warning still fires
PASS R3 freshness badge honest
EXIT CODE: 0
```

STATUS: COMPLETE
