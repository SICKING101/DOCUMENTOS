// src/frontend/modules/personas.js

import { DOM } from '../dom.js';
import { api } from '../services/api.js';
import { setLoadingState, showAlert, isValidEmail } from '../utils.js';
import { 
    canView, 
    canAction, 
    showNoPermissionAlert,
    hasPermission,
    PERMISSIONS
} from '../permissions.js';

// Variables globales para filtros
let currentFilters = {
    search: '',
    puesto: '',
    sort: 'nombre-asc'
};

// =============================================================================
// 1. SISTEMA DE ALERTAS MEJORADO CON PERMISOS
// =============================================================================

/**
 * Mostrar alerta específica para formularios - Versión mejorada
 */
function showFormAlert(message, type = 'error', field = null) {
    // Primero, eliminar cualquier alerta existente
    removeExistingAlerts();
    
    // Crear contenedor de alertas principal si no existe
    let alertContainer = document.querySelector('.form-alerts-container');
    if (!alertContainer) {
        alertContainer = document.createElement('div');
        alertContainer.className = 'form-alerts-container form-alerts-container--global';
        
        // Insertar al principio del body para que sea visible en toda la pantalla
        const appContainer = document.querySelector('.app-container') || document.querySelector('main') || document.body;
        appContainer.insertBefore(alertContainer, appContainer.firstChild);
    }
    
    // Crear alerta con estilos mejorados
    const alert = document.createElement('div');
    alert.className = `alert alert--${type} alert--form alert--global`;
    alert.setAttribute('role', 'alert');
    alert.setAttribute('aria-live', 'assertive');
    
    // Determinar icono según tipo
    let iconClass = 'fa-exclamation-circle';
    let alertTitle = 'Error';
    
    switch(type) {
        case 'success':
            iconClass = 'fa-check-circle';
            alertTitle = 'Éxito';
            break;
        case 'warning':
            iconClass = 'fa-exclamation-triangle';
            alertTitle = 'Advertencia';
            break;
        case 'info':
            iconClass = 'fa-info-circle';
            alertTitle = 'Información';
            break;
        default:
            iconClass = 'fa-exclamation-circle';
            alertTitle = 'Error';
    }
    
    alert.innerHTML = `
        <div class="alert__icon">
            <i class="fas ${iconClass}"></i>
        </div>
        <div class="alert__content">
            <h4 class="alert__title">${alertTitle}</h4>
            <p class="alert__message">${message}</p>
        </div>
        <button class="alert__close" onclick="this.parentElement.remove()" aria-label="Cerrar alerta">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    alertContainer.appendChild(alert);
    
    // Agregar animación de entrada
    setTimeout(() => {
        alert.classList.add('alert--visible');
    }, 10);
    
    // Si hay un campo específico, resaltarlo
    if (field) {
        highlightField(field);
    }
    
    // Auto-remover después de 10 segundos para alertas de error
    if (type === 'error' || type === 'warning') {
        setTimeout(() => {
            if (alert.parentNode) {
                alert.classList.add('fade-out');
                setTimeout(() => {
                    if (alert.parentNode) {
                        alert.remove();
                    }
                    // Limpiar contenedor si está vacío
                    if (alertContainer.children.length === 0) {
                        alertContainer.remove();
                    }
                }, 300);
            }
        }, 10000);
    }
}

/**
 * Mostrar alerta de eliminación específica
 */
function showDeleteAlert(personName, errorMessage, type = 'error') {
    // Crear una alerta especial para eliminación
    const alertContainer = document.createElement('div');
    alertContainer.className = 'delete-alert-container';
    
    const alert = document.createElement('div');
    alert.className = `alert alert--${type} alert--delete`;
    alert.innerHTML = `
        <div class="alert__icon">
            <i class="fas fa-trash"></i>
        </div>
        <div class="alert__content">
            <h4 class="alert__title">Error al eliminar a "${personName}"</h4>
            <p class="alert__message">${errorMessage}</p>
            <div class="alert__actions">
                <button class="btn btn--sm btn--outline" onclick="this.closest('.alert').remove()">
                    <i class="fas fa-times"></i> Cerrar
                </button>
            </div>
        </div>
    `;
    
    alertContainer.appendChild(alert);
    
    // Insertar después de la tabla
    const personasTab = document.querySelector('.tab-content[data-tab="personas"]');
    if (personasTab) {
        personasTab.insertBefore(alertContainer, personasTab.firstChild);
    } else {
        document.body.insertBefore(alertContainer, document.body.firstChild);
    }
    
    // Auto-remover después de 10 segundos
    setTimeout(() => {
        alert.classList.add('fade-out');
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
            if (alertContainer.parentNode) {
                alertContainer.remove();
            }
        }, 300);
    }, 10000);
}

/**
 * Remover alertas existentes
 */
function removeExistingAlerts() {
    const alerts = document.querySelectorAll('.alert--form');
    alerts.forEach(alert => {
        alert.classList.add('fade-out');
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 300);
    });
    
    // Limpiar contenedor de alertas si está vacío
    const alertContainer = document.querySelector('.form-alerts-container');
    if (alertContainer && alertContainer.children.length === 0) {
        alertContainer.remove();
    }
}

/**
 * Resaltar campo con error
 */
function highlightField(fieldName) {
    let fieldElement;
    
    switch(fieldName) {
        case 'nombre':
            fieldElement = DOM.personName;
            break;
        case 'email':
            fieldElement = DOM.personEmail;
            break;
        case 'telefono':
            fieldElement = DOM.personPhone;
            break;
        case 'departamento':
            fieldElement = document.getElementById('personDepartment');
            break;
        case 'puesto':
            fieldElement = DOM.personPosition;
            break;
        default:
            return;
    }
    
    if (fieldElement) {
        fieldElement.classList.add('field--error-highlight');
        
        // Scroll al campo si es necesario
        fieldElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
        
        // Remover resaltado después de 3 segundos
        setTimeout(() => {
            fieldElement.classList.remove('field--error-highlight');
        }, 3000);
    }
}

// =============================================================================
// 2. MANEJO DEL MODAL DE PERSONAS CON PERMISOS
// =============================================================================

/**
 * 2.1 Verificar permisos antes de abrir modal
 */
function checkPersonPermissions(action) {
    console.log(`🔐 Verificando permisos para ${action} persona...`);
    
    switch(action) {
        case 'create':
            if (!canAction('personas')) {
                showNoPermissionAlert('personas');
                showFormAlert('No tienes permiso para crear personas', 'error');
                return false;
            }
            break;
        case 'edit':
            if (!canAction('personas')) {
                showNoPermissionAlert('personas');
                showFormAlert('No tienes permiso para editar personas', 'error');
                return false;
            }
            break;
        case 'view':
            if (!canView('personas')) {
                showNoPermissionAlert('personas');
                return false;
            }
            break;
        default:
            return true;
    }
    
    return true;
}

/**
 * 2.2 Abrir modal para crear/editar persona (con verificación de permisos)
 */
async function openPersonModal(personId = null) {
    console.log(`👤 Abriendo modal de persona: ${personId || 'Nueva'}`);
    
    // Verificar permisos
    const action = personId ? 'edit' : 'create';
    if (!checkPersonPermissions(action)) {
        return;
    }
    
    try {
        // Remover alertas existentes al abrir modal
        removeExistingAlerts();
        
        // Cargar departamentos antes de abrir el modal
        await loadDepartmentsForModal();
        
        if (personId) {
            DOM.personModalTitle.textContent = 'Editar Persona';
            const person = window.appState.persons.find(p => p._id === personId);
            if (person) {
                DOM.personId.value = person._id;
                DOM.personName.value = person.nombre;
                DOM.personEmail.value = person.email;
                DOM.personPhone.value = person.telefono || '';
                
                // Establecer el valor del departamento
                const departmentSelect = document.getElementById('personDepartment');
                if (departmentSelect && person.departamento) {
                    // Buscar si el departamento existe en las opciones
                    const optionExists = Array.from(departmentSelect.options).some(
                        option => option.value === person.departamento
                    );
                    
                    if (optionExists) {
                        departmentSelect.value = person.departamento;
                    } else {
                        // Si no existe, agregarlo como opción
                        const option = document.createElement('option');
                        option.value = person.departamento;
                        option.textContent = person.departamento;
                        option.selected = true;
                        departmentSelect.appendChild(option);
                    }
                }
                
                DOM.personPosition.value = person.puesto || '';
                
                // Mostrar alerta informativa para edición
                showFormAlert(
                    `Estás editando a "${person.nombre}". Recuerda guardar los cambios al finalizar.`,
                    'info'
                );
            } else {
                showFormAlert('No se encontró la persona solicitada', 'error');
                return;
            }
        } else {
            DOM.personModalTitle.textContent = 'Agregar Persona';
            DOM.personForm.reset();
            DOM.personId.value = '';
            
            // Resetear el select de departamento
            const departmentSelect = document.getElementById('personDepartment');
            if (departmentSelect) {
                departmentSelect.value = '';
            }
            
            // Mostrar alerta guía para nueva persona
            showFormAlert(
                'Completa todos los campos requeridos (*) para agregar una nueva persona.',
                'info'
            );
        }
        
        DOM.personModal.style.display = 'flex';
        
        // Aplicar permisos a los botones del modal
        applyModalPermissions();
        
        // Agregar validación en tiempo real
        addRealTimeValidation();
        
    } catch (error) {
        console.error('❌ Error abriendo modal de persona:', error);
        showAlert('Error al cargar departamentos', 'error');
        showFormAlert('No se pudieron cargar los departamentos. Por favor, intenta nuevamente.', 'error');
    }
}

/**
 * 2.3 Aplicar permisos a los botones del modal
 */
function applyModalPermissions() {
    // El botón de guardar solo si tiene permiso de acción
    if (DOM.savePersonBtn) {
        DOM.savePersonBtn.disabled = !canAction('personas');
        if (!canAction('personas')) {
            DOM.savePersonBtn.title = 'No tienes permiso para modificar personas';
        }
    }
    
    // Los campos de entrada deshabilitados si no tiene permiso de acción
    const formFields = [
        DOM.personName,
        DOM.personEmail,
        DOM.personPhone,
        DOM.personPosition,
        document.getElementById('personDepartment')
    ];
    
    formFields.forEach(field => {
        if (field) {
            field.readOnly = !canAction('personas');
            if (!canAction('personas')) {
                field.style.backgroundColor = '#f5f5f5';
                field.style.cursor = 'not-allowed';
            }
        }
    });
}

/**
 * 2.4 Cargar departamentos para el modal
 */
async function loadDepartmentsForModal() {
    try {
        console.log('🏢 Cargando departamentos para el modal...');
        
        // Mostrar preloader inline en el select
        const departmentSelect = document.getElementById('personDepartment');
        if (departmentSelect) {
            departmentSelect.disabled = true;
            const spinner = document.createElement('div');
            spinner.className = 'preloader-inline preloader-inline--small';
            spinner.innerHTML = '<div class="preloader-inline__spinner"></div>';
            departmentSelect.parentNode.insertBefore(spinner, departmentSelect.nextSibling);
        }
        
        const data = await api.getDepartments();
        
        // Remover spinner
        const spinner = document.querySelector('#personDepartment + .preloader-inline');
        if (spinner) {
            spinner.remove();
        }
        
        if (data.success && data.departments) {
            populateDepartmentSelect(data.departments);
            console.log(`✅ ${data.departments.length} departamentos cargados`);
            
            if (departmentSelect) {
                departmentSelect.disabled = false;
            }
        } else {
            // Si no hay departamentos, mostrar opción por defecto
            const departmentSelect = document.getElementById('personDepartment');
            if (departmentSelect) {
                departmentSelect.innerHTML = `
                    <option value="">No hay departamentos disponibles</option>
                    <option value="Nuevo Departamento">+ Crear nuevo departamento</option>
                `;
                departmentSelect.disabled = false;
                
                // Mostrar alerta informativa
                if (!document.querySelector('.alert--warning')) {
                    showFormAlert(
                        'No hay departamentos registrados. Puedes crear uno nuevo seleccionando "+ Crear nuevo departamento".',
                        'warning',
                        'departamento'
                    );
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Error cargando departamentos:', error);
        const departmentSelect = document.getElementById('personDepartment');
        if (departmentSelect) {
            departmentSelect.innerHTML = `
                <option value="">Error cargando departamentos</option>
            `;
            departmentSelect.disabled = false;
        }
        
        showFormAlert('Error al cargar los departamentos. Intenta recargar la página.', 'error');
    }
}

/**
 * 2.5 Poblar el select de departamentos
 */
function populateDepartmentSelect(departments) {
    const departmentSelect = document.getElementById('personDepartment');
    if (!departmentSelect) return;
    
    // Guardar el valor actual
    const currentValue = departmentSelect.value;
    
    // Limpiar y crear opciones
    departmentSelect.innerHTML = `
        <option value="">Seleccionar departamento *</option>
        <option value="Nuevo Departamento">+ Crear nuevo departamento</option>
    `;
    
    if (departments.length === 0) {
        showFormAlert(
            'No hay departamentos registrados. Crea un nuevo departamento para asignar a la persona.',
            'warning',
            'departamento'
        );
    }
    
    departments.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept.nombre;
        option.textContent = dept.nombre;
        if (dept.personCount > 0) {
            option.textContent += ` (${dept.personCount})`;
        }
        departmentSelect.appendChild(option);
    });
    
    // Restaurar el valor si existe
    if (currentValue) {
        departmentSelect.value = currentValue;
    }
    
    // Agregar event listener para detectar "Crear nuevo"
    departmentSelect.addEventListener('change', handleDepartmentSelection);
}

/**
 * 2.6 Manejar selección de departamento
 */
function handleDepartmentSelection(e) {
    if (e.target.value === "Nuevo Departamento") {
        // Mostrar alerta informativa
        showFormAlert(
            'Serás redirigido al formulario de creación de departamento. Después de crear el departamento, regresa aquí para continuar.',
            'info'
        );
        
        // Resetear
        e.target.value = "";
        
        // Cerrar modal actual
        closePersonModal();
        
        // Abrir modal de departamentos después de un breve delay
        setTimeout(() => {
            if (window.openDepartmentModal) {
                window.openDepartmentModal();
            }
        }, 500);
    }
}

/**
 * 2.7 Cerrar modal de personas
 */
function closePersonModal() {
    console.log('❌ Cerrando modal de persona');
    DOM.personModal.style.display = 'none';
    
    // Remover alertas
    removeExistingAlerts();
    
    // Remover event listener temporal
    const departmentSelect = document.getElementById('personDepartment');
    if (departmentSelect) {
        departmentSelect.removeEventListener('change', handleDepartmentSelection);
    }
    
    // Remover validación en tiempo real
    removeRealTimeValidation();
}

// =============================================================================
// 3. VALIDACIONES CON ALERTAS DETALLADAS
// =============================================================================

/**
 * 3.1 Validar email con alertas específicas
 */
function validateEmail(email) {
    if (!email || email.trim() === '') {
        return { 
            isValid: false, 
            message: 'El email es obligatorio',
            alertMessage: '❌ Debes ingresar un email para la persona.',
            field: 'email'
        };
    }
    
    const emailValue = email.trim();
    
    // Validar que tenga exactamente un @
    const atCount = (emailValue.match(/@/g) || []).length;
    if (atCount === 0) {
        return { 
            isValid: false, 
            message: 'El email debe contener un símbolo @',
            alertMessage: '❌ El email debe contener un símbolo @ (ejemplo: usuario@dominio.com)',
            field: 'email'
        };
    }
    if (atCount > 1) {
        return { 
            isValid: false, 
            message: 'El email solo puede contener un símbolo @',
            alertMessage: '❌ El email solo puede contener un símbolo @. Elimina los adicionales.',
            field: 'email'
        };
    }
    
    // Validar formato básico de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue)) {
        return { 
            isValid: false, 
            message: 'Formato de email inválido (ejemplo: usuario@dominio.com)',
            alertMessage: '❌ Formato de email inválido. Usa: nombre@dominio.com',
            field: 'email'
        };
    }
    
    // Validar que no empiece o termine con punto o guión
    if (emailValue.startsWith('.') || emailValue.endsWith('.') || 
        emailValue.startsWith('-') || emailValue.endsWith('-') ||
        emailValue.startsWith('@') || emailValue.endsWith('@')) {
        return { 
            isValid: false, 
            message: 'Formato de email inválido',
            alertMessage: '❌ El email no puede empezar o terminar con puntos, guiones o @',
            field: 'email'
        };
    }
    
    // Validar dominio
    const parts = emailValue.split('@');
    const domain = parts[1];
    
    if (domain.length < 4) {
        return { 
            isValid: false, 
            message: 'Dominio de email muy corto',
            alertMessage: '❌ El dominio del email es muy corto. Usa un dominio válido.',
            field: 'email'
        };
    }
    
    // Validar que el dominio tenga al menos un punto
    if (!domain.includes('.')) {
        return { 
            isValid: false, 
            message: 'Dominio de email inválido',
            alertMessage: '❌ El dominio del email necesita un punto (ejemplo: gmail.com)',
            field: 'email'
        };
    }
    
    // Validar extensión del dominio
    const domainParts = domain.split('.');
    const tld = domainParts[domainParts.length - 1];
    if (tld.length < 2) {
        return { 
            isValid: false, 
            message: 'Extensión del dominio inválida',
            alertMessage: '❌ La extensión del dominio es muy corta (ejemplo: .com, .org, .net)',
            field: 'email'
        };
    }
    
    return { 
        isValid: true, 
        message: 'Email válido',
        alertMessage: '✓ Email válido',
        field: 'email'
    };
}

/**
 * 3.2 Validar teléfono con alertas específicas
 */
function validatePhone(phone) {
    // Si el teléfono está vacío, es opcional
    if (!phone || phone.trim() === '') {
        return { 
            isValid: true, 
            message: 'Teléfono (opcional)',
            alertMessage: 'ℹ️ Teléfono es opcional, pero recomendado',
            field: 'telefono'
        };
    }
    
    const phoneValue = phone.trim();
    
    // Eliminar caracteres especiales para validar solo números
    const cleanPhone = phoneValue.replace(/[+\s\-()]/g, '');
    
    // Validar que solo contenga números
    if (!/^\d+$/.test(cleanPhone)) {
        return { 
            isValid: false, 
            message: 'El teléfono solo puede contener números',
            alertMessage: '❌ El teléfono solo puede contener números. Elimina letras o símbolos especiales.',
            field: 'telefono'
        };
    }
    
    // Validar longitud máxima
    if (cleanPhone.length > 10) {
        return { 
            isValid: false, 
            message: 'El teléfono no puede exceder los 10 dígitos',
            alertMessage: '❌ El teléfono no puede tener más de 10 dígitos.',
            field: 'telefono'
        };
    }
    
    // Validar longitud mínima
    if (cleanPhone.length < 8) {
        return { 
            isValid: false, 
            message: 'El teléfono debe tener al menos 8 dígitos',
            alertMessage: '❌ El teléfono debe tener al menos 8 dígitos.',
            field: 'telefono'
        };
    }
    
    // Validar formato del número (no puede empezar con 0 en algunos países, ajusta según necesidad)
    if (cleanPhone.startsWith('0')) {
        return { 
            isValid: false, 
            message: 'El teléfono no puede comenzar con 0',
            alertMessage: '❌ El teléfono no puede comenzar con 0. Ejemplo correcto: 5512345678',
            field: 'telefono'
        };
    }
    
    return { 
        isValid: true, 
        message: 'Teléfono válido',
        alertMessage: '✓ Teléfono válido',
        field: 'telefono'
    };
}

/**
 * 3.3 Validar nombre con alertas específicas
 */
function validateName(name) {
    if (!name || name.trim() === '') {
        return { 
            isValid: false, 
            message: 'El nombre es obligatorio',
            alertMessage: '❌ ¡Olvidaste poner el nombre de la persona!',
            field: 'nombre'
        };
    }
    
    const nameValue = name.trim();
    
    // Validar longitud mínima
    if (nameValue.length < 2) {
        return { 
            isValid: false, 
            message: 'El nombre debe tener al menos 2 caracteres',
            alertMessage: '❌ El nombre es muy corto. Debe tener al menos 2 caracteres.',
            field: 'nombre'
        };
    }
    
    // Validar longitud máxima
    if (nameValue.length > 100) {
        return { 
            isValid: false, 
            message: 'El nombre no puede exceder los 100 caracteres',
            alertMessage: '❌ El nombre es muy largo. Máximo 100 caracteres.',
            field: 'nombre'
        };
    }
    
    // Validar caracteres permitidos (letras, espacios, acentos, ñ, puntos, comas, guiones)
    const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s\-\.,']+$/;
    if (!nameRegex.test(nameValue)) {
        return { 
            isValid: false, 
            message: 'El nombre contiene caracteres inválidos',
            alertMessage: '❌ El nombre contiene caracteres inválidos. Solo letras, espacios y algunos símbolos.',
            field: 'nombre'
        };
    }
    
    // Validar que no contenga solo espacios
    if (!nameValue.replace(/\s/g, '').length) {
        return { 
            isValid: false, 
            message: 'El nombre no puede contener solo espacios',
            alertMessage: '❌ El nombre no puede contener solo espacios.',
            field: 'nombre'
        };
    }
    
    return { 
        isValid: true, 
        message: 'Nombre válido',
        alertMessage: '✓ Nombre válido',
        field: 'nombre'
    };
}

/**
 * 3.4 Validar puesto (opcional)
 */
function validatePosition(position) {
    if (!position || position.trim() === '') {
        return { 
            isValid: true, 
            message: 'Puesto (opcional)',
            alertMessage: '',
            field: 'puesto'
        };
    }
    
    const positionValue = position.trim();
    
    // Validar longitud máxima
    if (positionValue.length > 100) {
        return { 
            isValid: false, 
            message: 'El puesto no puede exceder los 100 caracteres',
            alertMessage: '❌ El puesto es muy largo. Máximo 100 caracteres.',
            field: 'puesto'
        };
    }
    
    return { 
        isValid: true, 
        message: 'Puesto válido',
        alertMessage: '✓ Puesto válido',
        field: 'puesto'
    };
}

/**
 * 3.5 Validar departamento con alertas específicas
 */
function validateDepartment(department) {
    if (!department || department.trim() === '') {
        return { 
            isValid: false, 
            message: 'El departamento es obligatorio',
            alertMessage: '❌ ¡Olvidaste seleccionar el departamento! Es un campo obligatorio.',
            field: 'departamento'
        };
    }
    
    if (department === "Nuevo Departamento") {
        return { 
            isValid: false, 
            message: 'Selecciona un departamento válido o crea uno nuevo',
            alertMessage: '❌ Selecciona un departamento existente o crea uno nuevo.',
            field: 'departamento'
        };
    }
    
    return { 
        isValid: true, 
        message: 'Departamento válido',
        alertMessage: '✓ Departamento seleccionado',
        field: 'departamento'
    };
}

/**
 * 3.6 Agregar validación en tiempo real con alertas
 */
function addRealTimeValidation() {
    // Remove previous listeners if they exist
    removeRealTimeValidation();

    // Helper function to display validation message below the input field
    function displayValidationMessage(inputElement, message, isValid) {
        let messageElement = inputElement.nextElementSibling;
        if (!messageElement || !messageElement.classList.contains('validation-message')) {
            messageElement = document.createElement('div');
            messageElement.className = 'validation-message';
            inputElement.parentNode.insertBefore(messageElement, inputElement.nextSibling);
        }
        messageElement.textContent = message;
        messageElement.style.color = isValid ? 'green' : 'red';
    }

    // Validate name
    DOM.personName.addEventListener('input', function() {
        const validation = validateName(this.value);
        updateFieldValidation(this, validation);
        displayValidationMessage(this, validation.alertMessage, validation.isValid);
    });

    // Validate email
    DOM.personEmail.addEventListener('input', function() {
        const validation = validateEmail(this.value);
        updateFieldValidation(this, validation);
        displayValidationMessage(this, validation.alertMessage, validation.isValid);
    });

    // Validate phone
    DOM.personPhone.addEventListener('input', function() {
        const validation = validatePhone(this.value);
        updateFieldValidation(this, validation);
        displayValidationMessage(this, validation.alertMessage, validation.isValid);
    });

    // Validate position
    DOM.personPosition.addEventListener('input', function() {
        const validation = validatePosition(this.value);
        updateFieldValidation(this, validation);
        displayValidationMessage(this, validation.alertMessage, validation.isValid);
    });

    // Validate department
    const departmentSelect = document.getElementById('personDepartment');
    if (departmentSelect) {
        departmentSelect.addEventListener('change', function() {
            const validation = validateDepartment(this.value);
            updateFieldValidation(this, validation);
            displayValidationMessage(this, validation.alertMessage, validation.isValid);
        });
    }
}

/**
 * 3.7 Remover validación en tiempo real
 */
function removeRealTimeValidation() {
    DOM.personName.removeEventListener('input', () => {});
    DOM.personEmail.removeEventListener('input', () => {});
    DOM.personPhone.removeEventListener('input', () => {});
    DOM.personPosition.removeEventListener('input', () => {});
    
    const departmentSelect = document.getElementById('personDepartment');
    if (departmentSelect) {
        departmentSelect.removeEventListener('change', () => {});
    }
}

/**
 * 3.8 Actualizar estado de validación del campo
 */
function updateFieldValidation(field, validation) {
    // Remover clases anteriores
    field.classList.remove('field--valid', 'field--invalid', 'field--error-highlight');
    
    // Remover mensaje anterior si existe
    const existingMessage = field.parentNode.querySelector('.validation-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    if (field.value.trim() === '') {
        // Para campos vacíos, solo mostrar mensaje si son requeridos
        if ((field === DOM.personName || field === DOM.personEmail || 
             (field.id === 'personDepartment' && field.value === '')) && 
            !validation.isValid) {
            field.classList.add('field--invalid');
            
            // Crear y mostrar mensaje de error
            const errorMessage = document.createElement('div');
            errorMessage.className = 'validation-message validation-message--error';
            errorMessage.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${validation.message}`;
            field.parentNode.appendChild(errorMessage);
        }
        return;
    }
    
    if (validation.isValid) {
        field.classList.add('field--valid');
        
        // Crear y mostrar mensaje de éxito
        const successMessage = document.createElement('div');
        successMessage.className = 'validation-message validation-message--success';
        successMessage.innerHTML = `<i class="fas fa-check-circle"></i> ${validation.message}`;
        field.parentNode.appendChild(successMessage);
    } else {
        field.classList.add('field--invalid');
        
        // Crear y mostrar mensaje de error
        const errorMessage = document.createElement('div');
        errorMessage.className = 'validation-message validation-message--error';
        errorMessage.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${validation.message}`;
        field.parentNode.appendChild(errorMessage);
    }
}

/**
 * 3.9 Validar formulario completo con alertas detalladas
 */
function validateForm() {
    let isValid = true;
    const errors = [];
    const errorDetails = [];
    
    // Validar nombre
    const nameValidation = validateName(DOM.personName.value);
    if (!nameValidation.isValid) {
        isValid = false;
        errors.push(nameValidation.message);
        errorDetails.push(nameValidation.alertMessage);
        DOM.personName.classList.add('field--invalid');
        highlightField('nombre');
    }
    
    // Validar email
    const emailValidation = validateEmail(DOM.personEmail.value);
    if (!emailValidation.isValid) {
        isValid = false;
        errors.push(emailValidation.message);
        errorDetails.push(emailValidation.alertMessage);
        DOM.personEmail.classList.add('field--invalid');
        highlightField('email');
    }
    
    // Validar teléfono
    const phoneValidation = validatePhone(DOM.personPhone.value);
    if (!phoneValidation.isValid) {
        isValid = false;
        errors.push(phoneValidation.message);
        errorDetails.push(phoneValidation.alertMessage);
        DOM.personPhone.classList.add('field--invalid');
        highlightField('telefono');
    }
    
    // Validar departamento
    const departmentSelect = document.getElementById('personDepartment');
    const departmentValue = departmentSelect ? departmentSelect.value : '';
    const departmentValidation = validateDepartment(departmentValue);
    if (!departmentValidation.isValid) {
        isValid = false;
        errors.push(departmentValidation.message);
        errorDetails.push(departmentValidation.alertMessage);
        if (departmentSelect) {
            departmentSelect.classList.add('field--invalid');
            highlightField('departamento');
        }
    }
    
    // Validar puesto (opcional, solo si hay valor)
    if (DOM.personPosition.value.trim() !== '') {
        const positionValidation = validatePosition(DOM.personPosition.value);
        if (!positionValidation.isValid) {
            isValid = false;
            errors.push(positionValidation.message);
            errorDetails.push(positionValidation.alertMessage);
            DOM.personPosition.classList.add('field--invalid');
            highlightField('puesto');
        }
    }
    
    // Si hay errores, mostrar alerta consolidada
    if (!isValid) {
        const errorList = errorDetails.map(error => `• ${error.replace(/[❌✓ℹ️]/g, '').trim()}`).join('\n');
        showFormAlert(
            `Se encontraron ${errors.length} error(es) en el formulario:\n${errorList}`,
            'error'
        );
        
        // También mostrar alerta global
        showAlert(`Por favor corrige los ${errors.length} error(es) en el formulario`, 'error');
    }
    
    return { isValid, errors, errorDetails };
}

// =============================================================================
// 4. FILTROS Y ORDENAMIENTO
// =============================================================================

/**
 * 4.1 Inicializar filtros (solo si tiene permiso de ver)
 */
function initializeFilters() {
    // Verificar permiso de vista
    if (!canView('personas')) {
        console.log('🔒 Sin permiso para ver personas, ocultando filtros');
        const filtersContainer = document.querySelector('.personas-filters');
        if (filtersContainer) {
            filtersContainer.style.display = 'none';
        }
        return;
    }
    
    // Inicializar búsqueda
    const searchInput = document.getElementById('personasSearch');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            currentFilters.search = e.target.value.toLowerCase();
            applyFilters();
            
            // Mostrar alerta si la búsqueda no arroja resultados
            setTimeout(() => {
                const noResults = document.querySelector('.empty-state .empty-state__title');
                if (noResults && noResults.textContent.includes('No se encontraron resultados')) {
                    showAlert('No se encontraron personas que coincidan con tu búsqueda', 'warning');
                }
            }, 500);
        });
    }
    
    // Inicializar filtro de puestos
    const puestoFilter = document.getElementById('personasPuestoFilter');
    if (puestoFilter) {
        puestoFilter.addEventListener('change', function(e) {
            currentFilters.puesto = e.target.value;
            applyFilters();
            
            // Mostrar alerta informativa
            if (e.target.value) {
                showAlert(`Filtrando por puesto: ${e.target.value}`, 'info');
            } else {
                showAlert('Mostrando todos los puestos', 'info');
            }
        });
    }
    
    // Inicializar ordenamiento
    const sortFilter = document.getElementById('personasSortFilter');
    if (sortFilter) {
        sortFilter.addEventListener('change', function(e) {
            currentFilters.sort = e.target.value;
            applyFilters();
            
            // Mostrar alerta informativa
            const sortText = e.target.options[e.target.selectedIndex].text;
            showAlert(`Ordenando personas: ${sortText}`, 'info');
        });
    }
}

/**
 * 4.2 Aplicar filtros
 */
function applyFilters() {
    console.log('🔍 Aplicando filtros:', currentFilters);
    
    if (!window.appState.persons || window.appState.persons.length === 0) {
        // Mostrar alerta si no hay personas
        if (window.appState.persons && window.appState.persons.length === 0) {
            showAlert('No hay personas registradas para aplicar filtros', 'warning');
        }
        return;
    }
    
    let filteredPersons = [...window.appState.persons];
    
    // Aplicar búsqueda
    if (currentFilters.search) {
        filteredPersons = filteredPersons.filter(person => 
            person.nombre.toLowerCase().includes(currentFilters.search) ||
            person.email.toLowerCase().includes(currentFilters.search) ||
            (person.puesto && person.puesto.toLowerCase().includes(currentFilters.search)) ||
            (person.departamento && person.departamento.toLowerCase().includes(currentFilters.search)) ||
            (person.telefono && person.telefono.includes(currentFilters.search))
        );
    }
    
    // Aplicar filtro de puesto
    if (currentFilters.puesto) {
        filteredPersons = filteredPersons.filter(person => 
            person.puesto === currentFilters.puesto
        );
    }
    
    // Aplicar ordenamiento
    filteredPersons.sort((a, b) => {
        switch(currentFilters.sort) {
            case 'nombre-desc':
                return b.nombre.localeCompare(a.nombre);
            case 'nombre-asc':
            default:
                return a.nombre.localeCompare(b.nombre);
        }
    });
    
    // Actualizar tabla con las personas filtradas
    renderFilteredPersonsTable(filteredPersons);
    
    // Mostrar alerta de resultados
    if (filteredPersons.length === 0 && (currentFilters.search || currentFilters.puesto)) {
        showAlert('No se encontraron resultados con los filtros aplicados', 'warning');
    } else if (filteredPersons.length > 0 && (currentFilters.search || currentFilters.puesto)) {
        showAlert(`Mostrando ${filteredPersons.length} persona(s)`, 'info');
    }
}

/**
 * 4.3 Renderizar tabla filtrada
 */
function renderFilteredPersonsTable(persons) {
    if (!DOM.personasTableBody) return;
    
    DOM.personasTableBody.innerHTML = '';
    
    if (persons.length === 0) {
        DOM.personasTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <div class="empty-state__icon">
                        <i class="fas fa-search"></i>
                    </div>
                    <h3 class="empty-state__title">No se encontraron resultados</h3>
                    <p class="empty-state__description">No hay personas que coincidan con los filtros aplicados</p>
                    <div class="empty-state__actions" style="margin-top: 1rem;">
                        ${canAction('personas') ? `
                            <button class="btn btn--outline" onclick="clearFilters()">
                                <i class="fas fa-times"></i> Limpiar filtros
                            </button>
                            <button class="btn btn--primary" onclick="openPersonModal()">
                                <i class="fas fa-user-plus"></i> Agregar persona
                            </button>
                        ` : `
                            <button class="btn btn--outline" onclick="clearFilters()">
                                <i class="fas fa-times"></i> Limpiar filtros
                            </button>
                        `}
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    persons.forEach(person => {
        const row = document.createElement('tr');
        row.className = 'table__row';
        row.dataset.personId = person._id;
        
        // Determinar si el usuario puede editar/eliminar
        const canEdit = canAction('personas');
        
        row.innerHTML = `
            <td class="table__cell">
                <div class="person-info">
                    <span class="person-name">${person.nombre}</span>
                    ${person.puesto ? `<span class="person-position">${person.puesto}</span>` : ''}
                </div>
            </td>
            <td class="table__cell">
                <div class="person-email">
                    <i class="fas fa-envelope" style="margin-right: 8px; color: var(--text-muted); font-size: 0.9em;"></i>
                    ${person.email}
                </div>
            </td>
            <td class="table__cell">
                ${person.telefono ? `
                    <div class="person-phone">
                        <i class="fas fa-phone" style="margin-right: 8px; color: var(--text-muted); font-size: 0.9em;"></i>
                        ${person.telefono}
                    </div>
                ` : '<span class="text-muted">No especificado</span>'}
            </td>
            <td class="table__cell">
                ${person.departamento ? `
                    <span class="department-badge">${person.departamento}</span>
                ` : '<span class="text-muted warning-badge">Sin departamento</span>'}
            </td>
            <td class="table__cell">
                <div class="table-actions">
                    ${canEdit ? `
                        <button class="btn btn--sm btn--outline btn--icon" onclick="editPerson('${person._id}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn--sm btn--danger btn--icon" onclick="deletePerson('${person._id}')" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : `
                        <span class="text-muted" title="Sin permisos de edición">
                            <i class="fas fa-eye"></i> Solo lectura
                        </span>
                    `}
                </div>
            </td>
        `;
        
        DOM.personasTableBody.appendChild(row);
    });
}

/**
 * 4.4 Actualizar lista de puestos en el filtro
 */
function updatePuestosFilter() {
    const puestoFilter = document.getElementById('personasPuestoFilter');
    if (!puestoFilter) return;
    
    // Obtener puestos únicos de todas las personas
    const puestos = new Set();
    window.appState.persons.forEach(person => {
        if (person.puesto && person.puesto.trim() !== '') {
            puestos.add(person.puesto);
        }
    });
    
    // Guardar el valor actual
    const currentValue = puestoFilter.value;
    
    // Limpiar y agregar opción "Todos los puestos"
    puestoFilter.innerHTML = '<option value="">Todos los puestos</option>';
    
    // Agregar puestos únicos
    const sortedPuestos = Array.from(puestos).sort();
    sortedPuestos.forEach(puesto => {
        const option = document.createElement('option');
        option.value = puesto;
        option.textContent = puesto;
        puestoFilter.appendChild(option);
    });
    
    // Restaurar el valor si existe
    if (currentValue && Array.from(puestos).includes(currentValue)) {
        puestoFilter.value = currentValue;
    }
    
    // Mostrar alerta si hay personas sin puesto
    const personsWithoutPosition = window.appState.persons.filter(p => !p.puesto || p.puesto.trim() === '');
    if (personsWithoutPosition.length > 0) {
        showAlert(`${personsWithoutPosition.length} persona(s) no tienen puesto asignado`, 'warning');
    }
}

/**
 * 4.5 Limpiar filtros
 */
function clearFilters() {
    // Resetear valores de los filtros
    currentFilters = {
        search: '',
        puesto: '',
        sort: 'nombre-asc'
    };
    
    // Resetear elementos del DOM
    const searchInput = document.getElementById('personasSearch');
    if (searchInput) searchInput.value = '';
    
    const puestoFilter = document.getElementById('personasPuestoFilter');
    if (puestoFilter) puestoFilter.value = '';
    
    const sortFilter = document.getElementById('personasSortFilter');
    if (sortFilter) sortFilter.value = 'nombre-asc';
    
    // Mostrar alerta
    showAlert('Filtros limpiados correctamente', 'success');
    
    // Renderizar tabla original
    renderPersonsTable();
}

// =============================================================================
// 5. OPERACIONES CRUD DE PERSONAS CON PERMISOS
// =============================================================================

async function savePerson() {
    console.log('💾 Intentando guardar persona...');
    
    // Verificar permiso de acción
    if (!canAction('personas')) {
        showNoPermissionAlert('personas');
        showFormAlert('No tienes permiso para modificar personas', 'error');
        return;
    }
    
    // Validar formulario antes de enviar
    const formValidation = validateForm();
    if (!formValidation.isValid) {
        // Las alertas ya se mostraron en validateForm()
        return;
    }
    
    // Obtener el select de departamento
    const departmentSelect = document.getElementById('personDepartment');
    const selectedDepartment = departmentSelect ? departmentSelect.value : '';
    
    // Verificar si el departamento está vacío
    if (!selectedDepartment || selectedDepartment.trim() === '') {
        showFormAlert('❌ ¡Olvidaste seleccionar el departamento! Es un campo obligatorio.', 'error', 'departamento');
        showAlert('Debes seleccionar un departamento para la persona', 'error');
        return;
    }
    
    try {
        // Mostrar alerta de proceso
        showFormAlert(
            DOM.personId.value ? 'Actualizando información de la persona...' : 'Creando nueva persona...',
            'info'
        );
        
        // Crear preloader overlay dentro del modal
        const modalContent = document.querySelector('.modal__content');
        const preloader = document.createElement('div');
        preloader.className = 'preloader-overlay preloader-overlay--light modal-preloader';
        preloader.innerHTML = `
            <div class="preloader-overlay__content">
                <div class="preloader__spinner preloader--primary preloader--lg"></div>
                <p class="preloader__text">${DOM.personId.value ? 'Actualizando persona...' : 'Creando persona...'}</p>
                <p class="preloader-overlay__subtitle">Por favor espera un momento</p>
            </div>
        `;
        
        modalContent.style.position = 'relative';
        modalContent.appendChild(preloader);
        
        // Deshabilitar formulario
        const formElements = DOM.personForm.querySelectorAll('input, select, button');
        formElements.forEach(el => {
            el.disabled = true;
            el.style.opacity = '0.6';
        });
        
        const personData = {
            nombre: DOM.personName.value.trim(),
            email: DOM.personEmail.value.trim(),
            telefono: DOM.personPhone.value.trim(),
            departamento: selectedDepartment,
            puesto: DOM.personPosition.value.trim()
        };
        
        console.log('💾 Guardando persona:', personData);
        
        let data;
        if (DOM.personId.value) {
            data = await api.updatePerson(DOM.personId.value, personData);
        } else {
            data = await api.createPerson(personData);
        }
        
        if (data.success) {
            // Mostrar alerta de éxito
            showFormAlert(`✅ ${data.message}`, 'success');
            
            // Mostrar animación de éxito
            preloader.innerHTML = `
                <div class="preloader-overlay__content">
                    <div class="success-animation" style="font-size: 4rem; color: #4CAF50; margin-bottom: 1rem;">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <h3 class="preloader-overlay__title">¡Éxito!</h3>
                    <p class="preloader-overlay__subtitle">${data.message}</p>
                    <div class="preloader-message">
                        <p class="preloader-message__text">Redirigiendo en 2 segundos...</p>
                    </div>
                </div>
            `;
            
            // Aplicar animación de éxito al modal
            modalContent.classList.add('modal-success');
            
            // Esperar un momento antes de continuar
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Limpiar preloader
            preloader.classList.add('fade-out');
            setTimeout(() => {
                preloader.remove();
                modalContent.classList.remove('modal-success');
            }, 300);
            
            // Cerrar modal y recargar datos
            closePersonModal();
            await loadPersons();
            
            // Mostrar notificación de éxito global
            showAlert(data.message, 'success');
            
            // Actualizar dashboard si existe la función
            try {
                if (typeof window.loadDashboardData === 'function') {
                    await window.loadDashboardData();
                }
            } catch (dashboardError) {
                console.log('Dashboard no disponible o error al actualizar:', dashboardError);
            }
            
        } else {
            throw new Error(data.message);
        }
        
    } catch (error) {
        console.error('❌ Error guardando persona:', error);
        
        // Manejar errores de permisos específicamente
        if (error.message.includes('403') || error.message.includes('permisos')) {
            showFormAlert('❌ No tienes permisos para realizar esta acción', 'error');
            showNoPermissionAlert('personas');
        } else {
            // Mostrar alerta de error
            let errorMessage = 'Error al guardar persona: ' + error.message;
            
            // Mensajes más amigables para errores comunes
            if (error.message.includes('duplicate') || error.message.includes('ya existe')) {
                errorMessage = '❌ Ya existe una persona con ese email. Usa un email diferente.';
                showFormAlert(errorMessage, 'error', 'email');
            } else if (error.message.includes('departamento')) {
                errorMessage = '❌ Error con el departamento. Verifica que exista o crea uno nuevo.';
                showFormAlert(errorMessage, 'error', 'departamento');
            } else if (error.message.includes('required')) {
                errorMessage = '❌ Faltan campos obligatorios. Revisa el formulario.';
                showFormAlert(errorMessage, 'error');
            } else {
                showFormAlert(`❌ ${errorMessage}`, 'error');
            }
        }
        
        // Mostrar error en el preloader
        const preloader = document.querySelector('.modal-preloader');
        if (preloader) {
            preloader.innerHTML = `
                <div class="preloader-overlay__content">
                    <div class="error-animation" style="font-size: 4rem; color: #f44336; margin-bottom: 1rem;">
                        <i class="fas fa-exclamation-circle"></i>
                    </div>
                    <h3 class="preloader-overlay__title">¡Error!</h3>
                    <p class="preloader-overlay__subtitle">${error.message}</p>
                    <div class="preloader-actions" style="margin-top: 1.5rem; display: flex; gap: 1rem; justify-content: center;">
                        <button class="btn btn--outline btn--sm" onclick="this.closest('.preloader-overlay').remove(); 
                                                                         document.querySelectorAll('#personForm input, #personForm select, #personForm button').forEach(el => {
                                                                             el.disabled = false;
                                                                             el.style.opacity = '1';
                                                                         });">
                            Corregir datos
                        </button>
                        <button class="btn btn--primary btn--sm" onclick="window.savePerson()">
                            Reintentar
                        </button>
                    </div>
                </div>
            `;
            
            // Aplicar animación de error al modal
            const modalContent = document.querySelector('.modal__content');
            if (modalContent) {
                modalContent.classList.add('modal-error');
                setTimeout(() => {
                    modalContent.classList.remove('modal-error');
                }, 1000);
            }
        }
        
        // Mostrar alerta general
        showAlert(error.message, 'error');
    } finally {
        // Limpieza final
        setTimeout(() => {
            const preloader = document.querySelector('.modal-preloader');
            if (preloader) {
                preloader.remove();
            }
            
            const modalContent = document.querySelector('.modal__content');
            if (modalContent) {
                modalContent.classList.remove('modal-success', 'modal-error');
            }
            
            // Rehabilitar formulario
            const formElements = DOM.personForm.querySelectorAll('input, select, button');
            formElements.forEach(el => {
                el.disabled = false;
                el.style.opacity = '1';
            });
        }, 500);
    }
}

async function loadPersons() {
    try {
        console.log('👥 Cargando personas...');
        
        // Verificar permiso de vista
        if (!canView('personas')) {
            console.log('🔒 Sin permiso para ver personas');
            if (DOM.personasTableBody) {
                DOM.personasTableBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="empty-state error-state">
                            <div class="error-state__icon">
                                <i class="fas fa-lock"></i>
                            </div>
                            <h3 class="empty-state__title">Acceso Restringido</h3>
                            <p class="empty-state__description">No tienes permisos para ver la lista de personas.</p>
                        </td>
                    </tr>
                `;
            }
            return;
        }
        
        // Mostrar alerta de carga
        showAlert('Cargando lista de personas...', 'info');
        
        // Mostrar preloader de tabla completo
        const tableContainer = document.querySelector('.tab-content[data-tab="personas"]');
        if (tableContainer) {
            const existingPreloader = tableContainer.querySelector('.table-preloader-overlay');
            if (existingPreloader) existingPreloader.remove();
            
            const tablePreloader = document.createElement('div');
            tablePreloader.className = 'table-preloader-overlay';
            tablePreloader.innerHTML = `
                <div class="preloader">
                    <div class="preloader__spinner preloader--primary preloader--lg"></div>
                    <p class="preloader__text">Cargando personas...</p>
                    <p class="preloader-overlay__subtitle">Obteniendo información del servidor</p>
                </div>
            `;
            
            const tableElement = tableContainer.querySelector('table');
            if (tableElement) {
                tableElement.style.opacity = '0.3';
                tableElement.insertAdjacentElement('beforebegin', tablePreloader);
            }
        }
        
        // Si ya hay datos, mostrar skeletons solo en el cuerpo de la tabla
        if (DOM.personasTableBody && (!window.appState.persons || window.appState.persons.length === 0)) {
            DOM.personasTableBody.innerHTML = '';
            
            // Crear filas de skeleton loader mejoradas
            for (let i = 0; i < 5; i++) {
                const skeletonRow = document.createElement('tr');
                skeletonRow.className = 'skeleton-row';
                skeletonRow.innerHTML = `
                    <td>
                        <div class="skeleton-loader skeleton-text skeleton-text--large" style="width: 80%"></div>
                        <div class="skeleton-loader skeleton-text skeleton-text--small" style="width: 60%; margin-top: 8px;"></div>
                    </td>
                    <td>
                        <div class="skeleton-loader skeleton-text" style="width: 90%"></div>
                    </td>
                    <td>
                        <div class="skeleton-loader skeleton-text skeleton-text--small" style="width: 70%"></div>
                    </td>
                    <td>
                        <div class="skeleton-loader skeleton-text" style="width: 60%"></div>
                    </td>
                    <td>
                        <div style="display: flex; gap: 8px;">
                            <div class="skeleton-loader skeleton-avatar" style="width: 32px; height: 32px;"></div>
                            <div class="skeleton-loader skeleton-avatar" style="width: 32px; height: 32px;"></div>
                        </div>
                    </td>
                `;
                DOM.personasTableBody.appendChild(skeletonRow);
            }
        }
        
        const data = await api.getPersons();
        
        // Remover preloader
        const preloader = document.querySelector('.table-preloader-overlay');
        if (preloader) {
            preloader.classList.add('fade-out');
            setTimeout(() => {
                preloader.remove();
                const tableElement = tableContainer?.querySelector('table');
                if (tableElement) {
                    tableElement.style.opacity = '1';
                }
            }, 300);
        }
        
        if (data.success) {
            window.appState.persons = data.persons || [];
            
            // Mostrar alerta de resultados
            if (window.appState.persons.length === 0) {
                showAlert('No hay personas registradas. ¡Agrega la primera!', 'warning');
            } else {
                showAlert(`✅ Se cargaron ${window.appState.persons.length} persona(s)`, 'success');
                
                // Verificar datos incompletos
                const personsWithoutDept = window.appState.persons.filter(p => !p.departamento);
                const personsWithoutPhone = window.appState.persons.filter(p => !p.telefono);
                const personsWithoutPosition = window.appState.persons.filter(p => !p.puesto);
                
                if (personsWithoutDept.length > 0) {
                    showAlert(`${personsWithoutDept.length} persona(s) no tienen departamento asignado`, 'warning');
                }
                if (personsWithoutPhone.length > 0) {
                    showAlert(`${personsWithoutPhone.length} persona(s) no tienen teléfono registrado`, 'info');
                }
                if (personsWithoutPosition.length > 0) {
                    showAlert(`${personsWithoutPosition.length} persona(s) no tienen puesto definido`, 'info');
                }
            }
            
            // Actualizar filtro de puestos
            updatePuestosFilter();
            
            // Aplicar filtros actuales
            applyFilters();
            
            // Actualizar selects
            populatePersonSelect();
            populateSearchPersonSelect();
            
            console.log(`✅ ${window.appState.persons.length} personas cargadas`);
        } else {
            throw new Error(data.message);
        }
        
    } catch (error) {
        console.error('❌ Error cargando personas:', error);
        
        // Remover preloader
        const preloader = document.querySelector('.table-preloader-overlay');
        if (preloader) preloader.remove();
        
        // Manejar errores de permisos
        if (error.message.includes('403') || error.message.includes('permisos')) {
            showAlert('No tienes permisos para ver las personas', 'error');
            if (DOM.personasTableBody) {
                DOM.personasTableBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="empty-state error-state">
                            <div class="error-state__icon">
                                <i class="fas fa-lock"></i>
                            </div>
                            <h3 class="empty-state__title">Acceso Restringido</h3>
                            <p class="empty-state__description">No tienes permisos para ver la lista de personas.</p>
                        </td>
                    </tr>
                `;
            }
        } else {
            // Mostrar alerta de error
            showAlert(`Error al cargar personas: ${error.message}`, 'error');
            
            // Mostrar estado de error mejorado
            if (DOM.personasTableBody) {
                DOM.personasTableBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="empty-state error-state">
                            <div class="error-state__icon">
                                <i class="fas fa-exclamation-triangle"></i>
                            </div>
                            <h3 class="empty-state__title">Error al cargar personas</h3>
                            <p class="empty-state__description">${error.message || 'No se pudieron cargar las personas'}</p>
                            <div class="empty-state__actions" style="margin-top: 1rem;">
                                <button class="btn btn--primary" onclick="loadPersons()">
                                    <i class="fas fa-redo"></i> Reintentar
                                </button>
                                ${canAction('personas') ? `
                                    <button class="btn btn--outline" onclick="openPersonModal()">
                                        <i class="fas fa-user-plus"></i> Agregar persona manualmente
                                    </button>
                                ` : ''}
                            </div>
                        </td>
                    </tr>
                `;
            }
        }
    }
}

function editPerson(id) {
    console.log('✏️ Editando persona:', id);
    
    // Verificar permiso de acción
    if (!canAction('personas')) {
        showNoPermissionAlert('personas');
        return;
    }
    
    openPersonModal(id);
}

// =============================================================================
// 5. OPERACIONES CRUD DE PERSONAS CON PERMISOS (CONTINUACIÓN)
// =============================================================================

async function deletePerson(id) {
  // Verificar permiso de acción
  if (!canAction('personas')) {
      showNoPermissionAlert('personas');
      return;
  }
  
  const person = window.appState.persons.find(p => p._id === id);
  if (!person) {
    showAlert('No se encontró la persona a eliminar', 'error');
    return;
  }
  
  // Mostrar alerta de advertencia antes de la confirmación
  showAlert(`Preparando para eliminar a ${person.nombre}...`, 'warning');
  
  // Mostrar modal de confirmación mejorado
  const confirmed = await showDeleteConfirmation(person.nombre);
  if (!confirmed) {
    showAlert('Eliminación cancelada', 'info');
    return;
  }
  
  try {
    console.log('🗑️ Eliminando persona PERMANENTEMENTE:', id);
    
    // Mostrar alerta de proceso
    showAlert(`Eliminando a ${person.nombre} permanentemente...`, 'info');
    
    // Encontrar la fila en la tabla
    const tableRow = document.querySelector(`button[onclick*="deletePerson('${id}')"]`)?.closest('tr');
    const rowIndex = tableRow ? Array.from(tableRow.parentNode.children).indexOf(tableRow) : -1;
    
    if (tableRow) {
      // Agregar estado de eliminación
      tableRow.classList.add('table__row--deleting');
      
      // Crear overlay de eliminación
      const deleteOverlay = document.createElement('div');
      deleteOverlay.className = 'delete-overlay';
      deleteOverlay.innerHTML = `
        <div class="delete-overlay__content">
          <div class="preloader-inline preloader-inline--large">
            <div class="preloader-inline__spinner preloader--error"></div>
          </div>
          <span class="delete-overlay__text">Eliminando permanentemente...</span>
        </div>
      `;
      
      // Ocultar contenido original
      const cells = tableRow.querySelectorAll('td');
      cells.forEach(cell => {
        cell.style.opacity = '0.3';
      });
      
      tableRow.appendChild(deleteOverlay);
      
      // Aplicar efecto de pulso para indicar eliminación
      tableRow.style.animation = 'deleting-pulse 1.5s infinite';
    }
    
    const data = await api.deletePerson(id);
    
    if (data.success) {
      // Mostrar alerta de éxito
      showAlert(`✅ ${data.message}`, 'success');
      
      // Mostrar animación de éxito
      if (tableRow) {
        tableRow.style.animation = '';
        tableRow.classList.remove('table__row--deleting');
        tableRow.classList.add('table__row--success');
        
        // Actualizar overlay a éxito
        const deleteOverlay = tableRow.querySelector('.delete-overlay');
        if (deleteOverlay) {
          deleteOverlay.innerHTML = `
            <div class="delete-overlay__content">
              <div class="success-icon" style="color: #4CAF50; font-size: 1.5rem;">
                <i class="fas fa-check-circle"></i>
              </div>
              <span class="delete-overlay__text" style="color: #4CAF50;">¡Eliminado permanentemente!</span>
            </div>
          `;
        }
        
        // Animar eliminación de la fila
        setTimeout(() => {
          tableRow.style.transform = 'translateX(-100%)';
          tableRow.style.opacity = '0';
          tableRow.style.height = '0';
          tableRow.style.overflow = 'hidden';
          tableRow.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
          
          setTimeout(async () => {
            // Eliminar del estado global
            window.appState.persons = window.appState.persons.filter(p => p._id !== id);
            
            // Actualizar tabla
            renderPersonsTable();
            
            // Actualizar filtro de puestos
            updatePuestosFilter();
            
            // Actualizar selects que usan personas
            populatePersonSelect();
            populateSearchPersonSelect();
            
            // Mostrar notificación flotante de éxito
            showFloatingNotification('Persona eliminada permanentemente del sistema', 'success');
            
            // Actualizar dashboard si existe
            try {
              if (typeof window.loadDashboardData === 'function') {
                await window.loadDashboardData();
              }
            } catch (dashboardError) {
              console.log('Dashboard no disponible:', dashboardError);
            }
          }, 500);
        }, 1000);
      } else {
        // Si no se encontró la fila, recargar normalmente
        await loadPersons();
        
        try {
          if (typeof window.loadDashboardData === 'function') {
            await window.loadDashboardData();
          }
        } catch (dashboardError) {
          console.log('Dashboard no disponible:', dashboardError);
        }
      }
    } else {
      throw new Error(data.message || 'Error desconocido al eliminar');
    }
    
  } catch (error) {
    console.error('❌ Error eliminando persona:', error);
    
    // Manejar errores de permisos
    if (error.message.includes('403') || error.message.includes('permisos')) {
      showFormAlert('❌ No tienes permisos para eliminar personas', 'error');
      showNoPermissionAlert('personas');
    } else {
      // Extraer mensaje específico del error
      let errorMessage = error.message || 'Error desconocido';
      let detailedMessage = '';
      
      // Analizar el mensaje de error para dar más detalles
      if (errorMessage.includes('dependencia') || errorMessage.includes('asociado') || 
          errorMessage.includes('documentos asociados') || errorMessage.includes('tiene documentos')) {
        detailedMessage = 'La persona tiene documentos vinculados. Primero elimina o reasigna los documentos asociados.';
      } else if (errorMessage.includes('no encontrado') || errorMessage.includes('no existe')) {
        detailedMessage = 'La persona ya no existe en el sistema.';
      } else if (errorMessage.includes('email') || errorMessage.includes('duplicate')) {
        detailedMessage = 'Ya existe una persona con ese email.';
      } else if (errorMessage.includes('conexión') || errorMessage.includes('red')) {
        detailedMessage = 'Error de conexión con el servidor. Verifica tu conexión a internet.';
      } else if (errorMessage.includes('base de datos') || errorMessage.includes('database')) {
        detailedMessage = 'Error en la base de datos. Intenta nuevamente o contacta al administrador.';
      } else {
        detailedMessage = errorMessage;
      }
      
      // Mostrar alerta de error con detalles usando showFormAlert (visible en todo el modal)
      showFormAlert(`Error al eliminar: ${detailedMessage}`, 'error');
      
      // También mostrar alerta global
      showAlert(`Error al eliminar a ${person.nombre}: ${detailedMessage}`, 'error');
    }
    
    // Revertir cambios en la fila
    const tableRow = document.querySelector(`button[onclick*="deletePerson('${id}')"]`)?.closest('tr');
    if (tableRow) {
      tableRow.style.animation = '';
      tableRow.classList.remove('table__row--deleting');
      
      // Limpiar completamente el overlay de eliminación
      const deleteOverlay = tableRow.querySelector('.delete-overlay');
      if (deleteOverlay) {
        deleteOverlay.remove();
      }
      
      // Restaurar contenido original
      const cells = tableRow.querySelectorAll('td');
      cells.forEach(cell => {
        cell.style.opacity = '1';
      });
      
      // Restaurar altura
      tableRow.style.height = '';
    }
  }
}


// =============================================================================
// 6. FUNCIONES AUXILIARES
// =============================================================================

/**
 * Mostrar modal de confirmación de eliminación mejorado
 */
function showDeleteConfirmation(personName) {
    return new Promise((resolve) => {
        // Crear modal de confirmación
        const confirmModal = document.createElement('div');
        confirmModal.className = 'modal confirm-modal';
        confirmModal.innerHTML = `
            <div class="modal__content" style="max-width: 450px;">
                <div class="modal__header">
                    <h3 class="modal__title">
                        <i class="fas fa-exclamation-triangle" style="color: #f44336; margin-right: 10px;"></i>
                        Confirmar Eliminación
                    </h3>
                    <button class="modal__close" onclick="this.closest('.modal').remove();">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal__body">
                    <div class="confirm-content">
                        <div class="confirm-icon">
                            <i class="fas fa-user-slash"></i>
                        </div>
                        <h4 class="confirm-title">¿Estás seguro de eliminar a "${personName}"?</h4>
                        <p class="confirm-message">
                            Esta acción <strong>no se puede deshacer</strong>. Todos los datos relacionados con esta persona serán eliminados permanentemente.
                        </p>
                        <div class="confirm-warning">
                            <i class="fas fa-exclamation-circle"></i>
                            <span>Esta acción también eliminará cualquier documento asociado a esta persona.</span>
                        </div>
                    </div>
                </div>
                <div class="modal__footer" style="justify-content: flex-end; gap: 1rem;">
                    <button class="btn btn--outline" id="cancelDeleteBtn">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                    <button class="btn btn--danger" id="confirmDeleteBtn">
                        <i class="fas fa-trash"></i> Sí, eliminar
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(confirmModal);
        
        // Mostrar modal con animación
        setTimeout(() => {
            confirmModal.style.display = 'flex';
            confirmModal.classList.add('modal--visible');
        }, 10);
        
        // Agregar event listeners después de que el modal esté en el DOM
        setTimeout(() => {
            const cancelBtn = confirmModal.querySelector('#cancelDeleteBtn');
            const confirmBtn = confirmModal.querySelector('#confirmDeleteBtn');
            
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    confirmModal.classList.remove('modal--visible');
                    setTimeout(() => {
                        confirmModal.remove();
                        resolve(false);
                    }, 300);
                });
            }
            
            if (confirmBtn) {
                confirmBtn.addEventListener('click', () => {
                    confirmModal.classList.remove('modal--visible');
                    setTimeout(() => {
                        confirmModal.remove();
                        resolve(true);
                    }, 300);
                });
            }
            
            // También manejar el botón de cerrar
            const closeBtn = confirmModal.querySelector('.modal__close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    confirmModal.classList.remove('modal--visible');
                    setTimeout(() => {
                        confirmModal.remove();
                        resolve(false);
                    }, 300);
                });
            }
            
            // Cerrar al hacer clic fuera del modal
            confirmModal.addEventListener('click', (e) => {
                if (e.target === confirmModal) {
                    confirmModal.classList.remove('modal--visible');
                    setTimeout(() => {
                        confirmModal.remove();
                        resolve(false);
                    }, 300);
                }
            });
            
            // Cerrar con Escape key
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    confirmModal.classList.remove('modal--visible');
                    setTimeout(() => {
                        confirmModal.remove();
                        resolve(false);
                    }, 300);
                    document.removeEventListener('keydown', handleEscape);
                }
            };
            
            document.addEventListener('keydown', handleEscape);
            
        }, 50);
    });
}

/**
 * Mostrar notificación flotante
 */
function showFloatingNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `floating-notification floating-notification--${type}`;
    notification.innerHTML = `
        <div class="floating-notification__content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="floating-notification__close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    document.body.appendChild(notification);
    
    // Mostrar con animación
    setTimeout(() => {
        notification.classList.add('floating-notification--visible');
    }, 10);
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
        notification.classList.remove('floating-notification--visible');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 5000);
}

// =============================================================================
// 7. RENDERIZADO DE INTERFAZ CON PERMISOS
// =============================================================================

function renderPersonsTable() {
    if (!DOM.personasTableBody) return;
    
    // Verificar permiso de vista
    if (!canView('personas')) {
        DOM.personasTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state error-state">
                    <div class="error-state__icon">
                        <i class="fas fa-lock"></i>
                    </div>
                    <h3 class="empty-state__title">Acceso Restringido</h3>
                    <p class="empty-state__description">No tienes permisos para ver la lista de personas.</p>
                </td>
            </tr>
        `;
        return;
    }
    
    DOM.personasTableBody.innerHTML = '';
    
    if (window.appState.persons.length === 0) {
        DOM.personasTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <div class="empty-state__icon">
                        <i class="fas fa-users"></i>
                    </div>
                    <h3 class="empty-state__title">No hay personas registradas</h3>
                    <p class="empty-state__description">Agrega la primera persona para comenzar</p>
                    <div class="empty-state__actions" style="margin-top: 1rem;">
                        ${canAction('personas') ? `
                            <button class="btn btn--primary" onclick="openPersonModal()">
                                <i class="fas fa-user-plus"></i> Agregar primera persona
                            </button>
                        ` : `
                            <span class="text-muted">Contacta al administrador para agregar personas</span>
                        `}
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Verificar datos incompletos para mostrar alertas visuales
    const personsWithIssues = window.appState.persons.filter(p => 
        !p.departamento || !p.telefono || !p.puesto
    );
    
    if (personsWithIssues.length > 0) {
        // Mostrar alerta general
        showAlert(
            `${personsWithIssues.length} persona(s) tienen información incompleta. Considera actualizarlas.`,
            'warning'
        );
    }
    
    // Determinar si el usuario puede editar/eliminar
    const canEdit = canAction('personas');
    
    window.appState.persons.forEach(person => {
        const row = document.createElement('tr');
        row.className = 'table__row';
        row.dataset.personId = person._id;
        
        // Determinar si tiene datos incompletos
        const hasMissingData = !person.departamento || !person.telefono || !person.puesto;
        if (hasMissingData) {
            row.classList.add('table__row--warning');
        }
        
        // Íconos de alerta para datos faltantes
        const missingIcons = [];
        if (!person.departamento) {
            missingIcons.push('<i class="fas fa-building text-warning" title="Sin departamento"></i>');
        }
        if (!person.telefono) {
            missingIcons.push('<i class="fas fa-phone text-warning" title="Sin teléfono"></i>');
        }
        if (!person.puesto) {
            missingIcons.push('<i class="fas fa-briefcase text-warning" title="Sin puesto"></i>');
        }
        
        row.innerHTML = `
            <td class="table__cell">
                <div class="person-info">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="person-name ${hasMissingData ? 'text-warning' : ''}">${person.nombre}</span>
                        ${missingIcons.join('')}
                    </div>
                    ${person.puesto ? `<span class="person-position">${person.puesto}</span>` : 
                      '<span class="person-position text-muted"><i>Sin puesto definido</i></span>'}
                </div>
            </td>
            <td class="table__cell">
                <div class="person-email">
                    <i class="fas fa-envelope" style="margin-right: 8px; color: var(--text-muted); font-size: 0.9em;"></i>
                    ${person.email}
                </div>
            </td>
            <td class="table__cell">
                ${person.telefono ? `
                    <div class="person-phone">
                        <i class="fas fa-phone" style="margin-right: 8px; color: var(--text-muted); font-size: 0.9em;"></i>
                        ${person.telefono}
                    </div>
                ` : '<span class="text-muted"><i>No especificado</i></span>'}
            </td>
            <td class="table__cell">
                ${person.departamento ? `
                    <span class="department-badge">${person.departamento}</span>
                ` : '<span class="department-badge department-badge--warning">Sin departamento</span>'}
            </td>
            <td class="table__cell">
                <div class="table-actions">
                    ${canEdit ? `
                        <button class="btn btn--sm btn--outline btn--icon" onclick="editPerson('${person._id}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn--sm btn--danger btn--icon" onclick="deletePerson('${person._id}')" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : `
                        <span class="text-muted" title="Solo lectura">
                            <i class="fas fa-eye"></i> Solo lectura
                        </span>
                    `}
                </div>
            </td>
        `;
        
        DOM.personasTableBody.appendChild(row);
    });
}

// =============================================================================
// 8. MANEJO DE SELECTS/FILTROS
// =============================================================================

function populatePersonSelect() {
    if (!DOM.documentPerson) return;
    
    DOM.documentPerson.innerHTML = '<option value="">Seleccionar persona</option>';
    
    window.appState.persons.forEach(person => {
        const option = document.createElement('option');
        option.value = person._id;
        option.textContent = person.nombre;
        if (person.departamento) {
            option.dataset.department = person.departamento;
        }
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

// =============================================================================
// 9. HANDLERS/CONTROLADORES
// =============================================================================

function handleSavePerson() {
    console.log('💾 Guardando persona...');
    savePerson();
}

// Función para refrescar el select de departamentos
function refreshDepartmentSelect() {
    loadDepartmentsForModal();
}

// Inicializar filtros cuando se cargue el módulo
document.addEventListener('DOMContentLoaded', function() {
    if (!canView('personas')) return;
    // Esperar un momento para asegurar que el DOM esté completamente cargado
    setTimeout(() => {
        initializeFilters();
    }, 100);
});

// =============================================================================
// 10. EXPORTACIONES
// =============================================================================

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
    handleSavePerson,
    refreshDepartmentSelect,
    validateEmail,
    validatePhone,
    validateName,
    showFloatingNotification,
    validateForm,
    initializeFilters,
    applyFilters,
    clearFilters,
    showFormAlert,
    removeExistingAlerts
};