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
// PRELOADER - CORREGIDO
// =============================================================================

let activePreloader = null;

function showPreloader(message = 'Procesando...') {
  // Ocultar preloader anterior si existe
  if (activePreloader) {
    hidePreloader();
  }
  
  const preloaderId = 'admin-preloader-' + Date.now();
  const preloaderHTML = `
    <div id="${preloaderId}" class="admin-preloader-overlay" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background-color: rgba(0, 0, 0, 0.7); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); z-index: 999999; display: flex; align-items: center; justify-content: center; margin: 0; padding: 0;">
      <div class="admin-preloader-content" style="text-align: center; max-width: 400px; padding: 2rem; background: var(--bg-primary); border-radius: var(--radius-xl); box-shadow: var(--shadow-xl); border: 1px solid var(--border); animation: preloaderFadeIn 0.3s ease;">
        <div class="admin-preloader-spinner" style="color: var(--primary); margin-bottom: 1rem; font-size: 2rem;">
          <i class="fas fa-spinner fa-spin fa-3x"></i>
        </div>
        <div class="admin-preloader-message" style="color: var(--text-primary); font-size: 1rem; font-weight: 500;">${message}</div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', preloaderHTML);
  document.body.classList.add('preloader-active');
  
  activePreloader = preloaderId;
  
  // Forzar un reflow para asegurar que se muestre
  setTimeout(() => {
    const preloader = document.getElementById(preloaderId);
    if (preloader) {
      preloader.style.display = 'flex';
    }
  }, 10);
  
  return preloaderId;
}

function hidePreloader() {
  if (activePreloader) {
    const preloader = document.getElementById(activePreloader);
    if (preloader) {
      preloader.remove();
    }
    activePreloader = null;
  }
  
  if (!document.querySelector('.admin-preloader-overlay')) {
    document.body.classList.remove('preloader-active');
  }
}

// =============================================================================
// MODAL DE CONFIRMACIÓN - CORREGIDO
// =============================================================================

let activeModal = null;

function closeModal() {
  if (activeModal) {
    // Remover el modal del DOM
    if (activeModal.parentNode) {
      activeModal.remove();
    }
    activeModal = null;
    document.body.classList.remove('modal-open');
  }
}

function createConfirmModal(options) {
  return new Promise((resolve) => {
    // Cerrar modal anterior si existe
    closeModal();

    const modal = document.createElement('div');
    modal.className = 'admin-modal';
    modal.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background-color: rgba(0, 0, 0, 0.7) !important;
      backdrop-filter: blur(8px) !important;
      -webkit-backdrop-filter: blur(8px) !important;
      z-index: 1000000 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      margin: 0 !important;
      padding: 20px !important;
      box-sizing: border-box !important;
    `;
    
    const iconMap = {
      warning: 'fa-exclamation-triangle',
      danger: 'fa-trash-alt',
      success: 'fa-check-circle',
      info: 'fa-info-circle'
    };
    
    const colorMap = {
      warning: 'var(--warning)',
      danger: 'var(--danger)',
      success: 'var(--success)',
      info: 'var(--info)'
    };
    
    const icon = iconMap[options.type] || 'fa-question-circle';
    const color = colorMap[options.type] || 'var(--primary)';
    
    modal.innerHTML = `
      <div class="modal__content" style="max-width: 450px; width: 100%; background: var(--bg-primary); border-radius: var(--radius-xl); box-shadow: var(--shadow-xl); border: 1px solid var(--border); position: relative; animation: modalSlideIn 0.3s ease;">
        <header class="modal__header" style="padding: 1.75rem 1.75rem 1rem; display: flex; justify-content: space-between; align-items: flex-start; position: relative;">
          <h3 class="modal__title" style="margin: 0; font-size: 1.5rem; font-weight: 700; color: var(--text-primary);">${options.title || 'Confirmar acción'}</h3>
          <button class="modal__close admin-modal-close" style="background: var(--bg-tertiary); border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-secondary); width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 50%; margin-left: auto;">&times;</button>
        </header>
        <section class="modal__body" style="padding: 1.75rem; overflow-y: auto;">
          <div class="action-modal__content" style="text-align: center;">
            <div class="action-modal__icon" style="color: ${color}; font-size: 48px; margin-bottom: 16px;">
              <i class="fas ${icon} fa-3x"></i>
            </div>
            <p class="action-modal__message" style="font-size: 16px; line-height: 1.5; color: var(--text-primary); margin: 0 0 0.5rem 0;">${options.message || '¿Estás seguro?'}</p>
            ${options.details ? `<p class="action-modal__details" style="color: var(--text-secondary); font-size: 0.9rem;">${options.details}</p>` : ''}
          </div>
        </section>
        <footer class="modal__footer modal__footer--centered" style="padding: 1rem 1.75rem 1.75rem; display: flex; justify-content: center; gap: 0.75rem; position: relative;">
          <button class="btn btn--outline admin-modal-cancel" style="padding: 0.6rem 1.2rem; border-radius: var(--radius-md); font-size: 0.9rem; cursor: pointer;">${options.cancelText || 'Cancelar'}</button>
          <button class="btn btn--${options.type === 'danger' ? 'danger' : 'primary'} admin-modal-confirm" style="padding: 0.6rem 1.2rem; border-radius: var(--radius-md); font-size: 0.9rem; cursor: pointer;">${options.confirmText || 'Confirmar'}</button>
        </footer>
      </div>
    `;
    
    document.body.appendChild(modal);
    activeModal = modal;
    document.body.classList.add('modal-open');
    
    // Configurar eventos
    const closeBtn = modal.querySelector('.admin-modal-close');
    const cancelBtn = modal.querySelector('.admin-modal-cancel');
    const confirmBtn = modal.querySelector('.admin-modal-confirm');
    
    const handleClose = () => {
      closeModal();
      resolve(false);
    };
    
    const handleConfirm = () => {
      closeModal();
      resolve(true);
    };
    
    closeBtn.addEventListener('click', handleClose);
    cancelBtn.addEventListener('click', handleClose);
    confirmBtn.addEventListener('click', handleConfirm);
    
    // Cerrar con Escape
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', handleEscape);
        handleClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    
    // Clic fuera del modal
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        handleClose();
      }
    });
  });
}

// =============================================================================
// FUNCIONES DE ACCIONES CON PRELOADER CORREGIDO
// =============================================================================

async function deactivateUser(userId, userName) {
  const confirmed = await createConfirmModal({
    title: '¿Desactivar usuario?',
    message: `El usuario "${userName}" no podrá iniciar sesión hasta que sea reactivado.`,
    confirmText: 'Desactivar',
    cancelText: 'Cancelar',
    type: 'warning'
  });
  
  if (!confirmed) return false;
  
  // Mostrar preloader antes de la petición
  const preloaderId = showPreloader('Desactivando usuario...');
  
  // Pequeño retraso para asegurar que el preloader se muestre
  await new Promise(resolve => setTimeout(resolve, 50));
  
  try {
    const response = await api.call(`/admin/users/${userId}/deactivate`, { 
      method: 'PATCH',
      body: { activo: false }
    });

        // 👇 AGREGAR RETRASO ARTIFICIAL DE 1 SEGUNDO
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    hidePreloader();
    
    if (response?.success) {
      showAlert('Usuario desactivado correctamente', 'success');
      return true;
    } else {
      throw new Error(response?.message || 'Error al desactivar usuario');
    }
  } catch (error) {
    hidePreloader();
    console.error('Error desactivando usuario:', error);
    showAlert(error.message || 'Error al desactivar usuario', 'error');
    return false;
  }
}

async function deleteUserPermanently(userId, userName) {
  const confirmed = await createConfirmModal({
    title: '⚠️ ¿Eliminar usuario permanentemente?',
    message: `Esta acción eliminará permanentemente al usuario "${userName}".`,
    details: 'NO SE PUEDE DESHACER. Todos sus datos serán eliminados.',
    confirmText: 'Eliminar permanentemente',
    cancelText: 'Cancelar',
    type: 'danger'
  });
  
  if (!confirmed) return false;
  
  // Mostrar preloader antes de la petición
  const preloaderId = showPreloader('Eliminando usuario permanentemente...');
  
  // Pequeño retraso para asegurar que el preloader se muestre
  await new Promise(resolve => setTimeout(resolve, 50));
  
  try {
    const response = await api.call(`/admin/users/${userId}`, { 
      method: 'DELETE' 
    });

        // 👇 AGREGAR RETRASO ARTIFICIAL DE 1 SEGUNDO
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    hidePreloader();
    
    if (response?.success) {
      showAlert('Usuario eliminado permanentemente', 'success');
      return true;
    } else {
      throw new Error(response?.message || 'Error al eliminar usuario');
    }
  } catch (error) {
    hidePreloader();
    console.error('Error eliminando usuario:', error);
    showAlert(error.message || 'Error al eliminar usuario', 'error');
    return false;
  }
}

async function reactivateUser(userId, userName) {
  const confirmed = await createConfirmModal({
    title: '¿Reactivar usuario?',
    message: `El usuario "${userName}" podrá iniciar sesión nuevamente.`,
    confirmText: 'Reactivar',
    cancelText: 'Cancelar',
    type: 'success'
  });
  
  if (!confirmed) return false;
  
  // Mostrar preloader antes de la petición
  const preloaderId = showPreloader('Reactivando usuario...');
  
  // Pequeño retraso para asegurar que el preloader se muestre
  await new Promise(resolve => setTimeout(resolve, 50));
  
  try {
    const response = await api.call(`/admin/users/${userId}/reactivate`, { 
      method: 'PATCH',
      body: { activo: true, rol: 'lector' }
    });

        // 👇 AGREGAR RETRASO ARTIFICIAL DE 1 SEGUNDO
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    hidePreloader();
    
    if (response?.success) {
      showAlert('Usuario reactivado correctamente', 'success');
      return true;
    } else {
      throw new Error(response?.message || 'Error al reactivar usuario');
    }
  } catch (error) {
    hidePreloader();
    console.error('Error reactivando usuario:', error);
    showAlert(error.message || 'Error al reactivar usuario', 'error');
    return false;
  }
}

async function updateUser(userId, userData) {
  // Mostrar preloader antes de la petición
  const preloaderId = showPreloader('Actualizando usuario...');
  
  // Pequeño retraso para asegurar que el preloader se muestre
  await new Promise(resolve => setTimeout(resolve, 50));
  
  try {
    const response = await api.call(`/admin/users/${userId}`, {
      method: 'PATCH',
      body: userData
    });

        // 👇 AGREGAR RETRASO ARTIFICIAL DE 1 SEGUNDO
    await new Promise(resolve => setTimeout(resolve, 1000));

    hidePreloader();
    
    if (response?.success) {
      showAlert('Usuario actualizado correctamente', 'success');
      return true;
    } else {
      throw new Error(response?.message || 'Error al actualizar usuario');
    }
  } catch (error) {
    hidePreloader();
    showAlert(error.message || 'Error al actualizar usuario', 'error');
    return false;
  }
}

async function createUser(userData) {
  // Mostrar preloader antes de la petición
  const preloaderId = showPreloader('Creando usuario...');
  
  // Pequeño retraso para asegurar que el preloader se muestre
  await new Promise(resolve => setTimeout(resolve, 50));
  
  try {
    const response = await api.call('/admin/users', {
      method: 'POST',
      body: userData
    });

        // 👇 AGREGAR RETRASO ARTIFICIAL DE 1 SEGUNDO
    await new Promise(resolve => setTimeout(resolve, 1000));

    hidePreloader();
    
    if (response?.success) {
      showAlert('Usuario creado exitosamente', 'success');
      return true;
    } else {
      throw new Error(response?.message || 'Error al crear usuario');
    }
  } catch (error) {
    hidePreloader();
    showAlert(error.message || 'Error al crear usuario', 'error');
    return false;
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
// RENDERIZADO DE ESTADÍSTICAS DE ROLES
// =============================================================================

function renderRoleStats(users) {
  // Calcular estadísticas por rol
  const roleStats = {};
  
  Object.values(ROLES).forEach(role => {
    if (role !== ROLES.DISABLED) {
      roleStats[role] = users.filter(u => u.rol === role && u.activo !== false).length;
    }
  });
  
  // Total de usuarios activos
  const totalActivos = users.filter(u => u.activo !== false && u.rol !== ROLES.DISABLED).length;
  
  return `
    <div class="role-stats">
      <div class="role-stats-header">
        <h3 class="role-stats-title">
          <i class="fas fa-chart-pie"></i>
          Distribución por Rol
        </h3>
        <span class="role-stats-total">${totalActivos} activos</span>
      </div>
      <div class="role-stats-grid">
        ${Object.entries(roleStats)
          .filter(([role, count]) => count > 0 || role === ROLES.LECTOR)
          .map(([role, count]) => {
            const percentage = totalActivos > 0 ? Math.round((count / totalActivos) * 100) : 0;
            const roleClass = ROLE_COLORS[role] || 'secondary';
            
            return `
              <div class="role-stat-item" title="${ROLE_DESCRIPTIONS[role]}">
                <div class="role-stat-info">
                  <div class="role-stat-label">
                    <i class="${ROLE_ICONS[role]}" style="color: var(--${roleClass});"></i>
                    <span>${getRoleDisplayName(role)}</span>
                  </div>
                  <span class="role-stat-count">${count}</span>
                </div>
                <div class="role-stat-bar">
                  <div class="role-stat-progress" style="width: ${percentage}%; background-color: var(--${roleClass});"></div>
                </div>
                <span class="role-stat-percentage">${percentage}%</span>
              </div>
            `;
          }).join('')}
      </div>
      
      <div class="role-stats-footer">
        <div class="role-stat-quick">
          <i class="fas fa-user-check" style="color: var(--success);"></i>
          <span>${users.filter(u => u.activo !== false).length} activos</span>
        </div>
        <div class="role-stat-quick">
          <i class="fas fa-user-slash" style="color: var(--warning);"></i>
          <span>${users.filter(u => u.activo === false || u.rol === ROLES.DISABLED).length} inactivos</span>
        </div>
        <div class="role-stat-quick">
          <i class="fas fa-crown" style="color: var(--danger);"></i>
          <span>${users.filter(u => u.rol === ROLES.ADMIN).length} admin</span>
        </div>
      </div>
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

              <!-- ESTADÍSTICAS DE ROLES -->
              <div class="role-stats-container">
                ${renderRoleStats(users)}
              </div>
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

          const updated = await updateUser(id, { usuario, correo, rol, activo });
          if (updated) {
            await renderAgregarAdministrador();
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

      const created = await createUser({ usuario, correo, password, rol });
      if (created) {
        form.reset();
        await renderAgregarAdministrador();
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