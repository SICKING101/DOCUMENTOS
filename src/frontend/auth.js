// src/frontend/auth.js
// Módulo ES6 para autenticación con auditoría básica

const API_URL = window.location.origin;

// =============================================================================
// FUNCIÓN SIMPLIFICADA DE AUDITORÍA
// =============================================================================

/**
 * Registrar eventos de autenticación en el frontend
 * Solo: login_attempt, login_success, login_failed, register_attempt, register_success, register_failed
 */
async function logAuthEvent(eventType, data = {}) {
    try {
        const eventData = {
            eventType,
            timestamp: new Date().toISOString(),
            ...data
        };

        // Mostrar en consola para debugging
        console.log(`📝 [AUDIT] ${eventType}:`, data);

        // Determinar si debe incluir token (solo después de login exitoso)
        const includeToken = eventType === 'login_success' || 
                             eventType === 'register_success' || 
                             (eventType.includes('success') && localStorage.getItem('token'));

        const headers = {
            'Content-Type': 'application/json'
        };

        // Solo agregar token si es necesario y existe
        if (includeToken) {
            const token = localStorage.getItem('token');
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        // Enviar al backend
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
        
        if (data.adminExists) {
            showLoginForm();
        } else {
            showRegisterForm();
        }
        
    } catch (error) {
        console.error('Error al verificar admin:', error);
        showAlert('Error al conectar con el servidor', 'error');
    }
}

// =============================================================================
// MOSTRAR FORMULARIOS
// =============================================================================

export function showLoginForm() {
    document.getElementById('authTitle').textContent = 'Iniciar Sesión';
    document.getElementById('authSubtitle').textContent = 'Accede al sistema de gestión';
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('registerForm').classList.add('hidden');
    
    const registerLink = document.getElementById('registerLinkContainer');
    if (registerLink) registerLink.style.display = 'none';
}

export function showRegisterForm() {
    document.getElementById('authTitle').textContent = 'Registrar Administrador';
    document.getElementById('authSubtitle').textContent = 'Crea la cuenta del primer administrador';
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.remove('hidden');
    
    const registerLink = document.getElementById('registerLinkContainer');
    if (registerLink) registerLink.style.display = 'block';
}

// =============================================================================
// ALTERNAR VISIBILIDAD DE CONTRASEÑA
// =============================================================================

export function setupPasswordToggles() {
    document.querySelectorAll('.password-toggle').forEach(toggle => {
        toggle.addEventListener('click', function() {
            const input = this.previousElementSibling;
            if (!input) return;
            
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
// LOGIN HANDLER CON AUDITORÍA SIMPLIFICADA
// =============================================================================

export async function handleLogin(e) {
    e.preventDefault();
    
    const usuarioOCorreo = document.getElementById('loginUsuario').value;
    
    // Registrar INTENTO de login
    logAuthEvent('login_attempt', { usuario: usuarioOCorreo });
    
    const btn = document.getElementById('loginBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Iniciando...';
    
    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                usuarioOCorreo,
                password: document.getElementById('loginPassword').value
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // Registrar LOGIN EXITOSO
            logAuthEvent('login_success', { 
                usuario: data.user.usuario
            });
            
            showAlert('Inicio de sesión exitoso', 'success');
            setTimeout(() => window.location.href = '/', 1500);
        } else {
            // Registrar LOGIN FALLIDO
            logAuthEvent('login_failed', { 
                usuario: usuarioOCorreo,
                motivo: data.message || 'Credenciales incorrectas'
            });
            
            showAlert(data.message || 'Error al iniciar sesión', 'error');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Iniciar Sesión';
        }
    } catch (error) {
        console.error('Error en login:', error);
        
        // Registrar ERROR DE CONEXIÓN como fallido
        logAuthEvent('login_failed', { 
            usuario: usuarioOCorreo,
            motivo: 'Error de conexión'
        });
        
        showAlert('Error al conectar con el servidor', 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Iniciar Sesión';
    }
}

// =============================================================================
// REGISTRO HANDLER CON AUDITORÍA SIMPLIFICADA
// =============================================================================

export async function handleRegister(e) {
    e.preventDefault();
    
    const usuario = document.getElementById('registerUsuario').value;
    const correo = document.getElementById('registerCorreo').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerPasswordConfirm').value;
    
    // Registrar INTENTO de registro
    logAuthEvent('register_attempt', { usuario, correo });
    
    if (password !== confirmPassword) {
        showAlert('Las contraseñas no coinciden', 'error');
        
        // Registrar REGISTRO FALLIDO por contraseñas
        logAuthEvent('register_failed', { 
            usuario, 
            correo,
            motivo: 'Las contraseñas no coinciden'
        });
        
        return;
    }
    
    const btn = document.getElementById('registerBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';
    
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
            
            // Registrar REGISTRO EXITOSO
            logAuthEvent('register_success', { 
                usuario: data.user.usuario
            });
            
            showAlert('Administrador registrado exitosamente', 'success');
            setTimeout(() => window.location.href = '/', 1500);
        } else {
            // Registrar REGISTRO FALLIDO
            logAuthEvent('register_failed', { 
                usuario, 
                correo,
                motivo: data.message || 'Error en registro'
            });
            
            showAlert(data.message || 'Error al registrar', 'error');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-user-plus"></i> Registrar Administrador';
        }
    } catch (error) {
        console.error('Error en registro:', error);
        
        // Registrar ERROR DE CONEXIÓN como fallido
        logAuthEvent('register_failed', { 
            usuario, 
            correo,
            motivo: 'Error de conexión'
        });
        
        showAlert('Error al conectar con el servidor', 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-user-plus"></i> Registrar Administrador';
    }
}

// =============================================================================
// LOGOUT
// =============================================================================

export async function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
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
    
    // Configurar eventos
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const showRegisterLink = document.getElementById('showRegisterFromLogin');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    if (showRegisterLink) {
        showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            showRegisterForm();
        });
    }
    
    // Configurar botones de logout
    document.querySelectorAll('.logout-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    });
    
    // Configurar toggles de contraseña
    setupPasswordToggles();
    
    // Verificar si existe administrador
    checkAdminExists();
    
    console.log('✅ Módulo de autenticación inicializado');
}

// =============================================================================
// INICIALIZAR CUANDO EL DOM ESTÉ LISTO
// =============================================================================

document.addEventListener('DOMContentLoaded', initializeAuth);

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