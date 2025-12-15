// =============================================================================
// src/frontend/modules/documentos/modals/editDocumentModal.js
// =============================================================================

import { api } from '../../../services/api.js';
import { showAlert, formatFileSize, formatDate } from '../../../utils.js';

let editModal, editForm;
let replaceFileCheck, newFileContainer, editFileInput;
let selectedFile = null;

// Variables para preloader
let editPreloaderOverlay = null;
let successOverlay = null;
let errorOverlay = null;

/**
 * Inicializar el modal de edición de documentos
 */
export function initEditDocumentModal() {
    editModal = document.getElementById('editDocumentModal');
    editForm = document.getElementById('editDocumentForm');
    replaceFileCheck = document.getElementById('replaceFileCheck');
    newFileContainer = document.getElementById('newFileContainer');
    editFileInput = document.getElementById('editFileInput');

    // Asegurar que el modal tenga la clase correcta
    if (editModal) {
        editModal.classList.add('modal--with-preloader');
    }

    // Event listeners
    document.getElementById('cancelEditDocumentBtn')?.addEventListener('click', closeEditModal);
    document.getElementById('closeEditDocumentModal')?.addEventListener('click', closeEditModal);
    document.getElementById('saveEditDocumentBtn')?.addEventListener('click', saveDocumentChanges);
    document.getElementById('browseEditFileBtn')?.addEventListener('click', () => editFileInput.click());
    
    replaceFileCheck?.addEventListener('change', toggleFileReplacement);
    editFileInput?.addEventListener('change', handleFileSelection);

    // Cerrar modal con click en overlay (backdrop)
    editModal?.addEventListener('click', (e) => {
        if (e.target === editModal) {
            closeEditModal();
        }
    });

    // Escuchar tecla Escape
    document.addEventListener('keydown', handleEscapeKey);

    console.log('✅ Modal de edición de documentos inicializado con preloader');
}

/**
 * Crear preloader overlay para el modal
 */
function createEditPreloader(options = {}) {
    if (!editModal) return null;
    
    // Limpiar preloaders existentes
    removeEditPreloader();
    removeSuccessOverlay();
    removeErrorOverlay();
    
    const defaults = {
        title: options.title || 'Guardando cambios...',
        subtitle: options.subtitle || 'Estamos procesando tu solicitud',
        showProgress: options.showProgress !== false,
        initialProgress: options.initialProgress || 0,
        statusText: options.statusText || 'Actualizando documento'
    };
    
    const config = { ...defaults, ...options };
    
    // Crear el overlay de preloader
    editPreloaderOverlay = document.createElement('div');
    editPreloaderOverlay.className = 'modal-edit-preloader preloader-enter';
    editPreloaderOverlay.innerHTML = `
        <div class="modal-edit-preloader__content">
            <div class="document-edit-spinner">
                <div class="document-edit-spinner__outer"></div>
                <div class="document-edit-spinner__inner"></div>
                <div class="document-edit-spinner__dot"></div>
            </div>
            
            <div class="modal-edit-preloader__header">
                <h3 class="modal-edit-preloader__title">${config.title}</h3>
                <p class="modal-edit-preloader__subtitle">${config.subtitle}</p>
            </div>
            
            ${config.showProgress ? `
            <div class="document-progress-container">
                <div class="document-progress-bar">
                    <div class="document-progress-fill" style="width: ${config.initialProgress}%"></div>
                </div>
                <div class="document-progress-text">
                    <span>0%</span>
                    <span class="progress-percentage">${config.initialProgress}%</span>
                </div>
            </div>
            ` : ''}
            
            <div class="document-status-indicator">
                <div class="document-status-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
                <div class="document-status-text">${config.statusText}</div>
            </div>
        </div>
    `;
    
    // Agregar al modal
    editModal.appendChild(editPreloaderOverlay);
    
    // Animar la barra de progreso si está habilitada
    if (config.showProgress) {
        const progressBar = editPreloaderOverlay.querySelector('.document-progress-fill');
        const progressText = editPreloaderOverlay.querySelector('.progress-percentage');
        
        if (progressBar && progressText) {
            let currentProgress = config.initialProgress;
            const targetProgress = 85; // Mantener en 85% mientras se procesa
            
            const progressInterval = setInterval(() => {
                if (currentProgress < targetProgress) {
                    currentProgress += Math.random() * 10;
                    if (currentProgress > targetProgress) {
                        currentProgress = targetProgress;
                    }
                    
                    progressBar.style.width = `${currentProgress}%`;
                    progressText.textContent = `${Math.round(currentProgress)}%`;
                }
            }, 200);
            
            // Guardar referencia para limpiar después
            editPreloaderOverlay.progressInterval = progressInterval;
        }
    }
    
    return editPreloaderOverlay;
}

/**
 * Actualizar progreso del preloader
 */
function updateEditProgress(percentage, statusText = null) {
    if (!editPreloaderOverlay) return;
    
    const progressBar = editPreloaderOverlay.querySelector('.document-progress-fill');
    const progressText = editPreloaderOverlay.querySelector('.progress-percentage');
    const statusElement = editPreloaderOverlay.querySelector('.document-status-text');
    
    if (progressBar) {
        percentage = Math.min(100, Math.max(0, percentage));
        progressBar.style.width = `${percentage}%`;
    }
    
    if (progressText) {
        progressText.textContent = `${Math.round(percentage)}%`;
    }
    
    if (statusText && statusElement) {
        statusElement.textContent = statusText;
    }
}

/**
 * Remover preloader del modal
 */
function removeEditPreloader() {
    if (editPreloaderOverlay) {
        // Limpiar intervalos
        if (editPreloaderOverlay.progressInterval) {
            clearInterval(editPreloaderOverlay.progressInterval);
        }
        
        // Completar progreso a 100%
        updateEditProgress(100);
        
        // Animar salida
        editPreloaderOverlay.classList.remove('preloader-enter');
        editPreloaderOverlay.classList.add('preloader-exit');
        
        // Remover después de la animación
        setTimeout(() => {
            if (editPreloaderOverlay && editPreloaderOverlay.parentNode) {
                editPreloaderOverlay.remove();
                editPreloaderOverlay = null;
            }
        }, 300);
    }
}

/**
 * Mostrar overlay de éxito
 */
function showSuccessOverlay(message = '¡Cambios guardados!', details = 'El documento ha sido actualizado correctamente.') {
    if (!editModal) return;
    
    // Limpiar overlays existentes
    removeEditPreloader();
    removeSuccessOverlay();
    removeErrorOverlay();
    
    successOverlay = document.createElement('div');
    successOverlay.className = 'document-success-overlay';
    successOverlay.innerHTML = `
        <div class="document-success-content">
            <div class="success-checkmark">
                <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                    <circle class="success-checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
                    <path class="success-checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                </svg>
                <div class="success-checkmark__circle-bg"></div>
            </div>
            
            <h3 class="document-success-message">${message}</h3>
            <p class="document-success-details">${details}</p>
        </div>
    `;
    
    editModal.appendChild(successOverlay);
    
    // Configurar auto-remoción
    successOverlay.autoRemoveTimeout = setTimeout(() => {
        removeSuccessOverlay();
    }, 2000);
    
    return successOverlay;
}

/**
 * Remover overlay de éxito
 */
function removeSuccessOverlay() {
    if (successOverlay) {
        // Limpiar timeout
        if (successOverlay.autoRemoveTimeout) {
            clearTimeout(successOverlay.autoRemoveTimeout);
        }
        
        // Animar salida
        successOverlay.style.opacity = '0';
        successOverlay.style.transform = 'scale(0.95)';
        successOverlay.style.transition = 'all 0.3s ease';
        
        setTimeout(() => {
            if (successOverlay && successOverlay.parentNode) {
                successOverlay.remove();
                successOverlay = null;
            }
        }, 300);
    }
}

/**
 * Mostrar overlay de error
 */
function showErrorOverlay(message = '¡Error al guardar!', details = 'Hubo un problema al actualizar el documento.') {
    if (!editModal) return;
    
    // Limpiar overlays existentes
    removeEditPreloader();
    removeSuccessOverlay();
    removeErrorOverlay();
    
    errorOverlay = document.createElement('div');
    errorOverlay.className = 'document-error-overlay';
    errorOverlay.innerHTML = `
        <div class="document-error-content">
            <div class="error-icon">
                <div class="error-icon__circle"></div>
                <i class="fas fa-exclamation-circle"></i>
            </div>
            
            <h3 class="document-error-message">${message}</h3>
            <p class="document-error-details">${details}</p>
        </div>
    `;
    
    editModal.appendChild(errorOverlay);
    
    // Configurar auto-remoción
    errorOverlay.autoRemoveTimeout = setTimeout(() => {
        removeErrorOverlay();
    }, 3000);
    
    return errorOverlay;
}

/**
 * Remover overlay de error
 */
function removeErrorOverlay() {
    if (errorOverlay) {
        // Limpiar timeout
        if (errorOverlay.autoRemoveTimeout) {
            clearTimeout(errorOverlay.autoRemoveTimeout);
        }
        
        // Animar salida
        errorOverlay.style.opacity = '0';
        errorOverlay.style.transform = 'scale(0.95)';
        errorOverlay.style.transition = 'all 0.3s ease';
        
        setTimeout(() => {
            if (errorOverlay && errorOverlay.parentNode) {
                errorOverlay.remove();
                errorOverlay = null;
            }
        }, 300);
    }
}

/**
 * Mostrar preloader de carga inicial
 */
function showLoadingOverlay(message = 'Cargando documento...') {
    if (!editModal) return null;
    
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'modal-loading-overlay';
    loadingOverlay.innerHTML = `
        <div class="modal-loading-content">
            <div class="document-loading-spinner">
                <div class="document-loading-spinner__disk"></div>
                <div class="document-loading-spinner__doc">📄</div>
            </div>
            
            <h3 class="modal-loading-text">${message}</h3>
            <p class="modal-loading-subtext">Esto tomará solo un momento</p>
        </div>
    `;
    
    editModal.appendChild(loadingOverlay);
    return loadingOverlay;
}

/**
 * Remover preloader de carga inicial
 */
function removeLoadingOverlay(overlay) {
    if (overlay && overlay.parentNode) {
        overlay.style.opacity = '0';
        overlay.style.transform = 'scale(0.95)';
        overlay.style.transition = 'all 0.3s ease';
        
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.remove();
            }
        }, 300);
    }
}

/**
 * Manejar tecla Escape para cerrar modal
 */
function handleEscapeKey(e) {
    if (e.key === 'Escape' && editModal && editModal.style.display === 'flex') {
        closeEditModal();
    }
}

/**
 * Mostrar/ocultar sección de reemplazo de archivo
 */
function toggleFileReplacement() {
    if (replaceFileCheck.checked) {
        newFileContainer.style.display = 'block';
        setTimeout(() => {
            document.getElementById('browseEditFileBtn')?.focus();
        }, 100);
    } else {
        newFileContainer.style.display = 'none';
        editFileInput.value = '';
        selectedFile = null;
        document.getElementById('editFileInfo').style.display = 'none';
    }
}

/**
 * Manejar selección de nuevo archivo
 */
function handleFileSelection(e) {
    selectedFile = e.target.files[0];
    
    if (selectedFile) {
        // Validar tamaño del archivo (10MB máximo)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (selectedFile.size > maxSize) {
            showAlert('El archivo es demasiado grande. Tamaño máximo: 10MB', 'error');
            editFileInput.value = '';
            selectedFile = null;
            return;
        }

        // Validar tipo de archivo
        const allowedTypes = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'jpg', 'jpeg', 'png'];
        const fileExtension = selectedFile.name.split('.').pop().toLowerCase();
        if (!allowedTypes.includes(fileExtension)) {
            showAlert('Tipo de archivo no permitido', 'error');
            editFileInput.value = '';
            selectedFile = null;
            return;
        }

        document.getElementById('newFileName').textContent = selectedFile.name;
        document.getElementById('newFileSize').textContent = formatFileSize(selectedFile.size);
        document.getElementById('editFileInfo').style.display = 'block';
    }
}

/**
 * Abrir modal de edición con datos del documento
 */
export async function openEditDocumentModal(documentId) {
    try {
        // Bloquear scroll del body
        document.body.classList.add('modal-open');
        
        console.log('📝 Abriendo modal para editar documento:', documentId);
        
        // Mostrar modal primero
        editModal.style.display = 'flex';
        editModal.setAttribute('open', '');
        
        // Forzar reflow para activar animación
        void editModal.offsetWidth;
        
        // Mostrar preloader de carga
        const loadingOverlay = showLoadingOverlay('Cargando información...');
        
        // Obtener información del documento
        const response = await api.getFileInfo(documentId);
        
        if (!response.success) {
            throw new Error(response.message || 'Error al obtener información del documento');
        }

        const doc = response.document;
        console.log('📄 Documento cargado:', doc.nombre_original);

        // Cargar categorías y personas
        await Promise.all([
            loadCategoriesForEdit(),
            loadPersonsForEdit()
        ]);

        // Llenar formulario con datos actuales
        document.getElementById('editDocumentId').value = doc.id || doc._id;
        document.getElementById('currentFileName').textContent = doc.nombre_original;
        document.getElementById('currentFileSize').textContent = formatFileSize(doc.tamano_archivo);
        document.getElementById('editDocumentDescription').value = doc.descripcion || '';
        document.getElementById('editDocumentCategory').value = doc.categoria || '';
        
        // Formatear fecha para input type="date"
        let expirationDate = '';
        if (doc.fecha_vencimiento) {
            const date = new Date(doc.fecha_vencimiento);
            expirationDate = date.toISOString().split('T')[0];
        }
        document.getElementById('editDocumentExpiration').value = expirationDate;
        
        document.getElementById('editDocumentPerson').value = doc.persona?._id || doc.persona_id || '';
        
        // Información de solo lectura
        const uploadDate = new Date(doc.fecha_subida);
        document.getElementById('editDocumentUploadDate').textContent = formatDate(uploadDate);
        document.getElementById('editDocumentType').textContent = doc.tipo_archivo?.toUpperCase() || 'DESCONOCIDO';
        document.getElementById('editDocumentFileSize').textContent = formatFileSize(doc.tamano_archivo);

        // Resetear estado de reemplazo
        replaceFileCheck.checked = false;
        newFileContainer.style.display = 'none';
        editFileInput.value = '';
        selectedFile = null;
        document.getElementById('editFileInfo').style.display = 'none';

        // Remover preloader de carga
        removeLoadingOverlay(loadingOverlay);

        // Enfocar el primer elemento editable
        setTimeout(() => {
            document.getElementById('editDocumentDescription')?.focus();
        }, 100);

        console.log('✅ Modal abierto correctamente');

    } catch (error) {
        console.error('❌ Error abriendo modal de edición:', error);
        
        // Remover preloader si existe
        const loadingOverlay = editModal.querySelector('.modal-loading-overlay');
        if (loadingOverlay) {
            removeLoadingOverlay(loadingOverlay);
        }
        
        // Cerrar modal
        closeEditModal();
        
        // Mostrar error
        showAlert('Error al cargar información del documento: ' + error.message, 'error');
    }
}

/**
 * Cerrar modal de edición
 */
export function closeEditModal() {
    if (!editModal) return;
    
    // Limpiar todos los overlays
    removeEditPreloader();
    removeSuccessOverlay();
    removeErrorOverlay();
    
    // Remover overlays de carga
    const loadingOverlays = editModal.querySelectorAll('.modal-loading-overlay');
    loadingOverlays.forEach(overlay => {
        removeLoadingOverlay(overlay);
    });
    
    // Ocultar modal
    editModal.style.display = 'none';
    editModal.removeAttribute('open');
    
    // Limpiar formulario
    if (editForm) {
        editForm.reset();
    }
    selectedFile = null;
    
    // Restaurar scroll del body
    document.body.classList.remove('modal-open');
    
    console.log('🔒 Modal cerrado');
}

/**
 * Guardar cambios del documento
 */
async function saveDocumentChanges() {
    const documentId = document.getElementById('editDocumentId').value;
    const saveBtn = document.getElementById('saveEditDocumentBtn');
    
    // Validar que tenemos un ID de documento
    if (!documentId) {
        showAlert('Error: No se encontró el ID del documento', 'error');
        return;
    }
    
    try {
        console.log('💾 Intentando guardar cambios para documento:', documentId);
        
        // Validaciones
        const category = document.getElementById('editDocumentCategory').value;
        if (!category) {
            showAlert('Por favor, selecciona una categoría', 'warning');
            document.getElementById('editDocumentCategory').focus();
            return;
        }

        // Validar fecha de vencimiento
        const expirationDate = document.getElementById('editDocumentExpiration').value;
        if (expirationDate) {
            const today = new Date().toISOString().split('T')[0];
            if (expirationDate < today) {
                showAlert('La fecha de vencimiento no puede ser anterior a hoy', 'warning');
                document.getElementById('editDocumentExpiration').focus();
                return;
            }
        }

        // Deshabilitar botón y mostrar preloader en botón
        saveBtn.disabled = true;
        saveBtn.classList.add('btn--document-saving');
        const originalBtnText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<span style="opacity: 0;">Guardando Cambios</span>';
        
        // Mostrar preloader en el modal
        createEditPreloader({
            title: 'Actualizando documento',
            subtitle: 'Por favor, espera mientras guardamos los cambios...',
            statusText: 'Procesando solicitud'
        });

        // Preparar datos para enviar
        const datosActualizados = {
            descripcion: document.getElementById('editDocumentDescription').value,
            categoria: category,
            fecha_vencimiento: expirationDate || null,
            persona_id: document.getElementById('editDocumentPerson').value || null
        };

        console.log('📤 Datos a enviar:', datosActualizados);
        console.log('📎 ¿Tiene archivo nuevo?', replaceFileCheck.checked && selectedFile);

        let response;
        
        // Si hay archivo nuevo, usar FormData
        if (replaceFileCheck.checked && selectedFile) {
            console.log('📁 Enviando con FormData (archivo incluido)');
            
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('descripcion', datosActualizados.descripcion);
            formData.append('categoria', datosActualizados.categoria);
            
            if (datosActualizados.fecha_vencimiento) {
                formData.append('fecha_vencimiento', datosActualizados.fecha_vencimiento);
            }
            
            if (datosActualizados.persona_id) {
                formData.append('persona_id', datosActualizados.persona_id);
            }

            // Actualizar progreso
            updateEditProgress(30, 'Subiendo archivo...');
            
            // Usar api.uploadDocument con el ID para actualizar
            response = await api.uploadDocument(formData, documentId);
            
            // Actualizar progreso
            updateEditProgress(70, 'Procesando archivo...');
            
        } else {
            console.log('📄 Enviando sin archivo (solo JSON)');
            
            // Actualizar progreso
            updateEditProgress(40, 'Enviando datos...');
            
            // Usar PATCH para actualización parcial
            response = await api.patchDocument(documentId, datosActualizados);
            
            // Actualizar progreso
            updateEditProgress(80, 'Procesando cambios...');
        }

        console.log('📥 Respuesta del servidor:', response);

        if (!response.success) {
            throw new Error(response.message || 'Error al actualizar documento');
        }

        // Completar progreso
        updateEditProgress(100, '¡Completado!');
        
        // Esperar un momento para mostrar el progreso completo
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Mostrar estado de éxito
        removeEditPreloader();
        showSuccessOverlay(
            '¡Documento actualizado!',
            'Los cambios se han guardado correctamente.'
        );

        // Recargar documentos después del éxito
        if (window.loadDocuments) {
            console.log('🔄 Recargando lista de documentos...');
            setTimeout(async () => {
                await window.loadDocuments();
            }, 500);
        }

        // Disparar evento personalizado para notificar la actualización
        window.dispatchEvent(new CustomEvent('documentUpdated', { 
            detail: { documentId, success: true } 
        }));

        // Cerrar modal después de mostrar éxito
        setTimeout(() => {
            closeEditModal();
        }, 2000);

    } catch (error) {
        console.error('❌ Error guardando cambios:', error);
        
        // Mostrar estado de error
        removeEditPreloader();
        showErrorOverlay(
            'Error al guardar',
            'Hubo un problema al actualizar el documento. Intenta nuevamente.'
        );
        
        // Restaurar botón
        setTimeout(() => {
            saveBtn.disabled = false;
            saveBtn.classList.remove('btn--document-saving');
            saveBtn.innerHTML = originalBtnText || '<i class="fas fa-save"></i> Guardar Cambios';
        }, 3000);
        
        // Mostrar alerta adicional con detalles
        let errorMessage = 'Error al guardar cambios: ';
        
        if (error.message.includes('404')) {
            errorMessage += 'El documento no fue encontrado.';
        } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
            errorMessage += 'Error de conexión. Verifica tu internet.';
        } else if (error.message.includes('timeout')) {
            errorMessage += 'La solicitud tardó demasiado.';
        } else if (error.message.includes('413')) {
            errorMessage += 'El archivo es demasiado grande.';
        } else if (error.message.includes('415')) {
            errorMessage += 'Tipo de archivo no soportado.';
        } else {
            errorMessage += error.message;
        }
        
        showAlert(errorMessage, 'error');
        
        // Disparar evento de error
        window.dispatchEvent(new CustomEvent('documentUpdated', { 
            detail: { documentId, success: false, error: error.message } 
        }));
    }
}

/**
 * Cargar categorías en el select del modal de edición
 */
async function loadCategoriesForEdit() {
    try {
        console.log('📂 Cargando categorías...');
        const data = await api.getCategories();
        
        const select = document.getElementById('editDocumentCategory');
        
        if (data.success && data.categories) {
            const activeCategories = data.categories.filter(cat => cat.activo !== false);
            console.log(`✅ ${activeCategories.length} categorías cargadas`);
            
            select.innerHTML = '<option value="">Seleccionar categoría</option>' +
                activeCategories.map(cat => 
                    `<option value="${cat.nombre}">${cat.nombre} ${cat.documentCount ? `(${cat.documentCount})` : ''}</option>`
                ).join('');
        } else {
            console.warn('⚠️ No se pudieron cargar las categorías');
            select.innerHTML = '<option value="">No hay categorías disponibles</option>';
        }
    } catch (error) {
        console.error('❌ Error cargando categorías:', error);
        const select = document.getElementById('editDocumentCategory');
        select.innerHTML = '<option value="">Error cargando categorías</option>';
    }
}

/**
 * Cargar personas en el select del modal de edición
 */
async function loadPersonsForEdit() {
    try {
        console.log('👥 Cargando personas...');
        const data = await api.getPersons();
        
        const select = document.getElementById('editDocumentPerson');
        
        if (data.success && data.persons) {
            const activePersons = data.persons.filter(p => p.activo !== false);
            console.log(`✅ ${activePersons.length} personas cargadas`);
            
            select.innerHTML = '<option value="">Sin asignar</option>' +
                activePersons.map(person => {
                    const nombre = person.nombre || 'Sin nombre';
                    const departamento = person.departamento || 'Sin departamento';
                    return `<option value="${person._id}">${nombre} - ${departamento}</option>`;
                }).join('');
        } else {
            console.warn('⚠️ No se pudieron cargar las personas');
            select.innerHTML = '<option value="">No hay personas disponibles</option>';
        }
    } catch (error) {
        console.error('❌ Error cargando personas:', error);
        const select = document.getElementById('editDocumentPerson');
        select.innerHTML = '<option value="">Error cargando personas</option>';
    }
}

/**
 * Función de diagnóstico para probar endpoints
 */
export async function testDocumentUpdate(documentId) {
    try {
        console.group('🔍 DIAGNÓSTICO ENDPOINT UPDATE');
        
        // Prueba 1: Endpoint PUT sin archivo
        console.log('1️⃣ Probando PUT /documents/:id (sin archivo)...');
        try {
            const testData = {
                descripcion: 'Test de actualización',
                categoria: 'General'
            };
            
            const response = await api.updateDocument(documentId, testData);
            
            console.log('✅ PUT funciona:', response);
        } catch (error) {
            console.error('❌ PUT falló:', error.message);
        }
        
        // Prueba 2: Endpoint PATCH
        console.log('\n2️⃣ Probando PATCH /documents/:id...');
        try {
            const response = await api.patchDocument(documentId, { descripcion: 'Test PATCH' });
            
            console.log('✅ PATCH funciona:', response);
        } catch (error) {
            console.error('❌ PATCH falló:', error.message);
        }
        
        // Prueba 3: Verificar CORS
        console.log('\n3️⃣ Verificando CORS...');
        try {
            const response = await fetch(`http://localhost:4000/api/documents/${documentId}`, {
                method: 'OPTIONS'
            });
            
            console.log('✅ CORS headers:', {
                'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
                'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
                'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers')
            });
        } catch (error) {
            console.error('❌ Error CORS:', error.message);
        }
        
        console.groupEnd();
        
    } catch (error) {
        console.error('❌ Error en diagnóstico:', error);
    }
}

/**
 * Limpiar event listeners al desmontar
 */
export function cleanupEditDocumentModal() {
    document.removeEventListener('keydown', handleEscapeKey);
    
    // Limpiar overlays
    removeEditPreloader();
    removeSuccessOverlay();
    removeErrorOverlay();
}

export default {
    initEditDocumentModal,
    openEditDocumentModal,
    cleanupEditDocumentModal,
    closeEditModal,
    testDocumentUpdate
};