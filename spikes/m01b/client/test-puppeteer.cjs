const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));
  page.on('response', response => {
    if (!response.ok()) console.log('HTTP ERROR:', response.url(), response.status());
  });

  await page.goto('http://localhost:2567', { waitUntil: 'networkidle0' });
  
  // Wait a bit to let websockets connect
  await new Promise(r => setTimeout(r, 2000));

  await browser.close();
})();
