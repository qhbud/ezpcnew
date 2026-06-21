# Slice 12-00

## Locations

| Item | File:line |
|---|---|
| Shared filter state | `public/script.js:160` |
| Shared toggle markup, empty notice, and change wiring | `public/script.js:15050`, `public/script.js:15057`, `public/script.js:15071` |
| Generic CPU/RAM/PSU/cooler/case/add-on filter + toggle | `public/script.js:15109`, `public/script.js:15127` |
| GPU filter + toggle | `public/script.js:15778`, `public/script.js:15802` |
| Motherboard filter + toggle | `public/script.js:17102`, `public/script.js:17116` |
| PSU compatibility branch | `public/script.js:10803` |
| Toggle CSS | `public/styles-v5.css:5687` |

## `isCompatibleWithBuild`-driven list renderers

| Renderer | Predicate call site | Toggle/filter |
|---|---:|---:|
| Generic `_renderTabList` — CPU, RAM, PSU, cooler, case, add-on | `public/script.js:15155` | `public/script.js:15109`, `public/script.js:15127` |
| GPU `_renderGpuFilterResults` | `public/script.js:15831` | `public/script.js:15778`, `public/script.js:15802` |
| Motherboard `_renderMoboFilterResults` | `public/script.js:17141` | `public/script.js:17102`, `public/script.js:17116` |

Handled predicate-driven list renderers: `3 / 3`.

Classifier warning diff hits: `0`.

## `node --check public/script.js`

```text
EXIT_CODE=0
```

## `node test/compat-filter-e2e.js`

```text
PASS F1 compatible-only toggle present on every component list
PASS F2 filter hides incompatible CPUs and restores the full set
PASS F3 PSU undersize predicate is additive and null-safe
PASS F4 compatibility filter empty state is readable and error-free
```

Exit code: `0`.

## `npm test`

```text
npm : File C:\Program Files\nodejs\npm.ps1 cannot be loaded because running scripts is disabled on this system. For 
more information, see about_Execution_Policies at https:/go.microsoft.com/fwlink/?LinkID=135170.
At line:2 char:1
+ npm test
+ ~~~
    + CategoryInfo          : SecurityError: (:) [], PSSecurityException
    + FullyQualifiedErrorId : UnauthorizedAccess
```

Exit code: `1`.

## `npm.cmd test`

```text
> pcbuilder2@1.0.0 test
> node test/smoke.js

CONSOLE ERRORS: 0
PAGE ERRORS: 0
```

Exit code: `0`.

STATUS: COMPLETE_WITH_CONCERNS (PowerShell execution policy blocked `npm.ps1`; the identical package script passed through `npm.cmd test`)
