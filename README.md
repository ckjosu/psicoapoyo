# PsicoApoyo — Sistema Web de Prevención del Suicidio
**TacoCoders | TecNM Campus Calkiní | ITESCAM 2026**

> ⚠️ Si usted o alguien que conoce está en crisis, llame ahora:
> **Línea de la Vida: 800-911-2000** · SAPTEL: 55 5259-8121 · Emergencias: 911

---

## Despliegue rápido con Docker (recomendado)

```bash
# 1. Clonar el repositorio
git clone https://github.com/ckjosu/psicoapoyo.git
cd psicoapoyo

# 2. Crear archivo de entorno (CAMBIAR las contraseñas antes de usar en producción)
cp .env.example .env
# Editar .env con un editor de texto y cambiar las contraseñas

# 3. Levantar los contenedores
docker compose up --build

# 4. Abrir en el navegador
#    http://localhost
```

El primer arranque importa automáticamente `database.sql` y `actualizar_auth.sql`.

**Credenciales iniciales** (cambiar en producción):
| Rol | Usuario | Contraseña |
|-----|---------|------------|
| Administrador | `admin` | `admin2025` |
| Psicóloga | `dra.eliza` | `psico2025` |

---

## Instalación local con XAMPP

1. Copiar la carpeta del proyecto a `C:\xampp\htdocs\psicoapoyo\`
2. Iniciar Apache y MySQL desde el Panel de Control de XAMPP
3. Abrir phpMyAdmin → crear base de datos `psicoapoyo` (charset utf8mb4)
4. Importar `database.sql` y luego `actualizar_auth.sql`
5. Abrir en el navegador: `http://localhost/psicoapoyo/`

> **Nota XAMPP:** si MySQL no inicia, eliminar `aria_log.00000001` y `aria_log_control`
> de `C:\xampp\mysql\data\` y volver a iniciar.

---

## Instalación en WSL 2 (Ubuntu 24.04)

```bash
sudo apt install -y apache2 php libapache2-mod-php php-mysql mysql-server

sudo service apache2 start
sudo service mysql start

sudo mysql -e "CREATE DATABASE psicoapoyo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql psicoapoyo < database.sql
sudo mysql psicoapoyo < actualizar_auth.sql

sudo cp -r . /var/www/html/psicoapoyo/
sudo chown -R www-data:www-data /var/www/html/psicoapoyo/

# Abrir: http://localhost/psicoapoyo/
```

---

## Estructura del proyecto

```
psicoapoyo/
├── index.html          ← Página principal
├── encuesta.html       ← Evaluación emocional (14 preguntas)
├── contacto.html       ← Chat, formulario y tarjetas del psicólogo
├── recursos.html       ← Guía para familiares y FAQ
├── psicologo.html      ← Portal psicólogo + panel admin
├── style.css           ← Estilos globales
├── app.js              ← Lógica JavaScript
├── api.php             ← Backend PHP — API REST (18 endpoints)
├── database.sql        ← Esquema de la base de datos (9 tablas)
├── actualizar_auth.sql ← Contraseñas bcrypt para producción
├── Dockerfile          ← Imagen Docker: PHP 8.2 + Apache
├── docker-compose.yml  ← Orquestación web + MySQL
├── .env.example        ← Plantilla de variables de entorno
├── .htaccess           ← Configuración Apache
└── assets/             ← Imágenes del sistema
```

---

## Solución de problemas comunes

| Síntoma | Causa | Solución |
|---------|-------|----------|
| MySQL no inicia (XAMPP) | Puerto 3306 ocupado | Detener MySQL de Windows en Servicios |
| Aria recovery failed | BD corrompida | Eliminar `aria_log.*` en `mysql/data/` |
| Chat no funciona | BD sin tabla `chat_mensajes` | Ejecutar `actualizar_bd.sql` |
| Login no funciona | Contraseñas en texto plano | Ejecutar `actualizar_auth.sql` |

---

## Repositorio
- GitHub: https://github.com/ckjosu/psicoapoyo
- Colaboradora: DraMarleMendez
