const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pcbuilder');
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const listMotherboards = async () => {
  try {
    await connectDB();

    const db = mongoose.connection.db;
    const motherboards = await db.collection('motherboards').find({}).toArray();

    if (motherboards.length === 0) {
      console.log('\n❌ No motherboards found in the database.\n');
    } else {
      console.log(`\n✅ Found ${motherboards.length} motherboards:\n`);
      console.log('='.repeat(80));

      motherboards.forEach((mb, index) => {
        console.log(`\n${index + 1}. ${mb.name || 'Unknown Name'}`);
        console.log(`   Manufacturer: ${mb.manufacturer || 'N/A'}`);
        console.log(`   Chipset: ${mb.chipset || 'N/A'}`);
        console.log(`   Socket: ${mb.socket || 'N/A'}`);
        console.log(`   Form Factor: ${mb.formFactor || 'N/A'}`);
        console.log(`   Memory Type: ${mb.memoryType ? mb.memoryType.join(', ') : 'N/A'}`);
        console.log(`   Price: ${mb.price ? `$${mb.price}` : 'N/A'}`);
        console.log('-'.repeat(80));
      });

      console.log(`\nTotal: ${motherboards.length} motherboards\n`);
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error listing motherboards:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

listMotherboards();
