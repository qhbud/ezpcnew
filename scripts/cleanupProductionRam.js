require('dotenv').config({ path: '.env.atlas' });
const { MongoClient } = require('mongodb');

async function cleanupProductionRam() {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB Atlas (Production)\n');

        const db = client.db(process.env.DB_NAME || 'pcbuilder');
        const ramCollection = db.collection('rams');

        // Step 1: Show initial count
        const initialCount = await ramCollection.countDocuments();
        console.log(`Initial RAM count: ${initialCount}\n`);

        // Step 2: Remove RAM with "Non-ECC" in title
        console.log('Step 1: Removing RAM with "Non-ECC" in title...');
        const nonEccResult = await ramCollection.deleteMany({
            $or: [
                { title: /non[-\s]?ecc/i },
                { name: /non[-\s]?ecc/i }
            ]
        });
        console.log(`Removed ${nonEccResult.deletedCount} Non-ECC RAM modules\n`);

        // Step 3: Remove RAM without links
        console.log('Step 2: Removing RAM without links...');
        const allRams = await ramCollection.find({}).toArray();
        const ramsWithoutLinks = allRams.filter(ram => {
            const hasLink = ram.link || ram.url || ram.productUrl;
            return !hasLink;
        });

        if (ramsWithoutLinks.length > 0) {
            const idsToDelete = ramsWithoutLinks.map(ram => ram._id);
            const noLinkResult = await ramCollection.deleteMany({
                _id: { $in: idsToDelete }
            });
            console.log(`Removed ${noLinkResult.deletedCount} RAM modules without links\n`);
        } else {
            console.log('No RAM modules without links found\n');
        }

        // Step 4: Remove duplicates by title
        console.log('Step 3: Removing duplicates by exact title...');
        const remainingRams = await ramCollection.find({}).toArray();
        const ramsByTitle = new Map();

        remainingRams.forEach(ram => {
            const title = (ram.title || ram.name || '').trim();
            if (!ramsByTitle.has(title)) {
                ramsByTitle.set(title, []);
            }
            ramsByTitle.get(title).push(ram);
        });

        const duplicatesToDelete = [];
        ramsByTitle.forEach((rams, title) => {
            if (rams.length > 1) {
                console.log(`Found ${rams.length} duplicates of: ${title.substring(0, 80)}`);
                // Keep the first one, delete the rest
                const toDelete = rams.slice(1);
                toDelete.forEach(dup => {
                    duplicatesToDelete.push(dup._id);
                });
            }
        });

        if (duplicatesToDelete.length > 0) {
            const dupResult = await ramCollection.deleteMany({
                _id: { $in: duplicatesToDelete }
            });
            console.log(`Removed ${dupResult.deletedCount} duplicate RAM modules\n`);
        } else {
            console.log('No duplicates found\n');
        }

        // Step 5: Remove specific OWC Synology RAM
        console.log('Step 4: Removing OWC Synology RAM...');
        const owcResult = await ramCollection.deleteOne({
            $or: [
                { title: /Synology D4RD-2666-32G/i },
                { name: /Synology D4RD-2666-32G/i }
            ]
        });
        console.log(`Removed ${owcResult.deletedCount} OWC Synology RAM module\n`);

        // Step 6: Remove other ECC server RAM
        console.log('Step 5: Removing ECC server RAM...');
        const eccResult = await ramCollection.deleteMany({
            $or: [
                { title: /\bECC\b/i },
                { name: /\bECC\b/i }
            ]
        });
        console.log(`Removed ${eccResult.deletedCount} ECC server RAM modules\n`);

        // Step 7: Show final count
        const finalCount = await ramCollection.countDocuments();
        console.log('=================================');
        console.log(`Initial count: ${initialCount}`);
        console.log(`Final count: ${finalCount}`);
        console.log(`Total removed: ${initialCount - finalCount}`);
        console.log('=================================\n');

        // Step 8: Show sample of remaining RAM
        const samples = await ramCollection.find({}).limit(10).toArray();
        console.log('Sample of remaining RAM:');
        samples.forEach(ram => {
            console.log(`- ${(ram.title || ram.name).substring(0, 80)}`);
        });

    } catch (error) {
        console.error('Error:', error);
        throw error;
    } finally {
        await client.close();
    }
}

// Check if --confirm flag is present
if (process.argv.includes('--confirm')) {
    cleanupProductionRam()
        .then(() => {
            console.log('\n✅ Production database cleanup completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('Operation failed:', error);
            process.exit(1);
        });
} else {
    console.log('⚠️  WARNING: This will clean up the PRODUCTION database on MongoDB Atlas!');
    console.log('');
    console.log('This script will:');
    console.log('1. Remove RAM with "Non-ECC" in title');
    console.log('2. Remove RAM without purchase links');
    console.log('3. Remove duplicate RAM entries (by title)');
    console.log('4. Remove OWC Synology replacement RAM');
    console.log('5. Remove all ECC server RAM');
    console.log('');
    console.log('To proceed, run this script with the --confirm flag:');
    console.log('  node scripts/cleanupProductionRam.js --confirm');
    process.exit(0);
}
