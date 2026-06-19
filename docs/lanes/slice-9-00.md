# Lane slice-9-00 — compat-depth (PSU-connector + BIOS warnings) + budget floor

## PHASE 0

### Plan

| Step | Files |
| --- | --- |
| Add two warning-only classifier blocks | `public/script.js` |
| Lower `#budgetSlider` minimum | `public/index.html` |
| Add live classifier C1-C4 coverage | `test/compat-depth-e2e.js` |
| Run G1/G2/G3/G5 and record raw output | `docs/lanes/slice-9-00.md` |

### Disagreements

| Item | Repository result |
| --- | --- |
| `$500` functional wizard floor vs slider-only boundary | `public/index.html:2003` has `budgetInput min="1000"`; `public/index.html:2012` displays `$1000`; `public/index.html:2455-2456` rejects budgets below 1000; `server.js:1515-1516` returns HTTP 400 below 1000. |
| Existing classifier inventory | `public/script.js:5803-5833` already contains a GPU-length/case heuristic. |
| Approximate field coverage | Live API: `gpu.tdp` 196/196 (100.0%); `psu.wattage` 125/136 (91.9%); `psu.pcieConnectors/connectors` 0/136 (0.0%). |

### Checked

```text
classifyCompatibilityIssues: public/script.js:5687
budgetSlider min before: public/index.html:2019 min="1000"
budgetSlider step/default: step="100", value="1500"
Node: v24.16.0
npm: 11.13.0
Puppeteer: 21.11.0
Puppeteer launch: function
Puppeteer Page.evaluate: function
Puppeteer Page.waitForFunction: function
Live API counts: gpus=196, cpus=28, motherboards=127, psus=136
Live fields: gpu.tdp, cpu.socket, cpu.name/title, motherboard.chipset
Live qualifying samples: GPU tdp=320; CPU="AMD Ryzen 9 9950X3D 16-Core Processor", socket="AM5"; motherboard chipset="B650", socket="AM5"
Initial worktree:
?? .claude/
?? _full_meta.txt
?? scripts/.update_progress.json
?? scripts/_auditMobo.js
?? scripts/_checkPendingBatch.js
git diff -- docs/gates:
```

## G1

Command:

```text
node --check public/script.js
```

Output:

```text
```

Exit code: 0

Command:

```text
node --check test/compat-depth-e2e.js
```

Output:

```text
```

Exit code: 0

## G2

Command:

```text
npm.cmd test
```

Output:

```text
> pcbuilder2@1.0.0 test
> node test/smoke.js

CONSOLE ERRORS: 0
PAGE ERRORS: 0
```

Exit code: 0

## G3

Command:

```text
node test/compat-depth-e2e.js
```

Output:

```text
PASS C1 connector advisory fires as warning
PASS C2 connector advisory avoids false positives
PASS C3 AM5 BIOS trap fires as warning
PASS C4 AM5 BIOS trap avoids false positives
```

Exit code: 0

## G5

Exact `min=` line:

```text
BEFORE:
min="1000"
AFTER:
min="500"
```

Puppeteer floor probe:

```json
{
  "initial": {
    "min": "500",
    "max": "5100",
    "step": "100",
    "defaultValue": "1500",
    "value": "1500"
  },
  "floorDisplay": {
    "sliderValue": "500",
    "budgetInputValue": "500",
    "sliderDisplay": "$500.00"
  },
  "afterNext": {
    "question1Display": "block",
    "question2Display": "none",
    "validationText": "Please enter a valid budget amount (minimum $1000)"
  },
  "consoleErrors": 0,
  "pageErrors": 0
}
```

Exit code: 0

Live recommendation endpoint:

```text
HTTP 400
{"error":"Minimum budget is $1000"}
```

Exit code: 0

Smoke confirmation:

```text
CONSOLE ERRORS: 0
PAGE ERRORS: 0
```

Exit code: 0

In-app Browser backend:

```text
Browser is not available: iab
```

## Unified diff stat

```text
 docs/lanes/slice-9-00.md | 187 ++++++++++++++++++++++++++++++++++++++++-
 public/index.html        |   2 +-
 public/script.js         |  26 ++++++
 test/compat-depth-e2e.js | 210 +++++++++++++++++++++++++++++++++++++++++++++++
 4 files changed, 422 insertions(+), 3 deletions(-)

```

STATUS: COMPLETE_WITH_CONCERNS ($500 slider/display pass with 0/0 browser errors; existing out-of-bound client and server guards still reject $500)
