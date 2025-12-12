// =============================================================================
// src/frontend/modules/documentos/upload/uploadMultiple.js
// =============================================================================

import { DOM } from '../../../dom.js';
import { CONFIG } from '../../../config.js';
import { showAlert, formatFileSize } from '../../../utils.js';
import { MultipleUploadState } from '../core/MultipleUploadState.js';
import { updateMultipleUploadUI } from '../index.js';
import { showUploadProgressContainer, hideUploadProgressContainer } from './progressManager.js';
import { MULTIPLE_UPLOAD_CONFIG } from '../core/constants.js';

// Instancia global del estado de subida múltiple
export let multipleUploadState = null;

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
 * Muestra el preloader de subida
 */
function showUploadPreloader(state) {
    console.log('🎬 Mostrando preloader de subida');
    
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
            <!-- Se llenará dinámicamente -->
        </div>
        <div class="document-upload-preloader__stats">
            <span id="uploadStatsCurrent">0</span> / 
            <span id="uploadStatsTotal">${state.files.length}</span> archivos
            <span id="uploadStatsSpeed" style="margin-left: auto; font-size: 0.75rem;"></span>
        </div>
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
        
        showAlert('Subida cancelada', 'warning');
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
    
    // Filtrar archivos para mostrar (solo los que están subiendo o tienen estado)
    const filesToShow = state.files.filter(f => 
        f.status === 'uploading' || f.status === 'completed' || f.status === 'failed'
    );
    
    if (filesToShow.length === 0) {
        content.innerHTML = `
            <div class="preloader__text">
                <i class="fas fa-hourglass-half"></i>
                <p>Preparando archivos para subir...</p>
            </div>
        `;
        return;
    }
    
    content.innerHTML = filesToShow.map(fileObj => `
        <div class="document-upload-preloader__file file-status--${fileObj.status}">
            <div class="document-upload-preloader__file-icon">
                <i class="fas fa-file-${getFileIconClass(fileObj.file)}"></i>
            </div>
            <div class="document-upload-preloader__file-info">
                <div class="document-upload-preloader__file-name" title="${fileObj.file.name}">
                    ${truncateFileName(fileObj.file.name, 30)}
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
                        <small>${fileObj.error}</small>
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
        speed.textContent = '';
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
    const preloader = document.getElementById('documentUploadPreloader');
    if (preloader) {
        console.log('🎬 Ocultando preloader de subida');
        preloader.style.animation = 'slideOutDown 0.3s ease forwards';
        setTimeout(() => {
            if (preloader.parentNode) {
                preloader.parentNode.removeChild(preloader);
            }
        }, 300);
    }
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
        'rar': 'archive'
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
    return nameWithoutExt.slice(0, truncateLength) + '...' + extension;
}

/**
 * Maneja la selección de múltiples archivos.
 * Valida cantidad máxima y agrega archivos al estado.
 * @param {File[]} files - Array de archivos seleccionados
 */
export function handleMultipleFiles(files) {
    console.group(`📁 handleMultipleFiles - Procesando ${files.length} archivo(s)`);
    
    const state = getMultipleUploadState();
    
    // Mostrar estado actual antes de agregar
    console.log('📊 Estado ANTES de agregar archivos:', {
        filesCount: state.files.length,
        commonCategory: state.commonCategory,
        commonPersonId: state.commonPersonId,
        expirationDays: state.expirationDays,
        DOMCategory: DOM.multipleDocumentCategory ? DOM.multipleDocumentCategory.value : 'NO DISPONIBLE',
        DOMPerson: DOM.multipleDocumentPerson ? DOM.multipleDocumentPerson.value : 'NO DISPONIBLE',
        DOMExpiration: DOM.multipleExpirationDays ? DOM.multipleExpirationDays.value : 'NO DISPONIBLE'
    });
    
    // Validar cantidad máxima
    if (files.length > CONFIG.MAX_MULTIPLE_FILES) {
        showAlert(`Máximo ${CONFIG.MAX_MULTIPLE_FILES} archivos permitidos. Seleccionados: ${files.length}`, 'error');
        console.groupEnd();
        return;
    }
    
    // CRÍTICO: Actualizar estado con valores actuales del DOM ANTES de agregar archivos
    console.log('🔄 Actualizando configuración común ANTES de agregar archivos...');
    updateCommonSettings(true); // true = modo forzado
    
    // Agregar archivos al estado
    const addedCount = state.addFiles(files);
    
    // FIX CRÍTICO: Aplicar configuración común inmediatamente a todos los archivos nuevos
console.log('🔄 Aplicando configuración común a archivos nuevos...');
// Verificar si el método existe antes de llamarlo
if (typeof state.applyCommonSettingsToAllFiles === 'function') {
    state.applyCommonSettingsToAllFiles();
} else {
    console.error('❌ ERROR: applyCommonSettingsToAllFiles no existe en state');
    console.log('🔄 Usando lógica alternativa...');
    // Lógica alternativa si el método no existe
    state.files.forEach(fileObj => {
        if (fileObj.status === 'pending') {
            if (!fileObj.customCategory || fileObj.customCategory.trim() === '') {
                fileObj.customCategory = state.commonCategory;
            }
            if (!fileObj.customPersonId || fileObj.customPersonId.trim() === '') {
                fileObj.customPersonId = state.commonPersonId;
            }
            if (!fileObj.customExpirationDate && state.expirationDays) {
                fileObj.customExpirationDate = state.calculateExpirationDate(state.expirationDays);
            }
        }
    });
}
    
    // Mostrar estado después de agregar
    console.log('📊 Estado DESPUÉS de agregar archivos:');
    state.logState();
    
    // Verificar categorías
    const categoryCheck = state.checkCategories();
    console.log('🔍 Verificación de categorías:', categoryCheck);
    
    // Verificar personas
    const personCheck = state.checkPersons();
    console.log('🔍 Verificación de personas:', personCheck);
    
    // Verificar fechas de vencimiento
    const expirationCheck = state.checkExpirations();
    console.log('🔍 Verificación de fechas de vencimiento:', expirationCheck);
    
    // Actualizar UI
    if (typeof updateMultipleUploadUI === 'function') {
        console.log('🎨 Actualizando UI...');
        updateMultipleUploadUI();
    }
    
    // Habilitar botón de subida si hay archivos
    if (state.files.length > 0 && DOM.uploadMultipleDocumentsBtn) {
        DOM.uploadMultipleDocumentsBtn.disabled = false;
        const uploadCount = DOM.uploadMultipleDocumentsBtn.querySelector('#uploadCount');
        if (uploadCount) {
            uploadCount.textContent = state.files.length;
            uploadCount.style.display = 'inline-block';
        }
        console.log('🔼 Botón de subida habilitado');
    }
    
    console.log(`✅ ${addedCount} archivo(s) procesado(s) de ${files.length} seleccionados`);
    console.groupEnd();
}

/**
 * Handler para el input de múltiples archivos.
 * @param {Event} e - Evento del input file múltiple
 */
export function handleMultipleFileSelect(e) {
    console.log('📁 handleMultipleFileSelect - Archivos seleccionados:', e.target.files.length);
    handleMultipleFiles(Array.from(e.target.files));
    
    // Resetear input para permitir seleccionar los mismos archivos otra vez
    e.target.value = '';
}

/**
 * Actualiza la configuración común desde los controles de la UI.
 * @param {boolean} force - Si es true, fuerza la actualización incluso si los valores parecen iguales
 */
function updateCommonSettings(force = false) {
    console.group('⚙️ ACTUALIZANDO CONFIGURACIÓN COMÚN');
    
    const state = getMultipleUploadState();
    
    console.log('📊 Estado ANTES de actualizar:', {
        commonCategory: state.commonCategory,
        commonPersonId: state.commonPersonId,
        expirationDays: state.expirationDays
    });
    
    // Actualizar categoría común
    if (DOM.multipleDocumentCategory) {
        const category = DOM.multipleDocumentCategory.value;
        console.log(`🏷️ Categoría del select: "${category}"`);
        
        // Solo actualizar si es diferente o si force=true
        if (force || category !== state.commonCategory) {
            if (category && category.trim() !== '') {
                state.setCommonCategory(category);
                console.log(`✅ Categoría común actualizada: "${category}"`);
            } else {
                console.warn('⚠️ Categoría vacía o no seleccionada');
                state.commonCategory = '';
            }
        } else {
            console.log(`🔄 Categoría sin cambios: "${category}"`);
        }
    } else {
        console.error('❌ DOM.multipleDocumentCategory no encontrado');
    }
    
    // Actualizar persona común - FIX CRÍTICO: Validación mejorada
    if (DOM.multipleDocumentPerson) {
        const personId = DOM.multipleDocumentPerson.value;
        console.log(`👤 Persona del select (raw value): "${personId}" (tipo: ${typeof personId})`);
        
        // Validación robusta del valor
        const isValidPersonId = personId && 
                               personId.trim() !== '' && 
                               personId !== 'null' && 
                               personId !== 'undefined' && 
                               personId !== '0';
        
        // Solo actualizar si es diferente o si force=true
        if (force || personId !== state.commonPersonId) {
            if (isValidPersonId) {
                state.setCommonPersonId(personId);
                console.log(`✅ Persona común actualizada: "${personId}"`);
            } else {
                console.log('👤 Persona común: NO CONFIGURADA (valor vacío o inválido)');
                state.commonPersonId = '';
            }
        } else {
            console.log(`🔄 Persona sin cambios: "${personId}"`);
        }
    } else {
        console.warn('⚠️ DOM.multipleDocumentPerson no encontrado');
    }
    
    // Actualizar días de expiración - FIX CRÍTICO: Conversión a número
    if (DOM.multipleExpirationDays) {
        const daysValue = DOM.multipleExpirationDays.value;
        console.log(`📅 Valor de días de expiración del DOM: "${daysValue}" (tipo: ${typeof daysValue})`);
        
        // Convertir a número para comparación consistente
        const daysNum = daysValue ? parseInt(daysValue, 10) : null;
        
        // Solo actualizar si es diferente o si force=true
        if (force || daysNum !== state.expirationDays) {
            if (daysNum !== null && !isNaN(daysNum) && daysNum > 0) {
                state.setExpirationDays(daysNum);
                console.log(`✅ Días de expiración actualizados: "${daysNum}"`);
            } else {
                console.log('📅 Días de expiración: NO CONFIGURADOS o inválidos');
                state.expirationDays = null;
            }
        } else {
            console.log(`🔄 Días de expiración sin cambios: "${daysNum}"`);
        }
    } else {
        console.warn('⚠️ DOM.multipleExpirationDays no encontrado');
    }
    
    // Actualizar estrategia
    if (DOM.uploadStrategy) {
        state.uploadStrategy = DOM.uploadStrategy.value;
        console.log(`🔄 Estrategia: ${state.uploadStrategy}`);
    }
    
    // Actualizar opciones avanzadas
    if (DOM.autoGenerateDescriptions) {
        state.autoGenerateDescriptions = DOM.autoGenerateDescriptions.checked;
        console.log(`🤖 Auto-generar descripciones: ${state.autoGenerateDescriptions}`);
    }
    
    if (DOM.notifyPerson) {
        state.notifyPerson = DOM.notifyPerson.checked;
        console.log(`🔔 Notificar persona: ${state.notifyPerson}`);
    }
    
    // Verificar estado después de actualizar
    console.log('📊 Estado DESPUÉS de actualizar:', {
        commonCategory: state.commonCategory,
        commonPersonId: state.commonPersonId,
        expirationDays: state.expirationDays,
        autoGenerateDescriptions: state.autoGenerateDescriptions,
        notifyPerson: state.notifyPerson
    });
    
    // FIX CRÍTICO: Aplicar inmediatamente a todos los archivos pendientes
    if (state.files.length > 0) {
        console.log('🔄 Aplicando configuración común a todos los archivos pendientes...');
        state.applyCommonSettingsToAllFiles();
    }
    
    // Actualizar UI después de aplicar configuración
    if (typeof updateMultipleUploadUI === 'function') {
        updateMultipleUploadUI();
    }
    
    console.groupEnd();
}

/**
 * Maneja la subida múltiple de documentos.
 * Coordina la subida según la estrategia seleccionada y muestra progreso.
 */
export async function handleUploadMultipleDocuments() {
    console.group('📤📤📤 INICIANDO SUBIDA MÚLTIPLE DE DOCUMENTOS');
    
    const state = getMultipleUploadState();
    
    // Mostrar estado inicial completo
    console.log('📊 ESTADO INICIAL COMPLETO:');
    state.logState();
    
    // FIX CRÍTICO: Validar que todos los archivos tengan configuración aplicada
    console.log('🔍 Verificando configuración de archivos antes de subir...');
    state.files.forEach((fileObj, index) => {
        console.log(`📄 Archivo ${index + 1}: ${fileObj.file.name}`, {
            categoria: fileObj.customCategory || fileObj.commonCategory,
            persona: fileObj.customPersonId || fileObj.commonPersonId,
            expiracion: fileObj.customExpirationDate || state.getEffectiveExpirationDate(fileObj),
            estado: fileObj.status
        });
    });
    
    try {
        // 1. Actualizar configuración común (forzada)
        console.log('🔄 Paso 1: Actualizando configuración común...');
        updateCommonSettings(true); // Forzar actualización
        
        // 2. Aplicar configuración común a todos los archivos
        console.log('🔄 Paso 2: Aplicando configuración común a todos los archivos...');
        state.applyCommonSettingsToAllFiles();
        
        // 3. Validar antes de empezar
        console.log('🔍 Paso 3: Validando todos los archivos...');
        const isValid = state.validateAllFiles();
        console.log(`✅ Resultado de validación: ${isValid}`);
        
        if (!isValid) {
            console.error('❌ Validación fallida - ABORTANDO');
            showAlert('Hay errores en los archivos seleccionados. Por favor corrige los errores antes de continuar.', 'error');
            console.groupEnd();
            return;
        }
        
        console.log('🚀 Validación exitosa - Iniciando subida múltiple...');
        
        // 4. Configurar estado
        state.isUploading = true;
        
        // 5. Mostrar preloader de subida
        showUploadPreloader(state);
        
        // 6. Mostrar contenedor de progreso (si se usa)
        showUploadProgressContainer();
        
        // 7. Obtener archivos preparados para subida
        console.log('📦 Paso 7: Preparando archivos para subida...');
        const preparedFiles = state.prepareFilesForUpload();
        console.log(`📤 ${preparedFiles.length} archivo(s) preparado(s) para subida`);
        
        // FIX CRÍTICO: Verificar que todos los archivos preparados tengan los datos correctos
        preparedFiles.forEach((preparedFile, index) => {
            console.log(`✅ Archivo ${index + 1} preparado: ${preparedFile.fileName}`, {
                categoria: preparedFile.category,
                personaId: preparedFile.personId,
                expirationDate: preparedFile.expirationDate,
                tieneCategoria: !!preparedFile.category,
                tienePersona: !!preparedFile.personId,
                tieneExpiracion: !!preparedFile.expirationDate
            });
        });
        
        // 8. Iniciar subida según estrategia
        const strategy = DOM.uploadStrategy ? DOM.uploadStrategy.value : 'sequential';
        console.log(`🔄 Usando estrategia: ${strategy}`);
        
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
        
        // 9. Mostrar resultados
        showUploadResults(result, state);
        
        // 10. Actualizar preloader con resultados finales
        setTimeout(() => {
            updateUploadPreloader(state);
        }, 500);
        
        // 11. Recargar documentos si hubo éxito
        if (result.successCount > 0) {
            console.log('🔄 Recargando documentos...');
            if (window.loadDocuments) {
                await window.loadDocuments();
            }
            
            if (window.appState && window.appState.currentTab === 'dashboard' && window.loadDashboardData) {
                await window.loadDashboardData();
            }
            
            // Resetear estado después de subida exitosa
            console.log('🔄 Reseteando estado después de subida exitosa');
            state.reset();
            if (typeof updateMultipleUploadUI === 'function') {
                updateMultipleUploadUI();
            }
        }
        
        console.log('✅ Subida múltiple completada exitosamente');
        console.groupEnd();
        
    } catch (error) {
        console.error('❌ Error en subida múltiple:', error);
        showAlert('Error en subida múltiple: ' + error.message, 'error');
    } finally {
        // Resetear estado
        state.isUploading = false;
        
        // Ocultar preloader después de un tiempo si todo está completado
        setTimeout(() => {
            const allCompleted = state.files.every(f => 
                f.status === 'completed' || f.status === 'failed'
            );
            if (allCompleted) {
                setTimeout(() => {
                    hideUploadPreloader();
                }, 2000);
            }
        }, 3000);
        
        // Ocultar contenedor de progreso después de un tiempo
        setTimeout(() => {
            hideUploadProgressContainer();
        }, 5000);
    }
}

/**
 * Sube archivos de forma secuencial, uno tras otro.
 * @param {MultipleUploadState} state - Estado de subida
 * @param {Array} preparedFiles - Archivos preparados para subida
 * @returns {object} - Resultados de la subida
 */
async function uploadSequentially(state, preparedFiles) {
    console.group('🔀 uploadSequentially');
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
        
        try {
            // Mostrar información del archivo actual
            console.log(`📤 Archivo ${i + 1}/${preparedFiles.length}: ${preparedFile.fileName}`, {
                category: preparedFile.category,
                personId: preparedFile.personId,
                expirationDate: preparedFile.expirationDate,
                notifyPerson: preparedFile.notifyPerson,
                notifyExpiration: preparedFile.notifyExpiration
            });
            
            // VERIFICACIÓN CRÍTICA: Validar que todos los campos necesarios estén presentes
            const validationErrors = [];
            
            if (!preparedFile.category || preparedFile.category.trim() === '') {
                validationErrors.push('Falta categoría');
            }
            
            // FIX CRÍTICO: Persona puede ser opcional dependiendo de tu lógica de negocio
            // Si es requerida, descomenta la siguiente validación:
            /*
            if (!preparedFile.personId || preparedFile.personId.trim() === '') {
                validationErrors.push('Falta persona asignada');
            }
            */
            
            if (validationErrors.length > 0) {
                console.error(`❌ ERROR: ${preparedFile.fileName} - ${validationErrors.join(', ')} - SE OMITE`);
                if (fileObj) {
                    fileObj.status = 'failed';
                    fileObj.error = validationErrors.join(', ');
                    updateFileUI(fileObj.id, state);
                }
                results.failureCount++;
                continue;
            }
            
            if (fileObj) {
                // Actualizar estado
                fileObj.status = 'uploading';
                fileObj.progress = 0;
                updateFileUI(fileObj.id, state);
                updateUploadPreloader(state);
            }
            
            // Subir archivo
            const success = await uploadSingleFileWithProgress(preparedFile, fileObj, state);
            
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
                
                console.log(`✅ ${preparedFile.fileName} - Subida exitosa`);
            } else {
                results.failureCount++;
                if (fileObj) {
                    fileObj.status = 'failed';
                    fileObj.error = 'Error en la subida';
                }
                
                console.error(`❌ ${preparedFile.fileName} - Error en subida`);
            }
            
            if (fileObj) {
                updateFileUI(fileObj.id, state);
            }
            updateUploadPreloader(state);
            
            // Pequeña pausa entre archivos (excepto el último)
            if (i < preparedFiles.length - 1) {
                await new Promise(resolve => setTimeout(resolve, MULTIPLE_UPLOAD_CONFIG.DELAY_BETWEEN_FILES));
            }
            
        } catch (error) {
            console.error(`❌ Error crítico en archivo ${preparedFile.fileName}:`, error);
            results.failureCount++;
            if (fileObj) {
                fileObj.status = 'failed';
                fileObj.error = error.message;
                updateFileUI(fileObj.id, state);
            }
            updateUploadPreloader(state);
        }
    }
    
    results.totalTime = Date.now() - startTime;
    console.log(`⏱️  Tiempo total secuencial: ${results.totalTime}ms`);
    console.groupEnd();
    
    return results;
}

/**
 * Sube archivos en paralelo con límite de concurrencia.
 * @param {MultipleUploadState} state - Estado de subida
 * @param {Array} preparedFiles - Archivos preparados para subida
 * @returns {object} - Resultados de la subida
 */
async function uploadInParallel(state, preparedFiles) {
    console.group('⚡ uploadInParallel');
    console.log('⚡ Subida paralela iniciada');
    
    const maxConcurrent = MULTIPLE_UPLOAD_CONFIG.MAX_CONCURRENT_UPLOADS;
    const results = {
        successCount: 0,
        failureCount: 0,
        totalTime: 0,
        uploadedFiles: []
    };
    
    const startTime = Date.now();
    
    // Crear array de promesas
    const uploadPromises = [];
    const activeUploads = new Set();
    
    for (let i = 0; i < preparedFiles.length; i++) {
        const preparedFile = preparedFiles[i];
        const fileObj = state.files.find(f => f.file.name === preparedFile.fileName);
        
        // Verificación CRÍTICA antes de agregar a la cola
        const validationErrors = [];
        if (!preparedFile.category || preparedFile.category.trim() === '') {
            validationErrors.push('Falta categoría');
        }
        
        if (validationErrors.length > 0) {
            console.error(`❌ ERROR: ${preparedFile.fileName} - ${validationErrors.join(', ')} - SE OMITE`);
            if (fileObj) {
                fileObj.status = 'failed';
                fileObj.error = validationErrors.join(', ');
                updateFileUI(fileObj.id, state);
            }
            results.failureCount++;
            continue;
        }
        
        // Esperar si hay demasiadas subidas concurrentes
        while (activeUploads.size >= maxConcurrent) {
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
                    console.log(`✅ ${preparedFile.fileName} - Completado`);
                } else {
                    results.failureCount++;
                    if (fileObj) {
                        fileObj.status = 'failed';
                        fileObj.error = 'Error en la subida';
                    }
                    console.error(`❌ ${preparedFile.fileName} - Fallado`);
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
    
    // Esperar a que todas las subidas terminen
    await Promise.all(uploadPromises);
    
    results.totalTime = Date.now() - startTime;
    console.log(`⏱️  Tiempo total paralelo: ${results.totalTime}ms`);
    console.groupEnd();
    
    return results;
}

/**
 * Sube archivos por lotes, con pausas entre lotes.
 * @param {MultipleUploadState} state - Estado de subida
 * @param {Array} preparedFiles - Archivos preparados para subida
 * @returns {object} - Resultados de la subida
 */
async function uploadInBatches(state, preparedFiles) {
    console.group('📦 uploadInBatches');
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
    
    // Dividir archivos en lotes
    const batches = [];
    for (let i = 0; i < preparedFiles.length; i += batchSize) {
        batches.push(preparedFiles.slice(i, i + batchSize));
    }
    
    console.log(`📊 ${batches.length} lotes creados (tamaño: ${batchSize})`);
    
    // Procesar cada lote
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`📤 Procesando lote ${batchIndex + 1}/${batches.length}`);
        
        // Filtrar archivos válidos (con categoría)
        const validBatch = batch.filter(f => {
            const errors = [];
            if (!f.category || f.category.trim() === '') {
                errors.push('Falta categoría');
            }
            return errors.length === 0;
        });
        
        const invalidCount = batch.length - validBatch.length;
        
        if (invalidCount > 0) {
            console.warn(`⚠️ ${invalidCount} archivo(s) inválidos en lote ${batchIndex + 1}`);
            
            // Marcar archivos inválidos como fallados
            batch.filter(f => !validBatch.includes(f)).forEach(invalidFile => {
                const fileObj = state.files.find(f => f.file.name === invalidFile.fileName);
                if (fileObj) {
                    fileObj.status = 'failed';
                    fileObj.error = 'Falta categoría';
                    updateFileUI(fileObj.id, state);
                    results.failureCount++;
                }
            });
        }
        
        // Subir archivos del lote en paralelo
        const batchPromises = validBatch.map(preparedFile => {
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
                            fileObj.error = 'Error en la subida';
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
        
        // Esperar a que termine el lote
        await Promise.all(batchPromises);
        
        // Pausa entre lotes (excepto el último)
        if (batchIndex < batches.length - 1) {
            console.log(`⏸️  Pausa entre lotes: ${delayBetween}ms`);
            await new Promise(resolve => setTimeout(resolve, delayBetween));
        }
    }
    
    results.totalTime = Date.now() - startTime;
    console.log(`⏱️  Tiempo total por lotes: ${results.totalTime}ms`);
    console.groupEnd();
    
    return results;
}

/**
 * Sube un archivo individual con seguimiento de progreso.
 * @param {object} preparedFile - Archivo preparado para subida
 * @param {object|null} fileObj - Objeto de archivo del estado (opcional)
 * @param {MultipleUploadState} state - Estado de subida
 * @returns {Promise<boolean>} - True si la subida fue exitosa
 */
async function uploadSingleFileWithProgress(preparedFile, fileObj, state) {
    return new Promise(async (resolve, reject) => {
        try {
            console.group(`📤 UPLOAD: ${preparedFile.fileName}`);
            
            console.log(`🏷️ Configuración del archivo:`, {
                categoría: preparedFile.category,
                personaId: preparedFile.personId,
                fechaVencimiento: preparedFile.expirationDate,
                notifyPerson: preparedFile.notifyPerson,
                notifyExpiration: preparedFile.notifyExpiration
            });
            
            // VALIDACIÓN CRÍTICA: Asegurar que la categoría no esté vacía
            if (!preparedFile.category || preparedFile.category.trim() === '') {
                console.error(`❌ ${preparedFile.fileName} - NO TIENE CATEGORÍA`);
                throw new Error('Categoría no definida para el archivo');
            }
            
            // Preparar FormData
            const formData = new FormData();
            formData.append('file', preparedFile.file);
            
            // Descripción
            formData.append('descripcion', preparedFile.description || '');
            console.log(`📝 Descripción: "${preparedFile.description}"`);
            
            // Categoría - CAMPO OBLIGATORIO
            formData.append('categoria', preparedFile.category);
            console.log(`🏷️ Categoría enviada: "${preparedFile.category}"`);
            
            // Persona - CAMPO OPCIONAL (solo si tiene valor)
            if (preparedFile.personId && preparedFile.personId.trim() !== '') {
                formData.append('persona_id', preparedFile.personId);
                console.log(`👤 Persona asignada: "${preparedFile.personId}"`);
            } else {
                console.log('👤 No se asigna persona (persona_id vacío)');
                // IMPORTANTE: Si en tu backend espera este campo siempre, envía una cadena vacía
                formData.append('persona_id', '');
            }
            
            // Fecha de vencimiento - CAMPO OPCIONAL (solo si tiene valor)
            if (preparedFile.expirationDate && preparedFile.expirationDate.trim() !== '') {
                formData.append('fecha_vencimiento', preparedFile.expirationDate);
                console.log(`📅 Fecha de vencimiento enviada: ${preparedFile.expirationDate}`);
                
                // Verificar formato de fecha
                const dateObj = new Date(preparedFile.expirationDate);
                if (isNaN(dateObj.getTime())) {
                    console.warn(`⚠️ Posible formato de fecha inválido: ${preparedFile.expirationDate}`);
                }
            } else {
                console.log('📅 No se agregará fecha de vencimiento (no configurada)');
                // IMPORTANTE: Si en tu backend espera este campo siempre, envía una cadena vacía
                formData.append('fecha_vencimiento', '');
            }
            
            // Configurar notificación si está habilitada y hay persona
            if (preparedFile.notifyPerson && preparedFile.personId && preparedFile.personId.trim() !== '') {
                formData.append('notificar', 'true');
                console.log('🔔 Notificación habilitada para la persona');
            }
            
            // Mostrar todo lo que se enviará
            console.log('📤 Datos a enviar al servidor:');
            for (let pair of formData.entries()) {
                console.log(`   ${pair[0]}: ${pair[1]}`);
            }
            
            // Crear XMLHttpRequest para tener progreso
            const xhr = new XMLHttpRequest();
            
            // Configurar eventos de progreso
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = Math.round((e.loaded / e.total) * 100);
                    if (fileObj) {
                        fileObj.progress = percentComplete;
                        updateFileUI(fileObj.id, state);
                        updateUploadPreloader(state);
                    }
                    
                    if (CONFIG.DEBUG.LOG_UPLOAD_PROGRESS) {
                        console.log(`📈 ${preparedFile.fileName}: ${percentComplete}%`);
                    }
                }
            });
            
            xhr.addEventListener('load', () => {
                console.log(`📥 Respuesta recibida:`, {
                    status: xhr.status,
                    statusText: xhr.statusText,
                    archivo: preparedFile.fileName
                });
                
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        console.log('📋 Respuesta del servidor:', {
                            success: response.success,
                            message: response.message,
                            document: response.document ? {
                                id: response.document._id,
                                nombre: response.document.nombre_original,
                                categoria: response.document.categoria,
                                persona_id: response.document.persona_id,
                                fecha_vencimiento: response.document.fecha_vencimiento,
                                estado: response.document.estado || 'pendiente'
                            } : 'No hay documento en respuesta'
                        });
                        
                        if (response.success) {
                            console.log(`✅ ${preparedFile.fileName} - Subida exitosa`);
                            
                            // Verificar que los datos se guardaron correctamente
                            if (response.document) {
                                console.log('✅ Documento creado en backend:', {
                                    categoríaGuardada: response.document.categoria,
                                    personaGuardada: response.document.persona_id,
                                    fechaVencimientoGuardada: response.document.fecha_vencimiento,
                                    estadoGuardado: response.document.estado
                                });
                                
                                // Comparar con lo enviado
                                const mismatches = [];
                                if (response.document.categoria !== preparedFile.category) {
                                    mismatches.push(`Categoría: ${preparedFile.category} -> ${response.document.categoria}`);
                                }
                                if (response.document.persona_id !== preparedFile.personId) {
                                    mismatches.push(`Persona: ${preparedFile.personId || '(vacío)'} -> ${response.document.persona_id || '(vacío)'}`);
                                }
                                if (response.document.fecha_vencimiento !== preparedFile.expirationDate) {
                                    mismatches.push(`Vencimiento: ${preparedFile.expirationDate || '(sin fecha)'} -> ${response.document.fecha_vencimiento || '(sin fecha)'}`);
                                }
                                
                                if (mismatches.length > 0) {
                                    console.warn('⚠️ Diferencias entre enviado y guardado:', mismatches);
                                }
                            }
                            
                            resolve(true);
                        } else {
                            console.error(`❌ ${preparedFile.fileName} - Error del servidor:`, response.message);
                            console.log('⚠️ Datos enviados:');
                            for (let pair of formData.entries()) {
                                console.log(`   ${pair[0]}: ${pair[1]}`);
                            }
                            if (fileObj) {
                                fileObj.error = response.message || 'Error desconocido del servidor';
                            }
                            resolve(false);
                        }
                    } catch (parseError) {
                        console.error(`❌ ${preparedFile.fileName} - Error parseando respuesta:`, parseError);
                        console.log('Respuesta cruda:', xhr.responseText);
                        if (fileObj) {
                            fileObj.error = 'Error en la respuesta del servidor';
                        }
                        resolve(false);
                    }
                } else {
                    console.error(`❌ ${preparedFile.fileName} - HTTP ${xhr.status}: ${xhr.statusText}`);
                    if (fileObj) {
                        fileObj.error = `Error HTTP ${xhr.status}: ${xhr.statusText}`;
                        
                        try {
                            const errorResponse = JSON.parse(xhr.responseText);
                            console.error('Detalles del error:', errorResponse);
                            if (errorResponse.message) {
                                fileObj.error += ` - ${errorResponse.message}`;
                            }
                        } catch (e) {
                            // Ignorar error de parseo
                        }
                    }
                    
                    resolve(false);
                }
                
                console.groupEnd();
            });
            
            xhr.addEventListener('error', () => {
                console.error(`❌ ${preparedFile.fileName} - Error de red`);
                if (fileObj) {
                    fileObj.error = 'Error de conexión con el servidor';
                }
                console.groupEnd();
                resolve(false);
            });
            
            xhr.addEventListener('abort', () => {
                console.warn(`⚠️ ${preparedFile.fileName} - Subida cancelada`);
                if (fileObj) {
                    fileObj.error = 'Subida cancelada por el usuario';
                }
                console.groupEnd();
                resolve(false);
            });
            
            // Enviar la petición
            xhr.open('POST', `${CONFIG.API_BASE_URL}/documents`);
            
            // Agregar headers
            xhr.setRequestHeader('Accept', 'application/json');
            
            console.log(`📤 Enviando ${preparedFile.fileName} a ${CONFIG.API_BASE_URL}/documents...`);
            xhr.send(formData);
            
        } catch (error) {
            console.error(`❌ Error preparando ${preparedFile.fileName}:`, error);
            if (fileObj) {
                fileObj.error = error.message;
            }
            console.groupEnd();
            resolve(false);
        }
    });
}

/**
 * Actualiza la UI de un archivo específico en la lista.
 * @param {string} fileId - ID del archivo a actualizar
 * @param {MultipleUploadState} state - Estado de subida
 */
function updateFileUI(fileId, state) {
    if (!fileId || !state) {
        console.warn('⚠️ updateFileUI: Parámetros inválidos');
        return;
    }
    
    const fileElement = document.querySelector(`.file-item[data-file-id="${fileId}"]`);
    if (!fileElement) {
        console.warn(`⚠️ No se encontró elemento para fileId: ${fileId}`);
        return;
    }
    
    const fileObj = state.files.find(f => f.id === fileId);
    if (!fileObj) {
        console.error(`❌ No se encontró fileObj para fileId: ${fileId}`);
        return;
    }
    
    // Actualizar clase de estado
    fileElement.className = `file-item file-item--${fileObj.status}`;
    
    // Actualizar badge de estado
    const statusBadge = fileElement.querySelector('.status-badge');
    if (statusBadge) {
        statusBadge.className = `status-badge status-badge--${fileObj.status}`;
        statusBadge.textContent = getStatusText(fileObj.status);
    }
    
    // Actualizar barra de progreso
    const progressBar = fileElement.querySelector('.progress-bar__fill');
    const progressText = fileElement.querySelector('.progress-text');
    
    if (progressBar && fileObj.status === 'uploading') {
        progressBar.style.width = `${fileObj.progress}%`;
        if (progressText) {
            progressText.textContent = `${fileObj.progress}%`;
        }
    }
    
    // Mostrar/ocultar sección de error
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
    
    // Actualizar categoría mostrada
    const categorySpan = fileElement.querySelector('.file-item__category');
    if (categorySpan) {
        const effectiveCategory = state.getEffectiveCategory(fileObj);
        categorySpan.textContent = effectiveCategory || 'Sin categoría';
        if (!effectiveCategory || effectiveCategory.trim() === '') {
            categorySpan.style.color = 'var(--danger)';
            categorySpan.style.fontWeight = 'bold';
        }
    }
    
    // Actualizar persona mostrada
    const personSpan = fileElement.querySelector('.file-item__person');
    if (personSpan) {
        const effectivePersonId = state.getEffectivePersonId(fileObj);
        personSpan.textContent = effectivePersonId ? `Persona: ${effectivePersonId}` : 'Sin persona asignada';
    }
    
    // Actualizar fecha de vencimiento mostrada
    const dateSpan = fileElement.querySelector('.file-item__expiration');
    if (dateSpan) {
        const effectiveExpirationDate = state.getEffectiveExpirationDate(fileObj);
        if (effectiveExpirationDate) {
            const date = new Date(effectiveExpirationDate);
            dateSpan.textContent = `Vence: ${date.toLocaleDateString()}`;
            dateSpan.style.display = 'block';
            dateSpan.style.color = 'var(--warning-dark)';
        } else {
            dateSpan.style.display = 'none';
        }
    }
}

/**
 * Muestra los resultados de la subida múltiple
 * @param {object} results - Resultados de la subida
 * @param {MultipleUploadState} state - Estado de subida
 */
function showUploadResults(results, state) {
    console.log('📋 Mostrando resultados de subida');
    
    // Crear o actualizar contenedor de resultados
    let resultsContainer = document.getElementById('uploadResultsContainer');
    if (!resultsContainer) {
        resultsContainer = document.createElement('div');
        resultsContainer.id = 'uploadResultsContainer';
        resultsContainer.className = 'upload-results';
        
        const progressContainer = document.getElementById('uploadProgressContainer');
        if (progressContainer) {
            progressContainer.appendChild(resultsContainer);
        } else {
            document.body.appendChild(resultsContainer);
        }
    }
    
    // Generar HTML de resultados
    resultsContainer.innerHTML = `
        <div class="results-header">
            <h4><i class="fas fa-clipboard-check"></i> Resultados de la Subida</h4>
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
                <h5>Archivos subidos exitosamente:</h5>
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
    
    // Configurar event listeners
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
 * Reintenta los archivos que fallaron
 * @param {MultipleUploadState} state - Estado de subida
 */
function retryFailedUploads(state) {
    console.log('🔄 Reintentando archivos fallidos');
    
    const failedFiles = state.files.filter(f => f.status === 'failed');
    
    failedFiles.forEach(file => {
        file.status = 'pending';
        file.error = null;
        file.progress = 0;
        file.retryCount = (file.retryCount || 0) + 1;
    });
    
    // Actualizar UI
    updateMultipleUploadUI();
    updateUploadPreloader(state);
    
    // Volver a subir
    handleUploadMultipleDocuments();
}

/**
 * Obtiene el texto legible para un estado de archivo.
 * @param {string} status - Estado del archivo
 * @returns {string} - Texto legible del estado
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
 * Depuración: Imprime el estado completo
 */
export function debugState() {
    const state = getMultipleUploadState();
    console.group('🐛 DEBUG STATE - ESTADO COMPLETO');
    state.logState();
    
    console.log('🔍 Verificación de DOM:');
    console.log('- DOM.multipleDocumentCategory:', DOM.multipleDocumentCategory ? 'EXISTE' : 'NO EXISTE');
    console.log('- Valor de categoría en DOM:', DOM.multipleDocumentCategory ? DOM.multipleDocumentCategory.value : 'N/A');
    console.log('- DOM.multipleDocumentPerson:', DOM.multipleDocumentPerson ? 'EXISTE' : 'NO EXISTE');
    console.log('- Valor de persona en DOM:', DOM.multipleDocumentPerson ? DOM.multipleDocumentPerson.value : 'N/A');
    console.log('- DOM.multipleExpirationDays:', DOM.multipleExpirationDays ? 'EXISTE' : 'NO EXISTE');
    console.log('- Valor de expiración en DOM:', DOM.multipleExpirationDays ? DOM.multipleExpirationDays.value : 'N/A');
    console.log('- DOM.uploadMultipleDocumentsBtn:', DOM.uploadMultipleDocumentsBtn ? 'EXISTE' : 'NO EXISTE');
    
    console.log('📊 Verificación de categorías:');
    const check = state.checkCategories();
    console.table(check.details);
    
    console.groupEnd();
}

/**
 * Forzar categoría común (para debugging)
 */
export function forceCommonCategory(category) {
    const state = getMultipleUploadState();
    console.log(`🔧 FORZANDO categoría común: "${category}"`);
    state.setCommonCategory(category);
    state.logState();
}

/**
 * Configura todos los listeners para la subida múltiple
 */
export function setupMultipleUploadListeners() {
    console.log('🔧 Configurando listeners de subida múltiple');
    
    // Listener para selección de archivos
    if (DOM.multipleFileInput) {
        DOM.multipleFileInput.addEventListener('change', handleMultipleFileSelect);
        console.log('✅ Listener configurado para multipleFileInput');
    }
    
    // Listener para botón de subida
    if (DOM.uploadMultipleDocumentsBtn) {
        DOM.uploadMultipleDocumentsBtn.addEventListener('click', handleUploadMultipleDocuments);
        console.log('✅ Listener configurado para uploadMultipleDocumentsBtn');
    }
    
    // Listeners para cambios en los selects - FIX: Usar función anónima para forzar actualización
    if (DOM.multipleDocumentCategory) {
        DOM.multipleDocumentCategory.addEventListener('change', () => {
            console.log('🏷️ Cambio en categoría múltiple');
            updateCommonSettings(true);
        });
        console.log('✅ Listener configurado para multipleDocumentCategory (forzado)');
    }
    
    if (DOM.multipleDocumentPerson) {
        DOM.multipleDocumentPerson.addEventListener('change', () => {
            console.log('👤 Cambio en persona múltiple');
            updateCommonSettings(true);
        });
        console.log('✅ Listener configurado para multipleDocumentPerson (forzado)');
    }
    
    if (DOM.multipleExpirationDays) {
        DOM.multipleExpirationDays.addEventListener('change', () => {
            console.log('📅 Cambio en días de expiración');
            updateCommonSettings(true);
        });
        console.log('✅ Listener configurado para multipleExpirationDays (forzado)');
    }
    
    // Listeners para checkboxes
    if (DOM.autoGenerateDescriptions) {
        DOM.autoGenerateDescriptions.addEventListener('change', () => updateCommonSettings(true));
        console.log('✅ Listener configurado para autoGenerateDescriptions (forzado)');
    }
    
    if (DOM.notifyPerson) {
        DOM.notifyPerson.addEventListener('change', () => updateCommonSettings(true));
        console.log('✅ Listener configurado para notifyPerson (forzado)');
    }
    
    console.log('✅ Todos los listeners configurados para subida múltiple');
}

// Exportar las funciones internas que puedan ser necesarias
export { 
    updateFileUI, 
    getStatusText, 
    showUploadPreloader, 
    hideUploadPreloader, 
    updateUploadPreloader,
    updateCommonSettings,
    uploadSingleFileWithProgress
};