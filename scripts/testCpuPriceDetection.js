const { connectToDatabase, getDatabase } = require('../config/database');
const { RiverSearchPriceDetector } = require('./riverSearchPriceDetection');
const colors = require('colors');

async function testPriceDetection() {
    try {
        console.log('🧪 Testing CPU Price Detection Fix\n'.cyan.bold);

        await connectToDatabase();
        const db = getDatabase();

        const priceDetector = new RiverSearchPriceDetector();
        await priceDetector.initialize();

        // Test URLs that were problematic
        const testCases = [
            {
                name: 'AMD Ryzen 9 7950X3D',
                url: 'https://www.amazon.com/AMD-Ryzen-7950X3D-Hexadeca-core-Processor/dp/B0BTRH9MNS/ref=sr_1_1?dib=eyJ2IjoiMSJ9.CMuTv9wFtIvxDKEq7rU7wn_uBwV8aCQv_4fDzTbre6CTzWdqVzUUqlF-bEo_JSZX0HljZocEj8Frifsd8P98R6KTj7uQIKFhKpvH39Qpw0Co3WJcCBksKCvfygyeIqPPEwHlQo7pBWybG0Fgv7VcxoTnh6y5deIhU0lST2RIwVi4G9AIAxzHsCN_5k6m59WoW0iE8hoPqBu7DWGo56u0eDVGwwjqGFVsznL9uUEpy2A.gbOYb7QIoc18SAsITLYNex2ddo2n1_4saxRBRl_mQZ0&dib_tag=se&keywords=AMD+Ryzen+9+7950X3D+Desktop+Processor&qid=1760939235&sr=8-1',
                expectedPrice: 689.99,
                expectedSale: false
            },
            {
                name: 'Intel Core i9-13900KF',
                url: 'https://www.amazon.com/Intel-i9-13900KF-Desktop-Processor-P-cores/dp/B0BCFM3CJ4/ref=sr_1_1?dib=eyJ2IjoiMSJ9.6w261VStMWxAEg0ZMx_DLi2Lgwnr7iigKtebBxRl2UjsM6im62EeLXitfjuF_lssxTLSp7viEVufJRK2ZS1GuG8KuekCrd_y5TcF8WK-3d_bGLYmgwncLKRFyoRESSoNDYf6NA7PEbsIK9rKokbEMPaNihqyKhlpM-b8Idm1FEmlvVtW___JmCFFFt0HweECg7GruE_6lqRmCkNNTgjKXzy1jyIajFn2KkYTBYW6cEs.66VoThfsaul3hS9ToX1oxpZz08AvvFqOH_k51sJW9UA&dib_tag=se&keywords=Intel+Core+i9-13900KF+Desktop+Processor&qid=1760939163&sr=8-1',
                expectedPrice: 550,
                expectedSale: true,
                expectedBasePrice: 599
            }
        ];

        for (const testCase of testCases) {
            console.log(`\n${'='.repeat(60)}`.cyan);
            console.log(`Testing: ${testCase.name}`.cyan.bold);
            console.log(`${'='.repeat(60)}`.cyan);

            const result = await priceDetector.detectPrice(testCase.url);

            console.log('\nResult:'.yellow);
            console.log(`  Current Price: $${result.currentPrice}`.white);
            console.log(`  Base Price: $${result.basePrice}`.white);
            console.log(`  Sale Price: $${result.salePrice || 'N/A'}`.white);
            console.log(`  Is On Sale: ${result.isOnSale ? 'Yes'.green : 'No'.gray}`.white);

            if (result.debugInfo && result.debugInfo.length > 0) {
                console.log(`\nDebug Info:`.gray);
                result.debugInfo.forEach(info => console.log(`  - ${info}`.gray));
            }

            console.log('\nExpected:'.yellow);
            console.log(`  Current Price: $${testCase.expectedPrice}`.white);
            console.log(`  Is On Sale: ${testCase.expectedSale ? 'Yes' : 'No'}`.white);
            if (testCase.expectedBasePrice) {
                console.log(`  Base Price: $${testCase.expectedBasePrice}`.white);
            }

            // Verify results
            const priceMatch = Math.abs(result.currentPrice - testCase.expectedPrice) < 1;
            const saleMatch = result.isOnSale === testCase.expectedSale;
            const basePriceMatch = !testCase.expectedBasePrice || Math.abs(result.basePrice - testCase.expectedBasePrice) < 1;

            console.log('\nTest Result:'.yellow);
            if (priceMatch && saleMatch && basePriceMatch) {
                console.log('  ✅ PASSED - All checks passed!'.green.bold);
            } else {
                console.log('  ❌ FAILED'.red.bold);
                if (!priceMatch) console.log(`    - Price mismatch: got $${result.currentPrice}, expected $${testCase.expectedPrice}`.red);
                if (!saleMatch) console.log(`    - Sale status mismatch: got ${result.isOnSale}, expected ${testCase.expectedSale}`.red);
                if (!basePriceMatch) console.log(`    - Base price mismatch: got $${result.basePrice}, expected $${testCase.expectedBasePrice}`.red);
            }

            // Delay between tests
            if (testCases.indexOf(testCase) < testCases.length - 1) {
                console.log('\n⏳ Waiting 5 seconds before next test...'.gray);
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }

        console.log(`\n${'='.repeat(60)}`.cyan);
        console.log('🎉 Testing Complete!'.green.bold);
        console.log(`${'='.repeat(60)}`.cyan);

        await priceDetector.close();
        process.exit(0);

    } catch (error) {
        console.error('❌ Test failed:'.red, error);
        process.exit(1);
    }
}

testPriceDetection();
