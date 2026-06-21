const puppeteer = require('puppeteer');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

function formatError(error) {
    return (error && (error.stack || error.message) ? error.stack || error.message : String(error))
        .replace(/\s*\r?\n\s*/g, ' | ');
}

function makeBuild() {
    return {
        gpu: null,
        cpu: null,
        motherboard: null,
        ram: null,
        cooler: null,
        psu: null,
        storage: null,
        storage2: null,
        storage3: null,
        storage4: null,
        storage5: null,
        storage6: null,
        case: null,
        addon: null,
        addon2: null,
        addon3: null,
        addon4: null,
        addon5: null,
        addon6: null
    };
}

function countMatches(text, pattern) {
    return (text.match(pattern) || []).length;
}

function shortSample(text, leadingLines) {
    const lines = text.split('\n');
    return [...lines.slice(0, leadingLines), ...lines.slice(-5)].join('\n');
}

(async () => {
    const results = [];
    const consoleErrors = [];
    const pageErrors = [];
    let browser;
    let page;
    let buildSnapshot;
    let outputs;

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
                typeof window.partsDatabase.openExportList === 'function' &&
                typeof window.partsDatabase.generateBuildExportFormats === 'function',
            { timeout: 30000 }
        );

        await runCheck('E1 generates all formats from a real assembled build', async () => {
            buildSnapshot = await page.evaluate(async buildTemplate => {
                const response = await fetch('/api/parts');
                if (!response.ok) throw new Error(`/api/parts returned ${response.status}`);
                const parts = await response.json();
                if (!Array.isArray(parts) || parts.length === 0) {
                    throw new Error('/api/parts returned no real parts');
                }

                const definitions = [
                    { slot: 'cpu', categories: ['cpus', 'cpu'] },
                    { slot: 'gpu', categories: ['gpus', 'gpu'] },
                    { slot: 'motherboard', categories: ['motherboards', 'motherboard'] },
                    { slot: 'ram', categories: ['rams', 'ram'] },
                    { slot: 'storage', categories: ['storages', 'storage'] },
                    { slot: 'psu', categories: ['psus', 'psu'] },
                    { slot: 'case', categories: ['cases', 'case'] },
                    { slot: 'cooler', categories: ['coolers', 'cooler'] }
                ];
                const getName = part => String(part?.title || part?.name || '');
                const getPrice = part => Number.parseFloat(
                    part?.salePrice || part?.currentPrice || part?.basePrice || part?.price
                );
                const hasLink = part => Boolean(part?.sourceUrl || part?.url);
                const build = { ...buildTemplate };

                definitions.forEach(definition => {
                    const candidates = parts
                        .filter(part => definition.categories.includes(String(part.category || '').toLowerCase()))
                        .filter(part => getName(part) && Number.isFinite(getPrice(part)))
                        .filter(part => !/[\[\]|\r\n]/.test(getName(part)))
                        .sort((left, right) => Number(hasLink(right)) - Number(hasLink(left)));
                    if (candidates[0]) build[definition.slot] = candidates[0];
                });

                const selected = Object.entries(build).filter(([, component]) => component);
                if (selected.length < 3) {
                    throw new Error(`Expected at least 3 real component categories, found ${selected.length}`);
                }
                if (!selected.some(([, component]) => hasLink(component))) {
                    throw new Error('Could not assemble a real build containing a component link');
                }

                const db = window.partsDatabase;
                db.currentBuild = build;
                db.updateTotalPrice();
                db.updateBuildActions();
                const exportData = db.getExportBuildData();

                return {
                    names: exportData.rows.map(row => row.name),
                    prices: exportData.rows
                        .filter(row => Number.isFinite(row.price))
                        .map(row => row.formattedPrice),
                    formattedTotal: exportData.formattedTotal,
                    wattage: exportData.wattage,
                    linkedRows: exportData.rows.filter(row => row.link).length,
                    selectedCount: exportData.rows.length
                };
            }, makeBuild());

            await page.click('#exportBuildBtn');
            await page.waitForFunction(
                () => document.getElementById('exportListModal')?.style.display === 'flex' &&
                    document.getElementById('exportListOutput')?.value.length > 0,
                { timeout: 10000 }
            );

            outputs = {};
            for (const format of ['markdown', 'plain', 'bbcode']) {
                await page.click(`[data-export-format="${format}"]`);
                await page.waitForFunction(
                    selectedFormat => document.querySelector(`[data-export-format="${selectedFormat}"]`)
                        ?.getAttribute('aria-selected') === 'true',
                    { timeout: 5000 },
                    format
                );
                outputs[format] = await page.$eval('#exportListOutput', output => output.value);
            }

            for (const [format, text] of Object.entries(outputs)) {
                if (!text) throw new Error(`${format} output was empty`);
                for (const name of buildSnapshot.names) {
                    if (!text.includes(name)) throw new Error(`${format} omitted component "${name}"`);
                }
                for (const price of buildSnapshot.prices) {
                    if (!text.includes(price)) throw new Error(`${format} omitted component price ${price}`);
                }
                if (!text.includes(buildSnapshot.formattedTotal)) {
                    throw new Error(`${format} omitted total ${buildSnapshot.formattedTotal}`);
                }
                if (!text.includes(`${buildSnapshot.wattage}W`)) {
                    throw new Error(`${format} omitted wattage ${buildSnapshot.wattage}W`);
                }
            }
        });

        await runCheck('E2 formats are distinct, escaped, linked, and well formed', async () => {
            if (!outputs) throw new Error('format outputs were not generated');
            if (new Set(Object.values(outputs)).size !== 3) {
                throw new Error('format outputs were not pairwise distinct');
            }
            if (!/\|\s*Slot\s*\|\s*Component\s*\|\s*Price\s*\|/.test(outputs.markdown) ||
                !/^\|\s*---\s*\|\s*---\s*\|\s*---:?\s*\|/m.test(outputs.markdown)) {
                throw new Error('Markdown table header or separator was malformed');
            }
            if (countMatches(outputs.bbcode, /\[b\]/g) !== countMatches(outputs.bbcode, /\[\/b\]/g) ||
                countMatches(outputs.bbcode, /\[url=/g) !== countMatches(outputs.bbcode, /\[\/url\]/g)) {
                throw new Error('BBCode tags were unbalanced');
            }
            if (!/\[b\].+\[\/b\]/s.test(outputs.bbcode)) {
                throw new Error('BBCode output contained no bold tags');
            }
            if (/\|\s*Slot\s*\|/.test(outputs.plain) || /\[(?:b|\/b|url=|\/url)/i.test(outputs.plain)) {
                throw new Error('Plain text contained Markdown table or BBCode syntax');
            }
            if (buildSnapshot.linkedRows < 1) throw new Error('real build contained no linked rows');
            for (const text of Object.values(outputs)) {
                if (!text.includes('qhezpc-20')) throw new Error('affiliate tag was missing');
            }

            const escaped = await page.evaluate(buildTemplate => {
                const db = window.partsDatabase;
                const originalBuild = db.currentBuild;
                const component = Object.values(originalBuild).find(Boolean);
                const escapedComponent = {
                    ...component,
                    title: 'Example | Part [Forum Edition]'
                };
                db.currentBuild = { ...buildTemplate, cpu: escapedComponent };
                const formats = db.generateBuildExportFormats();
                db.currentBuild = originalBuild;
                return formats;
            }, makeBuild());

            if (!escaped.markdown.includes('Example \\| Part \\[Forum Edition\\]')) {
                throw new Error('Markdown component name was not escaped');
            }
            if (!escaped.bbcode.includes('Example | Part &#91;Forum Edition&#93;')) {
                throw new Error('BBCode component name was not escaped');
            }
        });

        await runCheck('E3 copy uses the active format exactly and shows feedback', async () => {
            await page.evaluate(() => {
                window.__exportCopiedText = null;
                Object.defineProperty(navigator, 'clipboard', {
                    configurable: true,
                    value: {
                        writeText: async text => {
                            window.__exportCopiedText = text;
                        }
                    }
                });
            });
            await page.click('[data-export-format="bbcode"]');
            const activeText = await page.$eval('#exportListOutput', output => output.value);
            await page.click('#copyExportListBtn');
            await page.waitForFunction(
                expected => window.__exportCopiedText === expected,
                { timeout: 5000 },
                activeText
            );
            const feedback = await page.$eval('#ezpcToast', toast => ({
                text: toast.textContent,
                visible: toast.classList.contains('show')
            }));
            if (!feedback.visible || !/copied/i.test(feedback.text)) {
                throw new Error(`copy feedback was missing: ${JSON.stringify(feedback)}`);
            }
        });

        await runCheck('E4 empty build is guarded and every output includes FTC disclosure', async () => {
            for (const text of Object.values(outputs || {})) {
                if (!/affiliate|As an Amazon|qualifying purchases/i.test(text)) {
                    throw new Error('FTC affiliate disclosure was missing');
                }
            }

            const emptyState = await page.evaluate(buildTemplate => {
                const db = window.partsDatabase;
                db.closeExportList();
                db.currentBuild = { ...buildTemplate };
                db.updateTotalPrice();
                db.updateBuildActions();
                const opened = db.openExportList();
                return {
                    opened,
                    disabled: document.getElementById('exportBuildBtn')?.disabled,
                    modalDisplay: document.getElementById('exportListModal')?.style.display,
                    toast: document.getElementById('ezpcToast')?.textContent || ''
                };
            }, makeBuild());

            if (emptyState.opened !== false || emptyState.disabled !== true ||
                emptyState.modalDisplay !== 'none' || !/add components first/i.test(emptyState.toast)) {
                throw new Error(`empty-build guard failed: ${JSON.stringify(emptyState)}`);
            }
            if (consoleErrors.length || pageErrors.length) {
                throw new Error(
                    `console errors=${JSON.stringify(consoleErrors)}, page errors=${JSON.stringify(pageErrors)}`
                );
            }
        });

        if (outputs) {
            console.log('SAMPLE MARKDOWN');
            console.log(shortSample(outputs.markdown, 3));
            console.log('SAMPLE PLAIN TEXT');
            console.log(shortSample(outputs.plain, 1));
            console.log('SAMPLE BBCODE');
            console.log(shortSample(outputs.bbcode, 2));
        }
    } catch (error) {
        console.log(`FAIL setup: ${formatError(error)}`);
        process.exitCode = 1;
    } finally {
        if (browser) await browser.close();
    }

    if (results.some(result => !result.ok)) process.exitCode = 1;
})();
