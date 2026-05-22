import { DOM } from '../../../dom.js';
import { CONFIG } from '../../../config.js';
import { setLoadingState, showAlert, formatFileSize } from '../../../utils.js';

/**
 * Maneja la selección de un archivo individual.
 * Valida el archivo y lo almacena en el estado global.
 * @param {File} file - Archivo seleccionado
 */
export function handleFile(file) {
    if (!file) {
        console.warn('⚠️ No se proporcionó archivo');
        return;
    }

    console.group(`📋 Procesando archivo individual: ${file.name}`);

    // Validar archivo
    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (!CONFIG.ALLOWED_FILE_TYPES.includes(fileExtension)) {
        showAlert(`Tipo de archivo no permitido. Formatos aceptados: ${CONFIG.ALLOWED_FILE_TYPES.join(', ').toUpperCase()}`, 'error');
        console.groupEnd();
        return;
    }

    if (file.size > CONFIG.MAX_FILE_SIZE) {
        showAlert(`El archivo excede el tamaño máximo permitido (${formatFileSize(CONFIG.MAX_FILE_SIZE)})`, 'error');
        console.groupEnd();
        return;
    }

    // Guardar archivo en estado
    window.appState.selectedFile = file;

    // Mostrar información
    DOM.fileName.textContent = file.name;
    DOM.fileSize.textContent = formatFileSize(file.size);
    DOM.fileInfo.style.display = 'block';
    DOM.uploadDocumentBtn.disabled = false;

    console.log('✅ Archivo individual validado correctamente');
    console.groupEnd();
}

/**
 * Handler para el input de archivo individual.
 * @param {Event} e - Evento del input file
 */
export function handleFileSelect(e) {
    console.log('📁 Archivo individual seleccionado:', e.target.files[0]?.name);
    handleFile(e.target.files[0]);
}

/**
 * Muestra el preloader para la subida de archivo individual
 */
function showSingleUploadPreloader() {
    // Crear elemento preloader si no existe
    if (!DOM.singleUploadPreloader) {
        const preloaderHTML = `
            <div id="singleUploadPreloader" class="preloader-overlay">
                <div class="preloader-overlay__content">
                    <div class="preloader__spinner"></div>
                    <h3 class="preloader-overlay__title">Subiendo archivo</h3>
                    <p class="preloader-overlay__subtitle">
                        Procesando: <span id="uploadingFileName">${window.appState.selectedFile?.name || ''}</span>
                    </p>
                    <div class="upload-progress" style="margin-top: 1rem; width: 100%;">
                        <div class="progress-bar" style="height: 4px; background: var(--border-color); border-radius: 2px; overflow: hidden;">
                            <div id="uploadProgress" style="height: 100%; background: var(--primary); width: 0%; transition: width 0.3s ease;"></div>
                        </div>
                        <p id="uploadStatus" style="font-size: 0.85rem; margin-top: 0.5rem; color: var(--text-muted);"></p>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', preloaderHTML);
        DOM.singleUploadPreloader = document.getElementById('singleUploadPreloader');
        DOM.uploadProgress = document.getElementById('uploadProgress');
        DOM.uploadStatus = document.getElementById('uploadStatus');
        DOM.uploadingFileName = document.getElementById('uploadingFileName');
    }

    // Actualizar nombre del archivo
    if (DOM.uploadingFileName && window.appState.selectedFile) {
        DOM.uploadingFileName.textContent = window.appState.selectedFile.name;
    }

    // Resetear progreso
    if (DOM.uploadProgress) {
        DOM.uploadProgress.style.width = '0%';
    }
    if (DOM.uploadStatus) {
        DOM.uploadStatus.textContent = 'Iniciando subida...';
    }

    // Mostrar preloader
    DOM.singleUploadPreloader.style.display = 'flex';

    // Bloquear interacción con el modal/formulario
    if (DOM.uploadDocumentBtn) {
        DOM.uploadDocumentBtn.disabled = true;
    }
    if (DOM.documentCategory) {
        DOM.documentCategory.disabled = true;
    }
    if (DOM.documentDescription) {
        DOM.documentDescription.disabled = true;
    }
    if (DOM.documentExpiration) {
        DOM.documentExpiration.disabled = true;
    }
    if (DOM.documentPerson) {
        DOM.documentPerson.disabled = true;
    }
}

/**
 * Oculta el preloader de subida individual
 */
function hideSingleUploadPreloader() {
    if (DOM.singleUploadPreloader) {
        DOM.singleUploadPreloader.style.display = 'none';
    }

    // Restaurar interacción con el modal/formulario
    if (DOM.uploadDocumentBtn) {
        DOM.uploadDocumentBtn.disabled = false;
    }
    if (DOM.documentCategory) {
        DOM.documentCategory.disabled = false;
    }
    if (DOM.documentDescription) {
        DOM.documentDescription.disabled = false;
    }
    if (DOM.documentExpiration) {
        DOM.documentExpiration.disabled = false;
    }
    if (DOM.documentPerson) {
        DOM.documentPerson.disabled = false;
    }
}

/**
 * Actualiza el progreso de subida
 * @param {number} progress - Porcentaje de progreso (0-100)
 * @param {string} status - Texto de estado
 */
function updateUploadProgress(progress, status) {
    if (DOM.uploadProgress) {
        DOM.uploadProgress.style.width = `${progress}%`;
    }
    if (DOM.uploadStatus) {
        DOM.uploadStatus.textContent = status;
    }
}

/**
 * Maneja la subida de un documento individual.
 * Valida, prepara FormData y envía al servidor.
 */
export async function handleUploadDocument() {
    console.group('📤 Subiendo documento individual');
    
    if (!window.appState.selectedFile) {
        showAlert('Por favor selecciona un archivo', 'error');
        console.groupEnd();
        return;
    }
    
    if (!DOM.documentCategory.value) {
        showAlert('Por favor selecciona una categoría', 'error');
        console.groupEnd();
        return;
    }

    // Validar fecha de vencimiento
    if (DOM.documentExpiration.value) {
        const fechaSeleccionada = new Date(DOM.documentExpiration.value + 'T00:00:00');
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        if (fechaSeleccionada <= hoy) {
            if (window.showActionModal) {
                window.showActionModal({
                    type: 'error',
                    title: 'Fecha inválida',
                    message: 'La fecha de vencimiento debe ser posterior a hoy'
                });
            }
            console.groupEnd();
            return;
        }
    }
    
    try {
        showSingleUploadPreloader();
        updateUploadProgress(10, 'Preparando archivo...');
        
        console.log('📋 Iniciando upload del documento...');
        console.log('📋 Archivo:', window.appState.selectedFile.name);
        console.log('📋 Tamaño:', formatFileSize(window.appState.selectedFile.size));
        
        const formData = new FormData();
        formData.append('file', window.appState.selectedFile);
        formData.append('descripcion', DOM.documentDescription.value);
        formData.append('categoria', DOM.documentCategory.value);
        formData.append('fecha_vencimiento', DOM.documentExpiration.value);
        formData.append('persona_id', DOM.documentPerson.value);
        
        updateUploadProgress(30, 'Conectando con el servidor...');
        console.log('📤 Enviando al servidor...');
        
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = Math.round((e.loaded / e.total) * 100);
                    const uploadProgress = 30 + Math.round(percentComplete * 0.4);
                    updateUploadProgress(uploadProgress, `Subiendo archivo: ${percentComplete}%`);
                }
            });
            
            xhr.addEventListener('load', async () => {
                try {
                    updateUploadProgress(90, 'Procesando respuesta del servidor...');
                    console.log('📥 Respuesta:', xhr.status);
                    
                    if (xhr.status >= 200 && xhr.status < 300) {
                        const data = JSON.parse(xhr.responseText);
                        console.log('📦 Datos de respuesta:', data);
                        
                        if (data.success) {
                            updateUploadProgress(100, '¡Archivo subido exitosamente!');
                            await new Promise(resolve => setTimeout(resolve, 500));
                            
                            hideSingleUploadPreloader();
                            showAlert(data.message, 'success');
                            
                            try {
                                window.dispatchEvent(new CustomEvent('documentCreated', { detail: { document: data.document || data } }));
                            } catch (e) {
                                console.warn('No se pudo disparar evento documentCreated:', e);
                            }
                            
                            if (window.refreshDocumentsView) {
                                await window.refreshDocumentsView();
                            } else if (window.loadDocuments) {
                                await window.loadDocuments();
                            }

                            if (window.closeDocumentModal) {
                                window.closeDocumentModal();
                            }

                            try {
                                if (typeof window.renderExpiredDocuments === 'function') {
                                    window.renderExpiredDocuments();
                                }
                            } catch (e) {
                                console.warn('Error re-renderizando panel vencidos:', e);
                            }

                            try {
                                const dashboardLoader = window.dashboard?.loadDashboardData || window.loadDashboardData;
                                if (typeof dashboardLoader === 'function') {
                                    await dashboardLoader(window.appState);
                                } else if (typeof window.dashboard?.updateDashboardStats === 'function') {
                                    window.dashboard.updateDashboardStats(window.appState);
                                }
                            } catch (e) {
                                console.warn('No se pudo actualizar dashboard tras subir documento:', e);
                            }
                            
                            resolve(data);
                        } else {
                            throw new Error(data.message || 'Error desconocido');
                        }
                    } else {
                        const errorText = xhr.responseText;
                        console.error('❌ Error del servidor:', errorText);
                        throw new Error(`Error del servidor (${xhr.status}): ${errorText}`);
                    }
                } catch (error) {
                    hideSingleUploadPreloader();
                    console.error('❌ Error procesando respuesta:', error);
                    showAlert('Error al subir documento: ' + error.message, 'error');
                    reject(error);
                }
            });
            
            xhr.addEventListener('error', () => {
                hideSingleUploadPreloader();
                console.error('❌ Error de red');
                showAlert('Error de conexión. Por favor, verifica tu internet.', 'error');
                reject(new Error('Error de red'));
            });
            
            xhr.addEventListener('abort', () => {
                hideSingleUploadPreloader();
                console.warn('⚠️ Subida cancelada');
                showAlert('Subida cancelada', 'warning');
                reject(new Error('Subida cancelada'));
            });
            
            xhr.open('POST', `${CONFIG.API_BASE_URL}/documents`);
            xhr.setRequestHeader('Accept', 'application/json');
            xhr.send(formData);
        });
        
    } catch (error) {
        hideSingleUploadPreloader();
        console.error('❌ Error inesperado:', error);
        showAlert('Error al subir documento: ' + error.message, 'error');
    } finally {
        console.groupEnd();
    }
}

// Inicializar referencia al preloader en DOM si no existe
if (!DOM.singleUploadPreloader) {
    DOM.singleUploadPreloader = null;
    DOM.uploadProgress = null;
    DOM.uploadStatus = null;
    DOM.uploadingFileName = null;
}