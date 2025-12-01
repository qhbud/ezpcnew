const { CaseDataPopulator } = require('./caseDataPopulator');
const Logger = require('./utils/logger');

async function populateCases() {
    const populator = new CaseDataPopulator();

    try {
        Logger.info('🚀 Starting PC Case database population...');

        await populator.connect();
        await populator.initBrowser();

        // Case searches covering different form factors, brands, and features
        const caseSearches = [
            // ATX Cases - Popular Brands
            {
                url: 'https://www.amazon.com/s?k=NZXT+H510+ATX+case&ref=sr_nr_p_36_1',
                model: 'nzxt_h510'
            },
            {
                url: 'https://www.amazon.com/s?k=Corsair+4000D+ATX+case&ref=sr_nr_p_36_1',
                model: 'corsair_4000d'
            },
            {
                url: 'https://www.amazon.com/s?k=Fractal+Design+Meshify+ATX&ref=sr_nr_p_36_1',
                model: 'fractal_meshify'
            },
            {
                url: 'https://www.amazon.com/s?k=Lian+Li+Lancool+ATX&ref=sr_nr_p_36_1',
                model: 'lian_li_lancool'
            },
            {
                url: 'https://www.amazon.com/s?k=Phanteks+Eclipse+ATX+case&ref=sr_nr_p_36_1',
                model: 'phanteks_eclipse'
            },
            {
                url: 'https://www.amazon.com/s?k=be+quiet+Pure+Base+ATX&ref=sr_nr_p_36_1',
                model: 'be_quiet_pure_base'
            },
            {
                url: 'https://www.amazon.com/s?k=Cooler+Master+MasterBox+ATX&ref=sr_nr_p_36_1',
                model: 'cooler_master_masterbox'
            },

            // ATX RGB Cases
            {
                url: 'https://www.amazon.com/s?k=ATX+PC+case+RGB+lighting&ref=sr_nr_p_36_1',
                model: 'atx_rgb_case'
            },
            {
                url: 'https://www.amazon.com/s?k=gaming+PC+case+RGB+ATX&ref=sr_nr_p_36_1',
                model: 'gaming_atx_rgb'
            },
            {
                url: 'https://www.amazon.com/s?k=NZXT+Kraken+RGB+case&ref=sr_nr_p_36_1',
                model: 'nzxt_rgb'
            },
            {
                url: 'https://www.amazon.com/s?k=Corsair+iCUE+RGB+case&ref=sr_nr_p_36_1',
                model: 'corsair_icue_rgb'
            },

            // Tempered Glass Cases
            {
                url: 'https://www.amazon.com/s?k=ATX+tempered+glass+case&ref=sr_nr_p_36_1',
                model: 'atx_tempered_glass'
            },
            {
                url: 'https://www.amazon.com/s?k=mid+tower+tempered+glass+PC+case&ref=sr_nr_p_36_1',
                model: 'mid_tower_glass'
            },

            // Mesh/Airflow Cases
            {
                url: 'https://www.amazon.com/s?k=mesh+front+ATX+case+airflow&ref=sr_nr_p_36_1',
                model: 'mesh_airflow_atx'
            },
            {
                url: 'https://www.amazon.com/s?k=high+airflow+PC+case&ref=sr_nr_p_36_1',
                model: 'high_airflow_case'
            },

            // mATX Cases
            {
                url: 'https://www.amazon.com/s?k=micro+ATX+PC+case&ref=sr_nr_p_36_1',
                model: 'micro_atx_case'
            },
            {
                url: 'https://www.amazon.com/s?k=mATX+case+compact&ref=sr_nr_p_36_1',
                model: 'matx_compact'
            },
            {
                url: 'https://www.amazon.com/s?k=Cooler+Master+mATX+case&ref=sr_nr_p_36_1',
                model: 'cooler_master_matx'
            },
            {
                url: 'https://www.amazon.com/s?k=Fractal+Design+mATX&ref=sr_nr_p_36_1',
                model: 'fractal_matx'
            },

            // Mini ITX Cases
            {
                url: 'https://www.amazon.com/s?k=Mini+ITX+PC+case&ref=sr_nr_p_36_1',
                model: 'mini_itx_case'
            },
            {
                url: 'https://www.amazon.com/s?k=small+form+factor+ITX+case&ref=sr_nr_p_36_1',
                model: 'sff_itx'
            },
            {
                url: 'https://www.amazon.com/s?k=NZXT+H1+ITX&ref=sr_nr_p_36_1',
                model: 'nzxt_h1'
            },
            {
                url: 'https://www.amazon.com/s?k=Cooler+Master+NR200+ITX&ref=sr_nr_p_36_1',
                model: 'cooler_master_nr200'
            },
            {
                url: 'https://www.amazon.com/s?k=Lian+Li+ITX+case&ref=sr_nr_p_36_1',
                model: 'lian_li_itx'
            },

            // White Cases
            {
                url: 'https://www.amazon.com/s?k=white+ATX+PC+case&ref=sr_nr_p_36_1',
                model: 'white_atx_case'
            },
            {
                url: 'https://www.amazon.com/s?k=white+gaming+case+RGB&ref=sr_nr_p_36_1',
                model: 'white_rgb_case'
            },

            // Full Tower Cases
            {
                url: 'https://www.amazon.com/s?k=full+tower+ATX+case&ref=sr_nr_p_36_1',
                model: 'full_tower_atx'
            },
            {
                url: 'https://www.amazon.com/s?k=E-ATX+full+tower+case&ref=sr_nr_p_36_1',
                model: 'eatx_full_tower'
            },

            // Budget Cases
            {
                url: 'https://www.amazon.com/s?k=budget+ATX+case+under+50&ref=sr_nr_p_36_1',
                model: 'budget_atx'
            },
            {
                url: 'https://www.amazon.com/s?k=affordable+PC+case+ATX&ref=sr_nr_p_36_1',
                model: 'affordable_atx'
            },

            // Premium Cases
            {
                url: 'https://www.amazon.com/s?k=Lian+Li+O11+Dynamic&ref=sr_nr_p_36_1',
                model: 'lian_li_o11'
            },
            {
                url: 'https://www.amazon.com/s?k=Corsair+5000D+Airflow&ref=sr_nr_p_36_1',
                model: 'corsair_5000d'
            },
            {
                url: 'https://www.amazon.com/s?k=Fractal+Design+Define+7&ref=sr_nr_p_36_1',
                model: 'fractal_define_7'
            },

            // Specific Popular Models
            {
                url: 'https://www.amazon.com/s?k=NZXT+H7+Flow&ref=sr_nr_p_36_1',
                model: 'nzxt_h7_flow'
            },
            {
                url: 'https://www.amazon.com/s?k=Phanteks+P500A&ref=sr_nr_p_36_1',
                model: 'phanteks_p500a'
            },
            {
                url: 'https://www.amazon.com/s?k=Cooler+Master+H500&ref=sr_nr_p_36_1',
                model: 'cooler_master_h500'
            },
            {
                url: 'https://www.amazon.com/s?k=Thermaltake+View+case&ref=sr_nr_p_36_1',
                model: 'thermaltake_view'
            }
        ];

        let totalNew = 0;
        let totalDuplicates = 0;
        let totalUpdated = 0;
        const results = [];

        Logger.info(`📋 Planning to scrape ${caseSearches.length} different case categories`);

        for (let i = 0; i < caseSearches.length; i++) {
            const { url, model } = caseSearches[i];

            try {
                Logger.info(`\n🔄 [${i + 1}/${caseSearches.length}] Processing: ${model}`);
                Logger.info(`   URL: ${url}`);

                const result = await populator.populateCaseData(url, model);

                if (result.success) {
                    totalNew += result.count || 0;
                    totalDuplicates += result.duplicates || 0;
                    totalUpdated += result.updated || 0;

                    Logger.success(`✅ [${i + 1}/${caseSearches.length}] Success: ${result.count} new, ${result.duplicates} duplicates, ${result.updated} updated`);
                } else {
                    Logger.warn(`⚠️  [${i + 1}/${caseSearches.length}] No data found for ${model}`);
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
                if (i < caseSearches.length - 1) {
                    Logger.info('⏳ Waiting 3 seconds before next request...');
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }

            } catch (error) {
                Logger.error(`❌ [${i + 1}/${caseSearches.length}] Failed: ${model} - ${error.message}`);
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
        Logger.info('📊 PC CASE DATABASE POPULATION COMPLETE');
        Logger.info('='.repeat(80));

        const totalSuccess = results.filter(r => r.success).length;
        const totalFailed = results.filter(r => !r.success).length;

        Logger.success(`✅ Successful categories: ${totalSuccess}`);
        Logger.error(`❌ Failed categories: ${totalFailed}`);
        Logger.info(`📋 Total categories processed: ${caseSearches.length}`);

        Logger.info('\n🎯 FINAL TOTALS:');
        Logger.success(`   New cases added: ${totalNew}`);
        Logger.info(`   Duplicates skipped: ${totalDuplicates}`);
        Logger.info(`   Existing cases updated: ${totalUpdated}`);
        Logger.info(`   Total cases processed: ${totalNew + totalDuplicates + totalUpdated}`);

        // Check final database count
        Logger.info('\n🔍 Checking final database count...');
        const collection = populator.db.collection('cases');
        const finalCount = await collection.countDocuments();

        Logger.success(`📦 Final cases in database: ${finalCount}`);

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

        if (finalCount >= 30) {
            Logger.success(`\n🎉 SUCCESS: Database populated with ${finalCount} cases (target: 30+)!`);
        } else {
            Logger.warn(`\n⚠️  WARNING: Only ${finalCount} cases in database (target: 30+)`);
        }

    } catch (error) {
        Logger.error('💥 Fatal error during case database population:', error);
        throw error;
    } finally {
        await populator.close();
        Logger.info('🚪 Cleanup completed');
    }
}

// Run the population if this script is executed directly
if (require.main === module) {
    populateCases()
        .then(() => {
            Logger.success('\n🎉 PC Case database population completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            Logger.error('\n💥 PC Case database population failed:', error);
            process.exit(1);
        });
}

module.exports = { populateCases };
