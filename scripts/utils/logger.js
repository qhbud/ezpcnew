class Logger {
  static levels = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
  };

  static level = this.levels.INFO;

  static setLevel(level) {
    this.level = typeof level === 'string' ? this.levels[level.toUpperCase()] : level;
  }

  static error(message, ...args) {
    if (this.level >= this.levels.ERROR) {
      console.error(`❌ ${message}`, ...args);
    }
  }

  static warn(message, ...args) {
    if (this.level >= this.levels.WARN) {
      console.warn(`⚠️  ${message}`, ...args);
    }
  }

  static info(message, ...args) {
    if (this.level >= this.levels.INFO) {
      console.log(`ℹ️  ${message}`, ...args);
    }
  }

  static debug(message, ...args) {
    if (this.level >= this.levels.DEBUG) {
      console.log(`🔍 ${message}`, ...args);
    }
  }

  static success(message, ...args) {
    if (this.level >= this.levels.INFO) {
      console.log(`✅ ${message}`, ...args);
    }
  }

  static scraping(siteType, message, ...args) {
    if (this.level >= this.levels.INFO) {
      const emoji = this.getSiteEmoji(siteType);
      console.log(`${emoji} ${siteType}: ${message}`, ...args);
    }
  }

  static priceDebug(itemIndex, siteType, data) {
    if (this.level >= this.levels.DEBUG) {
      const emoji = this.getSiteEmoji(siteType);
      console.log(`🔍 ${siteType} Item ${itemIndex + 1} Price Debug:`);
      console.log(`   Title: ${data.title?.substring(0, 60) || 'No title'}...`);
      console.log(`   Price Element Found: ${data.priceElementFound ? 'Yes' : 'No'}`);
      if (data.priceElementFound) {
        console.log(`   Raw Price Text: "${data.rawPriceText}"`);
        console.log(`   Contains $ Symbol: ${data.containsDollar ? 'Yes' : 'No'}`);
        console.log(`   Extracted Price: $${data.extractedPrice}`);
        console.log(`   Price Element Classes: ${data.elementClasses}`);
        if (data.extractedPrice) {
          console.log(`   💰 Regular Price: $${data.extractedPrice} (no discount)`);
        } else {
          console.log(`   ❌ Skipped: No $ symbol found`);
        }
      }
    }
  }

  static getSiteEmoji(siteType) {
    const emojis = {
      newegg: '🛒',
      amazon: '📦',
      bestbuy: '🔵',
      microcenter: '🏪',
      generic: '🌐'
    };
    return emojis[siteType] || '🌐';
  }

  static summary(siteType, results) {
    if (this.level >= this.levels.INFO) {
      console.log(`\n📊 Scraping Results Summary:`);
      console.log(`   Site Type: ${siteType}`);
      console.log(`   Total Products Found: ${results.length}`);
      
      if (results.length > 0) {
        const prices = results.map(g => g.salePrice || g.basePrice).filter(p => p !== null);
        if (prices.length > 0) {
          console.log(`   Price Range: $${Math.min(...prices)} - $${Math.max(...prices)}`);
        }
        console.log(`   Products with Discounts: ${results.filter(g => g.isOnSale).length}`);
      }
    }
  }
}

module.exports = Logger;