// Stealth Mode Configuration
// Adjust these settings to balance between stealth and performance

module.exports = {
  // Enable/disable stealth features
  enabled: true,
  
  // Browser fingerprint randomization
  fingerprinting: {
    randomizeUserAgent: true,
    randomizeViewport: true,
    randomizeTimezone: true,
    randomizeLanguage: true,
    randomizeHardware: true,
    hideWebdriver: true,
    mockWebGL: true
  },

  // Session management
  session: {
    useCookies: true,
    rotateSession: true,
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    maxRequestsPerSession: 100
  },

  // Human behavior simulation
  behavior: {
    simulateMouseMovement: true,
    simulateScrolling: true,
    simulateReading: true,
    humanPauses: true,
    randomBehaviorChance: 0.3 // 30% chance of random behavior
  },

  // Delay configuration
  delays: {
    baseDelay: 8000,           // Base delay between requests (ms)
    variance: 7000,            // Random variance (ms)
    retryMultiplier: 1.5,      // Multiply delay on retries
    blockPenalty: 3000,        // Additional delay per blocked request (ms)
    longSessionMultiplier: 1.1, // Multiply delay for long sessions
    thinkingTimeChance: 0.05,  // 5% chance of extended "thinking" delay
    thinkingTimeMultiplier: 3   // Multiply delay during "thinking"
  },

  // Request interception
  requests: {
    blockImages: true,
    blockStylesheets: true,
    blockFonts: true,
    blockOther: true,
    randomRequestDelay: true,
    maxDelayMs: 200
  },

  // Detection and recovery
  detection: {
    enableCaptchaDetection: true,
    enableBlockingDetection: true,
    autoRecovery: true,
    maxRecoveryAttempts: 3,
    recoveryDelay: 30000, // 30 seconds
    navigateToHomeOnRecovery: true
  },

  // Proxy configuration (add your proxies here)
  proxy: {
    enabled: false, // Set to true when you have proxies
    rotation: true,
    list: [
      // Example proxy configuration:
      // {
      //   host: 'proxy1.example.com',
      //   port: 8080,
      //   username: 'user',
      //   password: 'pass'
      // }
    ]
  },

  // Logging and debugging
  logging: {
    logStealthActions: true,
    logBehaviorSimulation: false,
    logFingerprinting: true,
    logSessionStats: true,
    logDelayCalculations: false
  }
};