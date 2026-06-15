const puppeteer = require('puppeteer');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const REQUIRED_TYPES = ['cpu', 'gpu', 'motherboard', 'ram', 'psu', 'case', 'storage', 'cooler'];
const LIVE_ENDPOINTS = {
    cpu: '/api/parts/cpus',
    gpu: '/api/parts/gpus?groupByModel=false',
    motherboard: '/api/parts/motherboards',
    ram: '/api/parts/rams?groupByModel=false',
    psu: '/api/parts/psus',
    case: '/api/parts/cases?groupByModel=false',
    storage: '/api/parts/storages?groupByModel=false',
    cooler: '/api/parts/coolers'
};

async function getLiveIds() {
    const entries = await Promise.all(Object.entries(LIVE_ENDPOINTS).map(async ([type, endpoint]) => {
        const response = await fetch(`${BASE_URL}${endpoint}`);
        if (!response.ok) throw new Error(`Failed to fetch ${type}: ${response.status}`);
        const data = await response.json();
        const ids = new Set((Array.isArray(data) ? data : []).map(part => part._id || part.id).filter(Boolean));
        return [type, ids];
    }));
    return Object.fromEntries(entries);
}

function record(results, name, ok, detail = '') {
    results.push({ name, ok, detail });
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : `: ${detail}`}`);
}

(async () => {
    const results = [];
    let browser;

    try {
        const liveIds = await getLiveIds();

        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1360, height: 900, deviceScaleFactor: 1 });
        page.on('dialog', async dialog => {
            console.log(`DIALOG ${dialog.type()}: ${dialog.message()}`);
            await dialog.accept();
        });

        await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 60000 });
        await page.waitForFunction(() => {
            return window.partsDatabase &&
                window.partsDatabase.quickStartBuildsReadyPromise &&
                ['ready', 'partial', 'error'].includes(window.partsDatabase.quickStartBuildsStatus);
        }, { timeout: 60000 });

        const pageState = await page.evaluate((requiredTypes) => {
            const db = window.partsDatabase;
            const cards = Array.from(document.querySelectorAll('[data-quick-start-build-id]'))
                .map(card => card.getAttribute('data-quick-start-build-id'));
            const presets = (db.quickStartBuilds || []).map(preset => {
                const parts = {};
                requiredTypes.forEach(type => {
                    const part = preset.build[type];
                    parts[type] = {
                        id: part?._id || part?.id || '',
                        name: part?.name || part?.title || part?.gpuModel || ''
                    };
                });

                const classified = db.classifyCompatibilityIssues(
                    preset.build,
                    db.getStarterBuildWattageInfo(preset.build)
                );

                return {
                    id: preset.id,
                    name: preset.name,
                    target: preset.target,
                    total: preset.total,
                    buildData: preset.buildData,
                    parts,
                    problems: classified.problems.length,
                    warnings: classified.warnings.length
                };
            });

            return {
                status: db.quickStartBuildsStatus,
                cards,
                presets,
                containerCount: document.querySelectorAll('[data-quick-start-builds]').length,
                collapsed: document.querySelector('[data-quick-start-builds]')?.dataset.collapsed || ''
            };
        }, REQUIRED_TYPES);

        const distinctCards = new Set(pageState.cards);
        record(
            results,
            'P1 quick-start renders exactly 4',
            pageState.status === 'ready' &&
                pageState.containerCount === 1 &&
                pageState.presets.length === 4 &&
                distinctCards.size === 4 &&
                pageState.collapsed === 'true',
            `status=${pageState.status}, containers=${pageState.containerCount}, presets=${pageState.presets.length}, collapsed=${pageState.collapsed}`
        );

        const missingParts = [];
        for (const preset of pageState.presets) {
            for (const type of REQUIRED_TYPES) {
                const part = preset.parts[type];
                if (!part || !part.id) {
                    missingParts.push(`${preset.id}.${type}=missing`);
                } else if (!liveIds[type].has(part.id)) {
                    missingParts.push(`${preset.id}.${type}=${part.id} not in live ${type}`);
                }
            }
        }
        record(
            results,
            'P2 complete real-parts builds',
            pageState.presets.length === 4 && missingParts.length === 0,
            missingParts.join('; ') || `presetCount=${pageState.presets.length}`
        );

        const hardProblems = pageState.presets
            .filter(preset => preset.problems !== 0)
            .map(preset => `${preset.id}=${preset.problems}`);
        record(
            results,
            'P3 zero hard problems',
            pageState.presets.length === 4 && hardProblems.length === 0,
            hardProblems.join('; ') || `presetCount=${pageState.presets.length}`
        );

        const firstPreset = pageState.presets[0];
        let loadState = null;
        if (firstPreset) {
            await page.click('#quickStartToggleBtn');
            await page.click(`[data-quick-start-action="load"][data-quick-start-build-id="${firstPreset.id}"]`);
            await page.waitForFunction((expected) => {
                const db = window.partsDatabase;
                return db &&
                    (db.currentBuild.cpu?._id || db.currentBuild.cpu?.id) === expected.cpu &&
                    (db.currentBuild.gpu?._id || db.currentBuild.gpu?.id) === expected.gpu &&
                    (db.currentBuild.motherboard?._id || db.currentBuild.motherboard?.id) === expected.motherboard &&
                    db.currentTab === 'builder' &&
                    document.querySelector('#builder-tab')?.classList.contains('active');
            }, { timeout: 60000 }, firstPreset.buildData);

            loadState = await page.evaluate(() => {
                const db = window.partsDatabase;
                return {
                    currentTab: db.currentTab,
                    builderActive: document.querySelector('#builder-tab')?.classList.contains('active') || false,
                    cpu: db.currentBuild.cpu?._id || db.currentBuild.cpu?.id || '',
                    gpu: db.currentBuild.gpu?._id || db.currentBuild.gpu?.id || '',
                    motherboard: db.currentBuild.motherboard?._id || db.currentBuild.motherboard?.id || ''
                };
            });
        }
        record(
            results,
            'P4 one-click load',
            !!loadState &&
                loadState.currentTab === 'builder' &&
                loadState.builderActive &&
                loadState.cpu === firstPreset.buildData.cpu &&
                loadState.gpu === firstPreset.buildData.gpu &&
                loadState.motherboard === firstPreset.buildData.motherboard,
            loadState ? JSON.stringify(loadState) : 'no quick-start preset'
        );

        const totals = pageState.presets.map(preset => preset.total);
        const buildKeys = pageState.presets.map(preset =>
            REQUIRED_TYPES.map(type => `${type}:${preset.buildData?.[type] || ''}`).join('|')
        );
        const differentiated = pageState.presets.length === 4 &&
            new Set(buildKeys).size === 4 &&
            Math.min(...totals) < 1300 &&
            Math.max(...totals) > 1800 &&
            totals[0] < totals[totals.length - 1];
        record(
            results,
            'P5 presets differentiated',
            differentiated,
            pageState.presets.map(preset => `${preset.id}=${preset.total.toFixed(2)}`).join(', ')
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
