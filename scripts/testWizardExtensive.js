const { connectToDatabase, getDatabase } = require('../config/database');
const fetch = require('node-fetch');

// Generate extensive test configurations (50+ tests)
function generateTestCases() {
    const testCases = [];

    // Budget ranges: Low, Mid, High, Ultra
    const budgets = [
        1000, 1100, 1200, 1300, 1400, 1500,  // Budget builds
        1600, 1700, 1800, 1900, 2000, 2200,  // Mid-range builds
        2400, 2600, 2800, 3000, 3500,        // High-end builds
        4000, 4500, 5000, 6000, 7000         // Ultra/Unlimited builds
    ];

    // All performance types
    const performances = ['gaming', 'productivity', 'content-creation', 'high-end', 'enthusiast'];

    // Storage configurations
    const storages = [500, 750, 1000, 1500, 2000, 3000, 4000];

    // Monitor options
    const monitorOptions = [false, true];

    let testNumber = 1;

    // Generate systematic tests
    for (const budget of budgets) {
        for (const performance of performances) {
            // Limit storage options based on budget
            let validStorages = storages;
            if (budget < 1500) {
                validStorages = storages.filter(s => s <= 1000);
            } else if (budget < 2500) {
                validStorages = storages.filter(s => s <= 2000);
            }

            const storage = validStorages[(testNumber - 1) % validStorages.length];
            const includeMonitor = monitorOptions[testNumber % 2];

            testCases.push({
                budget,
                performance,
                storage,
                includeMonitor,
                name: `Test ${testNumber}: $${budget} ${performance} ${storage}GB ${includeMonitor ? '+Monitor' : ''}`
            });

            testNumber++;

            // Stop at 60 tests
            if (testNumber > 60) break;
        }
        if (testNumber > 60) break;
    }

    return testCases;
}

// Enhanced compatibility check function
function checkBuildCompatibility(build) {
    const issues = [];
    const warnings = [];
    const { cpu, motherboard, ram, cooler, psu, gpu, case: pcCase, storage, monitor } = build;

    // 1. Check CPU and Motherboard socket compatibility
    if (cpu && motherboard) {
        const cpuSocket = (cpu.socket || cpu.socketType || '').toString().trim().toUpperCase();
        const motherboardSocket = (motherboard.socket || motherboard.socketType || '').toString().trim().toUpperCase();

        if (cpuSocket !== motherboardSocket) {
            issues.push(`❌ CPU Socket Mismatch: CPU has ${cpuSocket}, Motherboard has ${motherboardSocket}`);
        }
    }

    // 2. Check RAM and Motherboard memory type compatibility
    if (ram && motherboard) {
        const ramType = (ram.memoryType || '').toString().trim().toUpperCase();
        const motherboardMemoryTypes = motherboard.memoryType || [];
        const memoryTypesArray = Array.isArray(motherboardMemoryTypes) ? motherboardMemoryTypes : [motherboardMemoryTypes];

        const isCompatible = memoryTypesArray.some(mbType => {
            const normalizedMbType = mbType.toString().trim().toUpperCase();
            return ramType.includes(normalizedMbType) || normalizedMbType.includes(ramType);
        });

        if (!isCompatible) {
            const mbTypesStr = memoryTypesArray.join('/');
            issues.push(`❌ RAM Incompatible: RAM is ${ram.memoryType}, Motherboard supports ${mbTypesStr}`);
        }
    }

    // 3. Check Cooler and CPU socket compatibility
    if (cooler && cpu) {
        const cpuSocket = (cpu.socket || cpu.socketType || '').toString().trim().toUpperCase().replace(/\s+/g, '').replace('STRX', 'TR');
        const coolerSockets = cooler.socketCompatibility || [];

        if (coolerSockets.length > 0) {
            const isCompatible = coolerSockets.some(coolerSocket => {
                const normalizedCoolerSocket = coolerSocket.toString().trim().toUpperCase().replace(/\s+/g, '').replace('STRX', 'TR');

                if (cpuSocket === normalizedCoolerSocket) return true;

                // Handle LGA115x wildcard
                if (normalizedCoolerSocket === 'LGA115X' &&
                    (cpuSocket === 'LGA1150' || cpuSocket === 'LGA1151' || cpuSocket === 'LGA1155' || cpuSocket === 'LGA1156')) {
                    return true;
                }

                return false;
            });

            if (!isCompatible) {
                const coolerSocketsDisplay = coolerSockets.join(', ');
                issues.push(`❌ Cooler Incompatible: Cooler supports ${coolerSocketsDisplay}, CPU has ${cpu.socket || cpu.socketType}`);
            }
        }
    }

    // 4. Check Motherboard and Case form factor compatibility
    if (motherboard && pcCase) {
        const caseFormFactors = pcCase.formFactor || [];
        const caseFormFactorArray = Array.isArray(caseFormFactors) ? caseFormFactors : [caseFormFactors];
        const motherboardFormFactor = motherboard.formFactor || '';

        if (motherboardFormFactor && caseFormFactorArray.length > 0) {
            let caseCompatible = false;
            const moboFFUpper = motherboardFormFactor.toUpperCase().replace(/-/g, '').replace(/\s+/g, '').trim();

            const isMoboITX = moboFFUpper.includes('ITX') && !moboFFUpper.includes('ATX');
            const isMoboMicroATX = moboFFUpper.includes('MATX') || moboFFUpper.includes('MICROATX');
            const isMoboEATX = moboFFUpper.includes('EATX');
            const isMoboATX = !isMoboITX && !isMoboMicroATX && !isMoboEATX && moboFFUpper.includes('ATX');

            for (const caseFF of caseFormFactorArray) {
                const caseFFUpper = caseFF.toUpperCase().replace(/-/g, '').replace(/\s+/g, '').trim();

                const isCaseITX = caseFFUpper.includes('ITX') && !caseFFUpper.includes('ATX');
                const isCaseMicroATX = caseFFUpper.includes('MATX') || caseFFUpper.includes('MICROATX');
                const isCaseEATX = caseFFUpper.includes('EATX');
                const isCaseATX = !isCaseITX && !isCaseMicroATX && !isCaseEATX && caseFFUpper.includes('ATX');

                if (isCaseEATX) {
                    caseCompatible = true;
                    break;
                } else if (isCaseATX && (isMoboATX || isMoboMicroATX || isMoboITX)) {
                    caseCompatible = true;
                    break;
                } else if (isCaseMicroATX && (isMoboMicroATX || isMoboITX)) {
                    caseCompatible = true;
                    break;
                } else if (isCaseITX && isMoboITX) {
                    caseCompatible = true;
                    break;
                }
            }

            if (!caseCompatible) {
                const caseFFDisplay = caseFormFactorArray.join('/');
                issues.push(`❌ Motherboard (${motherboardFormFactor}) is too large for case (${caseFFDisplay})`);
            }
        }
    }

    // 5. Check PSU wattage sufficiency
    if (psu && gpu && cpu) {
        const psuWattage = parseFloat(psu.wattage || 0);
        const gpuPower = parseFloat(gpu.power || gpu.tdp || 150);
        const cpuPower = parseFloat(cpu.power || cpu.tdp || 65);
        const otherPower = 100;
        const totalRequired = gpuPower + cpuPower + otherPower;
        const minRequired = totalRequired * 0.8;

        if (psuWattage < minRequired) {
            issues.push(`❌ PSU insufficient: Has ${psuWattage}W, needs at least ${minRequired.toFixed(0)}W (80% of ${totalRequired.toFixed(0)}W)`);
        } else if (psuWattage < totalRequired) {
            warnings.push(`⚠️ PSU marginal: Has ${psuWattage}W, recommended ${totalRequired.toFixed(0)}W`);
        }
    }

    // 6. Check mandatory components
    const mandatoryComponents = ['cpu', 'motherboard', 'ram', 'storage', 'gpu', 'psu', 'cooler', 'case'];
    for (const component of mandatoryComponents) {
        if (!build[component] || (Array.isArray(build[component]) && build[component].length === 0)) {
            issues.push(`❌ Missing mandatory component: ${component}`);
        }
    }

    // 7. Additional quality checks
    if (cpu && cpu.cores) {
        if (cpu.cores < 4) {
            warnings.push(`⚠️ CPU has only ${cpu.cores} cores (modern builds typically use 4+)`);
        }
    }

    if (ram && ram.capacity) {
        const ramCapacity = parseInt(ram.capacity) || 0;
        if (ramCapacity < 16) {
            warnings.push(`⚠️ RAM capacity is ${ramCapacity}GB (16GB+ recommended for most builds)`);
        }
    }

    // 8. Check storage array validity
    if (storage) {
        const storageArray = Array.isArray(storage) ? storage : [storage];
        let totalCapacity = 0;

        for (const drive of storageArray) {
            const capacity = drive.capacity || drive.capacityGB || 0;
            totalCapacity += capacity;
        }

        if (totalCapacity < 500) {
            warnings.push(`⚠️ Total storage capacity is only ${totalCapacity}GB (500GB+ recommended)`);
        }
    }

    return {
        isCompatible: issues.length === 0,
        issues,
        warnings,
        hasWarnings: warnings.length > 0
    };
}

async function testWizardBuild(testCase, testNumber, totalTests) {
    try {
        console.log(`\n[${testNumber}/${totalTests}] Testing: ${testCase.name}`);

        // Call the wizard API endpoint
        const response = await fetch('http://localhost:3000/api/ai-build', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
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

        // Check the build compatibility
        const compatibilityResult = checkBuildCompatibility(data.build);

        if (compatibilityResult.isCompatible) {
            if (compatibilityResult.hasWarnings) {
                console.log(`   ⚠️ PASSED WITH WARNINGS`);
                compatibilityResult.warnings.forEach(warning => {
                    console.log(`      ${warning}`);
                });
            } else {
                console.log(`   ✅ PASSED - No compatibility issues detected`);
            }
            return {
                passed: true,
                testCase,
                issues: [],
                warnings: compatibilityResult.warnings,
                totalCost: data.totalCost
            };
        } else {
            console.log(`   ❌ FAILED`);
            console.log(`   Compatibility Issues: ${compatibilityResult.issues.length}`);
            compatibilityResult.issues.forEach(issue => {
                console.log(`      ${issue}`);
            });
            if (compatibilityResult.warnings.length > 0) {
                console.log(`   Additional Warnings: ${compatibilityResult.warnings.length}`);
                compatibilityResult.warnings.forEach(warning => {
                    console.log(`      ${warning}`);
                });
            }
            return {
                passed: false,
                testCase,
                issues: compatibilityResult.issues,
                warnings: compatibilityResult.warnings
            };
        }
    } catch (error) {
        console.log(`   ❌ FAILED - Error: ${error.message}`);
        return { passed: false, testCase, issues: [`Error: ${error.message}`], warnings: [] };
    }
}

async function runTests() {
    console.log('🧪 PC Builder Wizard - EXTENSIVE COMPATIBILITY TEST SUITE');
    console.log('================================================================================\n');
    console.log('📋 Running 60 comprehensive wizard build tests...\n');
    console.log('⚠️  Note: Make sure the server is running on http://localhost:3000\n');

    const testCases = generateTestCases();
    const results = [];
    let totalWarnings = 0;

    const startTime = Date.now();

    for (let i = 0; i < testCases.length; i++) {
        const result = await testWizardBuild(testCases[i], i + 1, testCases.length);
        results.push(result);
        if (result.warnings && result.warnings.length > 0) {
            totalWarnings += result.warnings.length;
        }

        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 300));
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);

    // Summary
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = results.filter(r => !r.passed).length;
    const successRate = ((passedTests / results.length) * 100).toFixed(1);
    const testsWithWarnings = results.filter(r => r.passed && r.warnings.length > 0).length;

    console.log('\n================================================================================');
    console.log('📊 Test Results Summary');
    console.log('================================================================================');
    console.log(`✅ Passed: ${passedTests}/${results.length} (${successRate}%)`);
    console.log(`❌ Failed: ${failedTests}/${results.length}`);
    console.log(`⚠️  Builds with warnings: ${testsWithWarnings}`);
    console.log(`⏱️  Total execution time: ${duration}s`);
    console.log(`📈 Average time per test: ${(duration / results.length).toFixed(2)}s`);

    // Budget range analysis
    console.log('\n================================================================================');
    console.log('💰 Budget Range Analysis');
    console.log('================================================================================');

    const budgetRanges = [
        { min: 1000, max: 1499, name: 'Budget ($1000-$1499)' },
        { min: 1500, max: 2499, name: 'Mid-Range ($1500-$2499)' },
        { min: 2500, max: 3999, name: 'High-End ($2500-$3999)' },
        { min: 4000, max: 10000, name: 'Ultra ($4000+)' }
    ];

    for (const range of budgetRanges) {
        const rangeTests = results.filter(r =>
            r.testCase.budget >= range.min && r.testCase.budget <= range.max
        );
        const rangePassed = rangeTests.filter(r => r.passed).length;
        const rangeRate = rangeTests.length > 0 ? ((rangePassed / rangeTests.length) * 100).toFixed(1) : 'N/A';
        console.log(`${range.name}: ${rangePassed}/${rangeTests.length} passed (${rangeRate}%)`);
    }

    // Performance type analysis
    console.log('\n================================================================================');
    console.log('🎯 Performance Type Analysis');
    console.log('================================================================================');

    const performances = ['gaming', 'productivity', 'content-creation', 'high-end', 'enthusiast'];
    for (const perf of performances) {
        const perfTests = results.filter(r => r.testCase.performance === perf);
        const perfPassed = perfTests.filter(r => r.passed).length;
        const perfRate = perfTests.length > 0 ? ((perfPassed / perfTests.length) * 100).toFixed(1) : 'N/A';
        console.log(`${perf}: ${perfPassed}/${perfTests.length} passed (${perfRate}%)`);
    }

    if (failedTests > 0) {
        console.log('\n================================================================================');
        console.log('❌ Failed Test Details:');
        console.log('================================================================================\n');

        results.filter(r => !r.passed).forEach((result, index) => {
            console.log(`${index + 1}. ${result.testCase.name}`);
            console.log(`   Budget: $${result.testCase.budget}, Performance: ${result.testCase.performance}`);
            console.log(`   Issues:`);
            result.issues.forEach(issue => {
                console.log(`      ${issue}`);
            });
            console.log('');
        });

        console.log('================================================================================');
        console.log('⚠️  Some tests failed. Please review and fix compatibility issues.');
        console.log('================================================================================\n');
        process.exit(1);
    } else {
        console.log('\n================================================================================');
        console.log('🎉 All tests passed! PC Builder Wizard is generating compatible builds.');
        console.log('================================================================================\n');
        process.exit(0);
    }
}

runTests();
