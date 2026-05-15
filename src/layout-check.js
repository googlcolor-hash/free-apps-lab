const { chromium } = require('playwright-core');
const path = require('node:path');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const cases = [
  { name: 'index_desktop', url: 'http://127.0.0.1:4173/index.html', viewport: { width: 1440, height: 1080 } },
  { name: 'stats_desktop', url: 'http://127.0.0.1:4173/stats.html', viewport: { width: 1440, height: 1080 } },
  { name: 'index_mobile', url: 'http://127.0.0.1:4173/index.html', viewport: { width: 390, height: 844 } },
  { name: 'stats_mobile', url: 'http://127.0.0.1:4173/stats.html', viewport: { width: 390, height: 844 } },
];

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const results = [];
  for (const c of cases) {
    const context = await browser.newContext({ viewport: c.viewport });
    const page = await context.newPage();
    await page.goto(c.url, { waitUntil: 'networkidle' });
    const metrics = await page.evaluate(() => {
      const de = document.documentElement;
      const body = document.body;
      const overflow = Math.max(de.scrollWidth, body.scrollWidth) - window.innerWidth;
      const critical = [
        '#searchInput',
        '#cardsGrid',
        '#resultCount',
        '.chart-grid',
        '#byCategoryTable',
      ];
      const visible = critical
        .map((sel) => document.querySelector(sel))
        .filter(Boolean)
        .map((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        });
      return {
        innerWidth: window.innerWidth,
        scrollWidth: Math.max(de.scrollWidth, body.scrollWidth),
        overflow,
        criticalVisibleCount: visible.filter(Boolean).length,
      };
    });
    results.push({ name: c.name, ...metrics });
    await context.close();
  }
  await browser.close();

  const bad = results.filter((r) => r.overflow > 1);
  if (bad.length) {
    console.error('Horizontal overflow detected:', JSON.stringify(bad, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify(results, null, 2));
})();
