module.exports = {
  // Site detection patterns
  sites: {
    newegg: {
      patterns: ['newegg.com'],
      selectors: {
        container: '.item-container, .item-cell',
        title: '.item-title, a[title]',
        price: '.price-current strong, .price, [class*="price"]',
        link: 'a',
        image: 'img'
      }
    },
    amazon: {
      patterns: ['amazon.com'],
      selectors: {
        containers: ['[data-component-type="s-search-result"]', 'div[data-asin]:not([data-asin=""])', '.s-result-item'],
        title: ['h2 span', 'h2 a span', '.a-size-medium', '.a-text-normal'],
        price: ['.a-price .a-offscreen', '.a-price-whole', '[class*="price"]'],
        link: 'a',
        image: 'img'
      }
    },
    bestbuy: {
      patterns: ['bestbuy.com'],
      selectors: {
        container: '.sr-item, .sku-item',
        title: '.sr-item-title a, .sku-title a',
        price: '.pricing-price__range, .sr-price',
        link: 'a',
        image: 'img'
      }
    },
    microcenter: {
      patterns: ['microcenter.com'],
      selectors: {
        container: '.productlist li, .product_wrapper',
        title: 'a[data-name], .pDescription a',
        price: '.price, [data-price]',
        link: 'a',
        image: 'img'
      }
    },
    generic: {
      patterns: [],
      selectors: {
        containers: ['article', '.product', '.item', '.card', '[class*="product"]', '[class*="item"]', '.result', '.listing'],
        title: ['h1', 'h2', 'h3', '[class*="title"]', '[class*="name"]'],
        price: ['[class*="price"]', '[class*="cost"]'],
        link: 'a',
        image: 'img'
      }
    }
  },

  // GPU filtering configurations
  filtering: {
    excludeVariants: {
      super: ['super', '4070 super', 'rtx 4070 super'],
      ti: [/\b4070\s+ti\b/i, /\brtx\s+4070\s+ti\b/i, /\bgeforce\s+rtx\s+4070\s+ti\b/i]
    },
    priceRange: {
      min: 200,
      max: 5000
    }
  },

  // Partner manufacturers
  partners: [
    'ASUS', 'MSI', 'Gigabyte', 'EVGA', 'Sapphire', 'PowerColor', 
    'XFX', 'ASRock', 'Zotac', 'PNY', 'Palit', 'Gainward', 'Inno3D'
  ],

  // Browser configuration
  browser: {
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    timeout: 30000
  },

  // Scraping limits
  limits: {
    maxProducts: 25,
    requestDelay: 1000
  }
};