const { ObjectId } = require('mongodb');

const storageSchema = {
  _id: ObjectId,
  name: String,
  manufacturer: String, // Samsung, Western Digital, Seagate, etc.
  brand: String, // 970 EVO, SN850X, FireCuda, etc.
  type: String, // "HDD", "M.2 SSD", "Other SSD"
  formFactor: String, // 2.5", 3.5", M.2, U.2
  capacity: Number, // GB
  interface: String, // SATA III, PCIe 4.0, PCIe 5.0
  controller: String, // Controller chip model
  nandType: String, // TLC, QLC, MLC, SLC (for SSDs)
  readSpeed: Number, // MB/s
  writeSpeed: Number, // MB/s
  randomRead: Number, // IOPS
  randomWrite: Number, // IOPS
  endurance: Number, // TBW (Terabytes Written)
  powerConsumption: {
    idle: Number, // Watts
    active: Number, // Watts
    sleep: Number // Watts
  },
  dimensions: {
    length: Number, // mm
    width: Number, // mm
    height: Number, // mm
    weight: Number // grams
  },
  features: [String], // TRIM, S.M.A.R.T, Encryption, etc.
  price: Number,
  releaseDate: Date,
  performanceScore: Number, // Synthetic benchmark score
  imageUrl: String,
  specifications: {
    cache: Number, // MB (for SSDs)
    buffer: Number, // MB (for HDDs)
    platters: Number, // Number of platters (for HDDs)
    rpm: Number, // Rotations per minute (for HDDs)
    sectors: Number, // Sectors per track (for HDDs)
    firmware: String // Firmware version
  },
  compatibility: {
    motherboards: [String], // Compatible interface types
    cases: [String], // Compatible form factors
    psus: [String] // Power requirements
  },
  reliability: {
    mtbf: Number, // Mean Time Between Failures (hours)
    warranty: Number, // Years
    temperature: {
      operating: [Number], // Min-Max °C
      storage: [Number] // Min-Max °C
    }
  },
  createdAt: Date,
  updatedAt: Date
};

module.exports = storageSchema;
