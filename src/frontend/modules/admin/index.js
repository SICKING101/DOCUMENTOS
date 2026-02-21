import { api } from '../../services/api.js';
import { showAlert, setLoadingState, formatDate, confirmAction } from '../../utils.js';
import { hasPermission, PERMISSIONS, ROLES, getRoleDisplayName } from '../../permissions.js';

// =============================================================================
// CONSTANTES Y UTILIDADES
// =============================================================================

const ROLE_COLORS = {
  [ROLES.ADMIN]: 'danger',
  [ROLES.GERENTE]: 'warning',
  [ROLES.SUPERVISOR]: 'info',
  [ROLES.EDITOR]: 'success',
  [ROLES.REVISOR]: 'primary',
  [ROLES.LECTOR]: 'secondary',
  [ROLES.MODERADOR]: 'warning',
  [ROLES.USUARIO]: 'secondary',
  [ROLES.DISABLED]: 'dark'
};

const ROLE_ICONS = {
  [ROLES.ADMIN]: 'fas fa-crown',
  [ROLES.GERENTE]: 'fas fa-briefcase',
  [ROLES.SUPERVISOR]: 'fas fa-eye',
  [ROLES.EDITOR]: 'fas fa-pen-fancy',
  [ROLES.REVISOR]: 'fas fa-check-double',
  [ROLES.LECTOR]: 'fas fa-book-reader',
  [ROLES.MODERADOR]: 'fas fa-shield-alt',
  [ROLES.USUARIO]: 'fas fa-user',
  [ROLES.DISABLED]: 'fas fa-user-slash'
};

// Descripciones de roles
const ROLE_DESCRIPTIONS = {
  [ROLES.ADMIN]: 'Control total del sistema. Gestiona usuarios, permisos y configuración.',
  [ROLES.GERENTE]: 'Gestiona todo el contenido pero no puede administrar usuarios.',
  [ROLES.SUPERVISOR]: 'Supervisa y aprueba contenido. Capacidades limitadas de edición.',
  [ROLES.EDITOR]: 'Crea y edita documentos, personas, categorías y tareas.',
  [ROLES.REVISOR]: 'Revisa y aprueba documentos. Solo aprobar/rechazar contenido.',
  [ROLES.LECTOR]: 'Solo lectura. Puede ver y descargar documentos aprobados.',
  [ROLES.MODERADOR]: 'Usuario avanzado (legado). Puede gestionar contenido.',
  [ROLES.USUARIO]: 'Usuario básico (legado). Acceso de solo lectura.',
  [ROLES.DISABLED]: 'Usuario desactivado. No puede iniciar sesión.'
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getCurrentUserId() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.id || user._id;
  } catch {
    return null;
  }
}

function truncateText(text, maxLength) {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '…' : text;
}

// =============================================================================
// FUNCIONES DE ACCIONES
// =============================================================================

async function deactivateUser(userId, userName) {
  const confirmed = await confirmAction({
    title: '¿Desactivar usuario?',
    message: `El usuario "${userName}" no podrá iniciar sesión hasta que sea reactivado.`,
    confirmText: 'Desactivar',
    cancelText: 'Cancelar',
    type: 'warning'
  });
  
  if (!confirmed) return false;
  
  try {
    setLoadingState(true);
    const response = await api.call(`/admin/users/${userId}/deactivate`, { 
      method: 'PATCH',
      body: { activo: false }
    });
    
    if (response?.success) {
      showAlert('Usuario desactivado correctamente', 'success');
      return true;
    } else {
      throw new Error(response?.message || 'Error al desactivar usuario');
    }
  } catch (error) {
    console.error('Error desactivando usuario:', error);
    showAlert(error.message || 'Error al desactivar usuario', 'error');
    return false;
  } finally {
    setLoadingState(false);
  }
}

async function deleteUserPermanently(userId, userName) {
  const confirmed = await confirmAction({
    title: '⚠️ ¿Eliminar usuario permanentemente?',
    message: `Esta acción eliminará permanentemente al usuario "${userName}". NO SE PUEDE DESHACER.`,
    confirmText: 'Eliminar permanentemente',
    cancelText: 'Cancelar',
    type: 'danger'
  });
  
  if (!confirmed) return false;
  
  try {
    setLoadingState(true);
    const response = await api.call(`/admin/users/${userId}`, { 
      method: 'DELETE' 
    });
    
    if (response?.success) {
      showAlert('Usuario eliminado permanentemente', 'success');
      return true;
    } else {
      throw new Error(response?.message || 'Error al eliminar usuario');
    }
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    showAlert(error.message || 'Error al eliminar usuario', 'error');
    return false;
  } finally {
    setLoadingState(false);
  }
}

async function reactivateUser(userId, userName) {
  const confirmed = await confirmAction({
    title: '¿Reactivar usuario?',
    message: `El usuario "${userName}" podrá iniciar sesión nuevamente.`,
    confirmText: 'Reactivar',
    cancelText: 'Cancelar',
    type: 'success'
  });
  
  if (!confirmed) return false;
  
  try {
    setLoadingState(true);
    const response = await api.call(`/admin/users/${userId}/reactivate`, { 
      method: 'PATCH',
      body: { activo: true, rol: 'lector' }
    });
    
    if (response?.success) {
      showAlert('Usuario reactivado correctamente', 'success');
      return true;
    } else {
      throw new Error(response?.message || 'Error al reactivar usuario');
    }
  } catch (error) {
    console.error('Error reactivando usuario:', error);
    showAlert(error.message || 'Error al reactivar usuario', 'error');
    return false;
  } finally {
    setLoadingState(false);
  }
}

// =============================================================================
// RENDERIZADO DE FILA DE USUARIO
// =============================================================================

function renderUserRow(user, isEditing = false, currentUserId) {
  const isCurrentUser = user._id === currentUserId;
  const isAdminUser = user.rol === ROLES.ADMIN;
  const isActive = user.activo !== false && user.rol !== ROLES.DISABLED;

  if (isEditing === user._id) {
    return renderEditUserRow(user);
  }

  const roleClass = ROLE_COLORS[user.rol] || 'secondary';
  const roleIcon = ROLE_ICONS[user.rol] || 'fas fa-user';

  return `
    <tr class="${!isActive ? 'table-row--inactive' : ''} ${isAdminUser ? 'table-row--admin' : ''}">
      <td data-label="Usuario">
        <div class="user-cell">
          <div class="user-avatar" data-role="${user.rol}">
            <i class="${roleIcon}"></i>
          </div>
          <div class="user-info">
            <span class="user-name" title="${escapeHtml(user.usuario)}">${escapeHtml(truncateText(user.usuario, 15))}</span>
            ${isCurrentUser ? '<span class="user-badge">Tú</span>' : ''}
          </div>
        </div>
      </td>
      <td data-label="Correo">
        <a href="mailto:${escapeHtml(user.correo)}" class="user-email" title="${escapeHtml(user.correo)}">
          <i class="fas fa-envelope"></i>
          <span>${escapeHtml(truncateText(user.correo, 20))}</span>
        </a>
      </td>
      <td data-label="Rol">
        <span class="role-badge role-badge--${roleClass}" title="${ROLE_DESCRIPTIONS[user.rol] || ''}">
          <i class="${roleIcon}"></i>
          ${getRoleDisplayName(user.rol)}
        </span>
      </td>
      <td data-label="Estado">
        <span class="status-badge status-badge--${isActive ? 'active' : 'inactive'}">
          <span class="status-dot"></span>
          ${isActive ? 'Activo' : 'Inactivo'}
        </span>
      </td>
      <td data-label="Último acceso">
        <div class="date-cell">
          <i class="fas fa-clock"></i>
          ${user.ultimoAcceso ? formatDate(user.ultimoAcceso) : 'Nunca'}
        </div>
      </td>
      <td data-label="Acciones">
        <div class="action-buttons">
          ${!isAdminUser ? `
            <!-- Botón Editar -->
            <button class="action-btn action-btn--edit" data-action="edit" data-id="${user._id}" title="Editar usuario">
              <i class="fas fa-edit"></i>
            </button>
            
            ${isActive ? `
              <!-- Usuario activo: desactivar -->
              <button class="action-btn action-btn--warning" data-action="deactivate" data-id="${user._id}" data-name="${escapeHtml(user.usuario)}" title="Desactivar usuario">
                <i class="fas fa-user-slash"></i>
              </button>
            ` : `
              <!-- Usuario inactivo: reactivar -->
              <button class="action-btn action-btn--success" data-action="reactivate" data-id="${user._id}" data-name="${escapeHtml(user.usuario)}" title="Reactivar usuario">
                <i class="fas fa-user-check"></i>
              </button>
            `}
            
            <!-- Botón Eliminar (solo si no es el usuario actual) -->
            ${!isCurrentUser ? `
              <button class="action-btn action-btn--delete" data-action="delete" data-id="${user._id}" data-name="${escapeHtml(user.usuario)}" title="Eliminar permanentemente">
                <i class="fas fa-trash-alt"></i>
              </button>
            ` : ''}
          ` : `
            <!-- Administrador: no editable -->
            <span class="action-disabled" title="No se puede modificar al administrador">
              <i class="fas fa-ban"></i>
            </span>
          `}
        </div>
      </td>
    </tr>
  `;
}

function renderEditUserRow(user) {
  const isActive = user.activo !== false && user.rol !== ROLES.DISABLED;

  return `
    <tr class="table-row--editing">
      <td data-label="Usuario">
        <input 
          type="text" 
          class="edit-input" 
          data-field="usuario" 
          value="${escapeHtml(user.usuario)}"
          placeholder="Usuario"
          maxlength="30"
        >
      </td>
      <td data-label="Correo">
        <input 
          type="email" 
          class="edit-input" 
          data-field="correo" 
          value="${escapeHtml(user.correo)}"
          placeholder="Correo"
          maxlength="50"
        >
      </td>
      <td data-label="Rol">
        <div class="select-wrapper">
          <select class="edit-select" data-field="rol">
            ${Object.entries(ROLES)
              .filter(([key, value]) => value !== ROLES.DISABLED && value !== ROLES.ADMIN)
              .map(([key, value]) => `
                <option value="${value}" ${user.rol === value ? 'selected' : ''}>
                  ${getRoleDisplayName(value)}
                </option>
              `).join('')}
          </select>
          <i class="fas fa-chevron-down select-arrow"></i>
        </div>
      </td>
      <td data-label="Estado">
        <label class="switch">
          <input type="checkbox" data-field="activo" ${isActive ? 'checked' : ''}>
          <span class="slider"></span>
        </label>
      </td>
      <td data-label="Acciones" colspan="2">
        <div class="edit-actions">
          <button class="btn btn--success btn--xs" data-action="save" data-id="${user._id}">
            <i class="fas fa-check"></i>
          </button>
          <button class="btn btn--outline btn--xs" data-action="cancel">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </td>
    </tr>
  `;
}

// =============================================================================
// RENDERIZADO DE DESCRIPCIONES DE ROLES
// =============================================================================

function renderRoleDescriptions() {
  const rolesToShow = [
    ROLES.ADMIN,
    ROLES.GERENTE,
    ROLES.SUPERVISOR,
    ROLES.EDITOR,
    ROLES.REVISOR,
    ROLES.LECTOR
  ];

  return `
    <div class="role-descriptions">
      ${rolesToShow.map(role => `
        <div class="role-description-item">
          <i class="${ROLE_ICONS[role]}"></i>
          <div class="role-description-content">
            <div class="role-description-title">${getRoleDisplayName(role)}</div>
            <div class="role-description-text">${ROLE_DESCRIPTIONS[role]}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// =============================================================================
// RENDERIZADO PRINCIPAL
// =============================================================================

export async function renderAgregarAdministrador() {
  const container = document.getElementById('admin-content');
  if (!container) return;

  if (!hasPermission(PERMISSIONS.MANAGE_USERS)) {
    container.innerHTML = `
      <div class="admin-access-denied">
        <div class="access-denied-content">
          <i class="fas fa-lock fa-3x"></i>
          <h3>Acceso Restringido</h3>
          <p>No tienes permisos para gestionar usuarios.</p>
        </div>
      </div>
    `;
    return;
  }

  // Mostrar loader
  container.innerHTML = `
    <div class="admin-loading">
      <div class="loading-spinner">
        <i class="fas fa-spinner fa-spin fa-2x"></i>
      </div>
      <p>Cargando usuarios...</p>
    </div>
  `;

  try {
    const { users, stats } = await loadUsers();
    const currentUserId = getCurrentUserId();
    let editingUserId = null;

    // Renderizar estructura
    container.innerHTML = `
      <div class="admin-dashboard">
        <!-- Encabezado -->
        <div class="admin-header">
          <div>
            <h1 class="admin-title">
              <i class="fas fa-users-cog"></i>
              Gestión de Usuarios
            </h1>
            <p class="admin-subtitle">Administra usuarios, roles y permisos</p>
          </div>
          <div class="admin-header-right">
            <div class="admin-search">
              <i class="fas fa-search"></i>
              <input type="text" id="adminSearchInput" placeholder="Buscar usuarios...">
            </div>
            <button class="btn btn--primary btn--sm" id="refreshUsersBtn" title="Actualizar">
              <i class="fas fa-sync-alt"></i>
            </button>
          </div>
        </div>

        <!-- Estadísticas -->
        <div class="admin-stats-grid">
          <div class="stat-card stat-card--total">
            <div class="stat-card__icon"><i class="fas fa-users"></i></div>
            <div class="stat-card__content">
              <span class="stat-card__label">Total</span>
              <span class="stat-card__value">${stats.total}</span>
            </div>
          </div>
          <div class="stat-card stat-card--active">
            <div class="stat-card__icon"><i class="fas fa-check-circle"></i></div>
            <div class="stat-card__content">
              <span class="stat-card__label">Activos</span>
              <span class="stat-card__value">${stats.active}</span>
            </div>
          </div>
          <div class="stat-card stat-card--inactive">
            <div class="stat-card__icon"><i class="fas fa-user-slash"></i></div>
            <div class="stat-card__content">
              <span class="stat-card__label">Inactivos</span>
              <span class="stat-card__value">${stats.inactive}</span>
            </div>
          </div>
          <div class="stat-card stat-card--admin">
            <div class="stat-card__icon"><i class="fas fa-crown"></i></div>
            <div class="stat-card__content">
              <span class="stat-card__label">Admins</span>
              <span class="stat-card__value">${stats.admins}</span>
            </div>
          </div>
        </div>

        <!-- Grid de dos columnas -->
        <div class="admin-grid">
          <!-- Crear usuario -->
          <div class="admin-card admin-card--create">
            <div class="admin-card-header">
              <h2 class="admin-card-title">
                <i class="fas fa-user-plus"></i>
                Crear Usuario
              </h2>
              ${stats.admins > 0 ? '<span class="admin-warning"><i class="fas fa-info-circle"></i> 1 admin máximo</span>' : ''}
            </div>
            <div class="admin-card-body">
              <div id="adminCreateUserResult"></div>
              <form id="adminCreateUserForm">
                <div class="form-grid">
                  <div class="form-group">
                    <label class="form-label"><i class="fas fa-user"></i> Usuario</label>
                    <input type="text" id="admin_usuario" class="form-input-admin" required minlength="3" maxlength="30" placeholder="ej: juan.perez">
                  </div>
                  <div class="form-group">
                    <label class="form-label"><i class="fas fa-envelope"></i> Correo</label>
                    <input type="email" id="admin_correo" class="form-input-admin" required maxlength="50" placeholder="correo@ejemplo.com">
                  </div>
                  <div class="form-group">
                    <label class="form-label"><i class="fas fa-lock"></i> Contraseña</label>
                    <div class="password-wrapper">
                      <input type="password" id="admin_password" class="form-input-admin" required minlength="6" placeholder="••••••">
                      <button type="button" class="password-toggle" onclick="togglePasswordVisibility('admin_password')">
                        <i class="fas fa-eye"></i>
                      </button>
                    </div>
                  </div>
                  <div class="form-group">
                    <label class="form-label"><i class="fas fa-tag"></i> Rol</label>
                    <div class="select-wrapper">
                      <select id="admin_rol" class="form-select" required>
                        <option value="">Seleccionar rol</option>
                        ${Object.entries(ROLES)
                          .filter(([key, value]) => value !== ROLES.ADMIN || stats.admins === 0)
                          .map(([key, value]) => `
                            <option value="${value}">${getRoleDisplayName(value)}</option>
                          `).join('')}
                      </select>
                      <i class="fas fa-chevron-down select-arrow"></i>
                    </div>
                  </div>
                </div>
                <div class="form-actions">
                  <button type="submit" class="btn btn--primary btn--sm" id="adminCreateUserBtn">
                    <i class="fas fa-user-plus"></i> Crear Usuario
                  </button>
                  <button type="button" class="btn btn--outline btn--sm" id="adminResetFormBtn" title="Limpiar">
                    <i class="fas fa-undo"></i>
                  </button>
                </div>
              </form>
            </div>
          </div>

          <!-- Descripciones de roles -->
          <div class="admin-card admin-card--stats">
            <div class="admin-card-header">
              <h2 class="admin-card-title">
                <i class="fas fa-info-circle"></i>
                Roles del Sistema
              </h2>
            </div>
            <div class="admin-card-body">
              ${renderRoleDescriptions()}
            </div>
          </div>
        </div>

        <!-- Lista de usuarios -->
        <div class="admin-card admin-card--users">
          <div class="admin-card-header">
            <h2 class="admin-card-title">
              <i class="fas fa-list"></i>
              Usuarios Registrados
            </h2>
            <span class="users-count">${users.length}</span>
          </div>
          <div class="admin-card-body">
            <div class="table-responsive">
              <table class="admin-table" id="adminUsersTable">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Correo</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Último acceso</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody id="adminUsersList">
                  ${users.length > 0 
                    ? users.map(user => renderUserRow(user, editingUserId, currentUserId)).join('')
                    : `
                      <tr>
                        <td colspan="6" class="empty-state">
                          <div class="empty-state__icon"><i class="fas fa-users"></i></div>
                          <h3 class="empty-state__title">No hay usuarios</h3>
                          <p class="empty-state__description">Comienza creando el primer usuario</p>
                        </td>
                      </tr>
                    `
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

    // =========================================================================
    // EVENT LISTENERS
    // =========================================================================

    const usersListEl = document.getElementById('adminUsersList');
    const searchInput = document.getElementById('adminSearchInput');
    const refreshBtn = document.getElementById('refreshUsersBtn');
    const form = document.getElementById('adminCreateUserForm');
    const resetBtn = document.getElementById('adminResetFormBtn');
    const resultEl = document.getElementById('adminCreateUserResult');

    // Búsqueda en tiempo real
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        
        if (!term) {
          usersListEl.innerHTML = users.map(u => renderUserRow(u, editingUserId, currentUserId)).join('');
          return;
        }
        
        const filtered = users.filter(user => 
          user.usuario.toLowerCase().includes(term) ||
          user.correo.toLowerCase().includes(term) ||
          getRoleDisplayName(user.rol).toLowerCase().includes(term)
        );
        
        usersListEl.innerHTML = filtered.length > 0
          ? filtered.map(u => renderUserRow(u, editingUserId, currentUserId)).join('')
          : `
            <tr>
              <td colspan="6" class="empty-state">
                <div class="empty-state__icon"><i class="fas fa-search"></i></div>
                <h3 class="empty-state__title">No se encontraron resultados</h3>
                <p class="empty-state__description">Intenta con otros términos de búsqueda</p>
              </td>
            </tr>
          `;
      });
    }

    // Refresh
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => renderAgregarAdministrador());
    }

    // Reset form
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        form.reset();
        resultEl.innerHTML = '';
      });
    }

    // Acciones en tabla
    usersListEl?.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;

      const action = btn.getAttribute('data-action');
      const id = btn.getAttribute('data-id');
      const name = btn.getAttribute('data-name');

      switch (action) {
        case 'edit':
          editingUserId = String(id);
          usersListEl.innerHTML = users.map(u => renderUserRow(u, editingUserId, currentUserId)).join('');
          break;

        case 'cancel':
          editingUserId = null;
          usersListEl.innerHTML = users.map(u => renderUserRow(u, editingUserId, currentUserId)).join('');
          break;

        case 'save':
          const row = btn.closest('tr');
          if (!row) return;

          const usuario = row.querySelector('[data-field="usuario"]')?.value?.trim();
          const correo = row.querySelector('[data-field="correo"]')?.value?.trim();
          const rol = row.querySelector('[data-field="rol"]')?.value;
          const activoCheckbox = row.querySelector('[data-field="activo"]');
          const activo = activoCheckbox ? activoCheckbox.checked : true;

          if (!usuario || !correo || !rol) {
            showAlert('Todos los campos son requeridos', 'error');
            return;
          }

          try {
            setLoadingState(true);
            const response = await api.call(`/admin/users/${id}`, {
              method: 'PATCH',
              body: { usuario, correo, rol, activo }
            });

            if (response?.success) {
              showAlert('Usuario actualizado correctamente', 'success');
              await renderAgregarAdministrador();
            }
          } catch (error) {
            showAlert('Error al actualizar usuario', 'error');
          } finally {
            setLoadingState(false);
          }
          break;

        case 'deactivate':
          const deactivated = await deactivateUser(id, name);
          if (deactivated) await renderAgregarAdministrador();
          break;

        case 'reactivate':
          const reactivated = await reactivateUser(id, name);
          if (reactivated) await renderAgregarAdministrador();
          break;

        case 'delete':
          const deleted = await deleteUserPermanently(id, name);
          if (deleted) await renderAgregarAdministrador();
          break;
      }
    });

    // Crear usuario
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const usuario = document.getElementById('admin_usuario')?.value?.trim();
      const correo = document.getElementById('admin_correo')?.value?.trim();
      const password = document.getElementById('admin_password')?.value;
      const rol = document.getElementById('admin_rol')?.value;

      if (!usuario || !correo || !password || !rol) {
        showAlert('Todos los campos son requeridos', 'error');
        return;
      }

      if (rol === ROLES.ADMIN && stats.admins > 0) {
        showAlert('Ya existe un administrador en el sistema', 'error');
        return;
      }

      try {
        setLoadingState(true, document.getElementById('adminCreateUserBtn'));

        const response = await api.call('/admin/users', {
          method: 'POST',
          body: { usuario, correo, password, rol }
        });

        if (response?.success) {
          showAlert('Usuario creado exitosamente', 'success');
          form.reset();
          await renderAgregarAdministrador();
        }
      } catch (error) {
        showAlert(error.message || 'Error al crear usuario', 'error');
      } finally {
        setLoadingState(false);
      }
    });

    // Función global para toggle password
    window.togglePasswordVisibility = (inputId) => {
      const input = document.getElementById(inputId);
      const button = input?.nextElementSibling;
      if (input && button) {
        const type = input.type === 'password' ? 'text' : 'password';
        input.type = type;
        button.innerHTML = type === 'password' 
          ? '<i class="fas fa-eye"></i>' 
          : '<i class="fas fa-eye-slash"></i>';
      }
    };

  } catch (error) {
    console.error('Error en renderAgregarAdministrador:', error);
    container.innerHTML = `
      <div class="admin-error">
        <i class="fas fa-exclamation-triangle fa-2x"></i>
        <p>Error al cargar: ${escapeHtml(error.message)}</p>
        <button class="btn btn--primary btn--sm" onclick="renderAgregarAdministrador()">
          Reintentar
        </button>
      </div>
    `;
  }
}

async function loadUsers() {
  try {
    const response = await api.call('/admin/users');
    const users = response?.users || [];
    
    const stats = {
      total: users.length,
      active: users.filter(u => u.activo !== false && u.rol !== ROLES.DISABLED).length,
      inactive: users.filter(u => u.activo === false || u.rol === ROLES.DISABLED).length,
      admins: users.filter(u => u.rol === ROLES.ADMIN).length
    };
    
    return { users, stats };
  } catch (error) {
    console.error('Error cargando usuarios:', error);
    return { users: [], stats: { total: 0, active: 0, inactive: 0, admins: 0 } };
  }
}

// Hacer función global
window.renderAgregarAdministrador = renderAgregarAdministrador;