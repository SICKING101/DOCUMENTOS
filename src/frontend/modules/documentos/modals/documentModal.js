import { DOM } from '../../../dom.js';
import { populateDocumentCategorySelect, populateMultipleCategorySelect } from './modalHelpers.js';

/**
 * Abre el modal para subir documentos (individual o múltiple).
 * Configura los selects, resetea formularios y prepara la interfaz.
 */
export function openDocumentModal() {
    console.group('📄 Abriendo modal de documento');
    
    // Resetear formularios
    DOM.documentForm.reset();
    DOM.fileInfo.style.display = 'none';
    DOM.uploadDocumentBtn.disabled = true;
    DOM.uploadMultipleDocumentsBtn.disabled = true;
    
    // Resetear estado
    window.appState.selectedFile = null;
    
    // Resetear estado de subida múltiple
    if (window.multipleUploadState) {
        window.multipleUploadState.reset();
    }
    
    // Resetear UI
    DOM.fileUploadContainer.classList.remove('upload__container--dragover');
    DOM.multipleFileUploadContainer.classList.remove('upload__container--dragover');
    
    // Configurar modo único por defecto
    switchUploadMode('single');
    
    // Poblar selects
    populateDocumentCategorySelect();
    populateMultipleCategorySelect();
    
    // Poblar personas en AMBOS selects
    if (typeof window.populatePersonSelect === 'function') {
        // Poblar para modo individual
        window.populatePersonSelect();
        
        // Poblar para modo múltiple usando el mismo método
        if (DOM.multipleDocumentPerson) {
            window.populatePersonSelect(DOM.multipleDocumentPerson);
        }
    }
    
    // Mostrar modal
    DOM.documentModal.style.display = 'flex';
    
    // Actualizar UI de subida múltiple si está disponible
    if (window.updateMultipleUploadUI) {
        window.updateMultipleUploadUI();
    }
    
    console.log('✅ Modal de documento abierto');
    console.groupEnd();
}

/**
 * Cierra el modal de documentos, con confirmación si hay subidas en progreso.
 */
export function closeDocumentModal() {
    console.log('❌ Cerrando modal de documento');
    DOM.documentModal.style.display = 'none';
    
    // Si está subiendo, preguntar
    if (window.multipleUploadState && window.multipleUploadState.isUploading) {
        if (confirm('Hay archivos subiendo. ¿Seguro que quieres cancelar?')) {
            if (window.cancelMultipleUpload) {
                window.cancelMultipleUpload();
            }
        } else {
            DOM.documentModal.style.display = 'flex';
            return;
        }
    }
}

/**
 * Cambia entre modo de subida individual y múltiple.
 * Actualiza la interfaz y el estado global.
 * @param {string} mode - 'single' para individual, 'multiple' para múltiple
 */
export function switchUploadMode(mode) {
    console.log(`🔄 Cambiando a modo: ${mode}`);
    
    // Actualizar tabs
    DOM.uploadTabs.forEach(tab => {
        if (tab.dataset.mode === mode) {
            tab.classList.add('upload__tab--active');
        } else {
            tab.classList.remove('upload__tab--active');
        }
    });
    
    // Mostrar/ocultar contenedores
    if (mode === 'single') {
        DOM.singleUploadContainer.classList.add('upload__mode--active');
        DOM.multipleUploadContainer.classList.remove('upload__mode--active');
        DOM.uploadDocumentBtn.style.display = 'flex';
        DOM.uploadMultipleDocumentsBtn.style.display = 'none';
    } else {
        DOM.singleUploadContainer.classList.remove('upload__mode--active');
        DOM.multipleUploadContainer.classList.add('upload__mode--active');
        DOM.uploadDocumentBtn.style.display = 'none';
        DOM.uploadMultipleDocumentsBtn.style.display = 'flex';
        
        // Actualizar UI de múltiple
        if (window.updateMultipleUploadUI) {
            window.updateMultipleUploadUI();
        }
    }
    
    // Actualizar estado
    window.appState.uploadMode = mode;
}