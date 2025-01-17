-- Создание администратора по умолчанию с паролем admin123
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
    '$2a$12$/rv59HkgQ/L1Q54uA1GkneWvVb8vvvkkPzo3JFagiQ0S6GBVIqobS',
    true,
    '@admin'
); 