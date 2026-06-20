const puppeteer = require('puppeteer');
const gpuBenchmarksRaw = require('../data/gpuBenchmarks.json');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const GPU_BENCH = Object.fromEntries(
    Object.entries(gpuBenchmarksRaw)
        .filter(([key]) => key !== '_comment')
        .map(([key, value]) => [key.toUpperCase(), value])
);
const GPU_BENCH_MAX = Math.max(...Object.values(GPU_BENCH));
const GPU_BENCH_KEYS = Object.keys(GPU_BENCH).sort((a, b) => b.length - a.length);
const CORE_COMPONENTS = ['cpu', 'gpu', 'motherboard', 'ram', 'storage', 'psu', 'case'];
const LIVE_ENDPOINTS = {
    cpu: '/api/parts/cpus?groupByModel=false',
    gpu: '/api/parts/gpus?groupByModel=false',
    motherboard: '/api/parts/motherboards',
    ram: '/api/parts/rams?groupByModel=false',
    storage: '/api/parts/storages?groupByModel=false',
    psu: '/api/parts/psus',
    case: '/api/parts/cases?groupByModel=false',
    cooler: '/api/parts/coolers',
    monitor: '/api/parts/addons'
};

const scenarios = [
    { id: '700-single-1080p', budget: 700, performance: 'single', resolution: '1080p' },
    { id: '800-multi-1080p', budget: 800, performance: 'multi', resolution: '1080p' },
    { id: '1200-single-1440p', budget: 1200, performance: 'single', resolution: '1440p' },
    { id: '1200-multi-1440p', budget: 1200, performance: 'multi', resolution: '1440p' },
    { id: '2000-single-1080p', budget: 2000, performance: 'single', resolution: '1080p' },
    { id: '2000-single-1440p', budget: 2000, performance: 'single', resolution: '1440p' },
    { id: '2000-single-4k', budget: 2000, performance: 'single', resolution: '4k' },
    { id: '3500-single-4k', budget: 3500, performance: 'single', resolution: '4k' },
    { id: '3500-multi-4k', budget: 3500, performance: 'multi', resolution: '4k' },
    { id: 'unlimited-single-4k', budget: 'unlimited', performance: 'single', resolution: '4k' },
    { id: '900-single-1080p-monitor', budget: 900, performance: 'single', resolution: '1080p', includeMonitor: true },
    { id: '600-single-4k-monitor', budget: 600, performance: 'single', resolution: '4k', includeMonitor: true },
    { id: '1200-single-4k-monitor', budget: 1200, performance: 'single', resolution: '4k', includeMonitor: true },
    { id: '499-unsatisfiable', budget: 499, performance: 'single', resolution: '1080p' }
];

function partName(part) {
    return String(part?.name || part?.title || part?.gpuModel || part?.model || '').trim();
}

function partPrice(part) {
    return Number(part?.currentPrice || part?.price || part?.basePrice);
}

function normalize(value) {
    return String(value || '').toUpperCase().replace(/-/g, '').replace(/\s+/g, '').trim();
}

function gpuPerformance(gpu) {
    const model = String(gpu?.gpuModel || gpu?.model || '').toUpperCase();
    let score = model ? GPU_BENCH[model] : undefined;
    if (score === undefined) {
        const name = partName(gpu).toUpperCase();
        const key = GPU_BENCH_KEYS.find(candidate => name.includes(candidate));
        if (key) score = GPU_BENCH[key];
    }
    return score === undefined ? null : score / GPU_BENCH_MAX;
}

function cpuTdp(cpu) {
    for (const value of [cpu?.tdp, cpu?.TDP, cpu?.specs?.tdp, cpu?.specs?.TDP]) {
        const parsed = Number.parseFloat(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    const cores = Number(cpu?.cores) || 8;
    if (cores >= 20) return 253;
    if (cores >= 16) return 241;
    if (cores >= 12) return 180;
    if (cores >= 8) return 142;
    if (cores >= 6) return 125;
    return 65;
}

function requiredPsuWattage(build) {
    const gpuTdp = Number.parseFloat(build.gpu?.tdp);
    if (!Number.isFinite(gpuTdp) || gpuTdp <= 0) return Infinity;
    return Math.ceil(((gpuTdp + cpuTdp(build.cpu) + 150) * 1.20) / 50) * 50;
}

function motherboardMemoryTypes(motherboard) {
    const raw = motherboard?.specifications?.memoryType || motherboard?.memoryType || [];
    return (Array.isArray(raw) ? raw : [raw]).map(normalize).filter(Boolean);
}

function motherboardMaxMemory(motherboard) {
    for (const value of [
        motherboard?.maxMemory,
        motherboard?.maxRam,
        motherboard?.maxMemoryCapacity,
        motherboard?.specifications?.maxMemory
    ]) {
        const parsed = Number.parseFloat(value);
        if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    return null;
}

function ramCapacity(ram) {
    return Number.parseFloat(ram?.totalCapacity ?? ram?.capacity) || 0;
}

function caseFitsMotherboard(motherboard, pcCase) {
    const motherboardFormFactor = normalize(motherboard?.formFactor);
    const caseFormFactors = Array.isArray(pcCase?.formFactor) ? pcCase.formFactor : [pcCase?.formFactor];
    const motherboardIsItx = motherboardFormFactor.includes('ITX') && !motherboardFormFactor.includes('ATX');
    const motherboardIsMatx = motherboardFormFactor.includes('MATX') || motherboardFormFactor.includes('MICROATX');
    const motherboardIsEatx = motherboardFormFactor.includes('EATX');
    const motherboardIsAtx = !motherboardIsItx && !motherboardIsMatx &&
        !motherboardIsEatx && motherboardFormFactor.includes('ATX');

    return caseFormFactors.some(value => {
        const caseFormFactor = normalize(value);
        const caseIsItx = caseFormFactor.includes('ITX') && !caseFormFactor.includes('ATX');
        const caseIsMatx = caseFormFactor.includes('MATX') || caseFormFactor.includes('MICROATX');
        const caseIsEatx = caseFormFactor.includes('EATX');
        const caseIsAtx = !caseIsItx && !caseIsMatx &&
            !caseIsEatx && caseFormFactor.includes('ATX');
        return caseIsEatx ||
            (caseIsAtx && (motherboardIsAtx || motherboardIsMatx || motherboardIsItx)) ||
            (caseIsMatx && (motherboardIsMatx || motherboardIsItx)) ||
            (caseIsItx && motherboardIsItx);
    });
}

function identityKeys(part) {
    return [
        part?._id,
        part?.id,
        part?.asin,
        partName(part).toLowerCase()
    ].filter(Boolean).map(String);
}

async function fetchParts(type, endpoint) {
    const response = await fetch(`${BASE_URL}${endpoint}`);
    if (!response.ok) throw new Error(`Failed to fetch ${type}: HTTP ${response.status}`);
    const data = await response.json();
    return Array.isArray(data) ? data : (data.parts || data.data || []);
}

async function getLiveIdentities() {
    const entries = await Promise.all(Object.entries(LIVE_ENDPOINTS).map(async ([type, endpoint]) => {
        const parts = await fetchParts(type, endpoint);
        const identities = new Set(parts.flatMap(identityKeys));
        return [type, identities];
    }));
    return Object.fromEntries(entries);
}

async function postScenario(scenario) {
    const response = await fetch(`${BASE_URL}/api/ai-build`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            budget: scenario.budget,
            performance: scenario.performance,
            storage: 1000,
            includeMonitor: Boolean(scenario.includeMonitor),
            resolution: scenario.resolution
        })
    });
    const data = await response.json();
    return { response, data };
}

function record(results, id, ok, detail = '') {
    results.push({ id, ok, detail });
    console.log(`${ok ? 'PASS' : 'FAIL'} ${id}${ok ? '' : `: ${detail}`}`);
}

function validateCompleteness(build) {
    const errors = [];
    for (const type of CORE_COMPONENTS) {
        if (!build?.[type]) errors.push(`missing ${type}`);
    }
    if (build?.cpu && build.cpu.coolerIncluded !== true && build.cpu.includesCooler !== true && !build.cooler) {
        errors.push('missing cooler for CPU without an included cooler');
    }
    for (const [type, part] of Object.entries(build || {})) {
        if (!partName(part)) errors.push(`${type} missing name`);
        const price = partPrice(part);
        if (!Number.isFinite(price) || price <= 0) errors.push(`${type} invalid price ${price}`);
    }
    return errors;
}

function validateCompatibility(build) {
    const errors = [];
    if (build.cpu.socket !== build.motherboard.socket) {
        errors.push(`socket ${build.cpu.socket} != ${build.motherboard.socket}`);
    }
    const ramType = normalize(build.ram.memoryType);
    const supportedMemory = motherboardMemoryTypes(build.motherboard);
    if (!supportedMemory.some(type => type.includes(ramType) || ramType.includes(type))) {
        errors.push(`RAM ${build.ram.memoryType} not in ${supportedMemory.join('/')}`);
    }
    const maxMemory = motherboardMaxMemory(build.motherboard);
    if (maxMemory && ramCapacity(build.ram) > maxMemory) {
        errors.push(`RAM ${ramCapacity(build.ram)}GB > board max ${maxMemory}GB`);
    }
    const requiredWattage = requiredPsuWattage(build);
    if (Number.parseInt(build.psu.wattage, 10) < requiredWattage) {
        errors.push(`PSU ${build.psu.wattage}W < required ${requiredWattage}W`);
    }
    if (!caseFitsMotherboard(build.motherboard, build.case)) {
        errors.push(`case ${JSON.stringify(build.case.formFactor)} does not fit ${build.motherboard.formFactor}`);
    }
    return errors;
}

function validateProvenance(build, liveIdentities) {
    const errors = [];
    for (const [type, part] of Object.entries(build || {})) {
        const liveType = type === 'monitor' ? 'monitor' : type;
        const identities = liveIdentities[liveType];
        if (!identities || !identityKeys(part).some(key => identities.has(key))) {
            errors.push(`${type} ${partName(part)} not found in live ${liveType}`);
        }
    }
    return errors;
}

async function runUiChecks(results) {
    let browser;
    const consoleErrors = [];
    const pageErrors = [];
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        const page = await browser.newPage();
        page.on('console', message => {
            if (message.type() !== 'error') return;
            const text = message.text();
            if (!text.startsWith('Failed to load resource')) consoleErrors.push(text);
        });
        page.on('pageerror', error => pageErrors.push(error.stack || error.message || String(error)));
        await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 60000 });

        const uiState = await page.evaluate(() => {
            window.submitWizard = () => {
                window.__wizardSubmission = { ...wizardData };
            };

            openBudgetModal();
            updateBudgetDisplay(700);
            nextQuestion();
            selectPerformance('single');
            nextQuestion();
            nextQuestion();
            const low = {
                sequence: getWizardQuestionSequence(),
                submission: window.__wizardSubmission,
                resolutionVisible: document.getElementById('question4').style.display !== 'none',
                monitorVisible: document.getElementById('question5').style.display !== 'none'
            };

            closeBudgetModal();
            openBudgetModal();
            updateBudgetDisplay(1200);
            nextQuestion();
            selectPerformance('single');
            nextQuestion();
            nextQuestion();
            const mid = {
                sequence: getWizardQuestionSequence(),
                currentQuestion,
                resolution1080p: document.getElementById('resolution1080pBtn').style.display,
                resolution1440p: document.getElementById('resolution1440pBtn').style.display,
                resolution4k: document.getElementById('resolution4kBtn').style.display
            };

            closeBudgetModal();
            openBudgetModal();
            updateBudgetDisplay(2500);
            nextQuestion();
            const high = {
                sequence: getWizardQuestionSequence(),
                resolution4k: document.getElementById('resolution4kBtn').style.display
            };

            displayBuildResults({
                success: false,
                error: 'No compatible build fits this target',
                reason: 'no_compatible_build'
            });
            const failure = {
                errorVisible: document.getElementById('buildErrorState').style.display !== 'none',
                contentVisible: document.getElementById('buildResultsContent').style.display !== 'none',
                acceptVisible: document.getElementById('acceptBuildBtn').style.display !== 'none',
                message: document.getElementById('buildErrorMessage').textContent
            };

            return { low, mid, high, failure };
        });

        record(
            results,
            'G5 low budget skips resolution and monitor',
            JSON.stringify(uiState.low.sequence) === JSON.stringify([1, 2, 3]) &&
                uiState.low.submission?.resolution === '1080p' &&
                uiState.low.submission?.includeMonitor === false &&
                uiState.low.resolutionVisible === false &&
                uiState.low.monitorVisible === false,
            JSON.stringify(uiState.low)
        );
        record(
            results,
            'G5 mid budget offers 1080p and 1440p only',
            JSON.stringify(uiState.mid.sequence) === JSON.stringify([1, 2, 3, 4, 5]) &&
                uiState.mid.currentQuestion === 4 &&
                uiState.mid.resolution1080p !== 'none' &&
                uiState.mid.resolution1440p !== 'none' &&
                uiState.mid.resolution4k === 'none',
            JSON.stringify(uiState.mid)
        );
        record(
            results,
            'G5 high budget offers 4k',
            uiState.high.sequence.includes(4) &&
                uiState.high.sequence.includes(5) &&
                uiState.high.resolution4k !== 'none',
            JSON.stringify(uiState.high)
        );
        record(
            results,
            'G5 failure response renders visible error',
            uiState.failure.errorVisible === true &&
                uiState.failure.contentVisible === false &&
                uiState.failure.acceptVisible === false &&
                uiState.failure.message === 'No compatible build fits this target',
            JSON.stringify(uiState.failure)
        );
        record(
            results,
            'G5 wizard page errors',
            consoleErrors.length === 0 && pageErrors.length === 0,
            `console=${consoleErrors.join(' | ')} page=${pageErrors.join(' | ')}`
        );
    } catch (error) {
        record(results, 'G5 UI setup', false, error.stack || error.message || String(error));
    } finally {
        if (browser) await browser.close();
    }
}

(async () => {
    const results = [];
    const scenarioResults = new Map();

    try {
        const liveIdentities = await getLiveIdentities();

        for (const scenario of scenarios) {
            const { response, data } = await postScenario(scenario);
            scenarioResults.set(scenario.id, { scenario, response, data });

            if (data.success === true) {
                const completenessErrors = validateCompleteness(data.build);
                record(results, `W1 ${scenario.id}`, completenessErrors.length === 0, completenessErrors.join('; '));

                const compatibilityErrors = validateCompatibility(data.build);
                record(results, `W2 ${scenario.id}`, compatibilityErrors.length === 0, compatibilityErrors.join('; '));

                const totalCost = Number(data.totalCost);
                const finiteBudget = typeof scenario.budget === 'number';
                const budgetErrors = [];
                if (!Number.isFinite(totalCost)) budgetErrors.push(`invalid totalCost ${data.totalCost}`);
                if (finiteBudget && totalCost > scenario.budget + 0.001) {
                    budgetErrors.push(`${totalCost} > ${scenario.budget}`);
                }
                if (finiteBudget && scenario.budget >= 800 && totalCost < scenario.budget * 0.70) {
                    budgetErrors.push(`${totalCost} < 70% of ${scenario.budget}`);
                }
                record(results, `W3 ${scenario.id}`, budgetErrors.length === 0, budgetErrors.join('; '));

                const provenanceErrors = validateProvenance(data.build, liveIdentities);
                record(results, `W6 ${scenario.id}`, provenanceErrors.length === 0, provenanceErrors.join('; '));
            } else if (scenario.id !== '499-unsatisfiable') {
                record(results, `W1 ${scenario.id}`, false, `unexpected failure ${data.reason}: ${data.error}`);
            }
        }

        const resolutionScenarios = ['2000-single-1080p', '2000-single-1440p', '2000-single-4k']
            .map(id => scenarioResults.get(id)?.data);
        const resolutionScores = resolutionScenarios.map(data => gpuPerformance(data?.build?.gpu));
        record(
            results,
            'W4 resolution GPU performance is non-decreasing',
            resolutionScores.every(Number.isFinite) &&
                resolutionScores[0] <= resolutionScores[1] &&
                resolutionScores[1] <= resolutionScores[2],
            resolutionScores.join(' -> ')
        );

        const unsatisfiable = scenarioResults.get('499-unsatisfiable');
        const anyPartialSuccess = [...scenarioResults.values()].some(({ data }) =>
            data.success === true && validateCompleteness(data.build).length > 0
        );
        record(
            results,
            'W5 fail-fast shape and no partial success',
            unsatisfiable?.response.status === 200 &&
                unsatisfiable?.data.success === false &&
                Boolean(unsatisfiable?.data.reason) &&
                !anyPartialSuccess,
            JSON.stringify(unsatisfiable?.data)
        );

        const lowBudget = scenarioResults.get('700-single-1080p')?.data;
        record(
            results,
            'W7 sub-$1000 complete compatible build',
            lowBudget?.success === true &&
                validateCompleteness(lowBudget.build).length === 0 &&
                validateCompatibility(lowBudget.build).length === 0,
            JSON.stringify(lowBudget && { success: lowBudget.success, reason: lowBudget.reason })
        );

        const belowMonitorFloor = scenarioResults.get('600-single-4k-monitor')?.data;
        record(
            results,
            'W8a below $800 omits monitor and clamps to 1080p',
            belowMonitorFloor?.success === true &&
                !belowMonitorFloor.build?.monitor &&
                belowMonitorFloor.wizardData?.includeMonitor === false &&
                belowMonitorFloor.wizardData?.resolution === '1080p',
            JSON.stringify(belowMonitorFloor && {
                resolution: belowMonitorFloor.wizardData?.resolution,
                includeMonitor: belowMonitorFloor.wizardData?.includeMonitor,
                monitor: partName(belowMonitorFloor.build?.monitor)
            })
        );

        const midClamp = scenarioResults.get('1200-single-4k-monitor')?.data;
        record(
            results,
            'W8b sub-$2000 clamps 4k to 1440p',
            midClamp?.success === true &&
                midClamp.wizardData?.resolution === '1440p' &&
                (!midClamp.build?.monitor || !/\b4k\b|2160p/i.test(partName(midClamp.build.monitor))),
            JSON.stringify(midClamp && {
                resolution: midClamp.wizardData?.resolution,
                monitor: partName(midClamp.build?.monitor)
            })
        );

        await runUiChecks(results);

        console.log('SCENARIO TABLE');
        console.log('scenario | totalCost | budget | gpu | gpuPerf');
        for (const scenario of scenarios) {
            const data = scenarioResults.get(scenario.id)?.data;
            console.log([
                scenario.id,
                data?.success === true ? Number(data.totalCost).toFixed(2) : '-',
                scenario.budget,
                data?.success === true ? partName(data.build?.gpu) : `FAIL:${data?.reason || 'unknown'}`,
                data?.success === true && Number.isFinite(gpuPerformance(data.build?.gpu))
                    ? gpuPerformance(data.build.gpu).toFixed(4)
                    : '-'
            ].join(' | '));
        }
    } catch (error) {
        record(results, 'setup', false, error.stack || error.message || String(error));
    }

    if (results.some(result => !result.ok)) {
        process.exitCode = 1;
    }
})();
