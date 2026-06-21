const http = require('http');
const https = require('https');
const puppeteer = require('puppeteer');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const SERVER_TIMEOUT_MS = 30000;
const NAVIGATION_TIMEOUT_MS = 60000;
const APP_TIMEOUT_MS = 60000;
const TAB_TIMEOUT_MS = 30000;
const HTTP_TIMEOUT_MS = 10000;
const TABS = [
    'gpu',
    'cpu',
    'motherboard',
    'ram',
    'psu',
    'cooler',
    'case',
    'storage',
    'addon',
    'builder'
];

function formatError(error) {
    return (error && (error.stack || error.message) ? error.stack || error.message : String(error))
        .replace(/\s*\r?\n\s*/g, ' | ');
}

function requestStatus(url, timeout = HTTP_TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const client = parsed.protocol === 'https:' ? https : http;
        const request = client.get(parsed, response => {
            response.resume();
            response.on('end', () => resolve(response.statusCode));
        });

        request.setTimeout(timeout, () => {
            request.destroy(new Error(`HTTP request timed out after ${timeout}ms: ${url}`));
        });
        request.on('error', reject);
    });
}

async function waitForServer() {
    const deadline = Date.now() + SERVER_TIMEOUT_MS;
    let lastError;

    while (Date.now() < deadline) {
        try {
            const status = await requestStatus(BASE_URL, 3000);
            if (status < 500) return;
            lastError = new Error(`Server returned HTTP ${status}`);
        } catch (error) {
            lastError = error;
        }
        await new Promise(resolve => setTimeout(resolve, 250));
    }

    throw new Error(
        `Server did not become ready at ${BASE_URL} within ${SERVER_TIMEOUT_MS}ms` +
        (lastError ? `: ${lastError.message}` : '')
    );
}

function attachTelemetry(page) {
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', message => {
        if (message.type() !== 'error') return;
        const text = message.text();
        if (!text.startsWith('Failed to load resource')) consoleErrors.push(text);
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
            window.partsDatabase.dataReady &&
            Object.values(window.partsDatabase.dataReady).length > 0,
        { timeout: APP_TIMEOUT_MS }
    );
    await page.waitForFunction(
        () => Object.values(window.partsDatabase.dataReady).every(Boolean),
        { timeout: APP_TIMEOUT_MS }
    );
}

async function settleLayout(page) {
    await page.evaluate(() => new Promise(resolve => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
    }));
}

async function switchToTab(page, tab) {
    const selector = `.main-tab[data-tab="${tab}"]`;
    await page.waitForSelector(selector, { visible: true, timeout: TAB_TIMEOUT_MS });
    await page.click(selector);
    await page.waitForFunction(
        tabName => window.partsDatabase.currentTab === tabName &&
            document.getElementById(`${tabName}-tab`)?.classList.contains('active'),
        { timeout: TAB_TIMEOUT_MS },
        tab
    );
    await settleLayout(page);
}

async function assertNoHorizontalOverflow(page, view) {
    const dimensions = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth
    }));

    if (dimensions.scrollWidth > dimensions.innerWidth + 2) {
        throw new Error(
            `${view} overflowed horizontally: scrollWidth=${dimensions.scrollWidth}, ` +
            `innerWidth=${dimensions.innerWidth}`
        );
    }
}

async function visibleBox(page, selector) {
    return page.$eval(selector, element => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
            width: rect.width,
            height: rect.height,
            display: style.display,
            visibility: style.visibility
        };
    });
}

function assertNonZeroBox(name, box) {
    if (box.width <= 0 || box.height <= 0 || box.display === 'none' || box.visibility === 'hidden') {
        throw new Error(`${name} is not visibly rendered: ${JSON.stringify(box)}`);
    }
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
        await waitForServer();
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        const page = await browser.newPage();
        await page.setViewport({
            width: 390,
            height: 844,
            isMobile: true,
            hasTouch: true
        });
        const { consoleErrors, pageErrors } = attachTelemetry(page);

        await page.goto(BASE_URL, {
            waitUntil: 'networkidle2',
            timeout: NAVIGATION_TIMEOUT_MS
        });
        await waitForApp(page);
        await settleLayout(page);

        await runCheck('M1 no horizontal overflow on load, tabs, and wizard', async () => {
            await assertNoHorizontalOverflow(page, 'initial load');

            for (const tab of TABS) {
                await switchToTab(page, tab);
                await assertNoHorizontalOverflow(page, `${tab} tab`);
            }

            await page.click('#newActionBtn');
            await page.waitForSelector('#budgetModal', { visible: true, timeout: TAB_TIMEOUT_MS });
            await settleLayout(page);
            await assertNoHorizontalOverflow(page, 'wizard view');
            await page.click('#budgetModal .budget-modal-close');
            await page.waitForFunction(
                () => getComputedStyle(document.getElementById('budgetModal')).display === 'none',
                { timeout: TAB_TIMEOUT_MS }
            );
        });

        await runCheck('M2 key mobile controls and component content are rendered', async () => {
            await switchToTab(page, 'builder');
            assertNonZeroBox('tab nav', await visibleBox(page, '.main-nav'));
            assertNonZeroBox('tab control', await visibleBox(page, '.main-tab'));
            assertNonZeroBox('build summary', await visibleBox(page, '.build-summary-box'));

            await switchToTab(page, 'gpu');
            await page.waitForSelector('#gpuFilterResults .compat-only-toggle', {
                visible: true,
                timeout: TAB_TIMEOUT_MS
            });
            await page.waitForFunction(
                () => Array.from(document.querySelectorAll('#gpu-tab .mobo-row, #gpu-tab .gpu-product-card'))
                    .some(element => {
                        const rect = element.getBoundingClientRect();
                        const style = getComputedStyle(element);
                        return rect.width > 0 && rect.height > 0 &&
                            style.display !== 'none' && style.visibility !== 'hidden';
                    }),
                { timeout: TAB_TIMEOUT_MS }
            );
            assertNonZeroBox(
                'compatibility filter',
                await visibleBox(page, '#gpuFilterResults .compat-only-toggle')
            );
        });

        await runCheck('M3 zero uncaught page errors and console errors', async () => {
            if (consoleErrors.length) {
                throw new Error(`console errors=${JSON.stringify(consoleErrors)}`);
            }
            if (pageErrors.length) {
                throw new Error(`page errors=${JSON.stringify(pageErrors)}`);
            }
        });

        await runCheck('M4 mobile.html returns HTTP 404', async () => {
            const status = await requestStatus(new URL('/mobile.html', BASE_URL).toString());
            if (status !== 404) throw new Error(`expected HTTP 404, received ${status}`);
        });

        await page.close();
    } catch (error) {
        console.log(`FAIL setup: ${formatError(error)}`);
        process.exitCode = 1;
    } finally {
        if (browser) await browser.close();
    }

    if (results.some(result => !result.ok)) process.exitCode = 1;
})();
