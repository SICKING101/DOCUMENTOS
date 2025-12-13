// =============================================================================
// src/frontend/modules/documentos/modals/editDocumentModal.js
// =============================================================================

import { api } from '../../../services/api.js';
import { showAlert, formatFileSize, formatDate } from '../../../utils.js';

let editModal, editForm;
let replaceFileCheck, newFileContainer, editFileInput;
let selectedFile = null;

/**
 * Inicializar el modal de edición de documentos
 */
export function initEditDocumentModal() {
    editModal = document.getElementById('editDocumentModal');
    editForm = document.getElementById('editDocumentForm');
    replaceFileCheck = document.getElementById('replaceFileCheck');
    newFileContainer = document.getElementById('newFileContainer');
    editFileInput = document.getElementById('editFileInput');

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

    console.log('✅ Modal de edición de documentos inicializado');
}

/**
 * Manejar tecla Escape para cerrar modal
 */
function handleEscapeKey(e) {
    if (e.key === 'Escape' && editModal.style.display === 'flex') {
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

        // Mostrar modal (usando display: flex como tus otros modales)
        editModal.style.display = 'flex';
        
        // Forzar reflow para activar animación
        void editModal.offsetWidth;
        
        // Agregar atributo open para compatibilidad CSS
        editModal.setAttribute('open', '');
        
        // Enfocar el primer elemento editable
        setTimeout(() => {
            document.getElementById('editDocumentDescription')?.focus();
        }, 100);

        console.log('✅ Modal abierto correctamente');

    } catch (error) {
        console.error('❌ Error abriendo modal de edición:', error);
        showAlert('Error al cargar información del documento: ' + error.message, 'error');
        closeEditModal();
    }
}

/**
 * Cerrar modal de edición
 */
export function closeEditModal() {
    if (!editModal) return;
    
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

        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

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

            // Verificar FormData
            for (let [key, value] of formData.entries()) {
                console.log(`  ${key}:`, value);
            }

            // Usar api.uploadDocument con el ID para actualizar
            response = await api.uploadDocument(formData, documentId);
            
        } else {
            console.log('📄 Enviando sin archivo (solo JSON)');
            
            // Usar PATCH para actualización parcial (más seguro que PUT)
            response = await api.patchDocument(documentId, datosActualizados);
        }

        console.log('📥 Respuesta del servidor:', response);

        if (!response.success) {
            throw new Error(response.message || 'Error al actualizar documento');
        }

        showAlert('✅ Documento actualizado correctamente', 'success');
        closeEditModal();

        // Recargar documentos
        if (window.loadDocuments) {
            console.log('🔄 Recargando lista de documentos...');
            await window.loadDocuments();
        } else {
            console.warn('⚠️ Función loadDocuments no disponible');
        }

        // Disparar evento personalizado para notificar la actualización
        window.dispatchEvent(new CustomEvent('documentUpdated', { 
            detail: { documentId } 
        }));

    } catch (error) {
        console.error('❌ Error guardando cambios:', error);
        console.error('❌ Stack:', error.stack);
        
        // Mensaje de error específico
        let errorMessage = 'Error al guardar cambios';
        
        if (error.message.includes('404')) {
            errorMessage = 'La ruta para actualizar documentos no existe (Error 404). Verifica el backend.';
        } else if (error.message.includes('JSON')) {
            errorMessage = 'Error en la respuesta del servidor. Verifica la consola para más detalles.';
        } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
            errorMessage = 'Error de conexión con el servidor. Verifica tu conexión a internet.';
        } else if (error.message.includes('timeout') || error.message.includes('timed out')) {
            errorMessage = 'La solicitud tardó demasiado. Intenta nuevamente.';
        } else {
            errorMessage = error.message;
        }
        
        showAlert(`❌ ${errorMessage}`, 'error');
        
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';
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
}

export default {
    initEditDocumentModal,
    openEditDocumentModal,
    cleanupEditDocumentModal,
    closeEditModal,
    testDocumentUpdate
};