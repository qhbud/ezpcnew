const { connectToDatabase } = require('../config/database');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const fs = require('fs');
const path = require('path');

async function generatePriceGraph() {
    console.log('📊 Generating GPU price graph...');

    try {
        const db = await connectToDatabase();

        // Get a representative sample of GPUs from different price ranges
        const sampleCollections = [
            'gpus_rtx_5090',    // High-end
            'gpus_rtx_4080',    // High-mid
            'gpus_rtx_4070',    // Mid-range
            'gpus_rtx_3060',    // Budget
            'gpus_rx_7900_xtx', // AMD High-end
            'gpus_rx_7600',     // AMD Budget
            'gpus_arc_a770'     // Intel
        ];

        console.log('🔍 Collecting GPU data...');

        const gpuData = [];
        const colors = [
            'rgb(255, 99, 132)',   // Red - RTX 5090
            'rgb(54, 162, 235)',   // Blue - RTX 4080
            'rgb(255, 205, 86)',   // Yellow - RTX 4070
            'rgb(75, 192, 192)',   // Teal - RTX 3060
            'rgb(153, 102, 255)',  // Purple - RX 7900 XTX
            'rgb(255, 159, 64)',   // Orange - RX 7600
            'rgb(201, 203, 207)'   // Grey - Arc A770
        ];

        for (let i = 0; i < sampleCollections.length; i++) {
            const collection = sampleCollections[i];
            const gpus = await db.collection(collection).find({}).limit(1).toArray();

            if (gpus.length > 0) {
                const gpu = gpus[0];
                const modelName = collection.replace('gpus_', '').toUpperCase();

                // Since we only have one day of data, we'll show current price
                // In the future, this will show price trends over time
                gpuData.push({
                    label: modelName,
                    data: [gpu.currentPrice], // For now, just current price
                    borderColor: colors[i],
                    backgroundColor: colors[i] + '20', // Semi-transparent
                    tension: 0.1,
                    fill: false
                });

                console.log(`   📈 ${modelName}: $${gpu.currentPrice}`);
            }
        }

        // Chart configuration
        const chartWidth = 1200;
        const chartHeight = 700;

        const chartJSNodeCanvas = new ChartJSNodeCanvas({
            width: chartWidth,
            height: chartHeight,
            backgroundColour: 'white'
        });

        const configuration = {
            type: 'bar', // Using bar chart since we only have current prices
            data: {
                labels: ['Current Price (Sep 22, 2025)'], // Single time point for now
                datasets: gpuData
            },
            options: {
                responsive: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'GPU Price Comparison - Sample Models',
                        font: {
                            size: 20,
                            weight: 'bold'
                        },
                        padding: 20
                    },
                    legend: {
                        display: true,
                        position: 'right',
                        labels: {
                            font: {
                                size: 12
                            },
                            usePointStyle: true,
                            padding: 15
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Price (USD)',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            },
                            font: {
                                size: 11
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Date',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            font: {
                                size: 11
                            }
                        }
                    }
                },
                layout: {
                    padding: {
                        top: 20,
                        right: 20,
                        bottom: 20,
                        left: 20
                    }
                }
            }
        };

        console.log('🎨 Generating chart...');

        // Generate the chart
        const imageBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);

        // Save to file
        const outputPath = path.join(__dirname, '..', 'gpu_price_chart.png');
        fs.writeFileSync(outputPath, imageBuffer);

        console.log(`✅ Chart saved to: ${outputPath}`);

        // Also create a future version showing what it will look like with historical data
        await generateSampleHistoricalChart(chartJSNodeCanvas, gpuData);

        return outputPath;

    } catch (error) {
        console.error('❌ Error generating price graph:', error);
        throw error;
    }
}

async function generateSampleHistoricalChart(chartJSNodeCanvas, gpuData) {
    console.log('📈 Generating sample historical chart preview...');

    // Create mock historical data to show what the chart will look like over time
    const mockDates = [
        'Sep 15, 2025',
        'Sep 16, 2025',
        'Sep 17, 2025',
        'Sep 18, 2025',
        'Sep 19, 2025',
        'Sep 20, 2025',
        'Sep 21, 2025',
        'Sep 22, 2025'
    ];

    const historicalData = gpuData.map((gpu, index) => {
        const basePrice = gpu.data[0];
        const mockPrices = [];

        // Generate realistic price fluctuations
        for (let i = 0; i < mockDates.length; i++) {
            const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
            const price = Math.round(basePrice * (1 + variation));
            mockPrices.push(price);
        }

        return {
            ...gpu,
            data: mockPrices
        };
    });

    const historicalConfig = {
        type: 'line',
        data: {
            labels: mockDates,
            datasets: historicalData
        },
        options: {
            responsive: false,
            plugins: {
                title: {
                    display: true,
                    text: 'GPU Price Trends - Sample Historical Data (Preview)',
                    font: {
                        size: 20,
                        weight: 'bold'
                    },
                    padding: 20
                },
                legend: {
                    display: true,
                    position: 'right',
                    labels: {
                        font: {
                            size: 12
                        },
                        usePointStyle: true,
                        padding: 15
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Price (USD)',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        },
                        font: {
                            size: 11
                        }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Date',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        font: {
                            size: 11
                        }
                    }
                }
            },
            layout: {
                padding: {
                    top: 20,
                    right: 20,
                    bottom: 20,
                    left: 20
                }
            }
        }
    };

    const historicalImageBuffer = await chartJSNodeCanvas.renderToBuffer(historicalConfig);
    const historicalOutputPath = path.join(__dirname, '..', 'gpu_price_trends_preview.png');
    fs.writeFileSync(historicalOutputPath, historicalImageBuffer);

    console.log(`✅ Historical preview chart saved to: ${historicalOutputPath}`);
}

// Run the script if called directly
if (require.main === module) {
    generatePriceGraph()
        .then((outputPath) => {
            console.log('\\n🎉 Price graph generation completed!');
            console.log(`📊 Current prices chart: gpu_price_chart.png`);
            console.log(`📈 Historical preview chart: gpu_price_trends_preview.png`);
            process.exit(0);
        })
        .catch((error) => {
            console.error('\\n💥 Graph generation failed:', error);
            process.exit(1);
        });
}

module.exports = { generatePriceGraph };