| File | What |
| --- | --- |
| public/script.js | Added balance-meter state, compute, and render methods; added one `checkCompatibility()` refresh call. |
| public/index.html | Added builder-tab CPU/GPU balance meter section. |
| public/styles-v5.css | Added compact balance-meter styles and mobile wrapping. |
| test/bottleneck-e2e.js | Added live-parts Puppeteer checks B1-B5. |

| PHASE-0 item | Result |
| --- | --- |
| `getGpuPerformance(gpu)` range from live app | 249 GPUs, 241 scored, `0.18963292850632912..1`; min `698942d847ac738ed70aa5a2` Sparkle Intel Arc A380 ELF 6GB GDDR6 Graphics Card; max `698b9ea66e991ceaf2ec543b` ASUS TUF Gaming GeForce RTX 5090 OC Edition 32GB GDDR7 Gaming Graphics Card (Nvidia GeForce RTX5090, 3.6 Slot Design, PCIe 5.0, 2X HDMI 2.1b, 3X DisplayPort 2.1a, TUF-RTX5090-O32G-GAMING). |
| `getCpuPerformance(cpu)` range from live app | 28 CPUs, 28 scored, `0.6552..1`; min `6a224663ce0fe23cdf4bd082` AMD Ryzen 5 5600 Desktop Processor; max `69296847a2b18a9ddc89eb6d` Intel Core Ultra 9 Desktop Processor 285 24 cores (8 P-cores + 16 E-cores) up to 5.6 GHz. |
| `getCpuMultiThreadPerformance(cpu)` range from live app | 28 CPUs, 28 scored, `0.266..1`; min `6a224663ce0fe23cdf4bd082` AMD Ryzen 5 5600 Desktop Processor; max `69296847a2b18a9ddc89eb7a` AMD Ryzen 9 9950X 16-Core, 32-Thread Unlocked Desktop Processor. |
| Single build-refresh call site hooked | `checkCompatibility()` at `public/script.js` end-of-function path, immediately before existing `updateBuildSummaryWattage()` and `updateBuildDock()` calls. |
| Hook scope confirmation | No edits to `updateBuildDock()`, `classifyCompatibilityIssues()`, review/freshness functions, starter-build functions, or wizard question/submit flow. |

| Ratio threshold | State |
| --- | --- |
| `gpuScore / cpuScore >= 1.25` | `cpu-limited` / `CPU bottleneck` |
| `0.80 < gpuScore / cpuScore < 1.25` | `balanced` / `Balanced` |
| `gpuScore / cpuScore <= 0.80` | `gpu-bound` / `GPU is the limit` |

| Sample | CPU id + name | GPU id + name | State | Position | cpuScore | gpuScore |
| --- | --- | --- | --- | ---: | ---: | ---: |
| weak CPU + strong GPU | `6a224663ce0fe23cdf4bd082` AMD Ryzen 5 5600 Desktop Processor | `698b9ea66e991ceaf2ec543b` ASUS TUF Gaming GeForce RTX 5090 OC Edition 32GB GDDR7 Gaming Graphics Card (Nvidia GeForce RTX5090, 3.6 Slot Design, PCIe 5.0, 2X HDMI 2.1b, 3X DisplayPort 2.1a, TUF-RTX5090-O32G-GAMING) | `cpu-limited` | 71 | 0.6552 | 1 |
| strong CPU + weak GPU | `69296847a2b18a9ddc89eb6d` Intel Core Ultra 9 Desktop Processor 285 24 cores (8 P-cores + 16 E-cores) up to 5.6 GHz | `698942d847ac738ed70aa5a2` Sparkle Intel Arc A380 ELF 6GB GDDR6 Graphics Card | `gpu-bound` | 0 | 1 | 0.18963292850632912 |
| matched live pair | `6a224663ce0fe23cdf4bd086` AMD Ryzen 9 7900X Desktop Processor | `698b9fd16e991ceaf2ec544b` GIGABYTE GeForce RTX 5070 Ti Gaming OC 16G Graphics Card, 16GB 256-bit GDDR7, PCIe 5.0, WINDFORCE Cooling System, GV-N507TGAMING OC-16GD Video Card | `balanced` | 50 | 0.858 | 0.8572151898734178 |

`node --check public/script.js`

```text
EXIT_CODE: 0
```

`node test/smoke.js`

```text
CONSOLE ERRORS: 0
PAGE ERRORS: 0
EXIT_CODE: 0
```

`node test/bottleneck-e2e.js`

```text
PASS B1 meter renders
PASS B2 differentiates direction
PASS B3 neutral when incomplete
PASS B4 plain-language explanation
PASS B5 scores equal performance helpers
EXIT_CODE: 0
```

STATUS: COMPLETE
