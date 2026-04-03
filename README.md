# Flipkart Web Scraper

A Playwright-based scraper that extracts laptop products from Flipkart with human-like behavior.

## Quick Start

```bash
npm install
npx playwright install chromium
npm run scrape
```

## Features

- Real user-agent rotation
- Random viewport sizes
- Human-like scrolling
- Random delays between actions
- Headless browser execution
- Anti-detection measures

## Project Structure

```
├── package.json
├── README.md
├── summary.md
├── scraper-guide.md
└── src/
    └── scraper.js
```

## Configuration

Edit `src/scraper.js` to customize:
- Search query (line 37)
- Number of products (line 97)
- Delays and scroll behavior

## Output

Runs headlessly and outputs JSON with product titles and prices.

## Legal Notice

For educational purposes only. Respect website terms of service.
