// src/frontend/modules/auth/super-admin.js
// Funcionalidad COMPLETA — Diseño renovado
// NOTA: Se ha eliminado TODO uso de confirm() nativo y
//       los modales ahora tienen scroll interno correcto.

import avisoService from '../../services/avisoService.js';
window.avisoService = avisoService;
let currentAvisos = [], currentAvisosPage = 1, totalAvisosPages = 1, editingAvisoId = null;

// =============================================================
// CONFIGURACIÓN
// =============================================================
const API_URL = window.location.origin;
let currentSection = 'versions';
let versionsData = [];
let systemStatus = null;
let shutdownHistory = [];
let schoolsList = []; // Lista de escuelas para el selector

// =============================================================
// SUGERENCIAS - Variables de estado
// =============================================================
let currentSuggestions = [];
let currentSuggestionsPage = 1;
let totalSuggestionsPages = 1;
let currentEstado = 'todos';
let currentCategoria = 'todas';
let currentSuggestionId = null;

// =============================================================
// MANEJO DE TOKEN EXPIRADO Y REFRESH AUTOMÁTICO
// =============================================================
let refreshTimeout;
let isRefreshing = false;

// Reloj en tiempo real
function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    const el = document.getElementById('clockDisplay');
    if (el) el.textContent = `${h}:${m}:${s}`;
}
updateClock();
setInterval(updateClock, 1000);

// Canvas background particles
(function() {
    const canvas = document.getElementById('bgCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];
    let W, H;

    function resize() {
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < 60; i++) {
        particles.push({
            x: Math.random() * 2000,
            y: Math.random() * 1200,
            r: Math.random() * 1.5 + 0.3,
            dx: (Math.random() - 0.5) * 0.2,
            dy: (Math.random() - 0.5) * 0.2,
            opacity: Math.random() * 0.4 + 0.1
        });
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);
        particles.forEach(p => {
            p.x += p.dx;
            p.y += p.dy;
            if (p.x < 0) p.x = W;
            if (p.x > W) p.x = 0;
            if (p.y < 0) p.y = H;
            if (p.y > H) p.y = 0;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(56, 189, 248, ${p.opacity})`;
            ctx.fill();
        });

        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120) {
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(56, 189, 248, ${0.07 * (1 - dist / 120)})`;
                    ctx.lineWidth = 0.5;
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }
        requestAnimationFrame(draw);
    }
    draw();
})();

// Mobile menu toggle
document.getElementById('menuToggle')?.addEventListener('click', function() {
    document.getElementById('sidebar').classList.toggle('sa-sidebar--open');
    document.getElementById('saMain').classList.toggle('sa-main--pushed');
});

function getToken() {
    return localStorage.getItem('superAdminToken') || localStorage.getItem('token');
}

function scheduleTokenRefresh(expiresInMs) {
    if (refreshTimeout) clearTimeout(refreshTimeout);
    const refreshTime = Math.max(expiresInMs - (5 * 60 * 1000), 0);
    if (refreshTime > 0) {
        refreshTimeout = setTimeout(() => refreshSuperAdminToken(), refreshTime);
        console.log(`⏰ Token refresh programado en ${Math.floor(refreshTime / 60000)} minutos`);
    }
}

async function refreshSuperAdminToken() {
    if (isRefreshing) return;
    isRefreshing = true;
    try {
        const response = await fetch(`${API_URL}/api/superadmin/refresh`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${getToken()}` },
            credentials: 'include'
        });
        if (response.ok) {
            const data = await response.json();
            if (data.token) {
                localStorage.setItem('superAdminToken', data.token);
                if (data.expiresIn) scheduleTokenRefresh(data.expiresIn);
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error('❌ Error refrescando token:', error);
        return false;
    } finally {
        isRefreshing = false;
    }
}

async function fetchWithAuth(url, options = {}) {
    const token = getToken();
    const headers = { ...options.headers, 'Authorization': `Bearer ${token}` };
    try {
        const response = await fetch(url, { ...options, headers, credentials: 'include' });
        if (response.status === 401) {
            const refreshed = await refreshSuperAdminToken();
            if (refreshed) {
                const newHeaders = { ...options.headers, 'Authorization': `Bearer ${getToken()}` };
                const retryResponse = await fetch(url, { ...options, headers: newHeaders, credentials: 'include' });
                if (retryResponse.ok) return retryResponse;
            }
            await logout();
            throw new Error('Sesión expirada');
        }
        return response;
    } catch (error) {
        if (error.message === 'Sesión expirada') window.location.href = '/login.html';
        throw error;
    }
}

// =============================================================
// UTILIDADES
// =============================================================
function showToast(message, type = 'success') {
    const existing = document.querySelectorAll('.toast-notification');
    existing.forEach(t => t.remove());

    const icons = {
        success: 'fa-circle-check',
        error:   'fa-circle-xmark',
        warning: 'fa-triangle-exclamation'
    };

    const toast = document.createElement('div');
    toast.className = 'toast-notification';

    const borderColors = {
        success: 'var(--col-green)',
        error:   'var(--col-red)',
        warning: 'var(--col-amber)'
    };
    toast.style.borderLeftColor = borderColors[type] || borderColors.success;

    toast.innerHTML = `
        <i class="fas ${icons[type] || icons.success}" style="color:${borderColors[type]};font-size:1rem;"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(8px)';
        toast.style.transition = 'all 0.25s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3200);
}

function formatDate(dateString) {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('es-MX', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// =============================================================
// MODAL DE CONFIRMACIÓN PERSONALIZADO
// Reemplaza TODAS las llamadas a confirm() nativo
// =============================================================
let confirmCallback = null;

function showConfirmModal({
    message = '¿Estás seguro?',
    subtext = '',
    title = 'Confirmar acción',
    confirmText = 'Confirmar',
    confirmType = 'primary'
} = {}) {
    return new Promise((resolve) => {
        confirmCallback = (result) => {
            resolve(result);
            confirmCallback = null;
        };

        document.getElementById('confirmModalTitle').textContent = title;
        document.getElementById('confirmModalMessage').textContent = message;
        
        const subtextEl = document.getElementById('confirmModalSubtext');
        subtextEl.textContent = subtext;
        subtextEl.style.display = subtext ? 'block' : 'none';

        const confirmBtn = document.getElementById('confirmModalBtn');
        confirmBtn.innerHTML = `<i class="fas fa-check"></i> ${confirmText}`;

        const headerIcon = document.getElementById('confirmModalIcon');
        const iconBig = document.getElementById('confirmModalIconBig');
        const iconBigI = iconBig.querySelector('i');

        const typeStyles = {
            danger: {
                btnBg: 'linear-gradient(135deg, #ef4444, #dc2626)',
                btnShadow: '0 4px 16px rgba(239, 68, 68, 0.25)',
                iconBg: 'var(--col-red-dim)',
                iconColor: 'var(--col-red)',
                iconBorder: 'rgba(248,113,113,0.25)',
                iconClass: 'fas fa-triangle-exclamation'
            },
            warning: {
                btnBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
                btnShadow: '0 4px 16px rgba(245, 158, 11, 0.25)',
                iconBg: 'var(--col-amber-dim)',
                iconColor: 'var(--col-amber)',
                iconBorder: 'rgba(251,191,36,0.25)',
                iconClass: 'fas fa-question'
            },
            primary: {
                btnBg: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
                btnShadow: '0 4px 16px rgba(14, 165, 233, 0.25)',
                iconBg: 'var(--col-cyan-dim)',
                iconColor: 'var(--col-cyan)',
                iconBorder: 'rgba(56,189,248,0.25)',
                iconClass: 'fas fa-circle-info'
            }
        };

        const style = typeStyles[confirmType] || typeStyles.primary;
        confirmBtn.style.background = style.btnBg;
        confirmBtn.style.boxShadow = style.btnShadow;
        confirmBtn.style.color = '#fff';
        headerIcon.style.background = style.iconBg;
        headerIcon.style.color = style.iconColor;
        headerIcon.style.borderColor = style.iconBorder;
        headerIcon.querySelector('i').className = style.iconClass;
        iconBig.style.background = style.iconBg;
        iconBig.style.borderColor = style.iconBorder.replace('0.25', '0.3');
        iconBigI.style.color = style.iconColor;
        iconBigI.className = style.iconClass;

        const modal = document.getElementById('confirmModal');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        setTimeout(() => {
            const cancelBtn = modal.querySelector('.sa-btn--ghost');
            if (cancelBtn) cancelBtn.focus();
        }, 100);
    });
}

function closeConfirmModal(result) {
    const modal = document.getElementById('confirmModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
    if (confirmCallback) {
        confirmCallback(result);
        confirmCallback = null;
    }
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modal = document.getElementById('confirmModal');
        if (modal && modal.style.display === 'flex') {
            closeConfirmModal(false);
        }
    }
});

window.showConfirmModal = showConfirmModal;
window.closeConfirmModal = closeConfirmModal;

// =============================================================
// AVISOS - Funciones CRUD
// =============================================================
async function loadAvisos(page = 1) {
    const container = document.getElementById('avisosList');
    if (!container) return;
    container.innerHTML = '<div class="sa-loader"><span></span><span></span><span></span></div>';

    try {
        const activo = document.getElementById('filterAvisoActivo')?.value || '';
        const tipo   = document.getElementById('filterAvisoTipo')?.value || '';
        const filters = {};
        if (activo !== '') filters.activo = activo;
        if (tipo !== '')   filters.tipo   = tipo;

        const result = await avisoService.getAllAvisos(page, filters);
        if (result.success) {
            currentAvisos      = result.avisos || [];
            currentAvisosPage  = result.pagination?.page  || 1;
            totalAvisosPages   = result.pagination?.pages || 1;
            renderAvisosList();
            renderAvisosPagination();
        } else {
            container.innerHTML = '<p class="error">Error al cargar avisos</p>';
        }
    } catch (error) {
        console.error('Error cargando avisos:', error);
        container.innerHTML = '<p class="error">Error de conexión</p>';
    }
}

function renderAvisosList() {
    const container = document.getElementById('avisosList');
    if (!container) return;

    if (!currentAvisos || currentAvisos.length === 0) {
        container.innerHTML = `
            <div class="sa-empty" style="grid-column:1/-1;">
                <i class="fas fa-bullhorn"></i>
                <p>No hay avisos registrados</p>
                <button class="sa-btn sa-btn--primary" onclick="openAvisoModal()" style="margin-top:1rem;">
                    <i class="fas fa-plus"></i> Crear primer aviso
                </button>
            </div>
        `;
        return;
    }

    const prioridadColor = { baja: '#34d399', media: '#fbbf24', alta: '#fb923c', critica: '#f87171' };
    const tipoIcon = { general: '📢', mantenimiento: '🔧', importante: '⭐', actualizacion: '🔄', evento: '📅' };

    container.innerHTML = currentAvisos.map(a => {
        const fechaInicioStr = a.fechaInicio
            ? new Date(a.fechaInicio).toLocaleDateString('es-MX', { year:'numeric', month:'short', day:'numeric', timeZone:'UTC' })
            : '—';
        const fechaFinStr = a.fechaFin
            ? new Date(a.fechaFin).toLocaleDateString('es-MX', { year:'numeric', month:'short', day:'numeric', timeZone:'UTC' })
            : '—';

        return `
        <div class="version-card ${!a.activo ? 'inactive' : ''}" style="position:relative;">
            ${!a.activo ? '<span class="version-badge badge-deprecada" style="position:absolute;top:1rem;right:1rem;">Inactivo</span>' : ''}
            <div class="version-card-header">
                <div class="version-info">
                    <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.5rem;">
                        <span style="font-size:1.4rem;">${tipoIcon[a.tipo] || '📢'}</span>
                        <span class="version-badge" style="background:${prioridadColor[a.prioridad]}22;color:${prioridadColor[a.prioridad]};border:1px solid ${prioridadColor[a.prioridad]}44;">
                            ${a.prioridad.toUpperCase()}
                        </span>
                    </div>
                    <div class="version-title">${escapeHtml(a.titulo)}</div>
                    <div class="version-meta">
                        <span><i class="fas fa-calendar-range"></i> ${fechaInicioStr} → ${fechaFinStr}</span>
                        <span><i class="fas fa-eye"></i> ${a.vistoPor?.length || 0} usuarios</span>
                    </div>
                </div>
            </div>
            <div class="version-description">${escapeHtml(a.descripcion)}</div>
            <div class="version-actions">
                <button class="btn-edit" onclick="editAviso('${a._id}')">
                    <i class="fas fa-pen-to-square"></i> Editar
                </button>
                <button class="btn-delete" onclick="deleteAviso('${a._id}', '${escapeHtml(a.titulo)}')">
                    <i class="fas fa-trash-can"></i> Eliminar
                </button>
            </div>
        </div>
        `;
    }).join('');
}

function renderAvisosPagination() {
    const container = document.getElementById('avisosPagination');
    if (!container) return;
    if (totalAvisosPages <= 1) { container.innerHTML = ''; return; }

    container.innerHTML = `
        <div class="pagination">
            <button class="pagination-btn" onclick="loadAvisos(${currentAvisosPage - 1})" ${currentAvisosPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
            </button>
            <span style="font-family:var(--font-mono);font-size:.8rem;color:var(--col-text-3);padding:0 .5rem;">
                ${currentAvisosPage} / ${totalAvisosPages}
            </span>
            <button class="pagination-btn" onclick="loadAvisos(${currentAvisosPage + 1})" ${currentAvisosPage === totalAvisosPages ? 'disabled' : ''}>
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;
}

function openAvisoModal(aviso = null) {
    const modal = document.getElementById('avisoModal');
    const title = document.getElementById('avisoModalTitle');

    if (aviso) {
        title.innerHTML = '<i class="fas fa-pen-to-square"></i> Editar Aviso';
        document.getElementById('avisoTitulo').value       = aviso.titulo || '';
        document.getElementById('avisoDescripcion').value  = aviso.descripcion || '';
        document.getElementById('avisoTipo').value         = aviso.tipo || 'general';
        document.getElementById('avisoPrioridad').value    = aviso.prioridad || 'media';
        document.getElementById('avisoActivo').checked     = aviso.activo !== false;

        if (aviso.fechaInicio) {
            const f = new Date(aviso.fechaInicio);
            document.getElementById('avisoFechaInicio').value =
                `${f.getUTCFullYear()}-${String(f.getUTCMonth()+1).padStart(2,'0')}-${String(f.getUTCDate()).padStart(2,'0')}`;
        }
        if (aviso.fechaFin) {
            const f = new Date(aviso.fechaFin);
            document.getElementById('avisoFechaFin').value =
                `${f.getUTCFullYear()}-${String(f.getUTCMonth()+1).padStart(2,'0')}-${String(f.getUTCDate()).padStart(2,'0')}`;
        }
        editingAvisoId = aviso._id;
    } else {
        title.innerHTML = '<i class="fas fa-bullhorn"></i> Nuevo Aviso';
        document.getElementById('avisoTitulo').value      = '';
        document.getElementById('avisoDescripcion').value = '';
        document.getElementById('avisoTipo').value        = 'general';
        document.getElementById('avisoPrioridad').value   = 'media';
        document.getElementById('avisoActivo').checked    = true;
        const now   = new Date();
        const later = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        document.getElementById('avisoFechaInicio').value = now.toISOString().split('T')[0];
        document.getElementById('avisoFechaFin').value    = later.toISOString().split('T')[0];
        editingAvisoId = null;
    }

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    // Reset scroll del body del modal
    const modalBody = modal.querySelector('.sa-modal__body');
    if (modalBody) modalBody.scrollTop = 0;
}

function closeAvisoModal() {
    const modal = document.getElementById('avisoModal');
    if (modal) { modal.style.display = 'none'; document.body.style.overflow = ''; }
    editingAvisoId = null;
}

async function saveAviso() {
    const titulo      = document.getElementById('avisoTitulo')?.value?.trim();
    const descripcion = document.getElementById('avisoDescripcion')?.value?.trim();
    const tipo        = document.getElementById('avisoTipo')?.value;
    const prioridad   = document.getElementById('avisoPrioridad')?.value;
    const fechaInicio = document.getElementById('avisoFechaInicio')?.value;
    const fechaFin    = document.getElementById('avisoFechaFin')?.value;
    const activo      = document.getElementById('avisoActivo')?.checked;

    if (!titulo)      { showToast('El título es obligatorio', 'error'); return; }
    if (!descripcion) { showToast('La descripción es obligatoria', 'error'); return; }
    if (!fechaInicio) { showToast('La fecha de inicio es obligatoria', 'error'); return; }
    if (!fechaFin)    { showToast('La fecha de fin es obligatoria', 'error'); return; }

    const hoy    = new Date();
    const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-${String(hoy.getDate()).padStart(2,'0')}`;

    if (fechaInicio < hoyStr) {
        showToast('La fecha de inicio no puede ser anterior a hoy', 'error'); return;
    }
    if (fechaFin < fechaInicio) {
        showToast('La fecha fin debe ser igual o posterior al inicio', 'error'); return;
    }

    const data = { titulo, descripcion, tipo, prioridad, fechaInicio, fechaFin, activo };

    try {
        const result = editingAvisoId
            ? await avisoService.updateAviso(editingAvisoId, data)
            : await avisoService.createAviso(data);

        if (result.success) {
            showToast(editingAvisoId ? '✓ Aviso actualizado' : '✓ Aviso creado', 'success');
            closeAvisoModal();
            loadAvisos(currentAvisosPage);
        } else {
            showToast(result.message || 'Error al guardar aviso', 'error');
        }
    } catch (error) {
        console.error('Error guardando aviso:', error);
        showToast('Error al guardar aviso', 'error');
    }
}

async function editAviso(id) {
    try {
        const result = await avisoService.getAllAvisos(1, {});
        if (result.success) {
            const aviso = result.avisos?.find(a => a._id === id);
            if (aviso) openAvisoModal(aviso);
            else showToast('Aviso no encontrado', 'error');
        }
    } catch (error) {
        console.error('Error cargando aviso:', error);
        showToast('Error al cargar aviso', 'error');
    }
}

async function deleteAviso(id, titulo) {
    // ===== REEMPLAZO DE confirm() POR MODAL PERSONALIZADO =====
    const confirmed = await showConfirmModal({
        message: `¿Eliminar el aviso "${titulo}"?`,
        subtext: 'Esta acción no se puede deshacer.',
        title: 'Eliminar Aviso',
        confirmText: 'Eliminar',
        confirmType: 'danger'
    });
    if (!confirmed) return;
    // ===== FIN REEMPLAZO =====

    try {
        const result = await avisoService.deleteAviso(id);
        if (result.success) { showToast('Aviso eliminado', 'success'); loadAvisos(currentAvisosPage); }
        else showToast(result.message || 'Error al eliminar', 'error');
    } catch (error) {
        console.error('Error eliminando aviso:', error);
        showToast('Error al eliminar aviso', 'error');
    }
}

window.loadAvisos       = loadAvisos;
window.openAvisoModal   = () => openAvisoModal(null);
window.closeAvisoModal  = closeAvisoModal;
window.saveAviso        = saveAviso;
window.editAviso        = editAviso;
window.deleteAviso      = deleteAviso;

// =============================================================
// NAVEGACIÓN
// =============================================================
const SECTION_META = {
    versions:    { title: 'Panel de Versiones',    desc: 'Gestiona las versiones del sistema y publica actualizaciones', icon: 'fa-code-branch' },
    avisos:      { title: 'Gestión de Avisos',     desc: 'Administra los avisos que se mostrarán a los usuarios',        icon: 'fa-bullhorn' },
    sugerencias: { title: 'Bandeja de Sugerencias', desc: 'Gestiona las sugerencias enviadas por los usuarios',          icon: 'fa-lightbulb' },
    invitations: { title: 'Invitaciones',           desc: 'Envía invitaciones para nuevos administradores',              icon: 'fa-envelope-open-text' },
    shutdown:    { title: 'Control de Acceso',      desc: 'Controla la disponibilidad del sistema para los usuarios',    icon: 'fa-power-off' }
};

function switchSection(section) {
    currentSection = section;

    document.querySelectorAll('.sa-nav__item, .nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.section === section);
    });

    const meta = SECTION_META[section] || {};
    const pageTitle    = document.getElementById('pageTitle');
    const heroTitle    = document.getElementById('heroTitle');
    const pageDesc     = document.getElementById('pageDescription');
    const heroIcon     = document.getElementById('heroIcon');

    if (pageTitle)  pageTitle.textContent  = meta.title || section;
    if (heroTitle)  heroTitle.textContent  = meta.title || section;
    if (pageDesc)   pageDesc.textContent   = meta.desc  || '';
    if (heroIcon) {
        heroIcon.className = `fas ${meta.icon || 'fa-circle'} sa-page-hero__deco-icon`;
    }

    const sections = ['versionsSection','avisosSection','sugerenciasSection','invitationsSection','shutdownSection'];
    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('sa-section--hidden', 'hidden');
    });

    const targets = {
        versions:    'versionsSection',
        avisos:      'avisosSection',
        sugerencias: 'sugerenciasSection',
        invitations: 'invitationsSection',
        shutdown:    'shutdownSection'
    };

    const targetId = targets[section];
    if (targetId) {
        const el = document.getElementById(targetId);
        if (el) {
            el.classList.remove('sa-section--hidden', 'hidden');
            el.style.animation = 'none';
            el.offsetHeight;
            el.style.animation = '';
        }
    }

    const loaders = {
        versions:    loadVersions,
        avisos:      () => loadAvisos(),
        sugerencias: () => { loadSuggestionsPage(); loadSuggestionsStats(); },
        invitations: loadInvitations,
        shutdown:    loadSystemStatus
    };

    if (loaders[section]) loaders[section]();
}

// =============================================================
// VERSIONES
// =============================================================
async function loadVersions() {
    const container = document.getElementById('versionsList');
    if (!container) return;
    container.innerHTML = '<div class="sa-loader"><span></span><span></span><span></span></div>';
    try {
        const response = await fetchWithAuth(`${API_URL}/api/versions`, { credentials: 'include' });
        if (!response.ok) throw new Error('Error al cargar versiones');
        const data = await response.json();
        if (data.success) { versionsData = data.versions; renderVersions(versionsData); }
        else throw new Error(data.message);
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = `
            <div class="sa-empty" style="grid-column:1/-1;">
                <i class="fas fa-circle-exclamation" style="color:var(--col-red);opacity:.6;"></i>
                <p>Error al cargar versiones: ${error.message}</p>
                <button class="sa-btn sa-btn--ghost" onclick="window.loadVersions()">
                    <i class="fas fa-rotate-right"></i> Reintentar
                </button>
            </div>
        `;
    }
}

function renderVersions(versions) {
    const container = document.getElementById('versionsList');
    if (!versions.length) {
        container.innerHTML = `
            <div class="sa-empty" style="grid-column:1/-1;">
                <i class="fas fa-code-branch"></i>
                <p>No hay versiones publicadas aún</p>
                <button class="sa-btn sa-btn--primary" onclick="window.openCreateVersionModal()" style="margin-top:1rem;">
                    <i class="fas fa-plus"></i> Publicar primera versión
                </button>
            </div>
        `;
        return;
    }
    container.innerHTML = versions.map(v => renderVersionCard(v)).join('');
}

function renderVersionCard(v) {
    const isCurrent  = v.esActual;
    const estadoClass = { estable: 'badge-estable', beta: 'badge-beta', desarrollo: 'badge-desarrollo', deprecada: 'badge-deprecada' }[v.estado] || 'badge-estable';
    const estadoText  = { estable: 'Estable', beta: 'Beta', desarrollo: 'Desarrollo', deprecada: 'Deprecada' }[v.estado] || v.estado;
    const tagClass    = { nuevo:'tag-nuevo', mejora:'tag-mejora', correccion:'tag-correccion', eliminado:'tag-eliminado', seguridad:'tag-seguridad', rendimiento:'tag-rendimiento' };
    const tagText     = { nuevo:'Nuevo', mejora:'Mejora', correccion:'Corrección', eliminado:'Eliminado', seguridad:'Seguridad', rendimiento:'Rendimiento' };
    const descFmt     = v.descripcion ? v.descripcion.replace(/\n/g, '<br>') : '';

    return `
        <div class="version-card ${isCurrent ? 'current' : ''}">
            <div class="version-card-header">
                <div class="version-info">
                    <div class="version-number">v${escapeHtml(v.numero)}</div>
                    <div class="version-title">${escapeHtml(v.titulo)}</div>
                    <div class="version-meta">
                        <span><i class="fas fa-calendar"></i> ${formatDate(v.fechaLanzamiento)}</span>
                        <span><i class="fas fa-list-check"></i> ${v.cambios?.length || 0} cambios</span>
                    </div>
                </div>
                <div style="display:flex;flex-direction:column;gap:.5rem;align-items:flex-end;">
                    <span class="version-badge ${estadoClass}">${estadoText}</span>
                    ${isCurrent ? '<span class="version-badge badge-actual"><i class="fas fa-circle" style="font-size:.5rem; margin-right:.25rem;"></i> Actual</span>' : ''}
                </div>
            </div>

            ${descFmt ? `<div class="version-description">${descFmt}</div>` : ''}

            ${v.cambios?.length ? `
                <div class="cambios-list">
                    <div class="cambios-title"><i class="fas fa-clipboard-list" style="margin-right:.4rem;"></i>Cambios realizados</div>
                    ${v.cambios.map(c => `
                        <div class="cambio-item">
                            <span class="cambio-tag ${tagClass[c.tipo] || 'tag-correccion'}">${tagText[c.tipo] || c.tipo}</span>
                            <span class="cambio-desc">${escapeHtml(c.descripcion)}</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            <div class="version-actions">
                ${!isCurrent ? `
                    <button class="btn-set-current" onclick="window.setCurrentVersion('${v._id}', '${v.numero}')">
                        <i class="fas fa-circle-check"></i> Marcar como actual
                    </button>
                ` : ''}
                <button class="btn-edit" onclick="window.editVersion('${v._id}')">
                    <i class="fas fa-pen-to-square"></i> Editar
                </button>
                <button class="btn-delete" onclick="window.deleteVersion('${v._id}', '${v.numero}')">
                    <i class="fas fa-trash-can"></i> Eliminar
                </button>
            </div>
        </div>
    `;
}

let editingVersionId = null;

function openCreateVersionModal() {
    editingVersionId = null;
    showVersionModal({ numero: '', titulo: '', descripcion: '', estado: 'estable', cambios: [] });
}

function editVersion(id) {
    const version = versionsData.find(v => v._id === id);
    if (version) { editingVersionId = id; showVersionModal(version); }
}

function showVersionModal(version) {
    const modalHTML = `
        <div class="modal-overlay" id="versionModal">
            <div class="modal-container">
                <div class="modal-header">
                    <h3>${editingVersionId ? '<i class="fas fa-pen-to-square"></i> Editar Versión' : '<i class="fas fa-plus-circle"></i> Publicar Nueva Versión'}</h3>
                    <button class="modal-close" onclick="window.closeVersionModal()">✕</button>
                </div>
                <div class="modal-body">
                    <div style="margin-bottom:1rem;">
                        <label>Número de versión <span style="color:var(--col-red)">*</span></label>
                        <input type="text" id="modalVersionNumero" value="${escapeHtml(version.numero)}" placeholder="Ej: 1.0.0, 2.1.0-beta">
                    </div>
                    <div style="margin-bottom:1rem;">
                        <label>Título <span style="color:var(--col-red)">*</span></label>
                        <input type="text" id="modalVersionTitulo" value="${escapeHtml(version.titulo)}" placeholder="Ej: Actualización Mayor">
                    </div>
                    <div style="margin-bottom:1rem;">
                        <label>Descripción general</label>
                        <textarea id="modalVersionDescripcion" rows="8" placeholder="Describe los aspectos más importantes de esta versión…" style="font-family:var(--font-mono);font-size:.8rem;">${version.descripcion || ''}</textarea>
                        <small style="color:var(--col-text-3);font-size:.7rem;">Puedes usar saltos de línea para organizar el texto</small>
                    </div>
                    <div style="margin-bottom:1rem;">
                        <label>Estado</label>
                        <select id="modalVersionEstado">
                            <option value="estable"   ${version.estado==='estable'   ?'selected':''}>Estable</option>
                            <option value="beta"      ${version.estado==='beta'      ?'selected':''}>Beta</option>
                            <option value="desarrollo"${version.estado==='desarrollo'?'selected':''}>Desarrollo</option>
                            <option value="deprecada" ${version.estado==='deprecada' ?'selected':''}>Deprecada</option>
                        </select>
                    </div>
                    <div style="margin-bottom:1rem;">
                        <label>Cambios (opcional)</label>
                        <div id="cambiosList">
                            ${(version.cambios || []).map((c, idx) => `
                                <div class="cambio-item" style="margin-bottom:.5rem;">
                                    <select class="cambio-tipo">
                                        <option value="nuevo"      ${c.tipo==='nuevo'      ?'selected':''}>Nuevo</option>
                                        <option value="mejora"     ${c.tipo==='mejora'     ?'selected':''}>Mejora</option>
                                        <option value="correccion" ${c.tipo==='correccion' ?'selected':''}>Corrección</option>
                                        <option value="eliminado"  ${c.tipo==='eliminado'  ?'selected':''}>Eliminado</option>
                                        <option value="seguridad"  ${c.tipo==='seguridad'  ?'selected':''}>Seguridad</option>
                                        <option value="rendimiento"${c.tipo==='rendimiento'?'selected':''}>Rendimiento</option>
                                    </select>
                                    <input type="text" class="cambio-desc-input" value="${escapeHtml(c.descripcion)}" placeholder="Descripción del cambio">
                                    <button onclick="window.removeCambio(${idx})" style="background:var(--col-red-dim);color:var(--col-red);border:1px solid rgba(248,113,113,.3);padding:.4rem .6rem;border-radius:6px;cursor:pointer;font-size:.8rem;flex-shrink:0;">✕</button>
                                </div>
                            `).join('')}
                        </div>
                        <button type="button" onclick="window.addCambio()" style="margin-top:.5rem;padding:.5rem 1rem;background:var(--col-cyan-dim);color:var(--col-cyan);border:1px solid rgba(56,189,248,.3);border-radius:8px;cursor:pointer;font-size:.8rem;font-weight:600;font-family:var(--font-body);">
                            <i class="fas fa-plus"></i> Agregar cambio
                        </button>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-edit-big" onclick="window.closeVersionModal()">
                        <i class="fas fa-xmark"></i> Cancelar
                    </button>
                    <button class="create-version-btn" onclick="window.saveVersion()">
                        ${editingVersionId ? '<i class="fas fa-floppy-disk"></i> Actualizar' : '<i class="fas fa-upload"></i> Publicar'}
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    // Reset scroll
    const modalBody = document.querySelector('#versionModal .modal-body');
    if (modalBody) modalBody.scrollTop = 0;
}

function addCambio() {
    const container = document.getElementById('cambiosList');
    const idx = container.children.length;
    container.insertAdjacentHTML('beforeend', `
        <div class="cambio-item" style="margin-bottom:.5rem;">
            <select class="cambio-tipo">
                <option value="nuevo">Nuevo</option>
                <option value="mejora">Mejora</option>
                <option value="correccion">Corrección</option>
                <option value="eliminado">Eliminado</option>
                <option value="seguridad">Seguridad</option>
                <option value="rendimiento">Rendimiento</option>
            </select>
            <input type="text" class="cambio-desc-input" placeholder="Descripción del cambio">
            <button onclick="window.removeCambio(${idx})" style="background:var(--col-red-dim);color:var(--col-red);border:1px solid rgba(248,113,113,.3);padding:.4rem .6rem;border-radius:6px;cursor:pointer;font-size:.8rem;flex-shrink:0;">✕</button>
        </div>
    `);
}

function removeCambio(idx) {
    const container = document.getElementById('cambiosList');
    if (container.children[idx]) container.children[idx].remove();
}

function closeVersionModal() {
    const modal = document.getElementById('versionModal');
    if (modal) modal.remove();
}

async function saveVersion() {
    const numero      = document.getElementById('modalVersionNumero')?.value;
    const titulo      = document.getElementById('modalVersionTitulo')?.value;
    const descripcion = document.getElementById('modalVersionDescripcion')?.value;
    const estado      = document.getElementById('modalVersionEstado')?.value;

    if (descripcion && descripcion.length > 10000) {
        showToast(`La descripción es demasiado larga (${descripcion.length} chars). Máximo 10000.`, 'error'); return;
    }
    if (!numero || !titulo) {
        showToast('Número de versión y título son obligatorios', 'error'); return;
    }

    const cambios = [];
    document.querySelectorAll('.cambio-item').forEach(item => {
        const tipo = item.querySelector('.cambio-tipo')?.value;
        const desc = item.querySelector('.cambio-desc-input')?.value;
        if (desc && desc.trim()) {
            if (desc.length > 2000) { showToast('Un cambio excede los 2000 caracteres', 'error'); return; }
            cambios.push({ tipo, descripcion: desc.trim() });
        }
    });

    const url    = editingVersionId ? `${API_URL}/api/superadmin/versions/${editingVersionId}` : `${API_URL}/api/superadmin/versions`;
    const method = editingVersionId ? 'PUT' : 'POST';

    try {
        const response = await fetchWithAuth(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ numero, titulo, descripcion, estado, cambios, esActual: false })
        });
        const data = await response.json();
        if (data.success) {
            showToast(editingVersionId ? '✓ Versión actualizada' : '✓ Versión publicada', 'success');
            closeVersionModal();
            loadVersions();
        } else {
            showToast(data.message || 'Error al guardar versión', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error al guardar versión', 'error');
    }
}

async function setCurrentVersion(id, numero) {
    // ===== REEMPLAZO DE confirm() POR MODAL PERSONALIZADO =====
    const confirmed = await showConfirmModal({
        message: `¿Marcar v${numero} como la versión actual del sistema?`,
        subtext: 'Esta versión será la que vean todos los usuarios.',
        title: 'Cambiar Versión Actual',
        confirmText: 'Marcar como Actual',
        confirmType: 'warning'
    });
    if (!confirmed) return;
    // ===== FIN REEMPLAZO =====

    try {
        const response = await fetchWithAuth(`${API_URL}/api/superadmin/versions/${id}/set-current`, { method: 'PATCH' });
        const data = await response.json();
        if (data.success) { showToast(`v${numero} es ahora la versión actual`); loadVersions(); }
        else showToast(data.message || 'Error', 'error');
    } catch (error) { showToast('Error al marcar versión actual', 'error'); }
}

async function deleteVersion(id, numero) {
    // ===== REEMPLAZO DE confirm() POR MODAL PERSONALIZADO =====
    const confirmed = await showConfirmModal({
        message: `¿Eliminar permanentemente la versión v${numero}?`,
        subtext: 'Esta acción no se puede deshacer y se perderán todos los datos asociados.',
        title: 'Eliminar Versión',
        confirmText: 'Eliminar Permanentemente',
        confirmType: 'danger'
    });
    if (!confirmed) return;
    // ===== FIN REEMPLAZO =====

    try {
        const response = await fetchWithAuth(`${API_URL}/api/superadmin/versions/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if (data.success) { showToast(`Versión v${numero} eliminada`); loadVersions(); }
        else showToast(data.message || 'Error al eliminar', 'error');
    } catch (error) { showToast('Error al eliminar versión', 'error'); }
}

// =============================================================
// CIERRE DEL SISTEMA (GLOBAL + POR ESCUELA)
// =============================================================

async function loadSystemStatus() {
    await Promise.all([
        loadCurrentStatus(),
        loadShutdownHistory(),
        loadSchoolsList()
    ]);
}

async function loadCurrentStatus() {
    try {
        const response = await fetchWithAuth(`${API_URL}/api/superadmin/system/status`, {});
        const data = await response.json();
        if (data.success) {
            systemStatus = data.status;
            renderSystemStatus();
            renderClosedSchoolsList();
        }
    } catch (error) {
        console.error('Error cargando estado del sistema:', error);
    }
}

async function loadSchoolsList() {
    try {
        const response = await fetchWithAuth(`${API_URL}/api/superadmin/schools`, {});
        const data = await response.json();
        if (data.success) {
            schoolsList = data.schools || [];
            populateSchoolSelect();
        }
    } catch (error) {
        console.error('Error cargando lista de escuelas:', error);
    }
}

function populateSchoolSelect() {
    const select = document.getElementById('schoolIdSelect');
    if (!select) return;

    select.innerHTML = '<option value="">— Selecciona una escuela —</option>';

    if (!schoolsList || schoolsList.length === 0) {
        select.innerHTML += '<option value="" disabled>No hay escuelas registradas</option>';
        return;
    }

    const sorted = [...schoolsList].sort((a, b) => 
        a.displayName.localeCompare(b.displayName, 'es')
    );

    sorted.forEach(school => {
        const option = document.createElement('option');
        option.value = school.schoolId;
        option.textContent = `${school.displayName} (${school.totalUsuarios} usuarios)`;
        option.dataset.displayName = school.displayName;
        option.dataset.totalUsuarios = school.totalUsuarios;
        option.dataset.totalAdmins = school.totalAdmins;
        option.dataset.adminName = school.adminPrincipal?.usuario || 'Sin admin';
        option.dataset.adminEmail = school.adminPrincipal?.correo || '';
        select.appendChild(option);
    });

    select.addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        const infoDiv = document.getElementById('schoolSelectInfo');
        
        if (!infoDiv) return;
        if (!this.value) { infoDiv.style.display = 'none'; return; }

        const displayName = selectedOption.dataset.displayName || this.value;
        const totalUsuarios = selectedOption.dataset.totalUsuarios || '?';
        const adminName = selectedOption.dataset.adminName || 'Sin admin';
        const adminEmail = selectedOption.dataset.adminEmail || '';
        const isClosed = systemStatus?.closedSchools?.some(s => s.schoolId === this.value);

        infoDiv.style.display = 'block';
        infoDiv.innerHTML = `
            <div class="sa-school-info-card ${isClosed ? 'sa-school-info-card--closed' : ''}">
                <div class="sa-school-info-card__header">
                    <i class="fas ${isClosed ? 'fa-lock' : 'fa-school'}"></i>
                    <span>${escapeHtml(displayName)}</span>
                    ${isClosed ? '<span class="sa-badge sa-badge--closed-school">🔒 Cerrada</span>' : ''}
                </div>
                <div class="sa-school-info-card__body">
                    <div class="sa-school-info-card__row">
                        <span class="sa-school-info-card__label">School ID</span>
                        <code class="sa-school-info-card__code">${escapeHtml(this.value)}</code>
                    </div>
                    <div class="sa-school-info-card__row">
                        <span class="sa-school-info-card__label">Usuarios</span>
                        <span>${totalUsuarios}</span>
                    </div>
                    <div class="sa-school-info-card__row">
                        <span class="sa-school-info-card__label">Admin</span>
                        <span>${escapeHtml(adminName)}${adminEmail ? ` (${escapeHtml(adminEmail)})` : ''}</span>
                    </div>
                </div>
            </div>
        `;
    });
}

function renderSystemStatus() {
    const container = document.getElementById('systemStatus');
    const buttonsContainer = document.getElementById('shutdownButtons');
    if (!container) return;

    const isClosed = systemStatus?.isClosed === true;

    container.innerHTML = `
        <div class="status-badge ${isClosed ? 'system-closed' : 'system-open'}">
            <i class="fas ${isClosed ? 'fa-lock' : 'fa-lock-open'}"></i>
            ${isClosed ? 'Sistema CERRADO GLOBALMENTE' : 'Sistema ABIERTO globalmente'}
        </div>
        ${systemStatus?.reason ? `
            <p style="margin-top:1rem;font-size:.875rem;color:var(--col-text-2);">
                <strong style="color:var(--col-text-3);">Motivo:</strong> ${escapeHtml(systemStatus.reason)}
            </p>` : ''}
    `;

    if (buttonsContainer) {
        buttonsContainer.innerHTML = isClosed
            ? `<button class="btn-open" onclick="openSystemGlobal()">
                   <i class="fas fa-lock-open"></i> Reabrir sistema GLOBALMENTE
               </button>`
            : `<button class="btn-shutdown" onclick="closeSystemGlobal()">
                   <i class="fas fa-power-off"></i> Cerrar sistema GLOBALMENTE
               </button>`;
    }
}

function renderClosedSchoolsList() {
    const container = document.getElementById('closedSchoolsContent');
    if (!container) return;

    const closedSchools = systemStatus?.closedSchools || [];

    if (closedSchools.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:var(--sp-4);color:var(--col-text-3);font-size:0.8rem;">
                <i class="fas fa-circle-check" style="color:var(--col-green);font-size:1.5rem;margin-bottom:var(--sp-2);display:block;"></i>
                No hay escuelas cerradas
            </div>`;
        return;
    }

    container.innerHTML = closedSchools.map(s => {
        const schoolInfo = schoolsList.find(sc => sc.schoolId === s.schoolId);
        const displayName = schoolInfo?.displayName || s.schoolId;
        return `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--sp-3);background:rgba(248,113,113,0.04);border:1px solid rgba(248,113,113,0.15);border-radius:var(--r-md);margin-bottom:var(--sp-2);gap:var(--sp-3);">
            <div style="flex:1;min-width:0;">
                <div style="font-weight:600;color:var(--col-text-1);font-size:0.85rem;">
                    <i class="fas fa-school" style="margin-right:var(--sp-1);color:var(--col-amber);"></i> 
                    ${escapeHtml(displayName)}
                </div>
                <div style="font-family:var(--font-mono);font-size:0.68rem;color:var(--col-text-3);margin-top:var(--sp-1);">${escapeHtml(s.schoolId)}</div>
                <div style="font-size:0.72rem;color:var(--col-text-3);margin-top:var(--sp-1);">${escapeHtml(s.reason || 'Sin motivo')}</div>
                <div style="font-family:var(--font-mono);font-size:0.65rem;color:var(--col-text-3);margin-top:var(--sp-1);"><i class="fas fa-clock"></i> ${formatDate(s.closedAt)}</div>
            </div>
            <button class="sa-btn sa-btn--success sa-btn--sm" onclick="reopenSingleSchool('${escapeHtml(s.schoolId)}')" title="Reabrir">Reabrir</button>
        </div>`;
    }).join('');
}

// ═══════════════════════════════════════════════════════════════
// CIERRE GLOBAL
// ═══════════════════════════════════════════════════════════════

async function closeSystemGlobal() {
    const reason = document.getElementById('shutdownReason')?.value?.trim();
    if (!reason) { showToast('Debes proporcionar un motivo', 'error'); return; }

    const confirmed = await showConfirmModal({
        message: '¿Cerrar el sistema GLOBALMENTE para TODOS los usuarios?',
        subtext: 'Solo el superadmin mantendrá acceso.',
        title: 'Cerrar Sistema Globalmente',
        confirmText: 'Cerrar Globalmente',
        confirmType: 'danger'
    });
    if (!confirmed) return;

    try {
        const response = await fetchWithAuth(`${API_URL}/api/superadmin/system/shutdown`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason })
        });
        const data = await response.json();
        if (data.success) {
            // ═══════════════════════════════════════════════════
            // GUARDAR EN localStorage PARA QUE ARIA LO LEA
            // ═══════════════════════════════════════════════════
            localStorage.setItem('system_closed', JSON.stringify({
                closed: true,
                type: 'global',
                reason: reason,
                timestamp: Date.now()
            }));
            
            showToast('🔒 Sistema cerrado GLOBALMENTE', 'warning');
            document.getElementById('shutdownReason').value = '';
            await loadSystemStatus();
        } else {
            showToast(data.message || 'Error', 'error');
        }
    } catch (error) {
        console.error('Error cerrando sistema:', error);
        showToast('Error al cerrar el sistema', 'error');
    }
}

async function openSystemGlobal() {
    const confirmed = await showConfirmModal({
        message: '¿Reabrir el sistema GLOBALMENTE?',
        subtext: 'Las escuelas cerradas individualmente seguirán cerradas.',
        title: 'Reabrir Sistema Globalmente',
        confirmText: 'Reabrir Globalmente',
        confirmType: 'primary'
    });
    if (!confirmed) return;

    try {
        const response = await fetchWithAuth(`${API_URL}/api/superadmin/system/open`, { method: 'POST' });
        const data = await response.json();
        if (data.success) {
            // ═══════════════════════════════════════════════════
            // LIMPIAR localStorage
            // ═══════════════════════════════════════════════════
            localStorage.removeItem('system_closed');
            
            showToast('🔓 Sistema reabierto GLOBALMENTE', 'success');
            await loadSystemStatus();
        } else {
            showToast(data.message || 'Error', 'error');
        }
    } catch (error) {
        console.error('Error reabriendo sistema:', error);
        showToast('Error al reabrir el sistema', 'error');
    }
}

// ═══════════════════════════════════════════════════════════════
// CIERRE POR ESCUELA
// ═══════════════════════════════════════════════════════════════

async function closeSchoolSystem() {
    const select = document.getElementById('schoolIdSelect');
    const schoolId = select?.value;
    const reason = document.getElementById('schoolShutdownReason')?.value?.trim();

    if (!schoolId) { showToast('Debes seleccionar una escuela', 'error'); return; }
    if (!reason) { showToast('Debes proporcionar un motivo', 'error'); return; }

    const selectedOption = select.options[select.selectedIndex];
    const displayName = selectedOption?.dataset?.displayName || schoolId;

    const confirmed = await showConfirmModal({
        message: `¿Cerrar el sistema para "${displayName}"?`,
        subtext: 'El admin y todos los usuarios de esta escuela serán bloqueados.',
        title: 'Cerrar Escuela',
        confirmText: 'Cerrar Escuela',
        confirmType: 'danger'
    });
    if (!confirmed) return;

    try {
        const response = await fetchWithAuth(`${API_URL}/api/superadmin/system/school/shutdown`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ schoolId, reason })
        });
        const data = await response.json();
        if (data.success) {
            // ═══════════════════════════════════════════════════
            // GUARDAR EN localStorage PARA QUE ARIA LO LEA
            // ═══════════════════════════════════════════════════
            const existing = JSON.parse(localStorage.getItem('system_closed') || '{}');
            const closedSchools = existing.closedSchools || [];
            if (!closedSchools.includes(schoolId)) {
                closedSchools.push(schoolId);
            }
            localStorage.setItem('system_closed', JSON.stringify({
                closed: true,
                type: 'school',
                closedSchools: closedSchools,
                reason: reason,
                timestamp: Date.now()
            }));
            
            showToast(`🔒 Escuela cerrada`, 'warning');
            document.getElementById('schoolShutdownReason').value = '';
            await loadSystemStatus();
        } else {
            showToast(data.message || 'Error', 'error');
        }
    } catch (error) {
        console.error('Error cerrando escuela:', error);
        showToast('Error al cerrar la escuela', 'error');
    }
}

async function openSchoolSystem() {
    const select = document.getElementById('schoolIdSelect');
    const schoolId = select?.value;

    if (!schoolId) { showToast('Debes seleccionar una escuela', 'error'); return; }

    const selectedOption = select.options[select.selectedIndex];
    const displayName = selectedOption?.dataset?.displayName || schoolId;

    const confirmed = await showConfirmModal({
        message: `¿Reabrir el sistema para "${displayName}"?`,
        subtext: 'El admin y usuarios podrán acceder nuevamente.',
        title: 'Reabrir Escuela',
        confirmText: 'Reabrir Escuela',
        confirmType: 'primary'
    });
    if (!confirmed) return;

    try {
        const response = await fetchWithAuth(`${API_URL}/api/superadmin/system/school/open`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ schoolId })
        });
        const data = await response.json();
        if (data.success) {
            // ═══════════════════════════════════════════════════
            // ACTUALIZAR localStorage
            // ═══════════════════════════════════════════════════
            const existing = JSON.parse(localStorage.getItem('system_closed') || '{}');
            if (existing.closedSchools) {
                existing.closedSchools = existing.closedSchools.filter(id => id !== schoolId);
                if (existing.closedSchools.length === 0) {
                    localStorage.removeItem('system_closed');
                } else {
                    localStorage.setItem('system_closed', JSON.stringify(existing));
                }
            } else {
                localStorage.removeItem('system_closed');
            }
            
            showToast(`🔓 Escuela reabierta`, 'success');
            await loadSystemStatus();
        } else {
            showToast(data.message || 'Error', 'error');
        }
    } catch (error) {
        console.error('Error reabriendo escuela:', error);
        showToast('Error al reabrir la escuela', 'error');
    }
}

async function reopenSingleSchool(schoolId) {
    const schoolInfo = schoolsList.find(s => s.schoolId === schoolId);
    const displayName = schoolInfo?.displayName || schoolId;

    const confirmed = await showConfirmModal({
        message: `¿Reabrir el sistema para "${displayName}"?`,
        subtext: 'El admin y usuarios podrán acceder nuevamente.',
        title: 'Reabrir Escuela',
        confirmText: 'Reabrir',
        confirmType: 'primary'
    });
    if (!confirmed) return;

    try {
        const response = await fetchWithAuth(`${API_URL}/api/superadmin/system/school/open`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ schoolId })
        });
        const data = await response.json();
        if (data.success) {
            // Actualizar localStorage
            const existing = JSON.parse(localStorage.getItem('system_closed') || '{}');
            if (existing.closedSchools) {
                existing.closedSchools = existing.closedSchools.filter(id => id !== schoolId);
                if (existing.closedSchools.length === 0) {
                    localStorage.removeItem('system_closed');
                } else {
                    localStorage.setItem('system_closed', JSON.stringify(existing));
                }
            }
            
            showToast(`🔓 Escuela reabierta`, 'success');
            await loadSystemStatus();
        } else {
            showToast(data.message || 'Error', 'error');
        }
    } catch (error) {
        console.error('Error reabriendo escuela:', error);
        showToast('Error al reabrir la escuela', 'error');
    }
}

// ═══════════════════════════════════════════════════════════════
// HISTORIAL
// ═══════════════════════════════════════════════════════════════

async function loadShutdownHistory() {
    try {
        const response = await fetchWithAuth(`${API_URL}/api/superadmin/system/history`, {});
        const data = await response.json();
        if (data.success) {
            shutdownHistory = data.history || [];
            renderShutdownHistory();
        }
    } catch (error) {
        console.error('Error cargando historial:', error);
    }
}

function renderShutdownHistory() {
    const container = document.getElementById('shutdownHistory');
    if (!container) return;

    if (!shutdownHistory || shutdownHistory.length === 0) {
        container.innerHTML = `
            <p style="text-align:center;color:var(--col-text-3);padding:2rem;font-size:.875rem;">
                <i class="fas fa-inbox" style="display:block;font-size:2rem;margin-bottom:var(--sp-3);opacity:0.3;"></i>
                No hay registros de cambios
            </p>`;
        return;
    }

    const actionLabels = {
        'close_global': { label: '🔒 Cierre Global', cssClass: 'status-closed' },
        'open_global': { label: '🔓 Apertura Global', cssClass: 'status-opened' },
        'close_school': { label: '🔒 Cierre de Escuela', cssClass: 'status-closed' },
        'open_school': { label: '🔓 Apertura de Escuela', cssClass: 'status-opened' },
    };

    container.innerHTML = shutdownHistory.map(h => {
        const actionInfo = actionLabels[h.action] || { label: h.action, cssClass: '' };
        let extraInfo = '';
        if (h.action === 'close_school' || h.action === 'open_school') {
            const schoolInfo = schoolsList.find(s => s.schoolId === h.targetSchoolId);
            const displayName = schoolInfo?.displayName || h.targetSchoolId || '—';
            extraInfo = `
                <div style="font-family:var(--font-mono);font-size:0.68rem;color:var(--col-cyan);margin-top:var(--sp-1);">
                    <i class="fas fa-school"></i> Escuela: ${escapeHtml(displayName)}
                </div>`;
        }
        return `
        <div class="history-item-admin">
            <div class="history-info">
                <div class="history-date"><i class="fas fa-calendar"></i> ${formatDate(h.createdAt)}</div>
                <div class="history-reason">
                    <strong style="color:var(--col-text-2);">Motivo:</strong>
                    ${escapeHtml(h.reason || 'Sin motivo especificado')}
                </div>
                ${extraInfo}
            </div>
            <span class="history-status ${actionInfo.cssClass}">${actionInfo.label}</span>
        </div>`;
    }).join('');
}

// ── Exponer globalmente ─────────────────────────────────────
window.loadSystemStatus     = loadSystemStatus;
window.closeSystemGlobal    = closeSystemGlobal;
window.openSystemGlobal     = openSystemGlobal;
window.closeSchoolSystem    = closeSchoolSystem;
window.openSchoolSystem     = openSchoolSystem;
window.reopenSingleSchool   = reopenSingleSchool;
window.closeSystem          = closeSystemGlobal;
window.openSystem           = openSystemGlobal;

// =============================================================
// SUGERENCIAS
// =============================================================
function createSugerenciasSection() {
    setupSugerenciasFilters();
}

function setupSugerenciasFilters() {
    const filterEstado    = document.getElementById('filterEstado');
    const filterCategoria = document.getElementById('filterCategoria');
    if (filterEstado) {
        filterEstado.addEventListener('change', () => {
            currentEstado = filterEstado.value;
            loadSuggestionsPage(1);
        });
    }
    if (filterCategoria) {
        filterCategoria.addEventListener('change', () => {
            currentCategoria = filterCategoria.value;
            loadSuggestionsPage(1);
        });
    }
}

async function loadSuggestionsPage(page = 1) {
    const container = document.getElementById('sugerenciasList');
    if (!container) return;
    container.innerHTML = '<div class="sa-loader" style="padding:3rem;justify-content:center;"><span></span><span></span><span></span></div>';

    try {
        const url = `${API_URL}/api/suggestions/admin/all?page=${page}&limit=20&estado=${currentEstado}&categoria=${currentCategoria}`;
        const response = await fetchWithAuth(url, {});
        const data = await response.json();
        if (data.success) {
            currentSuggestions     = data.suggestions;
            currentSuggestionsPage = data.pagination.page;
            totalSuggestionsPages  = data.pagination.pages;
            renderSuggestionsList();
            renderSuggestionsPagination();
            loadSuggestionsStats();
        } else {
            container.innerHTML = '<p class="error">Error cargando sugerencias</p>';
        }
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = '<p class="error">Error de conexión</p>';
    }
}

async function loadSuggestionsStats() {
    try {
        const response = await fetchWithAuth(`${API_URL}/api/suggestions/admin/stats`, {});
        const data = await response.json();
        if (data.success) {
            ['Total','Pendientes','Vistas','Implementadas'].forEach((k, i) => {
                const ids = ['statTotal','statPendientes','statVistas','statImplementadas'];
                const el = document.getElementById(ids[i]);
                const vals = [data.stats.total, data.stats.pendientes, data.stats.vistas, data.stats.implementadas];
                if (el) el.textContent = vals[i];
            });
        }
    } catch (error) { console.error('Error cargando estadísticas:', error); }
}

function renderSuggestionsList() {
    const container = document.getElementById('sugerenciasList');
    if (!container) return;

    if (currentSuggestions.length === 0) {
        container.innerHTML = `
            <div class="sa-empty">
                <i class="fas fa-inbox"></i>
                <p>No hay sugerencias para mostrar</p>
            </div>
        `;
        return;
    }

    const estadoTexto = { pendiente: 'Pendiente', vista: 'Vista', considerando: 'En consideración', implementada: 'Implementada', rechazada: 'Rechazada' };
    const estadoIcono = { pendiente: '⏳', vista: '👁', considerando: '🤔', implementada: '✅', rechazada: '❌' };

    container.innerHTML = currentSuggestions.map(s => `
        <div class="sugerencia-card ${s.estado}" data-suggestion-id="${s.id}">
            <div class="sugerencia-card__header">
                <span class="sugerencia-card__number">${s.suggestionNumber}</span>
                <span class="sugerencia-card__estado ${s.estado}">
                    ${estadoIcono[s.estado]} ${estadoTexto[s.estado]}
                </span>
            </div>
            <div class="sugerencia-card__titulo">${escapeHtml(s.titulo)}</div>
            <div class="sugerencia-card__usuario">
                <i class="fas fa-user-circle"></i> ${escapeHtml(s.usuario.nombre)}
                ${s.tieneAdjuntos ? '<i class="fas fa-paperclip" title="Tiene archivos adjuntos" style="color:var(--col-amber);"></i>' : ''}
            </div>
            <div class="sugerencia-card__footer">
                <span class="sugerencia-card__fecha">
                    <i class="fas fa-calendar"></i> ${new Date(s.fechaEnvio).toLocaleDateString('es-MX')}
                </span>
                <span class="sugerencia-card__categoria">${getCategoriaTexto(s.categoria)}</span>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.sugerencia-card').forEach(card => {
        const newCard = card.cloneNode(true);
        card.parentNode.replaceChild(newCard, card);
        newCard.addEventListener('click', (e) => {
            if (e.target.closest('.btn')) return;
            const id = newCard.dataset.suggestionId;
            if (id) window.viewSuggestionDetail(id);
        });
    });
}

function renderSuggestionsPagination() {
    const container = document.getElementById('sugerenciasPagination');
    if (!container) return;
    if (totalSuggestionsPages <= 1) { container.innerHTML = ''; return; }

    let html = '<div class="pagination">';
    html += `<button class="pagination-btn" onclick="loadSuggestionsPage(${currentSuggestionsPage - 1})" ${currentSuggestionsPage === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>`;
    for (let i = 1; i <= Math.min(totalSuggestionsPages, 5); i++) {
        html += `<button class="pagination-btn ${currentSuggestionsPage === i ? 'active' : ''}" onclick="loadSuggestionsPage(${i})">${i}</button>`;
    }
    html += `<button class="pagination-btn" onclick="loadSuggestionsPage(${currentSuggestionsPage + 1})" ${currentSuggestionsPage === totalSuggestionsPages ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>`;
    html += '</div>';
    container.innerHTML = html;
}

window.loadSuggestionsPage = (page) => loadSuggestionsPage(page);

window.viewSuggestionDetail = async (id) => {
    if (!id) { showToast('ID de sugerencia no válido', 'error'); return; }

    try {
        const response = await fetchWithAuth(`${API_URL}/api/suggestions/admin/${id}`, {});
        const data = await response.json();

        if (data.success) {
            const s = data.suggestion;
            currentSuggestionId = s._id || s.id;

            await fetchWithAuth(`${API_URL}/api/suggestions/admin/${id}/view`, { method: 'PATCH' });

            let attachmentsHtml = '';
            if (s.attachments && s.attachments.length > 0) {
                attachmentsHtml = `
                    <div class="sugerencia-detail__attachments">
                        <h4><i class="fas fa-paperclip" style="color:var(--col-cyan);margin-right:.4rem;"></i>Archivos adjuntos (${s.attachments.length})</h4>
                        <div class="attachment-list">
                            ${s.attachments.map(a => `
                                <div class="attachment-item">
                                    <img src="${a.cloudinary_url}" alt="${a.originalname}">
                                    <div>
                                        <div style="font-weight:600;font-size:.82rem;">${escapeHtml(a.originalname)}</div>
                                        <small style="color:var(--col-text-3);">${(a.size/1024).toFixed(1)} KB</small><br>
                                        <a href="${a.cloudinary_url}" target="_blank">Ver imagen →</a>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }

            const modalContent = `
                <div class="sugerencia-detail">
                    <div class="sugerencia-detail__header">
                        <div class="sugerencia-detail__number">${s.suggestionNumber}</div>
                        <div class="sugerencia-detail__titulo">${escapeHtml(s.titulo)}</div>
                        <div class="sugerencia-detail__usuario">
                            <span><i class="fas fa-user"></i> ${escapeHtml(s.usuario.nombre)}</span>
                            <span><i class="fas fa-envelope"></i> ${escapeHtml(s.usuario.email)}</span>
                            <span><i class="fas fa-id-badge"></i> ${escapeHtml(s.usuario.rol)}</span>
                        </div>
                    </div>
                    <div class="sugerencia-detail__descripcion">
                        <strong style="color:var(--col-text-2);">Descripción:</strong>
                        <p style="margin-top:.5rem;white-space:pre-wrap;line-height:1.6;">${escapeHtml(s.descripcion)}</p>
                    </div>
                    ${attachmentsHtml}
                    <div class="sugerencia-detail__actions">
                        <select id="detailStatusSelect" class="sa-select" style="max-width:220px;">
                            <option value="pendiente"   ${s.estado==='pendiente'   ?'selected':''}>⏳ Pendiente</option>
                            <option value="vista"       ${s.estado==='vista'       ?'selected':''}>👁 Vista</option>
                            <option value="considerando"${s.estado==='considerando'?'selected':''}>🤔 En consideración</option>
                            <option value="implementada"${s.estado==='implementada'?'selected':''}>✅ Implementada</option>
                            <option value="rechazada"   ${s.estado==='rechazada'   ?'selected':''}>❌ Rechazada</option>
                        </select>
                        <button class="sa-btn sa-btn--primary sa-btn--sm" onclick="updateSuggestionStatus()">
                            <i class="fas fa-floppy-disk"></i> Actualizar
                        </button>
                        <button class="sa-btn sa-btn--danger sa-btn--sm" onclick="deleteSuggestion('${s.suggestionNumber}')">
                            <i class="fas fa-trash-can"></i> Eliminar
                        </button>
                    </div>
                </div>
            `;

            const detailContent = document.getElementById('suggestionDetailContent');
            if (detailContent) detailContent.innerHTML = modalContent;

            const modal = document.getElementById('suggestionDetailModal');
            if (modal) {
                modal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
                // Reset scroll
                const modalBody = modal.querySelector('.sa-modal__body');
                if (modalBody) modalBody.scrollTop = 0;
            }

            loadSuggestionsPage(currentSuggestionsPage);
            loadSuggestionsStats();
        } else {
            showToast(data.message || 'Error al cargar detalle', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error al cargar detalle', 'error');
    }
};

window.updateSuggestionStatus = async () => {
    const id = currentSuggestionId;
    if (!id) { showToast('ID no válido', 'error'); return; }

    const select = document.getElementById('detailStatusSelect');
    if (!select) { showToast('Selector de estado no encontrado', 'error'); return; }

    try {
        const response = await fetchWithAuth(`${API_URL}/api/suggestions/admin/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: select.value })
        });
        const data = await response.json();
        if (data.success) {
            showToast('Estado actualizado', 'success');
            closeSuggestionDetailModal();
            loadSuggestionsPage(currentSuggestionsPage);
            loadSuggestionsStats();
        } else showToast(data.message || 'Error al actualizar estado', 'error');
    } catch (error) { showToast('Error al actualizar estado', 'error'); }
};

window.deleteSuggestion = async (number) => {
    const id = currentSuggestionId;
    if (!id) { showToast('ID no válido', 'error'); return; }

    // ===== REEMPLAZO DE confirm() POR MODAL PERSONALIZADO =====
    const confirmed = await showConfirmModal({
        message: `¿Eliminar la sugerencia ${number}?`,
        subtext: 'Esta acción no se puede deshacer.',
        title: 'Eliminar Sugerencia',
        confirmText: 'Eliminar',
        confirmType: 'danger'
    });
    if (!confirmed) return;
    // ===== FIN REEMPLAZO =====

    try {
        const response = await fetchWithAuth(`${API_URL}/api/suggestions/admin/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if (data.success) {
            showToast('Sugerencia eliminada', 'success');
            closeSuggestionDetailModal();
            loadSuggestionsPage(currentSuggestionsPage);
            loadSuggestionsStats();
        } else showToast(data.message || 'Error al eliminar', 'error');
    } catch (error) { showToast('Error al eliminar', 'error'); }
};

window.closeSuggestionDetailModal = () => {
    const modal = document.getElementById('suggestionDetailModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
    currentSuggestionId = null;
};

function getCategoriaTexto(categoria) {
    const textos = {
        mejora:              '✨ Mejora',
        nueva_funcionalidad: '🚀 Nueva func.',
        reporte_error:       '🐛 Error',
        experiencia_usuario: '🎨 UX',
        rendimiento:         '⚡ Rendimiento',
        seguridad:           '🔒 Seguridad',
        otros:               '📌 Otros'
    };
    return textos[categoria] || categoria;
}

// =============================================================
// INVITACIONES
// =============================================================
const API_INVITATIONS = '/api/superadmin/invitations';

function openInvitationModal() {
    const modal = document.getElementById('invitationModal');
    if (modal) {
        document.getElementById('inviteEmail').value      = '';
        document.getElementById('inviteSchoolName').value = '';
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        const modalBody = modal.querySelector('.sa-modal__body');
        if (modalBody) modalBody.scrollTop = 0;
    }
}

function closeInvitationModal() {
    const modal = document.getElementById('invitationModal');
    if (modal) { modal.style.display = 'none'; document.body.style.overflow = ''; }
}

async function sendInvitation() {
    const email      = document.getElementById('inviteEmail')?.value?.trim();
    const schoolName = document.getElementById('inviteSchoolName')?.value?.trim();

    if (!email)      { showToast('El email es obligatorio', 'error'); return; }
    if (!schoolName) { showToast('El nombre de la escuela es obligatorio', 'error'); return; }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { showToast('Formato de email inválido', 'error'); return; }

    try {
        const response = await fetchWithAuth(`${API_URL}${API_INVITATIONS}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, schoolName })
        });
        const data = await response.json();
        if (data.success) {
            showToast(`✓ Invitación enviada a ${email}`, 'success');
            closeInvitationModal();
            loadInvitations();
        } else showToast(data.message || 'Error al enviar invitación', 'error');
    } catch (error) {
        console.error('Error enviando invitación:', error);
        showToast('Error de conexión al enviar invitación', 'error');
    }
}

async function loadInvitations() {
    const container = document.getElementById('invitationsList');
    if (!container) return;
    container.innerHTML = '<div class="sa-loader"><span></span><span></span><span></span></div>';

    try {
        const status = document.getElementById('filterInvitationStatus')?.value || '';
        const url    = status ? `${API_URL}${API_INVITATIONS}?status=${status}` : `${API_URL}${API_INVITATIONS}`;
        const response = await fetchWithAuth(url, {});
        const data = await response.json();
        if (data.success) renderInvitations(data.invitations || []);
        else container.innerHTML = '<p class="error">Error al cargar invitaciones</p>';
    } catch (error) {
        console.error('Error cargando invitaciones:', error);
        container.innerHTML = '<p class="error">Error de conexión</p>';
    }
}

function renderInvitations(invitations) {
    const container = document.getElementById('invitationsList');
    if (!container) return;

    if (!invitations || invitations.length === 0) {
        container.innerHTML = `
            <div class="sa-empty" style="grid-column:1/-1;">
                <i class="fas fa-envelope-open-text"></i>
                <p>No hay invitaciones registradas</p>
                <button class="sa-btn sa-btn--primary" onclick="openInvitationModal()" style="margin-top:1rem;">
                    <i class="fas fa-paper-plane"></i> Enviar primera invitación
                </button>
            </div>
        `;
        return;
    }

    const statusColors = { pending:'#fbbf24', used:'#34d399', expired:'#64748b', revoked:'#f87171' };
    const statusIcons  = { pending:'⏳', used:'✅', expired:'⏰', revoked:'🚫' };
    const statusText   = { pending:'Pendiente', used:'Usada', expired:'Expirada', revoked:'Revocada' };

    container.innerHTML = invitations.map(inv => `
        <div class="version-card ${(inv.status === 'revoked' || inv.status === 'expired') ? 'inactive' : ''}">
            <div class="version-card-header">
                <div class="version-info">
                    <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.5rem;">
                        <span style="font-size:1.3rem;">${statusIcons[inv.status] || '📧'}</span>
                        <span class="version-badge" style="background:${statusColors[inv.status]}22;color:${statusColors[inv.status]};border:1px solid ${statusColors[inv.status]}44;">
                            ${statusText[inv.status] || inv.status}
                        </span>
                    </div>
                    <div class="version-title">${escapeHtml(inv.schoolName)}</div>
                    <div class="version-meta">
                        <span><i class="fas fa-envelope"></i> ${escapeHtml(inv.email)}</span>
                        <span><i class="fas fa-fingerprint"></i> ${inv.schoolId}</span>
                    </div>
                </div>
            </div>
            <div class="version-description">
                <p><strong style="color:var(--col-text-2);">Creada:</strong> ${formatDate(inv.createdAt)}</p>
                <p><strong style="color:var(--col-text-2);">Expira:</strong> ${formatDate(inv.expiresAt)}</p>
                ${inv.createdUserId ? `<p><strong style="color:var(--col-text-2);">Usuario:</strong> ${escapeHtml(inv.createdUserId.usuario || 'N/A')}</p>` : ''}
                ${inv.usedAt       ? `<p><strong style="color:var(--col-text-2);">Usada el:</strong> ${formatDate(inv.usedAt)}</p>` : ''}
            </div>
            ${inv.status === 'pending' ? `
            <div class="version-actions">
                <button class="btn-delete" onclick="revokeInvitation('${inv._id}', '${escapeHtml(inv.email)}')">
                    <i class="fas fa-ban"></i> Revocar
                </button>
            </div>` : ''}
        </div>
    `).join('');
}

async function revokeInvitation(id, email) {
    // ===== REEMPLAZO DE confirm() POR MODAL PERSONALIZADO =====
    const confirmed = await showConfirmModal({
        message: `¿Revocar la invitación de ${email}?`,
        subtext: 'El token dejará de ser válido inmediatamente.',
        title: 'Revocar Invitación',
        confirmText: 'Revocar',
        confirmType: 'danger'
    });
    if (!confirmed) return;
    // ===== FIN REEMPLAZO =====

    try {
        const response = await fetchWithAuth(`${API_URL}${API_INVITATIONS}/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if (data.success) { showToast('Invitación revocada', 'success'); loadInvitations(); }
        else showToast(data.message || 'Error al revocar', 'error');
    } catch (error) {
        console.error('Error revocando invitación:', error);
        showToast('Error al revocar invitación', 'error');
    }
}

// =============================================================
// LOGOUT
// =============================================================
async function logout() {
    if (refreshTimeout) clearTimeout(refreshTimeout);
    try {
        await fetch(`${API_URL}/api/auth/logout`,      { method: 'POST', credentials: 'include' });
        await fetch(`${API_URL}/api/superadmin/logout`, { method: 'POST', credentials: 'include' });
    } catch (e) {}

    ['token','superAdminToken','user','userRole'].forEach(k => localStorage.removeItem(k));
    window.location.href = '/login.html';
}

// =============================================================
// EXPONER FUNCIONES GLOBALMENTE
// =============================================================
window.logout              = logout;
window.loadVersions        = loadVersions;
window.openCreateVersionModal = openCreateVersionModal;
window.editVersion         = editVersion;
window.setCurrentVersion   = setCurrentVersion;
window.deleteVersion       = deleteVersion;
window.closeVersionModal   = closeVersionModal;
window.saveVersion         = saveVersion;
window.addCambio           = addCambio;
window.removeCambio        = removeCambio;
window.closeSystem         = closeSystem;
window.openSystem          = openSystem;

window.openInvitationModal  = openInvitationModal;
window.closeInvitationModal = closeInvitationModal;
window.sendInvitation       = sendInvitation;
window.loadInvitations      = loadInvitations;
window.revokeInvitation     = revokeInvitation;

// =============================================================
// INICIALIZACIÓN
// =============================================================
document.addEventListener('DOMContentLoaded', () => {
    const token = getToken();
    if (!token) { window.location.href = '/login.html'; return; }

    createSugerenciasSection();

    try {
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
        if (payload.exp) {
            const expiresIn = (payload.exp * 1000) - Date.now();
            if (expiresIn > 0) {
                scheduleTokenRefresh(expiresIn);
                console.log(`⏰ Token válido por ${Math.floor(expiresIn/60000)} min`);
            }
        }
    } catch (e) { console.warn('No se pudo decodificar token:', e); }

    try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user?.usuario) {
            const el = document.getElementById('userName');
            if (el) el.textContent = user.usuario;
        }
    } catch (e) {}

    document.querySelectorAll('.sa-nav__item, .nav-item').forEach(item => {
        item.addEventListener('click', () => switchSection(item.dataset.section));
    });

    document.addEventListener('click', (e) => {
        const sidebar    = document.getElementById('sidebar');
        const menuToggle = document.getElementById('menuToggle');
        if (sidebar?.classList.contains('sa-sidebar--open') &&
            !sidebar.contains(e.target) &&
            !menuToggle?.contains(e.target)) {
            sidebar.classList.remove('sa-sidebar--open');
        }
    });

    switchSection('versions');

    setInterval(async () => {
        try {
            await fetchWithAuth(`${API_URL}/api/superadmin/verify`, {});
        } catch (e) { console.warn('Heartbeat falló:', e); }
    }, 5 * 60 * 1000);
});