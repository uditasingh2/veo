const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    page.on('request', request => {
        try {
            fs.appendFileSync('all_requests.txt', request.method() + ' ' + request.url() + '\n');
            if (request.method() === 'POST' && request.url().includes('api')) {
                fs.appendFileSync('api_posts.txt', request.url() + '\n' + request.postData() + '\n\n');
            }
        } catch (e) { }
    });

    console.log('Navigating...');
    await page.goto('https://www.pixelbin.io/ai-tools/video-generator', { waitUntil: 'domcontentloaded' });

    console.log('Taking page screenshot...');
    await page.waitForTimeout(5000); // give it time to render
    await page.screenshot({ path: 'screenshot.png', fullPage: true });

    console.log('Screenshot saved. Done.');
    await browser.close();
})();
