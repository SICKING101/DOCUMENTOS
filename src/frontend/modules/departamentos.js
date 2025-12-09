import { DOM } from '../dom.js';
import { api } from '../services/api.js';
import { setLoadingState, showAlert } from '../utils.js';

// =============================================================================
// 1. MANEJO DEL MODAL DE DEPARTAMENTOS
// =============================================================================

/**
 * 1.1 Abrir modal para crear/editar departamento
 * Sirve para mostrar el formulario de departamento, inicializando los campos
 * con datos existentes si es edición o vacíos si es creación.
 */
function openDepartmentModal(departmentId = null) {
    console.log(`🏢 Abriendo modal de departamento: ${departmentId || 'Nuevo'}`);
    
    if (departmentId) {
        DOM.departmentModalTitle.textContent = 'Editar Departamento';
        const department = window.appState.departments.find(d => d._id === departmentId);
        if (department) {
            DOM.departmentId.value = department._id;
            DOM.departmentName.value = department.nombre;
            DOM.departmentDescription.value = department.descripcion || '';
            DOM.departmentColor.value = department.color || '#3b82f6';
            DOM.departmentIcon.value = department.icon || 'building';
        }
    } else {
        DOM.departmentModalTitle.textContent = 'Nuevo Departamento';
        DOM.departmentForm.reset();
        DOM.departmentId.value = '';
        DOM.departmentColor.value = '#3b82f6';
        DOM.departmentIcon.value = 'building';
    }
    
    DOM.departmentModal.style.display = 'flex';
}

/**
 * 1.2 Cerrar modal de departamentos
 * Oculta el formulario modal para crear/editar departamentos.
 */
function closeDepartmentModal() {
    console.log('❌ Cerrando modal de departamento');
    DOM.departmentModal.style.display = 'none';
}

// =============================================================================
// 2. OPERACIONES CRUD DE DEPARTAMENTOS
// =============================================================================

/**
 * 2.1 Guardar departamento (crear o actualizar)
 * Envía los datos del formulario a la API para persistir el departamento,
 * maneja validaciones y actualiza la interfaz tras guardar.
 */
async function saveDepartment() {
    if (!DOM.departmentName.value.trim()) {
        showAlert('El nombre del departamento es obligatorio', 'error');
        return;
    }
    
    try {
        setLoadingState(true, DOM.saveDepartmentBtn);
        
        const departmentData = {
            nombre: DOM.departmentName.value.trim(),
            descripcion: DOM.departmentDescription.value.trim(),
            color: DOM.departmentColor.value,
            icon: DOM.departmentIcon.value
        };
        
        console.log('💾 Guardando departamento:', departmentData);
        
        let data;
        if (DOM.departmentId.value) {
            data = await api.call(`/departments/${DOM.departmentId.value}`, {
                method: 'PUT',
                body: JSON.stringify(departmentData)
            });
        } else {
            data = await api.call('/departments', {
                method: 'POST',
                body: JSON.stringify(departmentData)
            });
        }
        
        if (data.success) {
            showAlert(data.message, 'success');
            await loadDepartments();
            closeDepartmentModal();
        } else {
            throw new Error(data.message);
        }
        
    } catch (error) {
        console.error('❌ Error guardando departamento:', error);
        showAlert('Error al guardar departamento: ' + error.message, 'error');
    } finally {
        setLoadingState(false, DOM.saveDepartmentBtn);
    }
}

/**
 * 2.2 Cargar lista de departamentos desde la API
 * Obtiene todos los departamentos del servidor y actualiza el estado global,
 * luego llama a las funciones de renderizado y poblamiento de selects.
 */
async function loadDepartments() {
    try {
        console.log('🏢 Cargando departamentos...');
        
        const data = await api.call('/departments');
        
        if (data.success) {
            window.appState.departments = data.departments || [];
            renderDepartments();
            populateDepartmentSelects();
            console.log(`✅ ${window.appState.departments.length} departamentos cargados`);
        } else {
            throw new Error(data.message);
        }
        
    } catch (error) {
        console.error('❌ Error cargando departamentos:', error);
    }
}

/**
 * 2.3 Editar departamento existente
 * Prepara el modal para edición cargando los datos del departamento seleccionado.
 */
function editDepartment(id) {
    console.log('✏️ Editando departamento:', id);
    openDepartmentModal(id);
}

/**
 * 2.4 Eliminar departamento con confirmación
 * Solicita confirmación al usuario y elimina el departamento mediante API,
 * luego recarga la lista de departamentos.
 */
async function deleteDepartment(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar este departamento? Las personas asociadas quedarán sin departamento.')) {
        return;
    }
    
    try {
        console.log('🗑️ Eliminando departamento:', id);
        
        const data = await api.call(`/departments/${id}`, {
            method: 'DELETE'
        });
        
        if (data.success) {
            showAlert(data.message, 'success');
            await loadDepartments();
        } else {
            throw new Error(data.message);
        }
        
    } catch (error) {
        console.error('❌ Error eliminando departamento:', error);
        showAlert('Error al eliminar departamento: ' + error.message, 'error');
    }
}

// =============================================================================
// 3. RENDERIZADO DE INTERFAZ
// =============================================================================

/**
 * 3.1 Renderizar departamentos en la interfaz
 * Muestra los departamentos como tarjetas de estadísticas.
 */
function renderDepartments() {
    if (DOM.departmentsStats) {
        DOM.departmentsStats.innerHTML = '';
        
        if (window.appState.departments.length === 0) {
            DOM.departmentsStats.innerHTML = `
                <article class="empty-state">
                    <i class="fas fa-building empty-state__icon"></i>
                    <h3 class="empty-state__title">No hay departamentos creados</h3>
                    <p class="empty-state__description">Crea el primer departamento para organizar las personas</p>
                </article>
            `;
            return;
        }
        
        window.appState.departments.forEach(department => {
            const departmentCard = document.createElement('article');
            departmentCard.className = 'stats__card stats__card--department';
            
            departmentCard.innerHTML = `
                <div class="stats__icon" style="background: linear-gradient(135deg, ${department.color || '#3b82f6'}, #2563eb);">
                    <i class="fas fa-${department.icon || 'building'}"></i>
                </div>
                <div class="stats__info">
                    <h3 class="stats__info-value">${department.personCount || 0}</h3>
                    <p class="stats__info-label">${department.nombre}</p>
                </div>
                <div class="stats__actions">
                    <button class="btn-icon btn-icon--sm" onclick="editDepartment('${department._id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-icon--sm btn-icon--danger" onclick="deleteDepartment('${department._id}')" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            DOM.departmentsStats.appendChild(departmentCard);
        });
    }
}

// =============================================================================
// 4. MANEJO DE SELECTS/FILTROS
// =============================================================================

/**
 * 4.1 Poblar todos los selects de departamentos en formularios
 * Llena los elementos <select> con los departamentos disponibles.
 */
function populateDepartmentSelects() {
    // Select en formulario de persona
    const personDepartmentSelect = document.getElementById('personDepartment');
    if (personDepartmentSelect) {
        populateDepartmentSelect(personDepartmentSelect);
    }
    
    // Select en formulario de editar persona
    const editPersonDepartmentSelect = document.getElementById('editPersonDepartment');
    if (editPersonDepartmentSelect) {
        populateDepartmentSelect(editPersonDepartmentSelect);
    }
}

/**
 * 4.2 Poblar un select de departamentos específico
 * Utilidad genérica para llenar cualquier elemento <select> con los departamentos disponibles.
 */
function populateDepartmentSelect(selectElement) {
    if (!selectElement) return;
    
    selectElement.innerHTML = '<option value="">Seleccionar departamento</option>';
    window.appState.departments.forEach(department => {
        const option = document.createElement('option');
        option.value = department.nombre;
        option.textContent = department.nombre;
        selectElement.appendChild(option);
    });
}

// =============================================================================
// 5. HANDLERS/CONTROLADORES
// =============================================================================

/**
 * 5.1 Handler para guardar departamento
 * Función wrapper para ser usada como event listener en el botón de guardar.
 */
function handleSaveDepartment() {
    console.log('💾 Guardando departamento...');
    saveDepartment();
}

// Exponer funciones globalmente para onclick en HTML
window.editDepartment = editDepartment;
window.deleteDepartment = deleteDepartment;

export { 
    openDepartmentModal, 
    closeDepartmentModal, 
    saveDepartment, 
    loadDepartments, 
    renderDepartments, 
    populateDepartmentSelects, 
    populateDepartmentSelect, 
    editDepartment, 
    deleteDepartment, 
    handleSaveDepartment 
};
