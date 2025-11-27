// =============================================================================
// CONFIGURACIÓN DE LA APLICACIÓN
// =============================================================================
const CONFIG = {
    API_BASE_URL: 'http://localhost:4000/api',
    CLOUDINARY_CLOUD_NAME: 'dn9ts84q6',
    CLOUDINARY_API_KEY: '797652563747974',
    CLOUDINARY_UPLOAD_PRESET: 'DOCUMENTOS',
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_FILE_TYPES: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'jpg', 'jpeg', 'png']
};

export { CONFIG };