-- ============================================================
-- actualizar_auth.sql — Contraseñas con bcrypt para producción
-- Ejecutar en phpMyAdmin o MySQL de WSL (base de datos: psicoapoyo)
-- ============================================================

-- Roles
INSERT IGNORE INTO roles (id_rol, nombre) VALUES (1, 'admin'), (2, 'psicologo');

-- Admin con contraseña cifrada (bcrypt de: admin2025)
INSERT INTO usuarios (id_usuario, username, password_hash, id_rol)
VALUES (1, 'admin', '$2b$10$rjrQ7NeqfYPSTnIYvmhI0ugD.zAT1ywc.4bUrPVbMMMgjXUgO.nIS', 1)
ON DUPLICATE KEY UPDATE password_hash = '$2b$10$rjrQ7NeqfYPSTnIYvmhI0ugD.zAT1ywc.4bUrPVbMMMgjXUgO.nIS', id_rol = 1;

-- Psicóloga Eliza con contraseña cifrada (bcrypt de: psico2025)
INSERT INTO usuarios (id_usuario, username, password_hash, id_rol)
VALUES (2, 'dra.eliza', '$2b$10$xJKORjARIgdndKmAxsDBzeedH.Rq7Zp5gYnxae4hPk.eRUVgm1CBG', 2)
ON DUPLICATE KEY UPDATE password_hash = '$2b$10$xJKORjARIgdndKmAxsDBzeedH.Rq7Zp5gYnxae4hPk.eRUVgm1CBG', id_rol = 2;

-- Perfil de la Dra. Eliza
INSERT INTO psicologos (id_psicologo, id_usuario, nombre_completo, especialidad, disponible)
VALUES (1, 2, 'Dra. Eliza de la Torre', 'Psicología Clínica', 1)
ON DUPLICATE KEY UPDATE id_usuario = 2, nombre_completo = 'Dra. Eliza de la Torre';
