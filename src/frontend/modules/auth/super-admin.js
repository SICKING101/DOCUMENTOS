// src/frontend/modules/auth/super-admin.js

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

// =============================================================
// SUGERENCIAS - Variables de estado
// =============================================================
let currentSuggestions = [];
let currentSuggestionsPage = 1;
let totalSuggestionsPages = 1;
let currentEstado = 'todos';
let currentCategoria = 'todas';
let currentSuggestionId = null; // Variable global para el ID de la sugerencia actual

// =============================================================
// MANEJO DE TOKEN EXPIRADO Y REFRESH AUTOMÁTICO
// =============================================================

let refreshTimeout;
let isRefreshing = false;

function getToken() {
    return localStorage.getItem('superAdminToken') || localStorage.getItem('token');
}

function scheduleTokenRefresh(expiresInMs) {
    if (refreshTimeout) {
        clearTimeout(refreshTimeout);
    }
    
    const refreshTime = Math.max(expiresInMs - (5 * 60 * 1000), 0);
    
    if (refreshTime > 0) {
        refreshTimeout = setTimeout(() => {
            refreshSuperAdminToken();
        }, refreshTime);
        console.log(`⏰ Token refresh programado en ${Math.floor(refreshTime / 60000)} minutos`);
    }
}

async function refreshSuperAdminToken() {
    if (isRefreshing) return;
    isRefreshing = true;
    
    try {
        console.log('🔄 Intentando refrescar token de superadmin...');
        
        const response = await fetch(`${API_URL}/api/superadmin/refresh`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`
            },
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.token) {
                localStorage.setItem('superAdminToken', data.token);
                console.log('✅ Token de superadmin refrescado exitosamente');
                
                if (data.expiresIn) {
                    scheduleTokenRefresh(data.expiresIn);
                }
                return true;
            }
        }
        
        console.warn('⚠️ No se pudo refrescar token');
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
    
    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };
    
    try {
        const response = await fetch(url, { ...options, headers, credentials: 'include' });
        
        if (response.status === 401) {
            console.log('⚠️ Token expirado, intentando refrescar...');
            
            const refreshed = await refreshSuperAdminToken();
            
            if (refreshed) {
                const newToken = getToken();
                const newHeaders = {
                    ...options.headers,
                    'Authorization': `Bearer ${newToken}`
                };
                const retryResponse = await fetch(url, { ...options, headers: newHeaders, credentials: 'include' });
                
                if (retryResponse.ok) {
                    return retryResponse;
                }
            }
            
            console.error('❌ No se pudo refrescar la sesión');
            await logout();
            throw new Error('Sesión expirada');
        }
        
        return response;
    } catch (error) {
        if (error.message === 'Sesión expirada') {
            window.location.href = '/login.html';
        }
        throw error;
    }
}

// =============================================================
// UTILIDADES
// =============================================================
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.style.borderLeftColor = type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--warning)';
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        ${message}
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function formatDate(dateString) {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// =============================================================
// AVISOS - Funciones CRUD
// =============================================================

async function loadAvisos(page = 1) {
    const container = document.getElementById('avisosList');
    if (!container) return;
    
    container.innerHTML = '<div class="loading-spinner" style="margin: 2rem auto;"></div>';
    
    try {
        const activo = document.getElementById('filterAvisoActivo')?.value || '';
        const tipo = document.getElementById('filterAvisoTipo')?.value || '';
        
        const filters = {};
        if (activo !== '') filters.activo = activo;
        if (tipo !== '') filters.tipo = tipo;
        
        const result = await avisoService.getAllAvisos(page, filters);
        
        if (result.success) {
            currentAvisos = result.avisos || [];
            currentAvisosPage = result.pagination?.page || 1;
            totalAvisosPages = result.pagination?.pages || 1;
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
            <div class="version-card" style="text-align: center; padding: 3rem; grid-column: 1/-1;">
                <i class="fas fa-bullhorn" style="font-size: 3rem; color: var(--text-tertiary);"></i>
                <p>No hay avisos registrados</p>
                <button class="create-version-btn" onclick="openAvisoModal()" style="margin-top: 1rem;">
                    <i class="fas fa-plus-circle"></i> Crear primer aviso
                </button>
            </div>
        `;
        return;
    }
    
    const prioridadColor = { baja: '#10b981', media: '#f59e0b', alta: '#f97316', critica: '#ef4444' };
    const tipoIcon = { general: '📢', mantenimiento: '🔧', importante: '⭐', actualizacion: '🔄', evento: '📅' };
    
    container.innerHTML = currentAvisos.map(a => {
        // Formatear fechas usando UTC para evitar desplazamiento
        const fechaInicioStr = a.fechaInicio ? new Date(a.fechaInicio).toLocaleDateString('es-MX', {
            year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
        }) : '—';
        
        const fechaFinStr = a.fechaFin ? new Date(a.fechaFin).toLocaleDateString('es-MX', {
            year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
        }) : '—';
        
        return `
        <div class="version-card ${!a.activo ? 'inactive' : ''}" style="position: relative;">
            ${!a.activo ? '<span class="version-badge badge-deprecada" style="position: absolute; top: 1rem; right: 1rem;">Inactivo</span>' : ''}
            <div class="version-card-header">
                <div class="version-info">
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                        <span style="font-size: 1.5rem;">${tipoIcon[a.tipo] || '📢'}</span>
                        <span class="version-badge" style="background: ${prioridadColor[a.prioridad]}; color: white;">${a.prioridad.toUpperCase()}</span>
                    </div>
                    <div class="version-title">${escapeHtml(a.titulo)}</div>
                    <div class="version-meta">
                        <span><i class="fas fa-calendar"></i> ${fechaInicioStr} - ${fechaFinStr}</span>
                        <span><i class="fas fa-eye"></i> Visto por ${a.vistoPor?.length || 0} usuarios</span>
                    </div>
                </div>
            </div>
            
            <div class="version-description" style="white-space: pre-line; line-height: 1.6; margin: 1rem 0;">
                ${escapeHtml(a.descripcion)}
            </div>
            
            <div class="version-actions">
                <button class="btn-edit" onclick="editAviso('${a._id}')">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn-delete" onclick="deleteAviso('${a._id}', '${escapeHtml(a.titulo)}')">
                    <i class="fas fa-trash"></i> Eliminar
                </button>
            </div>
        </div>
    `;
    }).join('');
}

function renderAvisosPagination() {
    const container = document.getElementById('avisosPagination');
    if (!container) return;
    
    if (totalAvisosPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '<div class="pagination" style="justify-content: center; margin-top: 2rem;">';
    html += `<button class="pagination-btn" onclick="loadAvisos(${currentAvisosPage - 1})" ${currentAvisosPage === 1 ? 'disabled' : ''}>Anterior</button>`;
    html += `<span style="margin: 0 1rem;">Página ${currentAvisosPage} de ${totalAvisosPages}</span>`;
    html += `<button class="pagination-btn" onclick="loadAvisos(${currentAvisosPage + 1})" ${currentAvisosPage === totalAvisosPages ? 'disabled' : ''}>Siguiente</button>`;
    html += '</div>';
    
    container.innerHTML = html;
}

function openAvisoModal(aviso = null) {
    const modal = document.getElementById('avisoModal');
    const title = document.getElementById('avisoModalTitle');
    
    if (aviso) {
        title.innerHTML = '<i class="fas fa-edit"></i> Editar Aviso';
        document.getElementById('avisoTitulo').value = aviso.titulo || '';
        document.getElementById('avisoDescripcion').value = aviso.descripcion || '';
        document.getElementById('avisoTipo').value = aviso.tipo || 'general';
        document.getElementById('avisoPrioridad').value = aviso.prioridad || 'media';
        document.getElementById('avisoActivo').checked = aviso.activo !== false;
        
        // Usar UTC para obtener la fecha correcta sin desplazamiento
        if (aviso.fechaInicio) {
            const fecha = new Date(aviso.fechaInicio);
            const year = fecha.getUTCFullYear();
            const month = String(fecha.getUTCMonth() + 1).padStart(2, '0');
            const day = String(fecha.getUTCDate()).padStart(2, '0');
            document.getElementById('avisoFechaInicio').value = `${year}-${month}-${day}`;
        }
        if (aviso.fechaFin) {
            const fecha = new Date(aviso.fechaFin);
            const year = fecha.getUTCFullYear();
            const month = String(fecha.getUTCMonth() + 1).padStart(2, '0');
            const day = String(fecha.getUTCDate()).padStart(2, '0');
            document.getElementById('avisoFechaFin').value = `${year}-${month}-${day}`;
        }
        
        editingAvisoId = aviso._id;
    } else {
        title.innerHTML = '<i class="fas fa-plus-circle"></i> Nuevo Aviso';
        document.getElementById('avisoTitulo').value = '';
        document.getElementById('avisoDescripcion').value = '';
        document.getElementById('avisoTipo').value = 'general';
        document.getElementById('avisoPrioridad').value = 'media';
        document.getElementById('avisoActivo').checked = true;
        
        const now = new Date();
        const later = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        document.getElementById('avisoFechaInicio').value = now.toISOString().split('T')[0];
        document.getElementById('avisoFechaFin').value = later.toISOString().split('T')[0];
        
        editingAvisoId = null;
    }
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeAvisoModal() {
    const modal = document.getElementById('avisoModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
    editingAvisoId = null;
}

async function saveAviso() {
    const titulo = document.getElementById('avisoTitulo')?.value?.trim();
    const descripcion = document.getElementById('avisoDescripcion')?.value?.trim();
    const tipo = document.getElementById('avisoTipo')?.value;
    const prioridad = document.getElementById('avisoPrioridad')?.value;
    const fechaInicio = document.getElementById('avisoFechaInicio')?.value;
    const fechaFin = document.getElementById('avisoFechaFin')?.value;
    const activo = document.getElementById('avisoActivo')?.checked;
    
    if (!titulo) { showToast('El título es obligatorio', 'error'); return; }
    if (!descripcion) { showToast('La descripción es obligatoria', 'error'); return; }
    if (!fechaInicio) { showToast('La fecha de inicio es obligatoria', 'error'); return; }
    if (!fechaFin) { showToast('La fecha de fin es obligatoria', 'error'); return; }
    
    // Validación con strings YYYY-MM-DD
    const hoy = new Date();
    const hoyStr = hoy.getFullYear() + '-' + 
                   String(hoy.getMonth() + 1).padStart(2, '0') + '-' + 
                   String(hoy.getDate()).padStart(2, '0');
    
    if (fechaInicio < hoyStr) {
        showToast('❌ La fecha de inicio no puede ser anterior a hoy', 'error');
        return;
    }
    
    if (fechaFin < fechaInicio) {
        showToast('❌ La fecha de fin debe ser igual o posterior a la fecha de inicio', 'error');
        return;
    }
    
    const data = { titulo, descripcion, tipo, prioridad, fechaInicio, fechaFin, activo };
    
    try {
        const result = editingAvisoId 
            ? await avisoService.updateAviso(editingAvisoId, data)
            : await avisoService.createAviso(data);
        
        if (result.success) {
            showToast(editingAvisoId ? '✅ Aviso actualizado' : '✅ Aviso creado exitosamente', 'success');
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
            if (aviso) {
                openAvisoModal(aviso);
            } else {
                showToast('Aviso no encontrado', 'error');
            }
        }
    } catch (error) {
        console.error('Error cargando aviso:', error);
        showToast('Error al cargar aviso', 'error');
    }
}

async function deleteAviso(id, titulo) {
    if (!confirm(`¿Eliminar el aviso "${titulo}"?\nEsta acción no se puede deshacer.`)) return;
    
    try {
        const result = await avisoService.deleteAviso(id);
        if (result.success) {
            showToast('Aviso eliminado', 'success');
            loadAvisos(currentAvisosPage);
        } else {
            showToast(result.message || 'Error al eliminar', 'error');
        }
    } catch (error) {
        console.error('Error eliminando aviso:', error);
        showToast('Error al eliminar aviso', 'error');
    }
}

// Exponer funciones de avisos globalmente
window.loadAvisos = loadAvisos;
window.openAvisoModal = () => openAvisoModal(null);
window.closeAvisoModal = closeAvisoModal;
window.saveAviso = saveAviso;
window.editAviso = editAviso;
window.deleteAviso = deleteAviso;

// =============================================================
// NAVEGACIÓN
// =============================================================
function switchSection(section) {
    currentSection = section;

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === section) {
            item.classList.add('active');
        }
    });

    const versionsSection = document.getElementById('versionsSection');
    const avisosSection = document.getElementById('avisosSection');
    const sugerenciasSection = document.getElementById('sugerenciasSection');
    const invitationsSection = document.getElementById('invitationsSection'); // 🆕
    const shutdownSection = document.getElementById('shutdownSection');
    
    const pageTitle = document.getElementById('pageTitle');
    const pageDescription = document.getElementById('pageDescription');

    // Ocultar TODAS
    if (versionsSection) versionsSection.classList.add('hidden');
    if (avisosSection) avisosSection.classList.add('hidden');
    if (sugerenciasSection) sugerenciasSection.classList.add('hidden');
    if (invitationsSection) invitationsSection.classList.add('hidden'); // 🆕
    if (shutdownSection) shutdownSection.classList.add('hidden');

    // Mostrar según sección
    if (section === 'versions') {
        if (versionsSection) versionsSection.classList.remove('hidden');
        if (pageTitle) pageTitle.textContent = 'Panel de Versiones';
        if (pageDescription) pageDescription.textContent = 'Gestiona las versiones del sistema';
        loadVersions();
    } else if (section === 'avisos') {
        if (avisosSection) avisosSection.classList.remove('hidden');
        if (pageTitle) pageTitle.textContent = 'Gestión de Avisos';
        if (pageDescription) pageDescription.textContent = 'Administra los avisos del sistema';
        loadAvisos();
    } else if (section === 'sugerencias') {
        if (sugerenciasSection) sugerenciasSection.classList.remove('hidden');
        if (pageTitle) pageTitle.textContent = 'Bandeja de Sugerencias';
        if (pageDescription) pageDescription.textContent = 'Gestiona las sugerencias de los usuarios';
        loadSuggestionsPage();
        loadSuggestionsStats();
    } 
    // ===== 🆕 NUEVO CASE =====
    else if (section === 'invitations') {
        if (invitationsSection) invitationsSection.classList.remove('hidden');
        if (pageTitle) pageTitle.textContent = 'Invitaciones';
        if (pageDescription) pageDescription.textContent = 'Envía invitaciones para nuevos administradores';
        loadInvitations();
    } 
    else if (section === 'shutdown') {
        if (shutdownSection) shutdownSection.classList.remove('hidden');
        if (pageTitle) pageTitle.textContent = 'Cierre del Sistema';
        if (pageDescription) pageDescription.textContent = 'Controla la disponibilidad del sistema';
        loadSystemStatus();
    }
}

// =============================================================
// PANEL DE VERSIONES
// =============================================================
async function loadVersions() {
    const container = document.getElementById('versionsList');
    try {
        const response = await fetchWithAuth(`${API_URL}/api/versions`, {
            credentials: 'include'
        });

        if (!response.ok) throw new Error('Error al cargar versiones');
        const data = await response.json();

        if (data.success) {
            versionsData = data.versions;
            renderVersions(versionsData);
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = `
            <div class="version-card" style="text-align: center; padding: 3rem;">
                <i class="fas fa-exclamation-circle" style="font-size: 3rem; color: var(--danger);"></i>
                <p>Error al cargar versiones: ${error.message}</p>
                <button class="btn-edit" onclick="window.loadVersions()">Reintentar</button>
            </div>
        `;
    }
}

function renderVersions(versions) {
    const container = document.getElementById('versionsList');

    if (!versions.length) {
        container.innerHTML = `
            <div class="version-card" style="text-align: center; padding: 3rem;">
                <i class="fas fa-code-branch" style="font-size: 3rem; color: var(--text-tertiary);"></i>
                <p>No hay versiones publicadas aún</p>
                <button class="create-version-btn" onclick="window.openCreateVersionModal()" style="margin-top: 1rem;">
                    Publicar primera versión
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = versions.map(v => renderVersionCard(v)).join('');
}

function renderVersionCard(v) {
    const isCurrent = v.esActual;
    const estadoClass = {
        'estable': 'badge-estable',
        'beta': 'badge-beta',
        'desarrollo': 'badge-desarrollo',
        'deprecada': 'badge-deprecada'
    }[v.estado] || 'badge-estable';

    const estadoText = {
        'estable': 'Estable',
        'beta': 'Beta',
        'desarrollo': 'Desarrollo',
        'deprecada': 'Deprecada'
    }[v.estado] || v.estado;

    const tagClass = {
        'nuevo': 'tag-nuevo',
        'mejora': 'tag-mejora',
        'correccion': 'tag-correccion',
        'eliminado': 'tag-eliminado',
        'seguridad': 'tag-seguridad',
        'rendimiento': 'tag-rendimiento'
    };

    const tagText = {
        'nuevo': 'Nuevo',
        'mejora': 'Mejora',
        'correccion': 'Corrección',
        'eliminado': 'Eliminado',
        'seguridad': 'Seguridad',
        'rendimiento': 'Rendimiento'
    };

    const descripcionFormateada = v.descripcion ? v.descripcion.replace(/\n/g, '<br>') : '';

    return `
        <div class="version-card ${isCurrent ? 'current' : ''}">
            <div class="version-card-header">
                <div class="version-info">
                    <div class="version-number">v${v.numero}</div>
                    <div class="version-title">${escapeHtml(v.titulo)}</div>
                    <div class="version-meta">
                        <span><i class="fas fa-calendar"></i> ${formatDate(v.fechaLanzamiento)}</span>
                        <span><i class="fas fa-code-branch"></i> ${v.cambios?.length || 0} cambios</span>
                    </div>
                </div>
                <div>
                    <span class="version-badge ${estadoClass}">${estadoText}</span>
                    ${isCurrent ? '<span class="version-badge badge-actual" style="margin-left: 0.5rem;"><i class="fas fa-circle"></i> Actual</span>' : ''}
                </div>
            </div>
            
            ${descripcionFormateada ? `
                <div class="version-description" style="white-space: pre-line; line-height: 1.6;">
                    ${descripcionFormateada}
                </div>
            ` : ''}
            
            ${v.cambios?.length ? `
                <div class="cambios-list">
                    <div class="cambios-title">📋 Cambios realizados</div>
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
                        <i class="fas fa-check-circle"></i> Marcar como actual
                    </button>
                ` : ''}
                <button class="btn-edit" onclick="window.editVersion('${v._id}')">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn-delete" onclick="window.deleteVersion('${v._id}', '${v.numero}')">
                    <i class="fas fa-trash"></i> Eliminar
                </button>
            </div>
        </div>
    `;
}

let editingVersionId = null;

function openCreateVersionModal() {
    editingVersionId = null;
    showVersionModal({
        numero: '',
        titulo: '',
        descripcion: '',
        estado: 'estable',
        cambios: []
    });
}

function editVersion(id) {
    const version = versionsData.find(v => v._id === id);
    if (version) {
        editingVersionId = id;
        showVersionModal(version);
    }
}

function showVersionModal(version) {
    const descripcionEscapada = (version.descripcion || '');

    const modalHTML = `
        <div class="modal-overlay" id="versionModal">
            <div class="modal-container">
                <div class="modal-header">
                    <h3>${editingVersionId ? 'Editar Versión' : 'Publicar Nueva Versión'}</h3>
                    <button class="modal-close" onclick="window.closeVersionModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Número de versión</label>
                        <input type="text" id="modalVersionNumero" value="${escapeHtml(version.numero)}" placeholder="Ej: 1.0.0, 2.1.0-beta" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: var(--radius-md);">
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Título</label>
                        <input type="text" id="modalVersionTitulo" value="${escapeHtml(version.titulo)}" placeholder="Ej: Actualización Mayor" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: var(--radius-md);">
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Descripción general</label>
                        <textarea id="modalVersionDescripcion" rows="15" placeholder="Describe los aspectos más importantes de esta versión..." style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: var(--radius-md); font-family: monospace; white-space: pre-wrap;">${descripcionEscapada}</textarea>
                        <small style="color: var(--text-tertiary); font-size: 0.7rem;">Puedes usar saltos de línea para organizar mejor el texto</small>
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Estado</label>
                        <select id="modalVersionEstado" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: var(--radius-md);">
                            <option value="estable" ${version.estado === 'estable' ? 'selected' : ''}>Estable</option>
                            <option value="beta" ${version.estado === 'beta' ? 'selected' : ''}>Beta</option>
                            <option value="desarrollo" ${version.estado === 'desarrollo' ? 'selected' : ''}>Desarrollo</option>
                            <option value="deprecada" ${version.estado === 'deprecada' ? 'selected' : ''}>Deprecada</option>
                        </select>
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Cambios (opcional)</label>
                        <div id="cambiosList">
                            ${(version.cambios || []).map((c, idx) => `
                                <div class="cambio-item" style="margin-bottom: 0.5rem;">
                                    <select class="cambio-tipo" style="width: 120px; padding: 0.5rem; border: 1px solid var(--border); border-radius: var(--radius-sm);">
                                        <option value="nuevo" ${c.tipo === 'nuevo' ? 'selected' : ''}>Nuevo</option>
                                        <option value="mejora" ${c.tipo === 'mejora' ? 'selected' : ''}>Mejora</option>
                                        <option value="correccion" ${c.tipo === 'correccion' ? 'selected' : ''}>Corrección</option>
                                        <option value="eliminado" ${c.tipo === 'eliminado' ? 'selected' : ''}>Eliminado</option>
                                        <option value="seguridad" ${c.tipo === 'seguridad' ? 'selected' : ''}>Seguridad</option>
                                        <option value="rendimiento" ${c.tipo === 'rendimiento' ? 'selected' : ''}>Rendimiento</option>
                                    </select>
                                    <input type="text" class="cambio-desc-input" value="${escapeHtml(c.descripcion)}" placeholder="Descripción del cambio" style="flex: 1; padding: 0.5rem; border: 1px solid var(--border); border-radius: var(--radius-sm);">
                                    <button onclick="window.removeCambio(${idx})" style="background: var(--danger); color: white; border: none; padding: 0.5rem; border-radius: var(--radius-sm); cursor: pointer;">×</button>
                                </div>
                            `).join('')}
                        </div>
                        <button type="button" onclick="window.addCambio()" style="margin-top: 0.5rem; padding: 0.5rem 1rem; background: var(--info); color: white; border: none; border-radius: var(--radius-md); cursor: pointer;">
                            <i class="fas fa-plus"></i> Agregar cambio
                        </button>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-edit-big" onclick="window.closeVersionModal()">Cancelar</button>
                    <button class="create-version-btn" onclick="window.saveVersion()">${editingVersionId ? 'Actualizar' : 'Publicar'}</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function addCambio() {
    const container = document.getElementById('cambiosList');
    const idx = container.children.length;
    container.insertAdjacentHTML('beforeend', `
        <div class="cambio-item" style="margin-bottom: 0.5rem;">
            <select class="cambio-tipo" style="width: 120px; padding: 0.5rem; border: 1px solid var(--border); border-radius: var(--radius-sm);">
                <option value="nuevo">Nuevo</option>
                <option value="mejora">Mejora</option>
                <option value="correccion">Corrección</option>
                <option value="eliminado">Eliminado</option>
                <option value="seguridad">Seguridad</option>
                <option value="rendimiento">Rendimiento</option>
            </select>
            <input type="text" class="cambio-desc-input" placeholder="Descripción del cambio" style="flex: 1; padding: 0.5rem; border: 1px solid var(--border); border-radius: var(--radius-sm);">
            <button onclick="window.removeCambio(${idx})" style="background: var(--danger); color: white; border: none; padding: 0.5rem; border-radius: var(--radius-sm); cursor: pointer;">×</button>
        </div>
    `);
}

function removeCambio(idx) {
    const container = document.getElementById('cambiosList');
    if (container.children[idx]) {
        container.children[idx].remove();
    }
}

function closeVersionModal() {
    const modal = document.getElementById('versionModal');
    if (modal) modal.remove();
}

async function saveVersion() {
    const numero = document.getElementById('modalVersionNumero')?.value;
    const titulo = document.getElementById('modalVersionTitulo')?.value;
    const descripcion = document.getElementById('modalVersionDescripcion')?.value;
    const estado = document.getElementById('modalVersionEstado')?.value;
    
    if (descripcion && descripcion.length > 10000) {
        showToast(`La descripción es demasiado larga (${descripcion.length} caracteres). Máximo 10000.`, 'error');
        return;
    }
    
    const cambios = [];
    const cambioItems = document.querySelectorAll('.cambio-item');
    cambioItems.forEach(item => {
        const tipo = item.querySelector('.cambio-tipo')?.value;
        const desc = item.querySelector('.cambio-desc-input')?.value;
        if (desc && desc.trim()) {
            if (desc.length > 2000) {
                showToast(`Un cambio excede los 2000 caracteres permitidos`, 'error');
                return;
            }
            cambios.push({ tipo, descripcion: desc.trim() });
        }
    });
    
    if (!numero || !titulo) {
        showToast('Número de versión y título son obligatorios', 'error');
        return;
    }
    
    const url = editingVersionId 
        ? `${API_URL}/api/superadmin/versions/${editingVersionId}`
        : `${API_URL}/api/superadmin/versions`;
    
    const method = editingVersionId ? 'PUT' : 'POST';
    
    try {
        const response = await fetchWithAuth(url, {
            method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                numero,
                titulo,
                descripcion,
                estado,
                cambios,
                esActual: false
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(editingVersionId ? 'Versión actualizada' : 'Versión publicada exitosamente');
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
    if (!confirm(`¿Marcar v${numero} como la versión actual del sistema?`)) return;

    try {
        const response = await fetchWithAuth(`${API_URL}/api/superadmin/versions/${id}/set-current`, {
            method: 'PATCH'
        });

        const data = await response.json();

        if (data.success) {
            showToast(`v${numero} ahora es la versión actual`);
            loadVersions();
        } else {
            showToast(data.message || 'Error', 'error');
        }
    } catch (error) {
        showToast('Error al marcar versión actual', 'error');
    }
}

async function deleteVersion(id, numero) {
    if (!confirm(`¿Eliminar permanentemente la versión v${numero}? Esta acción no se puede deshacer.`)) return;

    try {
        const response = await fetchWithAuth(`${API_URL}/api/superadmin/versions/${id}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            showToast(`Versión v${numero} eliminada`);
            loadVersions();
        } else {
            showToast(data.message || 'Error al eliminar', 'error');
        }
    } catch (error) {
        showToast('Error al eliminar versión', 'error');
    }
}

// =============================================================
// CIERRE DEL SISTEMA
// =============================================================
async function loadSystemStatus() {
    await Promise.all([loadCurrentStatus(), loadShutdownHistory()]);
}

async function loadCurrentStatus() {
    try {
        const response = await fetchWithAuth(`${API_URL}/api/superadmin/system/status`, {});
        const data = await response.json();

        if (data.success) {
            systemStatus = data.status;
            renderSystemStatus();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function renderSystemStatus() {
    const container = document.getElementById('systemStatus');
    const buttonsContainer = document.getElementById('shutdownButtons');

    const isClosed = systemStatus?.isClosed === true;

    container.innerHTML = `
        <div class="status-badge ${isClosed ? 'system-closed' : 'system-open'}">
            <i class="fas ${isClosed ? 'fa-lock' : 'fa-check-circle'}"></i>
            ${isClosed ? 'Sistema CERRADO para clientes' : 'Sistema ABIERTO para clientes'}
        </div>
        ${systemStatus?.reason ? `<p style="margin-top: 1rem; color: var(--text-secondary);"><strong>Motivo:</strong> ${escapeHtml(systemStatus.reason)}</p>` : ''}
        ${systemStatus?.closedAt ? `<p style="margin-top: 0.5rem; color: var(--text-tertiary); font-size: 0.75rem;"><i class="fas fa-clock"></i> Cerrado el: ${formatDate(systemStatus.closedAt)}</p>` : ''}
    `;

    buttonsContainer.innerHTML = isClosed ? `
        <button class="btn-open" onclick="window.openSystem()">
            <i class="fas fa-unlock-alt"></i> Reabrir Sistema para Clientes
        </button>
    ` : `
        <button class="btn-shutdown" onclick="window.closeSystem()">
            <i class="fas fa-power-off"></i> Cerrar Sistema (solo clientes)
        </button>
    `;
}

async function closeSystem() {
    const reason = document.getElementById('shutdownReason')?.value;
    if (!reason) {
        showToast('Debes proporcionar un motivo para el cierre', 'error');
        return;
    }

    if (!confirm('¿Cerrar el sistema para todos los clientes? Los administradores y el superadmin seguirán teniendo acceso.')) return;

    try {
        const response = await fetchWithAuth(`${API_URL}/api/superadmin/system/shutdown`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reason })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Sistema cerrado para clientes');
            document.getElementById('shutdownReason').value = '';
            loadSystemStatus();
        } else {
            showToast(data.message || 'Error', 'error');
        }
    } catch (error) {
        showToast('Error al cerrar sistema', 'error');
    }
}

async function openSystem() {
    if (!confirm('¿Reabrir el sistema para todos los clientes?')) return;

    try {
        const response = await fetchWithAuth(`${API_URL}/api/superadmin/system/open`, {
            method: 'POST'
        });

        const data = await response.json();

        if (data.success) {
            showToast('Sistema reabierto para clientes');
            loadSystemStatus();
        } else {
            showToast(data.message || 'Error', 'error');
        }
    } catch (error) {
        showToast('Error al reabrir sistema', 'error');
    }
}

async function loadShutdownHistory() {
    try {
        const response = await fetchWithAuth(`${API_URL}/api/superadmin/system/history`, {});
        const data = await response.json();

        if (data.success) {
            shutdownHistory = data.history || [];
            renderShutdownHistory();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function renderShutdownHistory() {
    const container = document.getElementById('shutdownHistory');

    if (!shutdownHistory.length) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-tertiary); padding: 2rem;">No hay registros de cambios</p>';
        return;
    }

    container.innerHTML = shutdownHistory.map(h => `
        <div class="history-item-admin">
            <div class="history-info">
                <div class="history-date">
                    <i class="fas fa-calendar"></i> ${formatDate(h.createdAt)}
                </div>
                <div class="history-reason">
                    <strong>${h.action === 'close' ? 'Cierre' : 'Reapertura'}:</strong> ${escapeHtml(h.reason || 'Sin motivo especificado')}
                </div>
            </div>
            <span class="history-status ${h.action === 'close' ? 'status-closed' : 'status-opened'}">
                ${h.action === 'close' ? '🔒 Cerrado' : '🔓 Abierto'}
            </span>
        </div>
    `).join('');
}

// =============================================================
// SUGERENCIAS - Funciones principales
// =============================================================

function createSugerenciasSection() {
    if (document.getElementById('sugerenciasSection')) return;
    
    const shutdownSection = document.getElementById('shutdownSection');
    if (!shutdownSection) return;
    
    const html = `
        <div id="sugerenciasSection" class="sugerencias-section hidden">
            <div class="sugerencias-header">
                <h2><i class="fas fa-lightbulb"></i> Bandeja de Sugerencias</h2>
                <p>Gestiona las sugerencias enviadas por los usuarios del sistema</p>
            </div>
            
            <div class="sugerencias-stats" id="sugerenciasStats">
                <div class="sugerencia-stat-card">
                    <div class="sugerencia-stat-card__icon"><i class="fas fa-inbox"></i></div>
                    <div><div class="sugerencia-stat-card__value" id="statTotal">0</div><div class="sugerencia-stat-card__label">Total</div></div>
                </div>
                <div class="sugerencia-stat-card pendiente">
                    <div class="sugerencia-stat-card__icon"><i class="fas fa-clock"></i></div>
                    <div><div class="sugerencia-stat-card__value" id="statPendientes">0</div><div class="sugerencia-stat-card__label">Pendientes</div></div>
                </div>
                <div class="sugerencia-stat-card vista">
                    <div class="sugerencia-stat-card__icon"><i class="fas fa-eye"></i></div>
                    <div><div class="sugerencia-stat-card__value" id="statVistas">0</div><div class="sugerencia-stat-card__label">Vistas</div></div>
                </div>
                <div class="sugerencia-stat-card implementada">
                    <div class="sugerencia-stat-card__icon"><i class="fas fa-check-circle"></i></div>
                    <div><div class="sugerencia-stat-card__value" id="statImplementadas">0</div><div class="sugerencia-stat-card__label">Implementadas</div></div>
                </div>
            </div>
            
            <div class="sugerencias-filters">
                <div class="filter-group">
                    <label>Estado</label>
                    <select id="filterEstado" class="form__select">
                        <option value="todos">Todos</option>
                        <option value="pendiente">Pendientes</option>
                        <option value="vista">Vistas</option>
                        <option value="considerando">En consideración</option>
                        <option value="implementada">Implementadas</option>
                        <option value="rechazada">Rechazadas</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label>Categoría</label>
                    <select id="filterCategoria" class="form__select">
                        <option value="todas">Todas</option>
                        <option value="mejora">✨ Mejora</option>
                        <option value="nueva_funcionalidad">🚀 Nueva funcionalidad</option>
                        <option value="reporte_error">🐛 Reporte de error</option>
                        <option value="experiencia_usuario">🎨 Experiencia de usuario</option>
                        <option value="rendimiento">⚡ Rendimiento</option>
                        <option value="seguridad">🔒 Seguridad</option>
                        <option value="otros">📌 Otros</option>
                    </select>
                </div>
            </div>
            
            <div class="sugerencias-list" id="sugerenciasList">
                <div class="loading-spinner">Cargando sugerencias...</div>
            </div>
            
            <div class="sugerencias-pagination" id="sugerenciasPagination"></div>
        </div>
        
        <div id="suggestionDetailModal" class="modal" style="display: none;">
            <div class="modal__overlay" onclick="closeSuggestionDetailModal()"></div>
            <div class="modal__content modal__content--lg">
                <div class="modal__header">
                    <h3 class="modal__title"><i class="fas fa-lightbulb"></i> Detalle de Sugerencia</h3>
                    <button class="modal__close" onclick="closeSuggestionDetailModal()">&times;</button>
                </div>
                <div class="modal__body" id="suggestionDetailContent"></div>
                <div class="modal__footer">
                    <button class="btn btn--outline" onclick="closeSuggestionDetailModal()">Cerrar</button>
                </div>
            </div>
        </div>
    `;
    
    shutdownSection.insertAdjacentHTML('afterend', html);
    setupSugerenciasFilters();
}

function setupSugerenciasFilters() {
    const filterEstado = document.getElementById('filterEstado');
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
    
    container.innerHTML = '<div class="loading-spinner">Cargando sugerencias...</div>';
    
    try {
        const token = getToken();
        const url = `${API_URL}/api/suggestions/admin/all?page=${page}&limit=20&estado=${currentEstado}&categoria=${currentCategoria}`;
        const response = await fetchWithAuth(url, {});
        const data = await response.json();
        
        if (data.success) {
            currentSuggestions = data.suggestions;
            currentSuggestionsPage = data.pagination.page;
            totalSuggestionsPages = data.pagination.pages;
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
        const token = getToken();
        const response = await fetchWithAuth(`${API_URL}/api/suggestions/admin/stats`, {});
        const data = await response.json();
        
        if (data.success) {
            const statTotal = document.getElementById('statTotal');
            const statPendientes = document.getElementById('statPendientes');
            const statVistas = document.getElementById('statVistas');
            const statImplementadas = document.getElementById('statImplementadas');
            
            if (statTotal) statTotal.textContent = data.stats.total;
            if (statPendientes) statPendientes.textContent = data.stats.pendientes;
            if (statVistas) statVistas.textContent = data.stats.vistas;
            if (statImplementadas) statImplementadas.textContent = data.stats.implementadas;
        }
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

function renderSuggestionsList() {
    const container = document.getElementById('sugerenciasList');
    if (!container) return;
    
    if (currentSuggestions.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>No hay sugerencias</p></div>';
        return;
    }
    
    const estadoTexto = { pendiente: 'Pendiente', vista: 'Vista', considerando: 'En consideración', implementada: 'Implementada', rechazada: 'Rechazada' };
    const estadoIcono = { pendiente: '🕐', vista: '👁️', considerando: '🤔', implementada: '✅', rechazada: '❌' };
    
    container.innerHTML = currentSuggestions.map(s => `
        <div class="sugerencia-card ${s.estado}" data-suggestion-id="${s.id}" style="cursor: pointer;">
            <div class="sugerencia-card__header">
                <span class="sugerencia-card__number">${s.suggestionNumber}</span>
                <span class="sugerencia-card__estado ${s.estado}">${estadoIcono[s.estado]} ${estadoTexto[s.estado]}</span>
            </div>
            <div class="sugerencia-card__titulo">${escapeHtml(s.titulo)}</div>
            <div class="sugerencia-card__usuario">
                <i class="fas fa-user"></i> ${escapeHtml(s.usuario.nombre)}
                ${s.tieneAdjuntos ? '<i class="fas fa-paperclip" title="Tiene archivos adjuntos"></i>' : ''}
            </div>
            <div class="sugerencia-card__footer">
                <span class="sugerencia-card__fecha"><i class="fas fa-calendar"></i> ${new Date(s.fechaEnvio).toLocaleDateString()}</span>
                <span class="sugerencia-card__categoria">${getCategoriaTexto(s.categoria)}</span>
            </div>
        </div>
    `).join('');
    
    // Agregar event listeners a cada tarjeta
    document.querySelectorAll('.sugerencia-card').forEach(card => {
        const newCard = card.cloneNode(true);
        card.parentNode.replaceChild(newCard, card);
        
        newCard.addEventListener('click', (e) => {
            if (e.target.closest('.btn')) return;
            const id = newCard.dataset.suggestionId;
            console.log('🖱️ Tarjeta clickeada, id:', id);
            if (id) {
                window.viewSuggestionDetail(id);
            }
        });
    });
}

function renderSuggestionsPagination() {
    const container = document.getElementById('sugerenciasPagination');
    if (!container) return;
    
    if (totalSuggestionsPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '<div class="pagination">';
    html += `<button class="pagination-btn ${currentSuggestionsPage === 1 ? 'disabled' : ''}" onclick="loadSuggestionsPage(${currentSuggestionsPage - 1})" ${currentSuggestionsPage === 1 ? 'disabled' : ''}>Anterior</button>`;
    
    for (let i = 1; i <= Math.min(totalSuggestionsPages, 5); i++) {
        html += `<button class="pagination-btn ${currentSuggestionsPage === i ? 'active' : ''}" onclick="loadSuggestionsPage(${i})">${i}</button>`;
    }
    
    html += `<button class="pagination-btn ${currentSuggestionsPage === totalSuggestionsPages ? 'disabled' : ''}" onclick="loadSuggestionsPage(${currentSuggestionsPage + 1})" ${currentSuggestionsPage === totalSuggestionsPages ? 'disabled' : ''}>Siguiente</button>`;
    html += '</div>';
    
    container.innerHTML = html;
}

window.loadSuggestionsPage = (page) => loadSuggestionsPage(page);

window.viewSuggestionDetail = async (id) => {
    console.log('🔍 viewSuggestionDetail llamado con id:', id);
    
    if (!id) {
        console.error('ID de sugerencia no proporcionado');
        showToast('Error: ID de sugerencia no válido', 'error');
        return;
    }
    
    try {
        const token = getToken();
        
        const response = await fetchWithAuth(`${API_URL}/api/suggestions/admin/${id}`, {});
        const data = await response.json();
        
        if (data.success) {
            const s = data.suggestion;
            
            // Guardar el ID en la variable global
            currentSuggestionId = s._id || s.id;
            console.log('💾 ID guardado en variable global:', currentSuggestionId);
            
            // Marcar como vista automáticamente
            await fetchWithAuth(`${API_URL}/api/suggestions/admin/${id}/view`, { method: 'PATCH' });
            
            let attachmentsHtml = '';
            if (s.attachments && s.attachments.length > 0) {
                attachmentsHtml = `
                    <div class="sugerencia-detail__attachments">
                        <h4><i class="fas fa-paperclip"></i> Archivos adjuntos (${s.attachments.length})</h4>
                        <div class="attachment-list">
                            ${s.attachments.map(a => `
                                <div class="attachment-item">
                                    <img src="${a.cloudinary_url}" alt="${a.originalname}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;">
                                    <div>
                                        <div style="font-weight: 500;">${escapeHtml(a.originalname)}</div>
                                        <small>${(a.size / 1024).toFixed(1)} KB</small>
                                        <br>
                                        <a href="${a.cloudinary_url}" target="_blank" style="color: #f59e0b;">Ver imagen</a>
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
                        <div class="sugerencia-detail__number" style="font-size: 0.75rem; color: var(--text-tertiary); font-family: monospace;">${s.suggestionNumber}</div>
                        <div class="sugerencia-detail__titulo" style="font-size: 1.25rem; font-weight: 700; margin: 0.5rem 0;">${escapeHtml(s.titulo)}</div>
                        <div class="sugerencia-detail__usuario" style="display: flex; gap: 1rem; font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 1rem;">
                            <span><i class="fas fa-user"></i> ${escapeHtml(s.usuario.nombre)}</span>
                            <span><i class="fas fa-envelope"></i> ${escapeHtml(s.usuario.email)}</span>
                            <span><i class="fas fa-tag"></i> ${escapeHtml(s.usuario.rol)}</span>
                        </div>
                    </div>
                    
                    <div class="sugerencia-detail__descripcion" style="background: var(--bg-tertiary); padding: 1rem; border-radius: 12px; margin-bottom: 1.5rem;">
                        <strong>Descripción:</strong>
                        <p style="margin-top: 0.5rem; white-space: pre-wrap; line-height: 1.5;">${escapeHtml(s.descripcion).replace(/\n/g, '<br>')}</p>
                    </div>
                    
                    ${attachmentsHtml}
                    
                    <div class="sugerencia-detail__actions" style="display: flex; gap: 0.5rem; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border);">
                        <select id="detailStatusSelect" class="form__select" style="padding: 0.5rem; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-secondary);">
                            <option value="pendiente" ${s.estado === 'pendiente' ? 'selected' : ''}>🕐 Pendiente</option>
                            <option value="vista" ${s.estado === 'vista' ? 'selected' : ''}>👁️ Vista</option>
                            <option value="considerando" ${s.estado === 'considerando' ? 'selected' : ''}>🤔 En consideración</option>
                            <option value="implementada" ${s.estado === 'implementada' ? 'selected' : ''}>✅ Implementada</option>
                            <option value="rechazada" ${s.estado === 'rechazada' ? 'selected' : ''}>❌ Rechazada</option>
                        </select>
                        <button class="btn btn--primary btn--sm" onclick="updateSuggestionStatus()" style="padding: 0.5rem 1rem; background: #f59e0b; color: white; border: none; border-radius: 8px; cursor: pointer;">
                            <i class="fas fa-save"></i> Actualizar estado
                        </button>
                        <button class="btn btn--danger btn--sm" onclick="deleteSuggestion('${s.suggestionNumber}')" style="padding: 0.5rem 1rem; background: #ef4444; color: white; border: none; border-radius: 8px; cursor: pointer;">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                </div>
            `;
            
            const detailContent = document.getElementById('suggestionDetailContent');
            if (detailContent) {
                detailContent.innerHTML = modalContent;
            }
            
            const modal = document.getElementById('suggestionDetailModal');
            if (modal) {
                modal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            }
            
            // Recargar lista para actualizar el estado visual
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
    console.log('📝 updateSuggestionStatus usando id global:', id);
    
    if (!id) {
        console.error('ID no proporcionado');
        showToast('Error: ID no válido', 'error');
        return;
    }
    
    const select = document.getElementById('detailStatusSelect');
    if (!select) {
        console.error('Selector de estado no encontrado');
        showToast('Error: No se encontró el selector de estado', 'error');
        return;
    }
    
    const nuevoEstado = select.value;
    console.log('📝 Nuevo estado:', nuevoEstado);
    
    try {
        const token = getToken();
        const response = await fetchWithAuth(`${API_URL}/api/suggestions/admin/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: nuevoEstado })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Estado actualizado correctamente', 'success');
            closeSuggestionDetailModal();
            loadSuggestionsPage(currentSuggestionsPage);
            loadSuggestionsStats();
        } else {
            showToast(data.message || 'Error al actualizar estado', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error al actualizar estado', 'error');
    }
};

window.deleteSuggestion = async (number) => {
    const id = currentSuggestionId;
    console.log('🗑️ deleteSuggestion usando id global:', id, 'number:', number);
    
    if (!id) {
        console.error('ID no proporcionado');
        showToast('Error: ID no válido', 'error');
        return;
    }
    
    if (!confirm(`¿Eliminar la sugerencia ${number}? Esta acción no se puede deshacer.`)) return;
    
    try {
        const token = getToken();
        const response = await fetchWithAuth(`${API_URL}/api/suggestions/admin/${id}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Sugerencia eliminada', 'success');
            closeSuggestionDetailModal();
            loadSuggestionsPage(currentSuggestionsPage);
            loadSuggestionsStats();
        } else {
            showToast(data.message || 'Error al eliminar', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error al eliminar', 'error');
    }
};

window.closeSuggestionDetailModal = () => {
    const modal = document.getElementById('suggestionDetailModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
    currentSuggestionId = null; // Limpiar la variable global
    console.log('🧹 Variable global currentSuggestionId limpiada');
};

function getCategoriaTexto(categoria) {
    const textos = {
        mejora: '✨ Mejora',
        nueva_funcionalidad: '🚀 Nueva funcionalidad',
        reporte_error: '🐛 Reporte de error',
        experiencia_usuario: '🎨 Experiencia de usuario',
        rendimiento: '⚡ Rendimiento',
        seguridad: '🔒 Seguridad',
        otros: '📌 Otros'
    };
    return textos[categoria] || categoria;
}

// =============================================================
// 🆕 INVITACIONES - Funciones CRUD
// =============================================================

const API_INVITATIONS = '/api/superadmin/invitations';

/**
 * Abre el modal para crear una nueva invitación
 */
function openInvitationModal() {
    const modal = document.getElementById('invitationModal');
    if (modal) {
        document.getElementById('inviteEmail').value = '';
        document.getElementById('inviteSchoolName').value = '';
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

/**
 * Cierra el modal de invitación
 */
function closeInvitationModal() {
    const modal = document.getElementById('invitationModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

/**
 * Envía una invitación a un nuevo administrador
 */
async function sendInvitation() {
    const email = document.getElementById('inviteEmail')?.value?.trim();
    const schoolName = document.getElementById('inviteSchoolName')?.value?.trim();

    if (!email) {
        showToast('El email es obligatorio', 'error');
        return;
    }
    if (!schoolName) {
        showToast('El nombre de la escuela es obligatorio', 'error');
        return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showToast('Formato de email inválido', 'error');
        return;
    }

    try {
        const response = await fetchWithAuth(`${API_URL}${API_INVITATIONS}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, schoolName })
        });

        const data = await response.json();

        if (data.success) {
            showToast(`✅ Invitación enviada a ${email}`, 'success');
            closeInvitationModal();
            loadInvitations();
        } else {
            showToast(data.message || 'Error al enviar invitación', 'error');
        }
    } catch (error) {
        console.error('Error enviando invitación:', error);
        showToast('Error de conexión al enviar invitación', 'error');
    }
}

/**
 * Carga la lista de invitaciones
 */
async function loadInvitations() {
    const container = document.getElementById('invitationsList');
    if (!container) return;

    container.innerHTML = '<div class="loading-spinner" style="margin: 2rem auto;"></div>';

    try {
        const status = document.getElementById('filterInvitationStatus')?.value || '';
        const url = status ? `${API_URL}${API_INVITATIONS}?status=${status}` : `${API_URL}${API_INVITATIONS}`;

        const response = await fetchWithAuth(url, {});
        const data = await response.json();

        if (data.success) {
            renderInvitations(data.invitations || []);
        } else {
            container.innerHTML = '<p class="error">Error al cargar invitaciones</p>';
        }
    } catch (error) {
        console.error('Error cargando invitaciones:', error);
        container.innerHTML = '<p class="error">Error de conexión</p>';
    }
}

/**
 * Renderiza la lista de invitaciones
 */
function renderInvitations(invitations) {
    const container = document.getElementById('invitationsList');
    if (!container) return;

    if (!invitations || invitations.length === 0) {
        container.innerHTML = `
            <div class="version-card" style="text-align: center; padding: 3rem; grid-column: 1/-1;">
                <i class="fas fa-envelope-open-text" style="font-size: 3rem; color: var(--text-tertiary);"></i>
                <p>No hay invitaciones</p>
                <button class="create-version-btn" onclick="openInvitationModal()" style="margin-top: 1rem;">
                    <i class="fas fa-plus-circle"></i> Enviar primera invitación
                </button>
            </div>
        `;
        return;
    }

    const statusColors = {
        pending: '#F59E0B',
        used: '#10B981',
        expired: '#6B7280',
        revoked: '#EF4444'
    };

    const statusIcons = {
        pending: '⏳',
        used: '✅',
        expired: '⏰',
        revoked: '🚫'
    };

    const statusText = {
        pending: 'Pendiente',
        used: 'Usada',
        expired: 'Expirada',
        revoked: 'Revocada'
    };

    container.innerHTML = invitations.map(inv => `
        <div class="version-card ${inv.status === 'revoked' || inv.status === 'expired' ? 'inactive' : ''}">
            <div class="version-card-header">
                <div class="version-info">
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                        <span style="font-size: 1.5rem;">${statusIcons[inv.status] || '📧'}</span>
                        <span class="version-badge" style="background: ${statusColors[inv.status] || '#6B7280'}; color: white;">
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
            
            <div class="version-description" style="white-space: pre-line; line-height: 1.6; margin: 1rem 0;">
                <p><strong>📅 Creada:</strong> ${formatDate(inv.createdAt)}</p>
                <p><strong>⏰ Expira:</strong> ${formatDate(inv.expiresAt)}</p>
                ${inv.createdUserId ? `<p><strong>👤 Usuario creado:</strong> ${escapeHtml(inv.createdUserId.usuario || 'N/A')}</p>` : ''}
                ${inv.usedAt ? `<p><strong>✅ Usada el:</strong> ${formatDate(inv.usedAt)}</p>` : ''}
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

/**
 * Revoca una invitación pendiente
 */
async function revokeInvitation(id, email) {
    if (!confirm(`¿Revocar la invitación de ${email}?\n\nEsta acción no se puede deshacer y el token dejará de ser válido.`)) return;

    try {
        const response = await fetchWithAuth(`${API_URL}${API_INVITATIONS}/${id}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            showToast('Invitación revocada exitosamente', 'success');
            loadInvitations();
        } else {
            showToast(data.message || 'Error al revocar invitación', 'error');
        }
    } catch (error) {
        console.error('Error revocando invitación:', error);
        showToast('Error al revocar invitación', 'error');
    }
}

// =============================================================
// LOGOUT
// =============================================================
async function logout() {
    if (refreshTimeout) {
        clearTimeout(refreshTimeout);
    }
    
    try {
        await fetch(`${API_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' });
        await fetch(`${API_URL}/api/superadmin/logout`, { method: 'POST', credentials: 'include' });
    } catch (e) { }

    localStorage.removeItem('token');
    localStorage.removeItem('superAdminToken');
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');

    window.location.href = '/login.html';
}

// =============================================================
// EXPONER FUNCIONES GLOBALMENTE
// =============================================================
window.logout = logout;
window.loadVersions = loadVersions;
window.openCreateVersionModal = openCreateVersionModal;
window.editVersion = editVersion;
window.setCurrentVersion = setCurrentVersion;
window.deleteVersion = deleteVersion;
window.closeVersionModal = closeVersionModal;
window.saveVersion = saveVersion;
window.addCambio = addCambio;
window.removeCambio = removeCambio;
window.closeSystem = closeSystem;
window.openSystem = openSystem;

// ===== 🆕 AGREGAR ESTAS LÍNEAS =====
window.openInvitationModal = openInvitationModal;
window.closeInvitationModal = closeInvitationModal;
window.sendInvitation = sendInvitation;
window.loadInvitations = loadInvitations;
window.revokeInvitation = revokeInvitation;

// =============================================================
// INICIALIZACIÓN
// =============================================================
document.addEventListener('DOMContentLoaded', () => {
    const token = getToken();
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    // Crear sección de sugerencias
    createSugerenciasSection();

    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64));
        
        if (payload.exp) {
            const expiresIn = (payload.exp * 1000) - Date.now();
            if (expiresIn > 0) {
                scheduleTokenRefresh(expiresIn);
                console.log(`⏰ Token válido por ${Math.floor(expiresIn / 60000)} minutos`);
            }
        }
    } catch (e) {
        console.warn('No se pudo decodificar token:', e);
    }

    try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && user.usuario) {
            const userNameSpan = document.getElementById('userName');
            if (userNameSpan) userNameSpan.textContent = user.usuario;
        }
    } catch (e) { }

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => switchSection(item.dataset.section));
    });

    switchSection('versions');
    
    setInterval(async () => {
        try {
            await fetchWithAuth(`${API_URL}/api/superadmin/verify`, {});
            console.log('💓 Heartbeat enviado, sesión activa');
        } catch (e) {
            console.warn('Heartbeat falló:', e);
        }
    }, 5 * 60 * 1000);
});