const puppeteer = require('puppeteer');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

function formatError(error) {
    return (error && (error.stack || error.message) ? error.stack || error.message : String(error))
        .replace(/\s*\r?\n\s*/g, ' | ');
}

(async () => {
    let browser;
    const results = [];
    const pageErrors = [];

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

        const page = await browser.newPage();
        await page.setViewport({ width: 1360, height: 900, deviceScaleFactor: 1 });
        page.on('pageerror', error => pageErrors.push(`PAGE ${error.message}`));
        page.on('console', msg => {
            if (msg.type() === 'error' && !/Failed to load resource: the server responded with a status of 404/.test(msg.text())) {
                pageErrors.push(`CONSOLE ${msg.text()}`);
            }
        });
        page.on('dialog', async dialog => {
            console.log(`DIALOG ${dialog.type()}: ${dialog.message()}`);
            await dialog.accept();
        });

        await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 60000 });
        await page.waitForFunction(() => {
            return window.partsDatabase &&
                typeof window.partsDatabase.switchTab === 'function' &&
                typeof window.partsDatabase.classifyCompatibilityIssues === 'function' &&
                window.partsDatabase.quickStartBuildsReadyPromise &&
                ['ready', 'partial', 'error'].includes(window.partsDatabase.quickStartBuildsStatus);
        }, { timeout: 60000 });

        let loadedPreset = null;

        await runCheck('R1 guides removed', async () => {
            const state = await page.evaluate(async () => {
                const tabNames = Array.from(document.querySelectorAll('.main-tab')).map(tab => tab.dataset.tab);
                const switchErrors = [];
                for (const tabName of tabNames) {
                    try {
                        window.partsDatabase.switchTab(tabName);
                        await new Promise(requestAnimationFrame);
                    } catch (error) {
                        switchErrors.push(`${tabName}:${error.message}`);
                    }
                }
                window.partsDatabase.switchTab('builder');
                return {
                    guidesNav: !!document.querySelector('[data-tab="guides"]'),
                    guidesTab: !!document.querySelector('#guides-tab'),
                    tabNames,
                    switchErrors
                };
            });

            if (state.guidesNav || state.guidesTab) throw new Error(JSON.stringify(state));
            if (!state.tabNames.includes('builder') || state.tabNames.length < 10) throw new Error(`bad tabs ${JSON.stringify(state.tabNames)}`);
            if (state.switchErrors.length) throw new Error(state.switchErrors.join('; '));
            if (pageErrors.length) throw new Error(pageErrors.join('; '));
        });

        await runCheck('R2 wizard launches', async () => {
            await page.evaluate(() => window.partsDatabase.switchTab('builder'));
            const visible = await page.$eval('#builderWizardLaunchBtn', button => {
                const rect = button.getBoundingClientRect();
                const styles = getComputedStyle(button);
                return styles.display !== 'none' && styles.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
            });
            if (!visible) throw new Error('builder wizard button is not visible');

            await page.click('#builderWizardLaunchBtn');
            await page.waitForFunction(() => getComputedStyle(document.querySelector('#budgetModal')).display !== 'none', { timeout: 10000 });
            const modalState = await page.$eval('#budgetModal', modal => getComputedStyle(modal).display);
            if (modalState === 'none') throw new Error('budget modal did not open');
            await page.click('.budget-modal-close');
            await page.waitForFunction(() => getComputedStyle(document.querySelector('#budgetModal')).display === 'none', { timeout: 10000 });
        });

        await runCheck('R3 one collapsed quick-start with 4 clean loadable presets', async () => {
            const initial = await page.evaluate(() => {
                const container = document.querySelector('[data-quick-start-builds]');
                const grid = document.querySelector('#quickStartBuildsGrid');
                const db = window.partsDatabase;
                return {
                    containers: document.querySelectorAll('[data-quick-start-builds]').length,
                    oldStarter: !!document.querySelector('#starterBuildsSection, #starterBuildsGrid'),
                    oldShowcase: !!document.querySelector('#showcaseBuildsSection, #showcaseBuildsGrid'),
                    collapsed: container?.dataset.collapsed || '',
                    hidden: !!grid?.hidden,
                    count: (db.quickStartBuilds || []).length,
                    status: db.quickStartBuildsStatus
                };
            });
            if (initial.containers !== 1 || initial.oldStarter || initial.oldShowcase || initial.collapsed !== 'true' || !initial.hidden || initial.count !== 4 || initial.status !== 'ready') {
                throw new Error(JSON.stringify(initial));
            }

            await page.click('#quickStartToggleBtn');
            loadedPreset = await page.evaluate(() => {
                const db = window.partsDatabase;
                const preset = db.quickStartBuilds[0];
                const original = db.applyBuildData.bind(db);
                db.__refineApplyBuildDataCalls = 0;
                db.applyBuildData = async (...args) => {
                    db.__refineApplyBuildDataCalls += 1;
                    return original(...args);
                };
                return {
                    id: preset.id,
                    buildData: preset.buildData
                };
            });
            await page.click(`[data-quick-start-action="load"][data-quick-start-build-id="${loadedPreset.id}"]`);
            await page.waitForFunction((expected) => {
                const db = window.partsDatabase;
                return db.currentTab === 'builder' &&
                    db.currentBuild.cpu?._id === expected.cpu &&
                    db.currentBuild.gpu?._id === expected.gpu &&
                    db.currentBuild.motherboard?._id === expected.motherboard;
            }, { timeout: 60000 }, loadedPreset.buildData);

            const loaded = await page.evaluate(() => {
                const db = window.partsDatabase;
                const wattageInfo = db.calculateEstimatedWattage();
                const classified = db.classifyCompatibilityIssues(db.currentBuild, wattageInfo);
                return {
                    applyCalls: db.__refineApplyBuildDataCalls || 0,
                    problems: classified.problems.length,
                    warnings: classified.warnings.length,
                    currentTab: db.currentTab
                };
            });
            if (loaded.applyCalls < 1 || loaded.problems !== 0 || loaded.currentTab !== 'builder') throw new Error(JSON.stringify(loaded));
        });

        await runCheck('R4 dock merged and severity intact', async () => {
            const state = await page.evaluate(async () => {
                const db = window.partsDatabase;
                const readDock = () => {
                    const dock = document.querySelector('#buildDock');
                    const status = document.querySelector('#buildDockStatus');
                    const rect = dock?.getBoundingClientRect();
                    const styles = dock ? getComputedStyle(dock) : null;
                    return {
                        exists: !!dock,
                        visible: !!dock && styles.display !== 'none' && styles.visibility !== 'hidden' && rect.width > 0 && rect.height > 0,
                        inNavShell: !!dock?.closest('.main-nav-shell'),
                        hasBuilderButton: !!document.querySelector('#buildDockBuilderBtn'),
                        text: status?.textContent.trim() || '',
                        classes: status ? Array.from(status.classList) : []
                    };
                };
                const applyBuild = (build) => {
                    db.currentBuild = { ...db.currentBuild, ...build };
                    db.updateTotalPrice();
                    db.checkCompatibility();
                    db.updateBuildDock();
                    const wattageInfo = db.calculateEstimatedWattage();
                    const classified = db.classifyCompatibilityIssues(db.currentBuild, wattageInfo);
                    return { dock: readDock(), classified: { problems: classified.problems.length, warnings: classified.warnings.length } };
                };

                const cleanBuild = { ...db.currentBuild };
                const clean = applyBuild(cleanBuild);
                const mismatchMb = (db.allMotherboards || []).find(mb => {
                    const mbSocket = mb.socket || mb.socketType;
                    const cpuSocket = cleanBuild.cpu?.socket || cleanBuild.cpu?.socketType;
                    return mbSocket && cpuSocket && String(mbSocket).toUpperCase() !== String(cpuSocket).toUpperCase();
                });
                const problem = mismatchMb ? applyBuild({ ...cleanBuild, motherboard: mismatchMb }) : null;

                let warning = null;
                for (const psu of db.allPSUs || []) {
                    const candidate = { ...cleanBuild, psu };
                    db.currentBuild = candidate;
                    const wattageInfo = db.calculateEstimatedWattage();
                    const classified = db.classifyCompatibilityIssues(candidate, wattageInfo);
                    if (classified.problems.length === 0 && classified.warnings.length > 0) {
                        warning = applyBuild(candidate);
                        break;
                    }
                }

                db.currentBuild = cleanBuild;
                db.updateTotalPrice();
                db.checkCompatibility();
                db.updateBuildDock();

                return { clean, problem, warning };
            });

            if (!state.clean.dock.exists || !state.clean.dock.visible || !state.clean.dock.inNavShell || state.clean.dock.hasBuilderButton) throw new Error(JSON.stringify(state.clean));
            if (state.clean.classified.problems !== 0 || state.clean.classified.warnings !== 0 || !state.clean.dock.classes.includes('ok')) throw new Error(`clean failed ${JSON.stringify(state.clean)}`);
            if (!state.problem || state.problem.classified.problems < 1 || !state.problem.dock.classes.includes('problem')) throw new Error(`problem failed ${JSON.stringify(state.problem)}`);
            if (!state.warning || state.warning.classified.warnings < 1 || !state.warning.dock.classes.includes('warning')) throw new Error(`warning failed ${JSON.stringify(state.warning)}`);
        });

        await runCheck('R5 change-component scroll anchor', async () => {
            await page.evaluate(() => window.partsDatabase.switchTab('builder'));
            await page.click('#selectedBuilderGpu .swap-component-btn');
            await page.waitForFunction(() => window.partsDatabase.currentTab === 'gpu' && document.querySelector('#gpu-tab')?.classList.contains('active'), { timeout: 10000 });
            await page.waitForFunction(() => {
                const target = window.partsDatabase.getComponentSelectionAnchor('gpu');
                if (!target) return false;
                const top = target.getBoundingClientRect().top;
                return top >= 0 && top <= 150;
            }, { timeout: 10000 });
        });

        await runCheck('R6 selected card detail and 4:3 shape', async () => {
            await page.evaluate(() => window.partsDatabase.switchTab('builder'));
            const card = await page.evaluate(() => {
                const selected = document.querySelector('#selectedBuilderGpu');
                const cardEl = selected?.querySelector('.builder-component-card');
                const rect = cardEl?.getBoundingClientRect();
                return {
                    exists: !!cardEl,
                    details: selected ? selected.querySelectorAll('.builder-component-detail-grid dd').length : 0,
                    emptySlotDetails: document.querySelector('#builderAddonSelectBtn')?.querySelectorAll('.builder-component-detail-grid dd').length || 0,
                    width: rect?.width || 0,
                    height: rect?.height || 0,
                    ratio: rect && rect.height ? rect.width / rect.height : 0
                };
            });
            if (!card.exists || card.details < 3 || card.emptySlotDetails !== 0 || card.ratio < 1.1 || card.ratio > 1.6) throw new Error(JSON.stringify(card));
        });

        await runCheck('R7 balance meter survives', async () => {
            const meter = await page.evaluate(() => {
                const db = window.partsDatabase;
                db.updateBuildBalanceMeter();
                const el = document.querySelector('[data-balance-meter]');
                return {
                    exists: !!el,
                    state: el?.dataset.balanceState || '',
                    label: el?.dataset.balanceLabel || '',
                    cpuScore: el?.dataset.cpuScore || '',
                    gpuScore: el?.dataset.gpuScore || '',
                    ratio: el?.dataset.balanceRatio || ''
                };
            });
            if (!meter.exists || !meter.state || meter.state === 'incomplete' || !meter.cpuScore || !meter.gpuScore) throw new Error(JSON.stringify(meter));
        });
    } catch (error) {
        console.log(`FAIL setup: ${formatError(error)}`);
        process.exitCode = 1;
    } finally {
        if (browser) await browser.close();
    }

    if (results.some(result => !result.ok)) {
        process.exitCode = 1;
    }
})();
