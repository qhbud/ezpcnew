/**
 * updateGpuReviews.js
 *
 * Scrapes GPU review metadata from Amazon product pages and public Reddit
 * search results, then stores aggregate ratings plus original-source links.
 *
 * Usage:
 *   node scripts/updateGpuReviews.js --limit=25
 *   node scripts/updateGpuReviews.js --dry-run --limit=5
 *   node scripts/updateGpuReviews.js --skip-reddit
 */

require('dotenv').config();

const { MongoClient } = require('mongodb');
const puppeteer = require('puppeteer');

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'pcbuilder';
const REVIEW_VERSION = 'gpu-review-scrape-v1';

const args = Object.fromEntries(
  process.argv.slice(2).map(arg => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    return [key, value === undefined ? true : value];
  })
);

const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity;
const DRY_RUN = Boolean(args['dry-run']);
const SKIP_AMAZON = Boolean(args['skip-amazon']);
const SKIP_REDDIT = Boolean(args['skip-reddit']);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function cleanText(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function cleanAmazonSnippet(value) {
  return cleanText(value)
    .replace(/Brief content visible,?\s*double tap to read full content\.?/gi, '')
    .replace(/Full content visible,?\s*double tap to read brief content\.?/gi, '')
    .replace(/Read more\s*Read less/gi, '')
    .trim();
}

function parseRating(value) {
  const match = String(value || '').match(/([0-5](?:\.\d+)?)\s*(?:out of|\/)\s*5/i);
  return match ? parseFloat(match[1]) : null;
}

function parseCount(value) {
  const match = String(value || '').replace(/,/g, '').match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

function extractAmazonAsin(url) {
  const text = String(url || '');
  const patterns = [
    /\/dp\/([A-Z0-9]{10})/i,
    /\/gp\/product\/([A-Z0-9]{10})/i,
    /\/product-reviews\/([A-Z0-9]{10})/i,
    /[?&]ASIN=([A-Z0-9]{10})/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].toUpperCase();
  }
  return null;
}

function amazonReviewUrl(url) {
  const asin = extractAmazonAsin(url);
  return asin ? `https://www.amazon.com/product-reviews/${asin}` : url;
}

function reviewSearchName(gpu) {
  return cleanText(gpu.gpuModel || gpu.chipset || gpu.name || gpu.title || 'GPU').slice(0, 90);
}

async function scrapeAmazonReviews(browser, gpu) {
  const sourceUrl = gpu.sourceUrl || gpu.url;
  if (!sourceUrl || !/amazon\./i.test(sourceUrl)) return null;

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36');

  try {
    await page.goto(sourceUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForSelector('body', { timeout: 10000 });

    const aggregate = await page.evaluate(() => {
      const text = sel => document.querySelector(sel)?.textContent?.trim() || '';
      const attr = (sel, name) => document.querySelector(sel)?.getAttribute(name) || '';
      return {
        ratingText:
          attr('#acrPopover', 'title') ||
          text('#acrPopover .a-icon-alt') ||
          text('[data-hook="rating-out-of-text"]') ||
          text('.a-icon-alt'),
        countText:
          text('#acrCustomerReviewText') ||
          text('[data-hook="total-review-count"]') ||
          text('[data-hook="acr-total-review-count"]')
      };
    });

    const reviewUrl = amazonReviewUrl(sourceUrl);
    const asin = extractAmazonAsin(sourceUrl);
    const source = {
      source: 'Amazon',
      score: parseRating(aggregate.ratingText),
      count: parseCount(aggregate.countText),
      url: reviewUrl,
      scrapedAt: new Date()
    };

    const links = await page.evaluate((fallbackUrl) => {
      return Array.from(document.querySelectorAll('[data-hook="review"]')).slice(0, 5).map(review => {
        const text = sel => review.querySelector(sel)?.textContent?.trim().replace(/\s+/g, ' ') || '';
        const id = review.id || '';
        const title = text('[data-hook="review-title"], [data-hook="reviewTitle"]') || 'Amazon customer review';
        const snippet = text('[data-hook="review-body"] span, [data-hook="reviewText"] span, [data-hook="reviewText"], [data-hook="reviewRichContentContainer"]')
          .replace(/Brief content visible,?\s*double tap to read full content\.?/gi, '')
          .replace(/Full content visible,?\s*double tap to read brief content\.?/gi, '')
          .replace(/Read more\s*Read less/gi, '')
          .trim();
        return {
          source: 'Amazon',
          title,
          author: text('.a-profile-name'),
          date: text('[data-hook="review-date"]'),
          scoreText: text('[data-hook="review-star-rating"] .a-icon-alt, [data-hook="cmps-review-star-rating"] .a-icon-alt'),
          snippet: snippet.slice(0, 420),
          url: id ? `${fallbackUrl}#${id}` : `${fallbackUrl}#customerReviews`
        };
      }).filter(review => review.snippet || review.title);
    }, sourceUrl);

    if (asin) {
      await page.goto(reviewUrl, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => null);
      const reviews = await page.evaluate((reviewAsin) => {
        const cleanSnippet = value => (value || '')
          .replace(/\s+/g, ' ')
          .trim()
          .replace(/Brief content visible,?\s*double tap to read full content\.?/gi, '')
          .replace(/Full content visible,?\s*double tap to read brief content\.?/gi, '')
          .replace(/Read more\s*Read less/gi, '')
          .trim();
        return Array.from(document.querySelectorAll('[data-hook="review"]')).slice(0, 5).map(review => {
          const id = review.id || '';
          const text = sel => review.querySelector(sel)?.textContent?.trim().replace(/\s+/g, ' ') || '';
          const rating = text('[data-hook="review-star-rating"] .a-icon-alt') ||
            text('[data-hook="cmps-review-star-rating"] .a-icon-alt');
          return {
            source: 'Amazon',
            title: text('[data-hook="review-title"]') || 'Amazon customer review',
            author: text('.a-profile-name'),
            date: text('[data-hook="review-date"]'),
            scoreText: rating,
            snippet: cleanSnippet(text('[data-hook="review-body"] span')).slice(0, 280),
            url: id
              ? `https://www.amazon.com/gp/customer-reviews/${id}?ASIN=${reviewAsin}`
              : `https://www.amazon.com/product-reviews/${reviewAsin}`
          };
        });
      }, asin);
      links.push(...reviews.filter(review => review.url));
    }

    links.forEach(link => {
      link.snippet = cleanAmazonSnippet(link.snippet).slice(0, 420);
    });

    return { source, links };
  } finally {
    await page.close().catch(() => null);
  }
}

async function fetchRedditReviews(gpu) {
  const query = `${reviewSearchName(gpu)} review`;
  const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=relevance&t=all&limit=5`;
  let posts = [];

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'EZPCReviewBot/1.0 (GPU review link discovery)'
      }
    });
    if (!response.ok) throw new Error(`Reddit search failed: ${response.status}`);
    const json = await response.json();
    posts = (json.data?.children || [])
      .map(child => child.data)
      .filter(post => post?.permalink && post?.title)
      .map(post => ({
        source: 'Reddit',
        title: post.title,
        author: post.author ? `u/${post.author}` : '',
        subreddit: post.subreddit ? `r/${post.subreddit}` : '',
        score: post.score || 0,
        comments: post.num_comments || 0,
        date: post.created_utc ? new Date(post.created_utc * 1000).toISOString() : '',
        snippet: cleanText(post.selftext || post.link_flair_text || '').slice(0, 280),
        url: `https://www.reddit.com${post.permalink}`
      }));
  } catch (error) {
    console.warn(`  Reddit JSON blocked (${error.message}); trying DuckDuckGo Reddit discovery`);
    posts = await discoverRedditLinks(query);
    if (posts.length === 0) {
      posts = await discoverRedditLinksViaBing(query);
    }
  }

  return {
    source: {
      source: 'Reddit',
      count: posts.length,
      url: `https://www.reddit.com/search/?q=${encodeURIComponent(query)}`,
      scrapedAt: new Date()
    },
    links: posts
  };
}

async function discoverRedditLinks(query) {
  const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(`site:reddit.com/r ${query}`)}`;
  const response = await fetch(searchUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  if (!response.ok) throw new Error(`DuckDuckGo Reddit discovery failed: ${response.status}`);
  const html = await response.text();
  const results = [];
  const seen = new Set();
  const pattern = /class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  for (const match of html.matchAll(pattern)) {
    const decoded = decodeDdgResultUrl(match[1]);
    if (!decoded || !/reddit\.com\/r\//i.test(decoded) || seen.has(decoded)) continue;
    seen.add(decoded);
    results.push({
      source: 'Reddit',
      title: cleanText(stripHtml(match[2])) || 'Reddit discussion',
      url: decoded,
      snippet: ''
    });
    if (results.length >= 5) break;
  }
  return results;
}

async function discoverRedditLinksViaBing(query) {
  const searchUrl = `https://www.bing.com/search?format=rss&q=${encodeURIComponent(`site:reddit.com/r ${query}`)}`;
  const response = await fetch(searchUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  if (!response.ok) throw new Error(`Bing Reddit discovery failed: ${response.status}`);
  const xml = await response.text();
  const results = [];
  const seen = new Set();
  const itemPattern = /<item>([\s\S]*?)<\/item>/g;
  for (const item of xml.matchAll(itemPattern)) {
    const title = decodeXml(item[1].match(/<title>([\s\S]*?)<\/title>/)?.[1] || 'Reddit discussion');
    const link = decodeXml(item[1].match(/<link>(https?:\/\/[^<]+)<\/link>/)?.[1] || '');
    const description = decodeXml(item[1].match(/<description>([\s\S]*?)<\/description>/)?.[1] || '');
    if (!/reddit\.com\/r\//i.test(link) || seen.has(link)) continue;
    seen.add(link);
    results.push({
      source: 'Reddit',
      title: cleanText(stripHtml(title)),
      url: link,
      snippet: cleanText(stripHtml(description)).slice(0, 280)
    });
    if (results.length >= 5) break;
  }
  return results;
}

function decodeDdgResultUrl(rawUrl) {
  const withEntities = String(rawUrl || '').replace(/&amp;/g, '&');
  try {
    const absolute = withEntities.startsWith('//') ? `https:${withEntities}` : withEntities;
    const url = new URL(absolute);
    const target = url.searchParams.get('uddg');
    return target ? decodeURIComponent(target) : absolute;
  } catch {
    return null;
  }
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function decodeXml(value) {
  return String(value || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function buildUpdate(amazonResult, redditResult) {
  const reviewSources = [];
  const reviewLinks = [];
  const update = {
    reviewsLastUpdatedAt: new Date(),
    reviewScrapeVersion: REVIEW_VERSION
  };

  if (amazonResult?.source) {
    reviewSources.push(amazonResult.source);
    reviewLinks.push(...amazonResult.links);
    if (amazonResult.source.score) update.reviewScore = amazonResult.source.score;
    if (amazonResult.source.count) update.reviewCount = amazonResult.source.count;
  }

  if (redditResult?.source) {
    reviewSources.push(redditResult.source);
    reviewLinks.push(...redditResult.links);
  }

  if (reviewSources.length) {
    update.reviewSources = reviewSources;
    update.reviewLinks = reviewLinks.slice(0, 10).map(link => ({
      ...link,
      snippet: cleanAmazonSnippet(link.snippet)
    }));
    update.reviewSource = reviewSources.map(source => source.source).join(' + ');
  }

  return update;
}

async function main() {
  if (!MONGODB_URI) throw new Error('MONGODB_URI is required');

  const client = new MongoClient(MONGODB_URI);
  let browser = null;

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const collectionNames = (await db.listCollections().toArray())
      .map(collection => collection.name)
      .filter(name => name === 'gpus' || name.startsWith('gpus_'));

    const items = [];
    for (const collectionName of collectionNames) {
      const docs = await db.collection(collectionName)
        .find({ $or: [{ sourceUrl: { $exists: true, $ne: '' } }, { url: { $exists: true, $ne: '' } }] })
        .toArray();
      docs.forEach(doc => items.push({ ...doc, _collectionName: collectionName }));
    }

    console.log(`Found ${items.length} GPU review candidates across ${collectionNames.length} collection(s)`);
    if (!SKIP_AMAZON) {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }

    let processed = 0;
    let updated = 0;
    for (const gpu of items.slice(0, LIMIT)) {
      processed++;
      console.log(`\n[${processed}/${Math.min(items.length, LIMIT)}] ${gpu.name || gpu.title || gpu.gpuModel}`);

      let amazonResult = null;
      let redditResult = null;

      if (!SKIP_AMAZON) {
        try {
          amazonResult = await scrapeAmazonReviews(browser, gpu);
          if (amazonResult?.source?.score) {
            console.log(`  Amazon: ${amazonResult.source.score}/5 (${amazonResult.source.count || 0} ratings)`);
          } else {
            console.log('  Amazon: no aggregate rating found');
          }
          await sleep(1200);
        } catch (error) {
          console.warn(`  Amazon error: ${error.message}`);
        }
      }

      if (!SKIP_REDDIT) {
        try {
          redditResult = await fetchRedditReviews(gpu);
          console.log(`  Reddit: ${redditResult.links.length} source link(s)`);
          await sleep(800);
        } catch (error) {
          console.warn(`  Reddit error: ${error.message}`);
        }
      }

      const update = buildUpdate(amazonResult, redditResult);
      if (!update.reviewSources) {
        console.log('  No review sources found; leaving document unchanged');
        continue;
      }

      if (DRY_RUN) {
        console.log(`  Dry run update: ${JSON.stringify(update, null, 2).slice(0, 900)}...`);
        updated++;
      } else {
        await db.collection(gpu._collectionName).updateOne(
          { _id: gpu._id },
          { $set: update }
        );
        updated++;
        console.log(`  Updated ${gpu._collectionName}/${gpu._id}`);
      }
    }

    console.log(`\nDone. Processed ${processed}, ${DRY_RUN ? 'would update' : 'updated'} ${updated}.`);
  } finally {
    if (browser) await browser.close().catch(() => null);
    await client.close().catch(() => null);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
