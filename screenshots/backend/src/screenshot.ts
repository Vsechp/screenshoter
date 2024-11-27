import puppeteer, { Browser } from 'puppeteer';

let browserInstance: Browser | null = null;

async function getBrowserInstance(): Promise<Browser> {
    if (browserInstance) {
        await browserInstance.close();
    }

    browserInstance = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        protocolTimeout: 12000,
    });

    return browserInstance;
}

export async function takeScreenshot(url: string, outputPath: string): Promise<void> {
    console.log(`Attempting to create a screenshot for URL: ${url}`);
    console.log(`Screenshot will be saved at: ${outputPath}`);

    const browser = await getBrowserInstance();
    const page = await browser.newPage();

    try {
        const client = await page.target().createCDPSession();
        await client.send('Network.clearBrowserCache');
        await client.send('Network.clearBrowserCookies');

        await page.setViewport({ width: 1280, height: 720 });
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });
        console.log(`Page ${url} loaded. Saving screenshot...`);

        await page.screenshot({ path: outputPath, fullPage: false });
        console.log(`Screenshot for ${url} saved successfully.`);
    } catch (error) {
        console.error(`Error creating screenshot for ${url}:`, error);
    } finally {
        await page.close();
    }
}


process.on('exit', async () => {
    if (browserInstance) {
        await browserInstance.close();
    }
    console.log('Screenshot process completed successfully.');
});
