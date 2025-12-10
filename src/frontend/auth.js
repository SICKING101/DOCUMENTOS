// auth.js - Manejo de autenticación en el frontend
const API_URL = window.location.origin;

// Verificar si ya existe un administrador
async function checkAdminExists() {
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
function showLoginForm() {
    document.getElementById('authTitle').textContent = 'Iniciar Sesión';
    document.getElementById('authSubtitle').textContent = 'Accede al sistema de gestión';
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('registerForm').classList.add('hidden');
    document.getElementById('forgotPasswordForm').classList.add('hidden');
    // Ocultar enlace de registro cuando ya hay admin
    const registerLink = document.getElementById('registerLinkContainer');
    if (registerLink) registerLink.style.display = 'none';
}

function showRegisterForm() {
    document.getElementById('authTitle').textContent = 'Registrar Administrador';
    document.getElementById('authSubtitle').textContent = 'Crea la cuenta del primer administrador';
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.remove('hidden');
    document.getElementById('forgotPasswordForm').classList.add('hidden');
    // Mostrar enlace de registro solo cuando NO hay admin
    const registerLink = document.getElementById('registerLinkContainer');
    if (registerLink) registerLink.style.display = 'block';
}

function showForgotPasswordForm() {
    document.getElementById('authTitle').textContent = 'Recuperar Contraseña';
    document.getElementById('authSubtitle').textContent = 'Te enviaremos un enlace a tu correo';
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.add('hidden');
    document.getElementById('forgotPasswordForm').classList.remove('hidden');
}

// Mostrar alertas
function showAlert(message, type = 'success') {
    const container = document.getElementById('alertContainer');
    container.innerHTML = `
        <div class="alert alert-${type}">
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            ${message}
        </div>
    `;
    setTimeout(() => container.innerHTML = '', 5000);
}

// Alternar visibilidad de contraseña
function setupPasswordToggles() {
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

// Login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    btn.disabled = true;
    
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
        }
    } catch (error) {
        showAlert('Error al iniciar sesión', 'error');
    } finally {
        btn.disabled = false;
    }
});

// Registro
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('registerBtn');
    
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerPasswordConfirm').value;
    
    if (password !== confirmPassword) {
        showAlert('Las contraseñas no coinciden', 'error');
        return;
    }
    
    btn.disabled = true;
    
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
        }
    } catch (error) {
        showAlert('Error al registrar', 'error');
    } finally {
        btn.disabled = false;
    }
});

// Recuperación de contraseña
document.getElementById('forgotPasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('forgotBtn');
    btn.disabled = true;
    
    try {
        const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                correo: document.getElementById('forgotEmail').value
            })
        });
        
        const data = await response.json();
        showAlert(data.message, data.success ? 'success' : 'error');
        
        if (data.success) {
            setTimeout(showLoginForm, 3000);
        }
    } catch (error) {
        showAlert('Error al enviar correo', 'error');
    } finally {
        btn.disabled = false;
    }
});

// Event listeners
document.getElementById('showForgotPassword').addEventListener('click', (e) => {
    e.preventDefault();
    showForgotPasswordForm();
});

document.getElementById('backToLogin').addEventListener('click', (e) => {
    e.preventDefault();
    showLoginForm();
});

document.getElementById('showRegisterFromLogin')?.addEventListener('click', (e) => {
    e.preventDefault();
    showRegisterForm();
});

// Inicializar
setupPasswordToggles();
checkAdminExists();
