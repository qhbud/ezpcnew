const puppeteer = require('puppeteer');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

function normalizeFormFactor(value) {
    return String(value || '').toUpperCase().replace(/-/g, '').replace(/\s+/g, '').trim();
}

function caseFitsMotherboard(motherboard, pcCase) {
    const caseFormFactors = pcCase.formFactor || [];
    const caseFormFactorArray = Array.isArray(caseFormFactors) ? caseFormFactors : [caseFormFactors];
    const motherboardFormFactor = normalizeFormFactor(motherboard.formFactor);

    if (!motherboardFormFactor || caseFormFactorArray.length === 0) return false;

    const isMoboITX = motherboardFormFactor.includes('ITX') && !motherboardFormFactor.includes('ATX');
    const isMoboMicroATX = motherboardFormFactor.includes('MATX') || motherboardFormFactor.includes('MICROATX');
    const isMoboEATX = motherboardFormFactor.includes('EATX');
    const isMoboATX = !isMoboITX && !isMoboMicroATX && !isMoboEATX && motherboardFormFactor.includes('ATX');

    return caseFormFactorArray.some(caseFF => {
        const normalizedCase = normalizeFormFactor(caseFF);
        const isCaseITX = normalizedCase.includes('ITX') && !normalizedCase.includes('ATX');
        const isCaseMicroATX = normalizedCase.includes('MATX') || normalizedCase.includes('MICROATX');
        const isCaseEATX = normalizedCase.includes('EATX');
        const isCaseATX = !isCaseITX && !isCaseMicroATX && !isCaseEATX && normalizedCase.includes('ATX');

        return isCaseEATX ||
            (isCaseATX && (isMoboATX || isMoboMicroATX || isMoboITX)) ||
            (isCaseMicroATX && (isMoboMicroATX || isMoboITX)) ||
            (isCaseITX && isMoboITX);
    });
}

function memoryMatches(motherboard, ram) {
    const supported = motherboard.specifications?.memoryType || motherboard.memoryType || [];
    const supportedArray = Array.isArray(supported) ? supported : [supported];
    return supportedArray.some(type => String(type || '').includes(ram.memoryType || ''));
}

function estimateWattage(build) {
    let total = 0;
    if (build.motherboard) total += 50;
    if (build.cpu?.wattage) total += build.cpu.wattage;
    if (build.gpu) total += build.gpu.tdp || build.gpu.wattage || 0;
    if (build.ram) total += (String(build.ram.memoryType || '').toUpperCase().includes('DDR5') ? 5 : 3) * (build.ram.modules || 2);
    if (build.cooler) {
        const coolerType = build.cooler.coolerType || build.cooler.type || '';
        total += /liquid|aio|water/i.test(coolerType) ? 20 : 12;
    }
    return total;
}

async function getParts(category, query = '') {
    const response = await fetch(`${BASE_URL}/api/parts/${category}${query}`);
    if (!response.ok) throw new Error(`Failed to fetch ${category}: ${response.status}`);
    const data = await response.json();
    return Array.isArray(data) ? data : (data.parts || data.data || []);
}

function findCompatibleBuild(parts) {
    const cpus = parts.cpus.filter(cpu => cpu.socket && cpu.wattage);
    const motherboards = parts.motherboards.filter(mb => mb.socket && mb.formFactor && mb.memoryType);
    const rams = parts.rams.filter(ram => ram.memoryType);
    const coolers = parts.coolers.filter(cooler => Array.isArray(cooler.socketCompatibility) && cooler.socketCompatibility.length > 0);
    const cases = parts.cases.filter(pcCase => pcCase.formFactor);
    const gpus = parts.gpus.filter(gpu => (gpu.tdp || gpu.wattage) && (!gpu.length || gpu.length <= 300));

    for (const cpu of cpus) {
        for (const motherboard of motherboards) {
            if (motherboard.socket !== cpu.socket) continue;
            const ram = rams.find(candidate => memoryMatches(motherboard, candidate));
            if (!ram) continue;
            const cooler = coolers.find(candidate => candidate.socketCompatibility.includes(cpu.socket));
            if (!cooler) continue;
            const pcCase = cases.find(candidate => caseFitsMotherboard(motherboard, candidate));
            if (!pcCase) continue;
            const gpu = gpus.find(Boolean);
            if (!gpu) continue;
            return { cpu, motherboard, ram, cooler, case: pcCase, gpu };
        }
    }

    throw new Error('Could not assemble a compatible real-parts build from the API');
}

function findPsu(parts, build, tight) {
    const estimated = estimateWattage(build);
    const psus = parts.psus
        .filter(psu => parseInt(psu.wattage, 10) > 0)
        .sort((a, b) => parseInt(a.wattage, 10) - parseInt(b.wattage, 10));

    if (tight) {
        return psus.find(psu => estimated > parseInt(psu.wattage, 10) * 0.8);
    }

    return psus.find(psu => estimated <= parseInt(psu.wattage, 10) * 0.8);
}

function makeCurrentBuild(overrides) {
    return {
        gpu: null,
        cpu: null,
        motherboard: null,
        ram: null,
        cooler: null,
        psu: null,
        storage: null,
        case: null,
        addon: null,
        addon2: null,
        addon3: null,
        addon4: null,
        addon5: null,
        addon6: null,
        ...overrides
    };
}

(async () => {
    const results = [];
    let browser;

    try {
        const parts = {
            cpus: await getParts('cpus'),
            motherboards: await getParts('motherboards'),
            rams: await getParts('rams?groupByModel=false'),
            coolers: await getParts('coolers'),
            psus: await getParts('psus'),
            cases: await getParts('cases?groupByModel=false'),
            gpus: await getParts('gpus?groupByModel=false')
        };

        const compatibleCore = findCompatibleBuild(parts);
        const tightPsu = findPsu(parts, compatibleCore, true);
        const safePsu = findPsu(parts, compatibleCore, false);
        const mismatchedMotherboard = parts.motherboards.find(mb => mb.socket && mb.socket !== compatibleCore.cpu.socket);

        if (!tightPsu) throw new Error(`Could not find tight PSU for estimated ${estimateWattage(compatibleCore)}W build`);
        if (!safePsu) throw new Error(`Could not find safe PSU for estimated ${estimateWattage(compatibleCore)}W build`);
        if (!mismatchedMotherboard) throw new Error('Could not find mismatched motherboard for hard-incompatible scenario');

        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        const page = await browser.newPage();
        await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 60000 });
        await page.waitForFunction(() => window.partsDatabase && typeof window.partsDatabase.checkCompatibility === 'function', { timeout: 30000 });

        async function runScenario(name, build, assertPanel) {
            const panel = await page.evaluate((currentBuild) => {
                window.partsDatabase.currentBuild = currentBuild;
                window.partsDatabase.checkCompatibility();
                const resultsEl = document.querySelector('#compatibilityResults');
                const headingEl = document.querySelector('#compatibilityCheckHeading');
                return {
                    heading: headingEl ? headingEl.textContent.trim() : '',
                    text: resultsEl ? resultsEl.textContent.trim() : '',
                    problemCount: resultsEl ? resultsEl.querySelectorAll('.compatibility-problem').length : 0,
                    warningCount: resultsEl ? resultsEl.querySelectorAll('.compatibility-warning').length : 0,
                    hasProblemsClass: resultsEl ? resultsEl.classList.contains('has-problems') : false,
                    hasWarningsClass: resultsEl ? resultsEl.classList.contains('has-warnings') : false
                };
            }, build);

            const failure = assertPanel(panel);
            if (failure) {
                results.push({ name, ok: false, detail: failure, panel });
                console.log(`FAIL ${name}: ${failure}`);
            } else {
                results.push({ name, ok: true, panel });
                console.log(`PASS ${name}`);
            }
        }

        await runScenario(
            'S1 hard incompatible -> problem',
            makeCurrentBuild({ ...compatibleCore, motherboard: mismatchedMotherboard, psu: safePsu }),
            panel => {
                if (panel.problemCount < 1) return `expected at least 1 problem, got ${panel.problemCount}; heading="${panel.heading}" text="${panel.text}"`;
                if (!/problem/i.test(panel.heading)) return `expected problem heading, got "${panel.heading}"`;
                return '';
            }
        );

        await runScenario(
            'S2 tight PSU -> warning only',
            makeCurrentBuild({ ...compatibleCore, psu: tightPsu }),
            panel => {
                if (panel.problemCount !== 0) return `expected 0 problems, got ${panel.problemCount}; text="${panel.text}"`;
                if (panel.warningCount < 1) return `expected at least 1 warning, got ${panel.warningCount}; text="${panel.text}"`;
                if (!/warning/i.test(panel.heading) || /problem/i.test(panel.heading)) return `expected warning-only heading, got "${panel.heading}"`;
                return '';
            }
        );

        await runScenario(
            'S3 all good -> none',
            makeCurrentBuild({ ...compatibleCore, psu: safePsu }),
            panel => {
                if (panel.problemCount !== 0 || panel.warningCount !== 0) return `expected no issues, got ${panel.problemCount} problems and ${panel.warningCount} warnings; text="${panel.text}"`;
                if (!/all compatible/i.test(panel.heading) && !/no issues/i.test(panel.text)) return `expected all-compatible/no-issues state, got heading="${panel.heading}" text="${panel.text}"`;
                return '';
            }
        );
    } catch (error) {
        console.log(`FAIL setup: ${error.stack || error.message || String(error)}`);
        process.exitCode = 1;
    } finally {
        if (browser) {
            await browser.close();
        }
    }

    if (results.some(result => !result.ok)) {
        process.exitCode = 1;
    }
})();
