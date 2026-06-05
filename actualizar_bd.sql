-- ============================================================
--  actualizar_bd.sql — PsicoApoyo
--  Solo agrega tablas y columnas NUEVAS sin tocar las existentes
--  Ejecutar en phpMyAdmin → base de datos psicoapoyo → Importar
-- ============================================================

-- Tabla de mensajes del chat
CREATE TABLE IF NOT EXISTS chat_mensajes (
    id_mensaje  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sesion_id   VARCHAR(64)  NOT NULL COMMENT 'ID único de sesión de chat',
    remitente   ENUM('usuario','psicologo') NOT NULL DEFAULT 'usuario',
    texto       TEXT         NOT NULL,
    leido       TINYINT(1)   NOT NULL DEFAULT 0,
    fecha_envio DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_sesion (sesion_id),
    INDEX idx_fecha  (fecha_envio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Nuevas columnas en psicologos (no hace nada si ya existen)
ALTER TABLE psicologos
  ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(30)  NULL COMMENT 'Número WhatsApp con código de país',
  ADD COLUMN IF NOT EXISTS calendly VARCHAR(255) NULL COMMENT 'URL de videollamadas';
