const { connectToDatabase, getDatabase } = require('./config/database');

async function fixWrongSSDLabels() {
    await connectToDatabase();
    const db = getDatabase();

    console.log('=== Reverting incorrectly labeled drives ===\n');

    let totalReverted = 0;

    // 1. Revert WD Blue drives with RPM in name back to HDD
    console.log('--- Reverting WD Blue HDDs (with RPM) ---');
    const wdBlueHDDs = await db.collection('storages').find({
        $or: [
            { name: { $regex: 'wd.*blue', $options: 'i' } },
            { title: { $regex: 'wd.*blue', $options: 'i' } }
        ],
        $or: [
            { name: { $regex: 'rpm', $options: 'i' } },
            { title: { $regex: 'rpm', $options: 'i' } }
        ],
        type: 'SATA SSD'
    }).toArray();

    console.log(`Found ${wdBlueHDDs.length} WD Blue drives with RPM speeds:`);

    const wdHddResult = await db.collection('storages').updateMany(
        {
            $or: [
                { name: { $regex: 'wd.*blue', $options: 'i' } },
                { title: { $regex: 'wd.*blue', $options: 'i' } }
            ],
            $and: [
                {
                    $or: [
                        { name: { $regex: 'rpm', $options: 'i' } },
                        { title: { $regex: 'rpm', $options: 'i' } }
                    ]
                }
            ],
            type: 'SATA SSD'
        },
        { $set: { type: 'HDD' } }
    );
    console.log(`Reverted ${wdHddResult.modifiedCount} WD Blue HDDs back to HDD type\n`);
    totalReverted += wdHddResult.modifiedCount;

    // 2. Revert WD Blue NVMe drives back to M.2 SSD
    console.log('--- Reverting WD Blue NVMe drives ---');
    const wdNvmeResult = await db.collection('storages').updateMany(
        {
            $or: [
                { name: { $regex: 'wd.*blue.*nvme', $options: 'i' } },
                { title: { $regex: 'wd.*blue.*nvme', $options: 'i' } }
            ],
            type: 'SATA SSD'
        },
        { $set: { type: 'M.2 SSD' } }
    );
    console.log(`Reverted ${wdNvmeResult.modifiedCount} WD Blue NVMe drives back to M.2 SSD type\n`);
    totalReverted += wdNvmeResult.modifiedCount;

    // 3. Revert WD Blue M.2 SATA drives that aren't actually SATA SSDs
    console.log('--- Reverting WD Blue M.2 SATA drives ---');
    const wdM2SataResult = await db.collection('storages').updateMany(
        {
            $or: [
                { name: { $regex: 'wd.*blue.*m\\.2.*2280', $options: 'i' } },
                { title: { $regex: 'wd.*blue.*m\\.2.*2280', $options: 'i' } }
            ],
            $and: [
                {
                    $or: [
                        { name: { $regex: 'sata', $options: 'i' } },
                        { title: { $regex: 'sata', $options: 'i' } }
                    ]
                },
                {
                    $or: [
                        { name: { $not: { $regex: 'nvme', $options: 'i' } } },
                        { title: { $not: { $regex: 'nvme', $options: 'i' } } }
                    ]
                }
            ],
            type: 'SATA SSD'
        },
        { $set: { type: 'M.2 SSD' } }
    );
    console.log(`Reverted ${wdM2SataResult.modifiedCount} WD Blue M.2 SATA drives back to M.2 SSD type\n`);
    totalReverted += wdM2SataResult.modifiedCount;

    // 4. Revert Water Panther drives with RPM back to HDD
    console.log('--- Reverting Water Panther HDDs ---');
    const waterPantherResult = await db.collection('storages').updateMany(
        {
            $or: [
                { name: { $regex: 'water panther', $options: 'i' } },
                { title: { $regex: 'water panther', $options: 'i' } }
            ],
            $or: [
                { name: { $regex: 'rpm', $options: 'i' } },
                { title: { $regex: 'rpm', $options: 'i' } }
            ],
            type: 'SATA SSD'
        },
        { $set: { type: 'HDD' } }
    );
    console.log(`Reverted ${waterPantherResult.modifiedCount} Water Panther drives back to HDD type\n`);
    totalReverted += waterPantherResult.modifiedCount;

    // 5. Revert Vansuny NVMe drives back to M.2 SSD
    console.log('--- Reverting Vansuny NVMe drives ---');
    const vansunnyNvmeResult = await db.collection('storages').updateMany(
        {
            $or: [
                { name: { $regex: 'vansuny.*nvme', $options: 'i' } },
                { title: { $regex: 'vansuny.*nvme', $options: 'i' } }
            ],
            type: 'SATA SSD'
        },
        { $set: { type: 'M.2 SSD' } }
    );
    console.log(`Reverted ${vansunnyNvmeResult.modifiedCount} Vansuny NVMe drives back to M.2 SSD type\n`);
    totalReverted += vansunnyNvmeResult.modifiedCount;

    console.log(`\n=== Total drives reverted: ${totalReverted} ===\n`);

    // Verify key drives
    console.log('=== Verification ===\n');

    console.log('WD Blue Solid State Drive (should be SATA SSD):');
    const wdBlueSSD = await db.collection('storages').findOne({
        name: 'WD Blue Solid State Drive'
    });
    if (wdBlueSSD) {
        console.log(`  Type: ${wdBlueSSD.type} ✓`);
    }

    console.log('\nWD Blue HDDs (sample - should be HDD):');
    const wdBlueHDDSample = await db.collection('storages').find({
        $or: [
            { name: { $regex: 'wd.*blue.*rpm', $options: 'i' } },
            { title: { $regex: 'wd.*blue.*rpm', $options: 'i' } }
        ]
    }).limit(3).toArray();
    wdBlueHDDSample.forEach(d => console.log(`  - ${d.name}\n    Type: ${d.type}`));

    console.log('\nWD Blue NVMe drives (sample - should be M.2 SSD):');
    const wdBlueNVMeSample = await db.collection('storages').find({
        $or: [
            { name: { $regex: 'wd.*blue.*nvme', $options: 'i' } },
            { title: { $regex: 'wd.*blue.*nvme', $options: 'i' } }
        ]
    }).limit(2).toArray();
    wdBlueNVMeSample.forEach(d => console.log(`  - ${d.name}\n    Type: ${d.type}`));

    process.exit(0);
}

fixWrongSSDLabels().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
