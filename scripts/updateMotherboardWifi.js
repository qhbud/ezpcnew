const { connectToDatabase } = require('../config/database');

// Keywords in the product name that indicate WiFi is included
const WIFI_KEYWORDS = [
    'wifi', 'wi-fi',
    // WiFi standard suffixes commonly used in board names
    ' ax',   // WiFi 6/6E (e.g. "ROG STRIX B650E-F GAMING WIFI AX")
    '-ax',
    ' ac',   // WiFi 5 (e.g. "Z390 AORUS PRO WIFI AC")
    '-ac',
    // Explicit "WIFI" in name is the most common indicator
];

// Keywords that confirm WiFi version for setting wifiVersion
const WIFI_VERSION_PATTERNS = [
    { pattern: /wi.?fi\s*7/i,  version: 'WiFi 7'  },
    { pattern: /wi.?fi\s*6e/i, version: 'WiFi 6E' },
    { pattern: /wi.?fi\s*6/i,  version: 'WiFi 6'  },
    { pattern: /wi.?fi\s*5/i,  version: 'WiFi 5'  },
    { pattern: /\bax\b/i,      version: 'WiFi 6'  }, // AX = WiFi 6 generation
    { pattern: /\bac\b/i,      version: 'WiFi 5'  }, // AC = WiFi 5 generation
];

function detectWifi(name) {
    const lower = (name || '').toLowerCase();
    const hasWifi = WIFI_KEYWORDS.some(kw => lower.includes(kw));
    if (!hasWifi) return { wifi: false, wifiVersion: null };

    for (const { pattern, version } of WIFI_VERSION_PATTERNS) {
        if (pattern.test(name)) return { wifi: true, wifiVersion: version };
    }
    return { wifi: true, wifiVersion: null };
}

async function updateMotherboardWifi() {
    const db = await connectToDatabase();
    const col = db.collection('motherboards');

    const all = await col.find({}).toArray();
    console.log(`Found ${all.length} total motherboards\n`);

    let setWifi = 0;
    let setNoWifi = 0;
    let alreadyCorrect = 0;

    for (const mb of all) {
        const name = mb.name || mb.title || '';
        const { wifi, wifiVersion } = detectWifi(name);

        const currentWifi = mb.networking?.wifi;

        // Build the update
        const updateFields = { 'networking.wifi': wifi };
        if (wifiVersion) updateFields['networking.wifiVersion'] = wifiVersion;

        if (currentWifi === wifi) {
            alreadyCorrect++;
            // Still update wifiVersion if we can be more specific
            if (wifiVersion && mb.networking?.wifiVersion !== wifiVersion) {
                await col.updateOne({ _id: mb._id }, { $set: { 'networking.wifiVersion': wifiVersion } });
            }
            continue;
        }

        await col.updateOne({ _id: mb._id }, { $set: updateFields });

        if (wifi) {
            setWifi++;
            console.log(`  ✓ WiFi ON  | ${wifiVersion ? `[${wifiVersion}] ` : ''}${name.substring(0, 80)}`);
        } else {
            setNoWifi++;
        }
    }

    console.log(`\n✅ Set wifi=true:  ${setWifi}`);
    console.log(`✅ Set wifi=false: ${setNoWifi}`);
    console.log(`ℹ️  Already correct: ${alreadyCorrect}`);

    // Summary of WiFi distribution after update
    const wifiBoards = await col.countDocuments({ 'networking.wifi': true });
    const noWifiBoards = await col.countDocuments({ 'networking.wifi': false });
    const unknownBoards = await col.countDocuments({ 'networking.wifi': { $exists: false } });
    console.log(`\nFinal distribution:`);
    console.log(`  WiFi:    ${wifiBoards}`);
    console.log(`  No WiFi: ${noWifiBoards}`);
    console.log(`  Unknown: ${unknownBoards}`);

    process.exit(0);
}

updateMotherboardWifi().catch(e => { console.error(e); process.exit(1); });
