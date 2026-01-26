import { DOM } from '../dom.js';
import { api } from '../services/api.js';
import { setLoadingState, showAlert, showConfirmModal, showActionModal } from '../utils.js';

// =============================================================================
// 0. FUNCIONES DE PRELOADER MEJORADAS
// =============================================================================

/**
 * 0.1 Mostrar preloader de departamentos con timeout mejorado
 */
function showDepartmentPreloader(message = 'Cargando departamentos...', duration = 1500) {
    if (DOM.departmentsStats) {
        DOM.departmentsStats.innerHTML = `
            <div class="department-preloader">
                <div class="department-preloader__spinner"></div>
                <p class="department-preloader__text">${message}</p>
                <div class="department-preloader__dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
    }
    
    // Retornar una promesa que se resuelve después del tiempo mínimo
    return new Promise(resolve => {
        setTimeout(resolve, duration);
    });
}

/**
 * 0.2 Mostrar preloader overlay para operaciones críticas
 */
function showDepartmentOverlayPreloader(title = 'Procesando...', subtitle = 'Por favor, espera un momento') {
    const overlay = document.createElement('div');
    overlay.className = 'department-preloader-overlay';
    overlay.id = 'departmentPreloaderOverlay';
    
    overlay.innerHTML = `
        <div class="department-preloader-overlay__content">
            <div class="department-preloader-overlay__icon">
                <i class="fas fa-building"></i>
            </div>
            <h3 class="department-preloader-overlay__title">${title}</h3>
            <p class="department-preloader-overlay__subtitle">${subtitle}</p>
            <div class="department-preloader-overlay__progress">
                <div class="department-preloader-overlay__progress-bar"></div>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Retornar función para ocultar
    return {
        hide: () => {
            const overlayEl = document.getElementById('departmentPreloaderOverlay');
            if (overlayEl) {
                overlayEl.style.opacity = '0';
                overlayEl.style.visibility = 'hidden';
                setTimeout(() => {
                    if (overlayEl.parentNode) {
                        overlayEl.parentNode.removeChild(overlayEl);
                    }
                }, 300);
            }
        }
    };
}

/**
 * 0.3 Mostrar cards skeleton loading
 */
function showDepartmentSkeletonCards(count = 3) {
    if (DOM.departmentsStats) {
        let skeletonHTML = '';
        for (let i = 0; i < count; i++) {
            skeletonHTML += `
                <div class="department-card-preloader">
                    <div class="department-card-preloader__icon"></div>
                    <div class="department-card-preloader__name"></div>
                    <div class="department-card-preloader__count"></div>
                </div>
            `;
        }
        DOM.departmentsStats.innerHTML = skeletonHTML;
    }
}

// =============================================================================
// 1. MANEJO DEL MODAL DE DEPARTAMENTOS
// =============================================================================

/**
 * 1.1 Abrir modal para crear/editar departamento
 */
function openDepartmentModal(departmentId = null) {
    console.log(`🏢 Abriendo modal de departamento: ${departmentId || 'Nuevo'}`);
    
    // Limpiar errores previos
    clearDepartmentFormErrors();
    
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
    setTimeout(() => DOM.departmentName.focus(), 100);
}

/**
 * 1.2 Cerrar modal de departamentos
 */
function closeDepartmentModal() {
    console.log('❌ Cerrando modal de departamento');
    DOM.departmentModal.style.display = 'none';
    clearDepartmentFormErrors();
}

/**
 * 1.3 Limpiar errores del formulario
 */
function clearDepartmentFormErrors() {
    const errorElements = document.querySelectorAll('.validation-message--error');
    errorElements.forEach(el => el.remove());
    
    const errorFields = document.querySelectorAll('.field--error-highlight');
    errorFields.forEach(el => {
        el.classList.remove('field--error-highlight');
        el.removeAttribute('aria-invalid');
    });
}

/**
 * 1.4 Mostrar error en campo específico
 */
function showDepartmentFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    // Agregar clase de error al campo
    field.classList.add('field--error-highlight');
    field.setAttribute('aria-invalid', 'true');
    
    // Crear mensaje de error
    const errorMessage = document.createElement('div');
    errorMessage.className = 'validation-message validation-message--error';
    errorMessage.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    
    // Insertar después del campo
    field.parentNode.appendChild(errorMessage);
    
    // Enfocar el campo con error
    field.focus();
}

// =============================================================================
// 2. OPERACIONES CRUD DE DEPARTAMENTOS (CORREGIDAS)
// =============================================================================

/**
 * 2.1 Validar formulario de departamento
 */
function validateDepartmentForm() {
    let isValid = true;
    clearDepartmentFormErrors();
    
    // Validar nombre
    if (!DOM.departmentName.value.trim()) {
        showDepartmentFieldError('departmentName', 'El nombre del departamento es obligatorio');
        isValid = false;
    } else if (DOM.departmentName.value.trim().length < 2) {
        showDepartmentFieldError('departmentName', 'El nombre debe tener al menos 2 caracteres');
        isValid = false;
    }
    
    // Validar descripción (opcional, pero si tiene, verificar longitud)
    if (DOM.departmentDescription.value.trim().length > 500) {
        showDepartmentFieldError('departmentDescription', 'La descripción no puede exceder los 500 caracteres');
        isValid = false;
    }
    
    return isValid;
}

/**
 * 2.2 Guardar departamento (crear o actualizar) - CORREGIDO
 */
async function saveDepartment() {
    if (!validateDepartmentForm()) {
        return;
    }
    
    let preloader = null;
    
    try {
        // Mostrar overlay preloader con tiempo mínimo garantizado
        preloader = showDepartmentOverlayPreloader(
            'Guardando departamento...', 
            'Por favor, espera mientras se procesa la información'
        );
        
        // Tiempo mínimo de preloader: 1.5 segundos
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const departmentData = {
            nombre: DOM.departmentName.value.trim(),
            descripcion: DOM.departmentDescription.value.trim(),
            color: DOM.departmentColor.value,
            icon: DOM.departmentIcon.value
        };
        
        console.log('💾 Guardando departamento:', departmentData);
        
        let data;
        if (DOM.departmentId.value) {
            data = await api.updateDepartment(DOM.departmentId.value, departmentData);
        } else {
            data = await api.createDepartment(departmentData);
        }
        
        // Tiempo adicional para simular procesamiento
        await new Promise(resolve => setTimeout(resolve, 800));
        
        if (data.success) {
            showAlert(data.message, 'success');
            await loadDepartments();
            closeDepartmentModal();
            
            // Recargar el select en el modal de personas
            if (window.refreshDepartmentSelect) {
                window.refreshDepartmentSelect();
            }
        } else {
            throw new Error(data.message || 'Error desconocido al guardar');
        }
        
    } catch (error) {
        console.error('❌ Error guardando departamento:', error);
        showAlert('Error al guardar departamento: ' + error.message, 'error');
    } finally {
        // Ocultar preloader si existe
        if (preloader) {
            preloader.hide();
        }
        setLoadingState(false, DOM.saveDepartmentBtn, 'Guardar');
    }
}

/**
 * 2.3 Cargar lista de departamentos - CORREGIDO
 */
async function loadDepartments() {
    try {
        console.log('🏢 Cargando departamentos...');
        
        // Mostrar skeleton cards con tiempo mínimo
        showDepartmentSkeletonCards(3);
        
        // Tiempo mínimo para mostrar skeleton: 1 segundo
        await showDepartmentPreloader('Cargando departamentos...', 1000);
        
        const data = await api.call('/departments');
        
        // Tiempo adicional para simular procesamiento
        await new Promise(resolve => setTimeout(resolve, 600));
        
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
        showAlert('Error al cargar departamentos: ' + error.message, 'error');
        
        if (DOM.departmentsStats) {
            DOM.departmentsStats.innerHTML = `
                <article class="empty-state">
                    <i class="fas fa-exclamation-triangle empty-state__icon"></i>
                    <h3 class="empty-state__title">Error al cargar departamentos</h3>
                    <p class="empty-state__description">${error.message}</p>
                    <button class="btn btn--primary" onclick="loadDepartments()">Reintentar</button>
                </article>
            `;
        }
    }
}

/**
 * 2.4 Editar departamento existente
 */
function editDepartment(id) {
    console.log('✏️ Editando departamento:', id);
    openDepartmentModal(id);
}

/**
 * 2.5 Eliminar departamento con modal de confirmación - CORREGIDO EL ERROR
 */
async function deleteDepartment(id) {
    const department = window.appState.departments.find(d => d._id === id);
    if (!department) return;
    
    // Mostrar modal de confirmación personalizado
    showConfirmModal({
        title: 'Eliminar Departamento',
        message: `¿Estás seguro de eliminar el departamento "${department.nombre}"?<br>
                 <small class="text-warning">Las personas asociadas quedarán sin departamento.</small>`,
        icon: 'trash',
        iconClass: 'fas fa-trash text-danger',
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        onConfirm: async () => {
            let preloader = null;
            
            try {
                console.log('🗑️ Eliminando departamento:', id);
                
                // Mostrar overlay preloader para eliminación
                preloader = showDepartmentOverlayPreloader(
                    'Eliminando departamento...',
                    'Esto puede tomar algunos segundos'
                );
                
                // Tiempo mínimo de preloader: 1.2 segundos
                await new Promise(resolve => setTimeout(resolve, 1200));
                
                const data = await api.call(`/departments/${id}`, {
                    method: 'DELETE'
                });
                
                // Tiempo adicional para simular procesamiento
                await new Promise(resolve => setTimeout(resolve, 600));
                
                if (data.success) {
                    // Ocultar preloader
                    if (preloader) preloader.hide();
                    
                    // Mostrar modal de éxito
                    showActionModal({
                        type: 'success',
                        title: '¡Eliminado!',
                        message: data.message,
                        onClose: async () => {
                            await loadDepartments();
                        }
                    });
                } else {
                    throw new Error(data.message);
                }
                
            } catch (error) {
                console.error('❌ Error eliminando departamento:', error);
                
                // Ocultar preloader si existe
                if (preloader) preloader.hide();
                
                // Mostrar modal de error
                showActionModal({
                    type: 'error',
                    title: 'Error',
                    message: 'Error al eliminar departamento: ' + error.message
                });
            }
        },
        onCancel: () => {
            console.log('❌ Eliminación cancelada');
        }
    });
}

// =============================================================================
// 3. RENDERIZADO DE INTERFAZ
// =============================================================================

/**
 * 3.1 Renderizar departamentos en la interfaz
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
                    <button class="btn btn--primary" onclick="openDepartmentModal()">
                        <i class="fas fa-plus"></i> Crear Departamento
                    </button>
                </article>
            `;
            return;
        }
        
        window.appState.departments.forEach(department => {
            const departmentCard = document.createElement('article');
            departmentCard.className = 'stats__card stats__card--department';
            departmentCard.setAttribute('data-department-id', department._id);
            
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
 */
function populateDepartmentSelect(selectElement) {
    if (!selectElement) return;
    
    selectElement.innerHTML = '<option value="">Seleccionar departamento</option>';
    window.appState.departments.forEach(department => {
        const option = document.createElement('option');
        option.value = department.nombre;
        option.textContent = department.nombre;
        option.setAttribute('data-color', department.color || '#3b82f6');
        option.setAttribute('data-icon', department.icon || 'building');
        selectElement.appendChild(option);
    });
}

// =============================================================================
// 5. HANDLERS/CONTROLADORES
// =============================================================================

/**
 * 5.1 Handler para guardar departamento
 */
function handleSaveDepartment(event) {
    if (event) event.preventDefault();
    console.log('💾 Guardando departamento...');
    saveDepartment();
}

/**
 * 5.2 Handler para cerrar modal con Escape
 */
function handleEscapeKey(event) {
    if (event.key === 'Escape' && DOM.departmentModal.style.display === 'flex') {
        closeDepartmentModal();
    }
}

/**
 * 5.3 Handler para cerrar modal haciendo clic fuera
 */
function handleOutsideClick(event) {
    if (event.target === DOM.departmentModal) {
        closeDepartmentModal();
    }
}

// Event Listeners
if (DOM.departmentForm) {
    DOM.departmentForm.addEventListener('submit', handleSaveDepartment);
}

if (DOM.departmentModal) {
    DOM.departmentModal.addEventListener('click', handleOutsideClick);
}

document.addEventListener('keydown', handleEscapeKey);

// Exponer funciones globalmente
window.editDepartment = editDepartment;
window.deleteDepartment = deleteDepartment;
window.loadDepartments = loadDepartments;
window.openDepartmentModal = openDepartmentModal;

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
    handleSaveDepartment,
    showDepartmentPreloader,
    showDepartmentOverlayPreloader
};