-- ============================================================
--  PsicoApoyo — Base de Datos MySQL
--  TacoCoders | ITESCAM | Administración de Bases de Datos
--  Motor: MySQL 8.0 / MariaDB 10.6+
--  Ejecutar en: phpMyAdmin → Nueva base de datos → Importar
-- ============================================================

-- ============================================================
-- 1. BASE DE DATOS
-- ============================================================
-- InfinityFree: la base de datos ya fue creada desde el panel.
-- No se necesita CREATE DATABASE ni USE aquí.

-- ============================================================
-- 2. TABLAS
-- ============================================================

-- ------------------------------------------------------------
-- 2.1 ROLES — tipos de usuario del sistema
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
  id_rol      TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre_rol  VARCHAR(30)      NOT NULL,
  descripcion VARCHAR(120)     NULL,
  CONSTRAINT pk_roles PRIMARY KEY (id_rol),
  CONSTRAINT uq_roles_nombre UNIQUE (nombre_rol)
) ENGINE=InnoDB COMMENT='Roles del sistema: admin, psicologo, usuario';

INSERT INTO roles (nombre_rol, descripcion) VALUES
  ('admin',      'Administrador del sistema'),
  ('psicologo',  'Psicólogo registrado'),
  ('usuario',    'Usuario general o persona en crisis');

-- ------------------------------------------------------------
-- 2.2 USUARIOS — credenciales de acceso
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario   INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  username     VARCHAR(60)      NOT NULL,
  password_hash VARCHAR(255)    NOT NULL  COMMENT 'bcrypt hash',
  id_rol       TINYINT UNSIGNED NOT NULL  DEFAULT 3,
  activo       TINYINT(1)       NOT NULL  DEFAULT 1,
  fecha_alta   DATETIME         NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  ultimo_login DATETIME         NULL,
  CONSTRAINT pk_usuarios  PRIMARY KEY (id_usuario),
  CONSTRAINT uq_username  UNIQUE      (username),
  CONSTRAINT fk_usr_rol   FOREIGN KEY (id_rol)
    REFERENCES roles(id_rol) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB COMMENT='Credenciales de acceso al sistema';

-- Índice para búsquedas frecuentes por username
CREATE INDEX idx_usuarios_username ON usuarios(username);
CREATE INDEX idx_usuarios_rol      ON usuarios(id_rol);

-- Usuarios demo (contraseñas en texto: admin2025 / psico2025)
INSERT INTO usuarios (username, password_hash, id_rol) VALUES
  ('admin',     '$2y$12$demoHashAdminXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', 1),
  ('dra.eliza', '$2y$12$demoHashPsicoXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', 2);

-- ------------------------------------------------------------
-- 2.3 PSICOLOGOS — perfil profesional
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS psicologos (
  id_psicologo  INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  id_usuario    INT UNSIGNED    NOT NULL,
  nombre_completo VARCHAR(120)  NOT NULL,
  cedula        VARCHAR(40)     NULL,
  especialidad  VARCHAR(80)     NULL     DEFAULT 'Psicología Clínica',
  correo        VARCHAR(120)    NULL,
  telefono      VARCHAR(20)     NULL,
  disponible    ENUM('disponible','limitado','no') NOT NULL DEFAULT 'disponible',
  biografia     TEXT            NULL,
  foto_url      VARCHAR(255)    NULL,
  fecha_registro DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_psicologos     PRIMARY KEY (id_psicologo),
  CONSTRAINT uq_psi_usuario    UNIQUE      (id_usuario),
  CONSTRAINT fk_psi_usuario    FOREIGN KEY (id_usuario)
    REFERENCES usuarios(id_usuario) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='Perfil profesional de los psicólogos';

CREATE INDEX idx_psicologos_disponible ON psicologos(disponible);

INSERT INTO psicologos (id_usuario, nombre_completo, cedula, especialidad, correo, telefono)
VALUES (2, 'Dra. Eliza de la Torre', 'PSI-2024-001', 'Psicología Clínica', 'eliza@psicoapoyo.mx', '999-000-0001');

-- ------------------------------------------------------------
-- 2.4 CUESTIONARIOS — sesión de evaluación emocional
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cuestionarios (
  id_cuestionario INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  perspectiva     ENUM('personal','familiar') NOT NULL DEFAULT 'personal',
  nivel_riesgo    ENUM('verde','amarillo','rojo') NOT NULL DEFAULT 'verde',
  puntaje_pct     TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Porcentaje 0-100',
  ip_origen       VARCHAR(45)    NULL     COMMENT 'IPv4 o IPv6',
  user_agent      VARCHAR(300)   NULL,
  fecha_realizado DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_cuestionarios PRIMARY KEY (id_cuestionario)
) ENGINE=InnoDB COMMENT='Registro de cada evaluación emocional realizada';

-- Índices para reportes por nivel y fecha
CREATE INDEX idx_cues_nivel ON cuestionarios(nivel_riesgo);
CREATE INDEX idx_cues_fecha ON cuestionarios(fecha_realizado);

-- ------------------------------------------------------------
-- 2.5 RESPUESTAS — respuestas individuales por pregunta
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS respuestas (
  id_respuesta    INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  id_cuestionario INT UNSIGNED   NOT NULL,
  numero_pregunta TINYINT UNSIGNED NOT NULL COMMENT '1-14',
  texto_pregunta  VARCHAR(300)   NOT NULL,
  valor_respuesta TINYINT UNSIGNED NOT NULL COMMENT '0=nunca, 1=a veces, 2=seguido, 3=siempre',
  es_critica      TINYINT(1)     NOT NULL DEFAULT 0,
  CONSTRAINT pk_respuestas   PRIMARY KEY (id_respuesta),
  CONSTRAINT fk_res_cues     FOREIGN KEY (id_cuestionario)
    REFERENCES cuestionarios(id_cuestionario) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='Respuesta por pregunta de cada cuestionario';

CREATE INDEX idx_resp_cuestionario ON respuestas(id_cuestionario);
-- Índice para detectar preguntas críticas con alta respuesta
CREATE INDEX idx_resp_critica_valor ON respuestas(es_critica, valor_respuesta);

-- ------------------------------------------------------------
-- 2.6 SOLICITUDES_CONTACTO — formulario de ayuda enviado
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS solicitudes_contacto (
  id_solicitud    INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  id_cuestionario INT UNSIGNED   NULL     COMMENT 'NULL si no hizo cuestionario',
  id_psicologo    INT UNSIGNED   NULL     COMMENT 'Psicólogo asignado (NULL=sin asignar)',
  nombre_solicitante VARCHAR(100) NOT NULL DEFAULT 'Anónimo',
  contacto        VARCHAR(150)   NULL     COMMENT 'WhatsApp o correo del solicitante',
  tipo_solicitante ENUM('personal','familiar','amigo','profesional') NOT NULL DEFAULT 'personal',
  medio_respuesta ENUM('WhatsApp','Correo electrónico','Videollamada') NULL,
  mensaje         TEXT           NOT NULL,
  nivel_riesgo    ENUM('verde','amarillo','rojo') NOT NULL DEFAULT 'verde',
  estado          ENUM('nueva','leida','atendida','archivada') NOT NULL DEFAULT 'nueva',
  nota_interna    TEXT           NULL     COMMENT 'Nota privada del psicólogo',
  fecha_envio     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_atencion  DATETIME       NULL,
  CONSTRAINT pk_solicitudes    PRIMARY KEY (id_solicitud),
  CONSTRAINT fk_sol_cues       FOREIGN KEY (id_cuestionario)
    REFERENCES cuestionarios(id_cuestionario) ON DELETE SET NULL,
  CONSTRAINT fk_sol_psi        FOREIGN KEY (id_psicologo)
    REFERENCES psicologos(id_psicologo) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='Solicitudes de contacto enviadas al equipo de psicólogos';

-- Índices para filtrar por estado y urgencia
CREATE INDEX idx_sol_nivel   ON solicitudes_contacto(nivel_riesgo);
CREATE INDEX idx_sol_estado  ON solicitudes_contacto(estado);
CREATE INDEX idx_sol_fecha   ON solicitudes_contacto(fecha_envio);
CREATE INDEX idx_sol_psi     ON solicitudes_contacto(id_psicologo);
-- Índice compuesto: solicitudes urgentes sin atender (consulta más frecuente del portal)
CREATE INDEX idx_sol_urgentes ON solicitudes_contacto(nivel_riesgo, estado);

-- ------------------------------------------------------------
-- 2.7 LOG_AUDITORIA — monitoreo de todas las acciones
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS log_auditoria (
  id_log       BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  id_usuario   INT UNSIGNED     NULL     COMMENT 'NULL = acción de usuario no autenticado',
  accion       VARCHAR(80)      NOT NULL COMMENT 'Ej: LOGIN, NUEVA_SOLICITUD, MARCAR_LEIDA',
  tabla_afectada VARCHAR(50)    NULL,
  id_registro  INT UNSIGNED     NULL     COMMENT 'ID del registro afectado',
  detalle      TEXT             NULL     COMMENT 'JSON con datos relevantes',
  ip_origen    VARCHAR(45)      NULL,
  fecha_accion DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_log PRIMARY KEY (id_log),
  CONSTRAINT fk_log_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuarios(id_usuario) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='Auditoría completa de todas las acciones del sistema';

-- Índice para consultas de auditoría por fecha y acción
CREATE INDEX idx_log_fecha  ON log_auditoria(fecha_accion);
CREATE INDEX idx_log_accion ON log_auditoria(accion);
CREATE INDEX idx_log_usr    ON log_auditoria(id_usuario);


-- ============================================================
-- NOTA: InfinityFree no soporta VISTAS, STORED PROCEDURES ni TRIGGERS
-- en el plan gratuito. Toda esa lógica está implementada en api.php.
-- El script termina aquí — las tablas ya están creadas correctamente.
-- ============================================================

-- ============================================================
-- ACTUALIZACIÓN: Agregar campos whatsapp y calendly
-- Ejecutar si ya tienes la BD creada
-- ============================================================
ALTER TABLE psicologos
  ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(30)  NULL COMMENT 'Número WhatsApp con código de país',
  ADD COLUMN IF NOT EXISTS calendly VARCHAR(255) NULL COMMENT 'URL de Calendly para videollamadas';

-- ============================================================
-- TABLA: chat_mensajes — Opción A chat con psicólogo
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_mensajes (
    id_mensaje  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sesion_id   VARCHAR(64)  NOT NULL COMMENT 'ID único de la sesión de chat',
    remitente   ENUM('usuario','psicologo') NOT NULL DEFAULT 'usuario',
    texto       TEXT         NOT NULL,
    leido       TINYINT(1)   NOT NULL DEFAULT 0,
    fecha_envio DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_sesion (sesion_id),
    INDEX idx_fecha  (fecha_envio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
