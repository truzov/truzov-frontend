const { chromium } = require('@playwright/test');
(async () => {
 const browser = await chromium.launch();
 for (const width of [375, 768, 1440]) {
  for (const reducedMotion of ['no-preference', 'reduce']) {
   const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion });
   await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
   const data = await page.evaluate(() => {
    const el = document.querySelector('.standards-seal');
    const rect = el?.getBoundingClientRect();
    const s = el ? getComputedStyle(el) : null;
    return { found: !!el, animation: s?.animationName, duration: s?.animationDuration, seal: rect && { x: rect.x, right: rect.right, width: rect.width }, overflow: document.documentElement.scrollWidth > innerWidth, viewport: innerWidth };
   });
   console.log(width, reducedMotion, JSON.stringify(data));
   if (width === 375 && reducedMotion === 'no-preference') { await page.evaluate(() => document.querySelector('.standards-seal').scrollIntoView({ block: 'center' })); await page.screenshot({ path: 'qa-reports/standards-seal-revamp-375.png' }); }
   if (width === 1440 && reducedMotion === 'no-preference') { await page.evaluate(() => document.querySelector('.standards-seal').scrollIntoView({ block: 'center' })); await page.screenshot({ path: 'qa-reports/standards-seal-revamp-1440.png' }); }
   await page.close();
  }
 }
 await browser.close();
})();

