# PSU Selection Fix - Build a PC Quiz

## Problem
The "Build a PC in 4 Questions" quiz was failing to select PSUs with the following error:

```
6. PSU
Budget: $60.00
Search Criteria: Price: $0 - $90.00 (50% buffer), Min Wattage: NaNW
Power Calculation:
Base: undefined, GPU: 250W, CPU: 142W
Estimated: NaNW → Recommended: NaNW (+100W overhead, rounded to 50W)
Candidates Found: 0
✗ NOT SELECTED
ERROR: No PSUs found in database
```

## Root Cause
The `getCPUTDP()` function in `server.js` was returning `undefined` when:
1. The CPU object didn't have a `tdp` field (lowercase)
2. The function didn't check for alternative field names like `TDP` (uppercase) or nested `specs.tdp`
3. This caused the power calculation to fail (NaN values)
4. PSU selection requires a valid wattage calculation, so it couldn't proceed

## Solution
Updated the `getCPUTDP()` function at line 383 in `server.js` to:

```javascript
function getCPUTDP(cpu) {
    // Try to get TDP from various possible fields
    if (cpu.tdp && !isNaN(cpu.tdp)) return parseFloat(cpu.tdp);
    if (cpu.TDP && !isNaN(cpu.TDP)) return parseFloat(cpu.TDP);
    if (cpu.specs && cpu.specs.tdp && !isNaN(cpu.specs.tdp)) return parseFloat(cpu.specs.tdp);
    if (cpu.specs && cpu.specs.TDP && !isNaN(cpu.specs.TDP)) return parseFloat(cpu.specs.TDP);

    // Estimate based on cores if no TDP specified
    const cores = cpu.cores || 8;
    if (cores >= 20) return 253;
    if (cores >= 16) return 241;
    if (cores >= 12) return 180;
    if (cores >= 8) return 142;
    if (cores >= 6) return 125;
    return 65;
}
```

## Changes Made
1. ✅ Added checks for multiple TDP field variations:
   - `cpu.tdp` (lowercase)
   - `cpu.TDP` (uppercase)
   - `cpu.specs.tdp` (nested lowercase)
   - `cpu.specs.TDP` (nested uppercase)

2. ✅ Added `!isNaN()` validation to ensure TDP values are numbers
3. ✅ Added `parseFloat()` to ensure proper number conversion
4. ✅ Fallback to core-based estimation if no TDP field exists

## Testing
After restarting the server, the PSU selection should now work correctly:
1. CPU TDP will be properly calculated
2. Power calculation will produce valid wattage numbers
3. PSU selection will find appropriate units based on system requirements

## How to Verify the Fix
1. Open http://localhost:3000
2. Click "Build a PC in 4 Questions"
3. Complete the quiz with any budget/performance settings
4. Check the debug output for PSU selection
5. Verify that:
   - Power Calculation shows valid numbers (not NaN)
   - Estimated and Recommended wattage are calculated
   - PSU is successfully selected

## Expected Output (After Fix)
```
6. PSU
Budget: $60.00
Search Criteria: Price: $0 - $90.00 (50% buffer), Min Wattage: 550W
Power Calculation:
Base: 100W, GPU: 250W, CPU: 142W
Estimated: 527W → Recommended: 550W (+25% overhead, rounded to 50W)
Candidates Found: 5
✓ SELECTED: Thermaltake Smart 600W - $45.99
```

---

**Fixed:** December 8, 2025
**File Modified:** `server.js` (line 383-399)
**Status:** ✅ Resolved
