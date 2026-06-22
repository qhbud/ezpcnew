const assert = require('node:assert/strict');
const puppeteer = require('puppeteer');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pcbuilder';
const DB_NAME = process.env.DB_NAME || 'pcbuilder';
const FETCH_TIMEOUT_MS = 10000;
const createdIds = new Set();
const results = [];

function formatError(error) {
    return (error && (error.stack || error.message) ? error.stack || error.message : String(error))
        .replace(/\s*\r?\n\s*/g, ' | ');
}

function sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function makeEmptyBuild() {
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

async function jsonRequest(path, options = {}) {
    const response = await fetch(`${BASE_URL}${path}`, {
        ...options,
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
    });
    const body = await response.json();
    return { response, body };
}

async function createApiBuild(title, author, build) {
    const { response, body } = await jsonRequest('/api/community/builds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, author, build })
    });
    assert.equal(response.status, 201);
    assert.match(body.id, /^[A-Za-z0-9_-]{12}$/);
    createdIds.add(body.id);
    return body.id;
}

async function cleanupCreatedBuilds() {
    if (createdIds.size === 0) return 0;
    const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: FETCH_TIMEOUT_MS });
    try {
        await client.connect();
        const collection = client.db(DB_NAME).collection('community_builds');
        const ids = [...createdIds];
        await collection.deleteMany({ _id: { $in: ids } });
        assert.equal(await collection.countDocuments({ _id: { $in: ids } }), 0);
        return ids.length;
    } finally {
        await client.close();
    }
}

async function runCheck(id, name, check) {
    try {
        await check();
        results.push({ id, ok: true });
        console.log(`PASS ${id} ${name}`);
    } catch (error) {
        results.push({ id, ok: false });
        console.log(`FAIL ${id} ${name}: ${formatError(error)}`);
    }
}

(async () => {
    const consoleErrors = [];
    const pageErrors = [];
    const observedRequests = [];
    const unique = Date.now().toString(36);
    let browser;
    let page;
    let serializedBuild;
    let submittedId;
    let newestApiId;
    let likedApiId;
    let sampleCard;

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
        page.on('request', request => {
            const url = new URL(request.url());
            if (url.pathname.startsWith('/api/community/builds')) {
                observedRequests.push({
                    method: request.method(),
                    path: `${url.pathname}${url.search}`
                });
            }
        });

        await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 60000 });
        await page.waitForFunction(
            () => window.partsDatabase &&
                typeof window.partsDatabase.loadCommunityBuilds === 'function' &&
                typeof window.partsDatabase.submitCommunityBuild === 'function',
            { timeout: 30000 }
        );

        await runCheck('UI1', 'submit and client-side guards', async () => {
            const createPostsBefore = observedRequests.filter(request =>
                request.method === 'POST' && request.path === '/api/community/builds'
            ).length;
            const emptyGuard = await page.evaluate(emptyBuild => {
                const db = window.partsDatabase;
                db.currentBuild = { ...emptyBuild };
                db.updateTotalPrice();
                db.updateBuildActions();
                return {
                    opened: db.openCommunitySubmit(),
                    toast: document.getElementById('ezpcToast')?.textContent || '',
                    modalDisplay: document.getElementById('communitySubmitModal')?.style.display
                };
            }, makeEmptyBuild());
            assert.equal(emptyGuard.opened, false);
            assert.match(emptyGuard.toast, /add components/i);
            assert.equal(emptyGuard.modalDisplay, 'none');

            const assembled = await page.evaluate(async emptyBuild => {
                const response = await fetch('/api/parts');
                if (!response.ok) throw new Error(`/api/parts returned ${response.status}`);
                const parts = await response.json();
                const categorySlots = {
                    cpu: 'cpu',
                    cpus: 'cpu',
                    gpu: 'gpu',
                    gpus: 'gpu',
                    motherboard: 'motherboard',
                    motherboards: 'motherboard',
                    ram: 'ram',
                    rams: 'ram'
                };
                const part = parts.find(candidate =>
                    candidate?._id &&
                    categorySlots[String(candidate.category || '').toLowerCase()]
                );
                if (!part) throw new Error('No real component was available for the UI submission');

                const db = window.partsDatabase;
                const slot = categorySlots[String(part.category).toLowerCase()];
                db.currentBuild = { ...emptyBuild, [slot]: part };
                db.updateTotalPrice();
                db.updateBuildActions();
                db.updateBuildDock();
                return {
                    slot,
                    serialized: db.serializeBuild()
                };
            }, makeEmptyBuild());
            serializedBuild = assembled.serialized;
            assert.ok(Object.keys(serializedBuild).length > 0);

            await page.click('#submitCommunityBuildBtn');
            await page.waitForSelector('#communitySubmitModal[aria-hidden="false"]');
            await page.type('#communityAuthorInput', `UI Author ${unique}`);
            await page.click('#communitySubmitConfirmBtn');
            await page.waitForFunction(
                () => /both a build title and author/i.test(
                    document.getElementById('communitySubmitError')?.textContent || ''
                )
            );

            await page.type('#communityTitleInput', `UI Submitted Build ${unique}`);
            await page.$eval('#communityAuthorInput', input => { input.value = ''; });
            await page.click('#communitySubmitConfirmBtn');
            await page.waitForFunction(
                () => /both a build title and author/i.test(
                    document.getElementById('communitySubmitError')?.textContent || ''
                )
            );

            const createPostsAfterGuards = observedRequests.filter(request =>
                request.method === 'POST' && request.path === '/api/community/builds'
            ).length;
            assert.equal(createPostsAfterGuards, createPostsBefore);

            await page.type('#communityAuthorInput', `UI Author ${unique}`);
            const responsePromise = page.waitForResponse(response => {
                const url = new URL(response.url());
                return response.request().method() === 'POST' &&
                    url.pathname === '/api/community/builds';
            }, { timeout: 10000 });
            await page.click('#communitySubmitConfirmBtn');
            const response = await responsePromise;
            assert.equal(response.status(), 201);
            const body = await response.json();
            submittedId = body.id;
            createdIds.add(submittedId);

            await page.waitForFunction(id => {
                const card = document.querySelector(`.community-build-card[data-community-build-id="${id}"]`);
                return window.partsDatabase.currentTab === 'community' && Boolean(card);
            }, { timeout: 15000 }, submittedId);

            sampleCard = await page.$eval(
                `.community-build-card[data-community-build-id="${submittedId}"]`,
                card => ({
                    title: card.querySelector('.community-build-title')?.textContent || '',
                    author: card.querySelector('.community-build-author')?.textContent || '',
                    parts: card.querySelector('.community-build-parts')?.textContent || '',
                    likes: card.querySelector('.community-like-count')?.textContent || '',
                    date: card.querySelector('.community-build-date')?.textContent || ''
                })
            );
            assert.match(sampleCard.title, new RegExp(unique));
            assert.match(sampleCard.author, new RegExp(unique));
            assert.ok(sampleCard.parts);
            assert.equal(sampleCard.likes, '0');
            assert.ok(sampleCard.date);
        });

        await runCheck('UI2', 'browse fields and newest/likes sort order', async () => {
            assert.ok(serializedBuild);
            await sleep(25);
            likedApiId = await createApiBuild(
                `API Liked Build ${unique}`,
                `API Author ${unique}`,
                serializedBuild
            );
            await sleep(25);
            newestApiId = await createApiBuild(
                `API Newest Build ${unique}`,
                `API Author ${unique}`,
                serializedBuild
            );
            await jsonRequest(`/api/community/builds/${likedApiId}/like`, { method: 'POST' });
            await jsonRequest(`/api/community/builds/${likedApiId}/like`, { method: 'POST' });
            await jsonRequest(`/api/community/builds/${newestApiId}/like`, { method: 'POST' });

            const likesResponsePromise = page.waitForResponse(response => {
                const url = new URL(response.url());
                return url.pathname === '/api/community/builds' &&
                    url.searchParams.get('sort') === 'likes';
            }, { timeout: 10000 });
            await page.select('#communitySort', 'likes');
            const likesResponse = await likesResponsePromise;
            assert.equal(likesResponse.status(), 200);
            const likesBody = await likesResponse.json();
            await page.waitForFunction(expectedIds => {
                const rendered = [...document.querySelectorAll('.community-build-card')]
                    .map(card => card.dataset.communityBuildId);
                return JSON.stringify(rendered) === JSON.stringify(expectedIds);
            }, { timeout: 10000 }, likesBody.builds.map(build => build.id));

            const cardFields = await page.$$eval('.community-build-card', cards => cards.map(card => ({
                title: card.querySelector('.community-build-title')?.textContent || '',
                author: card.querySelector('.community-build-author')?.textContent || '',
                parts: card.querySelector('.community-build-parts')?.textContent || '',
                likes: card.querySelector('.community-like-count')?.textContent || '',
                date: card.querySelector('.community-build-date')?.textContent || ''
            })));
            assert.ok(cardFields.length > 0);
            cardFields.forEach(fields => {
                assert.ok(fields.title);
                assert.match(fields.author, /^By /);
                assert.ok(fields.parts);
                assert.match(fields.likes, /^\d+$/);
                assert.ok(fields.date);
            });

            const newestResponsePromise = page.waitForResponse(response => {
                const url = new URL(response.url());
                return url.pathname === '/api/community/builds' &&
                    url.searchParams.get('sort') === 'newest';
            }, { timeout: 10000 });
            await page.select('#communitySort', 'newest');
            const newestResponse = await newestResponsePromise;
            assert.equal(newestResponse.status(), 200);
            const newestBody = await newestResponse.json();
            await page.waitForFunction(expectedIds => {
                const rendered = [...document.querySelectorAll('.community-build-card')]
                    .map(card => card.dataset.communityBuildId);
                return JSON.stringify(rendered) === JSON.stringify(expectedIds);
            }, { timeout: 10000 }, newestBody.builds.map(build => build.id));

            assert.ok(observedRequests.some(request =>
                request.method === 'GET' &&
                request.path.includes('sort=likes') &&
                request.path.includes('limit=12') &&
                request.path.includes('skip=0')
            ));
            assert.ok(observedRequests.some(request =>
                request.method === 'GET' &&
                request.path.includes('sort=newest') &&
                request.path.includes('limit=12') &&
                request.path.includes('skip=0')
            ));
        });

        await runCheck('UI3', 'like uses API-returned count and persists', async () => {
            assert.ok(newestApiId);
            await page.waitForSelector(
                `.community-build-card[data-community-build-id="${newestApiId}"] .community-like-btn`
            );
            const likeResponsePromise = page.waitForResponse(response => {
                const url = new URL(response.url());
                return response.request().method() === 'POST' &&
                    url.pathname === `/api/community/builds/${newestApiId}/like`;
            }, { timeout: 10000 });
            await page.click(
                `.community-build-card[data-community-build-id="${newestApiId}"] .community-like-btn`
            );
            const likeResponse = await likeResponsePromise;
            assert.equal(likeResponse.status(), 200);
            const likeBody = await likeResponse.json();

            await page.waitForFunction(({ id, likes }) => {
                const count = document.querySelector(
                    `.community-build-card[data-community-build-id="${id}"] .community-like-count`
                );
                return count?.textContent === String(likes);
            }, { timeout: 5000 }, { id: newestApiId, likes: likeBody.likes });

            const read = await jsonRequest(`/api/community/builds/${newestApiId}`);
            assert.equal(read.response.status, 200);
            assert.equal(read.body.likes, likeBody.likes);

            await page.evaluate(() => window.partsDatabase.loadCommunityBuilds({ reset: true }));
            const refreshedCount = await page.$eval(
                `.community-build-card[data-community-build-id="${newestApiId}"] .community-like-count`,
                count => Number(count.textContent)
            );
            assert.equal(refreshedCount, likeBody.likes);
        });

        await runCheck('UI4', 'card load delegates to applyBuildData and shows builder', async () => {
            assert.ok(newestApiId);
            await page.evaluate(emptyBuild => {
                const db = window.partsDatabase;
                const originalApply = db.applyBuildData.bind(db);
                db.__communityApplyCalls = [];
                db.applyBuildData = async function(buildData, options) {
                    this.__communityApplyCalls.push({
                        buildData: JSON.parse(JSON.stringify(buildData)),
                        options: { ...options }
                    });
                    return originalApply(buildData, options);
                };
                db.currentBuild = { ...emptyBuild };
                db.updateTotalPrice();
                db.updateBuildActions();
            }, makeEmptyBuild());

            await page.click(
                `.community-build-card[data-community-build-id="${newestApiId}"] .community-build-title`
            );
            await page.waitForFunction(() => {
                const db = window.partsDatabase;
                return db.currentTab === 'builder' &&
                    db.__communityApplyCalls?.length === 1 &&
                    Object.values(db.currentBuild || {}).some(Boolean);
            }, { timeout: 20000 });

            const loaded = await page.evaluate(() => {
                const db = window.partsDatabase;
                const call = db.__communityApplyCalls[0];
                return {
                    activeBuilder: document.getElementById('builder-tab')?.classList.contains('active'),
                    call,
                    currentBuildCount: Object.values(db.currentBuild || {}).filter(Boolean).length
                };
            });
            assert.equal(loaded.activeBuilder, true);
            assert.equal(loaded.currentBuildCount > 0, true);
            assert.equal(loaded.call.options.sourceLabel, 'community build');
            assert.equal(loaded.call.options.notify, true);
            assert.deepEqual(loaded.call.buildData, serializedBuild);
        });

        await runCheck('UI5', 'empty/error states and HTML text escaping', async () => {
            assert.ok(serializedBuild);
            const emptyState = await page.evaluate(async () => {
                const db = window.partsDatabase;
                const realFetch = window.fetch.bind(window);
                window.__communityRealFetch = realFetch;
                window.fetch = (input, options) => {
                    const url = String(input);
                    if (url.startsWith('/api/community/builds?')) {
                        return Promise.resolve(new Response(
                            JSON.stringify({ builds: [], total: 0 }),
                            { status: 200, headers: { 'Content-Type': 'application/json' } }
                        ));
                    }
                    return realFetch(input, options);
                };
                await db.switchTab('community');
                return {
                    visible: !document.getElementById('communityEmptyState')?.classList.contains('hidden'),
                    text: document.getElementById('communityEmptyState')?.textContent || '',
                    cards: document.querySelectorAll('.community-build-card').length
                };
            });
            assert.equal(emptyState.visible, true);
            assert.match(emptyState.text, /no community builds/i);
            assert.equal(emptyState.cards, 0);

            const errorState = await page.evaluate(async () => {
                const db = window.partsDatabase;
                const realFetch = window.__communityRealFetch;
                window.fetch = (input, options) => {
                    const url = String(input);
                    if (url.startsWith('/api/community/builds?')) {
                        return Promise.resolve(new Response(
                            JSON.stringify({ error: 'Synthetic gallery failure' }),
                            { status: 503, headers: { 'Content-Type': 'application/json' } }
                        ));
                    }
                    return realFetch(input, options);
                };
                await db.loadCommunityBuilds({ reset: true });
                return {
                    visible: !document.getElementById('communityErrorState')?.classList.contains('hidden'),
                    text: document.getElementById('communityErrorState')?.textContent || ''
                };
            });
            assert.equal(errorState.visible, true);
            assert.match(errorState.text, /synthetic gallery failure/i);

            const injection = await page.evaluate(async buildData => {
                const db = window.partsDatabase;
                const realFetch = window.__communityRealFetch;
                window.fetch = (input, options) => {
                    const url = String(input);
                    if (url.startsWith('/api/community/builds?')) {
                        return Promise.resolve(new Response(JSON.stringify({
                            builds: [{
                                id: 'HtmlText0001',
                                title: '<img src=x onerror=window.__communityInjected=true>',
                                author: '<b>Unsafe Author</b>',
                                likes: 7,
                                createdAt: new Date().toISOString(),
                                build: buildData
                            }],
                            total: 1
                        }), {
                            status: 200,
                            headers: { 'Content-Type': 'application/json' }
                        }));
                    }
                    return realFetch(input, options);
                };
                await db.loadCommunityBuilds({ reset: true });
                const card = document.querySelector('.community-build-card');
                const title = card?.querySelector('.community-build-title');
                const author = card?.querySelector('.community-build-author');
                const result = {
                    titleText: title?.textContent || '',
                    authorText: author?.textContent || '',
                    titleMarkupChildren: title?.querySelectorAll('*').length || 0,
                    authorMarkupChildren: author?.querySelectorAll('*').length || 0,
                    injected: Boolean(window.__communityInjected)
                };
                window.fetch = realFetch;
                delete window.__communityRealFetch;
                return result;
            }, serializedBuild);
            assert.equal(
                injection.titleText,
                '<img src=x onerror=window.__communityInjected=true>'
            );
            assert.equal(injection.authorText, 'By <b>Unsafe Author</b>');
            assert.equal(injection.titleMarkupChildren, 0);
            assert.equal(injection.authorMarkupChildren, 0);
            assert.equal(injection.injected, false);
            assert.deepEqual(consoleErrors, []);
            assert.deepEqual(pageErrors, []);
        });

        if (sampleCard) {
            console.log(
                `SAMPLE CARD ${sampleCard.title} | ${sampleCard.author} | ${sampleCard.parts} | likes=${sampleCard.likes}`
            );
        }
    } catch (error) {
        results.push({ id: 'SETUP', ok: false });
        console.log(`FAIL SETUP ${formatError(error)}`);
    } finally {
        if (browser) await browser.close();
        try {
            const deleted = await cleanupCreatedBuilds();
            console.log(`PASS CLEANUP deleted=${deleted}`);
        } catch (error) {
            results.push({ id: 'CLEANUP', ok: false });
            console.log(`FAIL CLEANUP ${formatError(error)}`);
        }
    }

    if (results.some(result => !result.ok) || consoleErrors.length || pageErrors.length) {
        process.exitCode = 1;
    }
})().catch(error => {
    console.log(`FAIL SETUP ${formatError(error)}`);
    process.exitCode = 1;
});
