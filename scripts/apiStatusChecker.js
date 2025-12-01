const { AmazonGpuImporter } = require('./amazonGpuImporter');
require('dotenv').config();

/**
 * Amazon PAAPI5 Status Checker
 * 
 * This script helps determine when your Amazon API access is working
 * by testing with minimal requests and providing detailed diagnostics.
 */

class ApiStatusChecker {
  constructor() {
    this.importer = new AmazonGpuImporter();
  }

  async checkCredentials() {
    console.log('🔐 Checking API Credentials...');
    
    const credentials = {
      accessKey: process.env.AMAZON_ACCESS_KEY_ID,
      secretKey: process.env.AMAZON_SECRET_ACCESS_KEY,
      associateTag: process.env.AMAZON_ASSOCIATE_TAG,
      region: process.env.AMAZON_REGION
    };

    const issues = [];
    
    if (!credentials.accessKey) issues.push('Missing AMAZON_ACCESS_KEY_ID');
    if (!credentials.secretKey) issues.push('Missing AMAZON_SECRET_ACCESS_KEY');  
    if (!credentials.associateTag) issues.push('Missing AMAZON_ASSOCIATE_TAG');

    if (issues.length > 0) {
      console.log('❌ Credential Issues:');
      issues.forEach(issue => console.log(`   - ${issue}`));
      return false;
    }

    console.log('✅ All credentials present');
    console.log(`   Access Key: ${credentials.accessKey.substring(0, 8)}...`);
    console.log(`   Associate Tag: ${credentials.associateTag}`);
    console.log(`   Region: ${credentials.region || 'us-east-1'}`);
    
    return true;
  }

  async testApiAccess() {
    console.log('\n🧪 Testing API Access...');
    console.log('📝 Making minimal test request...');

    try {
      // Use a very simple search that should always return results
      const testChipset = 'RTX 3080';
      const testInfo = {
        searchTerms: ['graphics card'],  // Generic term
        manufacturer: 'NVIDIA',
        architecture: 'Ampere',
        memorySize: 10,
        memoryType: 'GDDR6X'
      };

      const result = await this.importer.searchGpusByChipset(testChipset, testInfo);
      
      console.log('✅ API Access Working!');
      console.log(`📊 Test returned ${result.length} items`);
      
      if (result.length > 0) {
        console.log('📋 Sample result:');
        console.log(`   Name: ${result[0].name}`);
        console.log(`   Price: $${result[0].price}`);
      }

      return {
        status: 'working',
        itemCount: result.length,
        message: 'API access is fully functional'
      };

    } catch (error) {
      return this.analyzeError(error);
    }
  }

  analyzeError(error) {
    console.log('❌ API Test Failed');
    console.log(`🔥 Error: ${error.message}\n`);

    if (error.message.includes('TooManyRequests') || error.message.includes('request throttling')) {
      console.log('📊 DIAGNOSIS: Rate Limited');
      console.log('🔍 This means your credentials work, but you hit limits');
      console.log('\n🕐 Possible reasons:');
      console.log('   1. Made requests too recently (wait 1-5 minutes)');
      console.log('   2. New account restrictions (wait 24-72 hours)'); 
      console.log('   3. No sales history (need affiliate sales)');
      console.log('   4. Daily limit exceeded (wait until tomorrow)');
      
      return {
        status: 'rate_limited',
        credentialsWork: true,
        message: 'Rate limited - credentials are valid',
        nextCheck: 'Try again in 1-2 hours'
      };

    } else if (error.message.includes('InvalidSignature') || error.message.includes('SignatureDoesNotMatch')) {
      console.log('📊 DIAGNOSIS: Authentication Error');
      console.log('🔍 Your credentials are incorrect or invalid');
      console.log('\n🛠️  Solutions:');
      console.log('   1. Check your .env file for typos');
      console.log('   2. Regenerate API keys in Associates Central');
      console.log('   3. Verify Associate Tag is correct');

      return {
        status: 'auth_error',
        credentialsWork: false,
        message: 'Invalid credentials',
        nextCheck: 'Fix credentials and try again'
      };

    } else if (error.message.includes('InvalidAssociate')) {
      console.log('📊 DIAGNOSIS: Associate Account Issue');
      console.log('🔍 Your Associate account has problems');
      console.log('\n🛠️  Solutions:');
      console.log('   1. Check if Associates account is approved');
      console.log('   2. Verify account is in good standing');
      console.log('   3. Check if account was suspended');

      return {
        status: 'account_issue',
        credentialsWork: false,
        message: 'Associate account issue',
        nextCheck: 'Check Amazon Associates Central'
      };

    } else if (error.message.includes('RequestExpired')) {
      console.log('📊 DIAGNOSIS: Time Sync Issue');
      console.log('🔍 Your system clock might be wrong');
      console.log('\n🛠️  Solution:');
      console.log('   1. Check your computer\'s date/time');
      console.log('   2. Sync with internet time');

      return {
        status: 'time_sync',
        credentialsWork: true,
        message: 'System time sync issue',
        nextCheck: 'Fix system time and try again'
      };

    } else {
      console.log('📊 DIAGNOSIS: Unknown Error');
      console.log('🔍 Unexpected API response');
      console.log('\n🛠️  Next steps:');
      console.log('   1. Check Amazon API status');
      console.log('   2. Review full error details');
      console.log('   3. Contact Amazon support if needed');

      return {
        status: 'unknown_error',
        credentialsWork: false,
        message: error.message,
        nextCheck: 'Investigate error details'
      };
    }
  }

  async runFullCheck() {
    console.log('🚀 Amazon PAAPI5 Status Check');
    console.log('============================\n');

    // Step 1: Check credentials
    const credentialsOk = await this.checkCredentials();
    if (!credentialsOk) {
      return { status: 'setup_incomplete', message: 'Fix credentials first' };
    }

    // Step 2: Test API access
    const apiResult = await this.testApiAccess();

    // Step 3: Provide recommendations
    console.log('\n🎯 RECOMMENDATIONS:');
    console.log('==================');

    switch (apiResult.status) {
      case 'working':
        console.log('✅ READY: You can now import GPUs!');
        console.log('🚀 Run: npm run import-gpus-slow');
        break;

      case 'rate_limited':
        console.log('⏰ WAIT: Come back later');
        console.log('🕐 Next check: ' + apiResult.nextCheck);
        console.log('📱 Set a reminder to check again');
        break;

      case 'auth_error':
        console.log('🔧 FIX CREDENTIALS: Check your .env file');
        console.log('🔑 Get new keys from Amazon Associates');
        break;

      case 'account_issue':
        console.log('🏢 CHECK ACCOUNT: Visit Amazon Associates Central');
        console.log('📋 Ensure account is approved and active');
        break;

      default:
        console.log('🤔 INVESTIGATE: Review error details above');
        console.log('📞 May need Amazon support help');
    }

    console.log('\n📊 Status Summary:');
    console.log(`   Status: ${apiResult.status}`);
    console.log(`   Message: ${apiResult.message}`);
    if (apiResult.nextCheck) {
      console.log(`   Next Check: ${apiResult.nextCheck}`);
    }

    return apiResult;
  }
}

// Auto-check mode with intervals
async function autoCheck() {
  const checker = new ApiStatusChecker();
  const checkInterval = 30 * 60 * 1000; // 30 minutes

  console.log('🤖 Auto-Check Mode: Will check every 30 minutes');
  console.log('⏹️  Press Ctrl+C to stop\n');

  while (true) {
    const timestamp = new Date().toLocaleString();
    console.log(`\n⏰ ${timestamp} - Running API status check...`);
    
    const result = await checker.runFullCheck();
    
    if (result.status === 'working') {
      console.log('\n🎉 API IS WORKING! Auto-check stopping.');
      console.log('✅ You can now run GPU imports!');
      break;
    }
    
    console.log(`\n😴 Sleeping for 30 minutes... (Next check at ${new Date(Date.now() + checkInterval).toLocaleString()})`);
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
}

// Main function
async function main() {
  const mode = process.argv[2];
  const checker = new ApiStatusChecker();

  try {
    if (mode === 'auto') {
      await autoCheck();
    } else {
      await checker.runFullCheck();
    }
  } catch (error) {
    console.error('\n💥 Status check failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { ApiStatusChecker };