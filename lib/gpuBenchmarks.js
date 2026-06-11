// GPU benchmark data for performance scoring
const gpuBenchmarks = {
    'RTX 5090': 197.5,
    'RTX 5080': 178.5,
    'RTX 5070 Ti': 169.3,
    'RTX 5070': 149.1,
    'RTX 5060 Ti': 120.3,
    'RTX 5060': 102.7,
    'RTX 4090': 195.6,
    'RTX 4080 Super': 177.2,
    'RTX 4080': 175,
    'RTX 4070 Ti Super': 161.3,
    'RTX 4070 Ti': 155.1,
    'RTX 4070 Super': 147.6,
    'RTX 4070': 130.7,
    'RTX 4060 Ti': 103.2,
    'RTX 4060': 83.9,
    'RTX 3090 Ti': 131.6,
    'RTX 3090': 128.1,
    'RTX 3080 Ti': 126.2,
    'RTX 3080': 125.8,
    'RTX 3070 Ti': 98.59404601,
    'RTX 3070': 99.8,
    'RTX 3060 Ti': 91.5,
    'RTX 3060': 70.2,
    'RTX 3050': 51.4,
    'RX 7900 XTX': 174.1,
    'RX 7900 XT': 163.1,
    'RX 7800 XT': 133.2,
    'RX 7700 XT': 114.5,
    'RX 7600 XT': 84.6,
    'RX 7600': 79.3,
    'RX 6950 XT': 153,
    'RX 6900 XT': 145,
    'RX 6800 XT': 132,
    'RX 6800': 120,
    'RX 6750 XT': 110,
    'RX 6700 XT': 105,
    'RX 6650 XT': 93,
    'RX 6600 XT': 80,
    'RX 6600': 64.1,
    'RX 6500 XT': 40.76102842,
    'RX 6400': 31.36481732,
    'Arc A770': 63.4,
    'Arc A750': 57.4,
    'Arc A580': 80,
    'Arc A380': 37.45250338,
    'Arc B570': 72.4,
    'Arc B580': 80.364
};

// Function to get GPU performance score from benchmark data
function getGpuPerformance(gpu) {
    const name = gpu.name || gpu.title || gpu.model || '';

    // Sort benchmark keys by length (longest first) to match more specific models first
    // This ensures "RX 7900 XTX" matches before "RX 7900"
    const sortedModels = Object.entries(gpuBenchmarks)
        .sort((a, b) => b[0].length - a[0].length);

    // Try to match the GPU model name with our benchmark data
    for (const [model, score] of sortedModels) {
        if (name.includes(model)) {
            // Normalize the score (divide by max value of 205.5 - RTX 5090)
            const maxScore = 197.5;
            return score / maxScore;
        }
    }

    return null; // No benchmark found
}

module.exports = { gpuBenchmarks, getGpuPerformance };
