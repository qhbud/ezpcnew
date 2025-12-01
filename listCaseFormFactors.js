const { connectToDatabase, getDatabase } = require('./config/database');

async function listCaseFormFactors() {
    await connectToDatabase();
    const db = getDatabase();

    console.log('=== Listing all unique case form factors ===\n');

    // Get all distinct form factors
    const formFactors = await db.collection('cases').distinct('formFactor');

    console.log(`Found ${formFactors.length} unique form factors:\n`);
    formFactors.forEach((ff, index) => {
        console.log(`${index + 1}. "${ff}"`);
    });

    // Find cases that contain both ATX and mATX in formFactor
    console.log('\n=== Cases with form factors containing both ATX and mATX ===\n');
    const cases = await db.collection('cases').find({
        $and: [
            { formFactor: { $regex: 'ATX', $options: 'i' } },
            { formFactor: { $regex: 'mATX', $options: 'i' } }
        ]
    }).toArray();

    console.log(`Found ${cases.length} cases:`);
    cases.forEach(c => console.log(`  - ${c.name || c.title}\n    Form Factor: "${c.formFactor}"\n    Price: $${c.currentPrice || c.price}`));

    process.exit(0);
}

listCaseFormFactors().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
