const puppeteer = require('puppeteer');
const Logger = require('./logger');

class StealthMode {
  constructor() {
    this.sessions = new Map(); // Store session data per worker
    this.proxyPool = this.getProxyPool();
    this.currentProxyIndex = 0;
  }

  // Get free proxy pool (you can add paid proxies here for better results)
  getProxyPool() {
    // Note: These are example proxies - in production you'd want to use paid proxy services
    // or residential proxies for better success rates
    return [
      // Add your proxy servers here
      // { host: 'proxy1.example.com', port: 8080, username: 'user', password: 'pass' },
      // For now, we'll rely on other stealth techniques
    ];
  }

  // Advanced browser fingerprint randomization
  async setupStealthBrowser(browser, workerId = 'default') {
    const context = await browser.createIncognitoBrowserContext();
    const page = await context.newPage();
    
    // Store session for this worker
    this.sessions.set(workerId, {
      context,
      page,
      startTime: Date.now(),
      requestCount: 0,
      lastActivityTime: Date.now()
    });

    await this.applyAdvancedStealth(page, workerId);
    return page;
  }

  async applyAdvancedStealth(page, workerId) {
    Logger.info(`🥷 Applying advanced stealth mode for worker ${workerId}...`);

    // 1. Advanced User Agent with realistic browser features
    const userAgents = [
      {
        ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        platform: 'Win32',
        vendor: 'Google Inc.',
        language: 'en-US'
      },
      {
        ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        platform: 'MacIntel',
        vendor: 'Google Inc.',
        language: 'en-US'
      },
      {
        ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
        platform: 'Win32',
        vendor: '',
        language: 'en-US'
      },
      {
        ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/121.0',
        platform: 'MacIntel',
        vendor: '',
        language: 'en-US'
      }
    ];

    const selectedAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    await page.setUserAgent(selectedAgent.ua);

    // 2. Realistic viewport with common resolutions
    const viewports = [
      { width: 1920, height: 1080 }, // Full HD
      { width: 1366, height: 768 },  // Common laptop
      { width: 1440, height: 900 },  // MacBook Pro
      { width: 1536, height: 864 },  // Scaled HD
      { width: 1600, height: 900 },  // Widescreen
    ];
    const viewport = viewports[Math.floor(Math.random() * viewports.length)];
    await page.setViewport({
      width: viewport.width + Math.floor(Math.random() * 50),
      height: viewport.height + Math.floor(Math.random() * 50),
      deviceScaleFactor: 1,
      hasTouch: false,
      isLandscape: true,
      isMobile: false
    });

    // 3. Enhanced HTTP headers
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': `${selectedAgent.language},en;q=0.9`,
      'Cache-Control': 'max-age=0',
      'DNT': '1',
      'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': `"${selectedAgent.platform === 'Win32' ? 'Windows' : 'macOS'}"`,
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'User-Agent': selectedAgent.ua
    });

    // 4. Browser fingerprint protection
    await page.evaluateOnNewDocument((agentData) => {
      // Override navigator properties
      Object.defineProperty(navigator, 'platform', { get: () => agentData.platform });
      Object.defineProperty(navigator, 'vendor', { get: () => agentData.vendor });
      Object.defineProperty(navigator, 'language', { get: () => agentData.language });
      Object.defineProperty(navigator, 'languages', { get: () => [agentData.language, 'en'] });

      // Randomize hardware concurrency
      Object.defineProperty(navigator, 'hardwareConcurrency', { 
        get: () => Math.floor(Math.random() * 8) + 4 // 4-12 cores
      });

      // Randomize device memory
      Object.defineProperty(navigator, 'deviceMemory', { 
        get: () => [4, 8, 16, 32][Math.floor(Math.random() * 4)]
      });

      // Override screen properties with realistic values
      const screenWidth = window.screen.width + Math.floor(Math.random() * 100);
      const screenHeight = window.screen.height + Math.floor(Math.random() * 100);
      Object.defineProperty(screen, 'width', { get: () => screenWidth });
      Object.defineProperty(screen, 'height', { get: () => screenHeight });
      Object.defineProperty(screen, 'availWidth', { get: () => screenWidth });
      Object.defineProperty(screen, 'availHeight', { get: () => screenHeight - 40 }); // Account for taskbar

      // Hide automation indicators
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      delete navigator.__proto__.webdriver;

      // Override plugins with realistic values
      Object.defineProperty(navigator, 'plugins', {
        get: () => ({
          length: Math.floor(Math.random() * 5) + 3,
          0: { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
          1: { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
          2: { name: 'Native Client', filename: 'internal-nacl-plugin' }
        })
      });

      // Randomize timezone
      const timezones = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Toronto'];
      Intl.DateTimeFormat = function(...args) {
        return new Intl.DateTimeFormat('en-US', { timeZone: timezones[Math.floor(Math.random() * timezones.length)] });
      };

      // Mock realistic WebGL
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) return 'Intel Inc.'; // UNMASKED_VENDOR_WEBGL
        if (parameter === 37446) return 'Intel(R) Iris(TM) Graphics 6100'; // UNMASKED_RENDERER_WEBGL
        return getParameter.call(this, parameter);
      };

    }, selectedAgent);

    // 5. Cookie and session management
    await this.setupSessionCookies(page, workerId);

    // 6. Request interception for additional stealth
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const session = this.sessions.get(workerId);
      if (session) {
        session.requestCount++;
        session.lastActivityTime = Date.now();
      }

      // Block unnecessary resources to speed up and reduce detection
      const resourceType = request.resourceType();
      if (['image', 'stylesheet', 'font', 'other'].includes(resourceType)) {
        request.abort();
      } else {
        // Add random delays to requests
        if (Math.random() < 0.1) { // 10% of requests get a small delay
          setTimeout(() => request.continue(), Math.random() * 200 + 50);
        } else {
          request.continue();
        }
      }
    });

    Logger.success(`✅ Advanced stealth mode applied for worker ${workerId}`);
  }

  // Setup realistic session cookies
  async setupSessionCookies(page, workerId) {
    const cookies = [
      {
        name: 'session-id',
        value: this.generateRandomId(32),
        domain: '.amazon.com',
        httpOnly: true,
        secure: true
      },
      {
        name: 'session-id-time',
        value: Date.now().toString(),
        domain: '.amazon.com',
        httpOnly: true,
        secure: true
      },
      {
        name: 'ubid-main',
        value: this.generateRandomId(20),
        domain: '.amazon.com',
        httpOnly: true,
        secure: true
      },
      {
        name: 'x-main',
        value: this.generateRandomString(10),
        domain: '.amazon.com',
        httpOnly: false,
        secure: true
      }
    ];

    try {
      await page.setCookie(...cookies);
      Logger.debug(`🍪 Set ${cookies.length} session cookies for worker ${workerId}`);
    } catch (error) {
      Logger.warn(`⚠️ Could not set cookies: ${error.message}`);
    }
  }

  // Simulate realistic human browsing behavior
  async simulateHumanBehavior(page, workerId) {
    const session = this.sessions.get(workerId);
    if (!session) return;

    Logger.debug(`🤖 Simulating human behavior for worker ${workerId}...`);

    // Random mouse movements
    await this.randomMouseMovement(page);

    // Random scroll behavior
    if (Math.random() < 0.3) { // 30% chance
      await this.randomScroll(page);
    }

    // Occasional pauses (like reading)
    if (Math.random() < 0.2) { // 20% chance
      const pauseTime = Math.random() * 3000 + 1000; // 1-4 seconds
      Logger.debug(`⏸️ Human-like reading pause: ${Math.round(pauseTime/1000)}s`);
      await new Promise(resolve => setTimeout(resolve, pauseTime));
    }
  }

  // Random mouse movements to simulate human behavior
  async randomMouseMovement(page) {
    const viewport = page.viewport();
    const movements = Math.floor(Math.random() * 3) + 1; // 1-3 movements

    for (let i = 0; i < movements; i++) {
      const x = Math.random() * viewport.width;
      const y = Math.random() * viewport.height;
      
      await page.mouse.move(x, y, { steps: Math.floor(Math.random() * 10) + 5 });
      await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100));
    }
  }

  // Random scrolling behavior
  async randomScroll(page) {
    const scrollDistance = Math.floor(Math.random() * 500) + 200; // 200-700px
    const scrollSteps = Math.floor(Math.random() * 5) + 3; // 3-8 steps
    
    for (let i = 0; i < scrollSteps; i++) {
      await page.evaluate((distance, steps) => {
        window.scrollBy(0, distance / steps);
      }, scrollDistance, scrollSteps);
      await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100));
    }
  }

  // Enhanced delay system with realistic patterns
  async smartDelay(baseDelay = 5000, variance = 3000, workerId = 'default') {
    const session = this.sessions.get(workerId);
    let delay = baseDelay + Math.random() * variance;

    // Add penalties based on session behavior
    if (session) {
      const sessionDuration = Date.now() - session.startTime;
      const requestRate = session.requestCount / (sessionDuration / 1000); // requests per second

      // If making too many requests, slow down significantly
      if (requestRate > 0.5) { // More than 0.5 requests per second
        delay *= 2;
        Logger.warn(`⚠️ High request rate detected, doubling delay to ${Math.round(delay/1000)}s`);
      }

      // Progressive delay increase for long sessions
      const sessionHours = sessionDuration / (1000 * 60 * 60);
      if (sessionHours > 1) {
        delay *= (1 + sessionHours * 0.1); // 10% increase per hour
        Logger.debug(`⏰ Long session detected (${sessionHours.toFixed(1)}h), increasing delay`);
      }
    }

    // Random "thinking time" spikes (like humans taking breaks)
    if (Math.random() < 0.05) { // 5% chance
      delay *= 3;
      Logger.info(`🤔 Simulating human "thinking time" - extended delay: ${Math.round(delay/1000)}s`);
    }

    Logger.debug(`⏳ Smart delay: ${Math.round(delay/1000)}s for worker ${workerId}`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // Detect and handle potential captchas or blocking
  async detectAndHandleBlocking(page, workerId) {
    const pageContent = await page.content();
    const pageTitle = await page.title();
    const url = page.url();

    // Detection patterns for Amazon blocking
    const blockingIndicators = [
      pageContent.length < 5000,
      pageTitle.includes('Robot Check'),
      pageTitle.includes('CAPTCHA'),
      pageContent.includes('automated requests'),
      pageContent.includes('unusual traffic'),
      url.includes('captcha'),
      url.includes('blocked')
    ];

    const isBlocked = blockingIndicators.some(indicator => indicator);

    if (isBlocked) {
      Logger.error(`🚫 Blocking detected for worker ${workerId}: ${pageTitle}`);
      
      // Try recovery strategies
      await this.attemptBlockingRecovery(page, workerId);
      return true;
    }

    return false;
  }

  // Attempt to recover from blocking
  async attemptBlockingRecovery(page, workerId) {
    Logger.info(`🔄 Attempting blocking recovery for worker ${workerId}...`);

    // Strategy 1: Clear cookies and reset session
    await page.deleteCookie(...await page.cookies());
    await this.setupSessionCookies(page, workerId);

    // Strategy 2: Long delay before retry
    await this.smartDelay(30000, 15000, workerId); // 30-45 second delay

    // Strategy 3: Navigate to Amazon home page first
    try {
      await page.goto('https://www.amazon.com', { waitUntil: 'domcontentloaded', timeout: 20000 });
      await this.simulateHumanBehavior(page, workerId);
      await this.smartDelay(10000, 5000, workerId);
      Logger.info(`✅ Recovery navigation completed for worker ${workerId}`);
    } catch (error) {
      Logger.error(`❌ Recovery failed for worker ${workerId}: ${error.message}`);
    }
  }

  // Generate random identifiers
  generateRandomId(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  generateRandomString(length) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Clean up session when done
  async cleanupSession(workerId) {
    const session = this.sessions.get(workerId);
    if (session) {
      try {
        await session.context.close();
        this.sessions.delete(workerId);
        Logger.debug(`🧹 Cleaned up session for worker ${workerId}`);
      } catch (error) {
        Logger.warn(`⚠️ Error cleaning up session: ${error.message}`);
      }
    }
  }

  // Get session stats for monitoring
  getSessionStats(workerId) {
    const session = this.sessions.get(workerId);
    if (!session) return null;

    const sessionDuration = Date.now() - session.startTime;
    return {
      duration: sessionDuration,
      requestCount: session.requestCount,
      requestRate: session.requestCount / (sessionDuration / 1000),
      lastActivity: Date.now() - session.lastActivityTime
    };
  }
}

module.exports = StealthMode;