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
    document.getElementById('saveEditDocumentBtn')?.addEventListener('click', saveDocumentChanges);
    document.getElementById('browseEditFileBtn')?.addEventListener('click', () => editFileInput.click());
    
    replaceFileCheck?.addEventListener('change', toggleFileReplacement);
    editFileInput?.addEventListener('change', handleFileSelection);

    // Cerrar modal con click en backdrop o close button
    editModal?.addEventListener('click', (e) => {
        if (e.target === editModal || e.target.classList.contains('modal__close')) {
            closeEditModal();
        }
    });

    console.log('✅ Modal de edición de documentos inicializado');
}

/**
 * Mostrar/ocultar sección de reemplazo de archivo
 */
function toggleFileReplacement() {
    if (replaceFileCheck.checked) {
        newFileContainer.style.display = 'block';
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
        // Obtener información del documento
        const response = await api.call(`/documents/${documentId}/info`);
        
        if (!response.success) {
            throw new Error(response.message || 'Error al obtener información del documento');
        }

        const doc = response.document;

        // Cargar categorías y personas
        await Promise.all([
            loadCategoriesForEdit(),
            loadPersonsForEdit()
        ]);

        // Llenar formulario con datos actuales
        document.getElementById('editDocumentId').value = doc.id;
        document.getElementById('currentFileName').textContent = doc.nombre_original;
        document.getElementById('currentFileSize').textContent = formatFileSize(doc.tamano_archivo);
        document.getElementById('editDocumentDescription').value = doc.descripcion || '';
        document.getElementById('editDocumentCategory').value = doc.categoria || '';
        document.getElementById('editDocumentExpiration').value = doc.fecha_vencimiento ? doc.fecha_vencimiento.split('T')[0] : '';
        document.getElementById('editDocumentPerson').value = doc.persona?._id || '';
        
        // Información de solo lectura
        document.getElementById('editDocumentUploadDate').textContent = formatDate(doc.fecha_subida);
        document.getElementById('editDocumentType').textContent = doc.tipo_archivo.toUpperCase();

        // Resetear estado de reemplazo
        replaceFileCheck.checked = false;
        newFileContainer.style.display = 'none';
        editFileInput.value = '';
        selectedFile = null;

        // Mostrar modal
        editModal.showModal();

    } catch (error) {
        console.error('Error abriendo modal de edición:', error);
        showAlert('Error al cargar información del documento: ' + error.message, 'error');
    }
}

/**
 * Cerrar modal de edición
 */
function closeEditModal() {
    editModal?.close();
    editForm?.reset();
    selectedFile = null;
}

/**
 * Guardar cambios del documento
 */
async function saveDocumentChanges() {
    try {
        const documentId = document.getElementById('editDocumentId').value;
        const saveBtn = document.getElementById('saveEditDocumentBtn');
        
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

        const formData = new FormData();
        
        // Agregar archivo si se seleccionó uno nuevo
        if (replaceFileCheck.checked && selectedFile) {
            formData.append('file', selectedFile);
        }

        // Agregar otros campos
        formData.append('descripcion', document.getElementById('editDocumentDescription').value);
        formData.append('categoria', document.getElementById('editDocumentCategory').value);
        formData.append('fecha_vencimiento', document.getElementById('editDocumentExpiration').value);
        formData.append('persona_id', document.getElementById('editDocumentPerson').value);

        const response = await fetch(`/api/documents/${documentId}`, {
            method: 'PUT',
            body: formData
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'Error al actualizar documento');
        }

        showAlert(data.message || 'Documento actualizado correctamente', 'success');
        closeEditModal();

        // Recargar documentos
        if (window.loadDocuments) {
            await window.loadDocuments();
        }

    } catch (error) {
        console.error('Error guardando cambios:', error);
        showAlert('Error al guardar cambios: ' + error.message, 'error');
    } finally {
        const saveBtn = document.getElementById('saveEditDocumentBtn');
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';
    }
}

/**
 * Cargar categorías en el select del modal de edición
 */
async function loadCategoriesForEdit() {
    try {
        const data = await api.call('/categories');
        const select = document.getElementById('editDocumentCategory');
        
        if (data.success && data.categories) {
            const activeCategories = data.categories.filter(cat => cat.activo);
            select.innerHTML = '<option value="">Seleccionar categoría</option>' +
                activeCategories.map(cat => 
                    `<option value="${cat.nombre}">${cat.nombre}</option>`
                ).join('');
        }
    } catch (error) {
        console.error('Error cargando categorías:', error);
    }
}

/**
 * Cargar personas en el select del modal de edición
 */
async function loadPersonsForEdit() {
    try {
        const data = await api.call('/persons');
        const select = document.getElementById('editDocumentPerson');
        
        if (data.success && data.persons) {
            const activePersons = data.persons.filter(p => p.activo);
            select.innerHTML = '<option value="">Sin asignar</option>' +
                activePersons.map(person => 
                    `<option value="${person._id}">${person.nombre} - ${person.departamento || 'Sin departamento'}</option>`
                ).join('');
        }
    } catch (error) {
        console.error('Error cargando personas:', error);
    }
}

export default {
    initEditDocumentModal,
    openEditDocumentModal
};
