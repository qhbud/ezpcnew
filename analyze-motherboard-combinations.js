require('dotenv').config();
const mongoose = require('mongoose');

// Define motherboard schema
const motherboardSchema = new mongoose.Schema({
    name: String,
    socket: String,
    formFactor: String,
    memoryType: String,
    memorySlots: Number,
    maxMemory: Number,
    chipset: String,
    price: Number,
    amazonUrl: String,
    imageUrl: String
}, { collection: 'motherboards' });

const Motherboard = mongoose.model('Motherboard', motherboardSchema);

async function analyzeMotherboardCombinations() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Get all motherboards
        const motherboards = await Motherboard.find({}).lean();
        console.log(`📊 Total motherboards in database: ${motherboards.length}\n`);

        // Create a map to store combinations
        const combinations = new Map();

        // Process each motherboard
        motherboards.forEach(mb => {
            // Convert to string and handle both string and object types
            const socket = mb.socket ? String(mb.socket).trim() || 'Unknown' : 'Unknown';
            const memType = mb.memoryType ? String(mb.memoryType).trim() || 'Unknown' : 'Unknown';
            const formFactor = mb.formFactor ? String(mb.formFactor).trim() || 'Unknown' : 'Unknown';

            // Create combination key
            const key = `${socket}|${memType}`;

            if (!combinations.has(key)) {
                combinations.set(key, {
                    socket: socket,
                    memoryType: memType,
                    total: 0,
                    itx: 0,
                    matx: 0,
                    atx: 0,
                    other: 0,
                    formFactors: {}
                });
            }

            const combo = combinations.get(key);
            combo.total++;

            // Count form factors
            const ff = formFactor.toLowerCase();
            if (ff.includes('mini-itx') || ff.includes('mini itx') || ff === 'itx') {
                combo.itx++;
            } else if (ff.includes('micro-atx') || ff.includes('micro atx') || ff.includes('matx') || ff === 'micro atx') {
                combo.matx++;
            } else if (ff === 'atx' || (ff.includes('atx') && !ff.includes('mini') && !ff.includes('micro'))) {
                combo.atx++;
            } else {
                combo.other++;
                // Track unusual form factors
                if (!combo.formFactors[formFactor]) {
                    combo.formFactors[formFactor] = 0;
                }
                combo.formFactors[formFactor]++;
            }
        });

        // Sort combinations by socket and memory type
        const sortedCombinations = Array.from(combinations.entries())
            .sort((a, b) => {
                if (a[1].socket !== b[1].socket) {
                    return a[1].socket.localeCompare(b[1].socket);
                }
                return a[1].memoryType.localeCompare(b[1].memoryType);
            });

        // Print results
        console.log('═══════════════════════════════════════════════════════════════════════════');
        console.log('MOTHERBOARD ANALYSIS BY SOCKET AND MEMORY TYPE');
        console.log('═══════════════════════════════════════════════════════════════════════════\n');

        let grandTotal = 0;
        let grandITX = 0;
        let grandMATX = 0;
        let grandATX = 0;
        let grandOther = 0;

        sortedCombinations.forEach(([key, data]) => {
            console.log(`┌─ Socket: ${data.socket} | Memory: ${data.memoryType}`);
            console.log(`│  Total Motherboards: ${data.total}`);
            console.log(`│  ├─ Mini-ITX: ${data.itx} (${(data.itx/data.total*100).toFixed(1)}%)`);
            console.log(`│  ├─ Micro-ATX: ${data.matx} (${(data.matx/data.total*100).toFixed(1)}%)`);
            console.log(`│  ├─ ATX: ${data.atx} (${(data.atx/data.total*100).toFixed(1)}%)`);
            if (data.other > 0) {
                console.log(`│  └─ Other: ${data.other} (${(data.other/data.total*100).toFixed(1)}%)`);
                Object.entries(data.formFactors).forEach(([ff, count]) => {
                    console.log(`│     └─ ${ff}: ${count}`);
                });
            }
            console.log('│');

            grandTotal += data.total;
            grandITX += data.itx;
            grandMATX += data.matx;
            grandATX += data.atx;
            grandOther += data.other;
        });

        console.log('═══════════════════════════════════════════════════════════════════════════');
        console.log('SUMMARY');
        console.log('═══════════════════════════════════════════════════════════════════════════\n');
        console.log(`Total Combinations: ${sortedCombinations.length}`);
        console.log(`Total Motherboards: ${grandTotal}`);
        console.log(`  ├─ Mini-ITX: ${grandITX} (${(grandITX/grandTotal*100).toFixed(1)}%)`);
        console.log(`  ├─ Micro-ATX: ${grandMATX} (${(grandMATX/grandTotal*100).toFixed(1)}%)`);
        console.log(`  ├─ ATX: ${grandATX} (${(grandATX/grandTotal*100).toFixed(1)}%)`);
        console.log(`  └─ Other: ${grandOther} (${(grandOther/grandTotal*100).toFixed(1)}%)`);
        console.log('');

        // Create a detailed breakdown table
        console.log('═══════════════════════════════════════════════════════════════════════════');
        console.log('DETAILED TABLE');
        console.log('═══════════════════════════════════════════════════════════════════════════\n');
        console.log('Socket          | Memory | Total | Mini-ITX | Micro-ATX |  ATX  | Other');
        console.log('───────────────────────────────────────────────────────────────────────────');

        sortedCombinations.forEach(([key, data]) => {
            const socket = data.socket.padEnd(15);
            const mem = data.memoryType.padEnd(6);
            const total = String(data.total).padStart(5);
            const itx = String(data.itx).padStart(8);
            const matx = String(data.matx).padStart(9);
            const atx = String(data.atx).padStart(6);
            const other = String(data.other).padStart(5);
            console.log(`${socket} | ${mem} | ${total} | ${itx} | ${matx} | ${atx} | ${other}`);
        });

        console.log('═══════════════════════════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        await mongoose.connection.close();
        console.log('✅ Database connection closed');
    }
}

analyzeMotherboardCombinations();
