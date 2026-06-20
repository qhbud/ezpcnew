// Blend CPU single- and multi-thread indices from THREE real sources, each metric
// normalized to its own max among the set (=100), equal-weighted, then rescaled so
// the top CPU = 100 per metric. Mirrors the GPU index methodology.
//   PM = PassMark (Single Thread Rating / CPU Mark)
//   CB = Cinebench R23 (Single / Multi)
//   GB = Geekbench 6 (Single-Core / Multi-Core)
// Raw data fetched 2026-06-20 (PassMark + NotebookCheck CB23 via subagent; Geekbench
// via local puppeteer-stealth). null = not found on that source for that CPU.
// 265K CB23 dropped (subagent flagged it as a likely mis-scrape); PM+GB carry it.
const D = {
  // key:            [PM_ST, PM_MT,  CB_s,  CB_m,  GB_s, GB_m]
  'AMD Ryzen 5 5600':   [3255, 21517, null,  null,  2053, 8594],
  'AMD Ryzen 5 5600X':  [3366, 21835, 1541,  11838, 2108, 8649],
  'AMD Ryzen 5 7600':   [3944, 26978, 1852,  12735, 2754, 12226],
  'AMD Ryzen 7 5700X':  [3387, 26580, 1499,  13184, 2147, 9718],
  'AMD Ryzen 7 5800X':  [3448, 27678, 1575,  15476, 2192, 10148],
  'AMD Ryzen 7 7700X':  [4178, 35526, 1987,  19088, 2972, 15409],
  'AMD Ryzen 7 7800X3D':[3760, 34280, 1726,  17197, 2720, 15006],
  'AMD Ryzen 7 9700X':  [4647, 37027, 2211,  20485, 3346, 16906],
  'AMD Ryzen 7 9800X3D':[4424, 39963, 2080,  23230, 3334, 18324],
  'AMD Ryzen 9 5900X':  [3465, 38906, 1526,  15441, 2198, 11779],
  'AMD Ryzen 9 5950X':  [3476, 45288, 1614,  26017, 2206, 12018],
  'AMD Ryzen 9 7900X':  [4228, 51261, 2020,  29289, 2944, 17706],
  'AMD Ryzen 9 7950X':  [4253, 62177, 1995,  34133, 2975, 19275],
  'AMD Ryzen 9 7950X3D':[4146, 62325, 2053,  36291, 2925, 19561],
  'AMD Ryzen 9 9900X':  [4677, 54413, 2253,  32172, 3334, 19701],
  'AMD Ryzen 9 9950X':  [4729, 65753, 2202,  40924, 3385, 21482],
  'AMD Ryzen 9 9950X3D':[4741, 70143, 2259,  42018, 3393, 22154],
  'Intel Core i5-12400F':[3487, 19575, 1680, 12380, 2217, 9109],
  'Intel Core i5-12600K':[3918, 27525, 1907, 17491, 2475, 11842],
  'Intel Core i5-13600K':[4113, 37496, 2001, 24221, 2675, 14888],
  'Intel Core i7-13700K':[4328, 45684, 2116, 30745, 2842, 17587],
  'Intel Core i9-12900K':[4127, 41128, 2005, 26125, 2581, 15138],
  'Intel Core i9-13900K':[4597, 58159, 2238, 37310, 2983, 19904],
  'Intel Core i7-14700K':[4456, 52070, 2160, 33441, 2919, 18764],
  'Intel Core i9-14900K':[4690, 58317, 2263, 39400, 3047, 20038],
  'Intel Core i9-14900KS':[4813, 60046, null, null,  3229, 23028],
  'Intel Core Ultra 5 245K':[4717, 43128, 2132, 25066, null, null],
  'Intel Core Ultra 7 265K':[4928, 58648, null, null,  3063, 20508],
  'Intel Core Ultra 9 285K':[5087, 67263, 2353, 42705, 3196, 22484],
  // ── Added 2026-06-20 (round 2): 4 previously-uncovered live CPUs + popular parts
  //    likely to be ingested. These use PassMark + Geekbench 6 only (no Cinebench);
  //    the blend averages whatever sources are present, on the same set-max anchors.
  'Intel Core i9-14900':   [4331, 44814, null, null, 2777, 16624], // non-K 65W
  'Intel Core i5-14400F':  [3701, 25506, null, null, 2309, 10958],
  'Intel Core i9-11900':   [3371, 22352, null, null, 2198, 9228],
  'Intel Core i5-11400F':  [2980, 16886, null, null, 1976, 7578],
  'AMD Ryzen 7 5800X3D':   [3234, 28301, null, null, 2115, 11043],
  'AMD Ryzen 7 5700X3D':   [2968, 26306, null, null, 1922, 10107],
  'AMD Ryzen 5 5500':      [3060, null,  null, null, 1870, 7629],  // PassMark multi n/a
  'AMD Ryzen 5 7600X':     [4131, 28292, null, null, 2890, 12869],
  'AMD Ryzen 7 7700':      [4053, 34361, null, null, 2877, 14788], // non-X 65W
  'AMD Ryzen 9 7900':      [4123, 48045, null, null, 2872, 16793], // non-X 65W
  'AMD Ryzen 5 9600X':     [4571, 30092, null, null, 3319, 14762],
  'AMD Ryzen 9 9900X3D':   [4640, 56175, null, null, 3284, 20090],
  'Intel Core i5-13400F':  [3632, 24937, null, null, 2285, 10775],
  'Intel Core i5-13500':   [3858, 30866, null, null, 2419, 12101],
  'Intel Core i5-14500':   [3952, 30907, null, null, 2504, 12590],
  'Intel Core i5-14600K':  [4267, 38437, null, null, 2822, 15885],
  'Intel Core i7-12700K':  [4004, 34272, null, null, 2559, 13872],
  'Intel Core i7-14700':   [4244, 40530, null, null, 2706, 15433], // non-K
  'Intel Core i9-13900KS': [4716, 60477, null, null, 3125, 21365],
  'Intel Core i3-12100F':  [3435, 13967, null, null, 2216, 7370],
  'Intel Core i3-13100F':  [3602, 14662, null, null, 2258, 7539],
  'Intel Core i9-13900':   [null, null,  null, null, 2747, 16322], // non-K (F); GB6 only
  'Intel Core i9-12900':   [null, null,  null, null, 2511, 13173], // non-K; GB6 only
};

const keys = Object.keys(D);
const col = (i) => keys.map(k => D[k][i]).filter(v => v != null);
const max = { pmS: Math.max(...col(0)), pmM: Math.max(...col(1)), cbS: Math.max(...col(2)),
              cbM: Math.max(...col(3)), gbS: Math.max(...col(4)), gbM: Math.max(...col(5)) };

function blend(k, kind) {
  const [pmS, pmM, cbS, cbM, gbS, gbM] = D[k];
  const src = kind === 'single'
    ? [[pmS, max.pmS], [cbS, max.cbS], [gbS, max.gbS]]
    : [[pmM, max.pmM], [cbM, max.cbM], [gbM, max.gbM]];
  const avail = src.filter(([v]) => v != null).map(([v, m]) => v / m * 100);
  return avail.reduce((a, b) => a + b, 0) / avail.length;
}

const rows = keys.map(k => ({ k, single: blend(k, 'single'), multi: blend(k, 'multi') }));
const sMax = Math.max(...rows.map(r => r.single));
const mMax = Math.max(...rows.map(r => r.multi));
rows.forEach(r => { r.single = +(r.single / sMax * 100).toFixed(1); r.multi = +(r.multi / mMax * 100).toFixed(1); });

// A few non-K parts exist on Geekbench only (PassMark fuzzy-redirects them to a
// different SKU, no Cinebench). GB single-core alone understates Intel vs the
// 3-source anchor, so derive these from their K-sibling's full score scaled by
// the Geekbench ratio (single & multi) — more accurate than GB-normalized alone.
const SIBLING = {
  'Intel Core i9-13900': 'Intel Core i9-13900K',
  'Intel Core i9-12900': 'Intel Core i9-12900K',
};
const byKey = Object.fromEntries(rows.map(r => [r.k, r]));
for (const [k, sib] of Object.entries(SIBLING)) {
  const r = byKey[k], s = byKey[sib];
  if (!r || !s) continue;
  const gbsK = D[sib][4], gbmK = D[sib][5], gbs = D[k][4], gbm = D[k][5];
  r.single = +(s.single * gbs / gbsK).toFixed(1);
  r.multi  = +(s.multi  * gbm / gbmK).toFixed(1);
}

console.log('SINGLE-THREAD (desc):');
[...rows].sort((a,b)=>b.single-a.single).forEach(r=>console.log(`  ${String(r.single).padStart(5)}  ${r.k}`));
console.log('\nMULTI-THREAD (desc):');
[...rows].sort((a,b)=>b.multi-a.multi).forEach(r=>console.log(`  ${String(r.multi).padStart(5)}  ${r.k}`));

const out = {}; rows.forEach(r => out[r.k] = { single: r.single, multi: r.multi });
require('fs').writeFileSync(__dirname + '/_blendCpuOut.json', JSON.stringify(out, null, 2));
console.log('\nwrote _blendCpuOut.json');
