// =============================================================================
// src/frontend/modules/documentos/index.js
// =============================================================================

// IMPORTAR las funciones que se usan en initializeDocumentosModule

import { loadFilterState } from './table/tableFilters.js';
import { initializeTableFilters } from './table/tableFilters.js';
import { MultipleUploadState } from './core/MultipleUploadState.js';
import { formatFileSize, getFileIcon, showAlert } from '../../utils.js';

import { showDocumentNotification } from './notificationConfig.js';
import { withDocumentLoadControl, setupDocumentNotificationControl } from '../../utils.js';


// IMPORTAR NUEVO MODAL DE ELIMINACIÓN MÚLTIPLE
import { bulkDeleteModal } from './modals/bulkDeleteModal.js';
import { bulkDeleteState } from './core/BulkDeleteState.js';

import { bulkMoveModal } from './modals/bulkMoveModal.js';
import { bulkMoveState } from './core/BulkMoveState.js';
import { bulkMoveManager } from './core/bulkMoveManager.js';

// IMPORTAR NAVEGACIÓN POR CATEGORÍAS
import {
    initCategoryNavigation,
    navigateToRoot,
    openCategoryModal,
    closeCategoryModal,
    saveCategory,
    refreshCategoryTree 
} from './categoryNavigation.js';



// IMPORTAR MANEJADOR DE MOVIMIENTO DE DOCUMENTOS
import {
    initializeDocumentMoveHandler,
    injectDocumentMoveStyles,
    removeDocumentMoveHandler,
    getPendingMoves,
    cancelDocumentMove
} from './dragdrop/documentMoveHandler.js';

import { setupFileDragAndDrop } from './upload/dragAndDrop.js';

// IMPORTAR DRAG & DROP PARA DOCUMENTOS
import {
    initializeDocumentDragDrop,
    reinitializeDragDrop,
    injectDragDropStyles
} from './dragdrop/documentDragDrop.js';

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

// Drag & Drop
export { initializeDocumentDragDrop, reinitializeDragDrop, injectDragDropStyles } from './dragdrop/documentDragDrop.js';
export {
    initializeDocumentMoveHandler,
    injectDocumentMoveStyles,
    removeDocumentMoveHandler,
    getPendingMoves,
    cancelDocumentMove
} from './dragdrop/documentMoveHandler.js';

// Funciones que necesitan ser expuestas globalmente para compatibilidad
export {
    debugMultipleUpload,
    testMultipleUploadWithMockFiles,
    deleteDocument,
    loadDocuments,
    setupCompatibilityGlobals
} from './compatibility.js';

export { refreshCategoryTree } from './categoryNavigation.js';

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
 */
export function updateMultipleUploadUI() {
    console.log('🔄 Actualizando UI de subida múltiple');

    if (!window.multipleUploadState) {
        console.error('❌ Estado de subida múltiple no inicializado');
        return;
    }

    const countElement = document.getElementById('selectedFilesCount');
    if (countElement) {
        countElement.textContent = window.multipleUploadState.files.length;
    }

    renderFilesList();
    updateFilesSummary();
    updateUploadButton();
}

// =============================================================================
// Inicialización global mejorada
// =============================================================================

/**
 * Renderiza la lista reducida de documentos vencidos en el panel.
 */
export function renderExpiredDocuments() {
    try {
        if (!window.appState || !window.appState.documents) return;

        const modeEl = document.getElementById('expiredViewMode');
        const mode = modeEl ? modeEl.value : 'expired';
        const now = new Date();

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
            filtered = window.appState.documents.slice();
        }

        filtered.sort((a, b) => new Date(b.fecha_vencimiento || 0) - new Date(a.fecha_vencimiento || 0));

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

        const toShow = filtered.slice(0, 5);
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
 * Incluye sistema reactivo de actualización en tiempo real.
 */
export function initializeDocumentosModule() {
    console.group('🚀 INICIALIZANDO MÓDULO DE DOCUMENTOS');

    try {
        // ===================================================================
        // 0. CONFIGURAR CONTROL DE NOTIFICACIONES
        // ===================================================================
        setupDocumentNotificationControl();
        console.log('✅ Control de notificaciones configurado');

        // ===================================================================
        // 0.5 INYECTAR ESTILOS DRAG & DROP
        // ===================================================================
        if (typeof injectDragDropStyles === 'function') {
            injectDragDropStyles();
            console.log('✅ Estilos Drag & Drop inyectados');
        }
        
        // ===================================================================
        // 0.6 INYECTAR ESTILOS DE MOVIMIENTO DE DOCUMENTOS
        // ===================================================================
        if (typeof injectDocumentMoveStyles === 'function') {
            injectDocumentMoveStyles();
            console.log('✅ Estilos de movimiento de documentos inyectados');
        }

        // ===================================================================
        // 1. INICIALIZAR ESTADO DE SUBIDA MÚLTIPLE
        // ===================================================================
        if (!window.multipleUploadState) {
            window.multipleUploadState = new MultipleUploadState();
            console.log('✅ Estado de subida múltiple inicializado');
        }

        // ===================================================================
        // 2. CONFIGURAR DRAG AND DROP DE ARCHIVOS
        // ===================================================================
        setupFileDragAndDrop();
        console.log('✅ Drag & drop de archivos configurado');

        // ===================================================================
        // 3. LIMPIAR LOCALSTORAGE SI TIENE FILTROS CORRUPTOS
        // ===================================================================
        try {
            const savedFilters = localStorage.getItem('documentFilters');
            if (savedFilters) {
                const parsed = JSON.parse(savedFilters);
                if (parsed.status === 'active' && !parsed.category && !parsed.type && !parsed.date) {
                    console.log('🧹 Detectado filtro corrupto, limpiando localStorage...');
                    localStorage.removeItem('documentFilters');
                    localStorage.removeItem('documentSearchQuery');
                }
            }
        } catch (e) {
            console.warn('⚠️ Error limpiando filtros viejos:', e.message);
            localStorage.removeItem('documentFilters');
            localStorage.removeItem('documentSearchQuery');
        }

        // ===================================================================
        // 4. INICIALIZAR APPSTATE CON FILTROS LIMPIOS
        // ===================================================================
        if (!window.appState) {
            window.appState = {};
        }
        if (!window.appState.documents) {
            window.appState.documents = [];
        }
        window.appState.filters = {
            category: '',
            type: '',
            date: '',
            status: ''
        };
        window.appState.currentSearchQuery = '';
        window.appState.filteredDocuments = null;

        console.log('📊 Estado inicial de filtros:', window.appState.filters);

        // ===================================================================
        // 5. INICIALIZAR FILTROS DE TABLA
        // ===================================================================
        if (typeof initializeTableFilters === 'function') {
            initializeTableFilters();
            console.log('✅ Filtros de tabla inicializados');
        }

        // ===================================================================
        // 6. ESTABLECER SELECTS A VACÍO
        // ===================================================================
        const filterStatus = document.getElementById('filterStatus');
        if (filterStatus) {
            filterStatus.value = '';
        }

        const filterCategory = document.getElementById('filterCategory');
        if (filterCategory) {
            filterCategory.value = '';
        }

        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = '';
        }

        // ===================================================================
        // 7. CARGAR ESTADO GUARDADO DE FILTROS
        // ===================================================================
        if (typeof loadFilterState === 'function') {
            loadFilterState();
            console.log('✅ Estado de filtros cargado');
        }

        // ===================================================================
        // 8. INICIALIZAR NAVEGACIÓN POR CATEGORÍAS
        // ===================================================================
        console.log('🗂️ Llamando a initCategoryNavigation...');
        if (typeof initCategoryNavigation === 'function') {
            initCategoryNavigation();
            console.log('✅ Navegación por categorías inicializada');
        } else {
            console.warn('⚠️ initCategoryNavigation no está disponible');
        }

        // ===================================================================
        // 9. INICIALIZAR DRAG & DROP DE DOCUMENTOS
        // ===================================================================
        console.log('🎯 Programando inicialización de drag & drop...');
        setTimeout(() => {
            if (typeof initializeDocumentDragDrop === 'function') {
                initializeDocumentDragDrop();
                console.log('✅ Drag & drop de documentos inicializado');
            } else {
                console.warn('⚠️ initializeDocumentDragDrop no está disponible');
            }
        }, 600);

        // ===================================================================
        // 9.5 INICIALIZAR MANEJADOR DE MOVIMIENTO DE DOCUMENTOS
        // ===================================================================
        if (typeof initializeDocumentMoveHandler === 'function') {
            initializeDocumentMoveHandler();
            console.log('✅ Manejador de movimiento de documentos inicializado');
        }

        // ===================================================================
        // 9.6 CONFIGURAR EVENTOS DE ACTUALIZACIÓN EN TIEMPO REAL
        // ===================================================================
        _setupRealtimeUpdateEvents();
        console.log('✅ Eventos de actualización en tiempo real configurados');

        // ===================================================================
        // 10. VERIFICAR FILTROS CORRUPTOS DESPUÉS DE LOADFILTERSTATE
        // ===================================================================
        if (window.appState.filters && window.appState.filters.status === 'active' &&
            !window.appState.filters.category && !window.appState.filters.type && !window.appState.filters.date) {
            console.log('🧹 loadFilterState restauró filtro corrupto, limpiando de nuevo...');
            window.appState.filters.status = '';
            if (filterStatus) filterStatus.value = '';
            localStorage.removeItem('documentFilters');
        }

        // ===================================================================
        // 11. INICIALIZAR MODAL DE ELIMINACIÓN MÚLTIPLE
        // ===================================================================
        if (typeof bulkDeleteModal?.init === 'function') {
            bulkDeleteModal.init();
            console.log('✅ Modal de eliminación múltiple inicializado');
        }

        // ===================================================================
        // 11.5 INICIALIZAR MODAL DE MOVIMIENTO MÚLTIPLE
        // ===================================================================
        if (typeof bulkMoveModal?.init === 'function') {
            bulkMoveModal.init();
            console.log('✅ Modal de movimiento múltiple inicializado');
        }

        // Inicializar el manager de movimiento múltiple
        if (typeof bulkMoveManager?.init === 'function') {
            bulkMoveManager.init();
            console.log('✅ Manager de movimiento múltiple inicializado');
        }

        // ===================================================================
        // 12. INICIALIZAR MODAL DE EDICIÓN DE DOCUMENTOS
        // ===================================================================
        import('./modals/editDocumentModal.js').then(module => {
            if (typeof module.initEditDocumentModal === 'function') {
                module.initEditDocumentModal();
                console.log('✅ Modal de edición inicializado');
            }
        }).catch(err => {
            console.error('❌ Error cargando modal de edición:', err);
        });

        // ===================================================================
        // 13. CONFIGURAR FUNCIONES GLOBALES
        // ===================================================================
        _setupGlobalFunctions();
        console.log('✅ Funciones globales configuradas');

        // ===================================================================
        // 14. INICIALIZAR PANEL DE DOCUMENTOS VENCIDOS
        // ===================================================================
        _initExpiredDocumentsPanel();
        console.log('✅ Panel de documentos vencidos inicializado');

        // ===================================================================
        // 15. CONFIGURAR OBSERVER DE PESTAÑAS
        // ===================================================================
        _setupTabObserver();
        console.log('✅ Observer de pestañas configurado');

        // ===================================================================
        // 16. CONFIGURAR BOTONES Y EVENTOS ADICIONALES
        // ===================================================================
        _setupAdditionalEventListeners();
        console.log('✅ Eventos adicionales configurados');

        // ===================================================================
        // 17. FORZAR PRIMER RENDER SI ES NECESARIO
        // ===================================================================
        if (typeof window.renderDocumentsTable === 'function') {
            const hasDocuments = window.appState?.documents?.length > 0;
            if (hasDocuments) {
                console.log('📊 Forzando render inicial de tabla de documentos');
                window.renderDocumentsTable();
            }
        }

        // ===================================================================
        // LOG FINAL DE FUNCIONALIDADES DISPONIBLES
        // ===================================================================
        console.log('✅ Módulo de documentos inicializado correctamente');
        console.log('📋 Funcionalidades disponibles:');
        console.table({
            'Subida múltiple': '✓',
            'Eliminación múltiple': '✓',
            'Movimiento múltiple': '✓',
            'Vista previa': '✓',
            'Descargas': '✓',
            'Filtros': '✓',
            'Edición': '✓',
            'Navegación categorías': '✓',
            'Drag & drop documentos': '✓',
            'Movimiento documentos': '✓',
            'Actualización tiempo real': '✓',
            'Control notificaciones': '✓',
            'Panel vencidos': '✓'
        });

    } catch (error) {
        console.error('❌ Error crítico inicializando módulo de documentos:', error);
        console.error('Stack:', error.stack);
        if (typeof showAlert === 'function') {
            showAlert('Error inicializando módulo de documentos. Revisa la consola.', 'error');
        }
        throw error;
    }

    console.groupEnd();
}

/**
 * Configura eventos de actualización en tiempo real
 * @private
 */
function _setupRealtimeUpdateEvents() {
    // Evento cuando un documento se mueve en el DOM
    window.addEventListener('document:moved-in-dom', (event) => {
        const { documentId, folderId, folderName } = event.detail;
        console.log(`📢 [Realtime] Documento ${documentId} movido a "${folderName}"`);
        
        // Actualizar contadores en las tarjetas de categoría
        _updateCategoryCardCounts();
        
        // Actualizar panel de vencidos si es visible
        if (typeof window.renderExpiredDocuments === 'function') {
            try {
                window.renderExpiredDocuments();
            } catch (e) {
                console.warn('Error actualizando panel de vencidos:', e);
            }
        }
    });

    // Evento cuando se completa un movimiento (éxito)
    window.addEventListener('document:move-completed', async (event) => {
        const { documentId, folderId, folderName } = event.detail;
        console.log(`✅ [Realtime] Movimiento completado: ${documentId} → "${folderName}"`);
        
        // Refrescar datos silenciosamente
        await _silentRefreshData();
        
        // Navegar a la carpeta destino si es necesario
        if (folderId && typeof window.navigateCategoryInto === 'function') {
            setTimeout(() => {
                window.navigateCategoryInto(folderId);
            }, 200);
        }
    });

    // Evento cuando falla un movimiento
    window.addEventListener('document:move-failed', async (event) => {
        const { documentId, error } = event.detail;
        console.error(`❌ [Realtime] Movimiento fallido: ${documentId}`, error);
        
        // Refrescar datos para asegurar consistencia
        await _silentRefreshData();
        
        // Mostrar notificación de error
        if (typeof showAlert === 'function') {
            showAlert(`Error al mover documento: ${error}`, 'error');
        }
    });

    // Evento cuando se renderizan documentos
    window.addEventListener('documents:rendered', () => {
        console.log('📢 [Realtime] Documentos renderizados - reinicializando drag & drop');
        setTimeout(() => {
            if (typeof initializeDocumentDragDrop === 'function') {
                initializeDocumentDragDrop();
            }
        }, 100);
    });

    // Evento cuando se renderizan categorías
    window.addEventListener('categories:rendered', () => {
        console.log('📢 [Realtime] Categorías renderizadas - reinicializando drag & drop');
        setTimeout(() => {
            if (typeof initializeDocumentDragDrop === 'function') {
                initializeDocumentDragDrop();
            }
        }, 100);
    });

    // Evento cuando cambia el estado de las categorías
    window.addEventListener('categories:updated', () => {
        console.log('📢 [Realtime] Categorías actualizadas');
        _updateCategoryCardCounts();
    });

    // Evento cuando se crea un nuevo documento
    window.addEventListener('document:created', async () => {
        console.log('📢 [Realtime] Nuevo documento creado');
        await _silentRefreshData();
    });

    // Evento cuando se elimina un documento
    window.addEventListener('document:deleted', async () => {
        console.log('📢 [Realtime] Documento eliminado');
        await _silentRefreshData();
    });

    // Evento cuando se actualiza un documento
    window.addEventListener('document:updated', async () => {
        console.log('📢 [Realtime] Documento actualizado');
        await _silentRefreshData();
    });
}

/**
 * Actualiza los contadores en las tarjetas de categoría
 * @private
 */
function _updateCategoryCardCounts() {
    const categoryCards = document.querySelectorAll('[data-category-id]');
    if (categoryCards.length === 0) return;
    
    const categories = window.appState?.categories || [];
    if (categories.length === 0) return;
    
    categoryCards.forEach(card => {
        const categoryId = card.getAttribute('data-category-id');
        const countElement = card.querySelector('.category--card-count');
        
        if (countElement && categoryId) {
            const category = categories.find(c => c._id === categoryId);
            if (category) {
                const docCount = category.documentCount || 0;
                const childCount = category.children?.length || 0;
                
                if (childCount > 0) {
                    countElement.innerHTML = `<i class="fas fa-folder"></i> ${childCount} subcarp.`;
                } else {
                    countElement.innerHTML = `<i class="fas fa-file-alt"></i> ${docCount} doc${docCount !== 1 ? 's' : ''}`;
                }
                
                // Animar el cambio
                countElement.classList.add('count-updated');
                setTimeout(() => countElement.classList.remove('count-updated'), 1000);
            }
        }
    });
}

/**
 * Refresca los datos silenciosamente sin mostrar notificaciones
 * @private
 */
async function _silentRefreshData() {
    console.log('🔄 [SilentRefresh] Actualizando datos en segundo plano...');
    
    try {
        // Suprimir notificaciones durante la actualización silenciosa
        const wasSuppressed = window.__SUPPRESS_NOTIFICATIONS;
        window.__SUPPRESS_NOTIFICATIONS = true;
        
        const refreshPromises = [];
        
        // Recargar documentos
        if (typeof window.loadDocuments === 'function') {
            refreshPromises.push(
                window.loadDocuments().catch(err => {
                    console.warn('⚠️ Error recargando documentos:', err);
                })
            );
        }
        
        // Recargar categorías
        if (typeof window.loadCategories === 'function') {
            refreshPromises.push(
                window.loadCategories().catch(err => {
                    console.warn('⚠️ Error recargando categorías:', err);
                })
            );
        }
        
        await Promise.allSettled(refreshPromises);
        
        // Refrescar árbol de categorías
        if (typeof window.refreshCategoryTree === 'function') {
            try {
                window.refreshCategoryTree();
            } catch (e) {
                console.warn('Error refrescando árbol:', e);
            }
        }
        
        // Re-renderizar tabla
        if (typeof window.renderDocumentsTable === 'function') {
            try {
                window.renderDocumentsTable();
            } catch (e) {
                console.warn('Error renderizando tabla:', e);
            }
        }
        
        // Re-inicializar drag & drop
        if (typeof initializeDocumentDragDrop === 'function') {
            setTimeout(() => {
                initializeDocumentDragDrop();
            }, 200);
        }
        
        // Restaurar estado de supresión
        window.__SUPPRESS_NOTIFICATIONS = wasSuppressed;
        
        console.log('✅ [SilentRefresh] Datos actualizados');
        
    } catch (error) {
        console.error('❌ [SilentRefresh] Error:', error);
        window.__SUPPRESS_NOTIFICATIONS = false;
    }
}

/**
 * Configura funciones globales necesarias
 * @private
 */
function _setupGlobalFunctions() {
    console.log('🔧 Configurando funciones globales...');

    // Modal de eliminación múltiple
    window.bulkDeleteModal = bulkDeleteModal;
    window.bulkDeleteState = bulkDeleteState;

    // Funciones de debugging
    window.debugBulkDelete = () => bulkDeleteModal?.debug?.();
    window.testBulkDelete = () => bulkDeleteModal?.test?.();

    // Funciones de utilidad
    window.openBulkDelete = () => bulkDeleteModal?.open?.();
    window.closeBulkDelete = () => bulkDeleteModal?.close?.();

    // Modal de movimiento múltiple
    window.bulkMoveModal = bulkMoveModal;
    window.bulkMoveState = bulkMoveState;
    window.bulkMoveManager = bulkMoveManager;

    // Funciones de movimiento múltiple
    window.openBulkMove = () => bulkMoveModal?.open?.();
    window.closeBulkMove = () => bulkMoveModal?.close?.();
    window.toggleMoveSelectionMode = () => {
        if (bulkMoveState.isSelectionMode) {
            bulkMoveManager.disableMoveSelectionMode();
        } else {
            bulkMoveManager.enableMoveSelectionMode();
        }
    };
    window.executeBulkMove = () => bulkMoveModal?.executeMove?.();
    window.selectAllForMove = () => bulkMoveManager.selectAllVisible();
    window.deselectAllForMove = () => bulkMoveManager.deselectAll();

    // Exponer globalmente para que los onclick del HTML funcionen
    window.openCategoryModal = openCategoryModal;
    window.closeCategoryModal = closeCategoryModal;
    window.saveCategory = saveCategory;
    
    // Funciones de notificación
    window.showDocumentNotification = showDocumentNotification;
    
    // Funciones de movimiento de documentos (debug)
    window.getPendingMoves = getPendingMoves;
    window.cancelDocumentMove = cancelDocumentMove;
    
    // Funciones de actualización en tiempo real
    window.silentRefreshData = _silentRefreshData;
    window.updateCategoryCardCounts = _updateCategoryCardCounts;
    
    // Funciones de renderizado
    window.renderExpiredDocuments = renderExpiredDocuments;
    
    // Funciones de drag & drop
    window.reinitializeDragDrop = reinitializeDragDrop;
    window.initializeDocumentDragDrop = initializeDocumentDragDrop;

    console.log('✅ Funciones globales configuradas');
}

/**
 * Inicializa el panel de documentos vencidos
 * @private
 */
function _initExpiredDocumentsPanel() {
    const viewAllBtn = document.getElementById('viewAllExpiredBtn');
    const modeSelect = document.getElementById('expiredViewMode');

    if (modeSelect) {
        modeSelect.addEventListener('change', () => {
            try { 
                renderExpiredDocuments(); 
            } catch (e) { 
                console.error('Error re-renderizando panel vencidos:', e); 
            }
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
                const table = document.getElementById('documentosTableBody');
                if (table) table.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }

    // Renderizar panel inicial
    try {
        renderExpiredDocuments();
    } catch (e) {
        console.error('Error inicializando panel vencidos:', e);
    }
}

/**
 * Configura el observer para detectar cuando la pestaña de documentos está activa
 * @private
 */
function _setupTabObserver() {
    const documentosTab = document.getElementById('documentos');
    if (!documentosTab) return;

    const tabObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && 
                mutation.attributeName === 'class' &&
                documentosTab.classList.contains('active')) {
                console.log('🔄 Pestaña de documentos activada');
                
                // Refrescar datos y reinicializar
                setTimeout(async () => {
                    await _silentRefreshData();
                    
                    if (typeof initializeDocumentDragDrop === 'function') {
                        initializeDocumentDragDrop();
                    }
                }, 200);
            }
        });
    });
    
    tabObserver.observe(documentosTab, { 
        attributes: true, 
        attributeFilter: ['class'] 
    });
}

/**
 * Configura event listeners adicionales
 * @private
 */
function _setupAdditionalEventListeners() {
    // Botón de refrescar
    const refreshBtn = document.getElementById('refreshDocumentsBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.classList.add('spinning');
            await _silentRefreshData();
            setTimeout(() => refreshBtn.classList.remove('spinning'), 1000);
            
            if (typeof showAlert === 'function') {
                showAlert('Documentos actualizados', 'success');
            }
        });
    }

    // Botón de nueva carpeta
    const newFolderBtn = document.getElementById('newRootCategoryBtn');
    if (newFolderBtn) {
        newFolderBtn.addEventListener('click', () => {
            if (typeof openCategoryModal === 'function') {
                openCategoryModal();
            }
        });
    }

    // Tecla F5 para refrescar sin recargar la página
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F5' && document.getElementById('documentos')?.classList.contains('active')) {
            e.preventDefault();
            _silentRefreshData().then(() => {
                if (typeof showAlert === 'function') {
                    showAlert('Vista actualizada (F5)', 'info');
                }
            });
        }
    });
}

/**
 * Obtiene el ID de la categoría actual desde el estado de navegación
 * @returns {string|null}
 * @private
 */
function _getCurrentCategoryId() {
    if (window.categoryNavState && window.categoryNavState.stack.length > 0) {
        return window.categoryNavState.stack[window.categoryNavState.stack.length - 1]._id;
    }
    return null;
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

    // Exponer globalmente para que los onclick del HTML funcionen
    window.openCategoryModal = openCategoryModal;
    window.closeCategoryModal = closeCategoryModal;
    window.saveCategory = saveCategory;
    
    // Funciones de notificación
    window.showDocumentNotification = showDocumentNotification;
    
    // Funciones de movimiento de documentos (debug)
    window.getPendingMoves = getPendingMoves;
    window.cancelDocumentMove = cancelDocumentMove;

    console.log('✅ Funciones globales configuradas');
}

/**
 * Función de conveniencia para obtener todas las funciones exportadas.
 */
export function getAllDocumentosFunctions() {
    return {
        MultipleUploadState,
        bulkDeleteState,
        bulkMoveState,

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

        previewDocument,
        canPreviewDocument,
        showImagePreviewModal,
        showPDFPreviewModal,
        showTextPreviewModal,
        showOfficePreviewModal,
        canPreviewOfficeDocument,
        getOfficePreviewInfo,

        downloadDocument,
        downloadDocumentFromPreview,
        downloadDocumentSimple,
        downloadDocumentAlternative,
        debugDocumentDownload,
        testAllDownloads,
        testDownloadMethod,

        renderDocumentsTable,
        initializeTableFilters,
        applyFilters,
        loadFilterState,
        clearAllFilters,
        getFilteredDocumentStats,
        exportFilteredToCSV,

        bulkDeleteModal,
        bulkMoveModal,
        bulkMoveManager,

        openDocumentModal,
        closeDocumentModal,
        switchUploadMode,
        populateDocumentCategorySelect,
        populateMultipleCategorySelect,
        populateFileCategorySelect,
        populatePersonSelect,
        populateAllPersonSelects,

        updateMultipleUploadUI,

        deleteDocument,
        loadDocuments,
        debugMultipleUpload,
        testMultipleUploadWithMockFiles,

        initCategoryNavigation,
        openCategoryModal,
        closeCategoryModal,
        saveCategory,
        
        initializeDocumentMoveHandler,
        injectDocumentMoveStyles,
        removeDocumentMoveHandler,
        getPendingMoves,
        cancelDocumentMove,

        initializeDocumentosModule
    };
}

// Auto-inicializar cuando se carga la pestaña de documentos
document.addEventListener('DOMContentLoaded', () => {
    const documentosTab = document.getElementById('documentos');
    if (documentosTab && documentosTab.classList.contains('active')) {
        console.log('📁 Pestaña de documentos activa, inicializando...');
        setTimeout(() => {
            initializeDocumentosModule();
        }, 500);
    }

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

    if (documentosTab) {
        observer.observe(documentosTab, { attributes: true });
    }
});

// =============================================================================
// 🚨 HOTFIX v3: Abrir modal SIEMPRE al hacer clic en Mover Múltiple
// =============================================================================
(function() {
    console.log('🔧 Instalando HOTFIX v3 - Modal siempre se abre...');
    
    const setupMoveButton = () => {
        const btn = document.getElementById('bulkMoveTriggerBtn');
        if (!btn) {
            setTimeout(setupMoveButton, 500);
            return;
        }
        
        // Clonar para limpiar listeners
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
newBtn.addEventListener('click', async function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    console.group('🟢 MOVER MÚLTIPLE - ABRIENDO MODAL DIRECTO');
    
    // DESACTIVAR modo selección en la tabla (no es necesario)
    if (window.bulkDeleteState) {
        window.bulkDeleteState.isSelectionMode = false;
        if (window.bulkDeleteState.disableSelectionMode) {
            window.bulkDeleteState.disableSelectionMode();
        }
    }
    
    // Renderizar tabla SIN checkboxes
    if (typeof window.renderDocumentsTable === 'function') {
        window.renderDocumentsTable();
    }
    
    // Ocultar barra de selección
    const selectionBar = document.getElementById('selectionInfoBar');
    if (selectionBar) selectionBar.style.display = 'none';
    
    // ABRIR EL MODAL DIRECTAMENTE
    console.log('📦 Abriendo modal...');
    
    try {
        if (window.bulkMoveModal && typeof window.bulkMoveModal.open === 'function') {
            await window.bulkMoveModal.open();
            console.log('✅ Modal abierto');
        }
    } catch (err) {
        console.error('❌ Error:', err);
        if (typeof showAlert === 'function') {
            showAlert('Error al abrir el modal: ' + err.message, 'error');
        }
    }
    
    console.groupEnd();
});
        
        console.log('✅ HOTFIX v3 instalado - El modal se abrirá siempre');
    };
    
    setTimeout(setupMoveButton, 1000);
})();

export default initializeDocumentosModule;