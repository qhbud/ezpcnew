const { ObjectId } = require('mongodb');

const ramSchema = {
  _id: ObjectId,
  name: String,
  manufacturer: String, // Corsair, G.Skill, Crucial, etc.
  brand: String, // Vengeance, Trident Z, Ballistix, etc.
  capacity: Number, // GB per stick
  kitSize: Number, // Number of sticks in kit
  totalCapacity: Number, // Total GB in kit
  memoryType: String, // DDR4, DDR5
  speed: Number, // MHz
  casLatency: Number, // CL
  timing: String, // e.g., "18-22-22-42"
  voltage: Number, // V
  formFactor: String, // DIMM, SODIMM
  ecc: Boolean, // Error-correcting code
  registered: Boolean, // Registered/buffered memory
  xmp: Boolean, // Intel XMP profile
  expo: Boolean, // AMD EXPO profile
  rgb: Boolean,
  heatSpreader: Boolean,
  price: Number,
  releaseDate: Date,
  performanceScore: Number, // Synthetic benchmark score
  imageUrl: String,
  specifications: {
    dieType: String, // Single rank, Dual rank
    pcbLayers: Number,
    icManufacturer: String, // Samsung, Micron, Hynix, etc.
    icModel: String // Specific IC model
  },
  compatibility: {
    motherboards: [String], // Compatible chipset names
    cpus: [String], // Compatible CPU series
    cases: [String] // Compatible case sizes
  },
  overclocking: {
    supported: Boolean,
    maxSpeed: Number, // MHz
    maxVoltage: Number // V
  },
  warranty: Number, // Years
  createdAt: Date,
  updatedAt: Date
};

module.exports = ramSchema;
