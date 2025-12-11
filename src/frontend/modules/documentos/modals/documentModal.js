// =============================================================================
// src/frontend/modules/documentos/modals/documentModal.js
// =============================================================================

import { DOM } from '../../../dom.js';
import { showAlert } from '../../../utils.js';
import { handleUploadDocument } from '../upload/uploadSingle.js';
import { handleUploadMultipleDocuments, getMultipleUploadState } from '../upload/uploadMultiple.js';
import { 
    populateDocumentCategorySelect, 
    populateMultipleCategorySelect,
    populateAllPersonSelects 
} from './modalHelpers.js';

// Variables para trackear event listeners
let eventListenersInitialized = false;

/**
 * Abre el modal de documentos con la configuración inicial
 * @param {string} mode - 'single' para subida única, 'multiple' para múltiple
 */
export function openDocumentModal(mode = 'single') {
    console.group(`📂 openDocumentModal - Abriendo en modo: ${mode}`);
    
    try {
        // Mostrar modal usando CSS en lugar de showModal()
        DOM.documentModal.style.display = 'flex';
        document.body.classList.add('modal-open');
        
        // Poblar categorías
        console.log('📋 Poblando selects de categoría...');
        populateDocumentCategorySelect();
        populateMultipleCategorySelect();
        
        // Poblar personas
        console.log('👤 Poblando selects de personas...');
        populateAllPersonSelects().then(() => {
            console.log('✅ Personas cargadas para modal');
        });
        
        // Configurar modo inicial
        switchUploadMode(mode);
        
        // Si estamos en modo múltiple, actualizar estado con categoría del select
        if (mode === 'multiple' && DOM.multipleDocumentCategory) {
            const state = getMultipleUploadState();
            const currentCategory = DOM.multipleDocumentCategory.value;
            
            console.log(`🏷️ Modal abierto en modo múltiple, categoría del select: "${currentCategory}"`);
            
            if (currentCategory && currentCategory.trim() !== '') {
                console.log(`✅ Aplicando categoría "${currentCategory}" al estado`);
                state.setCommonCategory(currentCategory);
            }
        }
        
        // Actualizar UI de múltiples archivos
        if (typeof updateMultipleUploadUI === 'function') {
            console.log('🎨 Actualizando UI de múltiples archivos...');
            updateMultipleUploadUI();
        }
        
        // Configurar event listeners SOLO si no están ya configurados
        if (!eventListenersInitialized) {
            console.log('🔧 Configurando event listeners...');
            setupEventListeners();
            eventListenersInitialized = true;
        }
        
        console.log('✅ Modal abierto exitosamente');
        
    } catch (error) {
        console.error('❌ Error abriendo modal de documentos:', error);
        showAlert('Error al abrir el formulario de documentos', 'error');
    } finally {
        console.groupEnd();
    }
}

/**
 * Cierra el modal de documentos
 */
export function closeDocumentModal() {
    console.log('❌ closeDocumentModal - Cerrando modal');
    
    // Ocultar modal
    DOM.documentModal.style.display = 'none';
    document.body.classList.remove('modal-open');
    
    // Limpiar formulario
    if (DOM.documentForm) {
        DOM.documentForm.reset();
    }
    
    // Resetear input de archivo único
    if (DOM.fileInput) {
        DOM.fileInput.value = '';
    }
    
    // Resetear input de archivos múltiples
    if (DOM.multipleFileInput) {
        DOM.multipleFileInput.value = '';
    }
    
    // Ocultar información de archivo
    if (DOM.fileInfo) {
        DOM.fileInfo.style.display = 'none';
    }
    
    console.log('✅ Modal cerrado');
}

/**
 * Cambia entre modo de subida único y múltiple
 * @param {string} mode - 'single' o 'multiple'
 */
export function switchUploadMode(mode) {
    console.group(`🔄 switchUploadMode - Cambiando a modo: ${mode}`);
    
    // Actualizar tabs
    DOM.uploadTabs.forEach(tab => {
        if (tab.dataset.mode === mode) {
            tab.classList.add('upload__tab--active');
            console.log(`✅ Tab "${mode}" activado`);
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
        
        console.log('📤 Modo único activado');
    } else {
        DOM.singleUploadContainer.classList.remove('upload__mode--active');
        DOM.multipleUploadContainer.classList.add('upload__mode--active');
        
        DOM.uploadDocumentBtn.style.display = 'none';
        DOM.uploadMultipleDocumentsBtn.style.display = 'flex';
        
        console.log('📤📤 Modo múltiple activado');
        
        // Asegurar que las personas estén cargadas
        if (DOM.multipleDocumentPerson && DOM.multipleDocumentPerson.options.length <= 1) {
            console.log('👤 Poblando select de personas...');
            populateAllPersonSelects();
        }
        
        // Actualizar estado con categoría actual del select
        if (DOM.multipleDocumentCategory) {
            const state = getMultipleUploadState();
            const currentCategory = DOM.multipleDocumentCategory.value;
            
            console.log(`🏷️ Categoría actual en select: "${currentCategory}"`);
            
            if (currentCategory && currentCategory.trim() !== '') {
                console.log(`✅ Aplicando categoría al estado: "${currentCategory}"`);
                state.setCommonCategory(currentCategory);
            } else {
                console.warn('⚠️ Categoría vacía en el select');
            }
        }
        
        // Actualizar UI de archivos múltiples
        if (typeof updateMultipleUploadUI === 'function') {
            console.log('🎨 Actualizando UI...');
            updateMultipleUploadUI();
        }
    }
    
    console.groupEnd();
}

/**
 * Configura los event listeners del modal
 */
function setupEventListeners() {
    console.group('🔧 setupEventListeners - Configurando event listeners');
    
    // Limpiar event listeners previos para evitar duplicación
    removeEventListeners();
    
    // Tabs de modo de subida
    DOM.uploadTabs.forEach(tab => {
        tab.addEventListener('click', handleTabClick);
        console.log(`✅ Listener agregado a tab: ${tab.dataset.mode}`);
    });
    
    // Botón de subida única
    if (DOM.uploadDocumentBtn) {
        DOM.uploadDocumentBtn.addEventListener('click', handleUploadDocumentClick);
        console.log('✅ Listener agregado a botón de subida única');
    }
    
    // Botón de subida múltiple
    if (DOM.uploadMultipleDocumentsBtn) {
        DOM.uploadMultipleDocumentsBtn.addEventListener('click', handleUploadMultipleClick);
        console.log('✅ Listener agregado a botón de subida múltiple');
    }
    
    // Botón de cancelar
    if (DOM.cancelDocumentBtn) {
        DOM.cancelDocumentBtn.addEventListener('click', closeDocumentModal);
        console.log('✅ Listener agregado a botón de cancelar');
    }
    
    // Botón de explorar archivos (modo único)
    if (DOM.browseFilesBtn) {
        DOM.browseFilesBtn.addEventListener('click', handleBrowseFilesClick);
        console.log('✅ Listener agregado a botón de explorar archivos único');
    }
    
    // Input de archivo único
    if (DOM.fileInput) {
        DOM.fileInput.addEventListener('change', handleFileInputChange);
        console.log('✅ Listener agregado a input de archivo único');
    }
    
    // Botón de explorar múltiples archivos
    if (DOM.browseMultipleFilesBtn) {
        DOM.browseMultipleFilesBtn.addEventListener('click', handleBrowseMultipleClick);
        console.log('✅ Listener agregado a botón de explorar archivos múltiples');
    }
    
    // Input de archivos múltiples
    if (DOM.multipleFileInput) {
        DOM.multipleFileInput.addEventListener('change', handleMultipleFileInputChange);
        console.log('✅ Listener agregado a input de archivos múltiples');
    }
    
    // Toggle opciones avanzadas
    if (DOM.toggleAdvancedOptions) {
        DOM.toggleAdvancedOptions.addEventListener('click', handleToggleAdvancedOptions);
        console.log('✅ Listener agregado a toggle de opciones avanzadas');
    }
    
    // IMPORTANTE: Escuchar cambios en la categoría múltiple
    if (DOM.multipleDocumentCategory) {
        DOM.multipleDocumentCategory.addEventListener('change', handleMultipleCategoryChange);
        console.log('✅ Listener agregado a cambios en select de categoría múltiple');
    }
    
    console.log('🎯 Todos los event listeners configurados');
    console.groupEnd();
}

/**
 * Handler para cambios en la categoría múltiple
 */
function handleMultipleCategoryChange(e) {
    console.group(`🏷️ handleMultipleCategoryChange`);
    console.log(`📝 Categoría cambiada a: "${e.target.value}"`);
    
    const state = getMultipleUploadState();
    const category = e.target.value;
    
    if (category && category.trim() !== '') {
        console.log(`✅ Aplicando categoría "${category}" al estado`);
        state.setCommonCategory(category);
        
        // Verificar estado después del cambio
        console.log('📊 Estado después de cambiar categoría:');
        state.logState();
    } else {
        console.warn('⚠️ Categoría vacía seleccionada');
        state.commonCategory = '';
    }
    
    console.groupEnd();
}

/**
 * Remueve todos los event listeners para evitar duplicación
 */
function removeEventListeners() {
    console.log('🧹 removeEventListeners - Limpiando listeners previos');
    
    if (!DOM.uploadTabs) return;
    
    DOM.uploadTabs.forEach(tab => {
        tab.removeEventListener('click', handleTabClick);
    });
    
    if (DOM.uploadDocumentBtn) {
        DOM.uploadDocumentBtn.removeEventListener('click', handleUploadDocumentClick);
    }
    
    if (DOM.uploadMultipleDocumentsBtn) {
        DOM.uploadMultipleDocumentsBtn.removeEventListener('click', handleUploadMultipleClick);
    }
    
    if (DOM.cancelDocumentBtn) {
        DOM.cancelDocumentBtn.removeEventListener('click', closeDocumentModal);
    }
    
    if (DOM.browseFilesBtn) {
        DOM.browseFilesBtn.removeEventListener('click', handleBrowseFilesClick);
    }
    
    if (DOM.fileInput) {
        DOM.fileInput.removeEventListener('change', handleFileInputChange);
    }
    
    if (DOM.browseMultipleFilesBtn) {
        DOM.browseMultipleFilesBtn.removeEventListener('click', handleBrowseMultipleClick);
    }
    
    if (DOM.multipleFileInput) {
        DOM.multipleFileInput.removeEventListener('change', handleMultipleFileInputChange);
    }
    
    if (DOM.toggleAdvancedOptions) {
        DOM.toggleAdvancedOptions.removeEventListener('click', handleToggleAdvancedOptions);
    }
    
    if (DOM.multipleDocumentCategory) {
        DOM.multipleDocumentCategory.removeEventListener('change', handleMultipleCategoryChange);
    }
    
    console.log('✅ Listeners previos removidos');
}

/**
 * Handlers específicos para evitar duplicación
 */
function handleTabClick() {
    console.log(`📌 Tab clickeado: ${this.dataset.mode}`);
    switchUploadMode(this.dataset.mode);
}

function handleUploadDocumentClick(e) {
    e.preventDefault();
    console.log('📤 handleUploadDocumentClick - Iniciando subida individual...');
    handleUploadDocument();
}

async function handleUploadMultipleClick(e) {
    e.preventDefault();
    console.group('📤📤 handleUploadMultipleClick - Iniciando subida múltiple...');
    
    try {
        // Verificar estado antes de cerrar modal
        const state = getMultipleUploadState();
        console.log('📊 Estado ANTES de cerrar modal:');
        state.logState();
        
        // Cerrar modal primero
        closeDocumentModal();
        
        // Iniciar subida múltiple
        console.log('🚀 Llamando a handleUploadMultipleDocuments...');
        await handleUploadMultipleDocuments();
        
    } catch (error) {
        console.error('❌ Error en subida múltiple:', error);
        showAlert('Error en subida múltiple: ' + error.message, 'error');
        
        // Reabrir modal si hay error
        console.log('🔄 Reabriendo modal después de error...');
        openDocumentModal('multiple');
    } finally {
        console.groupEnd();
    }
}

function handleBrowseFilesClick() {
    console.log('📁 handleBrowseFilesClick - Abriendo selector de archivo único');
    DOM.fileInput.click();
}

function handleFileInputChange(e) {
    console.log('📁 handleFileInputChange - Archivo único seleccionado:', e.target.files[0]?.name);
    import('../upload/uploadSingle.js').then(module => {
        module.handleFileSelect(e);
    });
}

function handleBrowseMultipleClick() {
    console.log('📁📁 handleBrowseMultipleClick - Abriendo selector de archivos múltiples');
    DOM.multipleFileInput.click();
}

function handleMultipleFileInputChange(e) {
    console.log('📁📁 handleMultipleFileInputChange - Archivos múltiples seleccionados:', e.target.files.length);
    import('../upload/uploadMultiple.js').then(module => {
        module.handleMultipleFileSelect(e);
    });
}

function handleToggleAdvancedOptions() {
    console.log('⚙️ handleToggleAdvancedOptions - Toggleando opciones avanzadas');
    const advancedOptions = DOM.advancedOptions;
    if (advancedOptions.style.display === 'none' || advancedOptions.style.display === '') {
        advancedOptions.style.display = 'block';
        this.innerHTML = '<i class="fas fa-sliders-h"></i> Ocultar Opciones Avanzadas';
        console.log('✅ Opciones avanzadas mostradas');
    } else {
        advancedOptions.style.display = 'none';
        this.innerHTML = '<i class="fas fa-sliders-h"></i> Opciones Avanzadas';
        console.log('✅ Opciones avanzadas ocultadas');
    }
}

/**
 * Función de debugging para verificar estado actual
 */
export function debugModalState() {
    console.group('🐛 DEBUG MODAL STATE');
    
    const state = getMultipleUploadState();
    
    console.log('📊 Estado MultipleUploadState:');
    state.logState();
    
    console.log('🔍 Verificación de DOM elements:');
    console.log('- multipleDocumentCategory:', DOM.multipleDocumentCategory ? 'EXISTE' : 'NO EXISTE');
    console.log('- Valor actual:', DOM.multipleDocumentCategory ? DOM.multipleDocumentCategory.value : 'N/A');
    console.log('- multipleDocumentPerson:', DOM.multipleDocumentPerson ? 'EXISTE' : 'NO EXISTE');
    console.log('- uploadMultipleDocumentsBtn:', DOM.uploadMultipleDocumentsBtn ? 'EXISTE' : 'NO EXISTE');
    
    console.log('🏷️ Verificación de categorías:');
    const categoryCheck = state.checkCategories();
    console.table(categoryCheck.details);
    
    console.groupEnd();
}