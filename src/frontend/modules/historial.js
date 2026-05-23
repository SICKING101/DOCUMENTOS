// src/frontend/modules/historial.js

// =============================================================================
// MÓDULO DE HISTORIAL DEL SISTEMA — DISEÑO "LUMINOUS CHRONICLE"
// Lógica de negocio y llamadas al backend: SIN CAMBIOS.
// Solo se actualizaron las plantillas HTML de presentación.
// =============================================================================

import { CONFIG } from '../config.js';
import { showAlert, showConfirmation, stripEmojis } from '../utils.js';
import { showNotification } from '../utils/alertSystem.js';
import { canAction, showNoPermissionAlert, applyActionPermissions } from '../permissions.js';

class HistorialManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 25;
        this.totalPages = 1;
        this.totalItems = 0;
        this.filters = {
            tipo: 'all',
            prioridad: 'all',
            estado: 'all',
            fechaDesde: '',
            fechaHasta: '',
            busqueda: ''
        };
        this.historialData = [];
        this.activePreloaders = new Set();
        // Enlazar showNotification centralizado para mantener llamadas existentes (this.showNotification)
        this.showNotification = showNotification;
        this._lastNotification = { key: null, ts: 0 };
    }

    // =============================================================================
    // 1. INICIALIZACIÓN
    // =============================================================================

    init() {
        console.log('📜 Inicializando módulo de historial...');
        this.bindEvents();
        this.loadHistorial();
        return this;
    }

    bindEvents() {
        // Botones de acción
        document.getElementById('clearHistoryBtn')?.addEventListener('click', () => this.clearHistorial());
        document.getElementById('exportHistoryBtn')?.addEventListener('click', () => this.exportHistorial());

        // Filtros
        document.getElementById('filterType')?.addEventListener('change', (e) => {
            this.filters.tipo = e.target.value;
            this.loadHistorial();
            this._updateActiveFiltersBadge();
        });

        document.getElementById('filterPriority')?.addEventListener('change', (e) => {
            this.filters.prioridad = e.target.value;
            this.loadHistorial();
            this._updateActiveFiltersBadge();
        });

        document.getElementById('filterRead')?.addEventListener('change', (e) => {
            this.filters.estado = e.target.value;
            this.loadHistorial();
            this._updateActiveFiltersBadge();
        });

        document.getElementById('filterDateFrom')?.addEventListener('change', (e) => {
            this.filters.fechaDesde = e.target.value;
            this.loadHistorial();
            this._updateActiveFiltersBadge();
        });

        document.getElementById('filterDateTo')?.addEventListener('change', (e) => {
            this.filters.fechaHasta = e.target.value;
            this.loadHistorial();
            this._updateActiveFiltersBadge();
        });

        document.getElementById('searchHistory')?.addEventListener('input', (e) => {
            this.filters.busqueda = e.target.value;
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => this.loadHistorial(), 500);
        });

        document.getElementById('itemsPerPage')?.addEventListener('change', (e) => {
            this.itemsPerPage = parseInt(e.target.value);
            this.currentPage = 1;
            this.loadHistorial();
        });

        // Paginación
        document.querySelector('.pagination__btn--prev')?.addEventListener('click', () => this.previousPage());
        document.querySelector('.pagination__btn--next')?.addEventListener('click', () => this.nextPage());

        // ── Toggle del panel de filtros (UI pura) ──
        const filterHeader = document.getElementById('filterPanelToggle');
        const filterPanel = document.getElementById('hfilterPanel');
        if (filterHeader && filterPanel) {
            // Abrir por defecto
            filterPanel.classList.add('is-open');

            filterHeader.addEventListener('click', () => {
                filterPanel.classList.toggle('is-open');
            });
        }
    }

    /**
     * Actualiza el badge de filtros activos en el panel
     */
    _updateActiveFiltersBadge() {
        const badge = document.getElementById('activeFiltersCount');
        if (!badge) return;
        const active = [
            this.filters.tipo !== 'all' && this.filters.tipo,
            this.filters.prioridad !== 'all' && this.filters.prioridad,
            this.filters.estado !== 'all' && this.filters.estado,
            this.filters.fechaDesde,
            this.filters.fechaHasta,
            this.filters.busqueda
        ].filter(Boolean).length;

        if (active > 0) {
            badge.textContent = active;
            badge.style.display = 'inline-flex';
        } else {
            badge.style.display = 'none';
        }
    }

    // =============================================================================
    // 2. PRELOADER UTILITIES (sin cambios)
    // =============================================================================

    showTablePreloader(tableId, message = 'Cargando datos...') {
        const table = document.getElementById(tableId);
        if (!table) return null;

        const preloaderId = `preloader-${tableId}-${Date.now()}`;
        const preloaderHTML = `
            <div class="table-preloader-overlay" id="${preloaderId}">
                <div class="table-preloader-content">
                    <div class="elegant-spinner">
                        <div class="elegant-spinner__ring"></div>
                        <div class="elegant-spinner__ring"></div>
                        <div class="elegant-spinner__ring"></div>
                    </div>
                    <div class="table-preloader-message">${message}</div>
                </div>
            </div>
        `;

        table.style.position = 'relative';
        table.insertAdjacentHTML('beforeend', preloaderHTML);
        this.activePreloaders.add(preloaderId);
        return preloaderId;
    }

    showButtonPreloader(button, text = 'Procesando...') {
        if (!button) return button;
        button.setAttribute('data-original-html', button.innerHTML);
        button.setAttribute('data-original-text', button.textContent);
        const buttonId = button.id || `btn-${Date.now()}`;
        button.setAttribute('data-original-id', buttonId);
        button.innerHTML = `
            <span class="preloader-inline">
                <div class="preloader-inline__spinner"></div>
                <span>${text}</span>
            </span>
        `;
        button.disabled = true;
        button.classList.add('btn--loading');
        console.log(`Preloader activado para botón: ${buttonId}`);
        return button;
    }

    hidePreloader(preloaderId) {
        const preloader = document.getElementById(preloaderId);
        if (preloader) {
            preloader.style.opacity = '0';
            setTimeout(() => preloader.remove(), 300);
        }
        this.activePreloaders.delete(preloaderId);
    }

    restoreButton(button) {
        if (!button) {
            console.warn('restoreButton: button es null');
            return;
        }
        const buttonId = button.id || button.getAttribute('data-original-id');
        console.log(`Restaurando botón: ${buttonId}`);
        const originalHTML = button.getAttribute('data-original-html');
        if (originalHTML) {
            button.innerHTML = originalHTML;
            button.removeAttribute('data-original-html');
            button.removeAttribute('data-original-text');
            button.removeAttribute('data-original-id');
            console.log(`Botón ${buttonId} restaurado con contenido original`);
        } else {
            console.warn(`No se encontró data-original-html para botón: ${buttonId}, restaurando por ID`);
            this.restoreButtonByType(button);
        }
        button.disabled = false;
        button.classList.remove('btn--loading');
        console.log(`Botón ${buttonId} restaurado exitosamente`);
    }

    restoreButtonByType(button) {
        const buttonId = button.id;
        const buttonContents = {
            'refreshHistoryBtn': '<i class="fas fa-sync-alt"></i> <span>Actualizar</span>',
            'clearHistoryBtn': '<i class="fas fa-trash-alt"></i> <span>Limpiar</span>',
            'exportHistoryBtn': '<i class="fas fa-download"></i> <span>Exportar CSV</span>',
            'markAllReadBtn': '<i class="fas fa-check-double"></i> <span>Marcar Todo Leído</span>',
        };
        if (buttonId && buttonContents[buttonId]) {
            button.innerHTML = buttonContents[buttonId];
        } else {
            button.innerHTML = '<i class="fas fa-check"></i> <span>Listo</span>';
        }
    }

    showRowActionPreloader(rowId, action = 'processing') {
        const row = document.querySelector(`[data-id="${rowId}"]`);
        if (!row) return null;

        const preloaderId = `row-action-${rowId}-${Date.now()}`;
        const actionTexts = {
            'delete': 'Eliminando...',
            'mark-read': 'Marcando como leído...',
            'view': 'Cargando...',
            'processing': 'Procesando...'
        };
        const actionClasses = {
            'delete': 'task-action-indicator--delete',
            'mark-read': 'task-action-indicator--complete',
            'view': 'task-action-indicator--edit',
            'processing': 'task-action-indicator'
        };
        const preloaderHTML = `
            <div class="task-action-indicator ${actionClasses[action] || ''}" id="${preloaderId}">
                <div class="task-action-indicator__content">
                    <div class="task-action-indicator__icon">
                        ${action === 'delete' ? '<i class="fas fa-trash"></i>' :
                action === 'mark-read' ? '<i class="fas fa-check"></i>' :
                    action === 'view' ? '<i class="fas fa-eye"></i>' :
                        '<i class="fas fa-cog"></i>'}
                    </div>
                    <div class="task-action-indicator__dots">
                        <span class="dot"></span>
                        <span class="dot"></span>
                        <span class="dot"></span>
                    </div>
                </div>
            </div>
        `;
        row.style.position = 'relative';
        row.insertAdjacentHTML('beforeend', preloaderHTML);
        this.activePreloaders.add(preloaderId);
        return preloaderId;
    }

    showClearAllPreloader(count) {
        const preloaderId = `clear-all-preloader-${Date.now()}`;
        const preloaderHTML = `
            <div class="clear-tasks-indicator" id="${preloaderId}">
                <div class="clear-tasks-indicator__content">
                    <div class="clear-tasks-indicator__header">
                        <i class="fas fa-broom clear-tasks-indicator__icon"></i>
                        <h3 class="clear-tasks-indicator__title">Limpiando Historial</h3>
                    </div>
                    <div class="clear-tasks-indicator__body">
                        <div class="clear-tasks-indicator__count">${count}</div>
                        <div class="clear-tasks-indicator__progress">
                            <div class="clear-tasks-indicator__progress-bar"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', preloaderHTML);
        this.activePreloaders.add(preloaderId);
        setTimeout(() => {
            const progressBar = document.querySelector(`#${preloaderId} .clear-tasks-indicator__progress-bar`);
            if (progressBar) progressBar.style.width = '100%';
        }, 100);
        return preloaderId;
    }

    showExportPreloader() {
        const preloaderId = `export-preloader-${Date.now()}`;
        const preloaderHTML = `
            <div class="document-upload-preloader" id="${preloaderId}" style="position:fixed;bottom:20px;right:20px;">
                <div class="document-upload-preloader__content">
                    <div class="document-upload-preloader__header">
                        <h3 class="document-upload-preloader__title">
                            <i class="fas fa-file-export"></i> Exportando Historial
                        </h3>
                    </div>
                    <div class="document-upload-preloader__content">
                        <div class="upload-preloader">
                            <div class="upload-preloader__dropzone">
                                <div class="upload-preloader__icon"><i class="fas fa-file-csv"></i></div>
                                <div class="upload-preloader__text">Generando archivo CSV...</div>
                                <div class="upload-preloader__file">
                                    <div class="upload-preloader__file-info">
                                        <i class="fas fa-file-csv upload-preloader__file-icon"></i>
                                        <div>
                                            <div class="upload-preloader__file-name">historial_sistema.csv</div>
                                            <div class="upload-preloader__file-progress">
                                                <div class="upload-preloader__file-progress-bar"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', preloaderHTML);
        this.activePreloaders.add(preloaderId);
        setTimeout(() => {
            const progressBar = document.querySelector(`#${preloaderId} .upload-preloader__file-progress-bar`);
            if (progressBar) progressBar.style.width = '100%';
        }, 100);
        return preloaderId;
    }

    cleanupPreloaders() {
        this.activePreloaders.forEach(id => this.hidePreloader(id));
        this.activePreloaders.clear();
    }

    // =============================================================================
    // 3. CARGAR HISTORIAL (sin cambios)
    // =============================================================================

    async loadHistorial() {
        let preloaderId = null;
        let refreshButton = null;

        try {
            console.log('📥 Cargando historial...');

            preloaderId = this.showTablePreloader('historyTableBody', 'Cargando registros...');
            refreshButton = document.getElementById('refreshHistoryBtn');
            if (refreshButton) this.showButtonPreloader(refreshButton, 'Actualizando...');

            const params = new URLSearchParams({
                pagina: this.currentPage,
                limite: this.itemsPerPage
            });

            if (this.filters.tipo !== 'all') params.append('tipo', this.filters.tipo);
            if (this.filters.prioridad !== 'all') params.append('prioridad', this.filters.prioridad);
            if (this.filters.estado === 'read') params.append('leida', 'true');
            if (this.filters.estado === 'unread') params.append('leida', 'false');
            if (this.filters.fechaDesde) params.append('desde', this.filters.fechaDesde);
            if (this.filters.fechaHasta) params.append('hasta', this.filters.fechaHasta);

            const response = await fetch(`${CONFIG.API_BASE_URL}/notifications?${params}`);
            if (!response.ok) throw new Error('Error al cargar historial');

            const data = await response.json();

            if (data.success) {
                this.historialData = data.data.notificaciones || [];
                this.totalItems = data.data.total || 0;
                this.totalPages = data.data.totalPaginas || 1;

                await new Promise(resolve => setTimeout(resolve, 1500));

                this.renderHistorial();
                this.updateStats();
                this.updatePagination();

                console.log(`✅ Historial cargado: ${this.historialData.length} registros`);
                if (this.historialData.length > 0) {
                    // Normalizar y deduplicar notificación para evitar repeticiones innecesarias
                    const rawMsg = `Cargados ${this.historialData.length} registros`;
                    const normalized = stripEmojis(rawMsg).replace(/\d+/g, '{n}').replace(/\s+/g, ' ').trim();
                    const key = `success:${normalized}`;
                    const now = Date.now();
                    // Si la misma notificación se mostró recientemente (5s), evitar re-crearla
                    if (this._lastNotification.key !== key || (now - this._lastNotification.ts) > 5000) {
                        this.showNotification(rawMsg, 'success');
                        this._lastNotification = { key, ts: now };
                    } else {
                        // Si ya se mostró, intentar actualizar contador en el sistema de toasts (showNotification internamente maneja dedupe)
                        this.showNotification(rawMsg, 'success');
                        this._lastNotification.ts = now;
                    }
                }
            } else {
                throw new Error(data.message || 'Error al cargar historial');
            }
        } catch (error) {
            console.error('❌ Error cargando historial:', error);
            this.showNotification('Error al cargar el historial', 'error');
        } finally {
            if (preloaderId) this.hidePreloader(preloaderId);
            if (refreshButton) this.restoreButton(refreshButton);
        }
    }

    // =============================================================================
    // 4. RENDERIZAR HISTORIAL
    // =============================================================================

    renderHistorial() {
        const tbody = document.getElementById('historyTableBody');
        if (!tbody) return;

        if (this.historialData.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6">
                        <div class="history-empty">
                            <div class="history-empty__icon">
                                <i class="fas fa-stream"></i>
                            </div>
                            <h3 class="history-empty__title">No hay registros de actividad</h3>
                            <p class="history-empty__desc">
                                ${this.hasFilters()
                    ? 'Ningún resultado coincide con los filtros aplicados'
                    : 'Las acciones del sistema aparecerán aquí automáticamente'}
                            </p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.historialData.map(item => this.renderHistoryItem(item)).join('');
        this.bindItemEvents();
        applyActionPermissions();
    }

    /**
     * Genera el HTML de una fila de historial — PLANTILLA RENOVADA.
     * La lógica de datos (campos, condiciones) es idéntica al original.
     */
    renderHistoryItem(item) {
        const fecha = new Date(item.fecha_creacion || item.createdAt);
        const fechaDia = fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
        const fechaHora = fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

        const prioridadCss = this._getPriorityCSS(item.prioridad);
        const prioridadTxt = this.getPriorityText(item.prioridad);
        const tipoIcon = this.getTypeIcon(item.tipo);
        const tipoTxt = this.getTypeText(item.tipo);
        const leidoCss = item.leida ? 'hrow-status--read' : 'hrow-status--unread';
        const leidoTxt = item.leida ? 'Leído' : 'No leído';

        const metaChips = item.metadata && Object.keys(item.metadata).length > 0
            ? Object.entries(item.metadata).slice(0, 3).map(([k, v]) =>
                `<span class="hrow-message__meta-chip">${this.formatMetadataKey(k)}: ${this.formatMetadataValue(v)}</span>`
            ).join('')
            : '';

        return `
            <tr class="history-item ${item.leida ? '' : 'history-item--unread'}"
                data-id="${item._id}"
                data-tipo="${item.tipo || ''}">

                <!-- Fecha y hora -->
                <td class="table__cell">
                    <div class="hrow-date">
                        <span class="hrow-date__day">${fechaDia}</span>
                        <span class="hrow-date__time">${fechaHora}</span>
                    </div>
                </td>

                <!-- Tipo de actividad -->
                <td class="table__cell">
                    <div class="hrow-type">
                        <div class="hrow-type__icon">
                            <i class="fas fa-${tipoIcon}"></i>
                        </div>
                        <span class="hrow-type__label">${tipoTxt}</span>
                    </div>
                </td>

                <!-- Mensaje y metadata -->
                <td class="table__cell">
                    <div class="hrow-message">
                        <p class="hrow-message__text">${item.mensaje}</p>
                        ${metaChips ? `<div class="hrow-message__meta">${metaChips}</div>` : ''}
                    </div>
                </td>

                <!-- Prioridad -->
                <td class="table__cell">
                    <span class="hrow-priority ${prioridadCss}">${prioridadTxt}</span>
                </td>

                <!-- Estado lectura -->
                <td class="table__cell">
                    <div class="hrow-status ${leidoCss}">
                        <span class="hrow-status__dot"></span>
                        <span>${leidoTxt}</span>
                    </div>
                </td>

                <!-- Acciones -->
                <td class="table__cell">
                    <div class="hrow-actions">
                        ${!item.leida ? `
                            <button class="hrow-btn hrow-btn--read"
                                    title="Marcar como leído"
                                    data-action="mark-read">
                                <i class="fas fa-check"></i>
                            </button>
                        ` : ''}
                        <button class="hrow-btn hrow-btn--view"
                                title="Ver detalles"
                                data-action="view">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="hrow-btn hrow-btn--del"
                                title="Eliminar registro"
                                data-action="delete"
                                data-action-section="historial">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>

            </tr>
        `;
    }

    bindItemEvents() {
        document.querySelectorAll('.history-item').forEach(row => {
            const id = row.dataset.id;

            row.querySelector('[data-action="mark-read"]')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.markAsRead(id);
            });

            row.querySelector('[data-action="view"]')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.viewDetails(id);
            });

            row.querySelector('[data-action="delete"]')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteItem(id);
            });

            row.addEventListener('click', (e) => {
                if (!e.target.closest('.hrow-actions')) {
                    this.viewDetails(id);
                }
            });
        });
    }

    // =============================================================================
    // 5. ACCIONES DEL HISTORIAL (sin cambios en lógica)
    // =============================================================================

    async markAsRead(id) {
        if (!canAction('historial')) {
            showNoPermissionAlert('historial');
            showAlert('Solo lectura: no puedes modificar el historial', 'warning');
            return;
        }
        let preloaderId = null;
        let button = null;

        try {
            button = document.querySelector(`[data-id="${id}"] [data-action="mark-read"]`);
            if (button) this.showButtonPreloader(button, 'Marcando...');

            preloaderId = this.showRowActionPreloader(id, 'mark-read');

            const response = await fetch(`${CONFIG.API_BASE_URL}/notifications/${id}/read`, {
                method: 'PATCH'
            });
            if (!response.ok) throw new Error('Error al marcar como leído');

            const data = await response.json();
            if (data.success) {
                const row = document.querySelector(`[data-id="${id}"]`);
                if (row) {
                    row.classList.add('task-card--completing');
                    setTimeout(() => row.classList.remove('task-card--completing'), 600);
                }
                await new Promise(resolve => setTimeout(resolve, 500));
                this.showNotification('Registro marcado como leído', 'success');
                this.loadHistorial();
                if (window.updateBadge) window.updateBadge();
            }
        } catch (error) {
            console.error('❌ Error marcando como leído:', error);
            this.showNotification('Error al marcar como leído', 'error');
        } finally {
            if (preloaderId) this.hidePreloader(preloaderId);
            if (button) this.restoreButton(button);
        }
    }

    async markAllAsRead() {
        if (!canAction('historial')) {
            showNoPermissionAlert('historial');
            showAlert('Solo lectura: no puedes modificar el historial', 'warning');
            return;
        }
        try {
            const confirmed = await showConfirmation(
                '¿Marcar todos los registros como leídos?',
                'Esta acción afectará a todos los registros del historial.'
            );
            if (!confirmed) return;

            const preloaderId = this.showTablePreloader('historyTableBody', 'Marcando todos como leídos...');

            const response = await fetch(`${CONFIG.API_BASE_URL}/notifications/read-all`, {
                method: 'PATCH'
            });
            if (!response.ok) throw new Error('Error al marcar todos como leídos');

            const data = await response.json();
            if (data.success) {
                await new Promise(resolve => setTimeout(resolve, 800));
                this.showNotification(`${data.data?.cantidad || 0} registros marcados como leídos`, 'success');
                this.loadHistorial();
                if (window.updateBadge) window.updateBadge();
            }
        } catch (error) {
            console.error('❌ Error marcando todos como leídos:', error);
            this.showNotification('Error al marcar todos como leídos', 'error');
        } finally {
            if (typeof preloaderId !== 'undefined') this.hidePreloader(preloaderId);
        }
    }

    async deleteItem(id) {
        if (!canAction('historial')) {
            showNoPermissionAlert('historial');
            showAlert('Solo lectura: no puedes eliminar registros del historial', 'warning');
            return;
        }
        let preloaderId = null;
        let button = null;

        try {
            const item = this.historialData.find(n => n._id === id);
            if (!item) return;

            const confirmed = await showConfirmation(
                '¿Eliminar registro del historial?',
                `Esta acción eliminará permanentemente el registro: "${item.titulo}"`,
                { confirmText: 'Eliminar' }
            );
            if (!confirmed) return;

            button = document.querySelector(`[data-id="${id}"] [data-action="delete"]`);
            if (button) this.showButtonPreloader(button, 'Eliminando...');

            preloaderId = this.showRowActionPreloader(id, 'delete');

            const row = document.querySelector(`[data-id="${id}"]`);
            if (row) row.classList.add('table__row--deleting');

            const response = await fetch(`${CONFIG.API_BASE_URL}/notifications/${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Error al eliminar registro');

            const data = await response.json();
            if (data.success) {
                if (row) {
                    row.classList.add('task-card--removing');
                    await new Promise(resolve => setTimeout(resolve, 400));
                }
                this.showNotification('Registro eliminado correctamente', 'success');
                this.loadHistorial();
            }
        } catch (error) {
            console.error('❌ Error eliminando registro:', error);
            this.showNotification('Error al eliminar registro', 'error');
            const row = document.querySelector(`[data-id="${id}"]`);
            if (row) row.classList.remove('table__row--deleting');
        } finally {
            if (preloaderId) this.hidePreloader(preloaderId);
            if (button) this.restoreButton(button);
        }
    }

    async clearHistorial() {
        if (!canAction('historial')) {
            showNoPermissionAlert('historial');
            showAlert('Solo lectura: no puedes limpiar el historial', 'warning');
            return;
        }
        let preloaderId = null;
        let button = null;

        try {
            const confirmed = await showConfirmation(
                '¿Limpiar todo el historial?',
                'Esta acción eliminará permanentemente TODOS los registros del historial. Esta acción NO se puede deshacer.',
                { confirmText: 'Limpiar todo', cancelText: 'Cancelar' }
            );
            if (!confirmed) return;

            console.log('🧹 Iniciando limpieza completa del historial...');

            button = document.getElementById('clearHistoryBtn');
            if (button) this.showButtonPreloader(button, 'Limpiando...');

            const count = this.totalItems;
            preloaderId = this.showClearAllPreloader(count);

            // INTENTO 1: Eliminar individualmente
            const allNotificationsResponse = await fetch(`${CONFIG.API_BASE_URL}/notifications?limite=10000`);
            if (!allNotificationsResponse.ok) throw new Error('Error al obtener notificaciones');

            const allData = await allNotificationsResponse.json();
            if (allData.success && allData.data.notificaciones && allData.data.notificaciones.length > 0) {
                console.log(`🗑️  Encontradas ${allData.data.notificaciones.length} notificaciones para eliminar`);

                const batchSize = 10;
                const notifications = allData.data.notificaciones;
                let deletedCount = 0;
                let errorCount = 0;

                for (let i = 0; i < notifications.length; i += batchSize) {
                    const batch = notifications.slice(i, i + batchSize);
                    const promises = batch.map(async (notification) => {
                        try {
                            const deleteResponse = await fetch(`${CONFIG.API_BASE_URL}/notifications/${notification._id}`, {
                                method: 'DELETE'
                            });
                            if (deleteResponse.ok) {
                                const deleteData = await deleteResponse.json();
                                if (deleteData.success) { deletedCount++; return true; }
                            }
                            errorCount++;
                            return false;
                        } catch {
                            errorCount++;
                            return false;
                        }
                    });
                    await Promise.all(promises);
                    const progress = Math.min(Math.round(((i + batchSize) / notifications.length) * 100), 100);
                    console.log(`📊 Progreso: ${progress}% (${deletedCount} eliminados)`);
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                if (deletedCount > 0) {
                    console.log(`✅ ${deletedCount} notificaciones eliminadas individualmente`);
                    await new Promise(resolve => setTimeout(resolve, 800));
                    this.showNotification(`Historial limpiado: ${deletedCount} registros eliminados`, 'success');
                    this.currentPage = 1;
                    await this.loadHistorial();
                    return;
                }
            }

            // INTENTO 2: Endpoint masivo
            console.log('🔄 Intentando limpieza masiva...');
            const cleanupResponse = await fetch(`${CONFIG.API_BASE_URL}/notifications/cleanup-all`, {
                method: 'DELETE'
            });

            if (!cleanupResponse.ok) {
                console.log('🔄 Probando con método POST...');
                const postResponse = await fetch(`${CONFIG.API_BASE_URL}/notifications/cleanup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ dias: 0, eliminar_todas: true, confirmar: true })
                });
                if (!postResponse.ok) throw new Error('Error en limpieza masiva');
                const postData = await postResponse.json();
                if (postData.success) {
                    await new Promise(resolve => setTimeout(resolve, 800));
                    this.showNotification(`Historial limpiado: ${postData.data?.cantidad || 'todas'} registros eliminados`, 'success');
                    this.currentPage = 1;
                    await this.loadHistorial();
                    return;
                }
            } else {
                const cleanupData = await cleanupResponse.json();
                if (cleanupData.success) {
                    await new Promise(resolve => setTimeout(resolve, 800));
                    this.showNotification(`Historial limpiado: ${cleanupData.data?.cantidad || 'todas'} registros eliminados`, 'success');
                    this.currentPage = 1;
                    await this.loadHistorial();
                    return;
                }
            }

            throw new Error('No se pudo completar la limpieza del historial');

        } catch (error) {
            console.error('❌ Error limpiando historial:', error);
            if (error.message.includes('401') || error.message.includes('403')) {
                this.showNotification('No tienes permisos para limpiar el historial', 'error');
            } else if (error.message.includes('No se pudo completar')) {
                this.showNotification('No se pudo limpiar completamente. Intenta eliminando registros individualmente.', 'warning');
            } else {
                this.showNotification(`Error al limpiar historial: ${error.message}`, 'error');
            }
        } finally {
            if (preloaderId) this.hidePreloader(preloaderId);
            if (button) this.restoreButton(button);
        }
    }

    async exportHistorial() {
        if (!canAction('historial')) {
            showNoPermissionAlert('historial');
            showAlert('Solo lectura: no puedes exportar el historial', 'warning');
            return;
        }
        let preloaderId = null;
        let button = null;

        try {
            button = document.getElementById('exportHistoryBtn');
            if (button) this.showButtonPreloader(button, 'Exportando...');
            preloaderId = this.showExportPreloader();

            const params = new URLSearchParams();
            if (this.filters.tipo !== 'all') params.append('tipo', this.filters.tipo);
            if (this.filters.prioridad !== 'all') params.append('prioridad', this.filters.prioridad);
            if (this.filters.estado === 'read') params.append('leida', 'true');
            if (this.filters.estado === 'unread') params.append('leida', 'false');
            if (this.filters.fechaDesde) params.append('desde', this.filters.fechaDesde);
            if (this.filters.fechaHasta) params.append('hasta', this.filters.fechaHasta);
            if (this.filters.busqueda) params.append('busqueda', this.filters.busqueda);

            const response = await fetch(`${CONFIG.API_BASE_URL}/notifications?${params}&limite=1000`);
            if (!response.ok) throw new Error('Error al exportar historial');

            const data = await response.json();
            if (data.success && data.data.notificaciones) {
                await new Promise(resolve => setTimeout(resolve, 800));
                this.exportToCSV(data.data.notificaciones);
            } else {
                throw new Error('No hay datos para exportar');
            }
        } catch (error) {
            console.error('❌ Error exportando historial:', error);
            this.showNotification('Error al exportar historial', 'error');
        } finally {
            if (preloaderId) this.hidePreloader(preloaderId);
            if (button) this.restoreButton(button);
        }
    }

    exportToCSV(notificaciones) {
        const headers = ['Fecha', 'Tipo', 'Título', 'Mensaje', 'Prioridad', 'Estado', 'Detalles'];
        const csvRows = [
            headers.join(','),
            ...notificaciones.map(item => {
                const fecha = new Date(item.fecha_creacion || item.createdAt).toLocaleString('es-MX');
                const tipo = this.getTypeText(item.tipo);
                const prioridad = this.getPriorityText(item.prioridad);
                const estado = item.leida ? 'Leído' : 'No leído';
                const detalles = item.metadata ? JSON.stringify(item.metadata) : '';
                return [
                    `"${fecha}"`, `"${tipo}"`, `"${item.titulo}"`,
                    `"${item.mensaje}"`, `"${prioridad}"`, `"${estado}"`, `"${detalles}"`
                ].join(',');
            })
        ];
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const fechaExportacion = new Date().toISOString().split('T')[0];
        link.setAttribute('href', url);
        link.setAttribute('download', `historial_sistema_${fechaExportacion}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.showNotification('Historial exportado correctamente', 'success');
    }

    // =============================================================================
    // 5b. VER DETALLES — MODAL RENOVADO (solo presentación)
    // =============================================================================

    viewDetails(id) {
        const item = this.historialData.find(n => n._id === id);
        if (!item) return;

        const fecha = new Date(item.fecha_creacion || item.createdAt);
        const fechaFormateada = fecha.toLocaleString('es-MX', {
            weekday: 'long', year: 'numeric', month: 'long',
            day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
        });

        const prioridadCss = this._getPriorityCSS(item.prioridad);
        const prioridadTxt = this.getPriorityText(item.prioridad);
        const tipoTxt = this.getTypeText(item.tipo);
        const tipoIcon = this.getTypeIcon(item.tipo);

        const modalHTML = `
            <div id="historyDetailModal" class="modal hdetail-modal">
                <article class="modal__content">
                    <header class="modal__header">
                        <h3 class="modal__title">Detalles del registro</h3>
                        <button class="modal__close">&times;</button>
                    </header>

                    <section class="modal__body">

                        <!-- Encabezado del detalle -->
                        <div class="hdetail-header">
                            <div class="hdetail-header__icon" data-tipo="${item.tipo}">
                                <i class="fas fa-${tipoIcon}"></i>
                            </div>
                            <div style="flex:1;min-width:0;">
                                <p class="hdetail-header__title">${item.titulo}</p>
                                <div class="hdetail-header__badges">
                                    <span class="hrow-priority ${prioridadCss}">${prioridadTxt}</span>
                                    <span class="hrow-status ${item.leida ? 'hrow-status--read' : 'hrow-status--unread'}">
                                        <span class="hrow-status__dot"></span>
                                        ${item.leida ? 'Leído' : 'No leído'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- Fecha y tipo -->
                        <div class="hdetail-section">
                            <p class="hdetail-section__label">
                                <i class="fas fa-clock"></i> Fecha y tipo
                            </p>
                            <div class="hdetail-meta-grid">
                                <div class="hdetail-meta-item">
                                    <span class="hdetail-meta-item__key">Fecha y hora</span>
                                    <span class="hdetail-meta-item__val">${fechaFormateada}</span>
                                </div>
                                <div class="hdetail-meta-item">
                                    <span class="hdetail-meta-item__key">Tipo de evento</span>
                                    <span class="hdetail-meta-item__val">${tipoTxt}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Mensaje -->
                        <div class="hdetail-section">
                            <p class="hdetail-section__label">
                                <i class="fas fa-comment-alt"></i> Mensaje
                            </p>
                            <div class="hdetail-message-box">${item.mensaje}</div>
                        </div>

                        <!-- Metadata -->
                        ${item.metadata && Object.keys(item.metadata).length > 0 ? `
                            <div class="hdetail-section">
                                <p class="hdetail-section__label">
                                    <i class="fas fa-info-circle"></i> Información adicional
                                </p>
                                <div class="hdetail-meta-grid">
                                    ${Object.entries(item.metadata).map(([key, value]) => `
                                        <div class="hdetail-meta-item">
                                            <span class="hdetail-meta-item__key">${this.formatMetadataKey(key)}</span>
                                            <span class="hdetail-meta-item__val">${this.formatMetadataValue(value)}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}

                        <!-- Documento relacionado -->
                        ${item.documento_id ? `
                            <div class="hdetail-section">
                                <p class="hdetail-section__label">
                                    <i class="fas fa-paperclip"></i> Documento relacionado
                                </p>
                                <div class="hdetail-related">
                                    <i class="fas fa-file-alt"></i>
                                    <span>${item.documento_id.nombre_original || 'Documento'}</span>
                                </div>
                            </div>
                        ` : ''}

                        <!-- Persona relacionada -->
                        ${item.persona_id ? `
                            <div class="hdetail-section">
                                <p class="hdetail-section__label">
                                    <i class="fas fa-user-circle"></i> Persona relacionada
                                </p>
                                <div class="hdetail-related">
                                    <i class="fas fa-user"></i>
                                    <span>${item.persona_id.nombre || 'Persona'}</span>
                                </div>
                            </div>
                        ` : ''}

                    </section>

                    <footer class="modal__footer">
                        ${!item.leida ? `
                            <button class="btn btn--primary" id="markReadDetailBtn">
                                <i class="fas fa-check"></i> Marcar como leído
                            </button>
                        ` : ''}
                        <button class="btn btn--outline" id="closeDetailBtn">Cerrar</button>
                    </footer>
                </article>
            </div>
        `;

        // Insertar modal
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer.firstElementChild);

        const modal = document.getElementById('historyDetailModal');
        const closeBtn = modal.querySelector('.modal__close');
        const closeDetailBtn = modal.querySelector('#closeDetailBtn');
        const markReadBtn = modal.querySelector('#markReadDetailBtn');

        // Aplicar colores al icono del modal según tipo
        const detailIcon = modal.querySelector('.hdetail-header__icon');
        if (detailIcon) {
            detailIcon.className = `hdetail-header__icon hrow-type__icon`;
            // El data-tipo en el tr aplica el color via CSS, para el modal usamos inline
            const iconColors = {
                documento_subido: { bg: '#e0e7ff', color: '#6366f1' },
                documento_eliminado: { bg: '#ffe4e6', color: '#f43f5e' },
                documento_proximo_vencer: { bg: '#fef3c7', color: '#f59e0b' },
                documento_vencido: { bg: '#fee2e2', color: '#ef4444' },
                persona_agregada: { bg: '#e0f2fe', color: '#0ea5e9' },
                persona_eliminada: { bg: '#fce7f3', color: '#ec4899' },
                categoria_agregada: { bg: '#ede9fe', color: '#8b5cf6' },
                reporte_generado: { bg: '#ccfbf1', color: '#14b8a6' },
                sistema_iniciado: { bg: '#d1fae5', color: '#10b981' },
                error_sistema: { bg: '#fee2e2', color: '#ef4444' },
            };
            const colors = iconColors[item.tipo] || { bg: '#e0e7ff', color: '#6366f1' };
            Object.assign(detailIcon.style, {
                background: colors.bg, color: colors.color,
                width: '46px', height: '46px', borderRadius: '12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.1rem', flexShrink: '0'
            });
        }

        // Mostrar modal
        modal.style.display = 'flex';
        modal.offsetHeight;
        setTimeout(() => {
            modal.style.opacity = '1';
            modal.style.visibility = 'visible';
        }, 10);

        const closeModal = (remove = true) => {
            modal.style.opacity = '0';
            modal.style.visibility = 'hidden';
            setTimeout(() => {
                modal.style.display = 'none';
                if (remove) modal.remove();
            }, 300);
        };

        closeBtn.addEventListener('click', () => closeModal());
        closeDetailBtn.addEventListener('click', () => closeModal());
        if (markReadBtn) {
            markReadBtn.addEventListener('click', async () => {
                await this.markAsRead(id);
                closeModal();
            });
        }
        modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

        const handleEscKey = (e) => {
            if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', handleEscKey); }
        };
        document.addEventListener('keydown', handleEscKey);
    }

    // NOTIFICACIÓN FLOTANTE: ahora delegada al sistema central `alertSystem`.
    // El método local fue eliminado para evitar implementaciones duplicadas.

    // =============================================================================
    // 7. PAGINACIÓN (sin cambios)
    // =============================================================================

    updatePagination() {
        const prevBtn = document.querySelector('.pagination__btn--prev');
        const nextBtn = document.querySelector('.pagination__btn--next');
        const paginationInfo = document.getElementById('paginationInfo');
        if (!prevBtn || !nextBtn || !paginationInfo) return;

        prevBtn.disabled = this.currentPage <= 1;
        nextBtn.disabled = this.currentPage >= this.totalPages;
        paginationInfo.textContent = `Página ${this.currentPage} de ${this.totalPages} (${this.totalItems} registros)`;
    }

    async previousPage() {
        if (this.currentPage > 1) { this.currentPage--; await this.loadHistorial(); }
    }

    async nextPage() {
        if (this.currentPage < this.totalPages) { this.currentPage++; await this.loadHistorial(); }
    }

    // =============================================================================
    // 8. ESTADÍSTICAS (sin cambios)
    // =============================================================================

    async updateStats() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const total = this.totalItems;
            const unread = this.historialData.filter(item => !item.leida).length;
            const todayCount = this.historialData.filter(item => {
                const itemDate = new Date(item.fecha_creacion || item.createdAt);
                itemDate.setHours(0, 0, 0, 0);
                return itemDate.getTime() === today.getTime();
            }).length;
            const critical = this.historialData.filter(item => item.prioridad === 'critica').length;

            const el = (id) => document.getElementById(id);
            if (el('totalHistory')) el('totalHistory').textContent = total.toLocaleString();
            if (el('unreadHistory')) el('unreadHistory').textContent = unread.toLocaleString();
            if (el('todayHistory')) el('todayHistory').textContent = todayCount.toLocaleString();
            if (el('criticalHistory')) el('criticalHistory').textContent = critical.toLocaleString();
        } catch (error) {
            console.error('❌ Error actualizando estadísticas:', error);
        }
    }

    // =============================================================================
    // 9. FUNCIONES AUXILIARES
    // =============================================================================

    /** CSS class para badge de prioridad (nuevo naming) */
    _getPriorityCSS(priority) {
        const map = {
            critica: 'hrow-priority--critica',
            alta: 'hrow-priority--alta',
            media: 'hrow-priority--media',
            baja: 'hrow-priority--baja'
        };
        return map[priority] || 'hrow-priority--media';
    }

    /** Mantiene compatibilidad con código que usa getPriorityClass (preloaders, etc.) */
    getPriorityClass(priority) {
        return this._getPriorityCSS(priority);
    }

    getPriorityText(priority) {
        const texts = { critica: 'Crítica', alta: 'Alta', media: 'Media', baja: 'Baja' };
        return texts[priority] || 'Media';
    }

    getTypeIcon(type) {
        const icons = {
            documento_subido: 'file-upload',
            documento_eliminado: 'trash',
            documento_restaurado: 'undo',
            documento_proximo_vencer: 'clock',
            documento_vencido: 'exclamation-triangle',
            persona_agregada: 'user-plus',
            persona_eliminada: 'user-minus',
            categoria_agregada: 'folder-plus',
            reporte_generado: 'chart-bar',
            sistema_iniciado: 'check-circle',
            error_sistema: 'exclamation-circle'
        };
        return icons[type] || 'bell';
    }

    getTypeText(type) {
        const texts = {
            documento_subido: 'Documento Subido',
            documento_eliminado: 'Documento Eliminado',
            documento_restaurado: 'Documento Restaurado',
            documento_proximo_vencer: 'Documento por Vencer',
            documento_vencido: 'Documento Vencido',
            persona_agregada: 'Persona Agregada',
            persona_eliminada: 'Persona Eliminada',
            categoria_agregada: 'Categoría Agregada',
            reporte_generado: 'Reporte Generado',
            sistema_iniciado: 'Sistema Iniciado',
            error_sistema: 'Error del Sistema',
            tarea_recordatorio: 'tasks',
            calendario_recordatorio: 'calendar-alt',
            tarea_recordatorio: 'Recordatorio de Tarea',
            calendario_recordatorio: 'Recordatorio de Calendario'
        };
        return texts[type] || type;
    }

    formatMetadata(metadata) {
        return Object.entries(metadata)
            .map(([key, value]) => `${this.formatMetadataKey(key)}: ${this.formatMetadataValue(value)}`)
            .join(', ');
    }

    formatMetadataKey(key) {
        const keyMap = {
            tipo_archivo: 'Tipo de archivo',
            tamano: 'Tamaño',
            categoria: 'Categoría',
            dias_restantes: 'Días restantes',
            fecha_vencimiento: 'Fecha de vencimiento',
            departamento: 'Departamento',
            puesto: 'Puesto',
            tipo_reporte: 'Tipo de reporte',
            formato: 'Formato',
            registros: 'Registros',
            fecha_inicio: 'Fecha de inicio',
            version: 'Versión'
        };
        return keyMap[key] || key.replace(/_/g, ' ');
    }

    formatMetadataValue(value) {
        if (value instanceof Date) return new Date(value).toLocaleString('es-MX');
        if (typeof value === 'object') return JSON.stringify(value);
        return value;
    }

    hasFilters() {
        return Object.values(this.filters).some(value =>
            value !== 'all' && value !== '' && value !== null && value !== undefined
        );
    }

    // =============================================================================
    // 10. LIMPIEZA
    // =============================================================================

    destroy() {
        this.cleanupPreloaders();
        console.log('🧹 Módulo de historial limpiado');
    }
}

// =============================================================================
// 11. INICIALIZACIÓN GLOBAL
// =============================================================================

let historialManager = null;

export function initHistorial() {
    if (!historialManager) {
        historialManager = new HistorialManager().init();
        window.historialManager = historialManager;
    }
    return historialManager;
}

export function loadTabSpecificHistorial() {
    if (historialManager) {
        historialManager.loadHistorial();
    } else {
        initHistorial();
    }
}

export default HistorialManager;