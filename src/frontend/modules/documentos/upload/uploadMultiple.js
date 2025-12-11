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
        DOMCategory: DOM.multipleDocumentCategory ? DOM.multipleDocumentCategory.value : 'NO DISPONIBLE'
    });
    
    // Validar cantidad máxima
    if (files.length > CONFIG.MAX_MULTIPLE_FILES) {
        showAlert(`Máximo ${CONFIG.MAX_MULTIPLE_FILES} archivos permitidos. Seleccionados: ${files.length}`, 'error');
        console.groupEnd();
        return;
    }
    
    // Obtener categoría común del DOM si existe
    let currentCategory = '';
    if (DOM.multipleDocumentCategory) {
        currentCategory = DOM.multipleDocumentCategory.value;
        console.log(`🏷️ Categoría del DOM: "${currentCategory}"`);
        
        // Actualizar categoría común en el estado
        if (currentCategory && currentCategory.trim() !== '') {
            state.setCommonCategory(currentCategory);
        }
    } else {
        console.warn('⚠️ DOM.multipleDocumentCategory no disponible');
    }
    
    // Agregar archivos al estado
    state.addFiles(files);
    
    // Mostrar estado después de agregar
    console.log('📊 Estado DESPUÉS de agregar archivos:');
    state.logState();
    
    // Verificar categorías
    const categoryCheck = state.checkCategories();
    console.log('🔍 Verificación de categorías:', categoryCheck);
    
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
    
    console.log(`✅ ${files.length} archivo(s) procesado(s)`);
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
 */
function updateCommonSettings() {
    console.group('⚙️ updateCommonSettings');
    
    const state = getMultipleUploadState();
    
    console.log('📊 Estado ANTES de actualizar configuración:', {
        commonCategory: state.commonCategory,
        commonPersonId: state.commonPersonId
    });
    
    // Actualizar estado con valores de los selects
    if (DOM.multipleDocumentCategory) {
        const category = DOM.multipleDocumentCategory.value;
        console.log(`🏷️ Categoría del select: "${category}"`);
        
        if (category && category.trim() !== '') {
            state.setCommonCategory(category);
            console.log(`✅ Categoría común actualizada: "${category}"`);
        } else {
            console.warn('⚠️ Categoría vacía o no seleccionada');
        }
    } else {
        console.error('❌ DOM.multipleDocumentCategory no encontrado');
    }
    
    if (DOM.multipleDocumentPerson) {
        state.commonPersonId = DOM.multipleDocumentPerson.value;
        console.log(`👤 Persona común actualizada: "${state.commonPersonId}"`);
    }
    
    if (DOM.multipleExpirationDays) {
        state.expirationDays = DOM.multipleExpirationDays.value ? 
            parseInt(DOM.multipleExpirationDays.value) : null;
        console.log(`📅 Días de expiración: ${state.expirationDays}`);
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
    console.log('📊 Estado DESPUÉS de actualizar configuración:');
    state.logState();
    
    console.groupEnd();
}

/**
 * Maneja la subida múltiple de documentos.
 * Coordina la subida según la estrategia seleccionada y muestra progreso.
 */
export async function handleUploadMultipleDocuments() {
    console.group('📤📤📤 handleUploadMultipleDocuments - INICIANDO');
    
    const state = getMultipleUploadState();
    
    // Mostrar estado inicial completo
    console.log('📊 ESTADO INICIAL COMPLETO:');
    state.logState();
    
    // Verificación detallada de categorías antes de proceder
    const categoryCheck = state.checkCategories();
    console.log('🔍 VERIFICACIÓN DE CATEGORÍAS PREVIA:');
    console.table(categoryCheck.details);
    
    try {
        // Actualizar configuración común
        console.log('🔄 Actualizando configuración común...');
        updateCommonSettings();
        
        // Verificación después de actualizar
        console.log('📊 ESTADO DESPUÉS DE updateCommonSettings:');
        state.logState();
        
        // Validar antes de empezar
        console.log('🔍 Ejecutando validateAllFiles()...');
        const isValid = state.validateAllFiles();
        console.log(`✅ Resultado de validateAllFiles: ${isValid}`);
        
        if (!isValid) {
            console.error('❌ Validación fallida - ABORTANDO');
            
            // Verificación adicional para debugging
            const finalCheck = state.checkCategories();
            console.error('❌ VERIFICACIÓN FINAL DE CATEGORÍAS FALLIDA:', finalCheck);
            
            console.groupEnd();
            return;
        }
        
        console.log('🚀 Validación exitosa - Iniciando subida múltiple...');
        
        // Configurar estado
        state.isUploading = true;
        
        // Mostrar preloader de subida
        showUploadPreloader(state);
        
        // Mostrar contenedor de progreso (si se usa)
        showUploadProgressContainer();
        
        // Iniciar subida según estrategia
        const strategy = DOM.uploadStrategy ? DOM.uploadStrategy.value : 'sequential';
        console.log(`🔄 Usando estrategia: ${strategy}`);
        
        let result;
        switch(strategy) {
            case 'sequential':
                result = await uploadSequentially(state);
                break;
            case 'parallel':
                result = await uploadInParallel(state);
                break;
            case 'batch':
                result = await uploadInBatches(state);
                break;
            default:
                result = await uploadSequentially(state);
        }
        
        // Mostrar resultados
        showUploadResults(result, state);
        
        // Actualizar preloader con resultados finales
        setTimeout(() => {
            updateUploadPreloader(state);
        }, 500);
        
        // Recargar documentos si hubo éxito
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
                hideUploadPreloader();
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
 * @returns {object} - Resultados de la subida
 */
async function uploadSequentially(state) {
    console.group('🔀 uploadSequentially');
    console.log(`📤 Subiendo ${state.files.length} archivos secuencialmente`);
    
    const results = {
        successCount: 0,
        failureCount: 0,
        totalTime: 0,
        uploadedFiles: []
    };
    
    const startTime = Date.now();
    
    for (let i = 0; i < state.files.length; i++) {
        const fileObj = state.files[i];
        
        try {
            // Mostrar información del archivo actual
            console.log(`📤 Archivo ${i + 1}/${state.files.length}: ${fileObj.file.name}`, {
                customCategory: fileObj.customCategory,
                commonCategory: state.commonCategory,
                effectiveCategory: state.getEffectiveCategory(fileObj)
            });
            
            // Actualizar estado
            fileObj.status = 'uploading';
            fileObj.progress = 0;
            updateFileUI(fileObj.id, state);
            updateUploadPreloader(state);
            
            // Subir archivo
            const success = await uploadSingleFileWithProgress(fileObj, state);
            
            if (success) {
                results.successCount++;
                fileObj.status = 'completed';
                fileObj.progress = 100;
                results.uploadedFiles.push({
                    name: fileObj.file.name,
                    size: fileObj.file.size,
                    category: state.getEffectiveCategory(fileObj)
                });
                
                console.log(`✅ ${fileObj.file.name} - Subida exitosa`);
            } else {
                results.failureCount++;
                fileObj.status = 'failed';
                fileObj.error = 'Error en la subida';
                
                console.error(`❌ ${fileObj.file.name} - Error en subida`);
            }
            
            updateFileUI(fileObj.id, state);
            updateUploadPreloader(state);
            
            // Pequeña pausa entre archivos (excepto el último)
            if (i < state.files.length - 1) {
                await new Promise(resolve => setTimeout(resolve, MULTIPLE_UPLOAD_CONFIG.DELAY_BETWEEN_FILES));
            }
            
        } catch (error) {
            console.error(`❌ Error crítico en archivo ${fileObj.file.name}:`, error);
            results.failureCount++;
            fileObj.status = 'failed';
            fileObj.error = error.message;
            updateFileUI(fileObj.id, state);
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
 * @returns {object} - Resultados de la subida
 */
async function uploadInParallel(state) {
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
    
    for (let i = 0; i < state.files.length; i++) {
        const fileObj = state.files[i];
        
        // Esperar si hay demasiadas subidas concurrentes
        while (activeUploads.size >= maxConcurrent) {
            await new Promise(resolve => setTimeout(resolve, 100));
            updateUploadPreloader(state);
        }
        
        // Iniciar subida
        fileObj.status = 'uploading';
        fileObj.progress = 0;
        updateFileUI(fileObj.id, state);
        updateUploadPreloader(state);
        
        activeUploads.add(fileObj.id);
        
        const uploadPromise = uploadSingleFileWithProgress(fileObj, state)
            .then(success => {
                if (success) {
                    results.successCount++;
                    fileObj.status = 'completed';
                    fileObj.progress = 100;
                    results.uploadedFiles.push({
                        name: fileObj.file.name,
                        size: fileObj.file.size,
                        category: state.getEffectiveCategory(fileObj)
                    });
                    console.log(`✅ ${fileObj.file.name} - Completado`);
                } else {
                    results.failureCount++;
                    fileObj.status = 'failed';
                    fileObj.error = 'Error en la subida';
                    console.error(`❌ ${fileObj.file.name} - Fallado`);
                }
                
                updateFileUI(fileObj.id, state);
                updateUploadPreloader(state);
                activeUploads.delete(fileObj.id);
                
                return success;
            })
            .catch(error => {
                console.error(`❌ Error en ${fileObj.file.name}:`, error);
                results.failureCount++;
                fileObj.status = 'failed';
                fileObj.error = error.message;
                updateFileUI(fileObj.id, state);
                updateUploadPreloader(state);
                activeUploads.delete(fileObj.id);
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
 * @returns {object} - Resultados de la subida
 */
async function uploadInBatches(state) {
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
    for (let i = 0; i < state.files.length; i += batchSize) {
        batches.push(state.files.slice(i, i + batchSize));
    }
    
    console.log(`📊 ${batches.length} lotes creados (tamaño: ${batchSize})`);
    
    // Procesar cada lote
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`📤 Procesando lote ${batchIndex + 1}/${batches.length}`);
        
        // Subir archivos del lote en paralelo
        const batchPromises = batch.map(fileObj => {
            fileObj.status = 'uploading';
            fileObj.progress = 0;
            updateFileUI(fileObj.id, state);
            updateUploadPreloader(state);
            
            return uploadSingleFileWithProgress(fileObj, state)
                .then(success => {
                    if (success) {
                        results.successCount++;
                        fileObj.status = 'completed';
                        fileObj.progress = 100;
                        results.uploadedFiles.push({
                            name: fileObj.file.name,
                            size: fileObj.file.size,
                            category: state.getEffectiveCategory(fileObj)
                        });
                        console.log(`✅ ${fileObj.file.name} - Completado`);
                    } else {
                        results.failureCount++;
                        fileObj.status = 'failed';
                        fileObj.error = 'Error en la subida';
                        console.error(`❌ ${fileObj.file.name} - Fallado`);
                    }
                    
                    updateFileUI(fileObj.id, state);
                    updateUploadPreloader(state);
                    return success;
                })
                .catch(error => {
                    console.error(`❌ Error en ${fileObj.file.name}:`, error);
                    results.failureCount++;
                    fileObj.status = 'failed';
                    fileObj.error = error.message;
                    updateFileUI(fileObj.id, state);
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
 * @param {object} fileObj - Objeto de archivo a subir
 * @param {MultipleUploadState} state - Estado de subida
 * @returns {Promise<boolean>} - True si la subida fue exitosa
 */
async function uploadSingleFileWithProgress(fileObj, state) {
    return new Promise(async (resolve, reject) => {
        try {
            console.log(`📤 uploadSingleFileWithProgress: ${fileObj.file.name}`);
            
            // Obtener categoría efectiva
            const effectiveCategory = state.getEffectiveCategory(fileObj);
            console.log(`🏷️ Categoría para ${fileObj.file.name}: "${effectiveCategory}"`, {
                customCategory: fileObj.customCategory,
                commonCategory: state.commonCategory
            });
            
            if (!effectiveCategory || effectiveCategory.trim() === '') {
                console.error(`❌ ${fileObj.file.name} - NO TIENE CATEGORÍA`);
                throw new Error('Categoría no definida para el archivo');
            }
            
            // Preparar FormData
            const formData = new FormData();
            formData.append('file', fileObj.file);
            
            // Determinar descripción
            let description = fileObj.description;
            if (!description && state.autoGenerateDescriptions) {
                description = fileObj.file.name.replace(/\.[^/.]+$/, "");
            }
            formData.append('descripcion', description || '');
            
            // Añadir categoría
            formData.append('categoria', effectiveCategory);
            
            // Determinar persona
            const persona_id = fileObj.customPersonId || state.commonPersonId;
            if (persona_id) {
                formData.append('persona_id', persona_id);
            }
            
            // Determinar fecha de vencimiento
            let fecha_vencimiento = fileObj.customExpirationDate;
            if (!fecha_vencimiento && state.expirationDays) {
                const expirationDate = new Date();
                expirationDate.setDate(expirationDate.getDate() + state.expirationDays);
                fecha_vencimiento = expirationDate.toISOString().split('T')[0];
            }
            if (fecha_vencimiento) {
                formData.append('fecha_vencimiento', fecha_vencimiento);
            }
            
            // Configurar notificación
            if (state.notifyPerson && persona_id) {
                formData.append('notificar', 'true');
            }
            
            console.log(`📋 Configuración para ${fileObj.file.name}:`, {
                descripcion: description,
                categoria: effectiveCategory,
                persona_id: persona_id,
                fecha_vencimiento: fecha_vencimiento
            });
            
            // Crear XMLHttpRequest para tener progreso
            const xhr = new XMLHttpRequest();
            
            // Configurar eventos de progreso
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = Math.round((e.loaded / e.total) * 100);
                    fileObj.progress = percentComplete;
                    updateFileUI(fileObj.id, state);
                    updateUploadPreloader(state);
                    
                    if (CONFIG.DEBUG.LOG_UPLOAD_PROGRESS) {
                        console.log(`📈 ${fileObj.file.name}: ${percentComplete}%`);
                    }
                }
            });
            
            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        if (response.success) {
                            console.log(`✅ ${fileObj.file.name} - Subida exitosa`);
                            resolve(true);
                        } else {
                            console.error(`❌ ${fileObj.file.name} - Error del servidor:`, response.message);
                            fileObj.error = response.message;
                            resolve(false);
                        }
                    } catch (parseError) {
                        console.error(`❌ ${fileObj.file.name} - Error parseando respuesta:`, parseError);
                        fileObj.error = 'Error en la respuesta del servidor';
                        resolve(false);
                    }
                } else {
                    console.error(`❌ ${fileObj.file.name} - HTTP ${xhr.status}: ${xhr.statusText}`);
                    fileObj.error = `Error HTTP ${xhr.status}`;
                    resolve(false);
                }
            });
            
            xhr.addEventListener('error', () => {
                console.error(`❌ ${fileObj.file.name} - Error de red`);
                fileObj.error = 'Error de conexión';
                resolve(false);
            });
            
            xhr.addEventListener('abort', () => {
                console.warn(`⚠️ ${fileObj.file.name} - Subida cancelada`);
                fileObj.error = 'Subida cancelada';
                resolve(false);
            });
            
            // Enviar la petición
            xhr.open('POST', `${CONFIG.API_BASE_URL}/documents`);
            xhr.send(formData);
            
        } catch (error) {
            console.error(`❌ Error preparando ${fileObj.file.name}:`, error);
            fileObj.error = error.message;
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
    console.log(`🎨 updateFileUI llamado para fileId: ${fileId}`);
    
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
        console.log(`📛 Badge actualizado: ${fileObj.status}`);
    }
    
    // Actualizar barra de progreso
    const progressBar = fileElement.querySelector('.progress-bar__fill');
    const progressText = fileElement.querySelector('.progress-text');
    
    if (progressBar && fileObj.status === 'uploading') {
        progressBar.style.width = `${fileObj.progress}%`;
        if (progressText) {
            progressText.textContent = `${fileObj.progress}%`;
        }
        console.log(`📈 Progreso actualizado: ${fileObj.progress}%`);
    }
    
    // Mostrar/ocultar sección de error
    const errorSection = fileElement.querySelector('.file-item__error');
    if (errorSection) {
        if (fileObj.error) {
            errorSection.style.display = 'flex';
            errorSection.querySelector('span').textContent = fileObj.error;
            console.log(`❌ Error mostrado: ${fileObj.error}`);
        } else {
            errorSection.style.display = 'none';
        }
    }
    
    // Actualizar categoría mostrada
    const categorySpan = fileElement.querySelector('.file-item__category');
    if (categorySpan) {
        const effectiveCategory = state.getEffectiveCategory(fileObj);
        categorySpan.textContent = effectiveCategory || 'Sin categoría';
        console.log(`🏷️ Categoría UI actualizada: ${effectiveCategory}`);
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
                            <span class="file-category">${file.category}</span>
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

// Exportar las funciones internas que puedan ser necesarias
export { updateFileUI, getStatusText, showUploadPreloader, hideUploadPreloader, updateUploadPreloader };