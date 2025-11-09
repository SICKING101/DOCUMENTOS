<?php
// =============================================================================
// CONFIGURACIÓN INICIAL Y MANEJO DE ERRORES
// =============================================================================

// Mostrar errores para debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);

// Buffer de salida para evitar corrupción de JSON
if (ob_get_level()) ob_end_clean();
ob_start();

// Headers para API
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Manejar preflight requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// =============================================================================
// CONFIGURACIÓN DE BASE DE DATOS Y CLOUDINARY
// =============================================================================

$db = null;
try {
    require_once __DIR__ . '/../config/database.php';
    $database = new Database();
    $db = $database->getConnection();
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error de conexión a la base de datos: ' . $e->getMessage()]);
    exit();
}

// =============================================================================
// CONFIGURACIÓN GENERAL
// =============================================================================

$upload_dir = 'uploads/';
$max_file_size = 10 * 1024 * 1024; // 10MB
$allowed_types = ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png'];

// Crear directorio de uploads si no existe
if (!file_exists($upload_dir)) {
    mkdir($upload_dir, 0777, true);
}

// Obtener la acción
$action = $_GET['action'] ?? $_POST['action'] ?? '';

// =============================================================================
// MANEJADOR PRINCIPAL DE ACCIONES
// =============================================================================

try {
    switch ($action) {
        case 'getDashboardStats':
            getDashboardStats($db);
            break;
        case 'getPersons':
            getPersons($db);
            break;
        case 'getPerson':
            getPerson($db);
            break;
        case 'addPerson':
            addPerson($db);
            break;
        case 'updatePerson':
            updatePerson($db);
            break;
        case 'deletePerson':
            deletePerson($db);
            break;
        case 'getDocuments':
            getDocuments($db);
            break;
        case 'getPersonDocuments':
            getPersonDocuments($db);
            break;
        case 'addDocument':
            addDocument($db, $upload_dir, $max_file_size, $allowed_types);
            break;
        case 'deleteDocument':
            deleteDocument($db, $upload_dir);
            break;
        case 'downloadDocument':
            downloadDocument($db, $upload_dir);
            break;
        case 'downloadAllDocuments':
            downloadAllDocuments($db, $upload_dir);
            break;
        case 'downloadPersonDocuments':
            downloadPersonDocuments($db, $upload_dir);
            break;
        case 'test':
            testConnection($db);
            break;
        case 'testCloudinary':
            testCloudinary();
            break;
        default:
            echo json_encode(['success' => false, 'message' => 'Acción no válida']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error del servidor: ' . $e->getMessage()]);
}

// Limpiar buffer
ob_end_flush();

// =============================================================================
// FUNCIONES DEL SISTEMA
// =============================================================================

function getDashboardStats($db) {
    $stats = [];
    
    // Total de personas activas
    $query = "SELECT COUNT(*) as total FROM personas WHERE activo = 1";
    $stmt = $db->prepare($query);
    $stmt->execute();
    $stats['total_personas'] = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
    
    // Total de documentos activos
    $query = "SELECT COUNT(*) as total FROM documentos WHERE activo = 1";
    $stmt = $db->prepare($query);
    $stmt->execute();
    $stats['total_documentos'] = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
    
    // Documentos próximos a vencer (en los próximos 30 días)
    $query = "SELECT COUNT(*) as total FROM documentos WHERE activo = 1 AND fecha_vencimiento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)";
    $stmt = $db->prepare($query);
    $stmt->execute();
    $stats['proximos_vencer'] = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
    
    // Documentos recientes (últimos 5)
    $query = "SELECT d.*, p.nombre as persona_nombre 
              FROM documentos d 
              LEFT JOIN personas p ON d.persona_id = p.id 
              WHERE d.activo = 1 
              ORDER BY d.fecha_subida DESC 
              LIMIT 5";
    $stmt = $db->prepare($query);
    $stmt->execute();
    $recent_documents = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Devolver estadísticas y documentos recientes
    echo json_encode([
        'success' => true,
        'stats' => $stats,
        'recent_documents' => $recent_documents
    ]);
}

function getPersons($db) {
    $query = "SELECT * FROM personas WHERE activo = 1 ORDER BY nombre";
    $stmt = $db->prepare($query);
    $stmt->execute();
    $persons = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode(['success' => true, 'persons' => $persons]);
}

function getPerson($db) {
    $id = $_GET['id'] ?? '';
    
    if (empty($id)) {
        echo json_encode(['success' => false, 'message' => 'ID no válido']);
        return;
    }
    
    $query = "SELECT * FROM personas WHERE id = ? AND activo = 1";
    $stmt = $db->prepare($query);
    $stmt->execute([$id]);
    $person = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($person) {
        echo json_encode(['success' => true, 'person' => $person]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Persona no encontrada']);
    }
}

function addPerson($db) {
    // Recoger datos del formulario
    $data = [
        'nombre' => $_POST['nombre'] ?? '',
        'email' => $_POST['email'] ?? '',
        'telefono' => $_POST['telefono'] ?? '',
        'departamento' => $_POST['departamento'] ?? '',
        'puesto' => $_POST['puesto'] ?? ''
    ];
    
    // Validaciones básicas
    if (empty($data['nombre']) || empty($data['email'])) {
        echo json_encode(['success' => false, 'message' => 'Nombre y email son obligatorios']);
        return;
    }
    
    // Verificar que el email sea único
    $check_query = "SELECT id FROM personas WHERE email = ? AND activo = 1";
    $check_stmt = $db->prepare($check_query);
    $check_stmt->execute([$data['email']]);
    if ($check_stmt->fetch()) {
        echo json_encode(['success' => false, 'message' => 'El email ya está registrado']);
        return;
    }
    
    // Insertar nueva persona
    $query = "INSERT INTO personas (nombre, email, telefono, departamento, puesto) VALUES (?, ?, ?, ?, ?)";
    $stmt = $db->prepare($query);
    
    if ($stmt->execute([$data['nombre'], $data['email'], $data['telefono'], $data['departamento'], $data['puesto']])) {
        echo json_encode(['success' => true, 'message' => 'Persona agregada correctamente']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error al agregar la persona']);
    }
}

function updatePerson($db) {
    $id = $_POST['id'] ?? '';
    $data = [
        'nombre' => $_POST['nombre'] ?? '',
        'email' => $_POST['email'] ?? '',
        'telefono' => $_POST['telefono'] ?? '',
        'departamento' => $_POST['departamento'] ?? '',
        'puesto' => $_POST['puesto'] ?? ''
    ];
    
    if (empty($id) || empty($data['nombre']) || empty($data['email'])) {
        echo json_encode(['success' => false, 'message' => 'Datos incompletos']);
        return;
    }
    
    // Verificar email único (excluyendo el registro actual)
    $check_query = "SELECT id FROM personas WHERE email = ? AND id != ? AND activo = 1";
    $check_stmt = $db->prepare($check_query);
    $check_stmt->execute([$data['email'], $id]);
    if ($check_stmt->fetch()) {
        echo json_encode(['success' => false, 'message' => 'El email ya está registrado']);
        return;
    }
    
    // Actualizar persona
    $query = "UPDATE personas SET nombre = ?, email = ?, telefono = ?, departamento = ?, puesto = ? WHERE id = ?";
    $stmt = $db->prepare($query);
    
    if ($stmt->execute([$data['nombre'], $data['email'], $data['telefono'], $data['departamento'], $data['puesto'], $id])) {
        echo json_encode(['success' => true, 'message' => 'Persona actualizada correctamente']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error al actualizar la persona']);
    }
}

function deletePerson($db) {
    $id = $_POST['id'] ?? '';
    
    if (empty($id)) {
        echo json_encode(['success' => false, 'message' => 'ID no válido']);
        return;
    }
    
    // Verificar si la persona tiene documentos asociados
    $check_query = "SELECT COUNT(*) as count FROM documentos WHERE persona_id = ? AND activo = 1";
    $check_stmt = $db->prepare($check_query);
    $check_stmt->execute([$id]);
    $document_count = $check_stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    if ($document_count > 0) {
        echo json_encode(['success' => false, 'message' => 'No se puede eliminar la persona porque tiene documentos asociados']);
        return;
    }
    
    // Realizar borrado lógico (marcar como inactivo)
    $query = "UPDATE personas SET activo = 0 WHERE id = ?";
    $stmt = $db->prepare($query);
    
    if ($stmt->execute([$id])) {
        echo json_encode(['success' => true, 'message' => 'Persona eliminada correctamente']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error al eliminar la persona']);
    }
}

function getDocuments($db) {
    $query = "SELECT d.*, p.nombre as persona_nombre 
              FROM documentos d 
              LEFT JOIN personas p ON d.persona_id = p.id 
              WHERE d.activo = 1 
              ORDER BY d.fecha_subida DESC";
    $stmt = $db->prepare($query);
    $stmt->execute();
    $documents = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode(['success' => true, 'documents' => $documents]);
}

function getPersonDocuments($db) {
    $persona_id = $_GET['persona_id'] ?? '';
    
    if (empty($persona_id)) {
        echo json_encode(['success' => false, 'message' => 'ID de persona no válido']);
        return;
    }
    
    $query = "SELECT d.*, p.nombre as persona_nombre 
              FROM documentos d 
              LEFT JOIN personas p ON d.persona_id = p.id 
              WHERE d.activo = 1 AND d.persona_id = ?
              ORDER BY d.fecha_subida DESC";
    $stmt = $db->prepare($query);
    $stmt->execute([$persona_id]);
    $documents = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode(['success' => true, 'documents' => $documents]);
}

function addDocument($db, $upload_dir, $max_file_size, $allowed_types) {
    // Verificar que se haya subido un archivo correctamente
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        echo json_encode(['success' => false, 'message' => 'Error al subir el archivo']);
        return;
    }

    $file = $_FILES['file'];

    // Validar tamaño del archivo
    if ($file['size'] > $max_file_size) {
        echo json_encode(['success' => false, 'message' => 'El archivo excede el tamaño máximo permitido']);
        return;
    }

    // Validar tipo de archivo
    $file_extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($file_extension, $allowed_types)) {
        echo json_encode(['success' => false, 'message' => 'Tipo de archivo no permitido']);
        return;
    }

    // ===== SUBIR A CLOUDINARY =====
    $cloudinary_result = uploadToCloudinary($file, 'documentos/cbtis051');

    if (!$cloudinary_result['success']) {
        echo json_encode(['success' => false, 'message' => 'Error al subir a Cloudinary: ' . $cloudinary_result['error']]);
        return;
    }

    // ===== GUARDAR EN BASE DE DATOS =====
    $data = [
        'nombre_original' => $file['name'],
        'tipo_archivo' => $file['type'],
        'tamano_archivo' => $file['size'],
        'descripcion' => $_POST['descripcion'] ?? '',
        'categoria' => $_POST['categoria'] ?? '',
        'fecha_vencimiento' => $_POST['fecha_vencimiento'] ?: null,
        'persona_id' => $_POST['persona_id'] ?? null,
        'cloudinary_url' => $cloudinary_result['secure_url'],
        'public_id' => $cloudinary_result['public_id'],
        'resource_type' => $cloudinary_result['resource_type']
    ];

    // Insertar documento en la base de datos
    $query = "INSERT INTO documentos 
              (nombre_original, tipo_archivo, tamano_archivo, descripcion, categoria, fecha_vencimiento, persona_id, cloudinary_url, public_id, resource_type, activo)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)";
    $stmt = $db->prepare($query);

    if ($stmt->execute([
        $data['nombre_original'],
        $data['tipo_archivo'],
        $data['tamano_archivo'],
        $data['descripcion'],
        $data['categoria'],
        $data['fecha_vencimiento'],
        $data['persona_id'],
        $data['cloudinary_url'],
        $data['public_id'],
        $data['resource_type']
    ])) {
        echo json_encode([
            'success' => true,
            'message' => 'Documento subido correctamente a la nube',
            'url' => $data['cloudinary_url'],
            'public_id' => $data['public_id']
        ]);
    } else {
        // Si falla la BD, eliminar el archivo de Cloudinary
        deleteFromCloudinary($data['public_id']);
        echo json_encode(['success' => false, 'message' => 'Error al guardar en la base de datos']);
    }
}

function deleteDocument($db, $upload_dir) {
    $id = $_POST['id'] ?? '';

    if (empty($id)) {
        echo json_encode(['success' => false, 'message' => 'ID no válido']);
        return;
    }

    // Obtener información del archivo (incluye public_id y resource_type)
    $query = "SELECT public_id, resource_type FROM documentos WHERE id = ?";
    $stmt = $db->prepare($query);
    $stmt->execute([$id]);
    $document = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$document) {
        echo json_encode(['success' => false, 'message' => 'Documento no encontrado']);
        return;
    }

    // Eliminar de Cloudinary si tiene public_id
    if (!empty($document['public_id'])) {
        $deleteResponse = deleteFromCloudinary($document['public_id']);
        if (!$deleteResponse['success']) {
            echo json_encode([
                'success' => false, 
                'message' => 'Error al eliminar de Cloudinary: ' . json_encode($deleteResponse['response'])
            ]);
            return;
        }
    }

    // Marcar como inactivo en la Base de Datos
    $query = "UPDATE documentos SET activo = 0 WHERE id = ?";
    $stmt = $db->prepare($query);

    if ($stmt->execute([$id])) {
        echo json_encode(['success' => true, 'message' => 'Documento eliminado correctamente']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error al actualizar el estado del documento']);
    }
}

function downloadDocument($db, $upload_dir) {
    $id = $_GET['id'] ?? '';
    
    if (empty($id)) {
        http_response_code(400);
        echo 'ID no válido';
        return;
    }
    
    $query = "SELECT * FROM documentos WHERE id = ? AND activo = 1";
    $stmt = $db->prepare($query);
    $stmt->execute([$id]);
    $document = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$document) {
        http_response_code(404);
        echo 'Documento no encontrado';
        return;
    }
    
    // Redirigir a Cloudinary para descarga
    if (!empty($document['cloudinary_url'])) {
        header('Location: ' . $document['cloudinary_url']);
        exit;
    } else {
        http_response_code(404);
        echo 'Documento no disponible para descarga';
    }
}

function downloadAllDocuments($db, $upload_dir) {
    http_response_code(501);
    echo 'Función no implementada para Cloudinary';
}

function downloadPersonDocuments($db, $upload_dir) {
    http_response_code(501);
    echo 'Función no implementada para Cloudinary';
}

function testConnection($db) {
    try {
        $db->query('SELECT 1');
        echo json_encode([
            'success' => true, 
            'message' => 'Conexión a la base de datos exitosa',
            'server_time' => date('Y-m-d H:i:s')
        ]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Error de conexión: ' . $e->getMessage()]);
    }
}

function testCloudinary() {
    // Crear un archivo de prueba temporal
    $test_content = "Este es un archivo de prueba para Cloudinary - CBTIS051";
    $temp_file = tempnam(sys_get_temp_dir(), 'test_');
    file_put_contents($temp_file, $test_content);
    
    $test_upload = uploadToCloudinary([
        'tmp_name' => $temp_file,
        'name' => 'archivo_prueba_cbtis051.txt'
    ], 'documentos/cbtis051');
    
    // Limpiar archivo temporal
    unlink($temp_file);
    
    // Si fue exitoso, también probar eliminación
    if ($test_upload['success']) {
        $delete_result = deleteFromCloudinary($test_upload['public_id']);
    } else {
        $delete_result = ['success' => false, 'message' => 'No se pudo eliminar porque la subida falló'];
    }
    
    echo json_encode([
        'upload_result' => $test_upload,
        'delete_result' => $delete_result,
        'used_preset' => 'DOCUMENTOS',
        'folder' => 'documentos/cbtis051',
        'cloud_name' => CLOUDINARY_CLOUD_NAME
    ]);
}
?>