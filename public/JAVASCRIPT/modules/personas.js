import { DOM } from '../dom.js';
import { apiCall } from '../api.js';
import { setLoadingState, showAlert, isValidEmail } from '../utils.js';

// =============================================================================
// FUNCIONES DE PERSONAS (CRUD)
// =============================================================================
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

function closePersonModal() {
    console.log('❌ Cerrando modal de persona');
    DOM.personModal.style.display = 'none';
}

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

function editPerson(id) {
    console.log('✏️ Editando persona:', id);
    openPersonModal(id);
}

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