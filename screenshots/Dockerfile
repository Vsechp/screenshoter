FROM node:18-alpine AS backend-build

WORKDIR /app/backend


COPY backend/package*.json ./
COPY backend/tsconfig.json ./
COPY backend/src ./src

RUN npm install
RUN npm run build

FROM node:18-alpine AS frontend-build

WORKDIR /app/frontend

COPY frontend/package*.json ./
COPY frontend/angular.json ./
COPY frontend/tsconfig*.json ./
COPY frontend/src ./src

RUN npm install
RUN npm run build -- --configuration production

# Stage 3: Final image
FROM node:18-alpine

WORKDIR /app

# Копируем бэкенд и фронтенд из предыдущих стадий
COPY --from=backend-build /app/backend/dist ./backend/dist
COPY --from=backend-build /app/backend/node_modules ./backend/node_modules
COPY --from=backend-build /app/backend/package.json ./backend/package.json
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Устанавливаем зависимости для финального контейнера
RUN npm install --prefix ./backend

# Устанавливаем переменные окружения
ENV PORT=3000
ENV NODE_ENV=production

# Запускаем бэкенд
CMD ["sh", "-c", "node backend/dist/server.js & npx http-server frontend/dist -p 4200"]
