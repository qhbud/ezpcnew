# Slice 18-00 Raw Results

| File:line | Change |
|---|---|
| `public/index.html:125` | Community main-nav destination |
| `public/index.html:137-175` | Community gallery view, sort, loading/error/empty states, grid, load-more control |
| `public/index.html:1641-1643` | Builder share-to-community action |
| `public/index.html:2302-2328` | Community submission modal and frontend cache key |
| `public/script.js:123-130` | Community client state |
| `public/script.js:509-570` | Gallery, like, sort, retry, modal, and submit event wiring |
| `public/script.js:1167-1170` | Non-component community `switchTab` branch |
| `public/script.js:1190-1501` | Fetch, pagination, state rendering, text-safe cards, like, load, and submit implementations |
| `public/script.js:4476-4499` | Targetable Slice-13 loading/error helpers |
| `public/script.js:6834-6856` | Empty-build action state |
| `public/styles-v5.css:470-732` | Gallery, card, state, modal, responsive, and hidden-control styles |
| `test/community-ui-e2e.js:1-532` | Live UI/API Puppeteer gate and ID-scoped MongoDB cleanup |
| `docs/lanes/slice-18-00.md:1-88` | Raw lane results |

| Gallery trigger | Value |
|---|---|
| Main nav | `button.main-tab[data-tab="community"]` |
| View | `#community-tab` |

## `node --check public/script.js`

Exit code: `0`

```text
```

## `node test/community-ui-e2e.js`

Exit code: `0`

```text
PASS UI1 submit and client-side guards
PASS UI2 browse fields and newest/likes sort order
PASS UI3 like uses API-returned count and persists
PASS UI4 card load delegates to applyBuildData and shows builder
PASS UI5 empty/error states and HTML text escaping
SAMPLE CARD UI Submitted Build mqonfitl | By UI Author mqonfitl | CPU | likes=0
PASS CLEANUP deleted=3
```

## `cmd.exe /d /c "npm test"`

Exit code: `0`

```text

> pcbuilder2@1.0.0 test
> node test/smoke.js

CONSOLE ERRORS: 0
PAGE ERRORS: 0
```

| title | author | price/key parts | likes |
|---|---|---|---:|
| `UI Submitted Build mqonfitl` | `By UI Author mqonfitl` | `CPU` | `0` |

## `node test/community-api-e2e.js`

Exit code: `0`

```text
SAMPLE DOCUMENT {"_id":"Hmm6hv1obKbs","title":"Synthetic Community Build One","author":"API Test Author","build":{"cpu":"community-cpu-001","gpu":{"id":"community-gpu-001","qty":1},"motherboard":"community-motherboard-001","ram":{"id":"community-ram-001","qty":2}},"likes":0,"createdAt":"2026-06-22T03:11:02.735Z"}
PASS C1 create and read round-trip
PASS C2 list sort and pagination
PASS C3 atomic likes reflected in read and list
PASS C4 validation sanitization and not-found responses
PASS CLEANUP deleted=5
```

## Boundary check

```text
 M public/index.html
 M public/script.js
 M public/styles-v5.css
?? docs/lanes/slice-18-00.md
?? test/community-ui-e2e.js
CHANGED_FILES=5
UNEXPECTED_CHANGED_FILES=0
DOCS_GATES_DIFF_FILES=0
```

STATUS: COMPLETE
