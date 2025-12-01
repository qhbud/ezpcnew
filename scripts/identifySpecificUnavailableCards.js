const { connectToDatabase, getDatabase } = require('../config/database');

async function identifySpecificUnavailableCards() {
  console.log('🔍 IDENTIFYING THE 2 SPECIFIC CARDS THAT SHOULD BE UNAVAILABLE\n');

  try {
    await connectToDatabase();
    const db = getDatabase();

    // The two cards that should be unavailable
    const targetCards = [
      {
        searchName: 'MSI Gaming GeForce RTX 4070 12GB GDRR6X 192-Bit HDMI/DP Nvlink TORX Fan 4.0 Ada Lovelace Architecture Graphics Card (RTX 4070 Ventus 2X 12G OC) (Renewed)',
        collection: 'gpus_rtx_4070',
        keywords: ['Renewed', 'Ventus 2X 12G OC']
      },
      {
        searchName: 'MSI Gaming RTX 4070 Super 12G Ventus 3X OC Graphics Card (NVIDIA RTX 4070 Super, 192-Bit, Extreme Clock: 2520 MHz, 12GB GDRR6X 21 Gbps, HDMI/DP, Ada Lovelace Architecture)',
        collection: 'gpus_rtx_4070_super',
        keywords: ['Ventus 3X OC', '2520 MHz']
      }
    ];

    console.log('📋 SEARCHING FOR TARGET UNAVAILABLE CARDS:');

    for (const target of targetCards) {
      console.log(`\n🔍 Searching for: ${target.searchName.substring(0, 80)}...`);
      console.log(`📂 Collection: ${target.collection}`);

      // Try different search strategies
      const searchStrategies = [
        { name: 'Renewed keyword', query: { name: { $regex: 'Renewed', $options: 'i' } } },
        { name: 'Ventus 2X 12G OC', query: { name: { $regex: 'Ventus 2X.*12G.*OC', $options: 'i' } } },
        { name: 'Ventus 3X OC', query: { name: { $regex: 'Ventus 3X.*OC', $options: 'i' } } },
        { name: '2520 MHz', query: { name: { $regex: '2520.*MHz', $options: 'i' } } }
      ];

      for (const strategy of searchStrategies) {
        const results = await db.collection(target.collection).find({
          ...strategy.query,
          sourceUrl: { $exists: true, $ne: null }
        }).toArray();

        if (results.length > 0) {
          console.log(`✅ Found ${results.length} matches using "${strategy.name}":`);
          results.forEach((gpu, i) => {
            const productId = gpu.sourceUrl.match(/\/dp\/([A-Z0-9]{10})/)?.[1] || 'Unknown';
            console.log(`   ${i + 1}. ${gpu.name.substring(0, 60)}...`);
            console.log(`      Product ID: ${productId}`);
            console.log(`      URL: ${gpu.sourceUrl}`);
            console.log(`      Current Price: $${gpu.currentPrice}`);
          });
        }
      }
    }

    console.log('\n\n📋 ALL RTX 4070 CARDS FOR COMPARISON:');

    const collections = ['gpus_rtx_4070', 'gpus_rtx_4070_super'];
    for (const collectionName of collections) {
      console.log(`\n📂 ${collectionName.toUpperCase()}:`);
      const allCards = await db.collection(collectionName).find({
        sourceUrl: { $exists: true, $ne: null, $regex: /amazon\.com/i }
      }).toArray();

      allCards.forEach((gpu, i) => {
        const productId = gpu.sourceUrl.match(/\/dp\/([A-Z0-9]{10})/)?.[1] || 'Unknown';
        const isRenewed = gpu.name.toLowerCase().includes('renewed');
        const isVentus3X = gpu.name.toLowerCase().includes('ventus 3x');
        const has2520MHz = gpu.name.toLowerCase().includes('2520');

        const flags = [];
        if (isRenewed) flags.push('RENEWED');
        if (isVentus3X) flags.push('VENTUS_3X');
        if (has2520MHz) flags.push('2520_MHZ');

        console.log(`   ${i + 1}. [${productId}] ${gpu.name.substring(0, 50)}... ${flags.length > 0 ? `(${flags.join(', ')})` : ''}`);
      });
    }

  } catch (error) {
    console.error('❌ Search failed:', error);
  }

  process.exit(0);
}

identifySpecificUnavailableCards().catch(console.error);