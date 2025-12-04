// =============================================================================
// CONFIGURACIÓN DE LA APLICACIÓN - COMPLETO
// =============================================================================
const CONFIG = {
    API_BASE_URL: 'http://localhost:4000/api',

    CLOUDINARY_CLOUD_NAME: 'dn9ts84q6',
    CLOUDINARY_API_KEY: '797652563747974',
    CLOUDINARY_UPLOAD_PRESET: 'DOCUMENTOS',
    CLOUDINARY_API_SECRET: 'raOkraliwEKlBFTRL7Cr9kEyHOA',

    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_FILE_TYPES: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'jpg', 'jpeg', 'png'],

    MAX_MULTIPLE_FILES: 20, // Nuevo: máximo de archivos múltiples
    MAX_TOTAL_UPLOAD_SIZE: 50 * 1024 * 1024, // Nuevo: tamaño total máximo para múltiples archivos

    // Configuración adicional para descargas
    DOWNLOAD_TIMEOUT: 60000, // 60 segundos
    DOWNLOAD_RETRY_ATTEMPTS: 3,
    ENABLE_DIRECT_DOWNLOAD: true,

    // Upload Strategy Configuration - NUEVO
    UPLOAD_STRATEGIES: {
        SEQUENTIAL: {
            name: 'sequential',
            maxConcurrent: 1,
            delayBetween: 1000
        },
        PARALLEL: {
            name: 'parallel',
            maxConcurrent: 5,
            delayBetween: 0
        },
        BATCH: {
            name: 'batch',
            maxConcurrent: 3,
            delayBetween: 500
        }
    },

        // Multiple Upload Configuration - NUEVO
    MULTIPLE_UPLOAD: {
        BATCH_SIZE: 5,
        MAX_RETRIES: 3,
        PROGRESS_UPDATE_INTERVAL: 500, // ms
        SHOW_INDIVIDUAL_PROGRESS: true
    },

    // Headers para diferentes tipos de archivo
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

     // Debug Configuration - NUEVO
    DEBUG: {
        LOG_UPLOAD_PROGRESS: true,
        LOG_FILE_VALIDATION: true,
        LOG_NETWORK_REQUESTS: true,
        SHOW_UPLOAD_STATS: true
    },

    // Cloudinary optimization - IMPORTANTE: Usar URLs firmadas
    CLOUDINARY_DOWNLOAD_OPTIONS: {
        sign_url: true,
        expires_at: 3600, // 1 hora
        type: 'authenticated'
    },

    // Estrategias de descarga preferidas
    DOWNLOAD_STRATEGIES: {
        pdf: 'server', // Usar siempre el servidor para PDFs
        image: 'direct', // Imágenes pueden ir directo
        office: 'server', // Office usar servidor
        other: 'server' // Otros usar servidor
    }
};

export { CONFIG };