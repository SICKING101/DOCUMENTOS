<?php
// Configuración de Cloudinary
define('CLOUDINARY_CLOUD_NAME', 'dn9ts84q6');
define('CLOUDINARY_API_KEY', '797652563747974');
define('CLOUDINARY_API_SECRET', 'raOkraliwEKlBFTRL7Cr9kEyHOA');
define('CLOUDINARY_UPLOAD_URL', 'https://api.cloudinary.com/v1_1/' . CLOUDINARY_CLOUD_NAME . '/upload');
define('CLOUDINARY_BASE_URL', 'https://res.cloudinary.com/' . CLOUDINARY_CLOUD_NAME . '/image/upload');

// Configuración de la base de datos
class Database {
    private $host = 'localhost';
    private $db_name = 'sistema_documentos_profesional';
    private $username = 'root';
    private $password = '';
    public $conn;

    public function getConnection() {
        $this->conn = null;
        try {
            $this->conn = new PDO("mysql:host=" . $this->host . ";dbname=" . $this->db_name, $this->username, $this->password);
            $this->conn->exec("set names utf8");
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        } catch(PDOException $exception) {
            $this->logError("Connection error: " . $exception->getMessage());
        }
        return $this->conn;
    }

    private function logError($message) {
        error_log($message);
    }
}

// Función para subir archivo a Cloudinary
function uploadToCloudinary($file, $folder = 'documentos/cbtis051') {
    $api_key = CLOUDINARY_API_KEY;
    $api_secret = CLOUDINARY_API_SECRET;
    $cloud_name = CLOUDINARY_CLOUD_NAME;
    
    // Preparar datos para la subida
    $file_path = $file['tmp_name'];
    $public_id = pathinfo($file['name'], PATHINFO_FILENAME) . '_' . uniqid();
    $timestamp = time();
    
    // Usar el upload preset que ya tienes configurado
    $upload_preset = 'DOCUMENTOS';
    
    // Para upload presets sin firmar, no necesitas generar firma manualmente
    $post_data = [
        'file' => new CURLFile($file_path),
        'folder' => $folder,
        'public_id' => $public_id,
        'timestamp' => $timestamp,
        'api_key' => $api_key,
        'upload_preset' => $upload_preset
    ];
    
    // Inicializar cURL
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, CLOUDINARY_UPLOAD_URL);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $post_data);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    // Ejecutar la petición
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curl_error = curl_error($ch);
    curl_close($ch);
    
    if ($http_code === 200) {
        $result = json_decode($response, true);
        
        // Manejar campos que pueden no estar presentes
        return [
            'success' => true,
            'public_id' => $result['public_id'] ?? '',
            'secure_url' => $result['secure_url'] ?? '',
            'format' => $result['format'] ?? 'raw',
            'bytes' => $result['bytes'] ?? 0,
            'resource_type' => $result['resource_type'] ?? 'raw'
        ];
    } else {
        return [
            'success' => false,
            'error' => "Error en la subida a Cloudinary (HTTP $http_code): " . $response . " - cURL: " . $curl_error
        ];
    }
}

// Función para eliminar archivo de Cloudinary - VERSIÓN MEJORADA
function deleteFromCloudinary($public_id) {
    $api_key = CLOUDINARY_API_KEY;
    $api_secret = CLOUDINARY_API_SECRET;
    $cloud_name = CLOUDINARY_CLOUD_NAME;
    $timestamp = time();
    
    // Determinar el tipo de recurso basado en la extensión del archivo
    $resource_type = 'image'; // Por defecto
    
    // Extraer la extensión del public_id
    if (strpos($public_id, '.') !== false) {
        $extension = strtolower(pathinfo($public_id, PATHINFO_EXTENSION));
        
        // Si es un archivo que no es imagen, usar 'raw'
        if (in_array($extension, ['pdf', 'doc', 'docx', 'txt', 'zip', 'rar', 'xls', 'xlsx', 'ppt', 'pptx'])) {
            $resource_type = 'raw';
        }
        // Si es un archivo de imagen, mantener 'image'
        elseif (in_array($extension, ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'])) {
            $resource_type = 'image';
        }
    }
    
    // Generar firma para eliminación
    $string_to_sign = "public_id={$public_id}&timestamp={$timestamp}" . $api_secret;
    $signature = sha1($string_to_sign);
    
    $post_data = [
        'public_id' => $public_id,
        'timestamp' => $timestamp,
        'api_key' => $api_key,
        'signature' => $signature
    ];
    
    // Usar el endpoint correcto según el tipo de recurso
    $endpoint = ($resource_type === 'raw') ? 'raw' : 'image';
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://api.cloudinary.com/v1_1/{$cloud_name}/{$endpoint}/destroy");
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $post_data);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    $result = json_decode($response, true);
    
    // Si falla con un tipo, intentar con el otro
    if (!$result || ($http_code !== 200) || (isset($result['result']) && $result['result'] !== 'ok')) {
        // Intentar con el tipo alternativo
        $alternate_resource_type = ($resource_type === 'raw') ? 'image' : 'raw';
        $alternate_endpoint = ($alternate_resource_type === 'raw') ? 'raw' : 'image';
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, "https://api.cloudinary.com/v1_1/{$cloud_name}/{$alternate_endpoint}/destroy");
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $post_data);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        $result = json_decode($response, true);
        $resource_type = $alternate_resource_type;
    }
    
    return [
        'success' => ($http_code === 200 && isset($result['result']) && $result['result'] === 'ok'),
        'response' => $result,
        'resource_type' => $resource_type
    ];
}
?>