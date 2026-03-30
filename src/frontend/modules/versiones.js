// src/frontend/modules/versiones.js
// Módulo de SOLO LECTURA para que administradores y roles del sistema
// puedan ver el historial de versiones publicadas por el super administrador.

// ─── Config ──────────────────────────────────────────────────────────────────
const API_BASE = '/api/versions';

// ─── Estado local ────────────────────────────────────────────────────────────
let _versions      = [];
let _versionActual = null;
let _filtro        = 'all';
let _busqueda      = '';

// =============================================================================
// RENDER PRINCIPAL
// =============================================================================

export async function renderVersiones() {
  const container = document.getElementById('versiones');
  if (!container) return;

  container.innerHTML = buildShell();

  await loadVersions();

  setupEvents();
}

function buildShell() {
  return `
    <div class="ver-root">
      <div class="ver-header">
        <div>
          <h2 class="ver-title">
            <i class="fas fa-code-branch"></i> Panel de Versiones
          </h2>
          <p class="ver-subtitle">Historial de actualizaciones y cambios del sistema</p>
        </div>
        <div class="ver-current-badge" id="verCurrentBadge" style="display:none;">
          <i class="fas fa-circle"></i>
          Versión actual: <strong id="verCurrentNum">—</strong>
        </div>
      </div>

      <div class="ver-toolbar">
        <div class="ver-search-wrap">
          <i class="fas fa-search ver-search-icon"></i>
          <input type="text" class="ver-search" id="verSearch" placeholder="Buscar versión o cambio..." />
        </div>
        <div class="ver-filters" id="verFilters">
          <button class="ver-filter-btn active" data-filter="all">Todas</button>
          <button class="ver-filter-btn" data-filter="estable">Estables</button>
          <button class="ver-filter-btn" data-filter="beta">Beta</button>
          <button class="ver-filter-btn" data-filter="desarrollo">Desarrollo</button>
          <button class="ver-filter-btn" data-filter="deprecada">Deprecadas</button>
        </div>
        <button class="ver-refresh-btn" id="verRefreshBtn" title="Actualizar">
          <i class="fas fa-sync-alt"></i>
        </button>
      </div>

      <div id="verList"></div>
    </div>`;
}

// =============================================================================
// CARGA DE DATOS
// =============================================================================

async function loadVersions() {
  renderLoading();
  try {
    const resp = await fetch(API_BASE, { 
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    if (!data.success) throw new Error(data.message);

    _versions      = data.versions || [];
    _versionActual = _versions.find(v => v.esActual) || _versions[0] || null;

    updateCurrentBadge();
    renderList();
  } catch (err) {
    renderError(err.message);
  }
}

function updateCurrentBadge() {
  const badge  = document.getElementById('verCurrentBadge');
  const numEl  = document.getElementById('verCurrentNum');
  if (!badge || !numEl) return;

  if (_versionActual) {
    numEl.textContent   = `v${_versionActual.numero} — ${_versionActual.titulo}`;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

// =============================================================================
// FILTRADO Y BÚSQUEDA
// =============================================================================

function getFilteredVersions() {
  return _versions.filter(v => {
    const matchFiltro  = _filtro === 'all' || v.estado === _filtro;
    const termino      = _busqueda.toLowerCase();
    const matchBusqueda = !termino ||
      v.numero.toLowerCase().includes(termino)   ||
      v.titulo.toLowerCase().includes(termino)   ||
      (v.descripcion || '').toLowerCase().includes(termino) ||
      (v.cambios || []).some(c => c.descripcion.toLowerCase().includes(termino));
    return matchFiltro && matchBusqueda;
  });
}

// =============================================================================
// RENDER DE LISTA
// =============================================================================

function renderList() {
  const list = document.getElementById('verList');
  if (!list) return;

  const items = getFilteredVersions();

  if (!items.length) {
    list.innerHTML = `
      <div class="ver-empty">
        <i class="fas fa-box-open"></i>
        <h3>${_versions.length ? 'Sin resultados' : 'Sin versiones publicadas'}</h3>
        <p>${_versions.length
          ? 'Prueba con otro filtro o término de búsqueda.'
          : 'El super administrador aún no ha publicado versiones.'}</p>
      </div>`;
    return;
  }

  list.innerHTML = `<div class="ver-list">${items.map(buildVersionCard).join('')}</div>`;
}

function buildVersionCard(v) {
  const isActual = v.esActual;

  const cambiosPorTipo = agruparCambios(v.cambios || []);
  const resumen = buildResumenCambios(cambiosPorTipo, v.cambios?.length || 0);
  const detalles = buildDetalleCambios(v.cambios || []);
  
  // ✅ Convertir saltos de línea a <br> para mostrar en HTML
  const descripcionFormateada = v.descripcion ? v.descripcion.replace(/\n/g, '<br>') : '';

  return `
    <article class="ver-card ${isActual ? 'ver-card--actual' : ''}" data-id="${v._id}">
      <div class="ver-card-stripe" style="background:${colorEstado(v.estado)}"></div>
      <div class="ver-card-main">
        <div class="ver-card-top">
          <div class="ver-card-identity">
            <span class="ver-card-version">v${v.numero}</span>
            <span class="ver-card-titulo">${escapeHtml(v.titulo)}</span>
            ${buildEstadoBadge(v.estado)}
            ${isActual ? '<span class="ver-badge-actual"><i class="fas fa-circle"></i> Actual</span>' : ''}
          </div>
          <div class="ver-card-meta">
            <span class="ver-card-date"><i class="fas fa-calendar-alt"></i> ${formatDate(v.fechaLanzamiento)}</span>
            <span class="ver-card-count">${(v.cambios || []).length} cambio(s)</span>
          </div>
        </div>

        ${descripcionFormateada ? `
          <div class="ver-card-desc">
            ${descripcionFormateada}
          </div>
        ` : ''}

        ${resumen}

        ${detalles ? `
          <details class="ver-card-details">
            <summary class="ver-card-summary">
              <i class="fas fa-chevron-right ver-chevron"></i>
              Ver todos los cambios
            </summary>
            <div class="ver-card-changes">${detalles}</div>
          </details>` : ''}
      </div>
    </article>`;
}

function agruparCambios(cambios) {
  return cambios.reduce((acc, c) => {
    acc[c.tipo] = (acc[c.tipo] || 0) + 1;
    return acc;
  }, {});
}

function buildResumenCambios(agrupados, total) {
  if (!total) return '';

  const iconos = {
    nuevo:        { icon: 'fa-star',           color: '#00c8ff', label: 'Nuevos' },
    mejora:       { icon: 'fa-arrow-up',       color: '#00d68f', label: 'Mejoras' },
    correccion:   { icon: 'fa-bug',            color: '#ffb830', label: 'Correcciones' },
    eliminado:    { icon: 'fa-trash',          color: '#ff4d6d', label: 'Eliminados' },
    seguridad:    { icon: 'fa-shield-halved',  color: '#a855f7', label: 'Seguridad' },
    rendimiento:  { icon: 'fa-bolt',           color: '#00c8ff', label: 'Rendimiento' },
  };

  const pills = Object.entries(agrupados).map(([tipo, count]) => {
    const meta = iconos[tipo] || { icon: 'fa-circle', color: '#9898b0', label: tipo };
    return `<span class="ver-change-pill" style="--pill-color:${meta.color}">
      <i class="fas ${meta.icon}"></i> ${count} ${meta.label}
    </span>`;
  }).join('');

  return `<div class="ver-change-pills">${pills}</div>`;
}

function buildDetalleCambios(cambios) {
  if (!cambios.length) return '';

  const tagMap = {
    nuevo:        { css: 'vtag-nuevo',       label: 'Nuevo',       icon: 'fa-star' },
    mejora:       { css: 'vtag-mejora',      label: 'Mejora',      icon: 'fa-arrow-up' },
    correccion:   { css: 'vtag-correccion',  label: 'Corrección',  icon: 'fa-bug' },
    eliminado:    { css: 'vtag-eliminado',   label: 'Eliminado',   icon: 'fa-trash' },
    seguridad:    { css: 'vtag-seguridad',   label: 'Seguridad',   icon: 'fa-shield-halved' },
    rendimiento:  { css: 'vtag-rendimiento', label: 'Rendimiento', icon: 'fa-bolt' },
  };

  return cambios.map(c => {
    const t = tagMap[c.tipo] || { css: '', label: c.tipo, icon: 'fa-circle' };
    return `
      <div class="ver-change-row">
        <span class="ver-change-tag ${t.css}">
          <i class="fas ${t.icon}"></i> ${t.label}
        </span>
        <span class="ver-change-text">${escapeHtml(c.descripcion)}</span>
      </div>`;
  }).join('');
}

function buildEstadoBadge(estado) {
  const map = {
    estable:     `<span class="ver-estado ver-estado--estable"><i class="fas fa-check"></i> Estable</span>`,
    beta:        `<span class="ver-estado ver-estado--beta"><i class="fas fa-flask"></i> Beta</span>`,
    desarrollo:  `<span class="ver-estado ver-estado--desarrollo"><i class="fas fa-wrench"></i> Desarrollo</span>`,
    deprecada:   `<span class="ver-estado ver-estado--deprecada"><i class="fas fa-archive"></i> Deprecada</span>`,
  };
  return map[estado] || `<span class="ver-estado">${estado}</span>`;
}

// =============================================================================
// UTILIDADES
// =============================================================================

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('es-MX', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function colorEstado(estado) {
  return {
    estable:    '#00d68f',
    beta:       '#a855f7',
    desarrollo: '#ffb830',
    deprecada:  '#5a5a72',
  }[estado] || '#6c63ff';
}

// =============================================================================
// ESTADOS VACÍOS Y LOADING
// =============================================================================

function renderLoading() {
  const list = document.getElementById('verList');
  if (!list) return;
  list.innerHTML = `
    <div class="ver-loading">
      <div class="ver-spinner"></div>
      <p>Cargando versiones...</p>
    </div>`;
}

function renderError(msg) {
  const list = document.getElementById('verList');
  if (!list) return;
  list.innerHTML = `
    <div class="ver-empty">
      <i class="fas fa-circle-exclamation" style="color:var(--danger)"></i>
      <h3>Error al cargar versiones</h3>
      <p>${escapeHtml(msg)}</p>
      <button class="btn btn--primary btn--sm" onclick="window.loadVersionesModule?.()">
        <i class="fas fa-redo"></i> Reintentar
      </button>
    </div>`;
}

// =============================================================================
// EVENTOS
// =============================================================================

function setupEvents() {
  document.getElementById('verFilters')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.ver-filter-btn');
    if (!btn) return;
    document.querySelectorAll('.ver-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    _filtro = btn.dataset.filter;
    renderList();
  });

  let searchTimeout;
  document.getElementById('verSearch')?.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      _busqueda = e.target.value.trim();
      renderList();
    }, 220);
  });

  document.getElementById('verRefreshBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('verRefreshBtn');
    if (btn) {
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      btn.disabled  = true;
    }
    await loadVersions();
    if (btn) {
      btn.innerHTML = '<i class="fas fa-sync-alt"></i>';
      btn.disabled  = false;
    }
  });
}

// Exponer para que navigation.js pueda llamar la función
window.renderVersiones    = renderVersiones;
window.loadVersionesModule = loadVersions;

export default { renderVersiones, loadVersions };