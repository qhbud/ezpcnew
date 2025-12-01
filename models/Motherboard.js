const { ObjectId } = require('mongodb');

const motherboardSchema = {
  _id: ObjectId,
  name: String,
  manufacturer: String, // ASUS, MSI, Gigabyte, ASRock, etc.
  chipset: String, // B760, X670E, Z790, etc.
  socket: String, // LGA1700, AM4, AM5, etc.
  formFactor: String, // ATX, mATX, ITX, E-ATX
  memorySlots: Number,
  maxMemory: Number, // GB
  memoryType: [String], // DDR4, DDR5
  memorySpeed: [Number], // MHz
  pcieSlots: [{
    type: String, // PCIe x16, PCIe x8, PCIe x4, PCIe x1
    version: String, // PCIe 4.0, PCIe 5.0
    lanes: Number,
    physicalSize: String // x16, x8, x4, x1
  }],
  m2Slots: [{
    type: String, // M.2 2280, M.2 22110
    pcieVersion: String, // PCIe 4.0, PCIe 5.0
    sata: Boolean,
    nvme: Boolean
  }],
  sataPorts: Number,
  usbPorts: {
    usb2: Number,
    usb3: Number,
    usb3_1: Number,
    usb3_2: Number,
    usbc: Number,
    thunderbolt: Number
  },
  networking: {
    ethernet: [String], // 1GbE, 2.5GbE, 10GbE
    wifi: Boolean,
    wifiVersion: String, // WiFi 6, WiFi 6E, WiFi 7
    bluetooth: Boolean,
    bluetoothVersion: String
  },
  audio: {
    codec: String, // Realtek ALC1220, etc.
    channels: Number, // 7.1, 5.1, etc.
    optical: Boolean
  },
  powerConnectors: {
    cpu: [String], // 8-pin, 4+4-pin, etc.
    motherboard: [String] // 24-pin, etc.
  },
  features: [String], // RGB, Debug LED, Q-Flash, etc.
  price: Number,
  releaseDate: Date,
  imageUrl: String,
  specifications: {
    vrms: Number, // Number of VRM phases
    bios: String, // UEFI, Legacy, etc.
    overclocking: Boolean,
    tpm: Boolean
  },
  compatibility: {
    cpus: [String], // Compatible CPU series
    coolers: [String], // Compatible cooler types
    memory: [String], // Compatible memory types
    cases: [String] // Compatible case sizes
  },
  createdAt: Date,
  updatedAt: Date
};

module.exports = motherboardSchema;
