// =============================================================================
// src/frontend/modules/documentos/index.js
// =============================================================================

// IMPORTAR las funciones que se usan en initializeDocumentosModule
import { setupFileDragAndDrop } from './upload/dragAndDrop.js';
import { loadFilterState } from './table/tableFilters.js';
import { initializeTableFilters } from './table/tableFilters.js';
import { MultipleUploadState } from './core/MultipleUploadState.js';
import { formatFileSize, getFileIcon, formatDate } from '../../utils.js';

// =============================================================================
// Re-exportaciones
// =============================================================================

// Core
export { MultipleUploadState } from './core/MultipleUploadState.js';
export * from './core/constants.js';

// Upload
export { handleFile, handleFileSelect, handleUploadDocument } from './upload/uploadSingle.js';
export { 
    multipleUploadState, 
    handleMultipleFiles, 
    handleMultipleFileSelect, 
    handleUploadMultipleDocuments 
} from './upload/uploadMultiple.js';
export { setupFileDragAndDrop } from './upload/dragAndDrop.js';
export { 
    showUploadProgressContainer, 
    hideUploadProgressContainer, 
    cancelMultipleUpload,
    showUploadResults,
    updateOverallProgress
} from './upload/progressManager.js';

// Preview
export { previewDocument, canPreviewDocument } from './preview/previewManager.js';
export { 
    showImagePreviewModal, 
    showPDFPreviewModal 
} from './preview/previewModals.js';
export { 
    showTextPreviewModal 
} from './preview/textPreview.js';
export { 
    showOfficePreviewModal,
    canPreviewOfficeDocument,
    getOfficePreviewInfo 
} from './preview/officePreview.js';

// Download
export { downloadDocument, downloadDocumentFromPreview } from './download/downloadManager.js';
export { downloadDocumentSimple, downloadDocumentAlternative } from './download/downloadMethods.js';
export { 
    debugDocumentDownload,
    testAllDownloads,
    testDownloadMethod 
} from './download/downloadDiagnostics.js';

// Table
export { renderDocumentsTable } from './table/tableRenderer.js';
export { 
    initializeTableFilters,
    applyFilters,
    loadFilterState,
    clearAllFilters,
    getFilteredDocumentStats,
    exportFilteredToCSV 
} from './table/tableFilters.js';

// Modals
export { openDocumentModal, closeDocumentModal, switchUploadMode } from './modals/documentModal.js';
export { 
    populateDocumentCategorySelect, 
    populateMultipleCategorySelect, 
    populateFileCategorySelect, 
    populatePersonSelect 
} from './modals/modalHelpers.js';

// Funciones que necesitan ser expuestas globalmente para compatibilidad
export { 
    debugMultipleUpload,
    testMultipleUploadWithMockFiles,
    deleteDocument,
    loadDocuments,
    setupCompatibilityGlobals
} from './compatibility.js';

// =============================================================================
// Funciones auxiliares y helpers que no están en otros módulos
// =============================================================================

/**
 * Actualiza la UI completa de subida múltiple.
 * Incluye contador, lista de archivos, resumen y configuración.
 */
export function updateMultipleUploadUI() {
    console.log('🔄 Actualizando UI de subida múltiple');
    
    if (!window.multipleUploadState) {
        console.error('❌ Estado de subida múltiple no inicializado');
        return;
    }
    
    // Actualizar contador
    const countElement = document.getElementById('selectedFilesCount');
    if (countElement) {
        countElement.textContent = window.multipleUploadState.files.length;
    }
    
    // Actualizar lista de archivos
    renderFilesList();
    
    // Actualizar resumen
    updateFilesSummary();
    
    // Actualizar botón de subida
    updateUploadButton();
}

/**
 * Renderiza la lista de archivos en el contenedor correspondiente.
 */
function renderFilesList() {
    const filesListContainer = document.getElementById('filesListContainer');
    if (!filesListContainer) {
        console.error('❌ Contenedor de lista no encontrado');
        return;
    }
    
    // Limpiar lista
    filesListContainer.innerHTML = '';
    
    if (!window.multipleUploadState || window.multipleUploadState.files.length === 0) {
        filesListContainer.innerHTML = `
            <div class="files__empty">
                <i class="fas fa-file-alt"></i>
                <p>No hay archivos seleccionados</p>
            </div>
        `;
        return;
    }
    
    // Renderizar cada archivo
    window.multipleUploadState.files.forEach(fileObj => {
        const fileElement = createFileElement(fileObj);
        filesListContainer.appendChild(fileElement);
    });
}

/**
 * Crea un elemento DOM para un archivo en la lista.
 */
function createFileElement(fileObj) {
    const file = fileObj.file;
    const fileExtension = file.name.split('.').pop().toLowerCase();
    const fileIcon = getFileIcon(fileExtension);
    
    const element = document.createElement('div');
    element.className = `file-item file-item--${fileObj.status}`;
    element.dataset.fileId = fileObj.id;
    
    element.innerHTML = `
        <div class="file-item__header">
            <div class="file-item__icon">
                <i class="fas fa-file-${fileIcon}"></i>
            </div>
            <div class="file-item__info">
                <div class="file-item__name" title="${file.name}">${file.name}</div>
                <div class="file-item__details">
                    <span class="file-item__size">${formatFileSize(file.size)}</span>
                    <span class="file-item__type">${fileExtension.toUpperCase()}</span>
                </div>
            </div>
            <div class="file-item__actions">
                <button class="btn btn--sm btn--danger file-item__remove" title="Eliminar">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
        
        <div class="file-item__body">
            <div class="file-item__status">
                <span class="status-badge status-badge--${fileObj.status}">
                    ${getStatusText(fileObj.status)}
                </span>
                ${fileObj.status === 'uploading' ? `
                    <div class="file-item__progress">
                        <div class="progress-bar">
                            <div class="progress-bar__fill" style="width: ${fileObj.progress}%"></div>
                        </div>
                        <span class="progress-text">${fileObj.progress}%</span>
                    </div>
                ` : ''}
            </div>
        </div>
        
        ${fileObj.error ? `
            <div class="file-item__error">
                <i class="fas fa-exclamation-circle"></i>
                <span>${fileObj.error}</span>
            </div>
        ` : ''}
    `;
    
    // Agregar event listeners
    const removeBtn = element.querySelector('.file-item__remove');
    removeBtn.addEventListener('click', () => {
        if (window.multipleUploadState.removeFile(fileObj.id)) {
            updateMultipleUploadUI();
            updateUploadButton();
        }
    });
    
    return element;
}

/**
 * Obtiene el texto legible para un estado de archivo.
 */
function getStatusText(status) {
    const statusMap = {
        'pending': 'Pendiente',
        'uploading': 'Subiendo',
        'completed': 'Completado',
        'failed': 'Fallido'
    };
    return statusMap[status] || status;
}

/**
 * Actualiza el resumen de archivos con estadísticas actuales.
 */
function updateFilesSummary() {
    const filesSummary = document.getElementById('filesSummary');
    if (!filesSummary || !window.multipleUploadState) return;
    
    const stats = window.multipleUploadState.getStats();
    
    // Calcular tiempo estimado (1MB ≈ 1 segundo en conexión buena)
    const estimatedTimeSeconds = Math.ceil(stats.totalSize / (1024 * 1024));
    
    filesSummary.innerHTML = `
        <div class="summary__item">
            <i class="fas fa-file"></i>
            <span>Total archivos: <strong>${stats.total}</strong></span>
        </div>
        <div class="summary__item">
            <i class="fas fa-hdd"></i>
            <span>Tamaño total: <strong>${formatFileSize(stats.totalSize)}</strong></span>
        </div>
        <div class="summary__item">
            <i class="fas fa-clock"></i>
            <span>Tiempo estimado: <strong>${estimatedTimeSeconds}s</strong></span>
        </div>
    `;
}

/**
 * Actualiza el botón de subida múltiple.
 */
function updateUploadButton() {
    const uploadBtn = document.getElementById('uploadMultipleDocumentsBtn');
    const uploadCount = document.getElementById('uploadCount');
    
    if (!uploadBtn || !uploadCount) return;
    
    if (!window.multipleUploadState || window.multipleUploadState.files.length === 0) {
        uploadBtn.disabled = true;
        uploadCount.textContent = '0';
    } else {
        uploadBtn.disabled = false;
        uploadCount.textContent = window.multipleUploadState.files.length;
    }
}

// =============================================================================
// Inicialización global
// =============================================================================

/**
 * Inicializa el módulo de documentos.
 * Debe llamarse cuando el DOM esté listo.
 */
export function initializeDocumentosModule() {
    console.log('🚀 Inicializando módulo de documentos...');
    
    try {
        // Inicializar estado de subida múltiple si no existe
        if (!window.multipleUploadState) {
            window.multipleUploadState = new MultipleUploadState();
            console.log('✅ Estado de subida múltiple inicializado');
        }
        
        // Configurar drag and drop
        setupFileDragAndDrop();
        
        // Cargar estado de filtros si existe
        loadFilterState();
        
        // Inicializar filtros de tabla
        initializeTableFilters();
        
        console.log('✅ Módulo de documentos inicializado correctamente');
        
    } catch (error) {
        console.error('❌ Error inicializando módulo de documentos:', error);
        throw error;
    }
}

/**
 * Función de conveniencia para obtener todas las funciones exportadas.
 * Útil para debugging o para asignar globalmente.
 */
export function getAllDocumentosFunctions() {
    return {
        // Core
        MultipleUploadState,
        
        // Upload
        handleFile,
        handleFileSelect,
        handleUploadDocument,
        multipleUploadState: window.multipleUploadState,
        handleMultipleFiles,
        handleMultipleFileSelect,
        handleUploadMultipleDocuments,
        setupFileDragAndDrop,
        showUploadProgressContainer,
        hideUploadProgressContainer,
        cancelMultipleUpload,
        showUploadResults,
        updateOverallProgress,
        
        // Preview
        previewDocument,
        canPreviewDocument,
        showImagePreviewModal,
        showPDFPreviewModal,
        showTextPreviewModal,
        showOfficePreviewModal,
        canPreviewOfficeDocument,
        getOfficePreviewInfo,
        
        // Download
        downloadDocument,
        downloadDocumentFromPreview,
        downloadDocumentSimple,
        downloadDocumentAlternative,
        debugDocumentDownload,
        testAllDownloads,
        testDownloadMethod,
        
        // Table
        renderDocumentsTable,
        initializeTableFilters,
        applyFilters,
        loadFilterState,
        clearAllFilters,
        getFilteredDocumentStats,
        exportFilteredToCSV,
        
        // Modals
        openDocumentModal,
        closeDocumentModal,
        switchUploadMode,
        populateDocumentCategorySelect,
        populateMultipleCategorySelect,
        populateFileCategorySelect,
        populatePersonSelect,
        
        // UI Helpers
        updateMultipleUploadUI,
        
        // Compatibility
        deleteDocument,
        loadDocuments,
        debugMultipleUpload,
        testMultipleUploadWithMockFiles,
        
        // Inicialización
        initializeDocumentosModule
    };
}