const { chromium } = require('playwright');
const fs = require('fs');

async function testSession(userAgent) {
    console.log(`\n--- Testing with UA: ${userAgent.substring(0, 50)}... ---`);
    const browser = await chromium.launch({ headless: true });
    // Launching with a completely clean context (no cookies/storage)
    const context = await browser.newContext({
        userAgent: userAgent
    });
    const page = await context.newPage();

    try {
        await page.goto('https://www.pixelbin.io/ai-tools/video-generator', { waitUntil: 'networkidle' });

        // Check for session-related cookies or localStorage
        const cookies = await context.cookies();
        const localStorage = await page.evaluate(() => JSON.stringify(window.localStorage));

        console.log(`Cookies found: ${cookies.length}`);

        // Find the generate button
        const button = await page.locator('[data-testid="sample-btn"]').first();
        const isDisabled = await button.isDisabled();

        console.log(`Button state: ${isDisabled ? 'DISABLED' : 'ENABLED'}`);

        // Check if there's any "Credits" or "Limit" text on page
        const bodyText = await page.innerText('body');
        const hasCreditsText = bodyText.includes('credit') || bodyText.includes('limit') || bodyText.includes('free');

        await browser.close();
        return { isDisabled, cookies, hasCreditsText };
    } catch (e) {
        console.error(`Error: ${e.message}`);
        await browser.close();
        return null;
    }
}

(async () => {
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    ];

    for (const ua of userAgents) {
        await testSession(ua);
    }
})();
