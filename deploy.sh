#!/bin/bash

# Проверяем наличие .env файла
if [ ! -f .env ]; then
    echo "Creating .env file from .env.example"
    cp .env.example .env
    echo "Please update .env file with your credentials"
    exit 1
fi

# Создаем директорию для инициализации БД если её нет
mkdir -p db/init

# Проверяем наличие файлов инициализации БД
if [ ! -f db/init/01-schema.sql ] || [ ! -f db/init/02-seed.sql ]; then
    echo "Database initialization files not found!"
    exit 1
fi

# Останавливаем и удаляем старые контейнеры
echo "Stopping and removing old containers..."
docker-compose down -v

# Запускаем Docker Compose
echo "Starting Docker Compose..."
docker-compose up -d

# Ждем, пока база данных будет готова
echo "Waiting for database to be ready..."
sleep 10

# Проверяем статус сервисов
echo "Checking services status..."
docker-compose ps

# Проверяем, что таблицы созданы
echo "Checking database tables..."
docker-compose exec postgres psql -U postgres -d boards_nexus -c "\dt"

echo "Deployment completed!"
echo "Frontend: http://localhost"
echo "Backend: http://localhost:3001"
echo "Database: localhost:5433"
echo ""
echo "Default admin credentials:"
echo "Email: admin@example.com"
echo "Password: admin123" 