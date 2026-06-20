const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const ROOT = path.resolve(__dirname, '..');
let baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const FETCH_TIMEOUT_MS = 5000;
const SERVER_START_TIMEOUT_MS = 20000;
const SERVER_STOP_TIMEOUT_MS = 5000;
const PORT_ALLOCATION_TIMEOUT_MS = 2000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pcbuilder';
const DB_NAME = process.env.DB_NAME || 'pcbuilder';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
    return fetch(url, {
        ...options,
        signal: AbortSignal.timeout(timeoutMs)
    });
}

async function serverIsReachable() {
    try {
        const response = await fetchWithTimeout(baseUrl, {}, 1000);
        return response.status >= 200 && response.status < 500;
    } catch {
        return false;
    }
}

async function serverSupportsBuildRoute() {
    try {
        const response = await fetchWithTimeout(`${baseUrl}/api/builds/AAAAAAAAAAAA`, {}, 1000);
        if (response.status !== 404) return false;
        const body = await response.json();
        return body && body.error === 'Build not found';
    } catch {
        return false;
    }
}

async function getAvailablePort() {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        const timeout = setTimeout(() => {
            server.close();
            reject(new Error(`Port allocation timed out after ${PORT_ALLOCATION_TIMEOUT_MS}ms`));
        }, PORT_ALLOCATION_TIMEOUT_MS);

        server.once('error', error => {
            clearTimeout(timeout);
            reject(error);
        });
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            server.close(error => {
                clearTimeout(timeout);
                if (error) {
                    reject(error);
                } else {
                    resolve(address.port);
                }
            });
        });
    });
}

async function startServerIfNeeded() {
    if (await serverSupportsBuildRoute()) {
        return null;
    }

    if (await serverIsReachable()) {
        baseUrl = `http://localhost:${await getAvailablePort()}`;
    }

    const child = spawn(process.execPath, ['server.js'], {
        cwd: ROOT,
        env: {
            ...process.env,
            PORT: new URL(baseUrl).port || (new URL(baseUrl).protocol === 'https:' ? '443' : '80')
        },
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true
    });
    let output = '';
    child.stdout.on('data', chunk => {
        output += chunk.toString();
    });
    child.stderr.on('data', chunk => {
        output += chunk.toString();
    });

    const deadline = Date.now() + SERVER_START_TIMEOUT_MS;
    while (Date.now() < deadline) {
        if (child.exitCode !== null) {
            throw new Error(`Server exited before readiness (code ${child.exitCode})\n${output}`);
        }
        if (await serverSupportsBuildRoute()) {
            return child;
        }
        await sleep(250);
    }

    child.kill();
    throw new Error(`Server readiness timed out after ${SERVER_START_TIMEOUT_MS}ms\n${output}`);
}

async function stopServer(child) {
    if (!child || child.exitCode !== null || child.signalCode !== null) {
        return;
    }

    child.kill();
    const deadline = Date.now() + SERVER_STOP_TIMEOUT_MS;
    while (child.exitCode === null && child.signalCode === null && Date.now() < deadline) {
        await sleep(100);
    }
    if (child.exitCode === null && child.signalCode === null) {
        throw new Error(`Server shutdown timed out after ${SERVER_STOP_TIMEOUT_MS}ms`);
    }
}

async function cleanupBuild(id) {
    if (!id) return;

    const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: FETCH_TIMEOUT_MS });
    try {
        await client.connect();
        await client.db(DB_NAME).collection('builds').deleteOne({ _id: id });
    } finally {
        await client.close();
    }
}

async function getStoredBuild(id) {
    const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: FETCH_TIMEOUT_MS });
    try {
        await client.connect();
        return await client.db(DB_NAME).collection('builds').findOne({ _id: id });
    } finally {
        await client.close();
    }
}

function record(name, detail = '') {
    console.log(`PASS ${name}${detail ? ` ${detail}` : ''}`);
}

(async () => {
    let server = null;
    let createdId = '';

    try {
        server = await startServerIfNeeded();
        record('server ready', `${server ? 'started-by-test' : 'already-running'} url=${baseUrl}`);

        const malformedJsonResponse = await fetchWithTimeout(`${baseUrl}/api/builds`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{"cpu":'
        });
        assert.equal(malformedJsonResponse.status, 400);
        record('POST /api/builds malformed JSON rejected', `status=${malformedJsonResponse.status}`);

        const validBuild = {
            cpu: '507f1f77bcf86cd799439011',
            gpu: { id: '507f1f77bcf86cd799439012', qty: 2 },
            motherboard: '507f1f77bcf86cd799439013',
            ram: { id: '507f1f77bcf86cd799439014', qty: 4 },
            storage2: 'storage-reference_2',
            addon6: 'addon.reference-6'
        };

        const createResponse = await fetchWithTimeout(`${baseUrl}/api/builds`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validBuild)
        });
        assert.equal(createResponse.status, 200);
        const createBody = await createResponse.json();
        assert.deepEqual(Object.keys(createBody), ['id']);
        assert.match(createBody.id, /^[A-Za-z0-9_-]{6,16}$/);
        assert.equal(createBody.id.length, 12);
        createdId = createBody.id;
        record('POST /api/builds', `id=${createdId}`);

        const getResponse = await fetchWithTimeout(`${baseUrl}/api/builds/${createdId}`);
        assert.equal(getResponse.status, 200);
        assert.deepEqual(await getResponse.json(), validBuild);
        record('GET /api/builds/:id round-trip');

        const storedDocument = await getStoredBuild(createdId);
        assert.ok(storedDocument);
        assert.deepEqual(Object.keys(storedDocument).sort(), ['_id', 'build', 'createdAt']);
        assert.equal(storedDocument._id, createdId);
        assert.deepEqual(storedDocument.build, validBuild);
        assert.ok(storedDocument.createdAt instanceof Date);
        record('Mongo stored document shape');

        const missingId = createdId === 'AAAAAAAAAAAA' ? 'BBBBBBBBBBBB' : 'AAAAAAAAAAAA';
        const missingResponse = await fetchWithTimeout(`${baseUrl}/api/builds/${missingId}`);
        assert.equal(missingResponse.status, 404);
        assert.deepEqual(await missingResponse.json(), { error: 'Build not found' });
        record('GET /api/builds/:id missing');

        const unknownKeyResponse = await fetchWithTimeout(`${baseUrl}/api/builds`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cpu: validBuild.cpu, unexpected: validBuild.cpu })
        });
        assert.ok(unknownKeyResponse.status >= 400 && unknownKeyResponse.status < 500);
        record('POST /api/builds unknown key rejected', `status=${unknownKeyResponse.status}`);

        const arbitraryFieldResponse = await fetchWithTimeout(`${baseUrl}/api/builds`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                gpu: {
                    id: validBuild.gpu.id,
                    qty: 1,
                    title: '<img src=x onerror=alert(1)>'
                }
            })
        });
        assert.ok(arbitraryFieldResponse.status >= 400 && arbitraryFieldResponse.status < 500);
        record('POST /api/builds arbitrary nested field rejected', `status=${arbitraryFieldResponse.status}`);

        const oversizedResponse = await fetchWithTimeout(`${baseUrl}/api/builds`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cpu: 'a'.repeat(17 * 1024) })
        });
        assert.ok(
            oversizedResponse.status >= 400 && oversizedResponse.status < 500,
            `expected 4xx, received ${oversizedResponse.status}`
        );
        record('POST /api/builds oversized body rejected', `status=${oversizedResponse.status}`);

        const clientSource = fs.readFileSync(path.join(ROOT, 'public', 'script.js'), 'utf8');
        assert.match(clientSource, /fetch\('\/api\/builds',\s*\{/);
        assert.match(clientSource, /fetch\(`\/api\/builds\/\$\{encodeURIComponent\(buildParam\)\}`\)/);
        assert.match(clientSource, /JSON\.parse\(atob\(legacyBuildParam\)\)/);
        record('client short-id share/load and legacy base64 branches');
    } finally {
        try {
            await cleanupBuild(createdId);
        } finally {
            await stopServer(server);
        }
    }
})().catch(error => {
    console.error(`FAIL ${error.stack || error.message || String(error)}`);
    process.exitCode = 1;
});
