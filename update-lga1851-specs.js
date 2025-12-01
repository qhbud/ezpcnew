require('dotenv').config();
const mongoose = require('mongoose');

const motherboardSchema = new mongoose.Schema({}, { strict: false, collection: 'motherboards' });
const Motherboard = mongoose.model('Motherboard', motherboardSchema);

const updates = [
    {
        url: 'https://www.amazon.com/dp/B0DGWWRTPV?tag=qhezpc-20',
        specs: {
            memorySlots: 4,
            pcieSlotCount: 2,
            m2SlotCount: 6,
            powerStages: '22+2+1+2',
            networking: {
                wifi: 'WiFi 7',
                ethernet: '2.5Gb LAN'
            }
        }
    },
    {
        url: 'https://www.amazon.com/dp/B0DGWDRMVW?tag=qhezpc-20',
        specs: {
            memorySlots: 4,
            pcieSlotCount: 2,
            m2SlotCount: 6,
            powerStages: '22+2+1+2',
            networking: {
                wifi: 'WiFi 7',
                ethernet: '5G LAN'
            }
        }
    },
    {
        url: 'https://www.amazon.com/dp/B0DGWKQCKH?tag=qhezpc-20',
        specs: {
            memorySlots: 4,
            pcieSlotCount: 2,
            m2SlotCount: 6,
            powerStages: '24+2+1+2',
            networking: {
                wifi: 'WiFi 7',
                ethernet: '2.5G/10G LAN'
            },
            specialFeatures: ['5" LCD Screen', 'Thunderbolt 5']
        }
    },
    {
        url: 'https://www.amazon.com/dp/B0DZF28PL4?tag=qhezpc-20',
        specs: {
            memorySlots: 4,
            pcieSlotCount: 2,
            m2SlotCount: 5,
            powerStages: '20+1+1',
            networking: {
                wifi: 'WiFi 7',
                ethernet: '5GbE LAN'
            },
            specialFeatures: ['Full-Metal Cover']
        }
    },
    {
        url: 'https://www.amazon.com/dp/B0DGWHZKMC?tag=qhezpc-20',
        specs: {
            memorySlots: 4,
            pcieSlotCount: 2,
            m2SlotCount: 5,
            powerStages: '16+2+1+2',
            networking: {
                wifi: 'WiFi 7',
                ethernet: '2.5G LAN'
            },
            specialFeatures: ['AI Overclocking']
        }
    },
    {
        url: 'https://www.amazon.com/dp/B0DGWNVCHL?tag=qhezpc-20',
        specs: {
            memorySlots: 4,
            pcieSlotCount: 2,
            m2SlotCount: 4,
            powerStages: '16+1+2+1',
            networking: {
                wifi: 'WiFi 7',
                ethernet: '2.5Gb LAN'
            }
        }
    },
    {
        url: 'https://www.amazon.com/dp/B0DJRNZWGN?tag=qhezpc-20',
        specs: {
            memorySlots: 4,
            pcieSlotCount: 2,
            m2SlotCount: 7,
            maxMemory: 256,
            memorySpeed: 'DDR5-9600',
            networking: {
                wifi: 'WiFi 7',
                ethernet: '2.5G LAN'
            },
            specialFeatures: ['Thunderbolt']
        }
    },
    {
        url: 'https://www.amazon.com/dp/B0DGWRK1PN?tag=qhezpc-20',
        specs: {
            memorySlots: 4,
            pcieSlotCount: 2,
            m2SlotCount: 7,
            powerStages: '18+2+1+2',
            networking: {
                wifi: 'WiFi 7',
                ethernet: '2.5G LAN'
            },
            specialFeatures: ['AI Cooling', 'AI Networking']
        }
    },
    {
        url: 'https://www.amazon.com/dp/B0CRDMX2SV?tag=qhezpc-20',
        specs: {
            memorySlots: 4,
            pcieSlotCount: 4,
            m2SlotCount: 3,
            powerStages: '10+1+2+1 80A',
            networking: {
                wifi: 'WiFi 7',
                ethernet: '2.5Gb LAN'
            }
        }
    },
    {
        url: 'https://www.amazon.com/dp/B0DJPTBCD6?tag=qhezpc-20',
        specs: {
            memorySlots: 4,
            pcieSlotCount: 1,
            m2SlotCount: 4,
            maxMemory: 256,
            memorySpeed: 'DDR5-9066',
            networking: {
                wifi: 'WiFi 6E',
                ethernet: '2.5G LAN'
            }
        }
    }
];

async function updateMotherboardSpecs() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        console.log('═══════════════════════════════════════════════════════════════════════════');
        console.log('UPDATING LGA1851 MOTHERBOARD SPECIFICATIONS');
        console.log('═══════════════════════════════════════════════════════════════════════════\n');

        let successCount = 0;
        let notFoundCount = 0;

        for (const update of updates) {
            const motherboard = await Motherboard.findOne({ sourceUrl: update.url });

            if (motherboard) {
                // Build update object
                const updateFields = {
                    memorySlots: update.specs.memorySlots,
                    pcieSlotCount: update.specs.pcieSlotCount,
                    m2SlotCount: update.specs.m2SlotCount,
                    updatedAt: new Date()
                };

                if (update.specs.powerStages) {
                    updateFields['specifications.powerStages'] = update.specs.powerStages;
                }

                if (update.specs.maxMemory) {
                    updateFields.maxMemory = update.specs.maxMemory;
                }

                if (update.specs.memorySpeed) {
                    updateFields.memorySpeed = update.specs.memorySpeed;
                }

                if (update.specs.networking) {
                    updateFields.networking = update.specs.networking;
                }

                if (update.specs.specialFeatures) {
                    updateFields['specifications.specialFeatures'] = update.specs.specialFeatures;
                }

                // Use updateOne to ensure fields are saved
                await Motherboard.updateOne(
                    { sourceUrl: update.url },
                    { $set: updateFields }
                );

                console.log(`✅ Updated: ${motherboard.name}`);
                console.log(`   RAM Slots: ${update.specs.memorySlots}`);
                console.log(`   PCIe Slots: ${update.specs.pcieSlotCount}`);
                console.log(`   M.2 Slots: ${update.specs.m2SlotCount}`);
                if (update.specs.powerStages) {
                    console.log(`   Power Stages: ${update.specs.powerStages}`);
                }
                if (update.specs.networking) {
                    console.log(`   WiFi: ${update.specs.networking.wifi}`);
                    console.log(`   Ethernet: ${update.specs.networking.ethernet}`);
                }
                console.log('');

                successCount++;
            } else {
                console.log(`❌ Not found: ${update.url}`);
                notFoundCount++;
            }
        }

        console.log('═══════════════════════════════════════════════════════════════════════════');
        console.log('SUMMARY');
        console.log('═══════════════════════════════════════════════════════════════════════════');
        console.log(`✅ Successfully updated: ${successCount}`);
        console.log(`❌ Not found: ${notFoundCount}`);
        console.log('');

        // Show sample of updated motherboard
        console.log('═══════════════════════════════════════════════════════════════════════════');
        console.log('SAMPLE UPDATED MOTHERBOARD');
        console.log('═══════════════════════════════════════════════════════════════════════════\n');

        const sample = await Motherboard.findOne({ sourceUrl: updates[0].url }).lean();
        if (sample) {
            console.log(`Name: ${sample.name}`);
            console.log(`Socket: ${sample.socket}`);
            console.log(`Chipset: ${sample.chipset}`);
            console.log(`Form Factor: ${sample.formFactor}`);
            console.log(`Memory Type: ${sample.memoryType}`);
            console.log(`Memory Slots: ${sample.memorySlots}`);
            console.log(`PCIe Slots: ${sample.pcieSlotCount}`);
            console.log(`M.2 Slots: ${sample.m2SlotCount}`);
            console.log(`Price: $${sample.price}`);
            if (sample.specifications?.powerStages) {
                console.log(`Power Stages: ${sample.specifications.powerStages}`);
            }
            if (sample.networking) {
                console.log(`WiFi: ${sample.networking.wifi}`);
                console.log(`Ethernet: ${sample.networking.ethernet}`);
            }
        }
        console.log('');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        await mongoose.connection.close();
        console.log('✅ Database connection closed');
    }
}

updateMotherboardSpecs();
