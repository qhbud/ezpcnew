const puppeteer = require('puppeteer');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const EPSILON = 1e-12;

function record(results, name, ok, detail = '') {
    results.push({ name, ok, detail });
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : `: ${detail}`}`);
}

(async () => {
    const results = [];
    let browser;

    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        const page = await browser.newPage();
        page.on('dialog', async dialog => {
            console.log(`DIALOG ${dialog.type()}: ${dialog.message()}`);
            await dialog.accept();
        });

        await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 60000 });
        await page.waitForFunction(() => {
            const db = window.partsDatabase;
            return db &&
                db.dataReady.cpu &&
                db.dataReady.gpu &&
                typeof db.getCpuPerformance === 'function' &&
                typeof db.getGpuPerformance === 'function' &&
                typeof db.loadAndAddComponentById === 'function' &&
                typeof db.updateBuildBalanceMeter === 'function';
        }, { timeout: 60000 });

        const fixtures = await page.evaluate(async () => {
            const db = window.partsDatabase;
            const [cpus, gpus] = await Promise.all([
                fetch('/api/parts/cpus').then(response => response.json()),
                fetch('/api/parts/gpus?groupByModel=false').then(response => response.json())
            ]);
            const nameOf = part => part.name || part.title || part.gpuModel || part.model || '';
            const byScore = (parts, scoreFn) => parts
                .map(part => ({
                    id: part._id || part.id,
                    name: nameOf(part),
                    score: scoreFn.call(db, part)
                }))
                .filter(part => part.id && Number.isFinite(part.score))
                .sort((a, b) => a.score - b.score);

            const cpuScores = byScore(cpus, db.getCpuPerformance);
            const gpuScores = byScore(gpus, db.getGpuPerformance);

            return {
                bottomCpu: cpuScores[0],
                topCpu: cpuScores[cpuScores.length - 1],
                bottomGpu: gpuScores[0],
                topGpu: gpuScores[gpuScores.length - 1],
                counts: {
                    cpus: cpus.length,
                    cpuScored: cpuScores.length,
                    gpus: gpus.length,
                    gpuScored: gpuScores.length
                }
            };
        });

        if (!fixtures.bottomCpu || !fixtures.topCpu || !fixtures.bottomGpu || !fixtures.topGpu) {
            throw new Error(`Could not select live scored CPU/GPU fixtures: ${JSON.stringify(fixtures.counts)}`);
        }

        async function loadPair(cpuId, gpuId) {
            return page.evaluate(async ({ cpuId, gpuId }) => {
                const db = window.partsDatabase;
                db.currentBuild = {
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
                    addon6: null
                };

                await db.loadAndAddComponentById('cpu', cpuId);
                await db.loadAndAddComponentById('gpu', gpuId);
                const state = db.updateBuildBalanceMeter();
                const meter = document.querySelector('[data-balance-meter]');
                const rect = meter ? meter.getBoundingClientRect() : null;

                return {
                    state,
                    helperCpuScore: db.getCpuPerformance(db.currentBuild.cpu),
                    helperGpuScore: db.getGpuPerformance(db.currentBuild.gpu),
                    helperCpuMultiScore: db.getCpuMultiThreadPerformance(db.currentBuild.cpu),
                    meter: meter ? {
                        exists: true,
                        visible: !!(rect && rect.width > 0 && rect.height > 0),
                        state: meter.dataset.balanceState || '',
                        label: meter.dataset.balanceLabel || '',
                        position: meter.dataset.balancePosition || '',
                        cpuScore: meter.dataset.cpuScore || '',
                        gpuScore: meter.dataset.gpuScore || '',
                        text: meter.textContent.trim()
                    } : { exists: false }
                };
            }, { cpuId, gpuId });
        }

        async function loadCpuOnly(cpuId) {
            return page.evaluate(async (id) => {
                const db = window.partsDatabase;
                db.currentBuild = {
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
                    addon6: null
                };

                await db.loadAndAddComponentById('cpu', id);
                const state = db.updateBuildBalanceMeter();
                const meter = document.querySelector('[data-balance-meter]');

                return {
                    state,
                    meter: meter ? {
                        exists: true,
                        state: meter.dataset.balanceState || '',
                        label: meter.dataset.balanceLabel || '',
                        position: meter.dataset.balancePosition || '',
                        cpuScore: meter.dataset.cpuScore || '',
                        gpuScore: meter.dataset.gpuScore || '',
                        text: meter.textContent.trim()
                    } : { exists: false }
                };
            }, cpuId);
        }

        const weakCpuStrongGpu = await loadPair(fixtures.bottomCpu.id, fixtures.topGpu.id);
        record(
            results,
            'B1 meter renders',
            weakCpuStrongGpu.meter.exists &&
                weakCpuStrongGpu.meter.visible &&
                weakCpuStrongGpu.meter.state &&
                weakCpuStrongGpu.meter.label &&
                Number.isFinite(Number(weakCpuStrongGpu.meter.position)) &&
                Number(weakCpuStrongGpu.meter.position) >= 0 &&
                Number(weakCpuStrongGpu.meter.position) <= 100,
            JSON.stringify(weakCpuStrongGpu.meter)
        );

        const strongCpuWeakGpu = await loadPair(fixtures.topCpu.id, fixtures.bottomGpu.id);
        record(
            results,
            'B2 differentiates direction',
            weakCpuStrongGpu.state.state === 'cpu-limited' &&
                strongCpuWeakGpu.state.state !== 'cpu-limited' &&
                weakCpuStrongGpu.state.state !== strongCpuWeakGpu.state.state,
            `weakCpuStrongGpu=${weakCpuStrongGpu.state.state}, strongCpuWeakGpu=${strongCpuWeakGpu.state.state}`
        );

        const neutral = await loadCpuOnly(fixtures.topCpu.id);
        record(
            results,
            'B3 neutral when incomplete',
            neutral.meter.exists &&
                neutral.state.state === 'incomplete' &&
                /add gpu/i.test(neutral.state.label) &&
                neutral.meter.position === '' &&
                neutral.meter.cpuScore === '' &&
                neutral.meter.gpuScore === '',
            JSON.stringify(neutral)
        );

        record(
            results,
            'B4 plain-language explanation',
            typeof weakCpuStrongGpu.state.explanation === 'string' &&
                weakCpuStrongGpu.state.explanation.trim().length > 20 &&
                /\s/.test(weakCpuStrongGpu.state.explanation.trim()),
            weakCpuStrongGpu.state.explanation || 'missing explanation'
        );

        const cpuMatches = Math.abs(weakCpuStrongGpu.state.cpuScore - weakCpuStrongGpu.helperCpuScore) <= EPSILON;
        const gpuMatches = Math.abs(weakCpuStrongGpu.state.gpuScore - weakCpuStrongGpu.helperGpuScore) <= EPSILON;
        const domCpuMatches = Math.abs(Number(weakCpuStrongGpu.meter.cpuScore) - weakCpuStrongGpu.helperCpuScore) <= EPSILON;
        const domGpuMatches = Math.abs(Number(weakCpuStrongGpu.meter.gpuScore) - weakCpuStrongGpu.helperGpuScore) <= EPSILON;
        record(
            results,
            'B5 scores equal performance helpers',
            cpuMatches && gpuMatches && domCpuMatches && domGpuMatches,
            `stateCpu=${weakCpuStrongGpu.state.cpuScore}, helperCpu=${weakCpuStrongGpu.helperCpuScore}, stateGpu=${weakCpuStrongGpu.state.gpuScore}, helperGpu=${weakCpuStrongGpu.helperGpuScore}`
        );
    } catch (error) {
        record(results, 'setup', false, error.stack || error.message || String(error));
    } finally {
        if (browser) {
            await browser.close();
        }
    }

    if (results.some(result => !result.ok)) {
        process.exitCode = 1;
    }
})();
