const { connectToDatabase } = require('../config/database');
const puppeteer = require('puppeteer');

const DELAY_MS = 3000; // polite delay between requests

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

/**
 * Parse the Amazon tech-spec table and feature bullets for slot counts.
 * Returns { ramSlots, m2Slots, pcieSlots } — any can be null if not found.
 */
async function scrapeSlots(page, url) {
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await sleep(1500);
    } catch (e) {
        console.log(`  ⚠️  Navigation failed: ${e.message}`);
        return null;
    }

    return await page.evaluate(() => {
        let ramSlots = null;
        let m2Slots = null;
        let pcieSlots = null;

        // ── 1. Tech-spec tables (multiple possible IDs) ──────────────────
        const tableSections = [
            document.querySelector('#productDetails_techSpec_section_1'),
            document.querySelector('#productDetails_techSpec_section_2'),
            document.querySelector('#tech-specs-table'),
            document.querySelector('.product-facts-detail'),
        ].filter(Boolean);

        for (const section of tableSections) {
            const rows = section.querySelectorAll('tr, .product-facts-item');
            for (const row of rows) {
                const cells = row.querySelectorAll('th, td, .product-facts-detail-label, .product-facts-detail-value');
                if (cells.length < 2) continue;
                const label = cells[0].textContent.trim().toLowerCase();
                const value = cells[1].textContent.trim();

                if (/memory\s*slots?|ram\s*slots?|dimm\s*slots?/i.test(label)) {
                    const m = value.match(/(\d+)/);
                    if (m) ramSlots = parseInt(m[1]);
                }
                if (/m\.?2\s*slots?/i.test(label)) {
                    const m = value.match(/(\d+)/);
                    if (m) m2Slots = parseInt(m[1]);
                }
                if (/pcie?\s*(x16|expansion|slot)/i.test(label) || label === 'expansion slots') {
                    const m = value.match(/(\d+)/);
                    if (m) pcieSlots = parseInt(m[1]);
                }
            }
        }

        // ── 2. Feature bullets ────────────────────────────────────────────
        if (ramSlots === null || m2Slots === null || pcieSlots === null) {
            const bullets = Array.from(document.querySelectorAll('#feature-bullets li span, #featurebullets_feature_div li span'))
                .map(el => el.textContent.trim());

            for (const bullet of bullets) {
                const b = bullet.toLowerCase();

                if (ramSlots === null && /(\d+)\s*(x\s*)?(dimm|memory|ram)\s*slot/i.test(bullet)) {
                    const m = bullet.match(/(\d+)/);
                    if (m) ramSlots = parseInt(m[1]);
                }
                if (ramSlots === null && /supports?\s+(\d+)\s+(dimm|memory slot)/i.test(bullet)) {
                    const m = bullet.match(/(\d+)/);
                    if (m) ramSlots = parseInt(m[1]);
                }

                if (m2Slots === null && /(\d+)\s*m\.?2/i.test(bullet)) {
                    const m = bullet.match(/(\d+)\s*m\.?2/i);
                    if (m) m2Slots = parseInt(m[1]);
                }

                if (pcieSlots === null && /(\d+)\s*(x\s*)?pci[\s-]?e?\s*(x16|slot)/i.test(bullet)) {
                    const m = bullet.match(/(\d+)/);
                    if (m) pcieSlots = parseInt(m[1]);
                }
            }
        }

        // ── 3. Product overview / aplus content ──────────────────────────
        if (ramSlots === null || m2Slots === null || pcieSlots === null) {
            const bodyText = document.body.innerText;

            if (ramSlots === null) {
                const m = bodyText.match(/(\d+)\s*(x\s*)?(DIMM|memory|RAM)\s*slots?/i);
                if (m) ramSlots = parseInt(m[1]);
            }
            if (m2Slots === null) {
                const m = bodyText.match(/(\d+)\s*M\.?2\s*slots?/i);
                if (m) m2Slots = parseInt(m[1]);
            }
            if (pcieSlots === null) {
                const m = bodyText.match(/(\d+)\s*(x\s*)?PCIe?\s*x16\s*slots?/i);
                if (m) pcieSlots = parseInt(m[1]);
            }
        }

        return { ramSlots, m2Slots, pcieSlots };
    });
}

// Form-factor-based sensible defaults when scraping finds nothing
function applyDefaults(mb, slots) {
    const ff = (mb.formFactor || '').toLowerCase();
    let { ramSlots, m2Slots, pcieSlots } = slots;

    if (ramSlots === null) {
        ramSlots = (ff.includes('itx')) ? 2 : 4;
    }
    if (m2Slots === null) {
        if (ff.includes('itx'))      m2Slots = 1;
        else if (ff.includes('micro')) m2Slots = 2;
        else                           m2Slots = 3;
    }
    if (pcieSlots === null) {
        if (ff.includes('itx'))      pcieSlots = 1;
        else if (ff.includes('micro')) pcieSlots = 2;
        else                           pcieSlots = 3;
    }

    return { ramSlots, m2Slots, pcieSlots };
}

async function scrapeMotherboardSlots() {
    const db = await connectToDatabase();
    const col = db.collection('motherboards');

    // Only process boards that are missing at least one slot field
    const all = await col.find({}).toArray();
    const toProcess = all.filter(mb =>
        mb.ramSlots == null || mb.m2Slots == null || mb.pcieSlots == null
    );

    console.log(`Total motherboards: ${all.length}`);
    console.log(`Need slot data:     ${toProcess.length}\n`);

    if (toProcess.length === 0) {
        console.log('All motherboards already have slot data.');
        process.exit(0);
    }

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

    let updated = 0;
    let failed = 0;
    let defaulted = 0;

    for (let i = 0; i < toProcess.length; i++) {
        const mb = toProcess[i];
        const url = mb.sourceUrl;
        const name = (mb.name || '').substring(0, 70);

        console.log(`[${i + 1}/${toProcess.length}] ${name}`);

        if (!url) {
            console.log('  ⚠️  No sourceUrl — applying defaults');
            const slots = applyDefaults(mb, { ramSlots: null, m2Slots: null, pcieSlots: null });
            await col.updateOne({ _id: mb._id }, { $set: slots });
            defaulted++;
            continue;
        }

        const rawSlots = await scrapeSlots(page, url);

        if (!rawSlots) {
            console.log('  ❌ Scrape failed — applying defaults');
            const slots = applyDefaults(mb, { ramSlots: null, m2Slots: null, pcieSlots: null });
            await col.updateOne({ _id: mb._id }, { $set: slots });
            failed++;
            defaulted++;
        } else {
            const slots = applyDefaults(mb, rawSlots);
            const scraped = Object.entries(rawSlots).filter(([, v]) => v !== null).map(([k, v]) => `${k}:${v}`).join(' ');
            console.log(`  ✅ ram:${slots.ramSlots} m2:${slots.m2Slots} pcie:${slots.pcieSlots}${scraped ? ` (scraped: ${scraped})` : ' (all defaults)'}`);
            await col.updateOne({ _id: mb._id }, { $set: { ramSlots: slots.ramSlots, m2Slots: slots.m2Slots, pcieSlots: slots.pcieSlots } });
            updated++;
        }

        if (i < toProcess.length - 1) await sleep(DELAY_MS);
    }

    await browser.close();

    console.log(`\n✅ Updated: ${updated}`);
    console.log(`⚠️  Used defaults (scrape failed): ${defaulted}`);
    console.log(`❌ Navigation failures: ${failed}`);

    process.exit(0);
}

scrapeMotherboardSlots().catch(e => { console.error(e); process.exit(1); });
