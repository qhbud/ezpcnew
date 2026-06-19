const { connectToDatabase, getDatabase } = require('../config/database');
const { RiverSearchPriceDetector } = require('./riverSearchPriceDetection');
const colors = require('colors');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

// This will be populated dynamically to include all CPU sub-collections
let COMPONENT_COLLECTIONS = [];

const PROGRESS_FILE = path.join(__dirname, '.update_progress.json');

// Optional CLI flag: restrict the run to a single collection, e.g.
//   node scripts/updateAllComponentPrices.js --collection=gpus
// Used by the GitHub Actions per-collection matrix so each component type gets
// its own parallel job, log, and pass/fail signal (and finishes well within limits).
const ONLY_COLLECTION = (process.argv.slice(2).find(a => a.startsWith('--collection=')) || '').split('=')[1] || null;

class AllComponentPriceUpdater {
    constructor() {
        this.priceDetector = null;
        this.stats = {
            total: 0,
            updated: 0,
            failed: 0,
            skipped: 0
        };
        this.collectionStats = {}; // Store stats per collection
        this.paused = false;
        this.cancelled = false;
        this.currentCollection = null;
        this.currentIndex = 0;
        this.originalSleepSettings = null;
        this.processedComponents = new Set(); // Track processed component IDs
        this.setupKeyboardListener();
    }

    setupKeyboardListener() {
        // Enable raw mode to capture keypresses
        if (process.stdin.isTTY) {
            readline.emitKeypressEvents(process.stdin);
            process.stdin.setRawMode(true);

            process.stdin.on('keypress', (str, key) => {
                if (key && key.name === 'p') {
                    this.togglePause();
                } else if (key && key.ctrl && key.name === 'c') {
                    this.handleCancel();
                }
            });
        }
    }

    togglePause() {
        this.paused = !this.paused;
        if (this.paused) {
            console.log('\n⏸️  PAUSED - Press P to resume, Ctrl+C to save and exit'.yellow.bold);
        } else {
            console.log('\n▶️  RESUMED'.green.bold);
        }
    }

    async handleCancel() {
        console.log('\n\n🛑 Cancelling and saving progress...'.yellow.bold);
        this.cancelled = true;
        await this.saveProgress();
        await this.cleanup();
        process.exit(0);
    }

    async saveProgress() {
        try {
            const progress = {
                timestamp: new Date().toISOString(),
                currentCollection: this.currentCollection,
                currentIndex: this.currentIndex,
                processedComponents: Array.from(this.processedComponents),
                stats: this.stats,
                collectionStats: this.collectionStats
            };

            await fs.writeFile(PROGRESS_FILE, JSON.stringify(progress, null, 2));
            console.log('💾 Progress saved to'.green, PROGRESS_FILE);
        } catch (error) {
            console.error('❌ Failed to save progress:'.red, error.message);
        }
    }

    async loadProgress() {
        try {
            const data = await fs.readFile(PROGRESS_FILE, 'utf8');
            const progress = JSON.parse(data);

            console.log('\n📂 Found previous progress from:'.cyan, progress.timestamp);
            console.log(`   Collection: ${progress.currentCollection}`);
            console.log(`   Processed: ${progress.processedComponents.length} components`);

            this.processedComponents = new Set(progress.processedComponents);
            this.stats = progress.stats;
            this.collectionStats = progress.collectionStats;

            return progress;
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error('⚠️  Could not load progress:'.yellow, error.message);
            }
            return null;
        }
    }

    async clearProgress() {
        try {
            await fs.unlink(PROGRESS_FILE);
            console.log('🗑️  Progress file cleared'.gray);
        } catch (error) {
            // File doesn't exist, that's fine
        }
    }

    async preventSystemSleep() {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);

        try {
            console.log('🛡️  Preventing system sleep...'.cyan);

            // Get current sleep settings to restore later
            const { stdout: acSettings } = await execAsync('powercfg /query SCHEME_CURRENT SUB_SLEEP STANDBYIDLE');
            const { stdout: dcSettings } = await execAsync('powercfg /query SCHEME_CURRENT SUB_SLEEP STANDBYIDLE');

            this.originalSleepSettings = { acSettings, dcSettings };

            // Disable sleep on AC power (plugged in)
            await execAsync('powercfg /change standby-timeout-ac 0');

            // Disable sleep on DC power (battery)
            await execAsync('powercfg /change standby-timeout-dc 0');

            console.log('✅ System sleep prevented - computer will stay awake\n'.green);
        } catch (error) {
            console.log('⚠️  Could not prevent system sleep (non-critical):'.yellow, error.message);
        }
    }

    async restoreSystemSleep() {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);

        try {
            console.log('\n🔄 Restoring original sleep settings...'.cyan);

            // Restore sleep settings (set to 30 minutes as a safe default)
            // You can adjust these values or restore from originalSleepSettings if needed
            await execAsync('powercfg /change standby-timeout-ac 30');
            await execAsync('powercfg /change standby-timeout-dc 15');

            console.log('✅ Sleep settings restored\n'.green);
        } catch (error) {
            console.log('⚠️  Could not restore sleep settings:'.yellow, error.message);
        }
    }

    async initialize() {
        // Prevent system sleep first
        await this.preventSystemSleep();

        await connectToDatabase();
        this.db = getDatabase();

        // Load previous progress if exists
        const previousProgress = await this.loadProgress();

        // Dynamically discover all collections
        const allCollections = await this.db.listCollections().toArray();
        const collectionNames = allCollections.map(col => col.name);

        // Filter out system collections (those starting with 'system.')
        const componentCollectionNames = collectionNames.filter(name =>
            !name.startsWith('system.')
        );

        // All CPUs now live in the single `cpus` collection (migrated from per-model
        // cpus_* subcollections; original group preserved in the `modelCollection` field).
        const cpuCollections = componentCollectionNames.filter(name =>
            name === 'cpus'
        );

        // GPUs are now consolidated into a single `gpus` collection (like CPUs).
        // Prefer it; fall back to the legacy per-model `gpus_*` shards only if `gpus`
        // doesn't exist yet, so a card is never updated twice during a transition.
        const gpuCollections = componentCollectionNames.includes('gpus')
            ? ['gpus']
            : componentCollectionNames.filter(name => name.startsWith('gpus_'));

        // Get other component collections, prioritizing addons and cases
        const priorityCollections = ['addons', 'cases'].filter(name => componentCollectionNames.includes(name));
        const otherCollections = componentCollectionNames.filter(name =>
            !name.startsWith('cpus') &&
            !name.startsWith('gpus') &&
            name !== 'addons' &&
            name !== 'cases'
        );

        // Combine all collections with priority order: addons/cases first, then CPUs, GPUs, then others
        COMPONENT_COLLECTIONS = [...priorityCollections, ...cpuCollections, ...gpuCollections, ...otherCollections];

        // Restrict to a single collection if --collection=<name> was passed (CI per-collection jobs).
        // `--collection=gpus` is a GROUP selector: GPUs are sharded across many `gpus_*`
        // collections, so expand it to every GPU shard rather than requiring a literal match.
        if (ONLY_COLLECTION) {
            COMPONENT_COLLECTIONS = COMPONENT_COLLECTIONS.filter(name =>
                ONLY_COLLECTION === 'gpus'
                    ? (name === 'gpus' || name.startsWith('gpus_'))
                    : name === ONLY_COLLECTION
            );
            if (COMPONENT_COLLECTIONS.length === 0) {
                console.error(`❌ Collection "${ONLY_COLLECTION}" not found in database`.red);
                process.exit(1);
            }
            console.log(`🎯 Restricting this run to a single collection: ${ONLY_COLLECTION}`.cyan.bold);
        }

        console.log(`✅ Found ${COMPONENT_COLLECTIONS.length} collection(s) to update`.green);
        console.log(`   🔥 Priority collections: ${priorityCollections.length} (${priorityCollections.join(', ')})`.yellow.bold);
        console.log(`   CPU collections: ${cpuCollections.length}`.gray);
        console.log(`   GPU collections: ${gpuCollections.length}`.gray);
        console.log(`   Other collections: ${otherCollections.length} (${otherCollections.join(', ')})\n`.gray);

        this.priceDetector = new RiverSearchPriceDetector();
        await this.priceDetector.initialize();
        console.log('✅ Initialized price detector\n'.green);

        // Setup keyboard controls
        this.setupControls();
    }

    setupControls() {
        console.log('═'.repeat(70).yellow);
        console.log('⌨️  CONTROLS:'.yellow.bold);
        console.log('   Press Ctrl+C to cancel and save progress'.yellow);
        console.log('   Press P to pause/resume'.yellow);
        console.log('═'.repeat(70).yellow + '\n');

        // Setup stdin for interactive controls
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(true);
            process.stdin.resume();
            process.stdin.setEncoding('utf8');

            process.stdin.on('data', (key) => {
                // Ctrl+C
                if (key === '\u0003') {
                    this.handleCancel();
                }
                // P key
                else if (key.toLowerCase() === 'p') {
                    this.togglePause();
                }
            });
        }

        // Handle Ctrl+C gracefully
        process.on('SIGINT', () => {
            this.handleCancel();
        });
    }

    togglePause() {
        this.paused = !this.paused;
        if (this.paused) {
            console.log('\n⏸️  PAUSED - Press P to resume or Ctrl+C to cancel\n'.yellow.bold);
        } else {
            console.log('\n▶️  RESUMED\n'.green.bold);
        }
    }

    async handleCancel() {
        console.log('\n\n🛑 CANCELLATION REQUESTED'.red.bold);
        console.log('Saving progress and cleaning up...\n'.yellow);

        this.cancelled = true;

        // Save progress
        await this.saveProgress();

        // Cleanup and exit
        await this.cleanup();

        console.log('\n✅ Progress saved. You can resume later.\n'.green);
        process.exit(0);
    }

    async waitIfPaused() {
        while (this.paused && !this.cancelled) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (this.cancelled) {
            throw new Error('Cancelled by user');
        }
    }

    async updateCollection(collectionName, retryFailedOnly = false) {
        this.currentCollection = collectionName;

        console.log('='.repeat(70).cyan);
        if (retryFailedOnly) {
            console.log(`🔄 RETRYING FAILED COMPONENTS IN: ${collectionName.toUpperCase()}`.cyan.bold);
        } else {
            console.log(`📦 UPDATING COLLECTION: ${collectionName.toUpperCase()}`.cyan.bold);
        }
        console.log('='.repeat(70).cyan);

        const collection = this.db.collection(collectionName);

        // Build query based on retry mode
        let query;
        if (retryFailedOnly) {
            // Only get components that failed in previous update
            query = {
                updateFailed: true,
                $or: [
                    { sourceUrl: { $exists: true, $ne: null, $ne: '' } },
                    { url: { $exists: true, $ne: null, $ne: '' } }
                ]
            };
        } else {
            // Get all components with source URLs
            query = {
                $or: [
                    { sourceUrl: { $exists: true, $ne: null, $ne: '' } },
                    { url: { $exists: true, $ne: null, $ne: '' } }
                ]
            };
        }

        const components = await collection.find(query).toArray();

        console.log(`Found ${components.length} components with URLs\n`.yellow);

        if (components.length === 0) {
            console.log(`⚠️  No components found with URLs in ${collectionName}\n`.yellow);
            return;
        }

        // Sort components by price history length (fewest snapshots first)
        // This prioritizes components that need updates the most
        components.sort((a, b) => {
            const aHistoryLength = (a.priceHistory || []).length;
            const bHistoryLength = (b.priceHistory || []).length;
            return aHistoryLength - bHistoryLength; // Ascending order (fewest first)
        });

        // Calculate how many components are in the bottom 10% (highest priority)
        const highPriorityCount = Math.ceil(components.length * 0.1);
        console.log(`📊 Priority sorting: ${highPriorityCount} components have fewest price snapshots (bottom 10%)\n`.cyan);

        let collectionStats = {
            total: components.length,
            updated: 0,
            failed: 0,
            skipped: 0,
            current: 0,
            highPriority: 0
        };

        for (let i = 0; i < components.length; i++) {
            const component = components[i];
            const isHighPriority = i < highPriorityCount;
            // Check for pause/cancel
            await this.waitIfPaused();

            if (this.cancelled) {
                console.log('\n⚠️  Update cancelled by user\n'.yellow);
                return;
            }

            // Skip already processed components
            const componentId = component._id.toString();
            if (this.processedComponents.has(componentId)) {
                console.log(`⏭️  Skipping already processed: ${component.name || component.title}`.gray);
                collectionStats.skipped++;
                continue;
            }

            collectionStats.current++;
            this.currentIndex = collectionStats.current;
            const remaining = collectionStats.total - collectionStats.current;

            // Get URL from either sourceUrl or url field
            const componentUrl = component.sourceUrl || component.url;

            // Get price history info
            const priceHistoryLength = (component.priceHistory || []).length;
            const priorityLabel = isHighPriority ? '⭐ HIGH PRIORITY' : '';

            console.log(`\n[${ collectionStats.current}/${collectionStats.total}] ${remaining} remaining ${priorityLabel}`.gray);
            console.log(`Component: ${component.name || component.title}`.cyan);
            console.log(`Price snapshots: ${priceHistoryLength}`.gray);
            console.log(`URL: ${componentUrl}`.gray);

            if (isHighPriority) {
                collectionStats.highPriority++;
            }

            try {
                // Detect price
                const priceData = await this.priceDetector.detectPrice(componentUrl);

                // Prepare update data - we always update even if detection "failed"
                const updateData = {
                    updatedAt: new Date(),
                    lastPriceCheck: new Date(),
                    priceDetectionMethod: priceData.detectionMethod || 'failed',
                    isAvailable: priceData.isAvailable || false,
                    updateFailed: false,  // Clear failed flag on successful check
                    lastUpdateError: null  // Clear error message
                };

                // Handle price history
                const currentPriceHistory = component.priceHistory || [];

                // Case 1: Price detection succeeded and product is available
                if (priceData.success && priceData.isAvailable) {
                    const newPrice = priceData.currentPrice;
                    updateData.currentPrice = newPrice;
                    updateData.price = newPrice;

                    if (priceData.isOnSale) {
                        updateData.isOnSale = true;
                        updateData.basePrice = priceData.basePrice;
                        updateData.salePrice = priceData.salePrice;
                    } else {
                        updateData.isOnSale = false;
                        updateData.basePrice = newPrice;
                        updateData.salePrice = null;
                    }

                    // Add to price history
                    currentPriceHistory.push({
                        price: newPrice,
                        date: new Date(),
                        source: componentUrl,
                        detectionMethod: priceData.detectionMethod,
                        isAvailable: true
                    });

                    updateData.priceHistory = currentPriceHistory;

                    console.log(`✅ Price: $${newPrice.toFixed(2)}`.green);
                    if (priceData.isOnSale) {
                        const discount = Math.round(((priceData.basePrice - priceData.salePrice) / priceData.basePrice) * 100);
                        console.log(`🏷️  ON SALE! ${discount}% OFF (was $${priceData.basePrice.toFixed(2)})`.green.bold);
                    }
                }
                // Case 2: Price detection succeeded but product is unavailable
                else if (priceData.success && !priceData.isAvailable) {
                    updateData.currentPrice = null;
                    updateData.price = null;
                    updateData.isAvailable = false;

                    // Add unavailable entry to price history
                    currentPriceHistory.push({
                        price: null,
                        date: new Date(),
                        source: componentUrl,
                        detectionMethod: priceData.detectionMethod,
                        isAvailable: false
                    });

                    updateData.priceHistory = currentPriceHistory;
                    console.log(`⚠️  Product unavailable`.yellow);
                }
                // Case 3: Price detection failed (page didn't load, price not found, etc.)
                // Still considered successful because we checked the product
                else {
                    updateData.currentPrice = null;
                    updateData.price = null;
                    updateData.isAvailable = false;

                    // Add failed detection entry to price history
                    currentPriceHistory.push({
                        price: null,
                        date: new Date(),
                        source: componentUrl,
                        detectionMethod: 'detection_failed',
                        isAvailable: false,
                        note: 'Price detection failed - product may be delisted or unavailable'
                    });

                    updateData.priceHistory = currentPriceHistory;
                    console.log(`❌ Could not detect price (product likely delisted/unavailable)`.red);
                }

                // Update in database - ALL cases are considered successful checks
                await collection.updateOne(
                    { _id: component._id },
                    { $set: updateData }
                );

                // Mark component as processed
                this.processedComponents.add(componentId);

                collectionStats.updated++;
                this.stats.updated++;
                this.stats.total++;

                // Periodically save progress (every 10 components)
                if (this.stats.total % 10 === 0) {
                    await this.saveProgress();
                }

                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 2000));

            } catch (error) {
                // Only catastrophic errors (code crashes, network failures) count as failures
                console.log(`❌ CRITICAL ERROR: ${error.message}`.red.bold);

                // Mark component as failed for retry
                try {
                    await collection.updateOne(
                        { _id: component._id },
                        {
                            $set: {
                                updateFailed: true,
                                lastUpdateError: error.message,
                                lastUpdateAttempt: new Date()
                            }
                        }
                    );
                } catch (updateError) {
                    console.log(`⚠️  Could not mark component as failed: ${updateError.message}`.yellow);
                }

                collectionStats.failed++;
                this.stats.failed++;
                this.stats.total++;
            }
        }

        // Store collection stats for final report
        this.collectionStats[collectionName] = {
            total: collectionStats.total,
            updated: collectionStats.updated,
            failed: collectionStats.failed,
            highPriority: collectionStats.highPriority
        };

        // Collection summary
        const successRate = collectionStats.total > 0
            ? ((collectionStats.updated / collectionStats.total) * 100).toFixed(1)
            : '0.0';

        console.log(`\n${'='.repeat(70)}`.cyan);
        console.log(`📊 ${collectionName.toUpperCase()} SUMMARY`.cyan.bold);
        console.log(`${'='.repeat(70)}`.cyan);
        console.log(`Total: ${collectionStats.total}`.white);
        console.log(`⭐ High Priority (bottom 10%): ${collectionStats.highPriority}`.yellow);
        console.log(`✅ Updated: ${collectionStats.updated}`.green);
        console.log(`❌ Failed: ${collectionStats.failed}`.red);
        console.log(`📈 Success Rate: ${successRate}%`.yellow);
        console.log(`${'='.repeat(70)}\n`.cyan);
    }

    async updateAll() {
        console.log('\n🚀 STARTING COMPREHENSIVE PRICE UPDATE\n'.cyan.bold);

        const startTime = Date.now();
        this.completedCollections = [];

        // FIRST PASS: Retry all previously failed components
        console.log('═'.repeat(70).yellow);
        console.log('🔄 PHASE 1: RETRYING PREVIOUSLY FAILED COMPONENTS'.yellow.bold);
        console.log('═'.repeat(70).yellow + '\n');

        for (const collectionName of COMPONENT_COLLECTIONS) {
            if (this.cancelled) {
                console.log('\n⚠️  Update cancelled. Progress has been saved.\n'.yellow);
                break;
            }

            try {
                await this.updateCollection(collectionName, true); // retry mode
            } catch (error) {
                if (error.message === 'Cancelled by user') {
                    console.log('\n⚠️  Update cancelled. Progress has been saved.\n'.yellow);
                    break;
                }
                console.log(`\n❌ Error retrying failed components in ${collectionName}: ${error.message}\n`.red);
            }
        }

        if (!this.cancelled) {
            console.log('\n' + '═'.repeat(70).cyan);
            console.log('📦 PHASE 2: REGULAR UPDATE OF ALL COLLECTIONS'.cyan.bold);
            console.log('═'.repeat(70).cyan + '\n');
        }

        // SECOND PASS: Regular update of all collections
        for (const collectionName of COMPONENT_COLLECTIONS) {
            if (this.cancelled) {
                console.log('\n⚠️  Update cancelled. Progress has been saved.\n'.yellow);
                break;
            }

            try {
                await this.updateCollection(collectionName, false); // regular mode
                this.completedCollections.push(collectionName);
            } catch (error) {
                if (error.message === 'Cancelled by user') {
                    console.log('\n⚠️  Update cancelled. Progress has been saved.\n'.yellow);
                    break;
                }
                console.log(`\n❌ Error updating ${collectionName}: ${error.message}\n`.red);
            }
        }

        const endTime = Date.now();
        const duration = Math.round((endTime - startTime) / 1000);
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;

        // Final summary
        const statusEmoji = this.cancelled ? '⚠️' : '🎉';
        const statusColor = this.cancelled ? 'yellow' : 'green';
        const statusText = this.cancelled ? 'PARTIAL SUMMARY (CANCELLED)' : 'FINAL SUMMARY';

        console.log('\n' + '='.repeat(70)[statusColor]);
        console.log(`${statusEmoji} ${statusText}`[statusColor].bold);
        console.log('='.repeat(70)[statusColor]);
        console.log(`Collections processed: ${this.completedCollections.length}/${COMPONENT_COLLECTIONS.length}`.white);
        console.log(`Total components processed: ${this.stats.total}`.white);
        console.log(`✅ Successfully updated: ${this.stats.updated}`.green);
        console.log(`❌ Failed: ${this.stats.failed}`.red);
        console.log(`⏱️  Time taken: ${minutes}m ${seconds}s`.yellow);
        console.log('='.repeat(70)[statusColor]);

        // Detailed collection breakdown
        console.log(`\n📊 DETAILED STATUS REPORT BY COLLECTION`.cyan.bold);
        console.log('='.repeat(70).cyan);

        // Group collections by type
        const cpuCollections = Object.keys(this.collectionStats).filter(name => name.startsWith('cpu'));
        const gpuCollections = Object.keys(this.collectionStats).filter(name => name.startsWith('gpu'));
        const otherCollections = Object.keys(this.collectionStats).filter(name =>
            !name.startsWith('cpu') && !name.startsWith('gpu')
        );

        // Display CPU collections
        if (cpuCollections.length > 0) {
            console.log(`\n💻 CPU COLLECTIONS:`.white.bold);
            cpuCollections.forEach(name => {
                this.printCollectionStatus(name);
            });
        }

        // Display GPU collections
        if (gpuCollections.length > 0) {
            console.log(`\n🎮 GPU COLLECTIONS:`.white.bold);
            gpuCollections.forEach(name => {
                this.printCollectionStatus(name);
            });
        }

        // Display other collections
        if (otherCollections.length > 0) {
            console.log(`\n🔧 OTHER COMPONENTS:`.white.bold);
            otherCollections.forEach(name => {
                this.printCollectionStatus(name);
            });
        }

        console.log('\n' + '='.repeat(70).cyan);

        // Overall success rate
        const overallSuccessRate = this.stats.total > 0
            ? ((this.stats.updated / this.stats.total) * 100).toFixed(1)
            : '0.0';

        console.log(`\n📈 OVERALL SUCCESS RATE: ${overallSuccessRate}%`.yellow.bold);

        if (this.cancelled) {
            console.log(`\n💾 Progress saved to ${PROGRESS_FILE}`.cyan);
            console.log(`   Run the script again to resume from where you left off`.cyan);
        } else {
            // Update completed successfully, clear progress file
            await this.clearProgress();
        }

        console.log('='.repeat(70)[statusColor] + '\n');
    }

    printCollectionStatus(collectionName) {
        const stats = this.collectionStats[collectionName];
        const successRate = stats.total > 0
            ? ((stats.updated / stats.total) * 100).toFixed(1)
            : '0.0';

        // Color code based on success rate
        let rateColor = 'red';
        if (parseFloat(successRate) >= 90) rateColor = 'green';
        else if (parseFloat(successRate) >= 70) rateColor = 'yellow';

        const percentDisplay = `${successRate}%`[rateColor].bold;
        const collectionDisplay = collectionName.padEnd(20);

        console.log(`   ${collectionDisplay} ${stats.updated}/${stats.total} (${percentDisplay})`);
    }

    async cleanup() {
        // Restore terminal
        if (process.stdin.isTTY) {
            try {
                process.stdin.setRawMode(false);
                process.stdin.pause();
            } catch (e) {
                // Ignore errors during cleanup
            }
        }

        if (this.priceDetector) {
            await this.priceDetector.cleanup();
        }

        // Restore system sleep settings
        await this.restoreSystemSleep();
    }
}

async function main() {
    const updater = new AllComponentPriceUpdater();

    try {
        await updater.initialize();
        await updater.updateAll();
    } catch (error) {
        if (error.message !== 'Cancelled by user') {
            console.error('❌ Fatal error:'.red, error);
        }
    } finally {
        await updater.cleanup();

        // Exit with appropriate code
        const exitCode = updater.cancelled ? 130 : 0;
        process.exit(exitCode);
    }
}

if (require.main === module) {
    main();
}

module.exports = { AllComponentPriceUpdater };
