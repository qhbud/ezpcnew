const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';

async function updateDatabase() {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db('pcbuilder'); // Correct database name

        // 1. Remove Sirlyr RGB LED Strips (case accessory)
        console.log('\n1. Removing Sirlyr RGB LED Strips...');
        const sirlyrResult = await db.collection('cases').deleteOne({
            name: /Sirlyr RGB LED Strips for PSU Cables/i
        });
        console.log(`   Deleted ${sirlyrResult.deletedCount} case(s)`);

        // 2. Remove GM100 Mini PC Case
        console.log('\n2. Removing GM100 Mini PC Case...');
        const gm100Result = await db.collection('cases').deleteOne({
            name: /GM100 Mini PC Case/i
        });
        console.log(`   Deleted ${gm100Result.deletedCount} case(s)`);

        // 3. Update Seagate Exos ST24000NM000C from 20TB to 24TB
        console.log('\n3. Updating Seagate Exos ST24000NM000C to 24TB...');
        const seagate24Result = await db.collection('storages').updateOne(
            { name: /ST24000NM000C/i },
            { $set: { capacity: '24TB' } }
        );
        console.log(`   Modified ${seagate24Result.modifiedCount} storage device(s)`);

        // 4. Update WD_BLACK 4TB SN8100 from 8TB to 4TB
        console.log('\n4. Updating WD_BLACK 4TB SN8100 to 4TB...');
        const wd4tbResult = await db.collection('storages').updateOne(
            {
                name: /WD_BLACK 4TB SN8100/i,
                price: 479.99
            },
            { $set: { capacity: '4TB' } }
        );
        console.log(`   Modified ${wd4tbResult.modifiedCount} storage device(s)`);

        // 5. Update Seagate Exos 22TB from 18TB to 22TB
        console.log('\n5. Updating Seagate Exos 22TB to 22TB...');
        const seagate22Result = await db.collection('storages').updateOne(
            { name: /ST22000NM000C/i },
            { $set: { capacity: '22TB' } }
        );
        console.log(`   Modified ${seagate22Result.modifiedCount} storage device(s)`);

        // 6. Update Silicon Power 4TB US75 from 8TB to 4TB
        console.log('\n6. Updating Silicon Power 4TB US75 to 4TB...');
        const sp4tbResult = await db.collection('storages').updateOne(
            { name: /Silicon Power 4TB US75/i },
            { $set: { capacity: '4TB' } }
        );
        console.log(`   Modified ${sp4tbResult.modifiedCount} storage device(s)`);

        // 7. Update WD_BLACK SN8100 from 1TB to 2TB (the $249.99 one)
        console.log('\n7. Updating WD_BLACK SN8100 to 2TB...');
        const wd2tbResult = await db.collection('storages').updateOne(
            {
                name: /WD_BLACK SN8100/i,
                price: 249.99
            },
            { $set: { capacity: '2TB' } }
        );
        console.log(`   Modified ${wd2tbResult.modifiedCount} storage device(s)`);

        // 8. Update Kingston Fury Renegade G5 2048GB to 2TB
        console.log('\n8. Updating Kingston Fury Renegade G5 2048GB to 2TB...');
        const kingston2tbResult = await db.collection('storages').updateOne(
            { name: /SFYR2S\/2T0/i },
            { $set: { capacity: '2TB' } }
        );
        console.log(`   Modified ${kingston2tbResult.modifiedCount} storage device(s)`);

        // 9. Update Kingston Fury Renegade G5 1024GB to 1TB
        console.log('\n9. Updating Kingston Fury Renegade G5 1024GB to 1TB...');
        const kingston1tbResult = await db.collection('storages').updateOne(
            { name: /SFYR2S\/1T0/i },
            { $set: { capacity: '1TB' } }
        );
        console.log(`   Modified ${kingston1tbResult.modifiedCount} storage device(s)`);

        // 10. Remove Toshiba 1TB 5400RPM PS3/PS4 drives (multiple entries)
        console.log('\n10. Removing Toshiba PS3/PS4 drives...');
        const toshibaResult = await db.collection('storages').deleteMany({
            $and: [
                { brand: /toshiba/i },
                { name: /PS3\/PS4/i }
            ]
        });
        console.log(`   Deleted ${toshibaResult.deletedCount} Toshiba PS3/PS4 drive(s)`);

        // 11. Remove MaxDigitalData PS3/PS4 drive
        console.log('\n11. Removing MaxDigitalData PS3/PS4 drive...');
        const maxDigitalResult = await db.collection('storages').deleteOne({
            name: /MaxDigitalData.*PS3\/PS4/i
        });
        console.log(`   Deleted ${maxDigitalResult.deletedCount} MaxDigitalData drive(s)`);

        console.log('\n✅ All database corrections completed!');

    } catch (error) {
        console.error('Error updating database:', error);
    } finally {
        await client.close();
        console.log('Database connection closed');
    }
}

updateDatabase();
