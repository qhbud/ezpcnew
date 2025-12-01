# Comprehensive Price History Updater

This tool updates price history for ALL components in your PC Builder database.

## What it does

- Updates prices for **ALL** components dynamically (not hard-coded)
- Updates price history for tracking price changes over time
- Updates the following collections:
  - CPUs
  - GPUs
  - Motherboards
  - RAM
  - PSUs
  - Coolers
  - Storage

## Features

✅ **Dynamic updates** - Fetches all components from each collection automatically
✅ **Progress feedback** - Shows how many components are left in each collection
✅ **Price history** - Records each price check with timestamp
✅ **Sale detection** - Identifies and tracks sale prices
✅ **Availability tracking** - Records when products become unavailable
✅ **Comprehensive reporting** - Shows statistics for each collection and overall
✅ **Pause/Resume** - Press 'P' to pause and resume the update process
✅ **Graceful cancellation** - Press Ctrl+C to cancel and save progress

## How to run

### Option 1: Using the batch file (Windows)

Double-click `update-all-prices.bat` in the project root

### Option 2: Using npm

```bash
npm run update-all-component-prices
```

### Option 3: Direct Node execution

```bash
node scripts/updateAllComponentPrices.js
```

## Interactive Controls

Once the script is running, you have the following controls:

### Pause/Resume
- **Press 'P'** to pause the update process
- Press 'P' again to resume
- While paused, you'll see: `⏸️  PAUSED - Press P to resume or Ctrl+C to cancel`

### Cancel and Save Progress
- **Press Ctrl+C** to gracefully cancel the update
- Progress is automatically saved to `price-update-progress.json`
- You can resume later from where you left off
- The script shows: `🛑 CANCELLATION REQUESTED` followed by progress save confirmation

### Progress Tracking
The script displays:
```
══════════════════════════════════════════════════════════════════════
⌨️  CONTROLS:
   Press Ctrl+C to cancel and save progress
   Press P to pause/resume
══════════════════════════════════════════════════════════════════════
```

If cancelled, the final summary shows:
```
══════════════════════════════════════════════════════════════════════
⚠️  PARTIAL SUMMARY (CANCELLED)
══════════════════════════════════════════════════════════════════════
Collections processed: 3/7
Total components processed: 145
✅ Successfully updated: 138
❌ Failed: 7

💾 Progress saved to price-update-progress.json
   Run the script again to resume from where you left off
══════════════════════════════════════════════════════════════════════
```

## Output

The script provides real-time feedback:

```
======================================================================
📦 UPDATING COLLECTION: CPUS
======================================================================
Found 45 components with URLs

[1/45] 44 remaining
Component: Intel Core i9-13900K
URL: https://www.amazon.com/...
✅ Price: $564.99
🏷️  ON SALE! 10% OFF (was $629.99)

[2/45] 43 remaining
Component: AMD Ryzen 9 7950X
URL: https://www.amazon.com/...
✅ Price: $501.00

...

======================================================================
📊 CPUS SUMMARY
======================================================================
Total: 45
✅ Updated: 42
❌ Failed: 3
======================================================================
```

## Final Summary

At the end, you'll see a comprehensive summary:

```
======================================================================
🎉 FINAL SUMMARY
======================================================================
Collections processed: 7
Total components processed: 324
✅ Successfully updated: 312
❌ Failed: 12
⏱️  Time taken: 15m 32s
======================================================================
```

## Important Notes

- **This can take a while** - Each component requires scraping a web page
- **Rate limiting** - 2-second delay between each component to avoid being blocked
- **Internet required** - Must have active internet connection
- **Database required** - MongoDB must be running and accessible

## Price History Format

Each price check is stored in the `priceHistory` array:

```javascript
{
  price: 564.99,
  date: "2025-11-14T10:30:00.000Z",
  source: "https://www.amazon.com/...",
  detectionMethod: "RiverSearch",
  isAvailable: true
}
```

## Troubleshooting

**Q: Script fails with "Database not connected"**
- Make sure MongoDB is running
- Check your database connection string in `.env`

**Q: Many components show as "Failed"**
- This is normal if URLs are outdated or products are discontinued
- Check specific URLs manually to verify

**Q: Script is very slow**
- This is expected - scraping takes time
- Don't reduce the delay or you may get rate-limited

**Q: Browser errors**
- Make sure Puppeteer is installed: `npm install puppeteer`
- Check if Chrome/Chromium is installed on your system

## Scheduling Updates

To run this automatically on a schedule, you can:

### Windows Task Scheduler
1. Open Task Scheduler
2. Create new task
3. Set trigger (e.g., daily at 3 AM)
4. Action: Run `update-all-prices.bat`

### Cron (Linux/Mac)
```bash
# Run daily at 3 AM
0 3 * * * cd /path/to/pcbuilder2 && node scripts/updateAllComponentPrices.js
```

## Support

For issues or questions, check the main README.md or create an issue in the repository.
