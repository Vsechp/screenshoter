import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import { takeScreenshot } from './screenshot';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import axios from 'axios';

const app = express();
const PORT = 3000;

const outputDir = path.join(__dirname, '../screenshots');

app.use(cors({
    origin: 'http://localhost:4200',
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

function clearScreenshotsDir() {
    if (fs.existsSync(outputDir)) {
        fs.readdirSync(outputDir).forEach((file) => {
            fs.unlinkSync(path.join(outputDir, file));
        });
    }
}

app.post('/generate', async (req: Request, res: Response) => {
    const domains: string[] = req.body.domains;
    const from: string = req.body.from;
    const to: string = req.body.to;

    if (!domains || !Array.isArray(domains) || domains.length === 0) {
        return res.status(400).json({ error: 'Список доменов пустой!' });
    }

    if (!from || !to) {
        return res.status(400).json({ error: 'Не указан период дат!' });
    }

    clearScreenshotsDir();

    const allSnapshots: { timestamp: string; original: string; snapshotUrl: string }[] = [];

    try {
        for (const domain of domains) {
            const snapshots = await getSnapshotsForDomain(domain, from, to);
            allSnapshots.push(...snapshots);
        }

        if (allSnapshots.length === 0) {
            return res.status(404).json({ error: 'Снимки для указанных доменов и дат не найдены.' });
        }

        const maxConcurrentScreenshots = 5;
        const screenshots: { snapshotUrl: string; original: string; timestamp: string; filePath: string }[] = [];
        const queue = allSnapshots.map((item, index) => ({ ...item, index }));

        async function processBatch(batch: { snapshotUrl: string; original: string; timestamp: string; index: number }[]) {
            return Promise.allSettled(
                batch.map(async ({ snapshotUrl, original, timestamp, index }) => {
                    // Получаем хостнейм из оригинального URL
                    const urlObj = new URL(original.startsWith('http') ? original : `http://${original}`);
                    const hostname = urlObj.hostname.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                    const dateStr = formatTimestamp(timestamp); // Форматируем дату

                    const fileName = `${hostname}_${dateStr}.png`;
                    const filePath = path.join(outputDir, fileName);

                    try {
                        await takeScreenshot(snapshotUrl, filePath);
                        return {
                            snapshotUrl,
                            original,
                            timestamp,
                            filePath: `http://localhost:${PORT}/screenshots/${fileName}`,
                        };
                    } catch (error) {
                        console.error(`Ошибка при создании скриншота для ${snapshotUrl}:`, error);
                        return null;
                    }
                })
            );
        }

        function formatTimestamp(timestamp: string): string {
            const year = timestamp.substring(0, 4);
            const month = timestamp.substring(4, 6);
            const day = timestamp.substring(6, 8);

            const date = new Date(`${year}-${month}-${day}`);
            const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
            return date.toLocaleDateString('en-US', options).replace(/ /g, '_');
        }

        async function processQueue() {
            while (queue.length > 0) {
                const batch = queue.splice(0, maxConcurrentScreenshots);
                const results = await processBatch(batch);

                results.forEach((result) => {
                    if (result.status === 'fulfilled' && result.value) {
                        screenshots.push(result.value);
                    } else if (result.status === 'rejected') {
                        console.error('Ошибка выполнения промиса:', result.reason);
                    }
                });
            }
        }

        await processQueue();
        res.json({ total: allSnapshots.length, screenshots });

    } catch (error) {
        console.error('Ошибка при обработке запросов:', error);
        res.status(500).json({ error: 'Ошибка при генерации скриншотов' });
    }
});

async function getSnapshotsForDomain(domain: string, from: string, to: string): Promise<{ timestamp: string; original: string; snapshotUrl: string }[]> {
    const apiUrl = `http://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(
        domain
    )}&from=${from}&to=${to}&output=json&fl=timestamp,original&collapse=digest`;

    try {
        const response = await axios.get(apiUrl);
        const data = response.data;

        if (data && data.length > 1) {
            data.shift(); // Удаляем заголовок
            return data.map((item: any) => ({
                timestamp: item[0],
                original: item[1],
                snapshotUrl: `http://web.archive.org/web/${item[0]}if_/${item[1]}`,
            }));
        }
        return [];
    } catch (error) {
        console.error(`Ошибка при запросе к Internet Archive для домена ${domain}:`, error);
        return [];
    }
}

app.use('/screenshots', express.static(outputDir));

app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});
