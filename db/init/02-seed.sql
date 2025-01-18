-- Создание администратора по умолчанию с паролем admin123
INSERT INTO users (
    name,
    telegram_login,
    password_hash,
    is_admin
) VALUES (
    'Admin User',
    'admin',
    '$2a$12$/rv59HkgQ/L1Q54uA1GkneWvVb8vvvkkPzo3JFagiQ0S6GBVIqobS', -- admin123
    true
); 