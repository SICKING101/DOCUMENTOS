// =============================================================
// CONFIGURACIÓN
// =============================================================
const API_URL = window.location.origin;
let currentSection = 'versions';
let versionsData = [];
let systemStatus = null;
let shutdownHistory = [];

// =============================================================
// MANEJO DE TOKEN EXPIRADO Y REFRESH AUTOMÁTICO
// =============================================================

let refreshTimeout;
let isRefreshing = false;

function getToken() {
    return localStorage.getItem('superAdminToken') || localStorage.getItem('token');
}

// Función para programar refresh del token
function scheduleTokenRefresh(expiresInMs) {
    if (refreshTimeout) {
        clearTimeout(refreshTimeout);
    }
    
    // Refresh 5 minutos antes de expirar (o inmediato si falta menos)
    const refreshTime = Math.max(expiresInMs - (5 * 60 * 1000), 0);
    
    if (refreshTime > 0) {
        refreshTimeout = setTimeout(() => {
            refreshSuperAdminToken();
        }, refreshTime);
        console.log(`⏰ Token refresh programado en ${Math.floor(refreshTime / 60000)} minutos`);
    }
}

// Función para refrescar el token de superadmin
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
                
                // Programar próximo refresh
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

// Interceptor para todas las llamadas fetch con manejo de 401
async function fetchWithAuth(url, options = {}) {
    const token = getToken();
    
    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };
    
    try {
        const response = await fetch(url, { ...options, headers, credentials: 'include' });
        
        // Si es 401 (token expirado), intentar refrescar
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
            
            // Si no se pudo refrescar, redirigir a login
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
    const shutdownSection = document.getElementById('shutdownSection');
    const pageTitle = document.getElementById('pageTitle');
    const pageDescription = document.getElementById('pageDescription');

    if (section === 'versions') {
        versionsSection.classList.remove('hidden');
        shutdownSection.classList.add('hidden');
        pageTitle.textContent = 'Panel de Versiones';
        pageDescription.textContent = 'Gestiona las versiones del sistema y publica actualizaciones';
        loadVersions();
    } else {
        versionsSection.classList.add('hidden');
        shutdownSection.classList.remove('hidden');
        pageTitle.textContent = 'Cierre del Sistema';
        pageDescription.textContent = 'Controla la disponibilidad del sistema para los clientes';
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
        <div class="history-item">
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

// =============================================================
// INICIALIZACIÓN
// =============================================================
document.addEventListener('DOMContentLoaded', () => {
    const token = getToken();
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    // Decodificar token para programar refresh
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
            document.getElementById('userName').textContent = user.usuario;
        }
    } catch (e) { }

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => switchSection(item.dataset.section));
    });

    switchSection('versions');
    
    // Heartbeat cada 5 minutos para mantener sesión activa
    setInterval(async () => {
        try {
            await fetchWithAuth(`${API_URL}/api/superadmin/verify`, {});
            console.log('💓 Heartbeat enviado, sesión activa');
        } catch (e) {
            console.warn('Heartbeat falló:', e);
        }
    }, 5 * 60 * 1000);
});