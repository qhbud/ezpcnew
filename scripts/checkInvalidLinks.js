const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pcbuilder';

async function checkInvalidLinks() {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db('pcbuilder');

        // Define all collections to check
        const collections = [
            'cpus',
            'gpus',
            'motherboards',
            'rams',
            'psus',
            'cases',
            'coolers',
            'storages',
            'addons'
        ];

        // Also check GPU-specific collections
        const gpuCollections = await db.listCollections({ name: /^gpus_/ }).toArray();
        collections.push(...gpuCollections.map(c => c.name));

        // Also check CPU-specific collections
        const cpuCollections = await db.listCollections({ name: /^cpus_/ }).toArray();
        collections.push(...cpuCollections.map(c => c.name));

        let totalComponents = 0;
        let invalidLinks = 0;
        const invalidComponents = [];

        console.log('\n=== Checking Component Links ===\n');

        for (const collectionName of collections) {
            try {
                const collection = db.collection(collectionName);
                const count = await collection.countDocuments();

                if (count === 0) continue;

                console.log(`\nChecking ${collectionName} (${count} items)...`);

                const components = await collection.find({}).toArray();
                totalComponents += components.length;

                for (const component of components) {
                    const link = component.sourceUrl || component.url || component.link || component.amazonLink;
                    const name = component.name || component.title || 'Unnamed';

                    // Check if link exists
                    if (!link) {
                        invalidLinks++;
                        invalidComponents.push({
                            collection: collectionName,
                            name: name,
                            issue: 'No link field found (checked: sourceUrl, url, link, amazonLink)',
                            id: component._id
                        });
                        continue;
                    }

                    // Check if link is a valid URL
                    if (typeof link !== 'string' || link.trim() === '') {
                        invalidLinks++;
                        invalidComponents.push({
                            collection: collectionName,
                            name: name,
                            issue: 'Empty or invalid link',
                            link: link,
                            id: component._id
                        });
                        continue;
                    }

                    // Check if link is an Amazon link
                    if (!link.includes('amazon.com') && !link.includes('amzn.')) {
                        invalidLinks++;
                        invalidComponents.push({
                            collection: collectionName,
                            name: name,
                            issue: 'Not an Amazon link',
                            link: link,
                            id: component._id
                        });
                        continue;
                    }

                    // Check for common invalid patterns
                    if (link.includes('undefined') || link.includes('null') || link === 'N/A') {
                        invalidLinks++;
                        invalidComponents.push({
                            collection: collectionName,
                            name: name,
                            issue: 'Invalid link pattern',
                            link: link,
                            id: component._id
                        });
                    }
                }
            } catch (err) {
                console.log(`  ⚠️  Error checking ${collectionName}: ${err.message}`);
            }
        }

        // Print summary
        console.log('\n\n=== SUMMARY ===');
        console.log(`Total components checked: ${totalComponents}`);
        console.log(`Components with valid links: ${totalComponents - invalidLinks}`);
        console.log(`Components with invalid links: ${invalidLinks}`);
        console.log(`Percentage valid: ${((totalComponents - invalidLinks) / totalComponents * 100).toFixed(2)}%`);

        // Print details of invalid links
        if (invalidComponents.length > 0) {
            console.log('\n\n=== INVALID LINKS DETAILS ===\n');

            // Group by collection
            const byCollection = {};
            invalidComponents.forEach(item => {
                if (!byCollection[item.collection]) {
                    byCollection[item.collection] = [];
                }
                byCollection[item.collection].push(item);
            });

            for (const [collection, items] of Object.entries(byCollection)) {
                console.log(`\n${collection} (${items.length} issues):`);
                items.forEach((item, index) => {
                    console.log(`  ${index + 1}. ${item.name}`);
                    console.log(`     Issue: ${item.issue}`);
                    if (item.link) console.log(`     Link: ${item.link}`);
                    console.log(`     ID: ${item.id}`);
                });
            }

            // Save to file
            const fs = require('fs');
            const reportPath = 'invalid-links-report.json';
            fs.writeFileSync(reportPath, JSON.stringify(invalidComponents, null, 2));
            console.log(`\n\nDetailed report saved to: ${reportPath}`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
        console.log('\nDisconnected from MongoDB');
    }
}

checkInvalidLinks();
