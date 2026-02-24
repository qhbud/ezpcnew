const { connectToDatabase } = require('../config/database');

// Brand detection rules — ordered most-specific first
const BRAND_PATTERNS = [
    // GPU / CPU brands
    { pattern: /\bASUS\b|ROG\b|TUF Gaming\b|ASUS TUF\b|ASUS Prime\b|ASUS Pro\b|ASUS ROG\b|ProArt\b/i, brand: 'ASUS' },
    { pattern: /\bMSI\b/i, brand: 'MSI' },
    { pattern: /\bGigabyte\b|AORUS\b/i, brand: 'Gigabyte' },
    { pattern: /\bASRock\b/i, brand: 'ASRock' },
    { pattern: /\bEVGA\b/i, brand: 'EVGA' },
    { pattern: /\bZotac\b/i, brand: 'Zotac' },
    { pattern: /\bSapphire\b/i, brand: 'Sapphire' },
    { pattern: /\bXFX\b/i, brand: 'XFX' },
    { pattern: /\bPowerColor\b/i, brand: 'PowerColor' },
    { pattern: /\bInno3D\b/i, brand: 'Inno3D' },
    { pattern: /\bPalit\b/i, brand: 'Palit' },
    { pattern: /\bGainward\b/i, brand: 'Gainward' },
    { pattern: /\bColorful\b/i, brand: 'Colorful' },
    { pattern: /\bNZXT\b/i, brand: 'NZXT' },

    // CPU brands
    { pattern: /\bIntel\b/i, brand: 'Intel' },
    { pattern: /\bAMD\b/i, brand: 'AMD' },

    // RAM brands
    { pattern: /\bCorsair\b/i, brand: 'Corsair' },
    { pattern: /\bG\.Skill\b|G Skill\b|GSkill\b/i, brand: 'G.Skill' },
    { pattern: /\bKingston\b|HyperX\b/i, brand: 'Kingston' },
    { pattern: /\bCrucial\b/i, brand: 'Crucial' },
    { pattern: /\bTeam(?:Group)?\b/i, brand: 'TeamGroup' },
    { pattern: /\bPatriot\b/i, brand: 'Patriot' },
    { pattern: /\bAdata\b|A-DATA\b/i, brand: 'ADATA' },
    { pattern: /\bTrancend\b|Transcend\b/i, brand: 'Transcend' },
    { pattern: /\bSK[- ]?Hynix\b/i, brand: 'SK Hynix' },
    { pattern: /\bSamsung\b/i, brand: 'Samsung' },
    { pattern: /\bMicron\b/i, brand: 'Micron' },
    { pattern: /\bOLOy\b/i, brand: 'OLOy' },
    { pattern: /\bKlevv\b/i, brand: 'Klevv' },
    { pattern: /\bAddlink\b/i, brand: 'Addlink' },
    { pattern: /\bPNY\b/i, brand: 'PNY' },
    // XMP is a spec, not a brand — do NOT put a null pattern here as it catches product names like "Non-XMP"

    // PSU brands
    { pattern: /\bSeaSonic\b|Seasonic\b/i, brand: 'Seasonic' },
    { pattern: /\bEVGA\b/i, brand: 'EVGA' },
    { pattern: /\bbe quiet!\b|be quiet\b/i, brand: 'be quiet!' },
    { pattern: /\bThermaltake\b/i, brand: 'Thermaltake' },
    { pattern: /\bCooler Master\b|CoolerMaster\b/i, brand: 'Cooler Master' },
    { pattern: /\bAntec\b/i, brand: 'Antec' },
    { pattern: /\bSilverstone\b/i, brand: 'SilverStone' },
    { pattern: /\bFractal Design\b|Fractal\b/i, brand: 'Fractal Design' },
    { pattern: /\bSuper Flower\b|SuperFlower\b/i, brand: 'Super Flower' },
    { pattern: /\bFSP\b/i, brand: 'FSP' },
    { pattern: /\bRosewill\b/i, brand: 'Rosewill' },
    { pattern: /\bDeepCool\b|Deep Cool\b/i, brand: 'DeepCool' },

    // Cooler brands
    { pattern: /\bNoctua\b/i, brand: 'Noctua' },
    { pattern: /\bArctic\b/i, brand: 'Arctic' },
    { pattern: /\bScythe\b/i, brand: 'Scythe' },
    { pattern: /\bEkwb\b|EK Water\b|EK-\b/i, brand: 'EK' },
    { pattern: /\bLian Li\b/i, brand: 'Lian Li' },

    // Storage brands
    { pattern: /\bWestern Digital\b|\bWD\b/i, brand: 'Western Digital' },
    { pattern: /\bSeagate\b/i, brand: 'Seagate' },
    { pattern: /\bSandisk\b|SanDisk\b/i, brand: 'SanDisk' },
    { pattern: /\bSabrent\b/i, brand: 'Sabrent' },
    { pattern: /\bSK[- ]?Hynix\b/i, brand: 'SK Hynix' },
    { pattern: /\bKioxia\b/i, brand: 'Kioxia' },
    { pattern: /\bFanxiang\b/i, brand: 'Fanxiang' },
    { pattern: /\bLexar\b/i, brand: 'Lexar' },
    { pattern: /\bSilicon Power\b/i, brand: 'Silicon Power' },
    { pattern: /\bXPG\b/i, brand: 'XPG' },
    { pattern: /\bKingspec\b/i, brand: 'KingSpec' },

    // Case brands
    { pattern: /\bFractal Design\b|Fractal\b/i, brand: 'Fractal Design' },
    { pattern: /\bPhanteks\b/i, brand: 'Phanteks' },
    { pattern: /\bBe Quiet!\b|be quiet!\b|be quiet\b/i, brand: 'be quiet!' },
    { pattern: /\bAntec\b/i, brand: 'Antec' },
    { pattern: /\bCorsair\b/i, brand: 'Corsair' },
    { pattern: /\bCooler Master\b|CoolerMaster\b/i, brand: 'Cooler Master' },
    { pattern: /\bNZXT\b/i, brand: 'NZXT' },
    { pattern: /\bThermaltake\b/i, brand: 'Thermaltake' },
    { pattern: /\bLian Li\b/i, brand: 'Lian Li' },
    { pattern: /\bInWin\b/i, brand: 'InWin' },
    { pattern: /\bDefine\b/i, brand: 'Fractal Design' }, // Fractal Define series
    { pattern: /\bSilverstone\b/i, brand: 'SilverStone' },
    { pattern: /\bBitFenix\b/i, brand: 'BitFenix' },
    { pattern: /\bAeroCool\b/i, brand: 'AeroCool' },
    { pattern: /\bRosewill\b/i, brand: 'Rosewill' },
    { pattern: /\bMESHILIANS\b|Meshilians\b/i, brand: 'Meshilians' },
    { pattern: /\bMicro Center\b|MICRO CENTER\b/i, brand: 'Micro Center' },
    { pattern: /\bVetroo\b/i, brand: 'Vetroo' },
    { pattern: /\bID-Cooling\b|ID Cooling\b/i, brand: 'ID-Cooling' },

    // RAM brands (additional)
    { pattern: /\bA-Tech\b|A Tech\b/i, brand: 'A-Tech' },
    { pattern: /\bTimetec\b/i, brand: 'Timetec' },
    { pattern: /\bV-Color\b|VColor\b/i, brand: 'V-Color' },
    { pattern: /\bRipjaws\b/i, brand: 'G.Skill' },
    { pattern: /\bBallistix\b/i, brand: 'Crucial' },
    { pattern: /\bVengeance\b/i, brand: 'Corsair' },
    { pattern: /\bTrident\b/i, brand: 'G.Skill' },
    { pattern: /\bSniper\b/i, brand: 'G.Skill' },
    { pattern: /\bFury\b.*DDR|DDR.*\bFury\b/i, brand: 'Kingston' },
    { pattern: /\bNetac\b/i, brand: 'Netac' },
    { pattern: /\bAcclamator\b/i, brand: 'Acclamator' },
    { pattern: /\bANACOMDA\b/i, brand: 'ANACOMDA' },
    { pattern: /\bKingBank\b/i, brand: 'KingBank' },
    { pattern: /\bOWC\b/i, brand: 'OWC' },
    { pattern: /\bAdamanta\b/i, brand: 'Adamanta' },
    { pattern: /\bNEMIX\b/i, brand: 'NEMIX' },
    { pattern: /\bYongxinsheng\b/i, brand: 'Yongxinsheng' },
    { pattern: /\bT-Create\b|TEAMGL/i, brand: 'TeamGroup' },

    // PSU brands (additional)
    { pattern: /\bRedragon\b/i, brand: 'Redragon' },
    { pattern: /\bSegotep\b/i, brand: 'Segotep' },
    { pattern: /\bApevia\b/i, brand: 'Apevia' },
    { pattern: /\bZalman\b/i, brand: 'Zalman' },
    { pattern: /\bMontech\b|MONTECH\b/i, brand: 'Montech' },
    { pattern: /\bSAMA\b/i, brand: 'SAMA' },
    { pattern: /\bChieftec\b/i, brand: 'Chieftec' },
    { pattern: /\bTagan\b/i, brand: 'Tagan' },
    { pattern: /\bXPG\b/i, brand: 'XPG' },
    { pattern: /\bCybenetics\b/i, brand: null }, // spec label, skip
    { pattern: /\bSilentiumPC\b/i, brand: 'SilentiumPC' },
    { pattern: /\bION\b.*PSU|PSU.*\bION\b/i, brand: 'Fractal Design' },
    { pattern: /\bFocus\b.*PSU|PSU.*\bFocus\b/i, brand: 'Seasonic' },
    { pattern: /\bHX\d{3,4}\b|RM\d{3,4}\b|SF\d{3,4}\b/i, brand: 'Corsair' },
    { pattern: /\bNEO\b.*ECO|ECO.*\bNEO\b/i, brand: 'Seasonic' },
    { pattern: /\bFocus\b/i, brand: 'Seasonic' },

    // Storage brands (additional)
    { pattern: /\bKOOTION\b/i, brand: 'KOOTION' },
    { pattern: /\bMaxDigitalData\b|MDD\b/i, brand: 'MaxDigitalData' },
    { pattern: /\bHP\b(?!.*Hewlett)/i, brand: 'HP' },
    { pattern: /\bHewlett.Packard\b/i, brand: 'HP' },
    { pattern: /\bLaCie\b/i, brand: 'LaCie' },
    { pattern: /\bOyen Digital\b|OyenDigital\b/i, brand: 'Oyen Digital' },
    { pattern: /\bGlyph\b/i, brand: 'Glyph' },
    { pattern: /\bMaxone\b/i, brand: 'Maxone' },
    { pattern: /\bWL\b(?=\s+\d+TB|\s+\d+GB)/i, brand: 'WL' },
    { pattern: /\bTOSHIBA\b|Toshiba\b/i, brand: 'Toshiba' },
    { pattern: /\bHGST\b/i, brand: 'HGST' },
    { pattern: /\bIron Wolf\b|IronWolf\b/i, brand: 'Seagate' },
    { pattern: /\bBarraCuda\b|BaraCuda\b/i, brand: 'Seagate' },
    { pattern: /\bFireCuda\b/i, brand: 'Seagate' },
    { pattern: /\bBlue\b.*SSD|Green\b.*SSD|Red\b.*SSD|Purple\b.*SSD|Gold\b.*SSD/i, brand: 'Western Digital' },

    // Case brands (additional)
    { pattern: /\bH1 HYXN\b|HYXN\b/i, brand: 'HYXN' },
    { pattern: /\bRaidmax\b/i, brand: 'Raidmax' },
    { pattern: /\bDeepCool\b|Deep Cool\b/i, brand: 'DeepCool' },
    { pattern: /\bO11\b|O11 Dynamic\b/i, brand: 'Lian Li' },
    { pattern: /\bMeshify\b/i, brand: 'Fractal Design' },
    { pattern: /\bPopular\b/i, brand: null }, // skip generic terms
];

function detectBrand(name) {
    const text = name || '';
    for (const { pattern, brand } of BRAND_PATTERNS) {
        if (pattern.test(text)) return brand; // null means skip
    }
    return null;
}

const MISSING_QUERY = {
    $or: [
        { manufacturer: { $exists: false } },
        { manufacturer: '' },
        { manufacturer: 'Unknown' },
        { manufacturer: 'unknown' },
        { manufacturer: null }
    ]
};

async function fixCollection(col, label) {
    const docs = await col.find(MISSING_QUERY).toArray();
    if (docs.length === 0) {
        console.log(`${label}: all good ✓`);
        return;
    }

    let fixed = 0, skipped = 0;
    const unresolved = [];

    for (const doc of docs) {
        const name = doc.name || doc.title || '';
        const brand = detectBrand(name);
        if (brand) {
            await col.updateOne({ _id: doc._id }, { $set: { manufacturer: brand } });
            fixed++;
        } else {
            // Fall back to 'Generic' so the UI never shows 'Unknown'
            await col.updateOne({ _id: doc._id }, { $set: { manufacturer: 'Generic' } });
            skipped++;
            unresolved.push(`  → Generic: "${name.substring(0, 80)}"`);
        }
    }

    console.log(`${label}: fixed ${fixed}, still unknown ${skipped}`);
    if (unresolved.length > 0) {
        unresolved.slice(0, 5).forEach(l => console.log(l));
        if (unresolved.length > 5) console.log(`  ... and ${unresolved.length - 5} more`);
    }
}

async function main() {
    const db = await connectToDatabase();

    const targets = [
        { name: 'motherboards', label: 'Motherboards' },
        { name: 'rams',         label: 'RAM' },
        { name: 'psus',         label: 'PSUs' },
        { name: 'coolers',      label: 'Coolers' },
        { name: 'storages',     label: 'Storage' },
        { name: 'cases',        label: 'Cases' },
        { name: 'gpus',         label: 'GPUs' },
        { name: 'cpus',         label: 'CPUs' },
    ];

    for (const { name, label } of targets) {
        await fixCollection(db.collection(name), label);
    }

    console.log('\nDone.');
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
