import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
  });
  
  page.on('pageerror', error => {
    console.log(`[BROWSER ERROR] ${error.message}`);
  });

  console.log("Navigating to http://localhost:5173/");
  await page.goto('http://localhost:5173/');
  
  console.log("Waiting 3 seconds to let JS execute...");
  await page.waitForTimeout(3000);
  
  const content = await page.content();
  if (content.includes("Authenticating...")) {
    console.log("Page is STUCK on Authenticating...");
  } else if (content.includes("Sign In")) {
    console.log("Page is on Login screen.");
  } else {
    console.log("Page is somewhere else.");
  }
  
  await browser.close();
})();
