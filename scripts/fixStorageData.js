const { MongoClient } = require('mongodb');
const Logger = require('./utils/logger');

async function fixStorageData() {
    const client = await MongoClient.connect('mongodb://localhost:27017');
    const db = client.db('pcbuilder');
    const collection = db.collection('storages');

    try {
        Logger.info('🔧 Starting storage data cleanup and fixes...\n');

        // 1. Delete products with just brand names (like "Corsair", "Samsung", etc.)
        Logger.info('📋 Step 1: Removing products with incomplete names...');
        const brandOnlyPattern = /^(samsung|kingston|crucial|wd|western\s+digital|seagate|corsair|pny|patriot|mushkin|adata|gigabyte|msi|teamgroup|team|silicon\s+power|inland|sk\s+hynix|intel|micron|sabrent|lexar|verbatim|transcend|toshiba|hitachi|maxtor|sandisk|six|acer)$/i;

        const incompleteBefore = await collection.countDocuments({
            name: { $regex: brandOnlyPattern }
        });

        if (incompleteBefore > 0) {
            const deleteResult = await collection.deleteMany({
                name: { $regex: brandOnlyPattern }
            });
            Logger.success(`   Deleted ${deleteResult.deletedCount} products with incomplete names`);
        } else {
            Logger.info('   No products with incomplete names found');
        }

        // 2. Fix SSDs misclassified as HDD
        Logger.info('\n📋 Step 2: Fixing storage type misclassifications...');

        // Find SSDs marked as HDD (M.2 form factor or name contains SSD/NVMe)
        const misclassified = await collection.find({
            $or: [
                { storageType: 'HDD', formFactor: 'm2_2280' },
                { storageType: 'HDD', formFactor: 'm2_2260' },
                { storageType: 'HDD', formFactor: 'm2_2242' },
                { storageType: 'HDD', name: { $regex: /\b(ssd|nvme|solid\s+state)\b/i } }
            ]
        }).toArray();

        Logger.info(`   Found ${misclassified.length} misclassified SSDs marked as HDD`);

        let fixedCount = 0;
        for (const item of misclassified) {
            const name = (item.name || '').toLowerCase();
            const formFactor = item.formFactor || '';

            let correctType = 'Other SSD';

            // Check if it's M.2 SSD
            if (name.includes('m.2') || name.includes('m2') || name.includes('nvme') ||
                formFactor.startsWith('m2_')) {
                correctType = 'M.2 SSD';
            }
            // Check if it's other SSD
            else if (name.includes('ssd') || name.includes('solid state')) {
                correctType = 'Other SSD';
            }

            await collection.updateOne(
                { _id: item._id },
                { $set: { storageType: correctType } }
            );
            fixedCount++;
        }

        Logger.success(`   Fixed ${fixedCount} storage type classifications`);

        // 3. Fix null manufacturers
        Logger.info('\n📋 Step 3: Fixing null manufacturers...');

        const nullManufacturers = await collection.find({
            manufacturer: null
        }).toArray();

        Logger.info(`   Found ${nullManufacturers.length} items with null manufacturer`);

        let manufacturerFixedCount = 0;
        for (const item of nullManufacturers) {
            const name = (item.name || '').toLowerCase();
            let brand = null;

            // Check for WD variants first
            if (/\bwd[_\s]?black\b/i.test(name)) brand = 'WD Black';
            else if (/\bwd[_\s]?blue\b/i.test(name)) brand = 'WD Blue';
            else if (/\bwd[_\s]?red\b/i.test(name)) brand = 'WD Red';
            else if (/\bwd[_\s]?green\b/i.test(name)) brand = 'WD Green';
            else if (/\bwestern\s+digital\b/i.test(name)) brand = 'Western Digital';
            else if (/\bwd\b/i.test(name)) brand = 'WD';
            // Check for other brands
            else {
                const brandMatch = name.match(/\b(samsung|seagate|crucial|kingston|sandisk|corsair|pny|patriot|mushkin|adata|gigabyte|acer|msi|teamgroup|team|silicon power|inland|sk hynix|intel|micron|sabrent|lexar|verbatim|transcend|toshiba|hitachi|maxtor|six)\b/i);
                if (brandMatch) {
                    brand = brandMatch[1];
                    // Capitalize properly
                    brand = brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase();
                    if (brand.toLowerCase() === 'wd') brand = 'WD';
                    else if (brand.toLowerCase() === 'samsung') brand = 'Samsung';
                    else if (brand.toLowerCase() === 'seagate') brand = 'Seagate';
                    else if (brand.toLowerCase() === 'crucial') brand = 'Crucial';
                    else if (brand.toLowerCase() === 'kingston') brand = 'Kingston';
                    else if (brand.toLowerCase() === 'sandisk') brand = 'SanDisk';
                    else if (brand.toLowerCase() === 'corsair') brand = 'Corsair';
                    else if (brand.toLowerCase() === 'adata') brand = 'ADATA';
                    else if (brand.toLowerCase() === 'msi') brand = 'MSI';
                    else if (brand.toLowerCase() === 'sk hynix') brand = 'SK Hynix';
                    else if (brand.toLowerCase() === 'intel') brand = 'Intel';
                    else if (brand.toLowerCase() === 'lexar') brand = 'Lexar';
                    else if (brand.toLowerCase() === 'acer') brand = 'Acer';
                }
            }

            if (brand) {
                await collection.updateOne(
                    { _id: item._id },
                    { $set: { manufacturer: brand } }
                );
                manufacturerFixedCount++;
            }
        }

        Logger.success(`   Fixed ${manufacturerFixedCount} null manufacturers`);

        // 4. Final stats
        Logger.info('\n📊 Final database statistics:');
        const finalCount = await collection.countDocuments({});
        const m2Count = await collection.countDocuments({ storageType: 'M.2 SSD' });
        const otherSSDCount = await collection.countDocuments({ storageType: 'Other SSD' });
        const hddCount = await collection.countDocuments({ storageType: 'HDD' });
        const nullManCount = await collection.countDocuments({ manufacturer: null });

        Logger.info(`   Total storage devices: ${finalCount}`);
        Logger.info(`   M.2 SSDs: ${m2Count}`);
        Logger.info(`   Other SSDs: ${otherSSDCount}`);
        Logger.info(`   HDDs: ${hddCount}`);
        Logger.info(`   Items with null manufacturer: ${nullManCount}`);

        Logger.success('\n✅ Storage data cleanup completed!');

    } catch (error) {
        Logger.error('Error fixing storage data:', error);
        throw error;
    } finally {
        await client.close();
    }
}

// Run the fix if this script is executed directly
if (require.main === module) {
    fixStorageData()
        .then(() => {
            Logger.success('\n🎉 Storage data fix completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            Logger.error('\n💥 Storage data fix failed:', error);
            process.exit(1);
        });
}

module.exports = { fixStorageData };
