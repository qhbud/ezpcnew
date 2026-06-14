| File changed | One-line what |
| --- | --- |
| package.json | Added `test` script: `node test/smoke.js`. |
| public/script.js | Renamed the primary manufacturer filter loader, guarded absent GPU/CPU builder filter calls, and removed the missing-filter `console.error`. |
| test/smoke.js | Added Puppeteer smoke harness for builder, GPU, and CPU tabs. |
| docs/lanes/slice-0-00.md | Added lane report. |

`node --check public/script.js`

Exit code: 0

```text
```

Call sites of `populateManufacturerFilter` found

| File:line | What changed |
| --- | --- |
| public/script.js:923 | Changed no-argument `this.populateManufacturerFilter()` to `this.populatePrimaryManufacturerFilter()`. |
| public/script.js:2997 | Kept GPU call; guarded it with `document.getElementById('gpuManufacturerFilter')`. |
| public/script.js:3000 | Kept CPU call; guarded it with `document.getElementById('cpuManufacturerFilter')`. |

`grep -rn "populateManufacturerFilter" public/script.js`

Exit code: 0

```text
2997:            this.populateManufacturerFilter('gpuManufacturerFilter', this.allGPUs);
3000:            this.populateManufacturerFilter('cpuManufacturerFilter', this.allCPUs);
3016:    populateManufacturerFilter(filterId, components) {
```

G3 grep results

`grep -rn "Filter element" public/script.js`

Exit code: 0

```text
1420:            // Filter element doesn't exist in current UI, skip
```

`grep -rn "gpuManufacturerFilter\|cpuManufacturerFilter" public/index.html`

Exit code: 1

```text
```

`grep -rn "Filter element gpuManufacturerFilter not found\|Filter element cpuManufacturerFilter not found\|Filter element undefined not found" public/script.js`

Exit code: 1

```text
```

`node test/smoke.js`

Exit code: 0

```text
CONSOLE ERRORS: 0
PAGE ERRORS: 0
```

`npm test`

Exit code: 1

```text
npm : File C:\Program Files\nodejs\npm.ps1 cannot be loaded because running scripts is disabled on this system. For 
more information, see about_Execution_Policies at https:/go.microsoft.com/fwlink/?LinkID=135170.
At line:2 char:1
+ npm test
+ ~~~
    + CategoryInfo          : SecurityError: (:) [], PSSecurityException
    + FullyQualifiedErrorId : UnauthorizedAccess
```

`npm.cmd test`

Exit code: 0

```text

> pcbuilder2@1.0.0 test
> node test/smoke.js

CONSOLE ERRORS: 0
PAGE ERRORS: 0
```

STATUS: COMPLETE_WITH_CONCERNS (PowerShell execution policy blocks npm.ps1 for exact `npm test`; `npm.cmd test` and `node test/smoke.js` passed)
