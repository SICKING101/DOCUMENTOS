// =============================================================================
// MÓDULO DE HISTORIAL DEL SISTEMA CON PRELOADERS
// =============================================================================

import { CONFIG } from '../config.js';
import { showAlert, showConfirmation } from '../utils.js';

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
        this.activePreloaders = new Set(); // Para rastrear preloaders activos
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
        // Botones de acción con preloader
        document.getElementById('refreshHistoryBtn')?.addEventListener('click', () => this.loadHistorial());
        document.getElementById('clearHistoryBtn')?.addEventListener('click', () => this.clearHistorial());
        document.getElementById('exportHistoryBtn')?.addEventListener('click', () => this.exportHistorial());
        
        // Filtros
        document.getElementById('filterType')?.addEventListener('change', (e) => {
            this.filters.tipo = e.target.value;
            this.loadHistorial();
        });
        
        document.getElementById('filterPriority')?.addEventListener('change', (e) => {
            this.filters.prioridad = e.target.value;
            this.loadHistorial();
        });
        
        document.getElementById('filterRead')?.addEventListener('change', (e) => {
            this.filters.estado = e.target.value;
            this.loadHistorial();
        });
        
        document.getElementById('filterDateFrom')?.addEventListener('change', (e) => {
            this.filters.fechaDesde = e.target.value;
            this.loadHistorial();
        });
        
        document.getElementById('filterDateTo')?.addEventListener('change', (e) => {
            this.filters.fechaHasta = e.target.value;
            this.loadHistorial();
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
        
        // Paginación con preloader
        document.querySelector('.pagination__btn--prev')?.addEventListener('click', () => this.previousPage());
        document.querySelector('.pagination__btn--next')?.addEventListener('click', () => this.nextPage());
    }

    // =============================================================================
    // 2. PRELOADER UTILITIES
    // =============================================================================

    /**
     * Muestra un preloader de overlay en una tabla
     */
    showTablePreloader(tableId, message = 'Cargando datos...') {
        const table = document.getElementById(tableId);
        if (!table) return null;
        
        // Crear overlay de preloader
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

/**
 * Muestra un preloader en un botón (VERSIÓN CORREGIDA)
 */
showButtonPreloader(button, text = 'Procesando...') {
    if (!button) return button;
    
    // GUARDAR EL CONTENIDO COMPLETO DEL BOTÓN
    button.setAttribute('data-original-html', button.innerHTML);
    button.setAttribute('data-original-text', button.textContent);
    
    // Guardar también el ID del botón para referencia
    const buttonId = button.id || `btn-${Date.now()}`;
    button.setAttribute('data-original-id', buttonId);
    
    // Crear contenido del preloader
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

    /**
     * Oculta un preloader específico
     */
    hidePreloader(preloaderId) {
        const preloader = document.getElementById(preloaderId);
        if (preloader) {
            preloader.style.opacity = '0';
            setTimeout(() => preloader.remove(), 300);
        }
        this.activePreloaders.delete(preloaderId);
    }

    /**
 * Restaura un botón a su estado original (VERSIÓN CORREGIDA)
 */
restoreButton(button) {
    if (!button) {
        console.warn('restoreButton: button es null');
        return;
    }
    
    const buttonId = button.id || button.getAttribute('data-original-id');
    console.log(`Restaurando botón: ${buttonId}`);
    
    // OBTENER CONTENIDO ORIGINAL ESPECÍFICO DE CADA BOTÓN
    const originalHTML = button.getAttribute('data-original-html');
    
    if (originalHTML) {
        // Restaurar el contenido HTML exacto que tenía antes
        button.innerHTML = originalHTML;
        
        // Remover atributos temporales
        button.removeAttribute('data-original-html');
        button.removeAttribute('data-original-text');
        button.removeAttribute('data-original-id');
        
        console.log(`Botón ${buttonId} restaurado con contenido original`);
    } else {
        // Si no hay HTML guardado, restaurar basado en el ID del botón
        console.warn(`No se encontró data-original-html para botón: ${buttonId}, restaurando por ID`);
        
        // Restaurar contenido basado en el tipo de botón
        this.restoreButtonByType(button);
    }
    
    // Restaurar estado
    button.disabled = false;
    button.classList.remove('btn--loading');
    
    console.log(`Botón ${buttonId} restaurado exitosamente`);
}

/**
 * Restaura un botón basado en su tipo/función
 */
restoreButtonByType(button) {
    const buttonId = button.id;
    
    // Contenido específico para cada tipo de botón
    const buttonContents = {
        'refreshHistoryBtn': '<i class="fas fa-sync-alt"></i> Actualizar',
        'clearHistoryBtn': '<i class="fas fa-broom"></i> Limpiar Historial',
        'exportHistoryBtn': '<i class="fas fa-file-export"></i> Exportar CSV',
        'markAllReadBtn': '<i class="fas fa-check-double"></i> Marcar Todo como Leído',
        // Agregar más botones según sea necesario
    };
    
    // Restaurar contenido basado en el ID
    if (buttonId && buttonContents[buttonId]) {
        button.innerHTML = buttonContents[buttonId];
    } else {
        // Contenido por defecto si no se reconoce el botón
        button.innerHTML = '<i class="fas fa-check"></i> Listo';
    }
}

    /**
     * Muestra un preloader de acción en una fila específica
     */
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

    /**
     * Muestra preloader global para limpieza completa
     */
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
        
        // Animar la barra de progreso
        setTimeout(() => {
            const progressBar = document.querySelector(`#${preloaderId} .clear-tasks-indicator__progress-bar`);
            if (progressBar) {
                progressBar.style.width = '100%';
            }
        }, 100);
        
        return preloaderId;
    }

    /**
     * Muestra preloader para exportación
     */
    showExportPreloader() {
        const preloaderId = `export-preloader-${Date.now()}`;
        const preloaderHTML = `
            <div class="document-upload-preloader" id="${preloaderId}" style="position: fixed; bottom: 20px; right: 20px;">
                <div class="document-upload-preloader__content">
                    <div class="document-upload-preloader__header">
                        <h3 class="document-upload-preloader__title">
                            <i class="fas fa-file-export"></i> Exportando Historial
                        </h3>
                    </div>
                    <div class="document-upload-preloader__content">
                        <div class="upload-preloader">
                            <div class="upload-preloader__dropzone">
                                <div class="upload-preloader__icon">
                                    <i class="fas fa-file-csv"></i>
                                </div>
                                <div class="upload-preloader__text">
                                    Generando archivo CSV...
                                </div>
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
        
        // Animar la barra de progreso
        setTimeout(() => {
            const progressBar = document.querySelector(`#${preloaderId} .upload-preloader__file-progress-bar`);
            if (progressBar) {
                progressBar.style.width = '100%';
            }
        }, 100);
        
        return preloaderId;
    }

    /**
     * Limpia todos los preloaders activos
     */
    cleanupPreloaders() {
        this.activePreloaders.forEach(preloaderId => {
            this.hidePreloader(preloaderId);
        });
        this.activePreloaders.clear();
    }

    // =============================================================================
    // 3. CARGAR HISTORIAL
    // =============================================================================

    async loadHistorial() {
        let preloaderId = null;
        let refreshButton = null;
        
        try {
            console.log('📥 Cargando historial...');
            
            // Mostrar preloader en la tabla
            preloaderId = this.showTablePreloader('historyTableBody', 'Cargando registros...');
            
            // Mostrar preloader en botón de refresh si está activo
            refreshButton = document.getElementById('refreshHistoryBtn');
            if (refreshButton) {
                this.showButtonPreloader(refreshButton, 'Actualizando...');
            }
            
            const params = new URLSearchParams({
                pagina: this.currentPage,
                limite: this.itemsPerPage
            });

            // Aplicar filtros
            if (this.filters.tipo !== 'all') params.append('tipo', this.filters.tipo);
            if (this.filters.prioridad !== 'all') params.append('prioridad', this.filters.prioridad);
            if (this.filters.estado === 'read') params.append('leida', 'true');
            if (this.filters.estado === 'unread') params.append('leida', 'false');
            if (this.filters.fechaDesde) params.append('desde', this.filters.fechaDesde);
            if (this.filters.fechaHasta) params.append('hasta', this.filters.fechaHasta);

            const response = await fetch(`${CONFIG.API_BASE_URL}/notifications?${params}`);
            
            if (!response.ok) {
                throw new Error('Error al cargar historial');
            }

            const data = await response.json();
            
            if (data.success) {
                this.historialData = data.data.notificaciones || [];
                this.totalItems = data.data.total || 0;
                this.totalPages = data.data.totalPaginas || 1;
                
                // Pequeña pausa para que se vea el preloader
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                this.renderHistorial();
                this.updateStats();
                this.updatePagination();
                
                console.log(`✅ Historial cargado: ${this.historialData.length} registros`);
                
                // Mostrar notificación sutil si hay resultados
                if (this.historialData.length > 0) {
                    this.showNotification(`Cargados ${this.historialData.length} registros`, 'success');
                }
            } else {
                throw new Error(data.message || 'Error al cargar historial');
            }
        } catch (error) {
            console.error('❌ Error cargando historial:', error);
            this.showNotification('Error al cargar el historial', 'error');
        } finally {
            // Ocultar preloaders
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
                    <td colspan="6" class="empty-state">
                        <i class="fas fa-history empty-state__icon"></i>
                        <h3 class="empty-state__title">No hay registros de historial</h3>
                        <p class="empty-state__description">${this.hasFilters() ? 'Intenta con otros filtros' : 'Las actividades del sistema aparecerán aquí'}</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.historialData.map(item => this.renderHistoryItem(item)).join('');
        
        // Vincular eventos de acciones
        this.bindItemEvents();
    }

    renderHistoryItem(item) {
        const fecha = new Date(item.fecha_creacion || item.createdAt);
        const fechaFormateada = fecha.toLocaleString('es-MX', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const prioridadClass = this.getPriorityClass(item.prioridad);
        const tipoIcon = this.getTypeIcon(item.tipo);
        const tipoTexto = this.getTypeText(item.tipo);
        const leidoClass = item.leida ? 'status-badge--read' : 'status-badge--unread';
        const leidoTexto = item.leida ? 'Leído' : 'No leído';
        
        return `
            <tr class="history-item ${item.leida ? '' : 'history-item--unread'}" data-id="${item._id}">
                <td class="table__cell table__cell--date">
                    <span class="date-time">${fechaFormateada}</span>
                </td>
                <td class="table__cell">
                    <div class="history-type">
                        <i class="fas fa-${tipoIcon}"></i>
                        <span>${tipoTexto}</span>
                    </div>
                </td>
                <td class="table__cell">
                    <div class="history-details">
                        <p class="detail-message">${item.mensaje}</p>
                        ${item.metadata && Object.keys(item.metadata).length > 0 ? `
                            <div class="detail-metadata">
                                <small>${this.formatMetadata(item.metadata)}</small>
                            </div>
                        ` : ''}
                    </div>
                </td>
                <td class="table__cell">
                    <span class="priority-badge ${prioridadClass}">
                        ${this.getPriorityText(item.prioridad)}
                    </span>
                </td>
                <td class="table__cell">
                    <span class="status-badge ${leidoClass}">
                        ${leidoTexto}
                    </span>
                </td>
                <td class="table__cell">
                    <div class="table__actions">
                        ${!item.leida ? `
                            <button class="btn btn--icon btn--sm btn--primary" title="Marcar como leído" data-action="mark-read">
                                <i class="fas fa-check"></i>
                            </button>
                        ` : ''}
                        <button class="btn btn--icon btn--sm" title="Ver detalles" data-action="view">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn--icon btn--sm btn--danger" title="Eliminar registro" data-action="delete">
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
            
            // Marcar como leído
            row.querySelector('[data-action="mark-read"]')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.markAsRead(id);
            });
            
            // Ver detalles
            row.querySelector('[data-action="view"]')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.viewDetails(id);
            });
            
            // Eliminar
            row.querySelector('[data-action="delete"]')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteItem(id);
            });
            
            // Click en toda la fila
            row.addEventListener('click', (e) => {
                if (!e.target.closest('.table__actions')) {
                    this.viewDetails(id);
                }
            });
        });
    }

    // =============================================================================
    // 5. ACCIONES DEL HISTORIAL
    // =============================================================================

    async markAsRead(id) {
        let preloaderId = null;
        let button = null;
        
        try {
            // Encontrar el botón que disparó la acción
            button = document.querySelector(`[data-id="${id}"] [data-action="mark-read"]`);
            if (button) {
                this.showButtonPreloader(button, 'Marcando...');
            }
            
            // Mostrar preloader en la fila
            preloaderId = this.showRowActionPreloader(id, 'mark-read');
            
            const response = await fetch(`${CONFIG.API_BASE_URL}/notifications/${id}/read`, {
                method: 'PATCH'
            });

            if (!response.ok) {
                throw new Error('Error al marcar como leído');
            }

            const data = await response.json();
            
            if (data.success) {
                // Mostrar estado de éxito
                const row = document.querySelector(`[data-id="${id}"]`);
                if (row) {
                    row.classList.add('task-card--completing');
                    setTimeout(() => row.classList.remove('task-card--completing'), 600);
                }
                
                // Pequeña pausa para mostrar el preloader
                await new Promise(resolve => setTimeout(resolve, 500));
                
                this.showNotification('Registro marcado como leído', 'success');
                this.loadHistorial();
                
                // Actualizar contador en notificaciones si existe
                if (window.updateBadge) {
                    window.updateBadge();
                }
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

            if (!response.ok) {
                throw new Error('Error al marcar todos como leídos');
            }

            const data = await response.json();
            
            if (data.success) {
                // Pequeña pausa para mostrar el preloader
                await new Promise(resolve => setTimeout(resolve, 800));
                
                this.showNotification(`${data.data?.cantidad || 0} registros marcados como leídos`, 'success');
                this.loadHistorial();
                
                // Actualizar contador en notificaciones
                if (window.updateBadge) {
                    window.updateBadge();
                }
            }
        } catch (error) {
            console.error('❌ Error marcando todos como leídos:', error);
            this.showNotification('Error al marcar todos como leídos', 'error');
        } finally {
            if (preloaderId) this.hidePreloader(preloaderId);
        }
    }

    async deleteItem(id) {
        let preloaderId = null;
        let button = null;
        
        try {
            const item = this.historialData.find(n => n._id === id);
            if (!item) return;

            // Usar showConfirmation con el nuevo modal
            const confirmed = await showConfirmation(
                '¿Eliminar registro del historial?',
                `Esta acción eliminará permanentemente el registro: "${item.titulo}"`,
                { confirmText: 'Eliminar' }
            );
            
            if (!confirmed) return;

            // Encontrar el botón que disparó la acción
            button = document.querySelector(`[data-id="${id}"] [data-action="delete"]`);
            if (button) {
                this.showButtonPreloader(button, 'Eliminando...');
            }
            
            // Mostrar preloader en la fila
            preloaderId = this.showRowActionPreloader(id, 'delete');
            
            // Añadir clase de eliminación a la fila
            const row = document.querySelector(`[data-id="${id}"]`);
            if (row) {
                row.classList.add('table__row--deleting');
            }

            const response = await fetch(`${CONFIG.API_BASE_URL}/notifications/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Error al eliminar registro');
            }

            const data = await response.json();
            
            if (data.success) {
                // Animación de eliminación
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
            
            // Remover clase de eliminación si hay error
            const row = document.querySelector(`[data-id="${id}"]`);
            if (row) {
                row.classList.remove('table__row--deleting');
            }
        } finally {
            if (preloaderId) this.hidePreloader(preloaderId);
            if (button) this.restoreButton(button);
        }
    }

    async clearHistorial() {
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
            
            // Mostrar preloader en botón
            button = document.getElementById('clearHistoryBtn');
            if (button) {
                this.showButtonPreloader(button, 'Limpiando...');
            }

            // Obtener conteo actual para mostrar en preloader
            const count = this.totalItems;
            preloaderId = this.showClearAllPreloader(count);

            // INTENTO 1: Eliminar todas las notificaciones individualmente
            const allNotificationsResponse = await fetch(`${CONFIG.API_BASE_URL}/notifications?limite=10000`);
            
            if (!allNotificationsResponse.ok) {
                throw new Error('Error al obtener notificaciones');
            }

            const allData = await allNotificationsResponse.json();
            
            if (allData.success && allData.data.notificaciones && allData.data.notificaciones.length > 0) {
                console.log(`🗑️  Encontradas ${allData.data.notificaciones.length} notificaciones para eliminar`);
                
                // Eliminar en lotes para mostrar progreso
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
                                if (deleteData.success) {
                                    deletedCount++;
                                    return true;
                                }
                            }
                            errorCount++;
                            return false;
                        } catch (error) {
                            errorCount++;
                            return false;
                        }
                    });
                    
                    await Promise.all(promises);
                    
                    // Actualizar progreso visualmente
                    const progress = Math.min(Math.round(((i + batchSize) / notifications.length) * 100), 100);
                    console.log(`📊 Progreso: ${progress}% (${deletedCount} eliminados)`);
                    
                    // Pequeña pausa para no sobrecargar
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                
                if (deletedCount > 0) {
                    console.log(`✅ ${deletedCount} notificaciones eliminadas individualmente`);
                    
                    // Esperar para que se complete la animación
                    await new Promise(resolve => setTimeout(resolve, 800));
                    
                    this.showNotification(`Historial limpiado: ${deletedCount} registros eliminados`, 'success');
                    
                    // Recargar el historial
                    this.currentPage = 1;
                    await this.loadHistorial();
                    return;
                }
            }
            
            // INTENTO 2: Usar endpoint de cleanup
            console.log('🔄 Intentando limpieza masiva...');
            
            const cleanupResponse = await fetch(`${CONFIG.API_BASE_URL}/notifications/cleanup-all`, {
                method: 'DELETE'
            });

            if (!cleanupResponse.ok) {
                console.log('🔄 Probando con método POST...');
                
                const postResponse = await fetch(`${CONFIG.API_BASE_URL}/notifications/cleanup`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        dias: 0,
                        eliminar_todas: true,
                        confirmar: true 
                    })
                });

                if (!postResponse.ok) {
                    throw new Error('Error en limpieza masiva');
                }

                const postData = await postResponse.json();
                
                if (postData.success) {
                    console.log(`✅ Limpieza masiva completada: ${postData.data?.cantidad || 'todas'} registros eliminados`);
                    
                    // Esperar para que se complete la animación
                    await new Promise(resolve => setTimeout(resolve, 800));
                    
                    this.showNotification(`Historial limpiado: ${postData.data?.cantidad || 'todas'} registros eliminados`, 'success');
                    
                    // Recargar el historial
                    this.currentPage = 1;
                    await this.loadHistorial();
                    return;
                }
            } else {
                const cleanupData = await cleanupResponse.json();
                
                if (cleanupData.success) {
                    console.log(`✅ Limpieza masiva completada: ${cleanupData.data?.cantidad || 'todas'} registros eliminados`);
                    
                    // Esperar para que se complete la animación
                    await new Promise(resolve => setTimeout(resolve, 800));
                    
                    this.showNotification(`Historial limpiado: ${cleanupData.data?.cantidad || 'todas'} registros eliminados`, 'success');
                    
                    // Recargar el historial
                    this.currentPage = 1;
                    await this.loadHistorial();
                    return;
                }
            }
            
            // Si llegamos aquí, ambos métodos fallaron
            throw new Error('No se pudo completar la limpieza del historial');
            
        } catch (error) {
            console.error('❌ Error limpiando historial:', error);
            
            // Verificar si el error es específico de permisos
            if (error.message.includes('401') || error.message.includes('403')) {
                this.showNotification('No tienes permisos para limpiar el historial', 'error');
            } else if (error.message.includes('No se pudo completar')) {
                this.showNotification('No se pudo limpiar el historial completamente. Intenta eliminando registros individualmente.', 'warning');
            } else {
                this.showNotification(`Error al limpiar historial: ${error.message}`, 'error');
            }
        } finally {
            if (preloaderId) this.hidePreloader(preloaderId);
            if (button) this.restoreButton(button);
        }
    }

    async exportHistorial() {
        let preloaderId = null;
        let button = null;
        
        try {
            button = document.getElementById('exportHistoryBtn');
            if (button) {
                this.showButtonPreloader(button, 'Exportando...');
            }
            
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
            
            if (!response.ok) {
                throw new Error('Error al exportar historial');
            }

            const data = await response.json();
            
            if (data.success && data.data.notificaciones) {
                // Esperar un momento para mostrar el preloader
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
                    `"${fecha}"`,
                    `"${tipo}"`,
                    `"${item.titulo}"`,
                    `"${item.mensaje}"`,
                    `"${prioridad}"`,
                    `"${estado}"`,
                    `"${detalles}"`
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

    /**
     * Muestra notificación flotante
     */
    showNotification(message, type = 'info') {
        const notificationId = `notification-${Date.now()}`;
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        const notificationHTML = `
            <div class="floating-notification floating-notification--${type}" id="${notificationId}">
                <div class="floating-notification__content">
                    <i class="${icons[type] || icons.info}"></i>
                    <span>${message}</span>
                </div>
                <button class="floating-notification__close" onclick="document.getElementById('${notificationId}').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        // Crear contenedor si no existe
        let notificationsContainer = document.querySelector('.notifications');
        if (!notificationsContainer) {
            notificationsContainer = document.createElement('div');
            notificationsContainer.className = 'notifications';
            document.body.appendChild(notificationsContainer);
        }
        
        notificationsContainer.insertAdjacentHTML('afterbegin', notificationHTML);
        
        // Mostrar animación
        setTimeout(() => {
            const notification = document.getElementById(notificationId);
            if (notification) {
                notification.classList.add('floating-notification--visible');
            }
        }, 10);
        
        // Auto-remover después de 5 segundos
        setTimeout(() => {
            const notification = document.getElementById(notificationId);
            if (notification) {
                notification.classList.remove('floating-notification--visible');
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
        
        return notificationId;
    }

    viewDetails(id) {
        const item = this.historialData.find(n => n._id === id);
        if (!item) return;

        const fecha = new Date(item.fecha_creacion || item.createdAt);
        const fechaFormateada = fecha.toLocaleString('es-MX', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        const prioridadClass = this.getPriorityClass(item.prioridad);
        const prioridadTexto = this.getPriorityText(item.prioridad);
        const tipoTexto = this.getTypeText(item.tipo);
        
        // Crear modal de detalles
        const modalHTML = `
            <div id="historyDetailModal" class="modal">
                <article class="modal__content">
                    <header class="modal__header">
                        <h3 class="modal__title">Detalles del Registro</h3>
                        <button class="modal__close">&times;</button>
                    </header>
                    <section class="modal__body">
                        <div class="history-detail">
                            <div class="detail-header">
                                <div class="detail-title">
                                    <h4>${item.titulo}</h4>
                                    <span class="priority-badge ${prioridadClass}">${prioridadTexto}</span>
                                </div>
                                <div class="detail-meta">
                                    <span class="detail-date"><i class="far fa-calendar"></i> ${fechaFormateada}</span>
                                    <span class="detail-type"><i class="fas fa-tag"></i> ${tipoTexto}</span>
                                </div>
                            </div>
                            
                            <div class="detail-content">
                                <h5>Mensaje:</h5>
                                <p class="detail-message">${item.mensaje}</p>
                                
                                ${item.metadata && Object.keys(item.metadata).length > 0 ? `
                                    <h5>Información Adicional:</h5>
                                    <div class="detail-metadata">
                                        ${Object.entries(item.metadata).map(([key, value]) => `
                                            <div class="metadata-item">
                                                <strong>${this.formatMetadataKey(key)}:</strong>
                                                <span>${this.formatMetadataValue(value)}</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : ''}
                                
                                ${item.documento_id ? `
                                    <h5>Documento Relacionado:</h5>
                                    <div class="detail-related">
                                        <i class="fas fa-file"></i>
                                        <span>${item.documento_id.nombre_original || 'Documento'}</span>
                                    </div>
                                ` : ''}
                                
                                ${item.persona_id ? `
                                    <h5>Persona Relacionada:</h5>
                                    <div class="detail-related">
                                        <i class="fas fa-user"></i>
                                        <span>${item.persona_id.nombre || 'Persona'}</span>
                                    </div>
                                ` : ''}
                            </div>
                            
                            <div class="detail-footer">
                                <div class="detail-status">
                                    <span class="status-badge ${item.leida ? 'status-badge--read' : 'status-badge--unread'}">
                                        ${item.leida ? 'Leído' : 'No leído'}
                                    </span>
                                </div>
                            </div>
                        </div>
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

        // Insertar modal en el DOM
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer.firstElementChild);

        const modal = document.getElementById('historyDetailModal');
        const closeBtn = modal.querySelector('.modal__close');
        const closeDetailBtn = modal.querySelector('#closeDetailBtn');
        const markReadBtn = modal.querySelector('#markReadDetailBtn');

        // Mostrar modal usando el mismo método que los otros modales
        modal.style.display = 'flex';
        // Forzar reflow para que la animación funcione
        modal.offsetHeight;
        setTimeout(() => {
            modal.style.opacity = '1';
            modal.style.visibility = 'visible';
        }, 10);

        // Función para cerrar el modal con animación
        const closeModal = (remove = true) => {
            modal.style.opacity = '0';
            modal.style.visibility = 'hidden';
            setTimeout(() => {
                modal.style.display = 'none';
                if (remove) {
                    modal.remove();
                }
            }, 300);
        };

        // Event listeners
        closeBtn.addEventListener('click', () => closeModal());
        closeDetailBtn.addEventListener('click', () => closeModal());

        if (markReadBtn) {
            markReadBtn.addEventListener('click', async () => {
                await this.markAsRead(id);
                closeModal();
            });
        }

        // Cerrar al hacer clic fuera
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });

        // Cerrar con ESC
        const handleEscKey = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', handleEscKey);
            }
        };
        document.addEventListener('keydown', handleEscKey);

        // Limpiar event listener cuando se cierre
        const cleanup = () => {
            document.removeEventListener('keydown', handleEscKey);
            modal.removeEventListener('click', () => {});
            closeBtn.removeEventListener('click', () => {});
            closeDetailBtn.removeEventListener('click', () => {});
            if (markReadBtn) {
                markReadBtn.removeEventListener('click', () => {});
            }
        };

        // Ejecutar cleanup cuando se cierre el modal
        modal.addEventListener('transitionend', (e) => {
            if (e.propertyName === 'opacity' && modal.style.opacity === '0') {
                cleanup();
            }
        });
    }

    // =============================================================================
    // 6. PAGINACIÓN
    // =============================================================================

    updatePagination() {
        const prevBtn = document.querySelector('.pagination__btn--prev');
        const nextBtn = document.querySelector('.pagination__btn--next');
        const paginationInfo = document.getElementById('paginationInfo');
        
        if (!prevBtn || !nextBtn || !paginationInfo) return;

        // Habilitar/deshabilitar botones
        prevBtn.disabled = this.currentPage <= 1;
        nextBtn.disabled = this.currentPage >= this.totalPages;
        
        // Actualizar información
        paginationInfo.textContent = `Página ${this.currentPage} de ${this.totalPages} (${this.totalItems} registros)`;
    }

    async previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            await this.loadHistorial();
        }
    }

    async nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            await this.loadHistorial();
        }
    }

    // =============================================================================
    // 7. ESTADÍSTICAS
    // =============================================================================

    async updateStats() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Calcular estadísticas
            const total = this.totalItems;
            const unread = this.historialData.filter(item => !item.leida).length;
            const todayCount = this.historialData.filter(item => {
                const itemDate = new Date(item.fecha_creacion || item.createdAt);
                itemDate.setHours(0, 0, 0, 0);
                return itemDate.getTime() === today.getTime();
            }).length;
            const critical = this.historialData.filter(item => item.prioridad === 'critica').length;
            
            // Actualizar UI
            const totalHistoryEl = document.getElementById('totalHistory');
            const unreadHistoryEl = document.getElementById('unreadHistory');
            const todayHistoryEl = document.getElementById('todayHistory');
            const criticalHistoryEl = document.getElementById('criticalHistory');
            
            if (totalHistoryEl) totalHistoryEl.textContent = total.toLocaleString();
            if (unreadHistoryEl) unreadHistoryEl.textContent = unread.toLocaleString();
            if (todayHistoryEl) todayHistoryEl.textContent = todayCount.toLocaleString();
            if (criticalHistoryEl) criticalHistoryEl.textContent = critical.toLocaleString();
            
        } catch (error) {
            console.error('❌ Error actualizando estadísticas:', error);
        }
    }

    // =============================================================================
    // 8. FUNCIONES AUXILIARES
    // =============================================================================

    getPriorityClass(priority) {
        const classes = {
            critica: 'priority-badge--critical',
            alta: 'priority-badge--high',
            media: 'priority-badge--medium',
            baja: 'priority-badge--low'
        };
        return classes[priority] || 'priority-badge--medium';
    }

    getPriorityText(priority) {
        const texts = {
            critica: 'Crítica',
            alta: 'Alta',
            media: 'Media',
            baja: 'Baja'
        };
        return texts[priority] || 'Media';
    }

    getTypeIcon(type) {
        const icons = {
            documento_subido: 'file-upload',
            documento_eliminado: 'trash',
            documento_proximo_vencer: 'clock',
            documento_vencido: 'exclamation-triangle',
            persona_agregada: 'user-plus',
            persona_eliminada: 'user-minus',
            categoria_agregada: 'folder-plus',
            reporte_generado: 'file-chart',
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
            error_sistema: 'Error del Sistema'
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
        if (value instanceof Date) {
            return new Date(value).toLocaleString('es-MX');
        }
        if (typeof value === 'object') {
            return JSON.stringify(value);
        }
        return value;
    }

    hasFilters() {
        return Object.values(this.filters).some(value => 
            value !== 'all' && value !== '' && value !== null && value !== undefined
        );
    }

    // =============================================================================
    // 9. LIMPIEZA AL DESTRUIR
    // =============================================================================

    destroy() {
        this.cleanupPreloaders();
        console.log('🧹 Módulo de historial limpiado');
    }
}

// =============================================================================
// 10. INICIALIZACIÓN GLOBAL
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