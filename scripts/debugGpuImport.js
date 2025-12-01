const { connectToDatabase, getDatabase } = require('../config/database');
const crypto = require('crypto');
const https = require('https');
require('dotenv').config();

// Test with a single chipset and detailed logging
const AWS_CONFIG = {
  accessKey: process.env.AMAZON_ACCESS_KEY_ID,
  secretKey: process.env.AMAZON_SECRET_ACCESS_KEY,
  associateTag: process.env.AMAZON_ASSOCIATE_TAG,
  region: process.env.AMAZON_REGION || 'us-east-1',
  host: process.env.AMAZON_HOST || 'webservices.amazon.com',
  uri: '/paapi5/searchitems'
};

console.log('🔧 Debug Configuration:');
console.log('Access Key:', AWS_CONFIG.accessKey ? `${AWS_CONFIG.accessKey.substring(0, 5)}...` : 'Missing');
console.log('Secret Key:', AWS_CONFIG.secretKey ? `${AWS_CONFIG.secretKey.substring(0, 5)}...` : 'Missing');
console.log('Associate Tag:', AWS_CONFIG.associateTag);
console.log('Region:', AWS_CONFIG.region);
console.log('Host:', AWS_CONFIG.host);
console.log('');

// Test with RTX 4090 first
async function testSingleSearch() {
  const payload = {
    Keywords: 'RTX 4090',
    SearchIndex: 'Electronics',
    ItemCount: 3,
    Marketplace: 'www.amazon.com',
    PartnerTag: AWS_CONFIG.associateTag,
    PartnerType: 'Associates',
    Resources: [
      'ItemInfo.Title',
      'ItemInfo.Features',
      'Offers.Listings.Price',
      'Images.Primary.Medium'
    ]
  };

  const payloadString = JSON.stringify(payload);
  console.log('📤 Request Payload:', payloadString);
  
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Encoding': 'amz-1.0',
    'Host': AWS_CONFIG.host,
    'X-Amz-Target': 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems'
  };

  // Generate signature
  const algorithm = 'AWS4-HMAC-SHA256';
  const service = 'ProductAdvertisingAPI';
  const region = AWS_CONFIG.region;
  const accessKey = AWS_CONFIG.accessKey;
  const secretKey = AWS_CONFIG.secretKey;
  
  const date = new Date();
  const dateString = date.toISOString().split('T')[0].replace(/-/g, '');
  const timeString = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
  
  console.log('🕐 Timestamp:', timeString);
  console.log('📅 Date:', dateString);

  // Create canonical request
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map(key => `${key.toLowerCase()}:${headers[key]}\n`)
    .join('');
  
  const signedHeaders = Object.keys(headers)
    .sort()
    .map(key => key.toLowerCase())
    .join(';');
  
  const hashedPayload = crypto.createHash('sha256').update(payloadString).digest('hex');
  
  const canonicalRequest = [
    'POST',
    AWS_CONFIG.uri,
    '',
    canonicalHeaders,
    signedHeaders,
    hashedPayload
  ].join('\n');
  
  console.log('📝 Canonical Request:', canonicalRequest);

  // Create string to sign
  const credentialScope = `${dateString}/${region}/${service}/aws4_request`;
  const stringToSign = [
    algorithm,
    timeString,
    credentialScope,
    crypto.createHash('sha256').update(canonicalRequest).digest('hex')
  ].join('\n');
  
  console.log('📋 String to Sign:', stringToSign);

  // Calculate signature
  const kDate = crypto.createHmac('sha256', `AWS4${secretKey}`).update(dateString).digest();
  const kRegion = crypto.createHmac('sha256', kDate).update(region).digest();
  const kService = crypto.createHmac('sha256', kRegion).update(service).digest();
  const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');
  
  const authorization = `${algorithm} Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  
  console.log('🔐 Authorization:', authorization.substring(0, 80) + '...');

  headers['Authorization'] = authorization;
  headers['X-Amz-Date'] = timeString;

  return new Promise((resolve, reject) => {
    console.log('🌐 Making request to Amazon API...');
    
    const options = {
      hostname: AWS_CONFIG.host,
      path: AWS_CONFIG.uri,
      method: 'POST',
      headers: headers
    };

    const req = https.request(options, (res) => {
      console.log('📡 Response Status:', res.statusCode);
      console.log('📡 Response Headers:', res.headers);
      
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log('📥 Raw Response:', data);
        
        try {
          const response = JSON.parse(data);
          console.log('📊 Parsed Response:', JSON.stringify(response, null, 2));
          
          if (response.Errors) {
            console.error('❌ API Errors:', response.Errors);
            reject(new Error(`Amazon API Error: ${response.Errors[0].Message}`));
          } else if (response.SearchResult && response.SearchResult.Items) {
            console.log('✅ Found items:', response.SearchResult.Items.length);
            resolve(response);
          } else {
            console.log('ℹ️  No items found in response');
            resolve(response);
          }
        } catch (error) {
          console.error('❌ JSON Parse Error:', error.message);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request Error:', error.message);
      reject(error);
    });

    req.write(payloadString);
    req.end();
  });
}

// Run the test
async function main() {
  try {
    console.log('🧪 Starting Amazon API Debug Test...\n');
    await testSingleSearch();
    console.log('\n✅ Debug test completed!');
  } catch (error) {
    console.error('\n❌ Debug test failed:', error.message);
  }
}

main();