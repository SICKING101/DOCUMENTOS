// authGuard.js - Protección de rutas y verificación de autenticación

const API_URL = window.location.origin;

/**
 * Verificar si el usuario está autenticado
 */
async function verificarAutenticacion() {
    const token = localStorage.getItem('token');
    const superAdminToken = localStorage.getItem('superAdminToken');
    
    // Usar el token que exista (prioridad al super admin)
    const activeToken = superAdminToken || token;
    
    if (!activeToken) {
        redirigirALogin();
        return false;
    }

    try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
            headers: {
                'Authorization': `Bearer ${activeToken}`
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

        // ═══════════════════════════════════════════════════════════
        // NUEVO: Validación de Super Admin - SIEMPRE redirigir
        // ═══════════════════════════════════════════════════════════
        const isSuperAdmin = data.user?.isSuperAdmin || data.user?.rol === 'superadmin';
        const currentPage = window.location.pathname;
        const isClientView = currentPage === '/' || currentPage.includes('index.html');
        const isSuperAdminView = currentPage.includes('superadmin-dashboard.html');
        const isLoginPage = currentPage.includes('login.html');
        
        // Si es super admin y NO está en su vista → redirigir
        if (isSuperAdmin && !isLoginPage && !isSuperAdminView) {
            console.log('🛡️ SuperAdmin detectado en vista incorrecta → redirigiendo a superadmin-dashboard.html');
            window.location.href = '/superadmin-dashboard.html';
            return false;
        }
        
        // Si NO es super admin pero está en la vista de super admin → redirigir al cliente
        if (!isSuperAdmin && isSuperAdminView) {
            console.log('⚠️ Usuario normal en vista superadmin → redirigiendo a index.html');
            window.location.href = '/';
            return false;
        }

        // Actualizar información del usuario en localStorage
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Actualizar UI del usuario (solo en vista cliente)
        if (!isSuperAdminView) {
            actualizarUIUsuario(data.user);
        }

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
        // Limpiar cualquier parámetro de redirección
        window.location.href = '/login.html';
    }
}

/**
 * Limpiar sesión - VERSIÓN MEJORADA
 */
function limpiarSesion() {
    // Guardar temporalmente para la limpieza asíncrona
    const token = localStorage.getItem('token');
    const superAdminToken = localStorage.getItem('superAdminToken');
    
    // Limpiar localStorage INMEDIATAMENTE
    localStorage.removeItem('token');
    localStorage.removeItem('superAdminToken');
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
    
    // Limpiar cookies mediante fetch (en paralelo para evitar race conditions)
    Promise.allSettled([
        fetch('/api/auth/logout', { 
            method: 'POST', 
            credentials: 'include',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        }).catch(() => {}),
        fetch('/api/superadmin/logout', { 
            method: 'POST', 
            credentials: 'include',
            headers: superAdminToken ? { 'Authorization': `Bearer ${superAdminToken}` } : {}
        }).catch(() => {})
    ]);
}

/**
 * Mostrar mensaje de sesión expirada
 */
function mostrarMensajeSesionExpirada() {
    // Verificar que no exista ya un mensaje
    if (document.querySelector('.session-expired-message')) return;
    
    const mensaje = document.createElement('div');
    mensaje.className = 'session-expired-message';
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
        const roleLabels = {
            superadmin: 'Super Admin',
            administrador: 'Administrador',
            editor: 'Editor',
            revisor: 'Revisor',
            lector: 'Lector',
            moderador: 'Moderador',
            usuario: 'Usuario',
            desactivado: 'Desactivado'
        };
        userRoleElement.textContent = roleLabels[user.rol] || user.rol || 'Usuario';
    }

    // Guardar rol para control de UI en otros módulos
    if (user?.rol) {
        localStorage.setItem('userRole', user.rol);
    }

    // Notificar a la app (mismo tab) que el usuario/rol fue actualizado
    try {
        window.dispatchEvent(new CustomEvent('auth:user-updated', { detail: { user } }));
    } catch (e) {
        // no-op
    }
}

/**
 * Cerrar sesión - VERSIÓN MEJORADA
 */
async function cerrarSesion() {
    try {
        const token = localStorage.getItem('token');
        const superAdminToken = localStorage.getItem('superAdminToken');
        
        // Marcar que estamos cerrando sesión para evitar redirecciones intermedias
        sessionStorage.setItem('loggingOut', 'true');
        
        // Limpiar todo en paralelo
        await Promise.allSettled([
            fetch(`${API_URL}/api/auth/logout`, {
                method: 'POST',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                credentials: 'include'
            }),
            fetch(`${API_URL}/api/superadmin/logout`, {
                method: 'POST',
                headers: superAdminToken ? { 'Authorization': `Bearer ${superAdminToken}` } : {},
                credentials: 'include'
            })
        ]);

        limpiarSesion();
        sessionStorage.removeItem('loggingOut');
        
        // Redirigir al login
        window.location.href = '/login.html';
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        limpiarSesion();
        sessionStorage.removeItem('loggingOut');
        window.location.href = '/login.html';
    }
}

/**
 * Configurar interceptor para todas las peticiones fetch - MEJORADO
 */
const originalFetch = window.fetch;
window.fetch = async function(...args) {
    const token = localStorage.getItem('token');
    const superAdminToken = localStorage.getItem('superAdminToken');
    const activeToken = superAdminToken || token;
    
    // Si es una petición a nuestra API y tenemos token, agregarlo
    if (args[0].includes('/api/') && activeToken) {
        const options = args[1] || {};
        options.headers = options.headers || {};
        
        if (!options.headers['Authorization']) {
            options.headers['Authorization'] = `Bearer ${activeToken}`;
        }
        
        args[1] = options;
    }

    try {
        const response = await originalFetch(...args);
        
        // Si recibimos 401 y NO estamos cerrando sesión, la sesión expiró
        if (response.status === 401 && 
            args[0].includes('/api/') && 
            !sessionStorage.getItem('loggingOut')) {
            const data = await response.clone().json().catch(() => ({}));
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

// Verificar autenticación al cargar la página (incluye superadmin-dashboard.html)
if (window.location.pathname !== '/login.html' && 
    !window.location.pathname.includes('forgot-password') &&
    !sessionStorage.getItem('loggingOut')) {
    verificarAutenticacion();
}

// Exportar funciones globales
window.cerrarSesion = cerrarSesion;
window.verificarAutenticacion = verificarAutenticacion;