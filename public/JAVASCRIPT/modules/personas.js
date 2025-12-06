import { DOM } from '../dom.js';
import { apiCall } from '../api.js';
import { setLoadingState, showAlert, isValidEmail } from '../utils.js';

// =============================================================================
// 1. MANEJO DEL MODAL DE PERSONAS
// =============================================================================

/**
 * 1.1 Abrir modal para crear/editar persona
 * Muestra el formulario de persona, pre-cargando datos si es edición
 * o limpiando campos si es creación nueva.
 */
function openPersonModal(personId = null) {
    console.log(`👤 Abriendo modal de persona: ${personId || 'Nueva'}`);
    
    if (personId) {
        DOM.personModalTitle.textContent = 'Editar Persona';
        const person = window.appState.persons.find(p => p._id === personId);
        if (person) {
            DOM.personId.value = person._id;
            DOM.personName.value = person.nombre;
            DOM.personEmail.value = person.email;
            DOM.personPhone.value = person.telefono || '';
            DOM.personDepartment.value = person.departamento || '';
            DOM.personPosition.value = person.puesto || '';
        }
    } else {
        DOM.personModalTitle.textContent = 'Agregar Persona';
        DOM.personForm.reset();
        DOM.personId.value = '';
    }
    
    DOM.personModal.style.display = 'flex';
}

/**
 * 1.2 Cerrar modal de personas
 * Oculta el formulario modal para crear/editar personas.
 */
function closePersonModal() {
    console.log('❌ Cerrando modal de persona');
    DOM.personModal.style.display = 'none';
}

// =============================================================================
// 2. OPERACIONES CRUD DE PERSONAS
// =============================================================================

/**
 * 2.1 Guardar persona (crear o actualizar)
 * Valida los datos del formulario y los envía a la API para persistir,
 * luego actualiza la interfaz y el estado de la aplicación.
 */
async function savePerson() {
    // Validaciones
    if (!DOM.personName.value.trim() || !DOM.personEmail.value.trim()) {
        showAlert('Nombre y email son obligatorios', 'error');
        return;
    }
    
    if (!isValidEmail(DOM.personEmail.value)) {
        showAlert('Por favor ingresa un email válido', 'error');
        return;
    }
    
    try {
        setLoadingState(true, DOM.savePersonBtn);
        
        const personData = {
            nombre: DOM.personName.value.trim(),
            email: DOM.personEmail.value.trim(),
            telefono: DOM.personPhone.value.trim(),
            departamento: DOM.personDepartment.value.trim(),
            puesto: DOM.personPosition.value.trim()
        };
        
        console.log('💾 Guardando persona:', personData);
        
        let data;
        if (DOM.personId.value) {
            // Actualizar persona existente
            data = await apiCall(`/persons/${DOM.personId.value}`, {
                method: 'PUT',
                body: JSON.stringify(personData)
            });
        } else {
            // Crear nueva persona
            data = await apiCall('/persons', {
                method: 'POST',
                body: JSON.stringify(personData)
            });
        }
        
        if (data.success) {
            showAlert(data.message, 'success');
            await loadPersons();
            closePersonModal();
            
            // Actualizar dashboard si está visible
            if (window.appState.currentTab === 'dashboard') {
                await window.loadDashboardData();
            }
        } else {
            throw new Error(data.message);
        }
        
    } catch (error) {
        console.error('❌ Error guardando persona:', error);
        showAlert('Error al guardar persona: ' + error.message, 'error');
    } finally {
        setLoadingState(false, DOM.savePersonBtn);
    }
}

/**
 * 2.2 Cargar lista de personas desde la API
 * Obtiene todas las personas registradas y actualiza el estado global,
 * luego llama a funciones de renderizado y poblamiento de selects.
 */
async function loadPersons() {
    try {
        console.log('👥 Cargando personas...');
        
        const data = await apiCall('/persons');
        
        if (data.success) {
            window.appState.persons = data.persons || [];
            renderPersonsTable();
            populatePersonSelect();
            populateSearchPersonSelect();
            console.log(`✅ ${window.appState.persons.length} personas cargadas`);
        } else {
            throw new Error(data.message);
        }
        
    } catch (error) {
        console.error('❌ Error cargando personas:', error);
        showAlert('Error al cargar personas: ' + error.message, 'error');
    }
}

/**
 * 2.3 Editar persona existente
 * Prepara el modal para edición cargando los datos de la persona seleccionada.
 */
function editPerson(id) {
    console.log('✏️ Editando persona:', id);
    openPersonModal(id);
}

/**
 * 2.4 Eliminar persona con confirmación
 * Solicita confirmación al usuario y elimina la persona mediante API,
 * luego recarga la lista y actualiza el dashboard si es necesario.
 */
async function deletePerson(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta persona?')) {
        return;
    }
    
    try {
        console.log('🗑️ Eliminando persona:', id);
        
        const data = await apiCall(`/persons/${id}`, {
            method: 'DELETE'
        });
        
        if (data.success) {
            showAlert(data.message, 'success');
            await loadPersons();
            
            // Actualizar dashboard si está visible
            if (window.appState.currentTab === 'dashboard') {
                await window.loadDashboardData();
            }
        } else {
            throw new Error(data.message);
        }
        
    } catch (error) {
        console.error('❌ Error eliminando persona:', error);
        showAlert('Error al eliminar persona: ' + error.message, 'error');
    }
}

// =============================================================================
// 3. RENDERIZADO DE INTERFAZ
// =============================================================================

/**
 * 3.1 Renderizar tabla de personas
 * Muestra la lista de personas en formato de tabla en la sección correspondiente.
 */
function renderPersonsTable() {
    if (!DOM.personasTableBody) return;
    
    DOM.personasTableBody.innerHTML = '';
    
    if (window.appState.persons.length === 0) {
        DOM.personasTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <i class="fas fa-users empty-state__icon"></i>
                    <h3 class="empty-state__title">No hay personas registradas</h3>
                    <p class="empty-state__description">Agrega la primera persona para comenzar</p>
                </td>
            </tr>
        `;
        return;
    }
    
    window.appState.persons.forEach(person => {
        const row = document.createElement('tr');
        row.className = 'table__row';
        
        row.innerHTML = `
            <td class="table__cell">${person.nombre}</td>
            <td class="table__cell">${person.email}</td>
            <td class="table__cell">${person.telefono || '-'}</td>
            <td class="table__cell">${person.departamento || '-'}</td>
            <td class="table__cell">${person.puesto || '-'}</td>
            <td class="table__cell">
                <button class="btn btn--sm btn--outline" onclick="editPerson('${person._id}')" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn--sm btn--danger" onclick="deletePerson('${person._id}')" title="Eliminar">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        DOM.personasTableBody.appendChild(row);
    });
}

// =============================================================================
// 4. MANEJO DE SELECTS/FILTROS
// =============================================================================

/**
 * 4.1 Poblar select de personas en formulario de documentos
 * Llena el dropdown de personas para asignar documentos a personas específicas.
 */
function populatePersonSelect() {
    if (!DOM.documentPerson) return;
    
    DOM.documentPerson.innerHTML = '<option value="">Seleccionar persona</option>';
    
    window.appState.persons.forEach(person => {
        const option = document.createElement('option');
        option.value = person._id;
        option.textContent = person.nombre;
        DOM.documentPerson.appendChild(option);
    });
}

/**
 * 4.2 Poblar select de personas en búsqueda avanzada
 * Llena el dropdown para filtrar documentos por persona en la sección de búsqueda.
 */
function populateSearchPersonSelect() {
    if (!DOM.searchPerson) return;
    
    DOM.searchPerson.innerHTML = '<option value="">Todas las personas</option>';
    
    window.appState.persons.forEach(person => {
        const option = document.createElement('option');
        option.value = person._id;
        option.textContent = person.nombre;
        DOM.searchPerson.appendChild(option);
    });
}

// =============================================================================
// 5. HANDLERS/CONTROLADORES
// =============================================================================

/**
 * 5.1 Handler para guardar persona
 * Función wrapper para ser usada como event listener en el botón de guardar.
 */
function handleSavePerson() {
    console.log('💾 Guardando persona...');
    savePerson();
}

export { 
    openPersonModal, 
    closePersonModal, 
    savePerson, 
    loadPersons, 
    renderPersonsTable, 
    populatePersonSelect, 
    populateSearchPersonSelect, 
    editPerson, 
    deletePerson, 
    handleSavePerson 
};