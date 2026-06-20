# Lane slice-10-00 — wizard recommendation-engine rework

## PHASE 0

### Plan

| Step | Files |
| --- | --- |
| Freeze request/response contract and adaptive thresholds | `docs/gates/slice-10.md` |
| Verify helpers, handler, client flow, and live API fields | `server.js`, `public/index.html`, `public/script.js`, `/api/parts/*` |
| Replace procedural handler with named compatibility pipeline | `server.js` |
| Add adaptive resolution/monitor wizard flow and failure rendering | `public/index.html` |
| Add live W1-W8 and G5 integration coverage | `test/wizard-rec-e2e.js` |
| Run G1/G2/G3/G5 and record raw output | `docs/lanes/slice-10-00.md` |

### Disagreements

| Item | Repository/live result | Build result |
| --- | --- | --- |
| Material disagreements | None | Spec built as written |
| Unlimited request casing | Frozen contract: `'unlimited'`; old client/server: `'Unlimited'` at old `server.js:1509` and `public/index.html:2453` | Both spellings accepted; response wizard data uses `Unlimited` |
| Desktop RAM form factor | Live cheapest DDR4 row was SO-DIMM; public RAM route excludes laptop/server RAM at `server.js:903-906` | SO-DIMM/laptop/notebook/server/LRDIMM/registered DIMM excluded |
| Motherboard RAM maximum | Live top-level `maxMemory`: 3/127; additional rows expose `specifications.maxMemory` | Every real maximum field is enforced; absent maximum is skipped |
| GPU/case length | Live GPU `length`: 44/44; live case `maxGpuLength`/`gpuLength`/`length`: 0/93 | GPU-length rule skips when the case has no real limit |
| CPU TDP | `getCPUTDP` exists at `server.js:442`; live CPU `tdp`: 17/28; `wattage`: 16/28 | Existing helper reused |
| $700 feasibility | Live minimum compatible 1 TB tower probe: `$540.76` before desktop-RAM filtering | $700 scenario included in G3 |
| Monitor identity | Live addon route returns `category=addons`; monitor identity is present in `type`/name | Monitor matched from real `type`/name resolution strings |

### Live server

```text
gpus=44
cpus=28
motherboards=127
rams=687
storages=108
psus=136
cases=93
coolers=48
addons=6
gpu.tdp=44 gpu.length=44
case.formFactor=93 case.maxGpuLength=0 case.gpuLength=0 case.length=0
monitor=KTC 24.5 inch Gaming Monitor 400Hz 1080p|type=Gaming Monitor|category=addons|price=229.99
monitor=Acer Nitro 27 Inch 180Hz 1440p Gaming Monitor|type=Gaming Monitor|category=addons|price=159.99
monitor=KTC 24.5" Gaming Monitor FHD 1080P 180Hz|type=Gaming Monitor|category=addons|price=109.99
monitor=MSI QD-OLED Computer Monitor 32-inch 4K 240Hz|type=Gaming Monitor|category=addons|price=879.99
```

### Pre-change live endpoint probes

```text
=== 700-current ===
STATUS=400

=== 1200-4k-current ===
STATUS=200
{"success":true,"error":null,"reason":null,"totalCost":"1144.77","budget":1200,"wizardData":{"budget":1200,"performance":"single","storage":1000,"includeMonitor":true},"keys":["ram","gpu","cpu","motherboard","storage","psu","case","cooler"]}
```

### Initial worktree

```text
?? .claude/
?? _full_meta.txt
?? scripts/.update_progress.json
?? scripts/_auditMobo.js
?? scripts/_checkPendingBatch.js
```

## G1

```text
COMMAND: node --check server.js
EXIT_CODE=0
COMMAND: node --check public/script.js
EXIT_CODE=0
COMMAND: node --check test/wizard-rec-e2e.js
EXIT_CODE=0
```

## G2

### PowerShell invocation

```text
COMMAND: npm test
npm : File C:\Program Files\nodejs\npm.ps1 cannot be loaded because running scripts is disabled on this system. For
more information, see about_Execution_Policies at https:/go.microsoft.com/fwlink/?LinkID=135170.
At line:2 char:1
+ npm test
+ ~~~
    + CategoryInfo          : SecurityError: (:) [], PSSecurityException
    + FullyQualifiedErrorId : UnauthorizedAccess
EXIT_CODE=1
```

### Executable invocation

```text
COMMAND: cmd.exe /d /s /c "npm test"

> pcbuilder2@1.0.0 test
> node test/smoke.js

CONSOLE ERRORS: 0
PAGE ERRORS: 0
EXIT_CODE=0
```

## G3

Command:

```text
node test/wizard-rec-e2e.js
```

Output:

```text
PASS W1 700-single-1080p
PASS W2 700-single-1080p
PASS W3 700-single-1080p
PASS W6 700-single-1080p
PASS W1 800-multi-1080p
PASS W2 800-multi-1080p
PASS W3 800-multi-1080p
PASS W6 800-multi-1080p
PASS W1 1200-single-1440p
PASS W2 1200-single-1440p
PASS W3 1200-single-1440p
PASS W6 1200-single-1440p
PASS W1 1200-multi-1440p
PASS W2 1200-multi-1440p
PASS W3 1200-multi-1440p
PASS W6 1200-multi-1440p
PASS W1 2000-single-1080p
PASS W2 2000-single-1080p
PASS W3 2000-single-1080p
PASS W6 2000-single-1080p
PASS W1 2000-single-1440p
PASS W2 2000-single-1440p
PASS W3 2000-single-1440p
PASS W6 2000-single-1440p
PASS W1 2000-single-4k
PASS W2 2000-single-4k
PASS W3 2000-single-4k
PASS W6 2000-single-4k
PASS W1 3500-single-4k
PASS W2 3500-single-4k
PASS W3 3500-single-4k
PASS W6 3500-single-4k
PASS W1 3500-multi-4k
PASS W2 3500-multi-4k
PASS W3 3500-multi-4k
PASS W6 3500-multi-4k
PASS W1 unlimited-single-4k
PASS W2 unlimited-single-4k
PASS W3 unlimited-single-4k
PASS W6 unlimited-single-4k
PASS W1 900-single-1080p-monitor
PASS W2 900-single-1080p-monitor
PASS W3 900-single-1080p-monitor
PASS W6 900-single-1080p-monitor
PASS W1 600-single-4k-monitor
PASS W2 600-single-4k-monitor
PASS W3 600-single-4k-monitor
PASS W6 600-single-4k-monitor
PASS W1 1200-single-4k-monitor
PASS W2 1200-single-4k-monitor
PASS W3 1200-single-4k-monitor
PASS W6 1200-single-4k-monitor
PASS W4 resolution GPU performance is non-decreasing
PASS W5 fail-fast shape and no partial success
PASS W7 sub-$1000 complete compatible build
PASS W8a below $800 omits monitor and clamps to 1080p
PASS W8b sub-$2000 clamps 4k to 1440p
PASS G5 low budget skips resolution and monitor
PASS G5 mid budget offers 1080p and 1440p only
PASS G5 high budget offers 4k
PASS G5 failure response renders visible error
PASS G5 wizard page errors
SCENARIO TABLE
scenario | totalCost | budget | gpu | gpuPerf
700-single-1080p | 698.70 | 700 | ASUS Dual NVIDIA GeForce RTX 3070 V2 OC Edition Gaming Graphics Card (PCIe 4.0, 8GB GDDR6 Memory, LHR, HDMI 2.1, DisplayPort 1.4a, Axial-tech Fan Design, Dual BIOS, Protective Backplate) (Renewed) | 0.3038
800-multi-1080p | 728.82 | 800 | ASRock Intel Arc A380 Challenger ITX 6GB OC Graphics Card | Single Slot ITX | 2250 MHz | 6GB GDDR6 | DisplayPort 2.0 | HDMI 2.0b | 0dB Cooling | 8K Support | 500W | DirectX 12 Ultimate | PCle 4.0 | 0.1266
1200-single-1440p | 1198.77 | 1200 | Sapphire 11305-02-20G Pulse AMD Radeon RX 6800 PCIe 4.0 Gaming Graphics Card with 16GB GDDR6 Pack of 1 (Renewed) | 0.4025
1200-multi-1440p | 1175.75 | 1200 | ZOTAC Gaming GeForce RTX™ 3070 Ti Trinity OC 8GB GDDR6X 256-bit 19 Gbps PCIE 4.0 Gaming Graphics Card, IceStorm 2.0 Advanced Cooling, Spectra 2.0 RGB Lighting, ZT-A30710J-10P (Renewed) | 0.3443
2000-single-1080p | 1977.15 | 2000 | MSI Gaming RTX 4070 Super 12G Ventus 3X OC Graphics Card (NVIDIA RTX 4070 Super, 192-Bit, Extreme Clock: 2520 MHz, 12GB GDRR6X 21 Gbps, HDMI/DP, Ada Lovelace Architecture) | 0.4810
2000-single-1440p | 1998.95 | 2000 | PowerColor AMD Radeon RX 7900 XT Graphics Card (Renewed) | 0.6582
2000-single-4k | 1621.48 | 2000 | PowerColor AMD Radeon RX 7900 XT Graphics Card (Renewed) | 0.6582
3500-single-4k | 3380.94 | 3500 | GIGABYTE GeForce RTX 5080 Gaming OC 16G Graphics Card, WINDFORCE Cooling System, 16GB 256-bit GDDR7, GV-N5080GAMING OC-16GD Video Card | 0.7291
3500-multi-4k | 3475.99 | 3500 | PNY GeForce RTX™ 5080 Triple Fan | 0.7291
unlimited-single-4k | 9138.12 | unlimited | ZOTAC Gaming GeForce RTX 5090 Solid OC 32GB GDDR7, Engine Clock 2422 MHz, Reinforced Metal Mid-Frame, IceStorm 3.0 Advanced Cooling, Bundle with Targus dockstation and Backpack Alienware. | 1.0000
900-single-1080p-monitor | 860.79 | 900 | ASRock Intel Arc B570 Challenger 10GB OC GDDR6 Graphics Card, 2600 MHz GPU, 19 Gbps Memory, Dual Fan, Metal Backplate, HDMI 2.1a, DisplayPort 2.1, 0dB Cooling | 0.1797
600-single-4k-monitor | 577.22 | 600 | ASRock Intel Arc A380 Challenger ITX 6GB OC Graphics Card | Single Slot ITX | 2250 MHz | 6GB GDDR6 | DisplayPort 2.0 | HDMI 2.0b | 0dB Cooling | 8K Support | 500W | DirectX 12 Ultimate | PCle 4.0 | 0.1266
1200-single-4k-monitor | 1194.78 | 1200 | PowerColor AMD Radeon RX 6800 Gaming Graphics Card with 16GB GDDR6 Memory, PCIe 4.0, HDMI 2.1, AMD Infinity Cache | 0.4025
499-unsatisfiable | - | 499 | FAIL:invalid_budget | -
EXIT_CODE=0
```

### Scenario matrix

| Scenario | totalCost | Budget | GPU | Perf |
| --- | ---: | ---: | --- | ---: |
| 700/single/1080p | 698.70 | 700 | RTX 3070 | 0.3038 |
| 800/multi/1080p | 728.82 | 800 | Arc A380 | 0.1266 |
| 1200/single/1440p | 1198.77 | 1200 | RX 6800 | 0.4025 |
| 1200/multi/1440p | 1175.75 | 1200 | RTX 3070 Ti | 0.3443 |
| 2000/single/1080p | 1977.15 | 2000 | RTX 4070 Super | 0.4810 |
| 2000/single/1440p | 1998.95 | 2000 | RX 7900 XT | 0.6582 |
| 2000/single/4k | 1621.48 | 2000 | RX 7900 XT | 0.6582 |
| 3500/single/4k | 3380.94 | 3500 | RTX 5080 | 0.7291 |
| 3500/multi/4k | 3475.99 | 3500 | RTX 5080 | 0.7291 |
| unlimited/single/4k | 9138.12 | unlimited | RTX 5090 | 1.0000 |
| 900/single/1080p+monitor | 860.79 | 900 | Arc B570 | 0.1797 |
| 600/single/4k+monitor | 577.22 | 600 | Arc A380 | 0.1266 |
| 1200/single/4k+monitor | 1194.78 | 1200 | RX 6800 | 0.4025 |
| 499 unsatisfiable | - | 499 | `invalid_budget` | - |

## G5

### Resolution/adaptive-question lines

```text
2082:<!-- Question 4: Resolution -->
2087:<button class="performance-option-btn" id="resolution1080pBtn" onclick="selectResolution('1080p')">
2092:<button class="performance-option-btn" id="resolution1440pBtn" onclick="selectResolution('1440p')">
2097:<button class="performance-option-btn" id="resolution4kBtn" onclick="selectResolution('4k')">
2105:<!-- Question 5: Monitor -->
2459:const WIZARD_MONITOR_MIN = 800;
2469:if (budget >= 2000) return ['1080p', '1440p', '4k'];
2470:if (budget >= 1000) return ['1080p', '1440p'];
2471:return ['1080p'];
2489:wizardData.resolution = resolutionOptions[0];
2507:if (getResolutionOptionsForBudget(budget).length > 1) sequence.push(4);
2508:if (budget >= WIZARD_MONITOR_MIN) sequence.push(5);
2219:body: JSON.stringify(data),
2253:const savedWizardData = { ...wizardData };
```

### Budget floor before/after

```text
BEFORE
2000:id="budgetInput"
2003:min="1000"
2012:<span class="slider-label-min">$1000</span>
2017:id="budgetSlider"
2019:min="500"
2455:if (!isUnlimited && (!budget || budget < 1000)) {
2456:showValidationError('question1', 'Please enter a valid budget amount (minimum $1000)');

AFTER
2000:id="budgetInput"
2003:min="500"
2012:<span class="slider-label-min">$500</span>
2017:id="budgetSlider"
2019:min="500"
2553:if (!isUnlimited && (!budget || Number(budget) < 500)) {
2554:showValidationError('question1', 'Please enter a valid budget amount (minimum $500)');
```

### Browser assertions

```text
PASS G5 low budget skips resolution and monitor
PASS G5 mid budget offers 1080p and 1440p only
PASS G5 high budget offers 4k
PASS G5 failure response renders visible error
PASS G5 wizard page errors
```

### Smoke

```text
CONSOLE ERRORS: 0
PAGE ERRORS: 0
EXIT_CODE=0
```

### In-app Browser backend

```text
Browser is not available: iab
```

## Diff

### Tracked `git diff --stat`

```text
 docs/lanes/slice-10-00.md |  332 +++++-
 public/index.html         |  225 +++-
 server.js                 | 2678 ++++++++++++---------------------------------
 3 files changed, 1200 insertions(+), 2035 deletions(-)
```

### Tracked `git diff --numstat`

```text
329	3	docs/lanes/slice-10-00.md
172	53	public/index.html
699	1979	server.js
```

```text
server.js net line delta: 699 - 1979 = -1280
```

### New test file stat

```text
 NUL => test/wizard-rec-e2e.js | 477 ++++++++++++++++++++++++++++++++++++++++++
 1 file changed, 477 insertions(+)
git diff --no-index exit code: 1
```

### Scope checks

```text
git diff --check
EXIT_CODE=0

git diff -- docs/gates
OUTPUT_LENGTH=0
EXIT_CODE=0
```

STATUS: COMPLETE_WITH_CONCERNS (in-app Browser backend unavailable: Browser is not available: iab; PowerShell npm.ps1 shim blocked, cmd.exe /c "npm test" passed)
