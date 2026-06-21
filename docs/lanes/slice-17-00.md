# Slice 17-00 Raw Results

| File:line | Change |
|---|---|
| `server.js:62` | Community request body limit |
| `server.js:140-176` | Community request detection, text sanitization, query integer coercion |
| `server.js:249-258` | Community JSON parser |
| `server.js:1612-1628` | Community oversized and malformed JSON responses |
| `server.js:2761-2892` | Four community build route handlers |
| `test/community-api-e2e.js:1-294` | Live HTTP API gate and ID-scoped cleanup |
| `docs/lanes/slice-17-00.md:1-68` | Raw lane results |

## Route handler signatures

| Method | Path |
|---|---|
| `POST` | `/api/community/builds` |
| `GET` | `/api/community/builds` |
| `GET` | `/api/community/builds/:id` |
| `POST` | `/api/community/builds/:id/like` |

## `node --check server.js`

Exit code: `0`

```text
```

## `node test/community-api-e2e.js`

Exit code: `0`

```text
SAMPLE DOCUMENT {"_id":"zenZ9SVyifBd","title":"Synthetic Community Build One","author":"API Test Author","build":{"cpu":"community-cpu-001","gpu":{"id":"community-gpu-001","qty":1},"motherboard":"community-motherboard-001","ram":{"id":"community-ram-001","qty":2}},"likes":0,"createdAt":"2026-06-21T23:19:34.613Z"}
PASS C1 create and read round-trip
PASS C2 list sort and pagination
PASS C3 atomic likes reflected in read and list
PASS C4 validation sanitization and not-found responses
PASS CLEANUP deleted=4
```

## `cmd.exe /d /c "npm test"`

Exit code: `0`

```text

> pcbuilder2@1.0.0 test
> node test/smoke.js

CONSOLE ERRORS: 0
PAGE ERRORS: 0
```

## Sample created document

```json
{"_id":"zenZ9SVyifBd","title":"Synthetic Community Build One","author":"API Test Author","build":{"cpu":"community-cpu-001","gpu":{"id":"community-gpu-001","qty":1},"motherboard":"community-motherboard-001","ram":{"id":"community-ram-001","qty":2}},"likes":0,"createdAt":"2026-06-21T23:19:34.613Z"}
```

## Additional command results

| Command | Exit code | Output |
|---|---:|---|
| Existing shared-build oversized request | `0` | `SHARED_OVERSIZE_STATUS=413` |
| Synthetic community document count | `0` | `SYNTHETIC_TEST_DOCS=0` |

STATUS: COMPLETE
