const { connectToDatabase, getDatabase } = require('./config/database');

async function fixSpecificCases() {
    await connectToDatabase();
    const db = getDatabase();

    console.log('=== Fixing specific case form factors ===\n');

    // 1. Find SSUPD Meshroom S V2 - should be ATX
    console.log('--- SSUPD Meshroom S V2 ---');
    const ssupd = await db.collection('cases').findOne({
        name: { $regex: 'SSUPD.*Meshroom.*S.*V2', $options: 'i' }
    });

    if (ssupd) {
        const ffDisplay = Array.isArray(ssupd.formFactor) ? `[${ssupd.formFactor.join(', ')}]` : ssupd.formFactor;
        console.log(`Found: ${ssupd.name}`);
        console.log(`  Current Form Factor: ${ffDisplay}`);
        console.log(`  Price: $${ssupd.currentPrice || ssupd.price}`);

        const result1 = await db.collection('cases').updateOne(
            { _id: ssupd._id },
            { $set: { formFactor: 'ATX' } }
        );
        console.log(`  Updated to ATX (modified: ${result1.modifiedCount})\n`);
    } else {
        console.log('SSUPD Meshroom S V2 not found!\n');
    }

    // 2. Find VEVOR Full-Tower - should be E-ATX
    console.log('--- VEVOR PC Gaming Case (Full-Tower) ---');
    const vevor = await db.collection('cases').findOne({
        $and: [
            { name: { $regex: 'VEVOR.*Gaming.*Case', $options: 'i' } },
            { name: { $regex: 'Full-Tower', $options: 'i' } }
        ]
    });

    if (vevor) {
        const ffDisplay = Array.isArray(vevor.formFactor) ? `[${vevor.formFactor.join(', ')}]` : vevor.formFactor;
        console.log(`Found: ${vevor.name}`);
        console.log(`  Current Form Factor: ${ffDisplay}`);
        console.log(`  Price: $${vevor.currentPrice || vevor.price}`);

        const result2 = await db.collection('cases').updateOne(
            { _id: vevor._id },
            { $set: { formFactor: 'E-ATX' } }
        );
        console.log(`  Updated to E-ATX (modified: ${result2.modifiedCount})\n`);
    } else {
        console.log('VEVOR Full-Tower case not found!\n');
    }

    // Verify both cases
    console.log('=== Verification ===\n');

    if (ssupd) {
        const verifySSUPD = await db.collection('cases').findOne({ _id: ssupd._id });
        console.log(`SSUPD Meshroom S V2: ${verifySSUPD.formFactor}`);
    }

    if (vevor) {
        const verifyVEVOR = await db.collection('cases').findOne({ _id: vevor._id });
        console.log(`VEVOR Full-Tower: ${verifyVEVOR.formFactor}`);
    }

    process.exit(0);
}

fixSpecificCases().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
