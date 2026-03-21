/**
 * Sistema de Validación de Seguridad
 * Validaciones para usuario, contraseña y correo con mensajes dinámicos
 * 
 * MEJORAS v2:
 *  - Validación más rigurosa (rechaza guiones bajos al inicio/fin, secuencias repetidas, etc.)
 *  - Campo "confirmar contraseña" integrado
 *  - Estado vacío siempre muestra borde rojo (nunca verde en vacío)
 *  - Bloqueo de botón submit mientras haya campos inválidos o vacíos
 *  - Campo "rol" obligatorio integrado en la validación
 */

// ─── Contraseñas comunes prohibidas ───────────────────────────────────────────
const COMMON_PASSWORDS = [
    '123456', 'password', 'qwerty', '123456789', 'abc123',
    'letmein', 'welcome', 'monkey', 'dragon', 'master',
    '111111', '123123', 'admin123', 'pass123', 'iloveyou',
    'sunshine', 'princess', 'football', 'shadow', 'superman',
    'qwerty123', 'password1', '12345678', '1234567890',
    'passw0rd', 'p@ssword', 'p@ss123', 'admin', 'root',
    'toor', 'test', 'demo', 'user', 'guest', 'login',
    'changeme', 'secret', '000000', 'aaaaaa', 'abcdef',
];

// ─── Patrones prohibidos en usuario ───────────────────────────────────────────
const FORBIDDEN_USERNAMES = /^(user|admin|test|demo|root|guest|login|null|undefined|superuser|sysadmin)$/i;

// ─── Caracteres especiales para contraseña ────────────────────────────────────
const SPECIAL_CHARS_REGEX = /[!@#$%^&*()\-_=+\[\]{};:'",.<>/?\\|`~]/;

// =============================================================================
// VALIDACIÓN DE ROL (NUEVA FUNCIÓN)
// =============================================================================

/**
 * Valida que se haya seleccionado un rol.
 * @param {string} rol
 * @returns {{ isValid: boolean, errors: string[] }}
 */
function validateRol(rol) {
    const errors = [];
    
    // Campo vacío o sin seleccionar
    if (!rol || rol === '' || rol === 'Seleccionar rol') {
        errors.push('El rol es obligatorio');
        return { isValid: false, errors };
    }
    
    return { isValid: true, errors };
}

// =============================================================================
// VALIDACIÓN DE USUARIO
// =============================================================================

/**
 * Valida el nombre de usuario con reglas estrictas.
 * @param {string} username
 * @returns {{ isValid: boolean, errors: string[] }}
 */
function validateUsername(username) {
    const errors = [];

    // Campo vacío — no mostrar errores largos, solo indicar que es requerido
    if (!username || username.trim() === '') {
        return { isValid: false, errors: ['El usuario es requerido'] };
    }

    const u = username.trim();

    if (u.length < 4) {
        errors.push('Mínimo 4 caracteres');
    }

    if (u.length > 30) {
        errors.push('Máximo 30 caracteres');
    }

    // Solo letras, números, guion y guion bajo — NO espacios, NO puntos al inicio/fin
    if (!/^[a-zA-Z0-9_\-\.]+$/.test(u)) {
        errors.push('Solo letras, números, "-", "_" y "."');
    }

    // No puede empezar ni terminar con guion, guion bajo o punto
    if (/^[_\-\.]/.test(u) || /[_\-\.]$/.test(u)) {
        errors.push('No puede empezar ni terminar con "_", "-" o "."');
    }

    // No solo números
    if (/^\d+$/.test(u)) {
        errors.push('No puede ser solo números');
    }

    // No solo guiones bajos, guiones o puntos
    if (/^[_\-\.]+$/.test(u)) {
        errors.push('No puede ser solo caracteres especiales');
    }

    // Nombre genérico prohibido
    if (FORBIDDEN_USERNAMES.test(u)) {
        errors.push('Nombre de usuario reservado o demasiado genérico');
    }

    // Secuencias repetidas (aaaa, ____, ----)
    if (/(.)\1{3,}/.test(u)) {
        errors.push('No puede contener 4 o más caracteres iguales seguidos');
    }

    // Secuencias numéricas simples
    if (/^(0123|1234|2345|3456|4567|5678|6789|9876|8765|7654|6543|5432|4321|3210)/.test(u)) {
        errors.push('No puede empezar con una secuencia numérica simple');
    }

    return { isValid: errors.length === 0, errors };
}

// =============================================================================
// VALIDACIÓN DE CORREO
// =============================================================================

/**
 * Valida el correo electrónico.
 * @param {string} email
 * @returns {{ isValid: boolean, errors: string[] }}
 */
function validateEmail(email) {
    const errors = [];

    if (!email || email.trim() === '') {
        return { isValid: false, errors: ['El correo es requerido'] };
    }

    const e = email.trim();

    if (!e.includes('@')) {
        errors.push('El correo debe contener @');
        return { isValid: false, errors };
    }

    const parts = e.split('@');
    if (parts.length !== 2) {
        errors.push('Formato de correo inválido');
        return { isValid: false, errors };
    }

    const [localPart, domainPart] = parts;

    if (!localPart || localPart.length === 0) {
        errors.push('Falta el nombre antes del @');
        return { isValid: false, errors };
    }

    if (!domainPart || domainPart.length === 0) {
        errors.push('Falta el dominio después del @');
        return { isValid: false, errors };
    }

    if (!domainPart.includes('.')) {
        errors.push('El dominio debe incluir un punto (ej: .com, .mx)');
        return { isValid: false, errors };
    }

    const domainParts = domainPart.split('.');
    const tld = domainParts[domainParts.length - 1];

    if (!tld || tld.length < 2) {
        errors.push('Extensión de correo inválida (ej: .com, .mx, .org)');
        return { isValid: false, errors };
    }

    // Regex robusta para correo
    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(e)) {
        errors.push('El formato del correo no es válido');
        return { isValid: false, errors };
    }

    return { isValid: errors.length === 0, errors };
}

// =============================================================================
// VALIDACIÓN DE CONTRASEÑA
// =============================================================================

/**
 * Valida la contraseña con reglas estrictas.
 * @param {string} password
 * @returns {{ isValid: boolean, errors: string[], strength: string }}
 */
function validatePassword(password) {
    const errors = [];
    let strengthScore = 0;

    if (!password || password === '') {
        return { isValid: false, errors: ['La contraseña es requerida'], strength: 'debil' };
    }

    // Longitud mínima
    if (password.length < 8) {
        errors.push('Mínimo 8 caracteres');
    } else {
        strengthScore += 1;
        if (password.length >= 12) strengthScore += 1;
        if (password.length >= 16) strengthScore += 1;
    }

    const hasUpper   = /[A-Z]/.test(password);
    const hasLower   = /[a-z]/.test(password);
    const hasNumber  = /[0-9]/.test(password);
    const hasSpecial = SPECIAL_CHARS_REGEX.test(password);

    const complexity = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;

    // Requiere al menos 3 de 4 criterios
    if (complexity < 3) {
        const missing = [];
        if (!hasUpper)   missing.push('mayúscula (A-Z)');
        if (!hasLower)   missing.push('minúscula (a-z)');
        if (!hasNumber)  missing.push('número (0-9)');
        if (!hasSpecial) missing.push('especial (!@#$...)');
        errors.push(`Requiere: ${missing.join(', ')}`);
    }

    strengthScore += complexity;

    // Contraseña común
    const lower = password.toLowerCase();
    if (COMMON_PASSWORDS.some(cp => lower === cp || lower.includes(cp))) {
        errors.push('Contraseña muy común o predecible');
        strengthScore = Math.max(0, strengthScore - 3);
    }

    // Caracteres repetidos (aaaa, 1111)
    if (/(.)\1{3,}/.test(password)) {
        errors.push('No puede contener 4 o más caracteres iguales seguidos');
        strengthScore = Math.max(0, strengthScore - 2);
    }

    // Secuencias numéricas simples
    if (/0123|1234|2345|3456|4567|5678|6789|9876|8765/.test(password)) {
        errors.push('Evita secuencias numéricas simples (1234, 5678...)');
        strengthScore = Math.max(0, strengthScore - 1);
    }

    // Secuencias de teclado
    if (/qwerty|asdfgh|zxcvbn/i.test(password)) {
        errors.push('Evita secuencias de teclado (qwerty, asdfgh...)');
        strengthScore = Math.max(0, strengthScore - 1);
    }

    let strength = 'debil';
    if (errors.length === 0 && strengthScore >= 6) {
        strength = 'fuerte';
    } else if (errors.length === 0 && strengthScore >= 4) {
        strength = 'media';
    } else if (strengthScore >= 3) {
        strength = 'media';
    }

    return { isValid: errors.length === 0, errors, strength };
}

// =============================================================================
// VALIDACIÓN DE CONFIRMAR CONTRASEÑA
// =============================================================================

/**
 * Valida que dos contraseñas coincidan.
 * @param {string} password
 * @param {string} confirmPassword
 * @returns {{ isValid: boolean, errors: string[] }}
 */
function validateConfirmPassword(password, confirmPassword) {
    if (!confirmPassword || confirmPassword === '') {
        return { isValid: false, errors: ['Confirma tu contraseña'] };
    }

    if (password !== confirmPassword) {
        return { isValid: false, errors: ['Las contraseñas no coinciden'] };
    }

    return { isValid: true, errors: [] };
}

// =============================================================================
// HELPERS DE FORTALEZA
// =============================================================================

function getStrengthColor(strength) {
    return { debil: '#dc2626', media: '#d97706', fuerte: '#16a34a' }[strength] || '#dc2626';
}

function getStrengthText(strength) {
    return { debil: 'Débil', media: 'Media', fuerte: 'Fuerte' }[strength] || 'Débil';
}

function getStrengthIcon(strength) {
    return { debil: '✗', media: '⚠', fuerte: '✓' }[strength] || '✗';
}

// =============================================================================
// DISPLAY DE ERRORES EN EL DOM
// =============================================================================

/**
 * Muestra errores en el DOM y aplica clase visual al input.
 * REGLA: si errors.length === 0 Y el campo tiene valor → verde.
 *         si errors.length > 0  O  el campo está vacío → rojo.
 *
 * @param {HTMLElement} inputElement
 * @param {string[]}    errors
 * @param {string}      fieldType
 */
function displayErrors(inputElement, errors, fieldType) {
    if (!inputElement) return;

    const parentWrapper =
        inputElement.closest('.password-wrapper') ||
        inputElement.closest('.input-group') ||
        inputElement.closest('.select-wrapper');

    const refEl = parentWrapper || inputElement;

    // Limpiar errores/strength anteriores adyacentes
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

    const isEmpty = !inputElement.value || inputElement.value === '' || 
                    (fieldType === 'rol' && (!inputElement.value || inputElement.value === 'Seleccionar rol'));

    if (errors.length > 0) {
        // ── Mostrar errores ────────────────────────────────────────────────
        const errorContainer = document.createElement('div');
        errorContainer.className = 'error-container';
        
        // Para el campo rol, mostrar el error específico
        if (fieldType === 'rol') {
            const errorMsg = document.createElement('div');
            errorMsg.className = 'error-message';
            errorMsg.textContent = '⚠️ ' + (errors[0] || 'El rol es obligatorio');
            errorContainer.appendChild(errorMsg);
        } else {
            errors.slice(0, 2).forEach(error => {
                const errorMsg = document.createElement('div');
                errorMsg.className = 'error-message';
                errorMsg.textContent = '✗ ' + error;
                errorContainer.appendChild(errorMsg);
            });
        }

        refEl.parentNode.insertBefore(errorContainer, refEl.nextSibling);

        inputElement.classList.add('input-error');
        inputElement.classList.remove('input-valid');

    } else if (!isEmpty) {
        // ── Sin errores y tiene valor → verde ─────────────────────────────
        inputElement.classList.remove('input-error');
        inputElement.classList.add('input-valid');

    } else {
        // ── Sin errores pero vacío → neutro (quitar ambas clases) ─────────
        inputElement.classList.remove('input-error', 'input-valid');
    }
}

// =============================================================================
// DISPLAY DE FORTALEZA DE CONTRASEÑA
// =============================================================================

/**
 * Muestra el indicador de fortaleza de contraseña.
 * @param {HTMLElement} passwordInput
 * @param {string}      strength
 */
function displayPasswordStrength(passwordInput, strength) {
    if (!passwordInput) return;

    const parentWrapper =
        passwordInput.closest('.password-wrapper') ||
        passwordInput.closest('.input-group');

    const refEl = parentWrapper || passwordInput;

    // Eliminar indicador anterior
    let sibling = refEl.nextElementSibling;
    while (sibling) {
        if (sibling.classList.contains('strength-indicator')) {
            sibling.remove();
            break;
        }
        if (!sibling.classList.contains('error-container')) break;
        sibling = sibling.nextElementSibling;
    }

    if (!passwordInput.value) return;

    const color = getStrengthColor(strength);
    const text  = getStrengthText(strength);
    const icon  = getStrengthIcon(strength);
    const widthMap = { debil: '33%', media: '66%', fuerte: '100%' };

    const strengthIndicator = document.createElement('div');
    strengthIndicator.className = 'strength-indicator';
    strengthIndicator.innerHTML = `
        <div class="strength-bar-track">
            <div class="strength-bar" style="width:${widthMap[strength] || '33%'};background-color:${color};"></div>
        </div>
        <span class="strength-text" style="color:${color};">${icon} Fortaleza: ${text}</span>
    `;

    // Insertar después de cualquier error-container existente
    let insertAfter = refEl;
    let next = refEl.nextElementSibling;
    while (next && next.classList.contains('error-container')) {
        insertAfter = next;
        next = next.nextElementSibling;
    }
    insertAfter.parentNode.insertBefore(strengthIndicator, insertAfter.nextSibling);
}

// =============================================================================
// ACTUALIZAR ESTADO DEL BOTÓN SUBMIT
// =============================================================================

/**
 * Habilita o deshabilita el botón submit basándose en la validez de todos los campos.
 * Ningún campo puede estar vacío.
 * @param {HTMLFormElement} form
 * @param {HTMLElement}     submitBtn
 */
function updateSubmitButton(form, submitBtn) {
    if (!submitBtn) return;

    const userInput            = form.querySelector('[data-validate="username"]');
    const emailInput           = form.querySelector('[data-validate="email"]');
    const passwordInput        = form.querySelector('[data-validate="password"]');
    const confirmPasswordInput = form.querySelector('[data-validate="confirm-password"]');
    const rolSelect            = form.querySelector('[data-validate="rol"]'); // NUEVO: campo rol

    // Función helper: campo válido = tiene valor Y pasa validación
    const fieldOk = (input, validateFn) => {
        if (!input) return true;
        if (!input.value || input.value.trim() === '') return false;
        return validateFn(input.value).isValid;
    };

    // Validación específica para rol (select)
    const rolOk = (() => {
        if (!rolSelect) return true;
        if (!rolSelect.value || rolSelect.value === '' || rolSelect.value === 'Seleccionar rol') {
            return false;
        }
        return validateRol(rolSelect.value).isValid;
    })();

    const usernameOk = fieldOk(userInput, validateUsername);
    const emailOk    = fieldOk(emailInput, validateEmail);
    const passwordOk = fieldOk(passwordInput, validatePassword);

    let confirmOk = true;
    if (confirmPasswordInput && passwordInput) {
        if (!confirmPasswordInput.value || confirmPasswordInput.value === '') {
            confirmOk = false;
        } else {
            confirmOk = validateConfirmPassword(passwordInput.value, confirmPasswordInput.value).isValid;
        }
    }

    const allValid = usernameOk && emailOk && passwordOk && confirmOk && rolOk;

    submitBtn.disabled = !allValid;
    if (allValid) {
        submitBtn.classList.add('btn-enabled');
        submitBtn.classList.remove('btn-disabled-state');
    } else {
        submitBtn.classList.remove('btn-enabled');
        submitBtn.classList.add('btn-disabled-state');
    }
}

// =============================================================================
// INIT SECURITY VALIDATION — MOTOR PRINCIPAL
// =============================================================================

/**
 * Inicializa la validación en tiempo real para un formulario.
 * Soporta: username, email, password, confirm-password, rol.
 *
 * @param {string} formSelector
 * @param {object} options        — { onValidationSuccess, onValidationFail }
 */
function initSecurityValidation(formSelector, options = {}) {
    const form = document.querySelector(formSelector);
    if (!form) {
        console.error('[securityValidation] Formulario no encontrado:', formSelector);
        return;
    }

    const userInput            = form.querySelector('[data-validate="username"]');
    const emailInput           = form.querySelector('[data-validate="email"]');
    const passwordInput        = form.querySelector('[data-validate="password"]');
    const confirmPasswordInput = form.querySelector('[data-validate="confirm-password"]');
    const rolSelect            = form.querySelector('[data-validate="rol"]'); // NUEVO: campo rol
    const submitBtn            = form.querySelector('button[type="submit"]');

    // ── Deshabilitar botón desde el inicio ────────────────────────────────
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add('btn-disabled-state');
    }

    // ─────────────────────────────────────────────────────────────────────
    // ROL (NUEVA VALIDACIÓN)
    // ─────────────────────────────────────────────────────────────────────
    if (rolSelect) {
        const validateRolField = () => {
            const rolValue = rolSelect.value;
            const isEmpty = !rolValue || rolValue === '' || rolValue === 'Seleccionar rol';
            
            if (isEmpty) {
                displayErrors(rolSelect, ['El rol es obligatorio'], 'rol');
            } else {
                const v = validateRol(rolValue);
                displayErrors(rolSelect, v.errors, 'rol');
            }
            updateSubmitButton(form, submitBtn);
        };

        rolSelect.addEventListener('change', validateRolField);
        // Validación inicial
        validateRolField();
    }

    // ─────────────────────────────────────────────────────────────────────
    // USERNAME
    // ─────────────────────────────────────────────────────────────────────
    if (userInput) {
        userInput.addEventListener('input', function () {
            const isEmpty = !this.value || this.value.trim() === '';
            if (isEmpty) {
                // Vacío: limpiar errores pero marcar como error (rojo)
                displayErrors(this, ['El usuario es requerido'], 'username');
            } else {
                const v = validateUsername(this.value);
                displayErrors(this, v.errors, 'username');
            }
            updateSubmitButton(form, submitBtn);
        });

        userInput.addEventListener('blur', function () {
            const isEmpty = !this.value || this.value.trim() === '';
            if (isEmpty) {
                displayErrors(this, ['El usuario es requerido'], 'username');
            } else {
                const v = validateUsername(this.value);
                displayErrors(this, v.errors, 'username');
            }
            updateSubmitButton(form, submitBtn);
        });
    }

    // ─────────────────────────────────────────────────────────────────────
    // EMAIL
    // ─────────────────────────────────────────────────────────────────────
    if (emailInput) {
        emailInput.addEventListener('input', function () {
            const isEmpty = !this.value || this.value.trim() === '';
            if (isEmpty) {
                displayErrors(this, ['El correo es requerido'], 'email');
            } else {
                const v = validateEmail(this.value);
                displayErrors(this, v.errors, 'email');
            }
            updateSubmitButton(form, submitBtn);
        });

        emailInput.addEventListener('blur', function () {
            const isEmpty = !this.value || this.value.trim() === '';
            if (isEmpty) {
                displayErrors(this, ['El correo es requerido'], 'email');
            } else {
                const v = validateEmail(this.value);
                displayErrors(this, v.errors, 'email');
            }
            updateSubmitButton(form, submitBtn);
        });
    }

    // ─────────────────────────────────────────────────────────────────────
    // PASSWORD
    // ─────────────────────────────────────────────────────────────────────
    if (passwordInput) {
        passwordInput.addEventListener('input', function () {
            if (!this.value) {
                displayErrors(this, ['La contraseña es requerida'], 'password');
                // Limpiar barra de fortaleza si se borra todo
                const refEl = this.closest('.password-wrapper') || this.closest('.input-group') || this;
                let s = refEl.nextElementSibling;
                while (s) {
                    if (s.classList.contains('strength-indicator')) { s.remove(); break; }
                    if (!s.classList.contains('error-container')) break;
                    s = s.nextElementSibling;
                }
            } else {
                const v = validatePassword(this.value);
                displayErrors(this, v.errors, 'password');
                displayPasswordStrength(this, v.strength);
            }
            // Re-validar confirmar contraseña si ya tiene valor
            if (confirmPasswordInput && confirmPasswordInput.value) {
                const cv = validateConfirmPassword(this.value, confirmPasswordInput.value);
                displayErrors(confirmPasswordInput, cv.errors, 'confirm-password');
            }
            updateSubmitButton(form, submitBtn);
        });

        passwordInput.addEventListener('blur', function () {
            if (!this.value) {
                displayErrors(this, ['La contraseña es requerida'], 'password');
            }
            updateSubmitButton(form, submitBtn);
        });
    }

    // ─────────────────────────────────────────────────────────────────────
    // CONFIRM PASSWORD
    // ─────────────────────────────────────────────────────────────────────
    if (confirmPasswordInput && passwordInput) {
        confirmPasswordInput.addEventListener('input', function () {
            if (!this.value) {
                displayErrors(this, ['Confirma tu contraseña'], 'confirm-password');
            } else {
                const cv = validateConfirmPassword(passwordInput.value, this.value);
                displayErrors(this, cv.errors, 'confirm-password');
            }
            updateSubmitButton(form, submitBtn);
        });

        confirmPasswordInput.addEventListener('blur', function () {
            if (!this.value) {
                displayErrors(this, ['Confirma tu contraseña'], 'confirm-password');
            } else {
                const cv = validateConfirmPassword(passwordInput.value, this.value);
                displayErrors(this, cv.errors, 'confirm-password');
            }
            updateSubmitButton(form, submitBtn);
        });
    }

    // ─────────────────────────────────────────────────────────────────────
    // SUBMIT — validación final antes de enviar
    // ─────────────────────────────────────────────────────────────────────
    form.addEventListener('submit', function (e) {
        let hasErrors = false;
        let firstErrorEl = null;

        if (userInput) {
            const v = validateUsername(userInput.value);
            displayErrors(userInput, v.errors, 'username');
            if (!v.isValid || !userInput.value) { hasErrors = true; firstErrorEl = firstErrorEl || userInput; }
        }
        if (emailInput) {
            const v = validateEmail(emailInput.value);
            displayErrors(emailInput, v.errors, 'email');
            if (!v.isValid || !emailInput.value) { hasErrors = true; firstErrorEl = firstErrorEl || emailInput; }
        }
        if (passwordInput) {
            const v = validatePassword(passwordInput.value);
            displayErrors(passwordInput, v.errors, 'password');
            if (passwordInput.value) displayPasswordStrength(passwordInput, v.strength);
            if (!v.isValid || !passwordInput.value) { hasErrors = true; firstErrorEl = firstErrorEl || passwordInput; }
        }
        if (confirmPasswordInput && passwordInput) {
            const cv = validateConfirmPassword(passwordInput.value, confirmPasswordInput.value);
            displayErrors(confirmPasswordInput, cv.errors, 'confirm-password');
            if (!cv.isValid || !confirmPasswordInput.value) { hasErrors = true; firstErrorEl = firstErrorEl || confirmPasswordInput; }
        }
        
        // NUEVO: Validación del rol
        if (rolSelect) {
            const rolValue = rolSelect.value;
            const isEmpty = !rolValue || rolValue === '' || rolValue === 'Seleccionar rol';
            const v = isEmpty ? { isValid: false, errors: ['El rol es obligatorio'] } : validateRol(rolValue);
            displayErrors(rolSelect, v.errors, 'rol');
            if (!v.isValid) { hasErrors = true; firstErrorEl = firstErrorEl || rolSelect; }
        }

        if (hasErrors) {
            e.preventDefault();
            if (firstErrorEl) firstErrorEl.focus();
            if (options.onValidationFail) options.onValidationFail();
        } else {
            if (options.onValidationSuccess) options.onValidationSuccess();
        }
    });
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
    validateUsername,
    validateEmail,
    validatePassword,
    validateConfirmPassword,
    validateRol,  // NUEVO: exportar validación de rol
    getStrengthColor,
    getStrengthText,
    getStrengthIcon,
    displayErrors,
    displayPasswordStrength,
    initSecurityValidation,
    updateSubmitButton,
    COMMON_PASSWORDS
};

// ─── Compatibilidad global ────────────────────────────────────────────────────
if (typeof window !== 'undefined') {
    window.validateUsername        = validateUsername;
    window.validateEmail           = validateEmail;
    window.validatePassword        = validatePassword;
    window.validateConfirmPassword = validateConfirmPassword;
    window.validateRol             = validateRol;  // NUEVO: exportar globalmente
    window.getStrengthColor        = getStrengthColor;
    window.getStrengthText         = getStrengthText;
    window.getStrengthIcon         = getStrengthIcon;
    window.displayErrors           = displayErrors;
    window.displayPasswordStrength = displayPasswordStrength;
    window.initSecurityValidation  = initSecurityValidation;
    window.updateSubmitButton      = updateSubmitButton;
}