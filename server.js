const express = require('express');
const path = require('path');
const { ObjectId } = require('mongodb');
const { connectToDatabase, getDatabase } = require('./config/database');

// Function to detect and filter out desktop/laptop systems
// DISABLED - This filter was causing too many false positives
function isDesktopOrLaptop(title) {
    // Always return false to disable filtering
    return false;
}

// Function to check if a component has a valid price (not $0 or null)
function hasValidPrice(item) {
    const price = parseFloat(item.price || item.currentPrice || item.basePrice);
    return !isNaN(price) && price > 0;
}

// GPU benchmark data for performance scoring
const gpuBenchmarks = {
    'RTX 5090': 205.5,
    'RTX 5080': 172.6,
    'RTX 5070 Ti': 171.5,
    'RTX 5070': 152.6,
    'RTX 5060 Ti': 118.9,
    'RTX 5060': 103.7,
    'RTX 4090': 203.3,
    'RTX 4080 Super': 185.6,
    'RTX 4080': 183.6,
    'RTX 4070 Ti Super': 166.6,
    'RTX 4070 Super': 149.8,
    'RTX 4070 Ti': 166.6,
    'RTX 4070': 133,
    'RTX 4060 Ti': 105,
    'RTX 4060': 83.9,
    'RTX 3090 Ti': 134.1,
    'RTX 3090': 131.85,
    'RTX 3080 Ti': 130.05,
    'RTX 3080': 128.175,
    'RTX 3070 Ti': 120.975,
    'RTX 3070': 117.15,
    'RTX 3060 Ti': 111.15,
    'RTX 3060': 90.75,
    'RTX 3050': 66.6,
    'RX 7900 XTX': 140.2,
    'RX 7900 XT': 131,
    'RX 7900 GRE': 126.3,
    'RX 7900': 126.3,
    'RX 7800 XT': 107.1,
    'RX 7700 XT': 97.6,
    'RX 7600 XT': 64.3,
    'RX 7600': 60.6,
    'RX 6950 XT': 140.55,
    'RX 6900 XT': 138.975,
    'RX 6800 XT': 135.9,
    'RX 6800': 130.5,
    'RX 6750 XT': 120,
    'RX 6700 XT': 110,
    'RX 6650 XT': 100,
    'RX 6600 XT': 90,
    'RX 6600': 80,
    'RX 6500 XT': 60,
    'RX 6400': 45,
    'Arc A770': 95,
    'Arc A750': 85,
    'Arc A580': 70,
    'Arc A380': 50
};

// Function to get GPU performance score from benchmark data
function getGpuPerformance(gpu) {
    const name = gpu.name || gpu.title || gpu.model || '';

    // Sort benchmark keys by length (longest first) to match more specific models first
    // This ensures "RX 7900 XTX" matches before "RX 7900"
    const sortedModels = Object.entries(gpuBenchmarks)
        .sort((a, b) => b[0].length - a[0].length);

    // Try to match the GPU model name with our benchmark data
    for (const [model, score] of sortedModels) {
        if (name.includes(model)) {
            // Normalize the score (divide by max value of 205.5 - RTX 5090)
            const maxScore = 205.5;
            return score / maxScore;
        }
    }

    return null; // No benchmark found
}

const app = express();
const PORT = process.env.PORT || 3000;

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
            db.collection(collectionName).find(filter).toArray()
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
        const parts = await collection.find(filter).toArray();

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
        
        // Get all collections that start with "gpus_"
        const collections = await db.listCollections({ name: /^gpus_/ }).toArray();
        const gpuCollectionNames = collections.map(col => col.name);
        
        // Also check for the main 'gpus' collection
        const mainGpuCollection = await db.listCollections({ name: 'gpus' }).toArray();
        if (mainGpuCollection.length > 0) {
            gpuCollectionNames.push('gpus');
        }

        console.log(`Found GPU collections: ${gpuCollectionNames.join(', ')}`);

        // Fetch from all GPU collections in PARALLEL
        const gpuPromises = gpuCollectionNames.map(collectionName =>
            db.collection(collectionName).find({}).toArray()
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
                const isAvailable = gpu.isAvailable !== false && gpu.currentPrice != null;
                const price = parseFloat(gpu.currentPrice || gpu.price) || Infinity;

                if (!modelMap.has(modelName)) {
                    modelMap.set(modelName, {
                        model: modelName,
                        cheapestCard: gpu,
                        cheapestPrice: isAvailable ? price : Infinity,
                        totalCards: 1,
                        availableCards: isAvailable ? 1 : 0,
                        manufacturer: gpu.manufacturer || 'Unknown',
                        totalSaveCount: gpu.saveCount || 0
                    });
                } else {
                    const modelData = modelMap.get(modelName);
                    modelData.totalCards++;
                    modelData.totalSaveCount += (gpu.saveCount || 0);

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
                    category: 'gpus',
                    collection: card.collection
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
            db.collection(collectionName).find({}).toArray()
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
        const motherboards = await collection.find({}).toArray();
        
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
        const ramModules = await collection.find({}).toArray();
        
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

        console.log(`Returning ${filteredRAM.length} RAM modules after filtering`);
        res.json(filteredRAM);
        
    } catch (error) {
        console.error('Error in handleRAMRequest:', error);
        res.status(500).json({ error: 'Failed to fetch RAM data' });
    }
}

// Special handler for PSU collections
async function handlePSURequest(req, res) {
    try {
        const { manufacturer, priceRange, search, wattage, certification, modularity, formFactor } = req.query;
        
        // Check for the main 'psus' collection
        const collection = db.collection('psus');
        const psus = await collection.find({}).toArray();
        
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
app.get('/api/parts/gpus/:collection', async (req, res) => {
    try {
        if (!db) {
            return res.status(500).json({ error: 'Database not connected' });
        }

        const { collection: collectionName } = req.params;

        // Validate collection name starts with gpus_
        if (!collectionName.startsWith('gpus_')) {
            return res.status(400).json({ error: 'Invalid GPU collection name' });
        }

        // Check if collection exists
        const collections = await db.listCollections({ name: collectionName }).toArray();
        if (collections.length === 0) {
            return res.status(404).json({ error: `Collection ${collectionName} not found` });
        }

        // Fetch all cards from this specific collection
        const collection = db.collection(collectionName);
        const cards = await collection.find({}).toArray();

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
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// AI Part Selection API - Select parts based on wizard data
app.post('/api/ai-build', async (req, res) => {
    try {
        const { budget, performance, storage, includeMonitor } = req.body;

        if (!db) {
            return res.status(500).json({ error: 'Database not connected' });
        }

        // Debug log object to track component selection
        const debugLog = {
            timestamp: new Date().toISOString(),
            userChoices: {
                budget: budget === 'Unlimited' || budget > 5000 ? 'Unlimited' : `$${budget}`,
                performanceType: performance === 'multi' ? 'Multi-threaded workloads (Productivity, Rendering, etc.)' : 'Single-threaded/Gaming (High FPS, Fast response)',
                storageRequired: `${storage}GB`,
                includeMonitor: includeMonitor ? 'Yes' : 'No'
            },
            allocations: {},
            selections: []
        };

        // Handle budget: could be a number, 'Unlimited' string, or > 5000
        let maxBudget;
        if (budget === 'Unlimited' || budget > 5000) {
            maxBudget = 999999;
        } else {
            maxBudget = parseInt(budget);
            if (isNaN(maxBudget) || maxBudget < 1000) {
                return res.status(400).json({ error: 'Minimum budget is $1000' });
            }
        }

        const storageGB = parseInt(storage);
        if (isNaN(storageGB) || storageGB < 0) {
            return res.status(400).json({ error: 'Invalid storage value' });
        }

        // Budget allocation percentages (adjustable based on performance priority)
        let allocations = {};

        if (performance === 'multi') {
            // Multi-threaded workloads: Prioritize CPU and RAM
            allocations = {
                cpu: 0.25,
                gpu: 0.20,
                motherboard: 0.12,
                ram: 0.15,
                storage: 0.10,
                psu: 0.08,
                cooler: 0.05,
                case: 0.05
            };
            debugLog.allocations.strategy = 'Multi-threaded workloads (prioritize CPU and RAM)';
        } else {
            // Single-threaded/gaming: Prioritize GPU heavily
            allocations = {
                cpu: 0.18,
                gpu: 0.38,       // Increased from 30% to 38%
                motherboard: 0.12,
                ram: 0.10,       // Reduced from 12% to 10%
                storage: 0.10,
                psu: 0.06,       // Reduced from 8% to 6%
                cooler: 0.03,    // Reduced from 5% to 3%
                case: 0.03       // Reduced from 5% to 3%
            };
            debugLog.allocations.strategy = 'Single-threaded/Gaming (heavily prioritize GPU)';
        }

        // Add budget allocations to debug log
        debugLog.allocations.percentages = allocations;
        debugLog.allocations.budgetAmounts = Object.fromEntries(
            Object.entries(allocations).map(([key, percent]) => [key, `$${(maxBudget * percent).toFixed(2)}`])
        );

        const selectedParts = {};
        let totalCost = 0;

        // CRITICAL: For budget builds (<$1500), select RAM FIRST to avoid DDR5 trap
        // DDR5 is expensive and forces expensive AM5/LGA1700 platforms
        // By selecting DDR4 first, we ensure affordable CPU/motherboard compatibility
        const isBudgetBuild = maxBudget < 1500;
        let ramMemoryType = null; // Will be set if we select RAM first

        if (isBudgetBuild) {
            console.log(`\n💰 Budget build detected ($${maxBudget}). Selecting RAM first to ensure DDR4 compatibility.`);

            // Select affordable DDR4 RAM first
            const ramBudget = maxBudget * allocations.ram;
            const preferredCapacity = performance === 'multi' ? '32GB' : '16GB';

            const ramDebug = {
                component: 'RAM (Pre-selected for budget build)',
                budget: `$${ramBudget.toFixed(2)}`,
                searchCriteria: `Price: $0 - $${(ramBudget * 1.3).toFixed(2)} (30% buffer), Preferred: ${preferredCapacity}, DDR4 only`,
                candidatesFound: 0,
                topCandidates: []
            };

            // Search for DDR4 RAM only
            const rams = await db.collection('rams').find({
                $and: [
                    { currentPrice: { $gt: 0, $lte: ramBudget * 1.3 } },
                    {
                        $or: [
                            { memoryType: { $regex: 'DDR4', $options: 'i' } },
                            { type: { $regex: 'DDR4', $options: 'i' } }
                        ]
                    }
                ]
            }).toArray();

            ramDebug.candidatesFound = rams.length;

            if (rams.length > 0) {
                // Sort by capacity (prefer requested capacity), then by price
                rams.sort((a, b) => {
                    const aCapacity = parseInt(a.totalCapacity || a.capacity || '0');
                    const bCapacity = parseInt(b.totalCapacity || b.capacity || '0');
                    const targetCapacity = parseInt(preferredCapacity);

                    // Prefer RAM closest to target capacity
                    const aDiff = Math.abs(aCapacity - targetCapacity);
                    const bDiff = Math.abs(bCapacity - targetCapacity);

                    if (aDiff !== bDiff) return aDiff - bDiff;

                    // If same capacity difference, prefer cheaper
                    return parseFloat(a.currentPrice || a.price) - parseFloat(b.currentPrice || b.price);
                });

                selectedParts.ram = rams[0];
                ramMemoryType = 'DDR4'; // Lock to DDR4 for CPU/motherboard selection
                const ramPrice = parseFloat(selectedParts.ram.currentPrice || selectedParts.ram.price);
                totalCost += ramPrice;

                ramDebug.selected = {
                    name: selectedParts.ram.name || selectedParts.ram.title,
                    price: `$${ramPrice.toFixed(2)}`,
                    capacity: selectedParts.ram.totalCapacity || selectedParts.ram.capacity,
                    type: selectedParts.ram.memoryType || selectedParts.ram.type,
                    reason: `Pre-selected DDR4 for budget build compatibility`
                };

                ramDebug.topCandidates = rams.slice(0, 5).map(ram => ({
                    name: ram.name || ram.title,
                    price: `$${parseFloat(ram.currentPrice || ram.price).toFixed(2)}`,
                    capacity: ram.totalCapacity || ram.capacity
                }));

                console.log(`✓ Pre-selected RAM: ${selectedParts.ram.name || selectedParts.ram.title} (${ramMemoryType}) - $${ramPrice.toFixed(2)}`);
            } else {
                ramDebug.selected = null;
                ramDebug.reason = 'ERROR: No DDR4 RAM found in budget';
                console.error('ERROR: No DDR4 RAM found for budget build!');
            }

            debugLog.selections.push(ramDebug);
        }

        // 1. Select GPU - prioritize the best GPU within budget allocation
        const gpuBudget = maxBudget * allocations.gpu;
        const gpuDebug = {
            component: 'GPU',
            budget: `$${gpuBudget.toFixed(2)}`,
            searchCriteria: `Price: $0 - $${(gpuBudget * 1.3).toFixed(2)} (30% buffer), Available only`,
            candidatesFound: 0,
            topCandidates: []
        };

        // Get all GPU collections
        const gpuCollections = await db.listCollections({ name: /^gpus/ }).toArray();
        let allGPUs = [];

        for (const collection of gpuCollections) {
            const gpus = await db.collection(collection.name).find({
                currentPrice: { $gt: 0, $lte: gpuBudget * 1.3 },
                isAvailable: { $ne: false }
            }).toArray();
            const filtered = gpus.filter(gpu => !isDesktopOrLaptop(gpu.title || gpu.name || ''));
            allGPUs = allGPUs.concat(filtered);
            if (filtered.length > 0) {
                gpuDebug.candidatesFound += filtered.length;
            }
        }

        // Calculate performance score for each GPU using benchmark data
        allGPUs.forEach(gpu => {
            gpu.performanceScore = getGpuPerformance(gpu);
        });

        // Sort by performance score descending, fallback to price if no score
        allGPUs.sort((a, b) => {
            const perfA = parseFloat(a.performanceScore) || 0;
            const perfB = parseFloat(b.performanceScore) || 0;

            // If both have performance scores, sort by performance
            if (perfA > 0 && perfB > 0) {
                return perfB - perfA;
            }

            // If only one has a performance score, prioritize it
            if (perfA > 0) return -1;
            if (perfB > 0) return 1;

            // If neither has performance score, sort by price
            return parseFloat(b.currentPrice || b.price) - parseFloat(a.currentPrice || a.price);
        });

        console.log(`Found ${allGPUs.length} GPUs in budget. Top 5 by performance:`);
        allGPUs.slice(0, 5).forEach((gpu, idx) => {
            const perfScore = gpu.performanceScore ? `${(gpu.performanceScore * 100).toFixed(1)}%` : 'N/A';
            console.log(`  ${idx + 1}. ${gpu.name || gpu.title} - ${perfScore} performance, $${parseFloat(gpu.currentPrice || gpu.price).toFixed(2)}`);
        });

        // Store top 5 candidates for debugging
        gpuDebug.topCandidates = allGPUs.slice(0, 5).map(gpu => ({
            name: gpu.name || gpu.title,
            price: `$${parseFloat(gpu.currentPrice || gpu.price).toFixed(2)}`,
            model: extractGPUModel(gpu.name || gpu.title),
            performanceScore: gpu.performanceScore || 'N/A'
        }));

        if (allGPUs.length > 0) {
            selectedParts.gpu = allGPUs[0];

            // For unlimited budget, set GPU quantity to 2
            if (maxBudget === 999999) {
                selectedParts.gpu.quantity = 2;
            }

            const gpuQuantity = selectedParts.gpu.quantity || 1;
            const unitGpuPrice = parseFloat(selectedParts.gpu.currentPrice || selectedParts.gpu.price);
            const gpuPrice = unitGpuPrice * gpuQuantity;
            totalCost += gpuPrice;
            const perfScore = selectedParts.gpu.performanceScore;
            gpuDebug.selected = {
                name: selectedParts.gpu.name || selectedParts.gpu.title,
                price: `$${gpuPrice.toFixed(2)}`,
                unitPrice: `$${unitGpuPrice.toFixed(2)}`,
                quantity: gpuQuantity,
                model: extractGPUModel(selectedParts.gpu.name || selectedParts.gpu.title),
                performanceScore: perfScore || 'N/A',
                reason: perfScore ?
                    `Best performance within budget (Score: ${perfScore})${gpuQuantity > 1 ? ` x${gpuQuantity} for multi-GPU` : ''}` :
                    `Best GPU within budget by price (no performance data available)${gpuQuantity > 1 ? ` x${gpuQuantity} for multi-GPU` : ''}`
            };
            console.log(`Selected GPU: ${selectedParts.gpu.name || selectedParts.gpu.title} (Performance: ${perfScore || 'N/A'}, Price: $${unitGpuPrice.toFixed(2)} x${gpuQuantity} = $${gpuPrice.toFixed(2)})`);
        } else {
            gpuDebug.selected = null;
            gpuDebug.reason = 'No GPUs found within budget';
        }

        debugLog.selections.push(gpuDebug);

        // 2. Select CPU - prioritize the best CPU within budget allocation
        const cpuBudget = maxBudget * allocations.cpu;
        const performanceMetric = performance === 'multi' ? 'multiThreadPerformance' : 'singleCorePerformance';
        const performanceLabel = performance === 'multi' ? 'Multi-thread' : 'Single-thread';

        const cpuDebug = {
            component: 'CPU',
            budget: `$${cpuBudget.toFixed(2)}`,
            searchCriteria: `Price: $0 - $${(cpuBudget * 1.3).toFixed(2)} (30% buffer), Available only`,
            performanceMetric: `Sorting by ${performanceLabel} performance`,
            candidatesFound: 0,
            topCandidates: []
        };

        // Get all CPU collections
        const cpuCollections = await db.listCollections({ name: /^cpus/ }).toArray();
        let allCPUs = [];

        // For unlimited budget, remove price limit to get all CPUs
        const cpuQuery = maxBudget === 999999 ?
            { currentPrice: { $gt: 0 }, isAvailable: { $ne: false } } :
            { currentPrice: { $gt: 0, $lte: cpuBudget * 1.3 }, isAvailable: { $ne: false } };

        for (const collection of cpuCollections) {
            const cpus = await db.collection(collection.name).find(cpuQuery).toArray();
            allCPUs = allCPUs.concat(cpus);
        }

        // Also check main cpus collection
        const mainCpus = await db.collection('cpus').find(cpuQuery).toArray();
        allCPUs = allCPUs.concat(mainCpus);

        // For budget builds, EXCLUDE DDR5-only CPUs to ensure motherboard compatibility
        if (isBudgetBuild) {
            const ddr4Cpus = allCPUs.filter(cpu => {
                const name = (cpu.name || cpu.title || '').toLowerCase();
                const socket = (cpu.socket || '').toLowerCase();

                // Intel: LGA1851 (Ultra/Core 200 series) is DDR5-only, EXCLUDE
                const isIntelDDR5Only = socket.includes('1851');

                // AMD: AM5 (Ryzen 7000/9000) is DDR5-only, EXCLUDE
                const isAmdDDR5Only = (
                    socket.includes('am5') ||
                    name.includes('7950') || name.includes('7900') ||
                    name.includes('7800') || name.includes('7700') ||
                    name.includes('7600') || name.includes('9950') ||
                    name.includes('9900') || name.includes('9800') ||
                    name.includes('9700') || name.includes('9600')
                );

                // Intel LGA1700 (12th/13th/14th gen) supports BOTH DDR4 and DDR5, KEEP
                // AMD AM4 (Ryzen 5000) is DDR4-only, KEEP
                return !isIntelDDR5Only && !isAmdDDR5Only;
            });

            if (ddr4Cpus.length > 0) {
                allCPUs = ddr4Cpus;
                console.log(`💰 Budget build: Filtered to ${ddr4Cpus.length} DDR4-compatible CPUs (excluded DDR5-only platforms)`);
            } else {
                console.log('⚠️ Warning: No DDR4-compatible CPUs found for budget build, using all CPUs');
            }
        }

        // For unlimited budget, prioritize DDR5-compatible CPUs (Intel 12th gen+, AMD Ryzen 7000+)
        if (maxBudget === 999999) {
            const ddr5Cpus = allCPUs.filter(cpu => {
                const name = (cpu.name || cpu.title || '').toLowerCase();
                const socket = (cpu.socket || '').toLowerCase();

                // Intel: 12th gen (Alder Lake) and newer support DDR5 (LGA1700, LGA1851)
                const isIntelDDR5 = (
                    socket.includes('1700') || socket.includes('1851') ||
                    name.includes('13th') || name.includes('14th') || name.includes('15th') ||
                    name.match(/core.*[ui][359].*1[3-5]\d{3}/) // i3/i5/i9 13xxx, 14xxx, 15xxx series
                );

                // AMD: Ryzen 7000 series (AM5 socket) supports DDR5
                const isAmdDDR5 = (
                    socket.includes('am5') ||
                    name.includes('7950') || name.includes('7900') ||
                    name.includes('7800') || name.includes('7700') ||
                    name.includes('7600') || name.includes('9950') ||
                    name.includes('9900') || name.includes('9800') ||
                    name.includes('9700') || name.includes('9600')
                );

                return isIntelDDR5 || isAmdDDR5;
            });

            if (ddr5Cpus.length > 0) {
                allCPUs = ddr5Cpus;
                console.log(`Unlimited budget: Filtered to ${ddr5Cpus.length} DDR5-compatible CPUs`);
            } else {
                console.log('Warning: No DDR5-compatible CPUs found, using all CPUs');
            }
        }

        cpuDebug.candidatesFound = allCPUs.length;

        // Sort by performance metric (single-thread or multi-thread) descending
        // CPUs without the performance metric go to the end, then sort by price
        allCPUs.sort((a, b) => {
            const perfA = parseFloat(a[performanceMetric]) || 0;
            const perfB = parseFloat(b[performanceMetric]) || 0;

            // If both have performance scores, sort by performance
            if (perfA > 0 && perfB > 0) {
                return perfB - perfA;
            }

            // If only one has a performance score, prioritize it
            if (perfA > 0) return -1;
            if (perfB > 0) return 1;

            // If neither has performance score, sort by price
            return parseFloat(b.currentPrice || b.price) - parseFloat(a.currentPrice || a.price);
        });

        // Store top 5 candidates for debugging
        cpuDebug.topCandidates = allCPUs.slice(0, 5).map(cpu => ({
            name: cpu.name || cpu.title,
            price: `$${parseFloat(cpu.currentPrice || cpu.price).toFixed(2)}`,
            manufacturer: cpu.manufacturer,
            cores: cpu.cores,
            singleCorePerformance: cpu.singleCorePerformance || 'N/A',
            multiThreadPerformance: cpu.multiThreadPerformance || 'N/A',
            selectedMetric: `${performanceLabel}: ${cpu[performanceMetric] || 'N/A'}`
        }));

        if (allCPUs.length > 0) {
            selectedParts.cpu = allCPUs[0];
            const cpuPrice = parseFloat(selectedParts.cpu.currentPrice || selectedParts.cpu.price);
            totalCost += cpuPrice;
            const selectedPerf = selectedParts.cpu[performanceMetric];
            cpuDebug.selected = {
                name: selectedParts.cpu.name || selectedParts.cpu.title,
                price: `$${cpuPrice.toFixed(2)}`,
                manufacturer: selectedParts.cpu.manufacturer,
                cores: selectedParts.cpu.cores,
                singleCorePerformance: selectedParts.cpu.singleCorePerformance || 'N/A',
                multiThreadPerformance: selectedParts.cpu.multiThreadPerformance || 'N/A',
                reason: selectedPerf ?
                    `Best ${performanceLabel} performance within budget (Score: ${selectedPerf})` :
                    'Best CPU within budget by price (no performance data available)'
            };
        } else {
            cpuDebug.selected = null;
            cpuDebug.reason = 'No CPUs found within budget';
        }

        debugLog.selections.push(cpuDebug);

        // 3. Select RAM (prioritize 32GB for multi, 16GB for single)
        // Skip if RAM was already pre-selected for budget build
        if (selectedParts.ram) {
            console.log(`✓ Skipping RAM selection - already pre-selected for budget build`);
        } else {
            const ramBudget = maxBudget * allocations.ram;
            const preferredCapacity = performance === 'multi' ? '32GB' : '16GB';

        const ramDebug = {
            component: 'RAM',
            budget: `$${ramBudget.toFixed(2)}`,
            searchCriteria: `Price: $0 - $${(ramBudget * 1.3).toFixed(2)} (30% buffer)`,
            preferredCapacity: preferredCapacity,
            candidatesFound: 0,
            topCandidates: []
        };

        // Build query without memory type requirement (motherboard not selected yet)
        // Extract numeric capacity from preferredCapacity (e.g., "16GB" -> 16)
        const numericCapacity = parseInt(preferredCapacity);

        const ramQuery = {
            currentPrice: { $gt: 0, $lte: ramBudget * 1.3 },
            capacity: { $gte: numericCapacity } // Search for capacity as number, not string
        };

        let rams = await db.collection('rams').find(ramQuery)
            .sort({ currentPrice: -1, price: -1 }).limit(50).toArray();

        // Filter out laptop RAM by checking product name
        rams = rams.filter(ram => {
            const name = (ram.name || ram.title || '').toLowerCase();
            const formFactor = (ram.formFactor || '').toLowerCase();

            // Check formFactor if it exists (prioritize this)
            if (formFactor) {
                // Exclude SODIMM (laptop RAM)
                if (formFactor.includes('sodimm')) return false;
                // Include DIMM (desktop RAM)
                if (formFactor.includes('dimm')) return true;
            }

            // Fallback: Check product name for laptop keywords
            const laptopKeywords = ['laptop', 'notebook', 'sodimm', 'so-dimm'];
            for (const keyword of laptopKeywords) {
                if (name.includes(keyword)) return false;
            }

            // If no laptop keywords found, assume it's desktop RAM
            return true;
        });

        ramDebug.candidatesFound = rams.length;

        // Fallback 1: Try without capacity filter
        if (rams.length === 0) {
            ramDebug.fallbackSearch = 'Removed capacity filter';
            let allRams = await db.collection('rams').find({
                currentPrice: { $gt: 0, $lte: ramBudget * 1.3 }
            }).sort({ currentPrice: -1, price: -1 }).limit(50).toArray();

            // Filter out laptop RAM
            rams = allRams.filter(ram => {
                const name = (ram.name || ram.title || '').toLowerCase();
                const formFactor = (ram.formFactor || '').toLowerCase();
                if (formFactor && formFactor.includes('sodimm')) return false;
                const laptopKeywords = ['laptop', 'notebook', 'sodimm'];
                return !laptopKeywords.some(kw => name.includes(kw));
            });
            ramDebug.candidatesFound = rams.length;
        }

        // Fallback 2: Try DDR4 specifically (usually more affordable)
        if (rams.length === 0) {
            ramDebug.fallbackSearch = 'Trying DDR4 specifically';

            let allRams = await db.collection('rams').find({
                currentPrice: { $gt: 0, $lte: ramBudget * 1.3 },
                memoryType: { $regex: 'DDR4', $options: 'i' }
            }).sort({ currentPrice: -1, price: -1 }).limit(50).toArray();

            // Filter out laptop RAM
            rams = allRams.filter(ram => {
                const name = (ram.name || ram.title || '').toLowerCase();
                const formFactor = (ram.formFactor || '').toLowerCase();
                if (formFactor && formFactor.includes('sodimm')) return false;
                const laptopKeywords = ['laptop', 'notebook', 'sodimm'];
                return !laptopKeywords.some(kw => name.includes(kw));
            });

            ramDebug.candidatesFound = rams.length;
        }

        ramDebug.topCandidates = rams.slice(0, 5).map(ram => ({
            name: ram.name || ram.title,
            price: `$${parseFloat(ram.currentPrice || ram.price).toFixed(2)}`,
            capacity: ram.capacity,
            speed: ram.speed,
            memoryType: ram.memoryType
        }));

        if (rams.length > 0) {
            selectedParts.ram = rams[0];
            const ramPrice = parseFloat(selectedParts.ram.currentPrice || selectedParts.ram.price);
            totalCost += ramPrice;

            // Set ramMemoryType for motherboard compatibility filtering
            if (Array.isArray(selectedParts.ram.memoryType)) {
                ramMemoryType = selectedParts.ram.memoryType[0];
            } else {
                ramMemoryType = selectedParts.ram.memoryType;
            }

            ramDebug.selected = {
                name: selectedParts.ram.name || selectedParts.ram.title,
                price: `$${ramPrice.toFixed(2)}`,
                capacity: selectedParts.ram.capacity,
                speed: selectedParts.ram.speed,
                memoryType: selectedParts.ram.memoryType,
                reason: ramDebug.fallbackSearch
                    ? `Best RAM available (${ramDebug.fallbackSearch})`
                    : `Best ${preferredCapacity} RAM within budget`
            };
            console.log(`Selected RAM: ${selectedParts.ram.name || selectedParts.ram.title} (${ramMemoryType})`);
        } else {
            ramDebug.selected = null;
            ramDebug.reason = 'No RAM found within budget';
        }

            debugLog.selections.push(ramDebug);
        } // End of RAM selection else block

        // 4. Select Motherboard (compatible with CPU and RAM) - CRITICAL: Must always have a motherboard
        const motherboardBudget = maxBudget * allocations.motherboard;
        const motherboardDebug = {
            component: 'Motherboard',
            budget: `$${motherboardBudget.toFixed(2)}`,
            searchCriteria: `Price: $0 - $${(motherboardBudget * 1.5).toFixed(2)} (50% buffer), RAM Type: ${ramMemoryType || 'Any'}`,
            attempts: []
        };

        let selectedMotherboard = null;
        let compatibleCPU = selectedParts.cpu;

        // First attempt: Try to find motherboard compatible with selected CPU and RAM
        if (compatibleCPU) {
            const attempt1 = {
                attemptNumber: 1,
                strategy: 'Find motherboard compatible with CPU and RAM',
                cpuRequirements: {
                    chipset: compatibleCPU.chipset || 'N/A',
                    socket: compatibleCPU.socket || 'N/A'
                },
                ramRequirements: {
                    memoryType: ramMemoryType || 'N/A'
                }
            };

            let motherboardFilter = {
                currentPrice: { $gt: 0, $lte: motherboardBudget * 1.5 }
            };

            // CRITICAL: Filter motherboards by RAM type (RAM is now selected before motherboard)
            if (ramMemoryType) {
                motherboardFilter.$and = motherboardFilter.$and || [];
                motherboardFilter.$and.push({
                    $or: [
                        { memoryType: { $regex: ramMemoryType, $options: 'i' } },
                        { memory_type: { $regex: ramMemoryType, $options: 'i' } }
                    ]
                });
                console.log(`🔒 Filtering motherboards for ${ramMemoryType} compatibility (RAM selected first)`);
            }

            // Try to match by chipset or socket
            const matchFilters = [];
            if (compatibleCPU.chipset) {
                matchFilters.push({ chipset: compatibleCPU.chipset });
            }
            if (compatibleCPU.socket) {
                matchFilters.push({ socket: compatibleCPU.socket });
            }

            if (matchFilters.length > 0) {
                motherboardFilter.$or = matchFilters;
            }

            // For unlimited budget, get ALL compatible motherboards and prioritize DDR5 with multiple PCIe slots
            let compatibleMotherboards;
            if (maxBudget === 999999) {
                // Remove price limit for unlimited budget to get all boards
                const unlimitedFilter = { ...motherboardFilter };
                delete unlimitedFilter.currentPrice;

                compatibleMotherboards = await db.collection('motherboards').find(unlimitedFilter).toArray();

                // Filter for DDR5 motherboards with multiple PCIe slots
                const ddr5Boards = compatibleMotherboards.filter(mb => {
                    const memType = Array.isArray(mb.memoryType) ? mb.memoryType[0] : mb.memoryType;
                    const isDDR5 = memType && memType.toLowerCase().includes('ddr5');
                    const pcieSlots = mb.pcieSlotCount || 0;
                    const hasPrice = parseFloat(mb.currentPrice || mb.price) > 0;
                    return isDDR5 && pcieSlots >= 2 && hasPrice;
                });

                if (ddr5Boards.length > 0) {
                    // Sort by PCIe slots descending, then price descending (best/most expensive board first)
                    ddr5Boards.sort((a, b) => {
                        const slotsA = a.pcieSlotCount || 0;
                        const slotsB = b.pcieSlotCount || 0;
                        if (slotsB !== slotsA) return slotsB - slotsA;
                        return parseFloat(b.currentPrice || b.price) - parseFloat(a.currentPrice || a.price);
                    });
                    compatibleMotherboards = ddr5Boards;
                    console.log(`Unlimited budget: Found ${ddr5Boards.length} DDR5 motherboards with 2+ PCIe slots. Top choice: ${ddr5Boards[0].name || ddr5Boards[0].title} with ${ddr5Boards[0].pcieSlotCount} PCIe slots`);
                } else {
                    // Fallback: get any compatible boards, sorted by price descending
                    compatibleMotherboards.sort((a, b) => parseFloat(b.currentPrice || b.price) - parseFloat(a.currentPrice || a.price));
                }
            } else {
                // Standard budget: sort by lowest price first
                compatibleMotherboards = await db.collection('motherboards').find(motherboardFilter)
                    .sort({ currentPrice: 1, price: 1 }).limit(10).toArray();
            }

            attempt1.candidatesFound = compatibleMotherboards.length;
            attempt1.topCandidates = compatibleMotherboards.slice(0, 3).map(mb => ({
                name: mb.name || mb.title,
                price: `$${parseFloat(mb.currentPrice || mb.price).toFixed(2)}`,
                chipset: mb.chipset,
                socket: mb.socket
            }));

            if (compatibleMotherboards.length > 0) {
                selectedMotherboard = compatibleMotherboards[0];
                attempt1.success = true;
                attempt1.result = 'Found compatible motherboard';
            } else {
                attempt1.success = false;
                attempt1.result = 'No compatible motherboards found';
            }

            motherboardDebug.attempts.push(attempt1);
        }

        // Second attempt: If no compatible motherboard found, find any motherboard and adjust CPU
        if (!selectedMotherboard) {
            console.log('No compatible motherboard found for CPU, searching for alternative...');

            // Get all available motherboards in budget
            let fallbackFilter = {
                currentPrice: { $gt: 0, $lte: motherboardBudget * 1.5 }
            };

            // CRITICAL: Filter by RAM type (RAM is always selected before motherboard)
            if (ramMemoryType) {
                fallbackFilter.$and = fallbackFilter.$and || [];
                fallbackFilter.$and.push({
                    $or: [
                        { memoryType: { $regex: ramMemoryType, $options: 'i' } },
                        { memory_type: { $regex: ramMemoryType, $options: 'i' } }
                    ]
                });
                console.log(`🔒 Fallback motherboard search filtering for ${ramMemoryType} (RAM selected first)`);
            }

            const allMotherboards = await db.collection('motherboards').find(fallbackFilter).sort({ currentPrice: 1, price: 1 }).toArray(); // Sort by lowest price first

            if (allMotherboards.length > 0) {
                // Try each motherboard and find a compatible CPU
                for (const motherboard of allMotherboards) {
                    if (motherboard.chipset || motherboard.socket) {
                        // Find CPUs compatible with this motherboard
                        const cpuBudget = maxBudget * allocations.cpu;
                        let compatibleCPUs = [];

                        // Build CPU filter to match chipset or socket
                        const cpuFilter = {
                            currentPrice: { $gt: 0, $lte: cpuBudget * 1.3 },
                            isAvailable: { $ne: false }
                        };

                        const cpuMatchFilters = [];
                        if (motherboard.chipset) {
                            cpuMatchFilters.push({ chipset: motherboard.chipset });
                        }
                        if (motherboard.socket) {
                            cpuMatchFilters.push({ socket: motherboard.socket });
                        }

                        if (cpuMatchFilters.length > 0) {
                            cpuFilter.$or = cpuMatchFilters;
                        }

                        // Search all CPU collections
                        for (const collection of cpuCollections) {
                            const cpus = await db.collection(collection.name).find(cpuFilter).toArray();
                            compatibleCPUs = compatibleCPUs.concat(cpus);
                        }

                        // Also check main cpus collection
                        const mainCompatibleCpus = await db.collection('cpus').find(cpuFilter).toArray();
                        compatibleCPUs = compatibleCPUs.concat(mainCompatibleCpus);

                        if (compatibleCPUs.length > 0) {
                            // Found compatible CPU for this motherboard
                            compatibleCPUs.sort((a, b) => parseFloat(b.currentPrice || b.price) - parseFloat(a.currentPrice || a.price));

                            selectedMotherboard = motherboard;

                            // Update CPU if we had to change it
                            if (compatibleCPUs[0]._id !== compatibleCPU._id) {
                                // Adjust total cost
                                if (selectedParts.cpu) {
                                    totalCost -= parseFloat(selectedParts.cpu.currentPrice || selectedParts.cpu.price);
                                }
                                selectedParts.cpu = compatibleCPUs[0];
                                const newCpuPrice = parseFloat(selectedParts.cpu.currentPrice || selectedParts.cpu.price);
                                totalCost += newCpuPrice;
                                console.log(`Adjusted CPU to ${selectedParts.cpu.name || selectedParts.cpu.title} for motherboard compatibility`);

                                // Update CPU debug info with the new CPU
                                const selectedPerf = selectedParts.cpu[performanceMetric];
                                cpuDebug.selected = {
                                    name: selectedParts.cpu.name || selectedParts.cpu.title,
                                    price: `$${newCpuPrice.toFixed(2)}`,
                                    manufacturer: selectedParts.cpu.manufacturer,
                                    cores: selectedParts.cpu.cores,
                                    singleCorePerformance: selectedParts.cpu.singleCorePerformance || 'N/A',
                                    multiThreadPerformance: selectedParts.cpu.multiThreadPerformance || 'N/A',
                                    reason: `Adjusted for motherboard compatibility (was: ${compatibleCPU.name || compatibleCPU.title})`
                                };
                            }

                            break;
                        }
                    }
                }

                // Third attempt removed - we should NEVER select incompatible motherboard
                // Let the validation at the end catch this and return an error
            }
        }

        if (selectedMotherboard) {
            selectedParts.motherboard = selectedMotherboard;
            const mbPrice = parseFloat(selectedParts.motherboard.currentPrice || selectedParts.motherboard.price);
            totalCost += mbPrice;
            motherboardDebug.selected = {
                name: selectedMotherboard.name || selectedMotherboard.title,
                price: `$${mbPrice.toFixed(2)}`,
                chipset: selectedMotherboard.chipset,
                socket: selectedMotherboard.socket,
                reason: motherboardDebug.attempts[motherboardDebug.attempts.length - 1].result
            };
            console.log(`Selected motherboard: ${selectedMotherboard.name || selectedMotherboard.title}`);
        } else {
            motherboardDebug.selected = null;
            motherboardDebug.error = 'CRITICAL: No motherboard could be selected!';
            console.error('CRITICAL: No motherboard could be selected!');
        }

        debugLog.selections.push(motherboardDebug);

        // 5. Select Storage (CRITICAL: Always include SSD boot drive + evaluate HDD for additional storage)
        const storageBudget = maxBudget * allocations.storage;
        const storageDebug = {
            component: 'Storage',
            budget: `$${storageBudget.toFixed(2)}`,
            searchCriteria: `Always include SSD boot drive, evaluate SSD+HDD vs single large SSD`,
            requiredCapacity: `${storageGB}GB`,
            attempts: []
        };

        // Helper function to parse storage capacity
        function parseStorageCapacity(capacity) {
            let capacityInGB = 0;
            if (typeof capacity === 'number') {
                capacityInGB = capacity;
            } else if (typeof capacity === 'string') {
                const str = capacity.trim();
                const tbMatch = str.match(/(\d+\.?\d*)\s*TB/i);
                const gbMatch = str.match(/(\d+\.?\d*)\s*GB/i);
                if (tbMatch) {
                    capacityInGB = parseFloat(tbMatch[1]) * 1000;
                } else if (gbMatch) {
                    capacityInGB = parseFloat(gbMatch[1]);
                } else {
                    const num = parseFloat(str);
                    if (!isNaN(num)) capacityInGB = num;
                }
            }
            return capacityInGB;
        }

        // Helper function to check if storage is internal (not external/portable)
        function isInternalStorage(storage) {
            const title = (storage.name || storage.title || '').toLowerCase();
            const externalKeywords = ['external', 'portable', 'usb', 'backup drive', 'desktop drive'];
            return !externalKeywords.some(keyword => title.includes(keyword));
        }

        // Get all storage devices within budget
        const allStorages = await db.collection('storages').find({
            currentPrice: { $gt: 0, $lte: storageBudget * 2 }
        }).toArray();

        // Filter and categorize storage
        const storagesWithCapacity = allStorages
            .map(storage => ({
                ...storage,
                capacityGB: parseStorageCapacity(storage.capacity),
                isSSD: (storage.type || '').toLowerCase().includes('ssd'),
                isHDD: (storage.type || '').toLowerCase().includes('hdd'),
                isInternal: isInternalStorage(storage)
            }))
            .filter(s => s.capacityGB > 0 && s.isInternal);

        const ssds = storagesWithCapacity.filter(s => s.isSSD).sort((a, b) => b.capacityGB - a.capacityGB);
        const hdds = storagesWithCapacity.filter(s => s.isHDD).sort((a, b) => b.capacityGB - a.capacityGB);

        console.log(`Found ${ssds.length} SSDs and ${hdds.length} HDDs in budget`);

        let selectedStorageOption = null;
        let storageCost = 0;

        // Attempt 1: Single SSD meeting requirements (prioritize lowest price only)
        const ssdsSingleSolution = ssds.filter(s => s.capacityGB >= storageGB && parseFloat(s.currentPrice || s.price) <= storageBudget * 2);
        ssdsSingleSolution.sort((a, b) => {
            // Sort by lowest price only (even if it has more capacity)
            return parseFloat(a.currentPrice || a.price) - parseFloat(b.currentPrice || b.price);
        });

        const attempt1 = {
            attemptNumber: 1,
            strategy: 'Single SSD meeting capacity requirements (cheapest)',
            candidatesFound: ssdsSingleSolution.length,
            topCandidates: ssdsSingleSolution.slice(0, 3).map(s => ({
                name: s.name || s.title,
                capacity: `${s.capacityGB}GB`,
                price: `$${parseFloat(s.currentPrice || s.price).toFixed(2)}`,
                costPerGB: `$${(parseFloat(s.currentPrice || s.price) / s.capacityGB).toFixed(3)}/GB`
            }))
        };

        let singleSSDOption = null;
        if (ssdsSingleSolution.length > 0) {
            singleSSDOption = {
                drives: [ssdsSingleSolution[0]],
                totalCapacity: ssdsSingleSolution[0].capacityGB,
                totalCost: parseFloat(ssdsSingleSolution[0].currentPrice || ssdsSingleSolution[0].price),
                costPerGB: parseFloat(ssdsSingleSolution[0].currentPrice || ssdsSingleSolution[0].price) / ssdsSingleSolution[0].capacityGB
            };
            attempt1.success = true;
            attempt1.bestOption = {
                name: ssdsSingleSolution[0].name || ssdsSingleSolution[0].title,
                capacity: `${ssdsSingleSolution[0].capacityGB}GB`,
                price: `$${singleSSDOption.totalCost.toFixed(2)}`
            };
        } else {
            attempt1.success = false;
            attempt1.reason = `No single SSD with ${storageGB}GB+ found within budget`;
        }
        storageDebug.attempts.push(attempt1);

        // Attempt 2: SSD boot drive + HDD for additional storage
        const bootSSDs = ssds.filter(s =>
            s.capacityGB >= 250 &&
            s.capacityGB <= 1000 &&
            parseFloat(s.currentPrice || s.price) <= storageBudget * 1.5
        ).sort((a, b) => {
            // Prefer 500GB-1TB SSDs for boot drive
            const scoreA = Math.abs(a.capacityGB - 500);
            const scoreB = Math.abs(b.capacityGB - 500);
            return scoreA - scoreB;
        });

        const attempt2 = {
            attemptNumber: 2,
            strategy: 'SSD boot drive (250GB-1TB) + cheapest HDD meeting capacity needs',
            bootSSDCandidates: bootSSDs.length,
            hddCandidates: hdds.length
        };

        let ssdHddOption = null;
        if (bootSSDs.length > 0 && hdds.length > 0) {
            const bootSSD = bootSSDs[0];
            const bootSSDPrice = parseFloat(bootSSD.currentPrice || bootSSD.price);
            const remainingBudget = storageBudget * 2 - bootSSDPrice;
            const remainingCapacity = Math.max(0, storageGB - bootSSD.capacityGB);

            // Find cheapest HDD that meets remaining capacity (prioritize lowest price only)
            const suitableHDDs = hdds.filter(h =>
                h.capacityGB >= remainingCapacity &&
                parseFloat(h.currentPrice || h.price) <= remainingBudget
            ).sort((a, b) => {
                // Sort by lowest price only (even if it has more capacity)
                return parseFloat(a.currentPrice || a.price) - parseFloat(b.currentPrice || b.price);
            });

            if (suitableHDDs.length > 0 || remainingCapacity <= 0) {
                const hdd = remainingCapacity > 0 ? suitableHDDs[0] : null;
                const hddPrice = hdd ? parseFloat(hdd.currentPrice || hdd.price) : 0;
                const totalCapacity = bootSSD.capacityGB + (hdd ? hdd.capacityGB : 0);
                const totalCost = bootSSDPrice + hddPrice;

                ssdHddOption = {
                    drives: hdd ? [bootSSD, hdd] : [bootSSD],
                    totalCapacity: totalCapacity,
                    totalCost: totalCost,
                    costPerGB: totalCost / totalCapacity
                };

                attempt2.success = true;
                attempt2.selected = {
                    bootSSD: {
                        name: bootSSD.name || bootSSD.title,
                        capacity: `${bootSSD.capacityGB}GB`,
                        price: `$${bootSSDPrice.toFixed(2)}`
                    },
                    dataHDD: hdd ? {
                        name: hdd.name || hdd.title,
                        capacity: `${hdd.capacityGB}GB`,
                        price: `$${hddPrice.toFixed(2)}`
                    } : null,
                    totalCapacity: `${totalCapacity}GB`,
                    totalCost: `$${totalCost.toFixed(2)}`,
                    costPerGB: `$${ssdHddOption.costPerGB.toFixed(3)}/GB`
                };
            } else {
                attempt2.success = false;
                attempt2.reason = 'No suitable HDD found to pair with boot SSD';
            }
        } else {
            attempt2.success = false;
            attempt2.reason = bootSSDs.length === 0 ? 'No suitable boot SSDs found' : 'No HDDs available';
        }
        storageDebug.attempts.push(attempt2);

        // Attempt 3: Multiple SSDs (when there's excess budget, prefer SSDs over HDDs)
        const attempt3 = {
            attemptNumber: 3,
            strategy: 'Multiple SSDs (avoid HDDs when budget allows)',
            candidatesFound: 0
        };

        let multiSSDOption = null;
        // Try to find combination of 2-3 SSDs that meet capacity requirement
        const affordableSSDs = ssds.filter(s => parseFloat(s.currentPrice || s.price) <= storageBudget * 1.5)
            .sort((a, b) => parseFloat(a.currentPrice || a.price) - parseFloat(b.currentPrice || b.price));

        if (affordableSSDs.length >= 2) {
            // Try combinations of 2 SSDs first
            for (let i = 0; i < affordableSSDs.length && !multiSSDOption; i++) {
                for (let j = i + 1; j < affordableSSDs.length && !multiSSDOption; j++) {
                    const ssd1 = affordableSSDs[i];
                    const ssd2 = affordableSSDs[j];
                    const totalCapacity = ssd1.capacityGB + ssd2.capacityGB;
                    const totalCost = parseFloat(ssd1.currentPrice || ssd1.price) + parseFloat(ssd2.currentPrice || ssd2.price);

                    if (totalCapacity >= storageGB && totalCost <= storageBudget * 2) {
                        multiSSDOption = {
                            drives: [ssd1, ssd2],
                            totalCapacity: totalCapacity,
                            totalCost: totalCost,
                            costPerGB: totalCost / totalCapacity
                        };
                        attempt3.success = true;
                        attempt3.candidatesFound++;
                        break;
                    }
                }
            }

            // If 2 SSDs didn't work, try 3 SSDs
            if (!multiSSDOption && affordableSSDs.length >= 3) {
                for (let i = 0; i < affordableSSDs.length && !multiSSDOption; i++) {
                    for (let j = i + 1; j < affordableSSDs.length && !multiSSDOption; j++) {
                        for (let k = j + 1; k < affordableSSDs.length && !multiSSDOption; k++) {
                            const ssd1 = affordableSSDs[i];
                            const ssd2 = affordableSSDs[j];
                            const ssd3 = affordableSSDs[k];
                            const totalCapacity = ssd1.capacityGB + ssd2.capacityGB + ssd3.capacityGB;
                            const totalCost = parseFloat(ssd1.currentPrice || ssd1.price) +
                                            parseFloat(ssd2.currentPrice || ssd2.price) +
                                            parseFloat(ssd3.currentPrice || ssd3.price);

                            if (totalCapacity >= storageGB && totalCost <= storageBudget * 2) {
                                multiSSDOption = {
                                    drives: [ssd1, ssd2, ssd3],
                                    totalCapacity: totalCapacity,
                                    totalCost: totalCost,
                                    costPerGB: totalCost / totalCapacity
                                };
                                attempt3.success = true;
                                attempt3.candidatesFound++;
                                break;
                            }
                        }
                    }
                }
            }
        }

        if (multiSSDOption) {
            attempt3.selected = {
                drives: multiSSDOption.drives.map(d => ({
                    name: d.name || d.title,
                    capacity: `${d.capacityGB}GB`,
                    price: `$${parseFloat(d.currentPrice || d.price).toFixed(2)}`
                })),
                totalCapacity: `${multiSSDOption.totalCapacity}GB`,
                totalCost: `$${multiSSDOption.totalCost.toFixed(2)}`,
                costPerGB: `$${multiSSDOption.costPerGB.toFixed(3)}/GB`
            };
        } else {
            attempt3.success = false;
            attempt3.reason = 'No suitable multi-SSD combinations found within budget';
        }
        storageDebug.attempts.push(attempt3);

        // Compare options and select best (prefer multi-SSD when excess budget, otherwise cheapest)
        const options = [singleSSDOption, ssdHddOption, multiSSDOption].filter(o => o !== null);

        if (options.length > 0) {
            const validOptions = options.filter(o => o.totalCapacity >= storageGB);

            // Check if multi-SSD option exists and filter out HDD options
            const ssdOnlyOptions = validOptions.filter(o => {
                // Check if option contains any HDDs
                return o.drives.every(d => (d.type || '').toLowerCase().includes('ssd'));
            });

            // If we have SSD-only options and there's enough budget headroom, prefer them
            const budgetRemaining = maxBudget - totalCost;
            const hasExcessBudget = budgetRemaining > storageBudget * 0.5; // 50% headroom

            if (ssdOnlyOptions.length > 0 && hasExcessBudget) {
                // When excess budget, prefer all-SSD solutions (avoid HDDs)
                selectedStorageOption = ssdOnlyOptions.sort((a, b) => a.totalCost - b.totalCost)[0];
            } else {
                // Otherwise select cheapest option (may include HDD)
                selectedStorageOption = validOptions.length > 0
                    ? validOptions.sort((a, b) => a.totalCost - b.totalCost)[0]
                    : options.sort((a, b) => b.totalCapacity - a.totalCapacity)[0];
            }

            selectedParts.storage = selectedStorageOption.drives.length === 1
                ? selectedStorageOption.drives[0]
                : selectedStorageOption.drives;

            storageCost = selectedStorageOption.totalCost;
            totalCost += storageCost;

            // Determine configuration type
            let configurationType = 'Single SSD';
            let selectionReason = 'Single SSD is cheapest option meeting capacity requirement';

            if (selectedStorageOption.drives.length > 1) {
                const hasHDD = selectedStorageOption.drives.some(d => (d.type || '').toLowerCase().includes('hdd'));
                const hasSSD = selectedStorageOption.drives.some(d => (d.type || '').toLowerCase().includes('ssd'));

                if (hasHDD && hasSSD) {
                    configurationType = 'SSD + HDD';
                    selectionReason = 'SSD boot drive + HDD for additional storage (budget-conscious)';
                } else if (hasSSD) {
                    configurationType = `Multiple SSDs (${selectedStorageOption.drives.length} drives)`;
                    selectionReason = 'Multiple SSDs preferred (excess budget, avoiding HDDs)';
                }
            }

            storageDebug.selected = {
                configuration: configurationType,
                drives: selectedStorageOption.drives.map(d => ({
                    name: d.name || d.title,
                    type: d.type,
                    capacity: `${d.capacityGB}GB`,
                    price: `$${parseFloat(d.currentPrice || d.price).toFixed(2)}`
                })),
                totalCapacity: `${selectedStorageOption.totalCapacity}GB`,
                totalCost: `$${storageCost.toFixed(2)}`,
                costPerGB: `$${selectedStorageOption.costPerGB.toFixed(3)}/GB`,
                reason: selectionReason
            };

            console.log(`Selected storage: ${selectedStorageOption.drives.length} drive(s), ${selectedStorageOption.totalCapacity}GB total, $${storageCost.toFixed(2)}`);
        } else {
            // Fallback: Just get the largest SSD available
            if (ssds.length > 0) {
                selectedParts.storage = ssds[0];
                storageCost = parseFloat(ssds[0].currentPrice || ssds[0].price);
                totalCost += storageCost;

                storageDebug.selected = {
                    name: ssds[0].name || ssds[0].title,
                    type: ssds[0].type,
                    capacity: `${ssds[0].capacityGB}GB`,
                    price: `$${storageCost.toFixed(2)}`,
                    warning: 'Fallback - largest SSD within budget',
                    reason: 'No combinations meet all requirements'
                };
                console.log(`Fallback: Selected ${ssds[0].name || ssds[0].title}`);
            } else {
                storageDebug.selected = null;
                storageDebug.error = 'CRITICAL: No suitable storage devices found!';
                console.error('CRITICAL: No suitable storage devices found!');
            }
        }

        debugLog.selections.push(storageDebug);

        // 6. Select PSU (based on total system power requirements)
        const psuBudget = maxBudget * allocations.psu;

        // More realistic power estimation using actual component TDP values
        const basePower = 100; // Motherboard, fans, etc.
        let gpuPower = selectedParts.gpu ? getGPUTDP(selectedParts.gpu.name || selectedParts.gpu.title) : 0;
        let cpuPower = selectedParts.cpu ? getCPUTDP(selectedParts.cpu) : 0;
        const ramPower = 10; // DDR5 RAM
        // Storage can be an array or a single object, handle both cases
        let storagePower = 5; // Default 5W
        if (selectedParts.storage) {
            if (Array.isArray(selectedParts.storage)) {
                storagePower = selectedParts.storage.length * 5; // 5W per storage device
            } else {
                storagePower = 5; // Single storage device
            }
        }
        const coolerPower = 20; // CPU cooler fans (liquid cooler uses more power)

        // Ensure all power values are valid numbers (not NaN or undefined)
        if (isNaN(gpuPower) || gpuPower === undefined) {
            console.warn(`WARNING: gpuPower is ${gpuPower}, using default 250W`);
            gpuPower = 250;
        }
        if (isNaN(cpuPower) || cpuPower === undefined) {
            console.warn(`WARNING: cpuPower is ${cpuPower}, using default 142W`);
            cpuPower = 142;
        }

        console.log(`\n=== Power Calculation Debug ===`);
        console.log(`basePower: ${basePower} (type: ${typeof basePower})`);
        console.log(`gpuPower: ${gpuPower} (type: ${typeof gpuPower})`);
        console.log(`cpuPower: ${cpuPower} (type: ${typeof cpuPower})`);
        console.log(`ramPower: ${ramPower} (type: ${typeof ramPower})`);
        console.log(`storagePower: ${storagePower} (type: ${typeof storagePower})`);
        console.log(`coolerPower: ${coolerPower} (type: ${typeof coolerPower})`);

        const estimatedWattage = basePower + gpuPower + cpuPower + ramPower + storagePower + coolerPower;
        console.log(`estimatedWattage: ${estimatedWattage} (type: ${typeof estimatedWattage})`);
        // Add 20-30% overhead for safety
        const recommendedWattage = Math.ceil((estimatedWattage * 1.25) / 50) * 50; // 25% overhead, round up to nearest 50W

        const psuDebug = {
            component: 'PSU',
            budget: `$${psuBudget.toFixed(2)}`,
            searchCriteria: `Price: $0 - $${(psuBudget * 1.5).toFixed(2)} (50% buffer), Min Wattage: ${recommendedWattage}W`,
            powerCalculation: {
                baseSystem: `${basePower}W`,
                gpu: `${gpuPower}W`,
                cpu: `${cpuPower}W`,
                ram: `${ramPower}W`,
                storage: `${storagePower}W`,
                cooler: `${coolerPower}W`,
                estimated: `${estimatedWattage}W`,
                recommended: `${recommendedWattage}W (+100W overhead, rounded to 50W)`
            },
            candidatesFound: 0,
            topCandidates: []
        };

        // First, let's check what PSUs exist and log their wattage field
        const samplePSUs = await db.collection('psus').find({ currentPrice: { $gt: 0 } }).limit(5).toArray();
        console.log(`\n=== PSU Debug ===`);
        console.log(`Recommended wattage: ${recommendedWattage}W`);
        console.log(`PSU budget: $${psuBudget.toFixed(2)} (max: $${(psuBudget * 1.5).toFixed(2)})`);
        console.log(`Sample PSUs from database (first 5):`);
        samplePSUs.forEach((psu, idx) => {
            console.log(`  ${idx + 1}. ${psu.name || psu.title}`);
            console.log(`     Price: $${psu.currentPrice || psu.price}`);
            console.log(`     Wattage field: ${psu.wattage} (type: ${typeof psu.wattage})`);
            console.log(`     All wattage-related fields:`, {
                wattage: psu.wattage,
                Wattage: psu.Wattage,
                watts: psu.watts,
                specs_wattage: psu.specs?.wattage
            });
        });
        console.log(`=== End PSU Debug ===\n`);

        let psus = await db.collection('psus').find({
            currentPrice: { $gt: 0, $lte: psuBudget * 1.5 },
            wattage: { $gte: recommendedWattage }
        }).sort({ currentPrice: 1, price: 1 }).limit(10).toArray(); // Sort by lowest price first

        psuDebug.candidatesFound = psus.length;
        console.log(`Found ${psus.length} PSUs matching criteria (price <= $${(psuBudget * 1.5).toFixed(2)}, wattage >= ${recommendedWattage}W)`);

        // If no PSUs found in budget, prioritize wattage over budget
        // NEVER select a PSU below the recommended wattage
        if (psus.length === 0) {
            // First try: Find PSUs that meet wattage requirement, ignore budget
            psus = await db.collection('psus').find({
                wattage: { $gte: recommendedWattage },
                currentPrice: { $gt: 0 }
            }).sort({ currentPrice: 1 }).limit(10).toArray();

            if (psus.length > 0) {
                psuDebug.searchCriteria = `Cheapest PSU >= ${recommendedWattage}W (exceeds budget allocation but necessary for system stability)`;
                psuDebug.candidatesFound = psus.length;
            } else {
                // Last resort: If no PSU meets exact wattage, find closest match that's still adequate
                // Use a reasonable range (90-110% of recommended)
                const minAcceptable = Math.floor(recommendedWattage * 0.9);
                const maxReasonable = Math.ceil(recommendedWattage * 1.5);

                psus = await db.collection('psus').find({
                    wattage: { $gte: minAcceptable, $lte: maxReasonable },
                    currentPrice: { $gt: 0 }
                }).sort({ currentPrice: 1 }).limit(10).toArray();

                if (psus.length > 0) {
                    psuDebug.searchCriteria = `Cheapest PSU ${minAcceptable}W-${maxReasonable}W (closest match to ${recommendedWattage}W requirement)`;
                    psuDebug.candidatesFound = psus.length;
                }
            }
        }


        psuDebug.topCandidates = psus.slice(0, 5).map(psu => ({
            name: psu.name || psu.title,
            price: `$${parseFloat(psu.currentPrice || psu.price).toFixed(2)}`,
            wattage: `${psu.wattage}W`,
            certification: psu.certification
        }));

        if (psus.length > 0) {
            selectedParts.psu = psus[0];
            const psuPrice = parseFloat(selectedParts.psu.currentPrice || selectedParts.psu.price);
            totalCost += psuPrice;
            psuDebug.selected = {
                name: selectedParts.psu.name || selectedParts.psu.title,
                price: `$${psuPrice.toFixed(2)}`,
                wattage: `${selectedParts.psu.wattage}W`,
                certification: selectedParts.psu.certification,
                reason: psuDebug.searchCriteria.includes('Cheapest') ? 'Cheapest PSU (mandatory component)' : `Best PSU meeting ${recommendedWattage}W requirement`
            };
        } else {
            psuDebug.selected = null;
            psuDebug.reason = 'ERROR: No PSUs found in database';
        }

        debugLog.selections.push(psuDebug);

        // 7. Select Case (MANDATORY - moved before cooler)
        const caseBudget = maxBudget * allocations.case;
        const caseDebug = {
            component: 'Case',
            budget: `$${caseBudget.toFixed(2)}`,
            searchCriteria: `Price: $0 - $${(caseBudget * 1.5).toFixed(2)} (50% buffer)`,
            candidatesFound: 0,
            topCandidates: []
        };

        let cases = await db.collection('cases').find({
            currentPrice: { $gt: 0, $lte: caseBudget * 1.5 },
            // Exclude PSUs that might be misclassified as cases
            wattage: { $exists: false },
            name: { $not: { $regex: 'power supply|\\bpsu\\b|watt\\b', $options: 'i' } }
        }).sort({ currentPrice: -1, price: -1 }).limit(10).toArray();

        // Filter cases to ensure motherboard form factor compatibility
        if (selectedParts.motherboard && selectedParts.motherboard.formFactor) {
            const motherboardFormFactor = selectedParts.motherboard.formFactor;
            const moboFFUpper = motherboardFormFactor.toUpperCase().replace(/-/g, '').replace(/\s+/g, '').trim();

            // Check motherboard type (order matters: check more specific first)
            const isMoboITX = moboFFUpper.includes('ITX') && !moboFFUpper.includes('ATX');
            const isMoboMicroATX = moboFFUpper.includes('MATX') || moboFFUpper.includes('MICROATX');
            const isMoboEATX = moboFFUpper.includes('EATX');
            const isMoboATX = !isMoboITX && !isMoboMicroATX && !isMoboEATX && moboFFUpper.includes('ATX');

            const compatibleCases = cases.filter(caseItem => {
                const caseFormFactors = caseItem.formFactor || [];
                const caseFormFactorArray = Array.isArray(caseFormFactors) ? caseFormFactors : [caseFormFactors];

                for (const caseFF of caseFormFactorArray) {
                    const caseFFUpper = caseFF.toUpperCase().replace(/-/g, '').replace(/\s+/g, '').trim();

                    // Check case type (order matters: check more specific first)
                    const isCaseITX = caseFFUpper.includes('ITX') && !caseFFUpper.includes('ATX');
                    const isCaseMicroATX = caseFFUpper.includes('MATX') || caseFFUpper.includes('MICROATX');
                    const isCaseEATX = caseFFUpper.includes('EATX');
                    const isCaseATX = !isCaseITX && !isCaseMicroATX && !isCaseEATX && caseFFUpper.includes('ATX');

                    // E-ATX case accepts all motherboards
                    if (isCaseEATX) return true;
                    // ATX case: compatible with ATX, mATX, ITX
                    if (isCaseATX && (isMoboATX || isMoboMicroATX || isMoboITX)) return true;
                    // mATX/Micro ATX case: compatible with mATX, ITX
                    if (isCaseMicroATX && (isMoboMicroATX || isMoboITX)) return true;
                    // ITX case: compatible with ITX only
                    if (isCaseITX && isMoboITX) return true;
                }

                return false;
            });

            if (compatibleCases.length > 0) {
                cases = compatibleCases;
                caseDebug.searchCriteria += `, Compatible with ${motherboardFormFactor} motherboard`;
                console.log(`Filtered to ${compatibleCases.length} cases compatible with ${motherboardFormFactor} motherboard`);
            } else {
                console.warn(`⚠️ No compatible cases found for ${motherboardFormFactor} motherboard in budget, expanding search...`);
                // Set cases to empty array to trigger fallback search for compatible cases
                cases = [];
            }
        }

        caseDebug.candidatesFound = cases.length;

        // If no cases found in budget, find the cheapest available (MANDATORY component)
        if (cases.length === 0) {
            cases = await db.collection('cases').find({
                currentPrice: { $gt: 0 },
                // Exclude PSUs that might be misclassified as cases
                wattage: { $exists: false },
                name: { $not: { $regex: 'power supply|\\bpsu\\b|watt\\b', $options: 'i' } }
            }).sort({ currentPrice: 1, price: 1 }).limit(10).toArray();

            // Filter for motherboard compatibility even in fallback
            if (selectedParts.motherboard && selectedParts.motherboard.formFactor) {
                const motherboardFormFactor = selectedParts.motherboard.formFactor;
                const moboFFUpper = motherboardFormFactor.toUpperCase().replace(/-/g, '').replace(/\s+/g, '').trim();

                const isMoboITX = moboFFUpper.includes('ITX') && !moboFFUpper.includes('ATX');
                const isMoboMicroATX = moboFFUpper.includes('MATX') || moboFFUpper.includes('MICROATX');
                const isMoboEATX = moboFFUpper.includes('EATX');
                const isMoboATX = !isMoboITX && !isMoboMicroATX && !isMoboEATX && moboFFUpper.includes('ATX');

                const compatibleCases = cases.filter(caseItem => {
                    const caseFormFactors = caseItem.formFactor || [];
                    const caseFormFactorArray = Array.isArray(caseFormFactors) ? caseFormFactors : [caseFormFactors];

                    for (const caseFF of caseFormFactorArray) {
                        const caseFFUpper = caseFF.toUpperCase().replace(/-/g, '').replace(/\s+/g, '').trim();

                        const isCaseITX = caseFFUpper.includes('ITX') && !caseFFUpper.includes('ATX');
                        const isCaseMicroATX = caseFFUpper.includes('MATX') || caseFFUpper.includes('MICROATX');
                        const isCaseEATX = caseFFUpper.includes('EATX');
                        const isCaseATX = !isCaseITX && !isCaseMicroATX && !isCaseEATX && caseFFUpper.includes('ATX');

                        if (isCaseEATX) return true;
                        if (isCaseATX && (isMoboATX || isMoboMicroATX || isMoboITX)) return true;
                        if (isCaseMicroATX && (isMoboMicroATX || isMoboITX)) return true;
                        if (isCaseITX && isMoboITX) return true;
                    }

                    return false;
                });

                if (compatibleCases.length > 0) {
                    cases = compatibleCases;
                    console.log(`Fallback: Found ${compatibleCases.length} compatible cases for ${motherboardFormFactor} motherboard`);
                }
            }

            caseDebug.searchCriteria = 'Cheapest available (budget allocation insufficient)';
            caseDebug.candidatesFound = cases.length;
        }

        caseDebug.topCandidates = cases.slice(0, 5).map(caseItem => ({
            name: caseItem.name || caseItem.title,
            price: `$${parseFloat(caseItem.currentPrice || caseItem.price).toFixed(2)}`
        }));

        if (cases.length > 0) {
            selectedParts.case = cases[0];
            const casePrice = parseFloat(selectedParts.case.currentPrice || selectedParts.case.price);
            totalCost += casePrice;
            caseDebug.selected = {
                name: selectedParts.case.name || selectedParts.case.title,
                price: `$${casePrice.toFixed(2)}`,
                reason: caseDebug.searchCriteria.includes('Cheapest') ? 'Cheapest case (mandatory component)' : 'Best case within budget allocation'
            };
        } else {
            caseDebug.selected = null;
            caseDebug.reason = 'ERROR: No cases found in database';
        }

        debugLog.selections.push(caseDebug);

        // 8. Select Cooler (MANDATORY for K/KF/X CPUs, OPTIONAL otherwise)
        const remainingBudgetBeforeCooler = maxBudget - totalCost;
        const budgetUtilization = totalCost / maxBudget;
        const coolerBudget = maxBudget * allocations.cooler;

        // Check if CPU requires a cooler based on the coolerIncluded field
        const cpuName = selectedParts.cpu ? (selectedParts.cpu.name || selectedParts.cpu.title || '') : '';
        // CPU needs a cooler if coolerIncluded is explicitly false OR if it matches patterns known to not include coolers
        const cpuIncludesCooler = selectedParts.cpu && selectedParts.cpu.coolerIncluded === true;
        const cpuNeedsCooler = !cpuIncludesCooler;

        // Cooler is MANDATORY if CPU doesn't include one, OPTIONAL otherwise
        const shouldSelectCooler = cpuNeedsCooler || (budgetUtilization < 0.85 && remainingBudgetBeforeCooler > 20);

        if (shouldSelectCooler) {
            const coolerDebug = {
                component: 'Cooler',
                budget: `$${coolerBudget.toFixed(2)}`,
                searchCriteria: cpuNeedsCooler ?
                    `MANDATORY for ${cpuName} (no stock cooler) - Finding cheapest available` :
                    `Price: $0 - $${(coolerBudget * 1.5).toFixed(2)} (50% buffer)`,
                candidatesFound: 0,
                topCandidates: []
            };

            let coolers;

            // If CPU needs cooler (MANDATORY), get cheapest. Otherwise, get best in budget.
            if (cpuNeedsCooler) {
                // MANDATORY: Get cheapest cooler available
                coolers = await db.collection('coolers').find({
                    currentPrice: { $gt: 0 }
                }).sort({ currentPrice: 1, price: 1 }).limit(10).toArray();
                coolerDebug.searchCriteria = `MANDATORY for ${cpuName} (no stock cooler) - Finding cheapest available`;
            } else {
                // OPTIONAL: Get best cooler within budget allocation
                coolers = await db.collection('coolers').find({
                    currentPrice: { $gt: 0, $lte: coolerBudget * 1.5 }
                }).sort({ currentPrice: -1, price: -1 }).limit(10).toArray();
            }

            coolerDebug.candidatesFound = coolers.length;
            coolerDebug.topCandidates = coolers.slice(0, 5).map(cooler => ({
                name: cooler.name || cooler.title,
                price: `$${parseFloat(cooler.currentPrice || cooler.price).toFixed(2)}`
            }));

            if (coolers.length > 0) {
                selectedParts.cooler = coolers[0];
                const coolerPrice = parseFloat(selectedParts.cooler.currentPrice || selectedParts.cooler.price);
                totalCost += coolerPrice;
                coolerDebug.selected = {
                    name: selectedParts.cooler.name || selectedParts.cooler.title,
                    price: `$${coolerPrice.toFixed(2)}`,
                    reason: cpuNeedsCooler ?
                        `MANDATORY for ${cpuName} (CPU does not include stock cooler)` :
                        'Best cooler within budget allocation'
                };
            } else {
                coolerDebug.selected = null;
                coolerDebug.reason = 'ERROR: No coolers found in database';
            }

            debugLog.selections.push(coolerDebug);

            // If cooler was MANDATORY and pushed us over budget, log a warning
            if (cpuNeedsCooler && totalCost > maxBudget) {
                console.log(`⚠️ WARNING: Mandatory cooler for ${cpuName} pushed budget to $${totalCost.toFixed(2)} (over $${maxBudget} budget)`);
                console.log('   Consider: 1) Cheaper CPU, 2) Cheaper case, or 3) Less storage');
            }
        } else {
            const coolerDebug = {
                component: 'Cooler',
                budget: `$${coolerBudget.toFixed(2)}`,
                searchCriteria: 'Skipped - CPU includes stock cooler',
                candidatesFound: 0,
                topCandidates: [],
                selected: null,
                reason: `Skipped - ${cpuName} includes stock cooler`
            };
            debugLog.selections.push(coolerDebug);
            console.log('Skipping cooler selection - CPU includes stock cooler');
        }

        // 9. Fill remaining budget with additional SSDs (aim for 90% budget utilization)
        const targetBudgetUtilization = 0.90; // 90%
        const targetSpend = maxBudget * targetBudgetUtilization;
        const currentUtilization = totalCost / maxBudget;

        if (currentUtilization < targetBudgetUtilization) {
            const remainingBudgetForSSDs = maxBudget - totalCost;
            const minSSDPrice = 50; // Don't add SSDs cheaper than $50

            console.log(`\nCurrent budget utilization: ${(currentUtilization * 100).toFixed(1)}% ($${totalCost.toFixed(2)} / $${maxBudget.toFixed(2)})`);
            console.log(`Target: 90%, trying to add SSDs with remaining $${remainingBudgetForSSDs.toFixed(2)}`);

            // Get current storage configuration
            const currentStorage = Array.isArray(selectedParts.storage) ? selectedParts.storage : (selectedParts.storage ? [selectedParts.storage] : []);
            const additionalSSDs = [];

            // Keep adding SSDs until we reach 90% budget or run out of suitable options
            let currentBudgetForSSDs = remainingBudgetForSSDs;
            let addedSSDs = 0;

            while (currentBudgetForSSDs >= minSSDPrice && addedSSDs < 5) { // Max 5 additional SSDs
                const affordableSSDs = await db.collection('storage').find({
                    $and: [
                        {
                            $or: [
                                { currentPrice: { $gt: minSSDPrice, $lte: currentBudgetForSSDs } },
                                { price: { $gt: minSSDPrice, $lte: currentBudgetForSSDs } }
                            ]
                        },
                        {
                            $or: [
                                { type: { $regex: 'SSD', $options: 'i' } },
                                { type: { $regex: 'M\\.2', $options: 'i' } },
                                { type: { $regex: 'NVMe', $options: 'i' } }
                            ]
                        }
                    ]
                }).sort({ currentPrice: -1, price: -1 }).limit(10).toArray(); // Largest first

                if (affordableSSDs.length === 0) break;

                const ssd = affordableSSDs[0];
                const ssdPrice = parseFloat(ssd.currentPrice || ssd.price);

                additionalSSDs.push(ssd);
                currentBudgetForSSDs -= ssdPrice;
                totalCost += ssdPrice;
                addedSSDs++;

                console.log(`Added additional SSD ${addedSSDs}: ${ssd.name || ssd.title} ($${ssdPrice.toFixed(2)})`);

                // Stop if we've reached 90% or would go over budget
                if (totalCost >= targetSpend || totalCost + minSSDPrice > maxBudget) {
                    break;
                }
            }

            // Update storage configuration
            if (additionalSSDs.length > 0) {
                const allStorage = [...currentStorage, ...additionalSSDs];
                selectedParts.storage = allStorage;
                console.log(`Total storage devices: ${allStorage.length}, Total budget utilization: ${((totalCost / maxBudget) * 100).toFixed(1)}%`);
            }
        }

        // 10. Optional: Select Monitor if requested
        if (includeMonitor) {
            const remainingBudget = maxBudget - totalCost;
            const monitorDebug = {
                component: 'Monitor',
                budget: `$${remainingBudget.toFixed(2)}`,
                searchCriteria: maxBudget === 999999 ? '3x MSI QD-OLED 32" 4K 240Hz (Unlimited budget)' : `Price: $0 - $${remainingBudget.toFixed(2)} (Remaining budget)`,
                candidatesFound: 0,
                topCandidates: []
            };

            // For unlimited budget, select 3x MSI QD-OLED 32" 4K 240Hz monitors
            if (maxBudget === 999999) {
                const msiMonitors = await db.collection('addons').find({
                    category: 'Monitor',
                    $and: [
                        {
                            $or: [
                                { name: { $regex: 'MSI.*QD-OLED.*32', $options: 'i' } },
                                { title: { $regex: 'MSI.*QD-OLED.*32', $options: 'i' } }
                            ]
                        },
                        {
                            $or: [
                                { name: { $regex: '4K.*240', $options: 'i' } },
                                { title: { $regex: '4K.*240', $options: 'i' } }
                            ]
                        },
                        {
                            $or: [
                                { currentPrice: { $gt: 0 } },
                                { price: { $gt: 0 } }
                            ]
                        }
                    ]
                }).sort({ currentPrice: -1, price: -1 }).limit(1).toArray();

                monitorDebug.candidatesFound = msiMonitors.length;

                if (msiMonitors.length > 0) {
                    const monitor = msiMonitors[0];
                    // Create 3 separate addon components for the frontend
                    selectedParts.monitor = monitor;
                    selectedParts.addon2 = { ...monitor };  // Clone for addon2
                    selectedParts.addon3 = { ...monitor };  // Clone for addon3

                    const unitMonitorPrice = parseFloat(monitor.currentPrice || monitor.price);
                    const totalMonitorPrice = unitMonitorPrice * 3;
                    totalCost += totalMonitorPrice;

                    monitorDebug.selected = {
                        name: `3x ${monitor.name || monitor.title}`,
                        price: `$${unitMonitorPrice.toFixed(2)} x3 = $${totalMonitorPrice.toFixed(2)}`,
                        reason: 'Premium triple monitor setup for unlimited budget'
                    };
                    console.log(`Selected 3x MSI QD-OLED Monitor: ${monitor.name || monitor.title} - $${unitMonitorPrice.toFixed(2)} x3 = $${totalMonitorPrice.toFixed(2)}`);
                } else {
                    // Fallback to any monitor
                    const monitors = await db.collection('addons').find({
                        category: 'Monitor',
                        $or: [
                            { currentPrice: { $gt: 0, $lte: remainingBudget } },
                            { price: { $gt: 0, $lte: remainingBudget } }
                        ]
                    }).sort({ currentPrice: 1, price: 1 }).limit(10).toArray();

                    monitorDebug.candidatesFound = monitors.length;
                    monitorDebug.topCandidates = monitors.slice(0, 5).map(m => ({
                        name: m.name || m.title,
                        price: `$${parseFloat(m.currentPrice || m.price).toFixed(2)}`
                    }));

                    if (monitors.length > 0) {
                        selectedParts.monitor = monitors[0];
                        const monitorPrice = parseFloat(selectedParts.monitor.currentPrice || selectedParts.monitor.price);
                        totalCost += monitorPrice;
                        monitorDebug.selected = {
                            name: monitors[0].name || monitors[0].title,
                            price: `$${monitorPrice.toFixed(2)}`,
                            reason: 'Fallback: MSI QD-OLED not found, selected cheapest available'
                        };
                    } else {
                        monitorDebug.selected = null;
                        monitorDebug.error = 'No monitors found';
                    }
                }
            } else {
                // Standard budget: select single monitor within budget
                const monitors = await db.collection('addons').find({
                    category: 'Monitor',
                    $or: [
                        { currentPrice: { $gt: 0, $lte: remainingBudget } },
                        { price: { $gt: 0, $lte: remainingBudget } }
                    ]
                }).sort({ currentPrice: 1, price: 1 }).limit(10).toArray();

                monitorDebug.candidatesFound = monitors.length;
                monitorDebug.topCandidates = monitors.slice(0, 5).map(m => ({
                    name: m.name || m.title,
                    price: `$${parseFloat(m.currentPrice || m.price).toFixed(2)}`
                }));

                if (monitors.length > 0) {
                    selectedParts.monitor = monitors[0];
                    const monitorPrice = parseFloat(selectedParts.monitor.currentPrice || selectedParts.monitor.price);
                    totalCost += monitorPrice;
                    monitorDebug.selected = {
                        name: monitors[0].name || monitors[0].title,
                        price: `$${monitorPrice.toFixed(2)}`,
                        reason: 'Cheapest monitor within remaining budget'
                    };
                    console.log(`Selected Monitor: ${monitors[0].name || monitors[0].title} - $${monitorPrice.toFixed(2)}`);
                } else {
                    monitorDebug.selected = null;
                    monitorDebug.error = 'No monitors found within remaining budget';
                }
            }

            debugLog.selections.push(monitorDebug);
        }

        // 8. Budget Enforcement - Downgrade components if over budget
        const budgetRetries = [];
        let retryAttempt = 0;
        const maxRetries = 20;

        while (totalCost > maxBudget && retryAttempt < maxRetries) {
            retryAttempt++;
            const overBudgetAmount = totalCost - maxBudget;

            const retryLog = {
                attempt: retryAttempt,
                overBudget: `$${overBudgetAmount.toFixed(2)}`,
                action: '',
                componentDowngraded: '',
                oldPrice: '',
                newPrice: '',
                success: false
            };

            // Priority order for downgrading (least critical first, preserve GPU/CPU performance)
            // IMPORTANT: Cooler is first (can be removed entirely), case/PSU are LAST (mandatory, only downgrade)
            const downgradeOrder = performance === 'multi'
                ? ['cooler', 'storage', 'ram', 'gpu', 'psu', 'case', 'cpu']  // Preserve CPU for multi-threaded
                : ['cooler', 'storage', 'ram', 'cpu', 'psu', 'case', 'gpu']; // Preserve GPU for gaming

            let downgraded = false;

            for (const componentType of downgradeOrder) {
                if (!selectedParts[componentType] || downgraded) continue;

                const currentPrice = parseFloat(selectedParts[componentType].currentPrice || selectedParts[componentType].price);

                // For first few attempts, try to find component that saves most of the overBudgetAmount
                // For later attempts, accept any savings
                const minSavings = retryAttempt <= 5 ? Math.max(overBudgetAmount * 0.5, 5) : 1;
                const maxPrice = currentPrice - minSavings;

                // Find a cheaper alternative - accept any price less than current
                let cheaperComponent = null;

                if (componentType === 'gpu') {
                    // Find cheaper GPU
                    for (const collection of gpuCollections) {
                        const gpus = await db.collection(collection.name).find({
                            currentPrice: { $gt: 0, $lt: maxPrice },
                            isAvailable: { $ne: false }
                        }).sort({ currentPrice: -1 }).limit(10).toArray();
                        const filtered = gpus.filter(gpu => !isDesktopOrLaptop(gpu.title || gpu.name || ''));
                        if (filtered.length > 0) {
                            cheaperComponent = filtered[0];
                            break;
                        }
                    }
                } else if (componentType === 'cpu') {
                    // Find cheaper CPU that's compatible with the motherboard
                    const motherboard = selectedParts.motherboard;
                    const cpuFilter = {
                        currentPrice: { $gt: 0, $lt: maxPrice },
                        isAvailable: { $ne: false }
                    };

                    // Add motherboard compatibility filter if motherboard exists
                    if (motherboard && (motherboard.chipset || motherboard.socket)) {
                        const cpuMatchFilters = [];
                        if (motherboard.chipset) {
                            cpuMatchFilters.push({ chipset: motherboard.chipset });
                        }
                        if (motherboard.socket) {
                            cpuMatchFilters.push({ socket: motherboard.socket });
                        }
                        if (cpuMatchFilters.length > 0) {
                            cpuFilter.$or = cpuMatchFilters;
                        }
                    }

                    // Search all CPU collections for compatible, cheaper CPU
                    for (const collection of cpuCollections) {
                        const cpus = await db.collection(collection.name).find(cpuFilter)
                            .sort({ [performanceMetric]: -1, currentPrice: -1 }).limit(10).toArray();
                        if (cpus.length > 0) {
                            cheaperComponent = cpus[0];
                            break;
                        }
                    }
                    // Also check main cpus collection
                    if (!cheaperComponent) {
                        const mainCpus = await db.collection('cpus').find(cpuFilter)
                            .sort({ [performanceMetric]: -1, currentPrice: -1 }).limit(10).toArray();
                        if (mainCpus.length > 0) {
                            cheaperComponent = mainCpus[0];
                        }
                    }
                } else if (componentType === 'ram') {
                    const rams = await db.collection('rams').find({
                        currentPrice: { $gt: 0, $lt: maxPrice }
                    }).sort({ currentPrice: -1 }).limit(10).toArray();
                    if (rams.length > 0) cheaperComponent = rams[0];
                } else if (componentType === 'storage') {
                    const storages = await db.collection('storage').find({
                        currentPrice: { $gt: 0, $lt: maxPrice },
                        capacity: { $gte: storageGB }
                    }).sort({ currentPrice: -1 }).limit(10).toArray();
                    if (storages.length > 0) cheaperComponent = storages[0];
                } else if (componentType === 'psu') {
                    const psus = await db.collection('psus').find({
                        currentPrice: { $gt: 0, $lt: maxPrice },
                        wattage: { $gte: recommendedWattage }
                    }).sort({ currentPrice: -1 }).limit(10).toArray();
                    if (psus.length > 0) cheaperComponent = psus[0];
                } else if (componentType === 'cooler') {
                    // Cooler is optional ONLY if CPU has stock cooler
                    const cpuHasStockCooler = selectedParts.cpu && selectedParts.cpu.coolerIncluded === true;

                    const coolers = await db.collection('coolers').find({
                        currentPrice: { $gt: 0, $lt: maxPrice }
                    }).sort({ currentPrice: -1 }).limit(10).toArray();

                    if (coolers.length > 0) {
                        cheaperComponent = coolers[0];
                    } else if (cpuHasStockCooler) {
                        // No cheaper cooler found - remove it only if CPU has stock cooler
                        const oldPrice = parseFloat(selectedParts.cooler.currentPrice || selectedParts.cooler.price);
                        delete selectedParts.cooler;
                        totalCost -= oldPrice;

                        retryLog.action = 'Remove';
                        retryLog.componentDowngraded = 'cooler';
                        retryLog.oldPrice = `$${oldPrice.toFixed(2)}`;
                        retryLog.newPrice = '$0.00';
                        retryLog.success = true;
                        retryLog.savedAmount = `$${oldPrice.toFixed(2)}`;
                        retryLog.note = 'CPU includes stock cooler';

                        downgraded = true;
                        console.log(`  ✓ Removed cooler (saved $${oldPrice.toFixed(2)}) - using CPU stock cooler`);
                        break;
                    }
                    // If CPU doesn't have stock cooler, cooler is MANDATORY - skip to next component
                } else if (componentType === 'case') {
                    const cases = await db.collection('cases').find({
                        currentPrice: { $gt: 0, $lt: maxPrice }
                    }).sort({ currentPrice: -1 }).limit(10).toArray();
                    if (cases.length > 0) cheaperComponent = cases[0];
                }

                if (cheaperComponent) {
                    const newPrice = parseFloat(cheaperComponent.currentPrice || cheaperComponent.price);
                    const oldComponent = selectedParts[componentType];
                    const oldPrice = parseFloat(oldComponent.currentPrice || oldComponent.price);

                    // Update the component
                    selectedParts[componentType] = cheaperComponent;
                    totalCost = totalCost - oldPrice + newPrice;

                    retryLog.action = 'Downgrade';
                    retryLog.componentDowngraded = componentType;
                    retryLog.oldPrice = `$${oldPrice.toFixed(2)}`;
                    retryLog.newPrice = `$${newPrice.toFixed(2)}`;
                    retryLog.success = true;
                    retryLog.savedAmount = `$${(oldPrice - newPrice).toFixed(2)}`;

                    downgraded = true;
                    break;
                }
            }

            if (!downgraded) {
                retryLog.action = 'Failed';
                retryLog.reason = 'No cheaper alternatives found for any component';
                budgetRetries.push(retryLog);
                break;
            }

            budgetRetries.push(retryLog);
        }

        if (budgetRetries.length > 0) {
            debugLog.budgetRetries = budgetRetries;
            console.log('\n=== Budget Enforcement Retries ===');
            budgetRetries.forEach(retry => {
                console.log(`\nAttempt ${retry.attempt}:`);
                console.log(`  Over budget by: ${retry.overBudget}`);
                if (retry.success) {
                    if (retry.action === 'Remove') {
                        console.log(`  ✓ Removed ${retry.componentDowngraded} (saved ${retry.savedAmount}) - using CPU stock cooler`);
                    } else {
                        console.log(`  ✓ Downgraded ${retry.componentDowngraded}: ${retry.oldPrice} → ${retry.newPrice} (saved ${retry.savedAmount})`);
                    }
                } else {
                    console.log(`  ✗ ${retry.reason}`);
                }
            });
            console.log('=== End Budget Retries ===\n');
        }

        // Finalize debug log
        debugLog.summary = {
            totalCost: `$${totalCost.toFixed(2)}`,
            budget: maxBudget === 999999 ? 'Unlimited' : `$${maxBudget}`,
            underBudget: totalCost <= maxBudget,
            componentsSelected: Object.keys(selectedParts).length,
            budgetRetries: budgetRetries.length
        };

        // Log what's actually in selectedParts.storage
        console.log('\n=== STORAGE DEBUG ===');
        if (selectedParts.storage) {
            console.log('Storage is:', Array.isArray(selectedParts.storage) ? 'ARRAY' : 'SINGLE OBJECT');
            if (Array.isArray(selectedParts.storage)) {
                console.log(`Storage array length: ${selectedParts.storage.length}`);
                selectedParts.storage.forEach((drive, idx) => {
                    console.log(`  Drive ${idx + 1}: ${drive.name || drive.title} (${drive.type}, ${drive.capacity})`);
                });
            } else {
                console.log(`Single storage: ${selectedParts.storage.name || selectedParts.storage.title} (${selectedParts.storage.type}, ${selectedParts.storage.capacity})`);
            }
        } else {
            console.log('NO STORAGE SELECTED!');
        }
        console.log('=== END STORAGE DEBUG ===\n');

        // Log to console for server-side visibility
        console.log('\n=== AI Build Debug Log ===');
        console.log('Strategy:', debugLog.allocations.strategy);
        console.log('Budget Allocations:', debugLog.allocations.budgetAmounts);
        debugLog.selections.forEach((selection, index) => {
            console.log(`\n[${index + 1}] ${selection.component}:`);
            if (selection.selected) {
                // Handle storage specially since it might have a drives array
                if (selection.component === 'Storage' && selection.selected.drives) {
                    console.log(`  ✓ Selected: ${selection.selected.drives.length} drive(s)`);
                    selection.selected.drives.forEach((drive, idx) => {
                        console.log(`    - Drive ${idx + 1}: ${drive.name} (${drive.capacity})`);
                    });
                    console.log(`  Total: ${selection.selected.totalCapacity}, ${selection.selected.totalCost}`);
                } else {
                    console.log(`  ✓ Selected: ${selection.selected.name || 'Unknown'}`);
                    console.log(`  Price: ${selection.selected.price || 'Unknown'}`);
                }
                console.log(`  Reason: ${selection.selected.reason}`);
            } else {
                console.log(`  ✗ Not selected: ${selection.reason || selection.error}`);
            }
        });
        console.log('\nSummary:', debugLog.summary);
        console.log('=== End Debug Log ===\n');

        // 12. Optional: Add Windows 11 license if there's spare budget
        const remainingBudgetForWindows = maxBudget - totalCost;
        if (remainingBudgetForWindows >= 100) { // Minimum $100 for Windows license
            const windows11Licenses = await db.collection('addons').find({
                $and: [
                    {
                        $or: [
                            { category: 'Software' },
                            { category: 'Operating System' }
                        ]
                    },
                    {
                        $or: [
                            { name: { $regex: 'Windows 11', $options: 'i' } },
                            { title: { $regex: 'Windows 11', $options: 'i' } }
                        ]
                    },
                    {
                        $or: [
                            { currentPrice: { $gt: 0, $lte: remainingBudgetForWindows } },
                            { price: { $gt: 0, $lte: remainingBudgetForWindows } }
                        ]
                    }
                ]
            }).sort({ currentPrice: 1, price: 1 }).limit(10).toArray();

            if (windows11Licenses.length > 0) {
                selectedParts.windows11 = windows11Licenses[0];
                const licensePrice = parseFloat(selectedParts.windows11.currentPrice || selectedParts.windows11.price);
                totalCost += licensePrice;
                console.log(`Added Windows 11 license: ${selectedParts.windows11.name || selectedParts.windows11.title} - $${licensePrice.toFixed(2)}`);
            }
        }

        // CRITICAL VALIDATION: Ensure CPU and motherboard are compatible
        if (selectedParts.cpu && selectedParts.motherboard) {
            const cpu = selectedParts.cpu;
            const mb = selectedParts.motherboard;

            const cpuSocket = (cpu.socket || cpu.chipset || '').toUpperCase();
            const mbSocket = (mb.socket || '').toUpperCase();
            const mbChipset = (mb.chipset || '').toUpperCase();

            // Check if sockets/chipsets are compatible
            // For AMD: CPU chipset (e.g., "AM5") should match motherboard socket (e.g., "AM5")
            // For Intel: CPU socket (e.g., "LGA1700") should match motherboard socket
            const socketsMatch = cpuSocket && (
                mbSocket.includes(cpuSocket) ||
                cpuSocket.includes(mbSocket) ||
                mbChipset.includes(cpuSocket) ||
                cpuSocket.includes(mbChipset)
            );

            if (!socketsMatch) {
                console.error('==========================================');
                console.error('CRITICAL ERROR: CPU and motherboard socket mismatch!');
                console.error(`CPU: ${cpu.name || cpu.title}`);
                console.error(`  - Socket: ${cpu.socket || 'N/A'}`);
                console.error(`  - Chipset: ${cpu.chipset || 'N/A'}`);
                console.error(`Motherboard: ${mb.name || mb.title}`);
                console.error(`  - Socket: ${mb.socket || 'N/A'}`);
                console.error(`  - Chipset: ${mb.chipset || 'N/A'}`);
                console.error('==========================================');

                return res.status(500).json({
                    error: 'Build generation failed: CPU and motherboard are incompatible',
                    details: {
                        cpu: cpu.name || cpu.title,
                        cpuSocket: cpu.socket,
                        cpuChipset: cpu.chipset,
                        motherboard: mb.name || mb.title,
                        motherboardSocket: mb.socket,
                        motherboardChipset: mb.chipset
                    }
                });
            }

            console.log(`✓ Socket validation passed: CPU ${cpuSocket} compatible with MB socket ${mbSocket} / chipset ${mbChipset}`);
        }

        res.json({
            success: true,
            build: selectedParts,
            totalCost: totalCost.toFixed(2),
            budget: maxBudget,
            underBudget: totalCost <= maxBudget,
            wizardData: { budget, performance, storage, includeMonitor },
            debug: debugLog  // Include debug information in response
        });

    } catch (error) {
        console.error('Error generating AI build:', error);
        res.status(500).json({ error: 'Failed to generate build' });
    }
});

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
