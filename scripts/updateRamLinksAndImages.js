require('dotenv').config();
const { MongoClient } = require('mongodb');

// Map RAM modules to their Amazon ASINs and image URLs
const ramUpdates = [
    {
        name: "Corsair Vengeance DDR5 64GB (2x32GB) 6000MHz CL30",
        asin: "B0BQRPL3QY",
        imageUrl: "https://m.media-amazon.com/images/I/41VY+xR8VkL._AC_SY300_SX300_.jpg"
    },
    {
        name: "G.SKILL Trident Z5 RGB DDR5 32GB (2x16GB) 6400MHz CL32",
        asin: "B0BQKGBXZM",
        imageUrl: "https://m.media-amazon.com/images/I/41w3fkE6Y+L._AC_SY300_SX300_.jpg"
    },
    {
        name: "Kingston FURY Beast DDR5 32GB (2x16GB) 6000MHz CL36",
        asin: "B0B7XVQXR7",
        imageUrl: "https://m.media-amazon.com/images/I/41sRLMvqiLL._AC_SY300_SX300_.jpg"
    },
    {
        name: "Corsair Dominator Platinum RGB DDR5 32GB (2x16GB) 6600MHz CL32",
        asin: "B0BLYHX69K",
        imageUrl: "https://m.media-amazon.com/images/I/41J6KZqBN6L._AC_SY300_SX300_.jpg"
    },
    {
        name: "TeamGroup T-Force Delta RGB DDR5 32GB (2x16GB) 6000MHz CL38",
        asin: "B0BG3WZ2QJ",
        imageUrl: "https://m.media-amazon.com/images/I/41VVnwTdayL._AC_SY300_SX300_.jpg"
    },
    {
        name: "Corsair Vengeance DDR5 32GB (2x16GB) 5600MHz CL36",
        asin: "B0BGJQRVZ3",
        imageUrl: "https://m.media-amazon.com/images/I/41VY+xR8VkL._AC_SY300_SX300_.jpg"
    },
    {
        name: "Kingston FURY Beast DDR5 16GB (2x8GB) 5200MHz CL40",
        asin: "B09RNDJ5NQ",
        imageUrl: "https://m.media-amazon.com/images/I/41sRLMvqiLL._AC_SY300_SX300_.jpg"
    },
    {
        name: "Crucial DDR5 32GB (2x16GB) 5600MHz CL46",
        asin: "B0BHGMQN5T",
        imageUrl: "https://m.media-amazon.com/images/I/41q9yKVwPbL._AC_SY300_SX300_.jpg"
    },
    {
        name: "G.SKILL Trident Z Royal RGB DDR4 32GB (2x16GB) 3600MHz CL16",
        asin: "B07VSKGKWM",
        imageUrl: "https://m.media-amazon.com/images/I/41EtVOt5KVL._AC_SY300_SX300_.jpg"
    },
    {
        name: "Corsair Vengeance RGB Pro DDR4 32GB (2x16GB) 3600MHz CL18",
        asin: "B0829T8NWC",
        imageUrl: "https://m.media-amazon.com/images/I/41OE3fd-8LL._AC_SY300_SX300_.jpg"
    },
    {
        name: "Kingston FURY Renegade RGB DDR4 32GB (2x16GB) 4000MHz CL19",
        asin: "B09T3BRT4C",
        imageUrl: "https://m.media-amazon.com/images/I/41eqKDyNbTL._AC_SY300_SX300_.jpg"
    },
    {
        name: "TeamGroup T-Force Vulcan Z DDR4 32GB (2x16GB) 3600MHz CL18",
        asin: "B0BSKZ3JKG",
        imageUrl: "https://m.media-amazon.com/images/I/41KOVZvxZpL._AC_SY300_SX300_.jpg"
    },
    {
        name: "Corsair Vengeance LPX DDR4 32GB (2x16GB) 3200MHz CL16",
        asin: "B0143UM4TC",
        imageUrl: "https://m.media-amazon.com/images/I/41mEn7EXGXL._AC_SY300_SX300_.jpg"
    },
    {
        name: "G.SKILL Ripjaws V DDR4 32GB (2x16GB) 3200MHz CL16",
        asin: "B0171GQR0C",
        imageUrl: "https://m.media-amazon.com/images/I/41D6LCNjXLL._AC_SY300_SX300_.jpg"
    },
    {
        name: "Kingston FURY Beast DDR4 16GB (2x8GB) 3200MHz CL16",
        asin: "B097K2GKG7",
        imageUrl: "https://m.media-amazon.com/images/I/41sRLMvqiLL._AC_SY300_SX300_.jpg"
    },
    {
        name: "Crucial DDR4 16GB (2x8GB) 3200MHz CL22",
        asin: "B07MNJP6RW",
        imageUrl: "https://m.media-amazon.com/images/I/41q9yKVwPbL._AC_SY300_SX300_.jpg"
    },
    {
        name: "Corsair Vengeance LPX DDR4 16GB (2x8GB) 3000MHz CL16",
        asin: "B0134EW7G8",
        imageUrl: "https://m.media-amazon.com/images/I/41mEn7EXGXL._AC_SY300_SX300_.jpg"
    },
    {
        name: "Corsair Vengeance DDR5 96GB (2x48GB) 5600MHz CL40",
        asin: "B0BQRJX4QB",
        imageUrl: "https://m.media-amazon.com/images/I/41VY+xR8VkL._AC_SY300_SX300_.jpg"
    },
    {
        name: "G.SKILL Trident Z5 DDR5 64GB (2x32GB) 6000MHz CL36",
        asin: "B0BQKTG9MH",
        imageUrl: "https://m.media-amazon.com/images/I/41w3fkE6Y+L._AC_SY300_SX300_.jpg"
    },
    {
        name: "Kingston FURY Beast DDR4 64GB (2x32GB) 3200MHz CL16",
        asin: "B097L1C969",
        imageUrl: "https://m.media-amazon.com/images/I/41sRLMvqiLL._AC_SY300_SX300_.jpg"
    }
];

async function updateRamLinksAndImages() {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB\n');

        const db = client.db(process.env.DB_NAME || 'pcbuilder');
        const ramCollection = db.collection('rams');

        let updatedCount = 0;
        let notFoundCount = 0;

        for (const update of ramUpdates) {
            const ram = await ramCollection.findOne({ name: update.name });

            if (!ram) {
                console.log(`⚠️  Not found: ${update.name}`);
                notFoundCount++;
                continue;
            }

            const sourceUrl = `https://www.amazon.com/dp/${update.asin}?tag=qhezpc-20`;
            const productUrl = `https://www.amazon.com/dp/${update.asin}`;

            await ramCollection.updateOne(
                { _id: ram._id },
                {
                    $set: {
                        asin: update.asin,
                        imageUrl: update.imageUrl,
                        sourceUrl: sourceUrl,
                        productUrl: productUrl,
                        source: 'Amazon'
                    }
                }
            );

            console.log(`✅ Updated: ${update.name}`);
            updatedCount++;
        }

        console.log(`\n📊 SUMMARY:`);
        console.log(`   ✅ Updated: ${updatedCount} RAM modules`);
        console.log(`   ⚠️  Not found: ${notFoundCount}`);

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await client.close();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

updateRamLinksAndImages()
    .then(() => {
        console.log('\n✨ RAM links and images updated successfully');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Operation failed:', error);
        process.exit(1);
    });
