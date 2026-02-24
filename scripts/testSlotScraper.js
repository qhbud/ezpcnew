/**
 * Cross-reference scraped slot data against known-good manufacturer specs.
 * Known specs sourced from official product pages for these boards.
 */
const { connectToDatabase } = require('../config/database');
const puppeteer = require('puppeteer');

const DELAY_MS = 3000;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Ground-truth specs from manufacturer product pages
const KNOWN_SPECS = [
    // name substring to match, { ramSlots, m2Slots, pcieSlots }
    // Intel Z790
    { match: 'TUF Gaming Z790-Plus WiFi',          ram: 4, m2: 4, pcie: 3 },
    { match: 'Z790 AORUS Elite AX',                ram: 4, m2: 4, pcie: 3 },
    { match: 'Z790 Pro RS',                        ram: 4, m2: 5, pcie: 3 },
    { match: 'Z790-A WiFi II',                     ram: 4, m2: 5, pcie: 3 },
    // Intel B760
    { match: 'B760 Pro RS ATX',                    ram: 4, m2: 3, pcie: 3 },
    { match: 'B760M Gaming Plus WiFi DDR4',        ram: 4, m2: 2, pcie: 2 },
    { match: 'Prime B760M-A AX',                   ram: 4, m2: 2, pcie: 2 },
    { match: 'B760 Gaming Plus WiFi V1',           ram: 4, m2: 4, pcie: 3 },
    // Intel Z690
    { match: 'Z690 AORUS Ultra',                   ram: 4, m2: 4, pcie: 3 },
    { match: 'TUF Gaming Z690-Plus WiFi',          ram: 4, m2: 4, pcie: 3 },
    // AMD X870/X870E
    { match: 'MPG X870E Carbon WiFi',              ram: 4, m2: 5, pcie: 3 },
    { match: 'ROG Crosshair X870E Hero',           ram: 4, m2: 5, pcie: 3 },
    // AMD B850
    { match: 'MAG B850 Tomahawk MAX WiFi',         ram: 4, m2: 5, pcie: 3 },
    { match: 'PRO B850-S WIFI6E',                  ram: 4, m2: 5, pcie: 3 },
    // AMD X670/X670E
    { match: 'X670 AORUS Elite AX',                ram: 4, m2: 4, pcie: 3 },
    { match: 'PRO X670-P WiFi',                    ram: 4, m2: 4, pcie: 3 },
    // AMD B650/B650E
    { match: 'B650M PG Lightning WiFi 6E AMD',     ram: 4, m2: 2, pcie: 2 },
    { match: 'B650 AORUS Elite AX',                ram: 4, m2: 4, pcie: 3 },
    { match: 'B650 Gaming Plus WiFi Gaming',       ram: 4, m2: 4, pcie: 3 },
    // AMD B550 ATX
    { match: 'ROG Strix B550-F Gaming WiFi II AMD AM4 (3rd', ram: 4, m2: 2, pcie: 3 },
    { match: 'B550 AORUS Elite AX V2',             ram: 4, m2: 3, pcie: 3 },
    { match: 'MAG B550 Tomahawk MAX WiFi Gaming',  ram: 4, m2: 2, pcie: 3 },
    { match: 'B550M PRO-VDH WiFi',                 ram: 4, m2: 2, pcie: 2 },
    // AMD B550 mATX / ITX
    { match: 'B550I AORUS PRO AX AMD',             ram: 2, m2: 2, pcie: 1 },
    // AMD A520
    { match: 'TUF Gaming A520M-PLUS (WiFi) AMD AM4', ram: 4, m2: 1, pcie: 2 },
];

function findBoard(boards, matchStr) {
    return boards.find(b => (b.name || b.title || '').includes(matchStr));
}

function colorize(ok) { return ok ? '✅' : '❌'; }

async function scrapeSlots(page, url) {
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await sleep(1200);
    } catch (e) {
        return null;
    }

    return await page.evaluate(() => {
        let ramSlots = null, m2Slots = null, pcieSlots = null;

        const tableSections = [
            document.querySelector('#productDetails_techSpec_section_1'),
            document.querySelector('#productDetails_techSpec_section_2'),
            document.querySelector('#tech-specs-table'),
        ].filter(Boolean);

        for (const section of tableSections) {
            for (const row of section.querySelectorAll('tr')) {
                const cells = row.querySelectorAll('th, td');
                if (cells.length < 2) continue;
                const label = cells[0].textContent.trim().toLowerCase();
                const value = cells[1].textContent.trim();
                if (/memory\s*slots?|ram\s*slots?|dimm\s*slots?/i.test(label)) {
                    const m = value.match(/(\d+)/); if (m) ramSlots = parseInt(m[1]);
                }
                if (/m\.?2\s*slots?/i.test(label)) {
                    const m = value.match(/(\d+)/); if (m) m2Slots = parseInt(m[1]);
                }
                if (/pcie?\s*(x16|expansion|slot)/i.test(label) || label === 'expansion slots') {
                    const m = value.match(/(\d+)/); if (m) pcieSlots = parseInt(m[1]);
                }
            }
        }

        if (ramSlots === null || m2Slots === null || pcieSlots === null) {
            const bullets = Array.from(document.querySelectorAll('#feature-bullets li span'))
                .map(el => el.textContent.trim());
            for (const bullet of bullets) {
                if (ramSlots === null && /(\d+)\s*(x\s*)?(dimm|memory|ram)\s*slot/i.test(bullet)) {
                    const m = bullet.match(/(\d+)/); if (m) ramSlots = parseInt(m[1]);
                }
                if (m2Slots === null && /(\d+)\s*m\.?2/i.test(bullet)) {
                    const m = bullet.match(/(\d+)\s*m\.?2/i); if (m) m2Slots = parseInt(m[1]);
                }
                if (pcieSlots === null && /(\d+)\s*(x\s*)?pci[\s-]?e?\s*(x16|slot)/i.test(bullet)) {
                    const m = bullet.match(/(\d+)/); if (m) pcieSlots = parseInt(m[1]);
                }
            }
        }

        if (ramSlots === null || m2Slots === null || pcieSlots === null) {
            const bodyText = document.body.innerText;
            if (ramSlots === null) { const m = bodyText.match(/(\d+)\s*(x\s*)?(DIMM|memory|RAM)\s*slots?/i); if (m) ramSlots = parseInt(m[1]); }
            if (m2Slots === null)  { const m = bodyText.match(/(\d+)\s*M\.?2\s*slots?/i); if (m) m2Slots = parseInt(m[1]); }
            if (pcieSlots === null){ const m = bodyText.match(/(\d+)\s*(x\s*)?PCIe?\s*x16\s*slots?/i); if (m) pcieSlots = parseInt(m[1]); }
        }

        return { ramSlots, m2Slots, pcieSlots };
    });
}

async function main() {
    const db = await connectToDatabase();
    const col = db.collection('motherboards');
    const all = await col.find({}).toArray();

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    const results = [];

    for (const spec of KNOWN_SPECS) {
        const board = findBoard(all, spec.match);
        if (!board) {
            console.log(`⚠️  Not found in DB: "${spec.match}"`);
            continue;
        }

        console.log(`\nTesting: ${(board.name || '').substring(0, 70)}`);

        // Stored values
        const stored = { ram: board.ramSlots, m2: board.m2Slots, pcie: board.pcieSlots };

        // Fresh scrape
        let fresh = null;
        if (board.sourceUrl) {
            fresh = await scrapeSlots(page, board.sourceUrl);
            await sleep(DELAY_MS);
        }

        const known = { ram: spec.ram, m2: spec.m2, pcie: spec.pcie };

        // Compare stored vs known
        const storedRamOk   = stored.ram  === known.ram;
        const storedM2Ok    = stored.m2   === known.m2;
        const storedPcieOk  = stored.pcie === known.pcie;

        // Compare fresh vs known
        const freshRamOk   = fresh ? fresh.ramSlots  === known.ram  : null;
        const freshM2Ok    = fresh ? fresh.m2Slots   === known.m2   : null;
        const freshPcieOk  = fresh ? fresh.pcieSlots === known.pcie : null;

        console.log(`  Known:   ram=${known.ram}  m2=${known.m2}  pcie=${known.pcie}`);
        console.log(`  Stored:  ram=${stored.ram} ${colorize(storedRamOk)}  m2=${stored.m2} ${colorize(storedM2Ok)}  pcie=${stored.pcie} ${colorize(storedPcieOk)}`);
        if (fresh) {
            console.log(`  Fresh:   ram=${fresh.ramSlots} ${freshRamOk===null?'?':colorize(freshRamOk)}  m2=${fresh.m2Slots} ${freshM2Ok===null?'?':colorize(freshM2Ok)}  pcie=${fresh.pcieSlots} ${freshPcieOk===null?'?':colorize(freshPcieOk)}`);
        }

        results.push({ name: spec.match, known, stored, fresh, storedRamOk, storedM2Ok, storedPcieOk, freshRamOk, freshM2Ok, freshPcieOk });
    }

    await browser.close();

    // Summary
    const found = results.length;
    const storedRamAcc   = results.filter(r => r.storedRamOk).length;
    const storedM2Acc    = results.filter(r => r.storedM2Ok).length;
    const storedPcieAcc  = results.filter(r => r.storedPcieOk).length;
    const freshResults   = results.filter(r => r.fresh);
    const freshRamAcc    = freshResults.filter(r => r.freshRamOk).length;
    const freshM2Acc     = freshResults.filter(r => r.freshM2Ok).length;
    const freshPcieAcc   = freshResults.filter(r => r.freshPcieOk).length;

    // M.2 precision: only count boards where we actually stored a value
    const m2WithValue  = results.filter(r => r.stored.m2 != null);
    const m2Precision  = m2WithValue.filter(r => r.storedM2Ok).length;
    const m2Coverage   = m2WithValue.length;
    const m2Blank      = results.filter(r => r.stored.m2 == null).length;

    console.log('\n' + '='.repeat(60));
    console.log('ACCURACY SUMMARY');
    console.log('='.repeat(60));
    console.log(`Boards tested: ${found}`);
    console.log(`\nStored data accuracy (all boards):`);
    console.log(`  RAM slots:  ${storedRamAcc}/${found}  (${Math.round(storedRamAcc/found*100)}%)`);
    console.log(`  PCIe slots: ${storedPcieAcc}/${found}  (${Math.round(storedPcieAcc/found*100)}%)`);
    console.log(`\nM.2 slots breakdown:`);
    console.log(`  Has a value:  ${m2Coverage}/${found} boards  (coverage)`);
    console.log(`  Blank/null:   ${m2Blank}/${found} boards`);
    if (m2Coverage > 0) {
        console.log(`  Precision:    ${m2Precision}/${m2Coverage} correct where value exists  (${Math.round(m2Precision/m2Coverage*100)}%)`);
    }

    // List wrong M.2 values (not blanks — blanks are expected)
    const m2Wrong = results.filter(r => r.stored.m2 != null && !r.storedM2Ok);
    if (m2Wrong.length > 0) {
        console.log('\nM.2 wrong values (has data but incorrect):');
        m2Wrong.forEach(r => {
            console.log(`  "${r.name}": stored ${r.stored.m2} vs known ${r.known.m2}`);
        });
    }

    const m2Blanks = results.filter(r => r.stored.m2 == null);
    if (m2Blanks.length > 0) {
        console.log('\nM.2 blank (no data — needs manual entry):');
        m2Blanks.forEach(r => {
            console.log(`  "${r.name}": known ${r.known.m2}`);
        });
    }

    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
