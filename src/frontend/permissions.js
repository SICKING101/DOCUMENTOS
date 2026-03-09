// src/frontend/permissions.js
// Sistema de permisos del frontend.
//
// ARQUITECTURA:
//   • Solo existen DOS roles fijos en el sistema:
//       - "administrador"  → acceso total, hardcoded en backend y frontend
//       - "desactivado"    → sin acceso, hardcoded
//   • TODOS los demás roles son DINÁMICOS: se crean desde el panel de Admin
//     y se almacenan en MongoDB (colección roles).
//   • Este archivo NO define gerente/editor/lector/etc.
//
// DEBUG: activar con localStorage.setItem('permisos_debug', '1')
// Desactivar con localStorage.removeItem('permisos_debug')

let _debugCache = { value: false, ts: 0 };
function isPermissionsDebugEnabled() {
  const now = Date.now();
  if (now - _debugCache.ts < 1000) return _debugCache.value;

  let enabled = false;
  try {
    enabled = localStorage.getItem('permisos_debug') === '1';
  } catch {
    enabled = false;
  }

  // Ayuda en desarrollo: si estás en localhost y no lo desactivaste explícitamente
  if (!enabled) {
    try {
      const host = window.location?.hostname;
      if (host === 'localhost' || host === '127.0.0.1') enabled = true;
    } catch {
      // ignore
    }
  }

  _debugCache = { value: enabled, ts: now };
  return enabled;
}

export function setPermissionsDebug(enabled) {
  try {
    if (enabled) localStorage.setItem('permisos_debug', '1');
    else localStorage.removeItem('permisos_debug');
  } catch {
    // ignore
  }
  _debugCache = { value: Boolean(enabled), ts: 0 };
  return _debugCache.value;
}

function plog(...args)  { if (isPermissionsDebugEnabled()) console.log('🔐 [Permisos]', ...args); }
function pwarn(...args) { if (isPermissionsDebugEnabled()) console.warn('⚠️ [Permisos]', ...args); }
function perr(...args)  { console.error('❌ [Permisos]', ...args); }

function _emitPermissionEvent(type, detail = {}) {
  try {
    document.dispatchEvent(new CustomEvent(`permissions:${type}`, { detail }));
  } catch {
    // ignore
  }
}

// =============================================================================
// ROLES FIJOS (solo estos dos son especiales)
// =============================================================================

export const ROLES = {
  ADMIN:    'administrador',
  DISABLED: 'desactivado',
};

// =============================================================================
// PERMISOS DE ACCIONES DE LA APP (para hasPermission())
// Estos son permisos de UI, no de secciones.
// =============================================================================

export const PERMISSIONS = {
  MANAGE_USERS:       'manage_users',
  MANAGE_ROLES:       'manage_roles',
  VIEW_AUDIT:         'view_audit',
  VIEW_PROFILE:       'view_profile',
  // Compatibilidad con código legacy de app.js
  UPLOAD_DOCUMENTS:   'upload_documents',
  DELETE_DOCUMENTS:   'delete_documents',
};

// =============================================================================
// CACHE DE PERMISOS DEL USUARIO ACTUAL
// =============================================================================

let _permissionsCache = null;   // { [section]: { canView, canAction } } | { __admin: true } | {}
let _currentUserRole  = null;   // string — nombre del rol actual
let _loadingPromise   = null;   // Promise en vuelo para evitar race conditions

/**
 * Obtiene el usuario actual del localStorage de forma segura.
 */
function getCurrentUserSafe() {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    perr('getCurrentUserSafe: JSON inválido en localStorage', e);
    return null;
  }
}

/**
 * Obtiene el token JWT del localStorage.
 */
function getToken() {
  return localStorage.getItem('token') || '';
}

/**
 * Carga desde la API los permisos del rol del usuario logueado y los cachea.
 * Maneja race conditions: si ya hay una carga en vuelo, espera esa misma promesa.
 * Debe llamarse justo después del login y al cambiar de rol.
 *
 * @returns {Promise<Object>} mapa de permisos { section: { canView, canAction } }
 */
export async function loadCurrentPermissions() {
  // Si ya hay una carga en vuelo, esperar esa misma
  if (_loadingPromise) {
    plog('loadCurrentPermissions: esperando carga en vuelo...');
    return _loadingPromise;
  }

  _loadingPromise = _doLoadPermissions();
  try {
    const result = await _loadingPromise;
    return result;
  } finally {
    _loadingPromise = null;
  }
}

async function _doLoadPermissions() {
  try {
    const user = getCurrentUserSafe();

    if (!user) {
      pwarn('loadCurrentPermissions: no hay usuario en localStorage');
      _permissionsCache = {};
      return {};
    }

    const rol = user.rol || user.role;

    if (!rol) {
      pwarn('loadCurrentPermissions: usuario sin campo "rol"');
      _permissionsCache = {};
      return {};
    }

    plog(`loadCurrentPermissions: cargando permisos para rol="${rol}"`);

    // Si el rol no cambió y ya tenemos cache válido, reutilizar
    if (_currentUserRole === rol && _permissionsCache !== null) {
      plog('loadCurrentPermissions: cache válido, reutilizando');
      return _permissionsCache;
    }

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
      return {};
    }

    // Consultar el mapa de permisos del rol dinámico
    const token = getToken();
    if (!token) {
      pwarn('loadCurrentPermissions: no hay token JWT, sin permisos');
      _permissionsCache = {};
      return {};
    }

    plog(`loadCurrentPermissions: consultando API /api/roles/permissions/${rol}`);

    const response = await fetch(`/api/roles/permissions/${encodeURIComponent(rol)}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
      },
    });

    if (!response.ok) {
      pwarn(`loadCurrentPermissions: respuesta HTTP ${response.status}`);
      _permissionsCache = {};
      return {};
    }

    const data = await response.json();

    if (data?.success && data?.data) {
      _permissionsCache = data.data;
      plog('loadCurrentPermissions: permisos cargados →', _permissionsCache);
      return _permissionsCache;
    }

    pwarn('loadCurrentPermissions: respuesta inválida del servidor', data);
    _permissionsCache = {};
    return {};

  } catch (e) {
    perr('loadCurrentPermissions: error de red o parseo', e);
    _permissionsCache = {};
    return {};
  }
}

/**
 * Invalida el cache de permisos.
 * Llamar cuando el admin cambia el rol de un usuario o modifica un rol dinámico.
 */
export function invalidatePermissionsCache() {
  plog('invalidatePermissionsCache: cache limpiado');
  _permissionsCache = null;
  _currentUserRole  = null;
  _loadingPromise   = null;
}

// =============================================================================
// VERIFICACIÓN DE PERMISOS — SINCRÓNICO (usa cache)
// =============================================================================

/**
 * Verifica si el usuario actual tiene un permiso de ACCIÓN de la app.
 * Solo el administrador tiene MANAGE_USERS, MANAGE_ROLES y VIEW_AUDIT.
 * IMPORTANTE: Esta función es SINCRÓNICA — asegúrate de llamar
 * loadCurrentPermissions() antes de usarla.
 *
 * @param {string} permission — constante de PERMISSIONS
 * @returns {boolean}
 */
export function hasPermission(permission) {
  try {
    const user = getCurrentUserSafe();
    if (!user) return false;
    const rol = user.rol || user.role;

    if (!rol || rol === ROLES.DISABLED) return false;
    if (rol === ROLES.ADMIN) return true;

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

    // VIEW_PROFILE: cualquier usuario activo
    if (permission === PERMISSIONS.VIEW_PROFILE) return true;

    // Para permisos de documentos, delegar a canAction con cache
    if (permission === PERMISSIONS.UPLOAD_DOCUMENTS) {
      return canAction('documentos');
    }
    if (permission === PERMISSIONS.DELETE_DOCUMENTS) {
      return canAction('documentos');
    }

    return false;
  } catch (e) {
    perr('hasPermission error:', e);
    return false;
  }
}

/**
 * Verifica si el usuario puede VER una sección del sidebar.
 * Admin siempre puede. Roles dinámicos según su configuración.
 * SINCRÓNICO — requiere cache cargado.
 *
 * @param {string} section — clave de sección (ej: 'documentos')
 * @returns {boolean}
 */
export function canView(section) {
  try {
    const user = getCurrentUserSafe();
    if (!user) return false;
    const rol = user.rol || user.role;

    if (!rol) return false;
    if (rol === ROLES.DISABLED) return false;

    // Admin ve todo
    if (rol === ROLES.ADMIN) return true;

    // Secciones exclusivas del admin
    if (section === 'admin' || section === 'auditoria') {
      return false;
    }

    // Sin cache → denegar (no crashear)
    if (!_permissionsCache) {
      pwarn(`canView("${section}"): sin cache — llamar loadCurrentPermissions() primero`);
      return false;
    }

    const perm   = _permissionsCache[section];
    const result = Boolean(perm?.canView);
    plog(`canView("${section}"): ${result}`);
    return result;

  } catch (e) {
    perr('canView error:', e);
    return false;
  }
}

/**
 * Verifica si el usuario puede ACTUAR (crear/editar/eliminar) en una sección.
 * SINCRÓNICO — requiere cache cargado.
 *
 * @param {string} section — clave de sección
 * @returns {boolean}
 */
export function canAction(section) {
  try {
    const user = getCurrentUserSafe();
    if (!user) return false;
    const rol = user.rol || user.role;

    if (!rol) return false;
    if (rol === ROLES.DISABLED) return false;
    if (rol === ROLES.ADMIN) return true;

    if (!_permissionsCache) {
      pwarn(`canAction("${section}"): sin cache`);
      return false;
    }

    const perm   = _permissionsCache[section];
    const result = Boolean(perm?.canAction);
    plog(`canAction("${section}"): ${result}`);
    return result;

  } catch (e) {
    perr('canAction error:', e);
    return false;
  }
}

// =============================================================================
// APLICAR PERMISOS AL DOM
// =============================================================================

/**
 * Aplica permisos de visibilidad al sidebar.
 *
 * IMPORTANTE: El sidebar usa data-tab="seccion" en los <a> links.
 * Esta función soporta AMBOS atributos: data-section y data-tab.
 * Para que funcione con tu HTML actual, los nav-links deben tener
 * data-tab="nombre_seccion" (que ya tienen) — los leemos de ese atributo.
 */
export function applyNavigationPermissions() {
  plog('applyNavigationPermissions: aplicando visibilidad en sidebar...');

  const user  = getCurrentUserSafe();
  const rol   = user?.rol || user?.role;
  const isAdm = rol === ROLES.ADMIN;

  // Soportar tanto data-tab como data-section
  const navLinks = document.querySelectorAll(
    '.sidebar__nav-link[data-tab], .sidebar__nav-link[data-section], [data-section]'
  );

  plog(`applyNavigationPermissions: ${navLinks.length} nav-links encontrados`);

  let visible = 0, hidden = 0;

  navLinks.forEach((link) => {
    // Obtener la sección: preferir data-section, fallback a data-tab
    const section = link.getAttribute('data-section') || link.getAttribute('data-tab');
    if (!section) return;

    let shouldShow;

    // Secciones exclusivas del admin
    if (section === 'admin' || section === 'auditoria') {
      shouldShow = isAdm;
    } else {
      shouldShow = canView(section);
    }

    // Aplicar visibilidad al elemento contenedor (li o el propio link)
    const container = link.closest('li') || link;
    if (shouldShow) {
      container.style.display = '';
      link.style.display      = '';
      visible++;
    } else {
      container.style.display = 'none';
      link.style.display      = 'none';
      hidden++;
    }

    plog(`  [${section}] canView=${shouldShow} → ${shouldShow ? 'visible' : 'oculto'}`);
  });

  // También manejar el nav-item de admin que tiene id="nav-admin"
  const adminNavItem = document.getElementById('nav-admin');
  if (adminNavItem) {
    const container = adminNavItem.closest('li') || adminNavItem;
    if (isAdm) {
      container.style.display = '';
      adminNavItem.style.display = '';
    } else {
      container.style.display = 'none';
      adminNavItem.style.display = 'none';
    }
    plog(`  [admin-item] visible=${isAdm}`);
  }

  // Manejar dropdown de admin si existe
  const adminDropdown = document.getElementById('admin-dropdown');
  if (adminDropdown) {
    adminDropdown.style.display = isAdm ? '' : 'none';
  }

  plog(`applyNavigationPermissions: ${visible} visibles, ${hidden} ocultos`);
}

/**
 * Aplica permisos de acción en la página actual.
 *
 * Soporta dos estrategias:
 * 1. [data-action-section="seccion"]  → se OCULTA si no tiene canAction
 * 2. [data-requires-action="seccion"] → muestra ALERTA si no tiene canAction (no se oculta)
 */
export function applyActionPermissions() {
  plog('applyActionPermissions: aplicando permisos de acción...');

  // Botones que se OCULTAN si no hay permiso
  const actionBtns = document.querySelectorAll('[data-action-section]');
  let processed = 0;
  actionBtns.forEach((btn) => {
    const section = btn.getAttribute('data-action-section');
    if (!section) return;
    const allowed = canAction(section);
    btn.style.display = allowed ? '' : 'none';
    plog(`  [action-section="${section}"] canAction=${allowed}`);
    processed++;
  });

  plog(`applyActionPermissions: ${processed} botones de acción procesados`);

  // Botones que muestran ALERTA (no se ocultan)
  const requiresBtns = document.querySelectorAll('[data-requires-action]');
  requiresBtns.forEach((btn) => {
    const section = btn.getAttribute('data-requires-action');
    if (!section) return;
    // Clonar para remover listeners previos y evitar duplicados
    if (!canAction(section)) {
      btn.dataset._permBlocked = 'true';
      btn.removeEventListener('click', _noPermissionHandler);
      btn.addEventListener('click', _noPermissionHandler);
    } else {
      delete btn.dataset._permBlocked;
      btn.removeEventListener('click', _noPermissionHandler);
    }
  });

  plog(`applyActionPermissions: ${requiresBtns.length} botones con intercept`);
}

function _noPermissionHandler(e) {
  e.preventDefault();
  e.stopImmediatePropagation();
  const section = e.currentTarget.getAttribute('data-requires-action') || '';
  showNoPermissionAlert(section);
}

/**
 * Muestra una alerta visual de "sin permisos" en la esquina superior derecha.
 */
export function showNoPermissionAlert(section = '') {
  // Remover alerta previa si existe
  const existing = document.getElementById('permisos-no-perm-alert');
  if (existing) existing.remove();

  const alert = document.createElement('div');
  alert.id = 'permisos-no-perm-alert';
  alert.setAttribute('role', 'alert');
  alert.setAttribute('aria-live', 'assertive');
  alert.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 999999;
    background: var(--dark-light);
    color: var(--light);
    padding: 14px 20px;
    border-radius: 10px;
    box-shadow: var(--shadow-xl);
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 0.9rem;
    font-weight: 500;
    border-left: 4px solid var(--primary);
    animation: _permisos_alert_in 0.25s cubic-bezier(.17,.67,.35,1.1) both;
    max-width: 380px;
  `;

  const sectionLabel = section
    ? ` en <strong>${_getSectionLabel(section)}</strong>`
    : '';

  alert.innerHTML = `
    <i class="fas fa-ban" style="color:var(--primary);font-size:1.1rem;flex-shrink:0;"></i>
    <span>No tienes permisos para realizar esta acción${sectionLabel}</span>
    <button onclick="this.parentElement.remove()" style="
      background:none;border:none;color:var(--light-dark);cursor:pointer;
      font-size:1rem;padding:0 0 0 8px;line-height:1;flex-shrink:0;
    " aria-label="Cerrar">✕</button>
  `;

  // Inyectar keyframe solo una vez
  if (!document.getElementById('_permisos_alert_style')) {
    const style = document.createElement('style');
    style.id = '_permisos_alert_style';
    style.textContent = `
      @keyframes _permisos_alert_in {
        from { opacity: 0; transform: translateY(-14px) scale(0.95); }
        to   { opacity: 1; transform: translateY(0)    scale(1);    }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(alert);

  setTimeout(() => {
    if (alert.isConnected) {
      alert.style.transition = 'opacity 0.3s, transform 0.3s';
      alert.style.opacity    = '0';
      alert.style.transform  = 'translateY(-8px)';
      setTimeout(() => alert.remove(), 320);
    }
  }, 3500);

  plog(`showNoPermissionAlert: mostrada para sección="${section}"`);
  if (isPermissionsDebugEnabled()) {
    console.warn('⚠️ [Permisos] Denegado:', { section });
    console.trace('Stack (denegado)');
  }
  _emitPermissionEvent('denied', {
    section,
    role: getCurrentUserSafe()?.rol || getCurrentUserSafe()?.role || null,
    ts: Date.now(),
  });
}

function _getSectionLabel(key) {
  const MAP = {
    documentos:    'Documentos',
    personas:      'Personas',
    categorias:    'Categorías',
    departamentos: 'Departamentos',
    tareas:        'Tareas',
    reportes:      'Reportes',
    papelera:      'Papelera',
    calendario:    'Calendario',
    historial:     'Historial',
    notificaciones:'Notificaciones',
    soporte:       'Soporte',
    admin:         'Administración',
    auditoria:     'Auditoría',
  };
  return MAP[key] || key;
}

// =============================================================================
// INICIALIZACIÓN DEL SISTEMA DE PERMISOS
// =============================================================================

/**
 * Inicializa todo el sistema de permisos.
 * Llamar UNA VEZ después del login exitoso, antes de renderizar la navegación.
 *
 * @returns {Promise<void>}
 */
export async function initPermissionsSystem() {
  plog('initPermissionsSystem: iniciando...');

  try {
    // 1. Cargar permisos del rol actual desde API
    await loadCurrentPermissions();

    // 2. Aplicar visibilidad en la barra de navegación
    applyNavigationPermissions();

    // 3. Aplicar visibilidad de botones de acción
    applyActionPermissions();

    plog('initPermissionsSystem: completado ✅');
  } catch (e) {
    perr('initPermissionsSystem: error crítico', e);
  }
}

// =============================================================================
// UTILIDADES DE DISPLAY Y HELPERS
// =============================================================================

/**
 * Devuelve el nombre legible de un rol para mostrar en la UI.
 */
export function getRoleDisplayName(rolName) {
  if (!rolName)                      return 'Sin rol';
  if (rolName === ROLES.ADMIN)       return 'Administrador';
  if (rolName === ROLES.DISABLED)    return 'Desactivado';
  return rolName.charAt(0).toUpperCase() + rolName.slice(1);
}

/**
 * Muestra/oculta un elemento del DOM según visibilidad.
 */
export function setElementVisible(el, visible) {
  if (!el) return;
  el.style.display = visible ? '' : 'none';
}

/**
 * Aplica reglas de visibilidad a múltiples selectores según permisos.
 * Compatible con el código legacy de app.js.
 *
 * @param {Array<{selector: string, permission: string, visibleWhenNoPermission?: boolean}>} rules
 */
export function applyVisibilityRules(rules = []) {
  plog(`applyVisibilityRules: aplicando ${rules.length} reglas...`);
  rules.forEach((r) => {
    const elements = document.querySelectorAll(r.selector);
    const allowed  = hasPermission(r.permission);
    const visible  = r.visibleWhenNoPermission ? !allowed : allowed;
    elements.forEach((el) => setElementVisible(el, visible));
    if (elements.length > 0) {
      plog(`  [${r.selector}] permission="${r.permission}" → visible=${visible} (${elements.length} elementos)`);
    }
  });
}

/**
 * Verifica un permiso y ejecuta callback si se deniega.
 */
export function requirePermission(permission, {
  onDenied,
  message = 'No tienes permisos para realizar esta acción.',
} = {}) {
  if (hasPermission(permission)) return true;
  if (typeof onDenied === 'function') onDenied(message);
  else showNoPermissionAlert();
  return false;
}

// =============================================================================
// DEBUGGING
// =============================================================================

/**
 * Imprime en consola el estado completo del sistema de permisos.
 * Útil para debugging en desarrollo.
 */
export function debugPermissions() {
  const user = getCurrentUserSafe();
  console.group('🔐 [Permisos] Debug completo');
  console.log('Usuario:', user);
  console.log('Rol:', user?.rol || user?.role);
  console.log('Cache actual:', _permissionsCache);
  console.log('Admin:', (user?.rol || user?.role) === ROLES.ADMIN);

  if (_permissionsCache && !_permissionsCache.__admin) {
    console.group('Permisos por sección:');
    Object.entries(_permissionsCache).forEach(([section, perm]) => {
      console.log(`  ${section}:`, perm);
    });
    console.groupEnd();
  }

  // Verificar elementos del DOM
  const navLinks = document.querySelectorAll('.sidebar__nav-link[data-tab]');
  console.group(`Nav-links en sidebar (${navLinks.length}):`);
  navLinks.forEach((link) => {
    const tab     = link.getAttribute('data-tab');
    const visible = link.style.display !== 'none';
    console.log(`  [${tab}] visible=${visible} display="${link.style.display}"`);
  });
  console.groupEnd();

  console.groupEnd();
}

// Exponer en window para debugging desde consola
if (typeof window !== 'undefined') {
  window._permissionsDebug = debugPermissions;
  window._permissionsCache = () => _permissionsCache;
  window._canView          = canView;
  window._canAction        = canAction;
  window._permissionsDebugOn  = () => setPermissionsDebug(true);
  window._permissionsDebugOff = () => setPermissionsDebug(false);
  plog('Helpers de debug disponibles: window._permissionsDebug(), window._permissionsCache(), window._canView(sec), window._canAction(sec)');
}
