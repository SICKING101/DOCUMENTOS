// src/frontend/auth.js
// Módulo ES6 para autenticación

const API_URL = window.location.origin;

// Exportar funciones principales que necesiten ser accesibles globalmente
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
            button.classList.remove('fa-eye');
            button.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            button.classList.remove('fa-eye-slash');
            button.classList.add('fa-eye');
        }
    }
}

// Verificar si ya existe un administrador
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

// Mostrar formularios
export function showLoginForm() {
    document.getElementById('authTitle').textContent = 'Iniciar Sesión';
    document.getElementById('authSubtitle').textContent = 'Accede al sistema de gestión';
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('registerForm').classList.add('hidden');
    
    // Ocultar enlace de registro cuando ya hay admin
    const registerLink = document.getElementById('registerLinkContainer');
    if (registerLink) registerLink.style.display = 'none';
}

export function showRegisterForm() {
    document.getElementById('authTitle').textContent = 'Registrar Administrador';
    document.getElementById('authSubtitle').textContent = 'Crea la cuenta del primer administrador';
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.remove('hidden');
    
    // Mostrar enlace de registro solo cuando NO hay admin
    const registerLink = document.getElementById('registerLinkContainer');
    if (registerLink) registerLink.style.display = 'block';
}

// Alternar visibilidad de contraseña
export function setupPasswordToggles() {
    document.querySelectorAll('.password-toggle').forEach(toggle => {
        toggle.addEventListener('click', function() {
            const input = this.previousElementSibling;
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    });
}

// Login handler
export async function handleLogin(e) {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Iniciando...';
    
    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                usuarioOCorreo: document.getElementById('loginUsuario').value,
                password: document.getElementById('loginPassword').value
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            showAlert('Inicio de sesión exitoso', 'success');
            setTimeout(() => window.location.href = '/', 1500);
        } else {
            showAlert(data.message || 'Error al iniciar sesión', 'error');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Iniciar Sesión';
        }
    } catch (error) {
        console.error('Error en login:', error);
        showAlert('Error al iniciar sesión', 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Iniciar Sesión';
    }
}

// Registro handler
export async function handleRegister(e) {
    e.preventDefault();
    const btn = document.getElementById('registerBtn');
    
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerPasswordConfirm').value;
    
    if (password !== confirmPassword) {
        showAlert('Las contraseñas no coinciden', 'error');
        return;
    }
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';
    
    try {
        const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                usuario: document.getElementById('registerUsuario').value,
                correo: document.getElementById('registerCorreo').value,
                password: password
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            showAlert('Administrador registrado exitosamente', 'success');
            setTimeout(() => window.location.href = '/', 1500);
        } else {
            showAlert(data.message || 'Error al registrar', 'error');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-user-plus"></i> Registrar Administrador';
        }
    } catch (error) {
        console.error('Error en registro:', error);
        showAlert('Error al registrar', 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-user-plus"></i> Registrar Administrador';
    }
}

// Inicialización del módulo
export function initializeAuth() {
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
    
    // Configurar toggles de contraseña
    setupPasswordToggles();
    
    // Verificar si existe administrador
    checkAdminExists();
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initializeAuth);

// Exportar por defecto en dado caso que se necesite en otros módulos (opcional eh)
export default {
    showAlert,
    togglePassword,
    checkAdminExists,
    showLoginForm,
    showRegisterForm,
    handleLogin,
    handleRegister,
    initializeAuth
};