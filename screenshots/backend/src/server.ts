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

// Глобальное состояние для отслеживания текущего процесса
let currentProcess: {
    total: number;
    completed: number;
    screenshots: { snapshotUrl: string; original: string; timestamp: string; filePath: string }[];
    clients: Response[];
    logs: string[];
} | null = null;

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

    if (currentProcess) {
        return res.status(429).json({ error: 'Процесс уже запущен. Пожалуйста, дождитесь завершения.' });
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

        currentProcess = {
            total: allSnapshots.length,
            completed: 0,
            screenshots: [],
            clients: [],
            logs: [],
        };

        // Запускаем процесс в фоновом режиме
        processSnapshots(allSnapshots, currentProcess).then(() => {
            currentProcess = null;
        }).catch((error) => {
            console.error('Ошибка при обработке скриншотов:', error);
            currentProcess = null;
        });

        res.status(200).json({ message: 'Процесс запущен' });
    } catch (error) {
        console.error('Ошибка при обработке запросов:', error);
        res.status(500).json({ error: 'Ошибка при генерации скриншотов' });
    }
});

app.get('/progress', (req: Request, res: Response) => {
    if (!currentProcess) {
        res.status(204).end(); // Нет активного процесса
        return;
    }

    // Захватываем текущее состояние процесса и явно указываем, что оно не null
    const process = currentProcess as NonNullable<typeof currentProcess>;

    // Устанавливаем заголовки SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    process.clients.push(res);

    // Отправляем логи, если они есть
    process.logs.forEach((log) => {
        res.write(`data: ${JSON.stringify({ type: 'log', message: log })}\n\n`);
    });

    // Убираем клиента при разрыве соединения
    req.on('close', () => {
        process.clients = process.clients.filter((client) => client !== res);
    });
});

async function processSnapshots(
    allSnapshots: { timestamp: string; original: string; snapshotUrl: string }[],
    process: NonNullable<typeof currentProcess>
) {
    const maxConcurrentScreenshots = 3;
    const queue = allSnapshots.slice(); // Копируем массив

    const processSnapshot = async (snapshot: { snapshotUrl: string; original: string; timestamp: string }) => {
        const { snapshotUrl, original, timestamp } = snapshot;
        const urlObj = new URL(snapshotUrl);
        const hostname = urlObj.hostname.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const dateStr = formatTimestamp(timestamp);

        const fileName = `${hostname}_${dateStr}.png`;
        const filePath = path.join(outputDir, fileName);

        try {
            const logMessage = `Начало обработки: ${snapshotUrl}`;
            console.log(logMessage);
            process.logs.push(logMessage);
            broadcast(process, { type: 'log', message: logMessage });

            await takeScreenshot(snapshotUrl, filePath);

            process.screenshots.push({
                snapshotUrl,
                original,
                timestamp,
                filePath: `http://localhost:${PORT}/screenshots/${fileName}`,
            });

            process.completed++;
            broadcast(process, {
                type: 'progress',
                completed: process.completed,
                total: process.total,
            });

            const successMessage = `Скриншот создан: ${snapshotUrl}`;
            console.log(successMessage);
            process.logs.push(successMessage);
            broadcast(process, { type: 'log', message: successMessage });
        } catch (error) {
            const errorMessage = `Ошибка при создании скриншота для ${snapshotUrl}`;
            console.error(errorMessage, error);
            process.logs.push(errorMessage);
            broadcast(process, { type: 'log', message: errorMessage });
            process.completed++;
            broadcast(process, {
                type: 'progress',
                completed: process.completed,
                total: process.total,
            });
        }
    };

    const executing: Promise<void>[] = [];

    while (queue.length > 0 || executing.length > 0) {
        while (executing.length < maxConcurrentScreenshots && queue.length > 0) {
            const snapshot = queue.shift();
            if (snapshot) {
                const promise = processSnapshot(snapshot);
                executing.push(promise);
                promise.finally(() => {
                    executing.splice(executing.indexOf(promise), 1);
                });
            }
        }
        if (executing.length > 0) {
            await Promise.race(executing);
        } else {
            break;
        }
    }
    await Promise.all(executing);

    broadcast(process, {
        type: 'complete',
        total: process.total,
        success: process.screenshots.length,
        screenshots: process.screenshots,
    });

    process.clients.forEach((client) => client.end());
}

function broadcast(
    process: NonNullable<typeof currentProcess>,
    message: object
) {
    const data = `data: ${JSON.stringify(message)}\n\n`;
    process.clients.forEach((client) => client.write(data));
}

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

function formatTimestamp(timestamp: string): string {
    const year = timestamp.substring(0, 4);
    const month = timestamp.substring(4, 6);
    const day = timestamp.substring(6, 8);

    const date = new Date(`${year}-${month}-${day}`);
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-US', options).replace(/ /g, '_');
}

app.use('/screenshots', express.static(outputDir));

app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});
