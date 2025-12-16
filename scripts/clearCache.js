// Simple script to clear the server cache
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/clear-cache',
  method: 'POST'
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      if (response.success) {
        console.log('✅ Cache cleared successfully!');
      } else {
        console.log('❌ Failed to clear cache:', response);
      }
    } catch (error) {
      console.error('❌ Error parsing response:', error);
    }
    process.exit(0);
  });
});

req.on('error', (error) => {
  console.error('❌ Error clearing cache:', error.message);
  console.log('💡 Make sure the server is running on http://localhost:3000');
  process.exit(1);
});

req.end();
