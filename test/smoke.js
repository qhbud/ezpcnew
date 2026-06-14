const puppeteer = require('puppeteer');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const WAIT_AFTER_TAB_MS = 1500;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
    const consoleErrors = [];
    const pageErrors = [];
    let browser;

    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        const page = await browser.newPage();

        page.on('console', msg => {
            if (msg.type() !== 'error') return;

            const text = msg.text();
            if (text.startsWith('Failed to load resource')) return;

            consoleErrors.push(text);
        });

        page.on('pageerror', error => {
            pageErrors.push(error.stack || error.message || String(error));
        });

        await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 60000 });
        await sleep(WAIT_AFTER_TAB_MS);

        for (const tab of ['gpu', 'cpu']) {
            await page.click(`[data-tab="${tab}"]`);
            await sleep(WAIT_AFTER_TAB_MS);
        }
    } catch (error) {
        pageErrors.push(error.stack || error.message || String(error));
    } finally {
        if (browser) {
            await browser.close();
        }
    }

    console.log(`CONSOLE ERRORS: ${consoleErrors.length}`);
    consoleErrors.forEach(text => console.log(text));
    console.log(`PAGE ERRORS: ${pageErrors.length}`);
    pageErrors.forEach(text => console.log(text));

    process.exit(consoleErrors.length + pageErrors.length > 0 ? 1 : 0);
})();
