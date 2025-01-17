-- Создание администратора по умолчанию с паролем admin123
INSERT INTO users (
    email, 
    name, 
    password_hash, 
    is_admin, 
    telegram_login,
    created_at,
    updated_at
) VALUES (
    'admin@example.com',
    'Admin User',
    -- пароль: admin123
    '$2a$10$rMB1Xj4Y4X9p5YgG5l.cZeq5UNwsH7XIy4qdHtKUyzN8TJk5lEp2q',
    true,
    '@admin',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
); 