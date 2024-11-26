# Stage 1: Node.js для сборки Angular приложения
FROM node:20 AS builder

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем исходный код
COPY . .

# Собираем Angular приложение
RUN npm run build

# Stage 2: Nginx для сервинга собранного приложения
FROM nginx:alpine

# Копируем собранное приложение из Stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

# Открываем порт
EXPOSE 80

# Запускаем nginx
CMD ["nginx", "-g", "daemon off;"]
