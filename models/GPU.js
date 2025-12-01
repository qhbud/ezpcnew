const { ObjectId } = require('mongodb');

const gpuSchema = {
  _id: ObjectId,
  name: String,
  manufacturer: String, // NVIDIA, AMD, Intel
  partner: String, // ASUS, MSI, Gigabyte, EVGA, etc.
  chipset: String, // RTX 4090, RX 7900 XTX, etc.
  architecture: String, // Ada Lovelace, RDNA 3, etc.
  memory: {
    size: Number, // GB
    type: String, // GDDR6X, GDDR6, HBM2e, etc.
    speed: Number, // Gbps
    busWidth: Number, // bits
    bandwidth: Number // GB/s
  },
  core: {
    baseClock: Number, // MHz
    boostClock: Number, // MHz
    shaders: Number, // CUDA cores, Stream processors, etc.
    rtCores: Number, // Ray tracing cores
    tensorCores: Number, // AI acceleration cores
    computeUnits: Number // For AMD GPUs
  },
  power: {
    tdp: Number, // Watts
    recommendedPsu: Number, // Watts
    powerConnectors: [String] // 8-pin, 12-pin, etc.
  },
  dimensions: {
    length: Number, // mm
    width: Number, // mm
    height: Number, // mm
    slots: Number // PCIe slots occupied
  },
  cooling: {
    type: String, // Air, Liquid, Hybrid
    fans: Number,
    fanSize: [Number], // mm
    rgb: Boolean
  },
  outputs: [{
    type: String, // HDMI, DisplayPort, DVI, VGA
    version: String, // HDMI 2.1, DP 2.1, etc.
    count: Number
  }],
  features: [String], // Ray tracing, DLSS, FSR, etc.
  price: Number,
  releaseDate: Date,
  performanceScore: Number, // Synthetic benchmark score
  imageUrl: String,
  specifications: {
    lithography: String, // nm
    transistors: Number, // Billions
    dieSize: Number, // mm²
    pcieVersion: String, // PCIe 4.0, PCIe 5.0
    encoding: [String], // H.264, H.265, AV1
    decoding: [String] // H.264, H.265, AV1
  },
  compatibility: {
    motherboards: [String], // Compatible PCIe versions
    psus: [String], // Compatible PSU wattages
    cases: [String] // Compatible case sizes
  },
  createdAt: Date,
  updatedAt: Date
};

module.exports = gpuSchema;
