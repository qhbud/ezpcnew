# Slice 13-00 raw results

## State-helper guards

- `public/script.js:3686-3687` — `showLoading`
- `public/script.js:3691-3692` — `hideLoading`
- `public/script.js:3696-3697` — `showError`
- `public/script.js:3701-3702` — `hideError`

## Category-loader audit

- `public/script.js:2107` — `loadAllCPUs`: already had loading and visible error handling.
- `public/script.js:2146` — `loadAllMotherboards`: already had loading and visible error handling.
- `public/script.js:2219` — `loadAllRAM`: already had loading and visible error handling.
- `public/script.js:2244` — `loadAllPSUs`: already had loading and visible error handling.
- `public/script.js:2274` — `loadAllCoolers`: already had loading and visible error handling.
- `public/script.js:2299` — `loadAllStorage`: lacked loading and visible error handling; changed.
- `public/script.js:2328` — `loadAllCases`: lacked loading and visible error handling; changed.
- `public/script.js:2357` — `loadAllAddons`: lacked loading and visible error handling; changed.
- `public/script.js:2386` — `loadAllGPUs`: already had loading and visible error handling; reference pattern.

## `node --check public/script.js`

```text
```

Exit code: 0

## `node test/resilience-e2e.js`

```text
PASS R1 cold load clean and every component tab switches safely
PASS R2 failed storage fetch shows an error and leaves CPU usable
PASS R3 state helpers are null-safe when shared elements are absent
PASS R4 zero-item component list shows a readable empty notice
```

Exit code: 0

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

Exit code: 1

## `npm.cmd test` equivalent Windows shim

```text

> pcbuilder2@1.0.0 test
> node test/smoke.js

CONSOLE ERRORS: 0
PAGE ERRORS: 0
```

Exit code: 0

STATUS: COMPLETE_WITH_CONCERNS (PowerShell blocked the literal npm.ps1 wrapper; npm.cmd executed the same test script successfully)
