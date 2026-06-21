const puppeteer = require('puppeteer');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const COMPONENT_TABS = [
    'gpu',
    'cpu',
    'motherboard',
    'ram',
    'psu',
    'cooler',
    'case',
    'storage',
    'addon'
];

function formatError(error) {
    return (error && (error.stack || error.message) ? error.stack || error.message : String(error))
        .replace(/\s*\r?\n\s*/g, ' | ');
}

function isBenignConsoleError(text) {
    return text.startsWith('Failed to load resource');
}

function attachTelemetry(page) {
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', message => {
        if (message.type() !== 'error') return;
        const text = message.text();
        if (!isBenignConsoleError(text)) consoleErrors.push(text);
    });
    page.on('pageerror', error => {
        pageErrors.push(error.stack || error.message || String(error));
    });

    return { consoleErrors, pageErrors };
}

async function waitForApp(page) {
    await page.waitForFunction(
        () => window.partsDatabase &&
            typeof window.partsDatabase.switchTab === 'function' &&
            typeof window.partsDatabase.showLoading === 'function' &&
            typeof window.partsDatabase._renderTabList === 'function',
        { timeout: 30000 }
    );
    await page.waitForFunction(
        () => Object.values(window.partsDatabase.dataReady || {}).every(Boolean),
        { timeout: 60000 }
    );
}

async function openPage(browser, options = {}) {
    const page = await browser.newPage();
    const telemetry = attachTelemetry(page);

    if (options.abortPath) {
        await page.setRequestInterception(true);
        page.on('request', request => {
            const url = new URL(request.url());
            if (url.pathname === options.abortPath) {
                request.abort('failed');
            } else {
                request.continue();
            }
        });
    }

    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    await waitForApp(page);
    return { page, ...telemetry };
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
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        await runCheck('R1 cold load clean and every component tab switches safely', async () => {
            const { page, consoleErrors, pageErrors } = await openPage(browser);
            try {
                for (const tab of COMPONENT_TABS) {
                    await page.click(`.main-tab[data-tab="${tab}"]`);
                    await page.waitForFunction(
                        tabName => window.partsDatabase.currentTab === tabName &&
                            document.getElementById(`${tabName}-tab`)?.classList.contains('active'),
                        { timeout: 10000 },
                        tab
                    );
                }

                const loadingHidden = await page.$eval(
                    '#loading',
                    element => element.classList.contains('hidden')
                );
                if (!loadingHidden) throw new Error('#loading remained visible after cold load');
                if (consoleErrors.length) {
                    throw new Error(`console errors=${JSON.stringify(consoleErrors)}`);
                }
                if (pageErrors.length) {
                    throw new Error(`page errors=${JSON.stringify(pageErrors)}`);
                }
            } finally {
                await page.close();
            }
        });

        await runCheck('R2 failed storage fetch shows an error and leaves CPU usable', async () => {
            const { page, pageErrors } = await openPage(browser, {
                abortPath: '/api/parts/storages'
            });
            try {
                await page.click('.main-tab[data-tab="storage"]');
                await page.waitForFunction(
                    () => {
                        const error = document.getElementById('error');
                        if (!error) return false;
                        const style = getComputedStyle(error);
                        return !error.classList.contains('hidden') &&
                            style.display !== 'none' &&
                            style.visibility !== 'hidden' &&
                            error.textContent.trim().length > 10;
                    },
                    { timeout: 10000 }
                );

                await page.click('.main-tab[data-tab="cpu"]');
                await page.waitForSelector('#cpuFilterResults .mobo-row', { timeout: 45000 });

                const cpuRows = await page.$$eval(
                    '#cpuFilterResults .mobo-row',
                    rows => rows.length
                );
                if (cpuRows < 1) throw new Error('non-aborted CPU category rendered no rows');
                if (pageErrors.length) {
                    throw new Error(`page errors=${JSON.stringify(pageErrors)}`);
                }
            } finally {
                await page.close();
            }
        });

        await runCheck('R3 state helpers are null-safe when shared elements are absent', async () => {
            const { page, pageErrors } = await openPage(browser);
            try {
                const callsCompleted = await page.evaluate(() => {
                    document.getElementById('loading')?.remove();
                    document.getElementById('error')?.remove();
                    const db = window.partsDatabase;
                    db.showLoading();
                    db.hideLoading();
                    db.showError();
                    db.hideError();
                    return true;
                });

                if (!callsCompleted) throw new Error('state helper calls did not complete');
                if (pageErrors.length) {
                    throw new Error(`page errors=${JSON.stringify(pageErrors)}`);
                }
            } finally {
                await page.close();
            }
        });

        await runCheck('R4 zero-item component list shows a readable empty notice', async () => {
            const { page, pageErrors } = await openPage(browser);
            try {
                const emptyState = await page.evaluate(() => {
                    const db = window.partsDatabase;
                    const originalItems = db._tabItems && db._tabItems.case;
                    db._renderTabList('case', []);

                    const results = document.getElementById('caseFilterResults');
                    const notice = results?.querySelector('.mobo-results-empty');
                    const snapshot = {
                        text: notice?.textContent.trim() || '',
                        rows: results?.querySelectorAll('.mobo-row').length || 0
                    };

                    db._renderTabList('case', originalItems || db.allCases || []);
                    return snapshot;
                });

                if (emptyState.rows !== 0) {
                    throw new Error(`expected zero rows, got ${emptyState.rows}`);
                }
                if (emptyState.text.length < 10 || !/no .+(available|match)/i.test(emptyState.text)) {
                    throw new Error(`unexpected empty notice "${emptyState.text}"`);
                }
                if (pageErrors.length) {
                    throw new Error(`page errors=${JSON.stringify(pageErrors)}`);
                }
            } finally {
                await page.close();
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
