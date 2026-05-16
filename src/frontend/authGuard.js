// src/frontend/authGuard.js
// Protección de rutas, verificación de autenticación Y manejo de sistema cerrado

const API_URL = window.location.origin;

// ═══════════════════════════════════════════════════════════════
// FUNCIÓN PARA MOSTRAR MODAL DE SISTEMA CERRADO
// ═══════════════════════════════════════════════════════════════
function showSystemClosedModal(type, reason, closedAt) {
    // Verificar si ya existe un modal
    const existing = document.getElementById('systemClosedModal');
    if (existing) return; // Ya está mostrado, no duplicar

    const isGlobal = type === 'system_closed';
    
    const modalHTML = `
        <div class="sa-modal" id="systemClosedModal" style="display:flex;z-index:100000;">
            <div class="sa-modal__backdrop"></div>
            <div class="sa-modal__dialog" style="max-width:500px;text-align:center;">
                <div class="sa-modal__header" style="justify-content:center;border-bottom:none;">
                    <div style="
                        width:56px;height:56px;
                        border-radius:50%;
                        background:rgba(251,191,36,0.15);
                        border:2px solid rgba(251,191,36,0.3);
                        display:flex;align-items:center;justify-content:center;
                        margin:0 auto;
                    ">
                        <i class="fas fa-lock" style="font-size:1.5rem;color:#f59e0b;"></i>
                    </div>
                </div>
                <div class="sa-modal__body">
                    <div style="display:flex;flex-direction:column;align-items:center;gap:1rem;padding:0.5rem 0 1.5rem;">
                        <h3 style="font-family:'Syne',sans-serif;font-size:1.4rem;color:#1e293b;margin:0;">
                            ${isGlobal ? '🔒 Sistema Cerrado' : '🔒 Acceso Suspendido'}
                        </h3>
                        <p style="color:#64748b;font-size:0.95rem;line-height:1.6;margin:0;">
                            ${isGlobal 
                                ? 'El sistema se encuentra temporalmente cerrado por mantenimiento. Todos los usuarios y administradores han sido desconectados.'
                                : 'El acceso para tu escuela ha sido temporalmente suspendido por el Super Administrador.'
                            }
                        </p>
                        ${reason ? `
                            <div style="
                                background:#fffbeb;
                                border:1px solid #fde68a;
                                border-radius:10px;
                                padding:1rem 1.25rem;
                                width:100%;
                                text-align:left;
                            ">
                                <strong style="font-size:0.8rem;color:#92400e;display:block;margin-bottom:0.25rem;">
                                    <i class="fas fa-clipboard-list"></i> Motivo del cierre:
                                </strong>
                                <p style="margin:0;font-size:0.9rem;color:#78350f;line-height:1.5;">${escapeHtml(reason)}</p>
                                ${closedAt ? `
                                    <p style="margin:0.5rem 0 0 0;font-size:0.75rem;color:#a16207;">
                                        <i class="fas fa-clock"></i> Desde: ${new Date(closedAt).toLocaleString('es-MX')}
                                    </p>
                                ` : ''}
                            </div>
                        ` : ''}
                        <p style="font-size:0.8rem;color:#94a3b8;margin:0;">
                            <i class="fas fa-info-circle"></i>
                            Serás redirigido al inicio de sesión automáticamente.
                        </p>
                        <button class="sa-btn sa-btn--primary" onclick="window.forceLogoutSystemClosed()" style="margin-top:0.5rem;">
                            <i class="fas fa-sign-out-alt"></i> Ir al Inicio de Sesión
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.body.style.overflow = 'hidden';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Forzar logout cuando el sistema está cerrado
 */
window.forceLogoutSystemClosed = function() {
    // Limpiar todo
    localStorage.removeItem('token');
    localStorage.removeItem('superAdminToken');
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
    sessionStorage.removeItem('loggingOut');
    
    // Redirigir al login
    window.location.href = '/login.html';
};

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
        // Validación de Super Admin - SIEMPRE redirigir
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
        window.location.href = '/login.html';
    }
}

/**
 * Limpiar sesión
 */
function limpiarSesion() {
    const token = localStorage.getItem('token');
    const superAdminToken = localStorage.getItem('superAdminToken');
    
    localStorage.removeItem('token');
    localStorage.removeItem('superAdminToken');
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
    
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

    if (user?.rol) {
        localStorage.setItem('userRole', user.rol);
    }

    try {
        window.dispatchEvent(new CustomEvent('auth:user-updated', { detail: { user } }));
    } catch (e) {
        // no-op
    }
}

/**
 * Cerrar sesión
 */
async function cerrarSesion() {
    try {
        const token = localStorage.getItem('token');
        const superAdminToken = localStorage.getItem('superAdminToken');
        
        sessionStorage.setItem('loggingOut', 'true');
        
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
        
        window.location.href = '/login.html';
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        limpiarSesion();
        sessionStorage.removeItem('loggingOut');
        window.location.href = '/login.html';
    }
}

// ═══════════════════════════════════════════════════════════════
// INTERCEPTOR FETCH - MEJORADO CON MANEJO DE 503
// ═══════════════════════════════════════════════════════════════
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
        
        // ═══════════════════════════════════════════════════════════
        // MANEJAR RESPUESTA 503 - SISTEMA CERRADO
        // ═══════════════════════════════════════════════════════════
        if (response.status === 503 && args[0].includes('/api/')) {
            const clonedResponse = response.clone();
            const data = await clonedResponse.json().catch(() => ({}));
            
            if (data.accessDenied) {
                console.log('🚫 [AuthGuard] Sistema cerrado detectado:', data.type, data.reason);
                
                // Mostrar modal
                showSystemClosedModal(data.type, data.reason, data.closedAt);
                
                // Limpiar sesión después de mostrar el modal
                setTimeout(() => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('superAdminToken');
                    localStorage.removeItem('user');
                    localStorage.removeItem('userRole');
                }, 1000);
                
                // Detener cualquier otra ejecución
                // Lanzar error especial para que los catch lo manejen
                const error = new Error('SISTEMA_CERRADO');
                error.systemClosed = true;
                error.data = data;
                throw error;
            }
        }
        // ═══════════════════════════════════════════════════════════
        
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
        // Si es un error de sistema cerrado, propagarlo
        if (error.systemClosed) {
            throw error;
        }
        throw error;
    }
};

// ═══════════════════════════════════════════════════════════════
// INTERCEPTOR GLOBAL DE ERRORES PARA TODAS LAS PROMESAS
// ═══════════════════════════════════════════════════════════════
window.addEventListener('unhandledrejection', function(event) {
    if (event.reason && event.reason.systemClosed) {
        console.log('🛑 [AuthGuard] Error de sistema cerrado capturado globalmente');
        event.preventDefault(); // Evitar que se muestre en consola como error
    }
});

// Verificar autenticación al cargar la página
if (window.location.pathname !== '/login.html' && 
    !window.location.pathname.includes('forgot-password') &&
    !sessionStorage.getItem('loggingOut')) {
    verificarAutenticacion();
}

// Exportar funciones globales
window.cerrarSesion = cerrarSesion;
window.verificarAutenticacion = verificarAutenticacion;