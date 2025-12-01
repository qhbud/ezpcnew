const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pcbuilder';
const AFFILIATE_TAG = process.env.AMAZON_ASSOCIATE_TAG || 'qhxtm-20';

/**
 * Converts an Amazon product URL to an affiliate link
 * @param {string} url - Original Amazon URL
 * @param {string} affiliateTag - Amazon Associate tag
 * @returns {string} - Affiliate link
 */
function convertToAffiliateLink(url, affiliateTag) {
    if (!url || typeof url !== 'string') {
        return url;
    }

    // Already has affiliate tag
    if (url.includes(`tag=${affiliateTag}`) || url.includes(`tag%3D${affiliateTag}`)) {
        return url;
    }

    try {
        const urlObj = new URL(url);

        // Only process Amazon URLs
        if (!urlObj.hostname.includes('amazon.com') && !urlObj.hostname.includes('amzn.')) {
            return url;
        }

        // Extract ASIN or product ID
        let asin = null;

        // Try to extract ASIN from path (e.g., /dp/B08ASIN123/)
        const dpMatch = urlObj.pathname.match(/\/dp\/([A-Z0-9]{10})/i);
        const gpMatch = urlObj.pathname.match(/\/gp\/product\/([A-Z0-9]{10})/i);
        const productMatch = urlObj.pathname.match(/\/product\/([A-Z0-9]{10})/i);

        if (dpMatch) {
            asin = dpMatch[1];
        } else if (gpMatch) {
            asin = gpMatch[1];
        } else if (productMatch) {
            asin = productMatch[1];
        }

        // If we found an ASIN, create a clean affiliate link
        if (asin) {
            return `https://www.amazon.com/dp/${asin}?tag=${affiliateTag}`;
        }

        // If no ASIN found, just append the tag parameter
        urlObj.searchParams.set('tag', affiliateTag);
        return urlObj.toString();

    } catch (err) {
        console.error(`Error parsing URL: ${url}`, err.message);
        return url;
    }
}

async function convertAllLinks() {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');
        console.log(`Using affiliate tag: ${AFFILIATE_TAG}\n`);

        const db = client.db('pcbuilder');

        // Get all collections
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

        // Also get GPU-specific collections
        const gpuCollections = await db.listCollections({ name: /^gpus_/ }).toArray();
        collections.push(...gpuCollections.map(c => c.name));

        // Also get CPU-specific collections
        const cpuCollections = await db.listCollections({ name: /^cpus_/ }).toArray();
        collections.push(...cpuCollections.map(c => c.name));

        let totalComponents = 0;
        let totalConverted = 0;
        let totalAlreadyAffiliate = 0;
        let totalErrors = 0;

        console.log('=== Converting Links to Affiliate Links ===\n');

        for (const collectionName of collections) {
            try {
                const collection = db.collection(collectionName);
                const count = await collection.countDocuments();

                if (count === 0) continue;

                console.log(`Processing ${collectionName} (${count} items)...`);

                const components = await collection.find({}).toArray();
                let converted = 0;
                let alreadyAffiliate = 0;
                let errors = 0;

                for (const component of components) {
                    totalComponents++;

                    // Check for sourceUrl or url field
                    const linkField = component.sourceUrl ? 'sourceUrl' :
                                     component.url ? 'url' :
                                     component.link ? 'link' :
                                     component.amazonLink ? 'amazonLink' : null;

                    if (!linkField) {
                        continue; // No link field
                    }

                    const originalUrl = component[linkField];

                    if (!originalUrl || typeof originalUrl !== 'string') {
                        continue;
                    }

                    // Convert to affiliate link
                    const affiliateUrl = convertToAffiliateLink(originalUrl, AFFILIATE_TAG);

                    // Check if it changed
                    if (affiliateUrl === originalUrl) {
                        if (originalUrl.includes(AFFILIATE_TAG)) {
                            alreadyAffiliate++;
                            totalAlreadyAffiliate++;
                        }
                        continue;
                    }

                    // Update the component
                    try {
                        await collection.updateOne(
                            { _id: component._id },
                            { $set: { [linkField]: affiliateUrl } }
                        );
                        converted++;
                        totalConverted++;
                    } catch (err) {
                        console.error(`  Error updating ${component.name || component.title}: ${err.message}`);
                        errors++;
                        totalErrors++;
                    }
                }

                if (converted > 0 || alreadyAffiliate > 0) {
                    console.log(`  ✓ Converted: ${converted}, Already affiliate: ${alreadyAffiliate}${errors > 0 ? `, Errors: ${errors}` : ''}`);
                }

            } catch (err) {
                console.error(`  Error processing ${collectionName}: ${err.message}`);
            }
        }

        console.log('\n\n=== SUMMARY ===');
        console.log(`Total components processed: ${totalComponents}`);
        console.log(`Links converted to affiliate: ${totalConverted}`);
        console.log(`Links already affiliate: ${totalAlreadyAffiliate}`);
        console.log(`Errors: ${totalErrors}`);
        console.log(`\nAll product links now use affiliate tag: ${AFFILIATE_TAG}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
        console.log('\nDisconnected from MongoDB');
    }
}

// Run the conversion
convertAllLinks();
