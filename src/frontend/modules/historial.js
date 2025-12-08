// =============================================================================
// MÓDULO DE HISTORIAL DEL SISTEMA
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
        
        // Paginación
        document.querySelector('.pagination__btn--prev')?.addEventListener('click', () => this.previousPage());
        document.querySelector('.pagination__btn--next')?.addEventListener('click', () => this.nextPage());
    }

    // =============================================================================
    // 2. CARGAR HISTORIAL
    // =============================================================================

    async loadHistorial() {
        try {
            console.log('📥 Cargando historial...');
            
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
                
                this.renderHistorial();
                this.updateStats();
                this.updatePagination();
                
                console.log(`✅ Historial cargado: ${this.historialData.length} registros`);
            } else {
                throw new Error(data.message || 'Error al cargar historial');
            }
        } catch (error) {
            console.error('❌ Error cargando historial:', error);
            showAlert('Error al cargar el historial', 'error');
        }
    }

    // =============================================================================
    // 3. RENDERIZAR HISTORIAL
    // =============================================================================

    renderHistorial() {
        const tbody = document.getElementById('historyTableBody');
        if (!tbody) return;

        if (this.historialData.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
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
                    <strong class="history-title">${item.titulo}</strong>
                </td>
                <td class="table__cell table__cell--message">
                    <p class="history-message">${item.mensaje}</p>
                    ${item.metadata && Object.keys(item.metadata).length > 0 ? `
                        <div class="history-metadata">
                            <small>${this.formatMetadata(item.metadata)}</small>
                        </div>
                    ` : ''}
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
    // 4. ACCIONES DEL HISTORIAL
    // =============================================================================

    async markAsRead(id) {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/notifications/${id}/read`, {
                method: 'PATCH'
            });

            if (!response.ok) {
                throw new Error('Error al marcar como leído');
            }

            const data = await response.json();
            
            if (data.success) {
                showAlert('Registro marcado como leído', 'success');
                this.loadHistorial();
                
                // Actualizar contador en notificaciones si existe
                if (window.updateBadge) {
                    window.updateBadge();
                }
            }
        } catch (error) {
            console.error('❌ Error marcando como leído:', error);
            showAlert('Error al marcar como leído', 'error');
        }
    }

    async markAllAsRead() {
        try {
            const confirmed = await showConfirmation(
                '¿Marcar todos los registros como leídos?',
                'Esta acción afectará a todos los registros del historial.'
            );
            
            if (!confirmed) return;

            const response = await fetch(`${CONFIG.API_BASE_URL}/notifications/read-all`, {
                method: 'PATCH'
            });

            if (!response.ok) {
                throw new Error('Error al marcar todos como leídos');
            }

            const data = await response.json();
            
            if (data.success) {
                showAlert(`${data.data?.cantidad || 0} registros marcados como leídos`, 'success');
                this.loadHistorial();
                
                // Actualizar contador en notificaciones
                if (window.updateBadge) {
                    window.updateBadge();
                }
            }
        } catch (error) {
            console.error('❌ Error marcando todos como leídos:', error);
            showAlert('Error al marcar todos como leídos', 'error');
        }
    }

async deleteItem(id) {
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

        const response = await fetch(`${CONFIG.API_BASE_URL}/notifications/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Error al eliminar registro');
        }

        const data = await response.json();
        
        if (data.success) {
            showAlert('Registro eliminado correctamente', 'success');
            this.loadHistorial();
        }
    } catch (error) {
        console.error('❌ Error eliminando registro:', error);
        showAlert('Error al eliminar registro', 'error');
    }
}

async clearHistorial() {
    try {
        const confirmed = await showConfirmation(
            '¿Limpiar todo el historial?',
            'Esta acción eliminará permanentemente todos los registros del historial. Esta acción no se puede deshacer.',
            { confirmText: 'Limpiar todo' }
        );
        
        if (!confirmed) return;

        const response = await fetch(`${CONFIG.API_BASE_URL}/notifications/cleanup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ dias: 0 }) // Eliminar todos
        });

        if (!response.ok) {
            throw new Error('Error al limpiar historial');
        }

        const data = await response.json();
        
        if (data.success) {
            showAlert(`Historial limpiado: ${data.data?.cantidad || 0} registros eliminados`, 'success');
            this.loadHistorial();
        }
    } catch (error) {
        console.error('❌ Error limpiando historial:', error);
        showAlert('Error al limpiar historial', 'error');
    }
}

    async exportHistorial() {
        try {
            showAlert('Generando exportación...', 'info');
            
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
                this.exportToCSV(data.data.notificaciones);
            } else {
                throw new Error('No hay datos para exportar');
            }
        } catch (error) {
            console.error('❌ Error exportando historial:', error);
            showAlert('Error al exportar historial', 'error');
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
        
        showAlert('Historial exportado correctamente', 'success');
    }

    /**
 * Maneja la apertura y cierre de modales de manera consistente
 */
handleModal(modal, action = 'open') {
    if (action === 'open') {
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.style.opacity = '1';
            modal.style.visibility = 'visible';
        }, 10);
    } else {
        modal.style.opacity = '0';
        modal.style.visibility = 'hidden';
        setTimeout(() => {
            modal.style.display = 'none';
            if (action === 'close-remove') {
                modal.remove();
            }
        }, 300);
    }
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
    // 5. PAGINACIÓN
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

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.loadHistorial();
        }
    }

    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.loadHistorial();
        }
    }

    // =============================================================================
    // 6. ESTADÍSTICAS
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
        
        // Actualizar UI - SIN optional chaining en asignaciones
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
    // 7. FUNCIONES AUXILIARES
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
}

// =============================================================================
// 8. INICIALIZACIÓN GLOBAL
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