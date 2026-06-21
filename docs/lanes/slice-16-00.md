| File | Line | Change |
|---|---:|---|
| `public/index.html` | 106 | Header global-search input and results panel |
| `public/script.js` | 102 | Cached search state |
| `public/script.js` | 229 | Debounced input, Escape, result-click, outside-click wiring |
| `public/script.js` | 528 | API category-to-tab and label mapping |
| `public/script.js` | 550 | Single cached `/api/parts` fetch |
| `public/script.js` | 582 | Case-insensitive substring search and safe DOM rendering |
| `public/script.js` | 666 | Search-result to category-data identity matching |
| `public/script.js` | 698 | Existing tab-filter reveal path |
| `public/script.js` | 773 | Display-only temporary result row fallback |
| `public/script.js` | 805 | Tab switch, await, locate, highlight, and scroll |
| `public/script.js` | 1051 | Awaitable existing tab renderer dispatch |
| `public/styles-v5.css` | 122 | Unclipped header dropdown |
| `public/styles-v5.css` | 192 | Search input, panel, result, and scrolling styles |
| `public/styles-v5.css` | 323 | Shared `.global-search-located` marker |
| `public/styles-v5.css` | 1035 | Mobile result layout |
| `test/global-search-e2e.js` | 1 | Live Puppeteer G3 coverage |
| `docs/lanes/slice-16-00.md` | 1 | Raw lane results |

`node --check public/script.js`

```text
EXIT_CODE=0
```

`node test/global-search-e2e.js`

```text
PASS G3.1 cross-category results include name, category, and price
PASS G3.2 substring matching is case-insensitive and cached
PASS G3.3 click activates the category and locates without selecting
PASS G3.4 no-match, clear, Escape, and pre-load paths are guarded
SAMPLE Intel Core Ultra 9 285K Desktop Processor | CPU | $536.00
SAMPLE GIGABYTE Z690 AORUS ULTRA (LGA 1700/ Intel Z690/ ATX/ DDR5/ Quad M.2/ PCIe 5.0/ USB 3.2 Gen2X2/ Type-C/ WiFi 6/ 2.5GbE LAN/ Gaming Motherboard) | Motherboard | $284.55
EXIT_CODE=0
```

`cmd.exe /d /c "npm test"`

```text

> pcbuilder2@1.0.0 test
> node test/smoke.js

CONSOLE ERRORS: 0
PAGE ERRORS: 0
EXIT_CODE=0
```

| Name | Category | Price |
|---|---|---:|
| Intel Core Ultra 9 285K Desktop Processor | CPU | $536.00 |
| GIGABYTE Z690 AORUS ULTRA (LGA 1700/ Intel Z690/ ATX/ DDR5/ Quad M.2/ PCIe 5.0/ USB 3.2 Gen2X2/ Type-C/ WiFi 6/ 2.5GbE LAN/ Gaming Motherboard) | Motherboard | $284.55 |

| API category | `data-tab` |
|---|---|
| cpus | cpu |
| motherboards | motherboard |
| gpus | gpu |
| rams | ram |
| storages | storage |
| psus | psu |
| cases | case |
| coolers | cooler |

`git status --porcelain`; boundary and diff check

```text
 M public/index.html
 M public/script.js
 M public/styles-v5.css
?? docs/lanes/slice-16-00.md
?? test/global-search-e2e.js
CHANGED_FILES=5
UNEXPECTED_CHANGED_FILES=0
DOCS_GATES_DIFF_FILES=0
DIFF_CHECK_EXIT_CODE=0
warning: in the working copy of 'public/index.html', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'public/script.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'public/styles-v5.css', LF will be replaced by CRLF the next time Git touches it
```

STATUS: COMPLETE
