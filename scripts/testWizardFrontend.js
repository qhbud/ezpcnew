const puppeteer = require('puppeteer');

// Test configurations
function generateTestCases() {
    return [
        { budget: 1000, performance: 'gaming', storage: 500, includeMonitor: false },
        { budget: 1200, performance: 'productivity', storage: 1000, includeMonitor: false },
        { budget: 1500, performance: 'content-creation', storage: 1000, includeMonitor: false },
        { budget: 1800, performance: 'gaming', storage: 1500, includeMonitor: true },
        { budget: 2000, performance: 'high-end', storage: 2000, includeMonitor: false },
        { budget: 2500, performance: 'enthusiast', storage: 2000, includeMonitor: true },
        { budget: 3000, performance: 'gaming', storage: 2000, includeMonitor: false },
        { budget: 1100, performance: 'productivity', storage: 750, includeMonitor: false },
        { budget: 1400, performance: 'content-creation', storage: 1500, includeMonitor: false },
        { budget: 1700, performance: 'gaming', storage: 1000, includeMonitor: true },
        { budget: 2200, performance: 'high-end', storage: 2000, includeMonitor: false },
        { budget: 1300, performance: 'gaming', storage: 500, includeMonitor: false },
        { budget: 1600, performance: 'productivity', storage: 1000, includeMonitor: false },
        { budget: 1900, performance: 'content-creation', storage: 1500, includeMonitor: true },
        { budget: 2400, performance: 'enthusiast', storage: 2000, includeMonitor: false },
    ];
}

async function testWizardBuild(page, testCase, testNumber, totalTests) {
    try {
        console.log(`\n[${testNumber}/${totalTests}] Testing: $${testCase.budget} ${testCase.performance} ${testCase.storage}GB`);

        // Navigate to homepage
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 30000 });

        // Click "Build Your PC" button to open wizard
        await page.waitForSelector('button[onclick="openBudgetModal()"]', { timeout: 5000 });
        await page.click('button[onclick="openBudgetModal()"]');

        // Wait for wizard modal to appear
        await page.waitForSelector('.budget-modal', { visible: true, timeout: 5000 });

        // Question 1: Budget
        if (testCase.budget <= 5000) {
            await page.waitForSelector('input#budgetInput', { timeout: 5000 });
            await page.click('input#budgetInput', { clickCount: 3 }); // Select all
            await page.type('input#budgetInput', testCase.budget.toString());
        } else {
            await page.waitForSelector('input#unlimitedCheckbox', { timeout: 5000 });
            await page.click('input#unlimitedCheckbox');
        }
        await page.click('button.budget-next-btn[onclick="nextQuestion()"]');

        // Question 2: Performance Type
        await page.waitForSelector('.question-content', { timeout: 5000 });
        await page.waitForFunction(
            () => document.querySelector('.question-content h2')?.textContent.includes('What will you use your PC for?'),
            { timeout: 5000 }
        );

        const performanceButtonSelector = `button.performance-btn[data-performance="${testCase.performance}"]`;
        await page.waitForSelector(performanceButtonSelector, { timeout: 5000 });
        await page.click(performanceButtonSelector);
        await page.click('button.budget-next-btn[onclick="nextQuestion()"]');

        // Question 3: Storage
        await page.waitForFunction(
            () => document.querySelector('.question-content h2')?.textContent.includes('How much storage'),
            { timeout: 5000 }
        );

        const storageButtonSelector = `button.storage-btn[data-storage="${testCase.storage}"]`;
        await page.waitForSelector(storageButtonSelector, { timeout: 5000 });
        await page.click(storageButtonSelector);
        await page.click('button.budget-next-btn[onclick="nextQuestion()"]');

        // Question 4: Monitor
        await page.waitForFunction(
            () => document.querySelector('.question-content h2')?.textContent.includes('Do you need a monitor'),
            { timeout: 5000 }
        );

        const monitorButtonSelector = testCase.includeMonitor
            ? 'button.monitor-btn[data-monitor="yes"]'
            : 'button.monitor-btn[data-monitor="no"]';
        await page.waitForSelector(monitorButtonSelector, { timeout: 5000 });
        await page.click(monitorButtonSelector);

        // Click "Generate My Build" button
        const generateButton = 'button.budget-next-btn[onclick="submitBudget()"]';
        await page.waitForSelector(generateButton, { timeout: 5000 });
        await page.click(generateButton);

        // Wait for build to be generated (loading state)
        await page.waitForSelector('#buildLoadingState', { visible: true, timeout: 5000 });

        // Wait for build results to appear (up to 30 seconds for slow builds)
        await page.waitForSelector('#buildResultsContent', { visible: true, timeout: 30000 });

        // Click "Accept Build" button
        await page.waitForSelector('button[onclick="acceptBuild()"]', { timeout: 5000 });
        await page.click('button[onclick="acceptBuild()"]');

        // Wait for modal to close and build to be loaded into the main builder
        await page.waitForFunction(
            () => document.getElementById('buildResultsModal')?.style.display === 'none',
            { timeout: 5000 }
        );

        // Small delay for compatibility check to run
        await page.waitForTimeout(1000);

        // Check the compatibility results section
        const compatibilityMessage = await page.evaluate(() => {
            const resultsDiv = document.getElementById('compatibilityResults');
            if (!resultsDiv) return 'COMPATIBILITY_DIV_NOT_FOUND';

            const messageEl = resultsDiv.querySelector('.compatibility-message.success');
            if (messageEl && messageEl.textContent.includes('No compatibility issues detected')) {
                return 'PASSED';
            }

            // Check if there are issues
            const issuesDiv = resultsDiv.querySelector('.compatibility-issues');
            if (issuesDiv) {
                const issues = Array.from(issuesDiv.querySelectorAll('.compatibility-issue'))
                    .map(el => el.textContent.trim());
                return issues.join(' | ');
            }

            return resultsDiv.textContent.trim() || 'EMPTY_RESULTS';
        });

        // Check if the build has all components loaded
        const componentCheck = await page.evaluate(() => {
            const partsDatabase = window.partsDatabase;
            if (!partsDatabase || !partsDatabase.currentBuild) {
                return { hasComponents: false, components: [] };
            }

            const build = partsDatabase.currentBuild;
            const components = ['cpu', 'gpu', 'motherboard', 'ram', 'storage', 'psu', 'cooler', 'case'];
            const loadedComponents = components.filter(c => build[c] !== null);

            return {
                hasComponents: loadedComponents.length >= 8,
                components: loadedComponents,
                count: loadedComponents.length
            };
        });

        if (compatibilityMessage === 'PASSED' && componentCheck.hasComponents) {
            console.log(`   ✅ PASSED - Frontend shows: "✅ No compatibility issues detected"`);
            console.log(`      Components loaded: ${componentCheck.count}/8`);
            return { passed: true, testCase, message: compatibilityMessage };
        } else {
            console.log(`   ❌ FAILED`);
            if (compatibilityMessage !== 'PASSED') {
                console.log(`      Frontend message: ${compatibilityMessage}`);
            }
            if (!componentCheck.hasComponents) {
                console.log(`      Components loaded: ${componentCheck.count}/8 (expected 8)`);
                console.log(`      Loaded: ${componentCheck.components.join(', ')}`);
            }
            return { passed: false, testCase, message: compatibilityMessage };
        }

    } catch (error) {
        console.log(`   ❌ FAILED - Error: ${error.message}`);
        return { passed: false, testCase, message: `Error: ${error.message}` };
    }
}

async function runTests() {
    console.log('🧪 PC Builder Wizard - FRONTEND COMPATIBILITY TEST');
    console.log('================================================================================\n');
    console.log('📋 Testing actual frontend compatibility checker...');
    console.log('⚠️  This test validates what users actually see in the browser\n');
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

        // Enable console logging from the page
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log(`   🔴 Browser Error: ${msg.text()}`);
            }
        });

        const startTime = Date.now();

        for (let i = 0; i < testCases.length; i++) {
            const result = await testWizardBuild(page, testCases[i], i + 1, testCases.length);
            results.push(result);

            // Small delay between tests
            await page.waitForTimeout(500);
        }

        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(1);

        // Summary
        const passedTests = results.filter(r => r.passed).length;
        const failedTests = results.filter(r => !r.passed).length;
        const successRate = ((passedTests / results.length) * 100).toFixed(1);

        console.log('\n================================================================================');
        console.log('📊 Frontend Test Results Summary');
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
                console.log(`${index + 1}. $${result.testCase.budget} ${result.testCase.performance} ${result.testCase.storage}GB`);
                console.log(`   Frontend showed: ${result.message}`);
                console.log('');
            });

            console.log('================================================================================');
            console.log('⚠️  Some tests failed. The frontend is showing compatibility issues.');
            console.log('================================================================================\n');

            await browser.close();
            process.exit(1);
        } else {
            console.log('\n================================================================================');
            console.log('🎉 All frontend tests passed!');
            console.log('✅ Users see: "No compatibility issues detected" for all builds');
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
