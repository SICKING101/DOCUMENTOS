import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

// ============================================================================
// SECCIÓN: CONFIGURACIÓN DE SUBIDA DE ARCHIVOS
// ============================================================================
// Este archivo configura el middleware de multer para manejar la subida de
// archivos al servidor. Incluye validación de tipos de archivo, límites de
// tamaño, organización del almacenamiento y generación de nombres seguros.
// ============================================================================

// ********************************************************************
// MÓDULO 1: CONFIGURACIÓN DE DIRECTORIOS PARA SUBIDAS
// ********************************************************************
// Descripción: Establece y prepara la estructura de directorios donde se
// almacenarán los archivos subidos. Maneja correctamente las rutas tanto
// en desarrollo como en producción, asegurando que los directorios existan.
// ********************************************************************

// ----------------------------------------------------------------
// BLOQUE 1.1: Obtención de __dirname en ES Modules
// ----------------------------------------------------------------
// Convierte la URL del módulo actual a una ruta de archivo y extrae el
// directorio base. Esto es necesario porque ES Modules no tiene __dirname
// por defecto como CommonJS.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ----------------------------------------------------------------
// BLOQUE 1.2: Definición y creación del directorio de subidas
// ----------------------------------------------------------------
// Define la ruta absoluta del directorio donde se guardarán los archivos
// subidos, ubicado dos niveles arriba del directorio actual en la carpeta
// 'uploads'. Crea la carpeta si no existe, incluyendo subdirectorios necesarios.
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ********************************************************************
// MÓDULO 2: CONFIGURACIÓN DE ALMACENAMIENTO DE MULTER
// ********************************************************************
// Descripción: Configura el sistema de almacenamiento en disco para multer,
// definiendo dónde se guardan los archivos y cómo se nombran. Implementa
// nombres de archivo seguros que evitan colisiones y problemas de seguridad.
// ********************************************************************
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // ----------------------------------------------------------------
    // BLOQUE 2.1: Definición del directorio de destino
    // ----------------------------------------------------------------
    // Especifica el directorio donde se guardarán todos los archivos subidos.
    // Usa la ruta previamente configurada en uploadDir.
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // ----------------------------------------------------------------
    // BLOQUE 2.2: Generación de nombres de archivo seguros
    // ----------------------------------------------------------------
    // Crea un nombre único para cada archivo combinando:
    // - Marca de tiempo actual (Date.now()): Ordena archivos cronológicamente
    // - Número aleatorio: Evita colisiones si dos archivos se suben en el mismo milisegundo
    // - Nombre original: Mantiene la extensión y parte del nombre para referencia
    const safeName = Date.now() + '-' + Math.round(Math.random() * 1E9) + '-' + file.originalname;
    cb(null, safeName);
  }
});

// ********************************************************************
// MÓDULO 3: CONFIGURACIÓN COMPLETA DEL MIDDLEWARE DE SUBIDA
// ********************************************************************
// Descripción: Crea y exporta el middleware de multer completamente
// configurado con sistema de almacenamiento, límites de tamaño y filtrado
// de tipos de archivo. Este middleware se puede usar directamente en rutas.
// ********************************************************************
const upload = multer({
  // ----------------------------------------------------------------
  // BLOQUE 3.1: Especificación del sistema de almacenamiento
  // ----------------------------------------------------------------
  // Usa la configuración de almacenamiento en disco definida previamente
  // en lugar del almacenamiento en memoria por defecto.
  storage: storage,
  
  // ----------------------------------------------------------------
  // BLOQUE 3.2: Establecimiento de límites de tamaño
  // ----------------------------------------------------------------
  // Define un tamaño máximo de 10MB por archivo para prevenir abusos
  // y proteger los recursos del servidor de archivos demasiado grandes.
  limits: { fileSize: 10 * 1024 * 1024 },
  
  // ----------------------------------------------------------------
  // BLOQUE 3.3: Filtrado de tipos de archivo permitidos
  // ----------------------------------------------------------------
  // Función que valida cada archivo subido contra una lista blanca de
  // extensiones permitidas, rechazando tipos potencialmente peligrosos.
  fileFilter: (req, file, cb) => {
    // ----------------------------------------------------------------
    // BLOQUE 3.3.1: Definición de extensiones permitidas
    // ----------------------------------------------------------------
    // Lista de extensiones consideradas seguras para el sistema:
    // - Documentos: PDF, Word, Excel, texto plano
    // - Imágenes: JPG, JPEG, PNG
    // Nota: No incluye ejecutables (.exe, .bat) o scripts (.js, .php)
    const allowedTypes = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'jpg', 'jpeg', 'png'];
    
    // ----------------------------------------------------------------
    // BLOQUE 3.3.2: Extracción de extensión del archivo
    // ----------------------------------------------------------------
    // Obtiene la extensión del nombre original del archivo, convirtiendo
    // a minúsculas para comparación insensible a mayúsculas/minúsculas.
    const fileExtension = file.originalname.split('.').pop().toLowerCase();
    
    // ----------------------------------------------------------------
    // BLOQUE 3.3.3: Validación contra lista blanca
    // ----------------------------------------------------------------
    // Verifica si la extensión del archivo está en la lista de tipos permitidos.
    // Acepta el archivo si es válido, rechaza con error si no lo es.
    if (allowedTypes.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido'), false);
    }
  }
});

export default upload;