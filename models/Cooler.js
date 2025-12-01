const { ObjectId } = require('mongodb');

const coolerSchema = {
  _id: ObjectId,
  name: String,
  manufacturer: String, // Noctua, be quiet!, Cooler Master, etc.
  brand: String, // NH-D15, Dark Rock Pro 4, Hyper 212, etc.
  type: String, // Air, Liquid, Hybrid
  coolingMethod: String, // Air, AIO, Custom loop
  socket: [String], // LGA1700, AM4, AM5, etc.
  dimensions: {
    height: Number, // mm
    width: Number, // mm
    depth: Number, // mm
    weight: Number // grams
  },
  fan: {
    count: Number, // Number of fans
    size: [Number], // mm for each fan
    speed: {
      min: Number, // RPM
      max: Number // RPM
    },
    airflow: Number, // CFM
    staticPressure: Number, // mmH2O
    noise: Number, // dB
    bearing: String, // Ball bearing, Fluid dynamic, etc.
    rgb: Boolean
  },
  radiator: {
    size: Number, // mm (for liquid coolers)
    thickness: Number, // mm
    material: String, // Copper, Aluminum, etc.
    finDensity: Number // FPI (Fins Per Inch)
  },
  heatpipes: {
    count: Number, // Number of heatpipes
    diameter: Number, // mm
    material: String, // Copper, etc.
    directTouch: Boolean // Direct contact with CPU
  },
  thermalPaste: {
    included: Boolean,
    type: String, // Pre-applied, Tube, etc.
    brand: String // Brand of thermal paste
  },
  mounting: {
    type: String, // Screw, Clip, etc.
    toolFree: Boolean,
    backplate: Boolean
  },
  performance: {
    tdp: Number, // Watts
    temperature: Number, // °C under load
    noise: Number // dB under load
  },
  price: Number,
  releaseDate: Date,
  imageUrl: String,
  specifications: {
    material: String, // Primary material
    finish: String, // Surface finish
    warranty: Number // Years
  },
  compatibility: {
    cpus: [String], // Compatible CPU series
    motherboards: [String], // Compatible socket types
    cases: [String] // Compatible case sizes
  },
  features: [String], // PWM control, Zero RPM mode, etc.
  installation: {
    difficulty: String, // Easy, Medium, Hard
    time: Number, // Minutes
    tools: [String] // Required tools
  },
  createdAt: Date,
  updatedAt: Date
};

module.exports = coolerSchema;
