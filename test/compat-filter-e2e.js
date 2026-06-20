const puppeteer = require('puppeteer');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TABS = [
    ['gpu', '#gpuFilterResults'],
    ['cpu', '#cpuFilterResults'],
    ['motherboard', '#moboFilterResults'],
    ['ram', '#ramFilterResults'],
    ['psu', '#psuFilterResults'],
    ['cooler', '#coolerFilterResults'],
    ['case', '#caseFilterResults'],
    ['addon', '#addonFilterResults']
];

function formatError(error) {
    return (error && (error.stack || error.message) ? error.stack || error.message : String(error))
        .replace(/\s*\r?\n\s*/g, ' | ');
}

function makeBuild(overrides = {}) {
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
    const consoleErrors = [];
    const pageErrors = [];
    let browser;

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
        page.on('pageerror', error => {
            pageErrors.push(error.stack || error.message || String(error));
        });

        await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 60000 });
        await page.waitForFunction(
            () => window.partsDatabase &&
                typeof window.partsDatabase.isCompatibleWithBuild === 'function' &&
                typeof window.partsDatabase._renderTabList === 'function',
            { timeout: 30000 }
        );
        await page.waitForFunction(
            () => Object.values(window.partsDatabase.dataReady || {}).every(Boolean),
            { timeout: 60000 }
        );

        await runCheck('F1 compatible-only toggle present on every component list', async () => {
            for (const [kind, containerSelector] of TABS) {
                await page.evaluate(tab => window.partsDatabase.switchTab(tab), kind);
                await page.waitForFunction(
                    ({ selector, tab }) => {
                        const input = document.querySelector(`${selector} .compat-only-toggle[data-compat-kind="${tab}"]`);
                        const label = input?.closest('label');
                        return input?.type === 'checkbox' &&
                            /compatible with my build/i.test(label?.textContent || '');
                    },
                    { timeout: 45000 },
                    { selector: containerSelector, tab: kind }
                );
            }
        });

        await runCheck('F2 filter hides incompatible CPUs and restores the full set', async () => {
            await page.evaluate(() => window.partsDatabase.switchTab('cpu'));
            await page.waitForSelector('#cpuFilterResults .compat-only-toggle', { timeout: 30000 });

            const unfiltered = await page.evaluate(buildTemplate => {
                const db = window.partsDatabase;
                const points = db._cpuTabChartPts || [];
                const boards = db.allMotherboards || [];
                let scenario = null;

                for (const motherboard of boards) {
                    db.currentBuild = { ...buildTemplate, motherboard };
                    const compatible = points.filter(point => db.isCompatibleWithBuild('cpu', point.cpu)).length;
                    const incompatible = points.length - compatible;
                    if (compatible > 0 && incompatible > 0) {
                        scenario = { motherboard, compatible, incompatible };
                        break;
                    }
                }

                if (!scenario) {
                    throw new Error('Could not find a real motherboard producing mixed CPU compatibility');
                }

                db.currentBuild = { ...buildTemplate, motherboard: scenario.motherboard };
                db._compatOnly = false;
                db._renderTabList('cpu');

                const rows = Array.from(document.querySelectorAll('#cpuFilterResults .mobo-row'));
                const visibleCompatibility = rows.map(row => {
                    const point = points.find(candidate => db.getPartId(candidate.cpu) === row.dataset.id);
                    return point ? db.isCompatibleWithBuild('cpu', point.cpu) : null;
                });

                return {
                    count: rows.length,
                    incompatible: visibleCompatibility.filter(value => value === false).length,
                    missing: visibleCompatibility.filter(value => value === null).length
                };
            }, makeBuild());

            if (unfiltered.count < 1 || unfiltered.incompatible < 1 || unfiltered.missing > 0) {
                throw new Error(`expected mixed unfiltered rows, got ${JSON.stringify(unfiltered)}`);
            }

            await page.click('#cpuFilterResults .compat-only-toggle');
            await page.waitForFunction(
                () => window.partsDatabase._compatOnly === true &&
                    document.querySelector('#cpuFilterResults .compat-only-toggle')?.checked === true,
                { timeout: 10000 }
            );

            const filtered = await page.evaluate(() => {
                const db = window.partsDatabase;
                const points = db._cpuTabChartPts || [];
                const rows = Array.from(document.querySelectorAll('#cpuFilterResults .mobo-row'));
                const compatibility = rows.map(row => {
                    const point = points.find(candidate => db.getPartId(candidate.cpu) === row.dataset.id);
                    return point ? db.isCompatibleWithBuild('cpu', point.cpu) : null;
                });
                const sharedUnchecked = Array.from(document.querySelectorAll('.compat-only-toggle'))
                    .filter(input => !input.checked)
                    .length;
                return { count: rows.length, compatibility, sharedUnchecked };
            });

            if (filtered.count > unfiltered.count) {
                throw new Error(`filtered count ${filtered.count} exceeded unfiltered ${unfiltered.count}`);
            }
            if (filtered.compatibility.some(value => value !== true)) {
                throw new Error(`filtered rows were not all compatible: ${JSON.stringify(filtered.compatibility)}`);
            }
            if (filtered.sharedUnchecked !== 0) {
                throw new Error(`${filtered.sharedUnchecked} rendered toggles did not reflect shared ON state`);
            }

            await page.click('#cpuFilterResults .compat-only-toggle');
            await page.waitForFunction(
                expected => window.partsDatabase._compatOnly === false &&
                    document.querySelectorAll('#cpuFilterResults .mobo-row').length === expected,
                { timeout: 10000 },
                unfiltered.count
            );
        });

        await runCheck('F3 PSU undersize predicate is additive and null-safe', async () => {
            const snapshot = await page.evaluate(buildTemplate => {
                const db = window.partsDatabase;
                const cpu = (db._cpuTabChartPts || []).find(point => point.cpu)?.cpu ||
                    (db.allCPUs || []).find(Boolean);
                const gpu = (db._gpuRaw || []).find(candidate => Number(candidate.tdp || candidate.wattage) > 0) ||
                    (db.allGPUs || []).find(Boolean);
                db.currentBuild = { ...buildTemplate, cpu, gpu };
                const draw = Number(db.calculateEstimatedWattage().total) || 0;
                if (draw <= 0) throw new Error('Expected a positive estimated draw from real parts');

                const undersized = db.isCompatibleWithBuild('psu', { wattage: draw - 1 });
                const ample = db.isCompatibleWithBuild('psu', { wattage: draw + 1 });
                const unknown = db.isCompatibleWithBuild('psu', { wattage: 0 });

                db.currentBuild = { ...buildTemplate };
                const zeroDraw = Number(db.calculateEstimatedWattage().total) || 0;
                const zeroDrawCompatible = db.isCompatibleWithBuild('psu', { wattage: 1 });

                return { draw, undersized, ample, unknown, zeroDraw, zeroDrawCompatible };
            }, makeBuild());

            if (snapshot.undersized !== false) throw new Error(`undersized PSU returned ${snapshot.undersized}`);
            if (snapshot.ample !== true) throw new Error(`ample PSU returned ${snapshot.ample}`);
            if (snapshot.unknown !== true) throw new Error(`unknown/zero wattage returned ${snapshot.unknown}`);
            if (snapshot.zeroDraw !== 0 || snapshot.zeroDrawCompatible !== true) {
                throw new Error(`zero-draw case failed: ${JSON.stringify(snapshot)}`);
            }
        });

        await runCheck('F4 compatibility filter empty state is readable and error-free', async () => {
            const emptyState = await page.evaluate(buildTemplate => {
                const db = window.partsDatabase;
                const originalPoints = db._cpuTabChartPts;
                const originalBuild = db.currentBuild;
                const realCpu = (originalPoints || []).map(point => point.cpu)
                    .find(cpu => cpu && (cpu.socket || cpu.socketType));
                if (!realCpu) throw new Error('Could not find a real CPU with a socket');

                const cpuSocket = realCpu.socket || realCpu.socketType;
                const incompatibleBoard = (db.allMotherboards || []).find(board => {
                    const boardSocket = board.socket || board.socketType;
                    if (!boardSocket || String(boardSocket) === String(cpuSocket)) return false;
                    db.currentBuild = { ...buildTemplate, motherboard: board };
                    return db.isCompatibleWithBuild('cpu', realCpu) === false;
                });
                if (!incompatibleBoard) throw new Error('Could not find a real incompatible motherboard');

                const price = parseFloat(realCpu.salePrice || realCpu.currentPrice || realCpu.basePrice || realCpu.price) || 1;
                db.currentBuild = { ...buildTemplate, motherboard: incompatibleBoard };
                db._cpuTabChartPts = [{ cpu: realCpu, price }];
                db._compatOnly = true;
                db._renderTabList('cpu');

                const notice = document.querySelector('#cpuFilterResults .mobo-results-empty')?.textContent.trim() || '';
                const rows = document.querySelectorAll('#cpuFilterResults .mobo-row').length;

                db._cpuTabChartPts = originalPoints;
                db.currentBuild = originalBuild;
                db._compatOnly = false;
                db._renderTabList('cpu');

                return { notice, rows };
            }, makeBuild());

            if (emptyState.rows !== 0) throw new Error(`expected zero rows, got ${emptyState.rows}`);
            if (!/no compatible cpus/i.test(emptyState.notice) || emptyState.notice.length < 20) {
                throw new Error(`unexpected empty notice "${emptyState.notice}"`);
            }
            if (consoleErrors.length || pageErrors.length) {
                throw new Error(`console errors=${JSON.stringify(consoleErrors)}, page errors=${JSON.stringify(pageErrors)}`);
            }
        });
    } catch (error) {
        console.log(`FAIL setup: ${formatError(error)}`);
        process.exitCode = 1;
    } finally {
        if (browser) await browser.close();
    }

    if (results.some(result => !result.ok)) process.exitCode = 1;
})();
