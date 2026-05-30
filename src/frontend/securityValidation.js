/**
 * Sistema de Validación de Seguridad
 * src/frontend/securityValidation.js
 * Validaciones para usuario, contraseña y correo con mensajes dinámicos
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
    'master',
    '111111',
    '123123',
    'admin123',
    'pass123',
    'iloveyou',
    'sunshine',
    'princess',
    'football',
    'shadow',
    'superman'
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
 * Valida el correo electrónico
 * @param {string} email - El correo a validar
 * @returns {object} - { isValid: boolean, errors: array }
 */
function validateEmail(email) {
    const errors = [];

    if (!email || email.trim() === '') {
        errors.push('El correo no puede estar vacío');
        return { isValid: false, errors };
    }

    if (!email.includes('@')) {
        errors.push('El correo debe contener @');
        return { isValid: false, errors };
    }

    const parts = email.split('@');

    if (parts.length !== 2) {
        errors.push('El correo contiene caracteres inválidos');
        return { isValid: false, errors };
    }

    const [localPart, domainPart] = parts;

    if (!localPart || localPart.length === 0) {
        errors.push('Falta el nombre de usuario antes del @');
        return { isValid: false, errors };
    }

    if (!domainPart || domainPart.length === 0) {
        errors.push('Falta el dominio después del @');
        return { isValid: false, errors };
    }

    if (!domainPart.includes('.')) {
        errors.push('El dominio del correo debe incluir un punto (ej: .com, .mx)');
        return { isValid: false, errors };
    }

    const domainParts = domainPart.split('.');
    const tld = domainParts[domainParts.length - 1];

    if (!tld || tld.length < 2) {
        errors.push('La extensión del correo no es válida (ej: .com, .mx, .org)');
        return { isValid: false, errors };
    }

    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email.trim())) {
        errors.push('El formato del correo no es válido');
        return { isValid: false, errors };
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

    if (password.length < 8) {
        errors.push('Mín. 8 caracteres');
    } else {
        strengthScore += 1;
        if (password.length >= 12) strengthScore += 1;
    }

    const hasUpper   = /[A-Z]/.test(password);
    const hasLower   = /[a-z]/.test(password);
    const hasNumber  = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};:'"\\|,.<>\/?]/.test(password);

    const complexity = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;

    if (complexity < 3) {
        const missing = [];
        if (!hasUpper)   missing.push('mayúscula');
        if (!hasLower)   missing.push('minúscula');
        if (!hasNumber)  missing.push('número');
        if (!hasSpecial) missing.push('carácter especial (!@#$...)');
        errors.push(`Debe incluir: ${missing.join(', ')}`);
    }

    strengthScore += complexity;

    if (COMMON_PASSWORDS.some(commonPass => password.toLowerCase().includes(commonPass))) {
        errors.push('Contraseña muy común o débil');
        strengthScore = Math.max(0, strengthScore - 2);
    }

    let strength = 'debil';
    if (strengthScore >= 5 && errors.length === 0) {
        strength = 'fuerte';
    } else if (strengthScore >= 3 && errors.length === 0) {
        strength = 'media';
    } else if (strengthScore >= 3 && errors.length > 0) {
        strength = 'media';
    }

    return {
        isValid: errors.length === 0,
        errors,
        strength
    };
}

/**
 * Valida que dos contraseñas coincidan
 * @param {string} password        - La contraseña original
 * @param {string} confirmPassword - La contraseña a confirmar
 * @returns {object} - { isValid: boolean, errors: array }
 */
function validateConfirmPassword(password, confirmPassword) {
    const errors = [];

    if (!confirmPassword || confirmPassword.trim() === '') {
        errors.push('Confirma tu contraseña');
        return { isValid: false, errors };
    }

    if (password !== confirmPassword) {
        errors.push('Las contraseñas no coinciden');
        return { isValid: false, errors };
    }

    return { isValid: true, errors: [] };
}

/**
 * Obtiene el color para el indicador de fortaleza
 * @param {string} strength
 * @returns {string}
 */
function getStrengthColor(strength) {
    const colors = {
        debil:  '#dc3545',
        media:  '#ffc107',
        fuerte: '#28a745'
    };
    return colors[strength] || '#dc3545';
}

/**
 * Obtiene el texto descriptivo de fortaleza
 * @param {string} strength
 * @returns {string}
 */
function getStrengthText(strength) {
    const texts = {
        debil:  'Débil',
        media:  'Media',
        fuerte: 'Fuerte'
    };
    return texts[strength] || 'Débil';
}

/**
 * Obtiene el ícono para el indicador de fortaleza
 * @param {string} strength
 * @returns {string}
 */
function getStrengthIcon(strength) {
    const icons = {
        debil:  '✗',
        media:  '⚠',
        fuerte: '✓'
    };
    return icons[strength] || '✗';
}

/**
 * Muestra los errores en el DOM.
 * Inserta el .error-container DESPUÉS del .password-wrapper o .input-group
 * que contiene al input, para que los íconos internos no se desplacen.
 *
 * @param {HTMLElement} inputElement - El elemento input
 * @param {array}       errors       - Array de errores
 * @param {string}      fieldType    - Tipo de campo
 */
function displayErrors(inputElement, errors, fieldType) {
    // Buscar el contenedor padre más cercano relevante.
    // .password-wrapper tiene prioridad; si no existe, se usa .input-group.
    const parentWrapper =
        inputElement.closest('.password-wrapper') ||
        inputElement.closest('.input-group');

    // El elemento desde el que se anclan los hermanos de error
    const refEl = parentWrapper || inputElement;

    // Limpiar error-containers y strength-indicators hermanos anteriores
    let sibling = refEl.nextElementSibling;
    while (
        sibling &&
        (sibling.classList.contains('error-container') ||
         sibling.classList.contains('strength-indicator'))
    ) {
        const next = sibling.nextElementSibling;
        sibling.remove();
        sibling = next;
    }

    if (errors.length > 0) {
        const errorContainer = document.createElement('div');
        errorContainer.className = 'error-container';

        // Máximo 2 errores para no saturar la UI
        errors.slice(0, 2).forEach(error => {
            const errorMsg = document.createElement('div');
            errorMsg.className = 'error-message';
            errorMsg.textContent = '✗ ' + error;
            errorContainer.appendChild(errorMsg);
        });

        // Insertar como hermano siguiente de refEl
        refEl.parentNode.insertBefore(errorContainer, refEl.nextSibling);

        inputElement.classList.add('input-error');
        inputElement.classList.remove('input-valid');
    } else {
        inputElement.classList.remove('input-error');
        inputElement.classList.add('input-valid');
    }
}

/**
 * Muestra el indicador de fortaleza de contraseña.
 * Se ancla al .password-wrapper o .input-group igual que displayErrors,
 * para que los íconos internos no se muevan.
 *
 * @param {HTMLElement} passwordInput - El elemento input de contraseña
 * @param {string}      strength      - El nivel de fortaleza
 */
function displayPasswordStrength(passwordInput, strength) {
    // Buscar el contenedor padre relevante usando passwordInput (no inputElement)
    const parentWrapper =
        passwordInput.closest('.password-wrapper') ||
        passwordInput.closest('.input-group');

    const refEl = parentWrapper || passwordInput;

    // Eliminar indicador anterior entre los hermanos de refEl
    let sibling = refEl.nextElementSibling;
    while (sibling) {
        if (sibling.classList.contains('strength-indicator')) {
            sibling.remove();
            break;
        }
        // Saltamos error-containers pero nos detenemos en cualquier otra cosa
        if (!sibling.classList.contains('error-container')) break;
        sibling = sibling.nextElementSibling;
    }

    // No mostrar si el campo está vacío
    if (!passwordInput.value) return;

    const color = getStrengthColor(strength);
    const text  = getStrengthText(strength);
    const icon  = getStrengthIcon(strength);

    const widthMap = {
        debil:  '33%',
        media:  '66%',
        fuerte: '100%'
    };

    const strengthIndicator = document.createElement('div');
    strengthIndicator.className = 'strength-indicator';
    strengthIndicator.innerHTML = `
        <div class="strength-bar-track">
            <div class="strength-bar" style="width:${widthMap[strength] || '33%'};background-color:${color};"></div>
        </div>
        <span class="strength-text" style="color:${color};">${icon} Fortaleza: ${text}</span>
    `;

    // Insertar DESPUÉS de cualquier error-container existente
    let insertAfter = refEl;
    let next = refEl.nextElementSibling;
    while (next && next.classList.contains('error-container')) {
        insertAfter = next;
        next = next.nextElementSibling;
    }
    insertAfter.parentNode.insertBefore(strengthIndicator, insertAfter.nextSibling);
}

/**
 * Inicializa la validación en tiempo real para un formulario
 * @param {string} formSelector - Selector CSS del formulario
 * @param {object} options      - Opciones de configuración
 */
function initSecurityValidation(formSelector, options = {}) {
    const form = document.querySelector(formSelector);
    if (!form) {
        console.error('Formulario no encontrado:', formSelector);
        return;
    }

    const userInput            = form.querySelector('[data-validate="username"]');
    const emailInput           = form.querySelector('[data-validate="email"]');
    const passwordInput        = form.querySelector('[data-validate="password"]');
    const confirmPasswordInput = form.querySelector('[data-validate="confirm-password"]');
    const submitBtn            = form.querySelector('button[type="submit"]');

    if (userInput) {
        userInput.addEventListener('input', function () {
            const validation = validateUsername(this.value);
            displayErrors(this, validation.errors, 'username');
            updateSubmitButton(form, submitBtn);
        });
        userInput.addEventListener('blur', function () {
            if (this.value) {
                const validation = validateUsername(this.value);
                displayErrors(this, validation.errors, 'username');
            }
        });
    }

    if (emailInput) {
        emailInput.addEventListener('input', function () {
            if (this.value.length > 3) {
                const validation = validateEmail(this.value);
                displayErrors(this, validation.errors, 'email');
                updateSubmitButton(form, submitBtn);
            } else {
                displayErrors(this, [], 'email');
            }
        });
        emailInput.addEventListener('blur', function () {
            if (this.value) {
                const validation = validateEmail(this.value);
                displayErrors(this, validation.errors, 'email');
                updateSubmitButton(form, submitBtn);
            }
        });
    }

    if (passwordInput) {
        passwordInput.addEventListener('input', function () {
            const validation = validatePassword(this.value);
            displayErrors(this, validation.errors, 'password');
            displayPasswordStrength(this, validation.strength);
            updateSubmitButton(form, submitBtn);

            if (confirmPasswordInput && confirmPasswordInput.value) {
                const confirmValidation = validateConfirmPassword(this.value, confirmPasswordInput.value);
                displayErrors(confirmPasswordInput, confirmValidation.errors, 'confirm-password');
            }
        });
    }

    if (confirmPasswordInput && passwordInput) {
        confirmPasswordInput.addEventListener('input', function () {
            const confirmValidation = validateConfirmPassword(passwordInput.value, this.value);
            displayErrors(this, confirmValidation.errors, 'confirm-password');
            updateSubmitButton(form, submitBtn);
        });
    }

    form.addEventListener('submit', function (e) {
        let hasErrors = false;

        const usernameValidation = userInput
            ? validateUsername(userInput.value)
            : { isValid: true };
        const emailValidation = emailInput
            ? validateEmail(emailInput.value)
            : { isValid: true };
        const passwordValidation = passwordInput
            ? validatePassword(passwordInput.value)
            : { isValid: true };
        const confirmValidation = (confirmPasswordInput && passwordInput)
            ? validateConfirmPassword(passwordInput.value, confirmPasswordInput.value)
            : { isValid: true };

        if (!usernameValidation.isValid && userInput) {
            displayErrors(userInput, usernameValidation.errors, 'username');
            hasErrors = true;
        }
        if (!emailValidation.isValid && emailInput) {
            displayErrors(emailInput, emailValidation.errors, 'email');
            hasErrors = true;
        }
        if (!passwordValidation.isValid && passwordInput) {
            displayErrors(passwordInput, passwordValidation.errors, 'password');
            displayPasswordStrength(passwordInput, passwordValidation.strength);
            hasErrors = true;
        }
        if (!confirmValidation.isValid && confirmPasswordInput) {
            displayErrors(confirmPasswordInput, confirmValidation.errors, 'confirm-password');
            hasErrors = true;
        }

        if (hasErrors) {
            e.preventDefault();
            if (!usernameValidation.isValid && userInput)                userInput.focus();
            else if (!emailValidation.isValid && emailInput)             emailInput.focus();
            else if (!passwordValidation.isValid && passwordInput)       passwordInput.focus();
            else if (!confirmValidation.isValid && confirmPasswordInput) confirmPasswordInput.focus();

            if (options.onValidationFail) options.onValidationFail();
        } else {
            if (options.onValidationSuccess) options.onValidationSuccess();
        }
    });
}

/**
 * Actualiza el estado del botón de envío
 * @param {HTMLElement} form      - El formulario
 * @param {HTMLElement} submitBtn - El botón de envío
 */
function updateSubmitButton(form, submitBtn) {
    if (!submitBtn) return;

    const userInput            = form.querySelector('[data-validate="username"]');
    const emailInput           = form.querySelector('[data-validate="email"]');
    const passwordInput        = form.querySelector('[data-validate="password"]');
    const confirmPasswordInput = form.querySelector('[data-validate="confirm-password"]');

    const usernameValid = !userInput     || (userInput.value     && validateUsername(userInput.value).isValid);
    const emailValid    = !emailInput    || (emailInput.value    && validateEmail(emailInput.value).isValid);
    const passwordValid = !passwordInput || (passwordInput.value && validatePassword(passwordInput.value).isValid);
    const confirmValid  = (!confirmPasswordInput || !passwordInput)
        || (confirmPasswordInput.value && validateConfirmPassword(passwordInput.value, confirmPasswordInput.value).isValid);

    const allValid = usernameValid && emailValid && passwordValid && confirmValid;

    if (allValid) {
        submitBtn.disabled = false;
        submitBtn.classList.add('btn-enabled');
    } else {
        submitBtn.disabled = true;
        submitBtn.classList.remove('btn-enabled');
    }
}

// ─── Exportar como módulo ES6 ──────────────────────────────────────────────────
export {
    validateUsername,
    validateEmail,
    validatePassword,
    validateConfirmPassword,
    getStrengthColor,
    getStrengthText,
    getStrengthIcon,
    displayErrors,
    displayPasswordStrength,
    initSecurityValidation,
    COMMON_PASSWORDS
};

// ─── Compatibilidad global (script clásico) ────────────────────────────────────
if (typeof window !== 'undefined') {
    window.validateUsername        = validateUsername;
    window.validateEmail           = validateEmail;
    window.validatePassword        = validatePassword;
    window.validateConfirmPassword = validateConfirmPassword;
    window.getStrengthColor        = getStrengthColor;
    window.getStrengthText         = getStrengthText;
    window.getStrengthIcon         = getStrengthIcon;
    window.displayErrors           = displayErrors;
    window.displayPasswordStrength = displayPasswordStrength;
    window.initSecurityValidation  = initSecurityValidation;
}