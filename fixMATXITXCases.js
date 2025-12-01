const { connectToDatabase, getDatabase } = require('./config/database');

async function fixMATXITXCases() {
    await connectToDatabase();
    const db = getDatabase();

    console.log('=== Fixing mATX, ITX cases to just mATX ===\n');

    // Find cases where formFactor is an array containing both mATX and ITX
    const cases = await db.collection('cases').find({
        formFactor: { $all: ['mATX', 'ITX'] }
    }).toArray();

    console.log(`Found ${cases.length} cases with ["mATX", "ITX"] form factor array:`);
    cases.forEach(c => {
        const ffDisplay = Array.isArray(c.formFactor) ? `[${c.formFactor.join(', ')}]` : c.formFactor;
        console.log(`  - ${c.name || c.title}\n    Current Form Factor: ${ffDisplay}\n    Price: $${c.currentPrice || c.price}`);
    });

    if (cases.length > 0) {
        console.log('\n=== Updating form factors to "mATX" ===\n');

        // Update each case to mATX
        let updatedCount = 0;
        for (const caseItem of cases) {
            const result = await db.collection('cases').updateOne(
                { _id: caseItem._id },
                { $set: { formFactor: 'mATX' } }
            );
            updatedCount += result.modifiedCount;
        }

        console.log(`Updated ${updatedCount} case(s)`);

        // Verify the changes
        console.log('\n=== Verification (first 10) ===\n');
        const verifiedCases = await db.collection('cases').find({
            _id: { $in: cases.map(c => c._id).slice(0, 10) }
        }).toArray();

        verifiedCases.forEach(c => console.log(`  - ${c.name || c.title}\n    Form Factor: ${c.formFactor}\n    Price: $${c.currentPrice || c.price}`));
    } else {
        console.log('\nNo cases found with ["mATX", "ITX"] form factor array');
    }

    process.exit(0);
}

fixMATXITXCases().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
