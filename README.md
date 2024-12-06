# Screenshoter

Screenshoter — это простой и удобный инструмент для создания скриншотов из Internet Archive

## Функции

- Захват скриншотов за определенный временной период
- Возможность задания до 10 url

## Установка

### Клонирование репозитория

```bash
git clone https://github.com/Vsechp/screenshoter.git
cd screenshots
```
### Установка зависимостей для backend

```bash
cd backend/
npm i
npx tsc
```

### Установка зависимостей для frontend

```bash
cd frontend/
npm install --legacy-peer-deps
```

## Запуск

### Запуск сервера backend

```bash
cd backend/
npm run start
```

### Запуск сервера frontend

```bash
cd frontend/
ng start
```

## Запуск с помощью Docker

### Создание и запуск контейнера

```bash
cd screenshots/
docker-compose up --build
```

### Запуск созданного контейнера

```bash
docker-compose up
```

### Остановка созданного контейнера

```bash
docker-compose down
```

## Адрес сервиса

– Frontend сервиса будет доступен по адресу: http://localhost:4200/
