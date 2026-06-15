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

function sameBuildMap(a, b) {
    return REQUIRED_TYPES.every(type => (a && a[type]) === (b && b[type]));
}

function buildKey(buildData) {
    return REQUIRED_TYPES.map(type => `${type}:${buildData?.[type] || ''}`).join('|');
}

function decodeShareUrl(shareUrl) {
    const parsed = new URL(shareUrl);
    const encodedBuild = parsed.searchParams.get('build') || '';
    return JSON.parse(Buffer.from(encodedBuild, 'base64').toString('utf8'));
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

        await page.click('#quickStartToggleBtn');

        const pageState = await page.evaluate((requiredTypes) => {
            const db = window.partsDatabase;
            const cards = Array.from(document.querySelectorAll('.quick-start-build-card[data-quick-start-build-id]'))
                .map(card => ({
                    id: card.getAttribute('data-quick-start-build-id') || '',
                    shareUrl: card.getAttribute('data-share-url') || '',
                    total: card.getAttribute('data-total') || '',
                    name: card.querySelector('h4')?.textContent?.trim() || '',
                    text: card.textContent || '',
                    visible: !!(card.offsetWidth || card.offsetHeight || card.getClientRects().length)
                }));

            const builds = (db.quickStartBuilds || []).map(quickStartBuild => {
                const parts = {};
                requiredTypes.forEach(type => {
                    const part = quickStartBuild.build[type];
                    parts[type] = {
                        id: part?._id || part?.id || '',
                        name: part?.name || part?.title || part?.gpuModel || ''
                    };
                });

                const classified = db.classifyCompatibilityIssues(
                    quickStartBuild.build,
                    db.getStarterBuildWattageInfo(quickStartBuild.build)
                );

                return {
                    id: quickStartBuild.id,
                    name: quickStartBuild.name,
                    target: quickStartBuild.target,
                    total: quickStartBuild.total,
                    buildData: quickStartBuild.buildData,
                    parts,
                    shareUrl: typeof db.getQuickStartShareUrl === 'function'
                        ? db.getQuickStartShareUrl(quickStartBuild.id)
                        : '',
                    problems: Array.isArray(classified.problems) ? classified.problems.length : 0,
                    warnings: Array.isArray(classified.warnings) ? classified.warnings.length : 0
                };
            });

            return {
                status: db.quickStartBuildsStatus,
                currentTab: db.currentTab,
                cards,
                builds
            };
        }, REQUIRED_TYPES);

        const distinctCardIds = new Set(pageState.cards.map(card => card.id).filter(Boolean));
        const cardsHaveNamesAndTotals = pageState.cards.every(card =>
            card.visible &&
            card.name &&
            card.text.includes('$') &&
            Number.parseFloat(card.total) > 0
        );
        record(
            results,
            'S1 gallery renders',
            pageState.status === 'ready' &&
                pageState.cards.length === 4 &&
                distinctCardIds.size === 4 &&
                cardsHaveNamesAndTotals,
            `status=${pageState.status}, cards=${pageState.cards.length}, distinct=${distinctCardIds.size}`
        );

        const missingParts = [];
        for (const quickStartBuild of pageState.builds) {
            for (const type of REQUIRED_TYPES) {
                const part = quickStartBuild.parts[type];
                if (!part || !part.id) {
                    missingParts.push(`${quickStartBuild.id}.${type}=missing`);
                } else if (!liveIds[type].has(part.id)) {
                    missingParts.push(`${quickStartBuild.id}.${type}=${part.id} not in live ${type}`);
                }
            }
        }
        record(
            results,
            'S2 complete real-parts builds',
            pageState.builds.length === 4 && missingParts.length === 0,
            missingParts.join('; ') || `buildCount=${pageState.builds.length}`
        );

        const hardProblems = pageState.builds
            .filter(quickStartBuild => quickStartBuild.problems !== 0)
            .map(quickStartBuild => `${quickStartBuild.id}=${quickStartBuild.problems}`);
        record(
            results,
            'S3 zero hard problems',
            pageState.builds.length === 4 && hardProblems.length === 0,
            hardProblems.join('; ') || `buildCount=${pageState.builds.length}`
        );

        const buildKeys = pageState.builds.map(quickStartBuild => buildKey(quickStartBuild.buildData));
        record(
            results,
            'S4 themes pairwise distinct',
            pageState.builds.length === 4 && new Set(buildKeys).size === pageState.builds.length,
            buildKeys.join(' | ')
        );

        const firstBuild = pageState.builds[0];
        let loadState = null;
        if (firstBuild) {
            await page.click(`[data-quick-start-action="load"][data-quick-start-build-id="${firstBuild.id}"]`);
            await page.waitForFunction((expected) => {
                const db = window.partsDatabase;
                return db &&
                    (db.currentBuild.cpu?._id || db.currentBuild.cpu?.id) === expected.cpu &&
                    (db.currentBuild.gpu?._id || db.currentBuild.gpu?.id) === expected.gpu &&
                    (db.currentBuild.motherboard?._id || db.currentBuild.motherboard?.id) === expected.motherboard &&
                    db.currentTab === 'builder' &&
                    document.querySelector('#builder-tab')?.classList.contains('active');
            }, { timeout: 60000 }, firstBuild.buildData);

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
            'S5 one-click load',
            !!loadState &&
                loadState.currentTab === 'builder' &&
                loadState.builderActive &&
                loadState.cpu === firstBuild.buildData.cpu &&
                loadState.gpu === firstBuild.buildData.gpu &&
                loadState.motherboard === firstBuild.buildData.motherboard,
            loadState ? JSON.stringify(loadState) : 'no quick-start build'
        );

        const shareFailures = [];
        for (const quickStartBuild of pageState.builds) {
            const card = pageState.cards.find(candidate => candidate.id === quickStartBuild.id);
            const urls = [
                ['method', quickStartBuild.shareUrl],
                ['card', card?.shareUrl || '']
            ];

            for (const [source, shareUrl] of urls) {
                try {
                    const decoded = decodeShareUrl(shareUrl);
                    if (!shareUrl.startsWith(`${BASE_URL}/?build=`) || !sameBuildMap(decoded, quickStartBuild.buildData)) {
                        shareFailures.push(`${quickStartBuild.id}.${source}=bad-round-trip`);
                    }
                } catch (error) {
                    shareFailures.push(`${quickStartBuild.id}.${source}=${error.message}`);
                }
            }
        }
        record(
            results,
            'S6 Copy-Link URL round-trips',
            pageState.builds.length === 4 && shareFailures.length === 0,
            shareFailures.join('; ') || `checked=${pageState.builds.length}`
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
