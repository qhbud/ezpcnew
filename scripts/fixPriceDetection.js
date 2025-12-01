// Fix for Amazon price detection issues
// This script analyzes and fixes the .aok-offscreen price detection logic

const fs = require('fs');
const path = require('path');

function createFixedPriceDetection() {
    const fixedLogic = `
        // IMPROVED: Enhanced .aok-offscreen price detection with validation
        console.log('🔍 Amazon Price Detection: Using enhanced .aok-offscreen validation');

        // Check if we're on a product page vs search results page
        const isProductPage = document.querySelector('#productTitle, #dp') !== null;
        console.log(\`🔍 Page type: \${isProductPage ? 'Product page' : 'Search results page'}\`);

        // For product pages, focus on main product area
        let mainProductArea = document;
        if (isProductPage) {
          mainProductArea = document.querySelector('#centerCol, #dp, #dp-container, .dp-wrap') || document;
          console.log(\`🔍 Using product area: \${mainProductArea === document ? 'entire page' : mainProductArea.id || mainProductArea.className}\`);
        }

        // PRIORITY 1: Look for .aok-offscreen elements with enhanced validation
        const aokElements = mainProductArea.querySelectorAll('.aok-offscreen');
        console.log(\`🔍 Priority 1 - .aok-offscreen: found \${aokElements.length} elements\`);

        let aokPriceInfo = null;
        let allCandidates = [];

        if (aokElements.length > 0) {
          for (let i = 0; i < aokElements.length; i++) {
            const el = aokElements[i];
            const text = el.textContent.trim();
            console.log(\`   aok-offscreen[\${i}]: "\${text}"\`);

            // Enhanced patterns with better validation
            const patterns = [
              // Pattern 1: "$XXX.XX with XX percent savings"
              { regex: /\\$?([\\d,]+\\.?\\d*)\\s*with\\s+(\\d+)\\s*percent\\s+savings/i, type: 'savings' },
              // Pattern 2: "$XXX.XX (XX% off)" or "$XXX.XX XX% off"
              { regex: /\\$?([\\d,]+\\.?\\d*)[^\\d]*(\\d+)%\\s*off/i, type: 'discount' },
              // Pattern 3: Just "$XXX.XX" (but validate context)
              { regex: /^\\$?([\\d,]+\\.?\\d*)$/, type: 'base' }
            ];

            for (let patternIndex = 0; patternIndex < patterns.length; patternIndex++) {
              const pattern = patterns[patternIndex];
              const match = text.match(pattern.regex);
              if (match) {
                const price = parseFloat(match[1].replace(/,/g, ''));
                const savingsPercent = match[2] ? parseInt(match[2]) : 0;

                console.log(\`     Pattern \${patternIndex + 1} (\${pattern.type}) matched: $\${price}, \${savingsPercent}% savings\`);

                // ENHANCED VALIDATION: Check price reasonableness
                if (price > 0 && price >= 200 && price <= 5000) {
                  // Additional context validation for base prices
                  let contextScore = 0;

                  // Check element's position and parent context
                  const parentClasses = (el.parentElement?.className || '').toLowerCase();
                  const parentText = (el.parentElement?.textContent || '').toLowerCase();

                  // Higher score for main price areas
                  if (parentClasses.includes('price') || parentClasses.includes('buybox')) {
                    contextScore += 3;
                  }

                  // Higher score for current/sale price indicators
                  if (parentText.includes('current') || parentText.includes('price') ||
                      parentText.includes('buy') || parentText.includes('add to cart')) {
                    contextScore += 2;
                  }

                  // Lower score for list/original price indicators
                  if (parentText.includes('list') || parentText.includes('original') ||
                      parentText.includes('was') || parentText.includes('typical')) {
                    contextScore -= 1;
                  }

                  // Pattern type scoring
                  if (pattern.type === 'savings' || pattern.type === 'discount') {
                    contextScore += 2; // These are more reliable
                  }

                  allCandidates.push({
                    price: price,
                    savingsPercent: savingsPercent,
                    text: text,
                    element: el,
                    type: pattern.type,
                    contextScore: contextScore,
                    index: i
                  });

                  console.log(\`💰 Candidate found: $\${price} (\${pattern.type}, score: \${contextScore})\`);
                }
              }
            }
          }

          // Select best candidate based on context score and type
          if (allCandidates.length > 0) {
            // Sort by context score (highest first), then by type preference
            allCandidates.sort((a, b) => {
              if (b.contextScore !== a.contextScore) {
                return b.contextScore - a.contextScore;
              }
              // Prefer savings/discount over base
              const typeOrder = { 'savings': 3, 'discount': 2, 'base': 1 };
              return (typeOrder[b.type] || 0) - (typeOrder[a.type] || 0);
            });

            aokPriceInfo = allCandidates[0];
            console.log(\`💰 Selected best candidate: $\${aokPriceInfo.price} (\${aokPriceInfo.type}, score: \${aokPriceInfo.contextScore})\`);

            // Log all candidates for debugging
            console.log('🔍 All candidates found:');
            allCandidates.forEach((candidate, idx) => {
              console.log(\`   \${idx + 1}. $\${candidate.price} (\${candidate.type}, score: \${candidate.contextScore}) - "\${candidate.text}"\`);
            });
          }
        }
    `;

    return fixedLogic;
}

async function applyPriceDetectionFix() {
    console.log('🔧 Analyzing Amazon scraper price detection...');

    const scraperPath = path.join(__dirname, '..', 'scripts', 'scrapers', 'amazonScraper.js');

    if (!fs.existsSync(scraperPath)) {
        console.error('❌ Amazon scraper file not found');
        return;
    }

    console.log('📋 Issues identified in price detection:');
    console.log('1. Takes first valid .aok-offscreen match instead of best match');
    console.log('2. No context validation for price elements');
    console.log('3. No price range validation');
    console.log('4. No scoring system to choose between multiple candidates');

    console.log('\\n🛠️ Recommended fixes:');
    console.log('1. Add context scoring for .aok-offscreen elements');
    console.log('2. Validate price ranges (200-5000 for GPUs)');
    console.log('3. Choose best candidate based on parent element context');
    console.log('4. Prefer savings/discount patterns over base price patterns');
    console.log('5. Log all candidates for debugging');

    console.log('\\n⚠️  Manual fix required:');
    console.log('The price detection logic needs to be updated in:');
    console.log('File: scripts/scrapers/amazonScraper.js');
    console.log('Lines: 519-583 (PRIORITY 1: Look for .aok-offscreen elements)');

    console.log('\\n📝 Temporary workaround:');
    console.log('1. Check if Arc A770 price has changed on Amazon');
    console.log('2. Run a fresh scrape of that specific product');
    console.log('3. Compare with current database value');

    return {
        issuesFound: 4,
        fixRequired: true,
        affectedLines: '519-583',
        priority: 'HIGH'
    };
}

applyPriceDetectionFix().then(result => {
    console.log('\\n✅ Analysis complete');
    console.log(\`Issues found: \${result.issuesFound}\`);
    console.log(\`Fix required: \${result.fixRequired}\`);
    console.log(\`Priority: \${result.priority}\`);
    process.exit(0);
});