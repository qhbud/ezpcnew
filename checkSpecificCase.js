const { connectToDatabase, getDatabase } = require('./config/database');

async function checkSpecificCase() {
    await connectToDatabase();
    const db = getDatabase();

    console.log('=== Checking specific case ===\n');

    // Find the LIAN LI case from the previous list
    const lianLiCase = await db.collection('cases').findOne({
        name: { $regex: 'LIAN LI.*LANCOOL 205M', $options: 'i' }
    });

    if (lianLiCase) {
        console.log('Found LIAN LI case:');
        console.log(`  Name: ${lianLiCase.name}`);
        console.log(`  Form Factor: "${lianLiCase.formFactor}"`);
        console.log(`  Form Factor type: ${typeof lianLiCase.formFactor}`);
        console.log(`  Form Factor length: ${lianLiCase.formFactor ? lianLiCase.formFactor.length : 'N/A'}`);
        console.log(`  Form Factor charCodes: ${lianLiCase.formFactor ? Array.from(lianLiCase.formFactor).map(c => c.charCodeAt(0)).join(',') : 'N/A'}`);
        console.log(`  Price: $${lianLiCase.currentPrice || lianLiCase.price}`);

        // Now try to update this specific case
        console.log('\n=== Attempting to update this case ===\n');
        const result = await db.collection('cases').updateOne(
            { _id: lianLiCase._id },
            { $set: { formFactor: 'mATX' } }
        );
        console.log(`Updated: ${result.modifiedCount} document(s)`);

        // Verify
        const updated = await db.collection('cases').findOne({ _id: lianLiCase._id });
        console.log(`\nForm Factor after update: "${updated.formFactor}"`);
    } else {
        console.log('LIAN LI case not found!');
    }

    process.exit(0);
}

checkSpecificCase().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
