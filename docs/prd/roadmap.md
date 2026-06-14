# EZPC Roadmap PRD — usability audit + competitor research (2026-06-13)

Synthesized by the architect from: a first-person Puppeteer usability audit of the
live site (`.architect/audit/`), and three background competitor/user-needs
researchers (`.architect/research/02`, `03`; `01` PCPartPicker deep-dive pending).
Findings without a source URL are my own audit observations (reproducible from the
audit screenshots) or direct repo inspection.

## A. Current state — what EZPC already does well

- Rich per-component tabs with a **Price-vs-Performance scatter**, **FPS estimates**,
  reviews, and buyer guides (audit: `05-tab-gpu.png`, `01-builder-default.png`).
- **Price history** graphs (component details panel; now also under FPS estimates on
  the GPU tab — shipped 2026-06-13, commit 13832b6).
- **4-question build wizard** (budget / performance / storage / monitor) →
  recommended build (audit: `02-wizard-step1-budget.png`).
- Build summary with **Copy Link** (share), **Save Build**, **Add to Amazon Cart**,
  and a **Compatibility Check** panel.

## B. Usability holes found (first-person audit)

1. **Broken legacy filters throw on load.** Console errors every page load:
   `Filter element gpuManufacturerFilter not found`, `cpuManufacturerFilter not
   found`, `Filter element undefined not found`. Code references filter DOM nodes
   that no longer exist. (Bug — reproducible, audit `findings.json`.)
2. **Compatibility is reactive, not proactive.** The panel says "Select components
   to check" — it validates after the fact instead of filtering/flagging
   incompatible parts *as you build*. Competitors auto-filter: Micro Center
   "automatically tries to filter out parts" that are incompatible
   (https://www.microcenter.com/site/content/custom-pc-builder.aspx); Pangoly and
   BuildMyPC do real-time validation. (Gap — top competitor differentiator.)
3. **Mobile build flow buries the build.** The "Your PC Build" summary/total sits at
   the very bottom on mobile; after picking parts you must scroll far to see the
   total or check out. No sticky dock. (Gap — audit `06-mobile-builder.png`.)
4. **Tab-based selection loses build context.** "Choose a GPU" routes to the full GPU
   tab; there's no persistent "this is for your build → pick and return" affordance.
   (Flow gap — audit `04-gpu-picker-modal.png`.)
5. **Wizard budget floor is $1000.** The slider won't go below $1000, excluding
   budget builders. (Constraint — audit `02-wizard-step1-budget.png`.)
6. **favicon 404** on every load. (Polish.)

## C. User needs from community research (cited)

- **Deeper physical-fit validation is the #1 unmet need**: GPU length vs case *after*
  subtracting front-radiator+fan thickness, CPU-cooler height clearance, RAM clearance
  under coolers, AIO radiator thickness. "Ram clearance/case size + GPU compatibility
  isn't always accurate" and PCPartPicker "doesn't check AIO radiator thickness"
  (https://www.reddit.com/r/buildapc/comments/1jy6g2w/).
- **BIOS-support traps**: newer CPUs on older-BIOS boards (B650/X670 + Ryzen 9000)
  fail to POST; users want explicit warnings
  (https://www.reddit.com/r/buildapc/comments/1jzpf69/).
- **PSU connector traps** beyond wattage: 12VHPWR/12V-2x6, daisy-chained PCIe cables
  (https://www.reddit.com/r/buildapc/comments/1hcbjuu/).
- **Price freshness must be visible** to be trusted: users distrust lagging prices in
  volatile RAM/SSD markets; want last-updated timestamps and volatility warnings
  (https://www.reddit.com/r/buildapc/comments/1p7rwzd/).
- **Automated builds must be explainable**: why each part, tradeoffs, plain-language
  compatibility notes; users distrust black-box AI picks
  (https://www.reddit.com/r/buildapc/comments/1aj6gpm/). Note MSI's AI built a $1,700
  rig for a $1,000 prompt (https://www.tomshardware.com/desktops/pc-building/...).

## D. Competitor feature opportunities (cited; see research/02)

- Budget-tier **preset builds** (Newegg Entry/Mainstream/Enthusiast; Pangoly Basic
  $508 → Extreme $5,368; Logical Increments tiers).
- **Bottleneck / balance indicator** (Pangoly performance panel; BuildMyPC).
- **Multi-retailer pricing** (BuildCores: Amazon + Newegg + Best Buy real-time).
- **Price-drop alerts** (Pangoly email alerts below a target; PCPartPicker price alerts).
- **Public build showcase / completed builds** (Pangoly, BuildCores, Micro Center).
- **3D build preview** (BuildCores, 3000+ models) — ambitious.
- **AI build assistant** (MSI, Newegg "Build with AI", Pangoly) — trust risk per above.
- Better **mobile + Reddit/markdown export** of builds.

## E. Prioritized roadmap (impact × effort, given EZPC's existing data)

**Slice 0 — Foundation (small, unblocks the loop).** Establish a verification gate
(`npm test` = syntax check + Puppeteer smoke test that loads each tab with zero
console errors) and fix the broken filter null-guards (hole B1). The loop needs a
gate; the filters error today.

**Slice 1 — Proactive compatibility engine (flagship).** Convert the passive panel
into real-time, plain-language compatibility: CPU↔motherboard socket, RAM type/board,
PSU wattage headroom (20–30%), GPU length vs case, cooler height vs case. Flag as you
build; show *why*. Hits competitor gap B2 + user need C1/C2/C3. Uses existing specs.
Design note: mirror PCPartPicker's **two-tier severity** — hard "Problem" (blocks)
vs soft "Warning/Note" (proceed with caution) — and explicitly beat its admitted gap:
"Some physical constraints are not checked, such as RAM clearance with CPU Coolers"
(https://pcpartpicker.com/list/). PCPartPicker's concrete check set to match/exceed:
CPU/mobo socket, BIOS-version requirement, ECC unsupported, missing PCIe/EPS
connectors, case↔GPU length, cooler↔case, USB-header adapters, M.2-disables-SATA.

**Slice 2 — Sticky build dock (tabs + mobile).** Persistent build/total/actions bar
on component tabs and mobile so the build is always visible while selecting. Fixes
holes B3 + B4. (Partly prototyped already in the uncommitted tree.)

**Slice 3 — Explainable build review + price freshness.** Finish the half-built
"Build review" panel (why each wizard pick, tradeoffs, warnings) and add visible
"price updated X ago" + volatility badges from existing priceHistory dates. Hits
user needs C4/C5.

**Tier 3 (bigger bets, later):** budget-tier preset builds; bottleneck/balance meter;
price-drop alerts (needs accounts/email); multi-retailer pricing (needs scraping);
public build showcase; AI assistant.

## F. Open questions for the human

- Which slice to build first? (Recommend Slice 0 → 1.)
- Appetite for Tier-3 bets that need new infra (email/accounts, more scrapers)?
- Keep Amazon-only checkout, or pursue multi-retailer?
