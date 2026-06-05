<?php
// ============================================================
//  api.php — Backend PsicoApoyo
//  Subir a la raíz del hosting (misma carpeta que index.html)
// ============================================================

// Credenciales desde variables de entorno (Docker) o valores por defecto (XAMPP local)
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: 'psicoapoyo');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: '');

// Sin credenciales hardcodeadas — todo se valida contra la BD

// ============================================================
header('Content-Type: application/json; charset=utf-8');
// CORS: no es necesario — el frontend se sirve desde el mismo origen que la API
// Eliminado Access-Control-Allow-Origin: * para no abrir superficie de ataque innecesaria

// ============================================================
// CONEXIÓN
// ============================================================
function db(): PDO {
    static $pdo;
    if ($pdo) return $pdo;
    try {
        $pdo = new PDO(
            'mysql:host='.DB_HOST.';dbname='.DB_NAME.';charset=utf8mb4',
            DB_USER, DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
             PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
        );
    } catch (PDOException $e) {
        ok(false, 'Sin conexión a la base de datos: '.$e->getMessage());
    }
    return $pdo;
}

// Endpoint de diagnóstico — solo para verificar conexión
if (isset($_GET['accion']) && $_GET['accion'] === 'test') {
    header('Content-Type: application/json; charset=utf-8');
    $info = [
        'php'     => phpversion(),
        'host'    => DB_HOST,
        'db'      => DB_NAME,
        'user'    => DB_USER,
        'pdo_mysql' => extension_loaded('pdo_mysql') ? 'OK' : 'FALTA',
    ];
    try {
        $pdo = new PDO(
            'mysql:host='.DB_HOST.';dbname='.DB_NAME.';charset=utf8mb4',
            DB_USER, DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );
        $info['conexion'] = 'OK';
        $info['tablas'] = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    } catch (PDOException $e) {
        $info['conexion'] = 'ERROR';
        $info['detalle'] = $e->getMessage();
    }
    echo json_encode($info, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

function ok($exito, $extra = []): void {
    if (is_string($extra)) $extra = ['error' => $extra];
    echo json_encode(array_merge(['ok' => (bool)$exito], $extra), JSON_UNESCAPED_UNICODE);
    exit;
}

function log_accion(string $accion, ?int $idReg = null, array $detalle = []): void {
    try {
        db()->prepare('INSERT INTO log_auditoria (accion, tabla_afectada, id_registro, detalle, ip_origen) VALUES (?,?,?,?,?)')
           ->execute([$accion, 'solicitudes_contacto', $idReg, json_encode($detalle), $_SERVER['REMOTE_ADDR'] ?? null]);
    } catch(Throwable $e) {}
}

$method = $_SERVER['REQUEST_METHOD'];

// ============================================================
// POST — recibe datos del formulario y acciones del psicólogo
// ============================================================
if ($method === 'POST') {
    $b = json_decode(file_get_contents('php://input'), true) ?? [];
    $accion = $b['accion'] ?? '';

    // ----------------------------------------------------------
    // nueva_solicitud — formulario de contacto del usuario
    // ----------------------------------------------------------
    if ($accion === 'nueva_solicitud') {
        $nombre  = trim($b['nombre']   ?? 'Anónimo');
        $contacto= trim($b['contacto'] ?? '');
        $quien   = $b['quien']  ?? 'personal';
        $medio   = $b['medio']  ?? null;
        $mensaje = trim($b['mensaje'] ?? '');
        $nivel   = in_array($b['nivel'] ?? '', ['verde','amarillo','rojo']) ? $b['nivel'] : 'verde';
        $pct     = isset($b['pct']) ? (int)$b['pct'] : null;
        $persp   = $b['perspectiva'] ?? 'personal';

        if (!$mensaje) ok(false, 'El mensaje no puede estar vacío');

        // Guardar cuestionario si viene con datos de evaluación
        $idCues = null;
        if ($nivel && $pct !== null) {
            $s = db()->prepare('INSERT INTO cuestionarios (perspectiva, nivel_riesgo, puntaje_pct, ip_origen) VALUES (?,?,?,?)');
            $s->execute([$persp, $nivel, $pct, $_SERVER['REMOTE_ADDR'] ?? null]);
            $idCues = db()->lastInsertId();
        }

        // Guardar solicitud
        $s = db()->prepare('INSERT INTO solicitudes_contacto
            (id_cuestionario, nombre_solicitante, contacto, tipo_solicitante, medio_respuesta, mensaje, nivel_riesgo)
            VALUES (?,?,?,?,?,?,?)');
        $s->execute([$idCues, $nombre, $contacto, $quien, $medio, $mensaje, $nivel]);
        $idSol = db()->lastInsertId();

        log_accion('NUEVA_SOLICITUD', $idSol, ['nivel' => $nivel, 'quien' => $quien]);
        ok(true, ['id' => $idSol]);
    }

    // ----------------------------------------------------------
    // login — autenticación real contra la BD
    // ----------------------------------------------------------
    if ($accion === 'login') {
        $user = trim($b['usuario'] ?? '');
        $pass = trim($b['pass']    ?? '');
        $tipo = $b['tipo'] ?? 'psicologo';

        if (!$user || !$pass) ok(false, 'Credenciales incorrectas');

        // Buscar usuario en BD
        $stmt = db()->prepare(
            'SELECT u.id_usuario, u.username, u.password_hash, r.nombre_rol as rol
             FROM usuarios u
             JOIN roles r ON u.id_rol = r.id_rol
             WHERE u.username = ? LIMIT 1'
        );
        $stmt->execute([$user]);
        $urow = $stmt->fetch();

        if (!$urow || !password_verify($pass, $urow['password_hash']))
            ok(false, 'Credenciales incorrectas');

        // Verificar que el rol coincide con lo que intenta iniciar sesión
        if ($tipo === 'admin' && $urow['rol'] !== 'admin')
            ok(false, 'Sin permisos de administrador');
        if ($tipo === 'psicologo' && $urow['rol'] !== 'psicologo')
            ok(false, 'Sin permisos de psicólogo');

        if ($tipo === 'admin') {
            log_accion('LOGIN_ADMIN', $urow['id_usuario'], ['usuario' => $user]);
            ok(true, ['tipo' => 'admin', 'nombre' => 'Administrador']);
        }

        // Psicólogo — buscar perfil
        $stmt2 = db()->prepare(
            'SELECT p.* FROM psicologos p WHERE p.id_usuario = ?'
        );
        $stmt2->execute([$urow['id_usuario']]);
        $perfil = $stmt2->fetch() ?: [];
        log_accion('LOGIN_PSICOLOGO', $urow['id_usuario'], ['usuario' => $user]);
        ok(true, [
            'tipo'         => 'psicologo',
            'nombre'       => $perfil['nombre_completo'] ?? $user,
            'perfil'       => $perfil,
            'id_psicologo' => $perfil['id_psicologo'] ?? null
        ]);
    }

    // ----------------------------------------------------------
    // marcar_leida — el psicólogo leyó la solicitud
    // ----------------------------------------------------------
    if ($accion === 'marcar_leida') {
        $id   = (int)($b['id_solicitud'] ?? 0);
        $nota = $b['nota'] ?? null;
        if (!$id) ok(false, 'id_solicitud requerido');

        db()->prepare('UPDATE solicitudes_contacto SET estado=?, nota_interna=?, fecha_atencion=NOW() WHERE id_solicitud=?')
           ->execute(['leida', $nota, $id]);
        log_accion('MARCAR_LEIDA', $id);
        ok(true);
    }

    // ----------------------------------------------------------
    // guardar_nota — agrega o edita nota interna
    // ----------------------------------------------------------
    if ($accion === 'guardar_nota') {
        $id   = (int)($b['id_solicitud'] ?? 0);
        $nota = $b['nota'] ?? '';
        db()->prepare('UPDATE solicitudes_contacto SET nota_interna=?, estado="atendida", fecha_atencion=NOW() WHERE id_solicitud=?')
           ->execute([$nota, $id]);
        log_accion('GUARDAR_NOTA', $id);
        ok(true);
    }

    // ----------------------------------------------------------
    // archivar — archiva la solicitud
    // ----------------------------------------------------------
    if ($accion === 'archivar') {
        $id = (int)($b['id_solicitud'] ?? 0);
        db()->prepare('UPDATE solicitudes_contacto SET estado="archivada" WHERE id_solicitud=?')
           ->execute([$id]);
        log_accion('ARCHIVAR', $id);
        ok(true);
    }

    // ----------------------------------------------------------
    // guardar_perfil — el psicólogo actualiza su perfil
    // ----------------------------------------------------------
    if ($accion === 'guardar_perfil') {
        $id = (int)($b['id_psicologo'] ?? 0);
        if (!$id) ok(false, 'id_psicologo requerido');
        try {
            db()->prepare('UPDATE psicologos SET nombre_completo=?, cedula=?, especialidad=?, correo=?, telefono=?, disponible=?, biografia=?, whatsapp=?, calendly=? WHERE id_psicologo=?')
               ->execute([$b['nombre_completo']??null,$b['cedula']??null,$b['especialidad']??null,
                          $b['correo']??null,$b['telefono']??null,$b['disponible']??'disponible',
                          $b['biografia']??null,$b['whatsapp']??null,$b['calendly']??null,$id]);
        } catch(\Throwable $e) {
            // Si no existen columnas whatsapp/calendly aún, hacer UPDATE básico
            db()->prepare('UPDATE psicologos SET nombre_completo=?, cedula=?, especialidad=?, correo=?, telefono=?, disponible=?, biografia=? WHERE id_psicologo=?')
               ->execute([$b['nombre_completo']??null,$b['cedula']??null,$b['especialidad']??null,
                          $b['correo']??null,$b['telefono']??null,$b['disponible']??'disponible',
                          $b['biografia']??null,$id]);
        }
        ok(true);
    }

    // ----------------------------------------------------------
    // nuevo_psicologo — el admin registra un nuevo psicólogo
    // ----------------------------------------------------------
    if ($accion === 'nuevo_psicologo') {
        $username = trim($b['username'] ?? '');
        $pass2    = trim($b['pass']     ?? '');
        $nombre   = trim($b['nombre']   ?? '');
        if (!$username || !$pass2 || !$nombre) ok(false, 'Faltan datos obligatorios');

        // Crear usuario
        db()->prepare('INSERT INTO usuarios (username, password_hash, id_rol) VALUES (?,?,2)')
           ->execute([$username, password_hash($pass2, PASSWORD_BCRYPT)]);
        $idUsr = db()->lastInsertId();

        // Crear perfil psicólogo
        db()->prepare('INSERT INTO psicologos (id_usuario, nombre_completo, cedula, especialidad, correo, telefono) VALUES (?,?,?,?,?,?)')
           ->execute([$idUsr, $nombre, $b['cedula']??'', $b['especialidad']??'Psicología Clínica', $b['correo']??'', $b['telefono']??'']);
        ok(true, ['id_usuario' => $idUsr]);
    }

    // ----------------------------------------------------------
    // chat_enviar — usuario o psicólogo envía mensaje
    // ----------------------------------------------------------
    if ($accion === 'chat_enviar') {
        $sesion_id = $b['sesion_id'] ?? '';
        $texto     = trim($b['texto'] ?? '');
        $remitente = $b['remitente'] ?? 'usuario'; // 'usuario' o 'psicologo'
        if (!$sesion_id || !$texto) ok(false, 'Datos incompletos');
        try {
            db()->prepare('INSERT INTO chat_mensajes (sesion_id, remitente, texto) VALUES (?,?,?)')
               ->execute([$sesion_id, $remitente, $texto]);
            ok(true, ['id' => db()->lastInsertId()]);
        } catch(\Throwable $e) {
            ok(false, 'Error: ' . $e->getMessage());
        }
    }

    // ----------------------------------------------------------
    // chat_marcar_leido — psicólogo marcó los mensajes como leídos
    // ----------------------------------------------------------
    if ($accion === 'chat_marcar_leido') {
        $sesion_id = $b['sesion_id'] ?? '';
        try {
            db()->prepare("UPDATE chat_mensajes SET leido=1 WHERE sesion_id=? AND remitente='usuario'")
               ->execute([$sesion_id]);
            ok(true);
        } catch(\Throwable $e) { ok(true); }
    }

    ok(false, 'Acción no reconocida');
}

// ============================================================
// GET — devuelve datos al portal del psicólogo y admin
// ============================================================
if ($method === 'GET') {
    $accion = $_GET['accion'] ?? '';

    // ----------------------------------------------------------
    // solicitudes — lista completa para el psicólogo
    // ----------------------------------------------------------
    if ($accion === 'solicitudes') {
        $nivel  = $_GET['nivel']  ?? null;
        $estado = $_GET['estado'] ?? null;

        $sql = 'SELECT s.*, c.perspectiva, c.puntaje_pct
                FROM solicitudes_contacto s
                LEFT JOIN cuestionarios c ON s.id_cuestionario = c.id_cuestionario
                WHERE s.estado != "archivada"';
        $params = [];

        if ($nivel)  { $sql .= ' AND s.nivel_riesgo = ?'; $params[] = $nivel; }
        if ($estado) { $sql .= ' AND s.estado = ?';       $params[] = $estado; }

        $sql .= ' ORDER BY FIELD(s.nivel_riesgo,"rojo","amarillo","verde"), s.fecha_envio DESC LIMIT 200';

        $stmt = db()->prepare($sql);
        $stmt->execute($params);
        ok(true, ['datos' => $stmt->fetchAll()]);
    }

    // ----------------------------------------------------------
    // estadisticas — para el panel admin
    // ----------------------------------------------------------
    if ($accion === 'estadisticas') {
        $db = db();
        ok(true, ['datos' => [
            'total'         => $db->query('SELECT COUNT(*) FROM solicitudes_contacto WHERE estado!="archivada"')->fetchColumn(),
            'rojas'         => $db->query('SELECT COUNT(*) FROM solicitudes_contacto WHERE nivel_riesgo="rojo" AND estado!="archivada"')->fetchColumn(),
            'amarillas'     => $db->query('SELECT COUNT(*) FROM solicitudes_contacto WHERE nivel_riesgo="amarillo" AND estado!="archivada"')->fetchColumn(),
            'sin_atender'   => $db->query('SELECT COUNT(*) FROM solicitudes_contacto WHERE estado="nueva"')->fetchColumn(),
            'psicologos'    => $db->query('SELECT COUNT(*) FROM psicologos')->fetchColumn(),
        ]]);
    }

    // ----------------------------------------------------------
    // psicologos — lista para el admin
    // ----------------------------------------------------------
    if ($accion === 'psicologos') {
        $rows = db()->query('SELECT p.*, u.username FROM psicologos p JOIN usuarios u ON p.id_usuario = u.id_usuario')->fetchAll();
        ok(true, ['datos' => $rows]);
    }

    // ----------------------------------------------------------
    // perfil_psicologo — carga perfil por username
    // ----------------------------------------------------------
    if ($accion === 'perfil_psicologo') {
        $user = $_GET['usuario'] ?? '';
        if (!$user) ok(false, 'usuario requerido');
        $stmt = db()->prepare('SELECT p.* FROM psicologos p
            JOIN usuarios u ON p.id_usuario = u.id_usuario
            WHERE u.username = ?');
        $stmt->execute([$user]);
        $row = $stmt->fetch();
        ok((bool)$row, ['datos' => $row ?: []]);
    }

    // ----------------------------------------------------------
    // psicologos_contacto — datos públicos para contacto.html
    // ----------------------------------------------------------
    if ($accion === 'psicologos_contacto') {
        try {
            $rows = db()->query(
                "SELECT nombre_completo, especialidad, biografia, correo, telefono, disponible,
                        IFNULL(whatsapp, telefono) as whatsapp,
                        IFNULL(calendly, '') as calendly
                 FROM psicologos WHERE disponible != 'no' ORDER BY id_psicologo ASC"
            )->fetchAll();
            ok(true, ['datos' => $rows]);
        } catch(\Throwable $e) {
            // Si no existen las columnas aún, devolver datos básicos
            $rows = db()->query(
                "SELECT nombre_completo, especialidad, biografia, correo, telefono, disponible
                 FROM psicologos WHERE disponible != 'no' ORDER BY id_psicologo ASC"
            )->fetchAll();
            foreach($rows as &$r) {
                $r['whatsapp'] = $r['telefono'];
                $r['calendly'] = '';
            }
            ok(true, ['datos' => $rows]);
        }
    }

    // ----------------------------------------------------------
    // auditoria — log de actividad
    // ----------------------------------------------------------
    if ($accion === 'auditoria') {
        $rows = db()->query('SELECT * FROM log_auditoria ORDER BY fecha_accion DESC LIMIT 100')->fetchAll();
        ok(true, ['datos' => $rows]);
    }

    // ----------------------------------------------------------
    // chat_mensajes — historial de una sesión
    // ----------------------------------------------------------
    if ($accion === 'chat_mensajes') {
        $sesion_id = $_GET['sesion_id'] ?? '';
        if (!$sesion_id) ok(false, 'sesion_id requerido');
        try {
            $stmt = db()->prepare('SELECT * FROM chat_mensajes WHERE sesion_id=? ORDER BY fecha_envio ASC LIMIT 100');
            $stmt->execute([$sesion_id]);
            ok(true, ['datos' => $stmt->fetchAll()]);
        } catch(\Throwable $e) { ok(true, ['datos' => []]); }
    }

    // ----------------------------------------------------------
    // chat_sesiones — lista de chats activos para el psicólogo
    // ----------------------------------------------------------
    if ($accion === 'chat_sesiones') {
        try {
            $stmt = db()->query(
                'SELECT sesion_id, MIN(fecha_envio) as inicio,
                        MAX(fecha_envio) as ultimo_mensaje,
                        COUNT(*) as total_mensajes,
                        SUM(CASE WHEN remitente="usuario" AND leido=0 THEN 1 ELSE 0 END) as sin_leer
                 FROM chat_mensajes GROUP BY sesion_id ORDER BY ultimo_mensaje DESC'
            );
            ok(true, ['datos' => $stmt->fetchAll()]);
        } catch(\Throwable $e) { ok(true, ['datos' => []]); }
    }

    ok(false, 'Acción no reconocida');
}