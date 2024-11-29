import puppeteer, { Browser } from 'puppeteer';

let browserInstance: Browser | null = null;

async function getBrowserInstance(): Promise<Browser> {
    if (!browserInstance) {
        browserInstance = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            protocolTimeout: 120000,
        });
    }
    return browserInstance;
}

export async function takeScreenshot(url: string, outputPath: string): Promise<void> {
    console.log(`Попытка создать скриншот для URL: ${url}`);
    console.log(`Скриншот будет сохранен в: ${outputPath}`);

    const browser = await getBrowserInstance();
    const page = await browser.newPage();

    try {
        await page.setViewport({ width: 1280, height: 720 });

        // Опционально блокируем ненужные ресурсы для ускорения загрузки
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            if (['stylesheet', 'font', 'media'].includes(request.resourceType())) {
                request.abort();
            } else {
                request.continue();
            }
        });

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });
        console.log(`Страница ${url} загружена. Сохранение скриншота...`);

        await page.screenshot({ path: outputPath, fullPage: false });
        console.log(`Скриншот для ${url} успешно сохранен.`);
    } catch (error) {
        console.error(`Ошибка при создании скриншота для ${url}:`, error);
        throw error;
    } finally {
        await page.close();
    }
}

function handleExit(signal: NodeJS.Signals) {
    console.log(`Получен сигнал ${signal}. Закрытие экземпляра браузера...`);
    if (browserInstance) {
        browserInstance.close().then(() => {
            console.log('Экземпляр браузера закрыт.');
            process.exit(0);
        }).catch((error) => {
            console.error('Ошибка при закрытии браузера:', error);
            process.exit(1);
        });
    } else {
        process.exit(0);
    }
}

process.on('SIGINT', handleExit);
process.on('SIGTERM', handleExit);
