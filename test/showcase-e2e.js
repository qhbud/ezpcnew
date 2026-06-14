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
        page.on('dialog', async dialog => {
            console.log(`DIALOG ${dialog.type()}: ${dialog.message()}`);
            await dialog.accept();
        });

        await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 60000 });
        await page.waitForFunction(() => {
            return window.partsDatabase &&
                window.partsDatabase.showcaseBuildsReadyPromise &&
                ['ready', 'partial', 'error'].includes(window.partsDatabase.showcaseBuildsStatus);
        }, { timeout: 60000 });

        const pageState = await page.evaluate((requiredTypes) => {
            const db = window.partsDatabase;
            const cards = Array.from(document.querySelectorAll('.showcase-build-card[data-showcase-build-id]'))
                .map(card => ({
                    id: card.getAttribute('data-showcase-build-id') || '',
                    theme: card.getAttribute('data-showcase-theme') || '',
                    shareUrl: card.getAttribute('data-share-url') || '',
                    total: card.getAttribute('data-total') || '',
                    name: card.querySelector('h4')?.textContent?.trim() || '',
                    text: card.textContent || ''
                }));

            const builds = (db.showcaseBuilds || []).map(showcaseBuild => {
                const parts = {};
                requiredTypes.forEach(type => {
                    const part = showcaseBuild.build[type];
                    parts[type] = {
                        id: part?._id || part?.id || '',
                        name: part?.name || part?.title || part?.gpuModel || ''
                    };
                });

                const classified = db.classifyCompatibilityIssues(
                    showcaseBuild.build,
                    db.getStarterBuildWattageInfo(showcaseBuild.build)
                );

                return {
                    id: showcaseBuild.id,
                    name: showcaseBuild.name,
                    target: showcaseBuild.target,
                    total: showcaseBuild.total,
                    buildData: showcaseBuild.buildData,
                    parts,
                    shareUrl: typeof db.getShowcaseShareUrl === 'function'
                        ? db.getShowcaseShareUrl(showcaseBuild.id)
                        : '',
                    problems: Array.isArray(classified.problems) ? classified.problems.length : 0,
                    warnings: Array.isArray(classified.warnings) ? classified.warnings.length : 0
                };
            });

            return {
                status: db.showcaseBuildsStatus,
                currentTab: db.currentTab,
                cards,
                builds
            };
        }, REQUIRED_TYPES);

        const distinctCardIds = new Set(pageState.cards.map(card => card.id).filter(Boolean));
        const cardsHaveNamesAndTotals = pageState.cards.every(card =>
            card.name &&
            card.text.includes('$') &&
            Number.parseFloat(card.total) > 0
        );
        record(
            results,
            'S1 gallery renders',
            pageState.status === 'ready' &&
                pageState.cards.length >= 4 &&
                distinctCardIds.size >= 4 &&
                cardsHaveNamesAndTotals,
            `status=${pageState.status}, cards=${pageState.cards.length}, distinct=${distinctCardIds.size}`
        );

        const missingParts = [];
        for (const showcaseBuild of pageState.builds) {
            for (const type of REQUIRED_TYPES) {
                const part = showcaseBuild.parts[type];
                if (!part || !part.id) {
                    missingParts.push(`${showcaseBuild.id}.${type}=missing`);
                } else if (!liveIds[type].has(part.id)) {
                    missingParts.push(`${showcaseBuild.id}.${type}=${part.id} not in live ${type}`);
                }
            }
        }
        record(
            results,
            'S2 complete real-parts builds',
            pageState.builds.length >= 4 && missingParts.length === 0,
            missingParts.join('; ') || `buildCount=${pageState.builds.length}`
        );

        const hardProblems = pageState.builds
            .filter(showcaseBuild => showcaseBuild.problems !== 0)
            .map(showcaseBuild => `${showcaseBuild.id}=${showcaseBuild.problems}`);
        record(
            results,
            'S3 zero hard problems',
            pageState.builds.length >= 4 && hardProblems.length === 0,
            hardProblems.join('; ') || `buildCount=${pageState.builds.length}`
        );

        const buildKeys = pageState.builds.map(showcaseBuild => buildKey(showcaseBuild.buildData));
        record(
            results,
            'S4 themes pairwise distinct',
            pageState.builds.length >= 4 && new Set(buildKeys).size === pageState.builds.length,
            buildKeys.join(' | ')
        );

        const firstBuild = pageState.builds[0];
        let loadState = null;
        if (firstBuild) {
            await page.click(`[data-showcase-action="load"][data-showcase-build-id="${firstBuild.id}"]`);
            await page.waitForFunction((expected) => {
                const db = window.partsDatabase;
                return db &&
                    db.currentBuild.cpu?._id === expected.cpu &&
                    db.currentBuild.gpu?._id === expected.gpu &&
                    db.currentBuild.motherboard?._id === expected.motherboard &&
                    db.currentTab === 'builder' &&
                    document.querySelector('#builder-tab')?.classList.contains('active');
            }, { timeout: 60000 }, firstBuild.buildData);

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
            'S5 one-click load',
            !!loadState &&
                loadState.currentTab === 'builder' &&
                loadState.builderActive &&
                loadState.cpu === firstBuild.buildData.cpu &&
                loadState.gpu === firstBuild.buildData.gpu &&
                loadState.motherboard === firstBuild.buildData.motherboard,
            loadState ? JSON.stringify(loadState) : 'no showcase build'
        );

        const shareFailures = [];
        for (const showcaseBuild of pageState.builds) {
            const card = pageState.cards.find(candidate => candidate.id === showcaseBuild.id);
            const urls = [
                ['method', showcaseBuild.shareUrl],
                ['card', card?.shareUrl || '']
            ];

            for (const [source, shareUrl] of urls) {
                try {
                    const decoded = decodeShareUrl(shareUrl);
                    if (!shareUrl.startsWith(`${BASE_URL}/?build=`) || !sameBuildMap(decoded, showcaseBuild.buildData)) {
                        shareFailures.push(`${showcaseBuild.id}.${source}=bad-round-trip`);
                    }
                } catch (error) {
                    shareFailures.push(`${showcaseBuild.id}.${source}=${error.message}`);
                }
            }
        }
        record(
            results,
            'S6 Copy-Link URL round-trips',
            pageState.builds.length >= 4 && shareFailures.length === 0,
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
