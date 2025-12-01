const { connectToDatabase } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function generatePriceReport() {
    console.log('📊 Generating comprehensive GPU price report...');

    try {
        const db = await connectToDatabase();

        // Get all GPU collections
        const collections = await db.listCollections().toArray();
        const gpuCollections = collections
            .filter(col => col.name.startsWith('gpus_'))
            .map(col => col.name)
            .sort();

        console.log(`🔍 Found ${gpuCollections.length} GPU collections`);

        let report = [];
        let totalGpus = 0;
        let gpusWithHistory = 0;
        let totalPriceEntries = 0;

        // Header for the report
        report.push('='.repeat(120));
        report.push('📊 COMPREHENSIVE GPU PRICE REPORT');
        report.push(`📅 Generated: ${new Date().toLocaleString()}`);
        report.push('='.repeat(120));
        report.push('');

        for (const collectionName of gpuCollections) {
            const modelName = collectionName.replace('gpus_', '').toUpperCase().replace(/_/g, ' ');
            report.push(`🎯 ${modelName}`);
            report.push('-'.repeat(80));

            const collection = db.collection(collectionName);
            const gpus = await collection.find({}).toArray();

            if (gpus.length === 0) {
                report.push('   ❌ No GPUs found in this collection');
                report.push('');
                continue;
            }

            totalGpus += gpus.length;

            for (let i = 0; i < gpus.length; i++) {
                const gpu = gpus[i];
                const gpuNumber = i + 1;

                // GPU basic info
                report.push(`   ${gpuNumber}. ${gpu.name}`);
                report.push(`      💰 Current Price: $${gpu.currentPrice}`);
                report.push(`      💳 Base Price: $${gpu.basePrice}`);
                report.push(`      🏷️  Sale Price: ${gpu.salePrice ? '$' + gpu.salePrice : 'N/A'}`);
                report.push(`      🔥 On Sale: ${gpu.isOnSale ? 'YES' : 'No'}`);
                report.push(`      🏪 Source: ${gpu.source || 'Unknown'}`);
                report.push(`      📅 Last Updated: ${gpu.lastUpdated ? new Date(gpu.lastUpdated).toLocaleString() : 'Unknown'}`);

                // Price history
                if (gpu.priceHistory && gpu.priceHistory.length > 0) {
                    gpusWithHistory++;
                    totalPriceEntries += gpu.priceHistory.length;

                    report.push(`      📈 Price History (${gpu.priceHistory.length} entries):`);

                    // Sort by date (oldest first)
                    const sortedHistory = gpu.priceHistory.sort((a, b) => new Date(a.date) - new Date(b.date));

                    sortedHistory.forEach((entry, index) => {
                        const date = new Date(entry.date).toLocaleDateString();
                        const time = new Date(entry.date).toLocaleTimeString();
                        const saleInfo = entry.isOnSale ? ' (ON SALE!)' : '';
                        const priceChange = index > 0 ?
                            (entry.currentPrice - sortedHistory[index - 1].currentPrice) : 0;
                        const changeIndicator = priceChange > 0 ? ' ⬆️' : priceChange < 0 ? ' ⬇️' : '';

                        report.push(`         ${index + 1}. ${date} ${time}: $${entry.currentPrice} (Base: $${entry.basePrice})${saleInfo}${changeIndicator}`);

                        if (priceChange !== 0) {
                            report.push(`            📊 Change: ${priceChange > 0 ? '+' : ''}$${priceChange.toFixed(2)}`);
                        }
                    });

                    // Price trend analysis
                    if (sortedHistory.length > 1) {
                        const firstPrice = sortedHistory[0].currentPrice;
                        const lastPrice = sortedHistory[sortedHistory.length - 1].currentPrice;
                        const totalChange = lastPrice - firstPrice;
                        const percentChange = ((totalChange / firstPrice) * 100).toFixed(2);

                        const trendIcon = totalChange > 0 ? '📈' : totalChange < 0 ? '📉' : '➡️';
                        const trendText = totalChange > 0 ? 'INCREASED' : totalChange < 0 ? 'DECREASED' : 'STABLE';

                        report.push(`      ${trendIcon} Overall Trend: ${trendText} by $${Math.abs(totalChange).toFixed(2)} (${Math.abs(percentChange)}%)`);
                    }
                } else {
                    report.push(`      ❌ No price history available`);
                }

                report.push('');
            }

            // Collection summary
            const collectionGpusWithHistory = gpus.filter(gpu => gpu.priceHistory && gpu.priceHistory.length > 0).length;
            const avgPrice = (gpus.reduce((sum, gpu) => sum + gpu.currentPrice, 0) / gpus.length).toFixed(2);
            const minPrice = Math.min(...gpus.map(gpu => gpu.currentPrice));
            const maxPrice = Math.max(...gpus.map(gpu => gpu.currentPrice));

            report.push(`   📊 ${modelName} Summary:`);
            report.push(`      • Total GPUs: ${gpus.length}`);
            report.push(`      • GPUs with price history: ${collectionGpusWithHistory}`);
            report.push(`      • Average price: $${avgPrice}`);
            report.push(`      • Price range: $${minPrice} - $${maxPrice}`);
            report.push('');
        }

        // Overall statistics
        report.push('='.repeat(120));
        report.push('📈 OVERALL STATISTICS');
        report.push('='.repeat(120));
        report.push(`📊 Total GPU Collections: ${gpuCollections.length}`);
        report.push(`🎯 Total GPUs: ${totalGpus}`);
        report.push(`📈 GPUs with price history: ${gpusWithHistory} (${((gpusWithHistory/totalGpus)*100).toFixed(1)}%)`);
        report.push(`📅 Total price data points: ${totalPriceEntries}`);
        report.push(`📊 Average price entries per GPU: ${(totalPriceEntries/Math.max(gpusWithHistory, 1)).toFixed(1)}`);

        // Data quality assessment
        report.push('');
        report.push('🔍 DATA QUALITY ASSESSMENT:');
        if (gpusWithHistory === totalGpus) {
            report.push('   ✅ EXCELLENT: All GPUs have price history data');
        } else {
            report.push(`   ⚠️  ${totalGpus - gpusWithHistory} GPUs are missing price history`);
        }

        if (totalPriceEntries >= totalGpus) {
            report.push('   ✅ GOOD: Price tracking system is operational');
        } else {
            report.push('   ❌ ISSUE: Price tracking system needs attention');
        }

        // Save report to file
        const reportContent = report.join('\\n');
        const reportPath = path.join(__dirname, '..', 'gpu_price_report.txt');
        fs.writeFileSync(reportPath, reportContent, 'utf8');

        console.log(`✅ Report saved to: ${reportPath}`);
        console.log(`📄 Report contains ${report.length} lines`);

        // Also output key statistics to console
        console.log('\\n📊 KEY STATISTICS:');
        console.log(`   • Total GPUs: ${totalGpus}`);
        console.log(`   • GPUs with price history: ${gpusWithHistory}`);
        console.log(`   • Total price entries: ${totalPriceEntries}`);

        // Output sample of the report (first few sections)
        console.log('\\n📄 SAMPLE FROM REPORT:');
        console.log('-'.repeat(80));
        console.log(report.slice(0, 50).join('\\n'));
        console.log('-'.repeat(80));
        console.log(`... (see full report in ${reportPath})`);

        return {
            reportPath,
            totalGpus,
            gpusWithHistory,
            totalPriceEntries,
            collections: gpuCollections.length
        };

    } catch (error) {
        console.error('❌ Error generating price report:', error);
        throw error;
    }
}

// Run the script if called directly
if (require.main === module) {
    generatePriceReport()
        .then((stats) => {
            console.log('\\n🎉 Price report generation completed!');
            console.log(`📊 Processed ${stats.collections} collections with ${stats.totalGpus} GPUs`);
            process.exit(0);
        })
        .catch((error) => {
            console.error('\\n💥 Report generation failed:', error);
            process.exit(1);
        });
}

module.exports = { generatePriceReport };