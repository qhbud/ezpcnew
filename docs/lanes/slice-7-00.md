| File | What changed |
| --- | --- |
| public/index.html | Removed Guides nav/content and guides-only inline handlers; replaced Starter/Featured rows with one collapsed Quick-start builds element; added builder-tab wizard launcher. |
| public/script.js | Added consolidated quick-start build flow using existing live-data assembly, `applyBuildData`, and `classifyCompatibilityIssues`; merged dock with tab strip; removed Guides tab logic; fixed component change scroll anchor; expanded selected card details. |
| public/styles-v5.css | Added compact quick-start, unified nav/dock, selected-card aspect/detail, summary width, and responsive tab-strip styles; removed Guides-page CSS. |
| test/refine-e2e.js | Added R1-R7 refinement gate coverage. |
| test/presets-e2e.js | Updated preset checks for consolidated Quick-start DOM while preserving live-part, clean-build, load, and differentiation assertions. |
| test/showcase-e2e.js | Updated showcase checks for consolidated Quick-start DOM while preserving gallery, clean-build, load, distinctness, and share URL assertions. |
| test/dock-e2e.js | Updated dock checks for merged tab-strip status and removed duplicate Builder button. |
| docs/lanes/slice-7-00.md | Added raw lane results. |

## PHASE-0 findings

Guides-only handlers removed:
- `[data-tab="guides"]` nav at `public/index.html:107`.
- `#guides-tab` content block beginning at `public/index.html:1852`.
- `#guidesQuizCard` at `public/index.html:1876`.
- `.ghub-card[data-goto-tab]` delegated handler at `public/index.html:3751`.
- `guideHubSections`, `allInlineGuides`, `showInlineGuide`, `showGuidesHub` helpers at `public/index.html:3759`.
- `[data-goto-guide]` delegated handler at `public/index.html:3782`.
- `[data-guides-back], #guidesHowToBack` delegated handler at `public/index.html:3791`.
- Direct `#guidesQuizCard` click listener at `public/index.html:3798`.
- Stale `guides` handling in `public/script.js` `switchTab()` / `renderParts()`.

Wizard launcher that survives on builder tab:
- `#budgetModal` was outside Guides and outside Builder in the live DOM.
- `openBudgetModal()` remains in `public/index.html`.
- Existing global `#newActionBtn` remains wired.
- Added visible builder-tab `#builderWizardLaunchBtn`, wired to `openBudgetModal()`.

Scroll-anchor root cause + fix:
- Builder slot buttons only called `switchTab()`, leaving scroll position dependent on prior viewport state.
- Selected scatter renderers used `scrollIntoView({ block: 'nearest' })`, which could settle the viewport around the middle.
- Added `openComponentTabFromBuilder()` / `scrollToComponentSelection()` and routed empty-slot buttons plus selected-card Change through it.
- Changed selected scatter detail scrolls to `block: 'start'`.

Dock merge into tab strip:
- Existing `ensureBuildDock()` inserted a separate dock after `.main-nav` and created redundant `#buildDockBuilderBtn`.
- Added `.main-nav-shell`, moved `.main-nav` and `#buildDock` into the same nav/status wrapper.
- Removed `#buildDockBuilderBtn`.
- Kept `#buildDockCount`, `#buildDockTotal`, `#buildDockWattage`, `#buildDockStatus`, and `#buildDockCopyBtn`.
- Dock severity remains driven by `classifyCompatibilityIssues()`.

## Curated quick-start presets

| Name | Total | CPU id | GPU id | Motherboard id | Problems | Warnings |
| --- | ---: | --- | --- | --- | ---: | ---: |
| Budget 1080p Gaming | $930.74 | 6a224663ce0fe23cdf4bd089 | 698ba55c6e991ceaf2ec5493 | 699df42ebc3997adb8d65e97 | 0 | 0 |
| 1440p High-Refresh Gaming | $1618.81 | 6a224663ce0fe23cdf4bd084 | 68bd159f2b16d7dcff9228c6 | 699df510bc3997adb8d65f46 | 0 | 0 |
| Streaming / Creator | $2118.92 | 69296847a2b18a9ddc89eb75 | 698937f12171ae1375695ad3 | 699df402bc3997adb8d65e80 | 0 | 0 |
| 4K Ultra Gaming | $2924.30 | 69296847a2b18a9ddc89eb6a | 698ba18a6e991ceaf2ec545f | 699df449bc3997adb8d65eab | 0 | 0 |

## Quick-start collapsed confirmation

```text
containerCount: 1
collapsed: "true"
gridHidden: true
```

## node --check public/script.js

```text
exit 0; no stdout
```

## node test/smoke.js

```text
CONSOLE ERRORS: 0
PAGE ERRORS: 0
```

## node test/refine-e2e.js

```text
PASS R1 guides removed
PASS R2 wizard launches
PASS R3 one collapsed quick-start with 4 clean loadable presets
PASS R4 dock merged and severity intact
PASS R5 change-component scroll anchor
PASS R6 selected card detail and 4:3 shape
PASS R7 balance meter survives
```

## node test/presets-e2e.js

```text
PASS P1 quick-start renders exactly 4
PASS P2 complete real-parts builds
PASS P3 zero hard problems
PASS P4 one-click load
PASS P5 presets differentiated
```

## node test/showcase-e2e.js

```text
PASS S1 gallery renders
PASS S2 complete real-parts builds
PASS S3 zero hard problems
PASS S4 themes pairwise distinct
PASS S5 one-click load
PASS S6 Copy-Link URL round-trips
```

## node test/dock-e2e.js

```text
PASS D1 merged nav visibility
PASS D2 metrics
PASS D3 severity
PASS D4 mobile nav anchored
```

## Card/button follow-up

## node --check public/script.js

```text
exit 0; no stdout
```

## node test/smoke.js

```text
CONSOLE ERRORS: 0
PAGE ERRORS: 0
```

## node test/refine-e2e.js

```text
PASS R1 guides removed
PASS R2 wizard launches
PASS R3 one collapsed quick-start with 4 clean loadable presets
PASS R4 dock merged and severity intact
PASS R5 change-component scroll anchor
PASS R6 selected card detail and 4:3 shape
PASS R7 balance meter survives
```

## node test/presets-e2e.js

```text
PASS P1 quick-start renders exactly 4
PASS P2 complete real-parts builds
PASS P3 zero hard problems
PASS P4 one-click load
PASS P5 presets differentiated
```

## node test/showcase-e2e.js

```text
PASS S1 gallery renders
PASS S2 complete real-parts builds
PASS S3 zero hard problems
PASS S4 themes pairwise distinct
PASS S5 one-click load
PASS S6 Copy-Link URL round-trips
```

## node test/dock-e2e.js

```text
PASS D1 merged nav visibility
PASS D2 metrics
PASS D3 severity
PASS D4 mobile nav anchored
```

STATUS: COMPLETE
