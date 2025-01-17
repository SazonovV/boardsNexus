-- Создание администратора по умолчанию
INSERT INTO users (
    email, 
    name, 
    password_hash, 
    is_admin, 
    telegram_login
) VALUES (
    'admin@example.com',
    'Admin User',
    -- пароль: admin123
    '$2b$10$rMB1Xj4Y4X9p5YgG5l.cZeq5UNwsH7XIy4qdHtKUyzN8TJk5lEp2q',
    true,
    '@admin'
); 