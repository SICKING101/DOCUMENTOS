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

// Importar función de alerta mejorada
let showPageAlert;
let handleMultipleFileSelect;
let multipleUploadStateInstance;

// Cargar dinámicamente las funciones de uploadMultiple
async function loadUploadMultipleModule() {
    try {
        const module = await import('../upload/uploadMultiple.js');
        
        // Crear una versión local de showPageAlert
        showPageAlert = (message, type = 'info', duration = 3000) => {
            console.log(`📢 ALERTA DESDE MODAL [${type.toUpperCase()}]: ${message}`);
            showAlert(message, type, duration);
            
            // También crear alerta visual específica
            showModalAlert(message, type, duration);
        };
        
        // Obtener las funciones necesarias
        handleMultipleFileSelect = module.handleMultipleFileSelect;
        multipleUploadStateInstance = module.multipleUploadState || getMultipleUploadState();
        
        console.log('✅ Módulo uploadMultiple cargado correctamente');
        console.log(`📊 Archivos en estado actual: ${multipleUploadStateInstance.files ? multipleUploadStateInstance.files.length : 0}`);
        
    } catch (error) {
        console.error('Error cargando módulo uploadMultiple:', error);
        // Fallback
        showPageAlert = showAlert;
        handleMultipleFileSelect = () => console.error('Módulo uploadMultiple no cargado');
        multipleUploadStateInstance = getMultipleUploadState();
    }
}

/**
 * Muestra alerta específica para el modal
 */
function showModalAlert(message, type = 'info', duration = 3000) {
    const alertId = 'modal-flow-alert';
    const existingAlert = document.getElementById(alertId);
    
    if (existingAlert) {
        existingAlert.remove();
    }
    
    const alert = document.createElement('div');
    alert.id = alertId;
    alert.className = `alert alert--${type}`;
    alert.style.cssText = `
        background: var(--bg-primary);
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10050;
        min-width: 300px;
        max-width: 400px;
        box-shadow: var(--shadow-lg);
        animation: alertSlideIn 0.3s ease-out;
        font-size: 0.9rem;
        display: flex;
        align-items: center;
        gap: 10px;
    `;
    
    // Icono según tipo
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    alert.innerHTML = `
        <i class="fas ${icons[type] || icons.info}" style="font-size: 1.2rem;"></i>
        <div style="flex: 1;">
            <div style="font-weight: 600; margin-bottom: 2px;">Subida de documentos</div>
            <div>${message}</div>
        </div>
        <button class="alert-close-btn" style="background: none; border: none; cursor: pointer; color: inherit; opacity: 0.7; padding: 4px;">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    document.body.appendChild(alert);
    
    // Botón de cerrar
    const closeBtn = alert.querySelector('.alert-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            alert.remove();
        });
    }
    
    // Auto-ocultar
    if (duration > 0) {
        setTimeout(() => {
            if (alert.parentNode) {
                alert.style.animation = 'alertSlideOut 0.3s ease-out forwards';
                setTimeout(() => {
                    if (alert.parentNode) {
                        alert.remove();
                    }
                }, 300);
            }
        }, duration);
    }
}

/**
 * Abre el modal de documentos con la configuración inicial
 * @param {string} mode - 'single' para subida única, 'multiple' para múltiple
 */
export async function openDocumentModal(mode = 'single') {
    console.group(`📂 openDocumentModal - Abriendo en modo: ${mode}`);
    
    try {
        // Cargar módulo de uploadMultiple primero
        await loadUploadMultipleModule();
        
        // Mostrar modal usando CSS en lugar de showModal()
        DOM.documentModal.style.display = 'flex';
        document.body.classList.add('modal-open');
        
        // Poblar categorías
        console.log('📋 Poblando selects de categoría...');
        populateDocumentCategorySelect();
        populateMultipleCategorySelect();
        
        // Poblar personas
        console.log('👤 Poblando selects de personas...');
        await populateAllPersonSelects();
        console.log('✅ Personas cargadas para modal');
        
        // Configurar modo inicial
        switchUploadMode(mode);
        
        // Si estamos en modo múltiple, mostrar alerta informativa
        if (mode === 'multiple') {
            const state = getMultipleUploadState();
            const fileCount = state.files ? state.files.length : 0;
            
            let message = '📋 Modo múltiple activado. ';
            if (fileCount > 0) {
                message += `Tienes ${fileCount} archivo(s) listos. `;
            }
            message += 'Recuerda: 1) Selecciona categoría, 2) Configura opciones, 3) Agrega más archivos';
            
            showPageAlert(message, 'info', 4000);
            
            // Verificar estado inicial
            if (DOM.multipleDocumentCategory && DOM.multipleDocumentCategory.value) {
                console.log(`🏷️ Categoría inicial: "${DOM.multipleDocumentCategory.value}"`);
                state.setCommonCategory(DOM.multipleDocumentCategory.value);
            } else {
                showPageAlert('⚠️ Primero selecciona una categoría para habilitar las demás opciones', 'warning', 3000);
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
        showPageAlert('📤 Modo de subida única activado', 'info', 2000);
    } else {
        DOM.singleUploadContainer.classList.remove('upload__mode--active');
        DOM.multipleUploadContainer.classList.add('upload__mode--active');
        
        DOM.uploadDocumentBtn.style.display = 'none';
        DOM.uploadMultipleDocumentsBtn.style.display = 'flex';
        
        const state = getMultipleUploadState();
        const fileCount = state.files ? state.files.length : 0;
        
        console.log('📤📤 Modo múltiple activado');
        
        let message = '📤📤 Modo de subida múltiple activado. ';
        if (fileCount > 0) {
            message += `Tienes ${fileCount} archivo(s) listos. `;
        }
        message += 'Recuerda seleccionar categoría primero.';
        
        showPageAlert(message, 'info', 3000);
        
        // Asegurar que las personas estén cargadas
        if (DOM.multipleDocumentPerson && DOM.multipleDocumentPerson.options.length <= 1) {
            console.log('👤 Poblando select de personas...');
            populateAllPersonSelects();
        }
        
        // Actualizar estado con categoría actual del select
        if (DOM.multipleDocumentCategory) {
            const currentCategory = DOM.multipleDocumentCategory.value;
            
            console.log(`🏷️ Categoría actual en select: "${currentCategory}"`);
            
            if (currentCategory && currentCategory.trim() !== '') {
                console.log(`✅ Aplicando categoría al estado: "${currentCategory}"`);
                state.setCommonCategory(currentCategory);
                showPageAlert(`🏷️ Categoría "${currentCategory}" aplicada`, 'success', 2000);
            } else {
                console.warn('⚠️ Categoría vacía en el select');
                showPageAlert('⚠️ Selecciona una categoría para habilitar las demás opciones', 'warning', 3000);
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
 * Configura los event listeners del modal CON ALERTAS
 */
function setupEventListeners() {
    console.group('🔧 setupEventListeners - Configurando event listeners con alertas');
    
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
    
    // Botón de subida múltiple CON VALIDACIÓN
    if (DOM.uploadMultipleDocumentsBtn) {
        DOM.uploadMultipleDocumentsBtn.addEventListener('click', handleUploadMultipleClick);
        
        // También validar en clic si está deshabilitado
        DOM.uploadMultipleDocumentsBtn.addEventListener('click', (e) => {
            const state = getMultipleUploadState();
            const fileCount = state.files ? state.files.length : 0;
            
            if (DOM.uploadMultipleDocumentsBtn.disabled) {
                e.preventDefault();
                e.stopPropagation();
                
                if (fileCount === 0) {
                    showPageAlert('📁 Primero agrega archivos para subir', 'warning');
                } else if (!state.commonCategory || state.commonCategory.trim() === '') {
                    showPageAlert('⚠️ Primero selecciona una categoría', 'warning');
                } else {
                    showPageAlert('⏳ Por favor completa la configuración primero', 'info');
                }
            }
        });
        
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
    
    // Botón de explorar múltiples archivos CON VALIDACIÓN
    if (DOM.browseMultipleFilesBtn) {
        DOM.browseMultipleFilesBtn.addEventListener('click', handleBrowseMultipleClick);
        
        // Validar antes de abrir selector
        DOM.browseMultipleFilesBtn.addEventListener('click', (e) => {
            if (DOM.multipleFileInput && DOM.multipleFileInput.disabled) {
                e.preventDefault();
                e.stopPropagation();
                showPageAlert('⚠️ Primero selecciona una categoría para habilitar la selección de archivos', 'warning');
            }
        });
        
        console.log('✅ Listener agregado a botón de explorar archivos múltiples');
    }
    
    // Input de archivos múltiples - VERSIÓN CORREGIDA
    if (DOM.multipleFileInput) {
        // Prevenir selección cuando está deshabilitado
        DOM.multipleFileInput.addEventListener('click', (e) => {
            if (DOM.multipleFileInput.disabled) {
                e.preventDefault();
                e.stopPropagation();
                showPageAlert('⚠️ Primero selecciona una categoría para habilitar la selección de archivos', 'warning');
            }
        });
        
        // Handler para cambio de archivos - VERSIÓN MEJORADA
        DOM.multipleFileInput.addEventListener('change', async (e) => {
            await handleMultipleFileInputChange(e);
        });
        
        console.log('✅ Listener agregado a input de archivos múltiples');
    }
    
    // Toggle opciones avanzadas
    if (DOM.toggleAdvancedOptions) {
        DOM.toggleAdvancedOptions.addEventListener('click', handleToggleAdvancedOptions);
        console.log('✅ Listener agregado a toggle de opciones avanzadas');
    }
    
    // IMPORTANTE: Escuchar cambios en la categoría múltiple CON ALERTAS
    if (DOM.multipleDocumentCategory) {
        DOM.multipleDocumentCategory.addEventListener('change', handleMultipleCategoryChange);
        console.log('✅ Listener agregado a cambios en select de categoría múltiple');
    }
    
    // Escuchar cambios en persona múltiple
    if (DOM.multipleDocumentPerson) {
        DOM.multipleDocumentPerson.addEventListener('change', (e) => {
            console.log('👤 Persona múltiple cambiada:', e.target.value);
            if (e.target.value && e.target.value.trim() !== '') {
                const selectedText = e.target.options[e.target.selectedIndex].text;
                showPageAlert(`👤 Persona asignada: ${selectedText}`, 'info', 2000);
            }
        });
    }
    
    // Escuchar cambios en días de expiración
    if (DOM.multipleExpirationDays) {
        DOM.multipleExpirationDays.addEventListener('change', (e) => {
            console.log('📅 Días de expiración cambiados:', e.target.value);
            if (e.target.value && parseInt(e.target.value) > 0) {
                showPageAlert(`📅 Vencimiento configurado: ${e.target.value} días`, 'info', 2000);
            }
        });
    }
    
    console.log('🎯 Todos los event listeners configurados con alertas');
    console.groupEnd();
}

/**
 * Handler para cambios en la categoría múltiple CON ALERTAS
 */
function handleMultipleCategoryChange(e) {
    console.group(`🏷️ handleMultipleCategoryChange`);
    console.log(`📝 Categoría cambiada a: "${e.target.value}"`);
    
    const state = getMultipleUploadState();
    const category = e.target.value;
    
    if (category && category.trim() !== '') {
        console.log(`✅ Aplicando categoría "${category}" al estado`);
        state.setCommonCategory(category);
        
        // Mostrar alerta de éxito
        const optionText = e.target.options[e.target.selectedIndex].text;
        showPageAlert(`✅ Categoría seleccionada: "${optionText}"`, 'success', 2000);
        
        // Actualizar archivos existentes con la nueva categoría
        const fileCount = state.files ? state.files.length : 0;
        if (fileCount > 0) {
            let updatedCount = 0;
            state.files.forEach(fileObj => {
                if (!fileObj.customCategory || fileObj.customCategory.trim() === '') {
                    fileObj.customCategory = category;
                    updatedCount++;
                }
            });
            
            if (updatedCount > 0) {
                showPageAlert(`✅ Categoría aplicada a ${updatedCount} archivo(s) existente(s)`, 'success', 2000);
            }
        }
        
        // Verificar estado después del cambio
        console.log('📊 Estado después de cambiar categoría:');
        state.logState();
    } else {
        console.warn('⚠️ Categoría vacía seleccionada');
        state.commonCategory = '';
        showPageAlert('⚠️ Debes seleccionar una categoría para continuar', 'warning', 3000);
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
        const newInput = DOM.multipleFileInput.cloneNode(true);
        DOM.multipleFileInput.parentNode.replaceChild(newInput, DOM.multipleFileInput);
        // Actualizar referencia en DOM
        DOM.multipleFileInput = newInput;
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
 * Handlers específicos para evitar duplicación CON ALERTAS
 */
function handleTabClick() {
    const mode = this.dataset.mode;
    console.log(`📌 Tab clickeado: ${mode}`);
    
    if (mode === 'multiple') {
        const state = getMultipleUploadState();
        const fileCount = state.files ? state.files.length : 0;
        
        if (fileCount > 0 && (!state.commonCategory || state.commonCategory.trim() === '')) {
            showPageAlert(`⚠️ Tienes ${fileCount} archivo(s) pero no has seleccionado categoría. Por favor selecciona una categoría.`, 'warning');
        }
    }
    
    switchUploadMode(mode);
}

function handleUploadDocumentClick(e) {
    e.preventDefault();
    console.log('📤 handleUploadDocumentClick - Iniciando subida individual...');
    
    // Validación básica para modo único
    if (DOM.documentCategory && !DOM.documentCategory.value) {
        showPageAlert('⚠️ Selecciona una categoría para el documento', 'warning');
        return;
    }
    
    if (!DOM.fileInput || !DOM.fileInput.files[0]) {
        showPageAlert('📁 Selecciona un archivo para subir', 'warning');
        return;
    }
    
    handleUploadDocument();
}

async function handleUploadMultipleClick(e) {
    e.preventDefault();
    console.group('📤📤 handleUploadMultipleClick - Iniciando subida múltiple...');
    
    try {
        // Verificar estado antes de cerrar modal
        const state = getMultipleUploadState();
        const fileCount = state.files ? state.files.length : 0;
        
        console.log('📊 Estado ANTES de cerrar modal:');
        console.log(`• Archivos: ${fileCount}`);
        console.log(`• Categoría: ${state.commonCategory || 'NO SELECCIONADA'}`);
        state.logState();
        
        // Validaciones importantes
        if (fileCount === 0) {
            showPageAlert('📁 No hay archivos para subir. Agrega archivos primero.', 'warning');
            console.groupEnd();
            return;
        }
        
        if (!state.commonCategory || state.commonCategory.trim() === '') {
            showPageAlert('⚠️ No hay categoría seleccionada. Selecciona una categoría primero.', 'warning');
            console.groupEnd();
            return;
        }
        
        // Verificar que todos los archivos tengan categoría
        const filesWithoutCategory = state.files.filter(f => !f.customCategory || f.customCategory.trim() === '');
        if (filesWithoutCategory.length > 0) {
            showPageAlert(`⚠️ ${filesWithoutCategory.length} archivo(s) no tienen categoría. Configura la categoría primero.`, 'warning');
            console.groupEnd();
            return;
        }
        
        // Mostrar alerta confirmando
        showPageAlert(`🚀 Iniciando subida de ${fileCount} archivo(s)...`, 'info', 2000);
        
        // Cerrar modal primero
        closeDocumentModal();
        
        // Iniciar subida múltiple
        console.log('🚀 Llamando a handleUploadMultipleDocuments...');
        await handleUploadMultipleDocuments();
        
    } catch (error) {
        console.error('❌ Error en subida múltiple:', error);
        showPageAlert('❌ Error en subida múltiple: ' + error.message, 'error');
        
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
    
    if (!e.target.files[0]) {
        showPageAlert('⚠️ No se seleccionó ningún archivo', 'info');
        return;
    }
    
    showPageAlert(`📁 Archivo seleccionado: ${e.target.files[0].name}`, 'success', 2000);
    
    import('../upload/uploadSingle.js').then(module => {
        module.handleFileSelect(e);
    });
}

function handleBrowseMultipleClick() {
    console.log('📁📁 handleBrowseMultipleClick - Abriendo selector de archivos múltiples');
    
    // Validar que esté habilitado
    if (DOM.multipleFileInput && DOM.multipleFileInput.disabled) {
        showPageAlert('⚠️ Primero selecciona una categoría para habilitar la selección de archivos', 'warning');
        return;
    }
    
    DOM.multipleFileInput.click();
}

/**
 * Handler para cambio de archivos múltiples - VERSIÓN CORREGIDA DEFINITIVA
 */
async function handleMultipleFileInputChange(e) {
    console.log('📁📁 handleMultipleFileInputChange - Archivos múltiples seleccionados:', e.target.files.length);
    
    if (e.target.files.length === 0) {
        showPageAlert('⚠️ No se seleccionaron archivos', 'info');
        return;
    }
    
    // Validar que esté habilitado
    if (DOM.multipleFileInput && DOM.multipleFileInput.disabled) {
        showPageAlert('❌ Primero selecciona una categoría para habilitar la selección de archivos', 'warning');
        e.target.value = '';
        return;
    }
    
    try {
        // Obtener conteo ANTES de agregar
        const state = getMultipleUploadState();
        const filesBefore = state.files ? state.files.length : 0;
        const newFilesCount = e.target.files.length;
        
        console.log(`📊 Archivos antes de agregar: ${filesBefore}`);
        console.log(`📊 Nuevos archivos: ${newFilesCount}`);
        
        // Mostrar alerta INICIAL
        showPageAlert(`📁 Procesando ${newFilesCount} archivo(s)...`, 'info', 1500);
        
        // Primero procesar los archivos usando la función correcta
        if (handleMultipleFileSelect) {
            // Pasar el evento directamente
            const filesAdded = await handleMultipleFileSelect(e);
            console.log(`✅ handleMultipleFileSelect devolvió: ${filesAdded} archivo(s) agregado(s)`);
        } else {
            // Importar dinámicamente si no está cargada
            const module = await import('../upload/uploadMultiple.js');
            const filesAdded = await module.handleMultipleFileSelect(e);
            console.log(`✅ handleMultipleFileSelect devolvió: ${filesAdded} archivo(s) agregado(s)`);
        }
        
        // Esperar un momento para asegurar que el estado se actualice
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Obtener conteo DESPUÉS de agregar
        const filesAfter = state.files ? state.files.length : 0;
        const actuallyAdded = filesAfter - filesBefore;
        
        console.log(`📊 Archivos después de agregar: ${filesAfter}`);
        console.log(`📊 Archivos realmente agregados: ${actuallyAdded}`);
        
        // Mostrar alerta FINAL con el conteo CORRECTO
        if (actuallyAdded > 0) {
            if (filesAfter === actuallyAdded) {
                // Primera vez agregando archivos
                showPageAlert(`✅ ${actuallyAdded} archivo(s) seleccionado(s) y listos para subir`, 'success', 3000);
            } else {
                // Agregando a archivos existentes
                showPageAlert(`✅ ${actuallyAdded} archivo(s) agregado(s) - Total: ${filesAfter} archivo(s) listos`, 'success', 3000);
            }
        } else if (newFilesCount > 0 && actuallyAdded === 0) {
            // Posible duplicado o error
            showPageAlert(`ℹ️ Los ${newFilesCount} archivo(s) ya estaban en la lista o no pudieron ser agregados`, 'info', 3000);
        }
        
        // Actualizar UI si existe la función
        if (typeof updateMultipleUploadUI === 'function') {
            console.log('🎨 Actualizando UI después de agregar archivos...');
            updateMultipleUploadUI();
        }
        
    } catch (error) {
        console.error('❌ Error procesando archivos múltiples:', error);
        showPageAlert('❌ Error al procesar archivos: ' + error.message, 'error');
    } finally {
        // Resetear input para permitir seleccionar los mismos archivos otra vez
        e.target.value = '';
    }
}

function handleToggleAdvancedOptions() {
    console.log('⚙️ handleToggleAdvancedOptions - Toggleando opciones avanzadas');
    const advancedOptions = DOM.advancedOptions;
    if (advancedOptions.style.display === 'none' || advancedOptions.style.display === '') {
        advancedOptions.style.display = 'block';
        this.innerHTML = '<i class="fas fa-sliders-h"></i> Ocultar Opciones Avanzadas';
        showPageAlert('⚙️ Opciones avanzadas habilitadas', 'info', 2000);
        console.log('✅ Opciones avanzadas mostradas');
    } else {
        advancedOptions.style.display = 'none';
        this.innerHTML = '<i class="fas fa-sliders-h"></i> Opciones Avanzadas';
        console.log('✅ Opciones avanzadas ocultadas');
    }
}

/**
 * Función auxiliar para mostrar alertas de validación
 */
export function showValidationAlert(message, type = 'warning') {
    if (showPageAlert) {
        showPageAlert(message, type, 3000);
    } else {
        showAlert(message, type);
    }
}

/**
 * Validar si se puede proceder con la subida múltiple
 */
export function validateMultipleUpload() {
    const state = getMultipleUploadState();
    const fileCount = state.files ? state.files.length : 0;
    const errors = [];
    
    if (fileCount === 0) {
        errors.push('No hay archivos para subir');
    }
    
    if (!state.commonCategory || state.commonCategory.trim() === '') {
        errors.push('No hay categoría seleccionada');
    }
    
    // Verificar archivos sin categoría
    const filesWithoutCategory = state.files.filter(f => !f.customCategory || f.customCategory.trim() === '');
    if (filesWithoutCategory.length > 0) {
        errors.push(`${filesWithoutCategory.length} archivo(s) sin categoría`);
    }
    
    if (errors.length > 0) {
        const errorMessage = errors.join(', ');
        showValidationAlert(`⚠️ ${errorMessage}`, 'warning');
        return false;
    }
    
    return true;
}

/**
 * Obtiene el conteo actual de archivos en el estado
 */
export function getCurrentFileCount() {
    const state = getMultipleUploadState();
    return state.files ? state.files.length : 0;
}

/**
 * Función de debugging para verificar estado actual
 */
export function debugModalState() {
    console.group('🐛 DEBUG MODAL STATE');
    
    const state = getMultipleUploadState();
    const fileCount = state.files ? state.files.length : 0;
    
    console.log('📊 Estado MultipleUploadState:');
    state.logState();
    
    console.log('🔍 Verificación de DOM elements:');
    console.log('- multipleDocumentCategory:', DOM.multipleDocumentCategory ? 'EXISTE' : 'NO EXISTE');
    console.log('- Valor actual:', DOM.multipleDocumentCategory ? DOM.multipleDocumentCategory.value : 'N/A');
    console.log('- multipleDocumentPerson:', DOM.multipleDocumentPerson ? 'EXISTE' : 'NO EXISTE');
    console.log('- uploadMultipleDocumentsBtn:', DOM.uploadMultipleDocumentsBtn ? 'EXISTE' : 'NO EXISTE');
    console.log('- multipleFileInput.disabled:', DOM.multipleFileInput ? DOM.multipleFileInput.disabled : 'N/A');
    
    // Mostrar alerta con estado
    const message = `
        Estado actual:
        • Archivos: ${fileCount}
        • Categoría: ${state.commonCategory || 'NO SELECCIONADA'}
        • Persona: ${state.commonPersonId || 'NO CONFIGURADA'}
        • Expiración: ${state.expirationDays ? state.expirationDays + ' días' : 'NO CONFIGURADA'}
        • Input archivos habilitado: ${DOM.multipleFileInput ? !DOM.multipleFileInput.disabled : 'N/A'}
    `;
    
    if (showPageAlert) {
        showPageAlert(message, 'info', 5000);
    }
    
    console.log('🏷️ Verificación de categorías:');
    const categoryCheck = state.checkCategories();
    console.table(categoryCheck.details);
    
    console.groupEnd();
}