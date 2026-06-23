const { rsGetProxyConfig, rsRedactProxyServer, isProxyInfrastructureError } = require('./riverSearchPriceDetection');

const args = process.argv.slice(2);
const REQUIRE_PROXY = args.includes('--require-proxy');
const TARGET_URL = (args.find(arg => arg.startsWith('--target=')) || '').split('=')[1] || 'https://api.ipify.org?format=json';
const TIMEOUT_MS = Number.parseInt((args.find(arg => arg.startsWith('--timeout-ms=')) || '').split('=')[1] || '30000', 10);

function randomSessionToken() {
  return Math.random().toString(36).slice(2, 10);
}

async function getPuppeteer() {
  try {
    const puppeteer = require('puppeteer-extra');
    puppeteer.use(require('puppeteer-extra-plugin-stealth')());
    return puppeteer;
  } catch (err) {
    console.warn(`puppeteer-extra/stealth unavailable (${err.message}); using plain puppeteer.`);
    return require('puppeteer');
  }
}

async function main() {
  const proxy = rsGetProxyConfig();
  if (!proxy) {
    const message = 'Proxy preflight skipped because INGEST_PROXY_SERVER/SCRAPER_PROXY_SERVER is empty.';
    if (REQUIRE_PROXY) {
      console.error(`::error::${message}`);
      process.exit(1);
    }
    console.warn(`::warning::${message}`);
    return;
  }

  const puppeteer = await getPuppeteer();
  const launchArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    `--proxy-server=${proxy.server}`
  ];

  let browser;
  try {
    console.log(`Checking proxy tunnel via ${rsRedactProxyServer(proxy.server)}...`);
    browser = await puppeteer.launch({ headless: 'new', args: launchArgs });
    const page = await browser.newPage();

    if (proxy.username || proxy.password) {
      const username = proxy.username.includes('{session}')
        ? proxy.username.replace(/\{session\}/g, randomSessionToken())
        : proxy.username;
      await page.authenticate({ username, password: proxy.password });
    }

    const response = await page.goto(TARGET_URL, {
      waitUntil: 'domcontentloaded',
      timeout: TIMEOUT_MS
    });

    const status = response ? response.status() : 0;
    if (!response || status >= 400) {
      throw new Error(`Proxy preflight reached ${TARGET_URL} with HTTP ${status || 'no response'}`);
    }

    console.log(`Proxy preflight passed with HTTP ${status}.`);
  } catch (error) {
    const prefix = isProxyInfrastructureError(error)
      ? 'Proxy tunnel/authentication failed'
      : 'Proxy preflight failed';
    console.error(`::error::${prefix}: ${error.message}`);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

main();
