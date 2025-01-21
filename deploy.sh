#!/bin/bash

# Функция для вывода справки
show_help() {
  echo "Usage: ./deploy.sh [OPTIONS]"
  echo "Options:"
  echo "  -r, --rebuild-db    Пересоздать базу данных"
  echo "  -h, --help         Показать справку"
}

# Парсим аргументы
REBUILD_DB=false

while [[ $# -gt 0 ]]; do
  case $1 in
    -r|--rebuild-db)
      REBUILD_DB=true
      shift
      ;;
    -h|--help)
      show_help
      exit 0
      ;;
    *)
      echo "Неизвестный параметр: $1"
      show_help
      exit 1
      ;;
  esac
done

# Pull latest changes
git pull

# Проверяем наличие .env файла
if [ ! -f .env ]; then
    echo "Creating .env file from .env.example"
    cp .env.example .env
    echo "Please update .env file with your credentials"
    exit 1
fi

# Создаем необходимые директории
mkdir -p db/init
mkdir -p db/config

# Проверяем наличие файлов инициализации БД
if [ ! -f db/init/01-schema.sql ] || [ ! -f db/init/02-seed.sql ]; then
    echo "Database initialization files not found!"
    exit 1
fi

# Проверяем наличие конфигурационного файла PostgreSQL
if [ ! -f db/config/postgresql.conf ]; then
    echo "PostgreSQL configuration file not found!"
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

# Ждем, пока база данных будет готова
echo "Waiting for database to be ready..."
sleep 10

# Проверяем статус сервисов
echo "Checking services status..."
docker compose ps

# Проверяем, что таблицы созданы
echo "Checking database tables..."
docker compose exec postgres psql -U postgres -d boards_nexus -c "\dt"

echo "Deployment completed successfully!"
echo "Frontend: http://localhost:8080"
echo "Backend: http://localhost:3001"
echo "Database: localhost:5433"
echo ""
echo "Default admin credentials:"
echo "Telegram: admin"
echo "Password: admin123"

if [ "$REBUILD_DB" = true ]; then
    echo ""
    echo "Database was rebuilt!"
fi 
250936f5