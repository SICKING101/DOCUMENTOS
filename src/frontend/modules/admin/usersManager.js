// =============================================================================
// GESTIÓN DE USUARIOS Y PERMISOS PARA PANEL DE ADMIN
// Versión completa con sistema de permisos funcional
// =============================================================================

const API_URL = window.location.origin;

// =============================================================================
// CONFIGURACIÓN DE PERMISOS
// =============================================================================

// Lista completa de permisos disponibles organizados por categoría
const PERMISOS_DISPONIBLES = [
    // Dashboard
    { id: 'ver_dashboard', nombre: 'Ver Dashboard', categoria: 'Dashboard', descripcion: 'Acceso al panel principal' },
    { id: 'editar_dashboard', nombre: 'Personalizar Dashboard', categoria: 'Dashboard', descripcion: 'Modificar widgets y layout' },
    
    // Personas
    { id: 'ver_personas', nombre: 'Ver Personas', categoria: 'Personas', descripcion: 'Listar y ver detalles de personas' },
    { id: 'crear_personas', nombre: 'Crear Personas', categoria: 'Personas', descripcion: 'Registrar nuevas personas' },
    { id: 'editar_personas', nombre: 'Editar Personas', categoria: 'Personas', descripcion: 'Modificar información de personas' },
    { id: 'eliminar_personas', nombre: 'Eliminar Personas', categoria: 'Personas', descripcion: 'Eliminar personas del sistema' },
    
    // Documentos
    { id: 'ver_documentos', nombre: 'Ver Documentos', categoria: 'Documentos', descripcion: 'Listar y ver documentos' },
    { id: 'subir_documentos', nombre: 'Subir Documentos', categoria: 'Documentos', descripcion: 'Cargar nuevos documentos' },
    { id: 'editar_documentos', nombre: 'Editar Documentos', categoria: 'Documentos', descripcion: 'Modificar metadatos de documentos' },
    { id: 'eliminar_documentos', nombre: 'Eliminar Documentos', categoria: 'Documentos', descripcion: 'Eliminar documentos' },
    { id: 'descargar_documentos', nombre: 'Descargar Documentos', categoria: 'Documentos', descripcion: 'Permite descargar archivos' },
    
    // Categorías
    { id: 'ver_categorias', nombre: 'Ver Categorías', categoria: 'Categorías', descripcion: 'Listar categorías' },
    { id: 'crear_categorias', nombre: 'Crear Categorías', categoria: 'Categorías', descripcion: 'Crear nuevas categorías' },
    { id: 'editar_categorias', nombre: 'Editar Categorías', categoria: 'Categorías', descripcion: 'Modificar categorías' },
    { id: 'eliminar_categorias', nombre: 'Eliminar Categorías', categoria: 'Categorías', descripcion: 'Eliminar categorías' },
    
    // Departamentos
    { id: 'ver_departamentos', nombre: 'Ver Departamentos', categoria: 'Departamentos', descripcion: 'Listar departamentos' },
    { id: 'crear_departamentos', nombre: 'Crear Departamentos', categoria: 'Departamentos', descripcion: 'Crear nuevos departamentos' },
    { id: 'editar_departamentos', nombre: 'Editar Departamentos', categoria: 'Departamentos', descripcion: 'Modificar departamentos' },
    { id: 'eliminar_departamentos', nombre: 'Eliminar Departamentos', categoria: 'Departamentos', descripcion: 'Eliminar departamentos' },
    
    // Tareas
    { id: 'ver_tareas', nombre: 'Ver Tareas', categoria: 'Tareas', descripcion: 'Listar y ver tareas' },
    { id: 'crear_tareas', nombre: 'Crear Tareas', categoria: 'Tareas', descripcion: 'Crear nuevas tareas' },
    { id: 'editar_tareas', nombre: 'Editar Tareas', categoria: 'Tareas', descripcion: 'Modificar tareas' },
    { id: 'eliminar_tareas', nombre: 'Eliminar Tareas', categoria: 'Tareas', descripcion: 'Eliminar tareas' },
    { id: 'asignar_tareas', nombre: 'Asignar Tareas', categoria: 'Tareas', descripcion: 'Asignar tareas a usuarios' },
    
    // Reportes
    { id: 'ver_reportes', nombre: 'Ver Reportes', categoria: 'Reportes', descripcion: 'Acceder a reportes' },
    { id: 'generar_reportes', nombre: 'Generar Reportes', categoria: 'Reportes', descripcion: 'Crear nuevos reportes' },
    { id: 'exportar_reportes', nombre: 'Exportar Reportes', categoria: 'Reportes', descripcion: 'Exportar a PDF/Excel' },
    
    // Calendario
    { id: 'ver_calendario', nombre: 'Ver Calendario', categoria: 'Calendario', descripcion: 'Acceder al calendario' },
    { id: 'crear_eventos', nombre: 'Crear Eventos', categoria: 'Calendario', descripcion: 'Crear eventos en calendario' },
    { id: 'editar_eventos', nombre: 'Editar Eventos', categoria: 'Calendario', descripcion: 'Modificar eventos' },
    { id: 'eliminar_eventos', nombre: 'Eliminar Eventos', categoria: 'Calendario', descripcion: 'Eliminar eventos' },
    
    // Historial
    { id: 'ver_historial', nombre: 'Ver Historial', categoria: 'Historial', descripcion: 'Acceder al historial' },
    { id: 'exportar_historial', nombre: 'Exportar Historial', categoria: 'Historial', descripcion: 'Exportar logs' },
    
    // Soporte
    { id: 'ver_soporte', nombre: 'Ver Soporte', categoria: 'Soporte', descripcion: 'Acceder al centro de soporte' },
    { id: 'crear_tickets', nombre: 'Crear Tickets', categoria: 'Soporte', descripcion: 'Crear tickets de soporte' },
    { id: 'responder_tickets', nombre: 'Responder Tickets', categoria: 'Soporte', descripcion: 'Responder a tickets' },
    { id: 'cerrar_tickets', nombre: 'Cerrar Tickets', categoria: 'Soporte', descripcion: 'Cerrar tickets' },
    
    // Papelera
    { id: 'ver_papelera', nombre: 'Ver Papelera', categoria: 'Papelera', descripcion: 'Acceder a elementos eliminados' },
    { id: 'restaurar_documentos', nombre: 'Restaurar Documentos', categoria: 'Papelera', descripcion: 'Restaurar desde papelera' },
    { id: 'vaciar_papelera', nombre: 'Vaciar Papelera', categoria: 'Papelera', descripcion: 'Eliminar permanentemente' },
    
    // Administración
    { id: 'ver_usuarios', nombre: 'Ver Usuarios', categoria: 'Administración', descripcion: 'Listar usuarios del sistema' },
    { id: 'crear_usuarios', nombre: 'Crear Usuarios', categoria: 'Administración', descripcion: 'Crear nuevos usuarios' },
    { id: 'editar_usuarios', nombre: 'Editar Usuarios', categoria: 'Administración', descripcion: 'Modificar usuarios' },
    { id: 'eliminar_usuarios', nombre: 'Eliminar Usuarios', categoria: 'Administración', descripcion: 'Desactivar/eliminar usuarios' },
    { id: 'ver_roles', nombre: 'Ver Roles', categoria: 'Administración', descripcion: 'Listar roles' },
    { id: 'crear_roles', nombre: 'Crear Roles', categoria: 'Administración', descripcion: 'Crear nuevos roles' },
    { id: 'editar_roles', nombre: 'Editar Roles', categoria: 'Administración', descripcion: 'Modificar roles' },
    { id: 'eliminar_roles', nombre: 'Eliminar Roles', categoria: 'Administración', descripcion: 'Eliminar roles' },
    { id: 'ver_permisos', nombre: 'Ver Permisos', categoria: 'Administración', descripcion: 'Ver configuración de permisos' }
];

// =============================================================================
// ESTADO GLOBAL
// =============================================================================

let usuarios = [];
let roles = [];
let permisos = PERMISOS_DISPONIBLES;
let currentUserId = null;
let currentRoleId = null;
let permisosEditando = null;

// =============================================================================
// INICIALIZACIÓN
// =============================================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Inicializando panel de administración...');
    
    try {
        // Verificar autenticación
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login.html';
            return;
        }
        
        // Mostrar preloaders
        mostrarPreloaders();
        
        // Inicializar componentes
        inicializarTabs();
        configurarEventos();
        
        // Cargar datos
        await Promise.all([
            cargarUsuarios(),
            cargarRoles()
        ]);
        
        // Cargar logs (simulados)
        cargarLogs();
        
        // Mostrar todos los permisos en la pestaña correspondiente
        mostrarTodosPermisos();
        
        console.log('✅ Panel inicializado correctamente');
        
    } catch (error) {
        console.error('Error en inicialización:', error);
        mostrarError('Error al cargar el panel');
    }
});

function mostrarPreloaders() {
    // Los preloaders ya están visibles por defecto
    document.getElementById('usersTable').style.display = 'none';
    document.getElementById('rolesTable').style.display = 'none';
    document.getElementById('logsTable').style.display = 'none';
}

function ocultarPreloader(tab) {
    const preloader = document.getElementById(`${tab}Preloader`);
    const table = document.getElementById(`${tab}Table`);
    
    if (preloader) preloader.style.display = 'none';
    if (table) table.style.display = 'table';
}

// =============================================================================
// CONFIGURACIÓN DE TABS
// =============================================================================

function inicializarTabs() {
    const tabs = document.querySelectorAll('.admin-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            
            // Actualizar tabs
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Actualizar contenido
            document.querySelectorAll('.admin-tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`${tabId}Tab`).classList.add('active');
            
            // Si es la pestaña de permisos, actualizar grid
            if (tabId === 'permissions') {
                mostrarTodosPermisos();
            }
        });
    });
}

// =============================================================================
// CONFIGURACIÓN DE EVENTOS
// =============================================================================

function configurarEventos() {
    // Búsqueda de usuarios
    const searchUsers = document.getElementById('searchUsers');
    if (searchUsers) {
        searchUsers.addEventListener('input', filtrarUsuarios);
    }
    
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
    
    // Modal de usuario
    const closeUserModal = document.getElementById('closeUserModal');
    const cancelUserBtn = document.getElementById('cancelUserBtn');
    const saveUserBtn = document.getElementById('saveUserBtn');
    
    closeUserModal?.addEventListener('click', cerrarModalUsuario);
    cancelUserBtn?.addEventListener('click', cerrarModalUsuario);
    saveUserBtn?.addEventListener('click', guardarUsuario);
    
    // Cerrar modal con ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const userModal = document.getElementById('userModal');
            const roleModal = document.getElementById('roleModal');
            const permissionsModal = document.getElementById('permissionsModal');
            
            if (userModal?.open) userModal.close();
            if (roleModal?.open) roleModal.close();
            if (permissionsModal?.open) permissionsModal.close();
        }
    });
    
    // Modal de rol
    const closeRoleModal = document.getElementById('closeRoleModal');
    const cancelRoleBtn = document.getElementById('cancelRoleBtn');
    const saveRoleBtn = document.getElementById('saveRoleBtn');
    
    closeRoleModal?.addEventListener('click', cerrarModalRol);
    cancelRoleBtn?.addEventListener('click', cerrarModalRol);
    saveRoleBtn?.addEventListener('click', guardarRol);
    
    // Modal de permisos
    const closePermissionsModal = document.getElementById('closePermissionsModal');
    const cancelPermissionsBtn = document.getElementById('cancelPermissionsBtn');
    const savePermissionsBtn = document.getElementById('savePermissionsBtn');
    
    closePermissionsModal?.addEventListener('click', cerrarModalPermisos);
    cancelPermissionsBtn?.addEventListener('click', cerrarModalPermisos);
    savePermissionsBtn?.addEventListener('click', guardarPermisosEspecificos);
}

// =============================================================================
// FUNCIONES DE UTILIDAD (NOTIFICACIONES)
// =============================================================================

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
    notif.className = `notification ${tipo}`;
    notif.id = id;
    notif.innerHTML = `
        <div class="notification-icon">
            <i class="fas fa-${tipo === 'success' ? 'check-circle' : tipo === 'error' ? 'exclamation-circle' : tipo === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
        </div>
        <div class="notification-content">
            <div class="notification-title">${titulo || titulos[tipo]}</div>
            <div class="notification-message">${mensaje}</div>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(notif);
    
    // Auto-cerrar después de 5 segundos
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

// =============================================================================
// FUNCIONES DE PERMISOS (NÚCLEO DEL SISTEMA)
// =============================================================================

/**
 * Obtiene los permisos efectivos de un usuario
 * Combina permisos del rol + permisos específicos
 */
function obtenerPermisosEfectivos(usuario) {
    if (!usuario) return [];
    
    // Encontrar el rol del usuario
    const rol = roles.find(r => r.nombre === usuario.rol);
    
    // Permisos del rol (si existe)
    const permisosRol = rol?.permisos || [];
    
    // Permisos específicos del usuario
    const permisosEspecificos = usuario.permisos || [];
    
    // Combinar (los específicos sobrescriben a los del rol)
    const permisosCombinados = [...new Set([...permisosRol, ...permisosEspecificos])];
    
    return permisosCombinados;
}

/**
 * Verifica si un usuario tiene un permiso específico
 */
function usuarioTienePermiso(usuario, permisoId) {
    if (!usuario) return false;
    
    // Admin tiene todos los permisos
    if (usuario.rol === 'administrador') return true;
    
    const permisosEfectivos = obtenerPermisosEfectivos(usuario);
    return permisosEfectivos.includes(permisoId);
}

/**
 * Verifica si un usuario tiene TODOS los permisos especificados
 */
function usuarioTieneTodosPermisos(usuario, permisosRequeridos) {
    if (!usuario || !permisosRequeridos.length) return false;
    if (usuario.rol === 'administrador') return true;
    
    const permisosEfectivos = obtenerPermisosEfectivos(usuario);
    return permisosRequeridos.every(p => permisosEfectivos.includes(p));
}

/**
 * Verifica si un usuario tiene ALGUNO de los permisos especificados
 */
function usuarioTieneAlgunPermiso(usuario, permisosRequeridos) {
    if (!usuario || !permisosRequeridos.length) return false;
    if (usuario.rol === 'administrador') return true;
    
    const permisosEfectivos = obtenerPermisosEfectivos(usuario);
    return permisosRequeridos.some(p => permisosEfectivos.includes(p));
}

// =============================================================================
// FUNCIONES PARA MOSTRAR PERMISOS EN GRID
// =============================================================================

function cargarPermisosGrid(containerId, permisosSeleccionados = [], soloLectura = false) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Agrupar permisos por categoría
    const permisosPorCategoria = {};
    PERMISOS_DISPONIBLES.forEach(permiso => {
        if (!permisosPorCategoria[permiso.categoria]) {
            permisosPorCategoria[permiso.categoria] = [];
        }
        permisosPorCategoria[permiso.categoria].push(permiso);
    });
    
    let html = '';
    
    // Ordenar categorías alfabéticamente
    const categorias = Object.keys(permisosPorCategoria).sort();
    
    categorias.forEach(categoria => {
        html += `<div class="permission-category">${categoria}</div>`;
        
        // Ordenar permisos por nombre
        const permisosCategoria = permisosPorCategoria[categoria].sort((a, b) => 
            a.nombre.localeCompare(b.nombre)
        );
        
        permisosCategoria.forEach(permiso => {
            const checked = permisosSeleccionados.includes(permiso.id) ? 'checked' : '';
            const disabled = soloLectura ? 'disabled' : '';
            
            html += `
                <label class="permission-item">
                    <input type="checkbox" value="${permiso.id}" ${checked} ${disabled}>
                    <span title="${permiso.descripcion || ''}">${permiso.nombre}</span>
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
    const categorias = Object.keys(permisosPorCategoria).sort();
    
    categorias.forEach(categoria => {
        html += `<div class="permission-category">📌 ${categoria}</div>`;
        
        const permisosCategoria = permisosPorCategoria[categoria].sort((a, b) => 
            a.nombre.localeCompare(b.nombre)
        );
        
        permisosCategoria.forEach(permiso => {
            html += `
                <div class="permission-item" style="background: var(--bg-secondary);">
                    <i class="fas fa-check-circle" style="color: var(--success-color);"></i>
                    <span>
                        <strong>${permiso.nombre}</strong>
                        <small style="display: block; color: var(--text-muted);">${permiso.descripcion || 'Sin descripción'}</small>
                    </span>
                </div>
            `;
        });
    });
    
    container.innerHTML = html;
}

// =============================================================================
// FUNCIONES PARA USUARIOS
// =============================================================================

async function cargarUsuarios() {
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
        
        const data = await response.json();
        
        if (data.success) {
            usuarios = data.usuarios || [];
            actualizarTablaUsuarios(usuarios);
            actualizarStats();
            ocultarPreloader('users');
        } else {
            mostrarError(data.message || 'Error al cargar usuarios');
        }
    } catch (error) {
        console.error('Error cargando usuarios:', error);
        mostrarError('Error de conexión al cargar usuarios');
        
        // Mostrar datos de ejemplo para desarrollo
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('⚠️ Usando datos de ejemplo para desarrollo');
            usuarios = [
                { _id: '1', usuario: 'admin', correo: 'admin@cbtis051.edu.mx', rol: 'administrador', activo: true, ultimoAcceso: new Date().toISOString(), permisos: [] },
                { _id: '2', usuario: 'juan.perez', correo: 'juan.perez@cbtis051.edu.mx', rol: 'usuario', activo: true, ultimoAcceso: new Date().toISOString(), permisos: ['ver_documentos', 'subir_documentos'] },
                { _id: '3', usuario: 'maria.garcia', correo: 'maria.garcia@cbtis051.edu.mx', rol: 'usuario', activo: false, ultimoAcceso: null, permisos: [] }
            ];
            actualizarTablaUsuarios(usuarios);
            actualizarStats();
            ocultarPreloader('users');
        }
    }
}

function actualizarTablaUsuarios(usuariosFiltrados) {
    const tbody = document.getElementById('usersTableBody');
    
    if (!usuariosFiltrados || usuariosFiltrados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="no-data">
                    <i class="fas fa-users"></i>
                    <p>No hay usuarios registrados</p>
                    <small>Haz clic en "Nuevo Usuario" para comenzar</small>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = usuariosFiltrados.map(user => {
        const permisosEfectivos = obtenerPermisosEfectivos(user);
        const totalPermisos = permisosEfectivos.length;
        
        return `
        <tr>
            <td>
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style="width: 40px; height: 40px; background: linear-gradient(135deg, var(--primary-color), var(--primary-dark)); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600;">
                        ${user.usuario?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                        <strong style="color: var(--text-primary); display: block;">${user.usuario}</strong>
                        <small style="color: var(--text-muted);">ID: ${user._id?.substring(0, 8) || 'N/A'}</small>
                    </div>
                </div>
            </td>
            <td>${user.correo}</td>
            <td>
                <span class="role-badge">
                    ${user.rol === 'administrador' ? '👑 Administrador' : 
                      user.rol === 'usuario' ? '👤 Usuario' : '🔰 ' + (user.rol || 'Sin rol')}
                </span>
            </td>
            <td>
                <span class="role-badge" style="background: rgba(16, 185, 129, 0.1); color: var(--success-color); cursor: pointer;" onclick="window.verPermisosUsuario('${user._id}')">
                    <i class="fas fa-shield-alt"></i> ${totalPermisos} permisos
                </span>
            </td>
            <td>
                <span class="status-badge ${user.activo ? 'active' : 'inactive'}">
                    <i class="fas fa-${user.activo ? 'check-circle' : 'times-circle'}"></i>
                    ${user.activo ? 'Activo' : 'Inactivo'}
                </span>
            </td>
            <td>${user.ultimoAcceso ? new Date(user.ultimoAcceso).toLocaleString('es-MX') : 'Nunca'}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn" onclick="window.editarUsuario('${user._id}')" title="Editar usuario">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn" onclick="window.verPermisosUsuario('${user._id}')" title="Gestionar permisos">
                        <i class="fas fa-shield-alt"></i>
                    </button>
                    <button class="action-btn delete" onclick="window.eliminarUsuario('${user._id}')" title="${user.activo ? 'Desactivar' : 'Activar'} usuario">
                        <i class="fas fa-${user.activo ? 'user-slash' : 'user-check'}"></i>
                    </button>
                </div>
            </td>
        </tr>
    `}).join('');
}

function filtrarUsuarios() {
    const searchTerm = document.getElementById('searchUsers').value.toLowerCase();
    
    const filtrados = usuarios.filter(user => 
        (user.usuario?.toLowerCase() || '').includes(searchTerm) ||
        (user.correo?.toLowerCase() || '').includes(searchTerm) ||
        (user.rol?.toLowerCase() || '').includes(searchTerm)
    );
    
    actualizarTablaUsuarios(filtrados);
}

function actualizarStats() {
    const total = usuarios.length;
    const activos = usuarios.filter(u => u.activo).length;
    const inactivos = total - activos;
    
    document.getElementById('totalUsers').textContent = total;
    document.getElementById('activeUsers').textContent = activos;
    document.getElementById('inactiveUsers').textContent = inactivos;
}

// =============================================================================
// MODAL DE USUARIO
// =============================================================================

async function abrirModalUsuario(userId = null) {
    const modal = document.getElementById('userModal');
    const title = document.getElementById('userModalTitle');
    const passwordGroup = document.getElementById('passwordGroup');
    const roleSelect = document.getElementById('userRole');
    
    // Cargar roles en el select
    roleSelect.innerHTML = '<option value="">Seleccionar rol...</option>';
    roles.forEach(rol => {
        roleSelect.innerHTML += `<option value="${rol.nombre}">${rol.nombre}</option>`;
    });
    
    if (userId) {
        title.textContent = 'Editar Usuario';
        passwordGroup.style.display = 'none';
        await cargarDatosUsuario(userId);
    } else {
        title.textContent = 'Nuevo Usuario';
        passwordGroup.style.display = 'block';
        document.getElementById('userId').value = '';
        document.getElementById('userName').value = '';
        document.getElementById('userEmail').value = '';
        document.getElementById('userPassword').value = '';
        document.getElementById('userActive').checked = true;
        cargarPermisosGrid('permissionsGrid', []);
    }
    
    modal.showModal();
}

async function cargarDatosUsuario(userId) {
    try {
        const user = usuarios.find(u => u._id === userId) || 
                    await fetchUsuario(userId);
        
        if (user) {
            document.getElementById('userId').value = user._id;
            document.getElementById('userName').value = user.usuario;
            document.getElementById('userEmail').value = user.correo;
            document.getElementById('userActive').checked = user.activo;
            document.getElementById('userRole').value = user.rol || '';
            
            // Cargar permisos del usuario
            cargarPermisosGrid('permissionsGrid', user.permisos || []);
        }
    } catch (error) {
        console.error('Error cargando datos del usuario:', error);
        mostrarError('Error al cargar datos del usuario');
    }
}

async function fetchUsuario(userId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/admin/users/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        return data.success ? data.usuario : null;
    } catch (error) {
        console.error('Error fetching user:', error);
        return null;
    }
}

function cerrarModalUsuario() {
    const modal = document.getElementById('userModal');
    modal.close();
}

async function guardarUsuario() {
    const userId = document.getElementById('userId').value;
    const usuario = document.getElementById('userName').value.trim();
    const correo = document.getElementById('userEmail').value.trim();
    const password = document.getElementById('userPassword').value;
    const activo = document.getElementById('userActive').checked;
    const rol = document.getElementById('userRole').value;
    
    // Obtener permisos seleccionados
    const permisos = [];
    document.querySelectorAll('#permissionsGrid input:checked').forEach(cb => {
        permisos.push(cb.value);
    });
    
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
            permisos,
            activo
        } : {
            usuario,
            correo,
            password,
            rol,
            permisos
        };
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(body)
        });
        
        const data = await response.json();
        
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

async function eliminarUsuario(userId) {
    const user = usuarios.find(u => u._id === userId);
    if (!user) return;
    
    const accion = user.activo ? 'desactivar' : 'activar';
    const confirmacion = confirm(`¿Estás seguro de ${accion} al usuario ${user.usuario}?`);
    
    if (!confirmacion) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            await cargarUsuarios();
            mostrarExito(`Usuario ${user.activo ? 'desactivado' : 'activado'}`);
        } else {
            mostrarError(data.message || 'Error al cambiar estado');
        }
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        mostrarError('Error de conexión');
    }
}

// =============================================================================
// GESTIÓN DE PERMISOS ESPECÍFICOS
// =============================================================================

async function verPermisosUsuario(userId) {
    const user = usuarios.find(u => u._id === userId);
    if (!user) return;
    
    const modal = document.getElementById('permissionsModal');
    const title = document.getElementById('permissionsModalTitle');
    const userName = document.getElementById('permissionsUserName');
    const userRole = document.getElementById('permissionsUserRole');
    
    title.textContent = `Permisos: ${user.usuario}`;
    userName.innerHTML = `<i class="fas fa-user"></i> ${user.usuario} <small style="color: var(--text-muted);">(${user.correo})</small>`;
    userRole.innerHTML = `<i class="fas fa-tag"></i> Rol: <strong>${user.rol || 'Sin rol'}</strong>`;
    
    // Obtener permisos efectivos
    const permisosEfectivos = obtenerPermisosEfectivos(user);
    
    // Mostrar permisos efectivos (solo lectura)
    cargarPermisosGrid('userEffectivePermissions', permisosEfectivos, true);
    
    // Mostrar permisos específicos (editables)
    cargarPermisosGrid('userSpecificPermissionsEdit', user.permisos || [], false);
    
    // Guardar userId para editar
    permisosEditando = userId;
    
    modal.showModal();
}

function cerrarModalPermisos() {
    const modal = document.getElementById('permissionsModal');
    modal.close();
    permisosEditando = null;
}

async function guardarPermisosEspecificos() {
    if (!permisosEditando) {
        cerrarModalPermisos();
        return;
    }
    
    // Obtener permisos seleccionados
    const permisos = [];
    document.querySelectorAll('#userSpecificPermissionsEdit input:checked').forEach(cb => {
        permisos.push(cb.value);
    });
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/admin/users/${permisosEditando}/permisos`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ permisos })
        });
        
        const data = await response.json();
        
        if (data.success) {
            cerrarModalPermisos();
            await cargarUsuarios();
            mostrarExito('Permisos actualizados');
        } else {
            mostrarError(data.message || 'Error al guardar permisos');
        }
    } catch (error) {
        console.error('Error guardando permisos:', error);
        mostrarError('Error de conexión');
    }
}

// =============================================================================
// FUNCIONES PARA ROLES
// =============================================================================

async function cargarRoles() {
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
        
        const data = await response.json();
        
        if (data.success) {
            roles = data.roles || [];
            actualizarTablaRoles(roles);
            document.getElementById('totalRoles').textContent = roles.length;
            ocultarPreloader('roles');
        } else {
            mostrarError(data.message || 'Error al cargar roles');
        }
    } catch (error) {
        console.error('Error cargando roles:', error);
        mostrarError('Error de conexión al cargar roles');
        
        // Datos de ejemplo para desarrollo
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            roles = [
                { _id: '1', nombre: 'administrador', descripcion: 'Acceso completo al sistema', permisos: PERMISOS_DISPONIBLES.map(p => p.id) },
                { _id: '2', nombre: 'usuario', descripcion: 'Usuario básico', permisos: ['ver_dashboard', 'ver_documentos', 'subir_documentos'] },
                { _id: '3', nombre: 'editor', descripcion: 'Puede editar documentos', permisos: ['ver_dashboard', 'ver_documentos', 'subir_documentos', 'editar_documentos'] }
            ];
            actualizarTablaRoles(roles);
            document.getElementById('totalRoles').textContent = roles.length;
            ocultarPreloader('roles');
        }
    }
}

function actualizarTablaRoles(rolesFiltrados) {
    const tbody = document.getElementById('rolesTableBody');
    
    if (!rolesFiltrados || rolesFiltrados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="no-data">
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
        
        return `
        <tr>
            <td>
                <strong style="color: var(--text-primary); font-size: 1rem;">${rol.nombre}</strong>
            </td>
            <td>${rol.descripcion || '-'}</td>
            <td>
                <span class="role-badge" style="background: rgba(16, 185, 129, 0.1); color: var(--success-color);">
                    <i class="fas fa-key"></i> ${rol.permisos?.length || 0} permisos
                </span>
            </td>
            <td>
                <span class="role-badge">
                    <i class="fas fa-users"></i> ${usuariosConRol} usuario${usuariosConRol !== 1 ? 's' : ''}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn" onclick="window.editarRol('${rol._id}')" title="Editar rol">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn" onclick="window.verPermisosRol('${rol._id}')" title="Ver permisos del rol">
                        <i class="fas fa-shield-alt"></i>
                    </button>
                    ${rol.nombre !== 'administrador' ? `
                        <button class="action-btn delete" onclick="window.eliminarRol('${rol._id}')" title="Eliminar rol">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `}).join('');
}

function filtrarRoles() {
    const searchTerm = document.getElementById('searchRoles').value.toLowerCase();
    
    const filtrados = roles.filter(rol => 
        (rol.nombre?.toLowerCase() || '').includes(searchTerm) ||
        (rol.descripcion?.toLowerCase() || '').includes(searchTerm)
    );
    
    actualizarTablaRoles(filtrados);
}

// =============================================================================
// MODAL DE ROL
// =============================================================================

function abrirModalRol(roleId = null) {
    const modal = document.getElementById('roleModal');
    const title = document.getElementById('roleModalTitle');
    
    if (roleId) {
        title.textContent = 'Editar Rol';
        cargarDatosRol(roleId);
    } else {
        title.textContent = 'Nuevo Rol';
        document.getElementById('roleId').value = '';
        document.getElementById('roleName').value = '';
        document.getElementById('roleDescription').value = '';
        cargarPermisosGrid('rolePermissionsGrid', []);
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
    }
}

function cerrarModalRol() {
    const modal = document.getElementById('roleModal');
    modal.close();
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
    
    if (permisos.length === 0) {
        mostrarAdvertencia('El rol no tiene permisos asignados');
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
        
        const data = await response.json();
        
        if (data.success) {
            cerrarModalRol();
            await cargarRoles();
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
            return permiso ? `• ${permiso.nombre} (${permiso.categoria})` : `• ${p}`;
          }).join('\n')
        : 'Sin permisos asignados';
    
    alert(`Permisos del rol "${rol.nombre}":\n\n${permisosTexto}`);
}

async function eliminarRol(roleId) {
    const rol = roles.find(r => r._id === roleId);
    if (!rol) return;
    
    if (rol.nombre === 'administrador') {
        mostrarError('No se puede eliminar el rol de administrador');
        return;
    }
    
    const usuariosConRol = usuarios.filter(u => u.rol === rol.nombre).length;
    
    if (usuariosConRol > 0) {
        mostrarError(`No se puede eliminar el rol porque ${usuariosConRol} usuario${usuariosConRol !== 1 ? 's' : ''} lo tienen asignado`);
        return;
    }
    
    const confirmacion = confirm(`¿Estás seguro de eliminar el rol "${rol.nombre}"?`);
    if (!confirmacion) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/admin/roles/${roleId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            await cargarRoles();
            mostrarExito('Rol eliminado');
        } else {
            mostrarError(data.message || 'Error al eliminar');
        }
    } catch (error) {
        console.error('Error eliminando rol:', error);
        mostrarError('Error de conexión');
    }
}

// =============================================================================
// LOGS DE AUDITORÍA
// =============================================================================

function cargarLogs() {
    const tbody = document.getElementById('logsTableBody');
    
    // Datos de ejemplo
    const logs = [
        { fecha: new Date(), usuario: 'admin', accion: 'Acceso al panel', detalles: 'Inicio de sesión', ip: '127.0.0.1' },
        { fecha: new Date(Date.now() - 3600000), usuario: 'admin', accion: 'Creación de usuario', detalles: 'Nuevo usuario: juan.perez', ip: '127.0.0.1' },
        { fecha: new Date(Date.now() - 7200000), usuario: 'admin', accion: 'Modificación de rol', detalles: 'Rol "editor" actualizado', ip: '127.0.0.1' },
        { fecha: new Date(Date.now() - 86400000), usuario: 'admin', accion: 'Cambio de permisos', detalles: 'Permisos actualizados para maria.garcia', ip: '127.0.0.1' }
    ];
    
    tbody.innerHTML = logs.map(log => `
        <tr>
            <td>${log.fecha.toLocaleString('es-MX')}</td>
            <td><strong>${log.usuario}</strong></td>
            <td>${log.accion}</td>
            <td>${log.detalles}</td>
            <td><code>${log.ip}</code></td>
        </tr>
    `).join('');
    
    ocultarPreloader('logs');
}

// =============================================================================
// EXPORTAR FUNCIONES GLOBALES
// =============================================================================

// Funciones para usuarios
window.editarUsuario = (userId) => abrirModalUsuario(userId);
window.verPermisosUsuario = verPermisosUsuario;
window.eliminarUsuario = eliminarUsuario;

// Funciones para roles
window.editarRol = (roleId) => abrirModalRol(roleId);
window.verPermisosRol = verPermisosRol;
window.eliminarRol = eliminarRol;

// Funciones de utilidad
window.mostrarNotificacion = mostrarNotificacion;
window.mostrarExito = mostrarExito;
window.mostrarError = mostrarError;
window.mostrarAdvertencia = mostrarAdvertencia;

// Sistema de permisos (para usar desde otros módulos)
window.permisos = {
    verificar: usuarioTienePermiso,
    verificarTodos: usuarioTieneTodosPermisos,
    verificarAlguno: usuarioTieneAlgunPermiso,
    obtenerEfectivos: obtenerPermisosEfectivos,
    listaCompleta: PERMISOS_DISPONIBLES
};

console.log('📦 Sistema de permisos cargado:', PERMISOS_DISPONIBLES.length, 'permisos disponibles');