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
let resultsShown = false;
let isUploading = false;

// Referencia al estado activo para el preloader (fix: acceso en overlays)
let _activeUploadState = null;

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
 * Muestra alerta en la página
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
 * Calcula la velocidad de subida
 */
function calculateUploadSpeed() {
    if (!preloaderState.startTime || preloaderState.uploadedSize === 0) return 0;
    const now = Date.now();
    if (now - preloaderState.lastSpeedUpdate < 500 && preloaderState.speedSamples.length > 0) {
        const sum = preloaderState.speedSamples.reduce((a, b) => a + b, 0);
        return sum / preloaderState.speedSamples.length;
    }
    preloaderState.lastSpeedUpdate = now;
    const elapsedTime = (now - preloaderState.startTime) / 1000;
    if (elapsedTime === 0) return 0;
    const currentSpeed = preloaderState.uploadedSize / elapsedTime;
    preloaderState.speedSamples.push(currentSpeed);
    if (preloaderState.speedSamples.length > 10) preloaderState.speedSamples.shift();
    const avgSpeed = preloaderState.speedSamples.reduce((a, b) => a + b, 0) / preloaderState.speedSamples.length;
    return avgSpeed;
}

/**
 * Formatea la velocidad de subida
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
    let decimals = 0;
    if (unitIndex === 1) decimals = 1;
    if (unitIndex >= 2) decimals = 2;
    return `${formattedSpeed.toFixed(decimals)} ${units[unitIndex]}`;
}

/**
 * Trunca el nombre del archivo
 */
function truncateFileName(name, maxLength) {
    if (name.length <= maxLength) return name;
    const extension = name.split('.').pop();
    const nameWithoutExt = name.slice(0, name.length - extension.length - 1);
    const truncateLength = maxLength - extension.length - 4;
    return nameWithoutExt.slice(0, Math.max(truncateLength, 10)) + '...' + extension;
}

/**
 * Actualiza el estado del flujo de configuración
 */
function updateConfigFlowState() {
    console.log('🔄 Actualizando estado del flujo de configuración');
    if (!DOM.multipleDocumentCategory) {
        console.warn('⚠️ DOM.multipleDocumentCategory no existe aún');
        return;
    }
    const categoryValue = DOM.multipleDocumentCategory.value;
    configFlowState.categorySelected = categoryValue && categoryValue.trim() !== '';
    configFlowState.canSelectPerson = configFlowState.categorySelected;
    configFlowState.canSelectExpiration = configFlowState.categorySelected;
    configFlowState.canAddDocuments = configFlowState.categorySelected;
    console.log('📊 Estado del flujo:', configFlowState);
    if (configFlowState.categorySelected) {
        showPageAlert('✅ Categoría seleccionada. Ahora puedes configurar persona, fecha y agregar archivos.', 'success', 3000);
    }
    updateControlsState();
}

/**
 * Actualiza el estado de los controles UI
 */
function updateControlsState() {
    console.log('🎛️ Actualizando estado de controles');
    if (DOM.multipleDocumentCategory) {
        DOM.multipleDocumentCategory.disabled = false;
        DOM.multipleDocumentCategory.style.opacity = '1';
        DOM.multipleDocumentCategory.style.cursor = 'pointer';
    }
    if (DOM.multipleDocumentPerson) {
        DOM.multipleDocumentPerson.disabled = !configFlowState.canSelectPerson;
        if (configFlowState.canSelectPerson) {
            DOM.multipleDocumentPerson.style.opacity = '1';
            DOM.multipleDocumentPerson.style.cursor = 'pointer';
            DOM.multipleDocumentPerson.title = 'Selecciona una persona (opcional)';
        } else {
            DOM.multipleDocumentPerson.style.opacity = '0.5';
            DOM.multipleDocumentPerson.style.cursor = 'not-allowed';
            DOM.multipleDocumentPerson.title = 'Primero selecciona una categoría';
        }
    }
    if (DOM.multipleExpirationDays) {
        DOM.multipleExpirationDays.disabled = !configFlowState.canSelectExpiration;
        if (configFlowState.canSelectExpiration) {
            DOM.multipleExpirationDays.style.opacity = '1';
            DOM.multipleExpirationDays.style.cursor = 'pointer';
            DOM.multipleExpirationDays.title = 'Selecciona días de vencimiento (opcional)';
        } else {
            DOM.multipleExpirationDays.style.opacity = '0.5';
            DOM.multipleExpirationDays.style.cursor = 'not-allowed';
            DOM.multipleExpirationDays.title = 'Primero selecciona una categoría';
        }
    }
    if (DOM.multipleFileInput) {
        DOM.multipleFileInput.disabled = !configFlowState.canAddDocuments;
        if (configFlowState.canAddDocuments) {
            DOM.multipleFileInput.style.opacity = '1';
            DOM.multipleFileInput.style.cursor = 'pointer';
            DOM.multipleFileInput.title = 'Haz clic para seleccionar archivos';
        } else {
            DOM.multipleFileInput.style.opacity = '0.5';
            DOM.multipleFileInput.style.cursor = 'not-allowed';
            DOM.multipleFileInput.title = 'Primero selecciona una categoría';
        }
    }
    if (DOM.uploadMultipleDocumentsBtn) {
        const hasFiles = multipleUploadState && multipleUploadState.files.length > 0;
        const shouldBeDisabled = !(configFlowState.canAddDocuments && hasFiles) || isUploading;
        DOM.uploadMultipleDocumentsBtn.disabled = shouldBeDisabled;
        if (DOM.uploadMultipleDocumentsBtn.disabled) {
            DOM.uploadMultipleDocumentsBtn.style.opacity = '0.5';
            DOM.uploadMultipleDocumentsBtn.style.cursor = 'not-allowed';
            if (isUploading) {
                DOM.uploadMultipleDocumentsBtn.title = 'Subida en progreso...';
            } else {
                DOM.uploadMultipleDocumentsBtn.title = hasFiles ? 'Selecciona categoría primero' : 'Agrega archivos primero';
            }
        } else {
            DOM.uploadMultipleDocumentsBtn.style.opacity = '1';
            DOM.uploadMultipleDocumentsBtn.style.cursor = 'pointer';
            DOM.uploadMultipleDocumentsBtn.title = 'Subir archivos';
        }
    }
    showConfigFlowMessage();
}

/**
 * Muestra mensajes informativos del flujo
 */
function showConfigFlowMessage() {
    const existingMessage = document.getElementById('configFlowMessage');
    if (existingMessage) existingMessage.remove();
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
    const configContainer = document.querySelector('.multiple-upload-config');
    if (configContainer) {
        configContainer.appendChild(messageContainer);
    } else {
        const uploadSection = document.querySelector('.upload-section');
        if (uploadSection) uploadSection.prepend(messageContainer);
    }
}

/**
 * Valida el flujo de configuración
 */
function validateConfigFlow(action = 'addFiles') {
    console.log(`🔍 Validando flujo para acción: ${action}`);
    const errors = [];
    if (!configFlowState.categorySelected) errors.push('Debes seleccionar una categoría primero');
    if (action === 'addFiles' && !configFlowState.canAddDocuments) errors.push('No puedes agregar archivos sin antes configurar la categoría');
    if (action === 'upload' && (!configFlowState.canAddDocuments || !multipleUploadState || multipleUploadState.files.length === 0)) errors.push('No hay archivos para subir o la configuración no está completa');
    if (action === 'upload' && isUploading) errors.push('Ya hay una subida en progreso. Por favor espera.');
    if (errors.length > 0) {
        console.error('❌ Errores de validación:', errors);
        showPageAlert(`⚠️ ${errors.join('\n• ')}`, 'warning');
        return { isValid: false, errors };
    }
    console.log('✅ Validación exitosa');
    return { isValid: true, errors: [] };
}

/**
 * Aplica configuración común a todos los archivos
 */
function applyCommonSettingsToAllFiles(state) {
    console.group('🔧 APLICANDO CONFIGURACIÓN COMÚN A TODOS LOS ARCHIVOS');

    const category = DOM.multipleDocumentCategory ? DOM.multipleDocumentCategory.value : '';
    const personValue = DOM.multipleDocumentPerson ? DOM.multipleDocumentPerson.value : '';
    const daysValue = DOM.multipleExpirationDays ? DOM.multipleExpirationDays.value : '';

    console.log('📊 VALORES DEL DOM:', { category, personValue, daysValue });

    if (!category || category.trim() === '') {
        console.error('❌ ERROR: Categoría vacía');
        showPageAlert('❌ La categoría es obligatoria.', 'error');
        console.groupEnd();
        return;
    }

    state.commonCategory = category.trim();
    console.log(`✅ Categoría común: "${state.commonCategory}"`);

    // Persona: si viene vacía, se asigna vacío (la validación está en documentModal)
    let processedPersonId = '';
    if (personValue && personValue.trim() !== '' && personValue !== 'null' && personValue !== 'undefined' && personValue !== '0') {
        processedPersonId = personValue.trim();
    }
    state.commonPersonId = processedPersonId;
    console.log(`👤 Persona común: "${state.commonPersonId || '(sin asignar)'}"`);

    if (daysValue && daysValue.trim() !== '' && !isNaN(parseInt(daysValue))) {
        state.expirationDays = parseInt(daysValue);
    } else {
        state.expirationDays = null;
    }

    let appliedCount = 0;
    state.files.forEach(fileObj => {
        if (fileObj.status === 'pending') {
            fileObj.customCategory = state.commonCategory;
            if (state.commonPersonId !== undefined) fileObj.customPersonId = state.commonPersonId;
            if (state.expirationDays) {
                const expirationDate = state.calculateExpirationDate(state.expirationDays);
                fileObj.customExpirationDate = expirationDate;
            }
            appliedCount++;
        }
    });

    if (appliedCount > 0) showPageAlert(`✅ Configuración aplicada a ${appliedCount} archivo(s)`, 'success', 2000);
    state.logState();
    console.groupEnd();
}

/**
 * Maneja múltiples archivos
 */
export function handleMultipleFiles(files) {
    console.group(`📁 handleMultipleFiles - Procesando ${files.length} archivo(s)`);
    const flowValidation = validateConfigFlow('addFiles');
    if (!flowValidation.isValid) {
        console.error('❌ Validación de flujo fallida');
        console.groupEnd();
        return 0;
    }
    const state = getMultipleUploadState();
    if (Number.isFinite(CONFIG.MAX_MULTIPLE_FILES) && CONFIG.MAX_MULTIPLE_FILES > 0) {
        if (files.length > CONFIG.MAX_MULTIPLE_FILES) {
            showPageAlert(`❌ Máximo ${CONFIG.MAX_MULTIPLE_FILES} archivos permitidos. Seleccionados: ${files.length}`, 'error');
            console.groupEnd();
            return 0;
        }
    }
    const addedCount = state.addFiles(files);
    if (addedCount > 0) {
        console.log(`✅ ${addedCount} archivo(s) agregado(s) al estado`);
        showPageAlert(`📁 ${addedCount} archivo(s) agregado(s) correctamente`, 'success');
    }
    applyCommonSettingsToAllFiles(state);
    if (typeof updateMultipleUploadUI === 'function') {
        console.log('🎨 Actualizando UI...');
        updateMultipleUploadUI();
    }
    updateControlsState();
    console.groupEnd();
    return addedCount;
}

/**
 * Handler para el input de múltiples archivos
 */
export function handleMultipleFileSelect(e) {
    console.log('📁 handleMultipleFileSelect - Archivos seleccionados:', e.target.files.length);
    if (e.target.files.length === 0) {
        showPageAlert('⚠️ No se seleccionaron archivos', 'info');
        return;
    }
    if (DOM.multipleFileInput && DOM.multipleFileInput.disabled) {
        showPageAlert('❌ Primero selecciona una categoría para habilitar la selección de archivos', 'warning');
        e.target.value = '';
        return;
    }
    const addedCount = handleMultipleFiles(Array.from(e.target.files));
    e.target.value = '';
}

/**
 * Actualiza configuración común desde DOM
 */
function updateCommonSettingsFromDOM(force = false) {
    console.group('⚙️ UPDATE COMMON SETTINGS FROM DOM');
    const state = getMultipleUploadState();
    updateConfigFlowState();
    if (state.files.length === 0) {
        console.warn('⚠️ No hay archivos para aplicar configuración');
        console.groupEnd();
        return;
    }
    applyCommonSettingsToAllFiles(state);
    if (typeof updateMultipleUploadUI === 'function') updateMultipleUploadUI();
    updateControlsState();
    console.groupEnd();
}

/**
 * Oculta todos los otros preloaders del sistema
 */
function hideAllOtherPreloaders() {
    console.log('🧹 Ocultando otros preloaders...');
    const progressContainer = document.getElementById('uploadProgressContainer');
    if (progressContainer) {
        progressContainer.style.display = 'none';
        progressContainer.remove();
    }
    const otherPreloaders = document.querySelectorAll('.upload-progress-container, .progress-container, [class*="preloader"], [class*="progress"]');
    otherPreloaders.forEach(el => {
        if (el.id !== 'documentUploadPreloader' && el.id !== 'uploadPreloaderContent' && !el.closest('#documentUploadPreloader')) {
            el.style.display = 'none';
        }
    });
    const existingOverlays = document.querySelectorAll('.modal-overlay, .overlay');
    existingOverlays.forEach(overlay => {
        if (!overlay.closest('#documentUploadPreloader')) overlay.remove();
    });
}

/**
 * Actualiza las estadísticas del preloader
 */
function updatePreloaderStats(state) {
    const completed = state.files.filter(f => f.status === 'completed').length;
    const uploading = state.files.filter(f => f.status === 'uploading').length;
    const failed = state.files.filter(f => f.status === 'failed').length;
    const total = state.files.length;
    const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
    preloaderState.uploadSpeed = calculateUploadSpeed();
    updatePreloaderDOM({ completed, uploading, failed, total, progressPercent });
}

/**
 * Actualiza el DOM del preloader
 */
function updatePreloaderDOM(stats) {
    if (!preloaderElement) return;
    const { completed, uploading, failed, total, progressPercent } = stats;

    // Porcentaje general
    const overallPercentage = preloaderElement.querySelector('.dup__overall-percentage');
    if (overallPercentage) overallPercentage.textContent = `${progressPercent}%`;

    // Barra de progreso
    const overallFill = preloaderElement.querySelector('.dup__overall-fill');
    if (overallFill) overallFill.style.width = `${progressPercent}%`;

    // Estadísticas
    const statValues = preloaderElement.querySelectorAll('.dup__stat-value');
    if (statValues.length >= 3) {
        statValues[0].textContent = completed;
        statValues[1].textContent = uploading;
        statValues[2].textContent = failed;
    }

    // Texto de estado
    const overallText = preloaderElement.querySelector('.dup__overall-label');
    if (overallText) {
        if (uploading > 0) overallText.textContent = `Subiendo ${uploading} archivo${uploading > 1 ? 's' : ''}...`;
        else if (completed === total && total > 0) overallText.textContent = '¡Completado!';
        else if (failed > 0 && completed === 0) overallText.textContent = 'Error en la subida';
        else overallText.textContent = 'En espera...';
    }

    // Stats de tiempo/velocidad
    const overallStats = preloaderElement.querySelector('.dup__meta-stats');
    if (overallStats) {
        const timeElapsed = preloaderState.startTime ? formatElapsedTime(preloaderState.startTime) : '00:00';
        const speedText = formatSpeed(preloaderState.uploadSpeed);
        overallStats.innerHTML = `
            <span><i class="fas fa-clock"></i> ${timeElapsed}</span>
            <span><i class="fas fa-tachometer-alt"></i> ${speedText}</span>
            <span><i class="fas fa-layer-group"></i> ${completed}/${total}</span>
        `;
    }

    // Título
    const titleText = preloaderElement.querySelector('.dup__title-text');
    if (titleText) {
        if (completed === total && total > 0) titleText.textContent = 'Subida Completada';
        else if (failed > 0 && completed === 0) titleText.textContent = 'Error en Subida';
        else titleText.textContent = `Subiendo Archivos`;
    }

    updatePreloaderStateClass();
}

/**
 * Actualiza la clase del preloader según estado
 */
function updatePreloaderStateClass() {
    if (!preloaderElement) return;
    preloaderElement.classList.remove('dup--completed', 'dup--error', 'dup--uploading');
    const statValues = preloaderElement.querySelectorAll('.dup__stat-value');
    if (statValues.length < 3) return;
    const completedCount = parseInt(statValues[0]?.textContent || 0);
    const uploadingCount = parseInt(statValues[1]?.textContent || 0);
    const failedCount = parseInt(statValues[2]?.textContent || 0);
    if (uploadingCount > 0) preloaderElement.classList.add('dup--uploading');
    else if (failedCount > 0 && completedCount === 0) preloaderElement.classList.add('dup--error');
    else if (completedCount > 0 && uploadingCount === 0) preloaderElement.classList.add('dup--completed');
}

/**
 * Crea o actualiza la lista de archivos en el preloader
 */
function updateFilesList(state) {
    if (!preloaderElement) return;
    const content = preloaderElement.querySelector('.dup__files-list');
    if (!content) return;
    const sortedFiles = [...state.files].sort((a, b) => {
        const order = { 'uploading': 0, 'pending': 1, 'completed': 2, 'failed': 3 };
        return order[a.status] - order[b.status];
    });
    if (sortedFiles.length === 0) {
        content.innerHTML = `
            <div class="dup__empty">
                <i class="fas fa-cloud-upload-alt dup__empty-icon"></i>
                <p class="dup__empty-title">Sin archivos</p>
                <p class="dup__empty-msg">Selecciona archivos para comenzar</p>
            </div>
        `;
        return;
    }
    content.innerHTML = sortedFiles.map(file => createFileItemHTML(file)).join('');
}

/**
 * Crea el HTML para un item de archivo
 */
function createFileItemHTML(file) {
    const icon = getFileIcon(file.file.name);
    const size = formatFileSize(file.file.size);
    const progress = file.progress || 0;
    const metaItems = [];
    if (file.customCategory) {
        metaItems.push(`<span class="dup__file-tag"><i class="fas fa-tag"></i>${file.customCategory}</span>`);
    }
    if (file.customPersonId) {
        metaItems.push(`<span class="dup__file-tag"><i class="fas fa-user"></i>${file.customPersonId}</span>`);
    }
    if (file.customExpirationDate) {
        const date = new Date(file.customExpirationDate);
        metaItems.push(`<span class="dup__file-tag"><i class="fas fa-calendar-alt"></i>${date.toLocaleDateString()}</span>`);
    }
    const statusConfig = {
        'completed': { icon: 'fa-check-circle', label: 'Completado', cls: 'dup__file-status--success' },
        'failed': { icon: 'fa-times-circle', label: 'Fallido', cls: 'dup__file-status--error' },
        'uploading': { icon: 'fa-spinner fa-spin', label: 'Subiendo', cls: 'dup__file-status--uploading' },
        'pending': { icon: 'fa-clock', label: 'Pendiente', cls: 'dup__file-status--pending' }
    };
    const sc = statusConfig[file.status] || statusConfig['pending'];
    return `
        <div class="dup__file dup__file--${file.status}" data-file-id="${file.id}">
            <div class="dup__file-icon">
                <i class="fas fa-${icon}"></i>
            </div>
            <div class="dup__file-body">
                <div class="dup__file-row">
                    <span class="dup__file-name" title="${file.file.name}">${truncateFileName(file.file.name, 32)}</span>
                    <span class="dup__file-size">${size}</span>
                </div>
                <div class="dup__file-progress-row">
                    <div class="dup__file-track">
                        <div class="dup__file-bar" style="width:${progress}%"></div>
                    </div>
                    <span class="dup__file-pct">${progress}%</span>
                </div>
                ${metaItems.length > 0 ? `<div class="dup__file-tags">${metaItems.join('')}</div>` : ''}
                <div class="dup__file-status ${sc.cls}">
                    <i class="fas ${sc.icon}"></i>
                    <span>${sc.label}</span>
                </div>
                ${file.error ? `
                    <div class="dup__file-error">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>${file.error}</span>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

/**
 * Muestra un overlay de confirmación/estado dentro del preloader
 * FIX: ahora recibe 'state' directamente y lo usa en todos los botones
 */
function showStateOverlay(type, title, message, options = {}) {
    if (!preloaderElement) return;
    const existingOverlay = preloaderElement.querySelector('.dup__overlay');
    if (existingOverlay) existingOverlay.remove();

    // Asegurarnos de tener el state actual
    const currentState = options.state || _activeUploadState || getMultipleUploadState();

    const overlay = document.createElement('div');
    overlay.className = `dup__overlay dup__overlay--${type}`;
    const iconMap = { success: 'check-circle', error: 'times-circle', warning: 'exclamation-triangle', info: 'info-circle' };
    let buttonsHTML = '';
    if (options.buttons) {
        buttonsHTML = `<div class="dup__overlay-btns">
            ${options.buttons.map(btn => `
                <button class="dup__overlay-btn dup__overlay-btn--${btn.type || 'secondary'}" data-action="${btn.action || ''}">
                    ${btn.icon ? `<i class="${btn.icon}"></i>` : ''}
                    <span>${btn.text}</span>
                </button>
            `).join('')}
        </div>`;
    }
    overlay.innerHTML = `
        <div class="dup__overlay-card">
            <div class="dup__overlay-icon dup__overlay-icon--${type}">
                <i class="fas fa-${iconMap[type] || 'info-circle'}"></i>
            </div>
            <h3 class="dup__overlay-title">${title}</h3>
            <p class="dup__overlay-msg">${message}</p>
            ${buttonsHTML}
        </div>
    `;
    preloaderElement.appendChild(overlay);

    // Event listeners con state garantizado
    setTimeout(() => {
        overlay.querySelectorAll('button[data-action]').forEach(button => {
            button.addEventListener('click', () => {
                const action = button.getAttribute('data-action');
                // FIX CRÍTICO: pasamos el state al handler
                handleOverlayAction(action, currentState);
                // Solo removemos el overlay si la acción no oculta el preloader
                if (action !== 'newUpload' && action !== 'close') {
                    if (overlay.parentNode === preloaderElement) overlay.remove();
                }
            });
        });
    }, 50);

    if (options.autoHide === true) {
        setTimeout(() => {
            if (overlay.parentNode === preloaderElement) overlay.remove();
        }, options.autoHideDuration || 3000);
    }
}

/**
 * HTML del preloader rediseñado
 */
function createPreloaderHTML() {
    return `
        <div class="dup__header">
            <div class="dup__title">
                <div class="dup__title-pulse"></div>
                <i class="fas fa-cloud-upload-alt dup__title-icon"></i>
                <span class="dup__title-text">Subiendo Archivos</span>
            </div>
            <div class="dup__header-actions">
                <button class="dup__btn dup__btn--minimize" title="Minimizar" data-action="minimize">
                    <i class="fas fa-chevron-down"></i>
                </button>
                <button class="dup__btn dup__btn--close" title="Cerrar" data-action="close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>

        <div class="dup__progress-section">
            <div class="dup__progress-header">
                <span class="dup__overall-label">Iniciando...</span>
                <span class="dup__overall-percentage">0%</span>
            </div>
            <div class="dup__overall-track">
                <div class="dup__overall-fill"></div>
                <div class="dup__overall-glow"></div>
            </div>
            <div class="dup__meta-stats">
                <span><i class="fas fa-clock"></i> 00:00</span>
                <span><i class="fas fa-tachometer-alt"></i> 0 B/s</span>
                <span><i class="fas fa-layer-group"></i> 0/0</span>
            </div>
        </div>

        <div class="dup__stats-row">
            <div class="dup__stat dup__stat--success">
                <div class="dup__stat-icon-wrap"><i class="fas fa-check-circle"></i></div>
                <div class="dup__stat-value">0</div>
                <div class="dup__stat-label">Completados</div>
            </div>
            <div class="dup__stat dup__stat--active">
                <div class="dup__stat-icon-wrap"><i class="fas fa-spinner fa-spin"></i></div>
                <div class="dup__stat-value">0</div>
                <div class="dup__stat-label">Activos</div>
            </div>
            <div class="dup__stat dup__stat--error">
                <div class="dup__stat-icon-wrap"><i class="fas fa-times-circle"></i></div>
                <div class="dup__stat-value">0</div>
                <div class="dup__stat-label">Fallidos</div>
            </div>
        </div>

        <div class="dup__files-list">
            <!-- Archivos dinámicos -->
        </div>

        <div class="dup__footer">
            <button class="dup__action-btn dup__action-btn--pause" data-action="pause">
                <i class="fas fa-pause"></i>
                <span>Pausar</span>
            </button>
            <button class="dup__action-btn dup__action-btn--cancel" data-action="cancel">
                <i class="fas fa-stop"></i>
                <span>Cancelar</span>
            </button>
        </div>
    `;
}

/**
 * Configura los listeners del preloader
 * FIX: El botón X en modo minimizado expande primero, no lanza overlay
 */
function setupPreloaderListeners(state) {
    if (!preloaderElement) return;

    preloaderElement.querySelectorAll('[data-action]').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = e.currentTarget.getAttribute('data-action');

            // FIX CRÍTICO: Si está minimizado y se pulsa la X, primero expandir
            if (preloaderState.isMinimized && action === 'close') {
                toggleMinimize(); // Expandir primero
                setTimeout(() => showCloseConfirmationOverlay(state), 300);
                return;
            }

            // Si está minimizado y se pulsa minimizar (que ahora actúa de expandir)
            if (preloaderState.isMinimized && action === 'minimize') {
                toggleMinimize();
                return;
            }

            handlePreloaderAction(action, state);
        });
    });

    // Click en el header (pero no en botones) para toggle minimizar
    const header = preloaderElement.querySelector('.dup__header');
    if (header) {
        header.addEventListener('click', (e) => {
            if (e.target.closest('[data-action]')) return;
            toggleMinimize();
        });
    }

    // Escape para cerrar
    const escHandler = (e) => {
        if (e.key === 'Escape' && preloaderState.isVisible) {
            if (preloaderState.isMinimized) {
                toggleMinimize();
                setTimeout(() => showCloseConfirmationOverlay(state), 300);
            } else {
                showCloseConfirmationOverlay(state);
            }
        }
    };
    document.addEventListener('keydown', escHandler);
    // Guardamos referencia para limpieza
    preloaderElement._escHandler = escHandler;
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
            showCloseConfirmationOverlay(state);
            break;
        case 'pause':
            togglePause(state);
            break;
        case 'cancel':
            showCancelConfirmationOverlay(state);
            break;
    }
}

/**
 * Overlay de confirmación para cerrar
 */
function showCloseConfirmationOverlay(state) {
    if (!preloaderElement) return;
    const existingOverlay = preloaderElement.querySelector('.dup__overlay');
    if (existingOverlay) existingOverlay.remove();
    const overlay = document.createElement('div');
    overlay.className = 'dup__overlay dup__overlay--warning';
    overlay.innerHTML = `
        <div class="dup__overlay-card">
            <div class="dup__overlay-icon dup__overlay-icon--warning">
                <i class="fas fa-eye-slash"></i>
            </div>
            <h3 class="dup__overlay-title">¿Ocultar panel?</h3>
            <p class="dup__overlay-msg">La subida continuará en segundo plano. El panel se puede reabrir desde el botón de subida.</p>
            <div class="dup__overlay-btns">
                <button class="dup__overlay-btn dup__overlay-btn--secondary" data-close-action="no">
                    <i class="fas fa-arrow-left"></i>
                    <span>Seguir viendo</span>
                </button>
                <button class="dup__overlay-btn dup__overlay-btn--primary" data-close-action="yes">
                    <i class="fas fa-check"></i>
                    <span>Ocultar</span>
                </button>
            </div>
        </div>
    `;
    preloaderElement.appendChild(overlay);
    const noBtn = overlay.querySelector('[data-close-action="no"]');
    const yesBtn = overlay.querySelector('[data-close-action="yes"]');
    if (noBtn) noBtn.addEventListener('click', () => overlay.remove());
    if (yesBtn) yesBtn.addEventListener('click', () => {
        overlay.remove();
        hideUploadPreloader();
        showPageAlert('📋 Panel ocultado. La subida continúa en segundo plano.', 'info', 3000);
    });
}

/**
 * Overlay de confirmación para cancelar
 */
function showCancelConfirmationOverlay(state) {
    if (!preloaderElement) return;
    const existingOverlay = preloaderElement.querySelector('.dup__overlay');
    if (existingOverlay) existingOverlay.remove();
    const overlay = document.createElement('div');
    overlay.className = 'dup__overlay dup__overlay--warning';
    overlay.innerHTML = `
        <div class="dup__overlay-card">
            <div class="dup__overlay-icon dup__overlay-icon--warning">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h3 class="dup__overlay-title">¿Cancelar subida?</h3>
            <p class="dup__overlay-msg">Los archivos ya subidos se conservan. Los que estén en cola serán cancelados.</p>
            <div class="dup__overlay-btns">
                <button class="dup__overlay-btn dup__overlay-btn--secondary" data-cancel-action="no">
                    <i class="fas fa-arrow-left"></i>
                    <span>Seguir subiendo</span>
                </button>
                <button class="dup__overlay-btn dup__overlay-btn--danger" data-cancel-action="yes">
                    <i class="fas fa-stop"></i>
                    <span>Cancelar todo</span>
                </button>
            </div>
        </div>
    `;
    preloaderElement.appendChild(overlay);
    const noBtn = overlay.querySelector('[data-cancel-action="no"]');
    const yesBtn = overlay.querySelector('[data-cancel-action="yes"]');
    if (noBtn) noBtn.addEventListener('click', () => {
        overlay.remove();
        showPageAlert('Subida reanudada', 'info');
    });
    if (yesBtn) yesBtn.addEventListener('click', () => {
        overlay.remove();
        executeCancelUpload(state);
    });
}

/**
 * Ejecuta la cancelación de subida
 * FIX: showStateOverlay recibe state directamente para que "Nueva Subida" funcione
 */
function executeCancelUpload(state) {
    if (!state) return;
    preloaderState.isCancelled = true;
    preloaderState.isPaused = false;
    state.files.forEach(file => {
        if (file.status === 'uploading' || file.status === 'pending') {
            file.status = 'failed';
            file.error = 'Cancelado por el usuario';
        }
    });
    state.isUploading = false;
    isUploading = false;
    showPageAlert('Subida cancelada', 'warning');
    updatePreloader(state);

    // FIX CRÍTICO: pasamos state en options para que handleOverlayAction lo reciba
    showStateOverlay('error', 'Subida Cancelada',
        'La subida ha sido detenida. Los archivos ya enviados se conservaron.',
        {
            state: state, // <-- FIX: state explícito en options
            buttons: [
                { text: 'Cerrar panel', icon: 'fas fa-times', action: 'close', type: 'secondary' },
                { text: 'Nueva subida', icon: 'fas fa-plus', action: 'newUpload', type: 'primary' }
            ],
            autoHide: false
        }
    );
}

/**
 * Maneja las acciones de los overlays
 * FIX: recibe state y lo usa correctamente
 */
function handleOverlayAction(action, state) {
    // Asegurar que siempre tengamos el state correcto
    const currentState = state || _activeUploadState || getMultipleUploadState();

    switch (action) {
        case 'close':
            hideUploadPreloader();
            break;
        case 'retry':
            if (currentState) retryFailedUploads(currentState);
            break;
        case 'newUpload':
            // FIX CRÍTICO: reset completo y funcional
            console.log('🔄 Nueva subida - Reseteando todo el estado');
            if (currentState) {
                currentState.reset();
            }
            // Resetear variables globales
            isUploading = false;
            preloaderState.isCancelled = false;
            preloaderState.isPaused = false;
            preloaderState.completedShown = false;
            resultsShown = false;
            _activeUploadState = null;

            // Resetear controles del DOM
            resetConfigControls();

            // Actualizar UI del modal
            if (typeof updateMultipleUploadUI === 'function') updateMultipleUploadUI();

            // Limpiar input de archivos
            if (DOM.multipleFileInput) DOM.multipleFileInput.value = '';

            // Ocultar preloader
            hideUploadPreloader();

            showPageAlert('🔄 Listo para una nueva subida. Selecciona archivos nuevamente.', 'success', 3000);
            break;
    }
}

/**
 * Alterna el estado minimizado
 */
function toggleMinimize() {
    if (!preloaderElement) return;
    preloaderState.isMinimized = !preloaderState.isMinimized;
    if (preloaderState.isMinimized) {
        preloaderElement.classList.add('dup--minimized');
        const minimizeBtn = preloaderElement.querySelector('.dup__btn--minimize i');
        if (minimizeBtn) minimizeBtn.className = 'fas fa-chevron-up';
    } else {
        preloaderElement.classList.remove('dup--minimized');
        const minimizeBtn = preloaderElement.querySelector('.dup__btn--minimize i');
        if (minimizeBtn) minimizeBtn.className = 'fas fa-chevron-down';
    }
}

/**
 * Alterna el estado de pausa
 */
function togglePause(state) {
    if (!state) return;
    preloaderState.isPaused = !preloaderState.isPaused;
    const pauseBtn = preloaderElement?.querySelector('[data-action="pause"]');
    if (pauseBtn) {
        if (preloaderState.isPaused) {
            pauseBtn.innerHTML = '<i class="fas fa-play"></i><span>Reanudar</span>';
            pauseBtn.classList.add('dup__action-btn--paused');
            showPageAlert('Subida pausada', 'info');
        } else {
            pauseBtn.innerHTML = '<i class="fas fa-pause"></i><span>Pausar</span>';
            pauseBtn.classList.remove('dup__action-btn--paused');
            showPageAlert('Subida reanudada', 'info');
        }
    }
}

/**
 * Muestra el preloader de subida
 */
export function showUploadPreloader(state) {
    console.log('🚀 Mostrando preloader avanzado');
    resultsShown = false;
    _activeUploadState = state; // FIX: guardar referencia global al state

    if (preloaderElement) {
        updatePreloader(state);
        return;
    }

    hideAllOtherPreloaders();

    preloaderElement = document.createElement('div');
    preloaderElement.id = 'documentUploadPreloader';
    preloaderElement.className = 'dup dup--uploading';

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

    preloaderElement.innerHTML = createPreloaderHTML();
    document.body.appendChild(preloaderElement);
    setupPreloaderListeners(state);
    updatePreloader(state);

    // Animación de entrada
    requestAnimationFrame(() => {
        preloaderElement.style.animation = 'dupSlideIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
    });
}

/**
 * Actualiza todo el preloader
 */
export function updatePreloader(state) {
    if (!preloaderElement || !state) return;
    if (preloaderState.isCancelled) return;
    if (preloaderState.isPaused) return;
    updateFilesList(state);
    updatePreloaderStats(state);
    updatePreloaderStateClass();
    updateUploadedSize(state);
    checkUploadCompletion(state);
}

/**
 * Actualiza el tamaño total subido
 */
function updateUploadedSize(state) {
    const completedFiles = state.files.filter(f => f.status === 'completed');
    const uploadingFiles = state.files.filter(f => f.status === 'uploading');
    let uploadedSize = completedFiles.reduce((sum, file) => sum + file.file.size, 0);
    uploadingFiles.forEach(file => {
        const progress = file.progress || 0;
        uploadedSize += (file.file.size * progress) / 100;
    });
    preloaderState.uploadedSize = uploadedSize;
}

/**
 * Verifica si la subida está completa
 */
function checkUploadCompletion(state) {
    if (!state) return;
    const completed = state.files.filter(f => f.status === 'completed').length;
    const total = state.files.length;
    if (completed === total && total > 0 && !preloaderState.completedShown && !resultsShown) {
        preloaderState.completedShown = true;
        resultsShown = true;
        console.log('✅ Subida completada');
        setTimeout(() => {
            if (preloaderElement) hideUploadPreloader();
        }, 2000);
    }
}

/**
 * Oculta el preloader
 */
export function hideUploadPreloader() {
    if (!preloaderElement) return;
    console.log('👋 Ocultando preloader');

    // Limpiar el handler de escape
    if (preloaderElement._escHandler) {
        document.removeEventListener('keydown', preloaderElement._escHandler);
    }

    preloaderElement.style.animation = 'dupSlideIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) reverse forwards';
    setTimeout(() => {
        if (preloaderElement && preloaderElement.parentNode) {
            preloaderElement.parentNode.removeChild(preloaderElement);
        }
        preloaderElement = null;
        preloaderState.isVisible = false;
        preloaderState.completedShown = false;
        resultsShown = false;
    }, 380);
}

/**
 * Actualiza el progreso de un archivo específico
 */
export function updateFileProgress(fileId, progress, state) {
    if (!preloaderElement || !state || preloaderState.isCancelled || preloaderState.isPaused) return;
    const file = state.files.find(f => f.id === fileId);
    if (!file) return;
    file.progress = progress;
    const fileElement = preloaderElement.querySelector(`[data-file-id="${fileId}"]`);
    if (fileElement) {
        const progressBar = fileElement.querySelector('.dup__file-bar');
        const percentage = fileElement.querySelector('.dup__file-pct');
        if (progressBar) progressBar.style.width = `${progress}%`;
        if (percentage) percentage.textContent = `${progress}%`;
    }
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
    if (error) file.error = error;
    if (status === 'completed') file.progress = 100;
    const fileElement = preloaderElement.querySelector(`[data-file-id="${fileId}"]`);
    if (fileElement) {
        fileElement.className = `dup__file dup__file--${status}`;
        const statusIconEl = fileElement.querySelector('.dup__file-status i');
        const statusTextEl = fileElement.querySelector('.dup__file-status span');
        const statusConfig = {
            'completed': { icon: 'fa-check-circle', label: 'Completado', cls: 'dup__file-status--success' },
            'failed': { icon: 'fa-times-circle', label: 'Fallido', cls: 'dup__file-status--error' },
            'uploading': { icon: 'fa-spinner fa-spin', label: 'Subiendo', cls: 'dup__file-status--uploading' },
            'pending': { icon: 'fa-clock', label: 'Pendiente', cls: 'dup__file-status--pending' }
        };
        const sc = statusConfig[status] || statusConfig['pending'];
        const statusDiv = fileElement.querySelector('.dup__file-status');
        if (statusDiv) {
            statusDiv.className = `dup__file-status ${sc.cls}`;
        }
        if (statusIconEl) statusIconEl.className = `fas ${sc.icon}`;
        if (statusTextEl) statusTextEl.textContent = sc.label;

        // Actualizar/mostrar error
        const existingError = fileElement.querySelector('.dup__file-error');
        if (error) {
            if (!existingError) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'dup__file-error';
                errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i><span>${error}</span>`;
                fileElement.querySelector('.dup__file-body')?.appendChild(errorDiv);
            } else {
                const errorSpan = existingError.querySelector('span');
                if (errorSpan) errorSpan.textContent = error;
            }
        } else if (existingError) {
            existingError.remove();
        }
    }
    updatePreloader(state);
}

/**
 * Manejo principal de subida múltiple
 */
export async function handleUploadMultipleDocuments() {
    console.group('📤📤📤 HANDLE UPLOAD MULTIPLE DOCUMENTS');

    // ✅ VALIDAR PERSONA OBLIGATORIA (única alerta)
    const personInput = document.getElementById('multipleDocumentPerson');
    const personId = personInput ? personInput.value : '';
    if (!personId || personId.trim() === '') {
        showPageAlert('Debes asignar los documentos a una persona', 'warning');
        console.groupEnd();
        return;
    }

    if (isUploading) {
        console.warn('⚠️ Ya hay una subida en progreso');
        showPageAlert('⚠️ Ya hay una subida en progreso. Por favor espera.', 'warning');
        console.groupEnd();
        return;
    }

    const state = getMultipleUploadState();

    if (state.files.length === 0) {
        console.error('❌ ERROR: No hay archivos para subir');
        showPageAlert('⚠️ Primero selecciona los archivos que deseas subir.', 'warning');
        console.groupEnd();
        return;
    }

    // ✅ Validar categoría (sin duplicar alertas - documentModal ya valida persona)
    const categoryInput = document.getElementById('multipleDocumentCategory');
    const category = categoryInput ? categoryInput.value : '';
    if (!category || category.trim() === '') {
        showPageAlert('❌ Debes seleccionar una categoría', 'error');
        console.groupEnd();
        return;
    }

    isUploading = true;
    state.isUploading = true;
    _activeUploadState = state;
    updateControlsState();

    try {
        console.log('\n🔄 APLICANDO CONFIGURACIÓN DEL DOM...');
        applyCommonSettingsToAllFiles(state);

        console.log('\n🔄 PREPARANDO ARCHIVOS PARA SUBIDA...');
        const preparedFiles = state.prepareFilesForUpload();
        console.log(`📦 ${preparedFiles.length} archivo(s) preparado(s) para subida`);
        showPageAlert(`📦 Preparando ${preparedFiles.length} archivo(s) para subida...`, 'info', 2000);

        // ✅ CERRAR MODAL ANTES DEL PRELOADER
        console.log('🎬 Cerrando modal...');
        if (typeof window.closeDocumentModal === 'function') {
            window.closeDocumentModal();
        }
        await new Promise(resolve => setTimeout(resolve, 200));

        console.log('🎬 Mostrando preloader avanzado...');
        showUploadPreloader(state);

        const strategy = DOM.uploadStrategy ? DOM.uploadStrategy.value : 'sequential';
        console.log(`\n🔄 INICIANDO SUBIDA CON ESTRATEGIA: ${strategy}`);
        showPageAlert(`🔄 Iniciando subida (${strategy}) de ${preparedFiles.length} archivo(s)...`, 'info', 2000);

        let result;
        switch (strategy) {
            case 'sequential': result = await uploadSequentially(state, preparedFiles); break;
            case 'parallel': result = await uploadInParallel(state, preparedFiles); break;
            case 'batch': result = await uploadInBatches(state, preparedFiles); break;
            default: result = await uploadSequentially(state, preparedFiles);
        }

        console.log('📊 Resultados de subida:', result);
        setTimeout(() => { updatePreloader(state); }, 500);

        if (result.successCount > 0) {
            console.log('\n🔄 RECARGANDO DOCUMENTOS...');

            // ✅ UNA SOLA ALERTA DE ÉXITO
            if (result.successCount === preparedFiles.length) {
                showPageAlert(`🎉 ¡Éxito! Todos los ${result.successCount} archivos se subieron correctamente.`, 'success', 5000);
            } else {
                showPageAlert(`✅ ${result.successCount} de ${preparedFiles.length} archivos subidos correctamente.`, 'success', 5000);
            }

            window.dispatchEvent(new CustomEvent('documentsUploaded', {
                detail: { count: result.successCount, files: result.uploadedFiles }
            }));

            // ✅ Refrescar documentos
            if (window.refreshDocumentsView) {
                await window.refreshDocumentsView({ reloadCategories: true, refreshFilters: true });
            } else {
                if (window.loadDocuments) await window.loadDocuments();
                if (typeof window.loadCategories === 'function') {
                    try { await window.loadCategories(); } catch (e) { }
                }
                if (typeof window.refreshCategoryTree === 'function') {
                    try { window.refreshCategoryTree(); } catch (e) { }
                }
            }

            if (preloaderElement) {
                setTimeout(() => hideUploadPreloader(), 2000);
            }

            state.reset();
            resetConfigControls();
            if (typeof updateMultipleUploadUI === 'function') updateMultipleUploadUI();
            if (DOM.multipleFileInput) DOM.multipleFileInput.value = '';

            configFlowState.categorySelected = false;
            configFlowState.canSelectPerson = false;
            configFlowState.canSelectExpiration = false;
            configFlowState.canAddDocuments = false;

        } else {
            showPageAlert('❌ No se pudo subir ningún archivo. Revisa los errores.', 'error');
        }

        console.log('\n✅ SUBIDA MÚLTIPLE COMPLETADA');

    } catch (error) {
        console.error('❌ ERROR EN SUBIDA MÚLTIPLE:', error);
        showPageAlert('Error en subida múltiple: ' + error.message, 'error');
        setTimeout(() => hideUploadPreloader(), 1000);
    } finally {
        isUploading = false;
        state.isUploading = false;
        updateControlsState();
        console.log('🔚 FINALIZANDO PROCESO DE SUBIDA');
        console.groupEnd();
    }
}

/**
 * Resetea los controles de configuración
 */
function resetConfigControls() {
    console.log('🔄 Reseteando controles de configuración');
    configFlowState.categorySelected = false;
    configFlowState.canSelectPerson = false;
    configFlowState.canSelectExpiration = false;
    configFlowState.canAddDocuments = false;
    if (DOM.multipleDocumentCategory) DOM.multipleDocumentCategory.value = '';
    if (DOM.multipleDocumentPerson) DOM.multipleDocumentPerson.value = '';
    if (DOM.multipleExpirationDays) DOM.multipleExpirationDays.value = '';
    if (DOM.multipleFileInput) DOM.multipleFileInput.value = '';
    const allFileInputs = document.querySelectorAll('input[type="file"]');
    allFileInputs.forEach(input => {
        if (input.id && input.id.includes('multiple')) input.value = '';
    });
    updateControlsState();
    showPageAlert('🔄 Configuración completamente reseteada.', 'info');
}

/**
 * Sube archivos de forma secuencial
 */
async function uploadSequentially(state, preparedFiles) {
    console.group('🔀 UPLOAD SEQUENTIALLY');
    const results = { successCount: 0, failureCount: 0, totalTime: 0, uploadedFiles: [] };
    const startTime = Date.now();
    for (let i = 0; i < preparedFiles.length; i++) {
        while (preloaderState.isPaused && !preloaderState.isCancelled) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        if (preloaderState.isCancelled) break;
        const preparedFile = preparedFiles[i];
        const fileObj = state.files.find(f => f.file.name === preparedFile.fileName);
        try {
            if (!preparedFile.category || preparedFile.category.trim() === '') {
                console.error(`❌ ${preparedFile.fileName} - SIN CATEGORÍA`);
                if (fileObj) { fileObj.status = 'failed'; fileObj.error = 'Falta categoría'; updateFileStatus(fileObj.id, 'failed', 'Falta categoría', state); }
                results.failureCount++;
                continue;
            }
            if (fileObj) { fileObj.status = 'uploading'; fileObj.progress = 0; updateFileStatus(fileObj.id, 'uploading', null, state); }
            const uploadSuccess = await uploadSingleFileWithProgress(preparedFile, fileObj, state);
            if (uploadSuccess) {
                results.successCount++;
                if (fileObj) { fileObj.status = 'completed'; fileObj.progress = 100; updateFileStatus(fileObj.id, 'completed', null, state); }
                results.uploadedFiles.push({ name: preparedFile.fileName, size: preparedFile.fileSize, category: preparedFile.category, personId: preparedFile.personId, expirationDate: preparedFile.expirationDate, description: preparedFile.description });
            } else {
                results.failureCount++;
                if (fileObj) { fileObj.status = 'failed'; fileObj.error = 'Error en la subida'; updateFileStatus(fileObj.id, 'failed', 'Error en la subida', state); }
            }
            if (i < preparedFiles.length - 1) {
                await new Promise(resolve => setTimeout(resolve, MULTIPLE_UPLOAD_CONFIG.DELAY_BETWEEN_FILES));
            }
        } catch (error) {
            console.error(`❌ ERROR en archivo ${preparedFile.fileName}:`, error);
            results.failureCount++;
            if (fileObj) { fileObj.status = 'failed'; fileObj.error = error.message; updateFileStatus(fileObj.id, 'failed', error.message, state); }
        }
    }
    results.totalTime = Date.now() - startTime;
    console.groupEnd();
    return results;
}

/**
 * Subida individual de archivo con progreso
 */
async function uploadSingleFileWithProgress(preparedFile, fileObj, state) {
    return new Promise(async (resolve, reject) => {
        console.group(`📤 UPLOAD SINGLE FILE: ${preparedFile.fileName}`);
        try {
            if (!preparedFile.category || preparedFile.category.trim() === '') {
                console.error('❌ ERROR: Categoría VACÍA - ABORTANDO');
                if (fileObj) fileObj.error = 'Categoría no definida';
                console.groupEnd();
                resolve(false);
                return;
            }
            const formData = new FormData();
            formData.append('file', preparedFile.file);
            formData.append('descripcion', preparedFile.description || '');
            formData.append('categoria', preparedFile.category);
            let personaIdValue = '';
            if (preparedFile.personId && preparedFile.personId.trim() !== '' && preparedFile.personId !== 'null' && preparedFile.personId !== 'undefined') {
                personaIdValue = preparedFile.personId.trim();
            }
            formData.append('persona_id', personaIdValue);
            let fechaVencimientoValue = '';
            if (preparedFile.expirationDate && preparedFile.expirationDate !== 'null' && preparedFile.expirationDate !== 'undefined') {
                try {
                    const dateObj = new Date(preparedFile.expirationDate);
                    if (!isNaN(dateObj.getTime())) fechaVencimientoValue = dateObj.toISOString().split('T')[0];
                } catch (e) { }
            }
            formData.append('fecha_vencimiento', fechaVencimientoValue);
            const xhr = new XMLHttpRequest();
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable && fileObj && !preloaderState.isPaused && !preloaderState.isCancelled) {
                    const percentComplete = Math.round((e.loaded / e.total) * 100);
                    updateFileProgress(fileObj.id, percentComplete, state);
                }
            });
            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        if (response.success) { console.log(`✅ ${preparedFile.fileName} - EXITOSA`); resolve(true); }
                        else {
                            if (fileObj) fileObj.error = response.message || 'Error del servidor';
                            resolve(false);
                        }
                    } catch (parseError) {
                        if (fileObj) fileObj.error = 'Error en la respuesta';
                        resolve(false);
                    }
                } else {
                    if (fileObj) fileObj.error = `Error HTTP ${xhr.status}`;
                    resolve(false);
                }
                console.groupEnd();
            });
            xhr.addEventListener('error', () => {
                if (fileObj) fileObj.error = 'Error de conexión';
                console.groupEnd();
                resolve(false);
            });
            xhr.addEventListener('abort', () => {
                if (fileObj) fileObj.error = 'Cancelado por el usuario';
                console.groupEnd();
                resolve(false);
            });
            const url = `${CONFIG.API_BASE_URL}/documents`;
            xhr.open('POST', url);
            xhr.setRequestHeader('Accept', 'application/json');
            xhr.send(formData);
        } catch (error) {
            if (fileObj) fileObj.error = error.message;
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
    const maxConcurrent = MULTIPLE_UPLOAD_CONFIG.MAX_CONCURRENT_UPLOADS;
    const results = { successCount: 0, failureCount: 0, totalTime: 0, uploadedFiles: [] };
    const startTime = Date.now();
    const uploadPromises = [];
    const activeUploads = new Set();
    for (let i = 0; i < preparedFiles.length; i++) {
        while (preloaderState.isPaused && !preloaderState.isCancelled) await new Promise(resolve => setTimeout(resolve, 500));
        if (preloaderState.isCancelled) break;
        const preparedFile = preparedFiles[i];
        const fileObj = state.files.find(f => f.file.name === preparedFile.fileName);
        if (!preparedFile.category || preparedFile.category.trim() === '') {
            if (fileObj) { fileObj.status = 'failed'; fileObj.error = 'Falta categoría'; updateFileStatus(fileObj.id, 'failed', 'Falta categoría', state); }
            results.failureCount++;
            continue;
        }
        while (activeUploads.size >= maxConcurrent) {
            await new Promise(resolve => setTimeout(resolve, 100));
            updatePreloader(state);
        }
        if (fileObj) { fileObj.status = 'uploading'; fileObj.progress = 0; updateFileStatus(fileObj.id, 'uploading', null, state); activeUploads.add(fileObj.id); }
        const uploadPromise = uploadSingleFileWithProgress(preparedFile, fileObj, state)
            .then(success => {
                if (success) {
                    results.successCount++;
                    if (fileObj) { fileObj.status = 'completed'; fileObj.progress = 100; updateFileStatus(fileObj.id, 'completed', null, state); }
                    results.uploadedFiles.push({ name: preparedFile.fileName, size: preparedFile.fileSize, category: preparedFile.category, personId: preparedFile.personId, expirationDate: preparedFile.expirationDate });
                } else {
                    results.failureCount++;
                    if (fileObj) { fileObj.status = 'failed'; fileObj.error = 'Error en subida'; updateFileStatus(fileObj.id, 'failed', 'Error en subida', state); }
                }
                if (fileObj) activeUploads.delete(fileObj.id);
                return success;
            })
            .catch(error => {
                results.failureCount++;
                if (fileObj) { fileObj.status = 'failed'; fileObj.error = error.message; updateFileStatus(fileObj.id, 'failed', error.message, state); activeUploads.delete(fileObj.id); }
                return false;
            });
        uploadPromises.push(uploadPromise);
    }
    await Promise.all(uploadPromises);
    results.totalTime = Date.now() - startTime;
    console.groupEnd();
    return results;
}

/**
 * Sube archivos por lotes
 */
async function uploadInBatches(state, preparedFiles) {
    console.group('📦 UPLOAD IN BATCHES');
    const batchSize = MULTIPLE_UPLOAD_CONFIG.BATCH_SIZE;
    const delayBetween = MULTIPLE_UPLOAD_CONFIG.DELAY_BETWEEN_BATCHES;
    const results = { successCount: 0, failureCount: 0, totalTime: 0, uploadedFiles: [] };
    const startTime = Date.now();
    const batches = [];
    for (let i = 0; i < preparedFiles.length; i += batchSize) batches.push(preparedFiles.slice(i, i + batchSize));
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        while (preloaderState.isPaused && !preloaderState.isCancelled) await new Promise(resolve => setTimeout(resolve, 500));
        if (preloaderState.isCancelled) break;
        const batch = batches[batchIndex];
        const batchPromises = batch.map(preparedFile => {
            const fileObj = state.files.find(f => f.file.name === preparedFile.fileName);
            if (fileObj) { fileObj.status = 'uploading'; fileObj.progress = 0; updateFileStatus(fileObj.id, 'uploading', null, state); }
            return uploadSingleFileWithProgress(preparedFile, fileObj, state)
                .then(success => {
                    if (success) {
                        results.successCount++;
                        if (fileObj) { fileObj.status = 'completed'; fileObj.progress = 100; updateFileStatus(fileObj.id, 'completed', null, state); }
                        results.uploadedFiles.push({ name: preparedFile.fileName, size: preparedFile.fileSize, category: preparedFile.category });
                    } else {
                        results.failureCount++;
                        if (fileObj) { fileObj.status = 'failed'; fileObj.error = 'Error en subida'; updateFileStatus(fileObj.id, 'failed', 'Error en subida', state); }
                    }
                    return success;
                })
                .catch(error => {
                    results.failureCount++;
                    if (fileObj) { fileObj.status = 'failed'; fileObj.error = error.message; updateFileStatus(fileObj.id, 'failed', error.message, state); }
                    return false;
                });
        });
        await Promise.all(batchPromises);
        if (batchIndex < batches.length - 1) await new Promise(resolve => setTimeout(resolve, delayBetween));
    }
    results.totalTime = Date.now() - startTime;
    console.groupEnd();
    return results;
}

/**
 * Reintenta archivos fallidos
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
 * Configura listeners
 */
export function setupMultipleUploadListeners() {
    console.log('🔧 CONFIGURANDO LISTENERS');
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => initializeUploadSystem());
    } else {
        initializeUploadSystem();
    }
}

/**
 * Inicializa el sistema de subida
 */
function initializeUploadSystem() {
    console.log('🚀 INICIALIZANDO SISTEMA DE SUBIDA MÚLTIPLE');
    if (!DOM.multipleDocumentCategory || !DOM.multipleDocumentPerson || !DOM.multipleExpirationDays) {
        console.error('❌ Elementos DOM no encontrados. Reintentando...');
        setTimeout(initializeUploadSystem, 1000);
        return;
    }
    updateConfigFlowState();
    showPageAlert('📋 Proceso de subida múltiple: 1) Categoría → 2) Opciones → 3) Archivos → 4) Subir', 'info', 5000);
    setupEventListeners();
}

/**
 * Configura todos los event listeners
 */
function setupEventListeners() {
    console.log('🔧 CONFIGURANDO EVENT LISTENERS');
    if (DOM.multipleFileInput) DOM.multipleFileInput.addEventListener('change', handleMultipleFileSelect);
    if (DOM.uploadMultipleDocumentsBtn) DOM.uploadMultipleDocumentsBtn.addEventListener('click', handleUploadMultipleDocuments);
    if (DOM.multipleDocumentCategory) {
        DOM.multipleDocumentCategory.addEventListener('change', () => {
            updateConfigFlowState();
            updateCommonSettingsFromDOM(true);
        });
    }
    if (DOM.multipleDocumentPerson) {
        DOM.multipleDocumentPerson.addEventListener('change', () => {
            if (!configFlowState.canSelectPerson) {
                DOM.multipleDocumentPerson.value = '';
                showPageAlert('⚠️ Primero selecciona una categoría', 'warning');
                return;
            }
            updateConfigFlowState();
            updateCommonSettingsFromDOM(true);
        });
        DOM.multipleDocumentPerson.addEventListener('click', (e) => {
            if (!configFlowState.canSelectPerson) {
                e.preventDefault();
                showPageAlert('⚠️ Primero selecciona una categoría para habilitar persona', 'warning');
            }
        });
    }
    if (DOM.multipleExpirationDays) {
        DOM.multipleExpirationDays.addEventListener('change', () => {
            if (!configFlowState.canSelectExpiration) {
                DOM.multipleExpirationDays.value = '';
                showPageAlert('⚠️ Primero selecciona una categoría', 'warning');
                return;
            }
            updateConfigFlowState();
            updateCommonSettingsFromDOM(true);
        });
        DOM.multipleExpirationDays.addEventListener('click', (e) => {
            if (!configFlowState.canSelectExpiration) {
                e.preventDefault();
                showPageAlert('⚠️ Primero selecciona una categoría para habilitar fecha de vencimiento', 'warning');
            }
        });
    }
    if (DOM.uploadStrategy) {
        DOM.uploadStrategy.addEventListener('change', () => {
            updateConfigFlowState();
            updateCommonSettingsFromDOM(true);
        });
    }
    if (DOM.autoGenerateDescriptions) {
        DOM.autoGenerateDescriptions.addEventListener('change', () => {
            updateConfigFlowState();
            updateCommonSettingsFromDOM(true);
        });
    }
    if (DOM.notifyPerson) {
        DOM.notifyPerson.addEventListener('change', () => {
            updateConfigFlowState();
            updateCommonSettingsFromDOM(true);
        });
    }
    const resetBtn = document.getElementById('resetMultipleUpload');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            const state = getMultipleUploadState();
            state.reset();
            resetConfigControls();
            updateMultipleUploadUI();
            showPageAlert('🔄 Configuración reseteada', 'info');
        });
    }
    if (DOM.multipleFileInput) {
        DOM.multipleFileInput.addEventListener('click', (e) => {
            if (DOM.multipleFileInput.disabled) {
                e.preventDefault();
                showPageAlert('⚠️ Primero selecciona una categoría', 'warning');
            }
        });
    }
    console.log('✅ TODOS LOS LISTENERS CONFIGURADOS');
}

// ===== DEBUG UTILS =====
if (typeof window !== 'undefined') {
    window.testUploadFlow = () => {
        const message = `Estado del flujo:\n• Categoría: ${configFlowState.categorySelected ? '✅' : '❌'}\n• Persona: ${configFlowState.canSelectPerson ? '✅' : '❌'}\n• Expiración: ${configFlowState.canSelectExpiration ? '✅' : '❌'}\n• Archivos: ${multipleUploadState ? multipleUploadState.files.length : 0}\n• Subiendo: ${isUploading ? '⏳' : '✅'}`;
        showPageAlert(message, 'info', 8000);
    };
    window.debugUploadState = () => {
        const state = getMultipleUploadState();
        console.group('🐛 DEBUG UPLOAD STATE');
        console.log('📊 FLOW STATE:', configFlowState);
        console.log('📊 Archivos:', state.files.length);
        console.log('🏷️ Categoría común:', state.commonCategory);
        console.log('👤 Persona común:', state.commonPersonId || '(vacía)');
        console.log('📅 Días expiración:', state.expirationDays);
        console.log('⏳ Subiendo?', isUploading);
        console.groupEnd();
    };
    window.forceApplySettings = () => {
        const state = getMultipleUploadState();
        applyCommonSettingsToAllFiles(state);
        updateMultipleUploadUI();
        showPageAlert('🔧 Configuración forzada aplicada', 'info');
    };
    window.resetUploadFlow = () => {
        resetConfigControls();
        showPageAlert('🔄 Flujo de subida reseteado', 'info');
    };
    window.cancelCurrentUpload = () => {
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

console.log('📦 MÓDULO uploadMultiple.js CARGADO');
if (typeof window !== 'undefined') {
    setTimeout(() => setupMultipleUploadListeners(), 100);
}