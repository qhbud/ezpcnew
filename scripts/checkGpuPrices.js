const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pcbuilder';

async function checkGpuPrices() {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB\n');

        const db = client.db('pcbuilder');

        // Get all GPU collections
        const gpuCollections = await db.listCollections({ name: /^gpus_/ }).toArray();
        const collections = ['gpus', ...gpuCollections.map(c => c.name)];

        let totalGpus = 0;
        let withCurrentPrice = 0;
        let withPrice = 0;
        let withoutPrice = 0;
        let priceZero = 0;

        const gpusWithoutPrice = [];
        const gpusWithZeroPrice = [];

        console.log('=== Checking GPU Prices ===\n');

        for (const collectionName of collections) {
            try {
                const collection = db.collection(collectionName);
                const gpus = await collection.find({}).toArray();

                if (gpus.length === 0) continue;

                console.log(`\n${collectionName} (${gpus.length} GPUs):`);

                for (const gpu of gpus) {
                    totalGpus++;
                    const name = gpu.name || gpu.title || 'Unnamed';
                    const currentPrice = parseFloat(gpu.currentPrice);
                    const price = parseFloat(gpu.price);

                    if (currentPrice && currentPrice > 0) {
                        withCurrentPrice++;
                        console.log(`  ✓ ${name}: $${currentPrice.toFixed(2)} (currentPrice)`);
                    } else if (price && price > 0) {
                        withPrice++;
                        console.log(`  ⚠ ${name}: $${price.toFixed(2)} (price field only, no currentPrice)`);
                    } else if (currentPrice === 0 || price === 0) {
                        priceZero++;
                        console.log(`  ✗ ${name}: $0.00 (price is zero)`);
                        gpusWithZeroPrice.push({
                            collection: collectionName,
                            name: name,
                            currentPrice: currentPrice || 0,
                            price: price || 0,
                            link: gpu.sourceUrl || gpu.url || 'No link',
                            id: gpu._id
                        });
                    } else {
                        withoutPrice++;
                        console.log(`  ✗ ${name}: No price`);
                        gpusWithoutPrice.push({
                            collection: collectionName,
                            name: name,
                            link: gpu.sourceUrl || gpu.url || 'No link',
                            id: gpu._id
                        });
                    }
                }
            } catch (err) {
                console.error(`Error checking ${collectionName}: ${err.message}`);
            }
        }

        console.log('\n\n=== SUMMARY ===');
        console.log(`Total GPUs checked: ${totalGpus}`);
        console.log(`GPUs with currentPrice > 0: ${withCurrentPrice}`);
        console.log(`GPUs with price > 0 (but no currentPrice): ${withPrice}`);
        console.log(`GPUs with $0.00 price: ${priceZero}`);
        console.log(`GPUs with no price at all: ${withoutPrice}`);
        console.log(`\nPercentage with valid pricing: ${((withCurrentPrice + withPrice) / totalGpus * 100).toFixed(2)}%`);

        if (gpusWithZeroPrice.length > 0) {
            console.log('\n\n=== GPUs WITH ZERO PRICE ===');
            gpusWithZeroPrice.forEach((gpu, i) => {
                console.log(`\n${i + 1}. ${gpu.name}`);
                console.log(`   Collection: ${gpu.collection}`);
                console.log(`   Link: ${gpu.link}`);
            });
        }

        if (gpusWithoutPrice.length > 0) {
            console.log('\n\n=== GPUs WITH NO PRICE ===');
            gpusWithoutPrice.forEach((gpu, i) => {
                console.log(`\n${i + 1}. ${gpu.name}`);
                console.log(`   Collection: ${gpu.collection}`);
                console.log(`   Link: ${gpu.link}`);
            });
        }

        // Save report
        const fs = require('fs');
        const report = {
            summary: {
                total: totalGpus,
                withCurrentPrice,
                withPrice,
                priceZero,
                withoutPrice
            },
            gpusWithZeroPrice,
            gpusWithoutPrice
        };
        fs.writeFileSync('gpu-price-report.json', JSON.stringify(report, null, 2));
        console.log(`\n\nDetailed report saved to: gpu-price-report.json`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
        console.log('\nDisconnected from MongoDB');
    }
}

checkGpuPrices();
