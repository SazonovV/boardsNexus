-- Создание администратора по умолчанию с паролем admin123
INSERT INTO users (
    name,
    telegram_login,
    password_hash,
    is_admin
) VALUES (
    'Admin User',
    'admin',
    '$2a$12$64XweW3aE3aGRgx1Qcr0yeptSxT/ofe49noEbByy3Lr/CulZLVbcy', -- admin123
    true
); 