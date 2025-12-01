require('dotenv').config();
const mongoose = require('mongoose');

// Define schemas for different component types
const gpuSchema = new mongoose.Schema({}, { strict: false, collection: 'gpus' });
const GPU = mongoose.model('GPU', gpuSchema);

async function checkComponentStatus() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Search for the ASUS ProArt RTX 4080 Super
        const searchTerm = 'ASUS ProArt GeForce RTX 4080 Super';

        console.log('═══════════════════════════════════════════════════════════════════════════');
        console.log(`SEARCHING FOR: ${searchTerm}`);
        console.log('═══════════════════════════════════════════════════════════════════════════\n');

        const gpu = await GPU.findOne({
            name: { $regex: searchTerm, $options: 'i' }
        }).lean();

        if (gpu) {
            console.log('✅ Component Found!\n');
            console.log(`Name: ${gpu.name}`);
            console.log(`Price: $${gpu.price || gpu.currentPrice || 'N/A'}`);
            console.log(`Base Price: $${gpu.basePrice || 'N/A'}`);
            console.log(`Sale Price: $${gpu.salePrice || 'N/A'}`);
            console.log(`Is On Sale: ${gpu.isOnSale || false}`);
            console.log(`Source URL: ${gpu.sourceUrl || gpu.amazonUrl || 'N/A'}`);
            console.log(`Last Price Check: ${gpu.lastPriceCheck || 'Never'}`);
            console.log(`Price Detection Method: ${gpu.priceDetectionMethod || 'N/A'}`);
            console.log(`Is Available: ${gpu.isAvailable}`);
            console.log(`Unavailability Reason: ${gpu.unavailabilityReason || 'N/A'}`);
            console.log(`Last Update Error: ${gpu.lastUpdateError || 'None'}`);
            console.log(`Update Failed: ${gpu.updateFailed || false}`);
            console.log('');

            // Check price history
            if (gpu.priceHistory && gpu.priceHistory.length > 0) {
                console.log(`Price History Entries: ${gpu.priceHistory.length}`);
                console.log('Last 3 price checks:');
                gpu.priceHistory.slice(-3).forEach((entry, i) => {
                    console.log(`  ${i + 1}. ${new Date(entry.date).toLocaleString()} - $${entry.price}`);
                });
            } else {
                console.log('❌ No price history found');
            }
            console.log('');

            // Check for potential issues
            console.log('═══════════════════════════════════════════════════════════════════════════');
            console.log('POTENTIAL ISSUES');
            console.log('═══════════════════════════════════════════════════════════════════════════\n');

            const issues = [];

            if (!gpu.sourceUrl && !gpu.amazonUrl) {
                issues.push('❌ No source URL found - cannot update price');
            }

            if (gpu.updateFailed) {
                issues.push('⚠️ Previous update failed');
            }

            if (gpu.lastUpdateError) {
                issues.push(`⚠️ Last error: ${gpu.lastUpdateError}`);
            }

            if (!gpu.lastPriceCheck) {
                issues.push('⚠️ Never been price checked');
            }

            if (!gpu.isAvailable) {
                issues.push(`⚠️ Marked as unavailable: ${gpu.unavailabilityReason}`);
            }

            if (issues.length === 0) {
                console.log('✅ No obvious issues detected');
            } else {
                issues.forEach(issue => console.log(issue));
            }
            console.log('');

        } else {
            console.log('❌ Component not found in database\n');

            // Try a broader search
            console.log('Trying broader search for "4080 Super"...\n');
            const gpus = await GPU.find({
                name: { $regex: '4080 Super', $options: 'i' }
            }).lean();

            if (gpus.length > 0) {
                console.log(`Found ${gpus.length} RTX 4080 Super GPUs:\n`);
                gpus.forEach((g, i) => {
                    console.log(`${i + 1}. ${g.name?.substring(0, 80)}...`);
                    console.log(`   Price: $${g.price || g.currentPrice}`);
                    console.log(`   Last Check: ${g.lastPriceCheck || 'Never'}`);
                    console.log('');
                });
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        await mongoose.connection.close();
        console.log('✅ Database connection closed');
    }
}

checkComponentStatus();
