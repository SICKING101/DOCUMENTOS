// src/frontend/permissions.js
// Sistema de permisos del frontend.
//
// ARQUITECTURA:
//   • Solo existen DOS roles fijos en el sistema:
//       - "administrador"  → acceso total, hardcoded en backend y frontend
//       - "desactivado"    → sin acceso, hardcoded
//   • TODOS los demás roles son DINÁMICOS: se crean desde el panel de Admin
//     y se almacenan en MongoDB (colección roles).
//   • Este archivo NO define gerente/editor/lector/etc. — esos roles fijos
//     fueron eliminados. El campo `rol` del usuario es simplemente un String
//     libre que coincide con el nombre del rol dinámico creado por el admin.
//
// DEBUG: activar con localStorage.setItem('permisos_debug', '1')

const DEBUG = localStorage.getItem('permisos_debug') === '1' || true;
function plog(...args)  { if (DEBUG) console.log('🔐 [Permisos]', ...args); }
function pwarn(...args) { if (DEBUG) console.warn('⚠️ [Permisos]', ...args); }
function perr(...args)  { console.error('❌ [Permisos]', ...args); }

// =============================================================================
// ROLES FIJOS (solo estos dos son especiales)
// =============================================================================

export const ROLES = {
  ADMIN:    'administrador',
  DISABLED: 'desactivado',
};

// =============================================================================
// PERMISOS DE ACCIONES DE LA APP (para hasPermission())
// Estos son permisos de la UI, no de secciones.
// El administrador tiene todos. Los roles dinámicos solo tienen MANAGE_USERS = false.
// =============================================================================

export const PERMISSIONS = {
  // Gestión de usuarios y roles (solo admin)
  MANAGE_USERS:       'manage_users',
  MANAGE_ROLES:       'manage_roles',
  // Acceso a auditoría (solo admin)
  VIEW_AUDIT:         'view_audit',
  // Puede ver su propio perfil
  VIEW_PROFILE:       'view_profile',
};

// =============================================================================
// CACHE DE PERMISOS DEL USUARIO ACTUAL
// =============================================================================

let _permissionsCache = null;   // { [section]: { canView, canAction } }
let _currentUserRole  = null;   // string — nombre del rol actual

/**
 * Carga desde la API los permisos del rol del usuario logueado y los cachea.
 * Debe llamarse justo después del login y al cambiar de rol.
 */
export async function loadCurrentPermissions() {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) { pwarn('loadCurrentPermissions: no hay usuario en localStorage'); return null; }

    const user = JSON.parse(userStr);
    const rol  = user.rol || user.role;

    if (!rol) { pwarn('loadCurrentPermissions: usuario sin campo "rol"'); return null; }

    plog('loadCurrentPermissions: cargando permisos para rol=', rol);
    _currentUserRole = rol;

    // El administrador tiene acceso total — no necesita consultar la API
    if (rol === ROLES.ADMIN) {
      _permissionsCache = { __admin: true };
      plog('loadCurrentPermissions: usuario administrador → acceso total');
      return _permissionsCache;
    }

    // Desactivado: sin acceso
    if (rol === ROLES.DISABLED) {
      _permissionsCache = {};
      pwarn('loadCurrentPermissions: usuario desactivado → sin permisos');
      return _permissionsCache;
    }

    // Consultar el mapa de permisos del rol dinámico
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/roles/permissions/${encodeURIComponent(rol)}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
      },
    });

    if (!response.ok) {
      pwarn(`loadCurrentPermissions: respuesta ${response.status} del servidor`);
      _permissionsCache = {};
      return null;
    }

    const data = await response.json();
    if (data?.success && data?.data) {
      _permissionsCache = data.data;
      plog('loadCurrentPermissions: permisos cargados →', _permissionsCache);
      return _permissionsCache;
    }

    pwarn('loadCurrentPermissions: respuesta inválida', data);
    _permissionsCache = {};
    return null;

  } catch (e) {
    perr('loadCurrentPermissions error:', e);
    _permissionsCache = {};
    return null;
  }
}

/**
 * Invalida el cache de permisos.
 * Llamar cuando el admin cambia el rol de un usuario o modifica un rol.
 */
export function invalidatePermissionsCache() {
  plog('invalidatePermissionsCache: cache limpiado');
  _permissionsCache = null;
  _currentUserRole  = null;
}

// =============================================================================
// VERIFICACIÓN DE PERMISOS
// =============================================================================

/**
 * Verifica si el usuario actual tiene un permiso de ACCIÓN de la app.
 * Solo el administrador tiene MANAGE_USERS, MANAGE_ROLES y VIEW_AUDIT.
 */
export function hasPermission(permission) {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return false;
    const user = JSON.parse(userStr);
    const rol  = user.rol || user.role;

    if (rol === ROLES.ADMIN) return true; // admin tiene todo

    // Permisos que solo el admin tiene
    const adminOnly = [
      PERMISSIONS.MANAGE_USERS,
      PERMISSIONS.MANAGE_ROLES,
      PERMISSIONS.VIEW_AUDIT,
    ];
    if (adminOnly.includes(permission)) {
      plog(`hasPermission("${permission}"): false — solo admin`);
      return false;
    }

    // Permisos que cualquier usuario activo tiene
    if (permission === PERMISSIONS.VIEW_PROFILE) return true;

    return false;
  } catch (e) {
    perr('hasPermission error:', e);
    return false;
  }
}

/**
 * Verifica si el usuario puede VER una sección del sidebar.
 * Admin siempre puede. Roles dinámicos según su configuración de permisos.
 */
export function canView(section) {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return false;
    const user = JSON.parse(userStr);
    const rol  = user.rol || user.role;

    // Admin ve todo
    if (rol === ROLES.ADMIN) return true;

    // Desactivado no ve nada
    if (rol === ROLES.DISABLED) return false;

    // Secciones exclusivas del admin
    if (section === 'admin' || section === 'auditoria') {
      plog(`canView("${section}"): false — exclusiva del admin`);
      return false;
    }

    // Sin cache → denegar y loggear
    if (!_permissionsCache) {
      pwarn(`canView("${section}"): sin cache de permisos, llamar loadCurrentPermissions() primero`);
      return false;
    }

    const perm = _permissionsCache[section];
    const result = Boolean(perm?.canView);
    plog(`canView("${section}"):`, result);
    return result;

  } catch (e) {
    perr('canView error:', e);
    return false;
  }
}

/**
 * Verifica si el usuario puede ACTUAR (crear/editar/eliminar) en una sección.
 */
export function canAction(section) {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return false;
    const user = JSON.parse(userStr);
    const rol  = user.rol || user.role;

    if (rol === ROLES.ADMIN)    return true;
    if (rol === ROLES.DISABLED) return false;

    if (!_permissionsCache) {
      pwarn(`canAction("${section}"): sin cache de permisos`);
      return false;
    }

    const perm = _permissionsCache[section];
    const result = Boolean(perm?.canAction);
    plog(`canAction("${section}"):`, result);
    return result;

  } catch (e) {
    perr('canAction error:', e);
    return false;
  }
}

/**
 * Aplica permisos de visibilidad al sidebar.
 * Oculta los nav-links cuyas secciones el usuario no puede ver.
 * Los elementos deben tener data-section="nombre_seccion".
 */
export function applyNavigationPermissions() {
  plog('applyNavigationPermissions: aplicando...');

  const navLinks = document.querySelectorAll('[data-section]');
  let hidden = 0, visible = 0;

  navLinks.forEach(link => {
    const section = link.getAttribute('data-section');
    if (!section) return;

    if (canView(section)) {
      link.style.display = '';
      visible++;
    } else {
      link.style.display = 'none';
      hidden++;
    }
  });

  plog(`applyNavigationPermissions: ${visible} visibles, ${hidden} ocultos`);
}

/**
 * Aplica permisos de acción en la página actual.
 * Oculta botones con data-action-section si canAction = false.
 * Para botones con data-requires-action, muestra alerta en lugar de ocultarlos.
 */
export function applyActionPermissions() {
  plog('applyActionPermissions: aplicando...');

  // Botones que se OCULTAN si no hay permiso
  const actionBtns = document.querySelectorAll('[data-action-section]');
  actionBtns.forEach(btn => {
    const section = btn.getAttribute('data-action-section');
    btn.style.display = canAction(section) ? '' : 'none';
  });
  plog(`applyActionPermissions: ${actionBtns.length} botones procesados`);

  // Botones que muestran ALERTA si no hay permiso (en lugar de ocultarse)
  const requiresBtns = document.querySelectorAll('[data-requires-action]');
  requiresBtns.forEach(btn => {
    const section = btn.getAttribute('data-requires-action');
    if (!canAction(section)) {
      btn.removeEventListener('click', _noPermissionHandler);
      btn.addEventListener('click', _noPermissionHandler);
    }
  });
  plog(`applyActionPermissions: ${requiresBtns.length} botones con intercept`);
}

function _noPermissionHandler(e) {
  e.preventDefault();
  e.stopPropagation();
  showNoPermissionAlert();
}

/**
 * Muestra una alerta visual de "sin permisos".
 */
export function showNoPermissionAlert() {
  const existing = document.getElementById('permisos-no-perm-alert');
  if (existing) existing.remove();

  const alert = document.createElement('div');
  alert.id = 'permisos-no-perm-alert';
  alert.style.cssText = `
    position:fixed;top:20px;right:20px;z-index:9999999;
    background:#1e293b;color:#fff;
    padding:12px 20px;border-radius:10px;
    box-shadow:0 8px 24px rgba(0,0,0,0.3);
    display:flex;align-items:center;gap:10px;
    font-size:0.9rem;font-weight:500;
    border-left:4px solid #dc2626;
    animation:permisos-alert-in 0.25s ease;
  `;
  alert.innerHTML = `
    <i class="fas fa-ban" style="color:#dc2626;font-size:1.1rem;"></i>
    <span>No tienes permisos para realizar esta acción</span>
  `;

  // Inyectar keyframe si no existe
  if (!document.getElementById('permisos-alert-style')) {
    const style = document.createElement('style');
    style.id = 'permisos-alert-style';
    style.textContent = `
      @keyframes permisos-alert-in {
        from { opacity:0; transform:translateY(-10px) scale(0.95); }
        to   { opacity:1; transform:translateY(0) scale(1); }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(alert);
  setTimeout(() => {
    alert.style.opacity = '0';
    alert.style.transition = 'opacity 0.3s';
    setTimeout(() => alert.remove(), 300);
  }, 3000);

  plog('showNoPermissionAlert: mostrada');
}

/**
 * Inicializa todo el sistema de permisos.
 * Llamar una vez después del login exitoso.
 */
export async function initPermissionsSystem() {
  plog('initPermissionsSystem: iniciando...');
  await loadCurrentPermissions();
  applyNavigationPermissions();
  applyActionPermissions();
  plog('initPermissionsSystem: completado ✅');
}

// =============================================================================
// UTILIDADES DE DISPLAY
// =============================================================================

/**
 * Devuelve el nombre legible de un rol para mostrar en la UI.
 * Para roles dinámicos simplemente devuelve el nombre tal cual.
 */
export function getRoleDisplayName(rolName) {
  if (!rolName)                   return 'Sin rol';
  if (rolName === ROLES.ADMIN)    return 'Administrador';
  if (rolName === ROLES.DISABLED) return 'Desactivado';
  // Rol dinámico: capitalizar primera letra
  return rolName.charAt(0).toUpperCase() + rolName.slice(1);
}

export function requirePermission(permission, {
  onDenied,
  message = 'No tienes permisos para realizar esta acción.'
} = {}) {
  if (hasPermission(permission)) return true;
  if (typeof onDenied === 'function') onDenied(message);
  return false;
}

// Helpers para UI: mostrar/ocultar por permiso
export function setElementVisible(el, visible) {
  if (!el) return;
  el.style.display = visible ? '' : 'none';
}

export function applyVisibilityRules(rules = []) {
  rules.forEach((r) => {
    const elements = document.querySelectorAll(r.selector);
    const allowed = hasPermission(r.permission);
    const visible = r.visibleWhenNoPermission ? !allowed : allowed;
    elements.forEach((el) => setElementVisible(el, visible));
  });
}