// =============================================================================
// src/frontend/modules/documentos/compatibility.js
// =============================================================================

import { api } from '../../services/api.js';           
import { showAlert, formatFileSize } from '../../utils.js'; 
import { updateTrashBadge } from '../papelera.js';
import { hasPermission, PERMISSIONS } from '../../permissions.js';

// Importar TODO desde progressManager.js en una sola línea
import { 
    updateOverallProgress,
    showUploadProgressContainer,
    hideUploadProgressContainer,
    cancelMultipleUpload as cancelUpload
} from './upload/progressManager.js';

// IMPORTANTE: Importar multipleUploadState desde uploadMultiple.js
import { multipleUploadState } from './upload/uploadMultiple.js';

/**
 * Modal de confirmación para eliminar documento
 */
function createDeleteConfirmationModal() {
    // Crear modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('role', 'dialog');
    
    modal.innerHTML = `
        <div class="modal__content modal__content--sm">
            <div class="modal__header">
                <h3 class="modal__title">Confirmar eliminación</h3>
                <button class="modal__close" aria-label="Cerrar modal">&times;</button>
            </div>
            
            <div class="modal__body">
                <div class="action-modal__content">
                    <div class="action-modal__icon action-modal__icon--warning">
                        <i class="fas fa-trash-alt"></i>
                    </div>
                    <p class="action-modal__message">
                        ¿Estás seguro de que deseas mover este documento a la papelera?
                    </p>
                    
                    <div class="delete-warning" style="margin-top: 1.5rem; padding: 1rem; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: var(--radius-md);">
                        <div style="display: flex; align-items: flex-start; gap: 0.75rem;">
                            <i class="fas fa-exclamation-triangle" style="color: var(--warning); font-size: 1.125rem; margin-top: 0.125rem;"></i>
                            <div>
                                <p style="margin: 0; font-size: 0.875rem; color: var(--text-secondary);">
                                    El documento se moverá a la papelera y podrá ser restaurado posteriormente.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="modal__footer modal__footer--centered">
                <button class="btn btn--secondary btn-cancel" type="button" style="min-width: 120px;">
                    <i class="fas fa-times"></i>
                    Cancelar
                </button>
                <button class="btn btn--danger btn-confirm" type="button" style="min-width: 120px;">
                    <i class="fas fa-trash-alt"></i>
                    Mover a Papelera
                </button>
            </div>
        </div>
    `;
    
    return modal;
}

/**
 * Obtiene información del documento para mostrar en el modal
 */
async function getDocumentInfo(documentId) {
    try {
        console.log('📋 Obteniendo información del documento:', documentId);
        
        const data = await api.call(`/documents/${documentId}`);
        
        if (data.success && data.document) {
            return {
                name: data.document.original_filename || data.document.filename || 'Documento sin nombre',
                size: formatFileSize(data.document.file_size || 0),
                date: data.document.created_at ? new Date(data.document.created_at).toLocaleDateString() : 'Fecha desconocida',
                type: data.document.file_type || 'Desconocido',
                icon: getFileIcon(data.document.file_type)
            };
        }
    } catch (error) {
        console.error('❌ Error obteniendo información del documento:', error);
    }
    
    // Valores por defecto
    return {
        name: 'Documento',
        size: 'Tamaño desconocido',
        date: 'Fecha desconocida',
        type: 'Desconocido',
        icon: 'fa-file'
    };
}

/**
 * Obtiene el icono apropiado según el tipo de archivo
 */
function getFileIcon(fileType) {
    if (!fileType) return 'fa-file';
    
    const type = fileType.toLowerCase();
    
    if (type.includes('pdf')) return 'fa-file-pdf';
    if (type.includes('word') || type.includes('doc')) return 'fa-file-word';
    if (type.includes('excel') || type.includes('xls')) return 'fa-file-excel';
    if (type.includes('powerpoint') || type.includes('ppt')) return 'fa-file-powerpoint';
    if (type.includes('image')) return 'fa-file-image';
    if (type.includes('zip') || type.includes('rar') || type.includes('tar') || type.includes('gz')) return 'fa-file-archive';
    if (type.includes('text') || type.includes('txt')) return 'fa-file-alt';
    if (type.includes('video')) return 'fa-file-video';
    if (type.includes('audio')) return 'fa-file-audio';
    
    return 'fa-file';
}

/**
 * Función de compatibilidad para eliminar documentos con modal.
 */
export async function deleteDocument(id) {
    console.log('🔧 deleteDocument llamada con ID:', id);

    if (!hasPermission(PERMISSIONS.DELETE_DOCUMENTS)) {
        showAlert('No tienes permisos para eliminar documentos', 'error');
        return;
    }
    
    // Crear y mostrar el modal
    const modal = createDeleteConfirmationModal();
    document.body.appendChild(modal);
    
    // Mostrar modal con animación
    modal.style.display = 'flex';
    requestAnimationFrame(() => {
        modal.setAttribute('open', '');
    });
    
    // Obtener información del documento
    const documentInfo = await getDocumentInfo(id);
    
    // Actualizar información del documento en el modal
    const nameElement = modal.querySelector('.document-name');
    const sizeElement = modal.querySelector('.document-size');
    const dateElement = modal.querySelector('.document-date');
    const iconElement = modal.querySelector('.document-icon i');
    
    if (nameElement) nameElement.textContent = documentInfo.name;
    if (sizeElement) sizeElement.textContent = documentInfo.size;
    if (dateElement) dateElement.textContent = documentInfo.date;
    if (iconElement) {
        iconElement.className = `fas ${documentInfo.icon}`;
    }
    
    // Configurar eventos
    let isProcessing = false;
    
    const closeModal = () => {
        modal.style.animation = 'modalOverlayFadeOut 0.3s ease-out';
        modal.querySelector('.modal__content').style.animation = 'modalContentSlideOut 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        
        setTimeout(() => {
            modal.remove();
        }, 300);
    };
    
    // Animaciones de salida
    const style = document.createElement('style');
    style.textContent = `
        @keyframes modalOverlayFadeOut {
            from { opacity: 1; backdrop-filter: blur(8px); }
            to { opacity: 0; backdrop-filter: blur(0px); }
        }
        
        @keyframes modalContentSlideOut {
            from { opacity: 1; transform: translateY(0) scale(1); }
            to { opacity: 0; transform: translateY(20px) scale(0.95); }
        }
    `;
    document.head.appendChild(style);
    
    // Botón de cerrar
    const closeButton = modal.querySelector('.modal__close');
    closeButton.addEventListener('click', closeModal);
    
    // Botón cancelar
    const cancelButton = modal.querySelector('.btn-cancel');
    cancelButton.addEventListener('click', closeModal);
    
    // Cerrar al hacer clic fuera del contenido
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // Cerrar con Escape
    const handleEscape = (e) => {
        if (e.key === 'Escape' && !isProcessing) {
            closeModal();
        }
    };
    document.addEventListener('keydown', handleEscape);
    
    // Botón confirmar
    const confirmButton = modal.querySelector('.btn-confirm');
    confirmButton.addEventListener('click', async () => {
        if (isProcessing) return;
        
        isProcessing = true;
        
        // Cambiar estado del botón
        const originalText = confirmButton.innerHTML;
        confirmButton.innerHTML = `
            <i class="fas fa-spinner fa-spin"></i>
            Procesando...
        `;
        confirmButton.disabled = true;
        cancelButton.disabled = true;
        
        try {
            console.log('🗑️ Moviendo documento a la papelera:', id);
            console.log('📡 Haciendo llamada DELETE a:', `/documents/${id}`);
            
            const data = await api.call(`/documents/${id}`, { method: 'DELETE' });
            
            console.log('📦 Respuesta del servidor:', data);
            
            if (data.success) {
                // Mostrar mensaje de éxito en el modal
                const modalBody = modal.querySelector('.modal__body');
                modalBody.innerHTML = `
                    <div class="action-modal__content">
                        <div class="action-modal__icon action-modal__icon--success">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <p class="action-modal__message">
                            Documento movido a la papelera exitosamente
                        </p>
                        <div class="success-details" style="margin-top: 1.5rem; padding: 1rem; background: var(--success-light); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: var(--radius-md);">
                            <div style="display: flex; align-items: center; gap: 0.75rem;">
                                <i class="fas fa-info-circle" style="color: var(--success);"></i>
                                <p style="margin: 0; font-size: 0.875rem; color: var(--text-secondary);">
                                    El documento ha sido movido a la papelera y puede ser restaurado cuando lo necesites.
                                </p>
                            </div>
                        </div>
                    </div>
                `;
                
                // Actualizar footer
                const modalFooter = modal.querySelector('.modal__footer');
                modalFooter.innerHTML = `
                    <button class="btn btn--primary btn-close-success" type="button" style="min-width: 120px;">
                        <i class="fas fa-check"></i>
                        Cerrar
                    </button>
                `;
                
                // Configurar botón de cerrar éxito
                const closeSuccessButton = modal.querySelector('.btn-close-success');
                closeSuccessButton.addEventListener('click', async () => {
                    closeModal();
                    
                    // Cargar documentos actualizados
                    if (window.refreshDocumentsView) {
                        await window.refreshDocumentsView();
                    } else if (window.loadDocuments) {
                        await window.loadDocuments();
                    }
                    
                    // Actualizar badge de papelera
                    if (updateTrashBadge) {
                        await updateTrashBadge();
                    }
                    
                    if (window.appState && window.appState.currentTab === 'dashboard' && window.loadDashboardData) {
                        await window.loadDashboardData();
                    }
                    
                    showAlert(data.message || 'Documento movido a la papelera', 'success');
                });
                
            } else {
                throw new Error(data.message);
            }
            
        } catch (error) {
            console.error('❌ Error moviendo documento a papelera:', error);
            
            // Mostrar mensaje de error en el modal
            const modalBody = modal.querySelector('.modal__body');
            modalBody.innerHTML = `
                <div class="action-modal__content">
                    <div class="action-modal__icon action-modal__icon--error">
                        <i class="fas fa-exclamation-circle"></i>
                    </div>
                    <p class="action-modal__message">
                        Error al mover documento a la papelera
                    </p>
                    <div class="error-details" style="margin-top: 1.5rem; padding: 1rem; background: var(--danger-light); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: var(--radius-md);">
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <i class="fas fa-exclamation-triangle" style="color: var(--danger);"></i>
                            <p style="margin: 0; font-size: 0.875rem; color: var(--text-secondary);">
                                ${error.message || 'Ocurrió un error inesperado. Por favor, inténtalo de nuevo.'}
                            </p>
                        </div>
                    </div>
                </div>
            `;
            
            // Actualizar footer
            const modalFooter = modal.querySelector('.modal__footer');
            modalFooter.innerHTML = `
                <button class="btn btn--secondary" onclick="location.reload()" style="min-width: 120px;">
                    <i class="fas fa-redo"></i>
                    Reintentar
                </button>
                <button class="btn btn--danger btn-close-error" type="button" style="min-width: 120px;">
                    <i class="fas fa-times"></i>
                    Cerrar
                </button>
            `;
            
            // Configurar botón de cerrar error
            const closeErrorButton = modal.querySelector('.btn-close-error');
            closeErrorButton.addEventListener('click', closeModal);
            
            // Re-enable cancel button
            cancelButton.disabled = false;
        } finally {
            // Limpiar evento Escape
            document.removeEventListener('keydown', handleEscape);
        }
    });
}

/**
 * Función de compatibilidad para cargar documentos.
 */
export async function loadDocuments() {
    try {
        console.log('📄 Cargando documentos...');
        
        const data = await api.call('/documents');
        
        if (data.success) {
            window.appState.documents = (data.documents || []).map(doc => ({
                ...doc,
                url_cloudinary: doc.url_cloudinary || doc.cloudinary_url
            }));
            
            // Renderizar tabla si la función está disponible
            if (window.renderDocumentsTable) {
                window.renderDocumentsTable();
            }

            // Renderizar panel de documentos vencidos si está disponible
            if (window.renderExpiredDocuments) {
                try {
                    window.renderExpiredDocuments();
                } catch (e) {
                    console.error('Error al renderizar documentos vencidos:', e);
                }
            }

            console.log(`✅ ${window.appState.documents.length} documentos cargados`);
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('❌ Error cargando documentos:', error);
        showAlert('Error al cargar documentos: ' + error.message, 'error');
    }
}

/**
 * Refresca la vista de Documentos (lista + filtros + categorías).
 * Útil después de subir/aprobar/rechazar/eliminar.
 */
export async function refreshDocumentsView({ reloadCategories = true, refreshFilters = true } = {}) {
    await loadDocuments();

    if (refreshFilters) {
        try {
            const filtersModule = await import('./table/tableFilters.js');
            if (typeof filtersModule.initializeTableFilters === 'function') {
                filtersModule.initializeTableFilters();
            }
        } catch (e) {
            console.warn('⚠️ No se pudieron refrescar los filtros de Documentos:', e);
        }
    }

    if (reloadCategories && typeof window !== 'undefined' && typeof window.loadCategories === 'function') {
        try {
            await window.loadCategories();
        } catch (e) {
            console.warn('⚠️ No se pudieron refrescar las categorías:', e);
        }
    }
}

/**
 * Diagnóstico de subida múltiple (compatibilidad).
 */
export function debugMultipleUpload() {
    console.group('🐛 DIAGNÓSTICO DE SUBIDA MÚLTIPLE (Compatibilidad)');
    
    if (!multipleUploadState) {
        console.error('❌ Estado de subida múltiple no disponible');
        console.groupEnd();
        return;
    }
    
    console.log('📊 Estado actual:', {
        modo: window.appState?.uploadMode || 'no definido',
        archivosSeleccionados: multipleUploadState.files.length,
        subiendo: multipleUploadState.isUploading,
        tamañoTotal: formatFileSize(multipleUploadState.totalSize)
    });
    
    console.log('📋 Archivos individuales:');
    multipleUploadState.files.forEach((fileObj, index) => {
        console.log(`${index + 1}. ${fileObj.file.name}`, {
            tamaño: formatFileSize(fileObj.file.size),
            estado: fileObj.status,
            progreso: fileObj.progress,
            error: fileObj.error
        });
    });
    
    // Estadísticas
    const stats = multipleUploadState.getStats();
    console.table({
        'Total Archivos': stats.total,
        'Pendientes': stats.pending,
        'Subiendo': stats.uploading,
        'Completados': stats.completed,
        'Fallidos': stats.failed,
        'Tamaño Total': formatFileSize(stats.totalSize),
        'Tamaño Subido': formatFileSize(stats.uploadedSize)
    });
    
    console.groupEnd();
    
    showAlert('Diagnóstico de subida múltiple completado. Revisa la consola.', 'info');
}

/**
 * Prueba la subida múltiple con archivos mock (compatibilidad).
 */
export function testMultipleUploadWithMockFiles() {
    console.group('🧪 TEST CON ARCHIVOS DE PRUEBA (Compatibilidad)');
    
    // Crear archivos de prueba
    const mockFiles = [];
    const fileNames = [
        'documento_prueba_1.pdf',
        'imagen_prueba_1.jpg',
        'texto_prueba_1.txt'
    ];
    
    fileNames.forEach((fileName, index) => {
        const blob = new Blob([`Contenido de prueba ${index + 1}`], { type: 'text/plain' });
        const file = new File([blob], fileName, {
            type: fileName.endsWith('.pdf') ? 'application/pdf' :
                  fileName.endsWith('.jpg') ? 'image/jpeg' :
                  'text/plain',
            lastModified: Date.now()
        });
        
        mockFiles.push(file);
    });
    
    console.log(`📁 ${mockFiles.length} archivos de prueba creados`);
    
    // Cambiar a modo múltiple si no está
    if (window.appState?.uploadMode !== 'multiple' && window.switchUploadMode) {
        window.switchUploadMode('multiple');
    }
    
    // Agregar archivos de prueba
    if (window.handleMultipleFiles) {
        window.handleMultipleFiles(mockFiles);
    }
    
    console.log('✅ Test configurado. Archivos listos para subir.');
    console.groupEnd();
    
    showAlert('Test de subida múltiple configurado. Revisa los archivos de prueba.', 'info');
}

/**
 * Función de compatibilidad para cancelar subida múltiple.
 */
export function cancelMultipleUpload() {
    console.log('⏹️ Cancelando subida múltiple (compatibilidad)...');
    cancelUpload();
}

/**
 * Función de compatibilidad para mostrar progreso de subida.
 */
export function showUploadProgress() {
    console.log('📊 Mostrando progreso de subida (compatibilidad)...');
    showUploadProgressContainer();
}

/**
 * Función de compatibilidad para ocultar progreso de subida.
 */
export function hideUploadProgress() {
    console.log('📊 Ocultando progreso de subida (compatibilidad)...');
    hideUploadProgressContainer();
}

/**
 * Función de compatibilidad para actualizar progreso general.
 */
export function updateUploadProgress() {
    console.log('📈 Actualizando progreso (compatibilidad)...');
    updateOverallProgress();
}

// =============================================================================
// Configuración global para compatibilidad
// =============================================================================

/**
 * Configura todas las funciones de compatibilidad globalmente.
 * Debe llamarse después de importar el módulo.
 */
export function setupCompatibilityGlobals() {
    console.log('🔧 Configurando funciones globales de compatibilidad...');
    
    // Solo configurar si window está disponible
    if (typeof window === 'undefined') return;
    
    // Asignar funciones esenciales
    window.deleteDocument = deleteDocument;
    window.loadDocuments = loadDocuments;
    window.refreshDocumentsView = refreshDocumentsView;
    window.debugMultipleUpload = debugMultipleUpload;
    window.testMultipleUploadWithMockFiles = testMultipleUploadWithMockFiles;
    window.cancelMultipleUpload = cancelMultipleUpload;
    window.showUploadProgress = showUploadProgress;
    window.hideUploadProgress = hideUploadProgress;
    window.updateUploadProgress = updateUploadProgress;
    
    // Agregar función de editar documento
    window.editDocument = async (documentId) => {
        if (!hasPermission(PERMISSIONS.EDIT_DOCUMENTS)) {
            showAlert('No tienes permisos para editar documentos', 'error');
            return;
        }
        const { openEditDocumentModal } = await import('./modals/editDocumentModal.js');
        return openEditDocumentModal(documentId);
    };

    // Aprobación/Rechazo (Revisor/Moderador/Admin)
    window.approveDocument = approveDocument;
    window.rejectDocument = rejectDocument;
    
    console.log('✅ Funciones globales de compatibilidad configuradas');
}

// =============================================================================
// Revisión/Aprobación
// =============================================================================

export async function approveDocument(documentId, comment = '') {
    if (!hasPermission(PERMISSIONS.APPROVE_DOCUMENTS)) {
        showAlert('No tienes permisos para aprobar documentos', 'error');
        return;
    }

    try {
        const response = await api.call(`/documents/${documentId}/approve`, {
            method: 'PATCH',
            body: { comment }
        });

        if (response?.success) {
            showAlert(response.message || 'Documento aprobado', 'success');
            if (typeof refreshDocumentsView === 'function') {
                await refreshDocumentsView();
            } else if (typeof loadDocuments === 'function') {
                await loadDocuments();
            }
        } else {
            showAlert(response?.message || 'No se pudo aprobar', 'error');
        }
    } catch (error) {
        console.error('Error aprobando documento:', error);
        showAlert('Error al aprobar documento', 'error');
    }
}

export async function rejectDocument(documentId, comment = '') {
    if (!hasPermission(PERMISSIONS.APPROVE_DOCUMENTS)) {
        showAlert('No tienes permisos para rechazar documentos', 'error');
        return;
    }

    try {
        const response = await api.call(`/documents/${documentId}/reject`, {
            method: 'PATCH',
            body: { comment }
        });

        if (response?.success) {
            showAlert(response.message || 'Documento rechazado', 'success');
            if (typeof refreshDocumentsView === 'function') {
                await refreshDocumentsView();
            } else if (typeof loadDocuments === 'function') {
                await loadDocuments();
            }
        } else {
            showAlert(response?.message || 'No se pudo rechazar', 'error');
        }
    } catch (error) {
        console.error('Error rechazando documento:', error);
        showAlert('Error al rechazar documento', 'error');
    }
}