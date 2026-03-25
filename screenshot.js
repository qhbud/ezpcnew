const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));

    const clicked = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const selectBtn = btns.find(b => b.textContent.trim().toLowerCase().includes('select'));
        if (selectBtn) { selectBtn.click(); return true; }
        return false;
    });
    console.log('Clicked select button:', clicked);
    await new Promise(r => setTimeout(r, 4000));
    await page.screenshot({ path: '/tmp/ezpc_modal.png' });
    console.log('Done');
    await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
