const { connectToDatabase, getDatabase } = require('../config/database');

async function findMissingCpus() {
    try {
        await connectToDatabase();
        const db = getDatabase();
        const collection = db.collection('cpus');

        console.log('Searching for CPUs:\n');

        // Search for i9-13900K
        const i913900k = await collection.findOne({
            $or: [
                { name: { $regex: /i9-13900K[^F]/i } },
                { title: { $regex: /i9-13900K[^F]/i } }
            ]
        });
        console.log('i9-13900K:');
        if (i913900k) {
            console.log('  Name:', i913900k.name);
            console.log('  Title:', i913900k.title);
            console.log('  Single:', i913900k.singleCorePerformance);
            console.log('  Multi:', i913900k.multiThreadPerformance);
        } else {
            console.log('  NOT FOUND');
        }
        console.log('');

        // Search for i7-13700K
        const i713700k = await collection.findOne({
            $or: [
                { name: { $regex: /i7-13700K[^F]/i } },
                { title: { $regex: /i7-13700K[^F]/i } }
            ]
        });
        console.log('i7-13700K:');
        if (i713700k) {
            console.log('  Name:', i713700k.name);
            console.log('  Title:', i713700k.title);
            console.log('  Single:', i713700k.singleCorePerformance);
            console.log('  Multi:', i713700k.multiThreadPerformance);
        } else {
            console.log('  NOT FOUND');
        }
        console.log('');

        // Search for Ryzen 9 7950X
        const ryzen7950x = await collection.findOne({
            $or: [
                { name: { $regex: /7950X[^3]/i } },
                { title: { $regex: /7950X[^3]/i } }
            ]
        });
        console.log('Ryzen 9 7950X:');
        if (ryzen7950x) {
            console.log('  Name:', ryzen7950x.name);
            console.log('  Title:', ryzen7950x.title);
            console.log('  Single:', ryzen7950x.singleCorePerformance);
            console.log('  Multi:', ryzen7950x.multiThreadPerformance);
        } else {
            console.log('  NOT FOUND');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

findMissingCpus();
