const { MongoClient } = require('mongodb');
const puppeteer = require('puppeteer');

async function extractCapacityFromAmazon(url) {
    const browser = await puppeteer.launch({ headless: true });
    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 10000 });

        // Get the full product title
        const title = await page.$eval('#productTitle', el => el.textContent.trim()).catch(() => null);

        if (title) {
            // Extract capacity from title
            const match = title.match(/(\d+(?:\.\d+)?)\s*(TB|GB)/i);
            if (match) {
                let capacity = parseFloat(match[1]);
                const unit = match[2].toUpperCase();
                if (unit === 'TB') {
                    capacity = capacity * 1000;
                }
                return { capacity, title };
            }
        }

        return { capacity: null, title };
    } catch (error) {
        console.error(`Error fetching ${url}:`, error.message);
        return { capacity: null, title: null };
    } finally {
        await browser.close();
    }
}

async function extractStorageCapacity() {
    console.log('🔄 Extracting storage capacity from Amazon...\n');

    const client = await MongoClient.connect('mongodb://localhost:27017');
    const db = client.db('pcbuilder');
    const collection = db.collection('storages');

    try {
        // Find WD_BLACK items still missing capacity
        const items = await collection.find({
            $and: [
                {
                    $or: [
                        { manufacturer: /WD.*BLACK/i },
                        { brand: /WD.*BLACK/i },
                        { name: /WD.*BLACK/i }
                    ]
                },
                {
                    $or: [
                        { capacity: null },
                        { capacity: 0 },
                        { capacity: { $exists: false } }
                    ]
                }
            ]
        }).limit(10).toArray();

        console.log(`Found ${items.length} WD_BLACK items missing capacity\n`);

        let updatedCount = 0;

        for (const item of items) {
            if (!item.url) {
                console.log(`⚠ Skipping ${item.name} - no URL`);
                continue;
            }

            console.log(`Fetching: ${item.name.substring(0, 50)}...`);

            const { capacity, title } = await extractCapacityFromAmazon(item.url);

            if (capacity || title) {
                const updates = {};

                if (capacity) {
                    updates.capacity = capacity;
                    console.log(`  ✓ Capacity: ${capacity} GB`);
                }

                if (title && title !== item.name) {
                    updates.name = title;
                    console.log(`  ✓ Updated name: ${title.substring(0, 60)}...`);
                }

                await collection.updateOne(
                    { _id: item._id },
                    { $set: updates }
                );
                updatedCount++;
            } else {
                console.log(`  ✗ Could not extract capacity`);
            }

            console.log('');

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        console.log(`\n✅ Successfully updated ${updatedCount} items\n`);

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await client.close();
    }
}

// Run the extraction
if (require.main === module) {
    extractStorageCapacity()
        .then(() => {
            console.log('\n🎉 Extraction completed!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Extraction failed:', error);
            process.exit(1);
        });
}

module.exports = { extractStorageCapacity };
