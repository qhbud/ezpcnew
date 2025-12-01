const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pcbuilder';

// Validation functions
function isValidProductUrl(url) {
    if (!url) return false;

    try {
        const urlObj = new URL(url);
        // Check if it's an Amazon product URL with ASIN
        return urlObj.hostname.includes('amazon.com') &&
               (url.includes('/dp/') || url.includes('/gp/product/'));
    } catch {
        return false;
    }
}

function isGpuAccessory(productName) {
    if (!productName) return false;

    const nameLower = productName.toLowerCase();

    const accessoryKeywords = [
        'support bracket',
        'gpu bracket',
        'gpu stand',
        'gpu support',
        'anti sag',
        'anti-sag',
        'sag bracket',
        'sag holder',
        'video card brace',
        'graphics card brace',
        'gpu brace',
        'gpu holder',
        'vertical mount',
        'riser cable',
        'gpu cable',
        'display dummy',
        'backplate'
    ];

    for (const keyword of accessoryKeywords) {
        if (nameLower.includes(keyword)) {
            return true;
        }
    }

    return false;
}

function isPortableStorage(productName) {
    if (!productName) return false;

    const nameLower = productName.toLowerCase();

    const portableKeywords = [
        'portable',
        'external',
        'usb-c',
        'usb 3.',
        'thumb drive',
        'flash drive',
        'usb drive',
        'pocket',
        'rugged',
        'extreme portable'
    ];

    for (const keyword of portableKeywords) {
        if (nameLower.includes(keyword)) {
            return true;
        }
    }

    return false;
}

function isComboProduct(productName) {
    if (!productName) return false;

    const nameLower = productName.toLowerCase();

    const comboKeywords = [
        'combo',
        'bundle',
        'kit',
        'with motherboard',
        'with cpu',
        'with gpu',
        'with ram',
        'cpu motherboard',
        'motherboard cpu',
        'processor motherboard',
        'motherboard processor',
        '+ motherboard',
        '+ cpu',
        '+ processor',
        'and motherboard',
        'and cpu',
        'and processor',
        'combo pack',
        'bundle pack',
        'pc build',
        'complete build'
    ];

    for (const keyword of comboKeywords) {
        if (nameLower.includes(keyword)) {
            return true;
        }
    }

    return false;
}

// Map component types to collection names
function getCollectionName(componentType, component) {
    // For GPUs, categorize by model
    if (componentType === 'gpus' && component.gpuModel) {
        const model = component.gpuModel.toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
        return `gpus_${model}`;
    }

    // For CPUs, categorize by manufacturer and series
    if (componentType === 'cpus' && component.model) {
        const cpuModel = component.model.toLowerCase();
        if (cpuModel.includes('i9')) return 'cpus_intel_core_i9';
        if (cpuModel.includes('i7')) return 'cpus_intel_core_i7';
        if (cpuModel.includes('i5')) return 'cpus_intel_core_i5';
        if (cpuModel.includes('i3')) return 'cpus_intel_core_i3';
        if (cpuModel.includes('ryzen 9')) return 'cpus_amd_ryzen_9';
        if (cpuModel.includes('ryzen 7')) return 'cpus_amd_ryzen_7';
        if (cpuModel.includes('ryzen 5')) return 'cpus_amd_ryzen_5';
        if (cpuModel.includes('threadripper')) return 'cpus_amd_threadripper';
        return 'cpus';
    }

    const collectionMap = {
        'gpus': 'gpus',
        'cpus': 'cpus',
        'motherboards': 'motherboards',
        'rams': 'rams',
        'psus': 'psus',
        'cases': 'cases',
        'coolers': 'coolers',
        'storages': 'storages'
    };
    return collectionMap[componentType] || componentType;
}

async function importComponents(jsonFilePath) {
    const client = new MongoClient(uri);

    try {
        // Read JSON file
        console.log(`📂 Reading file: ${jsonFilePath}\n`);
        const fileContent = fs.readFileSync(jsonFilePath, 'utf8');
        const data = JSON.parse(fileContent);

        if (!data.components) {
            console.error('❌ Invalid JSON format. Expected "components" field.');
            return;
        }

        // Connect to MongoDB
        await client.connect();
        console.log('✅ Connected to MongoDB\n');
        const db = client.db('pcbuilder');

        const results = {
            added: 0,
            rejected: 0,
            failed: 0,
            details: {
                invalidUrl: 0,
                gpuAccessory: 0,
                portableStorage: 0,
                comboProduct: 0,
                missingData: 0
            }
        };

        // Process each component type
        for (const [componentType, components] of Object.entries(data.components)) {
            if (!Array.isArray(components) || components.length === 0) {
                continue;
            }

            console.log(`\n${'='.repeat(60)}`);
            console.log(`📦 Processing ${componentType.toUpperCase()} (${components.length} items)`);
            console.log(`${'='.repeat(60)}\n`);

            // Note: collection name will be determined per component below

            for (const component of components) {
                const componentName = component.name || 'Unknown';
                console.log(`   Processing: ${componentName.substring(0, 60)}...`);

                // Get the appropriate collection name for this component
                const collectionName = getCollectionName(componentType, component);
                const collection = db.collection(collectionName);
                console.log(`      Collection: ${collectionName}`);

                // Validate URL
                if (!isValidProductUrl(component.sourceUrl)) {
                    console.log(`      ❌ REJECTED: Invalid or missing Amazon URL`);
                    results.rejected++;
                    results.details.invalidUrl++;
                    continue;
                }

                // Check for combo products
                if (isComboProduct(component.name)) {
                    console.log(`      ❌ REJECTED: Combo product`);
                    results.rejected++;
                    results.details.comboProduct++;
                    continue;
                }

                // Check for GPU accessories
                if (componentType === 'gpus' && isGpuAccessory(component.name)) {
                    console.log(`      ❌ REJECTED: GPU accessory, not actual GPU`);
                    results.rejected++;
                    results.details.gpuAccessory++;
                    continue;
                }

                // Check for portable storage
                if (componentType === 'storages' && isPortableStorage(component.name)) {
                    console.log(`      ❌ REJECTED: Portable/external storage`);
                    results.rejected++;
                    results.details.portableStorage++;
                    continue;
                }

                // Validate required fields
                if (!component.name || !component.basePrice) {
                    console.log(`      ❌ REJECTED: Missing required fields (name or price)`);
                    results.rejected++;
                    results.details.missingData++;
                    continue;
                }

                // Check if component already exists
                const existing = await collection.findOne({
                    $or: [
                        { name: component.name },
                        { sourceUrl: component.sourceUrl }
                    ]
                });

                if (existing) {
                    console.log(`      ⏭️  SKIPPED: Already exists in database`);
                    continue;
                }

                // Add component to database
                try {
                    // Remove helper fields before inserting
                    const cleanComponent = { ...component };
                    delete cleanComponent._socketOptions;
                    delete cleanComponent._typeOptions;
                    delete cleanComponent._interfaceOptions;

                    await collection.insertOne(cleanComponent);
                    console.log(`      ✅ ADDED to database`);
                    results.added++;
                } catch (error) {
                    console.log(`      ⚠️  FAILED: ${error.message}`);
                    results.failed++;
                }
            }
        }

        // Print summary
        console.log(`\n\n${'='.repeat(60)}`);
        console.log(`📊 IMPORT SUMMARY`);
        console.log(`${'='.repeat(60)}`);
        console.log(`✅ Successfully added:     ${results.added}`);
        console.log(`❌ Rejected:               ${results.rejected}`);
        console.log(`⚠️  Failed to add:         ${results.failed}`);
        console.log(`\n📋 Rejection Breakdown:`);
        console.log(`   Invalid URL:            ${results.details.invalidUrl}`);
        console.log(`   GPU Accessory:          ${results.details.gpuAccessory}`);
        console.log(`   Portable Storage:       ${results.details.portableStorage}`);
        console.log(`   Combo Product:          ${results.details.comboProduct}`);
        console.log(`   Missing Data:           ${results.details.missingData}`);
        console.log(`${'='.repeat(60)}\n`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await client.close();
        console.log('Disconnected from MongoDB');
    }
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
    console.log('Usage: node importComponents.js <json-file-path>');
    console.log('\nExample:');
    console.log('  node importComponents.js new-components-2025-11-28T07-58-27-332Z.json');
    console.log('  node importComponents.js C:\\Users\\Quinn\\Desktop\\pcbuilder2\\new-components-2025-11-28T07-58-27-332Z.json');
    process.exit(1);
}

const jsonFilePath = path.resolve(args[0]);

if (!fs.existsSync(jsonFilePath)) {
    console.error(`❌ File not found: ${jsonFilePath}`);
    process.exit(1);
}

importComponents(jsonFilePath);
