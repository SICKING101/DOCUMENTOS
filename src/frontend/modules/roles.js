// src/frontend/modules/roles.js
// Módulo completo para gestión de roles y permisos dinámicos

import { api } from '../services/api.js';
import {
  loadCurrentPermissions,
  applyNavigationPermissions,
  applyActionPermissions,
  invalidatePermissionsCache,
  canView,
  canAction,
  showNoPermissionAlert,
  initPermissionsSystem,
} from '../permissions.js';

// ─── Debug helper ─────────────────────────────────────────────────────────────
const DEBUG = true;
function log(...args)  { if (DEBUG) console.log('🎭 [Roles]', ...args); }
function warn(...args) { if (DEBUG) console.warn('⚠️ [Roles]', ...args); }
function err(...args)  {           console.error('❌ [Roles]', ...args); }

// Secciones que no se deben mostrar/editar al crear/editar roles
const EXCLUDED_ROLE_SECTIONS = new Set(['notificaciones']);

function filterExcludedSections(sections) {
  return (sections || []).filter(s => s?.key && !EXCLUDED_ROLE_SECTIONS.has(s.key));
}

// ─── Re-exportar para que otros módulos puedan importar de aquí ───────────────
export {
  loadCurrentPermissions,
  applyNavigationPermissions,
  applyActionPermissions,
  invalidatePermissionsCache,
  canView,
  canAction,
  showNoPermissionAlert,
  initPermissionsSystem,
};

// ─── Estado del módulo ────────────────────────────────────────────────────────
let state = {
  roles:       [],
  sections:    [],
  editing:     null,
  loading:     false,
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
// HELPERS DE API — Wrapper sobre la instancia `api` del proyecto
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Realiza una petición a la API del proyecto.
 * Usa la instancia `api` importada de services/api.js.
 * Si la instancia tiene métodos como api.get/post/put/delete, los usa.
 * Si no, usa fetch directamente con el token del localStorage.
 */
async function apiCall(method, path, body = null) {
  const token = localStorage.getItem('token') || '';
  const url   = `/api${path}`;

  log(`apiCall: ${method.toUpperCase()} ${url}`);

  // Intentar usar la instancia api si tiene el método
  if (api && typeof api[method.toLowerCase()] === 'function') {
    try {
      const result = await api[method.toLowerCase()](path, body);
      return result;
    } catch (e) {
      warn(`apiCall: api.${method} falló, usando fetch directo:`, e.message);
    }
  }

  // Fallback: fetch directo
  const options = {
    method: method.toUpperCase(),
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
    },
  };

  if (body && method.toUpperCase() !== 'GET') {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data     = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `HTTP ${response.status}`);
  }

  return data;
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

  log('initRolesManager: completado ✅');
}

/**
 * Carga los roles desde la API y los guarda en estado.
 */
async function refreshRoles() {
  try {
    state.loading = true;
    log('refreshRoles: cargando...');

    const res = await apiCall('GET', '/roles');

    if (res.success) {
      state.roles    = res.data     || [];
      state.sections = filterExcludedSections(res.sections || FALLBACK_SECTIONS);
      log(`refreshRoles: ${state.roles.length} roles cargados, ${state.sections.length} secciones`);
    } else {
      warn('refreshRoles: respuesta no exitosa:', res.message);
      state.sections = filterExcludedSections(FALLBACK_SECTIONS);
    }
  } catch (e) {
    err('refreshRoles:', e);
    state.sections = filterExcludedSections(FALLBACK_SECTIONS);
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
    <div class="permisos-modal" id="permisos-modal-rol" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="permisos-modal-title">
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
    <div class="permisos-modal permisos-modal--danger" id="permisos-modal-delete" role="dialog" aria-modal="true" aria-hidden="true">
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
  const permCount    = (role.permissions || []).filter((p) => p.canView || p.canAction).length;
  const totalSections = state.sections.length;
  const pct          = totalSections > 0 ? Math.round((permCount / totalSections) * 100) : 0;

  const systemBadge = role.isSystem
    ? `<span class="permisos-badge permisos-badge--system">Sistema</span>`
    : '';

  const editBtn = !role.isSystem
    ? `<button class="permisos-card__action permisos-card__action--edit"
         data-role-id="${role._id}"
         title="Editar rol"
         aria-label="Editar rol ${escapeHtml(role.name)}">✏️</button>`
    : '';

  const deleteBtn = !role.isSystem
    ? `<button class="permisos-card__action permisos-card__action--delete"
         data-role-id="${role._id}"
         data-role-name="${escapeHtml(role.name)}"
         title="Eliminar rol"
         aria-label="Eliminar rol ${escapeHtml(role.name)}">🗑️</button>`
    : '';

  // Mini lista de secciones con permiso de vista
  const viewableSections = (role.permissions || [])
    .filter((p) => p.canView)
    .map((p) => {
      const sec = state.sections.find((s) => s.key === p.section);
      return sec
        ? `<span class="permisos-tag" title="${escapeHtml(sec.label)}">${sec.icon}</span>`
        : '';
    })
    .join('');

  const userCount  = role.userCount || 0;
  const colorSafe  = escapeHtml(role.color || '#6b7280');

  return `
    <div class="permisos-role-card" data-role-id="${role._id}">
      <div class="permisos-role-card__header">
        <div class="permisos-role-card__color-dot" style="background:${colorSafe}"></div>
        <div class="permisos-role-card__info">
          <h4 class="permisos-role-card__name">
            ${escapeHtml(role.name)} ${systemBadge}
          </h4>
          ${role.description
            ? `<p class="permisos-role-card__desc">${escapeHtml(role.description)}</p>`
            : ''}
        </div>
        <div class="permisos-role-card__actions">
          ${editBtn}
          ${deleteBtn}
        </div>
      </div>

      <div class="permisos-role-card__stats">
        <div class="permisos-role-card__stat">
          <span class="permisos-role-card__stat-label">Usuarios</span>
          <span class="permisos-role-card__stat-value">${userCount}</span>
        </div>
        <div class="permisos-role-card__stat">
          <span class="permisos-role-card__stat-label">Secciones</span>
          <span class="permisos-role-card__stat-value">${permCount}/${totalSections}</span>
        </div>
        <div class="permisos-role-card__stat">
          <span class="permisos-role-card__stat-label">Cobertura</span>
          <span class="permisos-role-card__stat-value">${pct}%</span>
        </div>
      </div>

      <div class="permisos-role-card__progress-bar" title="${pct}% de secciones con acceso">
        <div class="permisos-role-card__progress-fill"
          style="width:${pct}%; background:${colorSafe}">
        </div>
      </div>

      <div class="permisos-role-card__sections">
        ${viewableSections || '<span class="permisos-role-card__no-sections">Sin secciones visibles</span>'}
      </div>
    </div>
  `;
}

// ─── Render del formulario de rol ─────────────────────────────────────────────

function renderRoleForm(role) {
  const isEdit      = Boolean(role);
  const name        = isEdit ? escapeHtml(role.name)        : '';
  const description = isEdit ? escapeHtml(role.description) : '';
  const color       = isEdit ? (role.color || '#6b7280')    : '#6b7280';

  // Construir mapa de permisos existentes
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
      aria-label="Color ${c}"
    ></button>
  `).join('');

  const sectionsRows = state.sections.map((sec) => {
    const p = permMap[sec.key] || { canView: false, canAction: false };
    return `
      <tr class="permisos-perm-row" data-section="${sec.key}">
        <td class="permisos-perm-row__section">
          <span class="permisos-perm-row__icon" aria-hidden="true">${sec.icon}</span>
          <span class="permisos-perm-row__label">${escapeHtml(sec.label)}</span>
        </td>
        <td class="permisos-perm-row__toggle">
          <label class="permisos-toggle" title="Puede ver la sección en el sidebar">
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
          <label class="permisos-toggle" title="Puede crear, editar y eliminar en esta sección">
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

      <!-- Nombre del rol -->
      <div class="permisos-form__group">
        <label class="permisos-form__label" for="permisos-role-name">
          Nombre del Rol <span class="permisos-form__required" aria-hidden="true">*</span>
        </label>
        <input
          type="text"
          id="permisos-role-name"
          class="permisos-form__input"
          placeholder="Ej. Contador, Diseñador, Auditor..."
          value="${name}"
          maxlength="50"
          required
          autocomplete="off"
          aria-required="true"
          aria-describedby="permisos-name-error"
        >
        <span class="permisos-form__error" id="permisos-name-error" role="alert"></span>
      </div>

      <!-- Descripción -->
      <div class="permisos-form__group">
        <label class="permisos-form__label" for="permisos-role-desc">
          Descripción <span class="permisos-form__optional">(opcional)</span>
        </label>
        <input
          type="text"
          id="permisos-role-desc"
          class="permisos-form__input"
          placeholder="Descripción breve del rol"
          value="${description}"
          maxlength="200"
        >
      </div>

      <!-- Color del rol -->
      <div class="permisos-form__group">
        <label class="permisos-form__label">Color del Rol</label>
        <div class="permisos-color-picker">
          <div class="permisos-color-swatches" role="group" aria-label="Colores predefinidos">
            ${colorSwatches}
          </div>
          <div class="permisos-color-custom">
            <input
              type="color"
              id="permisos-role-color"
              class="permisos-color-input"
              value="${color}"
              title="Color personalizado"
              aria-label="Color personalizado"
            >
            <span class="permisos-color-label" id="permisos-color-label">${color}</span>
          </div>
        </div>
      </div>

      <!-- Tabla de permisos por sección -->
      <div class="permisos-form__group">
        <div class="permisos-form__label-row">
          <label class="permisos-form__label">Permisos por Sección</label>
          <div class="permisos-form__quick-actions" role="group" aria-label="Acciones rápidas">
            <button type="button" class="permisos-btn permisos-btn--xs permisos-btn--ghost" id="permisos-select-all-view">
              👁 Ver todo
            </button>
            <button type="button" class="permisos-btn permisos-btn--xs permisos-btn--ghost" id="permisos-select-all-action">
              ⚡ Acciones todo
            </button>
            <button type="button" class="permisos-btn permisos-btn--xs permisos-btn--ghost" id="permisos-clear-all">
              ✕ Limpiar todo
            </button>
          </div>
        </div>

        <div class="permisos-table-wrapper" role="region" aria-label="Tabla de permisos">
          <table class="permisos-table">
            <thead>
              <tr>
                <th class="permisos-table__th permisos-table__th--section" scope="col">Sección</th>
                <th class="permisos-table__th" scope="col">
                  <span title="Puede acceder y ver esta sección en el menú lateral">👁 Ver</span>
                </th>
                <th class="permisos-table__th" scope="col">
                  <span title="Puede ejecutar acciones: crear, editar, eliminar">⚡ Acciones</span>
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
          Activar Acciones activa Ver automáticamente.
        </p>
      </div>

      <!-- Footer -->
      <div class="permisos-form__footer">
        <button type="button" class="permisos-btn permisos-btn--ghost" id="permisos-form-cancel">
          Cancelar
        </button>
        <button type="submit" class="permisos-btn permisos-btn--primary" id="permisos-form-submit">
          ${isEdit ? '💾 Guardar Cambios' : '＋ Crear Rol'}
        </button>
      </div>
    </form>
  `;
}

// ─── Eventos del manager ──────────────────────────────────────────────────────

function attachManagerEvents(container) {
  log('attachManagerEvents: adjuntando eventos...');

  // Botón "Nuevo Rol"
  safeOn(container, '#permisos-btn-nuevo-rol', 'click', () => openRoleModal(null));

  // Cerrar modal de edición/creación
  safeOn(container, '#permisos-modal-close',    'click', closeRoleModal);
  safeOn(container, '#permisos-modal-backdrop', 'click', closeRoleModal);
  safeOn(container, '#permisos-form-cancel',    'click', closeRoleModal);

  // Cerrar modal de confirmación de eliminación
  safeOn(container, '#permisos-delete-close',   'click', closeDeleteModal);
  safeOn(container, '#permisos-delete-backdrop','click', closeDeleteModal);
  safeOn(container, '#permisos-delete-cancel',  'click', closeDeleteModal);

  // Delegación en el grid de roles (editar / eliminar)
  const grid = container.querySelector('#permisos-roles-grid');
  if (grid) {
    grid.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.permisos-card__action--edit');
      if (editBtn) {
        const roleId = editBtn.getAttribute('data-role-id');
        const role   = state.roles.find((r) => r._id === roleId);
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
  } else {
    warn('attachManagerEvents: #permisos-roles-grid no encontrado');
  }

  // Eventos dentro del modal de creación/edición
  attachFormEvents(container);

  log('attachManagerEvents: completado');
}

function attachFormEvents(container) {
  const modal = container.querySelector('#permisos-modal-rol');
  if (!modal) {
    warn('attachFormEvents: #permisos-modal-rol no encontrado');
    return;
  }

  // Delegación para eventos dentro del modal
  modal.addEventListener('click', async (e) => {
    // Click en swatch de color
    const swatch = e.target.closest('.permisos-color-swatch');
    if (swatch) {
      const color = swatch.getAttribute('data-color');
      selectColor(modal, color);
      return;
    }

    // Botones de selección rápida
    if (e.target.id === 'permisos-select-all-view') {
      modal.querySelectorAll('input[data-perm="canView"]').forEach((cb) => { cb.checked = true; });
      log('attachFormEvents: seleccionado "Ver" para todas las secciones');
      return;
    }

    if (e.target.id === 'permisos-select-all-action') {
      modal.querySelectorAll('input[data-perm="canView"], input[data-perm="canAction"]')
        .forEach((cb) => { cb.checked = true; });
      log('attachFormEvents: seleccionado "Ver + Acciones" para todas las secciones');
      return;
    }

    if (e.target.id === 'permisos-clear-all') {
      modal.querySelectorAll('input[data-perm]').forEach((cb) => { cb.checked = false; });
      log('attachFormEvents: limpiados todos los permisos');
      return;
    }

    // Submit del formulario
    const submitBtn = e.target.closest('#permisos-form-submit');
    if (submitBtn) {
      e.preventDefault();
      await submitRoleForm(modal);
      return;
    }
  });

  // Cambios en inputs (color y checkboxes)
  modal.addEventListener('input', (e) => {
    // Color picker nativo
    if (e.target.id === 'permisos-role-color') {
      selectColor(modal, e.target.value);
      return;
    }

    // Lógica de dependencia: Acción → Vista automática
    if (e.target.classList.contains('permisos-toggle__input')) {
      const perm    = e.target.getAttribute('data-perm');
      const section = e.target.getAttribute('data-section');

      if (perm === 'canAction' && e.target.checked) {
        // Activar canView automáticamente al activar canAction
        const viewInput = modal.querySelector(
          `input[data-perm="canView"][data-section="${section}"]`
        );
        if (viewInput && !viewInput.checked) {
          viewInput.checked = true;
          log(`  Auto-activado canView para "${section}" al activar canAction`);
        }
      }

      if (perm === 'canView' && !e.target.checked) {
        // Desactivar canAction automáticamente al desactivar canView
        const actionInput = modal.querySelector(
          `input[data-perm="canAction"][data-section="${section}"]`
        );
        if (actionInput && actionInput.checked) {
          actionInput.checked = false;
          log(`  Auto-desactivado canAction para "${section}" al desactivar canView`);
        }
      }
    }
  });

  log('attachFormEvents: eventos del formulario adjuntados');
}

// ─── Acciones de modal ────────────────────────────────────────────────────────

function openRoleModal(role) {
  state.editing = role;

  const modal   = document.getElementById('permisos-modal-rol');
  const titleEl = document.getElementById('permisos-modal-title');
  const bodyEl  = document.getElementById('permisos-modal-body');

  if (!modal || !titleEl || !bodyEl) {
    err('openRoleModal: elementos del modal no encontrados');
    return;
  }

  titleEl.textContent = role ? `Editar Rol: ${role.name}` : 'Nuevo Rol';
  bodyEl.innerHTML    = renderRoleForm(role);

  modal.classList.add('permisos-modal--open');
  modal.setAttribute('aria-hidden', 'false');

  // Focus trap — enfocar el primer campo
  setTimeout(() => {
    const firstInput = modal.querySelector('#permisos-role-name');
    if (firstInput) firstInput.focus();
  }, 100);

  log(`openRoleModal: modal abierto para ${role ? `edición de "${role.name}"` : 'creación'}`);
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
  const modal      = document.getElementById('permisos-modal-delete');
  const textEl     = document.getElementById('permisos-delete-text');
  const confirmBtn = document.getElementById('permisos-delete-confirm-btn');

  if (!modal || !textEl || !confirmBtn) {
    err('openDeleteModal: elementos no encontrados');
    return;
  }

  textEl.textContent = `¿Estás seguro de que quieres eliminar el rol "${roleName}"?`;
  modal.classList.add('permisos-modal--open');
  modal.setAttribute('aria-hidden', 'false');

  // Clonar botón para remover listeners anteriores
  const newBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
  newBtn.addEventListener('click', () => deleteRole(roleId, roleName));

  log(`openDeleteModal: confirmación de eliminación para "${roleName}"`);
}

function closeDeleteModal() {
  const modal = document.getElementById('permisos-modal-delete');
  if (modal) {
    modal.classList.remove('permisos-modal--open');
    modal.setAttribute('aria-hidden', 'true');
  }
  log('closeDeleteModal: cerrado');
}

// ─── Lógica del formulario ────────────────────────────────────────────────────

function collectFormData(modal) {
  const name        = modal.querySelector('#permisos-role-name')?.value.trim()  || '';
  const description = modal.querySelector('#permisos-role-desc')?.value.trim()  || '';
  const color       = modal.querySelector('#permisos-role-color')?.value        || '#6b7280';

  // Recolectar secciones únicas
  const sectionKeys = [
    ...new Set(
      [...modal.querySelectorAll('input[data-section]')].map((el) => el.getAttribute('data-section'))
    ),
  ];

  const permissions = sectionKeys.map((section) => {
    const canViewEl   = modal.querySelector(`input[data-perm="canView"][data-section="${section}"]`);
    const canActionEl = modal.querySelector(`input[data-perm="canAction"][data-section="${section}"]`);
    return {
      section,
      canView:   canViewEl   ? canViewEl.checked   : false,
      canAction: canActionEl ? canActionEl.checked : false,
    };
  });

  log('collectFormData:', { name, description, color, permissions });
  return { name, description, color, permissions };
}

function validateForm(data) {
  const errors = [];

  if (!data.name || data.name.length < 2) {
    errors.push({ field: 'name', message: 'El nombre debe tener al menos 2 caracteres.' });
  }
  if (data.name.length > 50) {
    errors.push({ field: 'name', message: 'El nombre no puede superar 50 caracteres.' });
  }

  const reserved = ['administrador', 'desactivado'];
  if (reserved.includes(data.name.toLowerCase())) {
    errors.push({ field: 'name', message: `El nombre "${data.name}" está reservado por el sistema.` });
  }

  return errors;
}

function showFormErrors(modal, errors) {
  // Limpiar errores previos
  modal.querySelectorAll('.permisos-form__error').forEach((el) => { el.textContent = ''; });
  modal.querySelectorAll('.permisos-form__input--error').forEach((el) => {
    el.classList.remove('permisos-form__input--error');
  });

  errors.forEach((e) => {
    if (e.field === 'name') {
      const errorEl = modal.querySelector('#permisos-name-error');
      const inputEl = modal.querySelector('#permisos-role-name');
      if (errorEl) errorEl.textContent = e.message;
      if (inputEl) {
        inputEl.classList.add('permisos-form__input--error');
        inputEl.focus();
      }
    }
  });
}

async function submitRoleForm(modal) {
  log('submitRoleForm: iniciando...');

  const data   = collectFormData(modal);
  const errors = validateForm(data);

  if (errors.length > 0) {
    showFormErrors(modal, errors);
    warn('submitRoleForm: errores de validación', errors);
    return;
  }

  const submitBtn = modal.querySelector('#permisos-form-submit');
  const originalText = submitBtn?.textContent;
  if (submitBtn) {
    submitBtn.disabled    = true;
    submitBtn.textContent = '⏳ Guardando...';
  }

  try {
    let res;
    if (state.editing) {
      log(`submitRoleForm: actualizando rol "${state.editing.name}" (${state.editing._id})`);
      res = await apiCall('PUT', `/roles/${state.editing._id}`, data);
    } else {
      log('submitRoleForm: creando rol nuevo');
      res = await apiCall('POST', '/roles', data);
    }

    if (res.success) {
      closeRoleModal();
      await refreshRoles();

      const grid = document.getElementById('permisos-roles-grid');
      if (grid) grid.innerHTML = renderRolesGrid();

      showToast(res.message || 'Rol guardado exitosamente', 'success');
      log('submitRoleForm: éxito ✅');
    } else {
      warn('submitRoleForm: error de API:', res.message);
      showToast(res.message || 'Error al guardar el rol', 'error');
      if (submitBtn) {
        submitBtn.disabled    = false;
        submitBtn.textContent = originalText;
      }
    }
  } catch (e) {
    err('submitRoleForm:', e);
    showToast(`Error de conexión: ${e.message}`, 'error');
    if (submitBtn) {
      submitBtn.disabled    = false;
      submitBtn.textContent = originalText;
    }
  }
}

async function deleteRole(roleId, roleName) {
  log(`deleteRole: eliminando "${roleName}" (${roleId})`);

  const confirmBtn = document.getElementById('permisos-delete-confirm-btn');
  const originalText = confirmBtn?.textContent;
  if (confirmBtn) {
    confirmBtn.disabled    = true;
    confirmBtn.textContent = '⏳ Eliminando...';
  }

  try {
    const res = await apiCall('DELETE', `/roles/${roleId}`);

    closeDeleteModal();

    if (res.success) {
      await refreshRoles();
      const grid = document.getElementById('permisos-roles-grid');
      if (grid) grid.innerHTML = renderRolesGrid();

      showToast(res.message || 'Rol eliminado', 'success');
      log(`deleteRole: "${roleName}" eliminado ✅`);
    } else {
      warn('deleteRole: error de API:', res.message);
      showToast(res.message || 'Error al eliminar el rol', 'error');
    }
  } catch (e) {
    err('deleteRole:', e);
    showToast(`Error de conexión: ${e.message}`, 'error');
    closeDeleteModal();
  }
}

// ─── Helpers de UI ─────────────────────────────────────────────────────────────

function selectColor(modal, color) {
  const colorInput = modal.querySelector('#permisos-role-color');
  const colorLabel = modal.querySelector('#permisos-color-label');

  if (colorInput) colorInput.value = color;
  if (colorLabel) colorLabel.textContent = color;

  modal.querySelectorAll('.permisos-color-swatch').forEach((sw) => {
    sw.classList.toggle(
      'permisos-color-swatch--active',
      sw.getAttribute('data-color') === color
    );
  });

  log('selectColor:', color);
}

function showToast(message, type = 'info') {
  const existing = document.querySelector('.permisos-toast');
  if (existing) existing.remove();

  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };

  const toast = document.createElement('div');
  toast.className = `permisos-toast permisos-toast--${type}`;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.innerHTML = `
    <span class="permisos-toast__icon" aria-hidden="true">${icons[type] || 'ℹ️'}</span>
    <span class="permisos-toast__message">${escapeHtml(message)}</span>
  `;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('permisos-toast--visible'));

  setTimeout(() => {
    toast.classList.remove('permisos-toast--visible');
    setTimeout(() => toast.remove(), 320);
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
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#039;');
}

// ═════════════════════════════════════════════════════════════════════════════
// DEBUGGING
// ═════════════════════════════════════════════════════════════════════════════

export function debugRoles() {
  console.group('🎭 [Roles] Debug completo');
  console.log('Estado del módulo:', { ...state });
  console.log('Roles cargados:', state.roles.length);
  console.log('Secciones:', state.sections.map((s) => s.key));
  state.roles.forEach((role) => {
    const viewable = (role.permissions || []).filter((p) => p.canView).map((p) => p.section);
    const actionable = (role.permissions || []).filter((p) => p.canAction).map((p) => p.section);
    console.log(`  [${role.name}] ver=[${viewable.join(',')}] acción=[${actionable.join(',')}]`);
  });
  console.groupEnd();
}

if (typeof window !== 'undefined') {
  window._debugRoles = debugRoles;
  log('Helper de debug disponible: window._debugRoles()');
}

// ─── Exportación por defecto ──────────────────────────────────────────────────
export default {
  initRolesManager,
  initPermissionsSystem,
  loadCurrentPermissions,
  applyNavigationPermissions,
  applyActionPermissions,
  canView,
  canAction,
  showNoPermissionAlert,
  invalidatePermissionsCache,
  debugRoles,
};
