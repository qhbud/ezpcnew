const { connectToDatabase, getDatabase } = require('../config/database');

async function verifyNewMotherboards() {
    try {
        await connectToDatabase();
        const db = getDatabase();

        // The 9 motherboards that were just added
        const searchNames = [
            'ASRock AMD B550 PG Riptide',
            'ASUS Prime B550M-A WiFi II',
            'ASUS Prime B650M-A AX',
            'ASUS ROG Strix AMD AM4 ATX Motherboard - WiFi 6',
            'Asus ROG Strix B550-F Gaming WiFi II',
            'ASUS TUF Gaming A520M-PLUS',
            'Gigabyte A520I AC',
            'Gigabyte B550 Gaming X V2',
            'GIGABYTE B550I AORUS PRO AX'
        ];

        console.log('\n=== Verifying New Motherboards ===\n');

        for (const searchName of searchNames) {
            const mb = await db.collection('motherboards').findOne({
                $or: [
                    { name: { $regex: searchName.substring(0, 30), $options: 'i' } },
                    { title: { $regex: searchName.substring(0, 30), $options: 'i' } }
                ]
            });

            if (mb) {
                console.log(`✓ ${searchName}`);
                console.log(`  Memory Type: ${JSON.stringify(mb.memoryType)}`);
                console.log(`  Form Factor: ${mb.formFactor}`);
                console.log(`  Chipset: ${mb.chipset}`);
                console.log('');
            } else {
                console.log(`✗ ${searchName} - NOT FOUND`);
                console.log('');
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

verifyNewMotherboards();
