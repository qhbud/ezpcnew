# RAM Data Extraction Documentation

## Overview

The RAM importer scripts now properly extract and store all critical RAM specifications from product titles, including DDR type, speed, stick count, and capacity per stick.

## Extracted Fields

### Core Fields (Stored as Numbers)

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `memoryType` | String | DDR generation (DDR3/DDR4/DDR5) | `"DDR4"` |
| `speed` | **Number** | Speed in MHz | `3200` |
| `kitSize` | **Number** | Number of RAM sticks in kit | `2` |
| `capacity` | **Number** | Capacity per stick in GB | `8` |
| `totalCapacity` | **Number** | Total capacity in GB | `16` |
| `casLatency` | **Number** | CAS Latency value | `16` |

### Display Fields (Stored as Strings)

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `kitConfiguration` | String | Human-readable kit config | `"2x8GB"` |
| `latency` | String | Timing string | `"CL16"` or `"16-18-18-36"` |
| `manufacturer` | String | RAM manufacturer | `"Corsair"` |
| `performanceTier` | String | Performance category | `"Performance"` |

## Example Extraction

### Input Title
```
CORSAIR VENGEANCE RGB PRO DDR4 RAM 16GB (2x8GB) 3200MHz CL16-18-18-36 1.35V
```

### Extracted Data (Database Format)
```json
{
  "memoryType": "DDR4",
  "speed": 3200,
  "kitSize": 2,
  "capacity": 8,
  "totalCapacity": 16,
  "kitConfiguration": "2x8GB",
  "casLatency": 16,
  "latency": "16-18-18-36",
  "manufacturer": "Corsair",
  "performanceTier": "Performance"
}
```

## Extraction Methods

### 1. Memory Type Extraction
**Method**: `extractMemoryType(title)`
**Returns**: String (e.g., "DDR4", "DDR5")

**Patterns Matched**:
- `DDR4`, `DDR 4`, `ddr4`
- `DDR5`, `DDR 5`, `ddr5`
- Also supports DDR3 and DDR6

**Example**:
```javascript
extractMemoryType("Corsair DDR4 RAM 16GB") // Returns: "DDR4"
```

### 2. Speed Extraction (MHz)
**Method**: `extractSpeed(title)`
**Returns**: Number (e.g., 3200, 5600)

**Patterns Matched**:
- `DDR4-3200`, `DDR5-5600`
- `3200MHz`, `5600 MHz`
- `3200MT/s`, `5600 MT/s`
- `PC4-3200`, `PC5-5600`

**Validation**: Speed must be between 800-10000 MHz

**Example**:
```javascript
extractSpeed("DDR4 3200MHz RAM") // Returns: 3200 (number)
```

### 3. Kit Size Extraction (Stick Count)
**Method**: `extractKitSize(title)`
**Returns**: Number (e.g., 1, 2, 4)

**Patterns Matched**:
- `2x8GB`, `2 x 8GB`
- `4x16GB`, `4 x 16GB`
- `Kit of 2`

**Validation**: Stick count must be between 1-8
**Default**: 1 (if no kit info found)

**Example**:
```javascript
extractKitSize("RAM 16GB (2x8GB) 3200MHz") // Returns: 2 (number)
```

### 4. Capacity Per Stick Extraction
**Method**: `extractCapacityPerStick(title)`
**Returns**: Number in GB (e.g., 8, 16, 32)

**Patterns Matched**:
- `2x8GB` → 8 GB per stick
- `4x16GB` → 16 GB per stick
- `32GB` (single stick) → 32 GB

**Example**:
```javascript
extractCapacityPerStick("32GB (2x16GB) DDR5") // Returns: 16 (number)
```

### 5. Total Capacity Extraction
**Method**: `extractCapacity(title)`
**Returns**: Number in GB (e.g., 16, 32, 64)

**Logic**:
1. If kit format found (e.g., 2x8GB): Calculate total (2 × 8 = 16 GB)
2. Otherwise: Extract total GB value
3. Fallback: Calculate from `kitSize × capacity`

**Example**:
```javascript
extractCapacity("RAM 16GB (2x8GB)") // Returns: 16 (number)
```

### 6. CAS Latency Extraction
**Method**: `extractCASLatency(title)`
**Returns**: Number (e.g., 16, 18, 36)

**Patterns Matched**:
- `CL16`, `CL 16`
- `C16`
- `CAS 16`
- `16-18-18-36` (extracts first number)

**Validation**: CAS latency must be between 5-50

**Example**:
```javascript
extractCASLatency("DDR4 3200MHz CL16") // Returns: 16 (number)
```

## Test Results

All extraction methods have been tested with real-world RAM titles:

✅ **Test 1**: Corsair Vengeance RGB Pro DDR4 (2x8GB) 3200MHz - **PASSED**
- DDR Type: DDR4 ✓
- Speed: 3200 MHz ✓
- Stick Count: 2 ✓
- Capacity Per Stick: 8 GB ✓
- Total Capacity: 16 GB ✓

✅ **Test 2**: G.Skill Trident Z5 DDR5 (2x16GB) 6000MHz - **PASSED**
✅ **Test 3**: Kingston Fury Beast DDR5 (2x32GB) 5600MHz - **PASSED**
✅ **Test 4**: Corsair Dominator DDR5 (2x8GB) 6400MHz - **PASSED**
✅ **Test 5**: Crucial DDR4 (2x16GB) 3200MHz - **PASSED**
✅ **Test 6**: TeamGroup DDR4 (4x16GB) 3600MHz - **PASSED**
✅ **Test 7**: PNY XLR8 DDR4 8GB 3200MHz - **PASSED**
✅ **Test 8**: G.Skill Ripjaws V (4x32GB) DDR4 3200MHz - **PASSED**
✅ **Test 9**: Crucial 16GB Single DDR4 2666MHz - **PASSED**

**Success Rate**: 100% (9/9 tests passed)

## Database Schema Compliance

All extracted data complies with the RAM schema defined in `models/RAM.js`:

```javascript
{
  memoryType: String,      // ✓ "DDR4", "DDR5"
  speed: Number,           // ✓ 3200, 5600
  kitSize: Number,         // ✓ 1, 2, 4
  capacity: Number,        // ✓ 8, 16, 32 (GB per stick)
  totalCapacity: Number,   // ✓ 16, 32, 64 (total GB)
  casLatency: Number,      // ✓ 16, 18, 36
  timing: String,          // ✓ "16-18-18-36"
  manufacturer: String,    // ✓ "Corsair", "G.Skill"
  // ... other fields
}
```

## Running Tests

To verify extraction is working correctly:

```bash
node scripts/testRamExtraction.js
```

This will test extraction with 9 different real-world RAM titles and show:
- Extracted values for each field
- Data types (string vs number)
- Validation status
- Database object format

## Usage in Import Scripts

The extraction is automatically used by:

1. **Bulk RAM Importer** (`bulkRamImporter.js`)
2. **Parallel RAM Importer** (`parallelRamImporter.js`)
3. **RAM Data Populator** (`ramDataPopulator.js`)

When importing RAM from Amazon, the scripts will:
1. Extract product title from Amazon
2. Run all extraction methods on the title
3. Store numeric values as numbers (not strings)
4. Save to MongoDB `rams` collection

## Benefits

### ✅ Proper Data Types
- Speed stored as `3200` (number), not `"3200MHz"` (string)
- Kit size stored as `2` (number), not `"2"` (string)
- Enables proper numeric filtering and sorting in database

### ✅ Accurate Extraction
- Handles various title formats
- Validates extracted values
- Provides fallbacks for missing data

### ✅ Comprehensive Coverage
- DDR type (DDR3/DDR4/DDR5)
- Speed in MHz
- Kit configuration (2x8GB, 4x16GB, etc.)
- Capacity per stick and total capacity
- CAS latency and timing strings
- Manufacturer detection

### ✅ Query Capabilities
```javascript
// Find all DDR5 RAM
{ memoryType: "DDR5" }

// Find RAM with speed >= 5600 MHz
{ speed: { $gte: 5600 } }

// Find 2-stick kits
{ kitSize: 2 }

// Find RAM with 16GB per stick
{ capacity: 16 }

// Find RAM with total capacity >= 32GB
{ totalCapacity: { $gte: 32 } }
```

## Troubleshooting

### Issue: Speed extracted as string instead of number
**Solution**: Already fixed. `extractSpeed()` now returns a number.

### Issue: Kit size always returns 1
**Possible Cause**: Title doesn't contain kit format like "2x8GB"
**Solution**: Extractor defaults to 1 for single sticks, which is correct.

### Issue: Capacity not detected
**Possible Cause**: Unusual title format
**Solution**: Add additional regex patterns to `extractCapacity()` method.

---

**Last Updated**: 2025-11-02
**Test Status**: ✅ All tests passing
**Version**: 1.0
