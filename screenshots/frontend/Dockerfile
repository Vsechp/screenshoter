FROM node:20

# Рабочая директория в контейнере
WORKDIR /app

# Копируем package.json и lock-файл
COPY package*.json angular.json tsconfig.json tsconfig.app.json ./

# Устанавливаем зависимости
RUN npm install --legacy-peer-deps
RUN npm install -g @angular/cli

# Копируем остальные файлы проекта (src, и пр.)
COPY src ./src
COPY public ./public

# Команда запуска приложения

CMD ["ng", "serve", "--host", "0.0.0.0"]
