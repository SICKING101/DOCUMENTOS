// =============================================================================
// src/frontend/modules/documentos/index.js
// =============================================================================

// IMPORTAR las funciones que se usan en initializeDocumentosModule
import { setupFileDragAndDrop } from './upload/dragAndDrop.js';
import { loadFilterState } from './table/tableFilters.js';
import { initializeTableFilters } from './table/tableFilters.js';
import { MultipleUploadState } from './core/MultipleUploadState.js';
import { formatFileSize, getFileIcon } from '../../utils.js';

// IMPORTAR NUEVO MODAL DE ELIMINACIÓN MÚLTIPLE
import { bulkDeleteModal } from './modals/bulkDeleteModal.js';
import { bulkDeleteState } from './core/BulkDeleteState.js';

// =============================================================================
// Re-exportaciones
// =============================================================================

// Core
export { MultipleUploadState } from './core/MultipleUploadState.js';
export { bulkDeleteState } from './core/BulkDeleteState.js';
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
export { changeDocumentsPage } from './table/tableRenderer.js';
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
    populatePersonSelect,
    populateAllPersonSelects
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
        if (window.multipleUploadState && window.multipleUploadState.removeFile(fileObj.id)) {
            updateMultipleUploadUI();
            updateUploadButton();
        }
    });
    
    return element;
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

// =============================================================================
// Inicialización global mejorada
// =============================================================================

/**
 * Renderiza la lista reducida de documentos vencidos en el panel y añade interacciones.
 */
export function renderExpiredDocuments() {
    try {
        if (!window.appState || !window.appState.documents) return;

        const modeEl = document.getElementById('expiredViewMode');
        const mode = modeEl ? modeEl.value : 'expired'; // 'expired' | 'expiring' | 'all'
        const now = new Date();

        // Filtrar según modo
        let filtered = [];
        if (mode === 'expired') {
            filtered = window.appState.documents.filter(doc => {
                if (!doc.fecha_vencimiento) return false;
                try { return new Date(doc.fecha_vencimiento) < now; } catch (e) { return false; }
            });
        } else if (mode === 'expiring') {
            filtered = window.appState.documents.filter(doc => {
                if (!doc.fecha_vencimiento) return false;
                try {
                    const diffDays = Math.ceil((new Date(doc.fecha_vencimiento) - now) / (1000 * 60 * 60 * 24));
                    return diffDays > 0 && diffDays <= 7;
                } catch (e) { return false; }
            });
        } else {
            // 'all' -> incluir todos los documentos (con o sin fecha)
            filtered = window.appState.documents.slice();
        }

        filtered.sort((a,b) => new Date(b.fecha_vencimiento || 0) - new Date(a.fecha_vencimiento || 0));

        const list = document.getElementById('expiredDocumentsList');
        const count = document.getElementById('expiredCount');

        if (!list || !count) return;

        count.textContent = String(filtered.length);

        if (filtered.length === 0) {
            let title = 'No hay documentos';
            let desc = 'Los documentos aparecerán aquí';
            if (mode === 'expired') { title = 'No hay documentos vencidos'; desc = 'Los documentos vencidos aparecerán aquí'; }
            else if (mode === 'expiring') { title = 'No hay documentos por vencer'; desc = 'Los documentos que expiran en los próximos 7 días aparecerán aquí'; }
            else if (mode === 'all') { title = 'No hay documentos'; desc = 'No se encontraron documentos con los criterios seleccionados'; }

            list.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-check-circle"></i>
                    <h4 class="empty-state__title">${title}</h4>
                    <p class="empty-state__description">${desc}</p>
                </div>
            `;
            return;
        }

        // Mostrar hasta 5 documentos
        const toShow = filtered.slice(0,5);
        list.innerHTML = '';

        toShow.forEach(doc => {
            const fecha = doc.fecha_vencimiento ? new Date(doc.fecha_vencimiento) : null;
            const item = document.createElement('div');
            item.className = 'expired-item';

            const sizeText = doc.tamano_archivo ? formatFileSize(doc.tamano_archivo) : null;
            const tipo = doc.tipo_archivo || '';
            const persona = (doc.persona && (doc.persona.nombre || doc.persona.name)) ? (doc.persona.nombre || doc.persona.name) : (doc.persona_id ? doc.persona_id : '—');
            const estado = doc.estadoVirtual || '';

            let actionsHTML = '';
            if (mode === 'expired') {
                actionsHTML = `
                    <button class="btn btn--success" title="Renovar" data-id="${doc._id}" data-action="renew"><i class="fas fa-redo"></i> Renovar</button>
                    <button class="btn btn--danger" title="Eliminar" data-id="${doc._id}" data-action="delete"><i class="fas fa-trash"></i> Eliminar</button>
                `;
            } else {
                actionsHTML = `
                    <button class="btn btn--sm btn--outline btn--icon btn--view" title="Ver" data-id="${doc._id}" data-action="view"><i class="fas fa-eye"></i></button>
                    <button class="btn btn--sm btn--outline btn--icon btn--download" title="Descargar" data-id="${doc._id}" data-action="download"><i class="fas fa-download"></i></button>
                    <button class="btn btn--sm btn--outline btn--icon btn--edit" title="Editar" data-id="${doc._id}" data-action="edit"><i class="fas fa-edit"></i></button>
                    <button class="btn btn--sm btn--outline btn--icon btn--delete" title="Eliminar" data-id="${doc._id}" data-action="delete"><i class="fas fa-trash-alt"></i></button>
                `;
            }

            item.innerHTML = `
                <div class="expired-item__main">
                    <div class="expired-item__title">${doc.nombre_original || 'Documento sin nombre'}</div>
                    <div class="expired-item__meta">
                        ${doc.categoria || 'General'} • ${fecha ? fecha.toLocaleDateString() : 'Sin fecha'}
                        ${sizeText ? ` • ${sizeText}` : ''}
                        ${tipo ? ` • ${tipo}` : ''}
                        ${persona ? ` • ${persona}` : ''}
                        ${estado ? ` • ${estado}` : ''}
                    </div>
                </div>
                <div class="expired-item__actions">
                    ${actionsHTML}
                </div>
            `;

            // Action listeners
            item.querySelectorAll('button[data-action]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const action = btn.getAttribute('data-action');
                    const id = btn.getAttribute('data-id');
                    if (action === 'renew') {
                        if (window.renovarDocumento) return window.renovarDocumento(id);
                    }
                    if (action === 'view' && window.previewDocument) return window.previewDocument(id);
                    if (action === 'download' && window.downloadDocument) return window.downloadDocument(id);
                    if (action === 'edit' && window.editDocument) return window.editDocument(id);
                    if (action === 'delete') {
                        if (mode === 'expired' && window.eliminarDocumento) return window.eliminarDocumento(id);
                        if (window.deleteDocument) return window.deleteDocument(id);
                    }
                });
            });

            list.appendChild(item);
        });

    } catch (error) {
        console.error('Error renderExpiredDocuments:', error);
    }
}

/**
 * Inicializa el módulo de documentos con todas las funcionalidades.
 * Debe llamarse cuando el DOM esté listo.
 */
export function initializeDocumentosModule() {
    console.group('🚀 INICIALIZANDO MÓDULO DE DOCUMENTOS');
    
    try {
        // 1. Inicializar estado de subida múltiple si no existe
        if (!window.multipleUploadState) {
            window.multipleUploadState = new MultipleUploadState();
            console.log('✅ Estado de subida múltiple inicializado');
        }
        
        // 2. Configurar drag and drop
        setupFileDragAndDrop();
        
        // 3. Cargar estado de filtros si existe
        loadFilterState();
        
        // 4. Inicializar filtros de tabla
        initializeTableFilters();
        
        // 5. Inicializar modal de eliminación múltiple
        bulkDeleteModal.init();
        
        // 6. Inicializar modal de edición de documentos
        import('./modals/editDocumentModal.js').then(module => {
            module.initEditDocumentModal();
            console.log('✅ Modal de edición inicializado');
        }).catch(err => {
            console.error('❌ Error cargando modal de edición:', err);
        });
        
        // 7. Configurar funciones globales
        setupGlobalFunctions();

        // 7.1 Botón "Actualizar" (recargar lista + filtros + categorías)
        const refreshBtn = document.getElementById('refreshDocumentsBtn');
        if (refreshBtn && !refreshBtn.dataset.listenerBound) {
            refreshBtn.dataset.listenerBound = 'true';
            refreshBtn.addEventListener('click', async () => {
                refreshBtn.disabled = true;
                try {
                    if (window.refreshDocumentsView) {
                        await window.refreshDocumentsView();
                    } else if (window.loadDocuments) {
                        await window.loadDocuments();
                    }
                } catch (e) {
                    console.error('Error al actualizar documentos:', e);
                    showAlert('Error al actualizar documentos', 'error');
                } finally {
                    refreshBtn.disabled = false;
                }
            });
        }

        // 8. Inicializar panel de documentos vencidos
        const viewAllBtn = document.getElementById('viewAllExpiredBtn');
        const modeSelect = document.getElementById('expiredViewMode');

        if (modeSelect) {
            modeSelect.addEventListener('change', () => {
                try { renderExpiredDocuments(); } catch (e) { console.error('Error re-renderizando panel vencidos tras cambio de modo:', e); }
            });
        }

        if (viewAllBtn) {
            viewAllBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const statusSelect = document.getElementById('filterStatus');
                const currentMode = modeSelect ? modeSelect.value : 'expired';
                let statusValue = '';
                if (currentMode === 'expired') statusValue = 'expired';
                else if (currentMode === 'expiring') statusValue = 'expiring';
                else statusValue = '';

                if (statusSelect) {
                    statusSelect.value = statusValue;
                    statusSelect.dispatchEvent(new Event('change'));
                    // Scroll to table for better UX
                    const table = document.getElementById('documentosTableBody');
                    if (table) table.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        }

        // Exponer la función para compatibilidad y llamarla ahora
        window.renderExpiredDocuments = renderExpiredDocuments;
        try {
            renderExpiredDocuments();
        } catch (e) {
            console.error('Error inicializando panel vencidos:', e);
        }
        
        console.log('✅ Módulo de documentos inicializado correctamente');
        console.log('📋 Funcionalidades disponibles:');
        console.table({
            'Subida múltiple': '✓',
            'Eliminación múltiple': '✓',
            'Vista previa': '✓',
            'Descargas': '✓',
            'Filtros': '✓',
            'Edición': '✓'
        });
        
    } catch (error) {
        console.error('❌ Error crítico inicializando módulo de documentos:', error);
        showAlert('Error inicializando módulo de documentos. Revisa la consola.', 'error');
        throw error;
    }
    
    console.groupEnd();
}

/**
 * CONFIGURAR FUNCIONES GLOBALES
 */
function setupGlobalFunctions() {
    console.log('🔧 Configurando funciones globales...');
    
    // Modal de eliminación múltiple
    window.bulkDeleteModal = bulkDeleteModal;
    window.bulkDeleteState = bulkDeleteState;
    
    // Funciones de debugging
    window.debugBulkDelete = () => bulkDeleteModal.debug();
    window.testBulkDelete = () => bulkDeleteModal.test();
    
    // Funciones de utilidad
    window.openBulkDelete = () => bulkDeleteModal.open();
    window.closeBulkDelete = () => bulkDeleteModal.close();
    
    console.log('✅ Funciones globales configuradas');
}

/**
 * Función de conveniencia para obtener todas las funciones exportadas.
 * Útil para debugging o para asignar globalmente.
 */
export function getAllDocumentosFunctions() {
    return {
        // Core
        MultipleUploadState,
        bulkDeleteState,
        
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
        
        // Modal de eliminación múltiple
        bulkDeleteModal,
        
        // Modals
        openDocumentModal,
        closeDocumentModal,
        switchUploadMode,
        populateDocumentCategorySelect,
        populateMultipleCategorySelect,
        populateFileCategorySelect,
        populatePersonSelect,
        populateAllPersonSelects,
        
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

// Auto-inicializar cuando se carga la pestaña de documentos
document.addEventListener('DOMContentLoaded', () => {
    // Verificar si estamos en la pestaña de documentos
    const documentosTab = document.getElementById('documentos');
    if (documentosTab && documentosTab.classList.contains('active')) {
        console.log('📁 Pestaña de documentos activa, inicializando...');
        setTimeout(() => {
            initializeDocumentosModule();
        }, 500);
    }
    
    // También inicializar cuando se cambie a la pestaña
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const documentosTab = document.getElementById('documentos');
                if (documentosTab && documentosTab.classList.contains('active')) {
                    console.log('🔄 Cambiando a pestaña de documentos, inicializando...');
                    setTimeout(() => {
                        initializeDocumentosModule();
                    }, 300);
                }
            }
        });
    });
    
    // Observar cambios en la pestaña de documentos
    if (documentosTab) {
        observer.observe(documentosTab, { attributes: true });
    }
});

// Exportar la función de inicialización por si se necesita llamar manualmente
export default initializeDocumentosModule;