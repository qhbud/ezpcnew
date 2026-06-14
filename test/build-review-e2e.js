const puppeteer = require('puppeteer');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function getParts(category, query = '') {
    const response = await fetch(`${BASE_URL}/api/parts/${category}${query}`);
    if (!response.ok) throw new Error(`Failed to fetch ${category}: ${response.status}`);
    const data = await response.json();
    return Array.isArray(data) ? data : (data.parts || data.data || []);
}

function getPrice(component) {
    return parseFloat(component?.salePrice || component?.currentPrice || component?.basePrice || component?.price || 0) || 0;
}

function estimateWattage(build) {
    const cpuWatts = parseInt(build.cpu?.wattage || build.cpu?.tdp || 0, 10) || 95;
    const gpuWatts = parseInt(build.gpu?.tdp || build.gpu?.wattage || 0, 10) || 220;
    return cpuWatts + gpuWatts + 100;
}

function firstPriced(parts) {
    return parts.find(part => getPrice(part) > 0) || parts[0];
}

function findSafePsu(psus, estimatedWatts) {
    return psus
        .filter(psu => parseInt(psu.wattage, 10) > estimatedWatts / 0.75)
        .sort((a, b) => parseInt(a.wattage, 10) - parseInt(b.wattage, 10))[0] ||
        psus.find(psu => parseInt(psu.wattage, 10) > 0);
}

function sumBuild(build) {
    return Object.values(build)
        .flatMap(component => Array.isArray(component) ? component : [component])
        .reduce((sum, component) => sum + getPrice(component), 0);
}

function makeReviewData(build, budget = 1800) {
    return {
        build,
        budget,
        totalCost: sumBuild(build),
        underBudget: true,
        wizardData: {
            budget,
            performance: 'single',
            storage: 1000,
            includeMonitor: false
        }
    };
}

function formatError(error) {
    return (error && (error.stack || error.message) ? error.stack || error.message : String(error))
        .replace(/\s*\r?\n\s*/g, ' | ');
}

(async () => {
    const results = [];
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
        const parts = {
            cpus: await getParts('cpus'),
            gpus: await getParts('gpus', '?groupByModel=false'),
            motherboards: await getParts('motherboards'),
            rams: await getParts('rams', '?groupByModel=false'),
            coolers: await getParts('coolers'),
            psus: await getParts('psus'),
            storages: await getParts('storages')
        };

        const cpu = parts.cpus.find(part => getPrice(part) > 0 && (part.wattage || part.tdp)) || firstPriced(parts.cpus);
        const gpu = parts.gpus.find(part => getPrice(part) > 0 && (part.tdp || part.wattage)) || firstPriced(parts.gpus);
        const motherboard = parts.motherboards.find(part => getPrice(part) > 0) || parts.motherboards[0];
        const ram = parts.rams.find(part => getPrice(part) > 0) || parts.rams[0];
        const cooler = parts.coolers.find(part => getPrice(part) >= 25) || firstPriced(parts.coolers);
        const storage = parts.storages.find(part => getPrice(part) > 0 && /nvme|m\.?2|pcie/i.test(`${part.name || ''} ${part.title || ''} ${part.type || ''}`)) ||
            firstPriced(parts.storages);

        if (!cpu || !gpu || !motherboard || !ram || !cooler || !storage) {
            throw new Error('Could not find enough live API parts to build review data');
        }

        const estimatedWatts = estimateWattage({ cpu, gpu });
        const safePsu = findSafePsu(parts.psus, estimatedWatts);
        if (!safePsu) throw new Error(`Could not find PSU data for estimated ${estimatedWatts}W build`);

        const normalBuild = { cpu, gpu, motherboard, ram, cooler, storage, psu: safePsu };
        const tightPsuBuild = {
            ...normalBuild,
            psu: {
                ...safePsu,
                wattage: Math.max(250, Math.floor(estimatedWatts * 0.7))
            }
        };

        const timestampedGpu = parts.gpus.find(part => getPrice(part) > 0 && (part.updatedAt || part.lastUpdated));
        if (!timestampedGpu) throw new Error('Could not find a GPU with price and timestamp fields');

        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        const page = await browser.newPage();
        await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 60000 });
        await page.waitForFunction(
            () => typeof window.renderBuildReviewPanel === 'function' &&
                typeof window.getBuildReviewNotes === 'function' &&
                window.partsDatabase &&
                typeof window.partsDatabase.renderTabListings === 'function' &&
                typeof window.partsDatabase._renderGpuProductCard === 'function',
            { timeout: 30000 }
        );

        await runCheck('R1 explanation present', async () => {
            const result = await page.evaluate((data) => {
                window.renderBuildReviewPanel(data);
                const panel = document.querySelector('#buildReviewPanel');
                const notes = Array.from(panel.querySelectorAll('.build-review-note')).map(note => ({
                    type: note.classList.contains('warning') ? 'warning' : 'info',
                    text: note.textContent.trim()
                }));
                return {
                    display: getComputedStyle(panel).display,
                    notes,
                    infoCount: notes.filter(note => note.type === 'info').length
                };
            }, makeReviewData(normalBuild));

            if (result.display === 'none') throw new Error('review panel is hidden');
            if (result.infoCount < 1) throw new Error(`expected at least one info note, got ${JSON.stringify(result.notes)}`);
        });

        await runCheck('R2 PSU warning still fires', async () => {
            const result = await page.evaluate((data) => {
                window.renderBuildReviewPanel(data);
                const panel = document.querySelector('#buildReviewPanel');
                const notes = Array.from(panel.querySelectorAll('.build-review-note')).map(note => ({
                    type: note.classList.contains('warning') ? 'warning' : 'info',
                    title: note.querySelector('strong')?.textContent.trim() || '',
                    text: note.textContent.trim()
                }));
                return { notes };
            }, makeReviewData(tightPsuBuild));

            const hasPsuWarning = result.notes.some(note =>
                note.type === 'warning' && note.title === 'PSU headroom is tight'
            );
            if (!hasPsuWarning) throw new Error(`expected PSU warning, got ${JSON.stringify(result.notes)}`);
        });

        await runCheck('R3 freshness badge honest', async () => {
            async function renderTab(tabName, cardSelector) {
                await page.evaluate(async (name) => {
                    window.partsDatabase.switchTab(name);
                    const loadPromise = window.partsDatabase.dataPromises?.[name];
                    if (loadPromise) {
                        await loadPromise.catch(() => {});
                    }
                    window.partsDatabase.renderTabListings(name);
                }, tabName);
                await page.waitForFunction(
                    (selector) => {
                        const card = document.querySelector(selector);
                        return !!card && !!card.querySelector('.gpu-card-price');
                    },
                    { timeout: 30000 },
                    cardSelector
                );
                return page.evaluate((selector) => {
                    const card = document.querySelector(selector);
                    return {
                        badgeCount: card.querySelectorAll('.price-freshness-badge').length,
                        badgeText: card.querySelector('.price-freshness-badge')?.textContent.trim() || '',
                        priceText: card.querySelector('.gpu-card-price')?.textContent.trim() || ''
                    };
                }, cardSelector);
            }

            const gpuTab = await renderTab('gpu', '#gpuProductCard');
            const cpuTab = await renderTab('cpu', '#cpuProductCard');
            const strippedGpu = await page.evaluate((gpu) => {
                window.partsDatabase.switchTab('gpu');
                const withoutTimestampData = { ...gpu };
                delete withoutTimestampData.updatedAt;
                delete withoutTimestampData.lastUpdated;
                delete withoutTimestampData.priceHistory;
                window.partsDatabase._renderGpuProductCard(withoutTimestampData);
                const card = document.querySelector('#gpuProductCard');
                return {
                    badgeCount: card.querySelectorAll('.price-freshness-badge').length,
                    badgeText: card.querySelector('.price-freshness-badge')?.textContent.trim() || '',
                    priceText: card.querySelector('.gpu-card-price')?.textContent.trim() || ''
                };
            }, timestampedGpu);

            if (gpuTab.badgeCount < 1 || !/updated/i.test(gpuTab.badgeText)) {
                throw new Error(`expected rendered GPU tab to show freshness badge, got ${JSON.stringify(gpuTab)}`);
            }
            if (cpuTab.badgeCount < 1 || !/updated/i.test(cpuTab.badgeText)) {
                throw new Error(`expected rendered CPU tab to show freshness badge, got ${JSON.stringify(cpuTab)}`);
            }
            if (strippedGpu.badgeCount !== 0) {
                throw new Error(`expected no freshness badge without timestamp, got ${JSON.stringify(strippedGpu)}`);
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
