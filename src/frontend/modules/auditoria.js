import { api } from '../services/api.js';
import { showAlert, formatDate, formatFileSize, confirmAction } from '../utils.js';
import { hasPermission, PERMISSIONS } from '../permissions.js';

// =============================================================================
// CONSTANTES Y CONFIGURACIÓN
// =============================================================================

const ITEMS_PER_PAGE = 20;

// Mapeo de acciones a colores e iconos
const ACTION_CONFIG = {
    // Autenticación
    'LOGIN_SUCCESS': { icon: 'fa-sign-in-alt', color: 'success', label: 'Inicio de sesión' },
    'LOGIN_FAILED': { icon: 'fa-exclamation-triangle', color: 'danger', label: 'Intento fallido' },
    'LOGOUT': { icon: 'fa-sign-out-alt', color: 'secondary', label: 'Cierre de sesión' },
    'PASSWORD_CHANGE': { icon: 'fa-key', color: 'warning', label: 'Cambio de contraseña' },
    
    // Documentos
    'DOCUMENT_UPLOAD': { icon: 'fa-cloud-upload-alt', color: 'success', label: 'Documento subido' },
    'DOCUMENT_UPDATE': { icon: 'fa-edit', color: 'primary', label: 'Documento actualizado' },
    'DOCUMENT_DELETE': { icon: 'fa-trash-alt', color: 'danger', label: 'Documento eliminado' },
    'DOCUMENT_RESTORE': { icon: 'fa-undo', color: 'warning', label: 'Documento restaurado' },
    'DOCUMENT_DOWNLOAD': { icon: 'fa-download', color: 'info', label: 'Documento descargado' },
    'DOCUMENT_VIEW': { icon: 'fa-eye', color: 'info', label: 'Documento visto' },
    'DOCUMENT_APPROVE': { icon: 'fa-check-circle', color: 'success', label: 'Documento aprobado' },
    'DOCUMENT_REJECT': { icon: 'fa-times-circle', color: 'danger', label: 'Documento rechazado' },
    
    // Usuarios
    'USER_CREATE': { icon: 'fa-user-plus', color: 'success', label: 'Usuario creado' },
    'USER_UPDATE': { icon: 'fa-user-edit', color: 'primary', label: 'Usuario actualizado' },
    'USER_DELETE': { icon: 'fa-user-minus', color: 'danger', label: 'Usuario eliminado' },
    'USER_DEACTIVATE': { icon: 'fa-user-slash', color: 'warning', label: 'Usuario desactivado' },
    'USER_REACTIVATE': { icon: 'fa-user-check', color: 'success', label: 'Usuario reactivado' },
    'ROLE_CHANGE': { icon: 'fa-user-tag', color: 'warning', label: 'Cambio de rol' },
    
    // Categorías y Departamentos
    'CATEGORY_CREATE': { icon: 'fa-folder-plus', color: 'success', label: 'Categoría creada' },
    'CATEGORY_UPDATE': { icon: 'fa-folder-edit', color: 'primary', label: 'Categoría actualizada' },
    'CATEGORY_DELETE': { icon: 'fa-folder-minus', color: 'danger', label: 'Categoría eliminada' },
    'DEPARTMENT_CREATE': { icon: 'fa-building', color: 'success', label: 'Departamento creado' },
    'DEPARTMENT_UPDATE': { icon: 'fa-edit', color: 'primary', label: 'Departamento actualizado' },
    'DEPARTMENT_DELETE': { icon: 'fa-trash', color: 'danger', label: 'Departamento eliminado' },
    
    // Personas
    'PERSON_CREATE': { icon: 'fa-user-plus', color: 'success', label: 'Persona agregada' },
    'PERSON_UPDATE': { icon: 'fa-user-edit', color: 'primary', label: 'Persona actualizada' },
    'PERSON_DELETE': { icon: 'fa-user-minus', color: 'danger', label: 'Persona eliminada' },
    
    // Tareas
    'TASK_CREATE': { icon: 'fa-plus-circle', color: 'success', label: 'Tarea creada' },
    'TASK_UPDATE': { icon: 'fa-edit', color: 'primary', label: 'Tarea actualizada' },
    'TASK_DELETE': { icon: 'fa-trash', color: 'danger', label: 'Tarea eliminada' },
    'TASK_COMPLETE': { icon: 'fa-check-circle', color: 'success', label: 'Tarea completada' },
    
    // Administración
    'ADMIN_CHANGE_REQUEST': { icon: 'fa-user-shield', color: 'warning', label: 'Solicitud cambio admin' },
    'ADMIN_CHANGE_CONFIRM': { icon: 'fa-check-double', color: 'success', label: 'Cambio admin confirmado' },
    
    // Papelera
    'TRASH_VIEW': { icon: 'fa-trash', color: 'secondary', label: 'Vista papelera' },
    'TRASH_EMPTY': { icon: 'fa-trash-alt', color: 'danger', label: 'Papelera vaciada' },
    'TRASH_AUTO_CLEANUP': { icon: 'fa-broom', color: 'info', label: 'Limpieza automática' },
    
    // Soporte
    'SUPPORT_TICKET_CREATE': { icon: 'fa-ticket-alt', color: 'info', label: 'Ticket creado' },
    
    // Auditoría
    'AUDIT_VIEW': { icon: 'fa-history', color: 'info', label: 'Consulta auditoría' },
    'AUDIT_CLEANUP': { icon: 'fa-broom', color: 'warning', label: 'Limpieza logs' },
    
    // Sistema
    'SYSTEM_CONFIG_CHANGE': { icon: 'fa-cog', color: 'warning', label: 'Configuración cambiada' },
    'SYSTEM_ERROR': { icon: 'fa-bug', color: 'danger', label: 'Error del sistema' },
};

// Severidad a color
const SEVERITY_COLORS = {
    'INFO': 'info',
    'WARNING': 'warning',
    'ERROR': 'danger',
    'CRITICAL': 'danger'
};

// =============================================================================
// ESTADO GLOBAL DEL MÓDULO
// =============================================================================

const state = {
    logs: [],
    filteredLogs: [],
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: ITEMS_PER_PAGE,
    filters: {
        username: '',
        action: '',
        actionCategory: '',
        severity: '',
        startDate: '',
        endDate: '',
        search: ''
    },
    actions: [],
    categories: [],
    severities: [],
    stats: null,
    isLoading: false,
    isAdmin: false
};

// =============================================================================
// FUNCIONES AUXILIARES
// =============================================================================

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getActionConfig(action) {
    return ACTION_CONFIG[action] || { icon: 'fa-history', color: 'secondary', label: action || 'Acción desconocida' };
}

function formatDateRelative(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) return 'hace unos segundos';
    if (diffMin < 60) return `hace ${diffMin} min`;
    if (diffHour < 24) return `hace ${diffHour} h`;
    if (diffDay < 7) return `hace ${diffDay} días`;
    
    return formatDate(dateString);
}

// =============================================================================
// CARGA DE DATOS
// =============================================================================

async function loadFilterOptions() {
    try {
        const response = await api.call('/audit/actions');
        if (response?.success) {
            state.actions = response.actions || [];
            state.categories = response.categories || [];
            state.severities = response.severities || [];
            renderFilterSelects();
        }
    } catch (error) {
        console.error('Error cargando opciones de filtro:', error);
    }
}

async function loadLogs(page = 1) {
    state.isLoading = true;
    renderLoading();

    try {
        // Construir query params
        const params = new URLSearchParams({
            page,
            limit: state.itemsPerPage,
            ...state.filters
        });

        // Eliminar filtros vacíos
        Object.keys(state.filters).forEach(key => {
            if (!state.filters[key]) params.delete(key);
        });

        const response = await api.call(`/audit/logs?${params}`);
        
        if (response?.success) {
            state.logs = response.logs || [];
            state.currentPage = response.page || 1;
            state.totalPages = response.pages || 1;
            state.totalItems = response.total || 0;
            
            renderLogs();
            renderPagination();
            updateResultsCount();
        } else {
            showAlert('Error al cargar logs', 'error');
        }
    } catch (error) {
        console.error('Error cargando logs:', error);
        showAlert('Error al cargar logs: ' + error.message, 'error');
    } finally {
        state.isLoading = false;
    }
}

async function loadStats() {
    if (!state.isAdmin) return;

    try {
        const response = await api.call('/audit/stats?days=30');
        if (response?.success) {
            state.stats = response;
            renderStats();
        }
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

// =============================================================================
// RENDERIZADO
// =============================================================================

function renderLoading() {
    const container = document.getElementById('auditLogsBody');
    if (!container) return;

    container.innerHTML = `
        <tr class="loading-row">
            <td colspan="7" class="text-center py-4">
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin fa-2x text-primary"></i>
                    <p class="mt-2">Cargando logs de auditoría...</p>
                </div>
            </td>
        </tr>
    `;
}

function renderLogs() {
    const container = document.getElementById('auditLogsBody');
    if (!container) return;

    if (!state.logs || state.logs.length === 0) {
        container.innerHTML = `
            <tr class="empty-row">
                <td colspan="7" class="text-center py-4">
                    <div class="empty-state">
                        <i class="fas fa-history empty-state__icon fa-3x text-muted"></i>
                        <h4 class="empty-state__title">No hay registros de auditoría</h4>
                        <p class="empty-state__description">No se encontraron logs con los filtros aplicados</p>
                        <button class="btn btn--primary btn--sm mt-3" onclick="window.clearAuditFilters()">
                            <i class="fas fa-times"></i> Limpiar filtros
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    container.innerHTML = state.logs.map(log => {
        const actionConfig = getActionConfig(log.action);
        const severityColor = SEVERITY_COLORS[log.severity] || 'secondary';
        const date = new Date(log.createdAt).toLocaleString('es-MX');
        const relativeDate = formatDateRelative(log.createdAt);

        return `
            <tr class="audit-row audit-row--${log.severity?.toLowerCase() || 'info'}" onclick="window.viewAuditLog('${log._id}')">
                <td class="audit-cell">
                    <div class="audit-user">
                        <div class="audit-user-avatar" title="${escapeHtml(log.userRole)}">
                            <i class="fas fa-user-circle"></i>
                        </div>
                        <div class="audit-user-info">
                            <span class="audit-username">${escapeHtml(log.username)}</span>
                            <span class="audit-role">${escapeHtml(log.userRole)}</span>
                        </div>
                    </div>
                </td>
                <td class="audit-cell">
                    <div class="audit-action">
                        <span class="badge badge--${actionConfig.color} badge--with-icon">
                            <i class="fas ${actionConfig.icon}"></i>
                            ${escapeHtml(actionConfig.label)}
                        </span>
                    </div>
                </td>
                <td class="audit-cell">
                    <span class="badge badge--${severityColor}">
                        ${escapeHtml(log.severity)}
                    </span>
                </td>
                <td class="audit-cell">
                    <div class="audit-description" title="${escapeHtml(log.description)}">
                        ${escapeHtml(log.description.substring(0, 50))}${log.description.length > 50 ? '...' : ''}
                    </div>
                </td>
                <td class="audit-cell">
                    ${log.targetName ? `
                        <div class="audit-target">
                            <i class="fas fa-tag"></i>
                            <span>${escapeHtml(log.targetName)}</span>
                        </div>
                    ` : '<span class="text-muted">—</span>'}
                </td>
                <td class="audit-cell">
                    <div class="audit-ip">
                        <i class="fas fa-network-wired"></i>
                        <span>${escapeHtml(log.metadata?.ipAddress || '—')}</span>
                    </div>
                </td>
                <td class="audit-cell">
                    <div class="audit-date" title="${escapeHtml(date)}">
                        <i class="fas fa-clock"></i>
                        <span>${escapeHtml(relativeDate)}</span>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function renderFilterSelects() {
    const actionFilter = document.getElementById('filterAction');
    const categoryFilter = document.getElementById('filterCategory');
    const severityFilter = document.getElementById('filterSeverity');

    if (actionFilter) {
        actionFilter.innerHTML = `
            <option value="">Todas las acciones</option>
            ${state.actions.map(action => {
                const config = getActionConfig(action);
                return `<option value="${action}">${config.label}</option>`;
            }).join('')}
        `;
    }

    if (categoryFilter) {
        categoryFilter.innerHTML = `
            <option value="">Todas las categorías</option>
            ${state.categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
        `;
    }

    if (severityFilter) {
        severityFilter.innerHTML = `
            <option value="">Todas las severidades</option>
            ${state.severities.map(sev => `<option value="${sev}">${sev}</option>`).join('')}
        `;
    }
}

function renderPagination() {
    const container = document.getElementById('auditPagination');
    if (!container) return;

    if (state.totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '<div class="pagination">';
    
    // Botón anterior
    html += `
        <button class="pagination__btn pagination__btn--prev" 
                ${state.currentPage === 1 ? 'disabled' : ''}
                onclick="window.changeAuditPage(${state.currentPage - 1})">
            <i class="fas fa-chevron-left"></i> <span>Anterior</span>
        </button>
    `;

    // Páginas
    const start = Math.max(1, state.currentPage - 2);
    const end = Math.min(state.totalPages, start + 4);

    for (let i = start; i <= end; i++) {
        html += `
            <button class="pagination__btn ${i === state.currentPage ? 'pagination__btn--active' : ''}"
                    onclick="window.changeAuditPage(${i})">
                ${i}
            </button>
        `;
    }

    // Botón siguiente
    html += `
        <button class="pagination__btn pagination__btn--next"
                ${state.currentPage === state.totalPages ? 'disabled' : ''}
                onclick="window.changeAuditPage(${state.currentPage + 1})">
            <span>Siguiente</span> <i class="fas fa-chevron-right"></i>
        </button>
    `;

    html += '</div>';
    container.innerHTML = html;
}

function renderStats() {
    if (!state.stats) return;

    const container = document.getElementById('auditStats');
    if (!container) return;

    const bySeverity = state.stats.bySeverity || [];
    const total = state.stats.total?.[0]?.count || 0;

    container.innerHTML = `
        <div class="stats-grid">
            <!-- Total -->
            <div class="stat-card">
                <div class="stat-card__icon stat-card__icon--info">
                    <i class="fas fa-history"></i>
                </div>
                <div class="stat-card__content">
                    <span class="stat-card__value">${total}</span>
                    <span class="stat-card__label">Registros (30d)</span>
                </div>
            </div>

            <!-- Por severidad -->
            ${bySeverity.slice(0, 3).map(sev => `
                <div class="stat-card stat-card--${SEVERITY_COLORS[sev._id] || 'info'}">
                    <div class="stat-card__icon">
                        <i class="fas fa-${sev._id === 'CRITICAL' ? 'fire' : 'exclamation-circle'}"></i>
                    </div>
                    <div class="stat-card__content">
                        <span class="stat-card__value">${sev.count}</span>
                        <span class="stat-card__label">${sev._id}</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function updateResultsCount() {
    const counter = document.getElementById('resultsCount');
    if (counter) {
        counter.textContent = `Mostrando ${state.logs.length} de ${state.totalItems} registros`;
    }
}

// =============================================================================
// MODAL DE DETALLES
// =============================================================================

let activeModal = null;

function showLogDetails(log) {
    closeLogModal();

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'auditDetailModal';
    modal.setAttribute('open', '');

    const actionConfig = getActionConfig(log.action);
    const severityColor = SEVERITY_COLORS[log.severity] || 'secondary';
    const date = new Date(log.createdAt).toLocaleString('es-MX');
    
    // Preparar cambios si existen
    const hasChanges = log.changes && (log.changes.before || log.changes.after);

    modal.innerHTML = `
        <div class="modal__content">
            <div class="modal__header">
                <h3 class="modal__title">
                    <i class="fas fa-history"></i> Detalles del Registro
                </h3>
                <button class="modal__close" onclick="window.closeAuditModal()">&times;</button>
            </div>
            
            <div class="modal__body">
                <div class="audit-detail">
                    <!-- Header con información principal -->
                    <div class="audit-detail__header">
                        <div class="audit-detail__action">
                            <span class="badge badge--${actionConfig.color} badge--with-icon">
                                <i class="fas ${actionConfig.icon}"></i>
                                ${actionConfig.label}
                            </span>
                            <span class="badge badge--${severityColor}">
                                ${log.severity}
                            </span>
                        </div>
                        <div class="audit-detail__status">
                            <span class="badge badge--${log.status === 'SUCCESS' ? 'success' : 'danger'}">
                                ${log.status}
                            </span>
                        </div>
                    </div>

                    <!-- Información del usuario -->
                    <div class="audit-detail__section">
                        <h4 class="audit-detail__section-title">
                            <i class="fas fa-user"></i> Usuario
                        </h4>
                        <div class="audit-detail__grid">
                            <div class="audit-detail__item">
                                <span class="audit-detail__label">Nombre:</span>
                                <span class="audit-detail__value">${escapeHtml(log.username)}</span>
                            </div>
                            <div class="audit-detail__item">
                                <span class="audit-detail__label">Rol:</span>
                                <span class="audit-detail__value">${escapeHtml(log.userRole)}</span>
                            </div>
                            <div class="audit-detail__item">
                                <span class="audit-detail__label">Email:</span>
                                <span class="audit-detail__value">${escapeHtml(log.userEmail)}</span>
                            </div>
                            <div class="audit-detail__item">
                                <span class="audit-detail__label">IP:</span>
                                <span class="audit-detail__value">${escapeHtml(log.metadata?.ipAddress || '—')}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Descripción -->
                    <div class="audit-detail__section">
                        <h4 class="audit-detail__section-title">
                            <i class="fas fa-align-left"></i> Descripción
                        </h4>
                        <div class="audit-detail__description">
                            ${escapeHtml(log.description)}
                        </div>
                    </div>

                    <!-- Entidad afectada (si existe) -->
                    ${log.targetName ? `
                        <div class="audit-detail__section">
                            <h4 class="audit-detail__section-title">
                                <i class="fas fa-tag"></i> Entidad afectada
                            </h4>
                            <div class="audit-detail__grid">
                                <div class="audit-detail__item">
                                    <span class="audit-detail__label">Tipo:</span>
                                    <span class="audit-detail__value">${escapeHtml(log.targetModel || '—')}</span>
                                </div>
                                <div class="audit-detail__item">
                                    <span class="audit-detail__label">Nombre:</span>
                                    <span class="audit-detail__value">${escapeHtml(log.targetName)}</span>
                                </div>
                            </div>
                        </div>
                    ` : ''}

                    <!-- Cambios (si existen) -->
                    ${hasChanges ? `
                        <div class="audit-detail__section">
                            <h4 class="audit-detail__section-title">
                                <i class="fas fa-code-branch"></i> Cambios realizados
                            </h4>
                            <div class="audit-detail__changes-vertical">
                                <div class="change-block">
                                    <h5 class="change-title change-title--before">
                                        <i class="fas fa-arrow-left"></i> Antes
                                    </h5>
                                    <pre class="change-content">${JSON.stringify(log.changes.before, null, 2)}</pre>
                                </div>
                                <div class="change-block">
                                    <h5 class="change-title change-title--after">
                                        <i class="fas fa-arrow-right"></i> Después
                                    </h5>
                                    <pre class="change-content">${JSON.stringify(log.changes.after, null, 2)}</pre>
                                </div>
                            </div>
                        </div>
                    ` : ''}

                    <!-- Metadata adicional -->
                    ${log.metadata && Object.keys(log.metadata).length > 0 ? `
                        <div class="audit-detail__section">
                            <h4 class="audit-detail__section-title">
                                <i class="fas fa-info-circle"></i> Metadatos
                            </h4>
                            <pre class="metadata-content">${JSON.stringify(log.metadata, null, 2)}</pre>
                        </div>
                    ` : ''}
                </div>
            </div>

            <div class="modal__footer">
                <button class="btn btn--primary" onclick="window.closeAuditModal()">
                    Cerrar
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    activeModal = modal;
    document.body.classList.add('modal-open');
}

function closeLogModal() {
    if (activeModal) {
        activeModal.remove();
        activeModal = null;
        document.body.classList.remove('modal-open');
    }
}

// =============================================================================
// LIMPIEZA DE LOGS (SOLO ADMIN)
// =============================================================================

async function cleanupOldLogs() {
    if (!state.isAdmin) {
        showAlert('Solo administradores pueden limpiar logs', 'error');
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'cleanupConfirmModal';
    modal.setAttribute('open', '');

    modal.innerHTML = `
        <div class="modal__content modal__content--sm">
            <div class="modal__header">
                <h3 class="modal__title">
                    <i class="fas fa-exclamation-triangle" style="color: var(--danger);"></i> 
                    Limpiar logs antiguos
                </h3>
                <button class="modal__close" onclick="this.closest('.modal').remove(); document.body.classList.remove('modal-open');">&times;</button>
            </div>
            
            <div class="modal__body">
                <div class="action-modal__content">
                    <div class="action-modal__icon action-modal__icon--error">
                        <i class="fas fa-trash-alt fa-3x"></i>
                    </div>
                    <p class="action-modal__message">
                        ¿Eliminar logs anteriores a 90 días?<br>
                        <strong>Esta acción no se puede deshacer.</strong>
                    </p>
                </div>
            </div>

            <div class="modal__footer modal__footer--centered">
                <button class="btn btn--outline" onclick="this.closest('.modal').remove(); document.body.classList.remove('modal-open');">
                    Cancelar
                </button>
                <button class="btn btn--danger" id="confirmCleanupBtn">
                    <i class="fas fa-trash-alt"></i> Limpiar
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.body.classList.add('modal-open');

    document.getElementById('confirmCleanupBtn')?.addEventListener('click', async () => {
        try {
            modal.remove();
            document.body.classList.remove('modal-open');

            showAlert('Limpiando logs antiguos...', 'info');

            const response = await api.call('/audit/cleanup', {
                method: 'POST',
                body: { daysToKeep: 90 }
            });

            if (response?.success) {
                showAlert(response.message, 'success');
                await loadLogs(1);
                await loadStats();
            } else {
                throw new Error(response?.message || 'Error al limpiar logs');
            }
        } catch (error) {
            console.error('Error limpiando logs:', error);
            showAlert('Error al limpiar logs: ' + error.message, 'error');
        }
    });
}

// =============================================================================
// FUNCIONES DE FILTRADO
// =============================================================================

function applyFilters() {
    state.filters = {
        username: document.getElementById('filterUsername')?.value || '',
        action: document.getElementById('filterAction')?.value || '',
        actionCategory: document.getElementById('filterCategory')?.value || '',
        severity: document.getElementById('filterSeverity')?.value || '',
        startDate: document.getElementById('filterStartDate')?.value || '',
        endDate: document.getElementById('filterEndDate')?.value || '',
        search: document.getElementById('filterSearch')?.value || ''
    };

    loadLogs(1);
}

function clearFilters() {
    document.getElementById('filterUsername').value = '';
    document.getElementById('filterAction').value = '';
    document.getElementById('filterCategory').value = '';
    document.getElementById('filterSeverity').value = '';
    document.getElementById('filterStartDate').value = '';
    document.getElementById('filterEndDate').value = '';
    document.getElementById('filterSearch').value = '';

    state.filters = {
        username: '',
        action: '',
        actionCategory: '',
        severity: '',
        startDate: '',
        endDate: '',
        search: ''
    };

    loadLogs(1);
}

// =============================================================================
// INICIALIZACIÓN PRINCIPAL
// =============================================================================

export async function renderAuditoria() {
    const container = document.getElementById('auditoria-content');
    if (!container) return;

    // Verificar permisos
    state.isAdmin = hasPermission(PERMISSIONS.MANAGE_USERS);

    // Renderizar estructura
    container.innerHTML = `
        <div class="audit-container">
            <!-- Header -->
            <div class="audit-header">
                <div class="audit-header__left">
                    <h1 class="audit-title">
                        <i class="fas fa-history"></i> Auditoría del Sistema
                    </h1>
                    <p class="audit-subtitle">Registro detallado de todas las acciones críticas del sistema</p>
                </div>
                <div class="audit-header__right">
                    <button class="btn btn--primary" id="refreshAuditBtn" title="Actualizar">
                        <i class="fas fa-sync-alt"></i> Actualizar
                    </button>
                    ${state.isAdmin ? `
                        <div class="audit-actions">
                            <button class="btn btn--danger" id="cleanupAuditBtn" title="Limpiar logs antiguos">
                                <i class="fas fa-trash-alt"></i> Limpiar
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>

            <!-- Filtros -->
            <div class="audit-filters card">
                <div class="filters-header">
                    <h3 class="filters-title">
                        <i class="fas fa-filter"></i> Filtros
                    </h3>
                    <button class="btn btn--link btn--sm" id="clearFiltersBtn">
                        <i class="fas fa-times"></i> Limpiar filtros
                    </button>
                </div>

                <div class="filters-grid">
                    <div class="filter-group">
                        <label class="filter-label">Usuario</label>
                        <input type="text" class="filter-input" id="filterUsername" placeholder="Nombre de usuario">
                    </div>

                    <div class="filter-group">
                        <label class="filter-label">Acción</label>
                        <select class="filter-select" id="filterAction">
                            <option value="">Todas las acciones</option>
                        </select>
                    </div>

                    <div class="filter-group">
                        <label class="filter-label">Categoría</label>
                        <select class="filter-select" id="filterCategory">
                            <option value="">Todas las categorías</option>
                        </select>
                    </div>

                    <div class="filter-group">
                        <label class="filter-label">Severidad</label>
                        <select class="filter-select" id="filterSeverity">
                            <option value="">Todas las severidades</option>
                        </select>
                    </div>

                    <div class="filter-group">
                        <label class="filter-label">Fecha inicio</label>
                        <input type="date" class="filter-input" id="filterStartDate">
                    </div>

                    <div class="filter-group">
                        <label class="filter-label">Fecha fin</label>
                        <input type="date" class="filter-input" id="filterEndDate">
                    </div>

                    <div class="filter-group full-width">
                        <label class="filter-label">Búsqueda</label>
                        <div class="search-wrapper">
                            <input type="text" class="search-input" id="filterSearch" 
                                   placeholder="Buscar en descripción, entidad, etc...">
                            <button class="search-clear" id="searchClearBtn">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="filters-footer">
                    <span id="resultsCount" class="results-count"></span>
                    <button class="btn btn--primary" id="applyFiltersBtn">
                        <i class="fas fa-search"></i> Aplicar filtros
                    </button>
                </div>
            </div>

            <!-- Estadísticas (solo admin) -->
            ${state.isAdmin ? `
                <div class="audit-stats card" id="auditStats">
                    <div class="loading-state">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Cargando estadísticas...</p>
                    </div>
                </div>
            ` : ''}

            <!-- Tabla de logs -->
            <div class="audit-table-container card">
                <div class="table-responsive">
                    <table class="audit-table">
                        <thead>
                            <tr>
                                <th>Usuario</th>
                                <th>Acción</th>
                                <th>Severidad</th>
                                <th>Descripción</th>
                                <th>Entidad</th>
                                <th>IP</th>
                                <th>Fecha</th>
                            </tr>
                        </thead>
                        <tbody id="auditLogsBody">
                            <tr class="loading-row">
                                <td colspan="7" class="text-center py-4">
                                    <div class="loading-spinner">
                                        <i class="fas fa-spinner fa-spin fa-2x text-primary"></i>
                                        <p class="mt-2">Cargando logs de auditoría...</p>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Paginación -->
                <div id="auditPagination" class="pagination-container"></div>
            </div>
        </div>
    `;

    // Cargar datos iniciales
    await loadFilterOptions();
    await loadLogs(1);
    
    if (state.isAdmin) {
        await loadStats();
    }

    // Configurar event listeners
    setupEventListeners();
}

function setupEventListeners() {
    // Refresh
    document.getElementById('refreshAuditBtn')?.addEventListener('click', () => {
        loadLogs(1);
        if (state.isAdmin) loadStats();
    });

    // Aplicar filtros
    document.getElementById('applyFiltersBtn')?.addEventListener('click', applyFilters);

    // Limpiar filtros
    document.getElementById('clearFiltersBtn')?.addEventListener('click', clearFilters);

    // Búsqueda con Enter
    document.getElementById('filterSearch')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') applyFilters();
    });

    // Botón limpiar búsqueda
    document.getElementById('searchClearBtn')?.addEventListener('click', () => {
        document.getElementById('filterSearch').value = '';
        state.filters.search = '';
        loadLogs(1);
    });

    // Limpiar logs (solo admin)
    if (state.isAdmin) {
        document.getElementById('cleanupAuditBtn')?.addEventListener('click', cleanupOldLogs);
    }
}

// =============================================================================
// EXPORTAR FUNCIONES GLOBALES
// =============================================================================

window.viewAuditLog = async (id) => {
    try {
        const response = await api.call(`/audit/logs/${id}`);
        if (response?.success && response.log) {
            showLogDetails(response.log);
        } else {
            showAlert('Error al cargar detalles del log', 'error');
        }
    } catch (error) {
        console.error('Error cargando log:', error);
        showAlert('Error al cargar detalles: ' + error.message, 'error');
    }
};

window.closeAuditModal = closeLogModal;
window.changeAuditPage = (page) => loadLogs(page);
window.clearAuditFilters = clearFilters;