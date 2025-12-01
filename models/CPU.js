const { ObjectId } = require('mongodb');

const cpuSchema = {
  _id: ObjectId,
  name: String,
  manufacturer: String, // Intel, AMD
  socket: String, // LGA1700, AM4, AM5, etc.
  cores: Number,
  threads: Number,
  baseClock: Number, // GHz
  boostClock: Number, // GHz
  tdp: Number, // Watts
  integratedGraphics: Boolean,
  igpuModel: String, // Intel UHD, AMD Radeon, etc.
  memoryType: [String], // DDR4, DDR5
  maxMemorySpeed: Number, // MHz
  pcieVersion: String, // PCIe 4.0, PCIe 5.0
  pcieLanes: Number,
  cache: {
    l1: Number, // KB
    l2: Number, // KB
    l3: Number // MB
  },
  price: Number,
  releaseDate: Date,
  performanceScore: Number, // Synthetic benchmark score
  powerEfficiency: Number, // Performance per watt
  overclocking: Boolean,
  stockCooler: Boolean,
  imageUrl: String,
  specifications: {
    lithography: String, // nm
    architecture: String, // Zen 4, Raptor Lake, etc.
    instructionSet: [String], // x86-64, AVX2, etc.
    virtualization: Boolean
  },
  compatibility: {
    motherboards: [String], // Compatible chipset names
    coolers: [String], // Compatible cooler types
    memory: [String] // Compatible memory types
  },
  createdAt: Date,
  updatedAt: Date
};

module.exports = cpuSchema;
