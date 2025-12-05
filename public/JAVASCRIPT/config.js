// =============================================================================
// 1. CONFIGURACIÓN GENERAL DE LA APLICACIÓN
// =============================================================================

/**
 * 1.1 Constante de configuración principal
 * Contiene todas las variables de configuración para el funcionamiento
 * del sistema de gestión de documentos.
 */
const CONFIG = {
    /**
     * 1.2 URL base de la API del backend
     * Define el endpoint principal para todas las comunicaciones con el servidor.
     */
    API_BASE_URL: 'http://localhost:4000/api',

    /**
     * 1.3 Credenciales de Cloudinary
     * Configuración necesaria para subir y gestionar archivos en Cloudinary.
     */
    CLOUDINARY_CLOUD_NAME: 'dn9ts84q6',
    CLOUDINARY_API_KEY: '797652563747974',
    CLOUDINARY_UPLOAD_PRESET: 'DOCUMENTOS',
    CLOUDINARY_API_SECRET: 'raOkraliwEKlBFTRL7Cr9kEyHOA',

    // =============================================================================
    // 2. LÍMITES DE SUBIDA DE ARCHIVOS
    // =============================================================================

    /**
     * 2.1 Tamaño máximo de archivo individual
     * Establece el límite máximo en bytes para archivos individuales.
     */
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB

    /**
     * 2.2 Tipos de archivo permitidos
     * Lista de extensiones de archivo que el sistema acepta para subida.
     */
    ALLOWED_FILE_TYPES: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'jpg', 'jpeg', 'png'],

    /**
     * 2.3 Máximo de archivos múltiples
     * Número máximo de archivos que se pueden subir simultáneamente.
     */
    MAX_MULTIPLE_FILES: 20,

    /**
     * 2.4 Tamaño total máximo para subidas múltiples
     * Límite acumulativo para el tamaño total de múltiples archivos en una sola operación.
     */
    MAX_TOTAL_UPLOAD_SIZE: 50 * 1024 * 1024, // 50MB

    // =============================================================================
    // 3. CONFIGURACIÓN DE DESCARGAS
    // =============================================================================

    /**
     * 3.1 Timeout para descargas
     * Tiempo máximo en milisegundos para esperar una respuesta de descarga.
     */
    DOWNLOAD_TIMEOUT: 60000, // 60 segundos

    /**
     * 3.2 Intentos de reintento para descargas
     * Número máximo de veces que se reintentará una descarga fallida.
     */
    DOWNLOAD_RETRY_ATTEMPTS: 3,

    /**
     * 3.3 Habilitar descarga directa
     * Controla si se permite la descarga directa desde Cloudinary sin pasar por el servidor.
     */
    ENABLE_DIRECT_DOWNLOAD: true,

    // =============================================================================
    // 4. ESTRATEGIAS DE SUBIDA
    // =============================================================================

    /**
     * 4.1 Configuración de estrategias de subida
     * Define diferentes métodos para manejar subidas de archivos múltiples.
     */
    UPLOAD_STRATEGIES: {
        /**
         * 4.1.1 Estrategia secuencial
         * Sube archivos uno por uno, ideal para conexiones lentas o servidores con limitaciones.
         */
        SEQUENTIAL: {
            name: 'sequential',
            maxConcurrent: 1,
            delayBetween: 1000
        },
        /**
         * 4.1.2 Estrategia paralela
         * Sube múltiples archivos simultáneamente para mayor velocidad.
         */
        PARALLEL: {
            name: 'parallel',
            maxConcurrent: 5,
            delayBetween: 0
        },
        /**
         * 4.1.3 Estrategia por lotes
         * Balance entre velocidad y consumo de recursos mediante subida en grupos pequeños.
         */
        BATCH: {
            name: 'batch',
            maxConcurrent: 3,
            delayBetween: 500
        }
    },

    // =============================================================================
    // 5. CONFIGURACIÓN DE SUBIDAS MÚLTIPLES
    // =============================================================================

    /**
     * 5.1 Configuración específica para subidas múltiples
     * Parámetros para optimizar la experiencia de usuario en subidas masivas.
     */
    MULTIPLE_UPLOAD: {
        /**
         * 5.1.1 Tamaño del lote
         * Número de archivos a procesar en cada grupo cuando se usa estrategia batch.
         */
        BATCH_SIZE: 5,
        
        /**
         * 5.1.2 Máximo de reintentos
         * Cantidad de veces que se reintentará la subida de un archivo fallido.
         */
        MAX_RETRIES: 3,
        
        /**
         * 5.1.3 Intervalo de actualización de progreso
         * Frecuencia en milisegundos para actualizar la interfaz de progreso.
         */
        PROGRESS_UPDATE_INTERVAL: 500,
        
        /**
         * 5.1.4 Mostrar progreso individual
         * Controla si se muestra el progreso detallado para cada archivo.
         */
        SHOW_INDIVIDUAL_PROGRESS: true
    },

    // =============================================================================
    // 6. HEADERS DE TIPOS DE ARCHIVO
    // =============================================================================

    /**
     * 6.1 Mapeo de extensiones a tipos MIME
     * Asocia extensiones de archivo con sus correspondientes Content-Type para HTTP.
     */
    FILE_HEADERS: {
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'txt': 'text/plain',
        'csv': 'text/csv',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif'
    },

    // =============================================================================
    // 7. CONFIGURACIÓN DE DEBUG
    // =============================================================================

    /**
     * 7.1 Opciones de depuración y logging
     * Controla qué información de diagnóstico se registra en consola.
     */
    DEBUG: {
        /**
         * 7.1.1 Registrar progreso de subida
         * Activa logs detallados del proceso de subida de archivos.
         */
        LOG_UPLOAD_PROGRESS: true,
        
        /**
         * 7.1.2 Registrar validación de archivos
         * Activa logs de las validaciones realizadas a los archivos.
         */
        LOG_FILE_VALIDATION: true,
        
        /**
         * 7.1.3 Registrar solicitudes de red
         * Activa logs de todas las solicitudes HTTP realizadas.
         */
        LOG_NETWORK_REQUESTS: true,
        
        /**
         * 7.1.4 Mostrar estadísticas de subida
         * Activa la visualización de métricas de rendimiento de subida.
         */
        SHOW_UPLOAD_STATS: true
    },

    // =============================================================================
    // 8. OPTIMIZACIÓN DE CLOUDINARY
    // =============================================================================

    /**
     * 8.1 Opciones de seguridad para descargas de Cloudinary
     * Configuración para generar URLs firmadas y controlar acceso a archivos.
     */
    CLOUDINARY_DOWNLOAD_OPTIONS: {
        /**
         * 8.1.1 Usar URLs firmadas
         * Requiere autenticación para acceder a los archivos en Cloudinary.
         */
        sign_url: true,
        
        /**
         * 8.1.2 Tiempo de expiración
         * Duración en segundos antes de que una URL firmada expire.
         */
        expires_at: 3600, // 1 hora
        
        /**
         * 8.1.3 Tipo de autenticación
         * Especifica el método de autenticación para Cloudinary.
         */
        type: 'authenticated'
    },

    // =============================================================================
    // 9. ESTRATEGIAS DE DESCARGA PREFERIDAS
    // =============================================================================

    /**
     * 9.1 Estrategias por tipo de archivo
     * Define el método de descarga preferido según el tipo de archivo.
     */
    DOWNLOAD_STRATEGIES: {
        /**
         * 9.1.1 PDFs: Usar servidor
         * Los PDFs se descargan a través del servidor para mejor control y seguridad.
         */
        pdf: 'server',
        
        /**
         * 9.1.2 Imágenes: Descarga directa
         * Las imágenes pueden descargarse directamente desde Cloudinary para mayor velocidad.
         */
        image: 'direct',
        
        /**
         * 9.1.3 Archivos Office: Usar servidor
         * Documentos de Office pasan por el servidor para manejar posibles conversiones.
         */
        office: 'server',
        
        /**
         * 9.1.4 Otros tipos: Usar servidor
         * Tipos de archivo no especificados usan servidor por defecto para seguridad.
         */
        other: 'server'
    }
};

export { CONFIG };