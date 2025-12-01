# RAM Import Guide

## Overview

This guide explains how to populate your PC Builder database with RAM modules from Amazon using the bulk and parallel import scripts.

## Scripts Created

### 1. Bulk RAM Importer (`bulkRamImporter.js`)
Sequential importer that processes RAM configurations one at a time. Good for stability and rate-limit compliance.

### 2. Parallel RAM Importer (`parallelRamImporter.js`)
Multi-threaded importer using worker threads for faster imports. Uses 3 workers by default.

### 3. RAM Worker (`ramWorker.js`)
Worker thread implementation for parallel importing.

## Quick Start

### Import All RAM (Sequential)
```bash
npm run import-all-ram
```

### Import All RAM (Parallel - Faster)
```bash
npm run import-parallel-ram
```

### Import Priority 1 RAM Only (Latest/Popular)
```bash
npm run import-priority-1-ram
```

### Import DDR5 Only
```bash
npm run import-ddr5
```

### Import DDR4 Only
```bash
npm run import-ddr4
```

### Fast Import (Parallel with 4 Workers)
```bash
npm run import-parallel-fast-ram
```

## Command Reference

### Bulk (Sequential) Import Commands

| Command | Description |
|---------|-------------|
| `npm run import-all-ram` | Import all RAM configurations |
| `npm run import-ddr4` | Import only DDR4 RAM |
| `npm run import-ddr5` | Import only DDR5 RAM |
| `npm run import-priority-1-ram` | Import Priority 1 RAM (latest gen) |
| `npm run import-high-end-ram` | Import high-end gaming RAM only |
| `npm run import-mainstream-ram` | Import mainstream RAM only |

### Parallel Import Commands

| Command | Description |
|---------|-------------|
| `npm run import-parallel-ram` | Import all RAM with 3 workers |
| `npm run import-parallel-ddr4` | Import DDR4 with 3 workers |
| `npm run import-parallel-ddr5` | Import DDR5 with 3 workers |
| `npm run import-parallel-priority-1-ram` | Import Priority 1 with 3 workers |
| `npm run import-parallel-fast-ram` | Import Priority 1 with 4 workers (fastest) |

## Advanced Usage

### Custom Import Options

#### Bulk Importer
```bash
# Import with custom options
node scripts/bulkRamImporter.js [options]

# Options:
--ddr4-only          # Import only DDR4 RAM
--ddr5-only          # Import only DDR5 RAM
--priority-1         # Import Priority 1 only
--priority-2         # Import Priority 2 only
--extreme-only       # Import extreme performance RAM (7200MHz+)
--high-end-only      # Import high-end gaming RAM
--mainstream-only    # Import mainstream RAM
--workstation-only   # Import high-capacity workstation RAM
--limit N            # Import only first N models
--start-from MODEL   # Resume from specific model
```

#### Parallel Importer
```bash
# Import with custom options
node scripts/parallelRamImporter.js [options]

# Additional option:
--workers N          # Number of parallel workers (default: 3)

# Examples:
node scripts/parallelRamImporter.js --workers 5
node scripts/parallelRamImporter.js --ddr5-only --workers 4
node scripts/parallelRamImporter.js --limit 10 --workers 2
```

## RAM Configurations Imported

### DDR5 RAM
- **Extreme Performance**: 8000MHz, 7600MHz, 7200MHz, 6800MHz
- **High-End Gaming**: 6400MHz, 6000MHz
- **Mainstream**: 5600MHz, 5200MHz
- **Entry-Level**: 4800MHz
- **Capacities**: 16GB, 32GB, 64GB, 128GB kits

### DDR4 RAM
- **High-End Gaming**: 4000MHz, 3800MHz, 3600MHz
- **Mainstream**: 3200MHz, 3000MHz
- **Entry-Level**: 2666MHz, 2400MHz
- **Capacities**: 8GB, 16GB, 32GB, 64GB, 128GB kits

### Brand-Specific
- Corsair Dominator (DDR5)
- G.Skill Trident Z5 (DDR5)
- Kingston Fury Beast (DDR5)
- G.Skill Trident Z (DDR4)
- Corsair Vengeance RGB (DDR4)
- Crucial Ballistix (DDR4)

### SO-DIMM (Laptop RAM)
- DDR5-5600 SO-DIMM
- DDR4-3200 SO-DIMM

## Priority Levels

### Priority 1 (Latest/Popular)
- DDR5: 4800MHz to 8000MHz (16GB, 32GB kits)
- DDR4: 3000MHz to 4000MHz (16GB, 32GB kits)
- Most popular gaming configurations

### Priority 2 (Budget/Workstation)
- DDR5: High capacity (64GB, 128GB)
- DDR4: Entry-level speeds and high capacity
- Budget and workstation configurations

### Priority 3 (Brand-Specific/Laptop)
- Premium brand-specific models
- SO-DIMM laptop RAM

## Features

### Smart Duplicate Detection
- Automatically detects and skips duplicate RAM modules
- Updates existing modules if new data is found
- Tracks new, duplicate, and updated counts

### Data Enrichment
The scripts automatically extract and populate:
- Memory type (DDR4/DDR5)
- Speed (MHz)
- Capacity and kit configuration (e.g., 2x16GB)
- Latency/CAS timings
- RGB lighting
- XMP/EXPO profiles
- Heat spreader information
- ECC support
- Manufacturer detection
- Performance tier classification

### Sale Price Detection
- Detects items on sale
- Stores both base price and sale price
- Tracks current pricing

### Progress Tracking
- Real-time progress bars
- Detailed logging for each configuration
- Summary statistics at completion

## Import Statistics

After import completes, you'll see:
- Total configurations processed
- Success/failure counts
- New RAM modules added
- Duplicates skipped
- Modules updated
- Breakdown by memory type (DDR4/DDR5)
- Breakdown by performance tier

## Performance Tips

### For Fastest Imports
1. Use parallel import with 4 workers:
   ```bash
   npm run import-parallel-fast-ram
   ```

2. Import only what you need:
   ```bash
   npm run import-parallel-priority-1-ram
   ```

### For Stability
1. Use bulk (sequential) import:
   ```bash
   npm run import-all-ram
   ```

2. Limit the number of configurations:
   ```bash
   node scripts/bulkRamImporter.js --limit 20
   ```

### For Resume After Interruption
```bash
node scripts/bulkRamImporter.js --start-from "DDR5-5600 32GB"
```

## Rate Limiting

Both scripts include built-in rate limiting:
- **Bulk Importer**: 3-5 seconds between requests
- **Parallel Importer**: 2-4 seconds between requests per worker

This helps prevent being rate-limited by Amazon.

## Troubleshooting

### Import Failed
- Check your internet connection
- Verify MongoDB is running
- Try using bulk import instead of parallel
- Reduce the number of workers: `--workers 2`

### Too Many Duplicates
- This is normal! The scripts skip duplicates automatically
- The database will only contain unique RAM modules

### Slow Import Speed
- Use parallel import with more workers
- Limit to Priority 1 only
- Check your internet connection speed

### Worker Crashes
- Reduce number of workers: `--workers 2`
- Use bulk import for stability
- Check system resources (RAM, CPU)

## Database Collection

All RAM modules are saved to the `rams` collection in your MongoDB database.

## Example Workflows

### First Time Setup
```bash
# Import all Priority 1 RAM (fastest popular models)
npm run import-parallel-priority-1-ram
```

### Complete Database Population
```bash
# Import everything (takes longer)
npm run import-parallel-ram
```

### Update Existing Database
```bash
# Re-run any import command
# Duplicates are automatically skipped
npm run import-parallel-priority-1-ram
```

### DDR5 Only Build
```bash
# Import only DDR5 RAM
npm run import-parallel-ddr5
```

### Budget Build Focus
```bash
# Import mainstream RAM only
npm run import-mainstream-ram
```

## Support

For issues or questions:
- Check the console output for detailed error messages
- Review the progress logs
- Ensure MongoDB connection is stable
- Verify Puppeteer can launch browser

---

**Happy RAM Importing! 🧠✨**
