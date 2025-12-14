import { DOM } from '../dom.js';
import { api } from '../services/api.js';
import { setLoadingState, showAlert, isValidEmail } from '../utils.js';

// =============================================================================
// 1. MANEJO DEL MODAL DE PERSONAS
// =============================================================================

/**
 * 1.1 Abrir modal para crear/editar persona
 */
async function openPersonModal(personId = null) {
    console.log(`👤 Abriendo modal de persona: ${personId || 'Nueva'}`);
    
    try {
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
        
        DOM.personModal.style.display = 'flex';
        
        // Agregar validación en tiempo real
        addRealTimeValidation();
        
    } catch (error) {
        console.error('❌ Error abriendo modal de persona:', error);
        showAlert('Error al cargar departamentos', 'error');
    }
}

/**
 * 1.2 Cargar departamentos para el modal
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
 * 1.3 Poblar el select de departamentos
 */
function populateDepartmentSelect(departments) {
    const departmentSelect = document.getElementById('personDepartment');
    if (!departmentSelect) return;
    
    // Guardar el valor actual
    const currentValue = departmentSelect.value;
    
    // Limpiar y crear opciones
    departmentSelect.innerHTML = `
        <option value="">Seleccionar departamento</option>
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
    departmentSelect.addEventListener('change', handleDepartmentSelection);
}

/**
 * 1.4 Manejar selección de departamento
 */
function handleDepartmentSelection(e) {
    if (e.target.value === "Nuevo Departamento") {
        // Abrir modal para crear nuevo departamento
        e.target.value = ""; // Resetear
        
        // Cerrar modal actual
        closePersonModal();
        
        // Abrir modal de departamentos después de un breve delay
        setTimeout(() => {
            if (window.openDepartmentModal) {
                window.openDepartmentModal();
                
                // Después de crear el departamento, se recargará automáticamente
                // a través del evento en el modal de departamentos
            }
        }, 300);
    }
}

/**
 * 1.5 Cerrar modal de personas
 */
function closePersonModal() {
    console.log('❌ Cerrando modal de persona');
    DOM.personModal.style.display = 'none';
    
    // Remover event listener temporal
    const departmentSelect = document.getElementById('personDepartment');
    if (departmentSelect) {
        departmentSelect.removeEventListener('change', handleDepartmentSelection);
    }
    
    // Remover validación en tiempo real
    removeRealTimeValidation();
}

// =============================================================================
// 2. VALIDACIONES
// =============================================================================

/**
 * 2.1 Validar email
 * Requisitos: 
 * - Debe contener exactamente un @
 * - Formato de email válido
 * - Dominio válido
 */
function validateEmail(email) {
    if (!email || email.trim() === '') {
        return { isValid: false, message: 'El email es obligatorio' };
    }
    
    const emailValue = email.trim();
    
    // Validar que tenga exactamente un @
    const atCount = (emailValue.match(/@/g) || []).length;
    if (atCount === 0) {
        return { isValid: false, message: 'El email debe contener un símbolo @' };
    }
    if (atCount > 1) {
        return { isValid: false, message: 'El email solo puede contener un símbolo @' };
    }
    
    // Validar formato básico de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue)) {
        return { isValid: false, message: 'Formato de email inválido (ejemplo: usuario@dominio.com)' };
    }
    
    // Validar que no empiece o termine con punto o guión
    if (emailValue.startsWith('.') || emailValue.endsWith('.') || 
        emailValue.startsWith('-') || emailValue.endsWith('-') ||
        emailValue.startsWith('@') || emailValue.endsWith('@')) {
        return { isValid: false, message: 'Formato de email inválido' };
    }
    
    // Validar dominio
    const parts = emailValue.split('@');
    const domain = parts[1];
    
    if (domain.length < 4) {
        return { isValid: false, message: 'Dominio de email muy corto' };
    }
    
    // Validar que el dominio tenga al menos un punto
    if (!domain.includes('.')) {
        return { isValid: false, message: 'Dominio de email inválido' };
    }
    
    // Validar extensión del dominio
    const domainParts = domain.split('.');
    const tld = domainParts[domainParts.length - 1];
    if (tld.length < 2) {
        return { isValid: false, message: 'Extensión del dominio inválida' };
    }
    
    return { isValid: true, message: 'Email válido' };
}

/**
 * 2.2 Validar teléfono
 * Requisitos:
 * - Máximo 10 caracteres
 * - Solo números (opcionalmente puede contener +, espacios o guiones)
 * - Longitud mínima 8 caracteres
 */
function validatePhone(phone) {
    // Si el teléfono está vacío, es opcional
    if (!phone || phone.trim() === '') {
        return { isValid: true, message: 'Teléfono (opcional)' };
    }
    
    const phoneValue = phone.trim();
    
    // Eliminar caracteres especiales para validar solo números
    const cleanPhone = phoneValue.replace(/[+\s\-()]/g, '');
    
    // Validar que solo contenga números
    if (!/^\d+$/.test(cleanPhone)) {
        return { isValid: false, message: 'El teléfono solo puede contener números' };
    }
    
    // Validar longitud máxima
    if (cleanPhone.length > 10) {
        return { isValid: false, message: 'El teléfono no puede exceder los 10 dígitos' };
    }
    
    // Validar longitud mínima
    if (cleanPhone.length < 8) {
        return { isValid: false, message: 'El teléfono debe tener al menos 8 dígitos' };
    }
    
    // Validar formato del número (no puede empezar con 0 en algunos países, ajusta según necesidad)
    if (cleanPhone.startsWith('0')) {
        return { isValid: false, message: 'El teléfono no puede comenzar con 0' };
    }
    
    return { isValid: true, message: 'Teléfono válido' };
}

/**
 * 2.3 Validar nombre
 * Requisitos:
 * - No vacío
 * - Mínimo 2 caracteres
 * - Máximo 100 caracteres
 * - Solo letras, espacios y algunos caracteres especiales
 */
function validateName(name) {
    if (!name || name.trim() === '') {
        return { isValid: false, message: 'El nombre es obligatorio' };
    }
    
    const nameValue = name.trim();
    
    // Validar longitud mínima
    if (nameValue.length < 2) {
        return { isValid: false, message: 'El nombre debe tener al menos 2 caracteres' };
    }
    
    // Validar longitud máxima
    if (nameValue.length > 100) {
        return { isValid: false, message: 'El nombre no puede exceder los 100 caracteres' };
    }
    
    // Validar caracteres permitidos (letras, espacios, acentos, ñ, puntos, comas, guiones)
    const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s\-\.,']+$/;
    if (!nameRegex.test(nameValue)) {
        return { isValid: false, message: 'El nombre contiene caracteres inválidos' };
    }
    
    // Validar que no contenga solo espacios
    if (!nameValue.replace(/\s/g, '').length) {
        return { isValid: false, message: 'El nombre no puede contener solo espacios' };
    }
    
    return { isValid: true, message: 'Nombre válido' };
}

/**
 * 2.4 Validar puesto (opcional)
 */
function validatePosition(position) {
    if (!position || position.trim() === '') {
        return { isValid: true, message: 'Puesto (opcional)' };
    }
    
    const positionValue = position.trim();
    
    // Validar longitud máxima
    if (positionValue.length > 100) {
        return { isValid: false, message: 'El puesto no puede exceder los 100 caracteres' };
    }
    
    return { isValid: true, message: 'Puesto válido' };
}

/**
 * 2.5 Agregar validación en tiempo real
 */
function addRealTimeValidation() {
    // Remover listeners anteriores si existen
    removeRealTimeValidation();
    
    // Validar nombre
    DOM.personName.addEventListener('input', function() {
        const validation = validateName(this.value);
        updateFieldValidation(this, validation);
    });
    
    // Validar email
    DOM.personEmail.addEventListener('input', function() {
        const validation = validateEmail(this.value);
        updateFieldValidation(this, validation);
    });
    
    // Validar teléfono
    DOM.personPhone.addEventListener('input', function() {
        const validation = validatePhone(this.value);
        updateFieldValidation(this, validation);
    });
    
    // Validar puesto
    DOM.personPosition.addEventListener('input', function() {
        const validation = validatePosition(this.value);
        updateFieldValidation(this, validation);
    });
    
    // Validar departamento
    const departmentSelect = document.getElementById('personDepartment');
    if (departmentSelect) {
        departmentSelect.addEventListener('change', function() {
            const validation = validateDepartment(this.value);
            updateFieldValidation(this, validation);
        });
    }
}

/**
 * 2.6 Remover validación en tiempo real
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
 * 2.7 Actualizar estado de validación del campo
 */
function updateFieldValidation(field, validation) {
    // Remover clases anteriores
    field.classList.remove('field--valid', 'field--invalid');
    
    // Remover mensaje anterior si existe
    const existingMessage = field.parentNode.querySelector('.validation-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    if (field.value.trim() === '') {
        return; // No mostrar validación para campos vacíos (excepto si son requeridos)
    }
    
    if (validation.isValid) {
        field.classList.add('field--valid');
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
 * 2.8 Validar departamento
 */
function validateDepartment(department) {
    if (!department || department.trim() === '') {
        return { isValid: false, message: 'El departamento es obligatorio' };
    }
    
    if (department === "Nuevo Departamento") {
        return { isValid: false, message: 'Selecciona un departamento válido o crea uno nuevo' };
    }
    
    return { isValid: true, message: 'Departamento válido' };
}

/**
 * 2.9 Validar formulario completo
 */
function validateForm() {
    let isValid = true;
    const errors = [];
    
    // Validar nombre
    const nameValidation = validateName(DOM.personName.value);
    if (!nameValidation.isValid) {
        isValid = false;
        errors.push(nameValidation.message);
        DOM.personName.classList.add('field--invalid');
    }
    
    // Validar email
    const emailValidation = validateEmail(DOM.personEmail.value);
    if (!emailValidation.isValid) {
        isValid = false;
        errors.push(emailValidation.message);
        DOM.personEmail.classList.add('field--invalid');
    }
    
    // Validar teléfono
    const phoneValidation = validatePhone(DOM.personPhone.value);
    if (!phoneValidation.isValid) {
        isValid = false;
        errors.push(phoneValidation.message);
        DOM.personPhone.classList.add('field--invalid');
    }
    
    // Validar departamento
    const departmentSelect = document.getElementById('personDepartment');
    const departmentValue = departmentSelect ? departmentSelect.value : '';
    const departmentValidation = validateDepartment(departmentValue);
    if (!departmentValidation.isValid) {
        isValid = false;
        errors.push(departmentValidation.message);
        if (departmentSelect) departmentSelect.classList.add('field--invalid');
    }
    
    // Validar puesto (opcional, solo si hay valor)
    if (DOM.personPosition.value.trim() !== '') {
        const positionValidation = validatePosition(DOM.personPosition.value);
        if (!positionValidation.isValid) {
            isValid = false;
            errors.push(positionValidation.message);
            DOM.personPosition.classList.add('field--invalid');
        }
    }
    
    return { isValid, errors };
}

// =============================================================================
// 3. OPERACIONES CRUD DE PERSONAS CON PRELOADER MEJORADO
// =============================================================================

async function savePerson() {
    // Validar formulario antes de enviar
    const formValidation = validateForm();
    if (!formValidation.isValid) {
        showAlert(`Por favor corrige los siguientes errores:\n• ${formValidation.errors.join('\n• ')}`, 'error');
        return;
    }
    
    // Obtener el select de departamento
    const departmentSelect = document.getElementById('personDepartment');
    const selectedDepartment = departmentSelect ? departmentSelect.value : '';
    
    try {
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
            
            // Mostrar notificación de éxito
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
        showAlert('Error al guardar persona: ' + error.message, 'error');
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
                        <div class="skeleton-loader skeleton-text skeleton-text--small" style="width: 50%"></div>
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
            renderPersonsTable();
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
        
        // Mostrar estado de error mejorado
        if (DOM.personasTableBody) {
            DOM.personasTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state error-state">
                        <div class="error-state__icon">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <h3 class="empty-state__title">Error al cargar personas</h3>
                        <p class="empty-state__description">${error.message || 'No se pudieron cargar las personas'}</p>
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
        
        showAlert('Error al cargar personas: ' + error.message, 'error');
    }
}

function editPerson(id) {
    console.log('✏️ Editando persona:', id);
    openPersonModal(id);
}

async function deletePerson(id) {
    const person = window.appState.persons.find(p => p._id === id);
    if (!person) return;
    
    // Mostrar modal de confirmación mejorado
    const confirmed = await showDeleteConfirmation(person.nombre);
    if (!confirmed) return;
    
    try {
        console.log('🗑️ Eliminando persona:', id);
        
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
                    <span class="delete-overlay__text">Eliminando persona...</span>
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
                            <span class="delete-overlay__text" style="color: #4CAF50;">¡Eliminado!</span>
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
                        await loadPersons();
                        
                        // Mostrar notificación flotante de éxito
                        showFloatingNotification('Persona eliminada exitosamente', 'success');
                        
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
                showAlert(data.message, 'success');
                
                try {
                    if (typeof window.loadDashboardData === 'function') {
                        await window.loadDashboardData();
                    }
                } catch (dashboardError) {
                    console.log('Dashboard no disponible:', dashboardError);
                }
            }
        } else {
            throw new Error(data.message);
        }
        
    } catch (error) {
        console.error('❌ Error eliminando persona:', error);
        
        // Revertir cambios en la fila
        const tableRow = document.querySelector(`button[onclick*="deletePerson('${id}')"]`)?.closest('tr');
        if (tableRow) {
            tableRow.style.animation = '';
            tableRow.classList.remove('table__row--deleting');
            tableRow.classList.add('table__row--error');
            
            // Actualizar overlay a error
            const deleteOverlay = tableRow.querySelector('.delete-overlay');
            if (deleteOverlay) {
                const retryBtn = document.createElement('button');
                retryBtn.className = 'btn btn--sm btn--outline';
                retryBtn.textContent = 'Reintentar';
                retryBtn.addEventListener('click', () => {
                    deleteOverlay.remove();
                    tableRow.classList.remove('table__row--error');
                    tableRow.querySelectorAll('td').forEach(cell => {
                        cell.style.opacity = '1';
                    });
                    deletePerson(id); // Reintentar la eliminación
                });
                
                deleteOverlay.innerHTML = `
                    <div class="delete-overlay__content">
                        <div class="error-icon" style="color: #f44336; font-size: 1.5rem;">
                            <i class="fas fa-exclamation-circle"></i>
                        </div>
                        <span class="delete-overlay__text" style="color: #f44336;">Error al eliminar</span>
                    </div>
                `;
                deleteOverlay.querySelector('.delete-overlay__content').appendChild(retryBtn);
            }
            
            // Restaurar altura
            tableRow.style.height = '';
        }
        
        // Mostrar notificación de error
        showAlert('Error al eliminar persona: ' + error.message, 'error');
    }
}

// =============================================================================
// 4. FUNCIONES AUXILIARES
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
// 5. RENDERIZADO DE INTERFAZ
// =============================================================================

function renderPersonsTable() {
    if (!DOM.personasTableBody) return;
    
    DOM.personasTableBody.innerHTML = '';
    
    if (window.appState.persons.length === 0) {
        DOM.personasTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
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
                ` : '-'}
            </td>
            <td class="table__cell">
                ${person.departamento ? `
                    <span class="department-badge">${person.departamento}</span>
                ` : '-'}
            </td>
            <td class="table__cell">
                <span class="status-badge status-badge--active">
                    <i class="fas fa-circle" style="font-size: 0.5em; margin-right: 6px;"></i>
                    Activo
                </span>
            </td>
            <td class="table__cell">
                <div class="table-actions">
                    <button class="btn btn--sm btn--outline btn--icon" onclick="editPerson('${person._id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn--sm btn--danger btn--icon" onclick="deletePerson('${person._id}')" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="btn btn--sm btn--primary btn--icon" title="Ver detalles">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </td>
        `;
        
        DOM.personasTableBody.appendChild(row);
    });
}

// =============================================================================
// 6. MANEJO DE SELECTS/FILTROS
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
// 7. HANDLERS/CONTROLADORES
// =============================================================================

function handleSavePerson() {
    console.log('💾 Guardando persona...');
    savePerson();
}

// Función para refrescar el select de departamentos
function refreshDepartmentSelect() {
    loadDepartmentsForModal();
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
    handleSavePerson,
    refreshDepartmentSelect,
    validateEmail,
    validatePhone,
    validateName,
    validateForm
};