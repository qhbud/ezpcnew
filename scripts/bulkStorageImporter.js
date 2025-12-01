const { StorageDataPopulator } = require('./storageDataPopulator');
const Logger = require('./utils/logger');

class BulkStorageImporter {
  constructor() {
    this.populator = new StorageDataPopulator();
    this.results = {
      total: 0,
      successful: 0,
      failed: 0,
      drives: {}
    };
  }

  // Get comprehensive list of storage drives to import
  getStorageModels() {
    return [
      // NVMe M.2 SSDs - High Performance (PCIe 4.0) - Priority 1
      { model: '1TB NVMe PCIe 4.0', searchTerms: ['1TB NVMe M.2 SSD PCIe 4.0'], type: 'M.2 SSD', capacity: 1000, interface: 'pcie_4.0', priority: 1, tier: 'high-end' },
      { model: '2TB NVMe PCIe 4.0', searchTerms: ['2TB NVMe M.2 SSD PCIe 4.0'], type: 'M.2 SSD', capacity: 2000, interface: 'pcie_4.0', priority: 1, tier: 'high-end' },
      { model: '500GB NVMe PCIe 4.0', searchTerms: ['500GB NVMe M.2 SSD PCIe 4.0'], type: 'M.2 SSD', capacity: 500, interface: 'pcie_4.0', priority: 1, tier: 'mainstream' },
      { model: '4TB NVMe PCIe 4.0', searchTerms: ['4TB NVMe M.2 SSD PCIe 4.0'], type: 'M.2 SSD', capacity: 4000, interface: 'pcie_4.0', priority: 1, tier: 'extreme' },

      // NVMe M.2 SSDs - PCIe 3.0 - Priority 1
      { model: '1TB NVMe PCIe 3.0', searchTerms: ['1TB NVMe M.2 SSD PCIe 3.0'], type: 'M.2 SSD', capacity: 1000, interface: 'pcie_3.0', priority: 1, tier: 'mainstream' },
      { model: '500GB NVMe PCIe 3.0', searchTerms: ['500GB NVMe M.2 SSD PCIe 3.0'], type: 'M.2 SSD', capacity: 500, interface: 'pcie_3.0', priority: 1, tier: 'entry' },
      { model: '2TB NVMe PCIe 3.0', searchTerms: ['2TB NVMe M.2 SSD PCIe 3.0'], type: 'M.2 SSD', capacity: 2000, interface: 'pcie_3.0', priority: 1, tier: 'mainstream' },

      // NVMe M.2 SSDs - PCIe 5.0 (Next Gen) - Priority 2
      { model: '1TB NVMe PCIe 5.0', searchTerms: ['1TB NVMe M.2 SSD PCIe 5.0'], type: 'M.2 SSD', capacity: 1000, interface: 'pcie_5.0', priority: 2, tier: 'extreme' },
      { model: '2TB NVMe PCIe 5.0', searchTerms: ['2TB NVMe M.2 SSD PCIe 5.0'], type: 'M.2 SSD', capacity: 2000, interface: 'pcie_5.0', priority: 2, tier: 'extreme' },

      // Popular NVMe Brands - Priority 1
      { model: 'Samsung 970 EVO Plus', searchTerms: ['Samsung 970 EVO Plus NVMe'], brand: 'Samsung', type: 'M.2 SSD', priority: 1, tier: 'premium' },
      { model: 'Samsung 980 PRO', searchTerms: ['Samsung 980 PRO NVMe'], brand: 'Samsung', type: 'M.2 SSD', priority: 1, tier: 'premium' },
      { model: 'Samsung 990 PRO', searchTerms: ['Samsung 990 PRO NVMe'], brand: 'Samsung', type: 'M.2 SSD', priority: 1, tier: 'premium' },
      { model: 'WD Black SN850X', searchTerms: ['WD Black SN850X NVMe'], brand: 'Western Digital', type: 'M.2 SSD', priority: 1, tier: 'premium' },
      { model: 'WD Black SN770', searchTerms: ['WD Black SN770 NVMe'], brand: 'Western Digital', type: 'M.2 SSD', priority: 1, tier: 'high-end' },
      { model: 'Crucial P5 Plus', searchTerms: ['Crucial P5 Plus NVMe'], brand: 'Crucial', type: 'M.2 SSD', priority: 1, tier: 'high-end' },
      { model: 'Sabrent Rocket 4 Plus', searchTerms: ['Sabrent Rocket 4 Plus NVMe'], brand: 'Sabrent', type: 'M.2 SSD', priority: 1, tier: 'high-end' },
      { model: 'Kingston KC3000', searchTerms: ['Kingston KC3000 NVMe'], brand: 'Kingston', type: 'M.2 SSD', priority: 1, tier: 'high-end' },
      { model: 'Corsair MP600 PRO', searchTerms: ['Corsair MP600 PRO NVMe'], brand: 'Corsair', type: 'M.2 SSD', priority: 1, tier: 'high-end' },

      // 2.5" SATA SSDs - Priority 1
      { model: '1TB 2.5" SATA SSD', searchTerms: ['1TB 2.5 inch SATA SSD'], type: 'Other SSD', capacity: 1000, interface: 'sata', priority: 1, tier: 'mainstream' },
      { model: '500GB 2.5" SATA SSD', searchTerms: ['500GB 2.5 inch SATA SSD'], type: 'Other SSD', capacity: 500, interface: 'sata', priority: 1, tier: 'entry' },
      { model: '2TB 2.5" SATA SSD', searchTerms: ['2TB 2.5 inch SATA SSD'], type: 'Other SSD', capacity: 2000, interface: 'sata', priority: 1, tier: 'mainstream' },
      { model: '4TB 2.5" SATA SSD', searchTerms: ['4TB 2.5 inch SATA SSD'], type: 'Other SSD', capacity: 4000, interface: 'sata', priority: 1, tier: 'high-end' },
      { model: '250GB 2.5" SATA SSD', searchTerms: ['250GB 2.5 inch SATA SSD'], type: 'Other SSD', capacity: 250, interface: 'sata', priority: 2, tier: 'budget' },

      // Popular 2.5" SATA SSD Brands - Priority 1
      { model: 'Samsung 870 EVO', searchTerms: ['Samsung 870 EVO SSD'], brand: 'Samsung', type: 'Other SSD', priority: 1, tier: 'premium' },
      { model: 'Samsung 870 QVO', searchTerms: ['Samsung 870 QVO SSD'], brand: 'Samsung', type: 'Other SSD', priority: 1, tier: 'mainstream' },
      { model: 'Crucial MX500', searchTerms: ['Crucial MX500 SSD'], brand: 'Crucial', type: 'Other SSD', priority: 1, tier: 'mainstream' },
      { model: 'WD Blue SSD', searchTerms: ['WD Blue SSD 2.5'], brand: 'Western Digital', type: 'Other SSD', priority: 1, tier: 'mainstream' },
      { model: 'Kingston A400', searchTerms: ['Kingston A400 SSD'], brand: 'Kingston', type: 'Other SSD', priority: 1, tier: 'budget' },
      { model: 'SanDisk SSD Plus', searchTerms: ['SanDisk SSD Plus'], brand: 'SanDisk', type: 'Other SSD', priority: 2, tier: 'budget' },

      // M.2 SATA SSDs - Priority 2
      { model: '1TB M.2 SATA SSD', searchTerms: ['1TB M.2 SATA SSD'], type: 'M.2 SSD', capacity: 1000, interface: 'sata', priority: 2, tier: 'mainstream' },
      { model: '500GB M.2 SATA SSD', searchTerms: ['500GB M.2 SATA SSD'], type: 'M.2 SSD', capacity: 500, interface: 'sata', priority: 2, tier: 'entry' },
      { model: '2TB M.2 SATA SSD', searchTerms: ['2TB M.2 SATA SSD'], type: 'M.2 SSD', capacity: 2000, interface: 'sata', priority: 2, tier: 'mainstream' },

      // 3.5" Hard Drives (7200 RPM) - Priority 1
      { model: '1TB 7200RPM HDD', searchTerms: ['1TB 3.5 inch HDD 7200RPM'], type: 'HDD', capacity: 1000, rpm: 7200, priority: 1, tier: 'budget' },
      { model: '2TB 7200RPM HDD', searchTerms: ['2TB 3.5 inch HDD 7200RPM'], type: 'HDD', capacity: 2000, rpm: 7200, priority: 1, tier: 'budget' },
      { model: '4TB 7200RPM HDD', searchTerms: ['4TB 3.5 inch HDD 7200RPM'], type: 'HDD', capacity: 4000, rpm: 7200, priority: 1, tier: 'mainstream' },
      { model: '6TB HDD', searchTerms: ['6TB 3.5 inch HDD'], type: 'HDD', capacity: 6000, priority: 1, tier: 'mainstream' },
      { model: '8TB HDD', searchTerms: ['8TB 3.5 inch HDD'], type: 'HDD', capacity: 8000, priority: 1, tier: 'high-capacity' },
      { model: '10TB HDD', searchTerms: ['10TB 3.5 inch HDD'], type: 'HDD', capacity: 10000, priority: 1, tier: 'high-capacity' },
      { model: '12TB HDD', searchTerms: ['12TB 3.5 inch HDD'], type: 'HDD', capacity: 12000, priority: 1, tier: 'high-capacity' },

      // 3.5" Hard Drives (5400 RPM) - Budget - Priority 2
      { model: '4TB 5400RPM HDD', searchTerms: ['4TB 3.5 inch HDD 5400RPM'], type: 'HDD', capacity: 4000, rpm: 5400, priority: 2, tier: 'budget' },
      { model: '8TB 5400RPM HDD', searchTerms: ['8TB 3.5 inch HDD 5400RPM'], type: 'HDD', capacity: 8000, rpm: 5400, priority: 2, tier: 'budget' },

      // High Capacity HDDs - Priority 2
      { model: '14TB HDD', searchTerms: ['14TB hard drive'], type: 'HDD', capacity: 14000, priority: 2, tier: 'extreme-capacity' },
      { model: '16TB HDD', searchTerms: ['16TB hard drive'], type: 'HDD', capacity: 16000, priority: 2, tier: 'extreme-capacity' },
      { model: '18TB HDD', searchTerms: ['18TB hard drive'], type: 'HDD', capacity: 18000, priority: 2, tier: 'extreme-capacity' },
      { model: '20TB HDD', searchTerms: ['20TB hard drive'], type: 'HDD', capacity: 20000, priority: 2, tier: 'extreme-capacity' },

      // Popular HDD Brands - Priority 1
      { model: 'Seagate Barracuda', searchTerms: ['Seagate Barracuda HDD'], brand: 'Seagate', type: 'HDD', priority: 1, tier: 'mainstream' },
      { model: 'WD Blue HDD', searchTerms: ['WD Blue HDD desktop'], brand: 'Western Digital', type: 'HDD', priority: 1, tier: 'mainstream' },
      { model: 'WD Black HDD', searchTerms: ['WD Black HDD performance'], brand: 'Western Digital', type: 'HDD', priority: 1, tier: 'performance' },
      { model: 'Seagate IronWolf', searchTerms: ['Seagate IronWolf NAS HDD'], brand: 'Seagate', type: 'HDD', priority: 1, tier: 'nas' },
      { model: 'WD Red NAS', searchTerms: ['WD Red NAS HDD'], brand: 'Western Digital', type: 'HDD', priority: 1, tier: 'nas' },
      { model: 'Seagate FireCuda', searchTerms: ['Seagate FireCuda SSHD'], brand: 'Seagate', type: 'HDD', priority: 2, tier: 'performance' },

      // 2.5" Hard Drives (Laptop/Portable) - Priority 2
      { model: '1TB 2.5" HDD', searchTerms: ['1TB 2.5 inch HDD laptop'], type: 'HDD', capacity: 1000, priority: 2, tier: 'laptop' },
      { model: '2TB 2.5" HDD', searchTerms: ['2TB 2.5 inch HDD portable'], type: 'HDD', capacity: 2000, priority: 2, tier: 'laptop' },
      { model: '500GB 2.5" HDD', searchTerms: ['500GB 2.5 inch HDD'], type: 'HDD', capacity: 500, priority: 2, tier: 'laptop' },
      { model: '4TB 2.5" HDD', searchTerms: ['4TB 2.5 inch HDD portable'], type: 'HDD', capacity: 4000, priority: 2, tier: 'laptop' },
      { model: '5TB 2.5" HDD', searchTerms: ['5TB 2.5 inch HDD portable'], type: 'HDD', capacity: 5000, priority: 2, tier: 'laptop' },

      // Budget NVMe Options - Priority 2
      { model: 'Budget NVMe 500GB', searchTerms: ['budget NVMe SSD 500GB'], type: 'M.2 SSD', capacity: 500, priority: 2, tier: 'budget' },
      { model: 'Budget NVMe 1TB', searchTerms: ['budget NVMe SSD 1TB'], type: 'M.2 SSD', capacity: 1000, priority: 2, tier: 'budget' },
      { model: 'WD Blue SN570', searchTerms: ['WD Blue SN570 NVMe'], brand: 'Western Digital', type: 'M.2 SSD', priority: 2, tier: 'budget' },

      // Gaming-Focused Storage - Priority 2
      { model: 'Gaming SSD 1TB', searchTerms: ['gaming SSD 1TB fast'], type: 'M.2 SSD', priority: 2, tier: 'gaming' },
      { model: 'PS5 Compatible NVMe', searchTerms: ['PS5 compatible NVMe SSD'], type: 'M.2 SSD', priority: 2, tier: 'gaming' },

      // High Capacity NVMe - Priority 2
      { model: '8TB NVMe', searchTerms: ['8TB NVMe SSD'], type: 'M.2 SSD', capacity: 8000, priority: 2, tier: 'extreme-capacity' },

      // More Budget Options - Priority 3
      { model: 'Budget 2.5" SSD 1TB', searchTerms: ['budget 2.5 SSD 1TB'], type: 'Other SSD', capacity: 1000, priority: 3, tier: 'budget' },
      { model: 'Value HDD 4TB', searchTerms: ['value HDD 4TB'], type: 'HDD', capacity: 4000, priority: 3, tier: 'budget' },

      // Additional Popular Brands - Priority 3
      { model: 'SK Hynix P31', searchTerms: ['SK Hynix P31 NVMe'], brand: 'SK Hynix', type: 'M.2 SSD', priority: 3, tier: 'high-end' },
      { model: 'ADATA XPG SX8200', searchTerms: ['ADATA XPG SX8200 NVMe'], brand: 'ADATA', type: 'M.2 SSD', priority: 3, tier: 'mainstream' },
      { model: 'Mushkin Pilot-E', searchTerms: ['Mushkin Pilot-E NVMe'], brand: 'Mushkin', type: 'M.2 SSD', priority: 3, tier: 'mainstream' },
      { model: 'TeamGroup MP34', searchTerms: ['TeamGroup MP34 NVMe'], brand: 'TeamGroup', type: 'M.2 SSD', priority: 3, tier: 'mainstream' }
    ];
  }

  // Generate Amazon search URL
  generateSearchUrl(searchTerm) {
    const query = searchTerm.toLowerCase().replace(/\s+/g, '+');
    return `https://www.amazon.com/s?k=${query}&ref=nb_sb_noss`;
  }

  // Import storage drives based on filters
  async importStorageDrives(options = {}) {
    const {
      storageType = ['HDD', 'M.2 SSD', 'Other SSD'],
      priority = [1, 2],
      maxModels = null,
      startFrom = null,
      tier = null,
      brand = null
    } = options;

    Logger.info('💾 Starting Bulk Storage Import...');
    Logger.info('=================================\n');

    const allModels = this.getStorageModels();

    // Filter models based on options
    let modelsToImport = allModels.filter(model =>
      storageType.includes(model.type) &&
      priority.includes(model.priority) &&
      (!tier || model.tier === tier) &&
      (!brand || model.brand === brand)
    );

    // Handle start from option
    if (startFrom) {
      const startIndex = modelsToImport.findIndex(m => m.model === startFrom);
      if (startIndex >= 0) {
        modelsToImport = modelsToImport.slice(startIndex);
        Logger.info(`📍 Starting from ${startFrom} (${modelsToImport.length} models remaining)`);
      }
    }

    // Limit models if specified
    if (maxModels) {
      modelsToImport = modelsToImport.slice(0, maxModels);
      Logger.info(`🎯 Limited to first ${maxModels} models`);
    }

    Logger.info(`📋 Will import ${modelsToImport.length} storage configurations\n`);

    try {
      await this.populator.connect();
      await this.populator.initBrowser();

      for (let i = 0; i < modelsToImport.length; i++) {
        const storageModel = modelsToImport[i];
        const { model, searchTerms, type, capacity, tier } = storageModel;
        const progress = `[${i + 1}/${modelsToImport.length}]`;

        Logger.info(`\n${progress} Processing: ${model}`);
        Logger.info(`   Type: ${type} | Capacity: ${capacity ? capacity + 'GB' : 'Various'} | Tier: ${tier}`);

        try {
          // Use the first search term
          const searchUrl = this.generateSearchUrl(searchTerms[0]);
          const result = await this.populator.populateStorageData(searchUrl, model);

          if (result.success) {
            this.results.successful++;
            this.results.drives[model] = {
              status: 'success',
              type: type,
              capacity: capacity,
              count: result.count,
              duplicates: result.duplicates,
              updated: result.updated
            };
            Logger.success(`   ✅ Success: ${result.count} new, ${result.duplicates} duplicates, ${result.updated} updated`);
          } else {
            this.results.failed++;
            this.results.drives[model] = {
              status: 'failed',
              error: result.error || 'No data found'
            };
            Logger.warn(`   ⚠️  Failed: ${result.error || 'No data found'}`);
          }

          this.results.total++;

          // Delay between requests
          if (i < modelsToImport.length - 1) {
            Logger.info('   ⏳ Waiting 3 seconds before next request...');
            await new Promise(resolve => setTimeout(resolve, 3000));
          }

        } catch (error) {
          this.results.failed++;
          this.results.total++;
          this.results.drives[model] = {
            status: 'error',
            error: error.message
          };
          Logger.error(`   ❌ Error: ${error.message}`);
          continue;
        }
      }

      await this.printSummary();

    } catch (error) {
      Logger.error('💥 Fatal error during storage import:', error);
      throw error;
    } finally {
      await this.populator.close();
      Logger.info('🚪 Cleanup completed');
    }
  }

  async printSummary() {
    Logger.info('\n' + '='.repeat(80));
    Logger.info('📊 STORAGE IMPORT COMPLETE');
    Logger.info('='.repeat(80));

    Logger.success(`✅ Successful: ${this.results.successful}`);
    Logger.error(`❌ Failed: ${this.results.failed}`);
    Logger.info(`📋 Total processed: ${this.results.total}`);

    // Calculate totals
    let totalNew = 0;
    let totalDuplicates = 0;
    let totalUpdated = 0;

    Object.values(this.results.drives).forEach(drive => {
      if (drive.status === 'success') {
        totalNew += drive.count || 0;
        totalDuplicates += drive.duplicates || 0;
        totalUpdated += drive.updated || 0;
      }
    });

    Logger.info('\n🎯 FINAL TOTALS:');
    Logger.success(`   New storage drives added: ${totalNew}`);
    Logger.info(`   Duplicates skipped: ${totalDuplicates}`);
    Logger.info(`   Existing drives updated: ${totalUpdated}`);
    Logger.info(`   Total storage processed: ${totalNew + totalDuplicates + totalUpdated}`);

    // Check final database count
    Logger.info('\n🔍 Checking final database count...');
    const collection = this.populator.db.collection('storages');
    const finalCount = await collection.countDocuments();

    Logger.success(`💾 Final storage drives in database: ${finalCount}`);

    Logger.info('='.repeat(80));
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    storageType: ['HDD', 'M.2 SSD', 'Other SSD'],
    priority: [1, 2]
  };

  if (args.includes('--m2-only')) {
    options.storageType = ['M.2 SSD'];
  }
  if (args.includes('--ssd-only')) {
    options.storageType = ['M.2 SSD', 'Other SSD'];
  }
  if (args.includes('--hdd-only')) {
    options.storageType = ['HDD'];
  }
  if (args.includes('--priority-1')) {
    options.priority = [1];
  }
  if (args.includes('--priority-2')) {
    options.priority = [2];
  }
  if (args.includes('--high-end-only')) {
    options.tier = 'high-end';
  }
  if (args.includes('--mainstream-only')) {
    options.tier = 'mainstream';
  }
  if (args.includes('--budget-only')) {
    options.tier = 'budget';
  }

  // Check for max models limit
  const maxModelsIndex = args.indexOf('--max');
  if (maxModelsIndex !== -1 && args[maxModelsIndex + 1]) {
    options.maxModels = parseInt(args[maxModelsIndex + 1]);
  }

  // Check for start from option
  const startFromIndex = args.indexOf('--start-from');
  if (startFromIndex !== -1 && args[startFromIndex + 1]) {
    options.startFrom = args[startFromIndex + 1];
  }

  return options;
}

// Run the importer if this script is executed directly
if (require.main === module) {
  const options = parseArgs();

  const importer = new BulkStorageImporter();
  importer.importStorageDrives(options)
    .then(() => {
      Logger.success('\n🎉 Storage import completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      Logger.error('\n💥 Storage import failed:', error);
      process.exit(1);
    });
}

module.exports = { BulkStorageImporter };
