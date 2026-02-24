/**
 * Scrape slot data for motherboards with missing fields.
 * - ramSlots / pcieSlots: apply form-factor defaults if scrape fails (these are 100% reliable)
 * - m2Slots: name-based detection first, then scrape — NEVER apply a default, leave null if unknown
 */
const { connectToDatabase } = require('../config/database');
const puppeteer = require('puppeteer');

const DELAY_MS = 3000;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── M.2 detection from product name ─────────────────────────────────────────
function detectM2FromName(name) {
    const n = (name || '').toUpperCase();
    if (/\bQUAD\s+M\.?2\b/.test(n))   return 4;
    if (/\bTRIPLE\s+M\.?2\b/.test(n)) return 3;
    if (/\bDUAL\s+M\.?2\b/.test(n))   return 2;
    if (/\bSINGLE\s+M\.?2\b/.test(n)) return 1;
    const m = n.match(/(\d+)\s*[Xx×]?\s*M\.?2/);
    if (m) { const v = parseInt(m[1]); if (v >= 1 && v <= 8) return v; }
    return null;
}

// ── Form-factor defaults for RAM and PCIe (not M.2) ──────────────────────────
function ffDefault(formFactor, field) {
    const ff = (formFactor || '').toLowerCase();
    const isITX  = ff.includes('itx');
    const isMATX = ff.includes('micro') || ff.includes('matx');
    if (field === 'ram')  return isITX ? 2 : 4;
    if (field === 'pcie') return isITX ? 1 : (isMATX ? 2 : 3);
    return null;
}

// ── Amazon page scraper ───────────────────────────────────────────────────────
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
            for (const b of bullets) {
                if (ramSlots === null && /(\d+)\s*(x\s*)?(dimm|memory|ram)\s*slot/i.test(b)) {
                    const m = b.match(/(\d+)/); if (m) ramSlots = parseInt(m[1]);
                }
                if (m2Slots === null && /(\d+)\s*m\.?2/i.test(b)) {
                    const m = b.match(/(\d+)\s*m\.?2/i); if (m) m2Slots = parseInt(m[1]);
                }
                if (pcieSlots === null && /(\d+)\s*(x\s*)?pci[\s-]?e?\s*(x16|slot)/i.test(b)) {
                    const m = b.match(/(\d+)/); if (m) pcieSlots = parseInt(m[1]);
                }
            }
        }

        if (ramSlots === null || m2Slots === null || pcieSlots === null) {
            const body = document.body.innerText;
            if (ramSlots === null) { const m = body.match(/(\d+)\s*(x\s*)?(DIMM|memory|RAM)\s*slots?/i); if (m) ramSlots = parseInt(m[1]); }
            if (m2Slots === null)  { const m = body.match(/(\d+)\s*M\.?2\s*slots?/i); if (m) m2Slots = parseInt(m[1]); }
            if (pcieSlots === null){ const m = body.match(/(\d+)\s*(x\s*)?PCIe?\s*x16\s*slots?/i); if (m) pcieSlots = parseInt(m[1]); }
        }

        return { ramSlots, m2Slots, pcieSlots };
    });
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function scrapeMotherboardSlotsV2() {
    const db = await connectToDatabase();
    const col = db.collection('motherboards');
    const all = await col.find({}).toArray();

    const toProcess = all.filter(mb =>
        mb.ramSlots == null || mb.m2Slots == null || mb.pcieSlots == null
    );

    console.log(`Total motherboards: ${all.length}`);
    console.log(`Missing slot data:  ${toProcess.length}\n`);

    if (toProcess.length === 0) {
        console.log('All motherboards already have full slot data.');
        process.exit(0);
    }

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

    let updatedCount = 0;

    for (let i = 0; i < toProcess.length; i++) {
        const mb = toProcess[i];
        const name = mb.name || mb.title || '';
        console.log(`[${i + 1}/${toProcess.length}] ${name.substring(0, 70)}`);

        // ── Step 1: name-based M.2 detection ──────────────────────────
        let m2FromName = detectM2FromName(name);

        // ── Step 2: scrape Amazon if any field still missing ───────────
        let scraped = null;
        const needsScrape = mb.ramSlots == null || mb.pcieSlots == null ||
                            (mb.m2Slots == null && m2FromName === null);

        if (needsScrape && mb.sourceUrl) {
            scraped = await scrapeSlots(page, mb.sourceUrl);
            await sleep(DELAY_MS);
        }

        // ── Step 3: resolve each field ─────────────────────────────────
        const update = {};

        // RAM slots — default OK (100% accurate)
        if (mb.ramSlots == null) {
            const fromScrape = scraped?.ramSlots;
            const valid = fromScrape && fromScrape >= 1 && fromScrape <= 4;
            update.ramSlots = valid ? fromScrape : ffDefault(mb.formFactor, 'ram');
        }

        // PCIe slots — default OK (100% accurate)
        if (mb.pcieSlots == null) {
            const fromScrape = scraped?.pcieSlots;
            const valid = fromScrape && fromScrape >= 1 && fromScrape <= 6;
            update.pcieSlots = valid ? fromScrape : ffDefault(mb.formFactor, 'pcie');
        }

        // M.2 slots — NO defaults, name first then scrape, else stay null
        if (mb.m2Slots == null) {
            if (m2FromName !== null) {
                update.m2Slots = m2FromName;
            } else if (scraped?.m2Slots && scraped.m2Slots >= 1 && scraped.m2Slots <= 8) {
                update.m2Slots = scraped.m2Slots;
            }
            // else: leave as null — unknown is better than wrong
        }

        // ── Log & save ─────────────────────────────────────────────────
        if (Object.keys(update).length > 0) {
            const parts = Object.entries(update).map(([k, v]) => `${k.replace('Slots', '')}:${v}`).join('  ');
            const src = scraped ? '(scraped)' : m2FromName !== null ? '(from name)' : '(default)';
            console.log(`  ✅ Set ${parts}  ${src}`);
            await col.updateOne({ _id: mb._id }, { $set: update });
            updatedCount++;
        } else {
            console.log(`  — nothing to update`);
        }
    }

    await browser.close();

    // Final summary
    const finalAll = await col.find({}, { projection: { ramSlots: 1, m2Slots: 1, pcieSlots: 1 } }).toArray();
    const stillMissing = finalAll.filter(mb => mb.ramSlots == null || mb.pcieSlots == null);
    const m2Missing = finalAll.filter(mb => mb.m2Slots == null);

    console.log(`\n✅ Updated: ${updatedCount}`);
    console.log(`RAM/PCIe still missing: ${stillMissing.length}`);
    console.log(`M.2 still blank (unknown): ${m2Missing.length} / ${finalAll.length}`);

    process.exit(0);
}

scrapeMotherboardSlotsV2().catch(e => { console.error(e); process.exit(1); });
