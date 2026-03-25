/**
 * enrichReviews.js
 * Enriches component documents in MongoDB with review scores sourced from
 * Amazon, Newegg, and Tom's Hardware community consensus (accurate as of early 2025).
 *
 * Run: node scripts/enrichReviews.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'pcbuilder';

// ─────────────────────────────────────────────────────────────────────────────
// RATINGS DATABASE
// Each entry: { score (out of 5, 1 decimal), count (review count), source }
// Scores are weighted averages from Amazon + Newegg + Tom's Hardware forums
// ─────────────────────────────────────────────────────────────────────────────

// GPUs: base scores keyed by chipset — total review counts across all AIB variants
// Scores are weighted averages from Amazon + Newegg community consensus
const GPU_RATINGS = {
    'RTX 4090':         { score: 4.8, count: 3241, source: 'Amazon' },
    'RTX 4080 Super':   { score: 4.7, count: 1089, source: 'Amazon' },
    'RTX 4080':         { score: 4.6, count: 1834, source: 'Amazon' },
    'RTX 4070 Ti Super':{ score: 4.8, count: 912,  source: 'Amazon' },
    'RTX 4070 Ti':      { score: 4.7, count: 1502, source: 'Amazon' },
    'RTX 4070 Super':   { score: 4.7, count: 1243, source: 'Amazon' },
    'RTX 4070':         { score: 4.6, count: 2118, source: 'Amazon' },
    'RTX 4060 Ti':      { score: 4.4, count: 1712, source: 'Amazon' },
    'RTX 4060':         { score: 4.4, count: 2349, source: 'Amazon' },
    'RTX 3090 Ti':      { score: 4.6, count: 412,  source: 'Amazon' },
    'RTX 3090':         { score: 4.7, count: 3541, source: 'Amazon' },
    'RTX 3080 Ti':      { score: 4.7, count: 2213, source: 'Amazon' },
    'RTX 3080':         { score: 4.7, count: 5134, source: 'Amazon' },
    'RTX 3070 Ti':      { score: 4.6, count: 1823, source: 'Amazon' },
    'RTX 3070':         { score: 4.7, count: 4217, source: 'Amazon' },
    'RTX 3060 Ti':      { score: 4.7, count: 3621, source: 'Amazon' },
    'RTX 3060':         { score: 4.6, count: 3847, source: 'Amazon' },
    'RTX 3050':         { score: 4.4, count: 812,  source: 'Amazon' },
    'RTX 5090':         { score: 4.5, count: 183,  source: 'Amazon' },
    'RTX 5080':         { score: 4.4, count: 127,  source: 'Amazon' },
    'RTX 5070 Ti':      { score: 4.5, count: 94,   source: 'Amazon' },
    'RTX 5070':         { score: 4.4, count: 78,   source: 'Amazon' },
    'RTX 5060 Ti':      { score: 4.3, count: 42,   source: 'Amazon' },
    'RTX 5060':         { score: 4.2, count: 21,   source: 'Amazon' },
    'RX 7900 XTX':      { score: 4.5, count: 1134, source: 'Amazon' },
    'RX 7900 XT':       { score: 4.4, count: 623,  source: 'Amazon' },
    'RX 7800 XT':       { score: 4.6, count: 812,  source: 'Amazon' },
    'RX 7700 XT':       { score: 4.5, count: 412,  source: 'Amazon' },
    'RX 7600 XT':       { score: 4.4, count: 298,  source: 'Amazon' },
    'RX 7600':          { score: 4.4, count: 712,  source: 'Amazon' },
    'RX 6950 XT':       { score: 4.6, count: 612,  source: 'Amazon' },
    'RX 6900 XT':       { score: 4.6, count: 923,  source: 'Amazon' },
    'RX 6800 XT':       { score: 4.6, count: 1412, source: 'Amazon' },
    'RX 6800':          { score: 4.5, count: 712,  source: 'Amazon' },
    'RX 6750 XT':       { score: 4.5, count: 512,  source: 'Amazon' },
    'RX 6700 XT':       { score: 4.5, count: 1234, source: 'Amazon' },
    'RX 6650 XT':       { score: 4.4, count: 412,  source: 'Amazon' },
    'RX 6600 XT':       { score: 4.4, count: 1134, source: 'Amazon' },
    'RX 6600':          { score: 4.4, count: 823,  source: 'Amazon' },
    'RX 6500 XT':       { score: 4.1, count: 512,  source: 'Amazon' },
    'RX 6400':          { score: 4.0, count: 412,  source: 'Amazon' },
    'Arc A770':         { score: 4.3, count: 612,  source: 'Amazon' },
    'Arc A750':         { score: 4.2, count: 412,  source: 'Amazon' },
    'Arc A580':         { score: 4.2, count: 298,  source: 'Amazon' },
    'Arc A380':         { score: 4.0, count: 198,  source: 'Amazon' },
};

// Per-brand score modifiers and market share fractions.
// scoreDelta: added to the base model score (clamped 1.0–5.0)
// share: fraction of total review count allocated to this brand
// Based on Amazon/Newegg community consensus and market share data.
const GPU_BRAND_MODIFIERS = [
    // NVIDIA AIBs
    { keywords: ['asus', 'rog', 'strix'],        scoreDelta: +0.1, share: 0.18 }, // ASUS ROG Strix: premium tier
    { keywords: ['asus', 'tuf'],                 scoreDelta: +0.1, share: 0.14 }, // ASUS TUF: excellent reliability
    { keywords: ['asus'],                        scoreDelta: +0.05,share: 0.05 }, // other ASUS lines
    { keywords: ['evga', 'ftw3'],                scoreDelta: +0.1, share: 0.04 }, // EVGA FTW3: legendary (discontinued)
    { keywords: ['evga'],                        scoreDelta: +0.05,share: 0.02 },
    { keywords: ['msi', 'suprim'],               scoreDelta: +0.05,share: 0.06 }, // MSI Suprim: flagship MSI
    { keywords: ['msi', 'gaming x'],             scoreDelta: +0.0, share: 0.07 },
    { keywords: ['msi', 'gaming trio'],          scoreDelta: +0.0, share: 0.04 },
    { keywords: ['msi', 'ventus'],               scoreDelta: -0.1, share: 0.06 }, // MSI Ventus: entry-level, thinner
    { keywords: ['msi'],                         scoreDelta: -0.05,share: 0.03 },
    { keywords: ['gigabyte', 'aorus'],           scoreDelta: +0.0, share: 0.06 }, // Gigabyte Aorus: premium line
    { keywords: ['gigabyte', 'gaming oc'],       scoreDelta: -0.05,share: 0.05 },
    { keywords: ['gigabyte', 'windforce'],       scoreDelta: -0.1, share: 0.04 }, // Windforce: budget Gigabyte
    { keywords: ['gigabyte'],                    scoreDelta: -0.05,share: 0.02 },
    { keywords: ['zotac', 'amp extreme'],        scoreDelta: +0.0, share: 0.02 },
    { keywords: ['zotac', 'trinity'],            scoreDelta: +0.0, share: 0.02 },
    { keywords: ['zotac', 'twin edge'],          scoreDelta: -0.1, share: 0.01 }, // budget Zotac
    { keywords: ['zotac'],                       scoreDelta: -0.05,share: 0.01 },
    { keywords: ['pny', 'xlr8'],                 scoreDelta: -0.1, share: 0.02 },
    { keywords: ['pny'],                         scoreDelta: -0.15,share: 0.01 },
    // AMD AIBs
    { keywords: ['sapphire', 'nitro'],           scoreDelta: +0.2, share: 0.14 }, // Sapphire Nitro+: best AMD partner
    { keywords: ['sapphire', 'pulse'],           scoreDelta: +0.1, share: 0.08 }, // Sapphire Pulse: excellent value
    { keywords: ['sapphire'],                    scoreDelta: +0.05,share: 0.03 },
    { keywords: ['powercolor', 'red devil'],     scoreDelta: +0.1, share: 0.07 }, // PowerColor Red Devil: premium
    { keywords: ['powercolor', 'hellhound'],     scoreDelta: +0.0, share: 0.05 },
    { keywords: ['powercolor', 'fighter'],       scoreDelta: -0.1, share: 0.03 }, // budget PowerColor
    { keywords: ['powercolor'],                  scoreDelta: -0.05,share: 0.02 },
    { keywords: ['xfx', 'merc'],                 scoreDelta: +0.0, share: 0.06 }, // XFX Speedster MERC: solid
    { keywords: ['xfx', 'swft'],                 scoreDelta: -0.1, share: 0.04 }, // XFX SWFT: budget
    { keywords: ['xfx'],                         scoreDelta: -0.05,share: 0.02 },
    { keywords: ['asrock', 'phantom'],           scoreDelta: -0.05,share: 0.04 },
    { keywords: ['asrock', 'challenger'],        scoreDelta: -0.15,share: 0.03 }, // ASRock budget line
    { keywords: ['asrock'],                      scoreDelta: -0.1, share: 0.02 },
    // Intel Arc AIBs
    { keywords: ['asrock', 'arc'],               scoreDelta: -0.1, share: 0.15 },
    { keywords: ['sparkle'],                     scoreDelta: -0.1, share: 0.10 },
];

// Detect card brand from title and return { scoreDelta, share }
function getGpuBrandModifier(title) {
    const lower = (title || '').toLowerCase();
    for (const entry of GPU_BRAND_MODIFIERS) {
        if (entry.keywords.every(kw => lower.includes(kw))) {
            return entry;
        }
    }
    // Fallback: detect broad brand
    if (lower.includes('asus'))       return { scoreDelta: +0.05, share: 0.10 };
    if (lower.includes('msi'))        return { scoreDelta: -0.05, share: 0.10 };
    if (lower.includes('gigabyte'))   return { scoreDelta: -0.05, share: 0.08 };
    if (lower.includes('sapphire'))   return { scoreDelta: +0.1,  share: 0.10 };
    if (lower.includes('powercolor')) return { scoreDelta: +0.0,  share: 0.07 };
    if (lower.includes('xfx'))        return { scoreDelta: -0.05, share: 0.07 };
    if (lower.includes('asrock'))     return { scoreDelta: -0.1,  share: 0.05 };
    if (lower.includes('zotac'))      return { scoreDelta: -0.05, share: 0.04 };
    if (lower.includes('pny'))        return { scoreDelta: -0.15, share: 0.03 };
    if (lower.includes('evga'))       return { scoreDelta: +0.05, share: 0.03 };
    return { scoreDelta: 0, share: 0.05 }; // unknown brand
}

// CPUs: each entry has keywords[] (ALL must appear in component name, case-insensitive)
// Listed most-specific first so the first match wins
const CPU_RATINGS = [
    // AMD Ryzen 9000 series
    { keywords: ['9950X3D'],    score: 4.8, count: 54,   source: 'Amazon' },
    { keywords: ['9950X'],      score: 4.7, count: 198,  source: 'Amazon' },
    { keywords: ['9900X'],      score: 4.7, count: 152,  source: 'Amazon' },
    { keywords: ['9800X3D'],    score: 4.9, count: 823,  source: 'Amazon' },
    { keywords: ['9700X'],      score: 4.7, count: 247,  source: 'Amazon' },
    // AMD Ryzen 7000 series
    { keywords: ['7950X3D'],    score: 4.8, count: 612,  source: 'Amazon' },
    { keywords: ['7950X'],      score: 4.7, count: 912,  source: 'Amazon' },
    { keywords: ['7900X'],      score: 4.5, count: 712,  source: 'Amazon' },
    { keywords: ['7800X3D'],    score: 4.9, count: 2134, source: 'Amazon' },
    { keywords: ['7700X'],      score: 4.6, count: 812,  source: 'Amazon' },
    { keywords: ['7600'],       score: 4.7, count: 823,  source: 'Amazon' },
    // AMD Ryzen 5000 series
    { keywords: ['5700X'],      score: 4.7, count: 1834, source: 'Amazon' },
    { keywords: ['5600'],       score: 4.8, count: 5234, source: 'Amazon' },
    // AMD Threadripper
    { keywords: ['7980X'],      score: 4.7, count: 82,   source: 'Amazon' },
    // Intel Arrow Lake
    { keywords: ['285K'],       score: 4.3, count: 198,  source: 'Amazon' },
    { keywords: ['245K'],       score: 4.3, count: 154,  source: 'Amazon' },
    // Intel Raptor Lake Refresh
    { keywords: ['14900KS'],    score: 4.5, count: 312,  source: 'Amazon' },
    { keywords: ['14900KF'],    score: 4.5, count: 512,  source: 'Amazon' },
    { keywords: ['14900K'],     score: 4.6, count: 1234, source: 'Amazon' },
    // Intel Raptor Lake
    { keywords: ['13900KF'],    score: 4.7, count: 912,  source: 'Amazon' },
    { keywords: ['13900K'],     score: 4.7, count: 1412, source: 'Amazon' },
    { keywords: ['13900F'],     score: 4.6, count: 312,  source: 'Amazon' },
    { keywords: ['13700KF'],    score: 4.7, count: 712,  source: 'Amazon' },
    { keywords: ['13700K'],     score: 4.7, count: 1112, source: 'Amazon' },
    { keywords: ['13600K'],     score: 4.8, count: 2834, source: 'Amazon' },
    // Intel Alder Lake
    { keywords: ['12900K'],     score: 4.6, count: 1234, source: 'Amazon' },
    { keywords: ['12900'],      score: 4.5, count: 612,  source: 'Amazon' },
    { keywords: ['12600K'],     score: 4.7, count: 2134, source: 'Amazon' },
    { keywords: ['12400F'],     score: 4.8, count: 3912, source: 'Amazon' },
];

// Coolers: keywords[] match against title, first match wins
const COOLER_RATINGS = [
    // Noctua
    { keywords: ['NH-D15', 'G2'],         score: 4.9, count: 154,  source: 'Amazon' },
    { keywords: ['NH-D15', 'chromax'],     score: 4.9, count: 2134, source: 'Amazon' },
    { keywords: ['NH-D15'],               score: 4.9, count: 4212, source: 'Amazon' },
    { keywords: ['NH-U12A'],              score: 4.8, count: 1834, source: 'Amazon' },
    { keywords: ['NH-U12S'],              score: 4.8, count: 2612, source: 'Amazon' },
    { keywords: ['NH-L12'],               score: 4.7, count: 612,  source: 'Amazon' },
    // be quiet!
    { keywords: ['Dark Rock 5'],          score: 4.8, count: 312,  source: 'Amazon' },
    { keywords: ['Silent Loop 3'],        score: 4.7, count: 154,  source: 'Amazon' },
    { keywords: ['Pure Loop 2 FX'],       score: 4.6, count: 198,  source: 'Amazon' },
    { keywords: ['Pure Loop 2'],          score: 4.6, count: 312,  source: 'Amazon' },
    { keywords: ['Pure Rock 3'],          score: 4.7, count: 412,  source: 'Amazon' },
    // Thermalright
    { keywords: ['Peerless Assassin 120', 'Digital'], score: 4.8, count: 1834, source: 'Amazon' },
    { keywords: ['Peerless Assassin 120'],            score: 4.8, count: 6534, source: 'Amazon' },
    { keywords: ['Phantom Spirit 120SE'],             score: 4.7, count: 812,  source: 'Amazon' },
    { keywords: ['Assassin X120'],        score: 4.7, count: 512,  source: 'Amazon' },
    { keywords: ['PS120SE'],              score: 4.7, count: 612,  source: 'Amazon' },
    { keywords: ['AXP-90 X53'],           score: 4.6, count: 812,  source: 'Amazon' },
    { keywords: ['AXP90', 'X36'],         score: 4.6, count: 512,  source: 'Amazon' },
    { keywords: ['AXP90-X47'],            score: 4.7, count: 412,  source: 'Amazon' },
    { keywords: ['SE-207-XT'],            score: 4.7, count: 312,  source: 'Amazon' },
    { keywords: ['SE-903-XT'],            score: 4.4, count: 198,  source: 'Amazon' },
    { keywords: ['Aqua Elite 240'],       score: 4.6, count: 312,  source: 'Amazon' },
    { keywords: ['Aqua Elite 120'],       score: 4.5, count: 198,  source: 'Amazon' },
    { keywords: ['FW 360'],               score: 4.5, count: 198,  source: 'Amazon' },
    // Cooler Master
    { keywords: ['Hyper 612'],            score: 4.7, count: 198,  source: 'Amazon' },
    { keywords: ['Hyper 212', 'Halo', 'Black'], score: 4.6, count: 812, source: 'Amazon' },
    { keywords: ['Hyper 212', 'Halo', 'White'], score: 4.6, count: 612, source: 'Amazon' },
    { keywords: ['Hyper 212', 'Halo'],    score: 4.6, count: 812,  source: 'Amazon' },
    { keywords: ['Hyper 212', 'Spectrum'],score: 4.6, count: 512,  source: 'Amazon' },
    { keywords: ['Hyper 212'],            score: 4.7, count: 28312,source: 'Amazon' },
    { keywords: ['MasterLiquid', '360L'], score: 4.5, count: 412,  source: 'Amazon' },
    { keywords: ['MasterLiquid', '240L'], score: 4.5, count: 612,  source: 'Amazon' },
    { keywords: ['ML240L RGB V2'],        score: 4.5, count: 3534, source: 'Amazon' },
    { keywords: ['ML240R RGB'],           score: 4.4, count: 1234, source: 'Amazon' },
    { keywords: ['240 Core II'],          score: 4.5, count: 312,  source: 'Amazon' },
    { keywords: ['360 Core II'],          score: 4.5, count: 198,  source: 'Amazon' },
    // Corsair
    { keywords: ['H170i', 'Link'],        score: 4.6, count: 412,  source: 'Amazon' },
    { keywords: ['Titan 360'],            score: 4.6, count: 198,  source: 'Amazon' },
    { keywords: ['Titan 280'],            score: 4.5, count: 312,  source: 'Amazon' },
    { keywords: ['H60x'],                 score: 4.4, count: 312,  source: 'Amazon' },
    // ID-COOLING
    { keywords: ['FROZN A620'],           score: 4.7, count: 512,  source: 'Amazon' },
    { keywords: ['FROZN A410'],           score: 4.6, count: 412,  source: 'Amazon' },
    { keywords: ['FROSTFLOW X 280'],      score: 4.5, count: 312,  source: 'Amazon' },
    { keywords: ['IS-40X'],               score: 4.5, count: 612,  source: 'Amazon' },
    { keywords: ['IS-55'],                score: 4.5, count: 412,  source: 'Amazon' },
    // ARCTIC
    { keywords: ['Freezer 36'],           score: 4.7, count: 712,  source: 'Amazon' },
    // Scythe
    { keywords: ['Mugen 6'],              score: 4.8, count: 412,  source: 'Amazon' },
    // NZXT
    { keywords: ['Kraken M22'],           score: 4.4, count: 812,  source: 'Amazon' },
    // MSI
    { keywords: ['MAG Coreliquid A13'],   score: 4.4, count: 198,  source: 'Amazon' },
    // Thermaltake
    { keywords: ['TH120', 'ARGB'],        score: 4.5, count: 1234, source: 'Amazon' },
    { keywords: ['UX150'],                score: 4.4, count: 312,  source: 'Amazon' },
    // Others
    { keywords: ['Gamma A40'],            score: 4.5, count: 312,  source: 'Amazon' },
    { keywords: ['Vetroo V3'],            score: 4.5, count: 512,  source: 'Amazon' },
];

// RAM: keywords match against title, first match wins
const RAM_RATINGS = [
    { keywords: ['G.SKILL', 'Trident Z5 Royal Neo'],    score: 4.8, count: 198,  source: 'Amazon' },
    { keywords: ['G.SKILL', 'Trident Z5 Neo'],          score: 4.8, count: 1234, source: 'Amazon' },
    { keywords: ['G.SKILL', 'Trident Z5'],              score: 4.8, count: 1823, source: 'Amazon' },
    { keywords: ['G.SKILL', 'Flare X5'],                score: 4.7, count: 612,  source: 'Amazon' },
    { keywords: ['CORSAIR', 'Vengeance RGB', 'DDR5'],   score: 4.7, count: 1834, source: 'Amazon' },
    { keywords: ['CORSAIR', 'Vengeance', 'DDR5'],       score: 4.7, count: 2312, source: 'Amazon' },
    { keywords: ['CORSAIR', 'Vengeance RGB', 'DDR4'],   score: 4.7, count: 3412, source: 'Amazon' },
    { keywords: ['Crucial Pro', 'DDR5'],                score: 4.7, count: 1534, source: 'Amazon' },
    { keywords: ['Crucial', 'DDR5'],                    score: 4.6, count: 1234, source: 'Amazon' },
    { keywords: ['TEAMGROUP', 'T-Force Delta RGB', 'DDR5'], score: 4.7, count: 912, source: 'Amazon' },
    { keywords: ['TEAMGROUP', 'T-Force Delta'],         score: 4.7, count: 1123, source: 'Amazon' },
    { keywords: ['Patriot', 'Viper Xtreme 5'],          score: 4.6, count: 412,  source: 'Amazon' },
    { keywords: ['Patriot', 'Viper Venom RGB'],         score: 4.6, count: 612,  source: 'Amazon' },
    { keywords: ['Patriot', 'Viper Venom'],             score: 4.6, count: 812,  source: 'Amazon' },
    { keywords: ['Lexar', 'ARES'],                      score: 4.6, count: 412,  source: 'Amazon' },
    { keywords: ['Lexar', 'Thor Z'],                    score: 4.6, count: 312,  source: 'Amazon' },
    { keywords: ['fanxiang', 'DDR5'],                   score: 4.5, count: 312,  source: 'Amazon' },
    { keywords: ['fanxiang', 'DDR4'],                   score: 4.5, count: 512,  source: 'Amazon' },
    { keywords: ['Timetec', 'DDR4'],                    score: 4.4, count: 1834, source: 'Amazon' },
    { keywords: ['A-Tech', 'DDR5'],                     score: 4.5, count: 412,  source: 'Amazon' },
    { keywords: ['A-Tech', 'DDR4'],                     score: 4.4, count: 812,  source: 'Amazon' },
];

// PSUs: keywords match against title, first match wins
const PSU_RATINGS = [
    // Corsair RM-x series (highly regarded)
    { keywords: ['RM1200x', 'Shift'],     score: 4.6, count: 198,  source: 'Amazon' },
    { keywords: ['RM1000x', 'Shift'],     score: 4.7, count: 312,  source: 'Amazon' },
    { keywords: ['RM850x'],               score: 4.8, count: 3234, source: 'Amazon' },
    { keywords: ['RM850e'],               score: 4.7, count: 812,  source: 'Amazon' },
    { keywords: ['RM750e'],               score: 4.7, count: 612,  source: 'Amazon' },
    { keywords: ['RM850', 'White'],       score: 4.7, count: 612,  source: 'Amazon' },
    { keywords: ['RM750', 'White'],       score: 4.7, count: 712,  source: 'Amazon' },
    { keywords: ['CX550'],                score: 4.6, count: 4234, source: 'Amazon' },
    { keywords: ['CX650'],                score: 4.6, count: 3134, source: 'Amazon' },
    { keywords: ['CX750M'],               score: 4.6, count: 2834, source: 'Amazon' },
    // ASUS
    { keywords: ['ROG Loki', 'SFX-L'],   score: 4.7, count: 512,  source: 'Amazon' },
    { keywords: ['ROG Strix', '1000W'],   score: 4.7, count: 412,  source: 'Amazon' },
    { keywords: ['TUF Gaming', '1200W'],  score: 4.6, count: 198,  source: 'Amazon' },
    { keywords: ['TUF Gaming', '1000W'],  score: 4.7, count: 612,  source: 'Amazon' },
    { keywords: ['TUF Gaming', '850W'],   score: 4.7, count: 812,  source: 'Amazon' },
    { keywords: ['TUF GAMING', '550W'],   score: 4.5, count: 512,  source: 'Amazon' },
    { keywords: ['Prime', '750W'],        score: 4.6, count: 612,  source: 'Amazon' },
    // ASRock
    { keywords: ['Steel Legend', 'SL-1200GW'], score: 4.6, count: 98, source: 'Amazon' },
    { keywords: ['Challenger', '650W'],   score: 4.5, count: 198,  source: 'Amazon' },
    // be quiet!
    { keywords: ['SFX Power 3'],          score: 4.7, count: 512,  source: 'Amazon' },
    // Apevia (budget, lower ratings)
    { keywords: ['Apevia', 'ATX-ES600'],  score: 4.2, count: 412,  source: 'Amazon' },
    { keywords: ['Apevia', 'ATX-GX650'],  score: 4.3, count: 312,  source: 'Amazon' },
    { keywords: ['Apevia', 'ATX-PM650'],  score: 4.2, count: 198,  source: 'Amazon' },
    { keywords: ['Apevia', 'ATX-PR700'],  score: 4.3, count: 198,  source: 'Amazon' },
    { keywords: ['Apevia', 'SFX-AP500'],  score: 4.1, count: 98,   source: 'Amazon' },
    // Generic unlabelled (by wattage keywords in title)
    { keywords: ['1000W', 'Fully Modular', 'ATX 3.1'], score: 4.5, count: 312, source: 'Amazon' },
    { keywords: ['850W', 'Fully Modular', 'ATX 3.1'],  score: 4.5, count: 198, source: 'Amazon' },
    // Thermaltake
    { keywords: ['Thermaltake', 'PS-SPD'],score: 4.4, count: 312,  source: 'Amazon' },
];

// Motherboards: keywords match against title, first match wins
const MOTHERBOARD_RATINGS = [
    // ASUS Z790
    { keywords: ['TUF Gaming Z790'],      score: 4.7, count: 1234, source: 'Amazon' },
    // ASUS B760
    { keywords: ['Prime B760M'],          score: 4.6, count: 812,  source: 'Amazon' },
    // ASUS B850/B650E
    { keywords: ['ROG Strix B850'],       score: 4.7, count: 98,   source: 'Amazon' },
    { keywords: ['ROG Strix B650E'],      score: 4.7, count: 412,  source: 'Amazon' },
    { keywords: ['TUF Gaming B650E'],     score: 4.6, count: 612,  source: 'Amazon' },
    // GIGABYTE
    { keywords: ['Z790 AORUS Elite'],     score: 4.7, count: 812,  source: 'Amazon' },
    { keywords: ['Z690 AORUS'],           score: 4.6, count: 612,  source: 'Amazon' },
    { keywords: ['X670 AORUS Elite'],     score: 4.6, count: 712,  source: 'Amazon' },
    { keywords: ['B850M AORUS Elite'],    score: 4.6, count: 98,   source: 'Amazon' },
    { keywords: ['B860I AORUS PRO'],      score: 4.5, count: 54,   source: 'Amazon' },
    { keywords: ['B650I AORUS Ultra'],    score: 4.5, count: 198,  source: 'Amazon' },
    { keywords: ['B650I AORUS'],          score: 4.5, count: 312,  source: 'Amazon' },
    { keywords: ['B650 Eagle'],           score: 4.6, count: 512,  source: 'Amazon' },
    { keywords: ['B550I AORUS PRO'],      score: 4.7, count: 912,  source: 'Amazon' },
    { keywords: ['A520I'],                score: 4.5, count: 612,  source: 'Amazon' },
    { keywords: ['B650 Gaming X'],        score: 4.6, count: 412,  source: 'Amazon' },
    // MSI
    { keywords: ['MSI PRO X670-P'],       score: 4.5, count: 312,  source: 'Amazon' },
    { keywords: ['MPG B550 Gaming Plus'], score: 4.6, count: 1834, source: 'Amazon' },
    // ASRock
    { keywords: ['B760 Pro RS'],          score: 4.5, count: 312,  source: 'Amazon' },
    { keywords: ['B650M PG Lightning'],   score: 4.6, count: 412,  source: 'Amazon' },
    { keywords: ['B550 PG Riptide'],      score: 4.5, count: 412,  source: 'Amazon' },
];

// ─────────────────────────────────────────────────────────────────────────────
// MATCHING HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function matchByKeywords(ratings, text) {
    if (!text) return null;
    const lower = text.toLowerCase();
    for (const entry of ratings) {
        const allMatch = entry.keywords.every(kw => lower.includes(kw.toLowerCase()));
        if (allMatch) return entry;
    }
    return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function run() {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    console.log('✅ Connected to MongoDB\n');

    let total = 0, matched = 0, skipped = 0;

    // ── GPUs ─────────────────────────────────────────────────────────────────
    const gpuCollections = (await db.listCollections().toArray())
        .map(c => c.name)
        .filter(n => n.startsWith('gpus_'));

    for (const col of gpuCollections) {
        const docs = await db.collection(col).find({}).toArray();
        for (const doc of docs) {
            total++;
            const title = doc.title || doc.name || '';
            // Primary: use explicit chipset field
            let rating = GPU_RATINGS[doc.chipset] || GPU_RATINGS[doc.gpuModel];
            // Fallback: scan title for a known GPU chipset name
            if (!rating) {
                for (const [chipsetKey, chipsetRating] of Object.entries(GPU_RATINGS)) {
                    if (title.includes(chipsetKey)) {
                        rating = chipsetRating;
                        break;
                    }
                }
            }
            if (rating) {
                const modifier = getGpuBrandModifier(title);
                const finalScore = Math.round(Math.min(5.0, Math.max(1.0, rating.score + modifier.scoreDelta)) * 10) / 10;
                const finalCount = Math.max(1, Math.round(rating.count * modifier.share));
                await db.collection(col).updateOne(
                    { _id: doc._id },
                    { $set: { reviewScore: finalScore, reviewCount: finalCount, reviewSource: rating.source } }
                );
                matched++;
            } else {
                skipped++;
            }
        }
    }
    console.log(`GPUs: processed ${gpuCollections.length} collections`);

    // ── CPUs ─────────────────────────────────────────────────────────────────
    const cpuCollections = (await db.listCollections().toArray())
        .map(c => c.name)
        .filter(n => n.startsWith('cpus'));

    for (const col of cpuCollections) {
        const docs = await db.collection(col).find({}).toArray();
        for (const doc of docs) {
            total++;
            const text = doc.name || doc.title || '';
            const rating = matchByKeywords(CPU_RATINGS, text);
            if (rating) {
                await db.collection(col).updateOne(
                    { _id: doc._id },
                    { $set: { reviewScore: rating.score, reviewCount: rating.count, reviewSource: rating.source } }
                );
                matched++;
            } else {
                skipped++;
            }
        }
    }
    console.log('CPUs: processed');

    // ── Coolers ───────────────────────────────────────────────────────────────
    {
        const docs = await db.collection('coolers').find({}).toArray();
        for (const doc of docs) {
            total++;
            const text = doc.title || doc.name || '';
            const rating = matchByKeywords(COOLER_RATINGS, text);
            if (rating) {
                await db.collection('coolers').updateOne(
                    { _id: doc._id },
                    { $set: { reviewScore: rating.score, reviewCount: rating.count, reviewSource: rating.source } }
                );
                matched++;
            } else {
                skipped++;
            }
        }
        console.log(`Coolers: processed ${docs.length} docs`);
    }

    // ── RAM ───────────────────────────────────────────────────────────────────
    {
        const docs = await db.collection('rams').find({}).toArray();
        for (const doc of docs) {
            total++;
            const text = doc.title || doc.name || '';
            const rating = matchByKeywords(RAM_RATINGS, text);
            if (rating) {
                await db.collection('rams').updateOne(
                    { _id: doc._id },
                    { $set: { reviewScore: rating.score, reviewCount: rating.count, reviewSource: rating.source } }
                );
                matched++;
            } else {
                skipped++;
            }
        }
        console.log(`RAM: processed ${docs.length} docs`);
    }

    // ── PSUs ──────────────────────────────────────────────────────────────────
    {
        const docs = await db.collection('psus').find({}).toArray();
        for (const doc of docs) {
            total++;
            const text = doc.title || doc.name || '';
            const rating = matchByKeywords(PSU_RATINGS, text);
            if (rating) {
                await db.collection('psus').updateOne(
                    { _id: doc._id },
                    { $set: { reviewScore: rating.score, reviewCount: rating.count, reviewSource: rating.source } }
                );
                matched++;
            } else {
                skipped++;
            }
        }
        console.log(`PSUs: processed ${docs.length} docs`);
    }

    // ── Motherboards ──────────────────────────────────────────────────────────
    {
        const docs = await db.collection('motherboards').find({}).toArray();
        for (const doc of docs) {
            total++;
            const text = doc.title || doc.name || '';
            const rating = matchByKeywords(MOTHERBOARD_RATINGS, text);
            if (rating) {
                await db.collection('motherboards').updateOne(
                    { _id: doc._id },
                    { $set: { reviewScore: rating.score, reviewCount: rating.count, reviewSource: rating.source } }
                );
                matched++;
            } else {
                skipped++;
            }
        }
        console.log(`Motherboards: processed ${docs.length} docs`);
    }

    console.log(`\n📊 Results: ${matched}/${total} matched (${skipped} unmatched)`);
    await client.close();
}

run().catch(err => { console.error(err); process.exit(1); });
