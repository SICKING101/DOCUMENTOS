// =============================================================================
// src/frontend/modules/documentos/upload/uploadMultiple.js
// =============================================================================

import { DOM } from '../../../dom.js';
import { CONFIG } from '../../../config.js';
import { showAlert, formatFileSize } from '../../../utils.js';
import { MultipleUploadState } from '../core/MultipleUploadState.js';
import { updateMultipleUploadUI } from '../index.js';
import { MULTIPLE_UPLOAD_CONFIG } from '../core/constants.js';

// Instancia global del estado de subida múltiple
export let multipleUploadState = null;

// Estado del flujo de configuración
const configFlowState = {
    categorySelected: false,
    canSelectPerson: false,
    canSelectExpiration: false,
    canAddDocuments: false
};

/**
 * Inicializa o obtiene el estado de subida múltiple
 */
export function getMultipleUploadState() {
    console.log('🔄 getMultipleUploadState llamado');
    if (!multipleUploadState) {
        console.log('🆕 Creando nueva instancia de MultipleUploadState');
        multipleUploadState = new MultipleUploadState();
        if (typeof window !== 'undefined') {
            window.multipleUploadState = multipleUploadState;
            console.log('🌐 Estado asignado a window.multipleUploadState');
        }
    } else {
        console.log('📋 Usando instancia existente de MultipleUploadState');
    }
    return multipleUploadState;
}

/**
 * Muestra alerta en la página (no solo en consola)
 */
function showPageAlert(message, type = 'info', duration = 3000) {
    console.log(`📢 ALERTA [${type.toUpperCase()}]: ${message}`);
    showAlert(message, type, duration);
}

/**
 * Actualiza el estado del flujo de configuración
 */
function updateConfigFlowState() {
    console.log('🔄 Actualizando estado del flujo de configuración');
    
    // Verificar que los elementos DOM existan
    if (!DOM.multipleDocumentCategory) {
        console.warn('⚠️ DOM.multipleDocumentCategory no existe aún');
        return;
    }
    
    // 1. Verificar si se seleccionó categoría
    const categoryValue = DOM.multipleDocumentCategory.value;
    configFlowState.categorySelected = categoryValue && categoryValue.trim() !== '';
    
    // 2. Verificar si se puede seleccionar persona (solo si hay categoría)
    configFlowState.canSelectPerson = configFlowState.categorySelected;
    
    // 3. Verificar si se puede seleccionar fecha (solo si hay categoría)
    configFlowState.canSelectExpiration = configFlowState.categorySelected;
    
    // 4. Verificar si se pueden agregar documentos (solo si hay categoría)
    configFlowState.canAddDocuments = configFlowState.categorySelected;
    
    console.log('📊 Estado del flujo:', configFlowState);
    
    // Mostrar alerta informativa
    if (configFlowState.categorySelected) {
        showPageAlert('✅ Categoría seleccionada. Ahora puedes configurar persona, fecha y agregar archivos.', 'success', 3000);
    }
    
    // Actualizar controles UI
    updateControlsState();
}

/**
 * Actualiza el estado de los controles UI según el flujo
 */
function updateControlsState() {
    console.log('🎛️ Actualizando estado de controles');
    
    // Control de categoría (siempre habilitado)
    if (DOM.multipleDocumentCategory) {
        DOM.multipleDocumentCategory.disabled = false;
        DOM.multipleDocumentCategory.style.opacity = '1';
        DOM.multipleDocumentCategory.style.cursor = 'pointer';
        console.log('✅ Categoría: Habilitado');
    }
    
    // Control de persona - BLOQUEADO si no hay categoría
    if (DOM.multipleDocumentPerson) {
        DOM.multipleDocumentPerson.disabled = !configFlowState.canSelectPerson;
        if (configFlowState.canSelectPerson) {
            DOM.multipleDocumentPerson.style.opacity = '1';
            DOM.multipleDocumentPerson.style.cursor = 'pointer';
            DOM.multipleDocumentPerson.title = 'Selecciona una persona (opcional)';
            console.log('✅ Persona: Habilitado');
        } else {
            DOM.multipleDocumentPerson.style.opacity = '0.5';
            DOM.multipleDocumentPerson.style.cursor = 'not-allowed';
            DOM.multipleDocumentPerson.title = 'Primero selecciona una categoría';
            console.log('❌ Persona: Deshabilitado');
        }
    }
    
    // Control de fecha de vencimiento - BLOQUEADO si no hay categoría
    if (DOM.multipleExpirationDays) {
        DOM.multipleExpirationDays.disabled = !configFlowState.canSelectExpiration;
        if (configFlowState.canSelectExpiration) {
            DOM.multipleExpirationDays.style.opacity = '1';
            DOM.multipleExpirationDays.style.cursor = 'pointer';
            DOM.multipleExpirationDays.title = 'Selecciona días de vencimiento (opcional)';
            console.log('✅ Fecha vencimiento: Habilitado');
        } else {
            DOM.multipleExpirationDays.style.opacity = '0.5';
            DOM.multipleExpirationDays.style.cursor = 'not-allowed';
            DOM.multipleExpirationDays.title = 'Primero selecciona una categoría';
            console.log('❌ Fecha vencimiento: Deshabilitado');
        }
    }
    
    // Input de archivos múltiples - BLOQUEADO si no hay categoría
    if (DOM.multipleFileInput) {
        DOM.multipleFileInput.disabled = !configFlowState.canAddDocuments;
        if (configFlowState.canAddDocuments) {
            DOM.multipleFileInput.style.opacity = '1';
            DOM.multipleFileInput.style.cursor = 'pointer';
            DOM.multipleFileInput.title = 'Haz clic para seleccionar archivos';
            console.log('✅ Input archivos: Habilitado');
        } else {
            DOM.multipleFileInput.style.opacity = '0.5';
            DOM.multipleFileInput.style.cursor = 'not-allowed';
            DOM.multipleFileInput.title = 'Primero selecciona una categoría';
            console.log('❌ Input archivos: Deshabilitado');
        }
    }
    
    // Botón de subida - BLOQUEADO si no hay categoría o archivos
    if (DOM.uploadMultipleDocumentsBtn) {
        const hasFiles = multipleUploadState && multipleUploadState.files.length > 0;
        DOM.uploadMultipleDocumentsBtn.disabled = !(configFlowState.canAddDocuments && hasFiles);
        
        if (DOM.uploadMultipleDocumentsBtn.disabled) {
            DOM.uploadMultipleDocumentsBtn.style.opacity = '0.5';
            DOM.uploadMultipleDocumentsBtn.style.cursor = 'not-allowed';
            DOM.uploadMultipleDocumentsBtn.title = hasFiles ? 'Selecciona categoría primero' : 'Agrega archivos primero';
            console.log('❌ Botón subida: Deshabilitado');
        } else {
            DOM.uploadMultipleDocumentsBtn.style.opacity = '1';
            DOM.uploadMultipleDocumentsBtn.style.cursor = 'pointer';
            DOM.uploadMultipleDocumentsBtn.title = 'Subir archivos';
            console.log('✅ Botón subida: Habilitado');
        }
    }
    
    // Mostrar mensaje informativo
    showConfigFlowMessage();
}

/**
 * Muestra mensajes informativos sobre el flujo de configuración
 */
function showConfigFlowMessage() {
    // Eliminar mensaje anterior si existe
    const existingMessage = document.getElementById('configFlowMessage');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Crear contenedor de mensaje
    const messageContainer = document.createElement('div');
    messageContainer.id = 'configFlowMessage';
    messageContainer.className = 'config-flow-message';
    messageContainer.style.margin = '10px 0';
    messageContainer.style.padding = '10px';
    messageContainer.style.borderRadius = '5px';
    messageContainer.style.backgroundColor = '#f8f9fa';
    messageContainer.style.border = '1px solid #dee2e6';
    
    let message = '';
    let type = 'info';
    
    if (!configFlowState.categorySelected) {
        message = '⚠️ <strong>PASO 1:</strong> Primero selecciona una <strong>categoría</strong> para habilitar las demás opciones.';
        type = 'warning';
        messageContainer.style.backgroundColor = '#fff3cd';
        messageContainer.style.borderColor = '#ffeaa7';
    } else if (!multipleUploadState || multipleUploadState.files.length === 0) {
        message = '✅ <strong>PASO 2:</strong> Categoría seleccionada. Ahora puedes <strong>agregar archivos</strong>.';
        type = 'success';
        messageContainer.style.backgroundColor = '#d4edda';
        messageContainer.style.borderColor = '#c3e6cb';
    } else {
        message = '🎯 <strong>PASO 3:</strong> ¡Listo! Puedes subir los archivos.';
        type = 'success';
        messageContainer.style.backgroundColor = '#d4edda';
        messageContainer.style.borderColor = '#c3e6cb';
    }
    
    messageContainer.innerHTML = `
        <div style="display: flex; align-items: center;">
            <i class="fas ${type === 'warning' ? 'fa-exclamation-triangle text-warning' : 
                          type === 'error' ? 'fa-times-circle text-danger' : 
                          type === 'success' ? 'fa-check-circle text-success' : 'fa-info-circle text-info'}" 
               style="margin-right: 10px; font-size: 1.2rem;"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Insertar después del contenedor de configuración múltiple
    const configContainer = document.querySelector('.multiple-upload-config');
    if (configContainer) {
        configContainer.appendChild(messageContainer);
    } else {
        // Si no existe el contenedor específico, ponerlo en un lugar visible
        const uploadSection = document.querySelector('.upload-section');
        if (uploadSection) {
            uploadSection.prepend(messageContainer);
        }
    }
}

/**
 * Valida el flujo de configuración antes de cualquier acción
 */
function validateConfigFlow(action = 'addFiles') {
    console.log(`🔍 Validando flujo para acción: ${action}`);
    
    const errors = [];
    
    if (!configFlowState.categorySelected) {
        errors.push('Debes seleccionar una categoría primero');
    }
    
    if (action === 'addFiles' && !configFlowState.canAddDocuments) {
        errors.push('No puedes agregar archivos sin antes configurar la categoría');
    }
    
    if (action === 'upload' && (!configFlowState.canAddDocuments || !multipleUploadState || multipleUploadState.files.length === 0)) {
        errors.push('No hay archivos para subir o la configuración no está completa');
    }
    
    if (errors.length > 0) {
        console.error('❌ Errores de validación:', errors);
        
        // Mostrar alerta en página
        const errorMessage = errors.join('\n• ');
        showPageAlert(`⚠️ ${errorMessage}`, 'warning');
        
        return {
            isValid: false,
            errors
        };
    }
    
    console.log('✅ Validación exitosa');
    return {
        isValid: true,
        errors: []
    };
}

/**
 * FIX CRÍTICO #1: Validación y aplicación de configuración común
 */
function applyCommonSettingsToAllFiles(state) {
    console.group('🔧 APLICANDO CONFIGURACIÓN COMÚN A TODOS LOS ARCHIVOS');
    
    // Validar que haya categoría seleccionada
    if (!configFlowState.categorySelected) {
        console.error('❌ No se puede aplicar configuración: categoría no seleccionada');
        showPageAlert('⚠️ Primero selecciona una categoría', 'warning');
        console.groupEnd();
        return;
    }
    
    // Obtener valores actuales del DOM
    const category = DOM.multipleDocumentCategory ? DOM.multipleDocumentCategory.value : '';
    const personValue = DOM.multipleDocumentPerson ? DOM.multipleDocumentPerson.value : '';
    const daysValue = DOM.multipleExpirationDays ? DOM.multipleExpirationDays.value : '';
    
    console.log('📊 VALORES DEL DOM:', {
        category,
        personValue,
        daysValue
    });
    
    // 1. Procesar categoría (OBLIGATORIA)
    if (category && category.trim() !== '') {
        state.commonCategory = category.trim();
        console.log(`✅ Categoría común establecida: "${state.commonCategory}"`);
        showPageAlert(`🏷️ Categoría aplicada: ${state.commonCategory}`, 'success', 2000);
    } else {
        console.error('❌ ERROR: Categoría vacía');
        showPageAlert('❌ La categoría es obligatoria. Por favor selecciona una.', 'error');
        console.groupEnd();
        return;
    }
    
    // 2. Procesar persona ID (OPCIONAL)
    let processedPersonId = '';
    if (personValue && personValue.trim() !== '' && 
        personValue !== 'null' && personValue !== 'undefined' && personValue !== '0') {
        processedPersonId = personValue.trim();
    }
    state.commonPersonId = processedPersonId;
    console.log(`✅ Persona común establecida: "${processedPersonId || '(cadena vacía)'}"`);
    
    // 3. Procesar días de expiración (OPCIONAL)
    if (daysValue && daysValue.trim() !== '' && !isNaN(parseInt(daysValue))) {
        state.expirationDays = parseInt(daysValue);
        console.log(`✅ Días de expiración establecidos: ${state.expirationDays}`);
    } else {
        state.expirationDays = null;
        console.log('ℹ️ Días de expiración no configurados');
    }
    
    // 4. Aplicar a todos los archivos pendientes
    let appliedCount = 0;
    state.files.forEach(fileObj => {
        if (fileObj.status === 'pending') {
            console.log(`📄 Aplicando a ${fileObj.file.name}:`);
            
            // Aplicar categoría (OBLIGATORIA)
            fileObj.customCategory = state.commonCategory;
            console.log(`   🏷️ Categoría aplicada: "${state.commonCategory}"`);
            
            // Aplicar persona si está configurada
            if (state.commonPersonId !== undefined) {
                fileObj.customPersonId = state.commonPersonId;
                console.log(`   👤 Persona aplicada: "${state.commonPersonId || '(vacía)'}"`);
            }
            
            // Aplicar fecha de expiración si está configurada
            if (state.expirationDays) {
                const expirationDate = state.calculateExpirationDate(state.expirationDays);
                fileObj.customExpirationDate = expirationDate;
                console.log(`   📅 Fecha aplicada: ${expirationDate}`);
            }
            
            appliedCount++;
        }
    });
    
    if (appliedCount > 0) {
        showPageAlert(`✅ Configuración aplicada a ${appliedCount} archivo(s)`, 'success', 2000);
    }
    
    console.log('📊 ESTADO DESPUÉS DE APLICAR:');
    state.logState();
    
    console.groupEnd();
}

/**
 * FIX CRÍTICO #2: Manejo de archivos con aplicación inmediata de configuración
 */
export function handleMultipleFiles(files) {
    console.group(`📁 handleMultipleFiles - Procesando ${files.length} archivo(s)`);
    
    // 1. Validar flujo de configuración
    const flowValidation = validateConfigFlow('addFiles');
    if (!flowValidation.isValid) {
        console.error('❌ Validación de flujo fallida');
        console.groupEnd();
        return 0;
    }
    
    const state = getMultipleUploadState();
    
    // 2. Validar cantidad máxima
    if (files.length > CONFIG.MAX_MULTIPLE_FILES) {
        showPageAlert(`❌ Máximo ${CONFIG.MAX_MULTIPLE_FILES} archivos permitidos. Seleccionados: ${files.length}`, 'error');
        console.groupEnd();
        return 0;
    }
    
    // 3. Agregar archivos al estado
    const addedCount = state.addFiles(files);
    
    if (addedCount > 0) {
        console.log(`✅ ${addedCount} archivo(s) agregado(s) al estado`);
        showPageAlert(`📁 ${addedCount} archivo(s) agregado(s) correctamente`, 'success');
    }
    
    // 4. Aplicar configuración común inmediatamente
    applyCommonSettingsToAllFiles(state);
    
    // 5. Actualizar UI
    if (typeof updateMultipleUploadUI === 'function') {
        console.log('🎨 Actualizando UI...');
        updateMultipleUploadUI();
    }
    
    // 6. Actualizar estado del botón de subida
    updateControlsState();
    
    console.groupEnd();
    return addedCount;
}

/**
 * Handler para el input de múltiples archivos.
 */
export function handleMultipleFileSelect(e) {
    console.log('📁 handleMultipleFileSelect - Archivos seleccionados:', e.target.files.length);
    
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
    
    const addedCount = handleMultipleFiles(Array.from(e.target.files));
    
    // Resetear input
    e.target.value = '';
}

/**
 * FIX CRÍTICO #3: Actualización de configuración común desde DOM
 */
function updateCommonSettingsFromDOM(force = false) {
    console.group('⚙️ UPDATE COMMON SETTINGS FROM DOM');
    
    const state = getMultipleUploadState();
    
    // Actualizar estado del flujo primero
    updateConfigFlowState();
    
    // Verificar que haya archivos
    if (state.files.length === 0) {
        console.warn('⚠️ No hay archivos para aplicar configuración');
        console.groupEnd();
        return;
    }
    
    console.log('📊 Estado antes de actualizar:');
    state.logState();
    
    // Aplicar configuración común a todos los archivos
    applyCommonSettingsToAllFiles(state);
    
    // Actualizar UI
    if (typeof updateMultipleUploadUI === 'function') {
        console.log('🎨 Actualizando UI después de cambios...');
        updateMultipleUploadUI();
    }
    
    // Actualizar controles
    updateControlsState();
    
    console.groupEnd();
}

/**
 * Ocultar todos los otros preloaders del sistema
 */
function hideAllOtherPreloaders() {
    console.log('🧹 Ocultando otros preloaders...');
    
    // Ocultar el preloader de progressManager (si existe)
    const progressContainer = document.getElementById('uploadProgressContainer');
    if (progressContainer) {
        console.log('✅ Ocultando uploadProgressContainer');
        progressContainer.style.display = 'none';
        // También removerlo del DOM para asegurar
        progressContainer.remove();
    }
    
    // Ocultar cualquier elemento con clase que contenga "preloader" o "progress"
    const otherPreloaders = document.querySelectorAll(
        '.upload-progress-container, .progress-container, [class*="preloader"], [class*="progress"]'
    );
    
    otherPreloaders.forEach(el => {
        if (el.id !== 'documentUploadPreloader' && 
            el.id !== 'uploadPreloaderContent' &&
            !el.closest('#documentUploadPreloader')) {
            console.log('⚠️ Ocultando elemento:', el.className || el.id);
            el.style.display = 'none';
        }
    });
    
    // Remover cualquier overlay existente
    const existingOverlays = document.querySelectorAll('.modal-overlay, .overlay');
    existingOverlays.forEach(overlay => {
        if (!overlay.closest('#documentUploadPreloader')) {
            overlay.remove();
        }
    });
}

/**
 * Muestra el preloader de subida (SOLO UNO)
 */
function showUploadPreloader(state) {
    console.log('🎬 Mostrando preloader de subida (ÚNICO)');
    
    // Ocultar cualquier otro preloader existente primero
    hideAllOtherPreloaders();
    
    // Verificar si ya existe un preloader
    if (document.getElementById('documentUploadPreloader')) {
        console.log('⚠️ Preloader ya existente, actualizando...');
        updateUploadPreloader(state);
        return;
    }
    
    const preloader = document.createElement('div');
    preloader.id = 'documentUploadPreloader';
    preloader.className = 'document-upload-preloader';
    
    preloader.innerHTML = `
        <div class="document-upload-preloader__header">
            <div class="document-upload-preloader__title">
                <i class="fas fa-upload"></i>
                <span>Subiendo archivos...</span>
            </div>
            <button class="btn btn--sm btn--outline-light" id="cancelUploadPreloader">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="document-upload-preloader__content" id="uploadPreloaderContent">
            <div class="preloader-initial">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Preparando archivos para subir...</p>
            </div>
        </div>
        <div class="document-upload-preloader__stats">
            <span id="uploadStatsCurrent">0</span> / 
            <span id="uploadStatsTotal">${state.files.length}</span> archivos
            <span id="uploadStatsSpeed" style="margin-left: auto; font-size: 0.75rem;"></span>
        </div>
        <div class="document-upload-preloader__progress">
            <div class="progress-bar">
                <div class="progress-fill" id="overallProgressFill" style="width: 0%"></div>
            </div>
            <div class="progress-percentage" id="overallProgressPercentage">0%</div>
        </div>
    `;
    
    // Agregar estilos inline para asegurar visibilidad
    preloader.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 500px;
        max-width: 90vw;
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        z-index: 99999;
        animation: fadeIn 0.3s ease;
        overflow: hidden;
        border: 1px solid #dee2e6;
    `;
    
    document.body.appendChild(preloader);
    
    // Configurar cancelación
    const cancelBtn = preloader.querySelector('#cancelUploadPreloader');
    cancelBtn.addEventListener('click', () => {
        console.log('⏹️ Cancelando subida desde preloader');
        hideUploadPreloader();
        
        // Cancelar todas las subidas en progreso
        state.files.forEach(fileObj => {
            if (fileObj.status === 'uploading') {
                fileObj.status = 'failed';
                fileObj.error = 'Subida cancelada por el usuario';
            }
        });
        
        // Actualizar UI
        updateMultipleUploadUI();
        updateUploadPreloader(state);
        
        showPageAlert('Subida cancelada por el usuario', 'warning');
    });
    
    // Inicializar contenido del preloader
    updateUploadPreloader(state);
}

/**
 * Actualiza el contenido del preloader
 */
function updateUploadPreloader(state) {
    const content = document.getElementById('uploadPreloaderContent');
    if (!content) return;
    
    // Calcular progreso total
    const completed = state.files.filter(f => f.status === 'completed').length;
    const total = state.files.length;
    const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Actualizar barra de progreso general
    const overallProgressFill = document.getElementById('overallProgressFill');
    const overallProgressPercentage = document.getElementById('overallProgressPercentage');
    if (overallProgressFill) overallProgressFill.style.width = `${progressPercent}%`;
    if (overallProgressPercentage) overallProgressPercentage.textContent = `${progressPercent}%`;
    
    // Filtrar archivos para mostrar
    const filesToShow = state.files.filter(f => 
        f.status === 'uploading' || f.status === 'completed' || f.status === 'failed'
    );
    
    if (filesToShow.length === 0) {
        content.innerHTML = `
            <div class="preloader-initial">
                <i class="fas fa-hourglass-half fa-spin"></i>
                <p>Preparando archivos para subir...</p>
            </div>
        `;
        return;
    }
    
    // Ordenar archivos: primero subiendo, luego completados, luego fallidos
    const sortedFiles = [...filesToShow].sort((a, b) => {
        const order = { 'uploading': 0, 'completed': 1, 'failed': 2 };
        return order[a.status] - order[b.status];
    });
    
    content.innerHTML = sortedFiles.map(fileObj => `
        <div class="document-upload-preloader__file file-status--${fileObj.status}">
            <div class="document-upload-preloader__file-icon">
                <i class="fas fa-file-${getFileIconClass(fileObj.file)}"></i>
            </div>
            <div class="document-upload-preloader__file-info">
                <div class="document-upload-preloader__file-name" title="${fileObj.file.name}">
                    ${truncateFileName(fileObj.file.name, 25)}
                </div>
                <div class="document-upload-preloader__file-status">
                    <span class="status-badge status-badge--${fileObj.status}">
                        ${getStatusText(fileObj.status)}
                    </span>
                    ${fileObj.status === 'uploading' ? `
                        <span class="progress-text">${fileObj.progress || 0}%</span>
                    ` : ''}
                </div>
                <div class="document-upload-preloader__file-progress">
                    <div class="document-upload-preloader__file-progress-bar" 
                         style="width: ${fileObj.progress || 0}%"></div>
                </div>
                ${fileObj.error ? `
                    <div class="document-upload-preloader__file-error">
                        <small><i class="fas fa-exclamation-circle"></i> ${fileObj.error}</small>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
    
    // Actualizar estadísticas
    updateUploadStats(state);
}

/**
 * Actualiza las estadísticas del preloader
 */
function updateUploadStats(state) {
    const current = document.getElementById('uploadStatsCurrent');
    const total = document.getElementById('uploadStatsTotal');
    const speed = document.getElementById('uploadStatsSpeed');
    
    if (!current || !total || !speed) return;
    
    const completed = state.files.filter(f => f.status === 'completed').length;
    const uploading = state.files.filter(f => f.status === 'uploading').length;
    const failed = state.files.filter(f => f.status === 'failed').length;
    
    current.textContent = completed;
    total.textContent = state.files.length;
    
    // Calcular velocidad promedio si hay archivos subiendo
    if (uploading > 0) {
        const uploadingFiles = state.files.filter(f => f.status === 'uploading');
        const avgProgress = uploadingFiles.reduce((sum, f) => sum + (f.progress || 0), 0) / uploadingFiles.length;
        speed.textContent = `${avgProgress.toFixed(0)}% promedio`;
    } else {
        speed.textContent = completed === state.files.length ? 'Completado ✓' : '';
    }
    
    // Actualizar título si todo está completado
    if (completed === state.files.length) {
        const title = document.querySelector('.document-upload-preloader__title span');
        if (title) {
            title.textContent = 'Subida completada';
            const icon = document.querySelector('.document-upload-preloader__title i');
            if (icon) {
                icon.className = 'fas fa-check-circle';
            }
        }
    }
}

/**
 * Oculta el preloader de subida
 */
function hideUploadPreloader() {
    console.log('🎬 Ocultando preloader de subida');
    
    const preloader = document.getElementById('documentUploadPreloader');
    if (preloader) {
        // Animación de salida
        preloader.style.animation = 'fadeOut 0.3s ease forwards';
        
        // Esperar animación y remover
        setTimeout(() => {
            if (preloader.parentNode) {
                preloader.parentNode.removeChild(preloader);
                console.log('✅ Preloader removido del DOM');
            }
        }, 300);
    }
    
    // También asegurar que no haya otros preloaders visibles
    hideAllOtherPreloaders();
}

/**
 * Obtiene la clase del icono según el tipo de archivo
 */
function getFileIconClass(file) {
    const extension = file.name.split('.').pop().toLowerCase();
    const iconMap = {
        'pdf': 'pdf',
        'doc': 'word',
        'docx': 'word',
        'xls': 'excel',
        'xlsx': 'excel',
        'ppt': 'powerpoint',
        'pptx': 'powerpoint',
        'jpg': 'image',
        'jpeg': 'image',
        'png': 'image',
        'gif': 'image',
        'txt': 'alt',
        'zip': 'archive',
        'rar': 'archive',
        'csv': 'file-csv'
    };
    return iconMap[extension] || 'alt';
}

/**
 * Trunca el nombre del archivo si es muy largo
 */
function truncateFileName(name, maxLength) {
    if (name.length <= maxLength) return name;
    const extension = name.split('.').pop();
    const nameWithoutExt = name.slice(0, name.length - extension.length - 1);
    const truncateLength = maxLength - extension.length - 4; // -4 para "..." y "."
    return nameWithoutExt.slice(0, Math.max(truncateLength, 1)) + '...' + extension;
}

/**
 * FIX CRÍTICO #5: Manejo principal de subida múltiple
 */
export async function handleUploadMultipleDocuments() {
    console.group('📤📤📤 HANDLE UPLOAD MULTIPLE DOCUMENTS');
    
    // 1. Validar flujo de configuración
    const flowValidation = validateConfigFlow('upload');
    if (!flowValidation.isValid) {
        console.error('❌ Validación de flujo fallida');
        console.groupEnd();
        return;
    }
    
    const state = getMultipleUploadState();
    
    // 2. Validar que haya archivos
    if (state.files.length === 0) {
        console.error('❌ ERROR: No hay archivos para subir');
        showPageAlert('⚠️ Primero selecciona los archivos que deseas subir.', 'warning');
        console.groupEnd();
        return;
    }
    
    // 3. Aplicar configuración del DOM una última vez
    console.log('\n🔄 APLICANDO CONFIGURACIÓN DEL DOM...');
    applyCommonSettingsToAllFiles(state);
    
    try {
        // 4. Preparar archivos para subida
        console.log('\n🔄 PREPARANDO ARCHIVOS PARA SUBIDA...');
        const preparedFiles = state.prepareFilesForUpload();
        
        console.log(`📦 ${preparedFiles.length} archivo(s) preparado(s) para subida`);
        showPageAlert(`📦 Preparando ${preparedFiles.length} archivo(s) para subida...`, 'info', 2000);
        
        // 5. Configurar estado de subida
        state.isUploading = true;
        
        // 6. MOSTRAR SOLO NUESTRO PRELOADER - NO LLAMAR A showUploadProgressContainer()
        console.log('🎬 Mostrando nuestro preloader personalizado (ÚNICO)...');
        showUploadPreloader(state);
        
        // 7. Iniciar subida según estrategia
        const strategy = DOM.uploadStrategy ? DOM.uploadStrategy.value : 'sequential';
        console.log(`\n🔄 INICIANDO SUBIDA CON ESTRATEGIA: ${strategy}`);
        showPageAlert(`🔄 Iniciando subida (${strategy}) de ${preparedFiles.length} archivo(s)...`, 'info', 2000);
        
        let result;
        switch(strategy) {
            case 'sequential':
                result = await uploadSequentially(state, preparedFiles);
                break;
            case 'parallel':
                result = await uploadInParallel(state, preparedFiles);
                break;
            case 'batch':
                result = await uploadInBatches(state, preparedFiles);
                break;
            default:
                result = await uploadSequentially(state, preparedFiles);
        }
        
        // 8. Mostrar resultados
        showUploadResults(result, state);
        
        // 9. Actualizar preloader final
        setTimeout(() => {
            updateUploadPreloader(state);
        }, 500);
        
        // 10. Recargar documentos si hubo éxito
        if (result.successCount > 0) {
            console.log('\n🔄 RECARGANDO DOCUMENTOS...');
            showPageAlert(`✅ ${result.successCount} archivo(s) subido(s) correctamente`, 'success');
            
            // Disparar evento de subida exitosa
            window.dispatchEvent(new CustomEvent('documentsUploaded', {
                detail: {
                    count: result.successCount,
                    files: result.uploadedFiles
                }
            }));
            
            // Recargar la lista de documentos
            if (window.loadDocuments) {
                await window.loadDocuments();
                console.log('✅ Lista de documentos recargada');
            }
            
            // Resetear estado
            console.log('\n🔄 RESETEANDO ESTADO DESPUÉS DE SUBIDA EXITOSA');
            state.reset();
            
            // Resetear controles
            resetConfigControls();
            
            // Actualizar UI
            if (typeof updateMultipleUploadUI === 'function') {
                updateMultipleUploadUI();
                console.log('✅ UI actualizada');
            }
            
            // Mostrar mensaje de éxito final
            if (result.successCount === preparedFiles.length) {
                showPageAlert(`🎉 ¡Éxito! Todos los ${result.successCount} archivos se subieron correctamente`, 'success', 5000);
            } else {
                showPageAlert(`✅ ${result.successCount} de ${preparedFiles.length} archivos se subieron correctamente`, 'success', 5000);
            }
        } else {
            showPageAlert('❌ No se pudo subir ningún archivo. Revisa los errores.', 'error');
        }
        
        console.log('\n✅ SUBIDA MÚLTIPLE COMPLETADA');
        console.groupEnd();
        
        // 11. Ocultar preloader después de 3 segundos
        setTimeout(() => {
            const allCompleted = state.files.every(f => 
                f.status === 'completed' || f.status === 'failed'
            );
            if (allCompleted) {
                console.log('🕒 Ocultando preloader después de completar...');
                hideUploadPreloader();
            }
        }, 3000);
        
    } catch (error) {
        console.error('❌ ERROR EN SUBIDA MÚLTIPLE:', error);
        console.error('Stack trace:', error.stack);
        
        // Mostrar alerta detallada
        let errorMessage = 'Error en subida múltiple: ';
        
        if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
            errorMessage += 'Error de conexión con el servidor. Verifica tu conexión a internet.';
        } else if (error.message.includes('timeout')) {
            errorMessage += 'La solicitud tardó demasiado. Intenta con menos archivos.';
        } else if (error.message.includes('413')) {
            errorMessage += 'Los archivos son demasiado grandes. Reduce el tamaño total.';
        } else {
            errorMessage += error.message;
        }
        
        showPageAlert(errorMessage, 'error');
        
        // Actualizar estado
        state.isUploading = false;
        
        // Ocultar preloader en caso de error
        setTimeout(() => {
            hideUploadPreloader();
        }, 1000);
        
    } finally {
        // Finalizar estado
        state.isUploading = false;
        
        console.log('🔚 FINALIZANDO PROCESO DE SUBIDA');
    }
}

/**
 * Resetea los controles de configuración
 */
function resetConfigControls() {
    console.log('🔄 Reseteando controles de configuración');
    
    // Resetear estado del flujo
    configFlowState.categorySelected = false;
    configFlowState.canSelectPerson = false;
    configFlowState.canSelectExpiration = false;
    configFlowState.canAddDocuments = false;
    
    // Resetear valores del DOM
    if (DOM.multipleDocumentCategory) {
        DOM.multipleDocumentCategory.value = '';
    }
    if (DOM.multipleDocumentPerson) {
        DOM.multipleDocumentPerson.value = '';
    }
    if (DOM.multipleExpirationDays) {
        DOM.multipleExpirationDays.value = '';
    }
    
    // Actualizar controles
    updateControlsState();
    
    showPageAlert('🔄 Configuración reseteada. Puedes comenzar un nuevo proceso.', 'info');
}

/**
 * Sube archivos de forma secuencial
 */
async function uploadSequentially(state, preparedFiles) {
    console.group('🔀 UPLOAD SEQUENTIALLY');
    console.log(`📤 Subiendo ${preparedFiles.length} archivos secuencialmente`);
    
    const results = {
        successCount: 0,
        failureCount: 0,
        totalTime: 0,
        uploadedFiles: []
    };
    
    const startTime = Date.now();
    
    for (let i = 0; i < preparedFiles.length; i++) {
        const preparedFile = preparedFiles[i];
        const fileObj = state.files.find(f => f.file.name === preparedFile.fileName);
        
        console.log(`\n📤 ARCHIVO ${i + 1}/${preparedFiles.length}: ${preparedFile.fileName}`);
        showPageAlert(`📤 Subiendo archivo ${i + 1}/${preparedFiles.length}: ${preparedFile.fileName}`, 'info', 1000);
        
        try {
            // Validación final
            if (!preparedFile.category || preparedFile.category.trim() === '') {
                console.error(`   ❌ ERROR: ${preparedFile.fileName} - NO TIENE CATEGORÍA`);
                
                if (fileObj) {
                    fileObj.status = 'failed';
                    fileObj.error = 'Falta categoría';
                    updateFileUI(fileObj.id, state);
                }
                
                results.failureCount++;
                continue;
            }
            
            // Actualizar estado
            if (fileObj) {
                fileObj.status = 'uploading';
                fileObj.progress = 0;
                updateFileUI(fileObj.id, state);
                updateUploadPreloader(state);
            }
            
            console.log('   🚀 Iniciando subida...');
            
            // Subir archivo
            const uploadSuccess = await uploadSingleFileWithProgress(preparedFile, fileObj, state);
            
            if (uploadSuccess) {
                results.successCount++;
                if (fileObj) {
                    fileObj.status = 'completed';
                    fileObj.progress = 100;
                }
                
                results.uploadedFiles.push({
                    name: preparedFile.fileName,
                    size: preparedFile.fileSize,
                    category: preparedFile.category,
                    personId: preparedFile.personId,
                    expirationDate: preparedFile.expirationDate,
                    description: preparedFile.description
                });
                
                console.log(`   ✅ ${preparedFile.fileName} - SUBIDA EXITOSA`);
                showPageAlert(`✅ ${preparedFile.fileName} - Subido correctamente`, 'success', 1000);
            } else {
                results.failureCount++;
                if (fileObj) {
                    fileObj.status = 'failed';
                    fileObj.error = 'Error en la subida';
                }
                
                console.error(`   ❌ ${preparedFile.fileName} - ERROR EN SUBIDA`);
                showPageAlert(`❌ ${preparedFile.fileName} - Error en subida`, 'error', 1000);
            }
            
            // Actualizar UI
            if (fileObj) {
                updateFileUI(fileObj.id, state);
            }
            updateUploadPreloader(state);
            
            // Pausa entre archivos
            if (i < preparedFiles.length - 1) {
                const delay = MULTIPLE_UPLOAD_CONFIG.DELAY_BETWEEN_FILES;
                console.log(`   ⏸️  Pausa de ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
            
        } catch (error) {
            console.error(`   ❌ ERROR en archivo ${preparedFile.fileName}:`, error);
            results.failureCount++;
            
            if (fileObj) {
                fileObj.status = 'failed';
                fileObj.error = error.message;
                updateFileUI(fileObj.id, state);
            }
            
            showPageAlert(`❌ ${preparedFile.fileName} - Error: ${error.message}`, 'error');
            updateUploadPreloader(state);
        }
    }
    
    results.totalTime = Date.now() - startTime;
    console.log(`\n⏱️  TIEMPO TOTAL: ${results.totalTime}ms`);
    console.log(`📊 RESULTADOS: ${results.successCount} exitosos, ${results.failureCount} fallidos`);
    
    console.groupEnd();
    return results;
}

/**
 * FIX CRÍTICO #6: Subida individual de archivo con validación extrema
 */
async function uploadSingleFileWithProgress(preparedFile, fileObj, state) {
    return new Promise(async (resolve, reject) => {
        console.group(`📤 UPLOAD SINGLE FILE: ${preparedFile.fileName}`);
        
        try {
            // Validación final EXTREMA
            if (!preparedFile.category || preparedFile.category.trim() === '') {
                console.error('❌ ERROR: Categoría VACÍA - ABORTANDO');
                showPageAlert(`❌ ${preparedFile.fileName} - Error: Categoría no definida`, 'error');
                if (fileObj) {
                    fileObj.error = 'Categoría no definida';
                }
                console.groupEnd();
                resolve(false);
                return;
            }
            
            // Preparar FormData
            const formData = new FormData();
            
            // 1. Archivo
            formData.append('file', preparedFile.file);
            
            // 2. Descripción
            formData.append('descripcion', preparedFile.description || '');
            
            // 3. Categoría (OBLIGATORIA)
            formData.append('categoria', preparedFile.category);
            console.log(`   ✅ Categoría enviada: "${preparedFile.category}"`);
            
            // 4. Persona ID (manejo correcto de valores vacíos)
            let personaIdValue = '';
            if (preparedFile.personId && 
                preparedFile.personId.trim() !== '' && 
                preparedFile.personId !== 'null' && 
                preparedFile.personId !== 'undefined') {
                personaIdValue = preparedFile.personId.trim();
            }
            formData.append('persona_id', personaIdValue);
            console.log(`   👤 Persona ID enviada: "${personaIdValue || '(cadena vacía)'}"`);
            
            // 5. Fecha de vencimiento (manejo correcto)
            let fechaVencimientoValue = '';
            if (preparedFile.expirationDate && 
                preparedFile.expirationDate !== 'null' && 
                preparedFile.expirationDate !== 'undefined') {
                try {
                    const dateObj = new Date(preparedFile.expirationDate);
                    if (!isNaN(dateObj.getTime())) {
                        fechaVencimientoValue = dateObj.toISOString().split('T')[0];
                    }
                } catch (error) {
                    console.log('   ⚠️ Error parseando fecha:', error);
                }
            }
            
            if (fechaVencimientoValue) {
                formData.append('fecha_vencimiento', fechaVencimientoValue);
                console.log(`   📅 Fecha vencimiento enviada: ${fechaVencimientoValue}`);
            } else {
                formData.append('fecha_vencimiento', '');
                console.log('   📅 Fecha vencimiento: NO enviada (vacía/sin fecha)');
            }
            
            // Crear XMLHttpRequest
            const xhr = new XMLHttpRequest();
            
            // Configurar progreso
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable && fileObj) {
                    const percentComplete = Math.round((e.loaded / e.total) * 100);
                    fileObj.progress = percentComplete;
                    updateFileUI(fileObj.id, state);
                    updateUploadPreloader(state);
                    
                    if (CONFIG.DEBUG.LOG_UPLOAD_PROGRESS) {
                        console.log(`📈 ${preparedFile.fileName}: ${percentComplete}%`);
                    }
                }
            });
            
            xhr.addEventListener('load', () => {
                console.log(`📥 RESPUESTA - HTTP ${xhr.status}: ${xhr.statusText}`);
                
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        
                        if (response.success) {
                            console.log(`✅ ${preparedFile.fileName} - SUBIDA EXITOSA`);
                            showPageAlert(`✅ ${preparedFile.fileName} - Subido exitosamente`, 'success', 1000);
                            resolve(true);
                        } else {
                            console.error(`❌ ${preparedFile.fileName} - Error del servidor:`, response.message);
                            showPageAlert(`❌ ${preparedFile.fileName} - Error del servidor: ${response.message}`, 'error');
                            
                            if (fileObj) {
                                fileObj.error = response.message || 'Error del servidor';
                            }
                            resolve(false);
                        }
                    } catch (parseError) {
                        console.error(`❌ ${preparedFile.fileName} - Error parseando respuesta:`, parseError);
                        showPageAlert(`❌ ${preparedFile.fileName} - Error en la respuesta del servidor`, 'error');
                        
                        if (fileObj) {
                            fileObj.error = 'Error en la respuesta';
                        }
                        resolve(false);
                    }
                } else {
                    console.error(`❌ ${preparedFile.fileName} - HTTP ${xhr.status}`);
                    showPageAlert(`❌ ${preparedFile.fileName} - Error HTTP ${xhr.status}`, 'error');
                    
                    if (fileObj) {
                        fileObj.error = `Error HTTP ${xhr.status}`;
                    }
                    
                    resolve(false);
                }
                
                console.groupEnd();
            });
            
            xhr.addEventListener('error', () => {
                console.error(`❌ ${preparedFile.fileName} - Error de red`);
                showPageAlert(`❌ ${preparedFile.fileName} - Error de conexión de red`, 'error');
                
                if (fileObj) {
                    fileObj.error = 'Error de conexión';
                }
                
                console.groupEnd();
                resolve(false);
            });
            
            xhr.addEventListener('abort', () => {
                console.warn(`⚠️ ${preparedFile.fileName} - Cancelado`);
                showPageAlert(`⚠️ ${preparedFile.fileName} - Subida cancelada`, 'warning');
                
                if (fileObj) {
                    fileObj.error = 'Cancelado por el usuario';
                }
                
                console.groupEnd();
                resolve(false);
            });
            
            // Enviar petición
            const url = `${CONFIG.API_BASE_URL}/documents`;
            console.log(`🚀 Enviando POST a: ${url}`);
            
            xhr.open('POST', url);
            xhr.setRequestHeader('Accept', 'application/json');
            
            // Enviar
            xhr.send(formData);
            
        } catch (error) {
            console.error(`❌ Error en ${preparedFile.fileName}:`, error);
            showPageAlert(`❌ ${preparedFile.fileName} - Error: ${error.message}`, 'error');
            
            if (fileObj) {
                fileObj.error = error.message;
            }
            
            console.groupEnd();
            resolve(false);
        }
    });
}

/**
 * Sube archivos en paralelo
 */
async function uploadInParallel(state, preparedFiles) {
    console.group('⚡ UPLOAD IN PARALLEL');
    console.log('⚡ Subida paralela iniciada');
    showPageAlert('⚡ Iniciando subida paralela...', 'info', 2000);
    
    const maxConcurrent = MULTIPLE_UPLOAD_CONFIG.MAX_CONCURRENT_UPLOADS;
    const results = {
        successCount: 0,
        failureCount: 0,
        totalTime: 0,
        uploadedFiles: []
    };
    
    const startTime = Date.now();
    
    const uploadPromises = [];
    const activeUploads = new Set();
    
    for (let i = 0; i < preparedFiles.length; i++) {
        const preparedFile = preparedFiles[i];
        const fileObj = state.files.find(f => f.file.name === preparedFile.fileName);
        
        // Validación
        if (!preparedFile.category || preparedFile.category.trim() === '') {
            console.error(`❌ ERROR: ${preparedFile.fileName} - NO TIENE CATEGORÍA`);
            showPageAlert(`❌ ${preparedFile.fileName} - Error: Falta categoría`, 'error');
            
            if (fileObj) {
                fileObj.status = 'failed';
                fileObj.error = 'Falta categoría';
                updateFileUI(fileObj.id, state);
            }
            
            results.failureCount++;
            continue;
        }
        
        // Esperar slot
        while (activeUploads.size >= maxConcurrent) {
            console.log(`   ⏳ Esperando... (${activeUploads.size}/${maxConcurrent})`);
            await new Promise(resolve => setTimeout(resolve, 100));
            updateUploadPreloader(state);
        }
        
        // Iniciar subida
        if (fileObj) {
            fileObj.status = 'uploading';
            fileObj.progress = 0;
            updateFileUI(fileObj.id, state);
            updateUploadPreloader(state);
            activeUploads.add(fileObj.id);
        }
        
        console.log(`🚀 Iniciando subida paralela: ${preparedFile.fileName}`);
        
        const uploadPromise = uploadSingleFileWithProgress(preparedFile, fileObj, state)
            .then(success => {
                if (success) {
                    results.successCount++;
                    if (fileObj) {
                        fileObj.status = 'completed';
                        fileObj.progress = 100;
                    }
                    results.uploadedFiles.push({
                        name: preparedFile.fileName,
                        size: preparedFile.fileSize,
                        category: preparedFile.category,
                        personId: preparedFile.personId,
                        expirationDate: preparedFile.expirationDate
                    });
                    console.log(`✅ ${preparedFile.fileName} - COMPLETADO`);
                } else {
                    results.failureCount++;
                    if (fileObj) {
                        fileObj.status = 'failed';
                        fileObj.error = 'Error en subida';
                    }
                    console.error(`❌ ${preparedFile.fileName} - FALLADO`);
                }
                
                if (fileObj) {
                    updateFileUI(fileObj.id, state);
                    activeUploads.delete(fileObj.id);
                }
                updateUploadPreloader(state);
                return success;
            })
            .catch(error => {
                console.error(`❌ Error en ${preparedFile.fileName}:`, error);
                results.failureCount++;
                if (fileObj) {
                    fileObj.status = 'failed';
                    fileObj.error = error.message;
                    updateFileUI(fileObj.id, state);
                    activeUploads.delete(fileObj.id);
                }
                updateUploadPreloader(state);
                return false;
            });
        
        uploadPromises.push(uploadPromise);
    }
    
    // Esperar todas las subidas
    console.log(`⏳ Esperando ${uploadPromises.length} subidas...`);
    showPageAlert(`⏳ Esperando ${uploadPromises.length} subidas paralelas...`, 'info', 2000);
    await Promise.all(uploadPromises);
    
    results.totalTime = Date.now() - startTime;
    console.log(`⏱️  Tiempo total: ${results.totalTime}ms`);
    console.log(`📊 Resultados: ${results.successCount} exitosos, ${results.failureCount} fallidos`);
    
    console.groupEnd();
    return results;
}

/**
 * Sube archivos por lotes
 */
async function uploadInBatches(state, preparedFiles) {
    console.group('📦 UPLOAD IN BATCHES');
    console.log('📦 Subida por lotes iniciada');
    showPageAlert('📦 Iniciando subida por lotes...', 'info', 2000);
    
    const batchSize = MULTIPLE_UPLOAD_CONFIG.BATCH_SIZE;
    const delayBetween = MULTIPLE_UPLOAD_CONFIG.DELAY_BETWEEN_BATCHES;
    const results = {
        successCount: 0,
        failureCount: 0,
        totalTime: 0,
        uploadedFiles: []
    };
    
    const startTime = Date.now();
    
    // Crear lotes
    const batches = [];
    for (let i = 0; i < preparedFiles.length; i += batchSize) {
        batches.push(preparedFiles.slice(i, i + batchSize));
    }
    
    console.log(`📊 ${batches.length} lotes creados`);
    
    // Procesar cada lote
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`\n📤 PROCESANDO LOTE ${batchIndex + 1}/${batches.length}`);
        showPageAlert(`📤 Procesando lote ${batchIndex + 1}/${batches.length}...`, 'info', 2000);
        
        // Subir lote en paralelo
        const batchPromises = batch.map(preparedFile => {
            const fileObj = state.files.find(f => f.file.name === preparedFile.fileName);
            
            if (fileObj) {
                fileObj.status = 'uploading';
                fileObj.progress = 0;
                updateFileUI(fileObj.id, state);
                updateUploadPreloader(state);
            }
            
            return uploadSingleFileWithProgress(preparedFile, fileObj, state)
                .then(success => {
                    if (success) {
                        results.successCount++;
                        if (fileObj) {
                            fileObj.status = 'completed';
                            fileObj.progress = 100;
                        }
                        results.uploadedFiles.push({
                            name: preparedFile.fileName,
                            size: preparedFile.fileSize,
                            category: preparedFile.category,
                            personId: preparedFile.personId,
                            expirationDate: preparedFile.expirationDate
                        });
                        console.log(`✅ ${preparedFile.fileName} - Completado`);
                    } else {
                        results.failureCount++;
                        if (fileObj) {
                            fileObj.status = 'failed';
                            fileObj.error = 'Error en subida';
                        }
                        console.error(`❌ ${preparedFile.fileName} - Fallado`);
                    }
                    
                    if (fileObj) {
                        updateFileUI(fileObj.id, state);
                    }
                    updateUploadPreloader(state);
                    return success;
                })
                .catch(error => {
                    console.error(`❌ Error en ${preparedFile.fileName}:`, error);
                    results.failureCount++;
                    if (fileObj) {
                        fileObj.status = 'failed';
                        fileObj.error = error.message;
                        updateFileUI(fileObj.id, state);
                    }
                    updateUploadPreloader(state);
                    return false;
                });
        });
        
        // Esperar lote
        console.log(`⏳ Esperando ${batchPromises.length} archivos...`);
        await Promise.all(batchPromises);
        
        // Pausa entre lotes
        if (batchIndex < batches.length - 1) {
            console.log(`⏸️  Pausa: ${delayBetween}ms`);
            await new Promise(resolve => setTimeout(resolve, delayBetween));
        }
    }
    
    results.totalTime = Date.now() - startTime;
    console.log(`\n⏱️  Tiempo total: ${results.totalTime}ms`);
    console.log(`📊 Resultados: ${results.successCount} exitosos, ${results.failureCount} fallidos`);
    
    console.groupEnd();
    return results;
}

/**
 * Actualiza la UI de un archivo
 */
function updateFileUI(fileId, state) {
    if (!fileId || !state) return;
    
    const fileElement = document.querySelector(`.file-item[data-file-id="${fileId}"]`);
    if (!fileElement) return;
    
    const fileObj = state.files.find(f => f.id === fileId);
    if (!fileObj) return;
    
    // Actualizar clase
    fileElement.className = `file-item file-item--${fileObj.status}`;
    
    // Actualizar badge
    const statusBadge = fileElement.querySelector('.status-badge');
    if (statusBadge) {
        statusBadge.className = `status-badge status-badge--${fileObj.status}`;
        statusBadge.textContent = getStatusText(fileObj.status);
    }
    
    // Actualizar progreso
    const progressBar = fileElement.querySelector('.progress-bar__fill');
    const progressText = fileElement.querySelector('.progress-text');
    
    if (progressBar && fileObj.status === 'uploading') {
        progressBar.style.width = `${fileObj.progress}%`;
        if (progressText) {
            progressText.textContent = `${fileObj.progress}%`;
        }
    }
    
    // Actualizar error
    const errorSection = fileElement.querySelector('.file-item__error');
    if (errorSection) {
        if (fileObj.error) {
            errorSection.style.display = 'flex';
            const errorText = errorSection.querySelector('span');
            if (errorText) {
                errorText.textContent = fileObj.error;
            }
        } else {
            errorSection.style.display = 'none';
        }
    }
    
    // Actualizar categoría
    const categorySpan = fileElement.querySelector('.file-item__category');
    if (categorySpan) {
        const effectiveCategory = fileObj.customCategory;
        categorySpan.textContent = effectiveCategory || 'Sin categoría';
        if (!effectiveCategory || effectiveCategory.trim() === '') {
            categorySpan.style.color = 'var(--danger)';
            categorySpan.style.fontWeight = 'bold';
        }
    }
    
    // Actualizar persona
    const personSpan = fileElement.querySelector('.file-item__person');
    if (personSpan) {
        const effectivePersonId = fileObj.customPersonId;
        personSpan.textContent = effectivePersonId ? `Persona: ${effectivePersonId}` : 'Sin persona';
    }
    
    // Actualizar fecha
    const dateSpan = fileElement.querySelector('.file-item__expiration');
    if (dateSpan) {
        const effectiveExpirationDate = fileObj.customExpirationDate;
        if (effectiveExpirationDate) {
            const date = new Date(effectiveExpirationDate);
            dateSpan.textContent = `Vence: ${date.toLocaleDateString()}`;
            dateSpan.style.display = 'block';
        } else {
            dateSpan.style.display = 'none';
        }
    }
}

/**
 * Muestra resultados
 */
function showUploadResults(results, state) {
    console.log('📋 Mostrando resultados');
    
    let resultsContainer = document.getElementById('uploadResultsContainer');
    if (!resultsContainer) {
        resultsContainer = document.createElement('div');
        resultsContainer.id = 'uploadResultsContainer';
        resultsContainer.className = 'upload-results';
        
        // Insertar después del preloader o en el body
        const preloader = document.getElementById('documentUploadPreloader');
        if (preloader) {
            preloader.appendChild(resultsContainer);
        } else {
            document.body.appendChild(resultsContainer);
        }
    }
    
    resultsContainer.innerHTML = `
        <div class="results-header">
            <h4><i class="fas fa-clipboard-check"></i> Resultados</h4>
            <button class="btn btn--sm btn--outline" id="closeResultsBtn">
                <i class="fas fa-times"></i>
            </button>
        </div>
        
        <div class="results-summary">
            <div class="result-item result-item--success">
                <i class="fas fa-check-circle"></i>
                <span>Exitosas: <strong>${results.successCount}</strong></span>
            </div>
            <div class="result-item result-item--error">
                <i class="fas fa-times-circle"></i>
                <span>Fallidas: <strong>${results.failureCount}</strong></span>
            </div>
            <div class="result-item">
                <i class="fas fa-clock"></i>
                <span>Tiempo: <strong>${(results.totalTime / 1000).toFixed(1)}s</strong></span>
            </div>
        </div>
        
        ${results.successCount > 0 ? `
            <div class="results-files">
                <h5>Archivos subidos:</h5>
                <ul class="files-list">
                    ${results.uploadedFiles.map(file => `
                        <li>
                            <i class="fas fa-file-alt"></i> 
                            <span class="file-name">${file.name}</span>
                            <span class="file-size">(${formatFileSize(file.size)})</span>
                            ${file.category ? `<span class="file-category">${file.category}</span>` : ''}
                            ${file.personId ? `<span class="file-person">👤 ${file.personId}</span>` : ''}
                            ${file.expirationDate ? `<span class="file-date">📅 ${file.expirationDate}</span>` : ''}
                        </li>
                    `).join('')}
                </ul>
            </div>
        ` : ''}
        
        ${results.failureCount > 0 ? `
            <div class="results-actions">
                <button class="btn btn--primary" id="retryFailedBtn">
                    <i class="fas fa-redo"></i> Reintentar fallidos
                </button>
                <button class="btn btn--outline" id="clearFailedBtn">
                    <i class="fas fa-trash"></i> Limpiar fallidos
                </button>
            </div>
        ` : ''}
    `;
    
    // Event listeners
    const closeBtn = resultsContainer.querySelector('#closeResultsBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            resultsContainer.remove();
        });
    }
    
    const retryBtn = resultsContainer.querySelector('#retryFailedBtn');
    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            retryFailedUploads(state);
            resultsContainer.remove();
        });
    }
    
    const clearBtn = resultsContainer.querySelector('#clearFailedBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            state.cleanupFiles('failed');
            updateMultipleUploadUI();
            updateUploadPreloader(state);
            resultsContainer.remove();
        });
    }
}

/**
 * Reintenta fallidos
 */
function retryFailedUploads(state) {
    console.log('🔄 Reintentando fallidos');
    showPageAlert('🔄 Reintentando archivos fallidos...', 'info');
    
    const failedFiles = state.files.filter(f => f.status === 'failed');
    
    failedFiles.forEach(file => {
        file.status = 'pending';
        file.error = null;
        file.progress = 0;
        file.retryCount = (file.retryCount || 0) + 1;
    });
    
    updateMultipleUploadUI();
    updateUploadPreloader(state);
    handleUploadMultipleDocuments();
}

/**
 * Obtiene texto de estado
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
 * FIX CRÍTICO #7: Configuración de listeners mejorada
 */
export function setupMultipleUploadListeners() {
    console.log('🔧 CONFIGURANDO LISTENERS - VERSIÓN MEJORADA');
    
    // Esperar a que el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initializeUploadSystem();
        });
    } else {
        initializeUploadSystem();
    }
    
    console.log('✅ LISTENERS CONFIGURADOS');
}

/**
 * Inicializa el sistema de subida
 */
function initializeUploadSystem() {
    console.log('🚀 INICIALIZANDO SISTEMA DE SUBIDA MÚLTIPLE');
    
    // Verificar que los elementos DOM existan
    if (!DOM.multipleDocumentCategory || !DOM.multipleDocumentPerson || !DOM.multipleExpirationDays) {
        console.error('❌ ERROR: Elementos DOM no encontrados. Verifica que existan:');
        console.log('- multipleDocumentCategory:', DOM.multipleDocumentCategory);
        console.log('- multipleDocumentPerson:', DOM.multipleDocumentPerson);
        console.log('- multipleExpirationDays:', DOM.multipleExpirationDays);
        
        // Intentar nuevamente después de un tiempo
        setTimeout(initializeUploadSystem, 1000);
        return;
    }
    
    console.log('✅ Elementos DOM encontrados');
    
    // Inicializar estado del flujo
    updateConfigFlowState();
    
    // Mostrar mensaje inicial
    showPageAlert('📋 Proceso de subida múltiple: 1) Selecciona categoría, 2) Configura opciones, 3) Agrega archivos, 4) Sube', 'info', 5000);
    
    // Configurar listeners
    setupEventListeners();
}

/**
 * Configura todos los event listeners
 */
function setupEventListeners() {
    console.log('🔧 CONFIGURANDO EVENT LISTENERS');
    
    // 1. Input de archivos
    if (DOM.multipleFileInput) {
        DOM.multipleFileInput.addEventListener('change', handleMultipleFileSelect);
        console.log('✅ Listener para multipleFileInput');
    }
    
    // 2. Botón de subida
    if (DOM.uploadMultipleDocumentsBtn) {
        DOM.uploadMultipleDocumentsBtn.addEventListener('click', handleUploadMultipleDocuments);
        console.log('✅ Listener para uploadMultipleDocumentsBtn');
    }
    
    // 3. Categoría (OBLIGATORIA - desbloquea todo)
    if (DOM.multipleDocumentCategory) {
        DOM.multipleDocumentCategory.addEventListener('change', () => {
            console.log('🏷️ Cambio en categoría detectado');
            console.log('Nuevo valor:', DOM.multipleDocumentCategory.value);
            updateConfigFlowState();
            updateCommonSettingsFromDOM(true);
        });
        console.log('✅ Listener para multipleDocumentCategory');
    }
    
    // 4. Persona (OPCIONAL - bloqueado sin categoría)
    if (DOM.multipleDocumentPerson) {
        DOM.multipleDocumentPerson.addEventListener('change', () => {
            console.log('👤 Cambio en persona detectado');
            console.log('Nuevo valor:', DOM.multipleDocumentPerson.value);
            
            // Validar que no sea manipulado manualmente
            if (!configFlowState.canSelectPerson) {
                console.warn('⚠️ Intento de cambiar persona sin categoría seleccionada');
                DOM.multipleDocumentPerson.value = '';
                showPageAlert('⚠️ Primero selecciona una categoría para habilitar persona', 'warning');
                return;
            }
            
            updateConfigFlowState();
            updateCommonSettingsFromDOM(true);
        });
        
        // Prevenir clics cuando está deshabilitado
        DOM.multipleDocumentPerson.addEventListener('click', (e) => {
            if (!configFlowState.canSelectPerson) {
                e.preventDefault();
                showPageAlert('⚠️ Primero selecciona una categoría para habilitar persona', 'warning');
            }
        });
        
        console.log('✅ Listener para multipleDocumentPerson');
    }
    
    // 5. Expiración (OPCIONAL - bloqueado sin categoría)
    if (DOM.multipleExpirationDays) {
        DOM.multipleExpirationDays.addEventListener('change', () => {
            console.log('📅 Cambio en expiración detectado');
            console.log('Nuevo valor:', DOM.multipleExpirationDays.value);
            
            // Validar que no sea manipulado manualmente
            if (!configFlowState.canSelectExpiration) {
                console.warn('⚠️ Intento de cambiar expiración sin categoría seleccionada');
                DOM.multipleExpirationDays.value = '';
                showPageAlert('⚠️ Primero selecciona una categoría para habilitar fecha de vencimiento', 'warning');
                return;
            }
            
            updateConfigFlowState();
            updateCommonSettingsFromDOM(true);
        });
        
        // Prevenir clics cuando está deshabilitado
        DOM.multipleExpirationDays.addEventListener('click', (e) => {
            if (!configFlowState.canSelectExpiration) {
                e.preventDefault();
                showPageAlert('⚠️ Primero selecciona una categoría para habilitar fecha de vencimiento', 'warning');
            }
        });
        
        console.log('✅ Listener para multipleExpirationDays');
    }
    
    // 6. Estrategia
    if (DOM.uploadStrategy) {
        DOM.uploadStrategy.addEventListener('change', () => {
            console.log('🔄 Cambio en estrategia detectado');
            updateConfigFlowState();
            updateCommonSettingsFromDOM(true);
        });
        console.log('✅ Listener para uploadStrategy');
    }
    
    // 7. Checkboxes
    if (DOM.autoGenerateDescriptions) {
        DOM.autoGenerateDescriptions.addEventListener('change', () => {
            console.log('🤖 Cambio en autoGenerateDescriptions');
            updateConfigFlowState();
            updateCommonSettingsFromDOM(true);
        });
        console.log('✅ Listener para autoGenerateDescriptions');
    }
    
    if (DOM.notifyPerson) {
        DOM.notifyPerson.addEventListener('change', () => {
            console.log('🔔 Cambio en notifyPerson');
            updateConfigFlowState();
            updateCommonSettingsFromDOM(true);
        });
        console.log('✅ Listener para notifyPerson');
    }
    
    // 8. Botón de reset
    const resetBtn = document.getElementById('resetMultipleUpload');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            console.log('🔄 Reseteando configuración múltiple');
            const state = getMultipleUploadState();
            state.reset();
            resetConfigControls();
            updateMultipleUploadUI();
            showPageAlert('🔄 Configuración reseteada', 'info');
        });
        console.log('✅ Listener para resetMultipleUpload');
    }
    
    // 9. Prevenir clic en input de archivos deshabilitado
    if (DOM.multipleFileInput) {
        DOM.multipleFileInput.addEventListener('click', (e) => {
            if (DOM.multipleFileInput.disabled) {
                e.preventDefault();
                showPageAlert('⚠️ Primero selecciona una categoría para habilitar la selección de archivos', 'warning');
            }
        });
    }
    
    console.log('✅ TODOS LOS LISTENERS CONFIGURADOS');
}

// Función para probar el flujo
if (typeof window !== 'undefined') {
    window.testUploadFlow = () => {
        console.group('🧪 TEST UPLOAD FLOW');
        console.log('📊 Estado actual:', configFlowState);
        console.log('📁 Archivos:', multipleUploadState ? multipleUploadState.files.length : 0);
        console.log('🏷️ Categoría DOM:', DOM.multipleDocumentCategory?.value || 'NO');
        console.log('👤 Persona DOM:', DOM.multipleDocumentPerson?.value || 'NO');
        console.log('📅 Expiración DOM:', DOM.multipleExpirationDays?.value || 'NO');
        
        // Mostrar alerta detallada
        const message = `
Estado del flujo:
• Categoría seleccionada: ${configFlowState.categorySelected ? '✅' : '❌'}
• Persona habilitada: ${configFlowState.canSelectPerson ? '✅' : '❌'}
• Expiración habilitada: ${configFlowState.canSelectExpiration ? '✅' : '❌'}
• Puede agregar archivos: ${configFlowState.canAddDocuments ? '✅' : '❌'}
• Archivos en cola: ${multipleUploadState ? multipleUploadState.files.length : 0}
        `;
        
        showPageAlert(message, 'info', 8000);
        console.groupEnd();
    };
}

// Funciones de debug
if (typeof window !== 'undefined') {
    window.debugUploadState = () => {
        const state = getMultipleUploadState();
        console.group('🐛 DEBUG UPLOAD STATE');
        console.log('📊 FLOW STATE:', configFlowState);
        console.log('📊 Archivos:', state.files.length);
        console.log('🏷️ Categoría común:', state.commonCategory);
        console.log('👤 Persona común:', state.commonPersonId || '(vacía)');
        console.log('📅 Días expiración:', state.expirationDays);
        
        console.log('\n🔍 DOM ACTUAL:');
        console.log('- Categoría:', DOM.multipleDocumentCategory?.value || 'NO EXISTE');
        console.log('- Persona:', DOM.multipleDocumentPerson?.value || 'NO EXISTE');
        console.log('- Expiración:', DOM.multipleExpirationDays?.value || 'NO EXISTE');
        
        console.log('\n📄 ARCHIVOS:');
        state.files.forEach((file, idx) => {
            console.log(`[${idx + 1}] ${file.file.name}:`, {
                categoría: file.customCategory || '(sin categoría)',
                persona: file.customPersonId || '(sin persona)',
                expiracion: file.customExpirationDate || '(sin fecha)',
                estado: file.status
            });
        });
        console.groupEnd();
    };
    
    window.forceApplySettings = () => {
        console.log('🔧 FORZANDO APLICACIÓN DE CONFIGURACIÓN');
        const state = getMultipleUploadState();
        applyCommonSettingsToAllFiles(state);
        updateMultipleUploadUI();
        showPageAlert('🔧 Configuración forzada aplicada', 'info');
    };
    
    window.resetUploadFlow = () => {
        console.log('🔄 RESETEANDO FLUJO DE SUBIDA');
        resetConfigControls();
        showPageAlert('🔄 Flujo de subida reseteado', 'info');
    };
}

// Inicializar automáticamente cuando se importa el módulo
console.log('📦 MÓDULO uploadMultiple.js CARGADO');
if (typeof window !== 'undefined') {
    // Esperar un momento para que el DOM esté listo
    setTimeout(() => {
        setupMultipleUploadListeners();
    }, 100);
}

// Exportar funciones
export { 
    updateFileUI, 
    getStatusText, 
    showUploadPreloader, 
    hideUploadPreloader, 
    updateUploadPreloader,
    uploadSingleFileWithProgress,
    applyCommonSettingsToAllFiles,
    updateCommonSettingsFromDOM,
    updateConfigFlowState,
    updateControlsState
};