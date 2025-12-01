const { connectToDatabase, getDatabase } = require('./config/database');

async function fixCaseFormFactors() {
    await connectToDatabase();
    const db = getDatabase();

    console.log('=== Fixing case form factors ===\n');

    // Find cases with "ATX,mATX" form factor (no space after comma)
    const cases = await db.collection('cases').find({
        formFactor: 'ATX,mATX'
    }).toArray();

    console.log(`Found ${cases.length} cases with "ATX,mATX" form factor:`);
    cases.forEach(c => console.log(`  - ${c.name || c.title}\n    Current Form Factor: ${c.formFactor}\n    Price: $${c.currentPrice || c.price}`));

    if (cases.length > 0) {
        console.log('\nUpdating form factors to "mATX"...\n');

        // Update to mATX
        const result = await db.collection('cases').updateMany(
            {
                formFactor: 'ATX,mATX'
            },
            { $set: { formFactor: 'mATX' } }
        );

        console.log(`Updated ${result.modifiedCount} case(s)`);

        // Verify the changes
        console.log('\n=== Verification ===\n');
        const verifiedCases = await db.collection('cases').find({
            _id: { $in: cases.map(c => c._id) }
        }).toArray();

        console.log(`Cases after update (${verifiedCases.length} total):`);
        verifiedCases.forEach(c => console.log(`  - ${c.name || c.title}\n    Form Factor: ${c.formFactor}\n    Price: $${c.currentPrice || c.price}`));
    } else {
        console.log('\nNo cases found with "ATX, mATX" form factor');
    }

    process.exit(0);
}

fixCaseFormFactors().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
