const http = require('http');

async function testRamApi() {
  console.log('🌐 Testing /api/parts/rams endpoint...\n');

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/parts/rams',
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const rams = JSON.parse(data);

          console.log('✅ API Response Received');
          console.log('='.repeat(60));
          console.log(`Total RAMs returned: ${rams.length}`);

          // Check how many have priceHistory field
          const withPriceHistory = rams.filter(r => r.priceHistory && Array.isArray(r.priceHistory) && r.priceHistory.length > 0);
          const withPriceHistoryField = rams.filter(r => r.priceHistory !== undefined);

          console.log(`RAMs with priceHistory field: ${withPriceHistoryField.length}`);
          console.log(`RAMs with non-empty priceHistory: ${withPriceHistory.length}`);

          // Show a sample RAM with price history
          const sample = rams.find(r => r.priceHistory && r.priceHistory.length > 0);

          if (sample) {
            console.log('\n📊 SAMPLE RAM WITH PRICE HISTORY:');
            console.log('='.repeat(60));
            console.log('Name:', sample.name || sample.title);
            console.log('Current Price:', sample.currentPrice);
            console.log('Has priceHistory field:', !!sample.priceHistory);
            console.log('Price History Length:', sample.priceHistory?.length || 0);

            if (sample.priceHistory && sample.priceHistory.length > 0) {
              console.log('\nFirst 2 price history entries:');
              sample.priceHistory.slice(0, 2).forEach((entry, i) => {
                console.log(`  [${i}] Date: ${entry.date}, Price: ${entry.price}, Available: ${entry.isAvailable}`);
              });
            }

            console.log('\n🔍 ALL FIELDS IN API RESPONSE:');
            console.log('='.repeat(60));
            console.log(Object.keys(sample).join(', '));
          } else {
            console.log('\n⚠️ No RAMs found with price history in API response');
          }

          // Show a sample RAM without price history
          const sampleWithout = rams.find(r => !r.priceHistory || r.priceHistory.length === 0);
          if (sampleWithout) {
            console.log('\n\n📊 SAMPLE RAM WITHOUT PRICE HISTORY:');
            console.log('='.repeat(60));
            console.log('Name:', sampleWithout.name || sampleWithout.title);
            console.log('Current Price:', sampleWithout.currentPrice);
            console.log('Has priceHistory field:', !!sampleWithout.priceHistory);
            console.log('Price History:', sampleWithout.priceHistory);
          }

          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Error:', error.message);
      reject(error);
    });

    req.end();
  });
}

testRamApi()
  .then(() => console.log('\n✅ Test complete'))
  .catch((error) => console.error('\n❌ Test failed:', error));
