# PC Builder Component Finder - Batch Files Guide
## Version 2.0 - Enhanced Filtering

This directory contains several batch files to help you easily search for and collect PC components from Amazon.

---

## 🆕 What's New in Version 2.0

### Enhanced Filtering & Validation
- ✅ **Robust Price Validation** - Multi-layer checks ensure only valid prices ($1-$50,000)
- ✅ **Prebuilt PC Detection** - Automatically filters complete systems and gaming PCs
- ✅ **Cable/Accessory Filtering** - Rejects cables, adapters, and non-component items
- ✅ **Memory Card Blocking** - Filters camera cards, SD cards, and portable storage
- ✅ **Improved RAM Speed** - Now detects MT/s notation (standard for DDR5)
- ✅ **Smarter Combo Detection** - More precise filtering with fewer false positives
- ✅ **Core Count Detection** - Properly extracts Intel hybrid architecture (8P+8E)

---

## 📁 Available Batch Files

### 1. **find-components.bat** (Interactive Mode)
The main interactive script that prompts you for each component type.

**Features:**
- Asks how many of each component you want (GPUs, CPUs, MOBOs, RAM, PSUs, Cases, Coolers, Storage)
- Shows a summary before running
- Lists all enhanced filtering features
- Asks for confirmation
- Default: 20 of each component

**Best for:** Customized searches where you want different quantities for different components

**Usage:** Double-click or run from command prompt
```batch
find-components.bat
```

---

### 2. **find-components-quick.bat** (Quick Run)
Runs immediately with default settings - no prompts.

**Settings:** 20 of each component type

**Best for:** Regular runs when you want a balanced collection of everything

**Time:** ~10-15 minutes

**Usage:**
```batch
find-components-quick.bat
```

---

### 3. **find-components-small.bat** (Small Batch)
Quick run with smaller quantities.

**Settings:** 5 of each component type

**Best for:** Testing, quick updates, or when you don't need many items

**Time:** ~3-5 minutes

**Usage:**
```batch
find-components-small.bat
```

---

### 4. **find-components-gpus-only.bat** (GPUs Only)
Focuses exclusively on finding GPUs.

**Features:**
- Asks how many GPUs you want (default: 30)
- Skips all other component types
- Searches NVIDIA RTX, AMD Radeon RX, and Intel Arc
- Enhanced GPU accessory filtering

**Best for:** When you only need to update your GPU inventory

**Time:** ~5-7 minutes (for 30 GPUs)

**Usage:**
```batch
find-components-gpus-only.bat
```

---

## 🎯 Enhanced Filtering Features

All batch files now include these powerful filters:

### ✅ **Price Validation (Multi-Layer)**
1. Initial check during scraping
2. Validation before adding to list
3. Final safety check before saving to JSON
4. Rejects: null, undefined, $0, negative, NaN, Infinity
5. Range: $1 minimum, $50,000 maximum

### ✅ **Prebuilt PC Detection**
Automatically rejects:
- Gaming PCs and desktop computers
- Complete systems with multiple components
- Products mentioning "GPU + RAM + SSD" together
- Keywords: "gaming pc", "desktop pc", "prebuilt", "complete system"

### ✅ **Cable & Accessory Filtering**
Blocks:
- Power cables, SATA cables, PCIe cables
- Adapters and extensions
- Connector kits
- Replacement cables

### ✅ **GPU Accessory Detection (Smart)**
Rejects accessories while keeping real GPUs:
- Support brackets, GPU stands
- Anti-sag brackets
- Vertical mounts, riser cables
- But keeps: "EVGA RTX 3090" (real GPU with model number)

### ✅ **Storage Filtering (Enhanced)**
Blocks non-internal storage:
- Portable/external drives
- Camera memory cards (CFexpress, SD, microSD)
- USB drives and thumb drives
- Keeps: M.2 SSDs, SATA SSDs, HDDs

### ✅ **Improved Specifications Extraction**
- **RAM Speed**: Now detects both MHz and MT/s notation
  - "6000MT/s" → 6000
  - "5200MHz" → 5200
- **CPU Cores**: Handles Intel hybrid architecture
  - "16 (8P+8E) Cores" → 16 cores
  - "20 (8P+12E) Cores" → 20 cores

### ✅ **Combo Product Detection (Smarter)**
More precise detection with fewer false positives:
- Only flags obvious combos (CPU+Motherboard bundles)
- Doesn't flag products with "kit" in normal branding
- Checks for actual multi-component listings

### ✅ **Diversity Enforcement**
Ensures variety to prevent collecting 20 identical items:
- PSUs: Max 3 within same 100W range
- GPUs: Max 3 of same model (e.g., RTX 4070)
- CPUs: Max 3 of same model
- RAM: Max 3 of same capacity/type combo

---

## 📊 Output Quality

After running, you'll find a JSON file with **guaranteed quality**:

### Every Saved Component Has:
- ✅ Valid price ($1-$50,000)
- ✅ No null/undefined prices
- ✅ Not a prebuilt PC
- ✅ Not a cable or accessory
- ✅ Not portable storage or memory card
- ✅ Proper specifications extracted
- ✅ Unique (no duplicates)
- ✅ Variety ensured

### JSON File Format:
```
new-components-2025-11-28T10-30-45-123Z.json
```

Contains:
- Product names and valid prices
- Amazon URLs with affiliate tags
- Specifications (GPU model, wattage, capacity, etc.)
- Images
- Features

---

## ⚙️ Customizing Search Quantities

### Using find-components.bat (Interactive)
Simply run the file and enter your desired quantities when prompted.

### Command Line Arguments
You can also run the script directly with custom arguments:

```batch
node scripts\findNewComponents.js [gpus] [cpus] [mobos] [ram] [psus] [cases] [coolers] [storage]
```

**Examples:**

```batch
# 10 GPUs, 5 CPUs, skip everything else
node scripts\findNewComponents.js 10 5 0 0 0 0 0 0

# 15 of everything
node scripts\findNewComponents.js 15 15 15 15 15 15 15 15

# Only PSUs and Cases
node scripts\findNewComponents.js 0 0 0 0 20 10 0 0
```

---

## 🔍 Search Coverage

### GPUs (Enhanced Filtering)
- NVIDIA RTX 50/40/30 series (5090, 5080, 4090, 4070, 4060, 3090, etc.)
- AMD Radeon RX 7000/6000 series (7900 XTX, 7800 XT, 7600, etc.)
- Intel Arc (A770, A750, A580, A380)
- **Filters**: GPU accessories, prebuilt systems with GPUs

### CPUs (Improved Core Detection)
- Intel Core i9/i7/i5 (14th/13th/12th gen)
- AMD Ryzen 9/7/5 (7000 series)
- Properly extracts hybrid core counts (8P+8E)
- **Filters**: Prebuilt systems, motherboard combos

### Motherboards
- Intel Z790, B760, H770 chipsets
- AMD X670E, B650, B650E chipsets
- ATX, Micro-ATX, Mini-ITX form factors
- **Filters**: CPU+Motherboard combos

### RAM (MT/s Support)
- DDR5: 64GB, 32GB, 16GB kits (with MT/s detection)
- DDR4: 32GB, 16GB kits
- Speeds: 3200MHz - 6400MT/s properly detected
- **Filters**: Laptop RAM, server RAM

### PSUs (Variety Enforced)
- 1000W, 850W, 750W, 650W, 550W
- 80+ Titanium, Platinum, Gold, Bronze
- Modular, Semi-Modular, Non-Modular
- **Filters**: Cables, adapters, max 3 per wattage range

### Cases
- Full Tower, Mid Tower, Mini Tower
- Various brands (NZXT, Corsair, Lian Li, Fractal Design, etc.)

### Coolers
- Air coolers (tower coolers)
- Liquid coolers (AIO - 120mm to 360mm)

### Storage (Enhanced Memory Card Filtering)
- NVMe SSDs (500GB - 4TB)
- SATA SSDs (500GB - 2TB)
- HDDs (2TB - 4TB)
- **Filters**: External drives, camera cards, SD/CFexpress

---

## ⏱️ Estimated Run Times

| Batch File | Items | Est. Time |
|------------|-------|-----------|
| find-components-small.bat | 40 total (5 each) | 3-5 min |
| find-components-gpus-only.bat | 30 GPUs | 5-7 min |
| find-components-quick.bat | 160 total (20 each) | 10-15 min |
| find-components.bat (custom) | Varies | Varies |

*Times may vary based on network speed and Amazon's response times*

---

## 🚨 Troubleshooting

### "Node is not recognized"
- Make sure Node.js is installed
- Restart your command prompt/terminal

### No components found
- Check your internet connection
- Amazon might be rate-limiting - wait a few minutes and try again
- Check if MongoDB is running (for duplicate detection)

### All items being rejected
- Items might already exist in your database
- Check the console output to see specific rejection reasons
- Common rejections: prebuilt PCs, cables, memory cards

### Script crashes or hangs
- Try the "small" batch file first to test
- Check if Puppeteer is properly installed: `npm install`

### Items with no price in output
- This should no longer happen with v2.0 multi-layer validation
- If it does, please report the issue

---

## 💡 Tips

1. **Start small**: Use `find-components-small.bat` first to test everything works
2. **Run during off-hours**: Less likely to hit rate limits
3. **Check output**: Review the generated JSON file to verify quality
4. **Import gradually**: Don't import hundreds of items at once to your database
5. **Monitor rejections**: Check console for items being filtered and why

---

## 📝 Version History

### Version 2.0 (Current)
- ✅ Multi-layer price validation
- ✅ Prebuilt PC detection
- ✅ Cable/accessory filtering
- ✅ Memory card blocking
- ✅ Improved RAM speed detection (MT/s)
- ✅ Enhanced CPU core extraction
- ✅ Smarter combo detection
- ✅ Better GPU accessory filtering

### Version 1.0
- Basic price validation
- Combo product detection
- Variety enforcement
- Multi-price range searches

---

## 🔗 Next Steps

After running the batch file and generating a JSON file:

1. Review the JSON file to ensure quality
2. Check that all items have valid prices
3. Verify no prebuilt PCs or accessories slipped through
4. Use the import script to add components to your database
5. Check the web interface to see the new components

---

**Happy component hunting! 🖥️✨**

**Version 2.0 - No more invalid prices, cables, or prebuilt PCs!**
