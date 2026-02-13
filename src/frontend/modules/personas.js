import { DOM } from '../dom.js';
import { api } from '../services/api.js';
import { setLoadingState, showAlert, isValidEmail } from '../utils.js';

// Variables globales para filtros
let currentFilters = {
    search: '',
    puesto: '',
    sort: 'nombre-asc'
};

// Cache para validaciones de duplicados
let validationCache = {
    email: { value: '', isValid: true, message: '' },
    telefono: { value: '', isValid: true, message: '' },
    nombre: { value: '', isValid: true, message: '' }
};

let validationTimeouts = {
    email: null,
    telefono: null,
    nombre: null
};

// =============================================================================
// 1. MANEJO DEL MODAL DE PERSONAS
// =============================================================================

/**
 * 1.1 Abrir modal para crear/editar persona
 */
async function openPersonModal(personId = null) {
    console.log(`👤 Abriendo modal de persona: ${personId || 'Nueva'}`);
    
    try {
        // Limpiar caché de validaciones
        clearValidationCache();
        
        // Remover validaciones existentes
        removeRealTimeValidation();
        
        // Mostrar preloader en el modal mientras carga
        showModalPreloader('Cargando datos...', 'Preparando formulario');
        
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
            } else {
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
        }
        
        // Remover preloader
        removeModalPreloader();
        
        DOM.personModal.style.display = 'flex';
        
        // Agregar validación en tiempo real
        addRealTimeValidation();
        
        // Validar campos inicialmente
        validateInitialFields();
        
    } catch (error) {
        console.error('❌ Error abriendo modal de persona:', error);
        removeModalPreloader();
        showFloatingNotification('Error al cargar el formulario', 'error');
    }
}

/**
 * 1.2 Mostrar preloader en el modal
 */
function showModalPreloader(title = 'Cargando...', subtitle = 'Por favor espera un momento') {
    const modalContent = document.querySelector('.modal__content');
    if (!modalContent) return;
    
    // Remover preloader existente
    const existingPreloader = modalContent.querySelector('.modal-preloader');
    if (existingPreloader) {
        existingPreloader.remove();
    }
    
    // Crear nuevo preloader
    const preloader = document.createElement('div');
    preloader.className = 'preloader-overlay preloader-overlay--light modal-preloader';
    preloader.innerHTML = `
        <div class="preloader-overlay__content">
            <div class="preloader__spinner preloader--primary preloader--lg"></div>
            <p class="preloader__text">${title}</p>
            <p class="preloader-overlay__subtitle">${subtitle}</p>
        </div>
    `;
    
    modalContent.style.position = 'relative';
    modalContent.appendChild(preloader);
}

/**
 * 1.3 Remover preloader del modal
 */
function removeModalPreloader() {
    const preloader = document.querySelector('.modal-preloader');
    if (preloader) {
        preloader.classList.add('fade-out');
        setTimeout(() => {
            preloader.remove();
            const modalContent = document.querySelector('.modal__content');
            if (modalContent) {
                modalContent.style.position = '';
            }
        }, 300);
    }
}

/**
 * 1.4 Limpiar caché de validaciones
 */
function clearValidationCache() {
    validationCache = {
        email: { value: '', isValid: true, message: '' },
        telefono: { value: '', isValid: true, message: '' },
        nombre: { value: '', isValid: true, message: '' }
    };
}

/**
 * 1.5 Validar campos iniciales
 */
function validateInitialFields() {
    // Validar nombre si tiene valor
    if (DOM.personName.value.trim() !== '') {
        validateNameWithDelay(DOM.personName.value);
    }
    
    // Validar email si tiene valor
    if (DOM.personEmail.value.trim() !== '') {
        validateEmailWithDelay(DOM.personEmail.value);
    }
    
    // Validar teléfono si tiene valor
    if (DOM.personPhone.value.trim() !== '') {
        validatePhoneWithDelay(DOM.personPhone.value);
    }
    
    // Validar departamento si tiene valor
    const departmentSelect = document.getElementById('personDepartment');
    if (departmentSelect && departmentSelect.value && departmentSelect.value !== 'Nuevo Departamento') {
        const validation = validateDepartment(departmentSelect.value);
        updateFieldValidation(departmentSelect, validation);
    }
    
    // Validar puesto si tiene valor
    if (DOM.personPosition.value.trim() !== '') {
        const validation = validatePosition(DOM.personPosition.value);
        updateFieldValidation(DOM.personPosition, validation);
    }
}

/**
 * 1.6 Cargar departamentos para el modal
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
    }
}

/**
 * 1.7 Poblar el select de departamentos
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
    departmentSelect.removeEventListener('change', handleDepartmentSelection);
    departmentSelect.addEventListener('change', handleDepartmentSelection);
}

/**
 * 1.8 Manejar selección de departamento
 */
function handleDepartmentSelection(e) {
    if (e.target.value === "Nuevo Departamento") {
        // Resetear
        e.target.value = "";
        
        // Remover validación actual
        const validationMsg = e.target.parentNode.querySelector('.validation-message');
        if (validationMsg) {
            validationMsg.remove();
        }
        
        // Cerrar modal actual
        closePersonModal();
        
        // Abrir modal de departamentos después de un breve delay
        setTimeout(() => {
            if (window.openDepartmentModal) {
                window.openDepartmentModal();
            }
        }, 500);
    } else {
        // Validar el departamento seleccionado
        const validation = validateDepartment(e.target.value);
        updateFieldValidation(e.target, validation);
    }
}

/**
 * 1.9 Cerrar modal de personas
 */
function closePersonModal() {
    console.log('❌ Cerrando modal de persona');
    
    // Mostrar animación de salida
    const modalContent = document.querySelector('.modal__content');
    if (modalContent) {
        modalContent.classList.add('modal-exit');
    }
    
    setTimeout(() => {
        DOM.personModal.style.display = 'none';
        
        // Remover clases de animación
        if (modalContent) {
            modalContent.classList.remove('modal-exit');
        }
        
        // Limpiar timeouts
        Object.keys(validationTimeouts).forEach(key => {
            if (validationTimeouts[key]) {
                clearTimeout(validationTimeouts[key]);
                validationTimeouts[key] = null;
            }
        });
        
        // Remover validaciones
        removeRealTimeValidation();
        
        // Limpiar mensajes de validación
        clearValidationMessages();
        
        // Limpiar caché
        clearValidationCache();
        
        // Remover cualquier preloader
        removeModalPreloader();
    }, 300);
}

/**
 * 1.10 Limpiar mensajes de validación
 */
function clearValidationMessages() {
    const validationMessages = document.querySelectorAll('.validation-message');
    validationMessages.forEach(msg => msg.remove());
    
    // Remover clases de validación
    [DOM.personName, DOM.personEmail, DOM.personPhone, DOM.personPosition].forEach(field => {
        if (field) {
            field.classList.remove('field--valid', 'field--invalid');
        }
    });
    
    const departmentSelect = document.getElementById('personDepartment');
    if (departmentSelect) {
        departmentSelect.classList.remove('field--valid', 'field--invalid');
    }
}

// =============================================================================
// 2. VALIDACIONES CON VERIFICACIÓN DE DUPLICADOS
// =============================================================================

/**
 * 2.1 Verificar email duplicado
 */
async function checkDuplicateEmail(email, currentPersonId = null) {
    if (!email || email.trim() === '') {
        return { isDuplicate: false, message: '' };
    }
    
    try {
        // Obtener todas las personas
        const response = await api.getPersons();
        if (response.success && response.persons) {
            // Buscar si existe otra persona con el mismo email (que no sea la actual)
            const existingPerson = response.persons.find(p => 
                p.email.toLowerCase() === email.toLowerCase() && 
                p._id !== currentPersonId
            );
            
            if (existingPerson) {
                return { 
                    isDuplicate: true, 
                    message: `Este email ya está registrado por: ${existingPerson.nombre}` 
                };
            }
        }
        return { isDuplicate: false, message: '' };
    } catch (error) {
        console.error('Error verificando email duplicado:', error);
        return { isDuplicate: false, message: '' };
    }
}

/**
 * 2.2 Verificar teléfono duplicado
 */
async function checkDuplicatePhone(phone, currentPersonId = null) {
    if (!phone || phone.trim() === '') {
        return { isDuplicate: false, message: '' };
    }
    
    try {
        // Limpiar el teléfono para comparación
        const cleanPhone = phone.replace(/[+\s\-()]/g, '');
        
        // Obtener todas las personas
        const response = await api.getPersons();
        if (response.success && response.persons) {
            // Buscar si existe otra persona con el mismo teléfono (que no sea la actual)
            const existingPerson = response.persons.find(p => {
                if (!p.telefono) return false;
                const cleanExistingPhone = p.telefono.replace(/[+\s\-()]/g, '');
                return cleanExistingPhone === cleanPhone && p._id !== currentPersonId;
            });
            
            if (existingPerson) {
                return { 
                    isDuplicate: true, 
                    message: `Este teléfono ya está registrado por: ${existingPerson.nombre}` 
                };
            }
        }
        return { isDuplicate: false, message: '' };
    } catch (error) {
        console.error('Error verificando teléfono duplicado:', error);
        return { isDuplicate: false, message: '' };
    }
}

/**
 * 2.3 Verificar nombre duplicado
 */
async function checkDuplicateName(name, currentPersonId = null) {
    if (!name || name.trim() === '') {
        return { isDuplicate: false, message: '' };
    }
    
    try {
        // Obtener todas las personas
        const response = await api.getPersons();
        if (response.success && response.persons) {
            // Buscar si existe otra persona con el mismo nombre (que no sea la actual)
            const existingPerson = response.persons.find(p => 
                p.nombre.toLowerCase() === name.toLowerCase() && 
                p._id !== currentPersonId
            );
            
            if (existingPerson) {
                return { 
                    isDuplicate: true, 
                    message: `Ya existe una persona con este nombre` 
                };
            }
        }
        return { isDuplicate: false, message: '' };
    } catch (error) {
        console.error('Error verificando nombre duplicado:', error);
        return { isDuplicate: false, message: '' };
    }
}

/**
 * 2.4 Validar email con verificación de duplicado
 */
async function validateEmailWithDelay(emailValue) {
    const currentPersonId = DOM.personId.value || null;
    
    // Validación básica primero
    const basicValidation = validateEmail(emailValue);
    
    if (!basicValidation.isValid) {
        updateFieldValidation(DOM.personEmail, basicValidation);
        return;
    }
    
    // Mostrar "Verificando..." mientras se comprueba duplicado
    showVerifyingMessage(DOM.personEmail, 'Verificando email...');
    
    // Verificar duplicado
    const duplicateCheck = await checkDuplicateEmail(emailValue, currentPersonId);
    
    if (duplicateCheck.isDuplicate) {
        const validation = {
            isValid: false,
            message: duplicateCheck.message,
            field: 'email'
        };
        updateFieldValidation(DOM.personEmail, validation);
    } else {
        const validation = {
            isValid: true,
            message: 'Email disponible',
            field: 'email'
        };
        updateFieldValidation(DOM.personEmail, validation);
    }
}

/**
 * 2.5 Validar teléfono con verificación de duplicado
 */
async function validatePhoneWithDelay(phoneValue) {
    const currentPersonId = DOM.personId.value || null;
    
    // Validación básica primero
    const basicValidation = validatePhone(phoneValue);
    
    if (!basicValidation.isValid) {
        updateFieldValidation(DOM.personPhone, basicValidation);
        return;
    }
    
    // Si está vacío (opcional), no verificar duplicado
    if (!phoneValue || phoneValue.trim() === '') {
        updateFieldValidation(DOM.personPhone, basicValidation);
        return;
    }
    
    // Mostrar "Verificando..." mientras se comprueba duplicado
    showVerifyingMessage(DOM.personPhone, 'Verificando teléfono...');
    
    // Verificar duplicado
    const duplicateCheck = await checkDuplicatePhone(phoneValue, currentPersonId);
    
    if (duplicateCheck.isDuplicate) {
        const validation = {
            isValid: false,
            message: duplicateCheck.message,
            field: 'telefono'
        };
        updateFieldValidation(DOM.personPhone, validation);
    } else {
        const validation = {
            isValid: true,
            message: 'Teléfono disponible',
            field: 'telefono'
        };
        updateFieldValidation(DOM.personPhone, validation);
    }
}

/**
 * 2.6 Validar nombre con verificación de duplicado
 */
async function validateNameWithDelay(nameValue) {
    const currentPersonId = DOM.personId.value || null;
    
    // Validación básica primero
    const basicValidation = validateName(nameValue);
    
    if (!basicValidation.isValid) {
        updateFieldValidation(DOM.personName, basicValidation);
        return;
    }
    
    // Mostrar "Verificando..." mientras se comprueba duplicado
    showVerifyingMessage(DOM.personName, 'Verificando nombre...');
    
    // Verificar duplicado
    const duplicateCheck = await checkDuplicateName(nameValue, currentPersonId);
    
    if (duplicateCheck.isDuplicate) {
        const validation = {
            isValid: false,
            message: duplicateCheck.message,
            field: 'nombre'
        };
        updateFieldValidation(DOM.personName, validation);
    } else {
        const validation = {
            isValid: true,
            message: 'Nombre disponible',
            field: 'nombre'
        };
        updateFieldValidation(DOM.personName, validation);
    }
}

/**
 * 2.7 Mostrar mensaje de verificación
 */
function showVerifyingMessage(field, message) {
    if (!field) return;
    
    // Remover clases anteriores
    field.classList.remove('field--valid', 'field--invalid');
    
    // Remover mensaje anterior si existe
    const existingMessage = field.parentNode.querySelector('.validation-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Crear mensaje de verificación
    const messageElement = document.createElement('div');
    messageElement.className = 'validation-message validation-message--verifying';
    messageElement.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${message}`;
    
    field.parentNode.appendChild(messageElement);
}

/**
 * 2.8 Validar email (validación básica)
 */
function validateEmail(email) {
    if (!email || email.trim() === '') {
        return { 
            isValid: false, 
            message: 'El email es obligatorio',
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
            field: 'email'
        };
    }
    if (atCount > 1) {
        return { 
            isValid: false, 
            message: 'El email solo puede contener un símbolo @',
            field: 'email'
        };
    }
    
    // Validar formato básico de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue)) {
        return { 
            isValid: false, 
            message: 'Formato inválido. Ejemplo: usuario@dominio.com',
            field: 'email'
        };
    }
    
    // Validar que no empiece o termine con punto o guión
    if (emailValue.startsWith('.') || emailValue.endsWith('.') || 
        emailValue.startsWith('-') || emailValue.endsWith('-') ||
        emailValue.startsWith('@') || emailValue.endsWith('@')) {
        return { 
            isValid: false, 
            message: 'El email no puede empezar o terminar con símbolos especiales',
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
            field: 'email'
        };
    }
    
    // Validar que el dominio tenga al menos un punto
    if (!domain.includes('.')) {
        return { 
            isValid: false, 
            message: 'El dominio necesita un punto (ejemplo: gmail.com)',
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
            field: 'email'
        };
    }
    
    return { 
        isValid: true, 
        message: 'Formato de email válido',
        field: 'email'
    };
}

/**
 * 2.9 Validar teléfono (validación básica)
 */
function validatePhone(phone) {
    // Si el teléfono está vacío, es opcional
    if (!phone || phone.trim() === '') {
        return { 
            isValid: true, 
            message: 'Teléfono (opcional)',
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
            message: 'Solo números, sin letras ni símbolos',
            field: 'telefono'
        };
    }
    
    // Validar longitud máxima
    if (cleanPhone.length > 10) {
        return { 
            isValid: false, 
            message: 'Máximo 10 dígitos',
            field: 'telefono'
        };
    }
    
    // Validar longitud mínima
    if (cleanPhone.length < 8) {
        return { 
            isValid: false, 
            message: 'Mínimo 8 dígitos',
            field: 'telefono'
        };
    }
    
    // Validar formato del número (no puede empezar con 0)
    if (cleanPhone.startsWith('0')) {
        return { 
            isValid: false, 
            message: 'No puede comenzar con 0',
            field: 'telefono'
        };
    }
    
    return { 
        isValid: true, 
        message: 'Formato de teléfono válido',
        field: 'telefono'
    };
}

/**
 * 2.10 Validar nombre (validación básica)
 */
function validateName(name) {
    if (!name || name.trim() === '') {
        return { 
            isValid: false, 
            message: 'El nombre es obligatorio',
            field: 'nombre'
        };
    }
    
    const nameValue = name.trim();
    
    // Validar longitud mínima
    if (nameValue.length < 2) {
        return { 
            isValid: false, 
            message: 'Mínimo 2 caracteres',
            field: 'nombre'
        };
    }
    
    // Validar longitud máxima
    if (nameValue.length > 100) {
        return { 
            isValid: false, 
            message: 'Máximo 100 caracteres',
            field: 'nombre'
        };
    }
    
    // Validar caracteres permitidos (letras, espacios, acentos, ñ, puntos, comas, guiones)
    const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s\-\.,']+$/;
    if (!nameRegex.test(nameValue)) {
        return { 
            isValid: false, 
            message: 'Solo letras y espacios',
            field: 'nombre'
        };
    }
    
    // Validar que no contenga solo espacios
    if (!nameValue.replace(/\s/g, '').length) {
        return { 
            isValid: false, 
            message: 'No puede contener solo espacios',
            field: 'nombre'
        };
    }
    
    return { 
        isValid: true, 
        message: 'Formato de nombre válido',
        field: 'nombre'
    };
}

/**
 * 2.11 Validar puesto (opcional)
 */
function validatePosition(position) {
    if (!position || position.trim() === '') {
        return { 
            isValid: true, 
            message: 'Puesto (opcional)',
            field: 'puesto'
        };
    }
    
    const positionValue = position.trim();
    
    // Validar longitud máxima
    if (positionValue.length > 100) {
        return { 
            isValid: false, 
            message: 'Máximo 100 caracteres',
            field: 'puesto'
        };
    }
    
    return { 
        isValid: true, 
        message: 'Puesto válido',
        field: 'puesto'
    };
}

/**
 * 2.12 Validar departamento
 */
function validateDepartment(department) {
    if (!department || department.trim() === '') {
        return { 
            isValid: false, 
            message: 'Selecciona un departamento',
            field: 'departamento'
        };
    }
    
    if (department === "Nuevo Departamento") {
        return { 
            isValid: false, 
            message: 'Selecciona un departamento válido o crea uno nuevo',
            field: 'departamento'
        };
    }
    
    return { 
        isValid: true, 
        message: 'Departamento válido',
        field: 'departamento'
    };
}

/**
 * 2.13 Agregar validación en tiempo real con delay
 */
function addRealTimeValidation() {
    // Remove previous listeners
    removeRealTimeValidation();

    // Validate name with delay
    DOM.personName.addEventListener('input', function() {
        const value = this.value;
        
        // Limpiar timeout anterior
        if (validationTimeouts.nombre) {
            clearTimeout(validationTimeouts.nombre);
        }
        
        // Validación básica inmediata
        const basicValidation = validateName(value);
        if (!basicValidation.isValid || value.trim() === '') {
            updateFieldValidation(this, basicValidation);
            return;
        }
        
        // Delay para verificación de duplicado
        validationTimeouts.nombre = setTimeout(() => {
            validateNameWithDelay(value);
        }, 500);
    });

    // Validate email with delay
    DOM.personEmail.addEventListener('input', function() {
        const value = this.value;
        
        // Limpiar timeout anterior
        if (validationTimeouts.email) {
            clearTimeout(validationTimeouts.email);
        }
        
        // Validación básica inmediata
        const basicValidation = validateEmail(value);
        if (!basicValidation.isValid || value.trim() === '') {
            updateFieldValidation(this, basicValidation);
            return;
        }
        
        // Delay para verificación de duplicado
        validationTimeouts.email = setTimeout(() => {
            validateEmailWithDelay(value);
        }, 500);
    });

    // Validate phone with delay
    DOM.personPhone.addEventListener('input', function() {
        const value = this.value;
        
        // Limpiar timeout anterior
        if (validationTimeouts.telefono) {
            clearTimeout(validationTimeouts.telefono);
        }
        
        // Validación básica inmediata
        const basicValidation = validatePhone(value);
        updateFieldValidation(this, basicValidation);
        
        // Si es válido y no está vacío, verificar duplicado con delay
        if (basicValidation.isValid && value.trim() !== '') {
            validationTimeouts.telefono = setTimeout(() => {
                validatePhoneWithDelay(value);
            }, 500);
        }
    });

    // Validate position
    DOM.personPosition.addEventListener('input', function() {
        const validation = validatePosition(this.value);
        updateFieldValidation(this, validation);
    });

    // Validate department
    const departmentSelect = document.getElementById('personDepartment');
    if (departmentSelect) {
        departmentSelect.addEventListener('change', function() {
            const validation = validateDepartment(this.value);
            updateFieldValidation(this, validation);
        });
    }
}

/**
 * 2.14 Remover validación en tiempo real
 */
function removeRealTimeValidation() {
    if (DOM.personName) {
        DOM.personName.removeEventListener('input', () => {});
    }
    if (DOM.personEmail) {
        DOM.personEmail.removeEventListener('input', () => {});
    }
    if (DOM.personPhone) {
        DOM.personPhone.removeEventListener('input', () => {});
    }
    if (DOM.personPosition) {
        DOM.personPosition.removeEventListener('input', () => {});
    }
    
    const departmentSelect = document.getElementById('personDepartment');
    if (departmentSelect) {
        departmentSelect.removeEventListener('change', () => {});
    }
}

/**
 * 2.15 Actualizar estado de validación del campo
 */
function updateFieldValidation(field, validation) {
    if (!field) return;
    
    // Remover clases anteriores
    field.classList.remove('field--valid', 'field--invalid');
    
    // Remover mensaje anterior si existe
    const existingMessage = field.parentNode.querySelector('.validation-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // No mostrar mensaje para campos vacíos no obligatorios
    if (field.value.trim() === '' && field !== DOM.personName && field !== DOM.personEmail && field.id !== 'personDepartment') {
        return;
    }
    
    // Crear y mostrar mensaje de validación
    const messageElement = document.createElement('div');
    messageElement.className = 'validation-message';
    
    if (validation.isValid) {
        field.classList.add('field--valid');
        messageElement.classList.add('validation-message--success');
        messageElement.innerHTML = `<i class="fas fa-check-circle"></i> ${validation.message}`;
    } else {
        field.classList.add('field--invalid');
        messageElement.classList.add('validation-message--error');
        messageElement.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${validation.message}`;
    }
    
    field.parentNode.appendChild(messageElement);
}

/**
 * 2.16 Validar formulario completo
 */
async function validateForm() {
    let isValid = true;
    
    // Validar nombre
    const nameValue = DOM.personName.value;
    const nameValidation = validateName(nameValue);
    if (!nameValidation.isValid) {
        isValid = false;
        updateFieldValidation(DOM.personName, nameValidation);
    } else {
        // Verificar duplicado de nombre
        const duplicateCheck = await checkDuplicateName(nameValue, DOM.personId.value);
        if (duplicateCheck.isDuplicate) {
            isValid = false;
            updateFieldValidation(DOM.personName, {
                isValid: false,
                message: duplicateCheck.message,
                field: 'nombre'
            });
        }
    }
    
    // Validar email
    const emailValue = DOM.personEmail.value;
    const emailValidation = validateEmail(emailValue);
    if (!emailValidation.isValid) {
        isValid = false;
        updateFieldValidation(DOM.personEmail, emailValidation);
    } else {
        // Verificar duplicado de email
        const duplicateCheck = await checkDuplicateEmail(emailValue, DOM.personId.value);
        if (duplicateCheck.isDuplicate) {
            isValid = false;
            updateFieldValidation(DOM.personEmail, {
                isValid: false,
                message: duplicateCheck.message,
                field: 'email'
            });
        }
    }
    
    // Validar teléfono
    const phoneValue = DOM.personPhone.value;
    const phoneValidation = validatePhone(phoneValue);
    if (!phoneValidation.isValid) {
        isValid = false;
        updateFieldValidation(DOM.personPhone, phoneValidation);
    } else if (phoneValue.trim() !== '') {
        // Verificar duplicado de teléfono solo si tiene valor
        const duplicateCheck = await checkDuplicatePhone(phoneValue, DOM.personId.value);
        if (duplicateCheck.isDuplicate) {
            isValid = false;
            updateFieldValidation(DOM.personPhone, {
                isValid: false,
                message: duplicateCheck.message,
                field: 'telefono'
            });
        }
    }
    
    // Validar departamento
    const departmentSelect = document.getElementById('personDepartment');
    const departmentValue = departmentSelect ? departmentSelect.value : '';
    const departmentValidation = validateDepartment(departmentValue);
    if (!departmentValidation.isValid) {
        isValid = false;
        if (departmentSelect) {
            updateFieldValidation(departmentSelect, departmentValidation);
        }
    }
    
    // Validar puesto (solo si tiene valor)
    if (DOM.personPosition.value.trim() !== '') {
        const positionValidation = validatePosition(DOM.personPosition.value);
        if (!positionValidation.isValid) {
            isValid = false;
            updateFieldValidation(DOM.personPosition, positionValidation);
        }
    }
    
    return isValid;
}

// =============================================================================
// 3. FILTROS Y ORDENAMIENTO
// =============================================================================

/**
 * 3.1 Inicializar filtros
 */
function initializeFilters() {
    // Inicializar búsqueda
    const searchInput = document.getElementById('personasSearch');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            currentFilters.search = e.target.value.toLowerCase();
            applyFilters();
        });
    }
    
    // Inicializar filtro de puestos
    const puestoFilter = document.getElementById('personasPuestoFilter');
    if (puestoFilter) {
        puestoFilter.addEventListener('change', function(e) {
            currentFilters.puesto = e.target.value;
            applyFilters();
        });
    }
    
    // Inicializar ordenamiento
    const sortFilter = document.getElementById('personasSortFilter');
    if (sortFilter) {
        sortFilter.addEventListener('change', function(e) {
            currentFilters.sort = e.target.value;
            applyFilters();
        });
    }
}

/**
 * 3.2 Aplicar filtros
 */
function applyFilters() {
    console.log('🔍 Aplicando filtros:', currentFilters);
    
    if (!window.appState.persons || window.appState.persons.length === 0) {
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
}

/**
 * 3.3 Renderizar tabla filtrada
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
                        <button class="btn btn--outline" onclick="clearFilters()">
                            <i class="fas fa-times"></i> Limpiar filtros
                        </button>
                        <button class="btn btn--primary" onclick="openPersonModal()">
                            <i class="fas fa-user-plus"></i> Agregar persona
                        </button>
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
                    <button class="btn btn--sm btn--outline btn--icon" onclick="editPerson('${person._id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn--sm btn--danger btn--icon" onclick="deletePerson('${person._id}')" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        DOM.personasTableBody.appendChild(row);
    });
}

/**
 * 3.4 Actualizar lista de puestos en el filtro
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
}

/**
 * 3.5 Limpiar filtros
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
    
    // Renderizar tabla original
    renderPersonsTable();
}

// =============================================================================
// 4. OPERACIONES CRUD DE PERSONAS
// =============================================================================

/**
 * 4.1 Guardar persona (Crear/Actualizar)
 */
async function savePerson() {
    console.log('💾 Intentando guardar persona...');
    
    // Validar formulario antes de enviar
    const isValid = await validateForm();
    if (!isValid) {
        return;
    }
    
    // Obtener el select de departamento
    const departmentSelect = document.getElementById('personDepartment');
    const selectedDepartment = departmentSelect ? departmentSelect.value : '';
    
    const isEditing = DOM.personId.value ? true : false;
    const actionText = isEditing ? 'Actualizando persona...' : 'Creando persona...';
    
    try {
        // Mostrar preloader mejorado con animación
        await showSavePreloader(actionText, isEditing);
        
        const personData = {
            nombre: DOM.personName.value.trim(),
            email: DOM.personEmail.value.trim(),
            telefono: DOM.personPhone.value.trim(),
            departamento: selectedDepartment,
            puesto: DOM.personPosition.value.trim()
        };
        
        console.log('💾 Guardando persona:', personData);
        
        let data;
        if (isEditing) {
            data = await api.updatePerson(DOM.personId.value, personData);
        } else {
            data = await api.createPerson(personData);
        }
        
        if (data.success) {
            // Mostrar animación de éxito
            await showSuccessAnimation(isEditing ? '¡Persona actualizada!' : '¡Persona creada!', data.message);
            
            // Cerrar modal y recargar datos
            closePersonModal();
            await loadPersons();
            
            // Mostrar notificación flotante de éxito
            showFloatingNotification(
                isEditing ? 'Persona actualizada exitosamente' : 'Persona creada exitosamente',
                'success'
            );
            
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
        
        // Mostrar error en el preloader
        await showErrorAnimation(error.message);
        
        // Mostrar notificación flotante de error
        showFloatingNotification(error.message || 'Error al guardar la persona', 'error');
    }
}

/**
 * 4.2 Mostrar preloader de guardado
 */
function showSavePreloader(actionText, isEditing = false) {
    return new Promise((resolve) => {
        const modalContent = document.querySelector('.modal__content');
        if (!modalContent) {
            resolve();
            return;
        }
        
        // Remover preloader existente
        const existingPreloader = modalContent.querySelector('.modal-preloader');
        if (existingPreloader) {
            existingPreloader.remove();
        }
        
        // Crear preloader mejorado
        const preloader = document.createElement('div');
        preloader.className = 'preloader-overlay preloader-overlay--light modal-preloader save-preloader';
        preloader.innerHTML = `
            <div class="preloader-overlay__content">
                <div class="preloader__spinner preloader--${isEditing ? 'warning' : 'primary'} preloader--lg"></div>
                <div class="preloader__progress">
                    <div class="preloader__progress-bar" style="width: 0%;"></div>
                </div>
                <p class="preloader__text">${actionText}</p>
                <p class="preloader-overlay__subtitle">Por favor espera un momento</p>
                <div class="preloader__dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        
        modalContent.style.position = 'relative';
        modalContent.appendChild(preloader);
        
        // Deshabilitar formulario
        const formElements = DOM.personForm.querySelectorAll('input, select, button');
        formElements.forEach(el => {
            el.disabled = true;
            el.style.opacity = '0.6';
            el.style.pointerEvents = 'none';
        });
        
        // Animar barra de progreso
        setTimeout(() => {
            const progressBar = preloader.querySelector('.preloader__progress-bar');
            if (progressBar) {
                progressBar.style.width = '70%';
                progressBar.style.transition = 'width 0.8s ease';
            }
        }, 100);
        
        setTimeout(() => {
            const progressBar = preloader.querySelector('.preloader__progress-bar');
            if (progressBar) {
                progressBar.style.width = '90%';
            }
            resolve();
        }, 500);
    });
}

/**
 * 4.3 Mostrar animación de éxito
 */
function showSuccessAnimation(title, message) {
    return new Promise((resolve) => {
        const preloader = document.querySelector('.modal-preloader');
        if (!preloader) {
            resolve();
            return;
        }
        
        // Completar barra de progreso
        const progressBar = preloader.querySelector('.preloader__progress-bar');
        if (progressBar) {
            progressBar.style.width = '100%';
        }
        
        // Cambiar contenido a éxito
        setTimeout(() => {
            preloader.innerHTML = `
                <div class="preloader-overlay__content">
                    <div class="success-animation">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <h3 class="preloader-overlay__title" style="color: #4CAF50; margin-bottom: 0.5rem;">${title}</h3>
                    <p class="preloader-overlay__subtitle">${message || 'La operación se completó exitosamente'}</p>
                    <div class="preloader-message">
                        <p class="preloader-message__text">Redirigiendo en <span class="countdown">2</span> segundos...</p>
                    </div>
                </div>
            `;
            
            // Agregar animación de pulso al modal
            const modalContent = document.querySelector('.modal__content');
            if (modalContent) {
                modalContent.classList.add('modal-success');
            }
            
            // Contador regresivo
            let seconds = 2;
            const countdownEl = preloader.querySelector('.countdown');
            const interval = setInterval(() => {
                seconds--;
                if (countdownEl) countdownEl.textContent = seconds;
                if (seconds <= 0) {
                    clearInterval(interval);
                    resolve();
                }
            }, 1000);
            
        }, 300);
    });
}

/**
 * 4.4 Mostrar animación de error
 */
function showErrorAnimation(errorMessage) {
    return new Promise((resolve) => {
        const preloader = document.querySelector('.modal-preloader');
        if (!preloader) {
            resolve();
            return;
        }
        
        // Cambiar contenido a error
        preloader.innerHTML = `
            <div class="preloader-overlay__content">
                <div class="error-animation">
                    <i class="fas fa-exclamation-circle"></i>
                </div>
                <h3 class="preloader-overlay__title" style="color: #f44336; margin-bottom: 0.5rem;">¡Error!</h3>
                <p class="preloader-overlay__subtitle">${errorMessage || 'Ocurrió un error al guardar la persona'}</p>
                <div class="preloader-actions" style="margin-top: 1.5rem; display: flex; gap: 1rem; justify-content: center;">
                    <button class="btn btn--outline btn--sm" id="error-correct-btn">
                        <i class="fas fa-edit"></i> Corregir datos
                    </button>
                    <button class="btn btn--primary btn--sm" id="error-retry-btn">
                        <i class="fas fa-redo"></i> Reintentar
                    </button>
                </div>
            </div>
        `;
        
        // Agregar animación de error al modal
        const modalContent = document.querySelector('.modal__content');
        if (modalContent) {
            modalContent.classList.add('modal-error');
            setTimeout(() => {
                modalContent.classList.remove('modal-error');
            }, 1000);
        }
        
        // Agregar event listeners para los botones
        const correctBtn = preloader.querySelector('#error-correct-btn');
        const retryBtn = preloader.querySelector('#error-retry-btn');
        
        if (correctBtn) {
            correctBtn.addEventListener('click', () => {
                preloader.remove();
                
                // Rehabilitar formulario
                const formElements = DOM.personForm.querySelectorAll('input, select, button');
                formElements.forEach(el => {
                    el.disabled = false;
                    el.style.opacity = '1';
                    el.style.pointerEvents = '';
                });
                
                resolve();
            });
        }
        
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                preloader.remove();
                
                // Rehabilitar formulario
                const formElements = DOM.personForm.querySelectorAll('input, select, button');
                formElements.forEach(el => {
                    el.disabled = false;
                    el.style.opacity = '1';
                    el.style.pointerEvents = '';
                });
                
                // Reintentar guardado
                savePerson();
                resolve();
            });
        }
    });
}

/**
 * 4.5 Mostrar notificación flotante
 */
function showFloatingNotification(message, type = 'success', duration = 5000) {
    // Remover notificaciones existentes
    const existingNotifications = document.querySelectorAll('.floating-notification');
    existingNotifications.forEach(notification => {
        notification.classList.remove('floating-notification--visible');
        setTimeout(() => notification.remove(), 300);
    });
    
    // Crear nueva notificación
    const notification = document.createElement('div');
    notification.className = `floating-notification floating-notification--${type}`;
    
    const icon = type === 'success' ? 'fa-check-circle' : 
                 type === 'error' ? 'fa-exclamation-circle' : 
                 type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle';
    
    notification.innerHTML = `
        <div class="floating-notification__content">
            <i class="fas ${icon}"></i>
            <span>${message}</span>
        </div>
        <button class="floating-notification__close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    document.body.appendChild(notification);
    
    // Mostrar con animación
    setTimeout(() => {
        notification.classList.add('floating-notification--visible');
    }, 10);
    
    // Configurar cierre automático
    const timeoutId = setTimeout(() => {
        notification.classList.remove('floating-notification--visible');
        setTimeout(() => notification.remove(), 300);
    }, duration);
    
    // Configurar cierre manual
    const closeBtn = notification.querySelector('.floating-notification__close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            clearTimeout(timeoutId);
            notification.classList.remove('floating-notification--visible');
            setTimeout(() => notification.remove(), 300);
        });
    }
    
    // Cerrar al hacer clic fuera
    setTimeout(() => {
        document.addEventListener('click', function closeOnOutsideClick(e) {
            if (!notification.contains(e.target)) {
                notification.classList.remove('floating-notification--visible');
                setTimeout(() => notification.remove(), 300);
                document.removeEventListener('click', closeOnOutsideClick);
                clearTimeout(timeoutId);
            }
        });
    }, 100);
}

/**
 * 4.6 Cargar personas
 */
async function loadPersons() {
    try {
        console.log('👥 Cargando personas...');
        
        // Mostrar preloader de tabla
        showTablePreloader();
        
        const data = await api.getPersons();
        
        if (data.success) {
            window.appState.persons = data.persons || [];
            
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
        
        // Mostrar estado de error mejorado
        showTableError(error.message);
        
    } finally {
        // Remover preloader
        removeTablePreloader();
    }
}

/**
 * 4.7 Mostrar preloader de tabla
 */
function showTablePreloader() {
    const tableContainer = document.querySelector('.tab-content[data-tab="personas"]');
    if (!tableContainer) return;
    
    // Remover preloader existente
    const existingPreloader = tableContainer.querySelector('.table-preloader-overlay');
    if (existingPreloader) {
        existingPreloader.remove();
    }
    
    // Crear preloader
    const tablePreloader = document.createElement('div');
    tablePreloader.className = 'table-preloader-overlay';
    tablePreloader.innerHTML = `
        <div class="preloader">
            <div class="preloader__spinner preloader--primary preloader--lg"></div>
            <p class="preloader__text">Cargando personas...</p>
            <p class="preloader-overlay__subtitle">Obteniendo información del servidor</p>
            <div class="preloader__dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    
    const tableElement = tableContainer.querySelector('table');
    if (tableElement) {
        tableElement.style.opacity = '0.3';
        tableElement.style.pointerEvents = 'none';
        tableElement.insertAdjacentElement('beforebegin', tablePreloader);
    }
    
    // Mostrar skeletons mientras carga
    if (DOM.personasTableBody && (!window.appState.persons || window.appState.persons.length === 0)) {
        DOM.personasTableBody.innerHTML = '';
        
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
}

/**
 * 4.8 Remover preloader de tabla
 */
function removeTablePreloader() {
    const preloader = document.querySelector('.table-preloader-overlay');
    if (preloader) {
        preloader.classList.add('fade-out');
        setTimeout(() => {
            preloader.remove();
            const tableElement = document.querySelector('.tab-content[data-tab="personas"] table');
            if (tableElement) {
                tableElement.style.opacity = '1';
                tableElement.style.pointerEvents = '';
            }
        }, 300);
    }
}

/**
 * 4.9 Mostrar error en tabla
 */
function showTableError(errorMessage) {
    if (!DOM.personasTableBody) return;
    
    DOM.personasTableBody.innerHTML = `
        <tr>
            <td colspan="5" class="empty-state error-state">
                <div class="error-state__icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3 class="empty-state__title">Error al cargar personas</h3>
                <p class="empty-state__description">${errorMessage || 'No se pudieron cargar las personas'}</p>
                <div class="empty-state__actions" style="margin-top: 1rem;">
                    <button class="btn btn--primary" onclick="loadPersons()">
                        <i class="fas fa-redo"></i> Reintentar
                    </button>
                    <button class="btn btn--outline" onclick="openPersonModal()">
                        <i class="fas fa-user-plus"></i> Agregar persona manualmente
                    </button>
                </div>
            </td>
        </tr>
    `;
}

/**
 * 4.10 Editar persona
 */
function editPerson(id) {
    console.log('✏️ Editando persona:', id);
    openPersonModal(id);
}

/**
 * 4.11 Eliminar persona (mejorado con preloaders)
 */
async function deletePerson(id) {
    const person = window.appState.persons.find(p => p._id === id);
    if (!person) {
        return;
    }
    
    // Mostrar modal de confirmación mejorado
    const confirmed = await showDeleteConfirmation(person.nombre);
    if (!confirmed) {
        return;
    }
    
    try {
        console.log('🗑️ Eliminando persona:', id);
        
        // Encontrar la fila en la tabla
        const tableRow = document.querySelector(`[data-person-id="${id}"]`) || 
                        document.querySelector(`button[onclick*="deletePerson('${id}')"]`)?.closest('tr');
        
        if (tableRow) {
            // Agregar estado de eliminación mejorado
            await showDeleteAnimation(tableRow);
        }
        
        const data = await api.deletePerson(id);
        
        if (data.success) {
            // Mostrar animación de éxito en la fila
            if (tableRow) {
                await showDeleteSuccessAnimation(tableRow);
            }
            
            // Eliminar del estado global
            window.appState.persons = window.appState.persons.filter(p => p._id !== id);
            
            // Actualizar tabla
            renderPersonsTable();
            
            // Actualizar filtro de puestos
            updatePuestosFilter();
            
            // Actualizar selects que usan personas
            populatePersonSelect();
            populateSearchPersonSelect();
            
            // Mostrar notificación flotante
            showFloatingNotification(`"${person.nombre}" ha sido eliminado`, 'success');
            
            // Actualizar dashboard si existe
            try {
                if (typeof window.loadDashboardData === 'function') {
                    await window.loadDashboardData();
                }
            } catch (dashboardError) {
                console.log('Dashboard no disponible:', dashboardError);
            }
        } else {
            throw new Error(data.message || 'Error desconocido al eliminar');
        }
        
    } catch (error) {
        console.error('❌ Error eliminando persona:', error);
        
        // Revertir cambios en la fila
        revertDeleteAnimation(error.message);
        
        // Mostrar notificación de error
        showFloatingNotification(error.message || 'Error al eliminar la persona', 'error');
    }
}

/**
 * 4.12 Mostrar animación de eliminación
 */
function showDeleteAnimation(tableRow) {
    return new Promise((resolve) => {
        if (!tableRow) {
            resolve();
            return;
        }
        
        // Agregar clases de animación
        tableRow.classList.add('table__row--deleting');
        
        // Crear overlay de eliminación mejorado
        const deleteOverlay = document.createElement('div');
        deleteOverlay.className = 'delete-overlay';
        deleteOverlay.innerHTML = `
            <div class="delete-overlay__content">
                <div class="preloader-inline preloader-inline--large">
                    <div class="preloader-inline__spinner preloader--error"></div>
                </div>
                <span class="delete-overlay__text">Eliminando persona...</span>
                <span class="delete-overlay__subtext">Por favor espera</span>
            </div>
        `;
        
        // Ocultar contenido original
        const cells = tableRow.querySelectorAll('td');
        cells.forEach(cell => {
            cell.style.opacity = '0.3';
        });
        
        tableRow.appendChild(deleteOverlay);
        
        // Aplicar efecto de pulso
        tableRow.style.animation = 'deletingPulse 1.5s infinite';
        
        setTimeout(resolve, 500);
    });
}

/**
 * 4.13 Mostrar animación de éxito en eliminación
 */
function showDeleteSuccessAnimation(tableRow) {
    return new Promise((resolve) => {
        if (!tableRow) {
            resolve();
            return;
        }
        
        tableRow.style.animation = '';
        tableRow.classList.remove('table__row--deleting');
        tableRow.classList.add('table__row--success');
        
        // Actualizar overlay a éxito
        const deleteOverlay = tableRow.querySelector('.delete-overlay');
        if (deleteOverlay) {
            deleteOverlay.innerHTML = `
                <div class="delete-overlay__content">
                    <div class="success-icon" style="color: #4CAF50; font-size: 2rem;">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <span class="delete-overlay__text" style="color: #4CAF50;">¡Eliminado!</span>
                    <span class="delete-overlay__subtext" style="color: #4CAF50;">Redirigiendo...</span>
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
            
            setTimeout(resolve, 500);
        }, 800);
    });
}

/**
 * 4.14 Revertir animación de eliminación en caso de error
 */
function revertDeleteAnimation(errorMessage) {
    const tableRow = document.querySelector('.table__row--deleting');
    if (tableRow) {
        tableRow.style.animation = '';
        tableRow.classList.remove('table__row--deleting');
        tableRow.classList.add('table__row--error');
        
        // Limpiar overlay de eliminación
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
        
        // Mostrar mensaje de error en la fila
        setTimeout(() => {
            tableRow.classList.remove('table__row--error');
        }, 3000);
    }
}

// =============================================================================
// 5. FUNCIONES AUXILIARES
// =============================================================================

/**
 * 5.1 Mostrar modal de confirmación de eliminación (mejorado)
 */
function showDeleteConfirmation(personName) {
    return new Promise((resolve) => {
        // Crear modal de confirmación mejorado
        const confirmModal = document.createElement('div');
        confirmModal.className = 'modal confirm-modal confirm-modal--delete';
        confirmModal.innerHTML = `
            <div class="modal__content" style="max-width: 500px;">
                <div class="modal__header">
                    <h3 class="modal__title">
                        <i class="fas fa-exclamation-triangle" style="color: #f44336; margin-right: 10px;"></i>
                        Confirmar Eliminación
                    </h3>
                    <button class="modal__close" id="closeConfirmBtn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal__body">
                    <div class="confirm-content">
                        <div class="confirm-icon">
                            <i class="fas fa-user-slash"></i>
                        </div>
                        <h4 class="confirm-title">¿Estás seguro de eliminar a "${personName}"?</h4>
                        <div class="confirm-warning">
                            <i class="fas fa-exclamation-circle"></i>
                            <div>
                                <strong>Esta acción no se puede deshacer</strong>
                                <p style="margin-top: 0.5rem; font-size: 0.9rem;">
                                    La persona será eliminada permanentemente del sistema y no podrá recuperarse.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal__footer" style="justify-content: flex-end; gap: 1rem;">
                    <button class="btn btn--outline" id="cancelDeleteBtn">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                    <button class="btn btn--danger" id="confirmDeleteBtn">
                        <i class="fas fa-trash"></i> Sí, eliminar permanentemente
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
        
        // Agregar event listeners
        setTimeout(() => {
            const cancelBtn = confirmModal.querySelector('#cancelDeleteBtn');
            const confirmBtn = confirmModal.querySelector('#confirmDeleteBtn');
            const closeBtn = confirmModal.querySelector('#closeConfirmBtn');
            
            const closeModal = (result) => {
                confirmModal.classList.remove('modal--visible');
                setTimeout(() => {
                    confirmModal.remove();
                    resolve(result);
                }, 300);
            };
            
            if (cancelBtn) cancelBtn.addEventListener('click', () => closeModal(false));
            if (confirmBtn) confirmBtn.addEventListener('click', () => closeModal(true));
            if (closeBtn) closeBtn.addEventListener('click', () => closeModal(false));
            
            // Cerrar al hacer clic fuera
            confirmModal.addEventListener('click', (e) => {
                if (e.target === confirmModal) closeModal(false);
            });
            
            // Cerrar con Escape
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    closeModal(false);
                    document.removeEventListener('keydown', handleEscape);
                }
            };
            document.addEventListener('keydown', handleEscape);
            
        }, 50);
    });
}

// =============================================================================
// 6. RENDERIZADO DE INTERFAZ
// =============================================================================

/**
 * 6.1 Renderizar tabla de personas
 */
function renderPersonsTable() {
    if (!DOM.personasTableBody) return;
    
    DOM.personasTableBody.innerHTML = '';
    
    if (!window.appState.persons || window.appState.persons.length === 0) {
        DOM.personasTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <div class="empty-state__icon">
                        <i class="fas fa-users"></i>
                    </div>
                    <h3 class="empty-state__title">No hay personas registradas</h3>
                    <p class="empty-state__description">Agrega la primera persona para comenzar</p>
                    <div class="empty-state__actions" style="margin-top: 1rem;">
                        <button class="btn btn--primary" onclick="openPersonModal()">
                            <i class="fas fa-user-plus"></i> Agregar primera persona
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
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
                    <button class="btn btn--sm btn--outline btn--icon" onclick="editPerson('${person._id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn--sm btn--danger btn--icon" onclick="deletePerson('${person._id}')" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        DOM.personasTableBody.appendChild(row);
    });
}

// =============================================================================
// 7. MANEJO DE SELECTS/FILTROS
// =============================================================================

/**
 * 7.1 Poblar select de personas para documentos
 */
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

/**
 * 7.2 Poblar select de búsqueda de personas
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
// 8. HANDLERS/CONTROLADORES
// =============================================================================

/**
 * 8.1 Handler para guardar persona
 */
function handleSavePerson() {
    console.log('💾 Guardando persona...');
    savePerson();
}

/**
 * 8.2 Función para refrescar el select de departamentos
 */
function refreshDepartmentSelect() {
    loadDepartmentsForModal();
}

// Inicializar filtros cuando se cargue el módulo
document.addEventListener('DOMContentLoaded', function() {
    // Esperar un momento para asegurar que el DOM esté completamente cargado
    setTimeout(() => {
        initializeFilters();
    }, 100);
});

// Exponer funciones globalmente para los onclick
window.openPersonModal = openPersonModal;
window.editPerson = editPerson;
window.deletePerson = deletePerson;
window.savePerson = savePerson;
window.clearFilters = clearFilters;
window.loadPersons = loadPersons;

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
    validateForm,
    initializeFilters,
    applyFilters,
    clearFilters,
    showFloatingNotification
};