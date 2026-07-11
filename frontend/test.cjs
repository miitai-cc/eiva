const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err.message));

  console.log("Navigating...");
  await page.goto('http://127.0.0.1:38999', { waitUntil: 'networkidle2' });
  
  console.log("Clicking add node button...");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.wf-toolbar-btn'));
    const addAgentBtn = btns.find(b => b.textContent.includes('agent') || b.title.includes('agent') || b.textContent.includes('Agent') || b.textContent.includes('代理') || b.textContent.includes('Agent') || b.className.includes('wf-toolbar-btn'));
    if (addAgentBtn) addAgentBtn.click();
    else console.log("Button not found");
  });
  
  await new Promise(r => setTimeout(r, 2000));
  
  console.log("Done");
  await browser.close();
})();
