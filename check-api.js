const http = require('http');

http.get('http://localhost:3000/api/parts/gpus', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const gpus = JSON.parse(data);
        console.log(`\nTotal GPUs from API: ${gpus.length}`);

        const rtx4090 = gpus.filter(g =>
            (g.gpuModel && g.gpuModel.includes('4090')) ||
            (g.name && g.name.includes('4090'))
        );

        console.log(`RTX 4090s found: ${rtx4090.length}`);

        if (rtx4090.length > 0) {
            console.log('\nRTX 4090 cards:');
            rtx4090.forEach((g, i) => console.log(`  ${i+1}. ${g.name || g.gpuModel}`));
        } else {
            console.log('\n❌ NO RTX 4090s in API response!');
        }

        // Show what models ARE included
        const models = [...new Set(gpus.map(g => g.gpuModel).filter(Boolean))].sort();
        console.log(`\nModels in API: ${models.join(', ')}`);
    });
}).on('error', err => {
    console.error('Error:', err.message);
});
