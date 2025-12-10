import { DOM } from '../../../dom.js';
import { CONFIG } from '../../../config.js';
import { showAlert, formatFileSize } from '../../../utils.js';
import { MultipleUploadState } from '../core/MultipleUploadState.js';
import { MULTIPLE_UPLOAD_CONFIG } from '../core/constants.js';

// Instancia global del estado de subida múltiple
export const multipleUploadState = new MultipleUploadState();

/**
 * Maneja la selección de múltiples archivos.
 * Valida cantidad máxima y agrega archivos al estado.
 * @param {File[]} files - Array de archivos seleccionados
 */
export function handleMultipleFiles(files) {
    console.group(`📁 Procesando ${files.length} archivo(s) múltiple(s)`);
    
    // Validar cantidad máxima
    if (files.length > CONFIG.MAX_MULTIPLE_FILES) {
        showAlert(`Máximo ${CONFIG.MAX_MULTIPLE_FILES} archivos permitidos. Seleccionados: ${files.length}`, 'error');
        console.groupEnd();
        return;
    }
    
    // Agregar archivos al estado
    multipleUploadState.addFiles(files);
    
    // Actualizar UI
    updateMultipleUploadUI();
    
    // Habilitar botón de subida si hay archivos
    if (multipleUploadState.files.length > 0) {
        DOM.uploadMultipleDocumentsBtn.disabled = false;
        DOM.uploadMultipleDocumentsBtn.querySelector('#uploadCount').textContent = multipleUploadState.files.length;
    }
    
    console.log(`✅ ${files.length} archivo(s) procesado(s)`);
    console.groupEnd();
}

/**
 * Handler para el input de múltiples archivos.
 * @param {Event} e - Evento del input file múltiple
 */
export function handleMultipleFileSelect(e) {
    console.log('📁 Múltiples archivos seleccionados:', e.target.files.length);
    handleMultipleFiles(Array.from(e.target.files));
}

/**
 * Maneja la subida múltiple de documentos.
 * Coordina la subida según la estrategia seleccionada y muestra progreso.
 */
export async function handleUploadMultipleDocuments() {
    console.group('📤📤📤 SUBIDA MÚLTIPLE DE DOCUMENTOS');
    
    try {
        // Validar antes de empezar
        updateCommonSettings();
        
        if (!multipleUploadState.validateAllFiles()) {
            console.error('❌ Validación fallida');
            console.groupEnd();
            return;
        }
        
        console.log('🚀 Iniciando subida múltiple...');
        multipleUploadState.logState();
        
        // Configurar estado
        multipleUploadState.isUploading = true;
        DOM.uploadMultipleDocumentsBtn.disabled = true;
        DOM.uploadMultipleDocumentsBtn.innerHTML = '<div class="spinner spinner--sm"></div> Preparando...';
        
        // Mostrar contenedor de progreso
        showUploadProgressContainer();
        
        // Iniciar subida según estrategia
        const strategy = DOM.uploadStrategy.value;
        console.log(`🔄 Usando estrategia: ${strategy}`);
        
        let result;
        switch(strategy) {
            case 'sequential':
                result = await uploadSequentially();
                break;
            case 'parallel':
                result = await uploadInParallel();
                break;
            case 'batch':
                result = await uploadInBatches();
                break;
            default:
                result = await uploadSequentially();
        }
        
        // Mostrar resultados
        showUploadResults(result);
        
        // Recargar documentos si hubo éxito
        if (result.successCount > 0) {
            if (window.loadDocuments) {
                await window.loadDocuments();
            }
            
            if (window.appState.currentTab === 'dashboard' && window.loadDashboardData) {
                await window.loadDashboardData();
            }
        }
        
        console.log('✅ Subida múltiple completada');
        console.groupEnd();
        
    } catch (error) {
        console.error('❌ Error en subida múltiple:', error);
        showAlert('Error en subida múltiple: ' + error.message, 'error');
    } finally {
        // Resetear estado
        multipleUploadState.isUploading = false;
        DOM.uploadMultipleDocumentsBtn.disabled = false;
        DOM.uploadMultipleDocumentsBtn.innerHTML = `
            <i class="fas fa-layer-group"></i> 
            Subir Todos (<span id="uploadCount">${multipleUploadState.files.length}</span>)
        `;
        
        // Ocultar progreso después de un tiempo
        setTimeout(() => {
            hideUploadProgressContainer();
        }, 5000);
    }
}

/**
 * Sube archivos de forma secuencial, uno tras otro.
 * @returns {object} - Resultados de la subida
 */
async function uploadSequentially() {
    console.log('🔀 Subida secuencial iniciada');
    
    const results = {
        successCount: 0,
        failureCount: 0,
        totalTime: 0,
        uploadedFiles: []
    };
    
    const startTime = Date.now();
    
    for (let i = 0; i < multipleUploadState.files.length; i++) {
        const fileObj = multipleUploadState.files[i];
        
        try {
            // Actualizar estado
            fileObj.status = 'uploading';
            fileObj.progress = 0;
            updateFileUI(fileObj.id);
            
            console.log(`📤 Subiendo archivo ${i + 1}/${multipleUploadState.files.length}: ${fileObj.file.name}`);
            
            // Subir archivo
            const success = await uploadSingleFileWithProgress(fileObj);
            
            if (success) {
                results.successCount++;
                fileObj.status = 'completed';
                fileObj.progress = 100;
                results.uploadedFiles.push(fileObj.file.name);
                
                console.log(`✅ Archivo subido: ${fileObj.file.name}`);
                showAlert(`✅ ${fileObj.file.name} - Subido correctamente`, 'success');
            } else {
                results.failureCount++;
                fileObj.status = 'failed';
                fileObj.error = 'Error en la subida';
                
                console.error(`❌ Error subiendo: ${fileObj.file.name}`);
                showAlert(`❌ ${fileObj.file.name} - Error en la subida`, 'error');
            }
            
            updateFileUI(fileObj.id);
            
            // Pequeña pausa entre archivos (excepto el último)
            if (i < multipleUploadState.files.length - 1) {
                await new Promise(resolve => setTimeout(resolve, MULTIPLE_UPLOAD_CONFIG.DELAY_BETWEEN_FILES));
            }
            
        } catch (error) {
            console.error(`❌ Error crítico en archivo ${fileObj.file.name}:`, error);
            results.failureCount++;
            fileObj.status = 'failed';
            fileObj.error = error.message;
            updateFileUI(fileObj.id);
        }
    }
    
    results.totalTime = Date.now() - startTime;
    console.log(`⏱️  Tiempo total secuencial: ${results.totalTime}ms`);
    
    return results;
}

/**
 * Sube archivos en paralelo con límite de concurrencia.
 * @returns {object} - Resultados de la subida
 */
async function uploadInParallel() {
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
    
    for (let i = 0; i < multipleUploadState.files.length; i++) {
        const fileObj = multipleUploadState.files[i];
        
        // Esperar si hay demasiadas subidas concurrentes
        while (activeUploads.size >= maxConcurrent) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Iniciar subida
        fileObj.status = 'uploading';
        fileObj.progress = 0;
        updateFileUI(fileObj.id);
        
        activeUploads.add(fileObj.id);
        
        const uploadPromise = uploadSingleFileWithProgress(fileObj)
            .then(success => {
                if (success) {
                    results.successCount++;
                    fileObj.status = 'completed';
                    fileObj.progress = 100;
                    results.uploadedFiles.push(fileObj.file.name);
                    console.log(`✅ ${fileObj.file.name} - Completado`);
                } else {
                    results.failureCount++;
                    fileObj.status = 'failed';
                    fileObj.error = 'Error en la subida';
                    console.error(`❌ ${fileObj.file.name} - Fallado`);
                }
                
                updateFileUI(fileObj.id);
                activeUploads.delete(fileObj.id);
                
                return success;
            })
            .catch(error => {
                console.error(`❌ Error en ${fileObj.file.name}:`, error);
                results.failureCount++;
                fileObj.status = 'failed';
                fileObj.error = error.message;
                updateFileUI(fileObj.id);
                activeUploads.delete(fileObj.id);
                return false;
            });
        
        uploadPromises.push(uploadPromise);
    }
    
    // Esperar a que todas las subidas terminen
    await Promise.all(uploadPromises);
    
    results.totalTime = Date.now() - startTime;
    console.log(`⏱️  Tiempo total paralelo: ${results.totalTime}ms`);
    
    return results;
}

/**
 * Sube archivos por lotes, con pausas entre lotes.
 * @returns {object} - Resultados de la subida
 */
async function uploadInBatches() {
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
    for (let i = 0; i < multipleUploadState.files.length; i += batchSize) {
        batches.push(multipleUploadState.files.slice(i, i + batchSize));
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
            updateFileUI(fileObj.id);
            
            return uploadSingleFileWithProgress(fileObj)
                .then(success => {
                    if (success) {
                        results.successCount++;
                        fileObj.status = 'completed';
                        fileObj.progress = 100;
                        results.uploadedFiles.push(fileObj.file.name);
                        console.log(`✅ ${fileObj.file.name} - Completado`);
                    } else {
                        results.failureCount++;
                        fileObj.status = 'failed';
                        fileObj.error = 'Error en la subida';
                        console.error(`❌ ${fileObj.file.name} - Fallado`);
                    }
                    
                    updateFileUI(fileObj.id);
                    return success;
                })
                .catch(error => {
                    console.error(`❌ Error en ${fileObj.file.name}:`, error);
                    results.failureCount++;
                    fileObj.status = 'failed';
                    fileObj.error = error.message;
                    updateFileUI(fileObj.id);
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
    
    return results;
}

/**
 * Sube un archivo individual con seguimiento de progreso.
 * Usa XMLHttpRequest para obtener eventos de progreso.
 * @param {object} fileObj - Objeto de archivo a subir
 * @returns {Promise<boolean>} - True si la subida fue exitosa
 */
async function uploadSingleFileWithProgress(fileObj) {
    return new Promise(async (resolve, reject) => {
        try {
            console.log(`📤 Preparando subida: ${fileObj.file.name}`);
            
            // Preparar FormData
            const formData = new FormData();
            formData.append('file', fileObj.file);
            
            // Determinar descripción
            let description = fileObj.description;
            if (!description && multipleUploadState.autoGenerateDescriptions) {
                description = fileObj.file.name.replace(/\.[^/.]+$/, "");
            }
            formData.append('descripcion', description || '');
            
            // Determinar categoría
            const categoria = fileObj.customCategory || multipleUploadState.commonCategory;
            if (!categoria) {
                throw new Error('Categoría no definida');
            }
            formData.append('categoria', categoria);
            
            // Determinar persona
            const persona_id = fileObj.customPersonId || multipleUploadState.commonPersonId;
            if (persona_id) {
                formData.append('persona_id', persona_id);
            }
            
            // Determinar fecha de vencimiento
            let fecha_vencimiento = fileObj.customExpirationDate;
            if (!fecha_vencimiento && multipleUploadState.expirationDays) {
                const expirationDate = new Date();
                expirationDate.setDate(expirationDate.getDate() + multipleUploadState.expirationDays);
                fecha_vencimiento = expirationDate.toISOString().split('T')[0];
            }
            if (fecha_vencimiento) {
                formData.append('fecha_vencimiento', fecha_vencimiento);
            }
            
            // Configurar notificación
            if (multipleUploadState.notifyPerson && persona_id) {
                formData.append('notificar', 'true');
            }
            
            console.log(`📋 Configuración para ${fileObj.file.name}:`, {
                descripcion: description,
                categoria: categoria,
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
                    updateFileUI(fileObj.id);
                    
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
 */
function updateFileUI(fileId) {
    const fileElement = document.querySelector(`.file-item[data-file-id="${fileId}"]`);
    if (!fileElement) return;
    
    const fileObj = multipleUploadState.files.find(f => f.id === fileId);
    if (!fileObj) return;
    
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
            errorSection.querySelector('span').textContent = fileObj.error;
        } else {
            errorSection.style.display = 'none';
        }
    }
    
    // Actualizar resumen global
    updateOverallProgress();
}

/**
 * Actualiza la configuración común desde los controles de la UI.
 */
function updateCommonSettings() {
    console.log('⚙️ Actualizando configuración común');
    
    // Actualizar estado con valores de los selects
    multipleUploadState.commonCategory = DOM.multipleDocumentCategory.value;
    multipleUploadState.commonPersonId = DOM.multipleDocumentPerson.value;
    multipleUploadState.expirationDays = DOM.multipleExpirationDays.value ? parseInt(DOM.multipleExpirationDays.value) : null;
    
    // Actualizar estrategia
    multipleUploadState.uploadStrategy = DOM.uploadStrategy.value;
    
    // Actualizar opciones avanzadas
    multipleUploadState.autoGenerateDescriptions = DOM.autoGenerateDescriptions?.checked || true;
    multipleUploadState.notifyPerson = DOM.notifyPerson?.checked || false;
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