// src/frontend/auth.js
// Módulo ES6 para autenticación con auditoría básica

const API_URL = window.location.origin;

// =============================================================================
// IMPORTAR VALIDACIONES DE SEGURIDAD
// =============================================================================

import {
    validateUsername,
    validateEmail,
    validatePassword,
    validateConfirmPassword,
    displayErrors,
    displayPasswordStrength
} from './securityValidation.js';

// =============================================================================
// FUNCIÓN SIMPLIFICADA DE AUDITORÍA
// =============================================================================

async function logAuthEvent(eventType, data = {}) {
    try {
        const eventData = {
            eventType,
            timestamp: new Date().toISOString(),
            ...data
        };

        console.log(`📝 [AUDIT] ${eventType}:`, data);

        const includeToken = eventType === 'login_success' ||
            eventType === 'register_success' ||
            (eventType.includes('success') && localStorage.getItem('token'));

        const headers = {
            'Content-Type': 'application/json'
        };

        if (includeToken) {
            const token = localStorage.getItem('token');
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        fetch(`${API_URL}/api/frontend-log`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(eventData)
        }).catch(err => console.warn('⚠️ No se pudo enviar log:', err.message));

    } catch (error) {
        console.warn('⚠️ Error en logAuthEvent:', error.message);
    }
}

// =============================================================================
// FUNCIONES DE ALERTA
// =============================================================================

export function showAlert(message, type = 'success') {
    const container = document.getElementById('alertContainer');
    if (!container) return;

    const icon = type === 'success' ? 'check-circle' : 'exclamation-circle';

    container.innerHTML = `
        <div class="alert alert-${type}">
            <i class="fas fa-${icon}"></i>
            ${message}
        </div>
    `;

    setTimeout(() => {
        if (container.innerHTML.includes('alert')) {
            container.innerHTML = '';
        }
    }, 5000);
}

export function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const buttonId = `toggle${inputId.charAt(0).toUpperCase() + inputId.slice(1)}`;
    const button = document.getElementById(buttonId);

    if (input && button) {
        if (input.type === 'password') {
            input.type = 'text';
            const icon = button.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            }
        } else {
            input.type = 'password';
            const icon = button.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        }
    }
}

// =============================================================================
// VERIFICACIÓN DE ADMINISTRADOR
// =============================================================================

export async function checkAdminExists() {
    try {
        const response = await fetch(`${API_URL}/api/auth/check-admin`);
        const data = await response.json();

        const isLoginPage = window.location.pathname.includes('login.html');
        const isIndexPage = window.location.pathname === '/' || window.location.pathname.includes('index.html');

        console.log('📍 Página actual:', window.location.pathname);
        console.log('📊 Admin existe:', data.adminExists);

        if (isLoginPage) {
            if (data.adminExists) {
                showLoginForm();
            } else {
                showRegisterForm();
            }
        } else if (isIndexPage && !data.adminExists) {
            console.log('⚠️ No hay administrador, redirigiendo a login');
            window.location.href = '/login.html';
        }

    } catch (error) {
        console.error('Error al verificar admin:', error);
    }
}

// =============================================================================
// MOSTRAR FORMULARIOS
// =============================================================================

export function showLoginForm() {
    const authTitle = document.getElementById('authTitle');
    const authSubtitle = document.getElementById('authSubtitle');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const registerLink = document.getElementById('registerLinkContainer');

    if (authTitle) authTitle.textContent = 'Iniciar Sesión';
    if (authSubtitle) authSubtitle.textContent = 'Accede al sistema de gestión';
    if (loginForm) loginForm.classList.remove('hidden');
    if (registerForm) registerForm.classList.add('hidden');
    if (registerLink) registerLink.style.display = 'none';

    // Limpiar errores del formulario de registro al volver
    _clearRegisterErrors();
}

export function showRegisterForm() {
    const authTitle = document.getElementById('authTitle');
    const authSubtitle = document.getElementById('authSubtitle');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const registerLink = document.getElementById('registerLinkContainer');

    if (authTitle) authTitle.textContent = 'Registrar Administrador';
    if (authSubtitle) authSubtitle.textContent = 'Crea la cuenta del primer administrador';
    if (loginForm) loginForm.classList.add('hidden');
    if (registerForm) registerForm.classList.remove('hidden');
    if (registerLink) registerLink.style.display = 'block';
}

// =============================================================================
// ALTERNAR VISIBILIDAD DE CONTRASEÑA
// =============================================================================

export function setupPasswordToggles() {
    document.querySelectorAll('.password-toggle').forEach(toggle => {
        toggle.addEventListener('click', function () {
            // El input puede ser el hermano anterior directo, o estar dentro del .input-group
            const input = this.previousElementSibling;
            if (!input || input.tagName !== 'INPUT') return;

            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);

            const icon = this.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-eye');
                icon.classList.toggle('fa-eye-slash');
            }
        });
    });
}

// =============================================================================
// VALIDACIÓN EN TIEMPO REAL — REGISTRO
// =============================================================================

function _clearRegisterErrors() {
    const form = document.getElementById('registerForm');
    if (!form) return;
    form.querySelectorAll('.error-container, .strength-indicator').forEach(el => el.remove());
    form.querySelectorAll('.input-error, .input-valid').forEach(el => {
        el.classList.remove('input-error', 'input-valid');
    });
}

/**
 * Adjunta los listeners de validación en tiempo real al formulario de registro.
 * Se llama UNA sola vez cuando el DOM está listo.
 */
function setupRegisterValidation() {
    const usuarioInput = document.getElementById('registerUsuario');
    const correoInput = document.getElementById('registerCorreo');
    const passInput = document.getElementById('registerPassword');
    const confirmInput = document.getElementById('registerPasswordConfirm');
    const submitBtn = document.getElementById('registerBtn');

    if (!usuarioInput && !correoInput && !passInput) return; // No es la página de registro

    /** Recalcula si el botón debe habilitarse */
    function refreshSubmitState() {
        if (!submitBtn) return;
        const uOk = usuarioInput ? (usuarioInput.value && validateUsername(usuarioInput.value).isValid) : true;
        const eOk = correoInput ? (correoInput.value && validateEmail(correoInput.value).isValid) : true;
        const pOk = passInput ? (passInput.value && validatePassword(passInput.value).isValid) : true;
        const cOk = (confirmInput && passInput)
            ? (confirmInput.value && validateConfirmPassword(passInput.value, confirmInput.value).isValid)
            : true;

        const allOk = uOk && eOk && pOk && cOk;
        submitBtn.disabled = !allOk;
        if (allOk) {
            submitBtn.classList.add('btn-enabled');
        } else {
            submitBtn.classList.remove('btn-enabled');
        }
    }

    // ── Usuario ──────────────────────────────────────────────────
    if (usuarioInput) {
        usuarioInput.addEventListener('input', function () {
            const v = validateUsername(this.value);
            displayErrors(this, v.errors, 'username');
            refreshSubmitState();
        });
        usuarioInput.addEventListener('blur', function () {
            if (this.value) {
                const v = validateUsername(this.value);
                displayErrors(this, v.errors, 'username');
            }
        });
    }

    // ── Correo ───────────────────────────────────────────────────
    if (correoInput) {
        correoInput.addEventListener('input', function () {
            if (this.value.length > 3) {
                const v = validateEmail(this.value);
                displayErrors(this, v.errors, 'email');
                refreshSubmitState();
            } else {
                displayErrors(this, [], 'email');
            }
        });
        correoInput.addEventListener('blur', function () {
            if (this.value) {
                const v = validateEmail(this.value);
                displayErrors(this, v.errors, 'email');
                refreshSubmitState();
            }
        });
    }

    // ── Contraseña ───────────────────────────────────────────────
    if (passInput) {
        passInput.addEventListener('input', function () {
            const v = validatePassword(this.value);
            displayErrors(this, v.errors, 'password');
            displayPasswordStrength(this, v.strength);
            refreshSubmitState();

            // Re-validar confirmación en caliente
            if (confirmInput && confirmInput.value) {
                const cv = validateConfirmPassword(this.value, confirmInput.value);
                displayErrors(confirmInput, cv.errors, 'confirm-password');
            }
        });
    }

    // ── Confirmar contraseña ─────────────────────────────────────
    if (confirmInput && passInput) {
        confirmInput.addEventListener('input', function () {
            const cv = validateConfirmPassword(passInput.value, this.value);
            displayErrors(this, cv.errors, 'confirm-password');
            refreshSubmitState();
        });
    }

    console.log('✅ Validación de registro adjuntada');
}

// =============================================================================
// FUNCIÓN AUXILIAR: Mostrar modal de sistema cerrado
// =============================================================================

function showSystemClosedModal(type, reason) {
    // Remover modal existente si hay uno
    const existing = document.getElementById('systemClosedModal');
    if (existing) existing.remove();

    const modalHTML = `
        <div class="sa-modal" id="systemClosedModal" style="display:flex;z-index:10000;">
            <div class="sa-modal__backdrop" onclick="document.getElementById('systemClosedModal').remove()"></div>
            <div class="sa-modal__dialog" style="max-width:480px;text-align:center;">
                <div class="sa-modal__header" style="justify-content:center;border-bottom:none;">
                    <div class="sa-modal__header-icon" style="background:var(--col-amber-dim, rgba(251,191,36,0.15));border:1px solid rgba(251,191,36,0.3);">
                        <i class="fas fa-triangle-exclamation" style="color:var(--col-amber, #f59e0b);"></i>
                    </div>
                </div>
                <div class="sa-modal__body">
                    <div style="display:flex;flex-direction:column;align-items:center;gap:1rem;padding:1rem 0;">
                        <div style="
                            width:72px;height:72px;
                            border-radius:50%;
                            background:var(--col-amber-dim, rgba(251,191,36,0.15));
                            border:2px solid rgba(251,191,36,0.3);
                            display:flex;align-items:center;justify-content:center;
                        ">
                            <i class="fas fa-lock" style="font-size:2rem;color:var(--col-amber, #f59e0b);"></i>
                        </div>
                        <h3 style="font-family:var(--font-heading, 'Syne', sans-serif);font-size:1.3rem;color:var(--col-text, #2d3748);margin:0;">
                            ${type === 'system_closed' ? 'Sistema Cerrado' : 'Acceso Suspendido'}
                        </h3>
                        <p style="color:var(--col-text-2, #6b7280);font-size:.95rem;line-height:1.6;margin:0;">
                            ${type === 'system_closed'
                                ? 'El sistema se encuentra temporalmente cerrado por mantenimiento.'
                                : 'El acceso para tu escuela ha sido temporalmente suspendido.'
                            }
                        </p>
                        ${reason ? `
                            <div style="
                                background:var(--col-surface, #f9fafb);
                                border:1px solid var(--col-border, #e5e7eb);
                                border-radius:8px;
                                padding:1rem;
                                width:100%;
                                text-align:left;
                            ">
                                <strong style="font-size:.8rem;color:var(--col-text-3, #9ca3af);">Motivo:</strong>
                                <p style="margin:.25rem 0 0 0;font-size:.85rem;color:var(--col-text-2, #6b7280);">${escapeHtml(reason)}</p>
                            </div>
                        ` : ''}
                        <p style="font-size:.8rem;color:var(--col-text-3, #9ca3af);margin:0;">
                            <i class="fas fa-circle-info"></i>
                            Intenta nuevamente más tarde o contacta al administrador.
                        </p>
                    </div>
                </div>
                <div class="sa-modal__footer" style="justify-content:center;border-top:none;">
                    <button class="sa-btn sa-btn--primary" onclick="document.getElementById('systemClosedModal').remove()">
                        <i class="fas fa-check"></i> Entendido
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Cerrar con Escape
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            document.getElementById('systemClosedModal')?.remove();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// =============================================================================
// LOGIN HANDLER (COMPLETO - CON MANEJO DE SISTEMA CERRADO)
// =============================================================================

export async function handleLogin(e) {
    e.preventDefault();

    const usuarioOCorreo = document.getElementById('loginUsuario')?.value;
    if (!usuarioOCorreo) {
        showAlert('Por favor ingresa tu usuario o correo', 'error');
        return;
    }

    logAuthEvent('login_attempt', { usuario: usuarioOCorreo });

    const btn = document.getElementById('loginBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Iniciando...';
    }

    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // IMPORTANTE: para cookies
            body: JSON.stringify({
                usuarioOCorreo,
                password: document.getElementById('loginPassword')?.value || ''
            })
        });

        const data = await response.json();

        // ═══════════════════════════════════════════════════════════
        // MANEJO DE SISTEMA CERRADO (NUEVO)
        // ═══════════════════════════════════════════════════════════
        if (response.status === 503 && data.accessDenied) {
            logAuthEvent('login_failed', {
                usuario: usuarioOCorreo,
                motivo: data.type === 'system_closed' ? 'Sistema cerrado globalmente' : 'Escuela cerrada',
                reason: data.reason
            });

            showSystemClosedModal(data.type, data.reason);

            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Iniciar Sesión';
            }
            return;
        }
        // ═══════════════════════════════════════════════════════════

        if (data.success) {
            // ═════════════════════════════════════════════════════
            // GUARDAR TOKENS CORRECTAMENTE
            // ═════════════════════════════════════════════════════
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // Si es super admin, guardar token especial
            if (data.user.isSuperAdmin) {
                localStorage.setItem('superAdminToken', data.token);
                console.log('🛡️ Superadmin autenticado - Redirigiendo a panel especial');
                window.location.href = '/superadmin-dashboard.html';
            } else {
                // Asegurar que no quede superAdminToken residual
                localStorage.removeItem('superAdminToken');
                console.log('✅ Login exitoso → redirigiendo al dashboard principal');
                window.location.href = '/';
            }
        } else {
            logAuthEvent('login_failed', {
                usuario: usuarioOCorreo,
                motivo: data.message || 'Credenciales incorrectas'
            });

            showAlert(data.message || 'Error al iniciar sesión', 'error');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Iniciar Sesión';
            }
        }
    } catch (error) {
        console.error('Error en login:', error);

        logAuthEvent('login_failed', {
            usuario: usuarioOCorreo,
            motivo: 'Error de conexión'
        });

        showAlert('Error al conectar con el servidor', 'error');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Iniciar Sesión';
        }
    }
}

// =============================================================================
// REGISTRO HANDLER CON VALIDACIÓN COMPLETA
// =============================================================================

export async function handleRegister(e) {
    e.preventDefault();

    const usuarioInput = document.getElementById('registerUsuario');
    const correoInput = document.getElementById('registerCorreo');
    const passInput = document.getElementById('registerPassword');
    const confirmInput = document.getElementById('registerPasswordConfirm');

    const usuario = usuarioInput?.value?.trim() || '';
    const correo = correoInput?.value?.trim() || '';
    const password = passInput?.value || '';
    const confirmPassword = confirmInput?.value || '';

    // ── Validar todos los campos antes de enviar ──────────────────
    let hasErrors = false;
    let firstError = null;

    // 1. Usuario
    const uvResult = validateUsername(usuario);
    displayErrors(usuarioInput, uvResult.errors, 'username');
    if (!uvResult.isValid) { hasErrors = true; firstError = firstError || usuarioInput; }

    // 2. Correo
    const evResult = validateEmail(correo);
    displayErrors(correoInput, evResult.errors, 'email');
    if (!evResult.isValid) { hasErrors = true; firstError = firstError || correoInput; }

    // 3. Contraseña
    const pvResult = validatePassword(password);
    displayErrors(passInput, pvResult.errors, 'password');
    displayPasswordStrength(passInput, pvResult.strength);
    if (!pvResult.isValid) { hasErrors = true; firstError = firstError || passInput; }

    // 4. Confirmar contraseña
    const cvResult = validateConfirmPassword(password, confirmPassword);
    displayErrors(confirmInput, cvResult.errors, 'confirm-password');
    if (!cvResult.isValid) { hasErrors = true; firstError = firstError || confirmInput; }

    if (hasErrors) {
        firstError?.focus();
        logAuthEvent('register_failed', {
            usuario,
            correo,
            motivo: 'Validación del formulario falló'
        });
        return;
    }

    // ── Todo válido → enviar ──────────────────────────────────────
    logAuthEvent('register_attempt', { usuario, correo });

    const btn = document.getElementById('registerBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';
    }

    try {
        const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario, correo, password })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            logAuthEvent('register_success', { usuario: data.user.usuario });

            showAlert('Administrador registrado exitosamente', 'success');
            setTimeout(() => window.location.href = '/', 1500);
        } else {
            logAuthEvent('register_failed', {
                usuario,
                correo,
                motivo: data.message || 'Error en registro'
            });

            showAlert(data.message || 'Error al registrar', 'error');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-user-plus"></i> Registrar Administrador';
            }
        }
    } catch (error) {
        console.error('Error en registro:', error);

        logAuthEvent('register_failed', {
            usuario,
            correo,
            motivo: 'Error de conexión'
        });

        showAlert('Error al conectar con el servidor', 'error');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-user-plus"></i> Registrar Administrador';
        }
    }
}

// =============================================================================
// LOGOUT
// =============================================================================

export async function logout() {
    try {
        // Marcar que estamos cerrando sesión
        sessionStorage.setItem('loggingOut', 'true');
        
        const token = localStorage.getItem('token');
        const superAdminToken = localStorage.getItem('superAdminToken');
        
        // Limpiar localStorage INMEDIATAMENTE
        localStorage.removeItem('token');
        localStorage.removeItem('superAdminToken');
        localStorage.removeItem('user');
        
        // Llamar a los endpoints de logout en paralelo
        await Promise.allSettled([
            fetch(`${API_URL}/api/auth/logout`, { 
                method: 'POST', 
                credentials: 'include',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            }),
            fetch(`${API_URL}/api/superadmin/logout`, { 
                method: 'POST', 
                credentials: 'include',
                headers: superAdminToken ? { 'Authorization': `Bearer ${superAdminToken}` } : {}
            })
        ]);
        
    } catch (e) {
        console.error('Error en logout:', e);
    } finally {
        sessionStorage.removeItem('loggingOut');
        // Redirigir al login
        window.location.href = '/login.html';
    }
}

// =============================================================================
// VERIFICAR SESIÓN ACTIVA
// =============================================================================

export function checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    return !!(token && user);
}

// =============================================================================
// OBTENER USUARIO ACTUAL
// =============================================================================

export function getCurrentUser() {
    try {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
        return null;
    }
}

// =============================================================================
// INICIALIZACIÓN DEL MÓDULO
// =============================================================================

export function initializeAuth() {
    console.log('🔐 Inicializando módulo de autenticación...');

    const isLoginPage = window.location.pathname.includes('login.html');

    if (isLoginPage) {
        console.log('📍 Página de login detectada, configurando formularios...');

        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const showRegisterLink = document.getElementById('showRegisterFromLogin');
        const showLoginLink = document.getElementById('showLoginFromRegister');

        if (loginForm) loginForm.addEventListener('submit', handleLogin);
        if (registerForm) registerForm.addEventListener('submit', handleRegister);

        if (showRegisterLink) {
            showRegisterLink.addEventListener('click', e => {
                e.preventDefault();
                showRegisterForm();
            });
        }

        if (showLoginLink) {
            showLoginLink.addEventListener('click', e => {
                e.preventDefault();
                showLoginForm();
            });
        }

        // Configurar toggles de contraseña
        setupPasswordToggles();

        // Adjuntar validación en tiempo real al formulario de registro
        setupRegisterValidation();

        // Verificar si existe administrador
        checkAdminExists();
    } else {
        console.log('📍 No es página de login, omitiendo configuración de formularios');
    }

    // Botones de logout en cualquier página
    document.querySelectorAll('.logout-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            e.preventDefault();
            logout();
        });
    });

    console.log('✅ Módulo de autenticación inicializado');
}

// =============================================================================
// INICIALIZAR CUANDO EL DOM ESTÉ LISTO
// =============================================================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAuth);
} else {
    initializeAuth();
}

// =============================================================================
// EXPORTAR POR DEFECTO
// =============================================================================

export default {
    showAlert,
    togglePassword,
    checkAdminExists,
    showLoginForm,
    showRegisterForm,
    handleLogin,
    handleRegister,
    logout,
    checkAuth,
    getCurrentUser,
    initializeAuth
};