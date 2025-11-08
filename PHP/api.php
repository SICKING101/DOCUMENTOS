<?php
require_once '../config/database.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

// Configuración
$upload_dir = 'uploads/';
$max_file_size = 10 * 1024 * 1024; // 10MB
$allowed_types = ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png'];

// Crear directorio de uploads si no existe
if (!file_exists($upload_dir)) {
    mkdir($upload_dir, 0777, true);
}

$database = new Database();
$db = $database->getConnection();

$action = $_GET['action'] ?? $_POST['action'] ?? '';

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
        default:
            echo json_encode(['success' => false, 'message' => 'Acción no válida']);
    }
} catch (Exception $e) {
    logError($e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error del servidor']);
}

function getDashboardStats($db) {
    $stats = [];
    
    // Total personas
    $query = "SELECT COUNT(*) as total FROM personas WHERE activo = 1";
    $stmt = $db->prepare($query);
    $stmt->execute();
    $stats['total_personas'] = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
    
    // Total documentos
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

function addPerson($db) {
    $data = [
        'nombre' => $_POST['nombre'] ?? '',
        'email' => $_POST['email'] ?? '',
        'telefono' => $_POST['telefono'] ?? '',
        'departamento' => $_POST['departamento'] ?? '',
        'puesto' => $_POST['puesto'] ?? ''
    ];
    
    // Validaciones
    if (empty($data['nombre']) || empty($data['email'])) {
        echo json_encode(['success' => false, 'message' => 'Nombre y email son obligatorios']);
        return;
    }
    
    // Verificar email único
    $check_query = "SELECT id FROM personas WHERE email = ? AND activo = 1";
    $check_stmt = $db->prepare($check_query);
    $check_stmt->execute([$data['email']]);
    if ($check_stmt->fetch()) {
        echo json_encode(['success' => false, 'message' => 'El email ya está registrado']);
        return;
    }
    
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
    
    // Verificar email único (excluyendo el actual)
    $check_query = "SELECT id FROM personas WHERE email = ? AND id != ? AND activo = 1";
    $check_stmt = $db->prepare($check_query);
    $check_stmt->execute([$data['email'], $id]);
    if ($check_stmt->fetch()) {
        echo json_encode(['success' => false, 'message' => 'El email ya está registrado']);
        return;
    }
    
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
    
    // Verificar si tiene documentos asociados
    $check_query = "SELECT COUNT(*) as count FROM documentos WHERE persona_id = ? AND activo = 1";
    $check_stmt = $db->prepare($check_query);
    $check_stmt->execute([$id]);
    $document_count = $check_stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    if ($document_count > 0) {
        echo json_encode(['success' => false, 'message' => 'No se puede eliminar la persona porque tiene documentos asociados']);
        return;
    }
    
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

function addDocument($db, $upload_dir, $max_file_size, $allowed_types) {
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        echo json_encode(['success' => false, 'message' => 'Error al subir el archivo']);
        return;
    }
    
    $file = $_FILES['file'];
    
    // Validar tamaño
    if ($file['size'] > $max_file_size) {
        echo json_encode(['success' => false, 'message' => 'El archivo excede el tamaño máximo permitido']);
        return;
    }
    
    // Validar tipo
    $file_extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($file_extension, $allowed_types)) {
        echo json_encode(['success' => false, 'message' => 'Tipo de archivo no permitido']);
        return;
    }
    
    // Generar nombre único
    $filename = uniqid() . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '_', $file['name']);
    $filepath = $upload_dir . $filename;
    
    if (move_uploaded_file($file['tmp_name'], $filepath)) {
        $data = [
            'nombre_archivo' => $filename,
            'nombre_original' => $file['name'],
            'tipo_archivo' => $file['type'],
            'tamano_archivo' => $file['size'],
            'ruta_archivo' => $filepath,
            'descripcion' => $_POST['descripcion'] ?? '',
            'categoria' => $_POST['categoria'] ?? '',
            'fecha_vencimiento' => $_POST['fecha_vencimiento'] ?: null,
            'persona_id' => $_POST['persona_id'] ?? null
        ];
        
        $query = "INSERT INTO documentos (nombre_archivo, nombre_original, tipo_archivo, tamano_archivo, ruta_archivo, descripcion, categoria, fecha_vencimiento, persona_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt = $db->prepare($query);
        
        if ($stmt->execute([
            $data['nombre_archivo'], $data['nombre_original'], $data['tipo_archivo'], 
            $data['tamano_archivo'], $data['ruta_archivo'], $data['descripcion'],
            $data['categoria'], $data['fecha_vencimiento'], $data['persona_id']
        ])) {
            echo json_encode(['success' => true, 'message' => 'Documento subido correctamente']);
        } else {
            // Eliminar archivo si falla la inserción en la BD
            unlink($filepath);
            echo json_encode(['success' => false, 'message' => 'Error al guardar en la base de datos']);
        }
    } else {
        echo json_encode(['success' => false, 'message' => 'Error al mover el archivo']);
    }
}

function deleteDocument($db, $upload_dir) {
    $id = $_POST['id'] ?? '';
    
    if (empty($id)) {
        echo json_encode(['success' => false, 'message' => 'ID no válido']);
        return;
    }
    
    // Obtener información del archivo
    $query = "SELECT ruta_archivo FROM documentos WHERE id = ?";
    $stmt = $db->prepare($query);
    $stmt->execute([$id]);
    $document = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$document) {
        echo json_encode(['success' => false, 'message' => 'Documento no encontrado']);
        return;
    }
    
    // Eliminar físicamente el archivo
    if (file_exists($document['ruta_archivo'])) {
        unlink($document['ruta_archivo']);
    }
    
    // Marcar como inactivo en la BD
    $query = "UPDATE documentos SET activo = 0 WHERE id = ?";
    $stmt = $db->prepare($query);
    
    if ($stmt->execute([$id])) {
        echo json_encode(['success' => true, 'message' => 'Documento eliminado correctamente']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error al eliminar el documento']);
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
    
    if (!$document || !file_exists($document['ruta_archivo'])) {
        http_response_code(404);
        echo 'Documento no encontrado';
        return;
    }
    
    header('Content-Type: application/octet-stream');
    header('Content-Disposition: attachment; filename="' . $document['nombre_original'] . '"');
    header('Content-Length: ' . filesize($document['ruta_archivo']));
    readfile($document['ruta_archivo']);
    exit;
}

function downloadAllDocuments($db, $upload_dir) {
    $query = "SELECT * FROM documentos WHERE activo = 1";
    $stmt = $db->prepare($query);
    $stmt->execute();
    $documents = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($documents)) {
        http_response_code(404);
        echo 'No hay documentos para descargar';
        return;
    }
    
    // Crear archivo ZIP
    $zip = new ZipArchive();
    $zip_filename = tempnam(sys_get_temp_dir(), 'documents_') . '.zip';
    
    if ($zip->open($zip_filename, ZipArchive::CREATE) === TRUE) {
        foreach ($documents as $document) {
            if (file_exists($document['ruta_archivo'])) {
                $zip->addFile($document['ruta_archivo'], $document['nombre_original']);
            }
        }
        $zip->close();
        
        header('Content-Type: application/zip');
        header('Content-Disposition: attachment; filename="documentos.zip"');
        header('Content-Length: ' . filesize($zip_filename));
        readfile($zip_filename);
        
        // Eliminar archivo temporal
        unlink($zip_filename);
        exit;
    } else {
        http_response_code(500);
        echo 'Error al crear el archivo ZIP';
    }
}

function downloadPersonDocuments($db, $upload_dir) {
    $persona_id = $_GET['persona_id'] ?? '';
    
    if (empty($persona_id)) {
        http_response_code(400);
        echo 'ID de persona no válido';
        return;
    }
    
    $query = "SELECT * FROM documentos WHERE persona_id = ? AND activo = 1";
    $stmt = $db->prepare($query);
    $stmt->execute([$persona_id]);
    $documents = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($documents)) {
        http_response_code(404);
        echo 'No hay documentos para esta persona';
        return;
    }
    
    // Crear archivo ZIP
    $zip = new ZipArchive();
    $zip_filename = tempnam(sys_get_temp_dir(), 'person_documents_') . '.zip';
    
    if ($zip->open($zip_filename, ZipArchive::CREATE) === TRUE) {
        foreach ($documents as $document) {
            if (file_exists($document['ruta_archivo'])) {
                $zip->addFile($document['ruta_archivo'], $document['nombre_original']);
            }
        }
        $zip->close();
        
        header('Content-Type: application/zip');
        header('Content-Disposition: attachment; filename="documentos_persona_' . $persona_id . '.zip"');
        header('Content-Length: ' . filesize($zip_filename));
        readfile($zip_filename);
        
        // Eliminar archivo temporal
        unlink($zip_filename);
        exit;
    } else {
        http_response_code(500);
        echo 'Error al crear el archivo ZIP';
    }
}

function logError($message) {
    error_log($message);
    // Aquí podrías guardar en la tabla logs_sistema
}
?>