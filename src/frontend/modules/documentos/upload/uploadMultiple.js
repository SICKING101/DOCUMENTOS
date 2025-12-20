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

// Estado del preloader mejorado
let preloaderState = {
    isVisible: false,
    isMinimized: false,
    uploadSpeed: 0,
    startTime: null,
    totalSize: 0,
    uploadedSize: 0,
    activeUploads: new Set(),
    uploadHistory: [],
    currentStrategy: 'sequential',
    completedShown: false,
    isPaused: false,
    isCancelled: false,
    lastSpeedUpdate: 0,
    speedSamples: []
};

// Instancia del elemento preloader
let preloaderElement = null;
let resultsShown = false; // Bandera para evitar mostrar resultados múltiples veces
let isUploading = false; // Bandera para evitar múltiples subidas simultáneas

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
 * Obtiene el icono adecuado según el tipo de archivo
 */
function getFileIcon(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    const iconMap = {
        'pdf': 'file-pdf',
        'doc': 'file-word',
        'docx': 'file-word',
        'xls': 'file-excel',
        'xlsx': 'file-excel',
        'ppt': 'file-powerpoint',
        'pptx': 'file-powerpoint',
        'jpg': 'file-image',
        'jpeg': 'file-image',
        'png': 'file-image',
        'gif': 'file-image',
        'svg': 'file-image',
        'txt': 'file-alt',
        'zip': 'file-archive',
        'rar': 'file-archive',
        '7z': 'file-archive',
        'csv': 'file-csv',
        'mp3': 'file-audio',
        'mp4': 'file-video',
        'mov': 'file-video',
        'avi': 'file-video'
    };
    
    return iconMap[extension] || 'file';
}

/**
 * Formatea el tiempo transcurrido
 */
function formatElapsedTime(startTime) {
    if (!startTime) return '00:00';
    
    const elapsed = Date.now() - startTime;
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Calcula la velocidad de subida de manera más precisa
 */
function calculateUploadSpeed() {
    if (!preloaderState.startTime || preloaderState.uploadedSize === 0) return 0;
    
    const now = Date.now();
    
    // Si ha pasado menos de 500ms desde la última actualización, devolver el promedio
    if (now - preloaderState.lastSpeedUpdate < 500 && preloaderState.speedSamples.length > 0) {
        const sum = preloaderState.speedSamples.reduce((a, b) => a + b, 0);
        return sum / preloaderState.speedSamples.length;
    }
    
    preloaderState.lastSpeedUpdate = now;
    const elapsedTime = (now - preloaderState.startTime) / 1000; // segundos
    if (elapsedTime === 0) return 0;
    
    const currentSpeed = preloaderState.uploadedSize / elapsedTime; // bytes por segundo
    
    // Guardar muestra para suavizado
    preloaderState.speedSamples.push(currentSpeed);
    if (preloaderState.speedSamples.length > 10) {
        preloaderState.speedSamples.shift();
    }
    
    // Calcular promedio
    const avgSpeed = preloaderState.speedSamples.reduce((a, b) => a + b, 0) / preloaderState.speedSamples.length;
    
    return avgSpeed;
}

/**
 * Formatea la velocidad de subida de manera más clara
 */
function formatSpeed(speed) {
    if (speed === 0) return '0 B/s';
    
    const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    let unitIndex = 0;
    let formattedSpeed = speed;
    
    while (formattedSpeed >= 1024 && unitIndex < units.length - 1) {
        formattedSpeed /= 1024;
        unitIndex++;
    }
    
    // Mostrar 0 decimales para B/s, 1 para KB/s, 2 para MB/s
    let decimals = 0;
    if (unitIndex === 1) decimals = 1; // KB/s
    if (unitIndex >= 2) decimals = 2; // MB/s o GB/s
    
    return `${formattedSpeed.toFixed(decimals)} ${units[unitIndex]}`;
}

/**
 * Trunca el nombre del archivo si es muy largo
 */
function truncateFileName(name, maxLength) {
    if (name.length <= maxLength) return name;
    const extension = name.split('.').pop();
    const nameWithoutExt = name.slice(0, name.length - extension.length - 1);
    const truncateLength = maxLength - extension.length - 4; // -4 para "..." y "."
    return nameWithoutExt.slice(0, Math.max(truncateLength, 10)) + '...' + extension;
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
        const shouldBeDisabled = !(configFlowState.canAddDocuments && hasFiles) || isUploading;
        
        DOM.uploadMultipleDocumentsBtn.disabled = shouldBeDisabled;
        
        if (DOM.uploadMultipleDocumentsBtn.disabled) {
            DOM.uploadMultipleDocumentsBtn.style.opacity = '0.5';
            DOM.uploadMultipleDocumentsBtn.style.cursor = 'not-allowed';
            if (isUploading) {
                DOM.uploadMultipleDocumentsBtn.title = 'Subida en progreso...';
                console.log('⏳ Botón subida: Deshabilitado (subida en progreso)');
            } else {
                DOM.uploadMultipleDocumentsBtn.title = hasFiles ? 'Selecciona categoría primero' : 'Agrega archivos primero';
                console.log('❌ Botón subida: Deshabilitado');
            }
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
        if (isUploading) {
            message = '⏳ <strong>SUBIENDO ARCHIVOS...</strong> Por favor espera.';
            type = 'info';
            messageContainer.style.backgroundColor = '#cce5ff';
            messageContainer.style.borderColor = '#b8daff';
        } else {
            message = '🎯 <strong>PASO 3:</strong> ¡Listo! Puedes subir los archivos.';
            type = 'success';
            messageContainer.style.backgroundColor = '#d4edda';
            messageContainer.style.borderColor = '#c3e6cb';
        }
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
    
    if (action === 'upload' && isUploading) {
        errors.push('Ya hay una subida en progreso. Por favor espera.');
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
 * Actualiza las estadísticas del preloader - VERSIÓN CORREGIDA
 */
function updatePreloaderStats(state) {
    const completed = state.files.filter(f => f.status === 'completed').length;
    const uploading = state.files.filter(f => f.status === 'uploading').length;
    const failed = state.files.filter(f => f.status === 'failed').length;
    const pending = state.files.filter(f => f.status === 'pending').length;
    const total = state.files.length;
    
    const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Calcular velocidad (mejorada)
    preloaderState.uploadSpeed = calculateUploadSpeed();
    
    // Actualizar elementos del DOM
    updatePreloaderDOM({
        completed,
        uploading,
        failed,
        pending,
        total,
        progressPercent
    });
}

/**
 * Actualiza el DOM del preloader - VERSIÓN CORREGIDA
 */
function updatePreloaderDOM(stats) {
    if (!preloaderElement) return;
    
    const {
        completed,
        uploading,
        failed,
        pending,
        total,
        progressPercent
    } = stats;
    
    // Actualizar porcentaje general
    const overallPercentage = preloaderElement.querySelector('.document-upload-preloader__overall-percentage');
    if (overallPercentage) {
        overallPercentage.textContent = `${progressPercent}%`;
    }
    
    // Actualizar barra de progreso
    const overallFill = preloaderElement.querySelector('.document-upload-preloader__overall-fill');
    if (overallFill) {
        overallFill.style.width = `${progressPercent}%`;
    }
    
    // Actualizar estadísticas - CORRECCIÓN: Ahora solo hay 3 stats
    const statValues = preloaderElement.querySelectorAll('.document-upload-preloader__stat-value');
    if (statValues.length >= 3) {
        statValues[0].textContent = completed;
        statValues[1].textContent = uploading;
        statValues[2].textContent = failed;
    }
    
    // Actualizar texto de estado
    const overallText = preloaderElement.querySelector('.document-upload-preloader__overall-text');
    if (overallText) {
        let statusText = '';
        if (uploading > 0) {
            statusText = `Subiendo ${uploading} archivo(s)`;
        } else if (completed === total) {
            statusText = 'Completado';
        } else if (failed > 0 && completed === 0) {
            statusText = 'Error en la subida';
        } else {
            statusText = 'En espera';
        }
        
        const span = overallText.querySelector('span') || document.createElement('span');
        span.textContent = statusText;
        if (!overallText.contains(span)) {
            overallText.appendChild(span);
        }
    }
    
    // Actualizar estadísticas de tiempo/velocidad MEJORADA
    const overallStats = preloaderElement.querySelector('.document-upload-preloader__overall-stats');
    if (overallStats) {
        const timeElapsed = preloaderState.startTime ? formatElapsedTime(preloaderState.startTime) : '00:00';
        const speedText = formatSpeed(preloaderState.uploadSpeed);
        
        // Añadir también archivos procesados
        overallStats.innerHTML = `
            <span>Tiempo: ${timeElapsed}</span>
            <span>Velocidad: ${speedText}</span>
            <span>Archivos: ${completed}/${total}</span>
        `;
    }
    
    // Actualizar título del preloader
    const titleText = preloaderElement.querySelector('.document-upload-preloader__title-text');
    if (titleText) {
        if (completed === total) {
            titleText.textContent = 'Subida completada';
            const icon = preloaderElement.querySelector('.document-upload-preloader__title-icon');
            if (icon) {
                icon.className = 'fas fa-check-circle document-upload-preloader__title-icon';
            }
        } else if (failed > 0 && completed === 0) {
            titleText.textContent = 'Error en la subida';
            const icon = preloaderElement.querySelector('.document-upload-preloader__title-icon');
            if (icon) {
                icon.className = 'fas fa-exclamation-circle document-upload-preloader__title-icon';
            }
        } else {
            titleText.textContent = `Subiendo archivos (${completed}/${total})`;
        }
    }
    
    // Actualizar clase del preloader según estado
    updatePreloaderStateClass();
}

/**
 * Actualiza la clase del preloader según el estado
 */
function updatePreloaderStateClass() {
    if (!preloaderElement) return;
    
    // Remover clases de estado anteriores
    preloaderElement.classList.remove(
        'document-upload-preloader--completed',
        'document-upload-preloader--error',
        'document-upload-preloader--uploading'
    );
    
    const statValues = preloaderElement.querySelectorAll('.document-upload-preloader__stat-value');
    if (statValues.length < 3) return;
    
    const completedCount = parseInt(statValues[0]?.textContent || 0);
    const uploadingCount = parseInt(statValues[1]?.textContent || 0);
    const failedCount = parseInt(statValues[2]?.textContent || 0);
    
    if (uploadingCount > 0) {
        preloaderElement.classList.add('document-upload-preloader--uploading');
    } else if (failedCount > 0 && completedCount === 0) {
        preloaderElement.classList.add('document-upload-preloader--error');
    } else if (completedCount > 0 && uploadingCount === 0) {
        preloaderElement.classList.add('document-upload-preloader--completed');
    }
}

/**
 * Crea o actualiza la lista de archivos en el preloader
 */
function updateFilesList(state) {
    if (!preloaderElement) return;
    
    const content = preloaderElement.querySelector('.document-upload-preloader__content');
    if (!content) return;
    
    // Ordenar archivos: subiendo, pendientes, completados, fallidos
    const sortedFiles = [...state.files].sort((a, b) => {
        const order = { 'uploading': 0, 'pending': 1, 'completed': 2, 'failed': 3 };
        return order[a.status] - order[b.status];
    });
    
    if (sortedFiles.length === 0) {
        content.innerHTML = `
            <div class="document-upload-preloader__empty-state">
                <i class="fas fa-cloud-upload-alt document-upload-preloader__empty-icon"></i>
                <div class="document-upload-preloader__empty-title">Sin archivos</div>
                <div class="document-upload-preloader__empty-message">
                    Selecciona archivos para comenzar la subida
                </div>
            </div>
        `;
        return;
    }
    
    content.innerHTML = `
        <div class="document-upload-preloader__files">
            ${sortedFiles.map(file => createFileItemHTML(file)).join('')}
        </div>
    `;
}

/**
 * Crea el HTML para un item de archivo
 */
function createFileItemHTML(file) {
    const icon = getFileIcon(file.file.name);
    const size = formatFileSize(file.file.size);
    const progress = file.progress || 0;
    
    // Información de metadatos
    const metaItems = [];
    
    if (file.customCategory) {
        metaItems.push(`
            <div class="document-upload-preloader__file-meta-item">
                <i class="fas fa-tag document-upload-preloader__file-meta-icon"></i>
                <span>${file.customCategory}</span>
            </div>
        `);
    }
    
    if (file.customPersonId) {
        metaItems.push(`
            <div class="document-upload-preloader__file-meta-item">
                <i class="fas fa-user document-upload-preloader__file-meta-icon"></i>
                <span>${file.customPersonId}</span>
            </div>
        `);
    }
    
    if (file.customExpirationDate) {
        const date = new Date(file.customExpirationDate);
        metaItems.push(`
            <div class="document-upload-preloader__file-meta-item">
                <i class="fas fa-calendar-alt document-upload-preloader__file-meta-icon"></i>
                <span>${date.toLocaleDateString()}</span>
            </div>
        `);
    }
    
    // Estado específico
    let statusIcon = '';
    let statusText = '';
    
    switch (file.status) {
        case 'completed':
            statusIcon = '<i class="fas fa-check-circle document-upload-preloader__file-status-icon"></i>';
            statusText = 'Completado';
            break;
        case 'failed':
            statusIcon = '<i class="fas fa-times-circle document-upload-preloader__file-status-icon"></i>';
            statusText = 'Fallido';
            break;
        case 'uploading':
            statusIcon = '<i class="fas fa-spinner fa-spin document-upload-preloader__file-status-icon"></i>';
            statusText = 'Subiendo';
            break;
        default:
            statusText = 'Pendiente';
    }
    
    return `
        <div class="document-upload-preloader__file document-upload-preloader__file--${file.status}" 
             data-file-id="${file.id}">
            <div class="document-upload-preloader__file-icon">
                <i class="fas fa-${icon}"></i>
            </div>
            <div class="document-upload-preloader__file-content">
                <div class="document-upload-preloader__file-header">
                    <div class="document-upload-preloader__file-name" title="${file.file.name}">
                        ${truncateFileName(file.file.name, 35)}
                    </div>
                    <div class="document-upload-preloader__file-size">
                        ${size}
                    </div>
                </div>
                
                <div class="document-upload-preloader__file-progress-container">
                    <div class="document-upload-preloader__file-progress">
                        <div class="document-upload-preloader__file-progress-bar" 
                             style="width: ${progress}%"></div>
                    </div>
                    <div class="document-upload-preloader__file-percentage">
                        ${progress}%
                    </div>
                </div>
                
                ${metaItems.length > 0 ? `
                    <div class="document-upload-preloader__file-meta">
                        ${metaItems.join('')}
                    </div>
                ` : ''}
                
                <div class="document-upload-preloader__file-status">
                    ${statusIcon}
                    <span>${statusText}</span>
                </div>
                
                ${file.error ? `
                    <div class="document-upload-preloader__file-error" style="margin-top: 0.5rem; font-size: 0.75rem; color: var(--danger);">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span style="margin-left: 0.25rem;">${file.error}</span>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

/**
 * Muestra el overlay de estado
 */
function showStateOverlay(type, title, message, options = {}) {
    if (!preloaderElement) return;
    
    // Remover overlay existente
    const existingOverlay = preloaderElement.querySelector('.document-upload-preloader__overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }
    
    const overlay = document.createElement('div');
    overlay.className = `document-upload-preloader__overlay document-upload-preloader__overlay--${type}`;
    
    let buttonsHTML = '';
    if (options.buttons) {
        buttonsHTML = `
            <div class="document-upload-preloader__action-buttons">
                ${options.buttons.map(btn => `
                    <button class="document-upload-preloader__action-btn 
                                   document-upload-preloader__action-btn--${btn.type || 'secondary'}"
                            data-action="${btn.action || ''}">
                        ${btn.icon ? `<i class="${btn.icon}"></i>` : ''}
                        ${btn.text}
                    </button>
                `).join('')}
            </div>
        `;
    }
    
    overlay.innerHTML = `
        <div class="document-upload-preloader__overlay-content">
            <div class="document-upload-preloader__overlay-icon">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            </div>
            <div class="document-upload-preloader__overlay-title">${title}</div>
            <div class="document-upload-preloader__overlay-message">${message}</div>
            ${buttonsHTML}
        </div>
    `;
    
    preloaderElement.appendChild(overlay);
    
    // Añadir event listeners a los botones
    setTimeout(() => {
        overlay.querySelectorAll('button[data-action]').forEach(button => {
            button.addEventListener('click', () => {
                const action = button.getAttribute('data-action');
                handleOverlayAction(action, options.state);
            });
        });
    }, 100);
    
    // Auto-ocultar si se especifica
    if (options.autoHide) {
        setTimeout(() => {
            if (overlay.parentNode === preloaderElement) {
                overlay.remove();
            }
        }, options.autoHide);
    }
}

/**
 * Maneja las acciones del overlay
 */
function handleOverlayAction(action, state) {
    switch (action) {
        case 'close':
            hideUploadPreloader();
            break;
        case 'retry':
            if (state) {
                retryFailedUploads(state);
            }
            break;
        case 'viewResults':
            // Eliminado: Ya no mostramos resultados desde aquí
            break;
        case 'newUpload':
            if (state) {
                state.reset();
                resetConfigControls();
                updateMultipleUploadUI();
                hideUploadPreloader();
            }
            break;
    }
}

/**
 * Crea el HTML del preloader - VERSIÓN MODIFICADA (sin botón de ver resultados)
 */
function createPreloaderHTML() {
    return `
        <div class="document-upload-preloader__header">
            <div class="document-upload-preloader__title">
                <i class="fas fa-upload document-upload-preloader__title-icon"></i>
                <span class="document-upload-preloader__title-text">Subiendo archivos...</span>
            </div>
            <div class="document-upload-preloader__actions">
                <button class="document-upload-preloader__btn document-upload-preloader__btn--minimize" 
                        title="Minimizar" data-action="minimize">
                    <i class="fas fa-chevron-down"></i>
                </button>
                <button class="document-upload-preloader__btn document-upload-preloader__btn--close" 
                        title="Cerrar" data-action="close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
        
        <div class="document-upload-preloader__content">
            <!-- Contenido dinámico de archivos -->
        </div>
        
        <div class="document-upload-preloader__overall-progress">
            <div class="document-upload-preloader__overall-header">
                <div class="document-upload-preloader__overall-text">
                    <i class="fas fa-chart-line"></i>
                    <span>Progreso general</span>
                </div>
                <div class="document-upload-preloader__overall-percentage">0%</div>
            </div>
            <div class="document-upload-preloader__overall-bar">
                <div class="document-upload-preloader__overall-fill"></div>
            </div>
            <div class="document-upload-preloader__overall-stats">
                <span>Tiempo: 00:00</span>
                <span>Velocidad: 0 B/s</span>
                <span>Archivos: 0/0</span>
            </div>
        </div>
        
        <div class="document-upload-preloader__stats">
            <div class="document-upload-preloader__stat document-upload-preloader__stat--success">
                <i class="fas fa-check-circle document-upload-preloader__stat-icon"></i>
                <div class="document-upload-preloader__stat-value">0</div>
                <div class="document-upload-preloader__stat-label">Completados</div>
            </div>
            <div class="document-upload-preloader__stat document-upload-preloader__stat--pending">
                <i class="fas fa-spinner document-upload-preloader__stat-icon"></i>
                <div class="document-upload-preloader__stat-value">0</div>
                <div class="document-upload-preloader__stat-label">Subiendo</div>
            </div>
            <div class="document-upload-preloader__stat document-upload-preloader__stat--error">
                <i class="fas fa-times-circle document-upload-preloader__stat-icon"></i>
                <div class="document-upload-preloader__stat-value">0</div>
                <div class="document-upload-preloader__stat-label">Fallidos</div>
            </div>
        </div>
        
        <div class="document-upload-preloader__action-buttons">
            <button class="document-upload-preloader__action-btn 
                          document-upload-preloader__action-btn--primary" 
                    data-action="pause">
                <i class="fas fa-pause"></i>
                Pausar
            </button>
            <button class="document-upload-preloader__action-btn 
                          document-upload-preloader__action-btn--secondary" 
                    data-action="cancel">
                <i class="fas fa-times"></i>
                Cancelar
            </button>
        </div>
    `;
}

/**
 * Configura los listeners del preloader
 */
function setupPreloaderListeners(state) {
    if (!preloaderElement) return;
    
    // Botones de acción
    preloaderElement.querySelectorAll('[data-action]').forEach(button => {
        button.addEventListener('click', (e) => {
            const action = e.currentTarget.getAttribute('data-action');
            handlePreloaderAction(action, state);
        });
    });
    
    // Minimizar al hacer clic en el header
    const header = preloaderElement.querySelector('.document-upload-preloader__header');
    if (header) {
        header.addEventListener('click', (e) => {
            if (e.target.closest('[data-action]')) return;
            toggleMinimize();
        });
    }
    
    // Cerrar con Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && preloaderState.isVisible) {
            handlePreloaderAction('close', state);
        }
    });
}

/**
 * Maneja las acciones del preloader
 */
function handlePreloaderAction(action, state) {
    switch (action) {
        case 'minimize':
            toggleMinimize();
            break;
        case 'close':
            if (confirm('¿Estás seguro de que quieres cerrar el preloader? La subida continuará en segundo plano.')) {
                hideUploadPreloader();
            }
            break;
        case 'pause':
            togglePause(state);
            break;
        case 'cancel':
            cancelUpload(state);
            break;
    }
}

/**
 * Alterna el estado de minimizado
 */
function toggleMinimize() {
    if (!preloaderElement) return;
    
    preloaderState.isMinimized = !preloaderState.isMinimized;
    
    if (preloaderState.isMinimized) {
        preloaderElement.classList.add('document-upload-preloader--minimized');
    } else {
        preloaderElement.classList.remove('document-upload-preloader--minimized');
    }
}

/**
 * Alterna el estado de pausa
 */
function togglePause(state) {
    if (!state) return;
    
    const isPaused = preloaderState.isPaused || false;
    preloaderState.isPaused = !isPaused;
    
    const pauseBtn = preloaderElement?.querySelector('[data-action="pause"]');
    if (pauseBtn) {
        if (preloaderState.isPaused) {
            pauseBtn.innerHTML = '<i class="fas fa-play"></i> Reanudar';
            showPageAlert('Subida pausada', 'info');
        } else {
            pauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pausar';
            showPageAlert('Subida reanudada', 'info');
        }
    }
}

/**
 * Cancela la subida
 */
function cancelUpload(state) {
    if (!state || !confirm('¿Estás seguro de que quieres cancelar todas las subidas?')) return;
    
    preloaderState.isCancelled = true;
    state.files.forEach(file => {
        if (file.status === 'uploading' || file.status === 'pending') {
            file.status = 'failed';
            file.error = 'Subida cancelada por el usuario';
        }
    });
    
    showPageAlert('Subida cancelada', 'warning');
    updatePreloader(state);
    
    // Mostrar overlay de cancelación
    showStateOverlay('error', 'Subida cancelada', 
        'La subida ha sido cancelada por el usuario.', {
            buttons: [
                { text: 'Cerrar', icon: 'fas fa-times', action: 'close', type: 'secondary' },
                { text: 'Nueva subida', icon: 'fas fa-plus', action: 'newUpload', type: 'primary', state }
            ]
        });
}

/**
 * Muestra el preloader de subida (versión mejorada)
 */
export function showUploadPreloader(state) {
    console.log('🚀 Mostrando preloader avanzado');
    
    // Resetear bandera de resultados
    resultsShown = false;
    
    // Si ya existe, actualizarlo
    if (preloaderElement) {
        updatePreloader(state);
        return;
    }
    
    // Ocultar cualquier otro preloader existente primero
    hideAllOtherPreloaders();
    
    // Crear nuevo preloader
    preloaderElement = document.createElement('div');
    preloaderElement.id = 'documentUploadPreloader';
    preloaderElement.className = 'document-upload-preloader document-upload-preloader--uploading';
    
    // Inicializar estado
    preloaderState.isVisible = true;
    preloaderState.isMinimized = false;
    preloaderState.startTime = Date.now();
    preloaderState.totalSize = state.files.reduce((sum, file) => sum + file.file.size, 0);
    preloaderState.uploadedSize = 0;
    preloaderState.currentStrategy = DOM.uploadStrategy?.value || 'sequential';
    preloaderState.completedShown = false;
    preloaderState.isPaused = false;
    preloaderState.isCancelled = false;
    preloaderState.lastSpeedUpdate = 0;
    preloaderState.speedSamples = [];
    
    // Crear contenido
    preloaderElement.innerHTML = createPreloaderHTML();
    
    // Añadir al DOM
    document.body.appendChild(preloaderElement);
    
    // Configurar event listeners
    setupPreloaderListeners(state);
    
    // Actualizar contenido inicial
    updatePreloader(state);
    
    // Animación de entrada
    setTimeout(() => {
        preloaderElement.style.animation = 'preloaderSlideIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
    }, 10);
}

/**
 * Actualiza todo el preloader
 */
export function updatePreloader(state) {
    if (!preloaderElement || !state) return;
    
    // Verificar si la subida fue cancelada
    if (preloaderState.isCancelled) return;
    
    // Verificar si está pausado
    if (preloaderState.isPaused) return;
    
    // Actualizar lista de archivos
    updateFilesList(state);
    
    // Actualizar estadísticas
    updatePreloaderStats(state);
    
    // Actualizar estado del preloader
    updatePreloaderStateClass();
    
    // Actualizar tamaño subido
    updateUploadedSize(state);
    
    // Verificar si todo está completado
    checkUploadCompletion(state);
}

/**
 * Actualiza el tamaño total subido
 */
function updateUploadedSize(state) {
    const completedFiles = state.files.filter(f => f.status === 'completed');
    const uploadingFiles = state.files.filter(f => f.status === 'uploading');
    
    let uploadedSize = completedFiles.reduce((sum, file) => sum + file.file.size, 0);
    
    // Añadir progreso de archivos subiendo
    uploadingFiles.forEach(file => {
        const progress = file.progress || 0;
        uploadedSize += (file.file.size * progress) / 100;
    });
    
    preloaderState.uploadedSize = uploadedSize;
}

/**
 * Verifica si la subida está completa - VERSIÓN MODIFICADA (sin mostrar resultados)
 */
function checkUploadCompletion(state) {
    if (!state) return;
    
    const completed = state.files.filter(f => f.status === 'completed').length;
    const total = state.files.length;
    
    if (completed === total && total > 0 && !preloaderState.completedShown && !resultsShown) {
        preloaderState.completedShown = true;
        resultsShown = true; // Marcar que ya se mostraron resultados
        
        // MODIFICACIÓN: Ya no mostramos overlay de éxito con resultados
        // Simplemente actualizamos el preloader para mostrar "Completado"
        console.log('✅ Subida completada - Preloader actualizado sin mostrar resultados');
        
        // Ocultar preloader automáticamente después de 2 segundos
        setTimeout(() => {
            if (preloaderElement) {
                hideUploadPreloader();
            }
        }, 2000);
    }
}

/**
 * Oculta el preloader
 */
export function hideUploadPreloader() {
    if (!preloaderElement) return;
    
    console.log('👋 Ocultando preloader avanzado');
    
    // Animación de salida
    preloaderElement.style.animation = 'preloaderSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) reverse forwards';
    
    setTimeout(() => {
        if (preloaderElement && preloaderElement.parentNode) {
            preloaderElement.parentNode.removeChild(preloaderElement);
        }
        preloaderElement = null;
        preloaderState.isVisible = false;
        preloaderState.completedShown = false;
        resultsShown = false; // Resetear bandera
    }, 400);
}

/**
 * Actualiza el progreso de un archivo específico
 */
export function updateFileProgress(fileId, progress, state) {
    if (!preloaderElement || !state || preloaderState.isCancelled || preloaderState.isPaused) return;
    
    const file = state.files.find(f => f.id === fileId);
    if (!file) return;
    
    file.progress = progress;
    
    // Actualizar elemento específico si existe
    const fileElement = preloaderElement.querySelector(`[data-file-id="${fileId}"]`);
    if (fileElement) {
        const progressBar = fileElement.querySelector('.document-upload-preloader__file-progress-bar');
        const percentage = fileElement.querySelector('.document-upload-preloader__file-percentage');
        
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
        if (percentage) {
            percentage.textContent = `${progress}%`;
        }
    }
    
    // Actualizar estadísticas generales
    updatePreloader(state);
}

/**
 * Actualiza el estado de un archivo
 */
export function updateFileStatus(fileId, status, error = null, state) {
    if (!preloaderElement || !state || preloaderState.isCancelled) return;
    
    const file = state.files.find(f => f.id === fileId);
    if (!file) return;
    
    file.status = status;
    if (error) {
        file.error = error;
    }
    
    if (status === 'completed') {
        file.progress = 100;
    }
    
    // Actualizar elemento específico
    const fileElement = preloaderElement.querySelector(`[data-file-id="${fileId}"]`);
    if (fileElement) {
        // Actualizar clases
        fileElement.className = `document-upload-preloader__file document-upload-preloader__file--${status}`;
        
        // Actualizar icono de estado
        const statusIcon = fileElement.querySelector('.document-upload-preloader__file-status-icon');
        const statusText = fileElement.querySelector('.document-upload-preloader__file-status span');
        
        if (statusIcon) {
            statusIcon.className = `fas ${
                status === 'completed' ? 'fa-check-circle' :
                status === 'failed' ? 'fa-times-circle' :
                status === 'uploading' ? 'fa-spinner fa-spin' : 'fa-clock'
            } document-upload-preloader__file-status-icon`;
        }
        
        if (statusText) {
            statusText.textContent = {
                'completed': 'Completado',
                'failed': 'Fallido',
                'uploading': 'Subiendo',
                'pending': 'Pendiente'
            }[status] || status;
        }
        
        // Mostrar error si existe
        const errorContainer = fileElement.querySelector('.document-upload-preloader__file-error');
        if (error) {
            if (!errorContainer) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'document-upload-preloader__file-error';
                errorDiv.style.cssText = 'margin-top: 0.5rem; font-size: 0.75rem; color: var(--danger);';
                errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i>
                                      <span style="margin-left: 0.25rem;">${error}</span>`;
                
                const fileContent = fileElement.querySelector('.document-upload-preloader__file-content');
                if (fileContent) {
                    fileContent.appendChild(errorDiv);
                }
            } else {
                const errorSpan = errorContainer.querySelector('span');
                if (errorSpan) {
                    errorSpan.textContent = error;
                }
            }
        } else if (errorContainer) {
            errorContainer.remove();
        }
    }
    
    // Actualizar estadísticas generales
    updatePreloader(state);
}

/**
 * Muestra resultados detallados - FUNCIÓN ELIMINADA (ya no se usa)
 */
function showUploadResults(state) {
    // Esta función ha sido eliminada porque tienes otra funcionalidad para mostrar resultados
    console.log('📊 Función showUploadResults eliminada - Usar tu propia implementación de resultados');
}

/**
 * FIX CRÍTICO #5: Manejo principal de subida múltiple - VERSIÓN CORREGIDA
 */
export async function handleUploadMultipleDocuments() {
    console.group('📤📤📤 HANDLE UPLOAD MULTIPLE DOCUMENTS');
    
    // 1. Validar que no haya una subida en progreso
    if (isUploading) {
        console.warn('⚠️ Ya hay una subida en progreso');
        showPageAlert('⚠️ Ya hay una subida en progreso. Por favor espera.', 'warning');
        console.groupEnd();
        return;
    }
    
    // 2. Validar flujo de configuración
    const flowValidation = validateConfigFlow('upload');
    if (!flowValidation.isValid) {
        console.error('❌ Validación de flujo fallida');
        console.groupEnd();
        return;
    }
    
    const state = getMultipleUploadState();
    
    // 3. Validar que haya archivos
    if (state.files.length === 0) {
        console.error('❌ ERROR: No hay archivos para subir');
        showPageAlert('⚠️ Primero selecciona los archivos que deseas subir.', 'warning');
        console.groupEnd();
        return;
    }
    
    // 4. Marcar que estamos subiendo
    isUploading = true;
    state.isUploading = true;
    
    // 5. Actualizar controles para deshabilitar botón
    updateControlsState();
    
    try {
        // 6. Aplicar configuración del DOM una última vez
        console.log('\n🔄 APLICANDO CONFIGURACIÓN DEL DOM...');
        applyCommonSettingsToAllFiles(state);
        
        // 7. Preparar archivos para subida
        console.log('\n🔄 PREPARANDO ARCHIVOS PARA SUBIDA...');
        const preparedFiles = state.prepareFilesForUpload();
        
        console.log(`📦 ${preparedFiles.length} archivo(s) preparado(s) para subida`);
        showPageAlert(`📦 Preparando ${preparedFiles.length} archivo(s) para subida...`, 'info', 2000);
        
        // 8. MOSTRAR SOLO NUESTRO PRELOADER MEJORADO
        console.log('🎬 Mostrando preloader avanzado...');
        showUploadPreloader(state);
        
        // 9. Iniciar subida según estrategia
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
        
        // 10. Mostrar resultados SIEMPRE (corregido)
        console.log('📊 Resultados de subida:', result);
        
        // MODIFICACIÓN: Ya no llamamos a showUploadResults automáticamente
        // Los resultados se manejarán con tu otra funcionalidad
        
        // 11. Actualizar preloader final
        setTimeout(() => {
            updatePreloader(state);
        }, 500);
        
        // 12. Recargar documentos si hubo éxito
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
            
            // FIX: Ocultar preloader ANTES de resetear el estado
            if (preloaderElement) {
                setTimeout(() => {
                    hideUploadPreloader();
                }, 2000);
            }
            
            // FIX CRÍTICO: Resetear completamente después de subida exitosa
            console.log('\n🔄 RESETEANDO COMPLETAMENTE DESPUÉS DE SUBIDA EXITOSA');
            
            // 12.1 Resetear el estado
            state.reset();
            
            // 12.2 Resetear controles del DOM
            resetConfigControls();
            
            // 12.3 Actualizar UI
            if (typeof updateMultipleUploadUI === 'function') {
                updateMultipleUploadUI();
                console.log('✅ UI actualizada');
            }
            
            // 12.4 Resetear también cualquier archivo que haya quedado
            if (DOM.multipleFileInput) {
                DOM.multipleFileInput.value = '';
            }
            
            // 12.5 Resetear estado del flujo
            configFlowState.categorySelected = false;
            configFlowState.canSelectPerson = false;
            configFlowState.canSelectExpiration = false;
            configFlowState.canAddDocuments = false;
            
            // Mostrar mensaje de éxito final
            if (result.successCount === preparedFiles.length) {
                showPageAlert(`🎉 ¡Éxito! Todos los ${result.successCount} archivos se subieron correctamente. El modal ha sido limpiado para una nueva subida.`, 'success', 5000);
            } else {
                showPageAlert(`✅ ${result.successCount} de ${preparedFiles.length} archivos se subieron correctamente. El modal ha sido limpiado para una nueva subida.`, 'success', 5000);
            }
        } else {
            showPageAlert('❌ No se pudo subir ningún archivo. Revisa los errores.', 'error');
        }
        
        console.log('\n✅ SUBIDA MÚLTIPLE COMPLETADA');
        
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
        
        // Ocultar preloader en caso de error
        setTimeout(() => {
            hideUploadPreloader();
        }, 1000);
        
    } finally {
        // Finalizar estado - IMPORTANTE: Esto se ejecuta SIEMPRE
        isUploading = false;
        state.isUploading = false;
        
        // Actualizar controles para habilitar botón nuevamente
        updateControlsState();
        
        console.log('🔚 FINALIZANDO PROCESO DE SUBIDA');
        console.groupEnd();
    }
}

/**
 * Resetea los controles de configuración - VERSIÓN MEJORADA
 */
function resetConfigControls() {
    console.log('🔄 Reseteando controles de configuración (versión mejorada)');
    
    // Resetear estado del flujo
    configFlowState.categorySelected = false;
    configFlowState.canSelectPerson = false;
    configFlowState.canSelectExpiration = false;
    configFlowState.canAddDocuments = false;
    
    // Resetear valores del DOM
    if (DOM.multipleDocumentCategory) {
        DOM.multipleDocumentCategory.value = '';
        console.log('✅ Categoría reseteda');
    }
    if (DOM.multipleDocumentPerson) {
        DOM.multipleDocumentPerson.value = '';
        console.log('✅ Persona reseteda');
    }
    if (DOM.multipleExpirationDays) {
        DOM.multipleExpirationDays.value = '';
        console.log('✅ Fecha de expiración reseteda');
    }
    
    // FIX CRÍTICO: Limpiar el input de archivos
    if (DOM.multipleFileInput) {
        DOM.multipleFileInput.value = '';
        console.log('✅ Input de archivos limpiado completamente');
    }
    
    // FIX: Limpiar también cualquier otro input relacionado
    const allFileInputs = document.querySelectorAll('input[type="file"]');
    allFileInputs.forEach(input => {
        if (input.id && input.id.includes('multiple')) {
            input.value = '';
            console.log(`✅ Input ${input.id} limpiado`);
        }
    });
    
    // Actualizar controles
    updateControlsState();
    
    // Mostrar mensaje
    showPageAlert('🔄 Configuración completamente reseteada. Puedes comenzar un nuevo proceso.', 'info');
}

/**
 * Sube archivos de forma secuencial - VERSIÓN CORREGIDA
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
        // Verificar si está pausado
        while (preloaderState.isPaused && !preloaderState.isCancelled) {
            console.log('⏸️ Subida pausada...');
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Verificar si fue cancelado
        if (preloaderState.isCancelled) {
            console.log('🛑 Subida cancelada durante secuencial');
            break;
        }
        
        const preparedFile = preparedFiles[i];
        const fileObj = state.files.find(f => f.file.name === preparedFile.fileName);
        
        console.log(`\n📤 ARCHIVO ${i + 1}/${preparedFiles.length}: ${preparedFile.fileName}`);
        
        try {
            // Validación final
            if (!preparedFile.category || preparedFile.category.trim() === '') {
                console.error(`   ❌ ERROR: ${preparedFile.fileName} - NO TIENE CATEGORÍA`);
                
                if (fileObj) {
                    fileObj.status = 'failed';
                    fileObj.error = 'Falta categoría';
                    updateFileStatus(fileObj.id, 'failed', 'Falta categoría', state);
                }
                
                results.failureCount++;
                continue;
            }
            
            // Actualizar estado
            if (fileObj) {
                fileObj.status = 'uploading';
                fileObj.progress = 0;
                updateFileStatus(fileObj.id, 'uploading', null, state);
            }
            
            console.log('   🚀 Iniciando subida...');
            
            // Subir archivo
            const uploadSuccess = await uploadSingleFileWithProgress(preparedFile, fileObj, state);
            
            if (uploadSuccess) {
                results.successCount++;
                if (fileObj) {
                    fileObj.status = 'completed';
                    fileObj.progress = 100;
                    updateFileStatus(fileObj.id, 'completed', null, state);
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
            } else {
                results.failureCount++;
                if (fileObj) {
                    fileObj.status = 'failed';
                    fileObj.error = 'Error en la subida';
                    updateFileStatus(fileObj.id, 'failed', 'Error en la subida', state);
                }
                
                console.error(`   ❌ ${preparedFile.fileName} - ERROR EN SUBIDA`);
            }
            
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
                updateFileStatus(fileObj.id, 'failed', error.message, state);
            }
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
                if (e.lengthComputable && fileObj && !preloaderState.isPaused && !preloaderState.isCancelled) {
                    const percentComplete = Math.round((e.loaded / e.total) * 100);
                    updateFileProgress(fileObj.id, percentComplete, state);
                    
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
                            resolve(true);
                        } else {
                            console.error(`❌ ${preparedFile.fileName} - Error del servidor:`, response.message);
                            
                            if (fileObj) {
                                fileObj.error = response.message || 'Error del servidor';
                            }
                            resolve(false);
                        }
                    } catch (parseError) {
                        console.error(`❌ ${preparedFile.fileName} - Error parseando respuesta:`, parseError);
                        
                        if (fileObj) {
                            fileObj.error = 'Error en la respuesta';
                        }
                        resolve(false);
                    }
                } else {
                    console.error(`❌ ${preparedFile.fileName} - HTTP ${xhr.status}`);
                    
                    if (fileObj) {
                        fileObj.error = `Error HTTP ${xhr.status}`;
                    }
                    
                    resolve(false);
                }
                
                console.groupEnd();
            });
            
            xhr.addEventListener('error', () => {
                console.error(`❌ ${preparedFile.fileName} - Error de red`);
                
                if (fileObj) {
                    fileObj.error = 'Error de conexión';
                }
                
                console.groupEnd();
                resolve(false);
            });
            
            xhr.addEventListener('abort', () => {
                console.warn(`⚠️ ${preparedFile.fileName} - Cancelado`);
                
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
        // Verificar si está pausado
        while (preloaderState.isPaused && !preloaderState.isCancelled) {
            console.log('⏸️ Subida pausada...');
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Verificar si fue cancelado
        if (preloaderState.isCancelled) {
            console.log('🛑 Subida cancelada durante paralelo');
            break;
        }
        
        const preparedFile = preparedFiles[i];
        const fileObj = state.files.find(f => f.file.name === preparedFile.fileName);
        
        // Validación
        if (!preparedFile.category || preparedFile.category.trim() === '') {
            console.error(`❌ ERROR: ${preparedFile.fileName} - NO TIENE CATEGORÍA`);
            
            if (fileObj) {
                fileObj.status = 'failed';
                fileObj.error = 'Falta categoría';
                updateFileStatus(fileObj.id, 'failed', 'Falta categoría', state);
            }
            
            results.failureCount++;
            continue;
        }
        
        // Esperar slot
        while (activeUploads.size >= maxConcurrent) {
            console.log(`   ⏳ Esperando... (${activeUploads.size}/${maxConcurrent})`);
            await new Promise(resolve => setTimeout(resolve, 100));
            updatePreloader(state);
        }
        
        // Iniciar subida
        if (fileObj) {
            fileObj.status = 'uploading';
            fileObj.progress = 0;
            updateFileStatus(fileObj.id, 'uploading', null, state);
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
                        updateFileStatus(fileObj.id, 'completed', null, state);
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
                        updateFileStatus(fileObj.id, 'failed', 'Error en subida', state);
                    }
                    console.error(`❌ ${preparedFile.fileName} - FALLADO`);
                }
                
                if (fileObj) {
                    activeUploads.delete(fileObj.id);
                }
                return success;
            })
            .catch(error => {
                console.error(`❌ Error en ${preparedFile.fileName}:`, error);
                results.failureCount++;
                if (fileObj) {
                    fileObj.status = 'failed';
                    fileObj.error = error.message;
                    updateFileStatus(fileObj.id, 'failed', error.message, state);
                    activeUploads.delete(fileObj.id);
                }
                return false;
            });
        
        uploadPromises.push(uploadPromise);
    }
    
    // Esperar todas las subidas
    console.log(`⏳ Esperando ${uploadPromises.length} subidas...`);
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
        // Verificar si está pausado
        while (preloaderState.isPaused && !preloaderState.isCancelled) {
            console.log('⏸️ Subida pausada...');
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Verificar si fue cancelado
        if (preloaderState.isCancelled) {
            console.log('🛑 Subida cancelada durante lotes');
            break;
        }
        
        const batch = batches[batchIndex];
        console.log(`\n📤 PROCESANDO LOTE ${batchIndex + 1}/${batches.length}`);
        
        // Subir lote en paralelo
        const batchPromises = batch.map(preparedFile => {
            const fileObj = state.files.find(f => f.file.name === preparedFile.fileName);
            
            if (fileObj) {
                fileObj.status = 'uploading';
                fileObj.progress = 0;
                updateFileStatus(fileObj.id, 'uploading', null, state);
            }
            
            return uploadSingleFileWithProgress(preparedFile, fileObj, state)
                .then(success => {
                    if (success) {
                        results.successCount++;
                        if (fileObj) {
                            fileObj.status = 'completed';
                            fileObj.progress = 100;
                            updateFileStatus(fileObj.id, 'completed', null, state);
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
                            updateFileStatus(fileObj.id, 'failed', 'Error en subida', state);
                        }
                        console.error(`❌ ${preparedFile.fileName} - Fallado`);
                    }
                    return success;
                })
                .catch(error => {
                    console.error(`❌ Error en ${preparedFile.fileName}:`, error);
                    results.failureCount++;
                    if (fileObj) {
                        fileObj.status = 'failed';
                        fileObj.error = error.message;
                        updateFileStatus(fileObj.id, 'failed', error.message, state);
                    }
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
        updateFileStatus(file.id, 'pending', null, state);
    });
    
    updateMultipleUploadUI();
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
        console.log('⏳ Subiendo?', isUploading);
        
        // Mostrar alerta detallada
        const message = `
Estado del flujo:
• Categoría seleccionada: ${configFlowState.categorySelected ? '✅' : '❌'}
• Persona habilitada: ${configFlowState.canSelectPerson ? '✅' : '❌'}
• Expiración habilitada: ${configFlowState.canSelectExpiration ? '✅' : '❌'}
• Puede agregar archivos: ${configFlowState.canAddDocuments ? '✅' : '❌'}
• Subida en progreso: ${isUploading ? '⏳' : '✅'}
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
        console.log('⏳ Subiendo?', isUploading);
        
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
    
    window.cancelCurrentUpload = () => {
        console.log('🛑 CANCELANDO SUBIDA ACTUAL');
        if (isUploading) {
            preloaderState.isCancelled = true;
            isUploading = false;
            const state = getMultipleUploadState();
            state.isUploading = false;
            updateControlsState();
            showPageAlert('Subida cancelada manualmente', 'warning');
        } else {
            showPageAlert('No hay subida en progreso', 'info');
        }
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