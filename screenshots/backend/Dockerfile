# /Users/admin/my_projects/screenshots/backend/Dockerfile

FROM node:20

# Устанавливаем системные зависимости, необходимые для запуска Puppeteer (Chromium)
RUN apt-get update && apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    libxrender1 \
    wget \
    xdg-utils \
    gnupg \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Копируем package.json и tsconfig.json
COPY package*.json tsconfig.json ./

# Устанавливаем зависимости проекта (включая Puppeteer)
RUN npm install --legacy-peer-deps

# Копируем исходный код
COPY src ./src

# Компилируем TypeScript
RUN npx tsc

# Запускаем приложение
CMD ["npm", "start"]
