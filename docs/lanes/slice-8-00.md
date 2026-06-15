| File | Change |
| --- | --- |
| `scripts/ingestNewComponents.js` | New Amazon discovery/ingest CLI with exported pure `buildPendingComponent`, dry-run mode, live read-only lookup, and guarded pending upsert. |
| `scripts/reviewPendingComponents.js` | New read-only pending queue summary CLI. |
| `.github/workflows/component-ingest.yml` | New weekly/manual GitHub Actions workflow for remote component ingest with log artifact. |
| `test/ingest-format.js` | New deterministic no-network/no-DB format test for GPU/CPU/RAM pending docs. |
| `package.json` | Added `ingest-components` and `review-pending` scripts only. |
| `docs/lanes/slice-8-00.md` | Raw slice output and verification record. |

Pending doc shape:

| Key | Source |
| --- | --- |
| `componentType` | Normalized type alias from CLI/builder input. |
| `name` | `rawProduct.name`, then `title`, then `rawTitle`. |
| `imageUrl` | Product-page scraper image, then search-card image. |
| `productUrl` | Canonical Amazon `/dp/<ASIN>?tag=<affiliate>` when ASIN exists; otherwise source URL with tag added for Amazon. |
| `price` | `currentPrice`, `price`, then `basePrice`, normalized to number or `null`. |
| `source` | Raw source or `amazon` for Amazon URLs. |
| `asin` | Raw ASIN or extracted from Amazon URL. |
| `dedupKey` | `amazon:<ASIN>` or `name:<normalized-name>`. |
| `scrapedAt` | Raw scrape timestamp supplied by CLI; pure builder fallback is deterministic epoch. |
| `status` | Literal `pending`. |
| `reviewNotes` | Empty string by default. |
| `fields` | Type-specific parsed specs below. |
| `rawTitle` | Raw product title/name retained for review. |
| `alreadyInLive` | Read-only lookup by ASIN/name against live collections. |
| `createdAt`, `updatedAt` | Added only by DB upsert metadata. |

Field derivation:

| Type | `fields` keys populated | Derivation |
| --- | --- | --- |
| `gpu` | `manufacturer`, `partner`, `chipset`, `memory.size/type/speed/busWidth`, `core.baseClock/boostClock`, `power.tdp/recommendedPsu`, `specifications.pcieVersion` | Title/features/spec text regexes for GPU vendor/partner names, RTX/RX/Arc chipset, `GB GDDR`, `Gbps`, `bit`, clock MHz, explicit TDP/TBP/board power/recommended PSU wattage, and PCIe version. |
| `cpu` | `manufacturer`, `socket`, `cores`, `threads`, `baseClock`, `boostClock`, `tdp`, `integratedGraphics`, `memoryType`, `maxMemorySpeed`, `pcieVersion` | Title/features/spec text regexes for Intel/AMD, socket tokens, `core/thread`, base/boost GHz, explicit CPU TDP/base power wattage, graphics wording, DDR4/DDR5, MT/s, and PCIe version. |
| `motherboard` | `manufacturer`, `chipset`, `socket`, `formFactor`, `memorySlots`, `maxMemory`, `memoryType`, `sataPorts`, `pcieSlots`, `m2Slots`, `networking` | Title/features/spec text regexes for board maker, chipset token, socket, ATX/mATX/ITX/E-ATX, DIMM count, max memory GB, DDR type, SATA count, PCIe/M.2 slot counts/version, WiFi/Bluetooth. |
| `ram` | `manufacturer`, `brand`, `capacity`, `kitSize`, `totalCapacity`, `memoryType`, `speed`, `casLatency`, `timing`, `voltage`, `formFactor`, `ecc`, `registered`, `xmp`, `expo`, `rgb` | Title/features/spec text regexes for memory vendor/line, kit pattern like `32GB (2x16GB)`, DDR type, MHz/MT/s, CL, timing, volts, DIMM/SODIMM, ECC/registered words, XMP/EXPO/RGB. |
| `storage` | `manufacturer`, `brand`, `type`, `formFactor`, `capacity`, `interface`, `readSpeed`, `writeSpeed`, `specifications.rpm` | Title/features/spec text regexes for storage vendor/line, HDD/SSD/M.2/NVMe type, TB/GB capacity, SATA/NVMe/PCIe interface, MB/s read/write, RPM. |
| `psu` | `manufacturer`, `brand`, `wattage`, `efficiency`, `formFactor`, `modularity`, `certification`, `features` | Title/features/spec text regexes for PSU vendor/line, wattage, 80 Plus/Cybenetics rating, ATX/SFX/TFX, modularity wording, ATX 3.x/PCIe 5.x features. |
| `case` | `manufacturer`, `brand`, `formFactor`, `motherboardSupport`, `features`, `specifications.hasRGB/window` | Title/features/spec text regexes for case vendor/line, supported ATX/mATX/ITX/E-ATX mentions, mesh/airflow/USB-C, RGB, tempered glass/window. |
| `cooler` | `manufacturer`, `brand`, `type`, `coolingMethod`, `socket`, `fan.count/size/rgb`, `radiator.size`, `performance.tdp` | Title/features/spec text regexes for cooler vendor/line, air/liquid/AIO/radiator wording, socket tokens, fan count and mm sizes, radiator mm size, explicit TDP. |
| `addon` | `manufacturer`, `brand`, `category`, `type`, `fanSpecs`, `lightingSpecs`, `cableSpecs`, `thermalSpecs`, `controllerSpecs`, `specifications.hasRGB` | Title/features/spec text classifier for fan/RGB/cable/thermal/controller/accessory, plus regexes for fan mm/RPM/PWM/RGB, lighting connector/addressable, cable connector/length, thermal amount, controller channels. |

Dedup key:

| Definition | Stability |
| --- | --- |
| `amazon:<ASIN>` when a valid ASIN exists; otherwise `name:<lowercase alphanumeric normalized product name>`. | Amazon ASIN is stable across reruns and URLs; normalized name fallback strips punctuation and whitespace variation so the same non-ASIN product maps to the same key. |

`node --check scripts/ingestNewComponents.js`:

```text
```

Exit code: 0

`node --check scripts/reviewPendingComponents.js`:

```text
```

Exit code: 0

`node test/ingest-format.js`:

```text
PASS F1 required keys
PASS F2 type-specific fields
PASS F3 icon name link affiliate
PASS F4 stable dedup key
```

Exit code: 0

`node scripts/ingestNewComponents.js --dry-run --limit=1 --type=gpu`:

```text
DRY RUN — no DB writes

Searching gpu candidates (limit 1)
Search term: NVIDIA RTX 4090 graphics card
Found 24 Amazon search result(s)
🔍 Scraping: https://www.amazon.com/dp/B0BJFRT43X?tag=qhezpc-20
🎯 Perfect scraping result: $3999 from Hidden Input: #twister-plus-price-data-price
{
  "componentType": "gpu",
  "name": "VIPERA NVIDIA GeForce RTX 4090 Founders Edition Graphic Card",
  "imageUrl": "https://m.media-amazon.com/images/I/514QPBuqGyL._AC_SX355_.jpg",
  "productUrl": "https://www.amazon.com/dp/B0BJFRT43X?tag=qhezpc-20",
  "price": 3999,
  "source": "amazon",
  "asin": "B0BJFRT43X",
  "dedupKey": "amazon:B0BJFRT43X",
  "scrapedAt": "2026-06-15T05:07:19.586Z",
  "status": "pending",
  "reviewNotes": "",
  "fields": {
    "manufacturer": "NVIDIA",
    "partner": null,
    "chipset": "RTX 4090",
    "memory": {
      "size": 24,
      "type": "GDDR6X",
      "speed": null,
      "busWidth": null
    },
    "core": {
      "baseClock": null,
      "boostClock": null
    },
    "power": {
      "tdp": null,
      "recommendedPsu": null
    },
    "specifications": {
      "pcieVersion": null
    }
  },
  "rawTitle": "VIPERA NVIDIA GeForce RTX 4090 Founders Edition Graphic Card",
  "alreadyInLive": true
}

Ingest summary:
{
  "discovered": 1,
  "queued": 1,
  "upserted": 0,
  "skipped": 0
}
```

Exit code: 0

Live Amazon scraping returned 24 search candidates under the sandbox and printed one would-be pending doc. Dry-run summary reported `"upserted": 0`.

Write-operation grep:

`rg -n "insertOne|insertMany|updateOne|updateMany|bulkWrite|replaceOne|deleteOne|deleteMany|delete\(" scripts/ingestNewComponents.js scripts/reviewPendingComponents.js`

```text
scripts/ingestNewComponents.js:1088:  return db.collection(PENDING_COLLECTION).updateOne(
```

Pending collection constant grep:

`rg -n "PENDING_COLLECTION|pending_components|updateOne|insertOne|insertMany|updateMany|bulkWrite|replaceOne|deleteOne|deleteMany|delete\(" scripts/ingestNewComponents.js scripts/reviewPendingComponents.js`

```text
scripts/reviewPendingComponents.js:5:const PENDING_COLLECTION = 'pending_components';
scripts/reviewPendingComponents.js:76:    const collection = db.collection(PENDING_COLLECTION);
scripts/ingestNewComponents.js:6:const PENDING_COLLECTION = 'pending_components';
scripts/ingestNewComponents.js:1088:  return db.collection(PENDING_COLLECTION).updateOne(
scripts/ingestNewComponents.js:1227:  PENDING_COLLECTION
```

Collection access grep:

`rg -n "collection\(" scripts/ingestNewComponents.js scripts/reviewPendingComponents.js`

```text
scripts/reviewPendingComponents.js:76:    const collection = db.collection(PENDING_COLLECTION);
scripts/ingestNewComponents.js:1046:      const docs = await db.collection(collectionName).find({}, {
scripts/ingestNewComponents.js:1088:  return db.collection(PENDING_COLLECTION).updateOne(
```

`git diff -- docs/gates`:

```text
```

Exit code: 0

STATUS: COMPLETE
