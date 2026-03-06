const { chromium } = require('playwright');
const fs = require('fs');
const https = require('https');
const http = require('http');

(async () => {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Listen for API responses that may contain the video
    let videoUrl = null;
    let apiRequests = [];

    page.on('request', async (request) => {
        const url = request.url();
        const method = request.method();
        // Log any POST requests made while we try to generate
        if (method === 'POST') {
            const entry = `${method} ${url}\nPOST DATA: ${request.postData() || 'none'}\n---\n`;
            fs.appendFileSync('live_api_posts.txt', entry);
        }
    });

    page.on('response', async (response) => {
        const url = response.url();
        // Catch any response that returns a video URL or the video itself
        if (url.includes('predict') || url.includes('generate') || url.includes('video-gen') || url.includes('inference')) {
            try {
                const body = await response.text();
                fs.appendFileSync('live_api_responses.txt', `URL: ${url}\nBODY: ${body.substring(0, 3000)}\n---\n`);
                // Check if there's a video URL in the response
                const mp4Match = body.match(/(https?:\/\/[^\s"']+\.mp4[^\s"']*)/);
                if (mp4Match) {
                    videoUrl = mp4Match[1];
                    console.log('✅ Found video URL in API response:', videoUrl);
                }
            } catch (e) { }
        }
    });

    console.log('🚀 Navigating to Pixelbin Video Generator...');
    await page.goto('https://www.pixelbin.io/ai-tools/video-generator', { waitUntil: 'load' });

    // Wait for the JS to finish rendering
    await page.waitForTimeout(4000);

    console.log('📝 Looking for prompt textarea (id=video-prompt)...');
    const textarea = await page.$('textarea#video-prompt');

    if (!textarea) {
        console.log('❌ Textarea not found! Saving page HTML for inspection...');
        const html = await page.content();
        fs.writeFileSync('page.html', html);
        console.log('Page saved to page.html. Check it for the right selectors.');
        await browser.close();
        return;
    }

    console.log('✅ Found textarea. Focusing and typing prompt...');
    await textarea.click();
    await textarea.fill('A magical glowing forest at night with fireflies, 4k, cinematic');

    // Wait and then dispatch React-compatible input events to un-disable the button
    await page.evaluate(() => {
        const textarea = document.querySelector('textarea#video-prompt');
        if (!textarea) return;
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        nativeInputValueSetter.call(textarea, 'A magical glowing forest at night with fireflies, 4k, cinematic');
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await page.waitForTimeout(2000);

    console.log('Finding generate button...');
    const button = await page.$('[data-testid="sample-btn"]');

    if (!button) {
        console.log('❌ Button not found!');
    } else {
        const isDisabled = await button.isDisabled();
        console.log(`Button disabled: ${isDisabled}`);

        console.log('Clicking button with force...');
        await button.click({ force: true });

        console.log('⏳ Waiting up to 60 seconds for generation...');
        for (let i = 1; i <= 6; i++) {
            await page.waitForTimeout(10000);
            console.log(`⏱️  ${i * 10}s elapsed...`);
            await page.screenshot({ path: `step_${i}.png` });

            // Check for video URL from listener
            if (videoUrl) {
                console.log('🎬 Video URL captured, proceeding to download...');
                break;
            }

            // Also scan the DOM for fresh video sources
            const src = await page.evaluate(() => {
                const vid = document.querySelector('video source');
                return vid ? vid.src : null;
            });
            if (src && src.includes('.mp4')) {
                console.log('🎬 Found video in DOM:', src);
                videoUrl = src;
                break;
            }
        }
    }

    if (videoUrl) {
        console.log(`\n⬇️  Downloading video from: ${videoUrl}`);
        const file = fs.createWriteStream('generated_video.mp4');
        const protocol = videoUrl.startsWith('https') ? https : http;
        protocol.get(videoUrl, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log('✅ Video downloaded successfully as generated_video.mp4');
            });
        }).on('error', (err) => {
            console.log('❌ Download error:', err.message);
        });
        await page.waitForTimeout(10000);
    } else {
        console.log('\n❌ Could not find gen video URL. Check live_api_responses.txt and step_*.png files for clues.');
    }

    await browser.close();
    console.log('Done!');
})();
