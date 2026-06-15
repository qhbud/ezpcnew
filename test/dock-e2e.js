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

function formatIssueCount(count, label) {
    return `${count} ${label}${count === 1 ? '' : 's'}`;
}

function formatError(error) {
    return (error && (error.stack || error.message) ? error.stack || error.message : String(error))
        .replace(/\s*\r?\n\s*/g, ' | ');
}

(async () => {
    let browser;
    const results = [];

    async function runCheck(name, fn) {
        try {
            await fn();
            results.push({ name, ok: true });
            console.log(`PASS ${name}`);
        } catch (error) {
            results.push({ name, ok: false });
            console.log(`FAIL ${name}: ${formatError(error)}`);
        }
    }

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

        const compatibleBuild = makeCurrentBuild({ ...compatibleCore, psu: safePsu });
        const tightPsuBuild = makeCurrentBuild({ ...compatibleCore, psu: tightPsu });
        const hardIncompatibleBuild = makeCurrentBuild({ ...compatibleCore, motherboard: mismatchedMotherboard, psu: safePsu });

        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        const page = await browser.newPage();
        await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 60000 });
        await page.waitForFunction(
            () => window.partsDatabase &&
                typeof window.partsDatabase.switchTab === 'function' &&
                typeof window.partsDatabase.updateBuildDock === 'function' &&
                typeof window.partsDatabase.checkCompatibility === 'function',
            { timeout: 30000 }
        );

        const dockSnapshot = () => {
            const dock = document.querySelector('#buildDock');
            const status = document.querySelector('#buildDockStatus');
            if (!dock) {
                return {
                    exists: false,
                    visible: false,
                    className: '',
                    display: '',
                    statusText: '',
                    statusClassName: '',
                    inNavShell: false,
                    hasBuilderButton: false
                };
            }

            const rect = dock.getBoundingClientRect();
            const styles = getComputedStyle(dock);

            return {
                exists: true,
                visible: styles.display !== 'none' && styles.visibility !== 'hidden' && rect.width > 0 && rect.height > 0,
                className: dock.className,
                display: styles.display,
                statusText: status ? status.textContent.trim() : '',
                statusClassName: status ? status.className : '',
                inNavShell: !!dock.closest('.main-nav-shell'),
                hasBuilderButton: !!document.querySelector('#buildDockBuilderBtn')
            };
        };

        async function runDockScenario(build) {
            return page.evaluate(async (currentBuild) => {
                const readDock = () => {
                    const status = document.querySelector('#buildDockStatus');
                    return {
                        text: status ? status.textContent.trim() : '',
                        classList: status ? Array.from(status.classList) : []
                    };
                };

                window.partsDatabase.switchTab('gpu');
                await new Promise(requestAnimationFrame);
                window.partsDatabase.currentBuild = currentBuild;
                window.partsDatabase.updateTotalPrice();
                const wattageInfo = window.partsDatabase.calculateEstimatedWattage();
                const classified = window.partsDatabase.classifyCompatibilityIssues(currentBuild, wattageInfo);
                window.partsDatabase.checkCompatibility();
                window.partsDatabase.updateBuildDock();

                return {
                    dock: readDock(),
                    classified: {
                        problems: classified.problems.length,
                        warnings: classified.warnings.length
                    }
                };
            }, build);
        }

        await runCheck('D1 merged nav visibility', async () => {
            const states = await page.evaluate(async (snapshotSource) => {
                const readDock = eval(`(${snapshotSource})`);
                const initial = readDock();
                window.partsDatabase.switchTab('gpu');
                await new Promise(requestAnimationFrame);
                const gpu = readDock();
                window.partsDatabase.switchTab('builder');
                await new Promise(requestAnimationFrame);
                const builder = readDock();
                return { initial, gpu, builder };
            }, dockSnapshot.toString());

            for (const [name, state] of Object.entries(states)) {
                if (!state.visible) throw new Error(`expected ${name} dock visible, got ${JSON.stringify(state)}`);
                if (!state.inNavShell) throw new Error(`expected ${name} dock inside .main-nav-shell, got ${JSON.stringify(state)}`);
                if (state.hasBuilderButton) throw new Error(`expected no in-dock Builder button, got ${JSON.stringify(state)}`);
            }
        });

        await runCheck('D2 metrics', async () => {
            const metrics = await page.evaluate(async (currentBuild) => {
                window.partsDatabase.switchTab('gpu');
                await new Promise(requestAnimationFrame);
                window.partsDatabase.currentBuild = currentBuild;
                window.partsDatabase.updateTotalPrice();
                window.partsDatabase.updateBuildDock();

                return {
                    expectedCount: Object.values(currentBuild).filter(Boolean).length,
                    expectedTotal: window.partsDatabase.totalPrice,
                    countText: document.querySelector('#buildDockCount')?.textContent.trim() || '',
                    totalText: document.querySelector('#buildDockTotal')?.textContent.trim() || ''
                };
            }, compatibleBuild);

            const expectedCountText = `${metrics.expectedCount} ${metrics.expectedCount === 1 ? 'part' : 'parts'}`;
            const expectedTotalText = `$${metrics.expectedTotal.toFixed(2)}`;
            if (metrics.countText !== expectedCountText) {
                throw new Error(`expected count "${expectedCountText}", got "${metrics.countText}"`);
            }
            if (metrics.totalText !== expectedTotalText) {
                throw new Error(`expected total "${expectedTotalText}", got "${metrics.totalText}"`);
            }
        });

        await runCheck('D3 severity', async () => {
            const hard = await runDockScenario(hardIncompatibleBuild);
            const warning = await runDockScenario(tightPsuBuild);
            const clean = await runDockScenario(compatibleBuild);

            const expectedHardText = formatIssueCount(hard.classified.problems, 'problem');
            if (hard.classified.problems < 1) throw new Error(`hard scenario classifier returned ${JSON.stringify(hard.classified)}`);
            if (hard.dock.text !== expectedHardText) throw new Error(`expected hard text "${expectedHardText}", got "${hard.dock.text}"`);
            if (!hard.dock.classList.includes('problem') || hard.dock.classList.includes('warning')) {
                throw new Error(`expected hard class problem only, got ${hard.dock.classList.join(' ')}`);
            }

            const expectedWarningText = formatIssueCount(warning.classified.warnings, 'warning');
            if (warning.classified.problems !== 0 || warning.classified.warnings < 1) {
                throw new Error(`warning scenario classifier returned ${JSON.stringify(warning.classified)}`);
            }
            if (warning.dock.text !== expectedWarningText) throw new Error(`expected warning text "${expectedWarningText}", got "${warning.dock.text}"`);
            if (!warning.dock.classList.includes('warning') || warning.dock.classList.includes('problem')) {
                throw new Error(`expected warning class only, got ${warning.dock.classList.join(' ')}`);
            }

            if (clean.classified.problems !== 0 || clean.classified.warnings !== 0) {
                throw new Error(`clean scenario classifier returned ${JSON.stringify(clean.classified)}`);
            }
            if (clean.dock.text !== 'No issues detected') throw new Error(`expected clean text "No issues detected", got "${clean.dock.text}"`);
            if (!clean.dock.classList.includes('ok') || clean.dock.classList.includes('problem') || clean.dock.classList.includes('warning')) {
                throw new Error(`expected clean ok class only, got ${clean.dock.classList.join(' ')}`);
            }
        });

        await runCheck('D4 mobile nav anchored', async () => {
            await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
            const mobile = await page.evaluate(async () => {
                window.scrollTo(0, 0);
                window.partsDatabase.switchTab('gpu');
                await new Promise(requestAnimationFrame);
                window.scrollTo(0, 0);
                await new Promise(requestAnimationFrame);
                const dock = document.querySelector('#buildDock');
                const shell = document.querySelector('.main-nav-shell');
                const rect = dock ? dock.getBoundingClientRect() : null;
                const styles = dock ? getComputedStyle(dock) : null;
                return {
                    exists: !!dock,
                    visible: !!dock && styles.display !== 'none' && styles.visibility !== 'hidden' && rect.width > 0 && rect.height > 0,
                    inNavShell: !!(dock && shell && shell.contains(dock)),
                    position: styles ? styles.position : '',
                    innerHeight: window.innerHeight,
                    rect: rect ? {
                        top: rect.top,
                        right: rect.right,
                        bottom: rect.bottom,
                        left: rect.left,
                        width: rect.width,
                        height: rect.height
                    } : null
                };
            });

            if (!mobile.exists || !mobile.visible) throw new Error(`expected visible mobile dock, got ${JSON.stringify(mobile)}`);
            if (!mobile.inNavShell) throw new Error(`expected mobile dock inside nav shell, got ${JSON.stringify(mobile)}`);
            if (mobile.position === 'fixed') throw new Error(`expected mobile dock not fixed, got ${JSON.stringify(mobile)}`);
            if (mobile.rect.top < 0 || mobile.rect.bottom > mobile.innerHeight) {
                throw new Error(`expected dock within viewport height 0..${mobile.innerHeight}, got ${JSON.stringify(mobile.rect)}`);
            }
        });
    } catch (error) {
        console.log(`FAIL setup: ${formatError(error)}`);
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
