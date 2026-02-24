const { connectToDatabase } = require('../config/database');
connectToDatabase().then(db => {
    db.collection('motherboards').find({}, {projection: {name:1, socket:1, chipset:1, memoryType:1}}).toArray().then(docs => {
        const missing = docs.filter(d => {
            if (!d.memoryType) return true;
            if (Array.isArray(d.memoryType) && d.memoryType.length === 0) return true;
            return false;
        });
        console.log('Total:', docs.length);
        console.log('Missing memoryType:', missing.length);
        console.log('Has memoryType:', docs.length - missing.length);
        const bySock = {};
        missing.forEach(d => { const s = d.socket||'unknown'; bySock[s]=(bySock[s]||0)+1; });
        console.log('\nMissing by socket:', JSON.stringify(bySock, null, 2));
        const byChipset = {};
        missing.forEach(d => { const c = d.chipset||'unknown'; byChipset[c]=(byChipset[c]||0)+1; });
        console.log('\nMissing by chipset:', JSON.stringify(byChipset, null, 2));
        process.exit(0);
    });
}).catch(e => { console.error(e); process.exit(1); });
