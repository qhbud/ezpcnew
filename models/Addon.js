const { ObjectId } = require('mongodb');

const addonSchema = {
  _id: ObjectId,
  name: String,
  title: String,
  manufacturer: String, // Corsair, Noctua, Lian Li, CableMod, etc.
  brand: String,
  category: String, // 'Case Fan', 'RGB Lighting', 'Cables', 'Thermal Paste', 'Controllers', 'Accessories'
  type: String, // More specific type within category

  // Fan-specific fields
  fanSpecs: {
    size: Number, // mm (120, 140, etc.)
    rpm: {
      min: Number,
      max: Number
    },
    airflow: Number, // CFM
    staticPressure: Number, // mm H2O
    noiseLevel: {
      min: Number, // dB
      max: Number // dB
    },
    bearingType: String, // Fluid Dynamic, Magnetic Levitation, etc.
    pwm: Boolean, // PWM control support
    ledType: String, // RGB, ARGB, Static, None
    connector: String // 4-pin PWM, 3-pin DC, etc.
  },

  // RGB/Lighting-specific fields
  lightingSpecs: {
    type: String, // LED Strip, Fan RGB, Controller, etc.
    ledCount: Number,
    length: Number, // mm or LED count
    addressable: Boolean, // ARGB support
    connector: String, // 3-pin 5V ARGB, 4-pin 12V RGB
    software: String, // iCUE, Aura Sync, Mystic Light, etc.
    effects: [String] // Rainbow, Static, Breathing, etc.
  },

  // Cable-specific fields
  cableSpecs: {
    type: String, // Extension, Replacement, Custom
    connectorType: String, // 24-pin ATX, 8-pin EPS, 8-pin PCIe, etc.
    length: Number, // mm or cm
    sleeving: String, // Paracord, PET, etc.
    color: [String],
    includes: [String] // Cable combs, etc.
  },

  // Thermal paste/pad fields
  thermalSpecs: {
    type: String, // Paste, Pad, Liquid Metal
    conductivity: Number, // W/mK
    viscosity: String, // Low, Medium, High
    amount: String, // 1g, 4g, etc.
    applicationType: String, // Syringe, Tube, Pre-applied
    cureTime: Number, // hours
    operatingTemp: {
      min: Number, // °C
      max: Number // °C
    }
  },

  // Controller fields
  controllerSpecs: {
    type: String, // Fan Controller, RGB Controller, Fan Hub
    channels: Number, // Number of controllable channels
    maxLoad: Number, // Watts per channel or total
    connector: String, // USB, SATA, Molex
    software: String,
    display: Boolean // Has LCD/LED display
  },

  // General specifications
  specifications: {
    color: [String],
    material: String,
    weight: Number, // grams
    dimensions: {
      length: Number, // mm
      width: Number, // mm
      height: Number // mm
    },
    warranty: Number, // years
    hasRGB: Boolean
  },

  // Compatibility
  compatibility: {
    cases: [String], // Compatible case types
    motherboards: [String], // RGB header types, etc.
    software: [String] // Compatible RGB software ecosystems
  },

  // Pricing and availability
  price: Number,
  basePrice: Number,
  currentPrice: Number,
  salePrice: Number,
  isOnSale: Boolean,
  discount: Number,

  // Product information
  features: [String],
  imageUrl: String,
  productUrl: String,
  sourceUrl: String,
  source: String, // Amazon, Newegg, etc.

  // Price history
  priceHistory: [{
    price: Number,
    date: Date,
    source: String
  }],

  // Metadata
  createdAt: Date,
  updatedAt: Date,
  lastPriceUpdate: Date,
  updateFailed: Boolean,
  lastUpdateError: String,
  lastUpdateAttempt: Date
};

module.exports = addonSchema;
