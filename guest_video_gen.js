const express = require('express');
const { chromium } = require('playwright');
const fs = require('fs');
const https = require('https');
const path = require('path');

const app = express();
const port = process.env.PORT || 10000;

// Global log to track generation history
let generationLogs = [];
const MAX_LOGS = 10;

function addLog(status, detail) {
    generationLogs.unshift({
        timestamp: new Date().toISOString(),
        status,
        detail
    });
    if (generationLogs.length > MAX_LOGS) generationLogs.pop();
}

// Helper to download video
async function downloadVideo(url, targetPath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(targetPath);
        https.get(url, (response) => {
            if (response.statusCode === 200) {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve();
                });
            } else {
                reject(new Error(`Failed to download: Status ${response.statusCode}`));
            }
        }).on('error', (err) => {
            fs.unlink(targetPath, () => { });
            reject(err);
        });
    });
}

// Global lock to prevent RAM crashes on Render
let isGenerating = false;

// Main Automation Logic
async function runAutomation(customPrompt = null) {
    if (isGenerating) {
        console.log("⚠️ A generation is already in progress. Skipping...");
        return null;
    }

    isGenerating = true;
    console.log(`\n🕒 [${new Date().toISOString()}] Starting automation cycle...`);

    const browser = await chromium.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote',
            '--single-process'
        ]
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    let capturedUrls = new Set();
    let videoCaptured = null;

    page.on('response', async (response) => {
        const url = response.url();
        if (url.includes('.mp4')) {
            capturedUrls.add(url);
        }
    });

    try {
        console.log('🌐 Navigating...');
        await page.goto('https://www.pixelbin.io/ai-tools/video-generator', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        console.log('🧹 Clearing session limits...');
        await page.evaluate(() => {
            localStorage.removeItem('rate_limit_video-generation');
        });

        await page.waitForTimeout(5000);

        const defaultPrompts = [
            'A futuristic dragon made of glass and fire, cinematic lighting',
            'A cyberpunk city street at night, neon rain, hyper-realistic',
            'A miniature galaxy inside a lightbulb, ethereal glow',
            'A steampunk owl made of gears and brass, highly detailed'
        ];

        const prompt = customPrompt || defaultPrompts[Math.floor(Math.random() * defaultPrompts.length)];

        console.log(`📝 Using prompt: "${prompt}"`);
        const textarea = page.locator('textarea#video-prompt');
        await textarea.fill(prompt);
        await page.evaluate(() => {
            const el = document.querySelector('textarea#video-prompt');
            if (el) el.dispatchEvent(new Event('input', { bubbles: true }));
        });

        await page.waitForTimeout(2000);

        console.log('🎬 Clicking Generate...');
        const generateBtn = page.locator('button:has-text("Generate")').first();

        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const genBtn = btns.find(b => b.innerText.includes('Generate'));
            if (genBtn) {
                genBtn.disabled = false;
                genBtn.click();
            }
        });

        try {
            await generateBtn.click({ force: true, timeout: 5000 });
        } catch (e) { }

        console.log('⏳ Monitoring for video URL...');
        const startTime = Date.now();
        while (Date.now() - startTime < 120000) {
            for (const url of capturedUrls) {
                if (!url.includes('image-to-video.mp4') &&
                    !url.includes('lemon-sky-view.mp4') &&
                    !url.includes('hailuo2.mp4')) {
                    videoCaptured = url;
                    break;
                }
            }
            if (videoCaptured) break;
            await page.waitForTimeout(2000);
        }

        if (videoCaptured) {
            console.log(`✅ Success! Video: ${videoCaptured}`);
            addLog('SUCCESS', `Generated: ${videoCaptured} (${prompt})`);
            const downloadDir = path.join(__dirname, 'downloads');
            if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir);
            const targetFile = path.join(downloadDir, `gen_${Date.now()}.mp4`);
            await downloadVideo(videoCaptured, targetFile);
            console.log('✨ Downloaded!');
        } else {
            console.log('❌ Could not identify custom video.');
            addLog('FAILURE', `Could not identify custom video URL for prompt: ${prompt}`);
        }

        return videoCaptured;

    } catch (err) {
        console.error('❌ Error:', err.message);
        addLog('ERROR', err.message);
        return null;
    } finally {
        await browser.close();
        isGenerating = false;
        console.log('🏁 Cycle finished.');
    }
}

// Keep-Alive Endpoint
app.get('/ping', (req, res) => {
    console.log('💓 Received ping! Keeping service awake.');
    res.send('Service is alive and cranking videos!');
});

// Status Monitoring Endpoint
app.get('/status', (req, res) => {
    res.json({
        service: 'Pixelbin Video Generator Bot',
        is_busy: isGenerating,
        uptime: process.uptime(),
        history: generationLogs
    });
});

// Manual Generation Endpoint
app.get('/generate', async (req, res) => {
    const prompt = req.query.prompt;
    if (!prompt) {
        return res.status(400).json({ error: "Please provide a 'prompt' query parameter." });
    }

    if (isGenerating) {
        return res.status(503).json({ error: "The generator is currently busy. Please try again in a few minutes." });
    }

    console.log(`📡 API Request received for prompt: "${prompt}"`);
    const videoUrl = await runAutomation(prompt);

    if (videoUrl) {
        res.json({ success: true, url: videoUrl });
    } else {
        res.status(500).json({ success: false, error: "Failed to generate video. Check /status for logs." });
    }
});

// Automatic Loop
const DELAY_MINUTES = 10;
async function startLoop() {
    while (true) {
        try {
            if (!isGenerating) {
                await runAutomation();
            }
        } catch (e) {
            console.error('Global Error:', e);
            addLog('GLOBAL_ERROR', e.message);
        }
        console.log(`💤 Sleeping for ${DELAY_MINUTES} minutes...`);
        await new Promise(r => setTimeout(r, DELAY_MINUTES * 60 * 1000));
    }
}

// Start Server
app.listen(port, () => {
    const baseUrl = process.env.RENDER_EXTERNAL_URL || `https://pixelbin-gen.onrender.com`;
    console.log(`🚀 Web Service active on port ${port}`);
    console.log(`🔗 Status URL: ${baseUrl}/status`);
    console.log(`🔗 Manual API: ${baseUrl}/generate?prompt=YOUR_PROMPT_HERE`);
    startLoop();
});
