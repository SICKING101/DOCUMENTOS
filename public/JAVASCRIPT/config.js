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
    
    // Configuración adicional para descargas
    DOWNLOAD_TIMEOUT: 60000, // 60 segundos
    DOWNLOAD_RETRY_ATTEMPTS: 3,
    ENABLE_DIRECT_DOWNLOAD: true,
    
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