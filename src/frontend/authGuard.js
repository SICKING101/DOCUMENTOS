// authGuard.js - Protección de rutas y verificación de autenticación

const API_URL = window.location.origin;

/**
 * Verificar si el usuario está autenticado
 */
async function verificarAutenticacion() {
    const token = localStorage.getItem('token');
    
    if (!token) {
        redirigirALogin();
        return false;
    }

    try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!data.success) {
            if (data.expired) {
                mostrarMensajeSesionExpirada();
            }
            limpiarSesion();
            redirigirALogin();
            return false;
        }

        // Actualizar información del usuario en localStorage
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Actualizar UI del usuario
        actualizarUIUsuario(data.user);

        return true;
    } catch (error) {
        console.error('Error al verificar autenticación:', error);
        limpiarSesion();
        redirigirALogin();
        return false;
    }
}

/**
 * Redirigir al login
 */
function redirigirALogin() {
    if (window.location.pathname !== '/login.html') {
        window.location.href = '/login.html';
    }
}

/**
 * Limpiar sesión
 */
function limpiarSesion() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
}

/**
 * Mostrar mensaje de sesión expirada
 */
function mostrarMensajeSesionExpirada() {
    const mensaje = document.createElement('div');
    mensaje.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #f8d7da;
        color: #721c24;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    mensaje.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        Tu sesión ha expirado. Por favor inicia sesión nuevamente.
    `;
    document.body.appendChild(mensaje);

    setTimeout(() => {
        mensaje.remove();
    }, 3000);
}

/**
 * Actualizar UI del usuario en el sidebar
 */
function actualizarUIUsuario(user) {
    const userNameElement = document.querySelector('.sidebar__user-name');
    const userRoleElement = document.querySelector('.sidebar__user-role');

    if (userNameElement) {
        userNameElement.textContent = user.usuario;
    }

    if (userRoleElement) {
        userRoleElement.textContent = 'Administrador';
    }
}

/**
 * Cerrar sesión
 */
async function cerrarSesion() {
    try {
        const token = localStorage.getItem('token');
        
        await fetch(`${API_URL}/api/auth/logout`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        limpiarSesion();
        window.location.href = '/login.html';
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        limpiarSesion();
        window.location.href = '/login.html';
    }
}

/**
 * Configurar interceptor para todas las peticiones fetch
 */
const originalFetch = window.fetch;
window.fetch = async function(...args) {
    const token = localStorage.getItem('token');
    
    // Si es una petición a nuestra API y tenemos token, agregarlo
    if (args[0].includes('/api/') && token) {
        const options = args[1] || {};
        options.headers = options.headers || {};
        
        if (!options.headers['Authorization']) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }
        
        args[1] = options;
    }

    try {
        const response = await originalFetch(...args);
        
        // Si recibimos 401, la sesión expiró
        if (response.status === 401 && args[0].includes('/api/')) {
            const data = await response.clone().json();
            if (data.expired) {
                mostrarMensajeSesionExpirada();
                limpiarSesion();
                setTimeout(() => redirigirALogin(), 2000);
            }
        }
        
        return response;
    } catch (error) {
        throw error;
    }
};

// Verificar autenticación al cargar la página
if (window.location.pathname !== '/login.html') {
    verificarAutenticacion();
}

// Exportar funciones globales
window.cerrarSesion = cerrarSesion;
window.verificarAutenticacion = verificarAutenticacion;
