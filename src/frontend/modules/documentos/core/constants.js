// Estrategias de subida
export const UPLOAD_STRATEGIES = {
    SEQUENTIAL: 'sequential',
    PARALLEL: 'parallel',
    BATCH: 'batch'
};

// Estados de archivos
export const FILE_STATUS = {
    PENDING: 'pending',
    UPLOADING: 'uploading',
    COMPLETED: 'completed',
    FAILED: 'failed'
};

// Textos de estado legibles
export const STATUS_TEXTS = {
    pending: 'Pendiente',
    uploading: 'Subiendo',
    completed: 'Completado',
    failed: 'Fallido'
};

// Tipos de archivo previsualizables
export const PREVIEWABLE_EXTENSIONS = {
    IMAGES: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'],
    PDF: ['pdf'],
    TEXT: ['txt', 'csv', 'json', 'xml', 'html', 'htm'],
    OFFICE: ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx']
};

// Configuración de vista previa
export const PREVIEW_CONFIG = {
    MAX_TEXT_LENGTH: 100000, // 100KB
    MAX_IMAGE_SIZE: '5MB',
    PDF_VIEWER_URL: '/documents/{id}/preview'
};

// Configuración de subida múltiple
export const MULTIPLE_UPLOAD_CONFIG = {
    MAX_CONCURRENT_UPLOADS: 3,
    BATCH_SIZE: 3,
    DELAY_BETWEEN_FILES: 500,
    DELAY_BETWEEN_BATCHES: 2000
};