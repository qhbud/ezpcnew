const puppeteer = require('puppeteer');
const fetch = require('node-fetch');

// Test configurations
function generateTestCases() {
    return [
        { budget: 1000, performance: 'gaming', storage: 500, includeMonitor: false, name: '$1000 Gaming' },
        { budget: 1200, performance: 'productivity', storage: 1000, includeMonitor: false, name: '$1200 Productivity' },
        { budget: 1500, performance: 'content-creation', storage: 1000, includeMonitor: false, name: '$1500 Content Creation' },
        { budget: 1800, performance: 'gaming', storage: 1500, includeMonitor: true, name: '$1800 Gaming +Monitor' },
        { budget: 2000, performance: 'high-end', storage: 2000, includeMonitor: false, name: '$2000 High-End' },
        { budget: 2500, performance: 'enthusiast', storage: 2000, includeMonitor: true, name: '$2500 Enthusiast +Monitor' },
        { budget: 3000, performance: 'gaming', storage: 2000, includeMonitor: false, name: '$3000 Gaming' },
        { budget: 1100, performance: 'productivity', storage: 750, includeMonitor: false, name: '$1100 Productivity' },
        { budget: 1400, performance: 'content-creation', storage: 1500, includeMonitor: false, name: '$1400 Content Creation' },
        { budget: 1700, performance: 'gaming', storage: 1000, includeMonitor: true, name: '$1700 Gaming +Monitor' },
        { budget: 2200, performance: 'high-end', storage: 2000, includeMonitor: false, name: '$2200 High-End' },
        { budget: 1300, performance: 'gaming', storage: 500, includeMonitor: false, name: '$1300 Gaming' },
        { budget: 1600, performance: 'productivity', storage: 1000, includeMonitor: false, name: '$1600 Productivity' },
        { budget: 1900, performance: 'content-creation', storage: 1500, includeMonitor: true, name: '$1900 Content Creation +Monitor' },
        { budget: 2400, performance: 'enthusiast', storage: 2000, includeMonitor: false, name: '$2400 Enthusiast' },
    ];
}

async function generateBuildViaAPI(testCase) {
    const response = await fetch('http://localhost:3000/api/ai-build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            budget: testCase.budget,
            performance: testCase.performance,
            storage: testCase.storage,
            includeMonitor: testCase.includeMonitor
        })
    });

    if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
        throw new Error(data.error || 'Build generation failed');
    }

    return data.build;
}

async function testBuildCompatibility(page, testCase, testNumber, totalTests) {
    try {
        console.log(`\n[${testNumber}/${totalTests}] Testing: ${testCase.name}`);

        // Step 1: Generate build via API
        console.log(`   → Generating build via API...`);
        const build = await generateBuildViaAPI(testCase);

        // Step 2: Load the build into the frontend
        console.log(`   → Loading build into frontend...`);
        const loadResult = await page.evaluate((buildData) => {
            try {
                const db = window.partsDatabase;
                if (!db) return { success: false, error: 'PartsDatabase not initialized' };

                // Clear existing build
                db.currentBuild = {
                    gpu: null,
                    cpu: null,
                    motherboard: null,
                    ram: null,
                    storage: null,
                    psu: null,
                    cooler: null,
                    case: null,
                    addon: null,
                    addon2: null,
                    addon3: null,
                    addon4: null
                };

                // Load components
                const components = ['cpu', 'gpu', 'motherboard', 'ram', 'storage', 'psu', 'cooler', 'case', 'monitor'];
                let loadedCount = 0;

                for (const componentType of components) {
                    if (buildData[componentType]) {
                        const component = buildData[componentType];

                        // Handle storage array
                        if (componentType === 'storage' && Array.isArray(component)) {
                            db.currentBuild.storage = component[0];
                            loadedCount++;
                        }
                        // Handle monitor
                        else if (componentType === 'monitor') {
                            db.currentBuild.addon = component;
                            loadedCount++;
                        }
                        // Regular components
                        else {
                            db.currentBuild[componentType] = component;
                            loadedCount++;
                        }
                    }
                }

                // Trigger compatibility check
                db.checkCompatibility();

                return { success: true, loadedCount };
            } catch (error) {
                return { success: false, error: error.message };
            }
        }, build);

        if (!loadResult.success) {
            throw new Error(`Failed to load build: ${loadResult.error}`);
        }

        console.log(`   → Components loaded: ${loadResult.loadedCount}`);

        // Step 3: Wait for compatibility check to complete
        await page.waitForTimeout(500);

        // Step 4: Check the compatibility message
        const compatibilityCheck = await page.evaluate(() => {
            const resultsDiv = document.getElementById('compatibilityResults');
            if (!resultsDiv) {
                return { found: false, message: 'Compatibility div not found' };
            }

            const successMessage = resultsDiv.querySelector('.compatibility-message.success');
            if (successMessage && successMessage.textContent.includes('No compatibility issues detected')) {
                return { found: true, passed: true, message: successMessage.textContent.trim() };
            }

            const issuesDiv = resultsDiv.querySelector('.compatibility-issues');
            if (issuesDiv) {
                const issues = Array.from(issuesDiv.querySelectorAll('.compatibility-issue'))
                    .map(el => el.textContent.trim());
                return { found: true, passed: false, issues };
            }

            return { found: true, passed: false, message: resultsDiv.textContent.trim() };
        });

        if (!compatibilityCheck.found) {
            console.log(`   ❌ FAILED - ${compatibilityCheck.message}`);
            return { passed: false, testCase, error: compatibilityCheck.message };
        }

        if (compatibilityCheck.passed) {
            console.log(`   ✅ PASSED - Frontend shows: "✅ No compatibility issues detected"`);
            return { passed: true, testCase, message: compatibilityCheck.message };
        } else {
            console.log(`   ❌ FAILED - Compatibility issues found:`);
            if (compatibilityCheck.issues) {
                compatibilityCheck.issues.forEach(issue => {
                    console.log(`      ${issue}`);
                });
            } else {
                console.log(`      ${compatibilityCheck.message}`);
            }
            return { passed: false, testCase, issues: compatibilityCheck.issues || [compatibilityCheck.message] };
        }

    } catch (error) {
        console.log(`   ❌ FAILED - Error: ${error.message}`);
        return { passed: false, testCase, error: error.message };
    }
}

async function runTests() {
    console.log('🧪 PC Builder Wizard - FRONTEND COMPATIBILITY VALIDATION');
    console.log('================================================================================\n');
    console.log('📋 Testing frontend compatibility checker with wizard builds...');
    console.log('✅ This validates what users see: "No compatibility issues detected"\n');
    console.log('🌐 Starting headless browser...\n');

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const testCases = generateTestCases();
    const results = [];

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });

        // Navigate to the main page and wait for it to load
        console.log('📄 Loading PC builder page...\n');
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 30000 });

        // Wait for PartsDatabase to initialize
        await page.waitForFunction(() => window.partsDatabase !== undefined, { timeout: 10000 });

        const startTime = Date.now();

        for (let i = 0; i < testCases.length; i++) {
            const result = await testBuildCompatibility(page, testCases[i], i + 1, testCases.length);
            results.push(result);

            // Small delay between tests
            await page.waitForTimeout(300);
        }

        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(1);

        // Summary
        const passedTests = results.filter(r => r.passed).length;
        const failedTests = results.filter(r => !r.passed).length;
        const successRate = ((passedTests / results.length) * 100).toFixed(1);

        console.log('\n================================================================================');
        console.log('📊 Frontend Compatibility Test Results');
        console.log('================================================================================');
        console.log(`✅ Passed: ${passedTests}/${results.length} (${successRate}%)`);
        console.log(`❌ Failed: ${failedTests}/${results.length}`);
        console.log(`⏱️  Total execution time: ${duration}s`);
        console.log(`📈 Average time per test: ${(duration / results.length).toFixed(2)}s`);

        if (failedTests > 0) {
            console.log('\n================================================================================');
            console.log('❌ Failed Test Details:');
            console.log('================================================================================\n');

            results.filter(r => !r.passed).forEach((result, index) => {
                console.log(`${index + 1}. ${result.testCase.name}`);
                if (result.issues) {
                    console.log(`   Issues:`);
                    result.issues.forEach(issue => console.log(`      ${issue}`));
                } else if (result.error) {
                    console.log(`   Error: ${result.error}`);
                }
                console.log('');
            });

            console.log('================================================================================');
            console.log('⚠️  Some builds show compatibility issues in the frontend.');
            console.log('================================================================================\n');

            await browser.close();
            process.exit(1);
        } else {
            console.log('\n================================================================================');
            console.log('🎉 All frontend tests passed!');
            console.log('✅ Frontend displays: "No compatibility issues detected" for all wizard builds');
            console.log('================================================================================\n');

            await browser.close();
            process.exit(0);
        }

    } catch (error) {
        console.error('\n❌ Test suite error:', error);
        await browser.close();
        process.exit(1);
    }
}

runTests();
