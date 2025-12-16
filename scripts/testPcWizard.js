const { connectToDatabase, getDatabase } = require('../config/database');

// Generate 200 test configurations
function generateTestCases() {
    const testCases = [];
    const budgets = [800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2200, 2400, 2600, 2800, 3000, 3500, 4000, 4500, 5000];
    const performances = ['gaming', 'productivity', 'content-creation', 'high-end', 'enthusiast'];
    const storages = [500, 750, 1000, 1500, 2000, 2500, 3000, 4000];
    const monitors = [false, true];

    let testNumber = 1;

    // Generate systematic combinations
    for (const budget of budgets) {
        for (const performance of performances) {
            const storageOptions = storages.filter(s => {
                // Smaller budgets should have smaller storage
                if (budget < 1200) return s <= 1000;
                if (budget < 1800) return s <= 2000;
                return true;
            });

            for (const storage of storageOptions) {
                if (testNumber > 200) break;

                const includeMonitor = monitors[testNumber % 2];
                testCases.push({
                    budget,
                    performance,
                    storage,
                    includeMonitor,
                    name: `Test ${testNumber}: $${budget} ${performance} ${storage}GB`
                });
                testNumber++;
            }
            if (testNumber > 200) break;
        }
        if (testNumber > 200) break;
    }

    return testCases;
}

const testCases = generateTestCases();

class CompatibilityValidator {
    constructor(db) {
        this.db = db;
        this.errors = [];
        this.warnings = [];
    }

    // Validate CPU and Motherboard socket compatibility
    validateCpuMotherboardSocket(cpu, motherboard) {
        if (!cpu || !motherboard) {
            this.errors.push('Missing CPU or Motherboard');
            return false;
        }

        const cpuSocket = (cpu.socket || cpu.socketType || '').toString().trim().toUpperCase();
        const motherboardSocket = (motherboard.socket || motherboard.socketType || '').toString().trim().toUpperCase();

        if (cpuSocket !== motherboardSocket) {
            this.errors.push(`❌ CPU Socket Mismatch: CPU has ${cpu.socket}, Motherboard has ${motherboard.socket}`);
            return false;
        }
        return true;
    }

    // Validate RAM and Motherboard compatibility
    validateRamMotherboard(ram, motherboard) {
        if (!ram || !motherboard) {
            this.errors.push('Missing RAM or Motherboard');
            return false;
        }

        const ramType = (ram.memoryType || '').toString().trim().toUpperCase();
        const motherboardMemoryTypes = motherboard.memoryType || [];
        const memoryTypesArray = Array.isArray(motherboardMemoryTypes) ? motherboardMemoryTypes : [motherboardMemoryTypes];

        const isCompatible = memoryTypesArray.some(mbType => {
            const normalizedMbType = mbType.toString().trim().toUpperCase();
            return ramType.includes(normalizedMbType) || normalizedMbType.includes(ramType);
        });

        if (!isCompatible) {
            const mbTypesStr = memoryTypesArray.join('/');
            this.errors.push(`❌ RAM Incompatible: RAM is ${ram.memoryType}, Motherboard supports ${mbTypesStr}`);
            return false;
        }
        return true;
    }

    // Validate Cooler and CPU socket compatibility
    validateCoolerCpu(cooler, cpu) {
        if (!cooler || !cpu) {
            // Stock cooler is OK
            return true;
        }

        const cpuSocket = (cpu.socket || cpu.socketType || '').toString().trim().toUpperCase().replace(/\s+/g, '').replace('STRX', 'TR');
        const coolerSockets = cooler.socketCompatibility || [];

        if (coolerSockets.length === 0) {
            this.warnings.push(`⚠️ Cooler has no socket compatibility defined: ${cooler.name || cooler.title}`);
            return true; // Don't fail, just warn
        }

        const isCompatible = coolerSockets.some(coolerSocket => {
            const normalizedCoolerSocket = coolerSocket.toString().trim().toUpperCase().replace(/\s+/g, '').replace('STRX', 'TR');

            // Direct match
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
            this.errors.push(`❌ Cooler Incompatible: Cooler supports ${coolerSocketsDisplay}, CPU has ${cpu.socket}`);
            return false;
        }
        return true;
    }

    // Validate Motherboard and Case form factor compatibility
    validateMotherboardCase(motherboard, pcCase) {
        if (!motherboard || !pcCase) {
            this.errors.push('Missing Motherboard or Case');
            return false;
        }

        const motherboardFormFactor = (motherboard.formFactor || '').toString();
        const caseFormFactors = pcCase.formFactor || [];
        const caseFormFactorArray = Array.isArray(caseFormFactors) ? caseFormFactors : [caseFormFactors];

        if (!motherboardFormFactor || caseFormFactorArray.length === 0) {
            this.warnings.push(`⚠️ Missing form factor info: Motherboard=${motherboardFormFactor}, Case=${caseFormFactorArray.join('/')}`);
            return true; // Don't fail
        }

        const moboFFUpper = motherboardFormFactor.toUpperCase().replace(/-/g, '').replace(/\s+/g, '').trim();

        // Check motherboard type
        const isMoboITX = moboFFUpper.includes('ITX') && !moboFFUpper.includes('ATX');
        const isMoboMicroATX = moboFFUpper.includes('MATX') || moboFFUpper.includes('MICROATX');
        const isMoboEATX = moboFFUpper.includes('EATX');
        const isMoboATX = !isMoboITX && !isMoboMicroATX && !isMoboEATX && moboFFUpper.includes('ATX');

        let caseCompatible = false;

        for (const caseFF of caseFormFactorArray) {
            const caseFFUpper = caseFF.toUpperCase().replace(/-/g, '').replace(/\s+/g, '').trim();

            const isCaseITX = caseFFUpper.includes('ITX') && !caseFFUpper.includes('ATX');
            const isCaseMicroATX = caseFFUpper.includes('MATX') || caseFFUpper.includes('MICROATX');
            const isCaseEATX = caseFFUpper.includes('EATX');
            const isCaseATX = !isCaseITX && !isCaseMicroATX && !isCaseEATX && caseFFUpper.includes('ATX');

            // E-ATX case accepts all
            if (isCaseEATX) {
                caseCompatible = true;
                break;
            }
            // ATX case: ATX, mATX, ITX
            else if (isCaseATX && (isMoboATX || isMoboMicroATX || isMoboITX)) {
                caseCompatible = true;
                break;
            }
            // mATX case: mATX, ITX
            else if (isCaseMicroATX && (isMoboMicroATX || isMoboITX)) {
                caseCompatible = true;
                break;
            }
            // ITX case: ITX only
            else if (isCaseITX && isMoboITX) {
                caseCompatible = true;
                break;
            }
        }

        if (!caseCompatible) {
            const caseFFDisplay = caseFormFactorArray.join('/');
            this.errors.push(`❌ Case Too Small: ${motherboardFormFactor} motherboard won't fit in ${caseFFDisplay} case`);
            return false;
        }
        return true;
    }

    // Validate PSU wattage
    validatePsuWattage(psu, components) {
        if (!psu) {
            this.errors.push('Missing PSU');
            return false;
        }

        const psuWattage = parseInt(psu.wattage) || 0;
        if (psuWattage === 0) {
            this.errors.push('PSU wattage not defined');
            return false;
        }

        // Estimate power consumption
        let estimatedWattage = 100; // Base system

        if (components.cpu) {
            const cpuTDP = parseInt(components.cpu.tdp) || 65;
            estimatedWattage += cpuTDP;
        }

        if (components.gpu) {
            const gpuPower = parseInt(components.gpu.powerConsumption) || 200;
            estimatedWattage += gpuPower;
        }

        if (components.ram) {
            estimatedWattage += 10; // ~10W per RAM stick
        }

        if (components.storage) {
            estimatedWattage += 5; // Storage
        }

        // 80% rule - PSU should not be loaded more than 80%
        const maxRecommendedLoad = psuWattage * 0.8;

        if (estimatedWattage > maxRecommendedLoad) {
            this.errors.push(`❌ PSU Insufficient: ${psuWattage}W PSU for ~${estimatedWattage}W system (exceeds 80% rule)`);
            return false;
        }

        if (estimatedWattage > psuWattage) {
            this.errors.push(`❌ PSU Critically Insufficient: ${psuWattage}W PSU for ~${estimatedWattage}W system`);
            return false;
        }

        return true;
    }

    // Validate all mandatory components are present
    validateMandatoryComponents(build) {
        const mandatoryComponents = ['cpu', 'motherboard', 'ram', 'storage', 'psu', 'case'];
        let allPresent = true;

        for (const component of mandatoryComponents) {
            if (!build[component]) {
                this.errors.push(`❌ Missing mandatory component: ${component}`);
                allPresent = false;
            }
        }

        return allPresent;
    }

    getResults() {
        return {
            errors: this.errors,
            warnings: this.warnings,
            passed: this.errors.length === 0
        };
    }
}

async function generateBuild(db, testCase) {
    // Simplified build generation (copy logic from server.js /api/ai-build endpoint)
    const { budget, performance, storage, includeMonitor } = testCase;

    // Budget allocations
    const allocations = {
        cpu: 0.25,
        gpu: 0.30,
        motherboard: 0.12,
        ram: 0.10,
        storage: 0.08,
        psu: 0.08,
        case: 0.07
    };

    const selectedParts = {};
    let maxBudget = budget;

    // 1. Select CPU
    const cpuBudget = maxBudget * allocations.cpu;
    const cpus = await db.collection('cpus').find({
        currentPrice: { $gt: 0, $lte: cpuBudget * 1.5 }
    }).sort({ currentPrice: -1 }).limit(5).toArray();

    selectedParts.cpu = cpus.length > 0 ? cpus[0] : null;

    if (!selectedParts.cpu) {
        throw new Error('Failed to select CPU');
    }

    // 2. Select Motherboard
    const motherboardBudget = maxBudget * allocations.motherboard;
    const cpuSocket = selectedParts.cpu.socket || selectedParts.cpu.socketType;

    const motherboards = await db.collection('motherboards').find({
        socket: cpuSocket,
        currentPrice: { $gt: 0, $lte: motherboardBudget * 1.5 }
    }).sort({ currentPrice: -1 }).limit(5).toArray();

    selectedParts.motherboard = motherboards.length > 0 ? motherboards[0] : null;

    if (!selectedParts.motherboard) {
        throw new Error('Failed to select Motherboard');
    }

    // 3. Select RAM
    const ramBudget = maxBudget * allocations.ram;
    const motherboardMemoryTypes = selectedParts.motherboard.memoryType || [];
    const memoryTypesArray = Array.isArray(motherboardMemoryTypes) ? motherboardMemoryTypes : [motherboardMemoryTypes];
    const primaryMemoryType = memoryTypesArray[0];

    const rams = await db.collection('rams').find({
        memoryType: { $regex: primaryMemoryType, $options: 'i' },
        currentPrice: { $gt: 0, $lte: ramBudget * 1.5 }
    }).sort({ currentPrice: 1 }).limit(5).toArray();

    selectedParts.ram = rams.length > 0 ? rams[0] : null;

    // Fallback: Try with more relaxed budget if nothing found
    if (!selectedParts.ram) {
        const fallbackRams = await db.collection('rams').find({
            memoryType: { $regex: primaryMemoryType, $options: 'i' },
            currentPrice: { $gt: 0, $lte: ramBudget * 3 }
        }).sort({ currentPrice: 1 }).limit(5).toArray();
        selectedParts.ram = fallbackRams.length > 0 ? fallbackRams[0] : null;
    }

    // 4. Select Storage
    const storageBudget = maxBudget * allocations.storage;
    const storages = await db.collection('storages').find({
        capacity: { $gte: storage },
        currentPrice: { $gt: 0, $lte: storageBudget * 1.5 }
    }).sort({ currentPrice: -1 }).limit(5).toArray();

    selectedParts.storage = storages.length > 0 ? storages[0] : null;

    // Fallback: Try without capacity filter if nothing found
    if (!selectedParts.storage) {
        const fallbackStorages = await db.collection('storages').find({
            currentPrice: { $gt: 0, $lte: storageBudget * 1.5 }
        }).sort({ currentPrice: -1 }).limit(5).toArray();
        selectedParts.storage = fallbackStorages.length > 0 ? fallbackStorages[0] : null;
    }

    // 5. Select GPU
    const gpuBudget = maxBudget * allocations.gpu;
    const gpus = await db.collection('gpus').find({
        currentPrice: { $gt: 0, $lte: gpuBudget * 1.5 }
    }).sort({ currentPrice: -1 }).limit(5).toArray();

    selectedParts.gpu = gpus.length > 0 ? gpus[0] : null;

    // 6. Select PSU
    const psuBudget = maxBudget * allocations.psu;
    const psus = await db.collection('psus').find({
        currentPrice: { $gt: 0, $lte: psuBudget * 1.5 }
    }).sort({ wattage: -1 }).limit(5).toArray();

    selectedParts.psu = psus.length > 0 ? psus[0] : null;

    // 7. Select Case (with motherboard compatibility)
    const caseBudget = maxBudget * allocations.case;
    let cases = await db.collection('cases').find({
        currentPrice: { $gt: 0, $lte: caseBudget * 1.5 },
        wattage: { $exists: false }
    }).sort({ currentPrice: -1 }).limit(10).toArray();

    // Filter cases for motherboard compatibility
    if (selectedParts.motherboard && selectedParts.motherboard.formFactor) {
        const motherboardFormFactor = selectedParts.motherboard.formFactor;
        const moboFFUpper = motherboardFormFactor.toUpperCase().replace(/-/g, '').replace(/\s+/g, '').trim();

        const isMoboITX = moboFFUpper.includes('ITX') && !moboFFUpper.includes('ATX');
        const isMoboMicroATX = moboFFUpper.includes('MATX') || moboFFUpper.includes('MICROATX');
        const isMoboEATX = moboFFUpper.includes('EATX');
        const isMoboATX = !isMoboITX && !isMoboMicroATX && !isMoboEATX && moboFFUpper.includes('ATX');

        const compatibleCases = cases.filter(caseItem => {
            const caseFormFactors = caseItem.formFactor || [];
            const caseFormFactorArray = Array.isArray(caseFormFactors) ? caseFormFactors : [caseFormFactors];

            for (const caseFF of caseFormFactorArray) {
                const caseFFUpper = caseFF.toUpperCase().replace(/-/g, '').replace(/\s+/g, '').trim();

                const isCaseITX = caseFFUpper.includes('ITX') && !caseFFUpper.includes('ATX');
                const isCaseMicroATX = caseFFUpper.includes('MATX') || caseFFUpper.includes('MICROATX');
                const isCaseEATX = caseFFUpper.includes('EATX');
                const isCaseATX = !isCaseITX && !isCaseMicroATX && !isCaseEATX && caseFFUpper.includes('ATX');

                if (isCaseEATX) return true;
                if (isCaseATX && (isMoboATX || isMoboMicroATX || isMoboITX)) return true;
                if (isCaseMicroATX && (isMoboMicroATX || isMoboITX)) return true;
                if (isCaseITX && isMoboITX) return true;
            }

            return false;
        });

        if (compatibleCases.length > 0) {
            cases = compatibleCases;
        }
    }

    selectedParts.case = cases.length > 0 ? cases[0] : null;

    // 8. Select Cooler (optional, but check compatibility if present)
    const coolerBudget = maxBudget * 0.05;
    const coolers = await db.collection('coolers').find({
        currentPrice: { $gt: 0, $lte: coolerBudget * 1.5 }
    }).sort({ currentPrice: -1 }).limit(10).toArray();

    if (coolers.length > 0 && selectedParts.cpu) {
        const cpuSocket = selectedParts.cpu.socket || selectedParts.cpu.socketType;
        const compatibleCoolers = coolers.filter(cooler => {
            const coolerSockets = cooler.socketCompatibility || [];
            if (coolerSockets.length === 0) return true; // No restriction
            return coolerSockets.some(s => s.toUpperCase().replace(/\s+/g, '') === cpuSocket.toUpperCase().replace(/\s+/g, ''));
        });

        selectedParts.cooler = compatibleCoolers.length > 0 ? compatibleCoolers[0] : null;
    }

    return selectedParts;
}

async function runTests() {
    let passedTests = 0;
    let failedTests = 0;

    try {
        await connectToDatabase();
        const db = getDatabase();

        console.log('🧪 PC Builder Wizard Compatibility Test Suite');
        console.log('='.repeat(80));
        console.log(`\n📋 Running ${testCases.length} test cases...\n`);

        const failedTestDetails = [];

        for (let i = 0; i < testCases.length; i++) {
            const testCase = testCases[i];
            console.log(`\n[${i + 1}/${testCases.length}] Testing: ${testCase.name}`);
            console.log(`   Budget: $${testCase.budget}, Performance: ${testCase.performance}, Storage: ${testCase.storage}GB`);

            try {
                // Generate build
                const build = await generateBuild(db, testCase);

                // Validate build
                const validator = new CompatibilityValidator(db);

                validator.validateMandatoryComponents(build);
                validator.validateCpuMotherboardSocket(build.cpu, build.motherboard);
                validator.validateRamMotherboard(build.ram, build.motherboard);
                validator.validateCoolerCpu(build.cooler, build.cpu);
                validator.validateMotherboardCase(build.motherboard, build.case);
                validator.validatePsuWattage(build.psu, build);

                const results = validator.getResults();

                if (results.passed) {
                    console.log(`   ✅ PASSED`);
                    if (results.warnings.length > 0) {
                        console.log(`   Warnings: ${results.warnings.length}`);
                        results.warnings.forEach(w => console.log(`      ${w}`));
                    }
                    passedTests++;
                } else {
                    console.log(`   ❌ FAILED`);
                    console.log(`   Errors: ${results.errors.length}`);
                    results.errors.forEach(e => console.log(`      ${e}`));
                    failedTests++;
                    failedTestDetails.push({
                        testCase,
                        errors: results.errors,
                        warnings: results.warnings
                    });
                }

            } catch (error) {
                console.log(`   ❌ FAILED - Exception: ${error.message}`);
                failedTests++;
                failedTestDetails.push({
                    testCase,
                    errors: [error.message],
                    warnings: []
                });
            }
        }

        console.log('\n' + '='.repeat(80));
        console.log('📊 Test Results Summary');
        console.log('='.repeat(80));
        console.log(`✅ Passed: ${passedTests}/${testCases.length}`);
        console.log(`❌ Failed: ${failedTests}/${testCases.length}`);
        console.log(`📈 Success Rate: ${((passedTests / testCases.length) * 100).toFixed(1)}%`);

        if (failedTests > 0) {
            console.log('\n' + '='.repeat(80));
            console.log('❌ Failed Test Details:');
            console.log('='.repeat(80));
            failedTestDetails.forEach((failure, index) => {
                console.log(`\n${index + 1}. ${failure.testCase.name}`);
                console.log(`   Budget: $${failure.testCase.budget}, Performance: ${failure.testCase.performance}`);
                console.log(`   Errors:`);
                failure.errors.forEach(e => console.log(`      ${e}`));
                if (failure.warnings.length > 0) {
                    console.log(`   Warnings:`);
                    failure.warnings.forEach(w => console.log(`      ${w}`));
                }
            });
        }

        console.log('\n' + '='.repeat(80));
        if (failedTests === 0) {
            console.log('🎉 All tests passed! PC Builder Wizard is generating compatible builds.');
        } else {
            console.log('⚠️  Some tests failed. Please review and fix compatibility issues.');
        }
        console.log('='.repeat(80));

    } catch (error) {
        console.error('❌ Test suite error:', error);
        throw error;
    } finally {
        process.exit(failedTests === 0 ? 0 : 1);
    }
}

// Run the test suite
runTests();
