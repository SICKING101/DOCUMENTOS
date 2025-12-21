// =============================================================================
// src/frontend/modules/documentos/modals/BulkDeleteModal.js
// =============================================================================

import { api } from '../../../services/api.js';
import { showAlert, getFileIcon, formatFileSize, formatDate } from '../../../utils.js';
import { updateTrashBadge } from '../../papelera.js';
import { bulkDeleteState } from '../core/BulkDeleteState.js';

/**
 * MODAL DE ELIMINACIÓN MÚLTIPLE
 * Interfaz similar a búsqueda avanzada para seleccionar y eliminar documentos
 */
export class BulkDeleteModal {
    constructor() {
        this.modal = null;
        this.isOpen = false;
        this.isInitialized = false;
        this.documents = [];
        this.filteredDocuments = []; // Almacenar documentos filtrados
    }

    /**
     * INICIALIZAR MODAL
     */
    init() {
        if (this.isInitialized) return;
        
        console.log('🚀 Inicializando BulkDeleteModal...');
        
        this.createModal();
        this.setupEventListeners();
        this.isInitialized = true;
        
        console.log('✅ BulkDeleteModal inicializado');
    }

    /**
     * CREAR ESTRUCTURA DEL MODAL
     */
    createModal() {
        // El modal ya está en el HTML, solo obtener referencia
        this.modal = document.getElementById('bulkDeleteModal');
        if (!this.modal) {
            console.error('❌ Modal no encontrado en el DOM');
            return;
        }
        
        console.log('✅ Modal encontrado en el DOM');
    }

    /**
     * CONFIGURAR EVENT LISTENERS
     */
    setupEventListeners() {
        console.log('🔧 Configurando event listeners...');
        
        // Botón de abrir modal
        const triggerBtn = document.getElementById('bulkDeleteTriggerBtn');
        if (triggerBtn) {
            triggerBtn.addEventListener('click', () => this.open());
            console.log('✅ Listener para botón de trigger configurado');
        }
        
        // Botón de cerrar modal
        const closeBtns = this.modal.querySelectorAll('[data-dismiss="modal"], .modal-close');
        closeBtns.forEach(btn => {
            btn.addEventListener('click', () => this.close());
        });
        
        // Cerrar al hacer clic fuera del modal
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });
        
        // Botones de selección
        const bulkSelectAllBtn = document.getElementById('bulkSelectAllBtn');
        const bulkDeselectAllBtn = document.getElementById('bulkDeselectAllBtn');
        const bulkSelectByFilterBtn = document.getElementById('bulkSelectByFilterBtn');
        const bulkConfirmSelectionBtn = document.getElementById('bulkConfirmSelectionBtn');
        const bulkExecuteDeleteBtn = document.getElementById('bulkExecuteDeleteBtn');
        
        if (bulkSelectAllBtn) {
            bulkSelectAllBtn.addEventListener('click', () => this.selectAll());
            console.log('✅ Listener para bulkSelectAllBtn configurado');
        }
        
        if (bulkDeselectAllBtn) {
            bulkDeselectAllBtn.addEventListener('click', () => this.deselectAll());
            console.log('✅ Listener para bulkDeselectAllBtn configurado');
        }
        
        if (bulkSelectByFilterBtn) {
            bulkSelectByFilterBtn.addEventListener('click', () => this.selectByCurrentFilter());
            console.log('✅ Listener para bulkSelectByFilterBtn configurado');
        }
        
        if (bulkConfirmSelectionBtn) {
            bulkConfirmSelectionBtn.addEventListener('click', () => this.confirmSelection());
            console.log('✅ Listener para bulkConfirmSelectionBtn configurado');
        }
        
        if (bulkExecuteDeleteBtn) {
            bulkExecuteDeleteBtn.addEventListener('click', () => this.executeDelete());
            console.log('✅ Listener para bulkExecuteDeleteBtn configurado');
        }
        
        // Filtros del modal
        const filterIds = [
            'modalFilterCategory',
            'modalFilterType', 
            'modalFilterStatus',
            'modalSearch'
        ];
        
        filterIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.applyFilters());
                console.log(`✅ Listener para ${id} configurado`);
            }
        });
        
        // Input de búsqueda - también escuchar input para búsqueda en tiempo real
        const modalSearch = document.getElementById('modalSearch');
        if (modalSearch) {
            modalSearch.addEventListener('input', () => this.applyFilters());
        }
        
        // Botón de limpiar búsqueda
        const searchClear = document.getElementById('modalSearchClear');
        if (searchClear) {
            searchClear.addEventListener('click', () => {
                document.getElementById('modalSearch').value = '';
                this.applyFilters();
            });
        }
        
        // Checkbox de confirmación
        const confirmCheckbox = document.getElementById('confirmDeleteCheckbox');
        if (confirmCheckbox) {
            confirmCheckbox.addEventListener('change', (e) => {
                const deleteBtn = document.getElementById('bulkExecuteDeleteBtn');
                if (deleteBtn) {
                    deleteBtn.disabled = !e.target.checked;
                }
            });
        }
        
        console.log('✅ Todos los event listeners configurados');
    }

    /**
     * ABRIR MODAL
     */
    async open() {
        console.group('📋 ABRIENDO MODAL DE ELIMINACIÓN MÚLTIPLE');
        
        if (!this.modal) {
            this.init();
        }
        
        // Cargar documentos si no están cargados
        if (this.documents.length === 0) {
            await this.loadDocuments();
        }
        
        // Aplicar filtros iniciales
        this.applyFilters();
        
        // Actualizar estadísticas
        this.updateStats();
        
        // Mostrar modal
        this.modal.style.display = 'block';
        document.body.classList.add('modal-open');
        setTimeout(() => {
            this.modal.classList.add('show');
            this.isOpen = true;
            
            // Enfocar campo de búsqueda
            const searchInput = document.getElementById('modalSearch');
            if (searchInput) searchInput.focus();
        }, 10);
        
        console.log('✅ Modal abierto');
        console.groupEnd();
    }

    /**
     * CERRAR MODAL
     */
    close() {
        console.log('📋 Cerrando modal de eliminación múltiple');
        
        if (!this.modal) return;
        
        this.modal.classList.remove('show');
        setTimeout(() => {
            this.modal.style.display = 'none';
            document.body.classList.remove('modal-open');
            this.isOpen = false;
            
            // Limpiar selección si se cerró sin eliminar
            if (bulkDeleteState.getSelectedCount() > 0) {
                this.showCloseConfirmation();
            }
        }, 300);
    }

    /**
     * CARGAR DOCUMENTOS
     */
    async loadDocuments() {
        console.log('📄 Cargando documentos para el modal...');
        
        try {
            // Usar documentos del appState o cargar desde API
            if (window.appState?.documents) {
                this.documents = window.appState.documents;
                console.log(`✅ ${this.documents.length} documentos cargados del appState`);
            } else {
                // Cargar desde API si no están en appState
                const response = await api.call('/api/documents');
                if (response.success) {
                    this.documents = response.documents || [];
                    console.log(`✅ ${this.documents.length} documentos cargados desde API`);
                } else {
                    throw new Error(response.message);
                }
            }
            
            // Cargar categorías en el select
            this.loadCategories();
            
        } catch (error) {
            console.error('❌ Error cargando documentos:', error);
            showAlert('Error cargando documentos: ' + error.message, 'error');
            this.documents = [];
        }
    }

    /**
     * CARGAR CATEGORÍAS EN EL SELECT
     */
    loadCategories() {
        const categorySelect = document.getElementById('modalFilterCategory');
        if (!categorySelect) return;
        
        // Limpiar opciones excepto la primera
        categorySelect.innerHTML = '<option value="">Todas las categorías</option>';
        
        // Obtener categorías únicas
        const categories = [...new Set(this.documents.map(doc => doc.categoria))].sort();
        
        categories.forEach(category => {
            if (category) {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categorySelect.appendChild(option);
            }
        });
        
        console.log(`✅ ${categories.length} categorías cargadas`);
    }

    /**
     * APLICAR FILTROS
     */
    applyFilters() {
        console.log('🎯 Aplicando filtros...');
        
        // Obtener valores de filtros
        const category = document.getElementById('modalFilterCategory')?.value || '';
        const type = document.getElementById('modalFilterType')?.value || '';
        const status = document.getElementById('modalFilterStatus')?.value || '';
        const search = document.getElementById('modalSearch')?.value || '';
        
        // Filtrar documentos
        this.filteredDocuments = this.documents.filter(doc => {
            // Filtro de categoría
            if (category && doc.categoria !== category) return false;
            
            // Filtro de tipo
            if (type && doc.tipo_archivo.toLowerCase() !== type.toLowerCase()) return false;
            
            // Filtro de estado
            if (status) {
                const docStatus = this.getDocumentStatus(doc);
                if (status !== docStatus) return false;
            }
            
            // Filtro de búsqueda
            if (search) {
                const query = search.toLowerCase();
                const matches = 
                    doc.nombre_original.toLowerCase().includes(query) ||
                    (doc.descripcion && doc.descripcion.toLowerCase().includes(query)) ||
                    doc.categoria.toLowerCase().includes(query) ||
                    (doc.persona_id?.nombre && doc.persona_id.nombre.toLowerCase().includes(query));
                
                if (!matches) return false;
            }
            
            return true;
        });
        
        // Renderizar documentos filtrados
        this.renderDocumentsList();
        
        // Actualizar estadísticas
        this.updateStats();
        
        console.log(`✅ Filtros aplicados: ${this.filteredDocuments.length} documentos mostrados`);
    }

    /**
     * OBTENER ESTADO DEL DOCUMENTO PARA FILTROS
     */
    getDocumentStatus(doc) {
        if (!doc.fecha_vencimiento) return 'active';
        
        const fechaVencimiento = new Date(doc.fecha_vencimiento);
        const hoy = new Date();
        const diferenciaDias = Math.ceil((fechaVencimiento - hoy) / (1000 * 60 * 60 * 24));
        
        if (diferenciaDias <= 0) return 'expired';
        if (diferenciaDias <= 7) return 'expiring';
        return 'active';
    }

    /**
     * RENDERIZAR LISTA DE DOCUMENTOS
     */
    renderDocumentsList() {
        const listContainer = document.getElementById('modalDocumentsList');
        if (!listContainer) return;
        
        if (this.filteredDocuments.length === 0) {
            listContainer.innerHTML = `
                <div class="no-documents">
                    <i class="fas fa-file-alt"></i>
                    <p>No hay documentos que coincidan con los filtros</p>
                </div>
            `;
            return;
        }
        
        let html = '<div class="documents-list-container">';
        
        this.filteredDocuments.forEach(doc => {
            const docId = doc._id || doc.id;
            const isSelected = bulkDeleteState.isSelected(docId);
            const fileIcon = getFileIcon(doc.tipo_archivo);
            const statusClass = this.getStatusClass(doc);
            const statusText = this.getStatusText(doc);
            
            html += `
                <div class="document-modal-item ${isSelected ? 'selected' : ''}" 
                     data-document-id="${docId}">
                    <label class="document-modal-checkbox-container">
                        <input type="checkbox" 
                               class="document-modal-checkbox"
                               ${isSelected ? 'checked' : ''}
                               data-document-id="${docId}">
                        <span class="checkmark"></span>
                    </label>
                    
                    <div class="document-modal-info">
                        <div class="document-modal-icon">
                            <i class="fas fa-file-${fileIcon}"></i>
                        </div>
                        
                        <div class="document-modal-details">
                            <div class="document-modal-name" title="${doc.nombre_original}">
                                ${doc.nombre_original}
                            </div>
                            <div class="document-modal-meta">
                                <span>${doc.tipo_archivo.toUpperCase()}</span>
                                <span>${doc.categoria}</span>
                                ${doc.fecha_vencimiento ? 
                                    `<span>Vence: ${formatDate(doc.fecha_vencimiento)}</span>` : ''}
                            </div>
                        </div>
                        
                        <div class="document-modal-status ${statusClass}">
                            ${statusText}
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        listContainer.innerHTML = html;
        
        // Agregar event listeners a los checkboxes
        this.setupCheckboxListeners();
        
        console.log(`✅ ${this.filteredDocuments.length} documentos renderizados`);
    }

    /**
     * CONFIGURAR LISTENERS PARA CHECKBOXES
     */
    setupCheckboxListeners() {
        const checkboxes = document.querySelectorAll('.document-modal-checkbox');
        
        checkboxes.forEach(checkbox => {
            // Remover listeners anteriores
            checkbox.replaceWith(checkbox.cloneNode(true));
        });
        
        // Re-seleccionar después de clonar
        const newCheckboxes = document.querySelectorAll('.document-modal-checkbox');
        
        newCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                const documentId = checkbox.getAttribute('data-document-id');
                this.toggleDocument(documentId);
            });
        });
        
        // También permitir clic en toda la fila
        const items = document.querySelectorAll('.document-modal-item');
        items.forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.type !== 'checkbox' && !e.target.closest('.document-modal-checkbox-container')) {
                    const documentId = item.getAttribute('data-document-id');
                    this.toggleDocument(documentId);
                }
            });
        });
    }

    /**
     * OBTENER CLASE CSS PARA EL ESTADO
     */
    getStatusClass(doc) {
        if (!doc.fecha_vencimiento) return 'active';
        
        const fechaVencimiento = new Date(doc.fecha_vencimiento);
        const hoy = new Date();
        const diferenciaDias = Math.ceil((fechaVencimiento - hoy) / (1000 * 60 * 60 * 24));
        
        if (diferenciaDias <= 0) return 'expired';
        if (diferenciaDias <= 7) return 'expiring';
        return 'active';
    }

    /**
     * OBTENER TEXTO PARA EL ESTADO
     */
    getStatusText(doc) {
        if (!doc.fecha_vencimiento) return 'Activo';
        
        const fechaVencimiento = new Date(doc.fecha_vencimiento);
        const hoy = new Date();
        const diferenciaDias = Math.ceil((fechaVencimiento - hoy) / (1000 * 60 * 60 * 24));
        
        if (diferenciaDias <= 0) return 'Vencido';
        if (diferenciaDias <= 7) return `Vence en ${diferenciaDias}d`;
        return 'Activo';
    }

    /**
     * TOGGLE SELECCIÓN DE DOCUMENTO
     */
    toggleDocument(documentId) {
        console.log(`🔄 Toggle documento: ${documentId}`);
        
        const wasSelected = bulkDeleteState.isSelected(documentId);
        
        if (wasSelected) {
            bulkDeleteState.removeDocument(documentId);
        } else {
            bulkDeleteState.addDocument(documentId);
        }
        
        // Actualizar UI del item
        const item = document.querySelector(`.document-modal-item[data-document-id="${documentId}"]`);
        const checkbox = document.querySelector(`.document-modal-checkbox[data-document-id="${documentId}"]`);
        
        if (item) {
            item.classList.toggle('selected', !wasSelected);
        }
        
        if (checkbox) {
            checkbox.checked = !wasSelected;
        }
        
        // Actualizar estadísticas
        this.updateStats();
        
        console.log(`✅ Documento ${documentId} ${wasSelected ? 'deseleccionado' : 'seleccionado'}`);
    }

    /**
     * SELECCIONAR TODOS LOS DOCUMENTOS
     */
    selectAll() {
        console.log('📋 Seleccionando todos los documentos visibles');
        
        this.filteredDocuments.forEach(doc => {
            const docId = doc._id || doc.id;
            if (docId) {
                bulkDeleteState.addDocument(docId);
            }
        });
        
        this.renderDocumentsList();
        this.updateStats();
    }

    /**
     * DESELECCIONAR TODOS LOS DOCUMENTOS
     */
    deselectAll() {
        console.log('📋 Deseleccionando todos los documentos');
        
        bulkDeleteState.deselectAll();
        this.renderDocumentsList();
        this.updateStats();
    }

    /**
     * SELECCIONAR POR FILTRO ACTUAL
     */
    selectByCurrentFilter() {
        console.log('🎯 Seleccionando documentos por filtro actual');
        this.selectAll();
    }

    /**
     * ACTUALIZAR ESTADÍSTICAS
     */
    updateStats() {
        console.log('📊 Actualizando estadísticas...');
        
        const selectedCount = bulkDeleteState.getSelectedCount();
        const filteredCount = this.filteredDocuments.length;
        const totalCount = this.documents.length;
        
        console.log('📊 Datos para estadísticas:', {
            selectedCount,
            filteredCount,
            totalCount
        });
        
        // Actualizar contadores - SOLO si los elementos existen
        const elements = [
            { id: 'totalDocumentsCount', value: totalCount },
            { id: 'selectedDocumentsCount', value: selectedCount },
            { id: 'filteredDocumentsCount', value: filteredCount },
            { id: 'deleteCount', value: selectedCount }
        ];
        
        elements.forEach(({ id, value }) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
                console.log(`✅ Actualizado ${id}: ${value}`);
            }
        });
        
        // Actualizar badge en botón de trigger si existe
        const triggerBadge = document.querySelector('#bulkDeleteTriggerBtn .badge');
        if (triggerBadge) {
            triggerBadge.textContent = selectedCount;
            triggerBadge.style.display = selectedCount > 0 ? 'inline-block' : 'none';
        }
        
        // Mostrar/ocultar panel de confirmación
        const confirmPanel = document.getElementById('deleteConfirmation');
        if (confirmPanel) {
            confirmPanel.style.display = selectedCount > 0 ? 'block' : 'none';
            console.log(`✅ Panel de confirmación: ${selectedCount > 0 ? 'visible' : 'oculto'}`);
        }
        
        // Actualizar resumen de documentos seleccionados
        if (selectedCount > 0) {
            this.updateSelectedSummary();
        }
        
        console.log(`✅ Estadísticas actualizadas: ${selectedCount} seleccionados, ${filteredCount} filtrados, ${totalCount} totales`);
    }

    /**
     * ACTUALIZAR RESUMEN DE DOCUMENTOS SELECCIONADOS
     */
    updateSelectedSummary() {
        const summaryContainer = document.getElementById('selectedDocumentsSummary');
        if (!summaryContainer) return;
        
        // Obtener información de documentos seleccionados
        const selectedDocs = [];
        const selectedIds = bulkDeleteState.getSelectedIds();
        
        selectedIds.forEach(docId => {
            const doc = this.documents.find(d => (d._id || d.id) === docId);
            if (doc) {
                selectedDocs.push(doc);
            }
        });
        
        if (selectedDocs.length === 0) {
            summaryContainer.innerHTML = '<p class="text-muted">No hay documentos seleccionados</p>';
            return;
        }
        
        let html = '';
        
        // Mostrar máximo 5 documentos en el resumen
        const docsToShow = selectedDocs.slice(0, 5);
        
        docsToShow.forEach(doc => {
            const fileIcon = getFileIcon(doc.tipo_archivo);
            html += `
                <div class="selected-summary-item">
                    <div class="selected-summary-icon">
                        <i class="fas fa-file-${fileIcon}"></i>
                    </div>
                    <div class="selected-summary-info">
                        <div class="selected-summary-name">${doc.nombre_original}</div>
                        <div class="selected-summary-meta">
                            ${doc.tipo_archivo} • ${doc.categoria} • ${formatFileSize(doc.tamano_archivo)}
                        </div>
                    </div>
                    <div class="selected-summary-action">
                        <i class="fas fa-trash-alt text-danger"></i>
                    </div>
                </div>
            `;
        });
        
        // Si hay más de 5 documentos, mostrar contador
        if (selectedDocs.length > 5) {
            const remaining = selectedDocs.length - 5;
            html += `
                <div class="selected-summary-item text-center">
                    <span class="text-muted">...y ${remaining} documento${remaining !== 1 ? 's' : ''} más</span>
                </div>
            `;
        }
        
        summaryContainer.innerHTML = html;
    }

    /**
     * CONFIRMAR SELECCIÓN (mostrar panel de confirmación)
     */
    confirmSelection() {
        const selectedCount = bulkDeleteState.getSelectedCount();
        
        if (selectedCount === 0) {
            showAlert('No hay documentos seleccionados', 'warning');
            return;
        }
        
        console.log(`✅ ${selectedCount} documentos confirmados para eliminación`);
        
        // Hacer scroll al panel de confirmación
        const confirmPanel = document.getElementById('deleteConfirmation');
        if (confirmPanel) {
            confirmPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        
        // Enfocar checkbox de confirmación
        const confirmCheckbox = document.getElementById('confirmDeleteCheckbox');
        if (confirmCheckbox) {
            confirmCheckbox.focus();
        }
    }

    /**
     * EJECUTAR ELIMINACIÓN
     */
    async executeDelete() {
        const selectedCount = bulkDeleteState.getSelectedCount();
        
        if (selectedCount === 0) {
            showAlert('No hay documentos seleccionados', 'warning');
            return;
        }
        
        // Verificar confirmación
        const confirmCheckbox = document.getElementById('confirmDeleteCheckbox');
        if (!confirmCheckbox?.checked) {
            showAlert('Debes confirmar la acción marcando la casilla', 'warning');
            return;
        }
        
        const documentIds = bulkDeleteState.getSelectedIds();
        
        console.group('🗑️ EJECUTANDO ELIMINACIÓN MÚLTIPLE');
        console.log('📋 IDs a eliminar:', documentIds);
        console.log('📊 Cantidad:', selectedCount);
        
        // Confirmación final
        const userConfirmed = confirm(`¿Estás seguro de mover ${selectedCount} documentos a la papelera?`);
        if (!userConfirmed) {
            console.log('⚠️ Usuario canceló la eliminación');
            console.groupEnd();
            return;
        }
        
        try {
            // Mostrar loading
            const loadingAlertId = `bulk-delete-${Date.now()}`;
            showAlert(`Moviendo ${selectedCount} documentos a la papelera...`, 'info', 0, loadingAlertId);
            
            // Deshabilitar botón durante la operación
            const deleteBtn = document.getElementById('bulkExecuteDeleteBtn');
            if (deleteBtn) {
                deleteBtn.disabled = true;
                deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Eliminando...';
            }
            
            // CORRECCIÓN CRÍTICA: Usar la ruta correcta sin /api duplicado
            // Dependiendo de tu config.js, usa:
            // Si CONFIG.API_BASE_URL es 'http://localhost:4000' → '/api/documents/bulk-delete'
            // Si CONFIG.API_BASE_URL es 'http://localhost:4000/api' → '/documents/bulk-delete'
            
            // Vamos a probar ambas opciones
            let response;
            let endpoint;
            
            try {
                // Intentar primera opción (la más común)
                endpoint = '/api/documents/bulk-delete';
                console.log(`📡 Intentando con endpoint: ${endpoint}`);
                response = await api.call(endpoint, {
                    method: 'DELETE',
                    body: JSON.stringify({ document_ids: documentIds }),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
            } catch (error) {
                // Si falla, probar sin /api
                console.log('⚠️ Primera opción falló, probando alternativa...');
                endpoint = '/documents/bulk-delete';
                console.log(`📡 Intentando con endpoint: ${endpoint}`);
                response = await api.call(endpoint, {
                    method: 'DELETE',
                    body: JSON.stringify({ document_ids: documentIds }),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
            }
            
            // Ocultar alerta de carga
            const loadingAlert = document.querySelector(`[data-alert-id="${loadingAlertId}"]`);
            if (loadingAlert) loadingAlert.remove();
            
            // Rehabilitar botón
            if (deleteBtn) {
                deleteBtn.disabled = false;
                deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Ejecutar eliminación';
            }
            
            console.log('📦 Respuesta del servidor:', response);
            
            if (response.success) {
                // Éxito
                showAlert(response.message || `${selectedCount} documentos movidos a la papelera`, 'success');
                
                // Cerrar modal
                this.close();
                
                // Limpiar selección
                bulkDeleteState.deselectAll();
                
                // Recargar documentos globales
                if (window.loadDocuments) {
                    await window.loadDocuments();
                }
                
                // Actualizar papelera
                if (updateTrashBadge) {
                    await updateTrashBadge();
                }
                
                // Limpiar checkbox de confirmación
                if (confirmCheckbox) {
                    confirmCheckbox.checked = false;
                }
                
                // Deshabilitar botón de eliminación
                if (deleteBtn) {
                    deleteBtn.disabled = true;
                }
                
                console.log(`✅ ${selectedCount} documentos eliminados exitosamente`);
            } else {
                throw new Error(response.message || 'Error en la eliminación masiva');
            }
            
        } catch (error) {
            console.error('❌ Error en eliminación múltiple:', error);
            showAlert(`Error al eliminar documentos: ${error.message}`, 'error');
            
            // Intentar eliminación individual como fallback
            await this.deleteIndividually(documentIds);
        }
        
        console.groupEnd();
    }

    /**
     * ELIMINACIÓN INDIVIDUAL (FALLBACK)
     */
    async deleteIndividually(documentIds) {
        console.log('🔄 Intentando eliminación individual...');
        
        let successCount = 0;
        let errorCount = 0;
        
        // Mostrar progreso
        showAlert(`Eliminando documentos uno por uno...`, 'info');
        
        for (const documentId of documentIds) {
            try {
                let response;
                
                // Intentar con diferentes endpoints
                try {
                    response = await api.call(`/api/documents/${documentId}`, {
                        method: 'DELETE'
                    });
                } catch (error) {
                    console.log('⚠️ Intentando alternativa sin /api...');
                    response = await api.call(`/documents/${documentId}`, {
                        method: 'DELETE'
                    });
                }
                
                if (response.success) {
                    successCount++;
                    console.log(`✅ Documento ${documentId} movido a papelera`);
                } else {
                    errorCount++;
                    console.error(`❌ Error con documento ${documentId}:`, response.message);
                }
                
            } catch (error) {
                errorCount++;
                console.error(`❌ Error con documento ${documentId}:`, error);
            }
        }
        
        // Mostrar resultados
        if (successCount > 0) {
            showAlert(`${successCount} documentos movidos a la papelera${errorCount > 0 ? `, ${errorCount} fallaron` : ''}`, 
                     errorCount > 0 ? 'warning' : 'success');
            
            // Cerrar modal
            this.close();
            
            // Limpiar selección
            bulkDeleteState.deselectAll();
            
            // Recargar documentos
            if (window.loadDocuments) {
                await window.loadDocuments();
            }
            
            // Actualizar papelera
            if (updateTrashBadge) {
                await updateTrashBadge();
            }
        } else {
            showAlert(`No se pudo eliminar ningún documento.`, 'error');
        }
        
        console.log(`📊 Resultados: ${successCount} éxitos, ${errorCount} errores`);
    }

    /**
     * MOSTRAR CONFIRMACIÓN AL CERRAR CON DOCUMENTOS SELECCIONADOS
     */
    showCloseConfirmation() {
        const selectedCount = bulkDeleteState.getSelectedCount();
        
        if (selectedCount > 0) {
            const confirmClose = confirm(
                `Tienes ${selectedCount} documento${selectedCount !== 1 ? 's' : ''} seleccionado${selectedCount !== 1 ? 's' : ''}. ` +
                `¿Deseas mantener la selección o limpiarla?`
            );
            
            if (!confirmClose) {
                bulkDeleteState.deselectAll();
                console.log('✅ Selección limpiada al cerrar modal');
            }
        }
    }

    /**
     * DEBUG: MOSTRAR ESTADO DEL MODAL
     */
    debug() {
        console.group('🐛 DEBUG - BulkDeleteModal');
        
        console.log('📊 Estado:', {
            abierto: this.isOpen,
            inicializado: this.isInitialized,
            documentosCargados: this.documents.length,
            documentosFiltrados: this.filteredDocuments.length,
            modalPresente: !!this.modal
        });
        
        console.log('👁️ Elementos UI:');
        console.table({
            'Lista de documentos': document.getElementById('modalDocumentsList') ? 'Presente' : 'Ausente',
            'Panel confirmación': document.getElementById('deleteConfirmation') ? 'Presente' : 'Ausente',
            'Botón ejecutar': document.getElementById('bulkExecuteDeleteBtn') ? 'Presente' : 'Ausente',
            'Checkbox confirmación': document.getElementById('confirmDeleteCheckbox') ? 'Presente' : 'Ausente'
        });
        
        bulkDeleteState.debug();
        
        console.groupEnd();
        
        showAlert('Debug completado. Revisa la consola.', 'info');
    }

    /**
     * TEST: SIMULAR SELECCIÓN DE DOCUMENTOS
     */
    test() {
        console.group('🧪 TEST - BulkDeleteModal');
        
        // Abrir modal si no está abierto
        if (!this.isOpen) {
            this.open();
        }
        
        // Seleccionar primeros 3 documentos
        const documents = this.documents || [];
        if (documents.length >= 3) {
            const testIds = documents.slice(0, 3)
                .map(doc => doc._id || doc.id)
                .filter(id => id);
            
            console.log('🎯 IDs de prueba:', testIds);
            
            // Seleccionar documentos
            testIds.forEach(docId => {
                bulkDeleteState.addDocument(docId);
            });
            
            // Actualizar UI
            this.renderDocumentsList();
            this.updateStats();
            
            console.log('✅ Test configurado: 3 documentos seleccionados');
            showAlert('Test configurado: 3 documentos seleccionados. Usa el panel de confirmación.', 'info');
        } else {
            console.warn('⚠️ No hay suficientes documentos para el test');
            showAlert('Necesitas al menos 3 documentos para probar', 'warning');
        }
        
        console.groupEnd();
    }
}

// Exportar instancia singleton
export const bulkDeleteModal = new BulkDeleteModal();

// Auto-inicializar cuando se carga el DOM
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        // Inicializar con delay para asegurar que el DOM esté listo
        setTimeout(() => {
            bulkDeleteModal.init();
        }, 1000);
    });
}

// Hacer disponible globalmente para debugging
if (typeof window !== 'undefined') {
    window.bulkDeleteModal = bulkDeleteModal;
}