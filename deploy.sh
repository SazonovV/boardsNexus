#!/bin/bash






# Проверяем наличие .env файла
if [ ! -f .env ]; then
    echo "Creating .env file from .env.example"
    cp .env.example .env
    echo "Please update .env file with your credentials"
    exit 1
fi


# Останавливаем и удаляем старые контейнеры
echo "Stopping and removing old containers..."
if [ "$REBUILD_DB" = true ]; then
    echo "Removing database volume..."
    docker compose down -v
else
    docker compose down
fi

# Удаляем старые образы
echo "Removing old images..."
docker rmi $(docker images 'boards-nexus-frontend' -q) 2>/dev/null || true
docker rmi $(docker images 'boards-nexus-backend' -q) 2>/dev/null || true

# Запускаем Docker Compose
echo "Starting Docker Compose..."
docker compose up -d

# Оставляем только запуск приложения
echo "Application deployed successfully"

echo "Frontend: http://localhost:8080"
echo "Backend: http://localhost:3001"

250936f5