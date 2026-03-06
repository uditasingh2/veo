const { chromium } = require('playwright');
const fs = require('fs');

async function checkSession(name, sessionOptions = {}) {
    console.log(`\n--- Testing Session: ${name} ---`);
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext(sessionOptions);
    const page = await context.newPage();

    try {
        console.log('Navigating...');
        await page.goto('https://www.pixelbin.io/ai-tools/video-generator', {
            waitUntil: 'commit',
            timeout: 60000
        });

        // Wait a bit for JS to execute
        await page.waitForTimeout(10000);

        const cookies = await context.cookies();
        const localStorage = await page.evaluate(() => JSON.stringify(window.localStorage));

        console.log(`Cookies: ${cookies.map(c => c.name).join(', ')}`);

        const button = await page.locator('[data-testid="sample-btn"]').first();
        if (await button.isVisible()) {
            const isDisabled = await button.isDisabled();
            console.log(`Button state: ${isDisabled ? 'DISABLED' : 'ENABLED'}`);
        } else {
            console.log('Button not found');
        }

        const bodyText = await page.innerText('body');
        if (bodyText.toLowerCase().includes('credit')) {
            console.log('Found "credit" text on page');
            // Log a snippet around the word 'credit'
            const index = bodyText.toLowerCase().indexOf('credit');
            console.log(`Context: ...${bodyText.substring(index - 20, index + 20)}...`);
        } else {
            console.log('No "credit" text found on page');
        }

        await browser.close();
    } catch (e) {
        console.error(`Error in ${name}: ${e.message}`);
        await browser.close();
    }
}

(async () => {
    // 1. Clean session
    await checkSession('Clean Session');

    // 2. Different User Agent
    await checkSession('Mobile User Agent', {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
    });
})();
