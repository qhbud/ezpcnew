const { RamDataPopulator } = require('./ramDataPopulator');
const Logger = require('./utils/logger');

class BulkRamImporter {
  constructor() {
    this.populator = new RamDataPopulator();
    this.results = {
      total: 0,
      successful: 0,
      failed: 0,
      modules: {}
    };
  }

  // Get comprehensive list of RAM modules to import
  getRamModels() {
    return [
      // ============================================================
      // DDR5 DESKTOP RAM
      // ============================================================

      // DDR5 Ultra-Extreme / Extreme 32GB - Priority 1
      { model: 'DDR5-8400 32GB', searchTerms: ['DDR5 8400MHz 32GB'], manufacturer: 'Various', priority: 1, type: 'DDR5', speed: 8400, tier: 'ultra-extreme' },
      { model: 'DDR5-8000 32GB', searchTerms: ['DDR5 8000MHz 32GB'], manufacturer: 'Various', priority: 1, type: 'DDR5', speed: 8000, tier: 'extreme' },
      { model: 'DDR5-7800 32GB', searchTerms: ['DDR5 7800MHz 32GB'], manufacturer: 'Various', priority: 1, type: 'DDR5', speed: 7800, tier: 'extreme' },
      { model: 'DDR5-7600 32GB', searchTerms: ['DDR5 7600MHz 32GB'], manufacturer: 'Various', priority: 1, type: 'DDR5', speed: 7600, tier: 'extreme' },
      { model: 'DDR5-7400 32GB', searchTerms: ['DDR5 7400MHz 32GB'], manufacturer: 'Various', priority: 1, type: 'DDR5', speed: 7400, tier: 'extreme' },
      { model: 'DDR5-7200 32GB', searchTerms: ['DDR5 7200MHz 32GB'], manufacturer: 'Various', priority: 1, type: 'DDR5', speed: 7200, tier: 'extreme' },
      { model: 'DDR5-7000 32GB', searchTerms: ['DDR5 7000MHz 32GB'], manufacturer: 'Various', priority: 1, type: 'DDR5', speed: 7000, tier: 'high-end' },
      { model: 'DDR5-6800 32GB', searchTerms: ['DDR5 6800MHz 32GB'], manufacturer: 'Various', priority: 1, type: 'DDR5', speed: 6800, tier: 'high-end' },
      { model: 'DDR5-6600 32GB', searchTerms: ['DDR5 6600MHz 32GB'], manufacturer: 'Various', priority: 1, type: 'DDR5', speed: 6600, tier: 'high-end' },
      { model: 'DDR5-6400 32GB', searchTerms: ['DDR5 6400MHz 32GB gaming'], manufacturer: 'Various', priority: 1, type: 'DDR5', speed: 6400, tier: 'high-end' },
      { model: 'DDR5-6200 32GB', searchTerms: ['DDR5 6200MHz 32GB'], manufacturer: 'Various', priority: 1, type: 'DDR5', speed: 6200, tier: 'high-end' },
      { model: 'DDR5-6000 32GB', searchTerms: ['DDR5 6000MHz 32GB gaming'], manufacturer: 'Various', priority: 1, type: 'DDR5', speed: 6000, tier: 'high-end' },

      // DDR5 Mainstream 32GB - Priority 1
      { model: 'DDR5-5600 32GB', searchTerms: ['DDR5 5600MHz 32GB'], manufacturer: 'Various', priority: 1, type: 'DDR5', speed: 5600, tier: 'mainstream' },
      { model: 'DDR5-5200 32GB', searchTerms: ['DDR5 5200MHz 32GB'], manufacturer: 'Various', priority: 1, type: 'DDR5', speed: 5200, tier: 'mainstream' },
      { model: 'DDR5-4800 32GB', searchTerms: ['DDR5 4800MHz 32GB'], manufacturer: 'Various', priority: 1, type: 'DDR5', speed: 4800, tier: 'entry' },

      // DDR5 16GB Kits - Priority 1
      { model: 'DDR5-8000 16GB', searchTerms: ['DDR5 8000MHz 16GB kit'], manufacturer: 'Various', priority: 1, type: 'DDR5', speed: 8000, tier: 'extreme' },
      { model: 'DDR5-7200 16GB', searchTerms: ['DDR5 7200MHz 16GB kit'], manufacturer: 'Various', priority: 1, type: 'DDR5', speed: 7200, tier: 'extreme' },
      { model: 'DDR5-6400 16GB', searchTerms: ['DDR5 6400MHz 16GB kit'], manufacturer: 'Various', priority: 1, type: 'DDR5', speed: 6400, tier: 'high-end' },
      { model: 'DDR5-6000 16GB', searchTerms: ['DDR5 6000MHz 16GB kit'], manufacturer: 'Various', priority: 1, type: 'DDR5', speed: 6000, tier: 'high-end' },
      { model: 'DDR5-5600 16GB', searchTerms: ['DDR5 5600MHz 16GB kit'], manufacturer: 'Various', priority: 1, type: 'DDR5', speed: 5600, tier: 'mainstream' },
      { model: 'DDR5-5200 16GB', searchTerms: ['DDR5 5200MHz 16GB'], manufacturer: 'Various', priority: 1, type: 'DDR5', speed: 5200, tier: 'mainstream' },
      { model: 'DDR5-4800 16GB', searchTerms: ['DDR5 4800MHz 16GB'], manufacturer: 'Various', priority: 1, type: 'DDR5', speed: 4800, tier: 'entry' },

      // DDR5 48GB Kits (2x24GB) - Priority 1
      { model: 'DDR5-6000 48GB', searchTerms: ['DDR5 6000MHz 48GB 2x24GB'], manufacturer: 'Various', priority: 1, type: 'DDR5', speed: 6000, tier: 'high-end' },
      { model: 'DDR5-5600 48GB', searchTerms: ['DDR5 5600MHz 48GB 2x24GB'], manufacturer: 'Various', priority: 1, type: 'DDR5', speed: 5600, tier: 'mainstream' },

      // DDR5 High Capacity 64GB - Priority 2
      { model: 'DDR5-7200 64GB', searchTerms: ['DDR5 7200MHz 64GB'], manufacturer: 'Various', priority: 2, type: 'DDR5', speed: 7200, tier: 'workstation' },
      { model: 'DDR5-6400 64GB', searchTerms: ['DDR5 6400MHz 64GB'], manufacturer: 'Various', priority: 2, type: 'DDR5', speed: 6400, tier: 'workstation' },
      { model: 'DDR5-6000 64GB', searchTerms: ['DDR5 6000MHz 64GB'], manufacturer: 'Various', priority: 2, type: 'DDR5', speed: 6000, tier: 'workstation' },
      { model: 'DDR5-5600 64GB', searchTerms: ['DDR5 5600MHz 64GB'], manufacturer: 'Various', priority: 2, type: 'DDR5', speed: 5600, tier: 'workstation' },
      { model: 'DDR5-4800 64GB', searchTerms: ['DDR5 4800MHz 64GB'], manufacturer: 'Various', priority: 2, type: 'DDR5', speed: 4800, tier: 'workstation' },

      // DDR5 96GB Kits (2x48GB) - Priority 2
      { model: 'DDR5-6000 96GB', searchTerms: ['DDR5 6000MHz 96GB 2x48GB'], manufacturer: 'Various', priority: 2, type: 'DDR5', speed: 6000, tier: 'workstation' },
      { model: 'DDR5-5600 96GB', searchTerms: ['DDR5 5600MHz 96GB 2x48GB'], manufacturer: 'Various', priority: 2, type: 'DDR5', speed: 5600, tier: 'workstation' },

      // DDR5 128GB - Priority 2
      { model: 'DDR5-5200 128GB', searchTerms: ['DDR5 5200MHz 128GB'], manufacturer: 'Various', priority: 2, type: 'DDR5', speed: 5200, tier: 'workstation' },

      // ============================================================
      // DDR4 DESKTOP RAM
      // ============================================================

      // DDR4 High-End / Extreme 32GB - Priority 1
      { model: 'DDR4-4400 32GB', searchTerms: ['DDR4 4400MHz 32GB'], manufacturer: 'Various', priority: 1, type: 'DDR4', speed: 4400, tier: 'extreme' },
      { model: 'DDR4-4200 32GB', searchTerms: ['DDR4 4200MHz 32GB'], manufacturer: 'Various', priority: 1, type: 'DDR4', speed: 4200, tier: 'extreme' },
      { model: 'DDR4-4000 32GB', searchTerms: ['DDR4 4000MHz 32GB gaming'], manufacturer: 'Various', priority: 1, type: 'DDR4', speed: 4000, tier: 'high-end' },
      { model: 'DDR4-3800 32GB', searchTerms: ['DDR4 3800MHz 32GB'], manufacturer: 'Various', priority: 1, type: 'DDR4', speed: 3800, tier: 'high-end' },
      { model: 'DDR4-3600 32GB', searchTerms: ['DDR4 3600MHz 32GB gaming'], manufacturer: 'Various', priority: 1, type: 'DDR4', speed: 3600, tier: 'high-end' },
      { model: 'DDR4-3466 32GB', searchTerms: ['DDR4 3466MHz 32GB'], manufacturer: 'Various', priority: 1, type: 'DDR4', speed: 3466, tier: 'high-end' },
      { model: 'DDR4-3200 32GB', searchTerms: ['DDR4 3200MHz 32GB'], manufacturer: 'Various', priority: 1, type: 'DDR4', speed: 3200, tier: 'mainstream' },
      { model: 'DDR4-3000 32GB', searchTerms: ['DDR4 3000MHz 32GB'], manufacturer: 'Various', priority: 1, type: 'DDR4', speed: 3000, tier: 'mainstream' },

      // DDR4 Budget 32GB - Priority 2
      { model: 'DDR4-2666 32GB', searchTerms: ['DDR4 2666MHz 32GB'], manufacturer: 'Various', priority: 2, type: 'DDR4', speed: 2666, tier: 'entry' },
      { model: 'DDR4-2400 32GB', searchTerms: ['DDR4 2400MHz 32GB'], manufacturer: 'Various', priority: 2, type: 'DDR4', speed: 2400, tier: 'entry' },

      // DDR4 16GB Kits - Priority 1
      { model: 'DDR4-4000 16GB', searchTerms: ['DDR4 4000MHz 16GB kit'], manufacturer: 'Various', priority: 1, type: 'DDR4', speed: 4000, tier: 'high-end' },
      { model: 'DDR4-3800 16GB', searchTerms: ['DDR4 3800MHz 16GB kit'], manufacturer: 'Various', priority: 1, type: 'DDR4', speed: 3800, tier: 'high-end' },
      { model: 'DDR4-3600 16GB', searchTerms: ['DDR4 3600MHz 16GB kit'], manufacturer: 'Various', priority: 1, type: 'DDR4', speed: 3600, tier: 'high-end' },
      { model: 'DDR4-3466 16GB', searchTerms: ['DDR4 3466MHz 16GB kit'], manufacturer: 'Various', priority: 1, type: 'DDR4', speed: 3466, tier: 'high-end' },
      { model: 'DDR4-3400 16GB', searchTerms: ['DDR4 3400MHz 16GB kit'], manufacturer: 'Various', priority: 1, type: 'DDR4', speed: 3400, tier: 'high-end' },
      { model: 'DDR4-3200 16GB', searchTerms: ['DDR4 3200MHz 16GB kit'], manufacturer: 'Various', priority: 1, type: 'DDR4', speed: 3200, tier: 'mainstream' },
      { model: 'DDR4-3000 16GB', searchTerms: ['DDR4 3000MHz 16GB'], manufacturer: 'Various', priority: 1, type: 'DDR4', speed: 3000, tier: 'mainstream' },

      // DDR4 Budget/Legacy 16GB - Priority 2
      { model: 'DDR4-2666 16GB', searchTerms: ['DDR4 2666MHz 16GB'], manufacturer: 'Various', priority: 2, type: 'DDR4', speed: 2666, tier: 'entry' },
      { model: 'DDR4-2400 16GB', searchTerms: ['DDR4 2400MHz 16GB'], manufacturer: 'Various', priority: 2, type: 'DDR4', speed: 2400, tier: 'entry' },
      { model: 'DDR4-2133 16GB', searchTerms: ['DDR4 2133MHz 16GB'], manufacturer: 'Various', priority: 2, type: 'DDR4', speed: 2133, tier: 'legacy' },

      // DDR4 8GB Budget - Priority 2
      { model: 'DDR4-3200 8GB', searchTerms: ['DDR4 3200MHz 8GB kit'], manufacturer: 'Various', priority: 2, type: 'DDR4', speed: 3200, tier: 'entry' },
      { model: 'DDR4-3000 8GB', searchTerms: ['DDR4 3000MHz 8GB'], manufacturer: 'Various', priority: 2, type: 'DDR4', speed: 3000, tier: 'entry' },
      { model: 'DDR4-2666 8GB', searchTerms: ['DDR4 2666MHz 8GB'], manufacturer: 'Various', priority: 2, type: 'DDR4', speed: 2666, tier: 'entry' },
      { model: 'DDR4-2400 8GB', searchTerms: ['DDR4 2400MHz 8GB'], manufacturer: 'Various', priority: 2, type: 'DDR4', speed: 2400, tier: 'entry' },
      { model: 'DDR4-2133 8GB', searchTerms: ['DDR4 2133MHz 8GB'], manufacturer: 'Various', priority: 2, type: 'DDR4', speed: 2133, tier: 'legacy' },

      // DDR4 High Capacity 48GB Workstation - Priority 2
      { model: 'DDR4-3600 48GB', searchTerms: ['DDR4 3600MHz 48GB'], manufacturer: 'Various', priority: 2, type: 'DDR4', speed: 3600, tier: 'workstation' },
      { model: 'DDR4-3200 48GB', searchTerms: ['DDR4 3200MHz 48GB'], manufacturer: 'Various', priority: 2, type: 'DDR4', speed: 3200, tier: 'workstation' },

      // DDR4 High Capacity 64GB Workstation - Priority 2
      { model: 'DDR4-3600 64GB', searchTerms: ['DDR4 3600MHz 64GB'], manufacturer: 'Various', priority: 2, type: 'DDR4', speed: 3600, tier: 'workstation' },
      { model: 'DDR4-3200 64GB', searchTerms: ['DDR4 3200MHz 64GB'], manufacturer: 'Various', priority: 2, type: 'DDR4', speed: 3200, tier: 'workstation' },
      { model: 'DDR4-2400 64GB', searchTerms: ['DDR4 2400MHz 64GB'], manufacturer: 'Various', priority: 2, type: 'DDR4', speed: 2400, tier: 'workstation' },

      // DDR4 128GB Workstation - Priority 2
      { model: 'DDR4-2666 128GB', searchTerms: ['DDR4 2666MHz 128GB'], manufacturer: 'Various', priority: 2, type: 'DDR4', speed: 2666, tier: 'workstation' },

      // ============================================================
      // BRAND-SPECIFIC PREMIUM RAM
      // ============================================================

      // Brand-Specific DDR5 - Priority 3
      { model: 'Corsair Dominator DDR5', searchTerms: ['Corsair Dominator DDR5'], manufacturer: 'Corsair', priority: 3, type: 'DDR5', speed: 6000, tier: 'premium' },
      { model: 'Corsair Vengeance DDR5', searchTerms: ['Corsair Vengeance DDR5'], manufacturer: 'Corsair', priority: 3, type: 'DDR5', speed: 5600, tier: 'premium' },
      { model: 'G.Skill Trident Z5 DDR5', searchTerms: ['G.Skill Trident Z5 DDR5'], manufacturer: 'G.Skill', priority: 3, type: 'DDR5', speed: 6000, tier: 'premium' },
      { model: 'G.Skill Flare X5 DDR5', searchTerms: ['G.Skill Flare X5 DDR5'], manufacturer: 'G.Skill', priority: 3, type: 'DDR5', speed: 6000, tier: 'premium' },
      { model: 'Kingston Fury Beast DDR5', searchTerms: ['Kingston Fury Beast DDR5'], manufacturer: 'Kingston', priority: 3, type: 'DDR5', speed: 5600, tier: 'mainstream' },
      { model: 'Kingston Fury Renegade DDR5', searchTerms: ['Kingston Fury Renegade DDR5'], manufacturer: 'Kingston', priority: 3, type: 'DDR5', speed: 6400, tier: 'premium' },
      { model: 'TeamGroup T-Force Delta DDR5', searchTerms: ['TeamGroup T-Force Delta DDR5'], manufacturer: 'TeamGroup', priority: 3, type: 'DDR5', speed: 6000, tier: 'premium' },
      { model: 'ADATA XPG Lancer DDR5', searchTerms: ['ADATA XPG Lancer DDR5'], manufacturer: 'ADATA', priority: 3, type: 'DDR5', speed: 5600, tier: 'mainstream' },
      { model: 'Crucial DDR5 Pro', searchTerms: ['Crucial DDR5 Pro'], manufacturer: 'Crucial', priority: 3, type: 'DDR5', speed: 5600, tier: 'mainstream' },

      // Brand-Specific DDR4 - Priority 3
      { model: 'G.Skill Trident Z DDR4', searchTerms: ['G.Skill Trident Z DDR4'], manufacturer: 'G.Skill', priority: 3, type: 'DDR4', speed: 3600, tier: 'premium' },
      { model: 'Corsair Vengeance RGB DDR4', searchTerms: ['Corsair Vengeance RGB DDR4'], manufacturer: 'Corsair', priority: 3, type: 'DDR4', speed: 3600, tier: 'high-end' },
      { model: 'Crucial Ballistix DDR4', searchTerms: ['Crucial Ballistix DDR4'], manufacturer: 'Crucial', priority: 3, type: 'DDR4', speed: 3200, tier: 'mainstream' },
      { model: 'Crucial Ballistix MAX DDR4', searchTerms: ['Crucial Ballistix MAX DDR4'], manufacturer: 'Crucial', priority: 3, type: 'DDR4', speed: 4000, tier: 'premium' },
      { model: 'Kingston Fury Renegade DDR4', searchTerms: ['Kingston Fury Renegade DDR4'], manufacturer: 'Kingston', priority: 3, type: 'DDR4', speed: 3600, tier: 'premium' },
      { model: 'TeamGroup T-Force Vulcan DDR4', searchTerms: ['TeamGroup T-Force Vulcan DDR4'], manufacturer: 'TeamGroup', priority: 3, type: 'DDR4', speed: 3200, tier: 'mainstream' },
      { model: 'ADATA XPG Spectrix DDR4', searchTerms: ['ADATA XPG Spectrix DDR4'], manufacturer: 'ADATA', priority: 3, type: 'DDR4', speed: 3600, tier: 'high-end' },
      { model: 'Patriot Viper Steel DDR4', searchTerms: ['Patriot Viper Steel DDR4'], manufacturer: 'Patriot', priority: 3, type: 'DDR4', speed: 3600, tier: 'high-end' },

      // ============================================================
      // SO-DIMM LAPTOP RAM
      // ============================================================

      // DDR5 SO-DIMM Laptop - Priority 3
      { model: 'DDR5-5600 SO-DIMM 32GB', searchTerms: ['DDR5 5600MHz SO-DIMM 32GB laptop'], manufacturer: 'Various', priority: 3, type: 'DDR5', speed: 5600, tier: 'laptop' },
      { model: 'DDR5-5600 SO-DIMM 16GB', searchTerms: ['DDR5 5600MHz SO-DIMM 16GB laptop'], manufacturer: 'Various', priority: 3, type: 'DDR5', speed: 5600, tier: 'laptop' },
      { model: 'DDR5-5200 SO-DIMM 16GB', searchTerms: ['DDR5 5200MHz SO-DIMM 16GB laptop'], manufacturer: 'Various', priority: 3, type: 'DDR5', speed: 5200, tier: 'laptop' },
      { model: 'DDR5-4800 SO-DIMM 16GB', searchTerms: ['DDR5 4800MHz SO-DIMM 16GB laptop'], manufacturer: 'Various', priority: 3, type: 'DDR5', speed: 4800, tier: 'laptop' },

      // DDR4 SO-DIMM Laptop - Priority 3
      { model: 'DDR4-3200 SO-DIMM 32GB', searchTerms: ['DDR4 3200MHz SO-DIMM 32GB laptop'], manufacturer: 'Various', priority: 3, type: 'DDR4', speed: 3200, tier: 'laptop' },
      { model: 'DDR4-3200 SO-DIMM 16GB', searchTerms: ['DDR4 3200MHz SO-DIMM 16GB laptop'], manufacturer: 'Various', priority: 3, type: 'DDR4', speed: 3200, tier: 'laptop' },
      { model: 'DDR4-2666 SO-DIMM 16GB', searchTerms: ['DDR4 2666MHz SO-DIMM 16GB laptop'], manufacturer: 'Various', priority: 3, type: 'DDR4', speed: 2666, tier: 'laptop' },
      { model: 'DDR4-2400 SO-DIMM 16GB', searchTerms: ['DDR4 2400MHz SO-DIMM 16GB laptop'], manufacturer: 'Various', priority: 3, type: 'DDR4', speed: 2400, tier: 'laptop' }
    ];
  }

  // Generate Amazon search URL
  generateSearchUrl(searchTerm) {
    const query = searchTerm.toLowerCase().replace(/\s+/g, '+');
    return `https://www.amazon.com/s?k=${query}&ref=nb_sb_noss`;
  }

  // Import RAM modules based on filters
  async importRamModules(options = {}) {
    const {
      memoryType = ['DDR4', 'DDR5'],
      priority = [1, 2],
      maxModels = null,
      startFrom = null,
      tier = null
    } = options;

    Logger.info('🧠 Starting Bulk RAM Import...');
    Logger.info('============================\n');

    const allModels = this.getRamModels();

    // Filter models based on options
    let modelsToImport = allModels.filter(model =>
      memoryType.includes(model.type) &&
      priority.includes(model.priority) &&
      (!tier || model.tier === tier)
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

    Logger.info(`📋 Will import ${modelsToImport.length} RAM configurations\n`);

    try {
      await this.populator.connect();
      await this.populator.initBrowser();

      for (let i = 0; i < modelsToImport.length; i++) {
        const ramModel = modelsToImport[i];
        const { model, searchTerms, type, speed, tier } = ramModel;
        const progress = `[${i + 1}/${modelsToImport.length}]`;

        Logger.info(`\n${progress} Processing: ${model}`);
        Logger.info(`   Type: ${type} | Speed: ${speed}MHz | Tier: ${tier}`);

        try {
          // Use the first search term
          const searchUrl = this.generateSearchUrl(searchTerms[0]);
          const result = await this.populator.populateRamData(searchUrl, model);

          if (result.success) {
            this.results.successful++;
            this.results.modules[model] = {
              status: 'success',
              type: type,
              speed: speed,
              count: result.count,
              duplicates: result.duplicates,
              updated: result.updated
            };

            Logger.success(`✅ ${model}: ${result.count} new, ${result.duplicates} duplicates, ${result.updated} updated`);
          } else {
            this.results.failed++;
            this.results.modules[model] = {
              status: 'error',
              error: result.message || 'No RAM found',
              type: type,
              speed: speed
            };

            Logger.error(`❌ ${model}: Failed - ${result.message || 'No RAM found'}`);
          }

        } catch (error) {
          this.results.failed++;
          this.results.modules[model] = {
            status: 'error',
            error: error.message,
            type: type,
            speed: speed
          };

          Logger.error(`❌ ${model}: Error - ${error.message}`);
        }

        // Rate limiting - brief pause between imports
        if (i < modelsToImport.length - 1) {
          const delay = 3 + Math.random() * 2; // 3-5 seconds
          Logger.info(`⏳ Waiting ${delay.toFixed(1)}s before next import...`);
          await new Promise(resolve => setTimeout(resolve, delay * 1000));
        }
      }

      this.results.total = this.results.successful + this.results.failed;

      // Print final summary
      this.printSummary();

    } catch (error) {
      Logger.error(`💥 Bulk import failed: ${error.message}`);
      throw error;
    } finally {
      await this.populator.close();
    }
  }

  // Print import summary
  printSummary() {
    Logger.info('\n' + '='.repeat(80));
    Logger.info('📊 BULK RAM IMPORT SUMMARY');
    Logger.info('='.repeat(80));

    Logger.info(`📈 Overall Stats:`);
    Logger.info(`   Total Models: ${this.results.total}`);
    Logger.info(`   Successful: ${this.results.successful}`);
    Logger.info(`   Failed: ${this.results.failed}`);
    Logger.info(`   Success Rate: ${((this.results.successful / this.results.total) * 100).toFixed(1)}%`);

    const memoryTypes = {};
    const tiers = {};
    let totalRamCount = 0;
    let totalDuplicates = 0;
    let totalUpdated = 0;

    Logger.info(`\n💾 Module Details:`);
    Object.entries(this.results.modules).forEach(([model, info]) => {
      const status = info.status === 'success' ? '✅' : '❌';
      const countInfo = info.count ? ` (${info.count} new, ${info.duplicates} dupes, ${info.updated} updated)` : '';
      Logger.info(`   ${status} ${model.padEnd(30)} - ${info.type} @ ${info.speed}MHz${countInfo}`);

      if (info.error) {
        Logger.info(`      Error: ${info.error}`);
      }

      // Aggregate stats
      if (info.status === 'success') {
        totalRamCount += info.count || 0;
        totalDuplicates += info.duplicates || 0;
        totalUpdated += info.updated || 0;
      }

      memoryTypes[info.type] = (memoryTypes[info.type] || 0) + 1;
      tiers[info.tier || 'unknown'] = (tiers[info.tier || 'unknown'] || 0) + 1;
    });

    Logger.info(`\n🔧 By Memory Type:`);
    Object.entries(memoryTypes).forEach(([type, count]) => {
      Logger.info(`   ${type}: ${count} configurations imported`);
    });

    Logger.info(`\n🎯 By Performance Tier:`);
    Object.entries(tiers).forEach(([tier, count]) => {
      Logger.info(`   ${tier}: ${count} configurations`);
    });

    Logger.info(`\n📊 Database Stats:`);
    Logger.info(`   Total RAM modules found: ${totalRamCount}`);
    Logger.info(`   Duplicates skipped: ${totalDuplicates}`);
    Logger.info(`   Modules updated: ${totalUpdated}`);

    Logger.info('\n🎉 Bulk RAM import process completed!');
    Logger.info('='.repeat(80));
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  const options = {
    memoryType: ['DDR4', 'DDR5'],
    priority: [1, 2],
    maxModels: null,
    startFrom: null,
    tier: null
  };

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--ddr4-only') {
      options.memoryType = ['DDR4'];
    } else if (arg === '--ddr5-only') {
      options.memoryType = ['DDR5'];
    } else if (arg === '--priority-1') {
      options.priority = [1];
    } else if (arg === '--priority-2') {
      options.priority = [2];
    } else if (arg === '--high-end-only') {
      options.tier = 'high-end';
    } else if (arg === '--mainstream-only') {
      options.tier = 'mainstream';
    } else if (arg === '--extreme-only') {
      options.tier = 'extreme';
    } else if (arg === '--workstation-only') {
      options.tier = 'workstation';
    } else if (arg === '--limit' && i + 1 < args.length) {
      options.maxModels = parseInt(args[i + 1]);
      i++;
    } else if (arg === '--start-from' && i + 1 < args.length) {
      options.startFrom = args[i + 1];
      i++;
    } else if (arg === '--help') {
      console.log(`
Bulk RAM Import Script Usage:
=============================

node bulkRamImporter.js [options]

Options:
  --ddr4-only          Import only DDR4 RAM
  --ddr5-only          Import only DDR5 RAM
  --priority-1         Import only Priority 1 RAM (latest/popular)
  --priority-2         Import only Priority 2 RAM (budget/workstation)
  --extreme-only       Import only extreme performance RAM (7200MHz+)
  --high-end-only      Import only high-end gaming RAM
  --mainstream-only    Import only mainstream RAM
  --workstation-only   Import only high-capacity workstation RAM
  --limit N            Import only first N models
  --start-from MODEL   Resume from specific model
  --help               Show this help message

Examples:
  node bulkRamImporter.js                           # Import all RAM
  node bulkRamImporter.js --ddr5-only              # DDR5 only
  node bulkRamImporter.js --priority-1             # Priority 1 only
  node bulkRamImporter.js --ddr5-only --high-end-only  # DDR5 high-end
  node bulkRamImporter.js --limit 10               # Import first 10 models
      `);
      process.exit(0);
    }
  }

  const importer = new BulkRamImporter();

  try {
    await importer.importRamModules(options);
  } catch (error) {
    Logger.error(`💥 Import process failed: ${error.message}`);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  Logger.info('\n⏹️  Import process interrupted by user');
  process.exit(0);
});

if (require.main === module) {
  main();
}

module.exports = BulkRamImporter;
