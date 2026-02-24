const { connectToDatabase } = require('../config/database');

// These collections should NOT have Intel/AMD as the manufacturer
const NON_CPU_GPU_COLLECTIONS = ['motherboards', 'rams', 'psus', 'coolers', 'storages', 'cases', 'addons'];

// Same brand patterns as fixManufacturers.js but WITHOUT Intel/AMD
const BRAND_PATTERNS = [
    { pattern: /\bASUS\b|ROG\b|TUF Gaming\b|ASUS TUF\b|ASUS Prime\b|ASUS Pro\b|ASUS ROG\b|ProArt\b/i, brand: 'ASUS' },
    { pattern: /\bMSI\b/i, brand: 'MSI' },
    { pattern: /\bGigabyte\b|AORUS\b/i, brand: 'Gigabyte' },
    { pattern: /\bASRock\b/i, brand: 'ASRock' },
    { pattern: /\bEVGA\b/i, brand: 'EVGA' },
    { pattern: /\bZotac\b/i, brand: 'Zotac' },
    { pattern: /\bSapphire\b/i, brand: 'Sapphire' },
    { pattern: /\bXFX\b/i, brand: 'XFX' },
    { pattern: /\bPowerColor\b/i, brand: 'PowerColor' },
    { pattern: /\bNZXT\b/i, brand: 'NZXT' },
    { pattern: /\bCorsair\b/i, brand: 'Corsair' },
    { pattern: /\bG\.Skill\b|G Skill\b|GSkill\b/i, brand: 'G.Skill' },
    { pattern: /\bKingston\b|HyperX\b/i, brand: 'Kingston' },
    { pattern: /\bCrucial\b/i, brand: 'Crucial' },
    { pattern: /\bTeam(?:Group)?\b|T-Create\b|TEAMGL/i, brand: 'TeamGroup' },
    { pattern: /\bPatriot\b/i, brand: 'Patriot' },
    { pattern: /\bAdata\b|A-DATA\b/i, brand: 'ADATA' },
    { pattern: /\bTranscend\b/i, brand: 'Transcend' },
    { pattern: /\bSK[- ]?Hynix\b/i, brand: 'SK Hynix' },
    { pattern: /\bSamsung\b/i, brand: 'Samsung' },
    { pattern: /\bMicron\b/i, brand: 'Micron' },
    { pattern: /\bOLOy\b/i, brand: 'OLOy' },
    { pattern: /\bKlevv\b/i, brand: 'Klevv' },
    { pattern: /\bPNY\b/i, brand: 'PNY' },
    { pattern: /\bNetac\b/i, brand: 'Netac' },
    { pattern: /\bAcclamator\b/i, brand: 'Acclamator' },
    { pattern: /\bANACOMDA\b/i, brand: 'ANACOMDA' },
    { pattern: /\bKingBank\b/i, brand: 'KingBank' },
    { pattern: /\bOWC\b/i, brand: 'OWC' },
    { pattern: /\bAdamanta\b/i, brand: 'Adamanta' },
    { pattern: /\bNEMIX\b/i, brand: 'NEMIX' },
    { pattern: /\bA-Tech\b|A Tech\b/i, brand: 'A-Tech' },
    { pattern: /\bTimetec\b/i, brand: 'Timetec' },
    { pattern: /\bSeaSonic\b|Seasonic\b/i, brand: 'Seasonic' },
    { pattern: /\bbe quiet!\b|be quiet\b/i, brand: 'be quiet!' },
    { pattern: /\bThermaltake\b/i, brand: 'Thermaltake' },
    { pattern: /\bCooler Master\b|CoolerMaster\b/i, brand: 'Cooler Master' },
    { pattern: /\bAntec\b/i, brand: 'Antec' },
    { pattern: /\bSilverstone\b/i, brand: 'SilverStone' },
    { pattern: /\bFractal Design\b|Fractal\b|Meshify\b|Define\b/i, brand: 'Fractal Design' },
    { pattern: /\bSuper Flower\b|SuperFlower\b/i, brand: 'Super Flower' },
    { pattern: /\bFSP\b/i, brand: 'FSP' },
    { pattern: /\bRosewill\b/i, brand: 'Rosewill' },
    { pattern: /\bDeepCool\b|Deep Cool\b/i, brand: 'DeepCool' },
    { pattern: /\bMontech\b/i, brand: 'Montech' },
    { pattern: /\bSAMA\b/i, brand: 'SAMA' },
    { pattern: /\bRedragon\b/i, brand: 'Redragon' },
    { pattern: /\bSegotep\b/i, brand: 'Segotep' },
    { pattern: /\bApevia\b/i, brand: 'Apevia' },
    { pattern: /\bZalman\b/i, brand: 'Zalman' },
    { pattern: /\bNoctua\b/i, brand: 'Noctua' },
    { pattern: /\bArctic\b/i, brand: 'Arctic' },
    { pattern: /\bScythe\b/i, brand: 'Scythe' },
    { pattern: /\bThermalright\b/i, brand: 'Thermalright' },
    { pattern: /\bEK\b|EkWB\b|EK Water\b/i, brand: 'EK' },
    { pattern: /\bLian Li\b|O11\b/i, brand: 'Lian Li' },
    { pattern: /\bID-COOLING\b|ID-Cooling\b|ID Cooling\b/i, brand: 'ID-Cooling' },
    { pattern: /\bVetroo\b/i, brand: 'Vetroo' },
    { pattern: /\bGigastone\b/i, brand: 'Gigastone' },
    { pattern: /\bPUSKILL\b|PULSKILL\b/i, brand: 'Puskill' },
    { pattern: /\bfanxiang\b/i, brand: 'Fanxiang' },
    { pattern: /\bBiwin\b/i, brand: 'Biwin' },
    { pattern: /\bPhanteks\b/i, brand: 'Phanteks' },
    { pattern: /\bInWin\b/i, brand: 'InWin' },
    { pattern: /\bBitFenix\b/i, brand: 'BitFenix' },
    { pattern: /\bWestern Digital\b|\bWD\b/i, brand: 'Western Digital' },
    { pattern: /\bSeagate\b|IronWolf\b|BarraCuda\b|FireCuda\b/i, brand: 'Seagate' },
    { pattern: /\bSandisk\b/i, brand: 'SanDisk' },
    { pattern: /\bSabrent\b/i, brand: 'Sabrent' },
    { pattern: /\bKioxia\b/i, brand: 'Kioxia' },
    { pattern: /\bLexar\b/i, brand: 'Lexar' },
    { pattern: /\bSilicon Power\b/i, brand: 'Silicon Power' },
    { pattern: /\bXPG\b/i, brand: 'XPG' },
    { pattern: /\bLaCie\b/i, brand: 'LaCie' },
    { pattern: /\bMaxone\b/i, brand: 'Maxone' },
    { pattern: /\bMicro Center\b/i, brand: 'Micro Center' },
    { pattern: /\bAddlink\b/i, brand: 'Addlink' },
    { pattern: /\bHP\b/i, brand: 'HP' },
    { pattern: /\bTOSHIBA\b|Toshiba\b/i, brand: 'Toshiba' },
    { pattern: /\bHGST\b/i, brand: 'HGST' },
];

function detectBrand(name) {
    for (const { pattern, brand } of BRAND_PATTERNS) {
        if (pattern.test(name)) return brand;
    }
    return 'Generic';
}

async function main() {
    const db = await connectToDatabase();
    let totalFixed = 0;

    for (const colName of NON_CPU_GPU_COLLECTIONS) {
        const col = db.collection(colName);

        // Fix Intel/AMD misattributions AND re-evaluate Generic/ID-Cooling in case
        // a better brand is now detectable with the updated patterns
        const wrongDocs = await col.find({
            manufacturer: { $in: ['Intel', 'AMD', 'intel', 'amd', 'Generic', 'ID-Cooling'] }
        }).toArray();

        if (wrongDocs.length === 0) {
            console.log(`${colName}: all good ✓`);
            continue;
        }

        let fixed = 0;
        for (const doc of wrongDocs) {
            const name = doc.name || doc.title || '';
            const brand = detectBrand(name);
            if (brand !== doc.manufacturer) {
                await col.updateOne({ _id: doc._id }, { $set: { manufacturer: brand } });
                console.log(`  ${doc.manufacturer} → ${brand} | ${name.substring(0, 70)}`);
                fixed++;
                totalFixed++;
            }
        }
        console.log(`${colName}: fixed ${fixed}`);
    }

    console.log(`\n✅ Fixed ${totalFixed} total entries.`);
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
