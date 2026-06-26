// Mark each PSU with whether it ships a native high-power GPU connector
// (12VHPWR / 12V-2x6, the 16-pin cable on ATX 3.0/3.1 + PCIe 5.x units).
//
// PSU docs have no structured connector field (0/136 coverage), so the
// builder's "Verify high-power GPU connector" warning was guessing from the
// listing text at render time. This backfills a real boolean field
// `hasHighPowerConnector` (+ `highPowerConnectorSource` = the matched signal,
// or null) so the warning can be precise.
//
// Detection mirrors the front-end _psuHasHighPowerConnector regex: an explicit
// 12VHPWR / 12V-2x6 / 16-pin mention, or an ATX 3.0/3.1 / PCIe 5.x rating
// (both mandate the 16-pin cable). When the listing says none of these we mark
// false — conservative, since a modern ATX 3.0 PSU virtually always advertises
// it, and a false warning is safer than false reassurance.
//
// DB target follows MONGODB_URI (defaults to .env.atlas = Atlas). Dry-run by
// default; pass --commit to write. Pass --local to target localhost.

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.atlas') });
const { MongoClient } = require('mongodb');

const COMMIT = process.argv.includes('--commit');
if (process.argv.includes('--local')) {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/pcbuilder';
}

// Model families that ship a native 12V-2x6 connector (ATX 3.0/3.1) but whose
// Amazon titles don't spell out the spec, so the text regex misses them.
const KNOWN_TRUE = [
    { re: /Focus\s*V4\s*GX/i, label: 'Seasonic Focus V4 GX (ATX 3.1)' },
    { re: /Vertex\s*(GX|PX)/i, label: 'Seasonic Vertex GX/PX (ATX 3.0)' },
];

// Returns the matched signal string, or null if no high-power connector is evident.
function detectConnector(psu) {
    const hay = [
        psu.name, psu.title, psu.description,
        Array.isArray(psu.features) ? psu.features.join(' ') : psu.features
    ].filter(Boolean).join(' ');
    const known = KNOWN_TRUE.find(k => k.re.test(hay));
    if (known) return known.label;
    // Matches: 12VHPWR, 12V-2x6, 16-pin, ATX 3.x / ATX3 / ATX v3.1 (the spec that
    // introduced the 16-pin cable), and PCIe 5.x (mandates it). Tolerates the "v"
    // prefix ("ATX v3.1") and a missing decimal ("ATX3").
    const m = hay.match(/12VHPWR|12V-?2x6|12V-?2×6|16[- ]?pin|ATX\s?v?3(\.[01])?\b|PCI-?E\s?5(\.[01])?\b/i);
    return m ? m[0] : null;
}

(async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pcbuilder';
    const isAtlas = uri.includes('mongodb+srv');
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(process.env.DB_NAME || 'pcbuilder');

    try {
        const col = db.collection('psus');
        const docs = await col.find({}).toArray();
        console.log(`${COMMIT ? '' : 'DRY RUN — '}Marking ${docs.length} PSU(s) on ${isAtlas ? 'ATLAS' : 'local'}\n`);

        let withConn = 0, withoutConn = 0;
        const ops = [];
        const yes = [], no = [];

        for (const psu of docs) {
            const signal = detectConnector(psu);
            const has = !!signal;
            if (has) { withConn++; yes.push({ name: psu.name || psu.title || psu._id, signal }); }
            else { withoutConn++; no.push(psu.name || psu.title || psu._id); }

            ops.push({
                updateOne: {
                    filter: { _id: psu._id },
                    update: { $set: { hasHighPowerConnector: has, highPowerConnectorSource: signal } }
                }
            });
        }

        console.log(`HAS connector (${withConn}):`);
        yes.forEach(p => console.log(`  ✓ [${p.signal}]  ${p.name}`));
        console.log(`\nNO connector evident (${withoutConn}):`);
        no.forEach(n => console.log(`  ✗ ${n}`));
        console.log(`\nSummary: ${withConn} with connector, ${withoutConn} without, ${docs.length} total.`);

        if (COMMIT) {
            const res = await col.bulkWrite(ops);
            console.log(`\n✅ Wrote field to ${res.modifiedCount} doc(s) (matched ${res.matchedCount}).`);
        } else {
            console.log(`\n(dry run — no writes. Re-run with --commit to apply.)`);
        }
    } finally {
        await client.close();
    }
})().catch(e => { console.error('ERROR', e); process.exit(1); });
