import { chromium } from 'playwright';

const REAL_USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15'
];

const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 1536, height: 864 }
];

function randomDelay(min = 2000, max = 5000) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFromArray(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function humanScroll(page) {
  try {
    const scrollHeight = await page.evaluate(() => document.body?.scrollHeight || 5000);
    let currentPosition = 0;
    const maxScrolls = 10;

    for (let i = 0; i < maxScrolls && currentPosition < scrollHeight; i++) {
      const scrollStep = Math.floor(Math.random() * 300) + 100;
      currentPosition += scrollStep;
      
      await page.evaluate((pos) => window.scrollTo(0, pos), currentPosition);
      await page.waitForTimeout(randomDelay(300, 800));
    }
  } catch (e) {
    console.log('Scroll error (continuing):', e.message);
  }
}

async function scrapeFlipkart() {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  const context = await browser.newContext({
    userAgent: randomFromArray(REAL_USER_AGENTS),
    viewport: randomFromArray(VIEWPORTS),
    locale: 'en-US',
    timezoneId: 'Asia/Kolkata',
    permissions: ['geolocation'],
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    }
  });

  const page = await context.newPage();
  
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false
    });
  });

  console.log('Navigating to Flipkart laptops search...');
  await page.goto('https://www.flipkart.com/search?q=laptops', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  await page.waitForTimeout(randomDelay(3000, 5000));
  
  console.log('Waiting for page to fully load...');
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(randomDelay(2000, 3000));

  console.log('Scrolling page...');
  await humanScroll(page);

  console.log('Extracting product data...');
  const products = await page.evaluate(() => {
    const results = [];
    const seenTitles = new Set();
    
    document.querySelectorAll('a[href*="/p/"]').forEach(link => {
      let title = link.textContent?.trim() || '';
      title = title.replace(/Add to Compare|Trending/g, '').trim();
      
      if (title.length > 20 && !seenTitles.has(title)) {
        seenTitles.add(title);
        
        const card = link.closest('div[class*="_"]') || link.parentElement;
        let price = 'N/A', rating = 'N/A', reviews = 'N/A';
        
        let el = card;
        for (let i = 0; i < 10 && el; i++) {
          const text = el.textContent || '';
          if (el.className && el.className.includes('_30jeq8') && price === 'N/A') {
            price = text.trim();
          }
          if (el.className && el.className.includes('_3LWZl') && rating === 'N/A') {
            rating = text.trim();
          }
          if (el.className && el.className.includes('_2R') && reviews === 'N/A') {
            reviews = text.trim();
          }
          el = el.nextElementSibling || el.firstElementChild;
        }
        
        const allText = card?.textContent || '';
        const priceMatch = allText.match(/₹[\d,]+/);
        if (price === 'N/A' && priceMatch) {
          price = priceMatch[0];
        }
        
        results.push({
          title: title.substring(0, 80),
          price,
          rating,
          reviews
        });
      }
    });
    
    return results.slice(0, 24);
  });

  console.log(`Found ${products.length} products:`);
  products.forEach((p, i) => {
    console.log(`${i + 1}. ${p.title} - ${p.price} (${p.rating})`);
  });

  await page.waitForTimeout(randomDelay(2000, 4000));

  await browser.close();
  return products;
}

scrapeFlipkart()
  .then(products => {
    console.log('\nScraping completed!');
    console.log(JSON.stringify(products, null, 2));
  })
  .catch(err => {
    console.error('Scraping failed:', err);
    process.exit(1);
  });
