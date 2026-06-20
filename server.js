const express = require('express');
// Optional gzip middleware — load defensively so a missing/broken dependency can
// never crash the whole server on boot (it once did: compression wasn't in
// package.json, so production npm install lacked it and require() threw -> 502).
let compression = null;
try {
    compression = require('compression');
} catch (err) {
    console.warn('compression middleware unavailable, continuing without gzip:', err.message);
}
const path = require('path');
const crypto = require('crypto');
const { ObjectId } = require('mongodb');
const { connectToDatabase, getDatabase } = require('./config/database');

// Function to detect and filter out desktop/laptop systems
// DISABLED - This filter was causing too many false positives
function isDesktopOrLaptop(title) {
    // Always return false to disable filtering
    return false;
}

// Function to check if a component has a valid price (not $0 or null) and has
// not been hidden by the nightly availability sweep (scripts/sweepUnavailable
// Components.js) for being delisted / no longer sold.
function hasValidPrice(item) {
    if (item.hidden === true) return false;
    const price = parseFloat(item.price || item.currentPrice || item.basePrice);
    return !isNaN(price) && price > 0;
}

// GPU benchmark data for performance scoring
// GPU relative-performance index — canonical data in data/gpuBenchmarks.json.
// Strictly monotonic: a higher value always means a strictly faster GPU. Keep
// public/script.js's copy in sync with the JSON when editing.
const gpuBenchmarksRaw = require('./data/gpuBenchmarks.json');
const GPU_BENCH = Object.fromEntries(
    Object.entries(gpuBenchmarksRaw).filter(([k]) => k !== '_comment').map(([k, v]) => [k.toUpperCase(), v])
);
const GPU_BENCH_MAX = Math.max(...Object.values(GPU_BENCH));
// Longest keys first so "RX 7900 XTX" wins over "RX 7900" in the name fallback.
const GPU_BENCH_KEYS = Object.keys(GPU_BENCH).sort((a, b) => b.length - a.length);

// Normalized (0-1) GPU performance from benchmark data.
function getGpuPerformance(gpu) {
    // Prefer the clean gpuModel/model field (exact match); fall back to substring-
    // matching the messy product name (handles "RTX™ 4090", partner naming, etc.).
    const model = String(gpu.gpuModel || gpu.model || '').toUpperCase();
    let score = model ? GPU_BENCH[model] : undefined;
    if (score === undefined) {
        const name = String(gpu.name || gpu.title || '').toUpperCase();
        const key = GPU_BENCH_KEYS.find(k => name.includes(k));
        if (key) score = GPU_BENCH[key];
    }
    return score === undefined ? null : score / GPU_BENCH_MAX;
}

const app = express();
const PORT = process.env.PORT || 3000;
const LIST_PARTS_PROJECTION = { priceHistory: 0 };
const SHARED_BUILD_BODY_LIMIT_BYTES = 16 * 1024;
const SHARED_BUILD_ID_PATTERN = /^[A-Za-z0-9_-]{12}$/;
const SHARED_BUILD_REFERENCE_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
const SHARED_BUILD_KEYS = new Set([
    'gpu',
    'cpu',
    'motherboard',
    'ram',
    'cooler',
    'psu',
    'storage',
    'storage2',
    'storage3',
    'storage4',
    'storage5',
    'storage6',
    'case',
    'addon',
    'addon2',
    'addon3',
    'addon4',
    'addon5',
    'addon6'
]);

function normalizeSharedBuild(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.getPrototypeOf(body) !== Object.prototype) {
        return { error: 'Build must be an object' };
    }

    const entries = Object.entries(body);
    if (entries.length === 0) {
        return { error: 'Build must contain at least one component' };
    }

    const build = {};
    for (const [type, reference] of entries) {
        if (!SHARED_BUILD_KEYS.has(type)) {
            return { error: `Unknown component type: ${type}` };
        }

        if (typeof reference === 'string') {
            if (!SHARED_BUILD_REFERENCE_PATTERN.test(reference)) {
                return { error: `Invalid component reference: ${type}` };
            }
            build[type] = reference;
            continue;
        }

        if (type !== 'gpu' && type !== 'ram') {
            return { error: `Invalid component reference: ${type}` };
        }
        if (!reference || typeof reference !== 'object' || Array.isArray(reference) ||
            Object.getPrototypeOf(reference) !== Object.prototype) {
            return { error: `Invalid component reference: ${type}` };
        }

        const referenceKeys = Object.keys(reference);
        if (referenceKeys.length !== 2 || !referenceKeys.includes('id') || !referenceKeys.includes('qty') ||
            typeof reference.id !== 'string' || !SHARED_BUILD_REFERENCE_PATTERN.test(reference.id) ||
            !Number.isInteger(reference.qty) || reference.qty < 1 || reference.qty > 16) {
            return { error: `Invalid component reference: ${type}` };
        }

        build[type] = { id: reference.id, qty: reference.qty };
    }

    return { build };
}

function createSharedBuildId() {
    return crypto.randomBytes(9).toString('base64url');
}

function isSharedBuildPostRequest(req) {
    return req.method === 'POST' && (req.path === '/api/builds' || req.path === '/api/builds/');
}

// Simple in-memory cache with TTL
class SimpleCache {
    constructor(ttl = 300000) { // Default 5 minutes
        this.cache = new Map();
        this.ttl = ttl;
    }

    set(key, value) {
        this.cache.set(key, {
            value,
            expires: Date.now() + this.ttl
        });
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        if (Date.now() > item.expires) {
            this.cache.delete(key);
            return null;
        }

        return item.value;
    }

    clear() {
        this.cache.clear();
    }
}

// Create cache instances
const apiCache = new SimpleCache(300000); // 5 minute cache for API responses
const statsCache = new SimpleCache(600000); // 10 minute cache for statistics

// Caching middleware
function cacheMiddleware(duration) {
    return (req, res, next) => {
        // Create cache key from URL and query params
        const key = req.originalUrl || req.url;
        const cachedResponse = apiCache.get(key);

        if (cachedResponse) {
            console.log(`✅ Cache HIT: ${key}`);
            return res.json(cachedResponse);
        }

        console.log(`❌ Cache MISS: ${key}`);

        // Override res.json to cache the response
        const originalJson = res.json.bind(res);
        res.json = function(data) {
            apiCache.set(key, data);
            // Set cache headers
            res.set({
                'Cache-Control': `public, max-age=${Math.floor(duration / 1000)}`,
                'ETag': `"${Date.now()}"` // Simple ETag
            });
            return originalJson(data);
        };

        next();
    };
}

// Middleware
if (compression) {
    app.use(compression());
}
const parseSharedBuildJson = express.json({ limit: SHARED_BUILD_BODY_LIMIT_BYTES });
app.use((req, res, next) => {
    if (isSharedBuildPostRequest(req)) {
        return parseSharedBuildJson(req, res, next);
    }
    next();
});
app.use(express.json());

// Add cache-control headers to force browsers to reload
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
});

app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: 0, // Disable caching for development
    etag: false,
    lastModified: false
}));

// Connect to MongoDB
let db = null;

async function initializeDatabase() {
    try {
        await connectToDatabase();
        db = getDatabase();
        console.log('✅ Connected to MongoDB database');
    } catch (error) {
        console.error('❌ Failed to connect to MongoDB:', error);
    }
}

// API Routes
app.get('/api/parts', cacheMiddleware(300000), async (req, res) => {
    try {
        if (!db) {
            return res.status(500).json({ error: 'Database not connected' });
        }

        const { category, manufacturer, priceRange, search } = req.query;
        let filter = {};

        // Category filter
        if (category && category !== 'all') {
            filter.category = category;
        }

        // Manufacturer filter
        if (manufacturer) {
            filter.manufacturer = manufacturer;
        }

        // Price range filter
        if (priceRange) {
            const [min, max] = priceRange.split('-').map(Number);
            if (max) {
                filter.price = { $gte: min, $lte: max };
            } else {
                filter.price = { $gte: min };
            }
        }

        // Search filter
        if (search) {
            filter.$text = { $search: search };
        }

        // Get parts from all collections in PARALLEL
        const collections = ['cpus', 'motherboards', 'gpus', 'rams', 'storages', 'psus', 'cases', 'coolers'];

        const collectionPromises = collections.map(collectionName =>
            db.collection(collectionName).find(filter, { projection: LIST_PARTS_PROJECTION }).toArray()
                .then(parts => {
                    // Filter out parts with invalid prices
                    const validParts = parts.filter(part => hasValidPrice(part));
                    // Add category to each part
                    validParts.forEach(part => {
                        part.category = collectionName;
                    });
                    return validParts;
                })
                .catch(error => {
                    console.error(`Error fetching from ${collectionName}:`, error);
                    return [];
                })
        );

        const results = await Promise.all(collectionPromises);
        const allParts = results.flat();

        res.json(allParts);
    } catch (error) {
        console.error('Error fetching parts:', error);
        res.status(500).json({ error: 'Failed to fetch parts' });
    }
});

app.get('/api/parts/:category', cacheMiddleware(300000), async (req, res) => {
    try {
        if (!db) {
            return res.status(500).json({ error: 'Database not connected' });
        }

        const { category } = req.params;
        
        if (category === 'gpus') {
            // Handle GPU collections specially
            return await handleGPURequest(req, res);
        }
        
        if (category === 'cpus') {
            // Handle CPU collections specially
            return await handleCPURequest(req, res);
        }
        
        if (category === 'motherboards') {
            // Handle motherboard collections specially
            return await handleMotherboardRequest(req, res);
        }
        
        if (category === 'rams') {
            // Handle RAM collections specially
            return await handleRAMRequest(req, res);
        }
        
        if (category === 'psus') {
            // Handle PSU collections specially
            return await handlePSURequest(req, res);
        }

        const { manufacturer, priceRange, search } = req.query;
        let filter = {};

        // Manufacturer filter
        if (manufacturer) {
            filter.manufacturer = manufacturer;
        }

        // Price range filter
        if (priceRange) {
            const [min, max] = priceRange.split('-').map(Number);
            if (max) {
                filter.price = { $gte: min, $lte: max };
            } else {
                filter.price = { $gte: min };
            }
        }

        // Search filter
        if (search) {
            filter.$text = { $search: search };
        }

        const collection = db.collection(category);
        const parts = await collection.find(filter, { projection: LIST_PARTS_PROJECTION }).toArray();

        // Filter out parts with invalid prices
        const validParts = parts.filter(part => hasValidPrice(part));

        // Add category to each part
        validParts.forEach(part => {
            part.category = category;
        });

        res.json(validParts);
    } catch (error) {
        console.error(`Error fetching ${req.params.category}:`, error);
        res.status(500).json({ error: `Failed to fetch ${req.params.category}` });
    }
});

async function getPriceHistoryCollectionNames(category, preferredCollection) {
    const normalizedCategory = category.toLowerCase();

    if (preferredCollection) {
        return [preferredCollection];
    }

    if (normalizedCategory === 'gpu' || normalizedCategory === 'gpus') {
        // Prefer the consolidated `gpus` collection; fall back to legacy shards.
        const mainGpuCollection = await db.listCollections({ name: 'gpus' }).toArray();
        if (mainGpuCollection.length > 0) {
            return ['gpus'];
        }
        const collections = await db.listCollections({ name: /^gpus_/ }).toArray();
        return collections.map(col => col.name);
    }

    const categoryCollections = {
        cpu: 'cpus',
        cpus: 'cpus',
        motherboard: 'motherboards',
        motherboards: 'motherboards',
        ram: 'rams',
        rams: 'rams',
        psu: 'psus',
        psus: 'psus',
        cooler: 'coolers',
        coolers: 'coolers',
        storage: 'storages',
        storages: 'storages',
        case: 'cases',
        cases: 'cases',
        addon: 'addons',
        addons: 'addons'
    };

    return categoryCollections[normalizedCategory] ? [categoryCollections[normalizedCategory]] : [normalizedCategory];
}

app.get('/api/parts/:category/:id/price-history', async (req, res) => {
    try {
        if (!db) {
            return res.status(500).json({ error: 'Database not connected' });
        }

        const { category, id } = req.params;
        const { collection } = req.query;
        const idQueries = [{ _id: id }];

        if (ObjectId.isValid(id)) {
            idQueries.unshift({ _id: new ObjectId(id) });
        }

        const collectionNames = await getPriceHistoryCollectionNames(category, collection);

        for (const collectionName of collectionNames) {
            const collections = await db.listCollections({ name: collectionName }).toArray();
            if (collections.length === 0) {
                continue;
            }

            const doc = await db.collection(collectionName).findOne(
                { $or: idQueries },
                { projection: { priceHistory: 1 } }
            );

            if (doc) {
                return res.json({ priceHistory: Array.isArray(doc.priceHistory) ? doc.priceHistory : [] });
            }
        }

        res.status(404).json({ error: 'Component not found', priceHistory: [] });
    } catch (error) {
        console.error('Error fetching component price history:', error);
        res.status(500).json({ error: 'Failed to fetch price history', priceHistory: [] });
    }
});

// Extract GPU model from product name/title
function extractGPUModel(name) {
    if (!name) return 'Unknown';

    const nameUpper = name.toUpperCase();

    // NVIDIA RTX patterns - more flexible to handle special characters
    const rtxMatch = nameUpper.match(/RTX[^\d]*(\d{4})[^\w]*(TI)?[^\w]*(SUPER)?/i);
    if (rtxMatch) {
        const model = rtxMatch[1];
        const ti = rtxMatch[2] ? ' Ti' : '';
        const superText = rtxMatch[3] ? ' Super' : '';
        return `RTX ${model}${ti}${superText}`;
    }

    // NVIDIA GTX patterns - more flexible to handle special characters
    const gtxMatch = nameUpper.match(/GTX[^\d]*(\d{4})[^\w]*(TI)?/i);
    if (gtxMatch) {
        const model = gtxMatch[1];
        const ti = gtxMatch[2] ? ' Ti' : '';
        return `GTX ${model}${ti}`;
    }

    // AMD RX patterns - more flexible to handle special characters
    const rxMatch = nameUpper.match(/RX[^\d]*(\d{4})[^\w]*(XTX|XT)?/i);
    if (rxMatch) {
        const model = rxMatch[1];
        const xt = rxMatch[2] ? ' ' + rxMatch[2] : '';
        return `RX ${model}${xt}`;
    }

    // Intel Arc patterns - more flexible to handle special characters
    const arcMatch = nameUpper.match(/ARC[^\w]*([A-Z]\d{3})/i);
    if (arcMatch) {
        return `Arc ${arcMatch[1]}`;
    }

    return 'Unknown';
}

// Get GPU TDP based on model
function getGPUTDP(gpuName) {
    const model = extractGPUModel(gpuName);
    const tdpMap = {
        'RTX 5090': 575,
        'RTX 4090': 450,
        'RTX 4080': 320,
        'RTX 4070 Ti': 285,
        'RTX 4070': 200,
        'RTX 3090': 350,
        'RTX 3080 Ti': 350,
        'RTX 3080': 320,
        'RTX 3070': 220,
        'RX 7900 XTX': 355,
        'RX 7900 XT': 300,
        'RX 7800 XT': 263,
        'RX 7700 XT': 245,
        'RX 6900 XT': 300,
        'RX 6800 XT': 300,
        'RX 6800': 250
    };
    return tdpMap[model] || 250; // Default to 250W if unknown
}

// Get CPU TDP based on tdp field or estimate
function getCPUTDP(cpu) {
    // Try to get TDP from various possible fields
    // Use parseFloat which can handle strings like "65W" or "65 W"
    let tdp;

    if (cpu.tdp) {
        tdp = parseFloat(cpu.tdp);
        if (!isNaN(tdp)) return tdp;
    }
    if (cpu.TDP) {
        tdp = parseFloat(cpu.TDP);
        if (!isNaN(tdp)) return tdp;
    }
    if (cpu.specs && cpu.specs.tdp) {
        tdp = parseFloat(cpu.specs.tdp);
        if (!isNaN(tdp)) return tdp;
    }
    if (cpu.specs && cpu.specs.TDP) {
        tdp = parseFloat(cpu.specs.TDP);
        if (!isNaN(tdp)) return tdp;
    }

    // Estimate based on cores if no TDP specified
    // Use realistic max turbo power values for modern CPUs
    const cores = cpu.cores || 8;
    if (cores >= 20) return 253; // High-end CPUs like i9-13900K/14900K
    if (cores >= 16) return 241; // CPUs like i7-13700K/Ryzen 9 7900X
    if (cores >= 12) return 180; // Mid-high CPUs like Ryzen 7 7700X
    if (cores >= 8) return 142;  // Mid-range CPUs like i5-13600K
    if (cores >= 6) return 125;  // Entry-level gaming CPUs
    return 65;  // Budget CPUs
}

// Special handler for GPU collections
async function handleGPURequest(req, res) {
    try {
        const { manufacturer, priceRange, search, groupByModel } = req.query;
        
        // Prefer the consolidated `gpus` collection. Only fall back to the legacy
        // per-model `gpus_*` shards if `gpus` doesn't exist yet (pre-migration) —
        // this avoids double-counting docs that live in both during a transition.
        const mainGpuCollection = await db.listCollections({ name: 'gpus' }).toArray();
        let gpuCollectionNames;
        if (mainGpuCollection.length > 0) {
            gpuCollectionNames = ['gpus'];
        } else {
            const collections = await db.listCollections({ name: /^gpus_/ }).toArray();
            gpuCollectionNames = collections.map(col => col.name);
        }

        console.log(`Found GPU collections: ${gpuCollectionNames.join(', ')}`);

        // Fetch from all GPU collections in PARALLEL
        const gpuPromises = gpuCollectionNames.map(collectionName =>
            db.collection(collectionName).find({}, { projection: LIST_PARTS_PROJECTION }).toArray()
                .then(gpus => {
                    // Filter out desktops, laptops, pre-built systems, and items with invalid prices
                    const filteredGpus = gpus.filter(gpu =>
                        !isDesktopOrLaptop(gpu.title || gpu.name || '') && hasValidPrice(gpu)
                    );

                    // Add source collection info
                    filteredGpus.forEach(gpu => {
                        gpu.collection = collectionName;
                        gpu.category = 'gpus';
                    });

                    if (gpus.length !== filteredGpus.length) {
                        console.log(`Loaded ${filteredGpus.length} GPUs from ${collectionName} (filtered out ${gpus.length - filteredGpus.length} desktop/laptop systems)`);
                    } else {
                        console.log(`Loaded ${filteredGpus.length} GPUs from ${collectionName}`);
                    }

                    return filteredGpus;
                })
                .catch(error => {
                    console.error(`Error fetching from ${collectionName}:`, error);
                    return [];
                })
        );

        const gpuResults = await Promise.all(gpuPromises);
        const allGPUs = gpuResults.flat();

        // Apply filters
        let filteredGPUs = allGPUs;

        // Manufacturer filter
        if (manufacturer) {
            filteredGPUs = filteredGPUs.filter(gpu => 
                gpu.manufacturer && gpu.manufacturer.toUpperCase() === manufacturer.toUpperCase()
            );
        }

        // Price range filter
        if (priceRange) {
            const [min, max] = priceRange.split('-').map(Number);
            filteredGPUs = filteredGPUs.filter(gpu => {
                const price = parseFloat(gpu.price) || 0;
                if (max) {
                    return price >= min && price <= max;
                } else {
                    return price >= min;
                }
            });
        }

        // Search filter
        if (search) {
            const searchLower = search.toLowerCase();
            filteredGPUs = filteredGPUs.filter(gpu => 
                (gpu.title && gpu.title.toLowerCase().includes(searchLower)) ||
                (gpu.name && gpu.name.toLowerCase().includes(searchLower)) ||
                (gpu.manufacturer && gpu.manufacturer.toLowerCase().includes(searchLower)) ||
                (gpu.gpuModel && gpu.gpuModel.toLowerCase().includes(searchLower))
            );
        }

        // Group by model if requested (default behavior)
        if (groupByModel !== 'false') {
            const modelMap = new Map();

            for (const gpu of filteredGPUs) {
                const modelName = extractGPUModel(gpu.name || gpu.title);

                // Only consider available GPUs for the cheapest price
                const isAvailable = gpu.hidden !== true && gpu.isAvailable !== false && gpu.currentPrice != null;
                const price = parseFloat(gpu.currentPrice || gpu.price) || Infinity;

                if (!modelMap.has(modelName)) {
                    modelMap.set(modelName, {
                        model: modelName,
                        cheapestCard: gpu,
                        cheapestPrice: isAvailable ? price : Infinity,
                        totalCards: 1,
                        availableCards: isAvailable ? 1 : 0,
                        manufacturer: gpu.manufacturer || 'Unknown',
                        totalSaveCount: gpu.saveCount || 0,
                        reviewScoreSum: gpu.reviewScore || 0,
                        reviewScoreCount: gpu.reviewScore ? 1 : 0,
                        reviewTotalCount: gpu.reviewCount || 0,
                        reviewSource: gpu.reviewSource || 'Amazon'
                    });
                } else {
                    const modelData = modelMap.get(modelName);
                    modelData.totalCards++;
                    modelData.totalSaveCount += (gpu.saveCount || 0);
                    if (gpu.reviewScore) {
                        modelData.reviewScoreSum += gpu.reviewScore;
                        modelData.reviewScoreCount++;
                        modelData.reviewTotalCount += (gpu.reviewCount || 0);
                    }

                    if (isAvailable) {
                        modelData.availableCards++;

                        // Update cheapest if this card is cheaper
                        if (price < modelData.cheapestPrice) {
                            modelData.cheapestPrice = price;
                            modelData.cheapestCard = gpu;
                        }
                    }
                }
            }

            // Convert map to array and format for frontend
            const groupedGPUs = Array.from(modelMap.values()).map(modelData => {
                const card = modelData.cheapestCard;

                return {
                    _id: card._id,
                    name: modelData.model,
                    model: modelData.model,
                    manufacturer: modelData.manufacturer,
                    currentPrice: modelData.cheapestPrice !== Infinity ? modelData.cheapestPrice : null,
                    basePrice: card.basePrice || modelData.cheapestPrice,
                    salePrice: card.salePrice,
                    isOnSale: card.isOnSale || false,
                    isAvailable: modelData.availableCards > 0,
                    memory: card.memory,
                    sourceUrl: card.sourceUrl,
                    updatedAt: card.updatedAt,
                    totalCards: modelData.totalCards,
                    availableCards: modelData.availableCards,
                    saveCount: modelData.totalSaveCount, // Sum of all variants' save counts
                    releaseYear: card.releaseYear,
                    tdp: card.tdp,
                    length: card.length,
                    category: 'gpus',
                    collection: card.collection,
                    reviewScore: modelData.reviewScoreCount > 0
                        ? Math.round((modelData.reviewScoreSum / modelData.reviewScoreCount) * 10) / 10
                        : null,
                    reviewCount: modelData.reviewTotalCount || null,
                    reviewSource: modelData.reviewSource || 'Amazon'
                };
            });

            // Sort by manufacturer and model
            groupedGPUs.sort((a, b) => {
                if (a.manufacturer !== b.manufacturer) {
                    return a.manufacturer.localeCompare(b.manufacturer);
                }
                return a.model.localeCompare(b.model);
            });

            console.log(`Returning ${groupedGPUs.length} GPU models (grouped from ${filteredGPUs.length} individual cards)`);
            res.json(groupedGPUs);
        } else {
            // Return individual cards (old behavior)
            console.log(`Returning ${filteredGPUs.length} GPUs after filtering`);
            res.json(filteredGPUs);
        }

    } catch (error) {
        console.error('Error in handleGPURequest:', error);
        res.status(500).json({ error: 'Failed to fetch GPU data' });
    }
}

// Special handler for CPU collections
async function handleCPURequest(req, res) {
    try {
        const { manufacturer, priceRange, search, tier } = req.query;
        
        // Get all collections that start with "cpus_"
        const collections = await db.listCollections({ name: /^cpus_/ }).toArray();
        const cpuCollectionNames = collections.map(col => col.name);
        
        // Also check for the main 'cpus' collection
        const mainCpuCollection = await db.listCollections({ name: 'cpus' }).toArray();
        if (mainCpuCollection.length > 0) {
            cpuCollectionNames.push('cpus');
        }

        console.log(`Found CPU collections: ${cpuCollectionNames.join(', ')}`);

        // Fetch from all CPU collections in PARALLEL
        const cpuPromises = cpuCollectionNames.map(collectionName =>
            db.collection(collectionName).find({}, { projection: LIST_PARTS_PROJECTION }).toArray()
                .then(cpus => {
                    // For CPUs, we don't filter out desktop processors as they're what we want
                    // Add source collection info
                    cpus.forEach(cpu => {
                        cpu.collection = collectionName;
                        cpu.category = 'cpus';
                    });

                    console.log(`Loaded ${cpus.length} CPUs from ${collectionName}`);
                    return cpus;
                })
                .catch(error => {
                    console.error(`Error fetching from ${collectionName}:`, error);
                    return [];
                })
        );

        const cpuResults = await Promise.all(cpuPromises);
        const allCPUs = cpuResults.flat();

        // Apply filters
        let filteredCPUs = allCPUs;

        // Filter out unavailable CPUs and CPUs with $0 price
        filteredCPUs = filteredCPUs.filter(cpu => {
            // Hidden by the availability sweep (delisted / no longer sold)
            if (cpu.hidden === true) {
                return false;
            }

            // Check availability
            if (cpu.isAvailable === false) {
                return false;
            }

            // Check price (filter out null, undefined, 0, or very low prices)
            const price = parseFloat(cpu.currentPrice || cpu.price);
            if (!price || price <= 0) {
                return false;
            }

            return true;
        });

        // Manufacturer filter
        if (manufacturer) {
            filteredCPUs = filteredCPUs.filter(cpu =>
                cpu.manufacturer && cpu.manufacturer.toUpperCase() === manufacturer.toUpperCase()
            );
        }

        // Performance tier filter
        if (tier) {
            filteredCPUs = filteredCPUs.filter(cpu =>
                cpu.performanceTier && cpu.performanceTier.toLowerCase().includes(tier.toLowerCase())
            );
        }

        // Price range filter
        if (priceRange) {
            const [min, max] = priceRange.split('-').map(Number);
            filteredCPUs = filteredCPUs.filter(cpu => {
                const price = parseFloat(cpu.currentPrice || cpu.price) || 0;
                if (max) {
                    return price >= min && price <= max;
                } else {
                    return price >= min;
                }
            });
        }

        // Search filter
        if (search) {
            const searchLower = search.toLowerCase();
            filteredCPUs = filteredCPUs.filter(cpu => 
                (cpu.title && cpu.title.toLowerCase().includes(searchLower)) ||
                (cpu.name && cpu.name.toLowerCase().includes(searchLower)) ||
                (cpu.manufacturer && cpu.manufacturer.toLowerCase().includes(searchLower)) ||
                (cpu.model && cpu.model.toLowerCase().includes(searchLower))
            );
        }

        // De-duplicate CPUs by _id or title
        const seenIds = new Set();
        const uniqueCPUs = filteredCPUs.filter(cpu => {
            const id = cpu._id ? cpu._id.toString() : cpu.title;
            if (seenIds.has(id)) {
                return false;
            }
            seenIds.add(id);
            return true;
        });

        console.log(`Returning ${uniqueCPUs.length} CPUs after filtering`);
        res.json(uniqueCPUs);
        
    } catch (error) {
        console.error('Error in handleCPURequest:', error);
        res.status(500).json({ error: 'Failed to fetch CPU data' });
    }
}

// Special handler for Motherboard collections
async function handleMotherboardRequest(req, res) {
    try {
        const { manufacturer, priceRange, search, socket, chipset, formFactor } = req.query;
        
        // Check for the main 'motherboards' collection
        const collection = db.collection('motherboards');
        const motherboards = await collection.find({}, { projection: LIST_PARTS_PROJECTION }).toArray();
        
        // Add source collection info
        motherboards.forEach(motherboard => {
            motherboard.collection = 'motherboards';
            motherboard.category = 'motherboards';
        });
        
        console.log(`Loaded ${motherboards.length} motherboards from motherboards collection`);

        // Apply filters
        let filteredMotherboards = motherboards.filter(motherboard => hasValidPrice(motherboard));

        // Manufacturer filter
        if (manufacturer) {
            filteredMotherboards = filteredMotherboards.filter(motherboard => 
                motherboard.manufacturer && motherboard.manufacturer.toUpperCase() === manufacturer.toUpperCase()
            );
        }

        // Socket filter
        if (socket) {
            filteredMotherboards = filteredMotherboards.filter(motherboard => 
                motherboard.socket && motherboard.socket.toUpperCase() === socket.toUpperCase()
            );
        }

        // Chipset filter
        if (chipset) {
            filteredMotherboards = filteredMotherboards.filter(motherboard => 
                motherboard.chipset && motherboard.chipset.toUpperCase() === chipset.toUpperCase()
            );
        }

        // Form factor filter
        if (formFactor) {
            filteredMotherboards = filteredMotherboards.filter(motherboard => 
                motherboard.formFactor && motherboard.formFactor.toLowerCase().replace(/\s+/g, '-') === formFactor.toLowerCase()
            );
        }

        // Price range filter
        if (priceRange) {
            const [min, max] = priceRange.split('-').map(Number);
            filteredMotherboards = filteredMotherboards.filter(motherboard => {
                const price = parseFloat(motherboard.currentPrice || motherboard.price) || 0;
                if (max) {
                    return price >= min && price <= max;
                } else {
                    return price >= min;
                }
            });
        }

        // Search filter
        if (search) {
            const searchLower = search.toLowerCase();
            filteredMotherboards = filteredMotherboards.filter(motherboard => 
                (motherboard.title && motherboard.title.toLowerCase().includes(searchLower)) ||
                (motherboard.name && motherboard.name.toLowerCase().includes(searchLower)) ||
                (motherboard.manufacturer && motherboard.manufacturer.toLowerCase().includes(searchLower)) ||
                (motherboard.chipset && motherboard.chipset.toLowerCase().includes(searchLower)) ||
                (motherboard.socket && motherboard.socket.toLowerCase().includes(searchLower))
            );
        }

        console.log(`Returning ${filteredMotherboards.length} motherboards after filtering`);
        res.json(filteredMotherboards);
        
    } catch (error) {
        console.error('Error in handleMotherboardRequest:', error);
        res.status(500).json({ error: 'Failed to fetch motherboard data' });
    }
}

// Special handler for RAM collections
async function handleRAMRequest(req, res) {
    try {
        const { manufacturer, priceRange, search, memoryType, speed, capacity } = req.query;
        
        // Check for the main 'rams' collection
        const collection = db.collection('rams');
        const ramModules = await collection.find({}, { projection: LIST_PARTS_PROJECTION }).toArray();
        
        // Add source collection info
        ramModules.forEach(ram => {
            ram.collection = 'rams';
            ram.category = 'rams';
        });
        
        console.log(`Loaded ${ramModules.length} RAM modules from rams collection`);

        // Apply filters
        let filteredRAM = ramModules;

        // Filter out RAM with unknown type, capacity, speed, or invalid price
        filteredRAM = filteredRAM.filter(ram => {
            // Exclude if memoryType is missing or unknown
            if (!ram.memoryType || ram.memoryType.toLowerCase() === 'unknown' || ram.memoryType === '-') {
                return false;
            }

            // Exclude if capacity is missing or unknown
            if (!ram.capacity && !ram.kitConfiguration) {
                return false;
            }

            // Exclude if speed is missing or unknown
            if (!ram.speed || ram.speed === '-' || ram.speed === 'unknown') {
                return false;
            }

            // Exclude server or laptop RAM based on title
            const title = (ram.title || ram.name || '').toLowerCase();
            if (title.includes('server') || title.includes('laptop') || title.includes('sodimm') || title.includes('notebook')) {
                return false;
            }

            // Exclude if price is $0 or null
            if (!hasValidPrice(ram)) {
                return false;
            }

            return true;
        });

        console.log(`After filtering unknown/server/laptop: ${filteredRAM.length} RAM modules remaining`);

        // Manufacturer filter
        if (manufacturer) {
            filteredRAM = filteredRAM.filter(ram =>
                ram.manufacturer && ram.manufacturer.toUpperCase() === manufacturer.toUpperCase()
            );
        }

        // Memory type filter (DDR4/DDR5)
        if (memoryType) {
            filteredRAM = filteredRAM.filter(ram => 
                ram.memoryType && ram.memoryType.toUpperCase() === memoryType.toUpperCase()
            );
        }

        // Speed filter
        if (speed) {
            filteredRAM = filteredRAM.filter(ram => 
                ram.speed && ram.speed.includes(speed)
            );
        }

        // Capacity filter
        if (capacity) {
            filteredRAM = filteredRAM.filter(ram => 
                ram.capacity && ram.capacity.includes(capacity)
            );
        }

        // Price range filter
        if (priceRange) {
            const [min, max] = priceRange.split('-').map(Number);
            filteredRAM = filteredRAM.filter(ram => {
                const price = parseFloat(ram.currentPrice || ram.price) || 0;
                if (max) {
                    return price >= min && price <= max;
                } else {
                    return price >= min;
                }
            });
        }

        // Search filter
        if (search) {
            const searchLower = search.toLowerCase();
            filteredRAM = filteredRAM.filter(ram => 
                (ram.title && ram.title.toLowerCase().includes(searchLower)) ||
                (ram.name && ram.name.toLowerCase().includes(searchLower)) ||
                (ram.manufacturer && ram.manufacturer.toLowerCase().includes(searchLower)) ||
                (ram.memoryType && ram.memoryType.toLowerCase().includes(searchLower)) ||
                (ram.speed && ram.speed.toLowerCase().includes(searchLower)) ||
                (ram.capacity && ram.capacity.toLowerCase().includes(searchLower))
            );
        }

        // Group by model if requested
        const { groupByModel } = req.query;
        if (groupByModel === 'true') {
            const modelMap = new Map();
            for (const ram of filteredRAM) {
                const modelName = extractRAMModel(ram.title || ram.name || '');
                const ramCap = parseInt(ram.totalCapacity || ram.capacity) || 0;
                const ramSpeed = parseInt(ram.speed || ram.speedMHz) || 0;
                const isDDR5 = (ram.memoryType || '').toUpperCase().includes('DDR5');
                // Split groups by speed tier so low-speed (entry/compatible) kits don't mix with high-speed gaming kits
                const speedTier = ramSpeed > 0
                    ? (isDDR5 ? (ramSpeed <= 5200 ? 'base' : 'perf') : (ramSpeed <= 2666 ? 'entry' : 'std'))
                    : '';
                const groupKey = speedTier ? `${modelName}::${speedTier}` : modelName;
                if (!modelMap.has(groupKey)) {
                    modelMap.set(groupKey, {
                        model: modelName,
                        groupKey: groupKey,
                        cheapestCard: ram,
                        cheapestPrice: parseFloat(ram.currentPrice || ram.price) || Infinity,
                        totalCards: 1,
                        manufacturer: ram.manufacturer || 'Unknown',
                        memoryType: ram.memoryType || '',
                        minCapacity: ramCap, maxCapacity: ramCap,
                        minSpeed: ramSpeed, maxSpeed: ramSpeed,
                        reviewScoreSum: ram.reviewScore || 0,
                        reviewScoreCount: ram.reviewScore ? 1 : 0,
                        reviewTotalCount: ram.reviewCount || 0,
                        reviewSource: ram.reviewSource || 'Amazon'
                    });
                } else {
                    const md = modelMap.get(groupKey);
                    md.totalCards++;
                    const p = parseFloat(ram.currentPrice || ram.price) || Infinity;
                    if (p < md.cheapestPrice) { md.cheapestPrice = p; md.cheapestCard = ram; }
                    if (ramCap > 0) { md.minCapacity = Math.min(md.minCapacity, ramCap); md.maxCapacity = Math.max(md.maxCapacity, ramCap); }
                    if (ramSpeed > 0) { md.minSpeed = Math.min(md.minSpeed, ramSpeed); md.maxSpeed = Math.max(md.maxSpeed, ramSpeed); }
                    if (ram.reviewScore) {
                        md.reviewScoreSum += ram.reviewScore;
                        md.reviewScoreCount++;
                        md.reviewTotalCount += (ram.reviewCount || 0);
                    }
                }
            }
            const grouped = Array.from(modelMap.values()).map(md => {
                const card = md.cheapestCard;
                return {
                    _id: card._id,
                    name: md.model,
                    title: md.model,
                    manufacturer: md.manufacturer,
                    memoryType: md.memoryType,
                    currentPrice: md.cheapestPrice !== Infinity ? md.cheapestPrice : null,
                    basePrice: card.basePrice || card.currentPrice || card.price,
                    salePrice: card.salePrice,
                    isOnSale: card.isOnSale || false,
                    sourceUrl: card.sourceUrl,
                    totalCards: md.totalCards,
                    category: 'rams',
                    collection: 'rams',
                    modelKey: md.groupKey || md.model,
                    capacityRange: md.minCapacity > 0
                        ? (md.minCapacity === md.maxCapacity ? `${md.minCapacity}GB` : `${md.minCapacity}–${md.maxCapacity}GB`)
                        : null,
                    speedRange: md.minSpeed > 0
                        ? (md.minSpeed === md.maxSpeed ? `${md.minSpeed}MHz` : `${md.minSpeed}–${md.maxSpeed}MHz`)
                        : null,
                    reviewScore: md.reviewScoreCount > 0
                        ? Math.round((md.reviewScoreSum / md.reviewScoreCount) * 10) / 10
                        : null,
                    reviewCount: md.reviewTotalCount || null,
                    reviewSource: md.reviewSource || 'Amazon'
                };
            });
            // Filter out bare "DDR4"/"DDR5" groups (no brand detected)
            const cleanGrouped = grouped.filter(g => g.name && !g.name.match(/^DDR[45]$/i));

            // Merge single-kit groups into "Other DDR4" / "Other DDR5" catch-alls
            const mainGroups = cleanGrouped.filter(g => g.totalCards > 1);
            const singleKit = cleanGrouped.filter(g => g.totalCards === 1);

            const otherBuckets = {};
            for (const g of singleKit) {
                const key = g.memoryType && g.memoryType.toUpperCase().includes('DDR5') ? 'Other DDR5' : 'Other DDR4';
                if (!otherBuckets[key]) {
                    otherBuckets[key] = {
                        name: key, modelKey: key, memoryType: key === 'Other DDR5' ? 'DDR5' : 'DDR4',
                        totalCards: 0, manufacturer: 'Various',
                        minCap: Infinity, maxCap: 0, minSpd: Infinity, maxSpd: 0,
                        scoreSum: 0, scoreCount: 0, totalCount: 0, source: 'Amazon'
                    };
                }
                const b = otherBuckets[key];
                b.totalCards += g.totalCards;
                if (g.capacityRange) {
                    const caps = g.capacityRange.replace(/GB/g,'').split('–').map(Number).filter(Boolean);
                    if (caps[0] < b.minCap) b.minCap = caps[0];
                    if ((caps[1]||caps[0]) > b.maxCap) b.maxCap = caps[1]||caps[0];
                }
                if (g.speedRange) {
                    const spds = g.speedRange.replace(/MHz/g,'').split('–').map(Number).filter(Boolean);
                    if (spds[0] < b.minSpd) b.minSpd = spds[0];
                    if ((spds[1]||spds[0]) > b.maxSpd) b.maxSpd = spds[1]||spds[0];
                }
                if (g.reviewScore) { b.scoreSum += g.reviewScore; b.scoreCount++; }
                if (g.reviewCount) b.totalCount += g.reviewCount;
            }

            const otherGroups = Object.values(otherBuckets).map(b => ({
                name: b.name, modelKey: b.modelKey, memoryType: b.memoryType,
                totalCards: b.totalCards, manufacturer: b.manufacturer,
                capacityRange: b.minCap === Infinity ? null : b.minCap === b.maxCap ? `${b.minCap}GB` : `${b.minCap}–${b.maxCap}GB`,
                speedRange: b.minSpd === Infinity ? null : b.minSpd === b.maxSpd ? `${b.minSpd}MHz` : `${b.minSpd}–${b.maxSpd}MHz`,
                reviewScore: b.scoreCount > 0 ? Math.round((b.scoreSum / b.scoreCount) * 10) / 10 : null,
                reviewCount: b.totalCount || null,
                reviewSource: b.source
            }));

            const finalGrouped = [...mainGroups, ...otherGroups];
            console.log(`Returning ${finalGrouped.length} grouped RAM models (${otherGroups.length} Other buckets) from ${filteredRAM.length} kits`);
            return res.json(finalGrouped);
        }

        console.log(`Returning ${filteredRAM.length} RAM modules after filtering`);
        res.json(filteredRAM);

    } catch (error) {
        console.error('Error in handleRAMRequest:', error);
        res.status(500).json({ error: 'Failed to fetch RAM data' });
    }
}

// Extract RAM model name: brand + first-product-word + DDR type
// e.g. "G.SKILL Trident Z5 Neo RGB DDR5 RAM 32GB..." → "G.SKILL Trident DDR5"
//      "CORSAIR VENGEANCE RGB DDR5 RAM 32GB..."      → "Corsair Vengeance DDR5"
//      "Patriot Memory Viper Venom DDR5..."           → "Patriot Viper DDR5"
//      "Crucial 32GB DDR5-5600..."                   → "Crucial DDR5" (no product word)
function extractRAMModel(title) {
    const ddrMatch = title.match(/\bDDR[45]\b/i);
    const ddrType = ddrMatch ? ddrMatch[0].toUpperCase() : '';

    // Everything before the DDR marker
    const beforeDDR = ddrMatch ? title.slice(0, title.search(/\bDDR[45]\b/i)).trim() : title;

    // Common OEM/system brands that appear after "for" in A-tech replacement RAM titles
    const oemBrands = new Set(['ASUS','DELL','HP','LENOVO','APPLE','ACER','MSI','GIGABYTE','ASROCK',
                               'ALIENWARE','RAZER','SAMSUNG','INTEL','AMD','ROG','STRIX','INSPIRON',
                               'THINKPAD','PAVILION','SPECTRE','ENVY','PREDATOR','NITRO','SWIFT']);
    // Only keep clean alphabetic product-name words; skip noise, numbers, special chars
    const skip = new Set(['RAM','MEMORY','KIT','SERIES','GAMING','PERFORMANCE','RGB','ARGB',
                          'WHITE','BLACK','SILVER','PRO','PLUS','ULTRA','ELITE','DESKTOP','MODULE','COMPATIBLE',
                          'FOR','THE','WITH','AND','OR','BY','IN','OF','ON','AT','TO','AN',
                          'LAPTOP','NOTEBOOK','SODIMM','DIMM','ECC','UNBUFFERED','REGISTERED',
                          'UPGRADE','REPLACEMENT','PREMIUM','TECHNOLOGY','COMPUTER']);
    const words = beforeDDR
        .split(/\s+/)
        .filter(w => {
            if (!w || w.length < 2) return false;                               // skip single chars
            if (w.includes('.')) return true;                                   // allow G.SKILL
            if (!/^[A-Za-z][A-Za-z\-]*$/.test(w)) return false;               // must be pure letters
            if (oemBrands.has(w.toUpperCase())) return false;                  // skip OEM/system brands
            return !skip.has(w.toUpperCase());
        });

    const brand = words[0] || '';
    let product = words[1] || '';  // empty string if title goes straight brand→capacity

    // Normalize to title case so "CORSAIR" and "Corsair" merge; preserve G.SKILL dots
    const toTitle = s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    const brandNorm = brand.includes('.') ? brand : toTitle(brand);

    // Normalize known typos/variant spellings
    const productFix = { 'vengence': 'vengeance', 'vengance': 'vengeance' };
    const productLower = product.toLowerCase();
    if (productFix[productLower]) product = productFix[productLower];

    // Strip trailing series-letter suffix from mixed-case product names (e.g. "RipjawsV" → "Ripjaws")
    // Only strip if word is mixed-case AND ends with uppercase series letter (not all-caps words)
    const isMixedCase = product.length > 1 && product[0] === product[0].toUpperCase() && product.slice(1) !== product.slice(1).toUpperCase();
    const productClean = isMixedCase ? product.replace(/([A-Za-z]{4,})[A-Z]$/, '$1') : product;

    // Only use product word if pure letters (no digits = no model numbers like XLR8)
    const productNorm = productClean && !/\d/.test(productClean) ? toTitle(productClean) : '';

    const parts = [brandNorm, productNorm, ddrType].filter(Boolean);
    return parts.join(' ') || 'Unknown';
}

// Special handler for PSU collections
async function handlePSURequest(req, res) {
    try {
        const { manufacturer, priceRange, search, wattage, certification, modularity, formFactor } = req.query;
        
        // Check for the main 'psus' collection
        const collection = db.collection('psus');
        const psus = await collection.find({}, { projection: LIST_PARTS_PROJECTION }).toArray();
        
        // Add source collection info
        psus.forEach(psu => {
            psu.collection = 'psus';
            psu.category = 'psus';
        });
        
        console.log(`Loaded ${psus.length} PSUs from psus collection`);

        // Apply filters
        let filteredPSUs = psus.filter(psu => hasValidPrice(psu));

        // Manufacturer/Brand filter
        if (manufacturer) {
            filteredPSUs = filteredPSUs.filter(psu => 
                (psu.manufacturer && psu.manufacturer.toUpperCase() === manufacturer.toUpperCase()) ||
                (psu.brand && psu.brand.toUpperCase() === manufacturer.toUpperCase())
            );
        }

        // Wattage filter
        if (wattage) {
            const wattageNum = parseInt(wattage);
            filteredPSUs = filteredPSUs.filter(psu => 
                psu.wattage && psu.wattage >= wattageNum
            );
        }

        // Certification filter (80+ rating)
        if (certification) {
            filteredPSUs = filteredPSUs.filter(psu => 
                psu.certification && psu.certification.toLowerCase() === certification.toLowerCase()
            );
        }

        // Modularity filter
        if (modularity) {
            filteredPSUs = filteredPSUs.filter(psu => 
                psu.modularity && psu.modularity.toLowerCase() === modularity.toLowerCase()
            );
        }

        // Form factor filter
        if (formFactor) {
            filteredPSUs = filteredPSUs.filter(psu => 
                psu.formFactor && psu.formFactor.toLowerCase() === formFactor.toLowerCase()
            );
        }

        // Price range filter
        if (priceRange) {
            const [min, max] = priceRange.split('-').map(Number);
            filteredPSUs = filteredPSUs.filter(psu => {
                const price = parseFloat(psu.price) || 0;
                if (max) {
                    return price >= min && price <= max;
                } else {
                    return price >= min;
                }
            });
        }

        // Search filter
        if (search) {
            const searchLower = search.toLowerCase();
            filteredPSUs = filteredPSUs.filter(psu => 
                (psu.title && psu.title.toLowerCase().includes(searchLower)) ||
                (psu.name && psu.name.toLowerCase().includes(searchLower)) ||
                (psu.manufacturer && psu.manufacturer.toLowerCase().includes(searchLower)) ||
                (psu.brand && psu.brand.toLowerCase().includes(searchLower)) ||
                (psu.model && psu.model.toLowerCase().includes(searchLower))
            );
        }

        console.log(`Returning ${filteredPSUs.length} PSUs after filtering`);
        res.json(filteredPSUs);
        
    } catch (error) {
        console.error('Error in handlePSURequest:', error);
        res.status(500).json({ error: 'Failed to fetch PSU data' });
    }
}

// API endpoint to fetch individual cards from a specific GPU collection
// RAM variants endpoint — returns individual kits matching a model name
app.get('/api/parts/rams/variants', async (req, res) => {
    try {
        if (!db) return res.status(500).json({ error: 'Database not connected' });
        const { model } = req.query;
        if (!model) return res.status(400).json({ error: 'model query param required' });
        const allRAM = await db.collection('rams').find({}, { projection: LIST_PARTS_PROJECTION }).toArray();

        // Build the same grouped model keys to find which ones are "single-kit" (end up in Other)
        const groupCounts = {};
        allRAM.forEach(ram => {
            if (!hasValidPrice(ram)) return;
            const title = ram.title || ram.name || '';
            const memType = ram.memoryType || '';
            if (!memType || memType.toLowerCase() === 'unknown') return;
            const key = extractRAMModel(title);
            if (key && !key.match(/^DDR[45]$/i)) groupCounts[key] = (groupCounts[key] || 0) + 1;
        });

        // Reconstruct the same speed-tier compound key used in grouping
        function getSpeedTier(speed, isDDR5) {
            if (!speed) return '';
            return isDDR5 ? (speed <= 5200 ? 'base' : 'perf') : (speed <= 2666 ? 'entry' : 'std');
        }

        const variants = allRAM.filter(ram => {
            if (!hasValidPrice(ram)) return false;
            const title = ram.title || ram.name || '';
            const memType = ram.memoryType || '';
            if (!memType || memType.toLowerCase() === 'unknown') return false;
            const key = extractRAMModel(title);
            if (!key || key.match(/^DDR[45]$/i)) return false;

            // "Other DDR5" / "Other DDR4" — match items whose group has only 1 kit
            if (model === 'Other DDR5' || model === 'Other DDR4') {
                const targetDDR = model === 'Other DDR5' ? 'ddr5' : 'ddr4';
                const isDDR = (memType || title).toLowerCase().includes(targetDDR);
                return isDDR && groupCounts[key] === 1;
            }

            // If model contains '::' it's a speed-tiered key — match both base name and tier
            if (model.includes('::')) {
                const speed = parseInt(ram.speed || ram.speedMHz) || 0;
                const isDDR5 = memType.toUpperCase().includes('DDR5');
                const tier = getSpeedTier(speed, isDDR5);
                const compoundKey = tier ? `${key}::${tier}` : key;
                return compoundKey === model;
            }

            return key === model;
        });
        variants.forEach(r => { r.collection = 'rams'; r.category = 'rams'; });
        res.json(variants);
    } catch (err) {
        console.error('Error fetching RAM variants:', err);
        res.status(500).json({ error: 'Failed to fetch RAM variants' });
    }
});

app.get('/api/parts/gpus/:collection', async (req, res) => {
    try {
        if (!db) {
            return res.status(500).json({ error: 'Database not connected' });
        }

        const { collection: collectionName } = req.params;

        // Validate collection name: the consolidated `gpus` collection or a
        // legacy per-model `gpus_*` shard.
        if (collectionName !== 'gpus' && !collectionName.startsWith('gpus_')) {
            return res.status(400).json({ error: 'Invalid GPU collection name' });
        }

        // Check if collection exists
        const collections = await db.listCollections({ name: collectionName }).toArray();
        if (collections.length === 0) {
            return res.status(404).json({ error: `Collection ${collectionName} not found` });
        }

        // Fetch all cards from this specific collection
        const collection = db.collection(collectionName);
        const cards = await collection.find({}, { projection: LIST_PARTS_PROJECTION }).toArray();

        // Filter out desktop/laptop systems
        const filteredCards = cards.filter(card => !isDesktopOrLaptop(card.title || card.name || ''));

        // Add category info
        filteredCards.forEach(card => {
            card.collection = collectionName;
            card.category = 'gpus';
        });

        console.log(`Returning ${filteredCards.length} individual cards from ${collectionName}`);
        res.json(filteredCards);

    } catch (error) {
        console.error(`Error fetching cards from collection ${req.params.collection}:`, error);
        res.status(500).json({ error: 'Failed to fetch GPU variants' });
    }
});

app.get('/api/manufacturers', async (req, res) => {
    try {
        if (!db) {
            return res.status(500).json({ error: 'Database not connected' });
        }

        const collections = ['cpus', 'motherboards', 'gpus', 'rams', 'storages', 'psus', 'cases', 'coolers'];
        const manufacturers = new Set();

        for (const collectionName of collections) {
            try {
                const parts = await db.collection(collectionName).find({}, { projection: { manufacturer: 1 } }).toArray();
                parts.forEach(part => {
                    if (part.manufacturer) {
                        manufacturers.add(part.manufacturer);
                    }
                });
            } catch (error) {
                console.error(`Error fetching manufacturers from ${collectionName}:`, error);
            }
        }

        res.json(Array.from(manufacturers).sort());
    } catch (error) {
        console.error('Error fetching manufacturers:', error);
        res.status(500).json({ error: 'Failed to fetch manufacturers' });
    }
});

app.get('/api/stats', cacheMiddleware(600000), async (req, res) => {
    try {
        if (!db) {
            return res.status(500).json({ error: 'Database not connected' });
        }

        const collections = ['cpus', 'motherboards', 'rams', 'storages', 'psus', 'cases', 'coolers'];
        const stats = {};

        // Count regular collections
        for (const collectionName of collections) {
            try {
                const count = await db.collection(collectionName).countDocuments();
                stats[collectionName] = count;
            } catch (error) {
                console.error(`Error counting ${collectionName}:`, error);
                stats[collectionName] = 0;
            }
        }

        // Count GPU collections specially
        let totalGPUs = 0;
        try {
            const gpuCollections = await db.listCollections({ name: /^gpus/ }).toArray();
            
            for (const collection of gpuCollections) {
                try {
                    const count = await db.collection(collection.name).countDocuments();
                    totalGPUs += count;
                    console.log(`Found ${count} GPUs in ${collection.name}`);
                } catch (error) {
                    console.error(`Error counting ${collection.name}:`, error);
                }
            }
        } catch (error) {
            console.error('Error listing GPU collections:', error);
        }

        stats.gpus = totalGPUs;
        stats.total = Object.values(stats).reduce((sum, count) => sum + count, 0);
        
        console.log(`Stats: ${JSON.stringify(stats)}`);
        res.json(stats);
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// CPU-specific routes
app.get('/api/cpus', async (req, res) => {
    await handleCPURequest(req, res);
});

app.get('/api/cpu-stats', cacheMiddleware(600000), async (req, res) => {
    try {
        if (!db) {
            return res.status(500).json({ error: 'Database not connected' });
        }

        // Get all collections that start with "cpus_"
        const collections = await db.listCollections({ name: /^cpus_/ }).toArray();
        const cpuCollectionNames = collections.map(col => col.name);
        
        // Also check for the main 'cpus' collection
        const mainCpuCollection = await db.listCollections({ name: 'cpus' }).toArray();
        if (mainCpuCollection.length > 0) {
            cpuCollectionNames.push('cpus');
        }

        let totalCpus = 0;

        // Count CPUs from all collections
        for (const collectionName of cpuCollectionNames) {
            try {
                const count = await db.collection(collectionName).countDocuments();
                totalCpus += count;
            } catch (error) {
                console.error(`Error counting CPUs from ${collectionName}:`, error);
            }
        }

        res.json({
            cpus: totalCpus,
            collections: cpuCollectionNames.length
        });

    } catch (error) {
        console.error('Error fetching CPU stats:', error);
        res.status(500).json({ error: 'Failed to fetch CPU statistics' });
    }
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    if (err && err.type === 'entity.too.large' && isSharedBuildPostRequest(req)) {
        return res.status(413).json({ error: 'Request body too large' });
    }
    console.error(err.stack);
    return res.status(500).json({ error: 'Something went wrong!' });
});

const AI_BUILD_MIN_BUDGET = 500;
const AI_BUILD_MONITOR_MIN = 800;
const AI_BUILD_UNLIMITED_BUDGET = 999999;
const AI_BUILD_CORE_COMPONENTS = ['cpu', 'gpu', 'motherboard', 'ram', 'storage', 'psu', 'case'];
const AI_BUILD_RESOLUTION_ORDER = ['1080p', '1440p', '4k'];

function aiBuildPrice(part) {
    const price = Number(part?.currentPrice || part?.price || part?.basePrice);
    return Number.isFinite(price) && price > 0 ? price : null;
}

function aiBuildName(part) {
    return String(part?.name || part?.title || part?.gpuModel || part?.model || '').trim();
}

function aiBuildNormalize(value) {
    return String(value || '').toUpperCase().replace(/-/g, '').replace(/\s+/g, '').trim();
}

function aiBuildIsAvailable(part) {
    return Boolean(
        part &&
        part.hidden !== true &&
        part.isAvailable !== false &&
        aiBuildName(part) &&
        aiBuildPrice(part)
    );
}

function aiBuildUniqueParts(parts) {
    const seen = new Set();
    return parts.filter(part => {
        const key = String(part?._id || part?.id || part?.asin || aiBuildName(part)).trim();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function aiBuildResolutionCeiling(budget, unlimited) {
    if (unlimited || budget >= 2000) return '4k';
    if (budget >= 1000) return '1440p';
    return '1080p';
}

function normalizeAiBuildRequest(body = {}) {
    const rawBudget = body.budget;
    const unlimited = typeof rawBudget === 'string' && rawBudget.trim().toLowerCase() === 'unlimited';
    const numericBudget = Number.parseInt(rawBudget, 10);
    const treatAsUnlimited = unlimited || (Number.isFinite(numericBudget) && numericBudget > 5000);

    if (!treatAsUnlimited && (!Number.isFinite(numericBudget) || numericBudget < AI_BUILD_MIN_BUDGET)) {
        return {
            error: `Minimum budget is $${AI_BUILD_MIN_BUDGET}`,
            reason: 'invalid_budget'
        };
    }

    const storage = Number.parseInt(body.storage, 10);
    if (!Number.isFinite(storage) || storage <= 0) {
        return {
            error: 'Storage must be a positive number of gigabytes',
            reason: 'invalid_storage'
        };
    }

    const maxBudget = treatAsUnlimited ? AI_BUILD_UNLIMITED_BUDGET : numericBudget;
    const ceiling = aiBuildResolutionCeiling(maxBudget, treatAsUnlimited);
    const requestedResolution = String(body.resolution || '').trim().toLowerCase();
    const requestedIndex = AI_BUILD_RESOLUTION_ORDER.indexOf(requestedResolution);
    const ceilingIndex = AI_BUILD_RESOLUTION_ORDER.indexOf(ceiling);
    const resolution = requestedIndex < 0
        ? ceiling
        : AI_BUILD_RESOLUTION_ORDER[Math.min(requestedIndex, ceilingIndex)];
    const performance = body.performance === 'multi' ? 'multi' : 'single';
    const includeMonitor = Boolean(body.includeMonitor) &&
        (treatAsUnlimited || maxBudget >= AI_BUILD_MONITOR_MIN);

    return {
        budget: treatAsUnlimited ? 'Unlimited' : maxBudget,
        maxBudget,
        unlimited: treatAsUnlimited,
        performance,
        storage,
        includeMonitor,
        resolution,
        requestedResolution: requestedResolution || null,
        resolutionCeiling: ceiling
    };
}

function allocateBudget(budget, performance, resolution) {
    const profiles = {
        single: {
            '1080p': { gpu: 0.34, cpu: 0.20, motherboard: 0.11, ram: 0.10, storage: 0.09, psu: 0.07, case: 0.05, cooler: 0.04 },
            '1440p': { gpu: 0.42, cpu: 0.18, motherboard: 0.10, ram: 0.08, storage: 0.08, psu: 0.07, case: 0.04, cooler: 0.03 },
            '4k': { gpu: 0.50, cpu: 0.16, motherboard: 0.09, ram: 0.07, storage: 0.07, psu: 0.06, case: 0.03, cooler: 0.02 }
        },
        multi: {
            '1080p': { gpu: 0.22, cpu: 0.29, motherboard: 0.12, ram: 0.15, storage: 0.09, psu: 0.06, case: 0.04, cooler: 0.03 },
            '1440p': { gpu: 0.30, cpu: 0.26, motherboard: 0.11, ram: 0.13, storage: 0.08, psu: 0.06, case: 0.035, cooler: 0.025 },
            '4k': { gpu: 0.38, cpu: 0.23, motherboard: 0.10, ram: 0.11, storage: 0.07, psu: 0.06, case: 0.03, cooler: 0.02 }
        }
    };
    const weights = profiles[performance][resolution];
    const amounts = Object.fromEntries(
        Object.entries(weights).map(([component, weight]) => [component, budget * weight])
    );

    return { weights, amounts };
}

function aiBuildCpuPerformance(cpu, performance) {
    const preferred = performance === 'multi'
        ? Number(cpu?.multiThreadPerformance ?? cpu?.multiThreadScore)
        : Number(cpu?.singleCorePerformance ?? cpu?.singleThreadScore);
    return Number.isFinite(preferred) && preferred > 0 ? preferred : 0;
}

function aiBuildRamCapacity(ram) {
    const capacity = Number.parseFloat(ram?.totalCapacity ?? ram?.capacity);
    return Number.isFinite(capacity) && capacity > 0 ? capacity : 0;
}

function aiBuildMotherboardMemoryTypes(motherboard) {
    const raw = motherboard?.specifications?.memoryType || motherboard?.memoryType || [];
    return (Array.isArray(raw) ? raw : [raw]).map(aiBuildNormalize).filter(Boolean);
}

function aiBuildMotherboardMaxMemory(motherboard) {
    const candidates = [
        motherboard?.maxMemory,
        motherboard?.maxRam,
        motherboard?.maxMemoryCapacity,
        motherboard?.specifications?.maxMemory
    ];
    for (const candidate of candidates) {
        const parsed = Number.parseFloat(candidate);
        if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    return null;
}

function aiBuildRamIsDesktop(ram) {
    const formFactor = aiBuildNormalize(ram?.specifications?.formFactor);
    const text = aiBuildNormalize(`${aiBuildName(ram)} ${ram?.kitConfiguration || ''}`);
    if (
        formFactor.includes('SODIMM') ||
        text.includes('SODIMM') ||
        text.includes('LAPTOP') ||
        text.includes('NOTEBOOK') ||
        text.includes('SERVER') ||
        text.includes('LRDIMM') ||
        text.includes('REGISTEREDDIMM')
    ) {
        return false;
    }
    return true;
}

function aiBuildMemoryMatches(motherboard, ram) {
    const ramType = aiBuildNormalize(ram?.memoryType);
    const supported = aiBuildMotherboardMemoryTypes(motherboard);
    if (!ramType || supported.length === 0) return false;
    return supported.some(type => type.includes(ramType) || ramType.includes(type));
}

function aiBuildCaseFitsMotherboard(motherboard, pcCase) {
    const motherboardFormFactor = aiBuildNormalize(motherboard?.formFactor);
    const caseFormFactors = Array.isArray(pcCase?.formFactor) ? pcCase.formFactor : [pcCase?.formFactor];
    if (!motherboardFormFactor || caseFormFactors.every(value => !value)) return false;

    const motherboardIsItx = motherboardFormFactor.includes('ITX') && !motherboardFormFactor.includes('ATX');
    const motherboardIsMatx = motherboardFormFactor.includes('MATX') || motherboardFormFactor.includes('MICROATX');
    const motherboardIsEatx = motherboardFormFactor.includes('EATX');
    const motherboardIsAtx = !motherboardIsItx && !motherboardIsMatx &&
        !motherboardIsEatx && motherboardFormFactor.includes('ATX');

    return caseFormFactors.some(value => {
        const caseFormFactor = aiBuildNormalize(value);
        const caseIsItx = caseFormFactor.includes('ITX') && !caseFormFactor.includes('ATX');
        const caseIsMatx = caseFormFactor.includes('MATX') || caseFormFactor.includes('MICROATX');
        const caseIsEatx = caseFormFactor.includes('EATX');
        const caseIsAtx = !caseIsItx && !caseIsMatx &&
            !caseIsEatx && caseFormFactor.includes('ATX');

        return caseIsEatx ||
            (caseIsAtx && (motherboardIsAtx || motherboardIsMatx || motherboardIsItx)) ||
            (caseIsMatx && (motherboardIsMatx || motherboardIsItx)) ||
            (caseIsItx && motherboardIsItx);
    });
}

function aiBuildCaseGpuLimit(pcCase) {
    const candidates = [
        pcCase?.maxGpuLength,
        pcCase?.gpuLength,
        pcCase?.maxVideoCardLength,
        pcCase?.specifications?.maxGpuLength,
        pcCase?.specifications?.gpuClearance
    ];
    for (const candidate of candidates) {
        const parsed = Number.parseFloat(candidate);
        if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    return null;
}

function aiBuildCaseFitsGpu(pcCase, gpu) {
    const limit = aiBuildCaseGpuLimit(pcCase);
    const gpuLength = Number.parseFloat(gpu?.length);
    if (!limit || !Number.isFinite(gpuLength) || gpuLength <= 0) return true;
    return gpuLength <= limit;
}

function aiBuildCpuHasStockCooler(cpu) {
    return cpu?.coolerIncluded === true || cpu?.includesCooler === true;
}

function aiBuildCoolerFitsCpu(cooler, cpu) {
    const sockets = cooler?.socketCompatibility || cooler?.compatibleSockets || [];
    const normalizedSockets = (Array.isArray(sockets) ? sockets : [sockets]).map(aiBuildNormalize);
    return normalizedSockets.includes(aiBuildNormalize(cpu?.socket));
}

function ceilTo50(value) {
    return Math.ceil(value / 50) * 50;
}

function deriveRecommendedPsuWattage(gpu, cpu) {
    const gpuTdp = Number.parseFloat(gpu?.tdp);
    if (!Number.isFinite(gpuTdp) || gpuTdp <= 0) return null;
    const cpuTdp = getCPUTDP(cpu);
    // Required PSU = GPU TDP + CPU TDP + 150W system overhead, then 20% transient/headroom margin.
    return ceilTo50((gpuTdp + cpuTdp + 150) * 1.20);
}

function aiBuildPartFeatureScore(part, type, context = {}) {
    if (!part) return 0;
    if (type === 'gpu') return getGpuPerformance(part) || 0;
    if (type === 'cpu') return aiBuildCpuPerformance(part, context.performance);
    if (type === 'ram') {
        const capacity = aiBuildRamCapacity(part);
        const speed = Number(part.speedMHz || part.speed) || 0;
        return capacity + Math.min(speed / 1000, 10);
    }
    if (type === 'storage') {
        const capacity = Number(part.capacity || part.capacityGB) || 0;
        const text = `${part.type || ''} ${part.storageType || ''} ${aiBuildName(part)}`;
        const solidStateBonus = /SSD|NVME|M\.2/i.test(text) ? 1500 : 0;
        return capacity + solidStateBonus;
    }
    if (type === 'motherboard') {
        const slots = Number(part.ramSlots || part.memorySlots || 0) +
            Number(part.m2Slots || 0) * 2 +
            Number(part.pcieSlots || 0);
        const networking = JSON.stringify(part.networking || '');
        return 1 + slots + (/WIFI/i.test(networking) ? 2 : 0);
    }
    if (type === 'psu') {
        const wattage = Number.parseInt(part.wattage, 10) || 0;
        const text = `${part.efficiency || ''} ${part.certification || ''} ${aiBuildName(part)}`;
        const efficiencyBonus = /TITANIUM/i.test(text) ? 5 :
            /PLATINUM/i.test(text) ? 4 :
                /GOLD/i.test(text) ? 3 :
                    /SILVER/i.test(text) ? 2 :
                        /BRONZE/i.test(text) ? 1 : 0;
        return wattage / 100 + efficiencyBonus;
    }
    if (type === 'case') {
        const text = `${aiBuildName(part)} ${JSON.stringify(part.features || {})} ${JSON.stringify(part.specifications || {})}`;
        const fans = Number(part.includedFans || part.fansIncluded || 0);
        return 1 + fans + (/MESH|AIRFLOW/i.test(text) ? 2 : 0) + (/TEMPERED/i.test(text) ? 1 : 0);
    }
    if (type === 'cooler') {
        const performance = Number(part.performance);
        if (Number.isFinite(performance) && performance > 0) return performance;
        const text = `${part.coolerType || ''} ${aiBuildName(part)}`;
        return /360|420/.test(text) ? 5 : /280/.test(text) ? 4 : /240/.test(text) ? 3 : /AIO|LIQUID/i.test(text) ? 2 : 1;
    }
    return 1;
}

function aiBuildRankForTarget(parts, target, type, context = {}) {
    if (parts.length === 0) return [];
    const qualities = parts.map(part => aiBuildPartFeatureScore(part, type, context));
    const maxQuality = Math.max(...qualities, 1);
    const minPrice = Math.min(...parts.map(aiBuildPrice));

    return parts.map((part, index) => {
        const price = aiBuildPrice(part);
        const quality = qualities[index] / maxQuality;
        const value = (qualities[index] || 1) / price;
        const targetFit = context.unlimited
            ? 1
            : Math.max(0, 1 - Math.abs(price - target) / Math.max(target, minPrice, 1));
        return {
            part,
            score: quality * 0.68 + targetFit * 0.22 + Math.min(value, 1) * 0.10
        };
    }).sort((a, b) =>
        b.score - a.score ||
        aiBuildPrice(a.part) - aiBuildPrice(b.part)
    ).map(entry => entry.part);
}

function aiBuildStrategicCandidates(parts, target, type, context = {}, limit = 10) {
    if (parts.length === 0) return [];
    const ranked = aiBuildRankForTarget(parts, target, type, context);
    const cheapest = [...parts].sort((a, b) => aiBuildPrice(a) - aiBuildPrice(b)).slice(0, 2);
    return aiBuildUniqueParts([...ranked.slice(0, limit), ...cheapest]);
}

function selectGpuForTarget(gpus, target, resolution, context = {}) {
    const cheapestPrice = Math.min(...gpus.map(aiBuildPrice));
    const cap = context.unlimited
        ? Infinity
        : Math.max(cheapestPrice, target * (context.capMultiplier || 1.10));
    const withinCap = gpus.filter(gpu => aiBuildPrice(gpu) <= cap && getGpuPerformance(gpu) !== null);
    const pool = withinCap.length > 0
        ? withinCap
        : [...gpus].sort((a, b) => aiBuildPrice(a) - aiBuildPrice(b)).slice(0, 5);
    return aiBuildStrategicCandidates(pool, target, 'gpu', { ...context, resolution }, 12);
}

function selectCpu(cpus, target, performance, context = {}) {
    const usable = cpus.filter(cpu => cpu.socket && aiBuildCpuPerformance(cpu, performance) > 0);
    const cheapestPrice = Math.min(...usable.map(aiBuildPrice));
    const cap = context.unlimited
        ? Infinity
        : Math.max(cheapestPrice, target * (context.capMultiplier || 1.25));
    const withinCap = usable.filter(cpu => aiBuildPrice(cpu) <= cap);
    const pool = withinCap.length > 0
        ? withinCap
        : [...usable].sort((a, b) => aiBuildPrice(a) - aiBuildPrice(b)).slice(0, 5);
    return aiBuildStrategicCandidates(pool, target, 'cpu', { ...context, performance }, 10);
}

function selectCompatibleMotherboard(motherboards, cpu, target, context = {}) {
    const cpuSocket = aiBuildNormalize(cpu.socket);
    const compatible = motherboards.filter(motherboard =>
        aiBuildNormalize(motherboard.socket) === cpuSocket &&
        motherboard.formFactor &&
        aiBuildMotherboardMemoryTypes(motherboard).length > 0
    );
    return aiBuildStrategicCandidates(compatible, target, 'motherboard', context, 4);
}

function selectRam(rams, motherboard, target, performance, context = {}) {
    const maxMemory = aiBuildMotherboardMaxMemory(motherboard);
    const compatible = rams.filter(ram =>
        aiBuildRamIsDesktop(ram) &&
        aiBuildMemoryMatches(motherboard, ram) &&
        aiBuildRamCapacity(ram) > 0 &&
        (!maxMemory || aiBuildRamCapacity(ram) <= maxMemory)
    );
    const ranked = aiBuildStrategicCandidates(compatible, target, 'ram', { ...context, performance }, 8);
    return context.minimum
        ? [...compatible].sort((a, b) => aiBuildPrice(a) - aiBuildPrice(b))[0] || null
        : ranked[0] || null;
}

function selectStorage(storages, requiredCapacity, target, context = {}) {
    const compatible = storages.filter(storage =>
        Number(storage.capacity || storage.capacityGB) >= requiredCapacity
    );
    const ranked = aiBuildStrategicCandidates(compatible, target, 'storage', context, 8);
    return context.minimum
        ? [...compatible].sort((a, b) => aiBuildPrice(a) - aiBuildPrice(b))[0] || null
        : ranked[0] || null;
}

function selectPsu(psus, gpu, cpu, target, context = {}) {
    const requiredWattage = deriveRecommendedPsuWattage(gpu, cpu);
    if (!requiredWattage) return null;
    const compatible = psus.filter(psu => Number.parseInt(psu.wattage, 10) >= requiredWattage);
    const ranked = aiBuildStrategicCandidates(compatible, target, 'psu', context, 8);
    return context.minimum
        ? [...compatible].sort((a, b) => aiBuildPrice(a) - aiBuildPrice(b))[0] || null
        : ranked[0] || null;
}

function selectCase(cases, motherboard, gpu, target, context = {}) {
    const compatible = cases.filter(pcCase =>
        aiBuildCaseFitsMotherboard(motherboard, pcCase) &&
        aiBuildCaseFitsGpu(pcCase, gpu)
    );
    if (compatible.length === 0) return null;
    if (context.minimum) {
        return [...compatible].sort((a, b) => {
            const valueA = aiBuildPartFeatureScore(a, 'case') / aiBuildPrice(a);
            const valueB = aiBuildPartFeatureScore(b, 'case') / aiBuildPrice(b);
            return valueB - valueA || aiBuildPrice(a) - aiBuildPrice(b);
        })[0];
    }
    return aiBuildStrategicCandidates(compatible, target, 'case', context, 8)[0] || null;
}

function selectCooler(coolers, cpu, target, context = {}) {
    if (aiBuildCpuHasStockCooler(cpu)) return null;
    const compatible = coolers.filter(cooler => aiBuildCoolerFitsCpu(cooler, cpu));
    if (compatible.length === 0) return null;
    if (context.minimum) {
        return [...compatible].sort((a, b) => {
            const valueA = aiBuildPartFeatureScore(a, 'cooler') / aiBuildPrice(a);
            const valueB = aiBuildPartFeatureScore(b, 'cooler') / aiBuildPrice(b);
            return valueB - valueA || aiBuildPrice(a) - aiBuildPrice(b);
        })[0];
    }
    return aiBuildStrategicCandidates(compatible, target, 'cooler', context, 8)[0] || null;
}

function assembleAndValidate(build, context = {}) {
    const errors = [];
    for (const component of AI_BUILD_CORE_COMPONENTS) {
        if (!build[component]) errors.push(`missing_${component}`);
    }
    if (build.cpu && !aiBuildCpuHasStockCooler(build.cpu) && !build.cooler) {
        errors.push('missing_cooler');
    }

    for (const [component, part] of Object.entries(build)) {
        if (!part || component === 'monitor') continue;
        if (!aiBuildName(part)) errors.push(`${component}_missing_name`);
        if (!aiBuildPrice(part)) errors.push(`${component}_invalid_price`);
    }

    if (build.cpu && build.motherboard &&
        aiBuildNormalize(build.cpu.socket) !== aiBuildNormalize(build.motherboard.socket)) {
        errors.push('cpu_motherboard_socket');
    }
    if (build.ram && build.motherboard && !aiBuildMemoryMatches(build.motherboard, build.ram)) {
        errors.push('ram_memory_type');
    }
    if (build.ram && build.motherboard) {
        const maxMemory = aiBuildMotherboardMaxMemory(build.motherboard);
        if (maxMemory && aiBuildRamCapacity(build.ram) > maxMemory) errors.push('ram_capacity');
    }
    if (build.psu && build.gpu && build.cpu) {
        const requiredWattage = deriveRecommendedPsuWattage(build.gpu, build.cpu);
        if (!requiredWattage || Number.parseInt(build.psu.wattage, 10) < requiredWattage) {
            errors.push('psu_wattage');
        }
    }
    if (build.case && build.motherboard && !aiBuildCaseFitsMotherboard(build.motherboard, build.case)) {
        errors.push('case_form_factor');
    }
    if (build.case && build.gpu && !aiBuildCaseFitsGpu(build.case, build.gpu)) {
        errors.push('case_gpu_length');
    }
    if (build.cooler && build.cpu && !aiBuildCoolerFitsCpu(build.cooler, build.cpu)) {
        errors.push('cooler_socket');
    }

    const totalCost = Object.values(build)
        .filter(Boolean)
        .reduce((sum, part) => sum + (aiBuildPrice(part) || 0), 0);
    if (!context.unlimited && Number.isFinite(context.budget) && totalCost > context.budget + 0.001) {
        errors.push('over_budget');
    }

    return {
        valid: errors.length === 0,
        errors,
        totalCost
    };
}

function aiBuildScore(build, validation, allocation, context) {
    const gpuPerformance = getGpuPerformance(build.gpu) || 0;
    const cpuMax = context.cpuMaxPerformance || 1;
    const cpuPerformance = aiBuildCpuPerformance(build.cpu, context.performance) / cpuMax;
    const utilization = context.unlimited ? 1 : Math.min(validation.totalCost / context.budget, 1);
    const ramScore = Math.min(aiBuildRamCapacity(build.ram) / 64, 1);
    const storageCapacity = Number(build.storage?.capacity || build.storage?.capacityGB) || 0;
    const storageScore = Math.min(storageCapacity / Math.max(context.storage, 1000), 2) / 2;
    const psuRequired = deriveRecommendedPsuWattage(build.gpu, build.cpu) || 1;
    const psuScore = Math.min(Number.parseInt(build.psu?.wattage, 10) / psuRequired, 1.5) / 1.5;

    return gpuPerformance * allocation.weights.gpu * 3 +
        cpuPerformance * allocation.weights.cpu * 3 +
        ramScore * allocation.weights.ram +
        storageScore * allocation.weights.storage +
        psuScore * allocation.weights.psu +
        utilization * 0.35;
}

function aiBuildCreateCandidate(catalogs, gpu, cpu, motherboard, allocation, request, minimum) {
    const selectionContext = {
        unlimited: request.unlimited,
        performance: request.performance,
        minimum
    };
    const build = {
        cpu,
        gpu,
        motherboard,
        ram: selectRam(catalogs.rams, motherboard, allocation.amounts.ram, request.performance, selectionContext),
        storage: selectStorage(catalogs.storages, request.storage, allocation.amounts.storage, selectionContext),
        psu: selectPsu(catalogs.psus, gpu, cpu, allocation.amounts.psu, selectionContext),
        case: selectCase(catalogs.cases, motherboard, gpu, allocation.amounts.case, selectionContext),
        cooler: selectCooler(catalogs.coolers, cpu, allocation.amounts.cooler, selectionContext)
    };
    if (!build.cooler) delete build.cooler;
    return build;
}

function buildCompatibleTower(catalogs, towerBudget, request, allocation) {
    const cpuMaxPerformance = Math.max(
        ...catalogs.cpus.map(cpu => aiBuildCpuPerformance(cpu, request.performance)),
        1
    );
    const expansionSteps = request.unlimited ? [Infinity] : [1, 1.25, 1.6, Infinity];

    for (const capMultiplier of expansionSteps) {
        const gpuCandidates = selectGpuForTarget(
            catalogs.gpus,
            allocation.amounts.gpu,
            request.resolution,
            { unlimited: request.unlimited, capMultiplier }
        );
        const cpuCandidates = selectCpu(
            catalogs.cpus,
            allocation.amounts.cpu,
            request.performance,
            { unlimited: request.unlimited, capMultiplier }
        );
        const candidates = [];

        for (const gpu of gpuCandidates) {
            for (const cpu of cpuCandidates) {
                const motherboards = selectCompatibleMotherboard(
                    catalogs.motherboards,
                    cpu,
                    allocation.amounts.motherboard,
                    { unlimited: request.unlimited }
                );
                for (const motherboard of motherboards) {
                    for (const minimum of [false, true]) {
                        const build = aiBuildCreateCandidate(
                            catalogs,
                            gpu,
                            cpu,
                            motherboard,
                            allocation,
                            request,
                            minimum
                        );
                        const validation = assembleAndValidate(build, {
                            budget: towerBudget,
                            unlimited: request.unlimited
                        });
                        if (!validation.valid) continue;
                        candidates.push({
                            build,
                            validation,
                            score: aiBuildScore(build, validation, allocation, {
                                ...request,
                                budget: towerBudget,
                                cpuMaxPerformance
                            }),
                            capMultiplier
                        });
                    }
                }
            }
        }

        if (candidates.length > 0) {
            const utilizationFloor = !request.unlimited && towerBudget >= 800 ? towerBudget * 0.70 : 0;
            const reasonablyUtilized = candidates.filter(candidate =>
                candidate.validation.totalCost >= utilizationFloor
            );
            const pool = reasonablyUtilized.length > 0 ? reasonablyUtilized : candidates;
            pool.sort((a, b) =>
                b.score - a.score ||
                b.validation.totalCost - a.validation.totalCost
            );
            return pool[0];
        }
    }

    return null;
}

function aiBuildMonitorResolution(addon) {
    const text = `${addon?.type || ''} ${addon?.resolution || ''} ${aiBuildName(addon)}`.toLowerCase();
    if (/\b4k\b|2160p|3840\s*x\s*2160/.test(text)) return '4k';
    if (/1440p|2560\s*x\s*1440|\bqhd\b/.test(text)) return '1440p';
    if (/1080p|1920\s*x\s*1080|\bfhd\b/.test(text)) return '1080p';
    return null;
}

function selectMonitor(addons, resolution) {
    const monitors = addons.filter(addon =>
        /monitor|display/i.test(`${addon.type || ''} ${aiBuildName(addon)}`) &&
        aiBuildMonitorResolution(addon) === resolution
    );
    return [...monitors].sort((a, b) => aiBuildPrice(a) - aiBuildPrice(b))[0] || null;
}

async function loadAiBuildCatalogs(database) {
    const collectionNames = ['gpus', 'cpus', 'motherboards', 'rams', 'storages', 'psus', 'cases', 'coolers', 'addons'];
    const entries = await Promise.all(collectionNames.map(async collectionName => {
        const parts = await database.collection(collectionName).find({}).toArray();
        return [collectionName, aiBuildUniqueParts(parts.filter(aiBuildIsAvailable))];
    }));
    return Object.fromEntries(entries);
}

function createAiBuildDebug(request, allocation, candidate, monitor, catalogs) {
    const build = candidate.build;
    const selectionLabels = {
        cpu: 'CPU',
        gpu: 'GPU',
        motherboard: 'Motherboard',
        ram: 'RAM',
        storage: 'Storage',
        psu: 'PSU',
        case: 'Case',
        cooler: 'Cooler'
    };
    const selections = Object.entries(selectionLabels).map(([key, label]) => {
        const part = build[key];
        return {
            component: label,
            budget: `$${allocation.amounts[key].toFixed(2)}`,
            searchCriteria: 'Real, available, compatible parts ranked by target fit and value',
            candidatesFound: catalogs[`${key}s`]?.length || catalogs[key === 'storage' ? 'storages' : key]?.length || 0,
            topCandidates: part ? [{ name: aiBuildName(part), price: `$${aiBuildPrice(part).toFixed(2)}` }] : [],
            selected: part ? {
                name: aiBuildName(part),
                price: `$${aiBuildPrice(part).toFixed(2)}`,
                reason: 'Best compatible whole-build candidate within the adaptive allocation'
            } : {
                name: 'CPU stock cooler',
                price: '$0.00',
                reason: 'Selected CPU explicitly includes a stock cooler'
            }
        };
    });
    if (monitor) {
        selections.push({
            component: 'Monitor',
            budget: `$${aiBuildPrice(monitor).toFixed(2)}`,
            searchCriteria: `Real monitor matching ${request.resolution}`,
            candidatesFound: catalogs.addons.filter(addon => aiBuildMonitorResolution(addon) === request.resolution).length,
            topCandidates: [{ name: aiBuildName(monitor), price: `$${aiBuildPrice(monitor).toFixed(2)}` }],
            selected: {
                name: aiBuildName(monitor),
                price: `$${aiBuildPrice(monitor).toFixed(2)}`,
                reason: `Matches the selected ${request.resolution} target`
            }
        });
    }

    return {
        timestamp: new Date().toISOString(),
        userChoices: {
            budget: request.unlimited ? 'Unlimited' : `$${request.maxBudget}`,
            performanceType: request.performance,
            storageRequired: `${request.storage}GB`,
            includeMonitor: monitor ? 'Yes' : 'No',
            resolution: request.resolution
        },
        allocations: {
            strategy: `${request.performance} performance at ${request.resolution}; whole-build adaptive redistribution`,
            percentages: allocation.weights,
            budgetAmounts: Object.fromEntries(
                Object.entries(allocation.amounts).map(([key, value]) => [key, `$${value.toFixed(2)}`])
            ),
            capMultiplier: candidate.capMultiplier
        },
        selections,
        summary: {
            totalCost: `$${candidate.validation.totalCost.toFixed(2)}`,
            budget: request.unlimited ? 'Unlimited' : `$${request.maxBudget}`,
            underBudget: request.unlimited || candidate.validation.totalCost <= request.maxBudget,
            componentsSelected: Object.keys(build).length + (monitor ? 1 : 0)
        }
    };
}

async function handleAiBuildRequest(req, res) {
    try {
        if (!db) {
            return res.status(200).json({
                success: false,
                error: 'Database not connected',
                reason: 'database_unavailable'
            });
        }

        const request = normalizeAiBuildRequest(req.body);
        if (request.error) {
            return res.status(200).json({
                success: false,
                error: request.error,
                reason: request.reason
            });
        }

        const catalogs = await loadAiBuildCatalogs(db);
        const missingCatalog = ['gpus', 'cpus', 'motherboards', 'rams', 'storages', 'psus', 'cases']
            .find(collectionName => catalogs[collectionName].length === 0);
        if (missingCatalog) {
            return res.status(200).json({
                success: false,
                error: `No available ${missingCatalog} were found`,
                reason: `empty_${missingCatalog}`
            });
        }

        let monitor = request.includeMonitor ? selectMonitor(catalogs.addons, request.resolution) : null;
        let towerBudget = request.maxBudget;
        if (monitor && !request.unlimited) {
            const remainingAfterMonitor = request.maxBudget - aiBuildPrice(monitor);
            if (remainingAfterMonitor < request.maxBudget * 0.70) {
                monitor = null;
            } else {
                towerBudget = remainingAfterMonitor;
            }
        }

        let allocation = allocateBudget(towerBudget, request.performance, request.resolution);
        let candidate = buildCompatibleTower(catalogs, towerBudget, request, allocation);

        if (!candidate && monitor) {
            monitor = null;
            towerBudget = request.maxBudget;
            allocation = allocateBudget(towerBudget, request.performance, request.resolution);
            candidate = buildCompatibleTower(catalogs, towerBudget, request, allocation);
        }

        if (!candidate) {
            return res.status(200).json({
                success: false,
                error: 'No complete compatible build fits the requested target',
                reason: 'no_compatible_build'
            });
        }

        const build = { ...candidate.build };
        if (monitor) build.monitor = monitor;
        const finalValidation = assembleAndValidate(build, {
            budget: request.maxBudget,
            unlimited: request.unlimited
        });
        if (!finalValidation.valid) {
            return res.status(200).json({
                success: false,
                error: `Build validation failed: ${finalValidation.errors.join(', ')}`,
                reason: 'final_validation_failed'
            });
        }

        candidate = {
            ...candidate,
            build,
            validation: finalValidation
        };
        const actualIncludeMonitor = Boolean(monitor);
        const debug = createAiBuildDebug(request, allocation, candidate, monitor, catalogs);

        return res.json({
            success: true,
            build,
            totalCost: finalValidation.totalCost.toFixed(2),
            budget: request.maxBudget,
            underBudget: request.unlimited || finalValidation.totalCost <= request.maxBudget,
            wizardData: {
                budget: request.budget,
                performance: request.performance,
                storage: request.storage,
                includeMonitor: actualIncludeMonitor,
                resolution: request.resolution
            },
            debug
        });
    } catch (error) {
        console.error('Error generating AI build:', error);
        return res.status(200).json({
            success: false,
            error: 'Failed to generate build',
            reason: 'internal_error'
        });
    }
}

// AI Part Selection API - Select parts based on wizard data
app.post('/api/ai-build', handleAiBuildRequest);

// Increment save count for components
app.post('/api/components/increment-saves', async (req, res) => {
    try {
        const { components } = req.body;
        console.log(`📊 Increment saves request received for ${components?.length || 0} components`);

        if (!components || !Array.isArray(components)) {
            return res.status(400).json({ error: 'Invalid request: components array required' });
        }

        const db = getDatabase();
        const results = [];

        // Map component types to collection names
        const collectionMap = {
            'gpu': 'gpus',
            'cpu': 'cpus',
            'motherboard': 'motherboards',
            'ram': 'rams',
            'psu': 'psus',
            'cooler': 'coolers',
            'case': 'cases',
            'storage': 'storages',
            'storage2': 'storages',
            'storage3': 'storages',
            'storage4': 'storages',
            'storage5': 'storages',
            'storage6': 'storages',
            'addon': 'addons',
            'addon2': 'addons',
            'addon3': 'addons',
            'addon4': 'addons',
            'addon5': 'addons',
            'addon6': 'addons'
        };

        // Process each component
        for (const { type, id } of components) {
            const collectionName = collectionMap[type];

            if (!collectionName || !id) {
                console.warn(`Invalid component: type=${type}, id=${id}`);
                continue;
            }

            try {
                // Convert string ID to ObjectId ONCE at the beginning
                let queryId = id;
                try {
                    if (ObjectId.isValid(id)) {
                        queryId = new ObjectId(id);
                    }
                } catch (e) {
                    console.error(`Error converting ID to ObjectId: ${id}`, e);
                }

                // Check if it's a GPU collection (multiple GPU collections)
                if (type === 'gpu') {
                    // Try to find in any GPU collection
                    const allCollections = await db.listCollections().toArray();
                    const gpuCollections = allCollections.filter(c => c.name.startsWith('gpus'));
                    let updated = false;

                    for (const coll of gpuCollections) {
                        const collection = db.collection(coll.name);

                        // Get the document before updating
                        const beforeDoc = await collection.findOne({ _id: queryId });

                        if (beforeDoc) {
                            const beforeCount = beforeDoc.saveCount || 0;
                            const itemName = beforeDoc.title || beforeDoc.name || beforeDoc.model || 'Unknown GPU';

                            const result = await collection.updateOne(
                                { _id: queryId },
                                { $inc: { saveCount: 1 } }
                            );

                            if (result.matchedCount > 0) {
                                // Get the document after updating
                                const afterDoc = await collection.findOne({ _id: queryId });
                                const afterCount = afterDoc.saveCount || 0;

                                console.log(`  📈 GPU: ${itemName.substring(0, 50)} | Before: ${beforeCount} → After: ${afterCount}`);

                                updated = true;
                                results.push({ type, id, collection: coll.name, success: true, beforeCount, afterCount });
                                break;
                            }
                        }
                    }

                    if (!updated) {
                        console.warn(`  ⚠️  GPU not found with ID: ${id}`);
                    }
                } else if (type === 'cpu') {
                    // Try to find in any CPU collection (cpus, cpus_intel_core_i9, cpus_amd_ryzen_7, etc.)
                    const allCollections = await db.listCollections().toArray();
                    const cpuCollections = allCollections.filter(c => c.name.startsWith('cpus'));
                    let updated = false;

                    for (const coll of cpuCollections) {
                        const collection = db.collection(coll.name);

                        // Get the document before updating
                        const beforeDoc = await collection.findOne({ _id: queryId });

                        if (beforeDoc) {
                            const beforeCount = beforeDoc.saveCount || 0;
                            const itemName = beforeDoc.title || beforeDoc.name || beforeDoc.model || 'Unknown CPU';

                            const result = await collection.updateOne(
                                { _id: queryId },
                                { $inc: { saveCount: 1 } }
                            );

                            if (result.matchedCount > 0) {
                                // Get the document after updating
                                const afterDoc = await collection.findOne({ _id: queryId });
                                const afterCount = afterDoc.saveCount || 0;

                                console.log(`  📈 CPU: ${itemName.substring(0, 50)} | Before: ${beforeCount} → After: ${afterCount}`);

                                updated = true;
                                results.push({ type, id, collection: coll.name, success: true, beforeCount, afterCount });
                                break;
                            }
                        }
                    }

                    if (!updated) {
                        console.warn(`  ⚠️  CPU not found with ID: ${id}`);
                    }
                } else {
                    // For non-GPU/CPU components
                    const collection = db.collection(collectionName);

                    // Get the document before updating
                    const beforeDoc = await collection.findOne({ _id: queryId });

                    if (beforeDoc) {
                        const beforeCount = beforeDoc.saveCount || 0;
                        const itemName = beforeDoc.title || beforeDoc.name || beforeDoc.model || `Unknown ${type}`;

                        const result = await collection.updateOne(
                            { _id: queryId },
                            { $inc: { saveCount: 1 } }
                        );

                        if (result.matchedCount > 0) {
                            // Get the document after updating
                            const afterDoc = await collection.findOne({ _id: queryId });
                            const afterCount = afterDoc.saveCount || 0;

                            console.log(`  📈 ${type.toUpperCase()}: ${itemName.substring(0, 50)} | Before: ${beforeCount} → After: ${afterCount}`);

                            results.push({ type, id, collection: collectionName, success: true, beforeCount, afterCount });
                        }
                    } else {
                        console.warn(`  ⚠️  Component not found: ${type} with ID ${id}`);
                    }
                }
            } catch (error) {
                console.error(`Error updating ${type} ${id}:`, error);
            }
        }

        console.log(`✅ Successfully updated ${results.length} of ${components.length} components`);

        res.json({
            success: true,
            updated: results.length,
            total: components.length,
            results
        });

    } catch (error) {
        console.error('Error incrementing save counts:', error);
        res.status(500).json({ error: 'Failed to update save counts' });
    }
});

// ===== COMMUNITY RATINGS API =====

// Batch-fetch ratings for multiple part IDs (called after card render)
app.get('/api/ratings/batch', async (req, res) => {
    try {
        const ids = (req.query.ids || '').split(',').filter(Boolean).slice(0, 100);
        if (!ids.length) return res.json({});
        const db = getDatabase();
        const docs = await db.collection('ratings').find({ partId: { $in: ids } }).toArray();
        const result = {};
        docs.forEach(d => {
            result[d.partId] = {
                average: d.totalRatings > 0 ? +((d.totalScore / d.totalRatings).toFixed(1)) : 0,
                count: d.totalRatings
            };
        });
        res.json(result);
    } catch (e) {
        console.error('Batch ratings error:', e);
        res.status(500).json({});
    }
});

// Submit a star rating (1–5) for a component
app.post('/api/ratings/:partId', async (req, res) => {
    try {
        const score = parseInt(req.body.score);
        if (isNaN(score) || score < 1 || score > 5) return res.status(400).json({ error: 'Score must be 1–5' });
        const db = getDatabase();
        await db.collection('ratings').updateOne(
            { partId: req.params.partId },
            { $inc: { totalScore: score, totalRatings: 1 } },
            { upsert: true }
        );
        const doc = await db.collection('ratings').findOne({ partId: req.params.partId });
        res.json({
            average: +((doc.totalScore / doc.totalRatings).toFixed(1)),
            count: doc.totalRatings
        });
    } catch (e) {
        console.error('Rating submit error:', e);
        res.status(500).json({ error: 'Failed to save rating' });
    }
});

// ===== BUILD SNAPSHOTS API =====

// Save a build snapshot when all required components are selected
app.post('/api/builds/snapshot', async (req, res) => {
    try {
        const { totalPrice, gpuScore, cpuSingleScore, cpuMultiScore } = req.body;
        if (!totalPrice || totalPrice <= 0) return res.status(400).json({ error: 'Invalid build data' });
        const db = getDatabase();
        await db.collection('build_snapshots').insertOne({
            totalPrice: +totalPrice,
            gpuScore: +gpuScore || 0,
            cpuSingleScore: +cpuSingleScore || 0,
            cpuMultiScore: +cpuMultiScore || 0,
            createdAt: new Date()
        });
        res.json({ success: true });
    } catch (e) {
        console.error('Build snapshot error:', e);
        res.status(500).json({ error: 'Failed to save build snapshot' });
    }
});

// Get aggregate averages across all saved builds
app.get('/api/builds/averages', async (req, res) => {
    try {
        const db = getDatabase();
        const agg = await db.collection('build_snapshots').aggregate([
            {
                $group: {
                    _id: null,
                    avgPrice: { $avg: '$totalPrice' },
                    avgGpu: { $avg: '$gpuScore' },
                    avgCpuSingle: { $avg: '$cpuSingleScore' },
                    avgCpuMulti: { $avg: '$cpuMultiScore' },
                    count: { $sum: 1 }
                }
            }
        ]).toArray();
        if (!agg.length) return res.json({ count: 0 });
        const r = agg[0];
        res.json({
            avgPrice: Math.round(r.avgPrice),
            avgGpu: +r.avgGpu.toFixed(4),
            avgCpuSingle: +r.avgCpuSingle.toFixed(4),
            avgCpuMulti: +r.avgCpuMulti.toFixed(4),
            count: r.count
        });
    } catch (e) {
        console.error('Build averages error:', e);
        res.status(500).json({ error: 'Failed to get build averages' });
    }
});

// Store a compact build reference map under a random, URL-safe id.
app.post('/api/builds', async (req, res) => {
    const normalized = normalizeSharedBuild(req.body);
    if (normalized.error) {
        return res.status(400).json({ error: normalized.error });
    }

    try {
        const database = getDatabase();
        for (let attempt = 0; attempt < 5; attempt++) {
            const id = createSharedBuildId();
            try {
                await database.collection('builds').insertOne({
                    _id: id,
                    build: normalized.build,
                    createdAt: new Date()
                });
                return res.json({ id });
            } catch (error) {
                if (error && error.code === 11000) {
                    continue;
                }
                throw error;
            }
        }

        return res.status(503).json({ error: 'Failed to allocate build id' });
    } catch (error) {
        console.error('Shared build save error:', error);
        return res.status(500).json({ error: 'Failed to save build' });
    }
});

// Return the stored reference map unchanged so applyBuildData can consume it.
app.get('/api/builds/:id', async (req, res) => {
    const { id } = req.params;
    if (!SHARED_BUILD_ID_PATTERN.test(id)) {
        return res.status(404).json({ error: 'Build not found' });
    }

    try {
        const database = getDatabase();
        const document = await database.collection('builds').findOne(
            { _id: id },
            { projection: { build: 1 } }
        );
        if (!document) {
            return res.status(404).json({ error: 'Build not found' });
        }
        return res.json(document.build);
    } catch (error) {
        console.error('Shared build load error:', error);
        return res.status(500).json({ error: 'Failed to load build' });
    }
});

// Cache management endpoint
app.post('/api/clear-cache', (req, res) => {
    try {
        apiCache.clear();
        statsCache.clear();
        console.log('🗑️  Cache cleared successfully');
        res.json({ success: true, message: 'Cache cleared successfully' });
    } catch (error) {
        console.error('Error clearing cache:', error);
        res.status(500).json({ error: 'Failed to clear cache' });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start server
async function startServer() {
    await initializeDatabase();
    
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📊 Frontend available at http://localhost:${PORT}`);
        console.log(`🔌 API endpoints available at http://localhost:${PORT}/api`);
    });
}

startServer().catch(console.error);
