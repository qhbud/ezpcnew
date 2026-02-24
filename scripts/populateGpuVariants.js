/**
 * populateGpuVariants.js
 *
 * Directly populates GPU collections with known, curated variant data.
 * Ensures every GPU model has at least 3 real variants with accurate info.
 * Deduplicates by checking existing entries before inserting.
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pcbuilder';
const DB_NAME = process.env.DB_NAME || 'pcbuilder';

const TARGET = 3;

// ─── Curated GPU Variants ───────────────────────────────────────────────────
// Each model has multiple real-world variants from different partners.

const GPU_VARIANTS = {
    // ───── NVIDIA RTX 50 Series ─────
    gpus_rtx_5090: {
        model: 'RTX 5090', manufacturer: 'NVIDIA', tier: 'flagship',
        memory: { size: 32, type: 'GDDR7' },
        variants: [
            { name: 'MSI GeForce RTX 5090 Suprim SOC 32GB GDDR7 Graphics Card', partner: 'MSI', price: 2349.99, imageUrl: '' },
            { name: 'ASUS ROG Strix GeForce RTX 5090 OC 32GB GDDR7 Gaming Graphics Card', partner: 'Asus', price: 2499.99, imageUrl: '' },
            { name: 'Gigabyte GeForce RTX 5090 AORUS Master 32GB GDDR7 Graphics Card', partner: 'Gigabyte', price: 2399.99, imageUrl: '' },
            { name: 'Zotac Gaming GeForce RTX 5090 AMP Extreme AIRO 32GB GDDR7', partner: 'Zotac', price: 2199.99, imageUrl: '' },
        ]
    },
    gpus_rtx_5080: {
        model: 'RTX 5080', manufacturer: 'NVIDIA', tier: 'high-end',
        memory: { size: 16, type: 'GDDR7' },
        variants: [
            { name: 'ASUS TUF Gaming GeForce RTX 5080 16GB GDDR7 OC Edition', partner: 'Asus', price: 1099.99, imageUrl: '' },
            { name: 'MSI GeForce RTX 5080 Gaming X Slim 16GB GDDR7 Graphics Card', partner: 'MSI', price: 1049.99, imageUrl: '' },
            { name: 'Gigabyte GeForce RTX 5080 Gaming OC 16GB GDDR7 Graphics Card', partner: 'Gigabyte', price: 999.99, imageUrl: '' },
            { name: 'PNY GeForce RTX 5080 VERTO OC 16GB GDDR7 Triple Fan', partner: 'PNY', price: 999.99, imageUrl: '' },
        ]
    },
    gpus_rtx_5070_ti: {
        model: 'RTX 5070 Ti', manufacturer: 'NVIDIA', tier: 'high-end',
        memory: { size: 16, type: 'GDDR7' },
        variants: [
            { name: 'MSI GeForce RTX 5070 Ti Ventus 3X OC 16GB GDDR7 Graphics Card', partner: 'MSI', price: 849.99, imageUrl: '' },
            { name: 'ASUS TUF Gaming GeForce RTX 5070 Ti 16GB GDDR7 OC Edition', partner: 'Asus', price: 879.99, imageUrl: '' },
            { name: 'Gigabyte GeForce RTX 5070 Ti Gaming OC 16GB GDDR7 Graphics Card', partner: 'Gigabyte', price: 869.99, imageUrl: '' },
            { name: 'Zotac Gaming GeForce RTX 5070 Ti Trinity OC 16GB GDDR7', partner: 'Zotac', price: 829.99, imageUrl: '' },
        ]
    },
    gpus_rtx_5070: {
        model: 'RTX 5070', manufacturer: 'NVIDIA', tier: 'upper-mid',
        memory: { size: 12, type: 'GDDR7' },
        variants: [
            { name: 'ASUS TUF Gaming GeForce RTX 5070 12GB GDDR7 OC Edition', partner: 'Asus', price: 599.99, imageUrl: '' },
            { name: 'MSI GeForce RTX 5070 Gaming X Slim 12GB GDDR7 Graphics Card', partner: 'MSI', price: 579.99, imageUrl: '' },
            { name: 'Gigabyte GeForce RTX 5070 Windforce OC 12GB GDDR7 Graphics Card', partner: 'Gigabyte', price: 569.99, imageUrl: '' },
            { name: 'PNY GeForce RTX 5070 VERTO OC 12GB GDDR7 Triple Fan', partner: 'PNY', price: 559.99, imageUrl: '' },
        ]
    },
    gpus_rtx_5060_ti: {
        model: 'RTX 5060 Ti', manufacturer: 'NVIDIA', tier: 'mid-range',
        memory: { size: 16, type: 'GDDR7' },
        variants: [
            { name: 'MSI GeForce RTX 5060 Ti Gaming OC 16GB GDDR7 Graphics Card', partner: 'MSI', price: 449.99, imageUrl: '' },
            { name: 'ASUS Dual GeForce RTX 5060 Ti OC 16GB GDDR7 Graphics Card', partner: 'Asus', price: 459.99, imageUrl: '' },
            { name: 'Gigabyte GeForce RTX 5060 Ti Windforce OC 16GB GDDR7', partner: 'Gigabyte', price: 439.99, imageUrl: '' },
            { name: 'Zotac Gaming GeForce RTX 5060 Ti Twin Edge OC 16GB GDDR7', partner: 'Zotac', price: 429.99, imageUrl: '' },
        ]
    },
    gpus_rtx_5060: {
        model: 'RTX 5060', manufacturer: 'NVIDIA', tier: 'mid-range',
        memory: { size: 8, type: 'GDDR7' },
        variants: [
            { name: 'MSI GeForce RTX 5060 Ventus 2X OC 8GB GDDR7 Graphics Card', partner: 'MSI', price: 299.99, imageUrl: '' },
            { name: 'ASUS Dual GeForce RTX 5060 OC 8GB GDDR7 Graphics Card', partner: 'Asus', price: 309.99, imageUrl: '' },
            { name: 'Gigabyte GeForce RTX 5060 Eagle OC 8GB GDDR7 Graphics Card', partner: 'Gigabyte', price: 299.99, imageUrl: '' },
            { name: 'PNY GeForce RTX 5060 VERTO Dual Fan 8GB GDDR7', partner: 'PNY', price: 289.99, imageUrl: '' },
        ]
    },

    // ───── NVIDIA RTX 40 Series ─────
    gpus_rtx_4090: {
        model: 'RTX 4090', manufacturer: 'NVIDIA', tier: 'flagship',
        memory: { size: 24, type: 'GDDR6X' },
        variants: [
            { name: 'ASUS TUF Gaming GeForce RTX 4090 OC 24GB GDDR6X Graphics Card', partner: 'Asus', price: 1999.99, imageUrl: '' },
            { name: 'MSI GeForce RTX 4090 Suprim X 24GB GDDR6X Graphics Card', partner: 'MSI', price: 2049.99, imageUrl: '' },
            { name: 'Gigabyte GeForce RTX 4090 Gaming OC 24GB GDDR6X Graphics Card', partner: 'Gigabyte', price: 1899.99, imageUrl: '' },
            { name: 'Zotac Gaming GeForce RTX 4090 AMP Extreme AIRO 24GB GDDR6X', partner: 'Zotac', price: 1849.99, imageUrl: '' },
        ]
    },
    gpus_rtx_4080_super: {
        model: 'RTX 4080 Super', manufacturer: 'NVIDIA', tier: 'high-end',
        memory: { size: 16, type: 'GDDR6X' },
        variants: [
            { name: 'MSI GeForce RTX 4080 Super Gaming X Slim 16GB GDDR6X Graphics Card', partner: 'MSI', price: 1049.99, imageUrl: '' },
            { name: 'ASUS TUF Gaming GeForce RTX 4080 Super OC 16GB GDDR6X', partner: 'Asus', price: 1099.99, imageUrl: '' },
            { name: 'Gigabyte GeForce RTX 4080 Super Gaming OC 16GB GDDR6X', partner: 'Gigabyte', price: 1029.99, imageUrl: '' },
            { name: 'PNY GeForce RTX 4080 Super VERTO OC 16GB GDDR6X Triple Fan', partner: 'PNY', price: 999.99, imageUrl: '' },
        ]
    },
    gpus_rtx_4080: {
        model: 'RTX 4080', manufacturer: 'NVIDIA', tier: 'high-end',
        memory: { size: 16, type: 'GDDR6X' },
        variants: [
            { name: 'NVIDIA GeForce RTX 4080 Founders Edition 16GB GDDR6X', partner: 'NVIDIA', price: 1199.99, imageUrl: '' },
            { name: 'ASUS TUF Gaming GeForce RTX 4080 OC 16GB GDDR6X Graphics Card', partner: 'Asus', price: 1249.99, imageUrl: '' },
            { name: 'Gigabyte GeForce RTX 4080 Eagle OC 16GB GDDR6X Graphics Card', partner: 'Gigabyte', price: 1179.99, imageUrl: '' },
        ]
    },
    gpus_rtx_4070_ti_super: {
        model: 'RTX 4070 Ti Super', manufacturer: 'NVIDIA', tier: 'high-end',
        memory: { size: 16, type: 'GDDR6X' },
        variants: [
            { name: 'MSI GeForce RTX 4070 Ti Super Gaming X Slim 16GB GDDR6X', partner: 'MSI', price: 849.99, imageUrl: '' },
            { name: 'ASUS TUF Gaming GeForce RTX 4070 Ti Super 16GB GDDR6X OC', partner: 'Asus', price: 869.99, imageUrl: '' },
            { name: 'Gigabyte GeForce RTX 4070 Ti Super Windforce OC 16GB GDDR6X', partner: 'Gigabyte', price: 829.99, imageUrl: '' },
            { name: 'Zotac Gaming GeForce RTX 4070 Ti Super Trinity OC 16GB GDDR6X', partner: 'Zotac', price: 819.99, imageUrl: '' },
        ]
    },
    gpus_rtx_4070_ti: {
        model: 'RTX 4070 Ti', manufacturer: 'NVIDIA', tier: 'upper-mid',
        memory: { size: 12, type: 'GDDR6X' },
        variants: [
            { name: 'MSI GeForce RTX 4070 Ti Gaming X Trio 12GB GDDR6X Graphics Card', partner: 'MSI', price: 799.99, imageUrl: '' },
            { name: 'ASUS TUF Gaming GeForce RTX 4070 Ti OC 12GB GDDR6X Graphics Card', partner: 'Asus', price: 819.99, imageUrl: '' },
            { name: 'Gigabyte GeForce RTX 4070 Ti Gaming OC 12GB GDDR6X Graphics Card', partner: 'Gigabyte', price: 779.99, imageUrl: '' },
        ]
    },
    gpus_rtx_4070_super: {
        model: 'RTX 4070 Super', manufacturer: 'NVIDIA', tier: 'upper-mid',
        memory: { size: 12, type: 'GDDR6X' },
        variants: [
            { name: 'MSI GeForce RTX 4070 Super Ventus 3X OC 12GB GDDR6X Graphics Card', partner: 'MSI', price: 599.99, imageUrl: '' },
            { name: 'ASUS Dual GeForce RTX 4070 Super OC 12GB GDDR6X Graphics Card', partner: 'Asus', price: 619.99, imageUrl: '' },
            { name: 'Gigabyte GeForce RTX 4070 Super Windforce OC 12GB GDDR6X', partner: 'Gigabyte', price: 589.99, imageUrl: '' },
            { name: 'Zotac Gaming GeForce RTX 4070 Super Twin Edge OC 12GB GDDR6X', partner: 'Zotac', price: 579.99, imageUrl: '' },
        ]
    },
    gpus_rtx_4070: {
        model: 'RTX 4070', manufacturer: 'NVIDIA', tier: 'upper-mid',
        memory: { size: 12, type: 'GDDR6X' },
        variants: [
            { name: 'MSI GeForce RTX 4070 Ventus 3X OC 12GB GDDR6X Graphics Card', partner: 'MSI', price: 549.99, imageUrl: '' },
            { name: 'ASUS Dual GeForce RTX 4070 OC 12GB GDDR6X Graphics Card', partner: 'Asus', price: 559.99, imageUrl: '' },
            { name: 'Gigabyte GeForce RTX 4070 Windforce OC 12GB GDDR6X Graphics Card', partner: 'Gigabyte', price: 539.99, imageUrl: '' },
            { name: 'PNY GeForce RTX 4070 VERTO Dual Fan OC 12GB GDDR6X', partner: 'PNY', price: 529.99, imageUrl: '' },
        ]
    },
    gpus_rtx_4060_ti: {
        model: 'RTX 4060 Ti', manufacturer: 'NVIDIA', tier: 'mid-range',
        memory: { size: 8, type: 'GDDR6' },
        variants: [
            { name: 'MSI GeForce RTX 4060 Ti Gaming X 8GB GDDR6 Graphics Card', partner: 'MSI', price: 449.99, imageUrl: '' },
            { name: 'ASUS Dual GeForce RTX 4060 Ti OC 8GB GDDR6 Graphics Card', partner: 'Asus', price: 429.99, imageUrl: '' },
            { name: 'Gigabyte GeForce RTX 4060 Ti Gaming OC 8GB GDDR6 Graphics Card', partner: 'Gigabyte', price: 419.99, imageUrl: '' },
            { name: 'Zotac Gaming GeForce RTX 4060 Ti Twin Edge OC 8GB GDDR6', partner: 'Zotac', price: 399.99, imageUrl: '' },
        ]
    },
    gpus_rtx_4060: {
        model: 'RTX 4060', manufacturer: 'NVIDIA', tier: 'mid-range',
        memory: { size: 8, type: 'GDDR6' },
        variants: [
            { name: 'MSI GeForce RTX 4060 Ventus 2X Black OC 8GB GDDR6 Graphics Card', partner: 'MSI', price: 299.99, imageUrl: '' },
            { name: 'ASUS Dual GeForce RTX 4060 OC 8GB GDDR6 Graphics Card', partner: 'Asus', price: 309.99, imageUrl: '' },
            { name: 'Gigabyte GeForce RTX 4060 Windforce OC 8GB GDDR6 Graphics Card', partner: 'Gigabyte', price: 289.99, imageUrl: '' },
            { name: 'PNY GeForce RTX 4060 VERTO Dual Fan 8GB GDDR6', partner: 'PNY', price: 279.99, imageUrl: '' },
        ]
    },

    // ───── NVIDIA RTX 30 Series ─────
    gpus_rtx_3090_ti: {
        model: 'RTX 3090 Ti', manufacturer: 'NVIDIA', tier: 'flagship',
        memory: { size: 24, type: 'GDDR6X' },
        variants: [
            { name: 'ASUS ROG Strix GeForce RTX 3090 Ti OC 24GB GDDR6X Gaming Graphics Card', partner: 'Asus', price: 1799.99, imageUrl: '' },
            { name: 'MSI GeForce RTX 3090 Ti Suprim X 24GB GDDR6X Graphics Card', partner: 'MSI', price: 1849.99, imageUrl: '' },
            { name: 'Gigabyte GeForce RTX 3090 Ti Gaming OC 24GB GDDR6X Graphics Card', partner: 'Gigabyte', price: 1699.99, imageUrl: '' },
        ]
    },
    gpus_rtx_3090: {
        model: 'RTX 3090', manufacturer: 'NVIDIA', tier: 'flagship',
        memory: { size: 24, type: 'GDDR6X' },
        variants: [
            { name: 'ASUS TUF Gaming GeForce RTX 3090 OC 24GB GDDR6X Graphics Card', partner: 'Asus', price: 1499.99, imageUrl: '' },
            { name: 'MSI GeForce RTX 3090 Gaming X Trio 24GB GDDR6X Graphics Card', partner: 'MSI', price: 1549.99, imageUrl: '' },
            { name: 'EVGA GeForce RTX 3090 FTW3 Ultra Gaming 24GB GDDR6X Graphics Card', partner: 'EVGA', price: 1499.99, imageUrl: '' },
        ]
    },
    gpus_rtx_3080_ti: {
        model: 'RTX 3080 Ti', manufacturer: 'NVIDIA', tier: 'high-end',
        memory: { size: 12, type: 'GDDR6X' },
        variants: [
            { name: 'ASUS TUF Gaming GeForce RTX 3080 Ti OC 12GB GDDR6X Graphics Card', partner: 'Asus', price: 899.99, imageUrl: '' },
            { name: 'MSI GeForce RTX 3080 Ti Gaming X Trio 12GB GDDR6X Graphics Card', partner: 'MSI', price: 949.99, imageUrl: '' },
            { name: 'EVGA GeForce RTX 3080 Ti FTW3 Ultra Gaming 12GB GDDR6X Graphics Card', partner: 'EVGA', price: 879.99, imageUrl: '' },
            { name: 'Gigabyte GeForce RTX 3080 Ti Gaming OC 12GB GDDR6X Graphics Card', partner: 'Gigabyte', price: 869.99, imageUrl: '' },
        ]
    },
    gpus_rtx_3080: {
        model: 'RTX 3080', manufacturer: 'NVIDIA', tier: 'high-end',
        memory: { size: 10, type: 'GDDR6X' },
        variants: [
            { name: 'ASUS TUF Gaming GeForce RTX 3080 V2 OC 10GB GDDR6X Graphics Card', partner: 'Asus', price: 699.99, imageUrl: '' },
            { name: 'MSI GeForce RTX 3080 Gaming Z Trio 10GB GDDR6X Graphics Card', partner: 'MSI', price: 749.99, imageUrl: '' },
            { name: 'EVGA GeForce RTX 3080 FTW3 Ultra Gaming 10GB GDDR6X Graphics Card', partner: 'EVGA', price: 719.99, imageUrl: '' },
        ]
    },
    gpus_rtx_3070_ti: {
        model: 'RTX 3070 Ti', manufacturer: 'NVIDIA', tier: 'upper-mid',
        memory: { size: 8, type: 'GDDR6X' },
        variants: [
            { name: 'ASUS TUF Gaming GeForce RTX 3070 Ti OC 8GB GDDR6X Graphics Card', partner: 'Asus', price: 599.99, imageUrl: '' },
            { name: 'MSI GeForce RTX 3070 Ti Gaming X Trio 8GB GDDR6X Graphics Card', partner: 'MSI', price: 629.99, imageUrl: '' },
            { name: 'EVGA GeForce RTX 3070 Ti XC3 Ultra Gaming 8GB GDDR6X Graphics Card', partner: 'EVGA', price: 579.99, imageUrl: '' },
        ]
    },
    gpus_rtx_3070: {
        model: 'RTX 3070', manufacturer: 'NVIDIA', tier: 'upper-mid',
        memory: { size: 8, type: 'GDDR6' },
        variants: [
            { name: 'ASUS Dual GeForce RTX 3070 V2 OC 8GB GDDR6 Graphics Card', partner: 'Asus', price: 499.99, imageUrl: '' },
            { name: 'MSI GeForce RTX 3070 Ventus 3X OC 8GB GDDR6 Graphics Card', partner: 'MSI', price: 519.99, imageUrl: '' },
            { name: 'EVGA GeForce RTX 3070 FTW3 Ultra Gaming 8GB GDDR6 Graphics Card', partner: 'EVGA', price: 489.99, imageUrl: '' },
            { name: 'Gigabyte GeForce RTX 3070 Gaming OC 8GB GDDR6 Graphics Card', partner: 'Gigabyte', price: 509.99, imageUrl: '' },
        ]
    },
    gpus_rtx_3060_ti: {
        model: 'RTX 3060 Ti', manufacturer: 'NVIDIA', tier: 'mid-range',
        memory: { size: 8, type: 'GDDR6' },
        variants: [
            { name: 'ASUS Dual GeForce RTX 3060 Ti V2 OC 8GB GDDR6 Graphics Card', partner: 'Asus', price: 399.99, imageUrl: '' },
            { name: 'MSI GeForce RTX 3060 Ti Gaming X 8GB GDDR6 Graphics Card', partner: 'MSI', price: 419.99, imageUrl: '' },
            { name: 'EVGA GeForce RTX 3060 Ti XC Gaming 8GB GDDR6 Graphics Card', partner: 'EVGA', price: 389.99, imageUrl: '' },
        ]
    },
    gpus_rtx_3060: {
        model: 'RTX 3060', manufacturer: 'NVIDIA', tier: 'mid-range',
        memory: { size: 12, type: 'GDDR6' },
        variants: [
            { name: 'MSI GeForce RTX 3060 Ventus 2X OC 12GB GDDR6 Graphics Card', partner: 'MSI', price: 329.99, imageUrl: '' },
            { name: 'ASUS Dual GeForce RTX 3060 OC 12GB GDDR6 Graphics Card', partner: 'Asus', price: 339.99, imageUrl: '' },
            { name: 'Gigabyte GeForce RTX 3060 Gaming OC 12GB GDDR6 Graphics Card', partner: 'Gigabyte', price: 319.99, imageUrl: '' },
            { name: 'EVGA GeForce RTX 3060 XC Gaming 12GB GDDR6 Graphics Card', partner: 'EVGA', price: 309.99, imageUrl: '' },
        ]
    },
    gpus_rtx_3050: {
        model: 'RTX 3050', manufacturer: 'NVIDIA', tier: 'entry',
        memory: { size: 8, type: 'GDDR6' },
        variants: [
            { name: 'MSI GeForce RTX 3050 Gaming X 8GB GDDR6 Graphics Card', partner: 'MSI', price: 249.99, imageUrl: '' },
            { name: 'ASUS Phoenix GeForce RTX 3050 8GB GDDR6 Graphics Card', partner: 'Asus', price: 229.99, imageUrl: '' },
            { name: 'Gigabyte GeForce RTX 3050 Eagle OC 8GB GDDR6 Graphics Card', partner: 'Gigabyte', price: 219.99, imageUrl: '' },
        ]
    },

    // ───── AMD RX 7000 Series ─────
    gpus_rx_7900_xtx: {
        model: 'RX 7900 XTX', manufacturer: 'AMD', tier: 'flagship',
        memory: { size: 24, type: 'GDDR6' },
        variants: [
            { name: 'Sapphire Nitro+ AMD Radeon RX 7900 XTX 24GB GDDR6 Gaming Graphics Card', partner: 'Sapphire', price: 949.99, imageUrl: '' },
            { name: 'PowerColor Red Devil AMD Radeon RX 7900 XTX 24GB GDDR6 Graphics Card', partner: 'Powercolor', price: 989.99, imageUrl: '' },
            { name: 'XFX Speedster MERC310 AMD Radeon RX 7900 XTX 24GB GDDR6 Graphics Card', partner: 'XFX', price: 929.99, imageUrl: '' },
            { name: 'ASRock Phantom Gaming AMD Radeon RX 7900 XTX OC 24GB GDDR6', partner: 'Asrock', price: 919.99, imageUrl: '' },
        ]
    },
    gpus_rx_7900_xt: {
        model: 'RX 7900 XT', manufacturer: 'AMD', tier: 'high-end',
        memory: { size: 20, type: 'GDDR6' },
        variants: [
            { name: 'Sapphire Nitro+ AMD Radeon RX 7900 XT 20GB GDDR6 Gaming Graphics Card', partner: 'Sapphire', price: 749.99, imageUrl: '' },
            { name: 'PowerColor Red Devil AMD Radeon RX 7900 XT 20GB GDDR6 Graphics Card', partner: 'Powercolor', price: 779.99, imageUrl: '' },
            { name: 'XFX Speedster MERC310 AMD Radeon RX 7900 XT 20GB GDDR6 Graphics Card', partner: 'XFX', price: 729.99, imageUrl: '' },
        ]
    },
    gpus_rx_7900_gre: {
        model: 'RX 7900 GRE', manufacturer: 'AMD', tier: 'high-end',
        memory: { size: 16, type: 'GDDR6' },
        variants: [
            { name: 'Sapphire Pulse AMD Radeon RX 7900 GRE 16GB GDDR6 Gaming Graphics Card', partner: 'Sapphire', price: 549.99, imageUrl: '' },
            { name: 'PowerColor Fighter AMD Radeon RX 7900 GRE 16GB GDDR6 Graphics Card', partner: 'Powercolor', price: 529.99, imageUrl: '' },
            { name: 'XFX Speedster SWFT309 AMD Radeon RX 7900 GRE 16GB GDDR6 Graphics Card', partner: 'XFX', price: 519.99, imageUrl: '' },
        ]
    },
    gpus_rx_7800_xt: {
        model: 'RX 7800 XT', manufacturer: 'AMD', tier: 'upper-mid',
        memory: { size: 16, type: 'GDDR6' },
        variants: [
            { name: 'Sapphire Pulse AMD Radeon RX 7800 XT 16GB GDDR6 Gaming Graphics Card', partner: 'Sapphire', price: 489.99, imageUrl: '' },
            { name: 'PowerColor Red Devil AMD Radeon RX 7800 XT 16GB GDDR6 Graphics Card', partner: 'Powercolor', price: 519.99, imageUrl: '' },
            { name: 'XFX Speedster QICK319 AMD Radeon RX 7800 XT 16GB GDDR6 Graphics Card', partner: 'XFX', price: 479.99, imageUrl: '' },
            { name: 'ASRock Phantom Gaming AMD Radeon RX 7800 XT OC 16GB GDDR6', partner: 'Asrock', price: 469.99, imageUrl: '' },
        ]
    },
    gpus_rx_7700_xt: {
        model: 'RX 7700 XT', manufacturer: 'AMD', tier: 'upper-mid',
        memory: { size: 12, type: 'GDDR6' },
        variants: [
            { name: 'Sapphire Pulse AMD Radeon RX 7700 XT 12GB GDDR6 Gaming Graphics Card', partner: 'Sapphire', price: 419.99, imageUrl: '' },
            { name: 'PowerColor Fighter AMD Radeon RX 7700 XT 12GB GDDR6 Graphics Card', partner: 'Powercolor', price: 409.99, imageUrl: '' },
            { name: 'XFX Speedster QICK319 AMD Radeon RX 7700 XT 12GB GDDR6 Graphics Card', partner: 'XFX', price: 399.99, imageUrl: '' },
        ]
    },
    gpus_rx_7600_xt: {
        model: 'RX 7600 XT', manufacturer: 'AMD', tier: 'mid-range',
        memory: { size: 16, type: 'GDDR6' },
        variants: [
            { name: 'Sapphire Pulse AMD Radeon RX 7600 XT 16GB GDDR6 Gaming Graphics Card', partner: 'Sapphire', price: 329.99, imageUrl: '' },
            { name: 'XFX Speedster SWFT210 AMD Radeon RX 7600 XT 16GB GDDR6 Graphics Card', partner: 'XFX', price: 319.99, imageUrl: '' },
            { name: 'Gigabyte AMD Radeon RX 7600 XT Gaming OC 16GB GDDR6 Graphics Card', partner: 'Gigabyte', price: 339.99, imageUrl: '' },
        ]
    },
    gpus_rx_7600: {
        model: 'RX 7600', manufacturer: 'AMD', tier: 'mid-range',
        memory: { size: 8, type: 'GDDR6' },
        variants: [
            { name: 'Sapphire Pulse AMD Radeon RX 7600 8GB GDDR6 Gaming Graphics Card', partner: 'Sapphire', price: 269.99, imageUrl: '' },
            { name: 'PowerColor Fighter AMD Radeon RX 7600 8GB GDDR6 Graphics Card', partner: 'Powercolor', price: 259.99, imageUrl: '' },
            { name: 'XFX Speedster SWFT210 AMD Radeon RX 7600 8GB GDDR6 Graphics Card', partner: 'XFX', price: 249.99, imageUrl: '' },
        ]
    },

    // ───── AMD RX 6000 Series ─────
    gpus_rx_6950_xt: {
        model: 'RX 6950 XT', manufacturer: 'AMD', tier: 'high-end',
        memory: { size: 16, type: 'GDDR6' },
        variants: [
            { name: 'Sapphire Nitro+ AMD Radeon RX 6950 XT 16GB GDDR6 Gaming Graphics Card', partner: 'Sapphire', price: 699.99, imageUrl: '' },
            { name: 'PowerColor Red Devil AMD Radeon RX 6950 XT 16GB GDDR6 Graphics Card', partner: 'Powercolor', price: 729.99, imageUrl: '' },
            { name: 'XFX Speedster MERC319 AMD Radeon RX 6950 XT 16GB GDDR6 Graphics Card', partner: 'XFX', price: 689.99, imageUrl: '' },
        ]
    },
    gpus_rx_6900_xt: {
        model: 'RX 6900 XT', manufacturer: 'AMD', tier: 'high-end',
        memory: { size: 16, type: 'GDDR6' },
        variants: [
            { name: 'PowerColor Red Devil AMD Radeon RX 6900 XT 16GB GDDR6 Graphics Card', partner: 'Powercolor', price: 679.99, imageUrl: '' },
            { name: 'Sapphire Nitro+ AMD Radeon RX 6900 XT 16GB GDDR6 Gaming Graphics Card', partner: 'Sapphire', price: 699.99, imageUrl: '' },
            { name: 'XFX Speedster MERC319 AMD Radeon RX 6900 XT 16GB GDDR6 Graphics Card', partner: 'XFX', price: 659.99, imageUrl: '' },
        ]
    },
    gpus_rx_6800_xt: {
        model: 'RX 6800 XT', manufacturer: 'AMD', tier: 'high-end',
        memory: { size: 16, type: 'GDDR6' },
        variants: [
            { name: 'Sapphire Pulse AMD Radeon RX 6800 XT 16GB GDDR6 Gaming Graphics Card', partner: 'Sapphire', price: 549.99, imageUrl: '' },
            { name: 'PowerColor Red Devil AMD Radeon RX 6800 XT 16GB GDDR6 Graphics Card', partner: 'Powercolor', price: 579.99, imageUrl: '' },
            { name: 'XFX Speedster MERC319 AMD Radeon RX 6800 XT 16GB GDDR6 Graphics Card', partner: 'XFX', price: 529.99, imageUrl: '' },
        ]
    },
    gpus_rx_6800: {
        model: 'RX 6800', manufacturer: 'AMD', tier: 'upper-mid',
        memory: { size: 16, type: 'GDDR6' },
        variants: [
            { name: 'Sapphire Pulse AMD Radeon RX 6800 16GB GDDR6 Gaming Graphics Card', partner: 'Sapphire', price: 479.99, imageUrl: '' },
            { name: 'PowerColor Fighter AMD Radeon RX 6800 16GB GDDR6 Graphics Card', partner: 'Powercolor', price: 469.99, imageUrl: '' },
            { name: 'ASRock Phantom Gaming AMD Radeon RX 6800 OC 16GB GDDR6', partner: 'Asrock', price: 459.99, imageUrl: '' },
        ]
    },
    gpus_rx_6750_xt: {
        model: 'RX 6750 XT', manufacturer: 'AMD', tier: 'upper-mid',
        memory: { size: 12, type: 'GDDR6' },
        variants: [
            { name: 'Sapphire Nitro+ AMD Radeon RX 6750 XT 12GB GDDR6 Gaming Graphics Card', partner: 'Sapphire', price: 399.99, imageUrl: '' },
            { name: 'PowerColor Red Devil AMD Radeon RX 6750 XT 12GB GDDR6 Graphics Card', partner: 'Powercolor', price: 419.99, imageUrl: '' },
            { name: 'XFX Speedster SWFT309 AMD Radeon RX 6750 XT 12GB GDDR6 Graphics Card', partner: 'XFX', price: 389.99, imageUrl: '' },
        ]
    },
    gpus_rx_6700_xt: {
        model: 'RX 6700 XT', manufacturer: 'AMD', tier: 'upper-mid',
        memory: { size: 12, type: 'GDDR6' },
        variants: [
            { name: 'Sapphire Pulse AMD Radeon RX 6700 XT 12GB GDDR6 Gaming Graphics Card', partner: 'Sapphire', price: 369.99, imageUrl: '' },
            { name: 'PowerColor Red Devil AMD Radeon RX 6700 XT 12GB GDDR6 Graphics Card', partner: 'Powercolor', price: 389.99, imageUrl: '' },
            { name: 'XFX Speedster SWFT309 AMD Radeon RX 6700 XT 12GB GDDR6 Graphics Card', partner: 'XFX', price: 359.99, imageUrl: '' },
        ]
    },
    gpus_rx_6650_xt: {
        model: 'RX 6650 XT', manufacturer: 'AMD', tier: 'mid-range',
        memory: { size: 8, type: 'GDDR6' },
        variants: [
            { name: 'Sapphire Pulse AMD Radeon RX 6650 XT 8GB GDDR6 Gaming Graphics Card', partner: 'Sapphire', price: 279.99, imageUrl: '' },
            { name: 'XFX Speedster SWFT210 AMD Radeon RX 6650 XT 8GB GDDR6 Graphics Card', partner: 'XFX', price: 269.99, imageUrl: '' },
            { name: 'PowerColor Fighter AMD Radeon RX 6650 XT 8GB GDDR6 Graphics Card', partner: 'Powercolor', price: 259.99, imageUrl: '' },
        ]
    },
    gpus_rx_6600_xt: {
        model: 'RX 6600 XT', manufacturer: 'AMD', tier: 'mid-range',
        memory: { size: 8, type: 'GDDR6' },
        variants: [
            { name: 'Sapphire Pulse AMD Radeon RX 6600 XT 8GB GDDR6 Gaming Graphics Card', partner: 'Sapphire', price: 299.99, imageUrl: '' },
            { name: 'PowerColor Red Devil AMD Radeon RX 6600 XT 8GB GDDR6 Graphics Card', partner: 'Powercolor', price: 319.99, imageUrl: '' },
            { name: 'XFX Speedster SWFT210 AMD Radeon RX 6600 XT 8GB GDDR6 Graphics Card', partner: 'XFX', price: 289.99, imageUrl: '' },
        ]
    },
    gpus_rx_6600: {
        model: 'RX 6600', manufacturer: 'AMD', tier: 'mid-range',
        memory: { size: 8, type: 'GDDR6' },
        variants: [
            { name: 'PowerColor Fighter AMD Radeon RX 6600 8GB GDDR6 Graphics Card', partner: 'Powercolor', price: 229.99, imageUrl: '' },
            { name: 'Sapphire Pulse AMD Radeon RX 6600 8GB GDDR6 Gaming Graphics Card', partner: 'Sapphire', price: 239.99, imageUrl: '' },
            { name: 'XFX Speedster SWFT210 AMD Radeon RX 6600 8GB GDDR6 Graphics Card', partner: 'XFX', price: 219.99, imageUrl: '' },
        ]
    },
    gpus_rx_6500_xt: {
        model: 'RX 6500 XT', manufacturer: 'AMD', tier: 'entry',
        memory: { size: 4, type: 'GDDR6' },
        variants: [
            { name: 'Sapphire Pulse AMD Radeon RX 6500 XT 4GB GDDR6 Gaming Graphics Card', partner: 'Sapphire', price: 179.99, imageUrl: '' },
            { name: 'PowerColor Fighter AMD Radeon RX 6500 XT 4GB GDDR6 Graphics Card', partner: 'Powercolor', price: 169.99, imageUrl: '' },
            { name: 'MSI AMD Radeon RX 6500 XT MECH 2X OC 4GB GDDR6 Graphics Card', partner: 'MSI', price: 174.99, imageUrl: '' },
        ]
    },
    gpus_rx_6400: {
        model: 'RX 6400', manufacturer: 'AMD', tier: 'entry',
        memory: { size: 4, type: 'GDDR6' },
        variants: [
            { name: 'Sapphire Pulse AMD Radeon RX 6400 4GB GDDR6 Gaming Graphics Card', partner: 'Sapphire', price: 149.99, imageUrl: '' },
            { name: 'XFX Speedster SWFT105 AMD Radeon RX 6400 4GB GDDR6 Graphics Card', partner: 'XFX', price: 139.99, imageUrl: '' },
            { name: 'ASRock Challenger AMD Radeon RX 6400 ITX 4GB GDDR6 Graphics Card', partner: 'Asrock', price: 129.99, imageUrl: '' },
        ]
    },

    // ───── Intel Arc ─────
    gpus_arc_a770: {
        model: 'Arc A770', manufacturer: 'Intel', tier: 'upper-mid',
        memory: { size: 16, type: 'GDDR6' },
        variants: [
            { name: 'Intel Arc A770 Limited Edition 16GB GDDR6 Graphics Card', partner: 'Intel', price: 349.99, imageUrl: '' },
            { name: 'ASRock Challenger Intel Arc A770 OC 16GB GDDR6 Graphics Card', partner: 'Asrock', price: 329.99, imageUrl: '' },
            { name: 'Sparkle Intel Arc A770 Titan OC Edition 16GB GDDR6 Graphics Card', partner: 'Sparkle', price: 339.99, imageUrl: '' },
        ]
    },
    gpus_arc_a750: {
        model: 'Arc A750', manufacturer: 'Intel', tier: 'mid-range',
        memory: { size: 8, type: 'GDDR6' },
        variants: [
            { name: 'Intel Arc A750 Limited Edition 8GB GDDR6 Graphics Card', partner: 'Intel', price: 249.99, imageUrl: '' },
            { name: 'ASRock Challenger Intel Arc A750 OC 8GB GDDR6 Graphics Card', partner: 'Asrock', price: 229.99, imageUrl: '' },
            { name: 'Sparkle Intel Arc A750 ORC OC Edition 8GB GDDR6 Graphics Card', partner: 'Sparkle', price: 239.99, imageUrl: '' },
        ]
    },
    gpus_arc_a580: {
        model: 'Arc A580', manufacturer: 'Intel', tier: 'mid-range',
        memory: { size: 8, type: 'GDDR6' },
        variants: [
            { name: 'ASRock Challenger Intel Arc A580 OC 8GB GDDR6 Graphics Card', partner: 'Asrock', price: 179.99, imageUrl: '' },
            { name: 'Sparkle Intel Arc A580 ORC OC Edition 8GB GDDR6 Graphics Card', partner: 'Sparkle', price: 169.99, imageUrl: '' },
            { name: 'Acer Predator BiFrost Intel Arc A580 OC 8GB GDDR6 Graphics Card', partner: 'Acer', price: 189.99, imageUrl: '' },
        ]
    },
    gpus_arc_a380: {
        model: 'Arc A380', manufacturer: 'Intel', tier: 'entry',
        memory: { size: 6, type: 'GDDR6' },
        variants: [
            { name: 'Sparkle Intel Arc A380 ELF 6GB GDDR6 Graphics Card', partner: 'Sparkle', price: 139.99, imageUrl: '' },
            { name: 'ASRock Challenger Intel Arc A380 ITX 6GB GDDR6 OC Graphics Card', partner: 'Asrock', price: 129.99, imageUrl: '' },
            { name: 'Acer Predator BiFrost Intel Arc A380 OC 6GB GDDR6 Graphics Card', partner: 'Acer', price: 149.99, imageUrl: '' },
        ]
    },
};

// ─── Deduplication ──────────────────────────────────────────────────────────

function isDuplicate(newName, existingProducts) {
    const newUpper = newName.toUpperCase().trim();
    const newShort = newUpper.substring(0, 50);

    for (const existing of existingProducts) {
        const existName = (existing.name || existing.title || '').toUpperCase().trim();
        const existShort = existName.substring(0, 50);

        // Exact or near-exact match
        if (newShort === existShort) return true;

        // Same partner + same model = likely duplicate
        // e.g., both are "ASUS TUF Gaming GeForce RTX 4090..."
        if (newUpper.substring(0, 30) === existName.substring(0, 30)) return true;
    }
    return false;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);

    console.log('🎯 GPU Variant Populator - Ensuring 3+ variants per model\n');

    let totalAdded = 0;
    let modelsFixed = 0;
    let modelsAlreadyOk = 0;

    for (const [collName, data] of Object.entries(GPU_VARIANTS)) {
        const coll = db.collection(collName);

        // Get existing entries
        const existing = await coll.find({}).toArray();
        const currentCount = existing.length;

        if (currentCount >= TARGET) {
            console.log(`✅ ${data.model}: already has ${currentCount} variants`);
            modelsAlreadyOk++;
            continue;
        }

        const needed = TARGET - currentCount;
        console.log(`🔧 ${data.model}: has ${currentCount}, adding up to ${needed} more`);

        let added = 0;
        for (const variant of data.variants) {
            if (currentCount + added >= TARGET) break;

            // Check for duplicates
            if (isDuplicate(variant.name, [...existing, ...data.variants.slice(0, data.variants.indexOf(variant)).filter((_, i) => i < added)])) {
                console.log(`   ⏭️  Skipping duplicate: ${variant.name.substring(0, 60)}...`);
                continue;
            }

            const doc = {
                name: variant.name,
                title: variant.name,
                basePrice: variant.price,
                currentPrice: variant.price,
                price: variant.price,
                salePrice: null,
                isOnSale: false,
                imageUrl: variant.imageUrl || '',
                sourceUrl: '',
                source: 'curated',
                partner: variant.partner,
                manufacturer: data.manufacturer,
                gpuModel: data.model,
                tier: data.tier,
                memory: data.memory,
                isAvailable: true,
                category: 'gpus',
                createdAt: new Date(),
                updatedAt: new Date(),
                lastUpdated: new Date(),
                scrapedAt: new Date().toISOString()
            };

            await coll.insertOne(doc);
            existing.push(doc); // Track for dedup
            added++;
            totalAdded++;
            console.log(`   ✅ ${variant.partner} - $${variant.price}`);
        }

        if (added > 0) modelsFixed++;
        console.log(`   → ${data.model}: now has ${currentCount + added} variants\n`);
    }

    console.log('='.repeat(60));
    console.log('📊 POPULATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Models already at 3+: ${modelsAlreadyOk}`);
    console.log(`Models fixed: ${modelsFixed}`);
    console.log(`Total variants added: ${totalAdded}`);
    console.log('='.repeat(60));

    await client.close();
}

main().catch(console.error);
