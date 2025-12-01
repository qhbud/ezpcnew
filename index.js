const { connectToDatabase, getDatabase } = require('./config/database');

// Basic database operations
class PCBuilderDB {
  constructor() {
    this.db = null;
  }

  async connect() {
    try {
      await connectToDatabase();
      this.db = getDatabase();
      console.log('Connected to PC Builder Database');
    } catch (error) {
      console.error('Failed to connect to database:', error);
      throw error;
    }
  }

  // CPU operations
  async getCPUs(filter = {}) {
    return await this.db.collection('cpus').find(filter).toArray();
  }

  async getCPUById(id) {
    return await this.db.collection('cpus').findOne({ _id: id });
  }

  async searchCPUs(query) {
    return await this.db.collection('cpus').find({
      $text: { $search: query }
    }).toArray();
  }

  // Motherboard operations
  async getMotherboards(filter = {}) {
    return await this.db.collection('motherboards').find(filter).toArray();
  }

  async getMotherboardById(id) {
    return await this.db.collection('motherboards').findOne({ _id: id });
  }

  async getCompatibleMotherboards(cpuSocket) {
    return await this.db.collection('motherboards').find({
      socket: cpuSocket
    }).toArray();
  }

  // GPU operations
  async getGPUs(filter = {}) {
    return await this.db.collection('gpus').find(filter).toArray();
  }

  async getGPUById(id) {
    return await this.db.collection('gpus').findOne({ _id: id });
  }

  // RAM operations
  async getRAMs(filter = {}) {
    return await this.db.collection('rams').find(filter).toArray();
  }

  async getRAMById(id) {
    return await this.db.collection('rams').findOne({ _id: id });
  }

  async getCompatibleRAM(motherboardMemoryType) {
    return await this.db.collection('rams').find({
      memoryType: motherboardMemoryType
    }).toArray();
  }

  // Storage operations
  async getStorages(filter = {}) {
    return await this.db.collection('storages').find(filter).toArray();
  }

  async getStorageById(id) {
    return await this.db.collection('storages').findOne({ _id: id });
  }

  // PSU operations
  async getPSUs(filter = {}) {
    return await this.db.collection('psus').find(filter).toArray();
  }

  async getPSUById(id) {
    return await this.db.collection('psus').findOne({ _id: id });
  }

  async getRecommendedPSU(totalPower) {
    return await this.db.collection('psus').find({
      wattage: { $gte: totalPower * 1.2 } // 20% headroom
    }).sort({ wattage: 1 }).limit(5).toArray();
  }

  // Case operations
  async getCases(filter = {}) {
    return await this.db.collection('cases').find(filter).toArray();
  }

  async getCaseById(id) {
    return await this.db.collection('cases').findOne({ _id: id });
  }

  async getCompatibleCases(motherboardFormFactor) {
    return await this.db.collection('cases').find({
      motherboardSupport: motherboardFormFactor
    }).toArray();
  }

  // Cooler operations
  async getCoolers(filter = {}) {
    return await this.db.collection('coolers').find(filter).toArray();
  }

  async getCoolerById(id) {
    return await this.db.collection('coolers').findOne({ _id: id });
  }

  async getCompatibleCoolers(cpuSocket) {
    return await this.db.collection('coolers').find({
      socket: cpuSocket
    }).toArray();
  }

  // Compatibility checking
  async checkCompatibility(parts) {
    const issues = [];
    
    if (parts.cpu && parts.motherboard) {
      const cpu = await this.getCPUById(parts.cpu);
      const motherboard = await this.getMotherboardById(parts.motherboard);
      
      if (cpu.socket !== motherboard.socket) {
        issues.push(`CPU socket ${cpu.socket} is not compatible with motherboard socket ${motherboard.socket}`);
      }
    }

    if (parts.motherboard && parts.ram) {
      const motherboard = await this.getMotherboardById(parts.motherboard);
      const ram = await this.getRAMById(parts.ram);
      
      if (!motherboard.memoryType.includes(ram.memoryType)) {
        issues.push(`RAM type ${ram.memoryType} is not supported by motherboard`);
      }
    }

    if (parts.gpu && parts.psu) {
      const gpu = await this.getGPUById(parts.gpu);
      const psu = await this.getPSUById(parts.psu);
      
      if (psu.wattage < gpu.power.recommendedPsu) {
        issues.push(`PSU wattage ${psu.wattage}W is insufficient for GPU (recommended: ${gpu.power.recommendedPsu}W)`);
      }
    }

    return {
      compatible: issues.length === 0,
      issues: issues
    };
  }

  // Build recommendations
  async getBuildRecommendations(budget, useCase = 'gaming') {
    const recommendations = {
      budget: budget,
      useCase: useCase,
      parts: {},
      totalCost: 0,
      compatibility: { compatible: true, issues: [] }
    };

    try {
      // Get parts within budget
      const cpus = await this.getCPUs({ price: { $lte: budget * 0.3 } });
      const motherboards = await this.getMotherboards({ price: { $lte: budget * 0.2 } });
      const gpus = await this.getGPUs({ price: { $lte: budget * 0.4 } });
      const rams = await this.getRAMs({ price: { $lte: budget * 0.1 } });
      const storages = await this.getStorages({ price: { $lte: budget * 0.1 } });
      const psus = await this.getPSUs({ price: { $lte: budget * 0.1 } });
      const cases = await this.getCases({ price: { $lte: budget * 0.05 } });
      const coolers = await this.getCoolers({ price: { $lte: budget * 0.05 } });

      // Select best parts based on use case
      if (useCase === 'gaming') {
        recommendations.parts.cpu = cpus.sort((a, b) => b.performanceScore - a.performanceScore)[0];
        recommendations.parts.gpu = gpus.sort((a, b) => b.performanceScore - a.performanceScore)[0];
      } else if (useCase === 'workstation') {
        recommendations.parts.cpu = cpus.sort((a, b) => b.cores - a.cores)[0];
        recommendations.parts.gpu = gpus.sort((a, b) => b.performanceScore - a.performanceScore)[0];
      }

      // Select compatible parts
      if (recommendations.parts.cpu) {
        const compatibleMotherboards = motherboards.filter(mb => mb.socket === recommendations.parts.cpu.socket);
        recommendations.parts.motherboard = compatibleMotherboards.sort((a, b) => b.price - a.price)[0];
      }

      if (recommendations.parts.motherboard) {
        const compatibleRAMs = rams.filter(ram => 
          recommendations.parts.motherboard.memoryType.includes(ram.memoryType)
        );
        recommendations.parts.ram = compatibleRAMs.sort((a, b) => b.speed - a.speed)[0];
      }

      // Calculate total cost
      Object.values(recommendations.parts).forEach(part => {
        if (part && part.price) {
          recommendations.totalCost += part.price;
        }
      });

      // Check compatibility
      recommendations.compatibility = await this.checkCompatibility(recommendations.parts);

    } catch (error) {
      console.error('Error generating recommendations:', error);
    }

    return recommendations;
  }
}

// Example usage
async function main() {
  try {
    const db = new PCBuilderDB();
    await db.connect();

    console.log('\n🚀 PC Builder Database is running!');
    console.log('\nAvailable operations:');
    console.log('- getCPUs() - Get all CPUs');
    console.log('- getMotherboards() - Get all motherboards');
    console.log('- getGPUs() - Get all GPUs');
    console.log('- getRAMs() - Get all RAM modules');
    console.log('- getStorages() - Get all storage devices');
    console.log('- getPSUs() - Get all power supplies');
    console.log('- getCases() - Get all cases');
    console.log('- getCoolers() - Get all coolers');
    console.log('- checkCompatibility(parts) - Check part compatibility');
    console.log('- getBuildRecommendations(budget, useCase) - Get build recommendations');

    // Example: Get all CPUs
    const cpus = await db.getCPUs();
    console.log(`\n📊 Database contains ${cpus.length} CPUs`);

    // Example: Get build recommendations
    const recommendations = await db.getBuildRecommendations(2000, 'gaming');
    console.log('\n💡 Sample build recommendation for $2000 gaming PC:');
    console.log(`Total cost: $${recommendations.totalCost.toFixed(2)}`);
    console.log(`Compatible: ${recommendations.compatibility.compatible ? 'Yes' : 'No'}`);

  } catch (error) {
    console.error('Application failed to start:', error);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { PCBuilderDB };
