| file | what |
|---|---|
| public/script.js | updateBuildDock status uses classifyCompatibilityIssues problems/warnings |
| public/styles-v5.css | build dock problem state and mobile bottom anchoring |
| test/dock-e2e.js | D1-D4 dock e2e gate |
| docs/lanes/slice-2-00.md | lane results |

| tab | dock state | exists | dock class | display |
|---|---:|---:|---|---|
| initial home | hidden | false |  |  |
| gpu tab | visible | true | build-dock | flex |
| builder tab | hidden | true | build-dock hidden | none |

| build | dock status text | status CSS class |
|---|---|---|
| hard-incompatible | 1 problem | build-dock-status problem |
| tight-PSU-only | 1 warning | build-dock-status warning |
| all-good | No issues detected | build-dock-status ok |
| empty | Start selecting parts | build-dock-status neutral |

| viewport width | viewport height | dock top | dock right | dock bottom | dock left | dock width | dock height | active tab padding-bottom |
|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 390 | 844 | 640.5 | 380 | 834 | 10 | 370 | 193.5 | 220px |

```text
node --check public/script.js
EXIT_CODE:0
```

```text
node test/smoke.js
CONSOLE ERRORS: 0
PAGE ERRORS: 0
EXIT_CODE:0
```

```text
node test/dock-e2e.js
PASS D1 visibility
PASS D2 metrics
PASS D3 severity
PASS D4 mobile anchored
EXIT_CODE:0
```

STATUS: COMPLETE
