const assert = require('node:assert/strict');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pcbuilder';
const DB_NAME = process.env.DB_NAME || 'pcbuilder';
const FETCH_TIMEOUT_MS = 5000;
const SHARED_BUILD_ID_PATTERN = /^[A-Za-z0-9_-]{12}$/;
const createdIds = new Set();
const results = [];

const validBuild = {
    cpu: 'community-cpu-001',
    gpu: { id: 'community-gpu-001', qty: 1 },
    motherboard: 'community-motherboard-001',
    ram: { id: 'community-ram-001', qty: 2 }
};

function sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function formatError(error) {
    return (error && (error.stack || error.message) ? error.stack || error.message : String(error))
        .replace(/\s*\r?\n\s*/g, ' | ');
}

async function request(path, options = {}) {
    return fetch(`${BASE_URL}${path}`, {
        ...options,
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
    });
}

async function jsonRequest(path, options = {}) {
    const response = await request(path, options);
    const body = await response.json();
    return { response, body };
}

async function createBuild(title, author, build = validBuild) {
    const { response, body } = await jsonRequest('/api/community/builds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, author, build })
    });
    assert.equal(response.status, 201);
    assert.deepEqual(Object.keys(body), ['id']);
    assert.match(body.id, SHARED_BUILD_ID_PATTERN);
    createdIds.add(body.id);
    return body.id;
}

async function getAllBuilds(sort) {
    const first = await jsonRequest(`/api/community/builds?sort=${sort}&limit=50&skip=0`);
    assert.equal(first.response.status, 200);
    const builds = [...first.body.builds];
    for (let skip = 50; skip < first.body.total; skip += 50) {
        const page = await jsonRequest(`/api/community/builds?sort=${sort}&limit=50&skip=${skip}`);
        assert.equal(page.response.status, 200);
        builds.push(...page.body.builds);
    }
    return { builds, total: first.body.total };
}

async function getStoredDocument(id) {
    const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: FETCH_TIMEOUT_MS });
    try {
        await client.connect();
        return await client.db(DB_NAME).collection('community_builds').findOne({ _id: id });
    } finally {
        await client.close();
    }
}

async function cleanupCreatedBuilds() {
    if (createdIds.size === 0) return;

    const ids = [...createdIds];
    const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: FETCH_TIMEOUT_MS });
    try {
        await client.connect();
        const collection = client.db(DB_NAME).collection('community_builds');
        await collection.deleteMany({ _id: { $in: ids } });
        assert.equal(await collection.countDocuments({ _id: { $in: ids } }), 0);
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
    let primaryId;
    let secondId;
    let thirdId;

    try {
        await runCheck('C1', 'create and read round-trip', async () => {
            primaryId = await createBuild('Synthetic Community Build One', 'API Test Author');
            const { response, body } = await jsonRequest(`/api/community/builds/${primaryId}`);
            assert.equal(response.status, 200);
            assert.deepEqual(body, {
                id: primaryId,
                title: 'Synthetic Community Build One',
                author: 'API Test Author',
                likes: 0,
                createdAt: body.createdAt,
                build: validBuild
            });
            assert.ok(!Number.isNaN(Date.parse(body.createdAt)));

            const storedDocument = await getStoredDocument(primaryId);
            assert.ok(storedDocument);
            assert.deepEqual(Object.keys(storedDocument).sort(), [
                '_id',
                'author',
                'build',
                'createdAt',
                'likes',
                'title'
            ]);
            assert.equal(storedDocument.likes, 0);
            assert.ok(storedDocument.createdAt instanceof Date);
            console.log(`SAMPLE DOCUMENT ${JSON.stringify(storedDocument)}`);
        });

        await runCheck('C2', 'list sort and pagination', async () => {
            assert.ok(primaryId, 'C1 did not create the primary build');
            await sleep(20);
            secondId = await createBuild('Synthetic Community Build Two', 'API Test Author');
            await sleep(20);
            thirdId = await createBuild('Synthetic Community Build Three', 'API Test Author');

            const secondLikeResponses = await Promise.all([
                jsonRequest(`/api/community/builds/${secondId}/like`, { method: 'POST' }),
                jsonRequest(`/api/community/builds/${secondId}/like`, { method: 'POST' })
            ]);
            assert.deepEqual(
                secondLikeResponses.map(result => result.body.likes).sort((left, right) => left - right),
                [1, 2]
            );
            const thirdLike = await jsonRequest(`/api/community/builds/${thirdId}/like`, { method: 'POST' });
            assert.equal(thirdLike.body.likes, 1);

            const newest = await getAllBuilds('newest');
            assert.ok(newest.total >= createdIds.size);
            const newestCreatedIds = newest.builds
                .filter(build => createdIds.has(build.id))
                .map(build => build.id);
            assert.deepEqual(newestCreatedIds, [thirdId, secondId, primaryId]);

            const byLikes = await getAllBuilds('likes');
            const likesByCreatedId = byLikes.builds
                .filter(build => createdIds.has(build.id))
                .map(build => [build.id, build.likes]);
            assert.deepEqual(likesByCreatedId, [
                [secondId, 2],
                [thirdId, 1],
                [primaryId, 0]
            ]);

            const baseline = await jsonRequest('/api/community/builds?sort=newest&limit=3&skip=0');
            const page = await jsonRequest('/api/community/builds?sort=newest&limit=1&skip=1');
            assert.equal(baseline.response.status, 200);
            assert.equal(page.response.status, 200);
            assert.equal(page.body.builds.length, Math.min(1, baseline.body.builds.slice(1).length));
            if (page.body.builds.length === 1) {
                assert.equal(page.body.builds[0].id, baseline.body.builds[1].id);
            }

            const capped = await jsonRequest('/api/community/builds?limit=500&skip=0');
            assert.equal(capped.response.status, 200);
            assert.equal(capped.body.builds.length, Math.min(50, capped.body.total));
            const zeroLimit = await jsonRequest('/api/community/builds?limit=0&skip=0');
            assert.equal(zeroLimit.response.status, 200);
            assert.deepEqual(zeroLimit.body.builds, []);
        });

        await runCheck('C3', 'atomic likes reflected in read and list', async () => {
            assert.ok(primaryId, 'C1 did not create the primary build');
            const likeResponses = await Promise.all([
                jsonRequest(`/api/community/builds/${primaryId}/like`, { method: 'POST' }),
                jsonRequest(`/api/community/builds/${primaryId}/like`, { method: 'POST' })
            ]);
            likeResponses.forEach(result => assert.equal(result.response.status, 200));
            assert.deepEqual(
                likeResponses.map(result => result.body.likes).sort((left, right) => left - right),
                [1, 2]
            );

            const read = await jsonRequest(`/api/community/builds/${primaryId}`);
            assert.equal(read.response.status, 200);
            assert.equal(read.body.likes, 2);

            const list = await getAllBuilds('likes');
            const listed = list.builds.find(build => build.id === primaryId);
            assert.ok(listed);
            assert.equal(listed.likes, 2);
        });

        await runCheck('C4', 'validation sanitization and not-found responses', async () => {
            const invalidRequests = [
                { expected: 400, body: { title: ' ', author: 'Author', build: validBuild } },
                { expected: 400, body: { author: 'Author', build: validBuild } },
                { expected: 400, body: { title: 'Title', author: ' ', build: validBuild } },
                { expected: 400, body: { title: 'Title', build: validBuild } },
                { expected: 400, body: { title: 'Title', author: 'Author', build: {} } },
                {
                    expected: 400,
                    body: { title: 'Title', author: 'Author', build: { unsupported: 'component' } }
                },
                {
                    expected: 400,
                    body: { title: 'x'.repeat(101), author: 'Author', build: validBuild }
                },
                {
                    expected: 400,
                    body: { title: 'Title', author: 'x'.repeat(51), build: validBuild }
                }
            ];
            for (const testCase of invalidRequests) {
                const result = await jsonRequest('/api/community/builds', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(testCase.body)
                });
                assert.equal(result.response.status, testCase.expected);
                assert.notEqual(result.response.status, 500);
            }

            const sanitizedId = await createBuild(
                'Safe <script>alert(1)</script> Build\u0007',
                'A<em>PI</em>\u0001 Author'
            );
            const sanitized = await jsonRequest(`/api/community/builds/${sanitizedId}`);
            assert.equal(sanitized.response.status, 200);
            assert.doesNotMatch(sanitized.body.title, /[<>]/);
            assert.doesNotMatch(sanitized.body.author, /[<>\u0000-\u001F\u007F-\u009F]/);

            const angleBracketId = await createBuild('Budget < $1000 > Build', 'API Test Author');
            const angleBracketBuild = await jsonRequest(`/api/community/builds/${angleBracketId}`);
            assert.equal(angleBracketBuild.response.status, 200);
            assert.match(angleBracketBuild.body.title, /\$1000/);
            assert.doesNotMatch(angleBracketBuild.body.title, /[<>]/);

            const malformedId = 'bad!';
            const nonexistentId = createdIds.has('AAAAAAAAAAAA') ? 'BBBBBBBBBBBB' : 'AAAAAAAAAAAA';
            for (const id of [malformedId, nonexistentId]) {
                const read = await jsonRequest(`/api/community/builds/${id}`);
                const like = await jsonRequest(`/api/community/builds/${id}/like`, { method: 'POST' });
                assert.equal(read.response.status, 404);
                assert.equal(like.response.status, 404);
            }

            const malformedJson = await jsonRequest('/api/community/builds', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: '{"title":'
            });
            assert.equal(malformedJson.response.status, 400);

            const oversized = await jsonRequest('/api/community/builds', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: 'Oversized',
                    author: 'API Test Author',
                    build: { cpu: 'x'.repeat(20 * 1024) }
                })
            });
            assert.equal(oversized.response.status, 400);
        });
    } finally {
        try {
            await cleanupCreatedBuilds();
            console.log(`PASS CLEANUP deleted=${createdIds.size}`);
        } catch (error) {
            results.push({ id: 'CLEANUP', ok: false });
            console.log(`FAIL CLEANUP: ${formatError(error)}`);
        }
    }

    if (results.some(result => !result.ok)) {
        process.exitCode = 1;
    }
})().catch(error => {
    console.log(`FAIL SETUP ${formatError(error)}`);
    process.exitCode = 1;
});
