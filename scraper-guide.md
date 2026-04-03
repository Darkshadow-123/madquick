# Flipkart Web Scraper

A Playwright-based web scraper that extracts laptop product data from Flipkart with human-like behavior to avoid detection.

## Features

- **Real User-Agent Rotation** - Randomly selects from 5 different browser signatures
- **Random Viewport Sizes** - Mimics different screen resolutions (1920x1080, 1366x768, 1536x864)
- **Random Delays** - 2-5 second delays between actions, 300-800ms between scrolls
- **Human-like Scrolling** - Smooth scrolling that mimics real user behavior
- **Human-like Typing** - Variable keystroke delays when typing
- **Anti-Detection** - Overrides `navigator.webdriver` property
- **Headless Mode** - Runs silently in the background (browser not visible)

## Setup

```bash
npm install
npx playwright install chromium
```

## Usage

```bash
npm run scrape
```

## Project Structure

```
├── package.json          # Project dependencies and scripts
└── src/
    └── scraper.js        # Main scraping script
```

## Code Explanation

### User-Agent Pool

```javascript
const REAL_USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...',
  // ... more user agents
];
```

Websites can detect bots by checking the User-Agent string. Playwright's default UA contains "HeadlessChrome" which is a red flag. This pool provides realistic browser signatures to appear as genuine browser traffic.

### Viewport Configuration

```javascript
const VIEWPORTS = [
  { width: 1920, height: 1080 },  // Full HD
  { width: 1366, height: 768 },   // Common laptop
  { width: 1536, height: 864 }    // Medium resolution
];
```

Random viewport sizes make the scraper appear as different devices, reducing fingerprinting.

### Utility Functions

**randomDelay(min, max)**
```javascript
function randomDelay(min = 2000, max = 5000) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
```
Generates random delays between actions. Bots typically act too fast; real users have variable response times.

**randomFromArray(arr)**
```javascript
function randomFromArray(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
```
Selects a random item from an array for variety in behavior.

### Human-like Behavior Functions

**humanScroll(page)**
```javascript
async function humanScroll(page) {
  const scrollHeight = await page.evaluate(() => document.body?.scrollHeight || 5000);
  let currentPosition = 0;
  
  for (let i = 0; i < maxScrolls && currentPosition < scrollHeight; i++) {
    const scrollStep = Math.floor(Math.random() * 300) + 100;
    currentPosition += scrollStep;
    await page.evaluate((pos) => window.scrollTo(0, pos), currentPosition);
    await page.waitForTimeout(randomDelay(300, 800));
  }
}
```
Scrolls down the page in small, randomized increments with random pauses. This mimics how a real user would browse content rather than instantly loading everything.

**humanType(page, selector, text)**
```javascript
async function humanType(page, selector, text) {
  await page.waitForSelector(selector, { timeout: 10000 });
  await page.click(selector);
  await page.waitForTimeout(randomDelay(200, 500));
  
  for (const char of text) {
    await page.keyboard.type(char, { delay: randomDelay(50, 150) });
  }
}
```
Types text character by character with variable delays. Bots type perfectly at constant speed; humans make natural pauses.

### Browser Configuration

```javascript
const browser = await chromium.launch({
  headless: true,
  args: [
    '--disable-blink-features=AutomationControlled',
    '--disable-dev-shm-usage',
    '--no-sandbox',
    '--disable-setuid-sandbox'
  ]
});
```

- `headless: true` - Runs without visible browser window
- `--disable-blink-features=AutomationControlled` - Hides automation flags
- `--no-sandbox` - Required for some Linux environments

### Context Configuration

```javascript
const context = await browser.newContext({
  userAgent: randomFromArray(REAL_USER_AGENTS),
  viewport: randomFromArray(VIEWPORTS),
  locale: 'en-US',
  timezoneId: 'Asia/Kolkata',
  extraHTTPHeaders: {
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
  }
});
```

Sets up the browser context with:
- Random user agent
- Random viewport
- Appropriate locale/timezone for Indian e-commerce
- Proper HTTP headers that browsers would send

### Anti-Detection Script

```javascript
await context.addInitScript(() => {
  Object.defineProperty(navigator, 'webdriver', {
    get: () => false
  });
});
```

Many anti-bot systems check `navigator.webdriver` which is `true` for automated browsers. This overrides it to `false`.

### Navigation and Data Extraction

**Direct URL Navigation**
```javascript
await page.goto('https://www.flipkart.com/search?q=laptops', {
  waitUntil: 'domcontentloaded',
  timeout: 30000
});
```

Navigates directly to the search URL instead of interacting with the search box, avoiding popup/dialog issues.

**Product Extraction**
```javascript
const products = await page.evaluate(() => {
  const results = [];
  const seenTitles = new Set();
  
  document.querySelectorAll('a[href*="/p/"]').forEach(link => {
    let title = link.textContent?.trim() || '';
    title = title.replace(/Add to Compare|Trending/g, '').trim();
    
    if (title.length > 20 && !seenTitles.has(title)) {
      seenTitles.add(title);
      
      const card = link.closest('div[class*="_"]') || link.parentElement;
      const allText = card?.textContent || '';
      const priceMatch = allText.match(/₹[\d,]+/);
      
      results.push({
        title: title.substring(0, 80),
        price: priceMatch ? priceMatch[0] : 'N/A',
        rating: 'N/A',
        reviews: 'N/A'
      });
    }
  });
  
  return results.slice(0, 24);
});
```

This DOM manipulation script:
1. Finds all product links (URLs containing `/p/`)
2. Extracts clean titles (removes "Add to Compare", "Trending" text)
3. Uses Set to avoid duplicate products
4. Extracts price using regex pattern `₹[\d,]+`
5. Returns first 24 products

## Output Format

```json
{
  "title": "HP AMD Ryzen 7 Octa Core - (16 GB/512 GB SSD/Windows 11 Home) 15-fc0761AU Laptop",
  "price": "₹61,990",
  "rating": "N/A",
  "reviews": "N/A"
}
```

## Limitations

- Ratings show as "N/A" because Flipkart uses dynamically generated class names
- Site structure may change, requiring selector updates
- Excessive scraping may trigger rate limiting or bans

