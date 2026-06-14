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
        page.on('dialog', async dialog => {
            console.log(`DIALOG ${dialog.type()}: ${dialog.message()}`);
            await dialog.accept();
        });

        await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 60000 });
        await page.waitForFunction(() => {
            return window.partsDatabase &&
                ['ready', 'partial', 'error'].includes(window.partsDatabase.starterBuildsStatus);
        }, { timeout: 60000 });

        const pageState = await page.evaluate((requiredTypes) => {
            const db = window.partsDatabase;
            const cards = Array.from(document.querySelectorAll('[data-starter-build-tier]'))
                .map(card => card.getAttribute('data-starter-build-tier'));
            const presets = (db.starterBuildPresets || []).map(preset => {
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
                status: db.starterBuildsStatus,
                cards,
                presets
            };
        }, REQUIRED_TYPES);

        const distinctCards = new Set(pageState.cards);
        record(
            results,
            'P1 tiers render',
            pageState.status === 'ready' && distinctCards.size >= 3,
            `status=${pageState.status}, tiers=${Array.from(distinctCards).join(',') || 'none'}`
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
            pageState.presets.length >= 3 && missingParts.length === 0,
            missingParts.join('; ') || `presetCount=${pageState.presets.length}`
        );

        const hardProblems = pageState.presets
            .filter(preset => preset.problems !== 0)
            .map(preset => `${preset.id}=${preset.problems}`);
        record(
            results,
            'P3 zero hard problems',
            pageState.presets.length >= 3 && hardProblems.length === 0,
            hardProblems.join('; ') || `presetCount=${pageState.presets.length}`
        );

        const entryPreset = pageState.presets.find(preset => preset.id === 'entry') || pageState.presets[0];
        let loadState = null;
        if (entryPreset) {
            await page.click(`[data-starter-build-id="${entryPreset.id}"]`);
            await page.waitForFunction((expected) => {
                const db = window.partsDatabase;
                return db &&
                    db.currentBuild.cpu?._id === expected.cpu &&
                    db.currentBuild.gpu?._id === expected.gpu &&
                    db.currentBuild.motherboard?._id === expected.motherboard &&
                    db.currentTab === 'builder' &&
                    document.querySelector('#builder-tab')?.classList.contains('active');
            }, { timeout: 60000 }, entryPreset.buildData);

            loadState = await page.evaluate(() => {
                const db = window.partsDatabase;
                return {
                    currentTab: db.currentTab,
                    builderActive: document.querySelector('#builder-tab')?.classList.contains('active') || false,
                    cpu: db.currentBuild.cpu?._id || '',
                    gpu: db.currentBuild.gpu?._id || '',
                    motherboard: db.currentBuild.motherboard?._id || ''
                };
            });
        }
        record(
            results,
            'P4 one-click load',
            !!loadState &&
                loadState.currentTab === 'builder' &&
                loadState.builderActive &&
                loadState.cpu === entryPreset.buildData.cpu &&
                loadState.gpu === entryPreset.buildData.gpu &&
                loadState.motherboard === entryPreset.buildData.motherboard,
            loadState ? JSON.stringify(loadState) : 'no entry preset'
        );

        const byId = Object.fromEntries(pageState.presets.map(preset => [preset.id, preset]));
        const differentiated = !!(byId.entry && byId.mainstream && byId.enthusiast) &&
            byId.entry.total < byId.mainstream.total &&
            byId.mainstream.total < byId.enthusiast.total &&
            byId.entry.total < 1100 &&
            byId.enthusiast.total > 1800;
        record(
            results,
            'P5 tiers differentiated',
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
