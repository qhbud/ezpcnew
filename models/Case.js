const { ObjectId } = require('mongodb');

const caseSchema = {
  _id: ObjectId,
  name: String,
  manufacturer: String, // NZXT, Fractal Design, Lian Li, etc.
  brand: String, // H510, Define 7, O11 Dynamic, etc.
  formFactor: [String], // ATX, mATX, ITX, E-ATX
  dimensions: {
    length: Number, // mm
    width: Number, // mm
    height: Number, // mm
    volume: Number // liters
  },
  motherboardSupport: [String], // Supported motherboard sizes
  expansion: {
    pcieSlots: Number, // Number of expansion slots
    driveBays: {
      threeFive: Number, // 3.5" drive bays
      twoFive: Number, // 2.5" drive bays
      external: Number // External drive bays
    }
  },
  cooling: {
    includedFans: Number, // Number of included fans
    fanMounts: [{
      size: Number, // mm
      count: Number, // Number of mounts
      location: String // Front, Top, Rear, Bottom, Side
    }],
    radiatorSupport: [{
      size: Number, // mm
      count: Number, // Number of radiators
      location: String // Front, Top, Rear, Bottom, Side
    }],
    dustFilters: [String] // Locations with dust filters
  },
  materials: {
    primary: String, // Steel, Aluminum, Plastic, etc.
    sidePanel: String, // Tempered glass, Acrylic, Steel, etc.
    thickness: Number // mm
  },
  features: [String], // RGB, USB-C, Audio jacks, etc.
  ports: {
    usb: [{
      type: String, // USB 2.0, USB 3.0, USB 3.1, USB-C
      count: Number
    }],
    audio: {
      headphone: Number, // 3.5mm jacks
      microphone: Number // 3.5mm jacks
    }
  },
  powerSupply: {
    included: Boolean,
    formFactor: [String], // ATX, SFX, etc.
    mounting: String // Top, Bottom
  },
  cableManagement: {
    routing: Boolean, // Cable routing holes
    space: Number, // mm behind motherboard tray
    grommets: Number // Number of cable grommets
  },
  price: Number,
  releaseDate: Date,
  imageUrl: String,
  specifications: {
    weight: Number, // kg
    color: [String], // Available colors
    window: Boolean, // Side panel window
    toolFree: Boolean, // Tool-free installation
    noise: Number, // dB at idle
    hasRGB: Boolean // RGB lighting support
  },
  compatibility: {
    gpus: [String], // Maximum GPU length
    cpus: [String], // Maximum CPU cooler height
    psus: [String] // Maximum PSU length
  },
  airflow: {
    design: String, // Mesh front, Solid front, etc.
    pressure: String, // Positive, Negative, Neutral
    ventilation: Number // Percentage of ventilation area
  },
  createdAt: Date,
  updatedAt: Date
};

module.exports = caseSchema;
