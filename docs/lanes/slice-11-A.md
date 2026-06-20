<!-- FROZEN SHARED CONTRACT — READ ONLY
POST /api/builds
- Content-Type: application/json; raw UTF-8 body maximum: 16,384 bytes.
- Body: a non-empty object whose only keys are gpu, cpu, motherboard, ram,
  cooler, psu, storage, storage2..storage6, case, or addon..addon6.
- Values: every key is an ID string matching /^[A-Za-z0-9._:-]{1,128}$/;
  gpu and ram may instead be {"id": <same ID string>, "qty": <integer 1..16>}.
  No other nested keys, arrays, markup, nulls, or non-reference fields are valid.
- Success: HTTP 200 with exactly {"id":"<short-id>"}.

GET /api/builds/:id
- id: exactly 12 characters from [A-Za-z0-9_-], generated from 9 random bytes
  with built-in crypto and base64url encoding.
- Success: HTTP 200 with the normalized build object directly (no wrapper).
- Missing or invalid id: HTTP 404 with {"error":"Build not found"}.

Mongo collection: builds in the configured database (default pcbuilder).
Stored document: {"_id":"<short-id>","build":<normalized request body>,
"createdAt":<BSON Date>}. The random string _id is the uniqueness key; no Mongo
ObjectId or sequential identifier is exposed.
-->

## Changed blocks

| Block | File:line |
| --- | --- |
| Body cap, key/reference validation, id generation | `server.js:61` |
| Route-specific 16 KiB JSON parser | `server.js:208` |
| Oversized shared-build response | `server.js:1568` |
| `POST /api/builds` | `server.js:2648` |
| `GET /api/builds/:id` | `server.js:2681` |
| `shareBuild()` POST + copied short URL | `public/script.js:6926` |
| `loadBuildFromURL()` short-id/legacy split | `public/script.js:7122` |
| `applyBuildData()` reuse | `public/script.js:7169` |
| Round-trip e2e | `test/share-e2e.js:1` |

## Back-compat

| `build` parameter | Path |
| --- | --- |
| `/^[A-Za-z0-9_-]{12}$/` | `GET /api/builds/${encodeURIComponent(buildParam)}` |
| Otherwise | whitespace-to-`+`, strip non-base64 characters, `JSON.parse(atob(legacyBuildParam))` |
| Both | `applyBuildData(buildData, { sourceLabel: 'shared link', notify: true })` |

## Dependency/API verification

```text
node=v24.16.0
express=4.21.2
mongodb=6.18.0
dotenv=16.6.1
puppeteer=21.11.0
express.json=function
Collection.insertOne=function
Collection.findOne=function
crypto.randomBytes=function
base64url=_-8
```

## Parse

```text
COMMAND: node --check server.js
EXIT_CODE=0
```

```text
COMMAND: node --check public/script.js
EXIT_CODE=0
```

```text
COMMAND: node --check test/share-e2e.js
EXIT_CODE=0
```

## Initial e2e command

```text
COMMAND: node test/share-e2e.js
PASS server ready already-running
FAIL AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

404 !== 200

    at C:\Users\Quinn\Desktop\pcbuilder2\.architect\wt\slice-11-A\test\share-e2e.js:136:16
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
EXIT_CODE=1
```

## Final e2e command

```text
COMMAND: node test/share-e2e.js
PASS server ready started-by-test url=http://localhost:52846
PASS POST /api/builds id=IpqikzKdtnW2
PASS GET /api/builds/:id round-trip
PASS Mongo stored document shape
PASS GET /api/builds/:id missing
PASS POST /api/builds unknown key rejected status=400
PASS POST /api/builds arbitrary nested field rejected status=400
PASS POST /api/builds oversized body rejected status=413
PASS client short-id share/load and legacy base64 branches
EXIT_CODE=0
```

## Smoke

```text
COMMAND: node server.js
PORT=31992
Connected to MongoDB successfully
âœ… Connected to MongoDB database
ðŸš€ Server running on http://localhost:31992
ðŸ“Š Frontend available at http://localhost:31992
ðŸ”Œ API endpoints available at http://localhost:31992/api
```

```text
COMMAND: cmd.exe /d /s /c "npm test"
BASE_URL=http://localhost:31992

> pcbuilder2@1.0.0 test
> node test/smoke.js

CONSOLE ERRORS: 0
PAGE ERRORS: 0
EXIT_CODE=0
```

```text
COMMAND: Stop-Process -Id 51788 -Force
STOPPED
EXIT_CODE=0
```

## Cleanup

```text
CREATED_TEST_DOCS_REMAINING=0
```

## Diff and boundaries

```text
COMMAND: git status --short --untracked-files=all
 M public/script.js
 M server.js
?? docs/lanes/slice-11-A.md
?? test/share-e2e.js
```

```text
COMMAND: git diff --check
warning: in the working copy of 'public/script.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'server.js', LF will be replaced by CRLF the next time Git touches it
EXIT_CODE=0
```

```text
COMMAND: git diff -- docs/gates
OUTPUT_LENGTH=0
EXIT_CODE=0
```

```text
COMMAND: git diff --stat
 public/script.js |  59 ++++++++++++++--------
 server.js        | 146 ++++++++++++++++++++++++++++++++++++++++++++++++++++++-
 2 files changed, 184 insertions(+), 21 deletions(-)
```

```text
test/share-e2e.js physical_lines=254
docs/lanes/slice-11-A.md frozen-contract lines=19
```

STATUS: COMPLETE
