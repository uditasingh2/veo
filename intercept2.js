const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    page.on('request', request => {
        try {
            if (request.method() === 'POST') {
                fs.appendFileSync('api_posts2.txt', request.url() + '\n' + request.postData() + '\n\n');
            }
        } catch (e) { }
    });

    console.log('Navigating...');
    await page.goto('https://www.pixelbin.io/ai-tools/video-generator', { waitUntil: 'load' });

    try {
        console.log('Waiting for textarea...');
        await page.waitForSelector('textarea', { state: 'visible' });
        const input = await page.locator('textarea').first();
        await input.fill('A cute fluffy cat playing a tiny piano, highly detailed 4k');
        await page.waitForTimeout(1000);

        console.log('Finding generate button...');
        // It might be disabled initially or require clicking something else first
        const button = await page.locator('button:has-text("Generate")').first();

        const isDisabled = await button.isDisabled();
        console.log('Is button disabled?', isDisabled);

        if (isDisabled) {
            console.log('Button is disabled. We might need to login.');
        } else {
            console.log('Clicking generate...');
            await button.click({ force: true });
            console.log('Waiting for generation...');
            await page.waitForTimeout(15000);
        }

    } catch (e) {
        console.log("Error interacting with page:", e.message);
    }

    console.log('Done.');
    await browser.close();
})();
