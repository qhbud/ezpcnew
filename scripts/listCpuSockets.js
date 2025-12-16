const { connectToDatabase, getDatabase } = require('../config/database');

async function listCpuSockets() {
    try {
        await connectToDatabase();
        const db = getDatabase();

        console.log('📋 Listing all CPUs with their sockets...\n');

        // Get all CPU collections
        const collections = await db.listCollections().toArray();
        const cpuCollections = collections.filter(c => c.name.toLowerCase().includes('cpu'));

        console.log(`Found ${cpuCollections.length} CPU collections\n`);

        let allCpus = [];

        // Fetch CPUs from all CPU collections
        for (const collection of cpuCollections) {
            const cpus = await db.collection(collection.name).find({}).toArray();
            console.log(`Collection: ${collection.name} - ${cpus.length} CPUs`);
            allCpus = allCpus.concat(cpus.map(cpu => ({ ...cpu, collection: collection.name })));
        }

        console.log(`\n📊 Total CPUs: ${allCpus.length}\n`);
        console.log('='.repeat(100));

        // Sort by socket, then by name
        allCpus.sort((a, b) => {
            const socketA = (a.socket || a.socketType || 'Unknown').toString();
            const socketB = (b.socket || b.socketType || 'Unknown').toString();
            if (socketA !== socketB) return socketA.localeCompare(socketB);
            const nameA = (a.name || a.title || '').toString();
            const nameB = (b.name || b.title || '').toString();
            return nameA.localeCompare(nameB);
        });

        // Group by socket
        const cpusBySocket = {};
        allCpus.forEach(cpu => {
            const socket = (cpu.socket || cpu.socketType || 'Unknown').toString();
            if (!cpusBySocket[socket]) {
                cpusBySocket[socket] = [];
            }
            cpusBySocket[socket].push(cpu);
        });

        // Display grouped by socket
        for (const [socket, cpus] of Object.entries(cpusBySocket)) {
            console.log(`\n🔌 Socket: ${socket} (${cpus.length} CPUs)`);
            console.log('-'.repeat(100));
            cpus.forEach((cpu, index) => {
                const name = (cpu.name || cpu.title || 'Unknown').substring(0, 80);
                const price = cpu.currentPrice || cpu.price || 0;
                const manufacturer = cpu.manufacturer || 'Unknown';
                console.log(`${(index + 1).toString().padStart(3)}. ${name.padEnd(82)} | $${price.toString().padStart(7)} | ${manufacturer}`);
            });
        }

        console.log('\n' + '='.repeat(100));
        console.log('\n📊 Summary by Socket:');
        console.log('-'.repeat(50));
        Object.entries(cpusBySocket).forEach(([socket, cpus]) => {
            console.log(`${socket.padEnd(20)} : ${cpus.length} CPUs`);
        });

        console.log('\n✅ CPU listing complete!');

    } catch (error) {
        console.error('❌ Error listing CPUs:', error);
        throw error;
    } finally {
        process.exit(0);
    }
}

listCpuSockets();
