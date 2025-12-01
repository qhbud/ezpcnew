const { ObjectId } = require('mongodb');

const psuSchema = {
  _id: ObjectId,
  name: String,
  manufacturer: String, // Corsair, EVGA, Seasonic, etc.
  brand: String, // RMx, SuperNOVA, Focus, etc.
  wattage: Number, // Watts
  efficiency: String, // 80 Plus rating (Bronze, Silver, Gold, Platinum, Titanium)
  efficiencyPercentage: Number, // Actual efficiency percentage
  formFactor: String, // ATX, SFX, TFX, etc.
  modularity: String, // Full, Semi, Non-modular
  certification: String, // 80 Plus, Cybenetics, etc.
  powerConnectors: {
    motherboard: [String], // 24-pin, 20+4-pin
    cpu: [String], // 4-pin, 8-pin, 4+4-pin, 8+8-pin
    pcie: [String], // 6-pin, 8-pin, 6+2-pin
    sata: [String], // SATA power connectors
    molex: [String], // 4-pin Molex connectors
    floppy: [String] // 4-pin floppy connectors
  },
  rails: {
    type: String, // Single, Multi
    count: Number, // Number of 12V rails
    max12v: Number, // Maximum 12V current
    max5v: Number, // Maximum 5V current
    max3v3: Number // Maximum 3.3V current
  },
  protection: [String], // OVP, UVP, OCP, SCP, OTP, etc.
  cooling: {
    fan: Boolean,
    fanSize: Number, // mm
    fanType: String, // Ball bearing, Fluid dynamic, etc.
    zeroRpm: Boolean // Fanless mode
  },
  dimensions: {
    length: Number, // mm
    width: Number, // mm
    height: Number, // mm
    weight: Number // grams
  },
  features: [String], // RGB, Zero RPM mode, etc.
  price: Number,
  releaseDate: Date,
  imageUrl: String,
  specifications: {
    input: {
      voltage: [String], // 100-240V, 115-230V, etc.
      frequency: [Number], // Hz
      current: Number // Amps
    },
    output: {
      voltage: [String], // +3.3V, +5V, +12V, -12V, +5VSB
      current: [Number], // Amps for each voltage
      ripple: [Number] // mV ripple for each voltage
    },
    holdUpTime: Number, // ms
    powerGood: Number // ms
  },
  compatibility: {
    motherboards: [String], // Compatible form factors
    cases: [String], // Compatible case sizes
    gpus: [String] // Compatible GPU power requirements
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

module.exports = psuSchema;
