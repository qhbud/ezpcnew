const puppeteer = require('puppeteer');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const CONNECTOR_PATTERN = /12VHPWR|12V-2x6|ATX 3\.[01]|high-power.*connector/i;
const BIOS_PATTERN = /BIOS update|POST|BIOS Flashback/i;

async function getParts(category) {
    const response = await fetch(`${BASE_URL}/api/parts/${category}?groupByModel=false`);
    if (!response.ok) throw new Error(`Failed to fetch ${category}: ${response.status}`);
    const data = await response.json();
    return Array.isArray(data) ? data : (data.parts || data.data || []);
}

function getText(issue) {
    return `${issue?.title || ''} ${issue?.detail || ''}`.trim();
}

function hasMatchingIssue(issues, pattern) {
    return Array.isArray(issues) && issues.some(issue => pattern.test(getText(issue)));
}

function findWarning(result, pattern) {
    return Array.isArray(result?.warnings)
        ? result.warnings.find(issue => pattern.test(getText(issue)))
        : undefined;
}

function makeBuild(overrides) {
    return {
        gpu: null,
        cpu: null,
        motherboard: null,
        ram: null,
        cooler: null,
        psu: null,
        storage: null,
        case: null,
        addon: null,
        addon2: null,
        addon3: null,
        addon4: null,
        addon5: null,
        addon6: null,
        ...overrides
    };
}

function makeResultRecorder(results) {
    return (name, failure) => {
        if (failure) {
            results.push({ name, ok: false, detail: failure });
            console.log(`FAIL ${name}: ${failure}`);
            return;
        }

        results.push({ name, ok: true });
        console.log(`PASS ${name}`);
    };
}

(async () => {
    const results = [];
    const record = makeResultRecorder(results);
    let browser;

    try {
        const [gpus, cpus, motherboards] = await Promise.all([
            getParts('gpus'),
            getParts('cpus'),
            getParts('motherboards')
        ]);

        const highPowerGpu = {
            ...(gpus.find(gpu => Number(gpu.tdp) >= 300) || { name: 'Stub 300W GPU' }),
            tdp: 300
        };
        const lowerPowerGpu = {
            ...(gpus.find(gpu => Number(gpu.tdp) > 0 && Number(gpu.tdp) < 300) ||
                { name: 'Stub 200W GPU' }),
            tdp: 200
        };
        const ryzen9000Cpu = cpus.find(cpu =>
            String(cpu.socket || '').toUpperCase() === 'AM5' &&
            /\bRyzen\s+\d\s+9\d{3}(?!\d)/i.test(cpu.name || cpu.title || '')
        ) || { name: 'AMD Ryzen 7 9700X', socket: 'AM5' };
        const nonRyzen9000Cpu = cpus.find(cpu =>
            String(cpu.socket || '').toUpperCase() === 'AM5' &&
            !/\bRyzen\s+\d\s+9\d{3}(?!\d)/i.test(cpu.name || cpu.title || '')
        ) || { name: 'AMD Ryzen 5 7600X', socket: 'AM5' };
        const sixHundredSeriesBoard = motherboards.find(motherboard =>
            ['A620', 'B650', 'B650E', 'X670', 'X670E'].includes(
                String(motherboard.chipset || '').trim().toUpperCase()
            )
        ) || { name: 'Stub B650 Motherboard', socket: 'AM5', chipset: 'B650' };
        const eightHundredSeriesBoard = motherboards.find(motherboard =>
            ['B840', 'B850', 'X870', 'X870E'].includes(
                String(motherboard.chipset || '').trim().toUpperCase()
            )
        ) || { name: 'Stub X870E Motherboard', socket: 'AM5', chipset: 'X870E' };

        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        const page = await browser.newPage();
        await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 60000 });
        await page.waitForFunction(
            () => window.partsDatabase &&
                typeof window.partsDatabase.classifyCompatibilityIssues === 'function',
            { timeout: 30000 }
        );

        async function classify(build) {
            return page.evaluate(
                currentBuild => window.partsDatabase.classifyCompatibilityIssues(
                    currentBuild,
                    { total: 0 }
                ),
                build
            );
        }

        const highPowerResult = await classify(makeBuild({ gpu: highPowerGpu }));
        const connectorWarning = findWarning(highPowerResult, CONNECTOR_PATTERN);
        record(
            'C1 connector advisory fires as warning',
            !connectorWarning
                ? 'expected connector advisory in warnings'
                : hasMatchingIssue(highPowerResult.problems, CONNECTOR_PATTERN)
                    ? 'connector advisory appeared in problems'
                    : !String(connectorWarning.detail || '').trim()
                        ? 'connector advisory detail was empty'
                        : ''
        );

        const lowerPowerResult = await classify(makeBuild({ gpu: lowerPowerGpu }));
        const missingTdpResult = await classify(makeBuild({ gpu: { name: 'GPU without TDP', tdp: null } }));
        record(
            'C2 connector advisory avoids false positives',
            hasMatchingIssue(lowerPowerResult.warnings, CONNECTOR_PATTERN)
                ? `connector advisory fired for ${lowerPowerGpu.tdp}W GPU`
                : hasMatchingIssue(missingTdpResult.warnings, CONNECTOR_PATTERN)
                    ? 'connector advisory fired with missing TDP'
                    : ''
        );

        const biosResult = await classify(makeBuild({
            cpu: ryzen9000Cpu,
            motherboard: sixHundredSeriesBoard
        }));
        const biosWarning = findWarning(biosResult, BIOS_PATTERN);
        record(
            'C3 AM5 BIOS trap fires as warning',
            !biosWarning
                ? 'expected BIOS advisory in warnings'
                : hasMatchingIssue(biosResult.problems, BIOS_PATTERN)
                    ? 'BIOS advisory appeared in problems'
                    : !String(biosWarning.detail || '').trim()
                        ? 'BIOS advisory detail was empty'
                        : ''
        );

        const eightHundredSeriesResult = await classify(makeBuild({
            cpu: ryzen9000Cpu,
            motherboard: eightHundredSeriesBoard
        }));
        const nonRyzen9000Result = await classify(makeBuild({
            cpu: nonRyzen9000Cpu,
            motherboard: sixHundredSeriesBoard
        }));
        const missingChipsetResult = await classify(makeBuild({
            cpu: ryzen9000Cpu,
            motherboard: { name: 'Board without chipset', socket: 'AM5' }
        }));
        const missingCpuNameResult = await classify(makeBuild({
            cpu: { socket: 'AM5' },
            motherboard: sixHundredSeriesBoard
        }));
        const missingCpuSocketResult = await classify(makeBuild({
            cpu: { name: 'AMD Ryzen 7 9700X' },
            motherboard: sixHundredSeriesBoard
        }));
        record(
            'C4 AM5 BIOS trap avoids false positives',
            hasMatchingIssue(eightHundredSeriesResult.warnings, BIOS_PATTERN)
                ? `BIOS advisory fired for ${eightHundredSeriesBoard.chipset} board`
                : hasMatchingIssue(nonRyzen9000Result.warnings, BIOS_PATTERN)
                    ? `BIOS advisory fired for ${nonRyzen9000Cpu.name || nonRyzen9000Cpu.title}`
                    : hasMatchingIssue(missingChipsetResult.warnings, BIOS_PATTERN)
                        ? 'BIOS advisory fired with missing chipset'
                        : hasMatchingIssue(missingCpuNameResult.warnings, BIOS_PATTERN)
                            ? 'BIOS advisory fired with missing CPU name'
                            : hasMatchingIssue(missingCpuSocketResult.warnings, BIOS_PATTERN)
                                ? 'BIOS advisory fired with missing CPU socket'
                                : ''
        );
    } catch (error) {
        console.log(`FAIL setup: ${error.stack || error.message || String(error)}`);
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
