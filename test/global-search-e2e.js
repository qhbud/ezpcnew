const puppeteer = require('puppeteer');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

function formatError(error) {
    return (error && (error.stack || error.message) ? error.stack || error.message : String(error))
        .replace(/\s*\r?\n\s*/g, ' | ');
}

async function replaceSearch(page, query) {
    await page.$eval('#globalSearchInput', (input, value) => {
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
    }, query);
}

async function waitForSearchResults(page, query) {
    await page.waitForFunction(
        expectedQuery => {
            const panel = document.getElementById('globalSearchPanel');
            return panel && !panel.hidden && panel.dataset.query === expectedQuery &&
                (panel.querySelector('.global-search-result') ||
                    panel.querySelector('.global-search-empty') ||
                    panel.querySelector('.global-search-error'));
        },
        { timeout: 15000 },
        query
    );
}

async function readRenderedResults(page) {
    return page.$$eval('.global-search-result', rows => rows.map(row => ({
        name: row.querySelector('.global-search-result-name')?.textContent.trim() || '',
        category: row.querySelector('.global-search-result-category')?.textContent.trim() || '',
        price: row.querySelector('.global-search-result-price')?.textContent.trim() || ''
    })));
}

(async () => {
    const results = [];
    const consoleErrors = [];
    const pageErrors = [];
    let browser;
    let page;
    let selectedQuery;
    let sampleRows = [];
    let globalPartsRequests = 0;

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
        page = await browser.newPage();
        page.on('request', request => {
            const url = new URL(request.url());
            if (url.pathname === '/api/parts' && !url.search) globalPartsRequests += 1;
        });
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
                typeof window.partsDatabase.runGlobalSearch === 'function' &&
                typeof window.partsDatabase.locateGlobalSearchPart === 'function',
            { timeout: 30000 }
        );

        await runCheck('G3.1 cross-category results include name, category, and price', async () => {
            await replaceSearch(page, 'a');
            await waitForSearchResults(page, 'a');
            await page.waitForFunction(
                () => Array.isArray(window.partsDatabase.globalSearchParts) &&
                    window.partsDatabase.globalSearchParts.length > 0,
                { timeout: 15000 }
            );

            const candidates = await page.evaluate(() => {
                const db = window.partsDatabase;
                const tokens = new Map();
                db.globalSearchParts.forEach(part => {
                    const name = db.getGlobalSearchName(part).toLowerCase();
                    const category = String(part.category || '');
                    new Set(name.match(/[a-z0-9]{4,}/g) || []).forEach(token => {
                        const entry = tokens.get(token) || { categories: new Set(), count: 0 };
                        entry.categories.add(category);
                        entry.count += 1;
                        tokens.set(token, entry);
                    });
                });
                return Array.from(tokens.entries())
                    .filter(([, entry]) => entry.categories.size >= 2 && entry.count <= 25)
                    .sort((left, right) =>
                        right[1].categories.size - left[1].categories.size ||
                        left[1].count - right[1].count)
                    .slice(0, 40)
                    .map(([token]) => token);
            });

            for (const candidate of candidates) {
                await replaceSearch(page, candidate);
                await waitForSearchResults(page, candidate);
                const rendered = await readRenderedResults(page);
                if (new Set(rendered.map(row => row.category)).size >= 2) {
                    selectedQuery = candidate;
                    const sampledCategories = new Set();
                    sampleRows = rendered.filter(row => {
                        if (sampledCategories.has(row.category)) return false;
                        sampledCategories.add(row.category);
                        return true;
                    }).slice(0, 2);
                    break;
                }
            }

            if (!selectedQuery) throw new Error('No live query produced rendered results from two categories');
            const rendered = await readRenderedResults(page);
            const categories = new Set(rendered.map(row => row.category));
            if (categories.size < 2) throw new Error(`Expected at least 2 categories, got ${categories.size}`);
            if (rendered.some(row => !row.name || !row.category || !/^\$\d+\.\d{2}$/.test(row.price))) {
                throw new Error(`Incomplete rendered result: ${JSON.stringify(rendered)}`);
            }
        });

        await runCheck('G3.2 substring matching is case-insensitive and cached', async () => {
            if (!selectedQuery) throw new Error('Cross-category query was not established');

            await replaceSearch(page, selectedQuery.toLowerCase());
            await waitForSearchResults(page, selectedQuery.toLowerCase());
            const lowerRows = await readRenderedResults(page);
            const expectedName = lowerRows[0]?.name;
            if (!expectedName) throw new Error('Lowercase query returned no product');

            await replaceSearch(page, selectedQuery.toUpperCase());
            await waitForSearchResults(page, selectedQuery.toUpperCase());
            const upperRows = await readRenderedResults(page);
            if (!upperRows.some(row => row.name === expectedName)) {
                throw new Error(`Uppercase query omitted "${expectedName}"`);
            }
            if (globalPartsRequests !== 1) {
                throw new Error(`Expected one /api/parts request, observed ${globalPartsRequests}`);
            }

            const escaped = await page.evaluate(() => {
                const db = window.partsDatabase;
                const title = '<img src=x onerror=\"window.__globalSearchInjected=true\"> & \"quoted\"';
                window.__globalSearchInjected = false;
                db.renderGlobalSearchResults([{ title, category: 'cpus', currentPrice: 123.45 }]);
                return {
                    text: document.querySelector('.global-search-result-name')?.textContent || '',
                    injected: window.__globalSearchInjected,
                    imageCount: document.querySelectorAll('#globalSearchPanel img').length,
                    expected: title
                };
            });
            if (escaped.text !== escaped.expected || escaped.injected || escaped.imageCount !== 0) {
                throw new Error(`Result escaping failed: ${JSON.stringify(escaped)}`);
            }

            await replaceSearch(page, selectedQuery.toUpperCase());
            await waitForSearchResults(page, selectedQuery.toUpperCase());
        });

        await runCheck('G3.3 click activates the category and locates without selecting', async () => {
            const target = await page.evaluate(() => {
                const db = window.partsDatabase;
                const rows = Array.from(document.querySelectorAll('.global-search-result'));
                const index = rows.findIndex((row, rowIndex) => {
                    const part = db.globalSearchVisibleResults[rowIndex];
                    return part && String(part.category).toLowerCase() !== 'storages';
                });
                if (index < 0) throw new Error('No non-storage rendered result available');
                const part = db.globalSearchVisibleResults[index];
                const config = db.getGlobalSearchCategoryConfig(part.category);
                return {
                    index,
                    tab: config.tab,
                    partId: db.getPartId(part),
                    build: Object.fromEntries(Object.entries(db.currentBuild || {}).map(([slot, component]) => [
                        slot,
                        component
                            ? String(component._id || component.id || component.asin || component.title || component.name || '')
                            : null
                    ]))
                };
            });

            await page.evaluate(index => {
                document.querySelectorAll('.global-search-result')[index].click();
            }, target.index);

            await page.waitForFunction(
                ({ tab, partId }) => {
                    const active = document.querySelector(`.main-tab[data-tab="${tab}"]`)?.classList.contains('active');
                    const located = document.querySelector(`#${tab}-tab .global-search-located`);
                    return active && located &&
                        (located.dataset.id === partId || located.dataset.globalSearchPartId === partId);
                },
                { timeout: 45000 },
                { tab: target.tab, partId: target.partId }
            );

            const after = await page.evaluate(() => Object.fromEntries(
                Object.entries(window.partsDatabase.currentBuild || {}).map(([slot, component]) => [
                    slot,
                    component
                        ? String(component._id || component.id || component.asin || component.title || component.name || '')
                        : null
                ])
            ));
            if (JSON.stringify(after) !== JSON.stringify(target.build)) {
                throw new Error('Search-result click modified currentBuild');
            }

            const storageTarget = await page.evaluate(() => {
                const db = window.partsDatabase;
                const part = db.globalSearchParts.find(candidate =>
                    String(candidate.category || '').toLowerCase() === 'storages' &&
                    db.getGlobalSearchName(candidate)
                );
                if (!part) throw new Error('No storage search part available');
                return {
                    query: db.getGlobalSearchName(part),
                    partId: db.getPartId(part)
                };
            });
            await replaceSearch(page, storageTarget.query);
            await waitForSearchResults(page, storageTarget.query);
            const storageIndex = await page.evaluate(partId => {
                const db = window.partsDatabase;
                return db.globalSearchVisibleResults.findIndex(part =>
                    String(part.category || '').toLowerCase() === 'storages' &&
                    db.getPartId(part) === partId
                );
            }, storageTarget.partId);
            if (storageIndex < 0) throw new Error('Storage target was not rendered');
            await page.evaluate(index => {
                document.querySelectorAll('.global-search-result')[index].click();
            }, storageIndex);
            await page.waitForFunction(
                partId => {
                    const active = document.querySelector('.main-tab[data-tab="storage"]')?.classList.contains('active');
                    const located = document.querySelector('#storageProductCard.global-search-located');
                    return active && located?.dataset.globalSearchPartId === partId;
                },
                { timeout: 45000 },
                storageTarget.partId
            );
        });

        await runCheck('G3.4 no-match, clear, Escape, and pre-load paths are guarded', async () => {
            await replaceSearch(page, 'zzzz-no-component-can-match-987654321');
            await page.waitForFunction(
                () => {
                    const panel = document.getElementById('globalSearchPanel');
                    return panel && !panel.hidden &&
                        /no components found/i.test(panel.textContent || '');
                },
                { timeout: 15000 }
            );

            await replaceSearch(page, '');
            const cleared = await page.$eval('#globalSearchPanel', panel => ({
                hidden: panel.hidden,
                childCount: panel.childElementCount
            }));
            if (!cleared.hidden || cleared.childCount !== 0) {
                throw new Error(`Clearing did not close the panel: ${JSON.stringify(cleared)}`);
            }

            await replaceSearch(page, selectedQuery);
            await waitForSearchResults(page, selectedQuery);
            await page.focus('#globalSearchInput');
            await page.keyboard.press('Escape');
            const escaped = await page.evaluate(() => ({
                value: document.getElementById('globalSearchInput')?.value,
                hidden: document.getElementById('globalSearchPanel')?.hidden,
                childCount: document.getElementById('globalSearchPanel')?.childElementCount
            }));
            if (escaped.value !== '' || !escaped.hidden || escaped.childCount !== 0) {
                throw new Error(`Escape did not clear and close: ${JSON.stringify(escaped)}`);
            }

            const preloadErrors = [];
            const preloadPage = await browser.newPage();
            preloadPage.on('pageerror', error => preloadErrors.push(error.message || String(error)));
            await preloadPage.setRequestInterception(true);
            preloadPage.on('request', async request => {
                const url = new URL(request.url());
                if (url.pathname === '/api/parts' && !url.search) {
                    await new Promise(resolve => setTimeout(resolve, 700));
                }
                request.continue();
            });
            await preloadPage.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 60000 });
            await preloadPage.waitForSelector('#globalSearchInput', { timeout: 30000 });
            await replaceSearch(preloadPage, selectedQuery);
            await preloadPage.waitForFunction(
                () => {
                    const panel = document.getElementById('globalSearchPanel');
                    return panel && !panel.hidden && /searching components/i.test(panel.textContent || '');
                },
                { timeout: 3000 }
            );
            await waitForSearchResults(preloadPage, selectedQuery);
            await preloadPage.close();

            if (preloadErrors.length || consoleErrors.length || pageErrors.length) {
                throw new Error(
                    `preload=${JSON.stringify(preloadErrors)}, console=${JSON.stringify(consoleErrors)}, page=${JSON.stringify(pageErrors)}`
                );
            }
        });

        sampleRows.forEach(row => {
            console.log(`SAMPLE ${row.name} | ${row.category} | ${row.price}`);
        });
    } catch (error) {
        console.log(`FAIL setup: ${formatError(error)}`);
        process.exitCode = 1;
    } finally {
        if (browser) await browser.close();
    }

    if (results.some(result => !result.ok)) process.exitCode = 1;
})();
