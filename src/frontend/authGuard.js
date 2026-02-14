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

        // ✅ Guardar usuario en variable
        const user = data.user;
        
        // Actualizar información del usuario en localStorage
        localStorage.setItem('user', JSON.stringify(user));
        
        // Actualizar UI del usuario
        actualizarUIUsuario(user);
        
        // ✅ AHORA SÍ: user está definido aquí
        if (user.rol === 'administrador') {
            verificarUnicoAdmin(user);
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
 * Verificar si es el único administrador
 */
async function verificarUnicoAdmin(user) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/admin/verify-admin-change`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        // Si la ruta no existe (404), ignorar silenciosamente
        if (response.status === 404) {
            console.log('ℹ️ API de verificación de admin no disponible');
            return;
        }
        
        const data = await response.json();
        
        if (data.success && !data.puedeCambiar) {
            console.warn('⚠️ Ya existe otro administrador activo');
            // Opcional: mostrar advertencia
            mostrarAdvertenciaAdminDuplicado();
        }
    } catch (error) {
        // Ignorar errores de red/API
        console.log('ℹ️ No se pudo verificar unicidad de admin:', error.message);
    }
}

/**
 * Mostrar advertencia de admin duplicado
 */
function mostrarAdvertenciaAdminDuplicado() {
    // Crear elemento de advertencia
    const warning = document.createElement('div');
    warning.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #fff3cd;
        color: #856404;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        border-left: 4px solid #ffc107;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        max-width: 400px;
    `;
    warning.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-exclamation-triangle" style="font-size: 20px;"></i>
            <div>
                <strong style="display: block; margin-bottom: 5px;">Advertencia de Seguridad</strong>
                <span>Ya existe otro administrador activo en el sistema. Solo debe haber UN administrador.</span>
            </div>
        </div>
        <button style="
            position: absolute;
            top: 10px;
            right: 10px;
            background: none;
            border: none;
            color: #856404;
            cursor: pointer;
            font-size: 16px;
        " onclick="this.parentElement.remove()">×</button>
    `;
    
    document.body.appendChild(warning);
    
    // Auto-cerrar después de 10 segundos
    setTimeout(() => {
        if (warning.parentElement) {
            warning.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => warning.remove(), 300);
        }
    }, 10000);
}

/**
 * Redirigir al login
 */
function redirigirALogin() {
    if (window.location.pathname !== '/login.html' && 
        window.location.pathname !== '/admin-panel.html' &&
        !window.location.pathname.includes('reset-password') &&
        !window.location.pathname.includes('forgot-password')) {
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
    const userEmailElement = document.getElementById('userEmail');

    if (userNameElement) {
        userNameElement.textContent = user.usuario || 'Usuario';
    }

    if (userRoleElement) {
        userRoleElement.textContent = user.rol === 'administrador' ? 'Administrador' : 'Usuario';
    }
    
    if (userEmailElement) {
        userEmailElement.textContent = user.correo || '';
    }
    
    // Mostrar/ocultar opciones según rol
    mostrarOpcionesPorRol(user);
}

/**
 * Mostrar u ocultar opciones del menú según el rol
 */
function mostrarOpcionesPorRol(user) {
    // Opciones solo para admin
    const adminOptions = [
        document.getElementById('changeAdminBtn'),
        document.getElementById('adminPanelBtn')
    ];
    
    adminOptions.forEach(btn => {
        if (btn) {
            if (user.rol === 'administrador') {
                btn.style.display = 'flex';
            } else {
                btn.style.display = 'none';
            }
        }
    });
    
    // También podemos ocultar/mostrar secciones del sidebar
    const reportesLink = document.getElementById('sidebarReportesLink');
    if (reportesLink) {
        // Los reportes podrían ser solo para admin
        if (user.rol !== 'administrador' && !user.permisos?.includes('ver_reportes')) {
            reportesLink.style.display = 'none';
        }
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
    if (typeof args[0] === 'string' && args[0].includes('/api/') && token) {
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
        if (response.status === 401 && typeof args[0] === 'string' && args[0].includes('/api/')) {
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

// ============================================
// INICIALIZACIÓN
// ============================================

// Verificar autenticación al cargar la página
if (window.location.pathname !== '/login.html' && 
    window.location.pathname !== '/forgot-password.html' &&
    window.location.pathname !== '/reset-password.html' &&
    !window.location.pathname.includes('verify-admin')) {
    
    // Ejecutar verificación
    verificarAutenticacion();
}

// También verificar cuando la página ya está cargada
document.addEventListener('DOMContentLoaded', () => {
    // Si hay un usuario en localStorage, actualizar UI
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            actualizarUIUsuario(user);
        } catch (e) {
            console.error('Error parseando usuario:', e);
        }
    }
});

// Exponer funciones globales
window.cerrarSesion = cerrarSesion;
window.verificarAutenticacion = verificarAutenticacion;

console.log('✅ authGuard.js cargado correctamente');