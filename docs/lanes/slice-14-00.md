# Slice 14-00 raw results

## Reference search before deletion

```text
> $results = Get-ChildItem -Path public -Recurse -File | Where-Object { $_.FullName -ne (Resolve-Path 'public/mobile.html').Path } | Select-String -Pattern 'mobile\.html'; $serverResults = Select-String -Path server.js -Pattern 'mobile\.html'; @($results) + @($serverResults) | ForEach-Object { "{0}:{1}:{2}" -f $_.Path,$_.LineNumber,$_.Line }; if ((@($results).Count + @($serverResults).Count) -eq 0) { Write-Output 'NO_REFERENCES_FOUND' }
NO_REFERENCES_FOUND
```

## `node --check test/mobile-e2e.js`

```text
```

Exit code: 0

## `node test/mobile-e2e.js`

```text
PASS M1 no horizontal overflow on load, tabs, and wizard
PASS M2 key mobile controls and component content are rendered
PASS M3 zero uncaught page errors and console errors
PASS M4 mobile.html returns HTTP 404
```

Exit code: 0

## `npm test`

```text

> pcbuilder2@1.0.0 test
> node test/smoke.js

CONSOLE ERRORS: 0
PAGE ERRORS: 0
```

Exit code: 0

## `git status --short`

```text
 D public/mobile.html
?? docs/lanes/slice-14-00.md
?? test/mobile-e2e.js
```

STATUS: COMPLETE
