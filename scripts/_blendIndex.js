// Compute a blended GPU performance index from THREE real sources, each
// normalized to RTX 5090 = 100:
//   TPU  = TechPowerUp "Relative Performance" (≈25-game aggregate; gaming truth)
//   PM   = PassMark G3D Mark (synthetic; finer granularity, tie-breaker)
//   NB   = NotebookCheck "Performance Rating" (3DMark blend; corroboration)
// Weighting favors TPU (gaming-accurate, full coverage); PM/NB add resolution and
// break TPU's coarse integer ties. Weights renormalize over whichever sources a
// card has. Final scaled so RTX 5090 = 197.5; strictly monotonic (ties nudged).
const W = { tpu: 0.70, pm: 0.15, nb: 0.15 };

// % of RTX 5090. (i) = interpolated from neighbors (card absent from TPU's list).
const TPU = {
  "RTX 5090":100,"RTX 4090":76,"RTX 5080":66,"RX 7900 XTX":58,"RTX 4080 Super":59,
  "RTX 4080":58,"RTX 5070 Ti":57,"RX 9070 XT":55,"RX 7900 XT":50,"RTX 4070 Ti Super":49,
  "RX 9070":49,"RTX 4070 Ti":45,"RTX 5070":45,"RX 7900 GRE":41,"RTX 4070 Super":42,
  "RX 6950 XT":41,"RTX 3090 Ti":49,"RX 6900 XT":40,"RX 7800 XT":39,"RTX 4070":40,
  "RTX 3090":44,"RX 6800 XT":38,"RTX 3080 Ti":43,"RTX 3080":39,"RX 7700 XT":34,
  "RX 6800":32,"RTX 3070 Ti":33,"RTX 5060 Ti":35,"RX 9060 XT":33,"RTX 4060 Ti":31,
  "RTX 3070":31,"RX 6750 XT":29,"RX 6700 XT":27,"RTX 3060 Ti":27,"RTX 5060":30,
  "RX 9060":28,"RX 6700":25,"RTX 4060":24,"RX 7600 XT":24,"Arc B580":24,
  "RX 7600":23,"RX 6650 XT":23,"RTX 5050":24,"RX 6600 XT":21,"Arc A770":22,
  "Arc B570":21,"RTX 3060":21,"RX 6600":18,"Arc A750":20,"Arc A580":18,
  "RTX 3050":13,"GTX 1660 Ti":14,"GTX 1660 Super":14,"GTX 1660":13,"RX 6500 XT":11,
  "Arc A380":8,"GTX 1650 Super":11,"RX 6400":8,"GTX 1650":8,"Arc A310":7,"GTX 1630":5
};
const TPU_INTERP = new Set(["RX 9060","RX 6700","Arc B570","Arc A310"]);

const PM = {
  "RTX 5090":100.0,"RTX 4090":97.7,"RTX 5080":91.6,"RTX 4080":88.4,"RTX 4080 Super":87.9,
  "RTX 5070 Ti":83.1,"RTX 4070 Ti Super":81.7,"RTX 4070 Ti":81.0,"RX 7900 XTX":80.7,"RTX 4070 Super":76.9,
  "RTX 3090 Ti":75.2,"RX 7900 XT":74.6,"RTX 5070":73.7,"RX 6950 XT":72.1,"RX 7900 GRE":70.4,
  "RX 9070 XT":69.1,"RTX 4070":69.0,"RTX 3080 Ti":68.7,"RX 6900 XT":68.4,"RTX 3090":68.1,
  "RX 9070":65.2,"RX 6800 XT":64.3,"RTX 3080":64.2,"RX 7800 XT":62.6,"RTX 3070 Ti":59.6,
  "RX 7700 XT":58.3,"RTX 5060 Ti":58.1,"RTX 4060 Ti":58.0,"RTX 3070":56.7,"RX 6800":56.6,
  "RTX 5060":53.2,"RX 6750 XT":53.2,"RTX 3060 Ti":52.0,"RX 9060 XT":51.6,"RX 6700 XT":50.6,
  "RTX 4060":50.0,"RX 6700":48.6,"RX 9060":45.1,"RX 7600 XT":44.5,"RX 6650 XT":43.9,
  "RTX 5050":43.7,"RTX 3060":42.9,"RX 7600":42.3,"RX 6600 XT":42.2,"Arc B580":41.1,
  "RX 6600":38.6,"Arc B570":36.2,"Arc A770":34.3,"GTX 1660 Super":32.5,"Arc A750":32.4,
  "GTX 1660 Ti":32.4,"RTX 3050":32.1,"Arc A580":30.9,"GTX 1660":29.8,"GTX 1650 Super":26.2,
  "RX 6500 XT":24.7,"GTX 1650":20.2,"RX 6400":19.9,"Arc A380":16.2,"Arc A310":14.0,"GTX 1630":12.8
};

const NB = {
  "RTX 5090":100.0,"RTX 4090":104.4,"RTX 5080":88.7,"RX 7900 XTX":92.2,"RTX 4080 Super":81.5,
  "RTX 4080":81.5,"RTX 5070 Ti":97.2,"RX 9070 XT":85.9,"RX 7900 XT":87.5,"RTX 4070 Ti Super":75.2,
  "RX 9070":81.5,"RTX 4070 Ti":73.4,"RTX 5070":78.1,"RX 7900 GRE":75.5,"RTX 4070 Super":67.4,
  "RX 6950 XT":82.4,"RTX 3090 Ti":73.4,"RX 7800 XT":68.7,"RTX 4070":60.8,
  "RTX 3090":65.8,"RX 6800 XT":68.7,"RTX 3080 Ti":65.2,"RTX 3080":54.2,"RX 7700 XT":59.2,
  "RX 6800":61.8,"RTX 3070 Ti":52.0,"RTX 5060 Ti":58.0,"RX 9060 XT":53.0,"RTX 4060 Ti":47.0,
  "RTX 3070":42.9,"RX 6750 XT":52.0,"RX 6700 XT":48.6,"RTX 3060 Ti":40.1,"RTX 5060":52.4,
  "RTX 4060":38.6,"Arc B580":48.9,"RX 7600":38.6,"RX 6650 XT":41.1,"RX 6600 XT":39.2,
  "Arc A770":41.4,"RTX 3060":30.1,"RX 6600":32.3,"Arc A750":41.1,"Arc A580":38.2,
  "RTX 3050":21.6,"GTX 1660 Ti":22.1,"GTX 1660 Super":22.1,"GTX 1660":19.4,"RX 6500 XT":21.7,
  "Arc A380":14.0,"GTX 1650":13.2,"Arc A310":11.6
  // (RX 6900 XT, RX 9060, RX 6700, RX 7600 XT, RTX 5050, Arc B570, GTX 1650 Super,
  //  RX 6400, GTX 1630 absent on NotebookCheck — handled by renormalized weights)
};

const KEYS = Object.keys(TPU);
const rows = KEYS.map(k => {
  const parts = [];
  if (TPU[k] != null) parts.push([W.tpu, TPU[k]]);
  if (PM[k]  != null) parts.push([W.pm,  PM[k]]);
  if (NB[k]  != null) parts.push([W.nb,  NB[k]]);
  const wsum = parts.reduce((s, [w]) => s + w, 0);
  const blended = parts.reduce((s, [w, v]) => s + w * v, 0) / wsum;
  return { k, tpu: TPU[k], pm: PM[k] ?? null, nb: NB[k] ?? null, blended };
});

// Scale so RTX 5090 = 197.5
const top = rows.find(r => r.k === "RTX 5090").blended;
rows.forEach(r => { r.final = +(r.blended / top * 197.5).toFixed(1); });

// Sort desc, enforce strict monotonic (break ties by nudging the lower one down 0.1)
rows.sort((a, b) => b.final - a.final || b.blended - a.blended);
for (let i = 1; i < rows.length; i++) {
  if (rows[i].final >= rows[i - 1].final) rows[i].final = +(rows[i - 1].final - 0.1).toFixed(1);
}

console.log("rank\tfinal\tTPU\tPM\tNB\tgpu");
rows.forEach((r, i) => console.log(`${i+1}\t${r.final}\t${r.tpu}\t${r.pm ?? '-'}\t${r.nb ?? '-'}\t${r.k}${TPU_INTERP.has(r.k)?'  (TPU interp)':''}`));

const out = {};
rows.forEach(r => { out[r.k] = r.final; });
require('fs').writeFileSync(__dirname + '/_blendOut.json', JSON.stringify(out, null, 2));
console.log("\nwrote _blendOut.json");
