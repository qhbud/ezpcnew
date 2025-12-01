const cliProgress = require('cli-progress');
const colors = require('colors');

class ProgressTracker {
  constructor() {
    this.bars = new Map();
    this.multibar = null;
  }

  // Initialize multibar container for multiple progress bars
  initializeMultibar() {
    if (!this.multibar) {
      this.multibar = new cliProgress.MultiBar({
        clearOnComplete: false,
        hideCursor: true,
        format: colors.cyan('{bar}') + ' | {percentage}% | {value}/{total} | {status} | ETA: {eta_formatted} | Elapsed: {duration_formatted}',
        barCompleteChar: '█',
        barIncompleteChar: '░',
        barGlue: '',
        barsize: 30,
        stopOnComplete: true
      }, cliProgress.Presets.shades_classic);
    }
    return this.multibar;
  }

  // Create a new progress bar
  createProgressBar(id, total, initialValue = 0, status = 'Starting...') {
    if (!this.multibar) {
      this.initializeMultibar();
    }

    const bar = this.multibar.create(total, initialValue, {
      status: status,
      id: id
    });

    this.bars.set(id, bar);
    return bar;
  }

  // Update progress bar
  updateProgress(id, value, status = null) {
    const bar = this.bars.get(id);
    if (bar) {
      const payload = {};
      if (status) {
        payload.status = status;
      }
      bar.update(value, payload);
    }
  }

  // Increment progress bar
  incrementProgress(id, increment = 1, status = null) {
    const bar = this.bars.get(id);
    if (bar) {
      const payload = {};
      if (status) {
        payload.status = status;
      }
      bar.increment(increment, payload);
    }
  }

  // Complete a progress bar
  completeProgress(id, finalStatus = 'Completed') {
    const bar = this.bars.get(id);
    if (bar) {
      bar.update(bar.getTotal(), { status: finalStatus });
    }
  }

  // Stop and remove a progress bar
  stopProgress(id) {
    const bar = this.bars.get(id);
    if (bar) {
      this.multibar.remove(bar);
      this.bars.delete(id);
    }
  }

  // Stop all progress bars
  stopAll() {
    if (this.multibar) {
      this.multibar.stop();
      this.bars.clear();
      this.multibar = null;
    }
  }

  // Get current progress info
  getProgress(id) {
    const bar = this.bars.get(id);
    if (bar) {
      return {
        current: bar.value,
        total: bar.getTotal(),
        percentage: Math.round((bar.value / bar.getTotal()) * 100)
      };
    }
    return null;
  }

  // Create a simple single progress bar (for non-parallel operations)
  createSimpleBar(total, format = null) {
    const defaultFormat = colors.green('{bar}') + ' | {percentage}% | {value}/{total} | {status} | ETA: {eta_formatted}';
    
    return new cliProgress.SingleBar({
      format: format || defaultFormat,
      barCompleteChar: '█',
      barIncompleteChar: '░',
      barGlue: '',
      barsize: 40,
      hideCursor: true
    }, cliProgress.Presets.shades_classic);
  }

  // Format status messages with colors
  static formatStatus(type, message) {
    switch (type) {
      case 'success':
        return colors.green(message);
      case 'warning':
        return colors.yellow(message);
      case 'error':
        return colors.red(message);
      case 'info':
        return colors.cyan(message);
      case 'processing':
        return colors.blue(message);
      case 'blocked':
        return colors.magenta(message);
      case 'retry':
        return colors.orange(message);
      default:
        return message;
    }
  }

  // Create specialized GPU import progress bars
  createGpuImportBars() {
    const bars = {
      overall: this.createProgressBar('overall', 100, 0, 'Initializing...'),
      currentModel: this.createProgressBar('current', 100, 0, 'Waiting...'),
      products: this.createProgressBar('products', 100, 0, 'Waiting...')
    };
    return bars;
  }

  // Update GPU import progress with stats
  updateGpuProgress(modelIndex, totalModels, modelName, productIndex = 0, totalProducts = 0, status = 'Processing') {
    // Update overall progress
    const overallProgress = Math.round((modelIndex / totalModels) * 100);
    this.updateProgress('overall', overallProgress, 
      `Model ${modelIndex + 1}/${totalModels}: ${modelName}`);

    // Update current model progress if products info is provided
    if (totalProducts > 0) {
      const modelProgress = Math.round((productIndex / totalProducts) * 100);
      this.updateProgress('current', modelProgress, 
        `${status} - Product ${productIndex}/${totalProducts}`);
    }
  }

  // Show summary stats
  static displaySummary(stats) {
    console.log('\n' + '='.repeat(80));
    console.log(colors.cyan.bold('📊 IMPORT SUMMARY'));
    console.log('='.repeat(80));
    
    const successRate = stats.total > 0 ? Math.round((stats.successful / stats.total) * 100) : 0;
    
    console.log(`Total Models Processed: ${colors.white.bold(stats.total)}`);
    console.log(`✅ Successful: ${colors.green.bold(stats.successful)} (${colors.green(successRate + '%')})`);
    console.log(`❌ Failed: ${colors.red.bold(stats.failed)} (${colors.red((100 - successRate) + '%')})`);
    
    if (stats.blocked) {
      console.log(`🚫 Blocked by Amazon: ${colors.magenta.bold(stats.blocked)}`);
    }
    
    if (stats.duration) {
      const minutes = Math.floor(stats.duration / 60000);
      const seconds = Math.floor((stats.duration % 60000) / 1000);
      console.log(`⏱️  Total Time: ${colors.yellow(`${minutes}m ${seconds}s`)}`);
    }
    
    console.log('='.repeat(80));
  }
}

module.exports = ProgressTracker;