const { connectToDatabase, getDatabase } = require('../config/database');
const fetch = require('node-fetch');

// Generate 20 test configurations
function generateTestCases() {
    const testCases = [];
    const budgets = [1000, 1100, 1200, 1300, 1500, 1600, 1800, 2000, 2200, 2500, 3000, 3500];
    const performances = ['gaming', 'productivity', 'content-creation'];
    const storages = [500, 1000, 2000];

    let testNumber = 1;
    for (const budget of budgets) {
        for (const performance of performances) {
            if (testNumber > 20) break;
            const storage = storages[(testNumber - 1) % storages.length];
            testCases.push({
                budget,
                performance,
                storage,
                includeMonitor: testNumber % 4 === 0,
                name: `Test ${testNumber}: $${budget} ${performance} ${storage}GB`
            });
            testNumber++;
        }
        if (testNumber > 20) break;
    }
    return testCases;
}

// Compatibility check function (matches the frontend logic)
function checkBuildCompatibility(build) {
    const issues = [];
    const { cpu, motherboard, ram, cooler, psu, gpu, case: pcCase, storage } = build;

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

    // 5. Check PSU wattage sufficiency (at least 80% of required)
    if (psu && gpu && cpu) {
        const psuWattage = parseFloat(psu.wattage || 0);
        const gpuPower = parseFloat(gpu.power || gpu.tdp || 150);
        const cpuPower = parseFloat(cpu.power || cpu.tdp || 65);
        const otherPower = 100; // For motherboard, RAM, storage, fans, etc.
        const totalRequired = gpuPower + cpuPower + otherPower;
        const minRequired = totalRequired * 0.8;

        if (psuWattage < minRequired) {
            issues.push(`❌ PSU insufficient: Has ${psuWattage}W, needs at least ${minRequired.toFixed(0)}W (80% of ${totalRequired.toFixed(0)}W required)`);
        }
    }

    // 6. Check mandatory components
    const mandatoryComponents = ['cpu', 'motherboard', 'ram', 'storage', 'gpu', 'psu', 'cooler', 'case'];
    for (const component of mandatoryComponents) {
        if (!build[component] || (Array.isArray(build[component]) && build[component].length === 0)) {
            issues.push(`❌ Missing mandatory component: ${component}`);
        }
    }

    return {
        isCompatible: issues.length === 0,
        issues
    };
}

async function testWizardBuild(testCase, testNumber, totalTests) {
    try {
        console.log(`\n[${testNumber}/${totalTests}] Testing: ${testCase.name}`);
        console.log(`   Budget: $${testCase.budget}, Performance: ${testCase.performance}, Storage: ${testCase.storage}GB`);

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
            console.log(`   ✅ PASSED - No compatibility issues detected`);
            return { passed: true, testCase, issues: [] };
        } else {
            console.log(`   ❌ FAILED`);
            console.log(`   Compatibility Issues Found: ${compatibilityResult.issues.length}`);
            compatibilityResult.issues.forEach(issue => {
                console.log(`      ${issue}`);
            });
            return { passed: false, testCase, issues: compatibilityResult.issues };
        }
    } catch (error) {
        console.log(`   ❌ FAILED - Error: ${error.message}`);
        return { passed: false, testCase, issues: [`Error: ${error.message}`] };
    }
}

async function runTests() {
    console.log('🧪 PC Builder Wizard Compatibility Test Suite');
    console.log('================================================================================\n');
    console.log('📋 Running 20 wizard build tests...\n');
    console.log('⚠️  Note: Make sure the server is running on http://localhost:3000\n');

    const testCases = generateTestCases();
    const results = [];

    for (let i = 0; i < testCases.length; i++) {
        const result = await testWizardBuild(testCases[i], i + 1, testCases.length);
        results.push(result);

        // Small delay between tests to not overwhelm the server
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Summary
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = results.filter(r => !r.passed).length;
    const successRate = ((passedTests / results.length) * 100).toFixed(1);

    console.log('\n================================================================================');
    console.log('📊 Test Results Summary');
    console.log('================================================================================');
    console.log(`✅ Passed: ${passedTests}/${results.length}`);
    console.log(`❌ Failed: ${failedTests}/${results.length}`);
    console.log(`📈 Success Rate: ${successRate}%`);

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
