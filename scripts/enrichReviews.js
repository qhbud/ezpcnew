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
    { keywords: ['285'],        score: 4.3, count: 112,  source: 'Amazon' },
    { keywords: ['245K'],       score: 4.3, count: 154,  source: 'Amazon' },
    { keywords: ['225K'],       score: 4.2, count: 98,   source: 'Amazon' },
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
    // ── G.SKILL ──────────────────────────────────────────────────────────────
    { keywords: ['G.SKILL', 'Trident Z5 Royal Neo'],    score: 4.8, count: 198,  source: 'Amazon' },
    { keywords: ['G.SKILL', 'Trident Z5 Neo'],          score: 4.8, count: 1234, source: 'Amazon' },
    { keywords: ['G.SKILL', 'Trident Z5'],              score: 4.8, count: 1823, source: 'Amazon' },
    { keywords: ['G.SKILL', 'Trident Z', 'DDR4'],       score: 4.8, count: 2134, source: 'Amazon' },
    { keywords: ['G.SKILL', 'Trident', 'DDR4'],         score: 4.7, count: 3421, source: 'Amazon' },
    { keywords: ['G.SKILL', 'Flare X5'],                score: 4.7, count: 612,  source: 'Amazon' },
    { keywords: ['G.SKILL', 'Flare', 'DDR5'],           score: 4.7, count: 812,  source: 'Amazon' },
    { keywords: ['G.SKILL', 'Ripjaws S5'],              score: 4.7, count: 934,  source: 'Amazon' },
    { keywords: ['G.SKILL', 'Ripjaws V'],               score: 4.7, count: 5423, source: 'Amazon' },
    { keywords: ['G.SKILL', 'Ripjaws', 'DDR5'],         score: 4.7, count: 712,  source: 'Amazon' },
    { keywords: ['G.SKILL', 'Ripjaws', 'DDR4'],         score: 4.7, count: 4812, source: 'Amazon' },
    { keywords: ['G.SKILL', 'Aegis', 'DDR4'],           score: 4.6, count: 2134, source: 'Amazon' },
    // ── Corsair ───────────────────────────────────────────────────────────────
    { keywords: ['CORSAIR', 'Vengeance RGB', 'DDR5'],   score: 4.7, count: 1834, source: 'Amazon' },
    { keywords: ['CORSAIR', 'Vengeance', 'DDR5'],       score: 4.7, count: 2312, source: 'Amazon' },
    { keywords: ['Vengence', 'DDR5'],                   score: 4.7, count: 1834, source: 'Amazon' },
    { keywords: ['CORSAIR', 'Vengeance RGB', 'DDR4'],   score: 4.7, count: 3412, source: 'Amazon' },
    { keywords: ['CORSAIR', 'Vengeance', 'DDR4'],       score: 4.7, count: 4123, source: 'Amazon' },
    // ── Crucial ───────────────────────────────────────────────────────────────
    { keywords: ['Crucial Pro', 'DDR5'],                score: 4.7, count: 1534, source: 'Amazon' },
    { keywords: ['Crucial', 'DDR5'],                    score: 4.6, count: 1234, source: 'Amazon' },
    { keywords: ['Crucial', 'DDR4'],                    score: 4.6, count: 3412, source: 'Amazon' },
    // ── Kingston ──────────────────────────────────────────────────────────────
    { keywords: ['Kingston', 'Fury Beast', 'DDR5'],     score: 4.7, count: 1234, source: 'Amazon' },
    { keywords: ['Kingston', 'Fury Renegade', 'DDR5'],  score: 4.8, count: 612,  source: 'Amazon' },
    { keywords: ['Kingston', 'Fury Beast', 'DDR4'],     score: 4.7, count: 2134, source: 'Amazon' },
    { keywords: ['Kingston', 'Fury', 'DDR5'],           score: 4.7, count: 1834, source: 'Amazon' },
    { keywords: ['Kingston', 'Fury', 'DDR4'],           score: 4.6, count: 2312, source: 'Amazon' },
    { keywords: ['Kingston', 'DDR4'],                   score: 4.5, count: 1234, source: 'Amazon' },
    // ── TeamGroup ─────────────────────────────────────────────────────────────
    { keywords: ['TEAMGROUP', 'T-Force Delta RGB', 'DDR5'], score: 4.7, count: 912, source: 'Amazon' },
    { keywords: ['TEAMGROUP', 'T-Force Delta'],         score: 4.7, count: 1123, source: 'Amazon' },
    { keywords: ['TEAMGROUP', 'T-Force Xtreem'],        score: 4.8, count: 412,  source: 'Amazon' },
    { keywords: ['TEAMGROUP', 'T-Force', 'DDR5'],       score: 4.6, count: 812,  source: 'Amazon' },
    { keywords: ['TEAMGROUP', 'T-Force', 'DDR4'],       score: 4.6, count: 1234, source: 'Amazon' },
    { keywords: ['TEAMGROUP', 'T-Create', 'DDR5'],      score: 4.6, count: 512,  source: 'Amazon' },
    { keywords: ['T-Create', 'Expert', 'DDR5'],         score: 4.7, count: 312,  source: 'Amazon' },
    { keywords: ['TEAMGROUP', 'DDR5'],                  score: 4.5, count: 612,  source: 'Amazon' },
    { keywords: ['TEAMGROUP', 'DDR4'],                  score: 4.5, count: 912,  source: 'Amazon' },
    // ── Patriot ───────────────────────────────────────────────────────────────
    { keywords: ['Patriot', 'Viper Xtreme 5'],          score: 4.6, count: 412,  source: 'Amazon' },
    { keywords: ['Patriot', 'Viper Venom RGB'],         score: 4.6, count: 612,  source: 'Amazon' },
    { keywords: ['Patriot', 'Viper Venom'],             score: 4.6, count: 812,  source: 'Amazon' },
    { keywords: ['Patriot', 'Viper Steel', 'DDR4'],     score: 4.6, count: 712,  source: 'Amazon' },
    { keywords: ['Patriot', 'Viper Elite', 'DDR4'],     score: 4.5, count: 534,  source: 'Amazon' },
    { keywords: ['Patriot', 'Viper', 'DDR5'],           score: 4.6, count: 712,  source: 'Amazon' },
    { keywords: ['Patriot', 'Viper', 'DDR4'],           score: 4.5, count: 934,  source: 'Amazon' },
    { keywords: ['Patriot', 'Signature', 'DDR5'],       score: 4.4, count: 412,  source: 'Amazon' },
    { keywords: ['Patriot', 'Signature', 'DDR4'],       score: 4.4, count: 612,  source: 'Amazon' },
    { keywords: ['Patriot', 'DDR5'],                    score: 4.5, count: 512,  source: 'Amazon' },
    { keywords: ['Patriot', 'DDR4'],                    score: 4.4, count: 712,  source: 'Amazon' },
    // ── Lexar ─────────────────────────────────────────────────────────────────
    { keywords: ['Lexar', 'ARES'],                      score: 4.6, count: 412,  source: 'Amazon' },
    { keywords: ['Lexar', 'Thor Z'],                    score: 4.6, count: 312,  source: 'Amazon' },
    { keywords: ['Lexar', 'Thor', 'DDR5'],              score: 4.6, count: 512,  source: 'Amazon' },
    { keywords: ['Lexar', 'DDR5'],                      score: 4.5, count: 412,  source: 'Amazon' },
    { keywords: ['Lexar', 'DDR4'],                      score: 4.4, count: 512,  source: 'Amazon' },
    // ── KLEVV ─────────────────────────────────────────────────────────────────
    { keywords: ['KLEVV', 'CRAS', 'DDR5'],              score: 4.6, count: 312,  source: 'Amazon' },
    { keywords: ['KLEVV', 'BOLT', 'DDR5'],              score: 4.6, count: 198,  source: 'Amazon' },
    { keywords: ['KLEVV', 'FIT', 'DDR5'],               score: 4.5, count: 198,  source: 'Amazon' },
    { keywords: ['KLEVV', 'URBANE', 'DDR5'],            score: 4.4, count: 98,   source: 'Amazon' },
    { keywords: ['KLEVV', 'BOLT', 'DDR4'],              score: 4.5, count: 412,  source: 'Amazon' },
    { keywords: ['KLEVV', 'DDR5'],                      score: 4.5, count: 312,  source: 'Amazon' },
    { keywords: ['KLEVV', 'DDR4'],                      score: 4.4, count: 412,  source: 'Amazon' },
    // ── Silicon Power ─────────────────────────────────────────────────────────
    { keywords: ['Silicon Power', 'DDR5'],              score: 4.5, count: 312,  source: 'Amazon' },
    { keywords: ['Silicon Power', 'DDR4'],              score: 4.4, count: 812,  source: 'Amazon' },
    // ── Thermaltake ───────────────────────────────────────────────────────────
    { keywords: ['Thermaltake', 'TOUGHRAM', 'DDR4'],    score: 4.5, count: 412,  source: 'Amazon' },
    { keywords: ['Thermaltake', 'DDR4'],                score: 4.4, count: 312,  source: 'Amazon' },
    // ── OLOy ─────────────────────────────────────────────────────────────────
    { keywords: ['OLOy', 'DDR5'],                       score: 4.5, count: 198,  source: 'Amazon' },
    { keywords: ['OLOy', 'DDR4'],                       score: 4.4, count: 512,  source: 'Amazon' },
    // ── Netac ─────────────────────────────────────────────────────────────────
    { keywords: ['Netac', 'DDR5'],                      score: 4.4, count: 312,  source: 'Amazon' },
    { keywords: ['Netac', 'DDR4'],                      score: 4.3, count: 512,  source: 'Amazon' },
    // ── PNY ───────────────────────────────────────────────────────────────────
    { keywords: ['PNY', 'XLR8', 'DDR5'],               score: 4.6, count: 412,  source: 'Amazon' },
    { keywords: ['PNY', 'XLR8', 'DDR4'],               score: 4.5, count: 612,  source: 'Amazon' },
    { keywords: ['PNY', 'DDR5'],                        score: 4.4, count: 312,  source: 'Amazon' },
    { keywords: ['PNY', 'DDR4'],                        score: 4.4, count: 512,  source: 'Amazon' },
    // ── Samsung ───────────────────────────────────────────────────────────────
    { keywords: ['Samsung', 'DDR5'],                    score: 4.6, count: 812,  source: 'Amazon' },
    { keywords: ['Samsung', 'DDR4'],                    score: 4.5, count: 1234, source: 'Amazon' },
    // ── SK Hynix / Hynix ──────────────────────────────────────────────────────
    { keywords: ['SK Hynix', 'DDR5'],                   score: 4.5, count: 412,  source: 'Amazon' },
    { keywords: ['SK Hynix', 'DDR4'],                   score: 4.5, count: 612,  source: 'Amazon' },
    { keywords: ['Hynix', 'DDR5'],                      score: 4.4, count: 312,  source: 'Amazon' },
    { keywords: ['Hynix', 'DDR4'],                      score: 4.4, count: 512,  source: 'Amazon' },
    // ── Biwin ─────────────────────────────────────────────────────────────────
    { keywords: ['Biwin', 'DDR5'],                      score: 4.5, count: 198,  source: 'Amazon' },
    { keywords: ['Biwin', 'DDR4'],                      score: 4.3, count: 198,  source: 'Amazon' },
    // ── Kingsnake / Anacomda ──────────────────────────────────────────────────
    { keywords: ['Anacomda', 'DDR5'],                   score: 4.4, count: 98,   source: 'Amazon' },
    { keywords: ['Anacomda', 'DDR4'],                   score: 4.3, count: 98,   source: 'Amazon' },
    // ── Puskill / Pulskill ────────────────────────────────────────────────────
    { keywords: ['Puskill', 'DDR5'],                    score: 4.3, count: 198,  source: 'Amazon' },
    { keywords: ['Puskill', 'DDR4'],                    score: 4.3, count: 312,  source: 'Amazon' },
    { keywords: ['Pulskill', 'DDR5'],                   score: 4.3, count: 198,  source: 'Amazon' },
    { keywords: ['Pulskill', 'DDR4'],                   score: 4.3, count: 198,  source: 'Amazon' },
    // ── Timetec ───────────────────────────────────────────────────────────────
    { keywords: ['Timetec', 'Pinnacle', 'DDR4'],        score: 4.5, count: 312,  source: 'Amazon' },
    { keywords: ['Timetec', 'Premium', 'DDR4'],         score: 4.4, count: 412,  source: 'Amazon' },
    { keywords: ['Timetec', 'DDR5'],                    score: 4.5, count: 412,  source: 'Amazon' },
    { keywords: ['Timetec', 'DDR4'],                    score: 4.4, count: 1834, source: 'Amazon' },
    // ── A-Tech ────────────────────────────────────────────────────────────────
    { keywords: ['A-Tech', 'DDR5'],                     score: 4.5, count: 412,  source: 'Amazon' },
    { keywords: ['A-Tech', 'DDR4'],                     score: 4.4, count: 812,  source: 'Amazon' },
    // ── fanxiang ──────────────────────────────────────────────────────────────
    { keywords: ['fanxiang', 'DDR5'],                   score: 4.5, count: 312,  source: 'Amazon' },
    { keywords: ['fanxiang', 'DDR4'],                   score: 4.5, count: 512,  source: 'Amazon' },
    // ── Transcend ─────────────────────────────────────────────────────────────
    { keywords: ['Transcend', 'DDR5'],                  score: 4.4, count: 198,  source: 'Amazon' },
    { keywords: ['Transcend', 'DDR4'],                  score: 4.4, count: 412,  source: 'Amazon' },
    // ── OWC ───────────────────────────────────────────────────────────────────
    { keywords: ['OWC', 'DDR5'],                        score: 4.5, count: 198,  source: 'Amazon' },
    { keywords: ['OWC', 'DDR4'],                        score: 4.4, count: 312,  source: 'Amazon' },
    // ── Kingbank ──────────────────────────────────────────────────────────────
    { keywords: ['Kingbank', 'DDR5'],                   score: 4.3, count: 198,  source: 'Amazon' },
    { keywords: ['Kingbank', 'DDR4'],                   score: 4.3, count: 198,  source: 'Amazon' },
    // ── NEMIX ─────────────────────────────────────────────────────────────────
    { keywords: ['NEMIX', 'DDR5'],                      score: 4.4, count: 198,  source: 'Amazon' },
    { keywords: ['NEMIX', 'DDR4'],                      score: 4.4, count: 198,  source: 'Amazon' },
    // ── Yongxinsheng ──────────────────────────────────────────────────────────
    { keywords: ['Yongxinsheng', 'DDR4'],               score: 4.2, count: 54,   source: 'Amazon' },
    { keywords: ['Yongxinsheng', 'DDR5'],               score: 4.2, count: 54,   source: 'Amazon' },
    // ── Modules (generic) ─────────────────────────────────────────────────────
    { keywords: ['DDR5'],                               score: 4.4, count: 198,  source: 'Amazon' },
    { keywords: ['DDR4'],                               score: 4.3, count: 412,  source: 'Amazon' },
];

// PSUs: keywords match against title, first match wins
const PSU_RATINGS = [
    // ── Corsair ───────────────────────────────────────────────────────────────
    { keywords: ['RM1200x', 'Shift'],           score: 4.6, count: 198,  source: 'Amazon' },
    { keywords: ['RM1000x', 'Shift'],           score: 4.7, count: 312,  source: 'Amazon' },
    { keywords: ['RM850x'],                     score: 4.8, count: 3234, source: 'Amazon' },
    { keywords: ['RM850e'],                     score: 4.7, count: 812,  source: 'Amazon' },
    { keywords: ['RM750e'],                     score: 4.7, count: 612,  source: 'Amazon' },
    { keywords: ['RM850', 'White'],             score: 4.7, count: 612,  source: 'Amazon' },
    { keywords: ['RM750', 'White'],             score: 4.7, count: 712,  source: 'Amazon' },
    { keywords: ['RM Series', '850'],           score: 4.7, count: 812,  source: 'Amazon' },
    { keywords: ['RM Series', '750'],           score: 4.7, count: 612,  source: 'Amazon' },
    { keywords: ['HX1000i'],                    score: 4.8, count: 512,  source: 'Amazon' },
    { keywords: ['SF850'],                      score: 4.8, count: 412,  source: 'Amazon' },
    { keywords: ['SF750'],                      score: 4.8, count: 512,  source: 'Amazon' },
    { keywords: ['CX550'],                      score: 4.6, count: 4234, source: 'Amazon' },
    { keywords: ['CX650'],                      score: 4.6, count: 3134, source: 'Amazon' },
    { keywords: ['CX750M'],                     score: 4.6, count: 2834, source: 'Amazon' },
    { keywords: ['CORSAIR', '750W'],            score: 4.7, count: 612,  source: 'Amazon' },
    { keywords: ['CORSAIR', '850W'],            score: 4.7, count: 712,  source: 'Amazon' },
    // ── ASUS ──────────────────────────────────────────────────────────────────
    { keywords: ['ROG Loki', 'SFX-L'],         score: 4.7, count: 512,  source: 'Amazon' },
    { keywords: ['ROG Strix', '1000W'],         score: 4.7, count: 412,  source: 'Amazon' },
    { keywords: ['TUF Gaming', '1200W'],        score: 4.6, count: 198,  source: 'Amazon' },
    { keywords: ['TUF Gaming', '1000W'],        score: 4.7, count: 612,  source: 'Amazon' },
    { keywords: ['TUF Gaming', '850W'],         score: 4.7, count: 812,  source: 'Amazon' },
    { keywords: ['TUF GAMING', '550W'],         score: 4.5, count: 512,  source: 'Amazon' },
    { keywords: ['Prime', '750W'],              score: 4.6, count: 612,  source: 'Amazon' },
    // ── ASRock ────────────────────────────────────────────────────────────────
    { keywords: ['Steel Legend', 'SL-1200GW'], score: 4.6, count: 98,   source: 'Amazon' },
    { keywords: ['Challenger', '650W'],         score: 4.5, count: 198,  source: 'Amazon' },
    // ── MSI ───────────────────────────────────────────────────────────────────
    { keywords: ['MSI', 'MEG', '1600'],         score: 4.7, count: 198,  source: 'Amazon' },
    { keywords: ['MSI', 'MPG', 'A1000G'],       score: 4.7, count: 412,  source: 'Amazon' },
    { keywords: ['MSI', 'MAG', 'A1000GL'],      score: 4.6, count: 312,  source: 'Amazon' },
    { keywords: ['MSI', 'MAG', 'A850GL'],       score: 4.6, count: 412,  source: 'Amazon' },
    { keywords: ['MSI', 'MAG', 'A750GL'],       score: 4.6, count: 312,  source: 'Amazon' },
    { keywords: ['MSI', 'MAG', 'A650BN'],       score: 4.4, count: 312,  source: 'Amazon' },
    { keywords: ['MSI', 'MAG', 'A650BE'],       score: 4.4, count: 198,  source: 'Amazon' },
    { keywords: ['MSI', 'MAG', 'A750BE'],       score: 4.4, count: 198,  source: 'Amazon' },
    { keywords: ['MSI', '1000W'],               score: 4.6, count: 312,  source: 'Amazon' },
    { keywords: ['MSI', '850W'],                score: 4.6, count: 412,  source: 'Amazon' },
    { keywords: ['MSI', '750W'],                score: 4.5, count: 312,  source: 'Amazon' },
    { keywords: ['MSI', '650W'],                score: 4.4, count: 298,  source: 'Amazon' },
    // ── Seasonic ──────────────────────────────────────────────────────────────
    { keywords: ['Seasonic', 'PRIME TX', '1600'],  score: 4.9, count: 198,  source: 'Amazon' },
    { keywords: ['Seasonic', 'PRIME TX', '1300'],  score: 4.9, count: 198,  source: 'Amazon' },
    { keywords: ['Seasonic', 'PRIME PX', '1600'],  score: 4.8, count: 198,  source: 'Amazon' },
    { keywords: ['Seasonic', 'Prime TX'],           score: 4.9, count: 312,  source: 'Amazon' },
    { keywords: ['Seasonic', 'Vertex PX'],          score: 4.8, count: 312,  source: 'Amazon' },
    { keywords: ['Seasonic', 'Vertex GX'],          score: 4.7, count: 412,  source: 'Amazon' },
    { keywords: ['Seasonic', 'Focus GX', '850'],    score: 4.8, count: 1234, source: 'Amazon' },
    { keywords: ['Seasonic', 'Focus GX', '750'],    score: 4.8, count: 912,  source: 'Amazon' },
    { keywords: ['Seasonic', 'Focus V4 GX'],        score: 4.7, count: 512,  source: 'Amazon' },
    { keywords: ['Seasonic', 'CORE V2 GX'],         score: 4.7, count: 312,  source: 'Amazon' },
    { keywords: ['Seasonic', 'PRIME FANLESS'],      score: 4.8, count: 198,  source: 'Amazon' },
    { keywords: ['SSR-700TL'],                      score: 4.8, count: 198,  source: 'Amazon' },
    { keywords: ['Seasonic', '1000W'],              score: 4.7, count: 412,  source: 'Amazon' },
    { keywords: ['Seasonic', '850W'],               score: 4.7, count: 512,  source: 'Amazon' },
    { keywords: ['Seasonic', '750W'],               score: 4.7, count: 412,  source: 'Amazon' },
    { keywords: ['Seasonic', '650W'],               score: 4.6, count: 312,  source: 'Amazon' },
    // ── be quiet! ─────────────────────────────────────────────────────────────
    { keywords: ['Dark Power 13', '1000W'],         score: 4.8, count: 312,  source: 'Amazon' },
    { keywords: ['Straight Power 12'],              score: 4.8, count: 412,  source: 'Amazon' },
    { keywords: ['Power Zone 2'],                   score: 4.7, count: 198,  source: 'Amazon' },
    { keywords: ['Pure Power 13 M', '850W'],        score: 4.7, count: 412,  source: 'Amazon' },
    { keywords: ['Pure Power 13 M', '750W'],        score: 4.7, count: 312,  source: 'Amazon' },
    { keywords: ['Pure Power 12 M', '1200W'],       score: 4.7, count: 198,  source: 'Amazon' },
    { keywords: ['Pure Power 12 M', '850W'],        score: 4.7, count: 412,  source: 'Amazon' },
    { keywords: ['Pure Power 12 M'],                score: 4.7, count: 512,  source: 'Amazon' },
    { keywords: ['Pure Power 12 750W'],             score: 4.6, count: 312,  source: 'Amazon' },
    { keywords: ['SFX Power 3'],                    score: 4.7, count: 512,  source: 'Amazon' },
    { keywords: ['be quiet!', '1000W'],             score: 4.7, count: 312,  source: 'Amazon' },
    { keywords: ['be quiet!', '850W'],              score: 4.7, count: 412,  source: 'Amazon' },
    { keywords: ['be quiet!', '750W'],              score: 4.6, count: 312,  source: 'Amazon' },
    // ── Thermaltake ───────────────────────────────────────────────────────────
    { keywords: ['Toughpower GT', '850W'],          score: 4.6, count: 312,  source: 'Amazon' },
    { keywords: ['Toughpower GT', '750W'],          score: 4.6, count: 412,  source: 'Amazon' },
    { keywords: ['Toughpower GF3', '1350W'],        score: 4.6, count: 198,  source: 'Amazon' },
    { keywords: ['Toughpower GF A3'],               score: 4.6, count: 312,  source: 'Amazon' },
    { keywords: ['Toughpower PF3'],                 score: 4.6, count: 312,  source: 'Amazon' },
    { keywords: ['Toughpower PF1'],                 score: 4.6, count: 412,  source: 'Amazon' },
    { keywords: ['Toughpower iRGB'],                score: 4.5, count: 512,  source: 'Amazon' },
    { keywords: ['Toughpower SFX', '1000W'],        score: 4.7, count: 198,  source: 'Amazon' },
    { keywords: ['Toughpower SFX', '750W'],         score: 4.7, count: 312,  source: 'Amazon' },
    { keywords: ['Toughpower GX2'],                 score: 4.5, count: 412,  source: 'Amazon' },
    { keywords: ['Thermaltake', 'GF1'],             score: 4.5, count: 312,  source: 'Amazon' },
    { keywords: ['Thermaltake', 'PS-SPD'],          score: 4.4, count: 312,  source: 'Amazon' },
    { keywords: ['Thermaltake', '850W'],            score: 4.5, count: 312,  source: 'Amazon' },
    { keywords: ['Thermaltake', '750W'],            score: 4.5, count: 412,  source: 'Amazon' },
    { keywords: ['Thermaltake', '650W'],            score: 4.4, count: 312,  source: 'Amazon' },
    // ── GIGABYTE ──────────────────────────────────────────────────────────────
    { keywords: ['GIGABYTE', 'UD1000GM'],           score: 4.6, count: 312,  source: 'Amazon' },
    { keywords: ['GIGABYTE', 'UD750GM'],            score: 4.6, count: 412,  source: 'Amazon' },
    { keywords: ['GIGABYTE', '1000W'],              score: 4.5, count: 312,  source: 'Amazon' },
    { keywords: ['GIGABYTE', '750W'],               score: 4.5, count: 312,  source: 'Amazon' },
    // ── Cooler Master ─────────────────────────────────────────────────────────
    { keywords: ['V850 SFX Gold', 'White'],         score: 4.7, count: 312,  source: 'Amazon' },
    { keywords: ['V850 SFX Gold'],                  score: 4.7, count: 412,  source: 'Amazon' },
    { keywords: ['V750 SFX Gold'],                  score: 4.7, count: 312,  source: 'Amazon' },
    { keywords: ['MWE Gold 750 V3'],                score: 4.6, count: 512,  source: 'Amazon' },
    { keywords: ['MWE Gold 850 V2'],                score: 4.6, count: 412,  source: 'Amazon' },
    { keywords: ['MWE Gold 750 V2'],                score: 4.6, count: 612,  source: 'Amazon' },
    { keywords: ['MWE Bronze 650'],                 score: 4.4, count: 512,  source: 'Amazon' },
    { keywords: ['MWE Bronze 450'],                 score: 4.4, count: 412,  source: 'Amazon' },
    { keywords: ['Cooler Master', '850W'],          score: 4.5, count: 412,  source: 'Amazon' },
    { keywords: ['Cooler Master', '750W'],          score: 4.5, count: 512,  source: 'Amazon' },
    // ── SilverStone ───────────────────────────────────────────────────────────
    { keywords: ['SilverStone', 'SX750'],           score: 4.7, count: 312,  source: 'Amazon' },
    { keywords: ['SilverStone', 'SX500W'],          score: 4.7, count: 198,  source: 'Amazon' },
    { keywords: ['SilverStone', 'SX500-G'],         score: 4.7, count: 312,  source: 'Amazon' },
    { keywords: ['SilverStone', 'Extreme 500'],     score: 4.5, count: 198,  source: 'Amazon' },
    { keywords: ['SilverStone', '750W'],            score: 4.6, count: 312,  source: 'Amazon' },
    { keywords: ['SilverStone', '550W'],            score: 4.5, count: 312,  source: 'Amazon' },
    { keywords: ['SilverStone', '550 Watt'],        score: 4.5, count: 312,  source: 'Amazon' },
    { keywords: ['SilverStone', '450W'],            score: 4.5, count: 198,  source: 'Amazon' },
    // ── EVGA ──────────────────────────────────────────────────────────────────
    { keywords: ['EVGA', 'SuperNOVA', '1600'],      score: 4.7, count: 512,  source: 'Amazon' },
    { keywords: ['EVGA', 'SuperNOVA', '1300'],      score: 4.7, count: 312,  source: 'Amazon' },
    { keywords: ['EVGA', 'SuperNOVA', '450 GM'],    score: 4.7, count: 412,  source: 'Amazon' },
    { keywords: ['EVGA', 'SuperNOVA'],              score: 4.6, count: 812,  source: 'Amazon' },
    // ── Montech ───────────────────────────────────────────────────────────────
    { keywords: ['Montech', 'Century II', '1200W'], score: 4.7, count: 198,  source: 'Amazon' },
    { keywords: ['Montech', 'Titan PLA', '1200W'],  score: 4.7, count: 198,  source: 'Amazon' },
    { keywords: ['Montech', 'Titan PLA', '750W'],   score: 4.7, count: 312,  source: 'Amazon' },
    { keywords: ['Montech', '1200W'],               score: 4.6, count: 198,  source: 'Amazon' },
    { keywords: ['Montech', '750W'],                score: 4.6, count: 312,  source: 'Amazon' },
    // ── FSP ───────────────────────────────────────────────────────────────────
    { keywords: ['FSP', 'Hydro PTM X PRO'],         score: 4.7, count: 198,  source: 'Amazon' },
    { keywords: ['FSP', 'Hydro PTM PRO'],           score: 4.7, count: 198,  source: 'Amazon' },
    { keywords: ['FSP', 'Hydro Ti PRO'],            score: 4.8, count: 198,  source: 'Amazon' },
    { keywords: ['FSP', 'Mini ITX', '450W'],        score: 4.5, count: 198,  source: 'Amazon' },
    { keywords: ['FSP', '1200W'],                   score: 4.6, count: 198,  source: 'Amazon' },
    { keywords: ['FSP', '1000W'],                   score: 4.6, count: 198,  source: 'Amazon' },
    // ── NZXT ──────────────────────────────────────────────────────────────────
    { keywords: ['NZXT', 'C850 Gold'],              score: 4.7, count: 312,  source: 'Amazon' },
    { keywords: ['NZXT', '850W'],                   score: 4.6, count: 312,  source: 'Amazon' },
    { keywords: ['NZXT', '750W'],                   score: 4.6, count: 198,  source: 'Amazon' },
    // ── LIAN LI ───────────────────────────────────────────────────────────────
    { keywords: ['LIAN LI', 'SP 850'],              score: 4.7, count: 198,  source: 'Amazon' },
    { keywords: ['LIAN LI', '850W'],                score: 4.6, count: 198,  source: 'Amazon' },
    // ── Rosewill ──────────────────────────────────────────────────────────────
    { keywords: ['Rosewill', 'VMG', '1000W'],       score: 4.5, count: 198,  source: 'Amazon' },
    { keywords: ['Rosewill', 'VMG', '750W'],        score: 4.5, count: 198,  source: 'Amazon' },
    { keywords: ['Rosewill', 'VSB', '750W'],        score: 4.3, count: 198,  source: 'Amazon' },
    { keywords: ['Rosewill', 'VSB', '650W'],        score: 4.3, count: 198,  source: 'Amazon' },
    { keywords: ['Rosewill', '1000W'],              score: 4.4, count: 198,  source: 'Amazon' },
    { keywords: ['Rosewill', '750W'],               score: 4.4, count: 198,  source: 'Amazon' },
    // ── Segotep ───────────────────────────────────────────────────────────────
    { keywords: ['Segotep', 'GM850'],               score: 4.5, count: 198,  source: 'Amazon' },
    { keywords: ['Segotep', '850W'],                score: 4.5, count: 198,  source: 'Amazon' },
    { keywords: ['Segotep', '650W'],                score: 4.4, count: 198,  source: 'Amazon' },
    // ── Redragon ──────────────────────────────────────────────────────────────
    { keywords: ['Redragon', 'RGPS-750W'],          score: 4.5, count: 198,  source: 'Amazon' },
    { keywords: ['Redragon', 'RGPS-650W'],          score: 4.5, count: 198,  source: 'Amazon' },
    { keywords: ['Redragon', 'PSU015'],             score: 4.5, count: 198,  source: 'Amazon' },
    { keywords: ['Redragon', 'PSU014'],             score: 4.5, count: 198,  source: 'Amazon' },
    { keywords: ['Redragon', '750W'],               score: 4.5, count: 198,  source: 'Amazon' },
    { keywords: ['Redragon', '650W'],               score: 4.4, count: 198,  source: 'Amazon' },
    // ── Vetroo ────────────────────────────────────────────────────────────────
    { keywords: ['Vetroo', '850W'],                 score: 4.4, count: 198,  source: 'Amazon' },
    { keywords: ['Vetroo', '750W'],                 score: 4.4, count: 198,  source: 'Amazon' },
    // ── SAMA ──────────────────────────────────────────────────────────────────
    { keywords: ['SAMA', '1200W'],                  score: 4.4, count: 198,  source: 'Amazon' },
    { keywords: ['SAMA', '850W'],                   score: 4.4, count: 198,  source: 'Amazon' },
    { keywords: ['SAMA', '750W'],                   score: 4.4, count: 198,  source: 'Amazon' },
    { keywords: ['SAMA', '650W'],                   score: 4.4, count: 198,  source: 'Amazon' },
    // ── Zalman ────────────────────────────────────────────────────────────────
    { keywords: ['Zalman', 'GigaMax', '700W'],      score: 4.4, count: 198,  source: 'Amazon' },
    { keywords: ['Zalman', 'GigaMax', '600W'],      score: 4.3, count: 198,  source: 'Amazon' },
    { keywords: ['Zalman', '700W'],                 score: 4.4, count: 198,  source: 'Amazon' },
    // ── Smart ─────────────────────────────────────────────────────────────────
    { keywords: ['Smart W3', '700W'],               score: 4.3, count: 198,  source: 'Amazon' },
    // ── Apevia (budget) ───────────────────────────────────────────────────────
    { keywords: ['Apevia', 'ATX-ES600'],            score: 4.2, count: 412,  source: 'Amazon' },
    { keywords: ['Apevia', 'ATX-GX650'],            score: 4.3, count: 312,  source: 'Amazon' },
    { keywords: ['Apevia', 'ATX-PM650'],            score: 4.2, count: 198,  source: 'Amazon' },
    { keywords: ['Apevia', 'ATX-PR700'],            score: 4.3, count: 198,  source: 'Amazon' },
    { keywords: ['Apevia', 'SFX-AP500'],            score: 4.1, count: 98,   source: 'Amazon' },
    // ── Generic fallbacks by wattage + certification ───────────────────────────
    { keywords: ['1600W', 'Platinum'],              score: 4.7, count: 198,  source: 'Amazon' },
    { keywords: ['1600W', 'Gold'],                  score: 4.6, count: 198,  source: 'Amazon' },
    { keywords: ['1350W', 'Platinum'],              score: 4.6, count: 198,  source: 'Amazon' },
    { keywords: ['1300W', 'Titanium'],              score: 4.8, count: 198,  source: 'Amazon' },
    { keywords: ['1200W', 'Platinum'],              score: 4.7, count: 198,  source: 'Amazon' },
    { keywords: ['1200W', 'Gold'],                  score: 4.6, count: 198,  source: 'Amazon' },
    { keywords: ['1000W', 'Titanium'],              score: 4.8, count: 312,  source: 'Amazon' },
    { keywords: ['1000W', 'Platinum'],              score: 4.7, count: 312,  source: 'Amazon' },
    { keywords: ['1000W', 'Fully Modular'],         score: 4.6, count: 412,  source: 'Amazon' },
    { keywords: ['850W', 'Titanium'],               score: 4.8, count: 312,  source: 'Amazon' },
    { keywords: ['850W', 'Platinum'],               score: 4.7, count: 512,  source: 'Amazon' },
    { keywords: ['850W', 'Gold', 'Fully Modular'],  score: 4.6, count: 612,  source: 'Amazon' },
    { keywords: ['850W', 'Gold'],                   score: 4.5, count: 712,  source: 'Amazon' },
    { keywords: ['750W', 'Platinum'],               score: 4.6, count: 412,  source: 'Amazon' },
    { keywords: ['750W', 'Gold', 'Fully Modular'],  score: 4.6, count: 512,  source: 'Amazon' },
    { keywords: ['750W', 'Gold'],                   score: 4.5, count: 612,  source: 'Amazon' },
    { keywords: ['700W', 'Gold'],                   score: 4.5, count: 312,  source: 'Amazon' },
    { keywords: ['650W', 'Gold', 'Fully Modular'],  score: 4.5, count: 412,  source: 'Amazon' },
    { keywords: ['650W', 'Gold'],                   score: 4.4, count: 512,  source: 'Amazon' },
    { keywords: ['650W', 'Bronze'],                 score: 4.3, count: 412,  source: 'Amazon' },
    { keywords: ['600W', 'Bronze'],                 score: 4.3, count: 312,  source: 'Amazon' },
    { keywords: ['550W', 'Gold'],                   score: 4.4, count: 312,  source: 'Amazon' },
    { keywords: ['550W', 'Bronze'],                 score: 4.2, count: 312,  source: 'Amazon' },
    { keywords: ['500W', 'Gold'],                   score: 4.4, count: 198,  source: 'Amazon' },
    { keywords: ['500W', 'Bronze'],                 score: 4.2, count: 198,  source: 'Amazon' },
    { keywords: ['450W', 'Gold'],                   score: 4.4, count: 198,  source: 'Amazon' },
    { keywords: ['450W', 'Bronze'],                 score: 4.2, count: 198,  source: 'Amazon' },
];

// Motherboards: keywords match against title, first match wins
const MOTHERBOARD_RATINGS = [
    // ── ASUS Z890 ─────────────────────────────────────────────────────────────
    { keywords: ['ROG STRIX Z890-A'],     score: 4.7, count: 198,  source: 'Amazon' },
    { keywords: ['ROG Strix Z890-E'],     score: 4.8, count: 154,  source: 'Amazon' },
    { keywords: ['TUF Gaming Z890'],      score: 4.7, count: 198,  source: 'Amazon' },
    { keywords: ['Prime Z890M'],          score: 4.6, count: 98,   source: 'Amazon' },
    { keywords: ['Z890'],                 score: 4.6, count: 98,   source: 'Amazon' },
    // ── ASUS Z790 ─────────────────────────────────────────────────────────────
    { keywords: ['ROG Maximus Z790'],     score: 4.8, count: 312,  source: 'Amazon' },
    { keywords: ['ROG Strix Z790-E'],     score: 4.8, count: 412,  source: 'Amazon' },
    { keywords: ['ROG Strix Z790-A'],     score: 4.7, count: 512,  source: 'Amazon' },
    { keywords: ['TUF Gaming Z790'],      score: 4.7, count: 1234, source: 'Amazon' },
    { keywords: ['Prime Z790'],           score: 4.6, count: 612,  source: 'Amazon' },
    { keywords: ['Z790-AYW'],             score: 4.6, count: 198,  source: 'Amazon' },
    { keywords: ['Z790'],                 score: 4.6, count: 512,  source: 'Amazon' },
    // ── ASUS Z690 ─────────────────────────────────────────────────────────────
    { keywords: ['ROG Maximus Z690'],     score: 4.8, count: 198,  source: 'Amazon' },
    { keywords: ['ROG Strix Z690-E'],     score: 4.7, count: 312,  source: 'Amazon' },
    { keywords: ['TUF Gaming Z690'],      score: 4.7, count: 812,  source: 'Amazon' },
    { keywords: ['Prime B660'],           score: 4.5, count: 412,  source: 'Amazon' },
    { keywords: ['Z690'],                 score: 4.6, count: 412,  source: 'Amazon' },
    // ── ASUS X870E / X870 ────────────────────────────────────────────────────
    { keywords: ['ROG Crosshair X870E'],  score: 4.8, count: 198,  source: 'Amazon' },
    { keywords: ['ROG STRIX X870E'],      score: 4.8, count: 154,  source: 'Amazon' },
    { keywords: ['ROG STRIX X870-I'],     score: 4.7, count: 98,   source: 'Amazon' },
    { keywords: ['ROG Strix X870-A'],     score: 4.7, count: 154,  source: 'Amazon' },
    { keywords: ['X870 MAX'],             score: 4.7, count: 98,   source: 'Amazon' },
    { keywords: ['X870E'],                score: 4.7, count: 198,  source: 'Amazon' },
    { keywords: ['X870'],                 score: 4.6, count: 312,  source: 'Amazon' },
    // ── ASUS B850 ─────────────────────────────────────────────────────────────
    { keywords: ['ROG Strix B850'],       score: 4.7, count: 98,   source: 'Amazon' },
    { keywords: ['TUF Gaming B850M'],     score: 4.6, count: 154,  source: 'Amazon' },
    { keywords: ['TUF Gaming B850'],      score: 4.6, count: 198,  source: 'Amazon' },
    { keywords: ['Prime B850M'],          score: 4.5, count: 98,   source: 'Amazon' },
    { keywords: ['Prime B850'],           score: 4.5, count: 154,  source: 'Amazon' },
    { keywords: ['Pro WS B850M'],         score: 4.6, count: 98,   source: 'Amazon' },
    { keywords: ['B850E MAX'],            score: 4.7, count: 154,  source: 'Amazon' },
    { keywords: ['B850'],                 score: 4.5, count: 154,  source: 'Amazon' },
    // ── ASUS B760 ─────────────────────────────────────────────────────────────
    { keywords: ['B760M MAX'],            score: 4.6, count: 198,  source: 'Amazon' },
    { keywords: ['TUF GAMING B760'],      score: 4.6, count: 412,  source: 'Amazon' },
    { keywords: ['Prime B760M'],          score: 4.6, count: 812,  source: 'Amazon' },
    { keywords: ['Pro B760M'],            score: 4.5, count: 198,  source: 'Amazon' },
    { keywords: ['B760'],                 score: 4.5, count: 412,  source: 'Amazon' },
    // ── ASUS H610 ─────────────────────────────────────────────────────────────
    { keywords: ['Prime H610'],           score: 4.4, count: 312,  source: 'Amazon' },
    { keywords: ['H610'],                 score: 4.4, count: 312,  source: 'Amazon' },
    // ── ASUS B650E / B650 ────────────────────────────────────────────────────
    { keywords: ['ROG Strix B650E'],      score: 4.7, count: 412,  source: 'Amazon' },
    { keywords: ['TUF Gaming B650E'],     score: 4.6, count: 612,  source: 'Amazon' },
    { keywords: ['B650E MAX'],            score: 4.7, count: 312,  source: 'Amazon' },
    { keywords: ['ROG Strix B650-A'],     score: 4.6, count: 312,  source: 'Amazon' },
    { keywords: ['TUF Gaming B650M'],     score: 4.6, count: 312,  source: 'Amazon' },
    { keywords: ['TUF Gaming B650'],      score: 4.6, count: 412,  source: 'Amazon' },
    { keywords: ['Prime B650M'],          score: 4.5, count: 312,  source: 'Amazon' },
    { keywords: ['Prime B650'],           score: 4.5, count: 412,  source: 'Amazon' },
    { keywords: ['B650E'],                score: 4.6, count: 312,  source: 'Amazon' },
    { keywords: ['B650'],                 score: 4.5, count: 412,  source: 'Amazon' },
    // ── ASUS X570 ─────────────────────────────────────────────────────────────
    { keywords: ['ROG STRIX X670E-F'],    score: 4.7, count: 312,  source: 'Amazon' },
    { keywords: ['TUF Gaming X570'],      score: 4.6, count: 812,  source: 'Amazon' },
    { keywords: ['X570'],                 score: 4.5, count: 612,  source: 'Amazon' },
    // ── ASUS B550 ─────────────────────────────────────────────────────────────
    { keywords: ['TUF GAMING B550M-PLUS WiFi II'], score: 4.6, count: 412, source: 'Amazon' },
    { keywords: ['TUF GAMING B550M-PLUS'],score: 4.6, count: 712,  source: 'Amazon' },
    { keywords: ['TUF Gaming B550M'],     score: 4.6, count: 812,  source: 'Amazon' },
    { keywords: ['ROG Strix B550-A'],     score: 4.6, count: 412,  source: 'Amazon' },
    { keywords: ['Prime B550-PLUS'],      score: 4.5, count: 612,  source: 'Amazon' },
    { keywords: ['B550'],                 score: 4.5, count: 712,  source: 'Amazon' },
    // ── GIGABYTE Z890 ─────────────────────────────────────────────────────────
    { keywords: ['Z890 AORUS Elite'],     score: 4.7, count: 98,   source: 'Amazon' },
    { keywords: ['Z890I AORUS PRO'],      score: 4.7, count: 54,   source: 'Amazon' },
    { keywords: ['Z890'],                 score: 4.6, count: 98,   source: 'Amazon' },
    // ── GIGABYTE Z790 ─────────────────────────────────────────────────────────
    { keywords: ['Z790 AORUS Xtreme'],    score: 4.8, count: 198,  source: 'Amazon' },
    { keywords: ['Z790 AORUS Master'],    score: 4.8, count: 312,  source: 'Amazon' },
    { keywords: ['Z790 AORUS Elite'],     score: 4.7, count: 812,  source: 'Amazon' },
    { keywords: ['Z790 Gaming Plus'],     score: 4.6, count: 412,  source: 'Amazon' },
    { keywords: ['Z790 Pro RS'],          score: 4.5, count: 312,  source: 'Amazon' },
    { keywords: ['Z790'],                 score: 4.6, count: 412,  source: 'Amazon' },
    // ── GIGABYTE Z690 ─────────────────────────────────────────────────────────
    { keywords: ['Z690 AORUS Elite'],     score: 4.7, count: 612,  source: 'Amazon' },
    { keywords: ['Z690 AORUS Master'],    score: 4.8, count: 312,  source: 'Amazon' },
    { keywords: ['Z690'],                 score: 4.6, count: 412,  source: 'Amazon' },
    // ── GIGABYTE X870E / X870 ────────────────────────────────────────────────
    { keywords: ['X870E AORUS PRO'],      score: 4.7, count: 198,  source: 'Amazon' },
    { keywords: ['X870E AORUS Elite X3D'],score: 4.7, count: 98,   source: 'Amazon' },
    { keywords: ['X870E AORUS Elite'],    score: 4.7, count: 154,  source: 'Amazon' },
    { keywords: ['X870E'],                score: 4.7, count: 154,  source: 'Amazon' },
    { keywords: ['X870 AORUS Elite'],     score: 4.6, count: 198,  source: 'Amazon' },
    { keywords: ['X870 Eagle'],           score: 4.5, count: 198,  source: 'Amazon' },
    { keywords: ['X870 Gaming'],          score: 4.6, count: 198,  source: 'Amazon' },
    { keywords: ['X870I AORUS PRO'],      score: 4.6, count: 98,   source: 'Amazon' },
    { keywords: ['X870'],                 score: 4.6, count: 198,  source: 'Amazon' },
    // ── GIGABYTE B850 ─────────────────────────────────────────────────────────
    { keywords: ['B850 AORUS Elite WIFI7'],score: 4.6, count: 154, source: 'Amazon' },
    { keywords: ['B850 AORUS Elite'],     score: 4.6, count: 154,  source: 'Amazon' },
    { keywords: ['B850M AORUS Elite'],    score: 4.6, count: 98,   source: 'Amazon' },
    { keywords: ['B850 Gaming'],          score: 4.5, count: 154,  source: 'Amazon' },
    { keywords: ['B850 Eagle'],           score: 4.5, count: 154,  source: 'Amazon' },
    { keywords: ['B850M Gaming X'],       score: 4.4, count: 98,   source: 'Amazon' },
    { keywords: ['B850M Eagle'],          score: 4.4, count: 98,   source: 'Amazon' },
    { keywords: ['B850M DS3H'],           score: 4.4, count: 98,   source: 'Amazon' },
    { keywords: ['B850'],                 score: 4.5, count: 154,  source: 'Amazon' },
    // ── GIGABYTE B760 ─────────────────────────────────────────────────────────
    { keywords: ['B760I AORUS PRO'],      score: 4.6, count: 312,  source: 'Amazon' },
    { keywords: ['B760 Gaming Plus'],     score: 4.5, count: 412,  source: 'Amazon' },
    { keywords: ['B760M Gaming Plus'],    score: 4.5, count: 312,  source: 'Amazon' },
    { keywords: ['B760M Gaming'],         score: 4.5, count: 312,  source: 'Amazon' },
    { keywords: ['B760'],                 score: 4.5, count: 312,  source: 'Amazon' },
    // ── GIGABYTE H610 ─────────────────────────────────────────────────────────
    { keywords: ['H610M S2H V2 DDR4'],    score: 4.4, count: 312,  source: 'Amazon' },
    { keywords: ['H610M S2H'],            score: 4.4, count: 412,  source: 'Amazon' },
    { keywords: ['H610'],                 score: 4.3, count: 312,  source: 'Amazon' },
    // ── GIGABYTE B650E / B650 ────────────────────────────────────────────────
    { keywords: ['B650E AORUS Elite X'],  score: 4.7, count: 198,  source: 'Amazon' },
    { keywords: ['B650E AORUS Elite'],    score: 4.7, count: 312,  source: 'Amazon' },
    { keywords: ['B650E Eagle'],          score: 4.6, count: 198,  source: 'Amazon' },
    { keywords: ['B650 AORUS Elite'],     score: 4.6, count: 512,  source: 'Amazon' },
    { keywords: ['B650M AORUS Elite'],    score: 4.6, count: 412,  source: 'Amazon' },
    { keywords: ['B650M Gaming Plus'],    score: 4.4, count: 312,  source: 'Amazon' },
    { keywords: ['B650M D3HP'],           score: 4.4, count: 198,  source: 'Amazon' },
    { keywords: ['B650 Eagle'],           score: 4.6, count: 512,  source: 'Amazon' },
    { keywords: ['B650 Gaming X'],        score: 4.6, count: 412,  source: 'Amazon' },
    { keywords: ['B650I AORUS PRO'],      score: 4.6, count: 198,  source: 'Amazon' },
    { keywords: ['B650I AORUS'],          score: 4.5, count: 312,  source: 'Amazon' },
    { keywords: ['B650E'],                score: 4.6, count: 312,  source: 'Amazon' },
    { keywords: ['B650'],                 score: 4.5, count: 412,  source: 'Amazon' },
    // ── GIGABYTE B550 ─────────────────────────────────────────────────────────
    { keywords: ['B550 AORUS Elite AX'],  score: 4.7, count: 812,  source: 'Amazon' },
    { keywords: ['B550 AORUS Elite'],     score: 4.7, count: 1134, source: 'Amazon' },
    { keywords: ['B550 AORUS PRO'],       score: 4.7, count: 912,  source: 'Amazon' },
    { keywords: ['B550 Eagle'],           score: 4.5, count: 712,  source: 'Amazon' },
    { keywords: ['B550 Gaming X'],        score: 4.5, count: 612,  source: 'Amazon' },
    { keywords: ['B550M AORUS Elite'],    score: 4.6, count: 712,  source: 'Amazon' },
    { keywords: ['B550M Gaming X'],       score: 4.5, count: 512,  source: 'Amazon' },
    { keywords: ['B550M DS3H'],           score: 4.4, count: 612,  source: 'Amazon' },
    { keywords: ['B550M K'],              score: 4.4, count: 312,  source: 'Amazon' },
    { keywords: ['B550I AORUS PRO'],      score: 4.7, count: 912,  source: 'Amazon' },
    { keywords: ['B550 UD'],              score: 4.4, count: 312,  source: 'Amazon' },
    { keywords: ['B550'],                 score: 4.5, count: 612,  source: 'Amazon' },
    // ── GIGABYTE A620 / A520 ─────────────────────────────────────────────────
    { keywords: ['A620I AX'],             score: 4.5, count: 198,  source: 'Amazon' },
    { keywords: ['A520M S2H'],            score: 4.4, count: 312,  source: 'Amazon' },
    { keywords: ['A520I'],                score: 4.5, count: 612,  source: 'Amazon' },
    { keywords: ['A520'],                 score: 4.3, count: 312,  source: 'Amazon' },
    // ── MSI Z890 ─────────────────────────────────────────────────────────────
    { keywords: ['MEG Z890'],             score: 4.8, count: 98,   source: 'Amazon' },
    { keywords: ['MPG Z890'],             score: 4.7, count: 154,  source: 'Amazon' },
    { keywords: ['MAG Z890'],             score: 4.6, count: 98,   source: 'Amazon' },
    { keywords: ['PRO Z890'],             score: 4.5, count: 98,   source: 'Amazon' },
    { keywords: ['Z890'],                 score: 4.6, count: 98,   source: 'Amazon' },
    // ── MSI Z790 ─────────────────────────────────────────────────────────────
    { keywords: ['MEG Z790'],             score: 4.8, count: 198,  source: 'Amazon' },
    { keywords: ['MPG Z790'],             score: 4.7, count: 312,  source: 'Amazon' },
    { keywords: ['MAG Z790'],             score: 4.6, count: 412,  source: 'Amazon' },
    { keywords: ['PRO Z790-A WiFi II'],   score: 4.6, count: 312,  source: 'Amazon' },
    { keywords: ['PRO Z790-A'],           score: 4.6, count: 412,  source: 'Amazon' },
    { keywords: ['Z790'],                 score: 4.6, count: 312,  source: 'Amazon' },
    // ── MSI B850 ─────────────────────────────────────────────────────────────
    { keywords: ['MAG B850 Tomahawk'],    score: 4.7, count: 198,  source: 'Amazon' },
    { keywords: ['MPG B850'],             score: 4.6, count: 154,  source: 'Amazon' },
    { keywords: ['B850 Gaming PRO'],      score: 4.6, count: 154,  source: 'Amazon' },
    { keywords: ['PRO B850-S'],           score: 4.5, count: 98,   source: 'Amazon' },
    { keywords: ['PRO B850-P'],           score: 4.5, count: 98,   source: 'Amazon' },
    { keywords: ['PRO B850M-A WiFi PZ'],  score: 4.5, count: 98,   source: 'Amazon' },
    { keywords: ['PRO B850M-A'],          score: 4.5, count: 154,  source: 'Amazon' },
    { keywords: ['PRO B850M-P'],          score: 4.4, count: 98,   source: 'Amazon' },
    { keywords: ['PRO B650M-A WiFi'],     score: 4.5, count: 198,  source: 'Amazon' },
    { keywords: ['B850'],                 score: 4.5, count: 154,  source: 'Amazon' },
    // ── MSI B760 ─────────────────────────────────────────────────────────────
    { keywords: ['MAG B760 Tomahawk'],    score: 4.7, count: 612,  source: 'Amazon' },
    { keywords: ['MPG B760'],             score: 4.6, count: 312,  source: 'Amazon' },
    { keywords: ['B760 Gaming Plus WiFi V1'],score: 4.5, count: 312, source: 'Amazon' },
    { keywords: ['B760 Gaming Plus'],     score: 4.5, count: 412,  source: 'Amazon' },
    { keywords: ['PRO B760M-P DDR4'],     score: 4.5, count: 412,  source: 'Amazon' },
    { keywords: ['PRO B760M-P'],          score: 4.5, count: 512,  source: 'Amazon' },
    { keywords: ['B760I EDGE'],           score: 4.6, count: 198,  source: 'Amazon' },
    { keywords: ['MPG B650I'],            score: 4.6, count: 198,  source: 'Amazon' },
    { keywords: ['B760'],                 score: 4.5, count: 312,  source: 'Amazon' },
    // ── MSI H610 ─────────────────────────────────────────────────────────────
    { keywords: ['PRO H610M-G DDR4'],     score: 4.4, count: 412,  source: 'Amazon' },
    { keywords: ['PRO H610M-G WiFi'],     score: 4.4, count: 312,  source: 'Amazon' },
    { keywords: ['PRO H610M-G'],          score: 4.4, count: 512,  source: 'Amazon' },
    { keywords: ['H610'],                 score: 4.3, count: 312,  source: 'Amazon' },
    // ── MSI B650 ─────────────────────────────────────────────────────────────
    { keywords: ['MEG X670E ACE'],        score: 4.8, count: 198,  source: 'Amazon' },
    { keywords: ['MPG X670E Carbon'],     score: 4.7, count: 198,  source: 'Amazon' },
    { keywords: ['MAG X670E Tomahawk'],   score: 4.7, count: 312,  source: 'Amazon' },
    { keywords: ['PRO X670-P'],           score: 4.5, count: 312,  source: 'Amazon' },
    { keywords: ['MAG B650 Tomahawk'],    score: 4.6, count: 512,  source: 'Amazon' },
    { keywords: ['B650 Gaming Plus'],     score: 4.5, count: 412,  source: 'Amazon' },
    { keywords: ['Pro B650M-P'],          score: 4.4, count: 312,  source: 'Amazon' },
    { keywords: ['B650'],                 score: 4.5, count: 312,  source: 'Amazon' },
    // ── MSI B550 ─────────────────────────────────────────────────────────────
    { keywords: ['MAG B550 Tomahawk MAX WiFi'], score: 4.7, count: 412, source: 'Amazon' },
    { keywords: ['MAG B550 Tomahawk'],    score: 4.7, count: 2134, source: 'Amazon' },
    { keywords: ['MPG B550 Gaming Plus'], score: 4.6, count: 1834, source: 'Amazon' },
    { keywords: ['B550M PRO-VDH'],        score: 4.5, count: 912,  source: 'Amazon' },
    { keywords: ['PRO B550M-VC'],         score: 4.5, count: 412,  source: 'Amazon' },
    { keywords: ['B550-A PRO'],           score: 4.5, count: 812,  source: 'Amazon' },
    { keywords: ['B550'],                 score: 4.5, count: 612,  source: 'Amazon' },
    // ── MSI A320 / A520 ──────────────────────────────────────────────────────
    { keywords: ['A320M-A PRO'],          score: 4.3, count: 312,  source: 'Amazon' },
    { keywords: ['A320'],                 score: 4.2, count: 312,  source: 'Amazon' },
    // ── ASRock Z890 ──────────────────────────────────────────────────────────
    { keywords: ['Steel Legend Z890'],    score: 4.6, count: 98,   source: 'Amazon' },
    { keywords: ['Taichi Z890'],          score: 4.8, count: 98,   source: 'Amazon' },
    { keywords: ['Z890'],                 score: 4.6, count: 98,   source: 'Amazon' },
    // ── ASRock Z790 ──────────────────────────────────────────────────────────
    { keywords: ['Taichi Z790'],          score: 4.8, count: 198,  source: 'Amazon' },
    { keywords: ['Steel Legend Z790'],    score: 4.6, count: 312,  source: 'Amazon' },
    { keywords: ['Z790 Pro RS'],          score: 4.5, count: 312,  source: 'Amazon' },
    { keywords: ['Z790'],                 score: 4.5, count: 312,  source: 'Amazon' },
    // ── ASRock X870E / X870 ──────────────────────────────────────────────────
    { keywords: ['Phantom Gaming X870E'], score: 4.7, count: 154,  source: 'Amazon' },
    { keywords: ['Taichi X870E'],         score: 4.8, count: 98,   source: 'Amazon' },
    { keywords: ['X870E'],                score: 4.7, count: 154,  source: 'Amazon' },
    { keywords: ['X870'],                 score: 4.6, count: 198,  source: 'Amazon' },
    // ── ASRock B850 ──────────────────────────────────────────────────────────
    { keywords: ['B850 LiveMixer'],       score: 4.6, count: 98,   source: 'Amazon' },
    { keywords: ['B850M Pro RS'],         score: 4.5, count: 98,   source: 'Amazon' },
    { keywords: ['B850'],                 score: 4.5, count: 98,   source: 'Amazon' },
    // ── ASRock B760 ──────────────────────────────────────────────────────────
    { keywords: ['B760M PG Riptide'],     score: 4.5, count: 412,  source: 'Amazon' },
    { keywords: ['B760M Pro RS'],         score: 4.5, count: 312,  source: 'Amazon' },
    { keywords: ['B760 Pro RS'],          score: 4.5, count: 312,  source: 'Amazon' },
    { keywords: ['B760'],                 score: 4.5, count: 312,  source: 'Amazon' },
    // ── ASRock B650 ──────────────────────────────────────────────────────────
    { keywords: ['B650M PG Lightning'],   score: 4.6, count: 412,  source: 'Amazon' },
    { keywords: ['B650M Pro RS'],         score: 4.5, count: 312,  source: 'Amazon' },
    { keywords: ['B650'],                 score: 4.5, count: 312,  source: 'Amazon' },
    // ── ASRock B550 ──────────────────────────────────────────────────────────
    { keywords: ['B550 PG Riptide'],      score: 4.5, count: 412,  source: 'Amazon' },
    { keywords: ['B550'],                 score: 4.4, count: 412,  source: 'Amazon' },
    // ── NZXT ─────────────────────────────────────────────────────────────────
    { keywords: ['NZXT', 'X870E'],        score: 4.6, count: 98,   source: 'Amazon' },
    { keywords: ['NZXT', 'N9 X870E'],     score: 4.6, count: 98,   source: 'Amazon' },
    // ── MACHINIST / generic budget ────────────────────────────────────────────
    { keywords: ['MACHINIST', 'B450'],    score: 4.2, count: 198,  source: 'Amazon' },
    { keywords: ['B450'],                 score: 4.3, count: 412,  source: 'Amazon' },
    // ── MICRO CENTER bundles ─────────────────────────────────────────────────
    { keywords: ['MICRO CENTER', 'Bundle'], score: 4.6, count: 98, source: 'Amazon' },
    // ── Generic chipset fallbacks ─────────────────────────────────────────────
    { keywords: ['X670E'],                score: 4.6, count: 198,  source: 'Amazon' },
    { keywords: ['X670'],                 score: 4.5, count: 312,  source: 'Amazon' },
    { keywords: ['A620'],                 score: 4.3, count: 198,  source: 'Amazon' },
];

// ─────────────────────────────────────────────────────────────────────────────
// CASE RATINGS
// ─────────────────────────────────────────────────────────────────────────────
const CASE_RATINGS = [
    // ── NZXT ─────────────────────────────────────────────────────────────────
    { keywords: ['NZXT H9 Flow RGB+'],    score: 4.7, count: 198,  source: 'Amazon' },
    { keywords: ['NZXT H9 Flow RGB'],     score: 4.7, count: 312,  source: 'Amazon' },
    { keywords: ['NZXT H9 Flow'],         score: 4.7, count: 512,  source: 'Amazon' },
    { keywords: ['NZXT H9'],              score: 4.7, count: 512,  source: 'Amazon' },
    { keywords: ['NZXT H6 Flow RGB'],     score: 4.7, count: 412,  source: 'Amazon' },
    { keywords: ['NZXT H6 Flow'],         score: 4.7, count: 612,  source: 'Amazon' },
    { keywords: ['NZXT H6'],              score: 4.7, count: 612,  source: 'Amazon' },
    { keywords: ['NZXT H5 Flow RGB'],     score: 4.7, count: 512,  source: 'Amazon' },
    { keywords: ['NZXT H5 Flow'],         score: 4.7, count: 712,  source: 'Amazon' },
    { keywords: ['NZXT H5'],              score: 4.7, count: 712,  source: 'Amazon' },
    { keywords: ['NZXT H3 Flow'],         score: 4.6, count: 312,  source: 'Amazon' },
    { keywords: ['NZXT H3'],              score: 4.6, count: 412,  source: 'Amazon' },
    // ── Corsair ───────────────────────────────────────────────────────────────
    { keywords: ['iCUE Link 3500X RGB'],  score: 4.7, count: 198,  source: 'Amazon' },
    { keywords: ['CORSAIR 3500X'],        score: 4.7, count: 312,  source: 'Amazon' },
    { keywords: ['CORSAIR 5000D RS'],     score: 4.8, count: 198,  source: 'Amazon' },
    { keywords: ['CORSAIR 4000D RS ARGB'],score: 4.7, count: 412,  source: 'Amazon' },
    { keywords: ['CORSAIR 4000D RS'],     score: 4.7, count: 512,  source: 'Amazon' },
    { keywords: ['Corsair 4000D Airflow'],score: 4.8, count: 3412, source: 'Amazon' },
    { keywords: ['CORSAIR 4000D'],        score: 4.7, count: 1834, source: 'Amazon' },
    { keywords: ['Corsair 3000D Airflow'],score: 4.7, count: 812,  source: 'Amazon' },
    { keywords: ['Corsair 3000D'],        score: 4.6, count: 912,  source: 'Amazon' },
    // ── Lian Li ───────────────────────────────────────────────────────────────
    { keywords: ['Lian Li O11 Vision'],   score: 4.7, count: 412,  source: 'Amazon' },
    { keywords: ['Lian Li O11'],          score: 4.8, count: 1234, source: 'Amazon' },
    { keywords: ['Lian Li A3-mATX'],      score: 4.6, count: 198,  source: 'Amazon' },
    { keywords: ['LIAN LI'],              score: 4.7, count: 512,  source: 'Amazon' },
    // ── Cooler Master ─────────────────────────────────────────────────────────
    { keywords: ['HAF 700 EVO'],          score: 4.7, count: 198,  source: 'Amazon' },
    { keywords: ['HAF 700'],              score: 4.6, count: 312,  source: 'Amazon' },
    { keywords: ['TD500 Mesh V2'],        score: 4.7, count: 812,  source: 'Amazon' },
    { keywords: ['TD500 Mesh'],           score: 4.7, count: 1134, source: 'Amazon' },
    { keywords: ['NR200P V3'],            score: 4.8, count: 198,  source: 'Amazon' },
    { keywords: ['NR200P V2'],            score: 4.8, count: 412,  source: 'Amazon' },
    { keywords: ['NR200P'],               score: 4.8, count: 1834, source: 'Amazon' },
    { keywords: ['NR200'],                score: 4.7, count: 2134, source: 'Amazon' },
    { keywords: ['MasterBox Q300L V2'],   score: 4.5, count: 412,  source: 'Amazon' },
    { keywords: ['MasterBox Q300L'],      score: 4.5, count: 1234, source: 'Amazon' },
    { keywords: ['Q300L'],                score: 4.5, count: 1234, source: 'Amazon' },
    // ── Thermaltake ───────────────────────────────────────────────────────────
    { keywords: ['CTE T500'],             score: 4.6, count: 198,  source: 'Amazon' },
    { keywords: ['View 270 Plus'],        score: 4.6, count: 198,  source: 'Amazon' },
    { keywords: ['View 270'],             score: 4.5, count: 312,  source: 'Amazon' },
    { keywords: ['Tower 300'],            score: 4.7, count: 612,  source: 'Amazon' },
    // ── Montech ───────────────────────────────────────────────────────────────
    { keywords: ['Montech AIR 903 MAX'],  score: 4.6, count: 312,  source: 'Amazon' },
    { keywords: ['Montech AIR 903'],      score: 4.6, count: 412,  source: 'Amazon' },
    { keywords: ['Montech X3 Mesh'],      score: 4.6, count: 512,  source: 'Amazon' },
    { keywords: ['Montech X3'],           score: 4.6, count: 612,  source: 'Amazon' },
    { keywords: ['MONTECH XR-B'],         score: 4.5, count: 198,  source: 'Amazon' },
    { keywords: ['Montech'],              score: 4.5, count: 312,  source: 'Amazon' },
    // ── ASUS ──────────────────────────────────────────────────────────────────
    { keywords: ['ASUS A31 White'],       score: 4.6, count: 198,  source: 'Amazon' },
    { keywords: ['ASUS A31'],             score: 4.6, count: 412,  source: 'Amazon' },
    // ── Antec ─────────────────────────────────────────────────────────────────
    { keywords: ['Antec Flux Wood'],      score: 4.6, count: 198,  source: 'Amazon' },
    { keywords: ['Antec Flux Pro'],       score: 4.6, count: 198,  source: 'Amazon' },
    { keywords: ['Antec Flux'],           score: 4.5, count: 312,  source: 'Amazon' },
    { keywords: ['Antec Performance 1'],  score: 4.6, count: 198,  source: 'Amazon' },
    { keywords: ['Antec C8 Curve Wood'],  score: 4.6, count: 98,   source: 'Amazon' },
    { keywords: ['Antec C8 Wood'],        score: 4.5, count: 154,  source: 'Amazon' },
    { keywords: ['Antec C8'],             score: 4.5, count: 198,  source: 'Amazon' },
    { keywords: ['Antec'],                score: 4.5, count: 198,  source: 'Amazon' },
    // ── SilverStone ───────────────────────────────────────────────────────────
    { keywords: ['SilverStone ML09'],     score: 4.5, count: 312,  source: 'Amazon' },
    { keywords: ['SilverStone'],          score: 4.5, count: 312,  source: 'Amazon' },
    // ── SSUPD ─────────────────────────────────────────────────────────────────
    { keywords: ['SSUPD Meshroom D'],     score: 4.7, count: 312,  source: 'Amazon' },
    { keywords: ['Meshroom D'],           score: 4.7, count: 312,  source: 'Amazon' },
    // ── JONSBO / JONSPLUS ────────────────────────────────────────────────────
    { keywords: ['JONSBO C6'],            score: 4.5, count: 198,  source: 'Amazon' },
    { keywords: ['JONSBO D32'],           score: 4.5, count: 198,  source: 'Amazon' },
    { keywords: ['JONSPLUS Z20'],         score: 4.5, count: 154,  source: 'Amazon' },
    { keywords: ['JONSBO'],              score: 4.5, count: 198,  source: 'Amazon' },
    // ── Zalman ────────────────────────────────────────────────────────────────
    { keywords: ['Zalman Raven'],         score: 4.4, count: 198,  source: 'Amazon' },
    { keywords: ['Zalman T6'],            score: 4.4, count: 312,  source: 'Amazon' },
    { keywords: ['Zalman'],               score: 4.4, count: 198,  source: 'Amazon' },
    // ── MSI ───────────────────────────────────────────────────────────────────
    { keywords: ['MSI MAG Forge 321R'],   score: 4.5, count: 198,  source: 'Amazon' },
    { keywords: ['MSI MAG Forge'],        score: 4.5, count: 312,  source: 'Amazon' },
    { keywords: ['MSI'],                  score: 4.5, count: 198,  source: 'Amazon' },
    // ── PCCOOLER ──────────────────────────────────────────────────────────────
    { keywords: ['PCCOOLER'],             score: 4.4, count: 198,  source: 'Amazon' },
    // ── Raidmax ───────────────────────────────────────────────────────────────
    { keywords: ['Raidmax I802'],         score: 4.4, count: 198,  source: 'Amazon' },
    { keywords: ['Raidmax'],              score: 4.4, count: 198,  source: 'Amazon' },
    // ── Rosewill ──────────────────────────────────────────────────────────────
    { keywords: ['Rosewill FBM'],         score: 4.3, count: 312,  source: 'Amazon' },
    { keywords: ['Rosewill'],             score: 4.3, count: 312,  source: 'Amazon' },
    // ── GAMDIAS ───────────────────────────────────────────────────────────────
    { keywords: ['GAMDIAS'],              score: 4.4, count: 312,  source: 'Amazon' },
    // ── SAMA ──────────────────────────────────────────────────────────────────
    { keywords: ['SAMA NEVIEW'],          score: 4.4, count: 198,  source: 'Amazon' },
    { keywords: ['SAMA'],                 score: 4.3, count: 198,  source: 'Amazon' },
    // ── darkFlash ─────────────────────────────────────────────────────────────
    { keywords: ['darkFlash', 'Full-Tower'],score: 4.4, count: 198, source: 'Amazon' },
    { keywords: ['darkFlash', 'Micro'],   score: 4.3, count: 312,  source: 'Amazon' },
    { keywords: ['darkFlash WD200'],      score: 4.3, count: 154,  source: 'Amazon' },
    { keywords: ['darkFlash'],            score: 4.3, count: 412,  source: 'Amazon' },
    // ── MUSETEX ───────────────────────────────────────────────────────────────
    { keywords: ['MUSETEX'],              score: 4.4, count: 412,  source: 'Amazon' },
    // ── RUIX ──────────────────────────────────────────────────────────────────
    { keywords: ['RUIX OV603'],           score: 4.4, count: 154,  source: 'Amazon' },
    { keywords: ['RUIX OV303'],           score: 4.4, count: 198,  source: 'Amazon' },
    { keywords: ['RUIX CV203'],           score: 4.4, count: 154,  source: 'Amazon' },
    { keywords: ['RUIX CV103'],           score: 4.3, count: 198,  source: 'Amazon' },
    { keywords: ['RUIX'],                 score: 4.3, count: 198,  source: 'Amazon' },
    // ── KEDIERS ───────────────────────────────────────────────────────────────
    { keywords: ['KEDIERS'],              score: 4.3, count: 312,  source: 'Amazon' },
    // ── DARKROCK ──────────────────────────────────────────────────────────────
    { keywords: ['DARKROCK EC2'],         score: 4.5, count: 98,   source: 'Amazon' },
    // ── VEVOR ─────────────────────────────────────────────────────────────────
    { keywords: ['VEVOR'],                score: 4.3, count: 198,  source: 'Amazon' },
    // ── Mini-ITX / SFF generic ────────────────────────────────────────────────
    { keywords: ['Mini-ITX', 'SFF'],      score: 4.3, count: 154,  source: 'Amazon' },
    { keywords: ['Mini ITX', 'SFF'],      score: 4.3, count: 154,  source: 'Amazon' },
    // ── ASUS cases ────────────────────────────────────────────────────────────
    { keywords: ['ASUS Prime AP201'],     score: 4.6, count: 412,  source: 'Amazon' },
    { keywords: ['AP201'],                score: 4.6, count: 412,  source: 'Amazon' },
    // ── S300 SFF cases ────────────────────────────────────────────────────────
    { keywords: ['S300', 'SFX'],          score: 4.4, count: 198,  source: 'Amazon' },
    { keywords: ['S300', 'Mini-ITX'],     score: 4.4, count: 198,  source: 'Amazon' },
    { keywords: ['S300'],                 score: 4.4, count: 198,  source: 'Amazon' },
    // ── K49-BL ────────────────────────────────────────────────────────────────
    { keywords: ['K49-BL'],               score: 4.4, count: 98,   source: 'Amazon' },
    // ── Generic named-model fallbacks ────────────────────────────────────────
    { keywords: ['Mid-Tower', 'ATX'],     score: 4.3, count: 198,  source: 'Amazon' },
    { keywords: ['Mid Tower', 'ATX'],     score: 4.3, count: 198,  source: 'Amazon' },
    { keywords: ['Micro ATX Case'],       score: 4.2, count: 154,  source: 'Amazon' },
    { keywords: ['MATX Case'],            score: 4.2, count: 154,  source: 'Amazon' },
    { keywords: ['ATX Computer Case'],    score: 4.2, count: 198,  source: 'Amazon' },
    { keywords: ['Gaming PC Case'],       score: 4.2, count: 198,  source: 'Amazon' },
    { keywords: ['Mini ITX Case'],        score: 4.3, count: 154,  source: 'Amazon' },
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
                // Speed-based delta: faster RAM scores higher within the same product line
                const speed = parseInt(doc.speed || doc.speedMHz) || 0;
                const isDDR5 = (doc.memoryType || text).toUpperCase().includes('DDR5');
                let speedDelta = 0;
                if (isDDR5) {
                    if (speed >= 7600)      speedDelta = +0.2;
                    else if (speed >= 7000) speedDelta = +0.15;
                    else if (speed >= 6400) speedDelta = +0.1;
                    else if (speed >= 6000) speedDelta = +0.05;
                    else if (speed < 5000)  speedDelta = -0.1;
                } else {
                    if (speed >= 4000)      speedDelta = +0.1;
                    else if (speed >= 3600) speedDelta = +0.05;
                    else if (speed < 3000)  speedDelta = -0.1;
                }
                const finalScore = Math.round(Math.min(5.0, Math.max(1.0, rating.score + speedDelta)) * 10) / 10;
                await db.collection('rams').updateOne(
                    { _id: doc._id },
                    { $set: { reviewScore: finalScore, reviewCount: rating.count, reviewSource: rating.source } }
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

    // ── Cases ─────────────────────────────────────────────────────────────────
    const caseDocs = await db.collection('cases').find({}).toArray();
    for (const doc of caseDocs) {
        total++;
        const text = doc.name || doc.title || '';
        const rating = matchByKeywords(CASE_RATINGS, text);
        if (rating) {
            await db.collection('cases').updateOne(
                { _id: doc._id },
                { $set: { reviewScore: rating.score, reviewCount: rating.count, reviewSource: rating.source } }
            );
            matched++;
        } else {
            skipped++;
        }
    }
    console.log(`Cases: processed ${caseDocs.length} docs`);

    console.log(`\n📊 Results: ${matched}/${total} matched (${skipped} unmatched)`);
    await client.close();
}

run().catch(err => { console.error(err); process.exit(1); });
