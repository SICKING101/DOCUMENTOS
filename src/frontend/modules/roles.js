// src/frontend/modules/roles.js
// Módulo completo para gestión de roles y permisos dinámicos

import { API } from '../services/api.js';

// ─── Debug helper ─────────────────────────────────────────────────────────────
const DEBUG = true;
function log(...args) { if (DEBUG) console.log('🎭 [Roles]', ...args); }
function warn(...args) { console.warn('⚠️ [Roles]', ...args); }
function err(...args)  { console.error('❌ [Roles]', ...args); }

// ─── Estado del módulo ────────────────────────────────────────────────────────
let state = {
  roles:    [],       // array de roles cargados desde la API
  sections: [],       // secciones disponibles
  editing:  null,     // rol que se está editando (null = crear nuevo)
  loading:  false,
  initialized: false,
};

// ─── Secciones de fallback (si la API falla) ──────────────────────────────────
const FALLBACK_SECTIONS = [
  { key: 'documentos',     label: 'Documentos',     icon: '📄' },
  { key: 'personas',       label: 'Personas',        icon: '👥' },
  { key: 'categorias',     label: 'Categorías',      icon: '🏷️' },
  { key: 'departamentos',  label: 'Departamentos',   icon: '🏢' },
  { key: 'tareas',         label: 'Tareas',          icon: '✅' },
  { key: 'reportes',       label: 'Reportes',        icon: '📊' },
  { key: 'papelera',       label: 'Papelera',        icon: '🗑️' },
  { key: 'calendario',     label: 'Calendario',      icon: '📅' },
  { key: 'historial',      label: 'Historial',       icon: '📜' },
  { key: 'notificaciones', label: 'Notificaciones',  icon: '🔔' },
  { key: 'soporte',        label: 'Soporte',         icon: '🛟' },
];

// ─── Colores predefinidos para roles ──────────────────────────────────────────
const PRESET_COLORS = [
  '#dc2626', '#b91c1c', '#ef4444',
  '#f59e0b', '#d97706', '#10b981',
  '#059669', '#06b6d4', '#0891b2',
  '#3b82f6', '#2563eb', '#8b5cf6',
  '#7c3aed', '#ec4899', '#db2777',
  '#6b7280', '#374151', '#1e293b',
];

// ═════════════════════════════════════════════════════════════════════════════
// PERMISOS DINÁMICOS — Motor central que aplica restricciones en la UI
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Cache de permisos del usuario actual.
 * { section: { canView: bool, canAction: bool } }
 */
let _permissionsCache = null;
let _currentRole = null;

/**
 * Carga y cachea los permisos del rol actual desde la API.
 */
export async function loadCurrentPermissions() {
  try {
    const userRaw = localStorage.getItem('user');
    const user = userRaw ? JSON.parse(userRaw) : null;
    const role = user?.rol || localStorage.getItem('userRole');

    if (!role) {
      warn('loadCurrentPermissions: no hay rol en localStorage');
      _permissionsCache = {};
      return {};
    }

    // Administrador siempre tiene todo
    if (role === 'administrador') {
      log('loadCurrentPermissions: rol administrador → permisos totales');
      _permissionsCache = { __admin: true };
      _currentRole = role;
      return _permissionsCache;
    }

    // Si el rol no cambió y ya tenemos cache, reutilizar
    if (_currentRole === role && _permissionsCache) {
      log('loadCurrentPermissions: usando cache para rol', role);
      return _permissionsCache;
    }

    log('loadCurrentPermissions: cargando permisos para rol', role);
    const res = await API.get(`/roles/permissions/${encodeURIComponent(role)}`);

    if (res.success) {
      _permissionsCache = res.data;
      _currentRole = role;
      log('loadCurrentPermissions: permisos cargados →', _permissionsCache);
    } else {
      warn('loadCurrentPermissions: respuesta no exitosa, usando vacío');
      _permissionsCache = {};
    }

    return _permissionsCache;
  } catch (e) {
    err('loadCurrentPermissions error:', e);
    _permissionsCache = {};
    return {};
  }
}

/**
 * Devuelve si el usuario actual puede VER una sección.
 * El administrador siempre puede.
 */
export function canView(section) {
  if (!_permissionsCache) return false;
  if (_permissionsCache.__admin) return true;
  return _permissionsCache[section]?.canView === true;
}

/**
 * Devuelve si el usuario actual puede ACTUAR en una sección.
 */
export function canAction(section) {
  if (!_permissionsCache) return false;
  if (_permissionsCache.__admin) return true;
  return _permissionsCache[section]?.canAction === true;
}

/**
 * Invalida el cache (llamar cuando el admin cambia el rol del usuario logueado).
 */
export function invalidatePermissionsCache() {
  _permissionsCache = null;
  _currentRole = null;
  log('Cache de permisos invalidado');
}

// ─── Aplicar visibilidad de secciones en el sidebar ───────────────────────────

/**
 * Oculta/muestra los elementos del sidebar según los permisos.
 * Mapeo: data-section="documentos" → sección 'documentos'
 *
 * EXCEPCIÓN: admin y auditoria solo visibles para rol administrador.
 */
export async function applyNavigationPermissions() {
  try {
    log('applyNavigationPermissions: aplicando...');
    await loadCurrentPermissions();

    const userRaw = localStorage.getItem('user');
    const user = userRaw ? JSON.parse(userRaw) : null;
    const isAdmin = user?.rol === 'administrador';

    // Secciones exclusivas del admin
    const ADMIN_ONLY_SECTIONS = ['admin', 'auditoria'];

    // Iterar todos los nav-links que tienen data-section
    const navLinks = document.querySelectorAll('.sidebar__nav-link[data-section], [data-section]');
    log(`applyNavigationPermissions: ${navLinks.length} elementos con data-section encontrados`);

    navLinks.forEach((el) => {
      const section = el.getAttribute('data-section');
      if (!section) return;

      // Secciones exclusivas del admin
      if (ADMIN_ONLY_SECTIONS.includes(section)) {
        el.style.display = isAdmin ? '' : 'none';
        log(`  [${section}] admin-only → ${isAdmin ? 'visible' : 'oculto'}`);
        return;
      }

      // Verificar permiso de vista
      const visible = canView(section);
      el.style.display = visible ? '' : 'none';
      log(`  [${section}] canView=${visible} → ${visible ? 'visible' : 'oculto'}`);
    });

    // También aplicar a los tab-content si están en el DOM
    applyTabContentPermissions(isAdmin);

    log('applyNavigationPermissions: completado');
  } catch (e) {
    err('applyNavigationPermissions error:', e);
  }
}

/**
 * Oculta contenidos de secciones (tab-content) según permisos.
 * Si el usuario navega directamente a una sección sin permiso, la oculta.
 */
function applyTabContentPermissions(isAdmin) {
  const ADMIN_ONLY = ['admin', 'auditoria'];

  // Mapeo de id del tab-content → sección
  // Ajusta este mapeo a los IDs reales de tu HTML
  const TAB_MAP = {
    'documentos':    'documentos',
    'personas':      'personas',
    'categorias':    'categorias',
    'departamentos': 'departamentos',
    'tareas':        'tareas',
    'reportes':      'reportes',
    'papelera':      'papelera',
    'calendario':    'calendario',
    'historial':     'historial',
    'notificaciones':'notificaciones',
    'soporte':       'soporte',
    'admin':         'admin',
    'auditoria':     'auditoria',
  };

  Object.entries(TAB_MAP).forEach(([tabId, section]) => {
    const el = document.getElementById(tabId);
    if (!el) return;

    let allowed;
    if (ADMIN_ONLY.includes(section)) {
      allowed = isAdmin;
    } else {
      allowed = canView(section);
    }

    if (!allowed && el.classList.contains('tab-content--active')) {
      // Si la pestaña activa no tiene permiso, redirigir al dashboard
      log(`applyTabContentPermissions: pestaña activa "${tabId}" sin permiso → redirigiendo a dashboard`);
      if (typeof window.switchTab === 'function') {
        window.switchTab('dashboard');
      }
    }
  });
}

/**
 * Oculta botones de acción en una sección según permisos.
 * Los botones deben tener data-action-section="documentos" (o la sección correspondiente).
 */
export function applyActionPermissions() {
  try {
    log('applyActionPermissions: aplicando...');

    const actionButtons = document.querySelectorAll('[data-action-section]');
    log(`applyActionPermissions: ${actionButtons.length} botones de acción encontrados`);

    actionButtons.forEach((btn) => {
      const section = btn.getAttribute('data-action-section');
      if (!section) return;

      const allowed = canAction(section);

      if (!allowed) {
        // Ocultar el botón
        btn.style.display = 'none';
        log(`  [${section}] canAction=false → botón ocultado`);
      } else {
        // Asegurar que esté visible
        if (btn.style.display === 'none') {
          btn.style.display = '';
        }
        log(`  [${section}] canAction=true → botón visible`);
      }
    });

    log('applyActionPermissions: completado');
  } catch (e) {
    err('applyActionPermissions error:', e);
  }
}

/**
 * Intercepta clics en botones de acción que NO tienen data-action-section
 * pero que requieren permiso. Muestra alerta si no tiene permiso.
 *
 * Para usarlo, agrega el atributo data-requires-action="seccion" al botón.
 */
export function setupActionInterceptors() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-requires-action]');
    if (!btn) return;

    const section = btn.getAttribute('data-requires-action');
    if (!section) return;

    if (!canAction(section)) {
      e.preventDefault();
      e.stopPropagation();
      showNoPermissionAlert(section);
    }
  }, true); // useCapture para interceptar antes que otros handlers

  log('setupActionInterceptors: interceptor de clics instalado');
}

/**
 * Muestra una alerta visual de "no tienes permisos"
 */
export function showNoPermissionAlert(section = '') {
  // Remover alerta previa si existe
  const existing = document.querySelector('.permisos-alert-noperm');
  if (existing) existing.remove();

  const sectionLabel = FALLBACK_SECTIONS.find((s) => s.key === section)?.label || section;

  const alert = document.createElement('div');
  alert.className = 'permisos-alert-noperm';
  alert.innerHTML = `
    <div class="permisos-alert-noperm__icon">🚫</div>
    <div class="permisos-alert-noperm__text">
      <strong>Sin permiso</strong>
      <span>No tienes permisos para realizar esta acción${sectionLabel ? ` en ${sectionLabel}` : ''}.</span>
    </div>
    <button class="permisos-alert-noperm__close" aria-label="Cerrar">✕</button>
  `;

  document.body.appendChild(alert);

  // Auto-remover después de 4s
  const timer = setTimeout(() => alert.remove(), 4000);

  // Botón cerrar
  alert.querySelector('.permisos-alert-noperm__close').addEventListener('click', () => {
    clearTimeout(timer);
    alert.remove();
  });

  // Animar entrada
  requestAnimationFrame(() => alert.classList.add('permisos-alert-noperm--visible'));

  log(`showNoPermissionAlert: mostrada para sección "${section}"`);
}

// ═════════════════════════════════════════════════════════════════════════════
// GESTIÓN DE ROLES — UI para crear/editar/eliminar roles (solo admin)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Inicializa el módulo de gestión de roles.
 * Llama esto cuando el admin entra a la sección de admin → pestaña Roles.
 */
export async function initRolesManager() {
  log('initRolesManager: inicializando...');

  const container = document.getElementById('permisos-roles-container');
  if (!container) {
    warn('initRolesManager: #permisos-roles-container no encontrado en el DOM');
    return;
  }

  state.initialized = true;
  await refreshRoles();
  renderRolesManager(container);

  log('initRolesManager: completado');
}

/**
 * Carga los roles desde la API y los guarda en estado.
 */
async function refreshRoles() {
  try {
    state.loading = true;
    log('refreshRoles: cargando...');

    const res = await API.get('/roles');
    if (res.success) {
      state.roles    = res.data || [];
      state.sections = res.sections || FALLBACK_SECTIONS;
      log(`refreshRoles: ${state.roles.length} roles cargados`);
    } else {
      warn('refreshRoles: respuesta no exitosa:', res.message);
      state.sections = FALLBACK_SECTIONS;
    }
  } catch (e) {
    err('refreshRoles error:', e);
    state.sections = FALLBACK_SECTIONS;
  } finally {
    state.loading = false;
  }
}

// ─── Render principal ─────────────────────────────────────────────────────────

function renderRolesManager(container) {
  log('renderRolesManager: renderizando...');

  container.innerHTML = `
    <div class="permisos-manager">
      <!-- Header -->
      <div class="permisos-manager__header">
        <div class="permisos-manager__title-group">
          <h2 class="permisos-manager__title">
            <span class="permisos-manager__title-icon">🎭</span>
            Gestión de Roles
          </h2>
          <p class="permisos-manager__subtitle">
            Crea roles personalizados y asigna qué secciones pueden ver y qué acciones pueden realizar.
          </p>
        </div>
        <button class="permisos-btn permisos-btn--primary" id="permisos-btn-nuevo-rol">
          <span>＋</span> Nuevo Rol
        </button>
      </div>

      <!-- Grid de roles -->
      <div class="permisos-roles-grid" id="permisos-roles-grid">
        ${renderRolesGrid()}
      </div>
    </div>

    <!-- Modal crear/editar rol -->
    <div class="permisos-modal" id="permisos-modal-rol" role="dialog" aria-modal="true" aria-labelledby="permisos-modal-title">
      <div class="permisos-modal__backdrop" id="permisos-modal-backdrop"></div>
      <div class="permisos-modal__content">
        <div class="permisos-modal__header">
          <h3 class="permisos-modal__title" id="permisos-modal-title">Nuevo Rol</h3>
          <button class="permisos-modal__close" id="permisos-modal-close" aria-label="Cerrar">✕</button>
        </div>
        <div class="permisos-modal__body" id="permisos-modal-body">
          ${renderRoleForm(null)}
        </div>
      </div>
    </div>

    <!-- Modal confirmar eliminación -->
    <div class="permisos-modal permisos-modal--danger" id="permisos-modal-delete" role="dialog" aria-modal="true">
      <div class="permisos-modal__backdrop" id="permisos-delete-backdrop"></div>
      <div class="permisos-modal__content permisos-modal__content--sm">
        <div class="permisos-modal__header">
          <h3 class="permisos-modal__title">Eliminar Rol</h3>
          <button class="permisos-modal__close" id="permisos-delete-close" aria-label="Cerrar">✕</button>
        </div>
        <div class="permisos-modal__body">
          <div class="permisos-delete-confirm">
            <div class="permisos-delete-confirm__icon">🗑️</div>
            <p class="permisos-delete-confirm__text" id="permisos-delete-text">
              ¿Estás seguro de que quieres eliminar este rol?
            </p>
            <p class="permisos-delete-confirm__warning">Esta acción no se puede deshacer.</p>
          </div>
        </div>
        <div class="permisos-modal__footer">
          <button class="permisos-btn permisos-btn--ghost" id="permisos-delete-cancel">Cancelar</button>
          <button class="permisos-btn permisos-btn--danger" id="permisos-delete-confirm-btn">Eliminar</button>
        </div>
      </div>
    </div>
  `;

  attachManagerEvents(container);
  log('renderRolesManager: completado');
}

// ─── Render del grid de roles ─────────────────────────────────────────────────

function renderRolesGrid() {
  if (state.loading) {
    return `
      <div class="permisos-loading">
        <div class="permisos-loading__spinner"></div>
        <span>Cargando roles...</span>
      </div>
    `;
  }

  if (state.roles.length === 0) {
    return `
      <div class="permisos-empty">
        <div class="permisos-empty__icon">🎭</div>
        <h3 class="permisos-empty__title">No hay roles personalizados</h3>
        <p class="permisos-empty__text">Crea tu primer rol haciendo clic en "Nuevo Rol".</p>
      </div>
    `;
  }

  return state.roles.map((role) => renderRoleCard(role)).join('');
}

function renderRoleCard(role) {
  const permCount = (role.permissions || []).filter((p) => p.canView || p.canAction).length;
  const totalSections = state.sections.length;
  const pct = totalSections > 0 ? Math.round((permCount / totalSections) * 100) : 0;

  const systemBadge = role.isSystem
    ? `<span class="permisos-badge permisos-badge--system">Sistema</span>`
    : '';

  const editBtn = !role.isSystem
    ? `<button class="permisos-card__action permisos-card__action--edit" data-role-id="${role._id}" title="Editar rol">✏️</button>`
    : '';

  const deleteBtn = !role.isSystem
    ? `<button class="permisos-card__action permisos-card__action--delete" data-role-id="${role._id}" data-role-name="${escapeHtml(role.name)}" title="Eliminar rol">🗑️</button>`
    : '';

  // Mini lista de secciones con permiso de vista
  const viewableSections = (role.permissions || [])
    .filter((p) => p.canView)
    .map((p) => {
      const sec = state.sections.find((s) => s.key === p.section);
      return sec ? `<span class="permisos-tag" title="${sec.label}">${sec.icon}</span>` : '';
    })
    .join('');

  return `
    <div class="permisos-role-card" data-role-id="${role._id}">
      <div class="permisos-role-card__header">
        <div class="permisos-role-card__color-dot" style="background:${escapeHtml(role.color || '#6b7280')}"></div>
        <div class="permisos-role-card__info">
          <h4 class="permisos-role-card__name">${escapeHtml(role.name)} ${systemBadge}</h4>
          ${role.description ? `<p class="permisos-role-card__desc">${escapeHtml(role.description)}</p>` : ''}
        </div>
        <div class="permisos-role-card__actions">
          ${editBtn}
          ${deleteBtn}
        </div>
      </div>
      <div class="permisos-role-card__stats">
        <div class="permisos-role-card__stat">
          <span class="permisos-role-card__stat-label">Usuarios</span>
          <span class="permisos-role-card__stat-value">${role.userCount || 0}</span>
        </div>
        <div class="permisos-role-card__stat">
          <span class="permisos-role-card__stat-label">Secciones</span>
          <span class="permisos-role-card__stat-value">${permCount}/${totalSections}</span>
        </div>
      </div>
      <div class="permisos-role-card__progress-bar">
        <div class="permisos-role-card__progress-fill" style="width:${pct}%; background:${escapeHtml(role.color || '#6b7280')}"></div>
      </div>
      <div class="permisos-role-card__sections">
        ${viewableSections || '<span class="permisos-role-card__no-sections">Sin secciones visibles</span>'}
      </div>
    </div>
  `;
}

// ─── Render del formulario de rol ─────────────────────────────────────────────

function renderRoleForm(role) {
  const isEdit = Boolean(role);
  const name        = isEdit ? escapeHtml(role.name)        : '';
  const description = isEdit ? escapeHtml(role.description) : '';
  const color       = isEdit ? role.color : '#6b7280';

  // Build permissions map
  const permMap = {};
  if (isEdit && role.permissions) {
    role.permissions.forEach((p) => { permMap[p.section] = p; });
  }

  const colorSwatches = PRESET_COLORS.map((c) => `
    <button type="button"
      class="permisos-color-swatch ${c === color ? 'permisos-color-swatch--active' : ''}"
      data-color="${c}"
      style="background:${c}"
      title="${c}"
    ></button>
  `).join('');

  const sectionsRows = state.sections.map((sec) => {
    const p = permMap[sec.key] || { canView: false, canAction: false };
    return `
      <tr class="permisos-perm-row" data-section="${sec.key}">
        <td class="permisos-perm-row__section">
          <span class="permisos-perm-row__icon">${sec.icon}</span>
          <span class="permisos-perm-row__label">${escapeHtml(sec.label)}</span>
        </td>
        <td class="permisos-perm-row__toggle">
          <label class="permisos-toggle" title="Puede ver la sección">
            <input type="checkbox"
              class="permisos-toggle__input"
              data-perm="canView"
              data-section="${sec.key}"
              ${p.canView ? 'checked' : ''}
            >
            <span class="permisos-toggle__slider"></span>
          </label>
        </td>
        <td class="permisos-perm-row__toggle">
          <label class="permisos-toggle" title="Puede realizar acciones">
            <input type="checkbox"
              class="permisos-toggle__input"
              data-perm="canAction"
              data-section="${sec.key}"
              ${p.canAction ? 'checked' : ''}
            >
            <span class="permisos-toggle__slider"></span>
          </label>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <form class="permisos-form" id="permisos-role-form" novalidate>
      <!-- Nombre -->
      <div class="permisos-form__group">
        <label class="permisos-form__label" for="permisos-role-name">
          Nombre del Rol <span class="permisos-form__required">*</span>
        </label>
        <input
          type="text"
          id="permisos-role-name"
          class="permisos-form__input"
          placeholder="Ej. Contador, Diseñador..."
          value="${name}"
          maxlength="50"
          required
          autocomplete="off"
        >
        <span class="permisos-form__error" id="permisos-name-error"></span>
      </div>

      <!-- Descripción -->
      <div class="permisos-form__group">
        <label class="permisos-form__label" for="permisos-role-desc">Descripción</label>
        <input
          type="text"
          id="permisos-role-desc"
          class="permisos-form__input"
          placeholder="Descripción breve del rol (opcional)"
          value="${description}"
          maxlength="200"
        >
      </div>

      <!-- Color -->
      <div class="permisos-form__group">
        <label class="permisos-form__label">Color del Rol</label>
        <div class="permisos-color-picker">
          <div class="permisos-color-swatches">
            ${colorSwatches}
          </div>
          <div class="permisos-color-custom">
            <input
              type="color"
              id="permisos-role-color"
              class="permisos-color-input"
              value="${color}"
              title="Color personalizado"
            >
            <span class="permisos-color-label" id="permisos-color-label">${color}</span>
          </div>
        </div>
      </div>

      <!-- Tabla de permisos -->
      <div class="permisos-form__group">
        <div class="permisos-form__label-row">
          <label class="permisos-form__label">Permisos por Sección</label>
          <div class="permisos-form__quick-actions">
            <button type="button" class="permisos-btn permisos-btn--xs permisos-btn--ghost" id="permisos-select-all-view">
              👁 Ver todo
            </button>
            <button type="button" class="permisos-btn permisos-btn--xs permisos-btn--ghost" id="permisos-select-all-action">
              ⚡ Acciones todo
            </button>
            <button type="button" class="permisos-btn permisos-btn--xs permisos-btn--ghost" id="permisos-clear-all">
              ✕ Limpiar
            </button>
          </div>
        </div>

        <div class="permisos-table-wrapper">
          <table class="permisos-table">
            <thead>
              <tr>
                <th class="permisos-table__th permisos-table__th--section">Sección</th>
                <th class="permisos-table__th">
                  <span title="Puede acceder y ver esta sección en el sidebar">👁 Ver</span>
                </th>
                <th class="permisos-table__th">
                  <span title="Puede ejecutar acciones (crear, editar, eliminar)">⚡ Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody id="permisos-sections-tbody">
              ${sectionsRows}
            </tbody>
          </table>
        </div>

        <p class="permisos-form__hint">
          💡 <strong>Ver</strong>: muestra la sección en el menú lateral.
          <strong>Acciones</strong>: permite crear, editar y eliminar en esa sección.
        </p>
      </div>

      <!-- Footer del formulario -->
      <div class="permisos-form__footer">
        <button type="button" class="permisos-btn permisos-btn--ghost" id="permisos-form-cancel">Cancelar</button>
        <button type="submit" class="permisos-btn permisos-btn--primary" id="permisos-form-submit">
          ${isEdit ? '💾 Guardar Cambios' : '＋ Crear Rol'}
        </button>
      </div>
    </form>
  `;
}

// ─── Eventos ──────────────────────────────────────────────────────────────────

function attachManagerEvents(container) {
  log('attachManagerEvents: adjuntando eventos...');

  // Abrir modal nuevo rol
  safeOn(container, '#permisos-btn-nuevo-rol', 'click', () => openRoleModal(null));

  // Cerrar modales
  safeOn(container, '#permisos-modal-close', 'click', closeRoleModal);
  safeOn(container, '#permisos-modal-backdrop', 'click', closeRoleModal);
  safeOn(container, '#permisos-form-cancel', 'click', closeRoleModal);

  safeOn(container, '#permisos-delete-close', 'click', closeDeleteModal);
  safeOn(container, '#permisos-delete-backdrop', 'click', closeDeleteModal);
  safeOn(container, '#permisos-delete-cancel', 'click', closeDeleteModal);

  // Delegación de eventos en el grid
  const grid = container.querySelector('#permisos-roles-grid');
  if (grid) {
    grid.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.permisos-card__action--edit');
      if (editBtn) {
        const roleId = editBtn.getAttribute('data-role-id');
        const role = state.roles.find((r) => r._id === roleId);
        if (role) openRoleModal(role);
        return;
      }

      const deleteBtn = e.target.closest('.permisos-card__action--delete');
      if (deleteBtn) {
        const roleId   = deleteBtn.getAttribute('data-role-id');
        const roleName = deleteBtn.getAttribute('data-role-name');
        openDeleteModal(roleId, roleName);
      }
    });
  }

  // Eventos del formulario (modal)
  attachFormEvents(container);

  log('attachManagerEvents: completado');
}

function attachFormEvents(container) {
  // Submit del formulario (delegado porque el modal se re-renderiza)
  const modal = container.querySelector('#permisos-modal-rol');
  if (!modal) return;

  modal.addEventListener('click', (e) => {
    // Color swatch
    const swatch = e.target.closest('.permisos-color-swatch');
    if (swatch) {
      const color = swatch.getAttribute('data-color');
      selectColor(modal, color);
      return;
    }
  });

  modal.addEventListener('input', (e) => {
    // Color picker nativo
    if (e.target.id === 'permisos-role-color') {
      selectColor(modal, e.target.value);
      return;
    }

    // Sync canAction con canView (si activa acción, activa vista automáticamente)
    if (e.target.classList.contains('permisos-toggle__input')) {
      const perm    = e.target.getAttribute('data-perm');
      const section = e.target.getAttribute('data-section');
      if (perm === 'canAction' && e.target.checked) {
        // Auto-activar vista si activa acciones
        const viewInput = modal.querySelector(
          `input[data-perm="canView"][data-section="${section}"]`
        );
        if (viewInput && !viewInput.checked) {
          viewInput.checked = true;
          log(`attachFormEvents: auto-activado canView para "${section}" al activar canAction`);
        }
      }
      if (perm === 'canView' && !e.target.checked) {
        // Auto-desactivar acciones si desactiva vista
        const actionInput = modal.querySelector(
          `input[data-perm="canAction"][data-section="${section}"]`
        );
        if (actionInput && actionInput.checked) {
          actionInput.checked = false;
          log(`attachFormEvents: auto-desactivado canAction para "${section}" al desactivar canView`);
        }
      }
    }
  });

  modal.addEventListener('click', async (e) => {
    // Quick actions
    if (e.target.id === 'permisos-select-all-view') {
      modal.querySelectorAll('input[data-perm="canView"]').forEach((cb) => { cb.checked = true; });
      return;
    }
    if (e.target.id === 'permisos-select-all-action') {
      modal.querySelectorAll('input[data-perm="canView"], input[data-perm="canAction"]').forEach((cb) => { cb.checked = true; });
      return;
    }
    if (e.target.id === 'permisos-clear-all') {
      modal.querySelectorAll('input[data-perm]').forEach((cb) => { cb.checked = false; });
      return;
    }

    // Submit
    if (e.target.id === 'permisos-form-submit' || e.target.closest('#permisos-form-submit')) {
      e.preventDefault();
      await submitRoleForm(modal);
    }
  });
}

// ─── Acciones de modal ────────────────────────────────────────────────────────

function openRoleModal(role) {
  state.editing = role;
  const modal     = document.getElementById('permisos-modal-rol');
  const titleEl   = document.getElementById('permisos-modal-title');
  const bodyEl    = document.getElementById('permisos-modal-body');

  if (!modal || !titleEl || !bodyEl) {
    err('openRoleModal: elementos del modal no encontrados');
    return;
  }

  titleEl.textContent = role ? `Editar Rol: ${role.name}` : 'Nuevo Rol';
  bodyEl.innerHTML = renderRoleForm(role);

  modal.classList.add('permisos-modal--open');
  modal.setAttribute('aria-hidden', 'false');

  // Focus en el primer input
  setTimeout(() => {
    const firstInput = modal.querySelector('#permisos-role-name');
    if (firstInput) firstInput.focus();
  }, 100);

  log(`openRoleModal: modal abierto ${role ? 'para edición' : 'para creación'}`);
}

function closeRoleModal() {
  const modal = document.getElementById('permisos-modal-rol');
  if (modal) {
    modal.classList.remove('permisos-modal--open');
    modal.setAttribute('aria-hidden', 'true');
  }
  state.editing = null;
  log('closeRoleModal: cerrado');
}

function openDeleteModal(roleId, roleName) {
  const modal   = document.getElementById('permisos-modal-delete');
  const textEl  = document.getElementById('permisos-delete-text');
  const confirmBtn = document.getElementById('permisos-delete-confirm-btn');

  if (!modal) return;

  textEl.textContent = `¿Estás seguro de que quieres eliminar el rol "${roleName}"?`;
  modal.classList.add('permisos-modal--open');

  // Reemplazar listener del botón confirmar
  const newBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
  newBtn.addEventListener('click', () => deleteRole(roleId, roleName));

  log(`openDeleteModal: modal abierto para rol "${roleName}"`);
}

function closeDeleteModal() {
  const modal = document.getElementById('permisos-modal-delete');
  if (modal) modal.classList.remove('permisos-modal--open');
  log('closeDeleteModal: cerrado');
}

// ─── Lógica de formulario ─────────────────────────────────────────────────────

function collectFormData(modal) {
  const name        = modal.querySelector('#permisos-role-name')?.value.trim() || '';
  const description = modal.querySelector('#permisos-role-desc')?.value.trim() || '';
  const color       = modal.querySelector('#permisos-role-color')?.value || '#6b7280';

  // Recolectar permisos desde los checkboxes
  const permissions = [];
  const sectionKeys = [...new Set(
    [...modal.querySelectorAll('input[data-section]')].map((el) => el.getAttribute('data-section'))
  )];

  sectionKeys.forEach((section) => {
    const canView   = modal.querySelector(`input[data-perm="canView"][data-section="${section}"]`)?.checked || false;
    const canAction = modal.querySelector(`input[data-perm="canAction"][data-section="${section}"]`)?.checked || false;
    permissions.push({ section, canView, canAction });
  });

  return { name, description, color, permissions };
}

function validateForm(data) {
  const errors = [];
  if (!data.name || data.name.length < 2) {
    errors.push({ field: 'name', message: 'El nombre debe tener al menos 2 caracteres' });
  }
  if (data.name.length > 50) {
    errors.push({ field: 'name', message: 'El nombre no puede superar 50 caracteres' });
  }
  return errors;
}

async function submitRoleForm(modal) {
  log('submitRoleForm: iniciando...');

  const data   = collectFormData(modal);
  const errors = validateForm(data);

  // Limpiar errores previos
  modal.querySelectorAll('.permisos-form__error').forEach((el) => { el.textContent = ''; });
  modal.querySelectorAll('.permisos-form__input--error').forEach((el) => { el.classList.remove('permisos-form__input--error'); });

  if (errors.length > 0) {
    errors.forEach((e) => {
      if (e.field === 'name') {
        const errorEl = modal.querySelector('#permisos-name-error');
        const inputEl = modal.querySelector('#permisos-role-name');
        if (errorEl) errorEl.textContent = e.message;
        if (inputEl) inputEl.classList.add('permisos-form__input--error');
      }
    });
    return;
  }

  const submitBtn = modal.querySelector('#permisos-form-submit');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Guardando...';
  }

  try {
    let res;
    if (state.editing) {
      log('submitRoleForm: actualizando rol', state.editing._id);
      res = await API.put(`/roles/${state.editing._id}`, data);
    } else {
      log('submitRoleForm: creando rol nuevo');
      res = await API.post('/roles', data);
    }

    if (res.success) {
      closeRoleModal();
      await refreshRoles();

      // Re-renderizar el grid
      const grid = document.getElementById('permisos-roles-grid');
      if (grid) grid.innerHTML = renderRolesGrid();

      showToast(res.message || 'Rol guardado exitosamente', 'success');
      log('submitRoleForm: éxito');
    } else {
      warn('submitRoleForm: error de API:', res.message);
      showToast(res.message || 'Error al guardar el rol', 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = state.editing ? '💾 Guardar Cambios' : '＋ Crear Rol';
      }
    }
  } catch (e) {
    err('submitRoleForm error:', e);
    showToast('Error de conexión al guardar el rol', 'error');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = state.editing ? '💾 Guardar Cambios' : '＋ Crear Rol';
    }
  }
}

async function deleteRole(roleId, roleName) {
  log(`deleteRole: eliminando "${roleName}" (${roleId})`);

  const confirmBtn = document.getElementById('permisos-delete-confirm-btn');
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.textContent = '⏳ Eliminando...';
  }

  try {
    const res = await API.delete(`/roles/${roleId}`);

    closeDeleteModal();

    if (res.success) {
      await refreshRoles();
      const grid = document.getElementById('permisos-roles-grid');
      if (grid) grid.innerHTML = renderRolesGrid();
      showToast(res.message || 'Rol eliminado', 'success');
      log('deleteRole: éxito');
    } else {
      showToast(res.message || 'Error al eliminar el rol', 'error');
    }
  } catch (e) {
    err('deleteRole error:', e);
    showToast('Error de conexión al eliminar el rol', 'error');
    closeDeleteModal();
  }
}

// ─── Helpers UI ───────────────────────────────────────────────────────────────

function selectColor(modal, color) {
  const colorInput = modal.querySelector('#permisos-role-color');
  const colorLabel = modal.querySelector('#permisos-color-label');

  if (colorInput) colorInput.value = color;
  if (colorLabel) colorLabel.textContent = color;

  // Marcar swatch activo
  modal.querySelectorAll('.permisos-color-swatch').forEach((sw) => {
    sw.classList.toggle('permisos-color-swatch--active', sw.getAttribute('data-color') === color);
  });

  log('selectColor:', color);
}

function showToast(message, type = 'info') {
  const existing = document.querySelector('.permisos-toast');
  if (existing) existing.remove();

  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };

  const toast = document.createElement('div');
  toast.className = `permisos-toast permisos-toast--${type}`;
  toast.innerHTML = `
    <span class="permisos-toast__icon">${icons[type] || 'ℹ️'}</span>
    <span class="permisos-toast__message">${escapeHtml(message)}</span>
  `;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('permisos-toast--visible'));

  setTimeout(() => {
    toast.classList.remove('permisos-toast--visible');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function safeOn(container, selector, event, handler) {
  const el = container.querySelector(selector);
  if (el) {
    el.addEventListener(event, handler);
  } else {
    warn(`safeOn: elemento "${selector}" no encontrado`);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ═════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN GLOBAL
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Punto de entrada principal del módulo.
 * Llama esto desde app.js después del login.
 */
export async function initPermissionsSystem() {
  log('initPermissionsSystem: iniciando sistema de permisos...');

  try {
    // 1. Cargar permisos del rol actual
    await loadCurrentPermissions();

    // 2. Aplicar visibilidad de navegación
    await applyNavigationPermissions();

    // 3. Aplicar visibilidad de botones de acción
    applyActionPermissions();

    // 4. Instalar interceptor de acciones no permitidas
    setupActionInterceptors();

    log('initPermissionsSystem: sistema inicializado correctamente');
  } catch (e) {
    err('initPermissionsSystem error:', e);
  }
}

export default {
  initPermissionsSystem,
  initRolesManager,
  loadCurrentPermissions,
  applyNavigationPermissions,
  applyActionPermissions,
  canView,
  canAction,
  showNoPermissionAlert,
  invalidatePermissionsCache,
};
