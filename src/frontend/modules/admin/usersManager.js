// ============================================================================
// src/frontend/modules/admin/usersManager.js
// ============================================================================
// GESTIÓN DE USUARIOS Y PERMISOS - VERSIÓN CORREGIDA CON VALIDACIONES MEJORADAS
// ============================================================================

const API_URL = window.location.origin;

// ============================================================================
// CONFIGURACIÓN DE PERMISOS
// ============================================================================

const PERMISOS_DISPONIBLES = [
    // Dashboard
    { id: 'ver_dashboard', nombre: 'Ver Dashboard', categoria: 'Dashboard' },
    
    // Personas
    { id: 'ver_personas', nombre: 'Ver Personas', categoria: 'Personas' },
    { id: 'crear_personas', nombre: 'Crear Personas', categoria: 'Personas' },
    { id: 'editar_personas', nombre: 'Editar Personas', categoria: 'Personas' },
    { id: 'eliminar_personas', nombre: 'Eliminar Personas', categoria: 'Personas' },
    
    // Documentos
    { id: 'ver_documentos', nombre: 'Ver Documentos', categoria: 'Documentos' },
    { id: 'subir_documentos', nombre: 'Subir Documentos', categoria: 'Documentos' },
    { id: 'editar_documentos', nombre: 'Editar Documentos', categoria: 'Documentos' },
    { id: 'eliminar_documentos', nombre: 'Eliminar Documentos', categoria: 'Documentos' },
    { id: 'descargar_documentos', nombre: 'Descargar Documentos', categoria: 'Documentos' },
    
    // Categorías
    { id: 'ver_categorias', nombre: 'Ver Categorías', categoria: 'Categorías' },
    { id: 'crear_categorias', nombre: 'Crear Categorías', categoria: 'Categorías' },
    { id: 'editar_categorias', nombre: 'Editar Categorías', categoria: 'Categorías' },
    { id: 'eliminar_categorias', nombre: 'Eliminar Categorías', categoria: 'Categorías' },
    
    // Departamentos
    { id: 'ver_departamentos', nombre: 'Ver Departamentos', categoria: 'Departamentos' },
    { id: 'crear_departamentos', nombre: 'Crear Departamentos', categoria: 'Departamentos' },
    { id: 'editar_departamentos', nombre: 'Editar Departamentos', categoria: 'Departamentos' },
    { id: 'eliminar_departamentos', nombre: 'Eliminar Departamentos', categoria: 'Departamentos' },
    
    // Tareas
    { id: 'ver_tareas', nombre: 'Ver Tareas', categoria: 'Tareas' },
    { id: 'crear_tareas', nombre: 'Crear Tareas', categoria: 'Tareas' },
    { id: 'editar_tareas', nombre: 'Editar Tareas', categoria: 'Tareas' },
    { id: 'eliminar_tareas', nombre: 'Eliminar Tareas', categoria: 'Tareas' },
    { id: 'asignar_tareas', nombre: 'Asignar Tareas', categoria: 'Tareas' },
    
    // Reportes
    { id: 'ver_reportes', nombre: 'Ver Reportes', categoria: 'Reportes' },
    { id: 'generar_reportes', nombre: 'Generar Reportes', categoria: 'Reportes' },
    { id: 'exportar_reportes', nombre: 'Exportar Reportes', categoria: 'Reportes' },
    
    // Calendario
    { id: 'ver_calendario', nombre: 'Ver Calendario', categoria: 'Calendario' },
    { id: 'crear_eventos', nombre: 'Crear Eventos', categoria: 'Calendario' },
    { id: 'editar_eventos', nombre: 'Editar Eventos', categoria: 'Calendario' },
    { id: 'eliminar_eventos', nombre: 'Eliminar Eventos', categoria: 'Calendario' },
    
    // Historial
    { id: 'ver_historial', nombre: 'Ver Historial', categoria: 'Historial' },
    { id: 'exportar_historial', nombre: 'Exportar Historial', categoria: 'Historial' },
    
    // Soporte
    { id: 'ver_soporte', nombre: 'Ver Soporte', categoria: 'Soporte' },
    { id: 'crear_tickets', nombre: 'Crear Tickets', categoria: 'Soporte' },
    { id: 'responder_tickets', nombre: 'Responder Tickets', categoria: 'Soporte' },
    { id: 'cerrar_tickets', nombre: 'Cerrar Tickets', categoria: 'Soporte' },
    
    // Papelera
    { id: 'ver_papelera', nombre: 'Ver Papelera', categoria: 'Papelera' },
    { id: 'restaurar_documentos', nombre: 'Restaurar Documentos', categoria: 'Papelera' },
    { id: 'vaciar_papelera', nombre: 'Vaciar Papelera', categoria: 'Papelera' },
    
    // Administración
    { id: 'ver_usuarios', nombre: 'Ver Usuarios', categoria: 'Administración' },
    { id: 'crear_usuarios', nombre: 'Crear Usuarios', categoria: 'Administración' },
    { id: 'editar_usuarios', nombre: 'Editar Usuarios', categoria: 'Administración' },
    { id: 'eliminar_usuarios', nombre: 'Eliminar Usuarios', categoria: 'Administración' },
    { id: 'ver_roles', nombre: 'Ver Roles', categoria: 'Administración' },
    { id: 'crear_roles', nombre: 'Crear Roles', categoria: 'Administración' },
    { id: 'editar_roles', nombre: 'Editar Roles', categoria: 'Administración' },
    { id: 'eliminar_roles', nombre: 'Eliminar Roles', categoria: 'Administración' }
];

// ============================================================================
// ESTADO GLOBAL
// ============================================================================

let usuarios = [];
let roles = [];
let auditLogs = [];
let esAdminUnico = false;

// ============================================================================
// INICIALIZACIÓN
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Inicializando panel de administración...');
    
    try {
        // Verificar autenticación
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login.html';
            return;
        }
        
        // Verificar si es admin único
        await verificarAdminUnico();
        
        // Inicializar componentes
        inicializarSidebar();
        inicializarTabs();
        configurarEventos();
        actualizarFechaHora();
        
        // Configurar alerta de salida al dashboard
        configurarDashboardLink();
        
        // Cargar datos
        await Promise.all([
            cargarUsuarios(),
            cargarRoles(),
            cargarAuditLogs()
        ]);
        
        console.log('✅ Panel inicializado correctamente');
        
    } catch (error) {
        console.error('Error en inicialización:', error);
        mostrarError('Error al cargar el panel');
    }
});

/**
 * Configurar el enlace al dashboard con confirmación
 */
function configurarDashboardLink() {
    const dashboardLink = document.getElementById('dashboardLink');
    const dashboardModal = document.getElementById('dashboardConfirmModal');
    const closeModalBtn = document.getElementById('closeDashboardConfirmModal');
    const cancelBtn = document.getElementById('cancelDashboardBtn');
    const confirmBtn = document.getElementById('confirmDashboardBtn');
    
    if (dashboardLink) {
        dashboardLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (dashboardModal) dashboardModal.showModal();
        });
    }
    
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            if (dashboardModal) dashboardModal.close();
        });
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            if (dashboardModal) dashboardModal.close();
        });
    }
    
    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            window.location.href = '/';
        });
    }
}

/**
 * Verificar si el usuario actual es el admin único
 */
async function verificarAdminUnico() {
    try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            esAdminUnico = user.rol === 'administrador';
            
            // Mostrar nombre en sidebar
            const adminNameEl = document.getElementById('adminName');
            const adminAvatarEl = document.getElementById('adminAvatar');
            
            if (adminNameEl) adminNameEl.textContent = user.usuario || 'Administrador';
            if (adminAvatarEl) adminAvatarEl.textContent = (user.usuario || 'A').charAt(0).toUpperCase();
            
            // Si no es admin, redirigir
            if (!esAdminUnico) {
                mostrarError('No tienes permisos de administrador');
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
            }
        }
    } catch (error) {
        console.error('Error verificando admin:', error);
    }
}

function inicializarSidebar() {
    const sidebar = document.getElementById('adminSidebar');
    const toggleBtn = document.getElementById('sidebarToggle');
    
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
        });
        
        // Recuperar estado guardado
        const collapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        if (collapsed) {
            sidebar.classList.add('collapsed');
        }
    }
}

function actualizarFechaHora() {
    const updateDateTime = () => {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        const dateTimeEl = document.getElementById('currentDateTime');
        if (dateTimeEl) {
            dateTimeEl.textContent = now.toLocaleDateString('es-MX', options).replace(',', '');
        }
    };
    
    updateDateTime();
    setInterval(updateDateTime, 60000);
}

// ============================================================================
// CONFIGURACIÓN DE TABS
// ============================================================================

function inicializarTabs() {
    const navItems = document.querySelectorAll('.admin-panel-nav-item[data-tab]');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = item.dataset.tab;
            
            // Actualizar navegación
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Actualizar paneles
            document.querySelectorAll('.admin-panel-tab-pane').forEach(pane => {
                pane.classList.remove('active');
            });
            
            const targetPane = document.getElementById(`${tabId}Pane`);
            if (targetPane) targetPane.classList.add('active');
            
            // Cargar contenido específico si es necesario
            if (tabId === 'permissions') {
                mostrarTodosPermisos();
            }
        });
    });
}

// ============================================================================
// CONFIGURACIÓN DE EVENTOS
// ============================================================================

function configurarEventos() {
    // Búsqueda de usuarios
    const searchUsers = document.getElementById('searchUsers');
    if (searchUsers) {
        searchUsers.addEventListener('input', filtrarUsuarios);
    }
    
    // Filtros de usuarios
    const roleFilter = document.getElementById('roleFilter');
    const statusFilter = document.getElementById('statusFilter');
    if (roleFilter) roleFilter.addEventListener('change', filtrarUsuarios);
    if (statusFilter) statusFilter.addEventListener('change', filtrarUsuarios);
    
    // Búsqueda de roles
    const searchRoles = document.getElementById('searchRoles');
    if (searchRoles) {
        searchRoles.addEventListener('input', filtrarRoles);
    }
    
    // Botón crear usuario
    const createUserBtn = document.getElementById('createUserBtn');
    if (createUserBtn) {
        createUserBtn.addEventListener('click', () => abrirModalUsuario());
    }
    
    // Botón crear rol
    const createRoleBtn = document.getElementById('createRoleBtn');
    if (createRoleBtn) {
        createRoleBtn.addEventListener('click', () => abrirModalRol());
    }
    
    // Botón refresh
    const refreshBtn = document.getElementById('refreshData');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', recargarDatos);
    }
    
    // Botón fullscreen
    const fullscreenBtn = document.getElementById('fullscreenToggle');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', toggleFullscreen);
    }
    
    // Modal de usuario
    document.getElementById('closeUserModal')?.addEventListener('click', cerrarModalUsuario);
    document.getElementById('cancelUserBtn')?.addEventListener('click', cerrarModalUsuario);
    document.getElementById('saveUserBtn')?.addEventListener('click', guardarUsuario);
    
    // Modal de rol
    document.getElementById('closeRoleModal')?.addEventListener('click', cerrarModalRol);
    document.getElementById('cancelRoleBtn')?.addEventListener('click', cerrarModalRol);
    document.getElementById('saveRoleBtn')?.addEventListener('click', guardarRol);
    
    // Modal de confirmación
    document.getElementById('closeConfirmModal')?.addEventListener('click', cerrarConfirmModal);
    document.getElementById('cancelConfirmBtn')?.addEventListener('click', cerrarConfirmModal);
    
    // Cerrar modales con ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('dialog[open]').forEach(dialog => {
                dialog.close();
            });
        }
    });
    
    // Global search
    const globalSearch = document.getElementById('globalSearch');
    if (globalSearch) {
        globalSearch.addEventListener('input', (e) => {
            const term = e.target.value;
            // Determinar pestaña activa y buscar
            const activeTab = document.querySelector('.admin-panel-tab-pane.active')?.id;
            if (activeTab === 'usersPane') {
                const searchUsers = document.getElementById('searchUsers');
                if (searchUsers) {
                    searchUsers.value = term;
                    filtrarUsuarios();
                }
            } else if (activeTab === 'rolesPane') {
                const searchRoles = document.getElementById('searchRoles');
                if (searchRoles) {
                    searchRoles.value = term;
                    filtrarRoles();
                }
            }
        });
    }
}

async function recargarDatos() {
    mostrarNotificacion('Actualizando datos...', 'info');
    await Promise.all([
        cargarUsuarios(),
        cargarRoles(),
        cargarAuditLogs()
    ]);
    mostrarExito('Datos actualizados');
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
        const fullscreenBtn = document.getElementById('fullscreenToggle');
        if (fullscreenBtn) fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
            const fullscreenBtn = document.getElementById('fullscreenToggle');
            if (fullscreenBtn) fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
        }
    }
}

// ============================================================================
// NOTIFICACIONES
// ============================================================================

function mostrarNotificacion(mensaje, tipo = 'info', titulo = '') {
    const container = document.getElementById('notificationContainer');
    if (!container) return;
    
    const id = 'notif_' + Date.now();
    const titulos = {
        success: 'Éxito',
        error: 'Error',
        warning: 'Advertencia',
        info: 'Información'
    };
    
    const notif = document.createElement('div');
    notif.className = `admin-panel-notification ${tipo}`;
    notif.id = id;
    notif.innerHTML = `
        <div class="admin-panel-notification-icon">
            <i class="fas fa-${tipo === 'success' ? 'check-circle' : tipo === 'error' ? 'exclamation-circle' : tipo === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
        </div>
        <div class="admin-panel-notification-content">
            <div class="admin-panel-notification-title">${titulo || titulos[tipo]}</div>
            <div class="admin-panel-notification-message">${mensaje}</div>
        </div>
        <button class="admin-panel-notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(notif);
    
    setTimeout(() => {
        const elem = document.getElementById(id);
        if (elem) elem.remove();
    }, 5000);
}

function mostrarExito(mensaje) {
    mostrarNotificacion(mensaje, 'success');
}

function mostrarError(mensaje) {
    mostrarNotificacion(mensaje, 'error');
}

function mostrarAdvertencia(mensaje) {
    mostrarNotificacion(mensaje, 'warning');
}

// ============================================================================
// FUNCIONES PARA PERMISOS
// ============================================================================

function cargarPermisosGrid(containerId, permisosSeleccionados = [], soloLectura = false) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const permisosPorCategoria = {};
    PERMISOS_DISPONIBLES.forEach(permiso => {
        if (!permisosPorCategoria[permiso.categoria]) {
            permisosPorCategoria[permiso.categoria] = [];
        }
        permisosPorCategoria[permiso.categoria].push(permiso);
    });
    
    let html = '';
    const categorias = Object.keys(permisosPorCategoria).sort();
    
    categorias.forEach(categoria => {
        html += `<div class="admin-panel-permission-category">${categoria}</div>`;
        
        const permisosCategoria = permisosPorCategoria[categoria].sort((a, b) => 
            a.nombre.localeCompare(b.nombre)
        );
        
        permisosCategoria.forEach(permiso => {
            const checked = permisosSeleccionados.includes(permiso.id) ? 'checked' : '';
            const disabled = soloLectura ? 'disabled' : '';
            
            html += `
                <label class="admin-panel-permission-item">
                    <input type="checkbox" value="${permiso.id}" ${checked} ${disabled}>
                    <span>${permiso.nombre}</span>
                </label>
            `;
        });
    });
    
    container.innerHTML = html;
}

function mostrarTodosPermisos() {
    const container = document.getElementById('allPermissionsGrid');
    if (!container) return;
    
    const permisosPorCategoria = {};
    PERMISOS_DISPONIBLES.forEach(permiso => {
        if (!permisosPorCategoria[permiso.categoria]) {
            permisosPorCategoria[permiso.categoria] = [];
        }
        permisosPorCategoria[permiso.categoria].push(permiso);
    });
    
    let html = '';
    let totalPermisos = 0;
    const categorias = Object.keys(permisosPorCategoria).sort();
    
    categorias.forEach(categoria => {
        html += `<div class="admin-panel-permission-category">📌 ${categoria}</div>`;
        
        const permisosCategoria = permisosPorCategoria[categoria].sort((a, b) => 
            a.nombre.localeCompare(b.nombre)
        );
        
        permisosCategoria.forEach(permiso => {
            totalPermisos++;
            html += `
                <div class="admin-panel-permission-item">
                    <i class="fas fa-check-circle" style="color: var(--success);"></i>
                    <span>
                        <strong>${permiso.nombre}</strong>
                    </span>
                </div>
            `;
        });
    });
    
    container.innerHTML = html;
    
    // Actualizar stats
    const totalPermisosEl = document.getElementById('totalPermisos');
    const totalCategoriasEl = document.getElementById('totalCategorias');
    
    if (totalPermisosEl) totalPermisosEl.textContent = totalPermisos;
    if (totalCategoriasEl) totalCategoriasEl.textContent = categorias.length;
}

// ============================================================================
// FUNCIONES PARA USUARIOS
// ============================================================================

async function cargarUsuarios() {
    mostrarPreloader('users');
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/admin/users`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            // Si no es JSON, es probablemente un HTML (error 404)
            const text = await response.text();
            console.error('Respuesta no JSON:', text.substring(0, 200));
            throw new Error('El servidor devolvió HTML en lugar de JSON');
        }
        
        if (data.success) {
            usuarios = data.usuarios || [];
            actualizarTablaUsuarios(usuarios);
            actualizarStats();
            actualizarFiltrosRoles();
            ocultarPreloader('users');
        } else {
            mostrarError(data.message || 'Error al cargar usuarios');
            cargarUsuariosEjemplo();
        }
    } catch (error) {
        console.error('Error cargando usuarios:', error);
        mostrarError('Error de conexión al cargar usuarios');
        cargarUsuariosEjemplo();
    }
}

function cargarUsuariosEjemplo() {
    // Datos de ejemplo para desarrollo
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        usuarios = [
            { 
                _id: '1', 
                usuario: 'admin', 
                correo: 'admin@cbtis051.edu.mx', 
                rol: 'administrador', 
                activo: true, 
                esAdminUnico: true,
                ultimoAcceso: new Date().toISOString(),
                createdAt: new Date().toISOString()
            },
            { 
                _id: '2', 
                usuario: 'juan.perez', 
                correo: 'juan.perez@cbtis051.edu.mx', 
                rol: 'usuario', 
                activo: true,
                esAdminUnico: false,
                ultimoAcceso: new Date(Date.now() - 86400000).toISOString(),
                createdAt: new Date(Date.now() - 604800000).toISOString()
            },
            { 
                _id: '3', 
                usuario: 'maria.garcia', 
                correo: 'maria.garcia@cbtis051.edu.mx', 
                rol: 'editor', 
                activo: false,
                esAdminUnico: false,
                ultimoAcceso: null,
                createdAt: new Date(Date.now() - 1209600000).toISOString()
            }
        ];
        actualizarTablaUsuarios(usuarios);
        actualizarStats();
        actualizarFiltrosRoles();
        ocultarPreloader('users');
    }
}

function actualizarTablaUsuarios(usuariosFiltrados) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    if (!usuariosFiltrados || usuariosFiltrados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="admin-panel-no-data">
                    <i class="fas fa-users"></i>
                    <p>No hay usuarios registrados</p>
                    <small>Haz clic en "Nuevo Usuario" para comenzar</small>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = usuariosFiltrados.map(user => {
        const esAdminUnico = user.esAdminUnico === true;
        const fechaCreacion = user.createdAt ? new Date(user.createdAt).toLocaleDateString('es-MX') : 'N/A';
        const ultimoAcceso = user.ultimoAcceso 
            ? new Date(user.ultimoAcceso).toLocaleString('es-MX', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })
            : 'Nunca';
        
        const rolClass = user.rol === 'administrador' ? 'admin' : 
                        user.rol === 'editor' ? 'editor' : '';
        
        return `
        <tr>
            <td>
                <div class="admin-panel-user-info-cell">
                    <div class="admin-panel-user-avatar-sm">
                        ${user.usuario?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div class="admin-panel-user-details">
                        <span class="admin-panel-user-name-full">
                            ${user.usuario}
                            ${esAdminUnico ? '<span style="background: #f59e0b; color: white; font-size: 0.7rem; padding: 2px 6px; border-radius: 10px; margin-left: 8px;">Único</span>' : ''}
                        </span>
                        <span class="admin-panel-user-meta">Creado: ${fechaCreacion}</span>
                    </div>
                </div>
            </td>
            <td>${user.correo}</td>
            <td>
                <span class="admin-panel-role-badge ${rolClass}">
                    <i class="fas fa-${user.rol === 'administrador' ? 'crown' : 'user'}"></i>
                    ${user.rol === 'administrador' ? 'Administrador' : 
                      user.rol === 'usuario' ? 'Usuario' : user.rol || 'Sin rol'}
                </span>
            </td>
            <td>
                <span class="admin-panel-status-badge ${user.activo ? 'active' : 'inactive'}">
                    <i class="fas fa-${user.activo ? 'check-circle' : 'times-circle'}"></i>
                    ${user.activo ? 'Activo' : 'Inactivo'}
                </span>
            </td>
            <td>${ultimoAcceso}</td>
            <td>
                <div class="admin-panel-action-buttons">
                    ${!esAdminUnico ? `
                        <button class="admin-panel-action-btn" onclick="window.editarUsuario('${user._id}')" title="Editar usuario">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="admin-panel-action-btn delete" onclick="window.cambiarEstadoUsuario('${user._id}')" title="${user.activo ? 'Desactivar' : 'Activar'} usuario">
                            <i class="fas fa-${user.activo ? 'user-slash' : 'user-check'}"></i>
                        </button>
                        <button class="admin-panel-action-btn permanent-delete" onclick="window.eliminarUsuarioPermanente('${user._id}')" title="Eliminar permanentemente">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    ` : `
                        <span class="admin-panel-role-badge" style="background: #f59e0b; color: white; border: none;">Admin Único</span>
                    `}
                </div>
            </td>
        </tr>
    `}).join('');
}

function filtrarUsuarios() {
    const searchUsers = document.getElementById('searchUsers');
    const roleFilter = document.getElementById('roleFilter');
    const statusFilter = document.getElementById('statusFilter');
    
    const searchTerm = searchUsers ? searchUsers.value.toLowerCase() : '';
    const roleFilterValue = roleFilter ? roleFilter.value : '';
    const statusFilterValue = statusFilter ? statusFilter.value : '';
    
    let filtrados = usuarios;
    
    // Filtro de búsqueda
    if (searchTerm) {
        filtrados = filtrados.filter(user => 
            (user.usuario?.toLowerCase() || '').includes(searchTerm) ||
            (user.correo?.toLowerCase() || '').includes(searchTerm)
        );
    }
    
    // Filtro de rol
    if (roleFilterValue) {
        filtrados = filtrados.filter(user => user.rol === roleFilterValue);
    }
    
    // Filtro de estado
    if (statusFilterValue) {
        const activo = statusFilterValue === 'activo';
        filtrados = filtrados.filter(user => user.activo === activo);
    }
    
    actualizarTablaUsuarios(filtrados);
}

function actualizarStats() {
    const total = usuarios.length;
    const activos = usuarios.filter(u => u.activo).length;
    const inactivos = total - activos;
    
    const totalUsersEl = document.getElementById('totalUsers');
    const activeUsersEl = document.getElementById('activeUsers');
    const inactiveUsersEl = document.getElementById('inactiveUsers');
    const totalRolesEl = document.getElementById('totalRoles');
    
    if (totalUsersEl) totalUsersEl.textContent = total;
    if (activeUsersEl) activeUsersEl.textContent = activos;
    if (inactiveUsersEl) inactiveUsersEl.textContent = inactivos;
    if (totalRolesEl) totalRolesEl.textContent = roles.length;
}

function actualizarFiltrosRoles() {
    const roleFilter = document.getElementById('roleFilter');
    if (!roleFilter) return;
    
    const rolesUnicos = [...new Set(usuarios.map(u => u.rol).filter(Boolean))];
    
    let options = '<option value="">Todos los roles</option>';
    rolesUnicos.forEach(rol => {
        options += `<option value="${rol}">${rol}</option>`;
    });
    
    roleFilter.innerHTML = options;
}

// ============================================================================
// MODAL DE USUARIO
// ============================================================================

async function abrirModalUsuario(userId = null) {
    const modal = document.getElementById('userModal');
    const title = document.getElementById('userModalTitle');
    const passwordGroup = document.getElementById('passwordGroup');
    const roleSelect = document.getElementById('userRole');
    
    if (!modal || !title || !passwordGroup || !roleSelect) return;
    
    // Cargar roles en el select
    roleSelect.innerHTML = '<option value="">Seleccionar rol...</option>';
    roles.forEach(rol => {
        if (rol.nombre !== 'administrador') {
            roleSelect.innerHTML += `<option value="${rol.nombre}">${rol.nombre}</option>`;
        }
    });
    
    if (userId) {
        title.innerHTML = '<i class="fas fa-edit"></i><span>Editar Usuario</span>';
        passwordGroup.style.display = 'none';
        await cargarDatosUsuario(userId);
    } else {
        title.innerHTML = '<i class="fas fa-user-plus"></i><span>Nuevo Usuario</span>';
        passwordGroup.style.display = 'block';
        document.getElementById('userId').value = '';
        document.getElementById('userName').value = '';
        document.getElementById('userEmail').value = '';
        document.getElementById('userPassword').value = '';
        document.getElementById('userActive').checked = true;
        document.getElementById('userRole').value = '';
        
        // Habilitar campos
        document.getElementById('userName').disabled = false;
        document.getElementById('userEmail').disabled = false;
        document.getElementById('userActive').disabled = false;
        document.getElementById('userRole').disabled = false;
    }
    
    modal.showModal();
}

async function cargarDatosUsuario(userId) {
    try {
        const user = usuarios.find(u => u._id === userId);
        
        if (user) {
            document.getElementById('userId').value = user._id;
            document.getElementById('userName').value = user.usuario;
            document.getElementById('userEmail').value = user.correo;
            document.getElementById('userActive').checked = user.activo;
            document.getElementById('userRole').value = user.rol || '';
            
            // Si es admin único, deshabilitar campos
            if (user.esAdminUnico) {
                document.getElementById('userName').disabled = true;
                document.getElementById('userEmail').disabled = true;
                document.getElementById('userActive').disabled = true;
                document.getElementById('userRole').disabled = true;
            } else {
                document.getElementById('userName').disabled = false;
                document.getElementById('userEmail').disabled = false;
                document.getElementById('userActive').disabled = false;
                document.getElementById('userRole').disabled = false;
            }
        }
    } catch (error) {
        console.error('Error cargando datos del usuario:', error);
        mostrarError('Error al cargar datos del usuario');
    }
}

function cerrarModalUsuario() {
    const modal = document.getElementById('userModal');
    if (modal) modal.close();
    
    // Resetear campos
    document.getElementById('userName').disabled = false;
    document.getElementById('userEmail').disabled = false;
    document.getElementById('userActive').disabled = false;
    document.getElementById('userRole').disabled = false;
}

async function guardarUsuario() {
    const userId = document.getElementById('userId').value;
    const usuario = document.getElementById('userName').value.trim();
    const correo = document.getElementById('userEmail').value.trim();
    const password = document.getElementById('userPassword').value;
    const activo = document.getElementById('userActive').checked;
    const rol = document.getElementById('userRole').value;
    
    // Validaciones
    if (!usuario || !correo) {
        mostrarError('Usuario y correo son requeridos');
        return;
    }
    
    if (!userId && !password) {
        mostrarError('La contraseña es requerida para nuevos usuarios');
        return;
    }
    
    if (!userId && password.length < 6) {
        mostrarError('La contraseña debe tener al menos 6 caracteres');
        return;
    }
    
    if (!rol) {
        mostrarError('Debes seleccionar un rol');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const url = userId ? `${API_URL}/api/admin/users/${userId}` : `${API_URL}/api/admin/users`;
        const method = userId ? 'PUT' : 'POST';
        
        const body = userId ? {
            usuario,
            correo,
            rol,
            activo
        } : {
            usuario,
            correo,
            password,
            rol
        };
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(body)
        });
        
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            throw new Error('Respuesta no válida del servidor');
        }
        
        if (data.success) {
            cerrarModalUsuario();
            await cargarUsuarios();
            mostrarExito(userId ? 'Usuario actualizado' : 'Usuario creado');
        } else {
            mostrarError(data.message || 'Error al guardar');
        }
    } catch (error) {
        console.error('Error guardando usuario:', error);
        mostrarError('Error de conexión');
    }
}

/**
 * Cambiar estado del usuario (activar/desactivar)
 */
async function cambiarEstadoUsuario(userId) {
    const user = usuarios.find(u => u._id === userId);
    if (!user) return;
    
    // No permitir desactivar admin único
    if (user.esAdminUnico) {
        mostrarError('No puedes cambiar el estado del administrador único');
        return;
    }
    
    const accion = user.activo ? 'desactivar' : 'activar';
    
    // Usar modal de confirmación
    const confirmModal = document.getElementById('confirmModal');
    const confirmMessage = document.getElementById('confirmMessage');
    const confirmTitle = document.getElementById('confirmModalTitle');
    
    if (!confirmModal || !confirmMessage || !confirmTitle) return;
    
    confirmMessage.textContent = `¿Estás seguro de ${accion} al usuario ${user.usuario}?`;
    confirmTitle.textContent = 'Confirmar acción';
    
    confirmModal.showModal();
    
    // Configurar acción de confirmación
    const confirmBtn = document.getElementById('confirmActionBtn');
    if (!confirmBtn) return;
    
    const cancelar = () => {
        confirmModal.close();
        confirmBtn.removeEventListener('click', handleConfirm);
    };
    
    const handleConfirm = async () => {
        confirmBtn.disabled = true;
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/admin/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            let data;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                throw new Error('Respuesta no válida');
            }
            
            if (data.success) {
                await cargarUsuarios();
                mostrarExito(`Usuario ${user.activo ? 'desactivado' : 'activado'}`);
                confirmModal.close();
            } else {
                mostrarError(data.message || 'Error al cambiar estado');
            }
        } catch (error) {
            console.error('Error cambiando estado:', error);
            mostrarError('Error de conexión');
        } finally {
            confirmBtn.disabled = false;
            confirmBtn.removeEventListener('click', handleConfirm);
        }
    };
    
    confirmBtn.addEventListener('click', handleConfirm);
    
    // Limpiar al cerrar
    const closeHandler = () => {
        confirmBtn.removeEventListener('click', handleConfirm);
        confirmModal.removeEventListener('close', closeHandler);
    };
    confirmModal.addEventListener('close', closeHandler);
}

/**
 * Eliminar usuario permanentemente
 */
async function eliminarUsuarioPermanente(userId) {
    const user = usuarios.find(u => u._id === userId);
    if (!user) return;
    
    if (user.esAdminUnico) {
        mostrarError('No puedes eliminar al administrador único');
        return;
    }
    
    const confirmModal = document.getElementById('confirmModal');
    const confirmMessage = document.getElementById('confirmMessage');
    const confirmTitle = document.getElementById('confirmModalTitle');
    const confirmBtn = document.getElementById('confirmActionBtn');
    
    if (!confirmModal || !confirmMessage || !confirmTitle || !confirmBtn) return;
    
    confirmMessage.innerHTML = 
        `<strong style="color: var(--danger);">¿Estás seguro de ELIMINAR PERMANENTEMENTE al usuario ${user.usuario}?</strong><br><br>
        <span style="color: var(--text-secondary); font-size: 0.9rem;">Esta acción no se puede deshacer. Todos los datos asociados a este usuario serán eliminados.</span>`;
    confirmTitle.textContent = '⚠️ Eliminación Permanente';
    
    // Cambiar el icono
    const icon = confirmModal.querySelector('.action-modal__icon i');
    if (icon) {
        icon.className = 'fas fa-trash-alt';
        icon.style.color = 'var(--danger)';
    }
    
    confirmModal.showModal();
    
    confirmBtn.classList.add('btn--danger');
    
    const handleConfirm = async () => {
        confirmBtn.disabled = true;
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/admin/users/${userId}/permanent`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            let data;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                throw new Error('Respuesta no válida');
            }
            
            if (data.success) {
                await cargarUsuarios();
                mostrarExito('Usuario eliminado permanentemente');
                confirmModal.close();
            } else {
                mostrarError(data.message || 'Error al eliminar usuario');
            }
        } catch (error) {
            console.error('Error eliminando usuario:', error);
            mostrarError('Error de conexión');
        } finally {
            confirmBtn.disabled = false;
            confirmBtn.classList.remove('btn--danger');
            confirmBtn.removeEventListener('click', handleConfirm);
        }
    };
    
    confirmBtn.addEventListener('click', handleConfirm);
    
    const closeHandler = () => {
        confirmBtn.removeEventListener('click', handleConfirm);
        confirmBtn.classList.remove('btn--danger');
        confirmModal.removeEventListener('close', closeHandler);
    };
    confirmModal.addEventListener('close', closeHandler);
}

function cerrarConfirmModal() {
    const confirmModal = document.getElementById('confirmModal');
    if (confirmModal) confirmModal.close();
}

// ============================================================================
// FUNCIONES PARA ROLES
// ============================================================================

async function cargarRoles() {
    mostrarPreloader('roles');
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/admin/roles`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            throw new Error('Respuesta no JSON');
        }
        
        if (data.success) {
            roles = data.roles || [];
            actualizarTablaRoles(roles);
            const totalRolesEl = document.getElementById('totalRoles');
            if (totalRolesEl) totalRolesEl.textContent = roles.length;
            ocultarPreloader('roles');
        } else {
            mostrarError(data.message || 'Error al cargar roles');
            cargarRolesEjemplo();
        }
    } catch (error) {
        console.error('Error cargando roles:', error);
        mostrarError('Error de conexión al cargar roles');
        cargarRolesEjemplo();
    }
}

function cargarRolesEjemplo() {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        roles = [
            { _id: '1', nombre: 'usuario', descripcion: 'Usuario básico', permisos: ['ver_dashboard', 'ver_documentos', 'subir_documentos'], esProtegido: true },
            { _id: '2', nombre: 'editor', descripcion: 'Puede editar documentos', permisos: ['ver_dashboard', 'ver_documentos', 'subir_documentos', 'editar_documentos', 'eliminar_documentos'], esProtegido: false },
            { _id: '3', nombre: 'supervisor', descripcion: 'Supervisor de documentos', permisos: ['ver_dashboard', 'ver_documentos', 'ver_personas', 'ver_reportes'], esProtegido: false }
        ];
        actualizarTablaRoles(roles);
        const totalRolesEl = document.getElementById('totalRoles');
        if (totalRolesEl) totalRolesEl.textContent = roles.length;
        ocultarPreloader('roles');
    }
}

function actualizarTablaRoles(rolesFiltrados) {
    const tbody = document.getElementById('rolesTableBody');
    if (!tbody) return;
    
    if (!rolesFiltrados || rolesFiltrados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="admin-panel-no-data">
                    <i class="fas fa-tags"></i>
                    <p>No hay roles definidos</p>
                    <small>Haz clic en "Nuevo Rol" para comenzar</small>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = rolesFiltrados.map(rol => {
        const usuariosConRol = usuarios.filter(u => u.rol === rol.nombre).length;
        const esProtegido = rol.esProtegido === true;
        
        return `
        <tr>
            <td>
                <strong style="color: var(--text-primary); font-size: 1rem;">
                    ${rol.nombre}
                    ${esProtegido ? '<span style="background: #6b7280; color: white; font-size: 0.7rem; padding: 2px 6px; border-radius: 10px; margin-left: 8px;">Protegido</span>' : ''}
                </strong>
            </td>
            <td>${rol.descripcion || '-'}</td>
            <td>
                <span class="admin-panel-role-badge" style="background: rgba(16, 185, 129, 0.1); color: #10b981;">
                    <i class="fas fa-key"></i> ${rol.permisos?.length || 0} permisos
                </span>
            </td>
            <td>
                <span class="admin-panel-role-badge" style="background: rgba(59, 130, 246, 0.1); color: #3b82f6;">
                    <i class="fas fa-users"></i> ${usuariosConRol} usuario${usuariosConRol !== 1 ? 's' : ''}
                </span>
            </td>
            <td>
                <div class="admin-panel-action-buttons">
                    ${!esProtegido ? `
                        <button class="admin-panel-action-btn" onclick="window.editarRol('${rol._id}')" title="Editar rol">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="admin-panel-action-btn" onclick="window.verPermisosRol('${rol._id}')" title="Ver permisos">
                            <i class="fas fa-shield-alt"></i>
                        </button>
                        <button class="admin-panel-action-btn delete" onclick="window.eliminarRol('${rol._id}')" title="Eliminar rol" ${usuariosConRol > 0 ? 'disabled' : ''}>
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : `
                        <span class="admin-panel-role-badge" style="background: #6b7280; color: white;">Sistema</span>
                    `}
                </div>
            </td>
        </tr>
    `}).join('');
}

function filtrarRoles() {
    const searchRoles = document.getElementById('searchRoles');
    const searchTerm = searchRoles ? searchRoles.value.toLowerCase() : '';
    
    const filtrados = roles.filter(rol => 
        (rol.nombre?.toLowerCase() || '').includes(searchTerm) ||
        (rol.descripcion?.toLowerCase() || '').includes(searchTerm)
    );
    
    actualizarTablaRoles(filtrados);
}

// ============================================================================
// MODAL DE ROL
// ============================================================================

function abrirModalRol(roleId = null) {
    const modal = document.getElementById('roleModal');
    const title = document.getElementById('roleModalTitle');
    
    if (!modal || !title) return;
    
    if (roleId) {
        title.innerHTML = '<i class="fas fa-edit"></i><span>Editar Rol</span>';
        cargarDatosRol(roleId);
    } else {
        title.innerHTML = '<i class="fas fa-plus"></i><span>Nuevo Rol</span>';
        document.getElementById('roleId').value = '';
        document.getElementById('roleName').value = '';
        document.getElementById('roleDescription').value = '';
        cargarPermisosGrid('rolePermissionsGrid', []);
        
        // Habilitar campos
        document.getElementById('roleName').disabled = false;
        document.getElementById('roleDescription').disabled = false;
    }
    
    modal.showModal();
}

function cargarDatosRol(roleId) {
    const rol = roles.find(r => r._id === roleId);
    if (rol) {
        document.getElementById('roleId').value = rol._id;
        document.getElementById('roleName').value = rol.nombre;
        document.getElementById('roleDescription').value = rol.descripcion || '';
        cargarPermisosGrid('rolePermissionsGrid', rol.permisos || []);
        
        // Si es rol protegido, deshabilitar edición
        if (rol.esProtegido) {
            document.getElementById('roleName').disabled = true;
            document.getElementById('roleDescription').disabled = true;
            document.querySelectorAll('#rolePermissionsGrid input').forEach(cb => {
                cb.disabled = true;
            });
        } else {
            document.getElementById('roleName').disabled = false;
            document.getElementById('roleDescription').disabled = false;
        }
    }
}

function cerrarModalRol() {
    const modal = document.getElementById('roleModal');
    if (modal) modal.close();
    
    // Resetear campos
    document.getElementById('roleName').disabled = false;
    document.getElementById('roleDescription').disabled = false;
}

async function guardarRol() {
    const roleId = document.getElementById('roleId').value;
    const nombre = document.getElementById('roleName').value.trim();
    const descripcion = document.getElementById('roleDescription').value.trim();
    
    const permisos = [];
    document.querySelectorAll('#rolePermissionsGrid input:checked').forEach(cb => {
        permisos.push(cb.value);
    });
    
    if (!nombre) {
        mostrarError('El nombre del rol es requerido');
        return;
    }
    
    // No permitir crear rol 'administrador'
    if (nombre.toLowerCase() === 'administrador') {
        mostrarError('No puedes crear un rol llamado "administrador"');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const url = roleId ? `${API_URL}/api/admin/roles/${roleId}` : `${API_URL}/api/admin/roles`;
        const method = roleId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ nombre, descripcion, permisos })
        });
        
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            throw new Error('Respuesta no válida');
        }
        
        if (data.success) {
            cerrarModalRol();
            await cargarRoles();
            await cargarUsuarios(); // Recargar usuarios para actualizar roles
            mostrarExito(roleId ? 'Rol actualizado' : 'Rol creado');
        } else {
            mostrarError(data.message || 'Error al guardar');
        }
    } catch (error) {
        console.error('Error guardando rol:', error);
        mostrarError('Error de conexión');
    }
}

function verPermisosRol(roleId) {
    const rol = roles.find(r => r._id === roleId);
    if (!rol) return;
    
    const permisosTexto = rol.permisos?.length 
        ? rol.permisos.map(p => {
            const permiso = PERMISOS_DISPONIBLES.find(per => per.id === p);
            return permiso ? `• ${permiso.nombre}` : `• ${p}`;
          }).join('\n')
        : 'Sin permisos asignados';
    
    // Mostrar en modal de confirmación como información
    const confirmTitle = document.getElementById('confirmModalTitle');
    const confirmMessage = document.getElementById('confirmMessage');
    const confirmBtn = document.getElementById('confirmActionBtn');
    
    if (confirmTitle) confirmTitle.textContent = `Permisos: ${rol.nombre}`;
    if (confirmMessage) confirmMessage.innerHTML = `<pre style="text-align: left; white-space: pre-wrap;">${permisosTexto}</pre>`;
    
    const confirmModal = document.getElementById('confirmModal');
    if (confirmBtn) confirmBtn.style.display = 'none';
    
    if (confirmModal) confirmModal.showModal();
    
    const closeHandler = () => {
        if (confirmBtn) confirmBtn.style.display = 'flex';
        if (confirmModal) confirmModal.removeEventListener('close', closeHandler);
    };
    if (confirmModal) confirmModal.addEventListener('close', closeHandler);
}

/**
 * Eliminar rol con verificación de usuarios asignados
 * Si hay usuarios con ese rol, se les asigna rol por defecto o se les deja sin rol
 */
async function eliminarRol(roleId) {
    const rol = roles.find(r => r._id === roleId);
    if (!rol) return;
    
    if (rol.esProtegido) {
        mostrarError('No se puede eliminar un rol protegido');
        return;
    }
    
    // Buscar usuarios con este rol
    const usuariosConRol = usuarios.filter(u => u.rol === rol.nombre);
    
    if (usuariosConRol.length > 0) {
        // Preguntar qué hacer con los usuarios afectados
        const confirmModal = document.getElementById('confirmModal');
        const confirmTitle = document.getElementById('confirmModalTitle');
        const confirmMessage = document.getElementById('confirmMessage');
        const confirmBtn = document.getElementById('confirmActionBtn');
        
        if (!confirmModal || !confirmTitle || !confirmMessage || !confirmBtn) return;
        
        confirmTitle.textContent = '⚠️ Usuarios afectados';
        confirmMessage.innerHTML = `
            <p>El rol <strong>"${rol.nombre}"</strong> está asignado a <strong>${usuariosConRol.length} usuario${usuariosConRol.length !== 1 ? 's' : ''}</strong>.</p>
            <p>¿Qué deseas hacer?</p>
            <div style="display: flex; gap: 10px; margin-top: 20px; justify-content: center;">
                <button id="assignDefaultRole" class="btn btn--primary" style="flex: 1;">Asignar rol por defecto</button>
                <button id="removeRoleFromUsers" class="btn btn--warning" style="flex: 1;">Dejar sin rol</button>
            </div>
            <p style="margin-top: 15px; font-size: 0.9rem; color: var(--text-secondary);">
                <i class="fas fa-info-circle"></i> Si eliges "Dejar sin rol", los usuarios no tendrán permisos hasta que se les asigne uno.
            </p>
        `;
        
        // Ocultar botones por defecto
        confirmBtn.style.display = 'none';
        
        confirmModal.showModal();
        
        // Manejadores para las opciones
        const handleDefaultRole = async () => {
            await procesarEliminacionRol(roleId, 'default');
            confirmModal.close();
        };
        
        const handleNoRole = async () => {
            await procesarEliminacionRol(roleId, 'none');
            confirmModal.close();
        };
        
        // Agregar botones temporales
        const defaultRoleBtn = document.getElementById('assignDefaultRole');
        const noRoleBtn = document.getElementById('removeRoleFromUsers');
        
        if (defaultRoleBtn) defaultRoleBtn.addEventListener('click', handleDefaultRole);
        if (noRoleBtn) noRoleBtn.addEventListener('click', handleNoRole);
        
        // Limpiar al cerrar
        const closeHandler = () => {
            if (defaultRoleBtn) defaultRoleBtn.removeEventListener('click', handleDefaultRole);
            if (noRoleBtn) noRoleBtn.removeEventListener('click', handleNoRole);
            confirmBtn.style.display = 'flex';
            confirmModal.removeEventListener('close', closeHandler);
        };
        confirmModal.addEventListener('close', closeHandler);
        
    } else {
        // No hay usuarios con este rol, eliminar directamente
        await procesarEliminacionRol(roleId, 'none');
    }
}

/**
 * Procesar la eliminación de un rol
 * @param {string} roleId - ID del rol a eliminar
 * @param {string} accion - 'default' para asignar rol por defecto, 'none' para dejar sin rol
 */
async function procesarEliminacionRol(roleId, accion) {
    const rol = roles.find(r => r._id === roleId);
    if (!rol) return;
    
    try {
        const token = localStorage.getItem('token');
        
        // Primero, si hay usuarios con este rol y se eligió asignar rol por defecto
        if (accion === 'default') {
            const usuariosConRol = usuarios.filter(u => u.rol === rol.nombre);
            
            // Buscar un rol por defecto (podría ser 'usuario' o el primero disponible)
            const rolDefault = roles.find(r => r.nombre === 'usuario' && r._id !== roleId) || 
                              roles.find(r => r._id !== roleId);
            
            if (rolDefault && usuariosConRol.length > 0) {
                // Actualizar cada usuario
                for (const user of usuariosConRol) {
                    await fetch(`${API_URL}/api/admin/users/${user._id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            usuario: user.usuario,
                            correo: user.correo,
                            rol: rolDefault.nombre,
                            activo: user.activo
                        })
                    });
                }
                mostrarExito(`${usuariosConRol.length} usuario${usuariosConRol.length !== 1 ? 's' : ''} actualizado${usuariosConRol.length !== 1 ? 's' : ''} al rol "${rolDefault.nombre}"`);
            }
        }
        
        // Ahora eliminar el rol
        const response = await fetch(`${API_URL}/api/admin/roles/${roleId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            throw new Error('Respuesta no válida');
        }
        
        if (data.success) {
            await cargarRoles();
            await cargarUsuarios(); // Recargar usuarios para ver los cambios
            mostrarExito('Rol eliminado correctamente');
        } else {
            mostrarError(data.message || 'Error al eliminar rol');
        }
    } catch (error) {
        console.error('Error eliminando rol:', error);
        mostrarError('Error de conexión');
    }
}

// ============================================================================
// LOGS DE AUDITORÍA
// ============================================================================

async function cargarAuditLogs() {
    mostrarPreloader('logs');
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/admin/audit-logs?limite=100`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            throw new Error('Respuesta no JSON');
        }
        
        if (data.success) {
            auditLogs = data.logs || [];
            actualizarTablaLogs(auditLogs);
            ocultarPreloader('logs');
        } else {
            mostrarError(data.message || 'Error al cargar logs');
            cargarLogsEjemplo();
        }
    } catch (error) {
        console.error('Error cargando logs:', error);
        cargarLogsEjemplo();
    }
}

function cargarLogsEjemplo() {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        const logs = [
            { 
                nombreUsuario: 'admin', 
                accion: 'INICIO_SESIÓN', 
                descripcion: 'Inicio de sesión exitoso', 
                ip: '127.0.0.1', 
                createdAt: new Date().toISOString(),
                resultado: 'exito'
            },
            { 
                nombreUsuario: 'admin', 
                accion: 'CREAR_USUARIO', 
                descripcion: 'Creó usuario: juan.perez', 
                ip: '127.0.0.1', 
                createdAt: new Date(Date.now() - 3600000).toISOString(),
                resultado: 'exito'
            },
            { 
                nombreUsuario: 'admin', 
                accion: 'EDITAR_ROL', 
                descripcion: 'Editó rol: editor', 
                ip: '127.0.0.1', 
                createdAt: new Date(Date.now() - 7200000).toISOString(),
                resultado: 'exito'
            }
        ];
        
        actualizarTablaLogs(logs);
        ocultarPreloader('logs');
    }
}

function actualizarTablaLogs(logs) {
    const tbody = document.getElementById('logsTableBody');
    if (!tbody) return;
    
    if (!logs || logs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="admin-panel-no-data">
                    <i class="fas fa-history"></i>
                    <p>No hay registros de auditoría</p>
                    <small>Las acciones se registrarán aquí automáticamente</small>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = logs.map(log => {
        const fecha = log.createdAt ? new Date(log.createdAt).toLocaleString('es-MX', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }) : 'N/A';
        
        const icono = log.resultado === 'exito' ? '✅' : log.resultado === 'error' ? '❌' : '⚠️';
        
        return `
        <tr>
            <td>${fecha}</td>
            <td><strong>${log.nombreUsuario || 'Sistema'}</strong></td>
            <td>${icono} ${log.accion}</td>
            <td>${log.descripcion}</td>
            <td><code>${log.ip || 'N/A'}</code></td>
        </tr>
    `}).join('');
}

// ============================================================================
// PRELOADERS
// ============================================================================

function mostrarPreloader(tab) {
    const preloader = document.getElementById(`${tab}Preloader`);
    if (preloader) {
        preloader.style.display = 'flex';
    }
}

function ocultarPreloader(tab) {
    const preloader = document.getElementById(`${tab}Preloader`);
    if (preloader) {
        preloader.style.display = 'none';
    }
}

// ============================================================================
// EXPORTAR FUNCIONES GLOBALES
// ============================================================================

// Funciones para usuarios
window.editarUsuario = (userId) => abrirModalUsuario(userId);
window.cambiarEstadoUsuario = cambiarEstadoUsuario;
window.eliminarUsuarioPermanente = eliminarUsuarioPermanente;

// Funciones para roles
window.editarRol = (roleId) => abrirModalRol(roleId);
window.verPermisosRol = verPermisosRol;
window.eliminarRol = eliminarRol;

console.log('📦 Sistema de administración cargado');