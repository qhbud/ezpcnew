const { StorageDataPopulator } = require('./storageDataPopulator');
const Logger = require('./utils/logger');

async function populateStorage() {
    const populator = new StorageDataPopulator();

    try {
        Logger.info('🚀 Starting Storage database population...');

        await populator.connect();
        await populator.initBrowser();

        // Storage searches covering HDDs, M.2 SSDs, and 2.5" SSDs at various capacities
        const storageSearches = [
            // NVMe M.2 SSDs - High Performance
            {
                url: 'https://www.amazon.com/s?k=1TB+NVMe+M.2+SSD+PCIe+4.0&ref=sr_nr_p_36_1',
                model: '1tb_nvme_pcie4'
            },
            {
                url: 'https://www.amazon.com/s?k=2TB+NVMe+M.2+SSD+PCIe+4.0&ref=sr_nr_p_36_1',
                model: '2tb_nvme_pcie4'
            },
            {
                url: 'https://www.amazon.com/s?k=500GB+NVMe+M.2+SSD&ref=sr_nr_p_36_1',
                model: '500gb_nvme'
            },
            {
                url: 'https://www.amazon.com/s?k=4TB+NVMe+M.2+SSD&ref=sr_nr_p_36_1',
                model: '4tb_nvme'
            },
            {
                url: 'https://www.amazon.com/s?k=Samsung+970+EVO+Plus+NVMe&ref=sr_nr_p_36_1',
                model: 'samsung_970_evo_plus'
            },
            {
                url: 'https://www.amazon.com/s?k=WD+Black+SN850X+NVMe&ref=sr_nr_p_36_1',
                model: 'wd_black_sn850x'
            },
            {
                url: 'https://www.amazon.com/s?k=Samsung+980+PRO+NVMe&ref=sr_nr_p_36_1',
                model: 'samsung_980_pro'
            },
            {
                url: 'https://www.amazon.com/s?k=Crucial+P5+Plus+NVMe&ref=sr_nr_p_36_1',
                model: 'crucial_p5_plus'
            },

            // M.2 SATA SSDs
            {
                url: 'https://www.amazon.com/s?k=1TB+M.2+SATA+SSD&ref=sr_nr_p_36_1',
                model: '1tb_m2_sata'
            },
            {
                url: 'https://www.amazon.com/s?k=500GB+M.2+SATA+SSD&ref=sr_nr_p_36_1',
                model: '500gb_m2_sata'
            },
            {
                url: 'https://www.amazon.com/s?k=2TB+M.2+SATA+SSD&ref=sr_nr_p_36_1',
                model: '2tb_m2_sata'
            },

            // 2.5" SATA SSDs
            {
                url: 'https://www.amazon.com/s?k=1TB+2.5+inch+SATA+SSD&ref=sr_nr_p_36_1',
                model: '1tb_ssd_25'
            },
            {
                url: 'https://www.amazon.com/s?k=500GB+2.5+inch+SATA+SSD&ref=sr_nr_p_36_1',
                model: '500gb_ssd_25'
            },
            {
                url: 'https://www.amazon.com/s?k=2TB+2.5+inch+SATA+SSD&ref=sr_nr_p_36_1',
                model: '2tb_ssd_25'
            },
            {
                url: 'https://www.amazon.com/s?k=4TB+2.5+inch+SATA+SSD&ref=sr_nr_p_36_1',
                model: '4tb_ssd_25'
            },
            {
                url: 'https://www.amazon.com/s?k=Samsung+870+EVO+SSD&ref=sr_nr_p_36_1',
                model: 'samsung_870_evo'
            },
            {
                url: 'https://www.amazon.com/s?k=Crucial+MX500+SSD&ref=sr_nr_p_36_1',
                model: 'crucial_mx500'
            },
            {
                url: 'https://www.amazon.com/s?k=WD+Blue+SSD+2.5&ref=sr_nr_p_36_1',
                model: 'wd_blue_ssd'
            },
            {
                url: 'https://www.amazon.com/s?k=Kingston+A400+SSD&ref=sr_nr_p_36_1',
                model: 'kingston_a400'
            },

            // Hard Drives - 3.5" Desktop
            {
                url: 'https://www.amazon.com/s?k=1TB+3.5+inch+HDD+7200RPM&ref=sr_nr_p_36_1',
                model: '1tb_hdd_7200'
            },
            {
                url: 'https://www.amazon.com/s?k=2TB+3.5+inch+HDD+7200RPM&ref=sr_nr_p_36_1',
                model: '2tb_hdd_7200'
            },
            {
                url: 'https://www.amazon.com/s?k=4TB+3.5+inch+HDD+7200RPM&ref=sr_nr_p_36_1',
                model: '4tb_hdd_7200'
            },
            {
                url: 'https://www.amazon.com/s?k=8TB+3.5+inch+HDD&ref=sr_nr_p_36_1',
                model: '8tb_hdd'
            },
            {
                url: 'https://www.amazon.com/s?k=10TB+3.5+inch+HDD&ref=sr_nr_p_36_1',
                model: '10tb_hdd'
            },
            {
                url: 'https://www.amazon.com/s?k=12TB+3.5+inch+HDD&ref=sr_nr_p_36_1',
                model: '12tb_hdd'
            },
            {
                url: 'https://www.amazon.com/s?k=Seagate+Barracuda+HDD&ref=sr_nr_p_36_1',
                model: 'seagate_barracuda'
            },
            {
                url: 'https://www.amazon.com/s?k=WD+Blue+HDD+desktop&ref=sr_nr_p_36_1',
                model: 'wd_blue_hdd'
            },
            {
                url: 'https://www.amazon.com/s?k=WD+Black+HDD+performance&ref=sr_nr_p_36_1',
                model: 'wd_black_hdd'
            },
            {
                url: 'https://www.amazon.com/s?k=Seagate+IronWolf+NAS+HDD&ref=sr_nr_p_36_1',
                model: 'seagate_ironwolf'
            },

            // Hard Drives - 2.5" Laptop/Portable
            {
                url: 'https://www.amazon.com/s?k=1TB+2.5+inch+HDD+laptop&ref=sr_nr_p_36_1',
                model: '1tb_hdd_25_laptop'
            },
            {
                url: 'https://www.amazon.com/s?k=2TB+2.5+inch+HDD+portable&ref=sr_nr_p_36_1',
                model: '2tb_hdd_25_portable'
            },
            {
                url: 'https://www.amazon.com/s?k=500GB+2.5+inch+HDD&ref=sr_nr_p_36_1',
                model: '500gb_hdd_25'
            },

            // Popular Brands - NVMe
            {
                url: 'https://www.amazon.com/s?k=Corsair+MP600+NVMe&ref=sr_nr_p_36_1',
                model: 'corsair_mp600'
            },
            {
                url: 'https://www.amazon.com/s?k=Sabrent+Rocket+NVMe&ref=sr_nr_p_36_1',
                model: 'sabrent_rocket'
            },
            {
                url: 'https://www.amazon.com/s?k=SK+Hynix+P31+NVMe&ref=sr_nr_p_36_1',
                model: 'sk_hynix_p31'
            },
            {
                url: 'https://www.amazon.com/s?k=ADATA+XPG+SX8200+NVMe&ref=sr_nr_p_36_1',
                model: 'adata_xpg_sx8200'
            },

            // Budget Options
            {
                url: 'https://www.amazon.com/s?k=budget+NVMe+SSD+500GB&ref=sr_nr_p_36_1',
                model: 'budget_nvme_500gb'
            },
            {
                url: 'https://www.amazon.com/s?k=budget+2.5+SSD+1TB&ref=sr_nr_p_36_1',
                model: 'budget_ssd_1tb'
            },
            {
                url: 'https://www.amazon.com/s?k=value+HDD+4TB&ref=sr_nr_p_36_1',
                model: 'value_hdd_4tb'
            },

            // High Capacity Storage
            {
                url: 'https://www.amazon.com/s?k=16TB+hard+drive&ref=sr_nr_p_36_1',
                model: '16tb_hdd'
            },
            {
                url: 'https://www.amazon.com/s?k=8TB+NVMe+SSD&ref=sr_nr_p_36_1',
                model: '8tb_nvme'
            },

            // Gaming Focused
            {
                url: 'https://www.amazon.com/s?k=gaming+SSD+1TB+fast&ref=sr_nr_p_36_1',
                model: 'gaming_ssd_1tb'
            },
            {
                url: 'https://www.amazon.com/s?k=PS5+compatible+NVMe+SSD&ref=sr_nr_p_36_1',
                model: 'ps5_nvme'
            },

            // External/Portable (bonus)
            {
                url: 'https://www.amazon.com/s?k=external+SSD+portable+1TB&ref=sr_nr_p_36_1',
                model: 'external_ssd_1tb'
            }
        ];

        let totalNew = 0;
        let totalDuplicates = 0;
        let totalUpdated = 0;
        const results = [];

        Logger.info(`📋 Planning to scrape ${storageSearches.length} different storage categories`);

        for (let i = 0; i < storageSearches.length; i++) {
            const { url, model } = storageSearches[i];

            try {
                Logger.info(`\n🔄 [${i + 1}/${storageSearches.length}] Processing: ${model}`);
                Logger.info(`   URL: ${url}`);

                const result = await populator.populateStorageData(url, model);

                if (result.success) {
                    totalNew += result.count || 0;
                    totalDuplicates += result.duplicates || 0;
                    totalUpdated += result.updated || 0;

                    Logger.success(`✅ [${i + 1}/${storageSearches.length}] Success: ${result.count} new, ${result.duplicates} duplicates, ${result.updated} updated`);
                } else {
                    Logger.warn(`⚠️  [${i + 1}/${storageSearches.length}] No data found for ${model}`);
                }

                results.push({
                    model,
                    url,
                    success: result.success,
                    count: result.count || 0,
                    duplicates: result.duplicates || 0,
                    updated: result.updated || 0
                });

                // Add delay between requests to be respectful
                if (i < storageSearches.length - 1) {
                    Logger.info('⏳ Waiting 3 seconds before next request...');
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }

            } catch (error) {
                Logger.error(`❌ [${i + 1}/${storageSearches.length}] Failed: ${model} - ${error.message}`);
                results.push({
                    model,
                    url,
                    success: false,
                    error: error.message
                });
                continue;
            }
        }

        // Final summary
        Logger.info('\n' + '='.repeat(80));
        Logger.info('📊 STORAGE DATABASE POPULATION COMPLETE');
        Logger.info('='.repeat(80));

        const totalSuccess = results.filter(r => r.success).length;
        const totalFailed = results.filter(r => !r.success).length;

        Logger.success(`✅ Successful categories: ${totalSuccess}`);
        Logger.error(`❌ Failed categories: ${totalFailed}`);
        Logger.info(`📋 Total categories processed: ${storageSearches.length}`);

        Logger.info('\n🎯 FINAL TOTALS:');
        Logger.success(`   New storage devices added: ${totalNew}`);
        Logger.info(`   Duplicates skipped: ${totalDuplicates}`);
        Logger.info(`   Existing storage updated: ${totalUpdated}`);
        Logger.info(`   Total storage processed: ${totalNew + totalDuplicates + totalUpdated}`);

        // Check final database count
        Logger.info('\n🔍 Checking final database count...');
        const collection = populator.db.collection('storages');
        const finalCount = await collection.countDocuments();

        Logger.success(`📦 Final storage devices in database: ${finalCount}`);

        // Show detailed results
        Logger.info('\n📈 DETAILED RESULTS:');
        results.forEach((result, index) => {
            if (result.success) {
                Logger.info(`   ${index + 1}. ${result.model}: ${result.count} new, ${result.duplicates} duplicates, ${result.updated} updated`);
            } else {
                Logger.warn(`   ${index + 1}. ${result.model}: FAILED - ${result.error || 'No data found'}`);
            }
        });

        Logger.info('='.repeat(80));

    } catch (error) {
        Logger.error('💥 Fatal error during storage database population:', error);
        throw error;
    } finally {
        await populator.close();
        Logger.info('🚪 Cleanup completed');
    }
}

// Run the population if this script is executed directly
if (require.main === module) {
    populateStorage()
        .then(() => {
            Logger.success('\n🎉 Storage database population completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            Logger.error('\n💥 Storage database population failed:', error);
            process.exit(1);
        });
}

module.exports = { populateStorage };
