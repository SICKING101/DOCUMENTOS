// src/frontend/modules/admin/index.js
// Panel de Administración — Usuarios + Roles y Permisos dinámicos
//
// ROLES FIJOS ELIMINADOS — solo existen:
//   "administrador" (fijo, hardcoded)
//   "desactivado"   (fijo, hardcoded)
//   [cualquier otro] → rol dinámico creado desde el tab "Roles y Permisos"
//
// PROBLEMAS RESUELTOS EN ESTA VERSIÓN:
//   1. El select de "Rol" al editar/crear usuario muestra los roles dinámicos
//   2. Panel "Roles del Sistema" muestra los roles creados dinámicamente
//   3. Sin roles fijos (gerente/editor/lector/etc.)

import { api } from '../../services/api.js';
import { showAlert, formatDate } from '../../utils.js';
import { hasPermission, PERMISSIONS, ROLES } from '../../permissions.js';

// ─── Debug ─────────────────────────────────────────────────────────────────────
const DEBUG = true;
function log(...args)  { if (DEBUG) console.log('⚙️ [Admin]', ...args); }
function warn(...args) { if (DEBUG) console.warn('⚠️ [Admin]', ...args); }
function err(...args)  { console.error('❌ [Admin]', ...args); }

// =============================================================================
// CONSTANTES
// =============================================================================

const ADMIN_ROLE    = 'administrador';
const DISABLED_ROLE = 'desactivado';

// Fallback de secciones si la API de roles falla
const SYSTEM_SECTIONS = [
  { key: 'documentos',     label: 'Documentos',    icon: '📄' },
  { key: 'personas',       label: 'Personas',       icon: '👥' },
  { key: 'categorias',     label: 'Categorías',     icon: '🏷️' },
  { key: 'departamentos',  label: 'Departamentos',  icon: '🏢' },
  { key: 'tareas',         label: 'Tareas',         icon: '✅' },
  { key: 'reportes',       label: 'Reportes',       icon: '📊' },
  { key: 'papelera',       label: 'Papelera',       icon: '🗑️' },
  { key: 'calendario',     label: 'Calendario',     icon: '📅' },
  { key: 'historial',      label: 'Historial',      icon: '📜' },
  { key: 'notificaciones', label: 'Notificaciones', icon: '🔔' },
  { key: 'soporte',        label: 'Soporte',        icon: '🛟' },
];

const PRESET_COLORS = [
  '#dc2626','#b91c1c','#ef4444','#f59e0b','#d97706',
  '#10b981','#059669','#06b6d4','#0891b2','#3b82f6',
  '#2563eb','#8b5cf6','#7c3aed','#ec4899','#db2777',
  '#6b7280','#374151','#1e293b',
];

// ─── Estado módulo roles ────────────────────────────────────────────────────────
let rolesState = {
  roles:    [],   // Roles dinámicos cargados desde /api/roles
  sections: [],   // Secciones disponibles (desde API o fallback)
  editing:  null, // Rol que se está editando actualmente
};

// Evita adjuntar los event listeners del tab de Roles más de una vez
let rolesEventsAttached = false;

// =============================================================================
// UTILIDADES
// =============================================================================

function escapeHtml(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function getCurrentUserId() {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    return u.id || u._id;
  } catch { return null; }
}

function truncate(text, max) {
  if (!text) return '';
  return text.length > max ? text.substring(0, max) + '…' : text;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Helpers de rol ────────────────────────────────────────────────────────────

/** Nombre legible del rol */
function getRolLabel(rolName) {
  if (!rolName)                    return 'Sin rol';
  if (rolName === ADMIN_ROLE)      return 'Administrador';
  if (rolName === DISABLED_ROLE)   return 'Desactivado';
  // Buscar en dinámicos (devuelve el nombre exacto tal como se creó)
  const found = rolesState.roles.find(r => r.name === rolName);
  return found ? found.name : (rolName.charAt(0).toUpperCase() + rolName.slice(1));
}

/** Color hexadecimal del rol */
function getRolColor(rolName) {
  if (rolName === ADMIN_ROLE)    return '#dc2626';
  if (rolName === DISABLED_ROLE) return '#374151';
  const found = rolesState.roles.find(r => r.name === rolName);
  return found?.color || '#6b7280';
}

/** Ícono FontAwesome del rol */
function getRolIcon(rolName) {
  if (rolName === ADMIN_ROLE)    return 'fas fa-crown';
  if (rolName === DISABLED_ROLE) return 'fas fa-user-slash';
  return 'fas fa-user-tag';
}

// ─── Construcción dinámica del <select> de rol ─────────────────────────────────
//
// FIX #1: Este select ya NO tiene roles fijos. Solo muestra:
//   - "Administrador" (si no existe ya uno o si el usuario actual ya lo tiene)
//   - Los roles dinámicos cargados desde rolesState.roles
//
function buildRoleOptions(currentRol = '', adminsCount = 0) {
  log('buildRoleOptions → currentRol:', currentRol, '| admins:', adminsCount,
      '| roles dinámicos:', rolesState.roles.map(r => r.name));

  let html = `<option value="">Seleccionar rol</option>`;

  // Administrador: solo disponible si no existe uno, o si este usuario ya lo tiene
  if (adminsCount === 0 || currentRol === ADMIN_ROLE) {
    html += `<option value="${ADMIN_ROLE}" ${currentRol === ADMIN_ROLE ? 'selected' : ''}>
               👑 Administrador
             </option>`;
  }

  // Roles dinámicos
  if (rolesState.roles.length > 0) {
    rolesState.roles.forEach(role => {
      const sel = currentRol === role.name ? 'selected' : '';
      html += `<option value="${escapeHtml(role.name)}" ${sel}>${escapeHtml(role.name)}</option>`;
    });
  } else {
    html += `<option disabled>── Sin roles creados. Ve a "Roles y Permisos" ──</option>`;
  }

  return html;
}

// =============================================================================
// PRELOADER
// =============================================================================

let _preloaderId = null;

function showPreloader(msg = 'Procesando...') {
  if (_preloaderId) hidePreloader();
  const id = 'adm-pre-' + Date.now();
  document.body.insertAdjacentHTML('beforeend', `
    <div id="${id}" style="position:fixed;inset:0;background:rgba(0,0,0,.7);
      backdrop-filter:blur(8px);z-index:999999;display:flex;align-items:center;justify-content:center;">
      <div style="text-align:center;padding:2rem;background:var(--bg-primary);
        border-radius:var(--radius-xl);box-shadow:var(--shadow-xl);border:1px solid var(--border);max-width:360px;">
        <i class="fas fa-spinner fa-spin fa-3x" style="color:var(--primary);margin-bottom:1rem;display:block;"></i>
        <div style="color:var(--text-primary);font-weight:500;">${msg}</div>
      </div>
    </div>`);
  document.body.classList.add('preloader-active');
  _preloaderId = id;
}

function hidePreloader() {
  if (_preloaderId) { document.getElementById(_preloaderId)?.remove(); _preloaderId = null; }
  if (!document.querySelector('[id^="adm-pre-"]')) document.body.classList.remove('preloader-active');
}

// =============================================================================
// MODAL DE CONFIRMACIÓN
// =============================================================================

let _activeModal = null;

function closeModal() {
  if (_activeModal) { _activeModal.parentNode && _activeModal.remove(); _activeModal = null; document.body.classList.remove('modal-open'); }
}

function createConfirmModal(opts) {
  return new Promise(resolve => {
    closeModal();
    const m = document.createElement('div');
    m.className = 'admin-modal';
    m.style.cssText = 'position:fixed!important;inset:0!important;background:rgba(0,0,0,.7)!important;backdrop-filter:blur(8px)!important;z-index:1000000!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:20px!important;box-sizing:border-box!important;';
    const icons  = { warning:'fa-exclamation-triangle', danger:'fa-trash-alt', success:'fa-check-circle', info:'fa-info-circle' };
    const colors = { warning:'var(--warning)', danger:'var(--danger)', success:'var(--success)', info:'var(--info)' };
    m.innerHTML = `
      <div style="max-width:450px;width:100%;background:var(--bg-primary);border-radius:var(--radius-xl);box-shadow:var(--shadow-xl);border:1px solid var(--border);">
        <header style="padding:1.75rem 1.75rem 1rem;display:flex;justify-content:space-between;align-items:flex-start;">
          <h3 style="margin:0;font-size:1.4rem;font-weight:700;color:var(--text-primary);">${opts.title || 'Confirmar'}</h3>
          <button class="adm-modal-x" style="background:var(--bg-tertiary);border:none;font-size:1.4rem;cursor:pointer;color:var(--text-secondary);width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:50%;">&times;</button>
        </header>
        <section style="padding:1.75rem;text-align:center;">
          <i class="fas ${icons[opts.type]||'fa-question-circle'} fa-3x" style="color:${colors[opts.type]||'var(--primary)'};margin-bottom:16px;display:block;"></i>
          <p style="font-size:1rem;line-height:1.5;color:var(--text-primary);margin:0 0 .5rem;">${opts.message||'¿Estás seguro?'}</p>
          ${opts.details ? `<p style="color:var(--text-secondary);font-size:.88rem;">${opts.details}</p>` : ''}
        </section>
        <footer style="padding:1rem 1.75rem 1.75rem;display:flex;justify-content:center;gap:.75rem;">
          <button class="btn btn--outline adm-modal-cancel" style="padding:.6rem 1.2rem;border-radius:var(--radius-md);cursor:pointer;">${opts.cancelText||'Cancelar'}</button>
          <button class="btn btn--${opts.type==='danger'?'danger':'primary'} adm-modal-ok" style="padding:.6rem 1.2rem;border-radius:var(--radius-md);cursor:pointer;">${opts.confirmText||'Confirmar'}</button>
        </footer>
      </div>`;
    document.body.appendChild(m);
    _activeModal = m;
    document.body.classList.add('modal-open');
    const no  = () => { closeModal(); resolve(false); };
    const yes = () => { closeModal(); resolve(true);  };
    m.querySelector('.adm-modal-x').addEventListener('click', no);
    m.querySelector('.adm-modal-cancel').addEventListener('click', no);
    m.querySelector('.adm-modal-ok').addEventListener('click', yes);
    const esc = e => { if (e.key === 'Escape') { document.removeEventListener('keydown', esc); no(); } };
    document.addEventListener('keydown', esc);
    m.addEventListener('click', e => { if (e.target === m) no(); });
  });
}

// =============================================================================
// ACCIONES DE USUARIO
// =============================================================================

async function deactivateUser(uid, uname) {
  const ok = await createConfirmModal({ title: '¿Desactivar usuario?', message: `"${uname}" no podrá iniciar sesión.`, confirmText: 'Desactivar', type: 'warning' });
  if (!ok) return false;
  showPreloader('Desactivando usuario...');
  await sleep(50);
  try {
    const r = await api.call(`/admin/users/${uid}/deactivate`, { method: 'PATCH', body: { activo: false } });
    await sleep(1000); hidePreloader();
    if (r?.success) { showAlert('Usuario desactivado correctamente', 'success'); return true; }
    throw new Error(r?.message || 'Error al desactivar');
  } catch (e) { hidePreloader(); err('deactivateUser:', e); showAlert(e.message, 'error'); return false; }
}

async function reactivateUser(uid, uname) {
  const ok = await createConfirmModal({ title: '¿Reactivar usuario?', message: `"${uname}" podrá iniciar sesión nuevamente.`, confirmText: 'Reactivar', type: 'success' });
  if (!ok) return false;
  showPreloader('Reactivando usuario...');
  await sleep(50);
  try {
    // Asignar el primer rol dinámico disponible al reactivar
    const defaultRol = rolesState.roles[0]?.name || DISABLED_ROLE;
    const r = await api.call(`/admin/users/${uid}/reactivate`, { method: 'PATCH', body: { activo: true, rol: defaultRol } });
    await sleep(1000); hidePreloader();
    if (r?.success) { showAlert('Usuario reactivado correctamente', 'success'); return true; }
    throw new Error(r?.message || 'Error al reactivar');
  } catch (e) { hidePreloader(); err('reactivateUser:', e); showAlert(e.message, 'error'); return false; }
}

async function deleteUserPermanently(uid, uname) {
  const ok = await createConfirmModal({ title: '⚠️ Eliminar permanentemente', message: `¿Eliminar a "${uname}"?`, details: 'NO SE PUEDE DESHACER.', confirmText: 'Eliminar permanentemente', type: 'danger' });
  if (!ok) return false;
  showPreloader('Eliminando usuario...');
  await sleep(50);
  try {
    const r = await api.call(`/admin/users/${uid}`, { method: 'DELETE' });
    await sleep(1000); hidePreloader();
    if (r?.success) { showAlert('Usuario eliminado permanentemente', 'success'); return true; }
    throw new Error(r?.message || 'Error al eliminar');
  } catch (e) { hidePreloader(); err('deleteUserPermanently:', e); showAlert(e.message, 'error'); return false; }
}

async function updateUser(uid, data) {
  showPreloader('Actualizando usuario...');
  await sleep(50);
  try {
    const r = await api.call(`/admin/users/${uid}`, { method: 'PATCH', body: data });
    await sleep(1000); hidePreloader();
    if (r?.success) { showAlert('Usuario actualizado correctamente', 'success'); return true; }
    throw new Error(r?.message || 'Error al actualizar');
  } catch (e) { hidePreloader(); showAlert(e.message, 'error'); return false; }
}

async function createUser(data) {
  showPreloader('Creando usuario...');
  await sleep(50);
  try {
    const r = await api.call('/admin/users', { method: 'POST', body: data });
    await sleep(1000); hidePreloader();
    if (r?.success) { showAlert('Usuario creado exitosamente', 'success'); return true; }
    throw new Error(r?.message || 'Error al crear');
  } catch (e) { hidePreloader(); showAlert(e.message, 'error'); return false; }
}

// =============================================================================
// RENDER — TABLA DE USUARIOS
// =============================================================================

function renderUserRow(user, editingId, currentUserId, adminsCount) {
  const isMe    = user._id === currentUserId;
  const isAdmin = user.rol === ADMIN_ROLE;
  const active  = user.activo !== false && user.rol !== DISABLED_ROLE;

  if (editingId === user._id) return renderEditRow(user, adminsCount);

  const color = getRolColor(user.rol);
  const icon  = getRolIcon(user.rol);
  const label = getRolLabel(user.rol);

  return `
    <tr class="${!active ? 'table-row--inactive' : ''} ${isAdmin ? 'table-row--admin' : ''}">
      <td data-label="Usuario">
        <div class="user-cell">
          <div class="user-avatar" style="background:${color}22;color:${color};border:1.5px solid ${color}44;">
            <i class="${icon}"></i>
          </div>
          <div class="user-info">
            <span class="user-name" title="${escapeHtml(user.usuario)}">${escapeHtml(truncate(user.usuario,15))}</span>
            ${isMe ? '<span class="user-badge">Tú</span>' : ''}
          </div>
        </div>
      </td>
      <td data-label="Correo">
        <a href="mailto:${escapeHtml(user.correo)}" class="user-email" title="${escapeHtml(user.correo)}">
          <i class="fas fa-envelope"></i>
          <span>${escapeHtml(truncate(user.correo,22))}</span>
        </a>
      </td>
      <td data-label="Rol">
        <span style="background:${color}18;color:${color};border:1px solid ${color}44;
          padding:4px 10px;border-radius:99px;font-size:.78rem;font-weight:600;
          display:inline-flex;align-items:center;gap:5px;">
          <i class="${icon}"></i> ${escapeHtml(label)}
        </span>
      </td>
      <td data-label="Estado">
        <span class="status-badge status-badge--${active ? 'active' : 'inactive'}">
          <span class="status-dot"></span>${active ? 'Activo' : 'Inactivo'}
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
          ${!isAdmin ? `
            <button class="action-btn action-btn--edit" data-action="edit" data-id="${user._id}" title="Editar"><i class="fas fa-edit"></i></button>
            ${active
              ? `<button class="action-btn action-btn--warning" data-action="deactivate" data-id="${user._id}" data-name="${escapeHtml(user.usuario)}" title="Desactivar"><i class="fas fa-user-slash"></i></button>`
              : `<button class="action-btn action-btn--success" data-action="reactivate" data-id="${user._id}" data-name="${escapeHtml(user.usuario)}" title="Reactivar"><i class="fas fa-user-check"></i></button>`
            }
            ${!isMe ? `<button class="action-btn action-btn--delete" data-action="delete" data-id="${user._id}" data-name="${escapeHtml(user.usuario)}" title="Eliminar"><i class="fas fa-trash-alt"></i></button>` : ''}
          ` : `<span class="action-disabled" title="No se puede modificar al administrador"><i class="fas fa-ban"></i></span>`}
        </div>
      </td>
    </tr>`;
}

// FIX #1: renderEditRow usa buildRoleOptions → muestra roles dinámicos
function renderEditRow(user, adminsCount) {
  const active = user.activo !== false && user.rol !== DISABLED_ROLE;
  log('renderEditRow: user.rol=', user.rol,
      '| roles disponibles:', rolesState.roles.map(r => r.name));

  return `
    <tr class="table-row--editing">
      <td data-label="Usuario">
        <input type="text" class="edit-input" data-field="usuario" value="${escapeHtml(user.usuario)}" maxlength="30" placeholder="Usuario">
      </td>
      <td data-label="Correo">
        <input type="email" class="edit-input" data-field="correo" value="${escapeHtml(user.correo)}" maxlength="50" placeholder="Correo">
      </td>
      <td data-label="Rol">
        <div class="select-wrapper">
          <select class="edit-select" data-field="rol">
            ${buildRoleOptions(user.rol, adminsCount)}
          </select>
          <i class="fas fa-chevron-down select-arrow"></i>
        </div>
      </td>
      <td data-label="Estado">
        <label class="switch">
          <input type="checkbox" data-field="activo" ${active ? 'checked' : ''}>
          <span class="slider"></span>
        </label>
      </td>
      <td data-label="Acciones" colspan="2">
        <div class="edit-actions">
          <button class="btn btn--success btn--xs" data-action="save" data-id="${user._id}"><i class="fas fa-check"></i></button>
          <button class="btn btn--outline btn--xs" data-action="cancel"><i class="fas fa-times"></i></button>
        </div>
      </td>
    </tr>`;
}

// =============================================================================
// RENDER — ESTADÍSTICAS DE ROLES (FIX #2: 100% dinámico)
// =============================================================================

function renderRoleStats(users) {
  const totalActive   = users.filter(u => u.activo !== false && u.rol !== DISABLED_ROLE).length;
  const totalInactive = users.filter(u => u.activo === false  || u.rol === DISABLED_ROLE).length;
  const adminsCount   = users.filter(u => u.rol === ADMIN_ROLE).length;

  // Conteo de usuarios activos por rol
  const countMap = {};
  users.forEach(u => {
    if (u.activo === false || u.rol === DISABLED_ROLE) return;
    countMap[u.rol] = (countMap[u.rol] || 0) + 1;
  });

  // Siempre mostrar Admin primero
  const rows = [];
  const ac  = countMap[ADMIN_ROLE] || 0;
  rows.push({ label: 'Administrador', icon: 'fas fa-crown', color: '#dc2626',
              count: ac, pct: totalActive > 0 ? Math.round((ac / totalActive) * 100) : 0 });

  // Roles dinámicos
  rolesState.roles.forEach(role => {
    const c   = countMap[role.name] || 0;
    const pct = totalActive > 0 ? Math.round((c / totalActive) * 100) : 0;
    rows.push({ label: role.name, icon: 'fas fa-user-tag', color: role.color || '#6b7280', count: c, pct });
  });

  if (rolesState.roles.length === 0) {
    return `
      <div class="role-stats">
        <div class="role-stats-header">
          <h3 class="role-stats-title"><i class="fas fa-chart-pie"></i> Distribución por Rol</h3>
        </div>
        <p style="color:var(--text-tertiary);font-size:.85rem;text-align:center;padding:1rem 0;">
          Crea roles en la pestaña <strong>Roles y Permisos</strong> para ver estadísticas.
        </p>
      </div>`;
  }

  return `
    <div class="role-stats">
      <div class="role-stats-header">
        <h3 class="role-stats-title"><i class="fas fa-chart-pie"></i> Distribución por Rol</h3>
        <span class="role-stats-total">${totalActive} activos</span>
      </div>
      <div class="role-stats-grid">
        ${rows.map(r => `
          <div class="role-stat-item">
            <div class="role-stat-info">
              <div class="role-stat-label">
                <i class="${r.icon}" style="color:${r.color};"></i>
                <span>${escapeHtml(r.label)}</span>
              </div>
              <span class="role-stat-count">${r.count}</span>
            </div>
            <div class="role-stat-bar">
              <div class="role-stat-progress" style="width:${r.pct}%;background:${r.color};"></div>
            </div>
            <span class="role-stat-percentage">${r.pct}%</span>
          </div>`).join('')}
      </div>
      <div class="role-stats-footer">
        <div class="role-stat-quick"><i class="fas fa-user-check" style="color:var(--success);"></i><span>${totalActive} activos</span></div>
        <div class="role-stat-quick"><i class="fas fa-user-slash" style="color:var(--warning);"></i><span>${totalInactive} inactivos</span></div>
        <div class="role-stat-quick"><i class="fas fa-crown" style="color:var(--danger);"></i><span>${adminsCount} admin</span></div>
      </div>
    </div>`;
}

// =============================================================================
// RENDER — PANEL "ROLES DEL SISTEMA" (FIX #3: dinámico)
// Aparece en el tab Usuarios. Se actualiza sin recargar cuando se crea un rol.
// =============================================================================

function renderRoleDescriptions() {
  // Administrador siempre primero
  const adminCard = `
    <div class="role-description-item">
      <i class="fas fa-crown" style="color:#dc2626;"></i>
      <div class="role-description-content">
        <div class="role-description-title">Administrador</div>
        <div class="role-description-text">
          Único rol fijo del sistema. Acceso total a todas las secciones,
          incluyendo Administración y Auditoría. No puede eliminarse.
        </div>
      </div>
    </div>`;

  if (rolesState.roles.length === 0) {
    return `
      <div class="role-descriptions">
        ${adminCard}
        <div class="role-description-item">
          <i class="fas fa-info-circle" style="color:var(--info-color);"></i>
          <div class="role-description-content">
            <div class="role-description-title" style="color:var(--info-color);">
              Sin roles personalizados
            </div>
            <div class="role-description-text">
              Ve a la pestaña <strong>Roles y Permisos</strong> y crea roles con sus permisos.
              Aquí aparecerán automáticamente al crearlos.
            </div>
          </div>
        </div>
      </div>`;
  }

  const dynamicCards = rolesState.roles.map(role => {
    const vCount = (role.permissions || []).filter(p => p.canView).length;
    const aCount = (role.permissions || []).filter(p => p.canAction).length;
    return `
      <div class="role-description-item">
        <i class="fas fa-user-tag" style="color:${escapeHtml(role.color || '#6b7280')};"></i>
        <div class="role-description-content">
          <div class="role-description-title" style="display:flex;align-items:center;gap:8px;">
            ${escapeHtml(role.name)}
            <span style="width:10px;height:10px;border-radius:50%;
              background:${escapeHtml(role.color||'#6b7280')};display:inline-block;flex-shrink:0;"></span>
          </div>
          <div class="role-description-text">
            ${role.description ? escapeHtml(role.description) : '<em style="opacity:.55;font-style:italic;">Sin descripción</em>'}
            <br>
            <small style="color:var(--text-tertiary);">
              ${vCount} sección(es) visible(s) · ${aCount} con acciones
            </small>
          </div>
        </div>
      </div>`;
  }).join('');

  return `<div class="role-descriptions">${adminCard}${dynamicCards}</div>`;
}

// =============================================================================
// API DE ROLES
// =============================================================================

async function fetchRoles() {
  log('fetchRoles: GET /roles...');
  try {
    const res = await api.call('/roles');
    if (res?.success) {
      rolesState.roles    = res.data     || [];
      rolesState.sections = res.sections || SYSTEM_SECTIONS;
      log('fetchRoles OK →', rolesState.roles.map(r => r.name));
      return true;
    }
    warn('fetchRoles: sin success:', res?.message);
    rolesState.sections = SYSTEM_SECTIONS;
    return false;
  } catch (e) {
    err('fetchRoles error:', e);
    rolesState.sections = SYSTEM_SECTIONS;
    return false;
  }
}

async function apiCreateRole(data)   { return await api.call('/roles',        { method: 'POST',   body: data }); }
async function apiUpdateRole(id, d)  { return await api.call(`/roles/${id}`,  { method: 'PUT',    body: d    }); }
async function apiDeleteRole(id)     { return await api.call(`/roles/${id}`,  { method: 'DELETE'             }); }

function normalizePermissions(raw = []) {
  const valid = new Set(SYSTEM_SECTIONS.map(s => s.key));
  const seen  = new Set();
  const out   = [];
  for (const p of raw) {
    if (!valid.has(p.section) || seen.has(p.section)) continue;
    seen.add(p.section);
    out.push({ section: p.section, canView: Boolean(p.canView), canAction: Boolean(p.canAction) });
  }
  for (const s of SYSTEM_SECTIONS) {
    if (!seen.has(s.key)) out.push({ section: s.key, canView: false, canAction: false });
  }
  return out;
}

// =============================================================================
// RENDER — TAB ROLES
// =============================================================================

function renderRolesTab() {
  return `
    <div class="permisos-manager" id="permisos-manager-root">
      <div class="permisos-manager__header">
        <div class="permisos-manager__title-group">
          <h2 class="permisos-manager__title">
            <span class="permisos-manager__title-icon">🎭</span>
            Roles Personalizados
          </h2>
          <p class="permisos-manager__subtitle">
            Crea roles a medida y define qué secciones pueden ver y qué acciones pueden ejecutar.
            <br>
            <small style="color:var(--warning-color);">
              <i class="fas fa-info-circle"></i>
              Las secciones <strong>Admin</strong> y <strong>Auditoría</strong>
              son exclusivas del Administrador.
            </small>
          </p>
        </div>
        <button class="permisos-btn permisos-btn--primary" id="permisos-btn-nuevo-rol">
          <i class="fas fa-plus"></i> Nuevo Rol
        </button>
      </div>

      <div class="permisos-loading" id="permisos-grid-loading">
        <div class="permisos-loading__spinner"></div>
        <span>Cargando roles...</span>
      </div>
      <div class="permisos-roles-grid" id="permisos-roles-grid" style="display:none;"></div>

      <!-- Modal crear/editar -->
      <div class="permisos-modal" id="permisos-modal-rol" role="dialog" aria-modal="true" aria-hidden="true">
        <div class="permisos-modal__backdrop" id="permisos-modal-backdrop"></div>
        <div class="permisos-modal__content">
          <div class="permisos-modal__header">
            <h3 class="permisos-modal__title" id="permisos-modal-title">Nuevo Rol</h3>
            <button class="permisos-modal__close" id="permisos-modal-close">✕</button>
          </div>
          <div class="permisos-modal__body" id="permisos-modal-body"></div>
        </div>
      </div>

      <!-- Modal eliminar -->
      <div class="permisos-modal" id="permisos-modal-delete" role="dialog" aria-modal="true" aria-hidden="true">
        <div class="permisos-modal__backdrop" id="permisos-delete-backdrop"></div>
        <div class="permisos-modal__content permisos-modal__content--sm">
          <div class="permisos-modal__header">
            <h3 class="permisos-modal__title">Eliminar Rol</h3>
            <button class="permisos-modal__close" id="permisos-delete-close">✕</button>
          </div>
          <div class="permisos-modal__body">
            <div class="permisos-delete-confirm">
              <div class="permisos-delete-confirm__icon">🗑️</div>
              <p class="permisos-delete-confirm__text" id="permisos-delete-text">¿Eliminar este rol?</p>
              <p class="permisos-delete-confirm__warning">Esta acción no se puede deshacer.</p>
            </div>
          </div>
          <div class="permisos-modal__footer">
            <button class="permisos-btn permisos-btn--ghost"  id="permisos-delete-cancel">Cancelar</button>
            <button class="permisos-btn permisos-btn--danger" id="permisos-delete-confirm-btn">Eliminar</button>
          </div>
        </div>
      </div>
    </div>`;
}

function renderRolesGrid() {
  if (rolesState.roles.length === 0) {
    return `
      <div class="permisos-empty">
        <div class="permisos-empty__icon">🎭</div>
        <h3 class="permisos-empty__title">Sin roles personalizados</h3>
        <p class="permisos-empty__text">Crea tu primer rol con el botón "Nuevo Rol".</p>
      </div>`;
  }
  return rolesState.roles.map(role => {
    const pc    = (role.permissions||[]).filter(p => p.canView||p.canAction).length;
    const total = rolesState.sections.length;
    const pct   = total > 0 ? Math.round((pc/total)*100) : 0;
    const color = escapeHtml(role.color||'#6b7280');
    const sects = (role.permissions||[]).filter(p=>p.canView).map(p=>{
      const s = rolesState.sections.find(x=>x.key===p.section);
      return s ? `<span class="permisos-tag" title="${escapeHtml(s.label)}">${s.icon}</span>` : '';
    }).join('');
    return `
      <div class="permisos-role-card" data-role-id="${role._id}">
        <div class="permisos-role-card__stripe" style="background:${color};"></div>
        <div class="permisos-role-card__header">
          <div class="permisos-role-card__color-dot" style="background:${color};"></div>
          <div class="permisos-role-card__info">
            <h4 class="permisos-role-card__name">${escapeHtml(role.name)}</h4>
            <p class="permisos-role-card__desc">${role.description ? escapeHtml(role.description) : '<em style="opacity:.5;font-style:italic;">Sin descripción</em>'}</p>
          </div>
          ${!role.isSystem ? `
            <div class="permisos-role-card__actions">
              <button class="permisos-card__action permisos-card__action--edit"
                data-role-id="${role._id}" title="Editar"><i class="fas fa-edit"></i></button>
              <button class="permisos-card__action permisos-card__action--delete"
                data-role-id="${role._id}" data-role-name="${escapeHtml(role.name)}" title="Eliminar"><i class="fas fa-trash-alt"></i></button>
            </div>` : ''}
        </div>
        <div class="permisos-role-card__stats">
          <div class="permisos-role-card__stat">
            <span class="permisos-role-card__stat-label">Usuarios</span>
            <span class="permisos-role-card__stat-value">${role.userCount||0}</span>
          </div>
          <div class="permisos-role-card__stat">
            <span class="permisos-role-card__stat-label">Secciones</span>
            <span class="permisos-role-card__stat-value">${pc}/${total}</span>
          </div>
          <div class="permisos-role-card__stat">
            <span class="permisos-role-card__stat-label">Cobertura</span>
            <span class="permisos-role-card__stat-value">${pct}%</span>
          </div>
        </div>
        <div class="permisos-role-card__progress-bar">
          <div class="permisos-role-card__progress-fill" style="width:${pct}%;background:${color};"></div>
        </div>
        <div class="permisos-role-card__sections">
          ${sects || '<span class="permisos-role-card__no-sections">Sin secciones visibles</span>'}
        </div>
      </div>`;
  }).join('');
}

function renderRoleForm(role) {
  const isEdit = Boolean(role);
  const name   = isEdit ? escapeHtml(role.name)           : '';
  const desc   = isEdit ? escapeHtml(role.description||'') : '';
  const color  = isEdit ? (role.color||'#6b7280')          : '#6b7280';
  const pm = {};
  if (isEdit) (role.permissions||[]).forEach(p => { pm[p.section] = p; });

  const swatches = PRESET_COLORS.map(c => `
    <button type="button" class="permisos-color-swatch ${c===color?'permisos-color-swatch--active':''}"
      data-color="${c}" style="background:${c};" title="${c}"></button>`).join('');

  const rows = rolesState.sections.map(sec => {
    const p = pm[sec.key] || { canView: false, canAction: false };
    return `
      <tr class="permisos-perm-row">
        <td class="permisos-perm-row__section">
          <span class="permisos-perm-row__icon">${sec.icon}</span>
          <span class="permisos-perm-row__label">${escapeHtml(sec.label)}</span>
        </td>
        <td class="permisos-perm-row__toggle">
          <label class="permisos-toggle" title="Puede ver esta sección en el menú">
            <input type="checkbox" class="permisos-toggle__input"
              data-perm="canView" data-section="${sec.key}" ${p.canView?'checked':''}>
            <span class="permisos-toggle__slider"></span>
          </label>
        </td>
        <td class="permisos-perm-row__toggle">
          <label class="permisos-toggle" title="Puede crear, editar y eliminar">
            <input type="checkbox" class="permisos-toggle__input"
              data-perm="canAction" data-section="${sec.key}" ${p.canAction?'checked':''}>
            <span class="permisos-toggle__slider"></span>
          </label>
        </td>
      </tr>`;
  }).join('');

  return `
    <form class="permisos-form" id="permisos-role-form" novalidate>
      <div class="permisos-form__group">
        <label class="permisos-form__label" for="permisos-role-name">
          Nombre del Rol <span class="permisos-form__required">*</span>
        </label>
        <input type="text" id="permisos-role-name" class="permisos-form__input"
          placeholder="Ej. Contador, Diseñador, Capturista..."
          value="${name}" maxlength="50" required autocomplete="off">
        <span class="permisos-form__error" id="permisos-name-error"></span>
      </div>
      <div class="permisos-form__group">
        <label class="permisos-form__label" for="permisos-role-desc">Descripción</label>
        <input type="text" id="permisos-role-desc" class="permisos-form__input"
          placeholder="Breve descripción (opcional)" value="${desc}" maxlength="200">
      </div>
      <div class="permisos-form__group">
        <label class="permisos-form__label">Color identificador</label>
        <div class="permisos-color-picker">
          <div class="permisos-color-swatches">${swatches}</div>
          <div class="permisos-color-custom">
            <input type="color" id="permisos-role-color" class="permisos-color-input" value="${color}">
            <span class="permisos-color-label" id="permisos-color-label">${color}</span>
          </div>
        </div>
      </div>
      <div class="permisos-form__group">
        <div class="permisos-form__label-row">
          <label class="permisos-form__label">Permisos por Sección</label>
          <div class="permisos-form__quick-actions">
            <button type="button" class="permisos-btn permisos-btn--xs permisos-btn--ghost" id="permisos-sel-view">👁 Ver todo</button>
            <button type="button" class="permisos-btn permisos-btn--xs permisos-btn--ghost" id="permisos-sel-action">⚡ Todo</button>
            <button type="button" class="permisos-btn permisos-btn--xs permisos-btn--ghost" id="permisos-clear">✕ Limpiar</button>
          </div>
        </div>
        <div class="permisos-table-wrapper">
          <table class="permisos-table">
            <thead>
              <tr>
                <th class="permisos-table__th permisos-table__th--section">Sección</th>
                <th class="permisos-table__th" title="Visible en menú lateral">👁 Ver</th>
                <th class="permisos-table__th" title="Crear, editar, eliminar">⚡ Acciones</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <p class="permisos-form__hint">
          💡 <strong>Ver</strong>: aparece en el menú lateral.
          <strong>Acciones</strong>: botones de crear/editar/eliminar funcionales.
        </p>
      </div>
      <div class="permisos-form__footer">
        <button type="button" class="permisos-btn permisos-btn--ghost" id="permisos-form-cancel">Cancelar</button>
        <button type="submit" class="permisos-btn permisos-btn--primary" id="permisos-form-submit">
          ${isEdit ? '<i class="fas fa-save"></i> Guardar Cambios' : '<i class="fas fa-plus"></i> Crear Rol'}
        </button>
      </div>
    </form>`;
}

// =============================================================================
// EVENTOS DEL TAB DE ROLES
// =============================================================================

function attachRolesEvents() {
  if (rolesEventsAttached) { log('attachRolesEvents: ya adjuntados'); return; }
  rolesEventsAttached = true;
  log('attachRolesEvents: adjuntando...');

  document.getElementById('permisos-btn-nuevo-rol')?.addEventListener('click', () => openRoleModal(null));
  document.getElementById('permisos-modal-close')?.addEventListener('click', closeRoleModal);
  document.getElementById('permisos-modal-backdrop')?.addEventListener('click', closeRoleModal);
  document.getElementById('permisos-delete-close')?.addEventListener('click', closeDeleteModal);
  document.getElementById('permisos-delete-backdrop')?.addEventListener('click', closeDeleteModal);
  document.getElementById('permisos-delete-cancel')?.addEventListener('click', closeDeleteModal);

  // Grid: delegar
  document.getElementById('permisos-roles-grid')?.addEventListener('click', e => {
    const eb = e.target.closest('.permisos-card__action--edit');
    const db = e.target.closest('.permisos-card__action--delete');
    if (eb) {
      const role = rolesState.roles.find(r => r._id === eb.dataset.roleId);
      if (role) openRoleModal(role); else warn('Rol no encontrado:', eb.dataset.roleId);
    }
    if (db) openDeleteModal(db.dataset.roleId, db.dataset.roleName);
  });

  // Modal de rol: clicks delegados
  document.getElementById('permisos-modal-rol')?.addEventListener('click', async e => {
    const sw = e.target.closest('.permisos-color-swatch');
    if (sw) { selectColor(sw.dataset.color); return; }
    if (e.target.id === 'permisos-sel-view')    { document.querySelectorAll('#permisos-modal-rol input[data-perm="canView"]').forEach(cb=>cb.checked=true);  return; }
    if (e.target.id === 'permisos-sel-action')  { document.querySelectorAll('#permisos-modal-rol input[data-perm]').forEach(cb=>cb.checked=true);             return; }
    if (e.target.id === 'permisos-clear')        { document.querySelectorAll('#permisos-modal-rol input[data-perm]').forEach(cb=>cb.checked=false);            return; }
    if (e.target.id === 'permisos-form-cancel')  { closeRoleModal(); return; }
    if (e.target.closest('#permisos-form-submit')) { e.preventDefault(); await submitRoleForm(); }
  });

  // Modal de rol: inputs
  document.getElementById('permisos-modal-rol')?.addEventListener('input', e => {
    if (e.target.id === 'permisos-role-color') { selectColor(e.target.value); return; }
    if (e.target.classList.contains('permisos-toggle__input')) {
      const perm = e.target.dataset.perm, sec = e.target.dataset.section;
      if (perm === 'canAction' && e.target.checked) {
        const v = document.querySelector(`#permisos-modal-rol input[data-perm="canView"][data-section="${sec}"]`);
        if (v && !v.checked) { v.checked = true; log('autoactivado canView para', sec); }
      }
      if (perm === 'canView' && !e.target.checked) {
        const a = document.querySelector(`#permisos-modal-rol input[data-perm="canAction"][data-section="${sec}"]`);
        if (a && a.checked) { a.checked = false; log('autodesactivado canAction para', sec); }
      }
    }
  });

  log('attachRolesEvents: completado ✅');
}

// ─── Abrir / cerrar modales ────────────────────────────────────────────────────

function openRoleModal(role) {
  rolesState.editing = role;
  const modal   = document.getElementById('permisos-modal-rol');
  const titleEl = document.getElementById('permisos-modal-title');
  const bodyEl  = document.getElementById('permisos-modal-body');
  if (!modal) { err('openRoleModal: #permisos-modal-rol no encontrado'); return; }
  titleEl.textContent = role ? `Editar: ${role.name}` : 'Nuevo Rol';
  bodyEl.innerHTML    = renderRoleForm(role);
  modal.classList.add('permisos-modal--open');
  modal.setAttribute('aria-hidden', 'false');
  setTimeout(() => document.getElementById('permisos-role-name')?.focus(), 100);
  log('openRoleModal:', role ? `"${role.name}"` : 'nuevo');
}

function closeRoleModal() {
  const m = document.getElementById('permisos-modal-rol');
  if (m) { m.classList.remove('permisos-modal--open'); m.setAttribute('aria-hidden','true'); }
  rolesState.editing = null;
}

function openDeleteModal(roleId, roleName) {
  const m    = document.getElementById('permisos-modal-delete');
  const txt  = document.getElementById('permisos-delete-text');
  const btn  = document.getElementById('permisos-delete-confirm-btn');
  if (!m) { err('openDeleteModal: no encontrado'); return; }
  txt.textContent = `¿Eliminar el rol "${roleName}"?`;
  m.classList.add('permisos-modal--open');
  m.setAttribute('aria-hidden','false');
  // Clonar para eliminar listeners anteriores
  const nb = btn.cloneNode(true);
  btn.parentNode.replaceChild(nb, btn);
  nb.addEventListener('click', () => deleteRole(roleId, roleName));
}

function closeDeleteModal() {
  const m = document.getElementById('permisos-modal-delete');
  if (m) { m.classList.remove('permisos-modal--open'); m.setAttribute('aria-hidden','true'); }
}

// ─── Submit formulario de rol ──────────────────────────────────────────────────

function collectFormData() {
  const name = document.getElementById('permisos-role-name')?.value.trim() || '';
  const desc = document.getElementById('permisos-role-desc')?.value.trim() || '';
  const color = document.getElementById('permisos-role-color')?.value || '#6b7280';
  const keys  = [...new Set(
    [...document.querySelectorAll('#permisos-modal-rol input[data-section]')]
      .map(el => el.dataset.section)
  )];
  const permissions = keys.map(section => ({
    section,
    canView:   document.querySelector(`#permisos-modal-rol input[data-perm="canView"][data-section="${section}"]`)?.checked   || false,
    canAction: document.querySelector(`#permisos-modal-rol input[data-perm="canAction"][data-section="${section}"]`)?.checked || false,
  }));
  return { name, description: desc, color, permissions };
}

async function submitRoleForm() {
  log('submitRoleForm: iniciando...');
  const data = collectFormData();
  log('submitRoleForm: data=', data);

  // Limpiar errores
  document.querySelectorAll('#permisos-modal-rol .permisos-form__error').forEach(el => el.textContent = '');
  document.querySelectorAll('#permisos-modal-rol .permisos-form__input--error').forEach(el => el.classList.remove('permisos-form__input--error'));

  if (!data.name || data.name.length < 2) {
    document.getElementById('permisos-name-error').textContent = 'El nombre debe tener al menos 2 caracteres';
    document.getElementById('permisos-role-name')?.classList.add('permisos-form__input--error');
    return;
  }
  if (['administrador','desactivado'].includes(data.name.toLowerCase())) {
    document.getElementById('permisos-name-error').textContent = `El nombre "${data.name}" está reservado`;
    return;
  }

  const sbtn = document.getElementById('permisos-form-submit');
  if (sbtn) { sbtn.disabled = true; sbtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...'; }

  try {
    const payload = { ...data, permissions: normalizePermissions(data.permissions) };
    const res = rolesState.editing
      ? await apiUpdateRole(rolesState.editing._id, payload)
      : await apiCreateRole(payload);

    log('submitRoleForm: respuesta=', res);

    if (res?.success) {
      closeRoleModal();
      await fetchRoles();         // Recargar lista completa de roles
      refreshRolesGrid();         // Actualizar tarjetas del tab Roles
      refreshRoleDescriptions();  // FIX #3: Actualizar panel tab Usuarios
      rolesToast(res.message || 'Rol guardado correctamente', 'success');
      log('submitRoleForm: éxito ✅');
    } else {
      warn('submitRoleForm: error API:', res?.message);
      rolesToast(res?.message || 'Error al guardar el rol', 'error');
      if (sbtn) { sbtn.disabled=false; sbtn.innerHTML = rolesState.editing ? '<i class="fas fa-save"></i> Guardar Cambios' : '<i class="fas fa-plus"></i> Crear Rol'; }
    }
  } catch (e) {
    err('submitRoleForm error:', e);
    rolesToast('Error de conexión', 'error');
    if (sbtn) { sbtn.disabled=false; sbtn.innerHTML = rolesState.editing ? '<i class="fas fa-save"></i> Guardar Cambios' : '<i class="fas fa-plus"></i> Crear Rol'; }
  }
}

async function deleteRole(roleId, roleName) {
  log('deleteRole:', roleName);
  const cb = document.getElementById('permisos-delete-confirm-btn');
  if (cb) { cb.disabled=true; cb.innerHTML='<i class="fas fa-spinner fa-spin"></i> Eliminando...'; }
  try {
    const res = await apiDeleteRole(roleId);
    closeDeleteModal();
    if (res?.success) {
      await fetchRoles();
      refreshRolesGrid();
      refreshRoleDescriptions();
      rolesToast(res.message || 'Rol eliminado', 'success');
      log('deleteRole: éxito ✅');
    } else {
      rolesToast(res?.message || 'Error al eliminar', 'error');
    }
  } catch (e) {
    err('deleteRole error:', e);
    rolesToast('Error de conexión', 'error');
    closeDeleteModal();
  }
}

// ─── Helpers UI roles ──────────────────────────────────────────────────────────

function selectColor(color) {
  const ci = document.getElementById('permisos-role-color');
  const cl = document.getElementById('permisos-color-label');
  if (ci) ci.value = color;
  if (cl) cl.textContent = color;
  document.querySelectorAll('#permisos-modal-rol .permisos-color-swatch').forEach(sw => {
    sw.classList.toggle('permisos-color-swatch--active', sw.dataset.color === color);
  });
}

function setGridLoading(show) {
  const ld = document.getElementById('permisos-grid-loading');
  const gr = document.getElementById('permisos-roles-grid');
  if (ld) ld.style.display = show ? 'flex' : 'none';
  if (gr) gr.style.display = show ? 'none'  : 'grid';
}

function refreshRolesGrid() {
  const gr = document.getElementById('permisos-roles-grid');
  if (gr) gr.innerHTML = renderRolesGrid();
  setGridLoading(false);
  log('refreshRolesGrid: actualizado,', rolesState.roles.length, 'roles');
}

/**
 * Actualiza en tiempo real el panel "Roles del Sistema" del tab Usuarios.
 * Se llama después de crear, editar o eliminar un rol —
 * sin necesidad de recargar toda la página.
 */
function refreshRoleDescriptions() {
  log('refreshRoleDescriptions: actualizando panel Roles del Sistema...');
  const target = document.querySelector('.admin-card--stats .admin-card-body');
  if (target) {
    target.innerHTML = renderRoleDescriptions();
    log('refreshRoleDescriptions: actualizado ✅');
  } else {
    warn('refreshRoleDescriptions: .admin-card--stats .admin-card-body no encontrado');
  }
}

function rolesToast(msg, type = 'info') {
  document.querySelector('.permisos-toast')?.remove();
  const icons = { success:'✅', error:'❌', info:'ℹ️', warning:'⚠️' };
  const t = document.createElement('div');
  t.className = `permisos-toast permisos-toast--${type}`;
  t.innerHTML = `<span class="permisos-toast__icon">${icons[type]||'ℹ️'}</span><span class="permisos-toast__message">${escapeHtml(msg)}</span>`;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('permisos-toast--visible'));
  setTimeout(() => { t.classList.remove('permisos-toast--visible'); setTimeout(() => t.remove(), 300); }, 3500);
}

// =============================================================================
// RENDERIZADO PRINCIPAL
// =============================================================================

export async function renderAgregarAdministrador() {
  log('renderAgregarAdministrador: iniciando...');
  const container = document.getElementById('admin-content');
  if (!container) { err('#admin-content no encontrado'); return; }

  if (!hasPermission(PERMISSIONS.MANAGE_USERS)) {
    container.innerHTML = `
      <div class="admin-access-denied">
        <div class="access-denied-content">
          <i class="fas fa-lock fa-3x"></i>
          <h3>Acceso Restringido</h3>
          <p>No tienes permisos para gestionar usuarios.</p>
        </div>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="admin-loading">
      <div class="loading-spinner"><i class="fas fa-spinner fa-spin fa-2x"></i></div>
      <p>Cargando...</p>
    </div>`;

  try {
    // Cargar usuarios Y roles en paralelo
    const [{ users, stats }] = await Promise.all([
      loadUsers(),
      fetchRoles(),  // Carga rolesState.roles ANTES de cualquier render
    ]);

    log('Carga completa → usuarios:', users.length,
        '| roles dinámicos:', rolesState.roles.length,
        '→', rolesState.roles.map(r => r.name));

    const currentUserId = getCurrentUserId();
    let editingId = null;
    rolesEventsAttached = false;  // Reset: se adjuntan al activar el tab

    container.innerHTML = `
      <div class="admin-dashboard">

        <!-- Encabezado -->
        <div class="admin-header">
          <div>
            <h1 class="admin-title"><i class="fas fa-users-cog"></i> Administración</h1>
            <p class="admin-subtitle">Gestiona usuarios, roles y permisos del sistema</p>
          </div>
          <div class="admin-header-right">
            <div class="admin-search" id="admin-search-wrapper">
              <i class="fas fa-search"></i>
              <input type="text" id="adminSearchInput" placeholder="Buscar usuarios...">
            </div>
            <button class="btn btn--primary btn--sm" id="refreshUsersBtn" title="Actualizar">
              <i class="fas fa-sync-alt"></i>
            </button>
          </div>
        </div>

        <!-- Tabs -->
        <div class="admin-tabs" id="admin-tabs">
          <button class="admin-tab admin-tab--active" data-admin-tab="usuarios">
            <i class="fas fa-users"></i> Usuarios
          </button>
          <button class="admin-tab" data-admin-tab="roles">
            <i class="fas fa-theater-masks"></i> Roles y Permisos
          </button>
        </div>

        <!-- ══ TAB: USUARIOS ══ -->
        <div class="admin-tab-content admin-tab-content--active" id="admin-tab-usuarios">

          <div class="admin-stats-grid">
            <div class="stat-card stat-card--total">
              <div class="stat-card__icon"><i class="fas fa-users"></i></div>
              <div class="stat-card__content"><span class="stat-card__label">Total</span><span class="stat-card__value">${stats.total}</span></div>
            </div>
            <div class="stat-card stat-card--active">
              <div class="stat-card__icon"><i class="fas fa-check-circle"></i></div>
              <div class="stat-card__content"><span class="stat-card__label">Activos</span><span class="stat-card__value">${stats.active}</span></div>
            </div>
            <div class="stat-card stat-card--inactive">
              <div class="stat-card__icon"><i class="fas fa-user-slash"></i></div>
              <div class="stat-card__content"><span class="stat-card__label">Inactivos</span><span class="stat-card__value">${stats.inactive}</span></div>
            </div>
            <div class="stat-card stat-card--admin">
              <div class="stat-card__icon"><i class="fas fa-crown"></i></div>
              <div class="stat-card__content"><span class="stat-card__label">Admins</span><span class="stat-card__value">${stats.admins}</span></div>
            </div>
          </div>

          <div class="admin-grid">

            <!-- Crear usuario -->
            <div class="admin-card admin-card--create">
              <div class="admin-card-header">
                <h2 class="admin-card-title"><i class="fas fa-user-plus"></i> Crear Usuario</h2>
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
                        <button type="button" class="password-toggle" onclick="togglePasswordVisibility('admin_password')"><i class="fas fa-eye"></i></button>
                      </div>
                    </div>
                    <div class="form-group">
                      <label class="form-label"><i class="fas fa-tag"></i> Rol</label>
                      <div class="select-wrapper">
                        <select id="admin_rol" class="form-select" required>
                          ${buildRoleOptions('', stats.admins)}
                        </select>
                        <i class="fas fa-chevron-down select-arrow"></i>
                      </div>
                    </div>
                  </div>
                  <div class="form-actions">
                    <button type="submit" class="btn btn--primary btn--sm"><i class="fas fa-user-plus"></i> Crear Usuario</button>
                    <button type="button" class="btn btn--outline btn--sm" id="adminResetFormBtn" title="Limpiar"><i class="fas fa-undo"></i></button>
                  </div>
                </form>
                <div class="role-stats-container">${renderRoleStats(users)}</div>
              </div>
            </div>

            <!-- FIX #3: Panel dinámico de roles -->
            <div class="admin-card admin-card--stats">
              <div class="admin-card-header">
                <h2 class="admin-card-title"><i class="fas fa-info-circle"></i> Roles del Sistema</h2>
              </div>
              <div class="admin-card-body">
                ${renderRoleDescriptions()}
              </div>
            </div>
          </div>

          <!-- Tabla de usuarios -->
          <div class="admin-card admin-card--users">
            <div class="admin-card-header">
              <h2 class="admin-card-title"><i class="fas fa-list"></i> Usuarios Registrados</h2>
              <span class="users-count">${users.length}</span>
            </div>
            <div class="admin-card-body">
              <div class="table-responsive">
                <table class="admin-table" id="adminUsersTable">
                  <thead>
                    <tr><th>Usuario</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Último acceso</th><th>Acciones</th></tr>
                  </thead>
                  <tbody id="adminUsersList">
                    ${users.length > 0
                      ? users.map(u => renderUserRow(u, editingId, currentUserId, stats.admins)).join('')
                      : `<tr><td colspan="6" class="empty-state">
                          <div class="empty-state__icon"><i class="fas fa-users"></i></div>
                          <h3 class="empty-state__title">No hay usuarios</h3>
                          <p class="empty-state__description">Crea el primer usuario</p>
                        </td></tr>`
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div><!-- /tab-usuarios -->

        <!-- ══ TAB: ROLES ══ -->
        <div class="admin-tab-content" id="admin-tab-roles">
          ${renderRolesTab()}
        </div>

      </div>`;

    // ══════════════════════════════════════════════════════
    // EVENT LISTENERS — TABS
    // ══════════════════════════════════════════════════════
    document.querySelectorAll('.admin-tab[data-admin-tab]').forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.adminTab;
        log('Tab:', target);
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('admin-tab--active'));
        tab.classList.add('admin-tab--active');
        document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('admin-tab-content--active'));
        document.getElementById(`admin-tab-${target}`)?.classList.add('admin-tab-content--active');
        const sw = document.getElementById('admin-search-wrapper');
        if (sw) sw.style.display = target === 'usuarios' ? '' : 'none';
        if (target === 'roles') { attachRolesEvents(); refreshRolesGrid(); }
      });
    });

    // ══════════════════════════════════════════════════════
    // EVENT LISTENERS — USUARIOS
    // ══════════════════════════════════════════════════════
    const listEl  = document.getElementById('adminUsersList');
    const searchEl = document.getElementById('adminSearchInput');
    const refBtn   = document.getElementById('refreshUsersBtn');
    const form     = document.getElementById('adminCreateUserForm');
    const resetBtn = document.getElementById('adminResetFormBtn');

    searchEl?.addEventListener('input', e => {
      const t = e.target.value.toLowerCase().trim();
      if (!t) { listEl.innerHTML = users.map(u => renderUserRow(u, editingId, currentUserId, stats.admins)).join(''); return; }
      const f = users.filter(u =>
        u.usuario.toLowerCase().includes(t) ||
        u.correo.toLowerCase().includes(t)  ||
        getRolLabel(u.rol).toLowerCase().includes(t)
      );
      listEl.innerHTML = f.length > 0
        ? f.map(u => renderUserRow(u, editingId, currentUserId, stats.admins)).join('')
        : `<tr><td colspan="6" class="empty-state"><div class="empty-state__icon"><i class="fas fa-search"></i></div><h3 class="empty-state__title">Sin resultados</h3></td></tr>`;
    });

    refBtn?.addEventListener('click', () => { rolesEventsAttached = false; renderAgregarAdministrador(); });
    resetBtn?.addEventListener('click', () => form?.reset());

    listEl?.addEventListener('click', async e => {
      const btn    = e.target.closest('button[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const id     = btn.dataset.id;
      const name   = btn.dataset.name;

      switch (action) {
        case 'edit':
          editingId = String(id);
          log('edit: id=', id, '| roles en rolesState:', rolesState.roles.map(r=>r.name));
          listEl.innerHTML = users.map(u => renderUserRow(u, editingId, currentUserId, stats.admins)).join('');
          break;
        case 'cancel':
          editingId = null;
          listEl.innerHTML = users.map(u => renderUserRow(u, editingId, currentUserId, stats.admins)).join('');
          break;
        case 'save': {
          const row     = btn.closest('tr');
          if (!row) return;
          const usuario = row.querySelector('[data-field="usuario"]')?.value?.trim();
          const correo  = row.querySelector('[data-field="correo"]')?.value?.trim();
          const rol     = row.querySelector('[data-field="rol"]')?.value;
          const activo  = row.querySelector('[data-field="activo"]')?.checked ?? true;
          log('save: usuario=', usuario, '| rol=', rol);
          if (!usuario || !correo || !rol) { showAlert('Todos los campos son requeridos', 'error'); return; }
          const ok = await updateUser(id, { usuario, correo, rol, activo });
          if (ok) { rolesEventsAttached = false; await renderAgregarAdministrador(); }
          break;
        }
        case 'deactivate': {
          const ok = await deactivateUser(id, name);
          if (ok) { rolesEventsAttached = false; await renderAgregarAdministrador(); }
          break;
        }
        case 'reactivate': {
          const ok = await reactivateUser(id, name);
          if (ok) { rolesEventsAttached = false; await renderAgregarAdministrador(); }
          break;
        }
        case 'delete': {
          const ok = await deleteUserPermanently(id, name);
          if (ok) { rolesEventsAttached = false; await renderAgregarAdministrador(); }
          break;
        }
      }
    });

    form?.addEventListener('submit', async e => {
      e.preventDefault();
      const usuario  = document.getElementById('admin_usuario')?.value?.trim();
      const correo   = document.getElementById('admin_correo')?.value?.trim();
      const password = document.getElementById('admin_password')?.value;
      const rol      = document.getElementById('admin_rol')?.value;
      log('createUser: rol=', rol);
      if (!usuario || !correo || !password || !rol) { showAlert('Todos los campos son requeridos', 'error'); return; }
      if (rol === ADMIN_ROLE && stats.admins > 0) { showAlert('Ya existe un administrador en el sistema', 'error'); return; }
      const ok = await createUser({ usuario, correo, password, rol });
      if (ok) { form.reset(); rolesEventsAttached = false; await renderAgregarAdministrador(); }
    });

    window.togglePasswordVisibility = inputId => {
      const input  = document.getElementById(inputId);
      const button = input?.nextElementSibling;
      if (input && button) {
        const type = input.type === 'password' ? 'text' : 'password';
        input.type = type;
        button.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
      }
    };

    log('renderAgregarAdministrador: completado ✅');

  } catch (error) {
    err('renderAgregarAdministrador error:', error);
    container.innerHTML = `
      <div class="admin-error">
        <i class="fas fa-exclamation-triangle fa-2x"></i>
        <p>Error al cargar: ${escapeHtml(error.message)}</p>
        <button class="btn btn--primary btn--sm" onclick="renderAgregarAdministrador()">Reintentar</button>
      </div>`;
  }
}

async function loadUsers() {
  try {
    const res  = await api.call('/admin/users');
    const users = res?.users || [];
    const stats = {
      total:    users.length,
      active:   users.filter(u => u.activo !== false && u.rol !== DISABLED_ROLE).length,
      inactive: users.filter(u => u.activo === false  || u.rol === DISABLED_ROLE).length,
      admins:   users.filter(u => u.rol === ADMIN_ROLE).length,
    };
    return { users, stats };
  } catch (e) {
    err('loadUsers error:', e);
    return { users: [], stats: { total:0, active:0, inactive:0, admins:0 } };
  }
}

window.renderAgregarAdministrador = renderAgregarAdministrador;
