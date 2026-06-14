# Gates — Slice 0: verification harness + filter-error fix

Frozen BEFORE dispatch. Read-only after freeze. The architect runs every gate
itself against a live DB-backed server; builder evidence is hearsay until re-run.

## G1 — JS parses
- Command: `node --check public/script.js`
- Threshold: exit code 0, no output.

## G2 — `npm test` smoke harness runs clean
- Setup: a DB-backed server is running at `BASE_URL` (default
  `http://localhost:3000`); the architect provides it (the sandbox cannot).
- Command: `npm test`
- Threshold: process exits 0. The harness drives a headless browser through the
  **builder**, **gpu**, and **cpu** tabs and asserts:
  - ZERO `pageerror` events, and
  - ZERO `console` messages of type `error` whose text is NOT a pure resource
    load failure (a line is exempt only if it starts with `Failed to load
    resource`).
  - It must print a final line: `CONSOLE ERRORS: <n>` and `PAGE ERRORS: <n>`,
    both `0` to pass.

## G3 — the specific filter errors are gone
- During G2, none of these strings may appear in captured console output:
  - `Filter element gpuManufacturerFilter not found`
  - `Filter element cpuManufacturerFilter not found`
  - `Filter element undefined not found`
- Static check: `grep -rn "Filter element" public/script.js` shows the
  `console.error(...)` path is gone (replaced by a silent skip, matching the
  existing pattern near line 1516 "Filter element doesn't exist in current UI,
  skip"). No caller may pass `undefined` as a filter id.

## Out of scope — touching these FAILS the slice
- `checkCompatibility()` / any compatibility logic (that is Slice 1).
- Build dock, wizard, CSS, or `public/index.html` beyond an (optional) favicon
  fix. No refactors. No new dependencies (puppeteer is already installed).
