/**
 * Sistema de Validación de Seguridad
 * Validaciones para usuario y contraseña con mensajes dinámicos
 */

// Contraseñas comunes prohibidas
const COMMON_PASSWORDS = [
    '123456',
    'password',
    'qwerty',
    '123456789',
    'abc123',
    'letmein',
    'welcome',
    'monkey',
    'dragon',
    'master'
];

/**
 * Valida el nombre de usuario
 * @param {string} username - El nombre de usuario a validar
 * @returns {object} - { isValid: boolean, errors: array }
 */
function validateUsername(username) {
    const errors = [];

    if (!username || username.trim() === '') {
        errors.push('El usuario no puede estar vacío');
        return { isValid: false, errors };
    }

    if (username.length < 4) {
        errors.push('El usuario debe tener al menos 4 caracteres');
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        errors.push('Solo se permiten letras, números, guiones y guiones bajos');
    }

    // Rechazar nombres muy simples
    if (/^[a-z]+$/i.test(username) && username.length === 1) {
        errors.push('El usuario es demasiado simple');
    }

    if (/^\d+$/.test(username)) {
        errors.push('El usuario no puede ser solo números');
    }

    if (/^(user|admin|test|demo)$/i.test(username)) {
        errors.push('El usuario es demasiado genérico');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Valida la contraseña
 * @param {string} password - La contraseña a validar
 * @returns {object} - { isValid: boolean, errors: array, strength: string }
 */
function validatePassword(password) {
    const errors = [];
    let strengthScore = 0;

    if (!password || password.trim() === '') {
        errors.push('La contraseña no puede estar vacía');
        return {
            isValid: false,
            errors,
            strength: 'debil'
        };
    }

    // Validaciones por orden de importancia
    // Longitud mínima
    if (password.length < 8) {
        errors.push('Mín. 8 caracteres');
    } else {
        strengthScore += 1;
    }

    // Caracteres complejos (mayúscula, minúscula, número, especial)
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};:'"\\|,.<>\/?]/.test(password);

    const complexity = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
    
    if (complexity < 3) {
        errors.push('Requiere: mayúscula, minúscula, número y carácter especial');
    }
    
    strengthScore += complexity;

    // Contraseñas comunes
    if (COMMON_PASSWORDS.some(commonPass => password.toLowerCase().includes(commonPass))) {
        errors.push('Contraseña muy común o débil');
    }

    // Determinar fortaleza
    let strength = 'debil';
    if (strengthScore >= 4 && errors.length === 0) {
        strength = 'fuerte';
    } else if (strengthScore >= 3) {
        strength = 'media';
    }

    return {
        isValid: errors.length === 0,
        errors,
        strength
    };
}

/**
 * Obtiene el color para el indicador de fortaleza
 * @param {string} strength - El nivel de fortaleza (debil, media, fuerte)
 * @returns {string} - El color correspondiente
 */
function getStrengthColor(strength) {
    const colors = {
        debil: '#dc3545',      // Rojo
        media: '#ffc107',      // Amarillo
        fuerte: '#28a745'      // Verde
    };
    return colors[strength] || '#dc3545';
}

/**
 * Obtiene el texto descriptivo de fortaleza
 * @param {string} strength - El nivel de fortaleza
 * @returns {string} - Texto descriptivo
 */
function getStrengthText(strength) {
    const texts = {
        debil: 'Débil',
        media: 'Media',
        fuerte: 'Fuerte'
    };
    return texts[strength] || 'Débil';
}

/**
 * Muestra los errores en el DOM
 * @param {HTMLElement} inputElement - El elemento input
 * @param {array} errors - Array de errores
 * @param {string} fieldType - Tipo de campo ('username' o 'password')
 */
function displayErrors(inputElement, errors, fieldType) {
    // Limpiar todos los contenedores de error anteriores (pueden haber múltiples)
    let sibling = inputElement.nextElementSibling;
    while (sibling && (sibling.classList.contains('error-container') || sibling.classList.contains('strength-indicator'))) {
        const nextSibling = sibling.nextElementSibling;
        sibling.remove();
        sibling = nextSibling;
    }

    // Crear contenedor de errores (máximo 2 errores para evitar desorden)
    if (errors.length > 0) {
        const errorContainer = document.createElement('div');
        errorContainer.className = 'error-container';

        // Solo mostrar máximo 2 errores
        const displayErrors = errors.slice(0, 2);
        displayErrors.forEach(error => {
            const errorMsg = document.createElement('div');
            errorMsg.className = 'error-message';
            errorMsg.textContent = '✗ ' + error;
            errorContainer.appendChild(errorMsg);
        });

        // Insertar después del input
        inputElement.parentNode.insertBefore(errorContainer, inputElement.nextSibling);
        inputElement.classList.add('input-error');
        inputElement.classList.remove('input-valid');
    } else {
        inputElement.classList.remove('input-error');
        inputElement.classList.add('input-valid');
    }
}

/**
 * Muestra el indicador de fortaleza de contraseña
 * @param {HTMLElement} passwordInput - El elemento input de contraseña
 * @param {string} strength - El nivel de fortaleza
 */
function displayPasswordStrength(passwordInput, strength) {
    // Eliminar indicador anterior si existe (buscar en hermanos cercanos, no en todo el DOM)
    let sibling = passwordInput.nextElementSibling;
    while (sibling && (sibling.classList.contains('error-container') || sibling.classList.contains('strength-indicator'))) {
        if (sibling.classList.contains('strength-indicator')) {
            sibling.remove();
            break;
        }
        sibling = sibling.nextElementSibling;
    }

    // Crear indicador de fortaleza
    const strengthIndicator = document.createElement('div');
    strengthIndicator.className = 'strength-indicator';

    const strengthBar = document.createElement('div');
    strengthBar.className = 'strength-bar';
    strengthBar.style.backgroundColor = getStrengthColor(strength);

    const strengthText = document.createElement('span');
    strengthText.className = 'strength-text';
    strengthText.textContent = 'Fortaleza: ' + getStrengthText(strength);
    strengthText.style.color = getStrengthColor(strength);

    strengthIndicator.appendChild(strengthBar);
    strengthIndicator.appendChild(strengthText);

    // Calcular ancho de la barra según la fortaleza
    const widthMap = {
        debil: '33%',
        media: '66%',
        fuerte: '100%'
    };
    strengthBar.style.width = widthMap[strength] || '33%';

    // Insertar después del input (o después del error container si existe)
    let insertAfter = passwordInput;
    let next = passwordInput.nextElementSibling;
    while (next && next.classList.contains('error-container')) {
        insertAfter = next;
        next = next.nextElementSibling;
    }
    insertAfter.parentNode.insertBefore(strengthIndicator, insertAfter.nextSibling);
}

/**
 * Inicializa la validación en tiempo real para un formulario
 * @param {string} formSelector - Selector CSS del formulario
 * @param {object} options - Opciones de configuración
 */
function initSecurityValidation(formSelector, options = {}) {
    const form = document.querySelector(formSelector);
    if (!form) {
        console.error('Formulario no encontrado:', formSelector);
        return;
    }

    const userInput = form.querySelector('[data-validate="username"]');
    const passwordInput = form.querySelector('[data-validate="password"]');
    const submitBtn = form.querySelector('button[type="submit"]');

    // Validación del usuario en tiempo real
    if (userInput) {
        userInput.addEventListener('input', function() {
            const validation = validateUsername(this.value);
            displayErrors(this, validation.errors, 'username');
            updateSubmitButton(form, submitBtn);
        });
    }

    // Validación de la contraseña en tiempo real
    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
            const validation = validatePassword(this.value);
            displayErrors(this, validation.errors, 'password');
            displayPasswordStrength(this, validation.strength);
            updateSubmitButton(form, submitBtn);
        });
    }

    // Prevenir envío si hay errores
    form.addEventListener('submit', function(e) {
        const usernameValidation = userInput ? validateUsername(userInput.value) : { isValid: true };
        const passwordValidation = passwordInput ? validatePassword(passwordInput.value) : { isValid: true };

        if (!usernameValidation.isValid || !passwordValidation.isValid) {
            e.preventDefault();

            if (!usernameValidation.isValid && userInput) {
                displayErrors(userInput, usernameValidation.errors, 'username');
                userInput.focus();
            }

            if (!passwordValidation.isValid && passwordInput) {
                displayErrors(passwordInput, passwordValidation.errors, 'password');
                if (!userInput || usernameValidation.isValid) {
                    passwordInput.focus();
                }
            }

            if (options.onValidationFail) {
                options.onValidationFail();
            }
        } else {
            if (options.onValidationSuccess) {
                options.onValidationSuccess();
            }
        }
    });
}

/**
 * Actualiza el estado del botón de envío
 * @param {HTMLElement} form - El formulario
 * @param {HTMLElement} submitBtn - El botón de envío
 */
function updateSubmitButton(form, submitBtn) {
    if (!submitBtn) return;

    const userInput = form.querySelector('[data-validate="username"]');
    const passwordInput = form.querySelector('[data-validate="password"]');

    const usernameValid = !userInput || (userInput.value && validateUsername(userInput.value).isValid);
    const passwordValid = !passwordInput || (passwordInput.value && validatePassword(passwordInput.value).isValid);

    if (usernameValid && passwordValid && userInput && passwordInput) {
        submitBtn.disabled = false;
        submitBtn.classList.add('btn-enabled');
    } else {
        submitBtn.disabled = true;
        submitBtn.classList.remove('btn-enabled');
    }
}

// Exportar como módulo ES6 (para import/export)
export {
    validateUsername,
    validatePassword,
    getStrengthColor,
    getStrengthText,
    displayErrors,
    displayPasswordStrength,
    initSecurityValidation,
    COMMON_PASSWORDS
};

// Compatibilidad con CommonJS si se carga como script
if (typeof window !== 'undefined') {
    window.validateUsername = validateUsername;
    window.validatePassword = validatePassword;
    window.getStrengthColor = getStrengthColor;
    window.getStrengthText = getStrengthText;
    window.displayErrors = displayErrors;
    window.displayPasswordStrength = displayPasswordStrength;
    window.initSecurityValidation = initSecurityValidation;
}
