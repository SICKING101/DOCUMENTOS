// =============================================================================
// src/frontend/modules/documentos/modals/BulkDeleteModal.js
// =============================================================================

import { api } from '../../../services/api.js';
import { showAlert, getFileIcon, formatFileSize, formatDate } from '../../../utils.js';
import { updateTrashBadge } from '../../papelera.js';
import { bulkDeleteState } from '../core/BulkDeleteState.js';

/**
 * MODAL DE ELIMINACIÓN MÚLTIPLE - VERSIÓN MEJORADA
 * Interfaz moderna para selección y eliminación de documentos en lote
 */
export class BulkDeleteModal {
    constructor() {
        this.modal = null;
        this.isOpen = false;
        this.isInitialized = false;
        this.documents = [];
        this.filteredDocuments = [];
        this.compactView = false;
    }

    /**
     * INICIALIZAR MODAL
     */
    init() {
        if (this.isInitialized) return;
        
        console.log('🚀 Inicializando BulkDeleteModal mejorado...');
        
        this.createModal();
        this.setupEventListeners();
        this.isInitialized = true;
        
        console.log('✅ BulkDeleteModal inicializado');
    }

    /**
     * CREAR ESTRUCTURA DEL MODAL
     */
    createModal() {
        this.modal = document.getElementById('bulkDeleteModal');
        if (!this.modal) {
            console.error('❌ Modal no encontrado en el DOM');
            return;
        }
        
        console.log('✅ Modal mejorado encontrado en el DOM');
    }

    /**
     * CONFIGURAR EVENT LISTENERS
     */
    setupEventListeners() {
        console.log('🔧 Configurando event listeners mejorados...');
        
        // Botón de abrir modal
        const triggerBtn = document.getElementById('bulkDeleteTriggerBtn');
        if (triggerBtn) {
            triggerBtn.addEventListener('click', () => this.open());
            console.log('✅ Listener para botón de trigger configurado');
        }
        
        // Botones de control
        this.setupControlListeners();
        
        // Filtros del modal
        this.setupFilterListeners();
        
        // Botones de acción
        this.setupActionListeners();
        
        console.log('✅ Todos los event listeners configurados');
    }

    /**
     * CONFIGURAR LISTENERS DE CONTROL
     */
    setupControlListeners() {
        const bulkSelectAllBtn = document.getElementById('bulkSelectAllBtn');
        const bulkDeselectAllBtn = document.getElementById('bulkDeselectAllBtn');
        const toggleSelectionView = document.getElementById('toggleSelectionView');
        const clearFiltersBtn = document.getElementById('clearFiltersBtn');
        
        if (bulkSelectAllBtn) {
            bulkSelectAllBtn.addEventListener('click', () => this.selectAll());
        }
        
        if (bulkDeselectAllBtn) {
            bulkDeselectAllBtn.addEventListener('click', () => this.deselectAll());
        }
        
        if (toggleSelectionView) {
            toggleSelectionView.addEventListener('click', () => this.toggleView());
        }
        
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => this.clearFilters());
        }
    }

    /**
     * CONFIGURAR LISTENERS DE FILTROS
     */
    setupFilterListeners() {
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
            }
        });
        
        // Búsqueda en tiempo real
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
    }

    /**
     * CONFIGURAR LISTENERS DE ACCIÓN
     */
    setupActionListeners() {
        const bulkConfirmSelectionBtn = document.getElementById('bulkConfirmSelectionBtn');
        const bulkExecuteDeleteBtn = document.getElementById('bulkExecuteDeleteBtn');
        const confirmCheckbox = document.getElementById('confirmDeleteCheckbox');
        
        if (bulkConfirmSelectionBtn) {
            bulkConfirmSelectionBtn.addEventListener('click', () => this.confirmSelection());
        }
        
        if (bulkExecuteDeleteBtn) {
            bulkExecuteDeleteBtn.addEventListener('click', () => this.executeDelete());
        }
        
        if (confirmCheckbox) {
            confirmCheckbox.addEventListener('change', (e) => {
                const deleteBtn = document.getElementById('bulkExecuteDeleteBtn');
                if (deleteBtn) {
                    deleteBtn.disabled = !e.target.checked;
                    if (e.target.checked) {
                        deleteBtn.classList.add('btn--danger-active');
                    } else {
                        deleteBtn.classList.remove('btn--danger-active');
                    }
                }
            });
        }
    }

/**
 * ABRIR MODAL
 */
async open() {
    console.group('📋 ABRIENDO MODAL DE ELIMINACIÓN MÚLTIPLE MEJORADO');
    
    if (!this.modal) {
        this.init();
    }
    
    // Resetear estado
    this.resetModalState();
    
    // ✅ SIEMPRE recargar documentos desde la API
    await this.loadDocuments();
    
    // Resetear filtros visuales
    const modalFilterCategory = document.getElementById('modalFilterCategory');
    const modalFilterType = document.getElementById('modalFilterType');
    const modalFilterStatus = document.getElementById('modalFilterStatus');
    const modalSearch = document.getElementById('modalSearch');
    
    if (modalFilterCategory) modalFilterCategory.value = '';
    if (modalFilterType) modalFilterType.value = '';
    if (modalFilterStatus) modalFilterStatus.value = '';
    if (modalSearch) modalSearch.value = '';
    
    // Aplicar filtros
    this.applyFilters();
    
    // Actualizar UI
    this.updateUI();
    
    // Mostrar modal
    this.showModal();
    
    console.log('✅ Modal mejorado abierto con datos frescos');
    console.groupEnd();
}

    /**
     * RESETEAR ESTADO DEL MODAL
     */
    resetModalState() {
        this.compactView = false;
        bulkDeleteState.deselectAll();
        
        const confirmCheckbox = document.getElementById('confirmDeleteCheckbox');
        if (confirmCheckbox) {
            confirmCheckbox.checked = false;
        }
        
        const deleteBtn = document.getElementById('bulkExecuteDeleteBtn');
        if (deleteBtn) {
            deleteBtn.disabled = true;
            deleteBtn.classList.remove('btn--danger-active');
        }
    }

    /**
     * CARGAR DOCUMENTOS - CORREGIDO: CON BARRA AL INICIO
     */
async loadDocuments() {
    console.log('📄 Cargando documentos para el modal...');
    
    try {
        // ✅ SIEMPRE cargar desde la API, ignorar appState
        const response = await api.call('/documents');
        
        if (response.success) {
            this.documents = response.documents || [];
            // ✅ Actualizar también appState para mantener consistencia
            if (window.appState) {
                window.appState.documents = this.documents;
            }
            console.log(`✅ ${this.documents.length} documentos cargados desde API`);
        } else {
            throw new Error(response.message || 'Error al cargar documentos');
        }
        
        this.loadCategories();
        
    } catch (error) {
        console.error('❌ Error cargando documentos:', error);
        // Fallback silencioso a appState si la API falla
        if (window.appState?.documents) {
            this.documents = window.appState.documents;
            console.log(`⚠️ Usando ${this.documents.length} documentos del appState (fallback)`);
        } else {
            this.documents = [];
        }
    }
}

    /**
     * CARGAR CATEGORÍAS
     */
    loadCategories() {
        const categorySelect = document.getElementById('modalFilterCategory');
        if (!categorySelect) return;
        
        categorySelect.innerHTML = '<option value="">Todas las categorías</option>';
        
        const categories = [...new Set(this.documents
            .map(doc => doc.categoria)
            .filter(category => category && category.trim())
        )].sort();
        
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categorySelect.appendChild(option);
        });
        
        console.log(`✅ ${categories.length} categorías cargadas`);
    }

    /**
     * APLICAR FILTROS
     */
    applyFilters() {
        console.log('🎯 Aplicando filtros mejorados...');
        
        const category = document.getElementById('modalFilterCategory')?.value || '';
        const type = document.getElementById('modalFilterType')?.value || '';
        const status = document.getElementById('modalFilterStatus')?.value || '';
        const search = document.getElementById('modalSearch')?.value || '';
        
        this.filteredDocuments = this.documents.filter(doc => {
            if (category && doc.categoria !== category) return false;
            
            if (type) {
                const docType = doc.tipo_archivo?.toLowerCase();
                const filterType = type.toLowerCase();
                if (docType !== filterType) return false;
            }
            
            if (status) {
                const docStatus = this.getDocumentStatus(doc);
                if (status !== docStatus) return false;
            }
            
            if (search) {
                const query = search.toLowerCase();
                const searchFields = [
                    doc.nombre_original,
                    doc.descripcion,
                    doc.categoria,
                    doc.persona_id?.nombre,
                    doc.tipo_archivo
                ];
                
                const matches = searchFields.some(field => 
                    field && field.toString().toLowerCase().includes(query)
                );
                
                if (!matches) return false;
            }
            
            return true;
        });
        
        this.renderDocumentsList();
        this.updateStats();
        
        console.log(`✅ Filtros aplicados: ${this.filteredDocuments.length} documentos mostrados`);
    }

    /**
     * LIMPIAR FILTROS
     */
    clearFilters() {
        console.log('🧹 Limpiando filtros...');
        
        document.getElementById('modalFilterCategory').value = '';
        document.getElementById('modalFilterType').value = '';
        document.getElementById('modalFilterStatus').value = '';
        document.getElementById('modalSearch').value = '';
        
        this.applyFilters();
        showAlert('Filtros limpiados', 'info');
    }

    /**
     * TOGGLE VISTA COMPACTA
     */
    toggleView() {
        this.compactView = !this.compactView;
        const toggleBtn = document.getElementById('toggleSelectionView');
        const listContainer = document.querySelector('.documents-list');
        
        if (this.compactView) {
            listContainer?.classList.add('compact-view');
            if (toggleBtn) {
                toggleBtn.innerHTML = '<i class="fas fa-th-large"></i> Vista normal';
                toggleBtn.title = 'Cambiar a vista normal';
            }
        } else {
            listContainer?.classList.remove('compact-view');
            if (toggleBtn) {
                toggleBtn.innerHTML = '<i class="fas fa-th-list"></i> Vista compacta';
                toggleBtn.title = 'Cambiar a vista compacta';
            }
        }
        
        console.log(`👁️ Vista cambiada a: ${this.compactView ? 'compacta' : 'normal'}`);
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
                    <i class="fas fa-file-search"></i>
                    <p>No se encontraron documentos con los filtros actuales</p>
                    <button class="btn btn--text btn--sm mt-2" onclick="window.bulkDeleteModal.clearFilters()">
                        Limpiar filtros
                    </button>
                </div>
            `;
            return;
        }
        
        let html = `<div class="documents-list ${this.compactView ? 'compact-view' : ''}">`;
        
        this.filteredDocuments.forEach(doc => {
            const docId = doc._id || doc.id;
            const isSelected = bulkDeleteState.isSelected(docId);
            const fileIcon = getFileIcon(doc.tipo_archivo);
            const statusClass = this.getDocumentStatus(doc);
            const statusText = this.getStatusText(doc);
            const fileSize = formatFileSize(doc.tamano_archivo);
            const expireDate = doc.fecha_vencimiento ? formatDate(doc.fecha_vencimiento) : null;
            
            html += `
                <div class="document-modal-item ${isSelected ? 'selected' : ''}" 
                     data-document-id="${docId}"
                     title="${doc.nombre_original}">
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
                            <div class="document-modal-name">
                                ${doc.nombre_original}
                            </div>
                            <div class="document-modal-meta">
                                <span>${doc.tipo_archivo?.toUpperCase() || 'N/A'}</span>
                                <span>${doc.categoria || 'Sin categoría'}</span>
                                ${fileSize ? `<span>${fileSize}</span>` : ''}
                                ${expireDate ? `<span title="Vence el ${expireDate}">${expireDate}</span>` : ''}
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
        
        this.setupCheckboxListeners();
        
        console.log(`✅ ${this.filteredDocuments.length} documentos renderizados`);
    }

    /**
     * CONFIGURAR LISTENERS DE CHECKBOXES
     */
    setupCheckboxListeners() {
        const checkboxes = document.querySelectorAll('.document-modal-checkbox');
        const items = document.querySelectorAll('.document-modal-item');
        
        // Clonar para remover listeners antiguos
        checkboxes.forEach(checkbox => {
            checkbox.replaceWith(checkbox.cloneNode(true));
        });
        
        // Agregar nuevos listeners
        document.querySelectorAll('.document-modal-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                const documentId = checkbox.getAttribute('data-document-id');
                this.toggleDocument(documentId);
            });
        });
        
        // Clic en toda la fila
        items.forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.document-modal-checkbox-container') && 
                    !e.target.classList.contains('document-modal-checkbox')) {
                    const documentId = item.getAttribute('data-document-id');
                    this.toggleDocument(documentId);
                }
            });
        });
    }

    /**
     * TOGGLE DOCUMENTO
     */
    toggleDocument(documentId) {
        const wasSelected = bulkDeleteState.isSelected(documentId);
        
        if (wasSelected) {
            bulkDeleteState.removeDocument(documentId);
        } else {
            bulkDeleteState.addDocument(documentId);
        }
        
        // Actualizar UI
        const item = document.querySelector(`.document-modal-item[data-document-id="${documentId}"]`);
        const checkbox = document.querySelector(`.document-modal-checkbox[data-document-id="${documentId}"]`);
        
        if (item) item.classList.toggle('selected', !wasSelected);
        if (checkbox) checkbox.checked = !wasSelected;
        
        this.updateStats();
        
        // Feedback visual
        if (!wasSelected) {
            this.showSelectionFeedback(item);
        }
    }

    /**
     * MOSTRAR FEEDBACK DE SELECCIÓN
     */
    showSelectionFeedback(element) {
        if (!element) return;
        
        element.style.transform = 'scale(0.98)';
        setTimeout(() => {
            element.style.transform = '';
        }, 150);
    }

    /**
     * SELECCIONAR TODOS
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
        showAlert(`Seleccionados ${this.filteredDocuments.length} documentos`, 'info');
    }

    /**
     * DESELECCIONAR TODOS
     */
    deselectAll() {
        console.log('📋 Deseleccionando todos los documentos');
        
        bulkDeleteState.deselectAll();
        this.renderDocumentsList();
        this.updateStats();
    }

    /**
     * SELECCIONAR POR FILTRO
     */
    selectByCurrentFilter() {
        console.log('🎯 Seleccionando documentos por filtro actual');
        this.selectAll();
    }

    /**
     * ACTUALIZAR ESTADÍSTICAS Y UI
     */
    updateStats() {
        const selectedCount = bulkDeleteState.getSelectedCount();
        const filteredCount = this.filteredDocuments.length;
        const totalCount = this.documents.length;
        
        // Actualizar contadores
        this.updateCounter('totalDocumentsCount', totalCount);
        this.updateCounter('filteredDocumentsCount', filteredCount);
        this.updateCounter('selectedDocumentsCount', selectedCount);
        this.updateCounter('deleteCount', selectedCount);
        
        // Actualizar badge de documentos visibles
        const visibleBadge = document.getElementById('visibleDocumentsBadge');
        if (visibleBadge) {
            visibleBadge.textContent = filteredCount;
        }
        
        // Actualizar badge del botón de eliminar
        const deleteBtnBadge = document.getElementById('deleteBtnBadge');
        if (deleteBtnBadge) {
            deleteBtnBadge.textContent = selectedCount;
            deleteBtnBadge.style.display = selectedCount > 0 ? 'inline-block' : 'none';
        }
        
        // Mostrar/ocultar panel de confirmación
        const confirmPanel = document.getElementById('deleteConfirmation');
        if (confirmPanel) {
            confirmPanel.style.display = selectedCount > 0 ? 'block' : 'none';
        }
        
        // Actualizar badge del botón trigger
        const triggerBadge = document.querySelector('#bulkDeleteTriggerBtn .badge');
        if (triggerBadge) {
            triggerBadge.textContent = selectedCount;
            triggerBadge.style.display = selectedCount > 0 ? 'inline-block' : 'none';
        }
        
        // Actualizar resumen
        if (selectedCount > 0) {
            this.updateSelectedSummary();
        }
        
        console.log(`📊 Estadísticas: ${selectedCount} seleccionados`);
    }

    /**
     * ACTUALIZAR CONTADOR
     */
    updateCounter(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
            // Animación para cambios
            if (elementId.includes('selected') || elementId.includes('delete')) {
                element.style.transform = 'scale(1.1)';
                setTimeout(() => {
                    element.style.transform = '';
                }, 200);
            }
        }
    }

    /**
     * ACTUALIZAR RESUMEN DE SELECCIONADOS
     */
    updateSelectedSummary() {
        const summaryContainer = document.getElementById('selectedDocumentsSummary');
        if (!summaryContainer) return;
        
        const selectedIds = bulkDeleteState.getSelectedIds();
        const selectedDocs = this.documents.filter(doc => 
            selectedIds.includes(doc._id || doc.id)
        );
        
        if (selectedDocs.length === 0) {
            summaryContainer.innerHTML = `
                <div class="preview-placeholder">
                    <i class="fas fa-files"></i>
                    <p>No hay documentos seleccionados</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        const docsToShow = selectedDocs.slice(0, 5);
        
        docsToShow.forEach(doc => {
            const fileIcon = getFileIcon(doc.tipo_archivo);
            const fileSize = formatFileSize(doc.tamano_archivo);
            
            html += `
                <div class="selected-summary-item">
                    <div class="selected-summary-icon">
                        <i class="fas fa-file-${fileIcon}"></i>
                    </div>
                    <div class="selected-summary-info">
                        <div class="selected-summary-name" title="${doc.nombre_original}">
                            ${doc.nombre_original}
                        </div>
                        <div class="selected-summary-meta">
                            ${doc.tipo_archivo} • ${fileSize}
                        </div>
                    </div>
                    <div class="selected-summary-action">
                        <i class="fas fa-trash-alt"></i>
                    </div>
                </div>
            `;
        });
        
        // Si hay más documentos
        if (selectedDocs.length > 5) {
            const remaining = selectedDocs.length - 5;
            html += `
                <div class="selected-summary-item text-center">
                    <span class="text-muted">
                        ...y ${remaining} documento${remaining !== 1 ? 's' : ''} más
                    </span>
                </div>
            `;
        }
        
        summaryContainer.innerHTML = html;
    }

    /**
     * CONFIRMAR SELECCIÓN
     */
    confirmSelection() {
        const selectedCount = bulkDeleteState.getSelectedCount();
        
        if (selectedCount === 0) {
            showAlert('No hay documentos seleccionados', 'warning');
            return;
        }
        
        console.log(`✅ ${selectedCount} documentos confirmados para eliminación`);
        
        // Scroll al panel de confirmación
        const confirmPanel = document.getElementById('deleteConfirmation');
        if (confirmPanel) {
            confirmPanel.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start',
                inline: 'nearest'
            });
            
            // Efecto de highlight
            confirmPanel.style.boxShadow = '0 0 0 2px rgba(255, 193, 7, 0.3)';
            setTimeout(() => {
                confirmPanel.style.boxShadow = '';
            }, 1000);
        }
        
        // Enfocar checkbox
        const confirmCheckbox = document.getElementById('confirmDeleteCheckbox');
        if (confirmCheckbox) {
            confirmCheckbox.focus();
        }
        
        showAlert(`Listo para eliminar ${selectedCount} documentos`, 'info');
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
        
        const confirmCheckbox = document.getElementById('confirmDeleteCheckbox');
        if (!confirmCheckbox?.checked) {
            showAlert('Debes confirmar la acción marcando la casilla', 'warning');
            confirmCheckbox?.focus();
            return;
        }
        
        const documentIds = bulkDeleteState.getSelectedIds();
        
        console.group('🗑️ EJECUTANDO ELIMINACIÓN MÚLTIPLE MEJORADA');
        console.log('📋 IDs a eliminar:', documentIds);
        
        // Mostrar preloader directamente
        this.showPreloader(selectedCount);
        
        try {
            // Mostrar estado de carga
            this.showDeletingState(true);
            
            // Intentar eliminación masiva - CORREGIDO: SIEMPRE con barra al inicio
            const response = await this.performBulkDelete(documentIds);
            
            if (response.success) {
                await this.handleSuccess(selectedCount, response.message);
            } else {
                throw new Error(response.message || 'Error en la eliminación masiva');
            }
            
        } catch (error) {
            console.error('❌ Error en eliminación múltiple:', error);
            this.hidePreloader();
            this.showDeletingState(false);
            
            // Intentar eliminación individual como fallback
            await this.deleteIndividually(documentIds);
        }
        
        console.groupEnd();
    }

    /**
     * MOSTRAR PRELOADER PROFESIONAL
     */
    showPreloader(selectedCount) {
        // Crear o mostrar overlay de preloader
        let preloader = document.getElementById('bulkDeletePreloader');
        
        if (!preloader) {
            preloader = document.createElement('div');
            preloader.id = 'bulkDeletePreloader';
            preloader.className = 'bulk-delete-preloader';
            preloader.innerHTML = `
                <div class="preloader-container">
                    <div class="preloader-spinner">
                        <div class="spinner-circle"></div>
                        <div class="spinner-circle"></div>
                        <div class="spinner-circle"></div>
                        <div class="spinner-circle"></div>
                    </div>
                    <div class="preloader-content">
                        <h3 class="preloader-title">Moviendo documentos a la papelera</h3>
                        <p class="preloader-message">
                            Procesando <span class="count-highlight">${selectedCount}</span> documento${selectedCount !== 1 ? 's' : ''}...
                        </p>
                        <div class="preloader-progress">
                            <div class="progress-bar">
                                <div class="progress-fill"></div>
                            </div>
                            <div class="progress-text">
                                <span class="progress-percentage">0%</span>
                                <span class="progress-status">Iniciando...</span>
                            </div>
                        </div>
                        <p class="preloader-hint">
                            <i class="fas fa-info-circle"></i>
                            Esta acción puede tomar algunos segundos
                        </p>
                    </div>
                </div>
            `;
            document.body.appendChild(preloader);
        } else {
            // Actualizar contador si ya existe
            const countElement = preloader.querySelector('.count-highlight');
            if (countElement) {
                countElement.textContent = selectedCount;
            }
            
            // Resetear progreso
            const percentageElement = preloader.querySelector('.progress-percentage');
            const statusElement = preloader.querySelector('.progress-status');
            const progressFill = preloader.querySelector('.progress-fill');
            
            if (percentageElement) percentageElement.textContent = '0%';
            if (statusElement) statusElement.textContent = 'Iniciando...';
            if (progressFill) progressFill.style.width = '0%';
            
            preloader.style.display = 'flex';
        }
        
        // Animar el preloader
        setTimeout(() => {
            preloader.classList.add('active');
        }, 10);
        
        console.log('🔄 Preloader mostrado para eliminación múltiple');
    }

    /**
     * OCULTAR PRELOADER
     */
    hidePreloader() {
        const preloader = document.getElementById('bulkDeletePreloader');
        if (preloader) {
            preloader.classList.remove('active');
            
            // Esperar a que termine la animación antes de ocultar
            setTimeout(() => {
                preloader.style.display = 'none';
            }, 300);
            
            console.log('✅ Preloader ocultado');
        }
    }

    /**
     * ACTUALIZAR PROGRESO DEL PRELOADER
     */
    updatePreloaderProgress(percentage, status) {
        const preloader = document.getElementById('bulkDeletePreloader');
        if (!preloader) return;
        
        const percentageElement = preloader.querySelector('.progress-percentage');
        const statusElement = preloader.querySelector('.progress-status');
        const progressFill = preloader.querySelector('.progress-fill');
        
        if (percentageElement) {
            percentageElement.textContent = `${Math.min(100, Math.max(0, percentage))}%`;
        }
        
        if (statusElement && status) {
            statusElement.textContent = status;
        }
        
        if (progressFill) {
            progressFill.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
            progressFill.style.transition = 'width 0.3s ease';
        }
    }

    /**
     * MOSTRAR ESTADO DE ELIMINACIÓN
     */
    showDeletingState(isDeleting) {
        const deleteBtn = document.getElementById('bulkExecuteDeleteBtn');
        if (!deleteBtn) return;
        
        if (isDeleting) {
            deleteBtn.disabled = true;
            deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Eliminando...';
            deleteBtn.classList.add('btn--loading');
        } else {
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Mover a papelera';
            deleteBtn.classList.remove('btn--loading');
        }
    }

    /**
     * REALIZAR ELIMINACIÓN MASIVA - CORREGIDO: SOLO RUTAS CON BARRA AL INICIO
     */
    async performBulkDelete(documentIds) {
        // CORREGIDO: SOLO rutas que comienzan con / (barra)
        // api.js combinará: baseURL (http://localhost:4000/api) + endpoint
        const endpoints = [
            '/documents/bulk-delete',  // Este es el correcto: /api/documents/bulk-delete
            '/api/documents/bulk-delete' // Este es fallback: /api/api/documents/bulk-delete (dará 404 pero lo intentamos)
        ];
        
        let lastError;
        
        // Actualizar preloader
        this.updatePreloaderProgress(30, 'Conectando con el servidor...');
        
        for (const endpoint of endpoints) {
            try {
                console.log(`📡 Intentando endpoint: ${endpoint}`);
                
                this.updatePreloaderProgress(50, 'Enviando solicitud...');
                
                const response = await api.call(endpoint, {
                    method: 'DELETE',
                    body: JSON.stringify({ document_ids: documentIds }),
                    headers: { 'Content-Type': 'application/json' }
                });
                
                if (response && response.success !== undefined) {
                    this.updatePreloaderProgress(80, 'Procesando respuesta...');
                    return response;
                }
            } catch (error) {
                lastError = error;
                console.warn(`⚠️ Endpoint falló: ${endpoint}`, error);
            }
        }
        
        throw lastError || new Error('No se pudo conectar con el servidor');
    }

    /**
     * MANEJAR ÉXITO DE ELIMINACIÓN
     */
async handleSuccess(count, message) {
    this.updatePreloaderProgress(100, '¡Completado!');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    this.hidePreloader();
    this.showDeletingState(false);
    
    showAlert(message || `${count} documentos movidos a la papelera`, 'success');
    
    this.close();
    bulkDeleteState.deselectAll();
    
    // ✅ Recargar documentos
    if (window.loadDocuments) {
        await window.loadDocuments();
    }
    
    // ✅ Recargar categorías para actualizar contadores
    if (window.loadCategories) {
        await window.loadCategories();
    }
    
    // ✅ Refrescar el árbol de categorías
    if (window.refreshCategoryTree) {
        window.refreshCategoryTree();
    }
    
    // Actualizar papelera
    if (updateTrashBadge) {
        await updateTrashBadge();
    }
    
    console.log(`✅ ${count} documentos eliminados exitosamente`);
}

    /**
     * ELIMINACIÓN INDIVIDUAL (FALLBACK) - CORREGIDO: CON BARRA AL INICIO
     */
    async deleteIndividually(documentIds) {
        console.log('🔄 Intentando eliminación individual como fallback...');
        
        const total = documentIds.length;
        let successCount = 0;
        
        // Mostrar nuevo preloader para eliminación individual
        this.showPreloader(total);
        this.updatePreloaderProgress(0, 'Iniciando eliminación individual...');
        
        for (let i = 0; i < documentIds.length; i++) {
            const docId = documentIds[i];
            const progress = Math.round(((i + 1) / total) * 100);
            
            try {
                this.updatePreloaderProgress(
                    progress, 
                    `Eliminando documento ${i + 1} de ${total}...`
                );
                
                // CORREGIDO: SOLO rutas con barra al inicio
                const endpoints = [
                    `/documents/${docId}`,  // Este es el correcto: /api/documents/ID
                    `/api/documents/${docId}` // Este es fallback: /api/api/documents/ID (dará 404)
                ];
                
                let deleted = false;
                
                for (const endpoint of endpoints) {
                    try {
                        const response = await api.call(endpoint, { method: 'DELETE' });
                        if (response.success) {
                            successCount++;
                            deleted = true;
                            break;
                        }
                    } catch (error) {
                        // Continuar con siguiente endpoint
                    }
                }
                
                if (!deleted) {
                    console.warn(`⚠️ No se pudo eliminar documento ${docId}`);
                }
                
            } catch (error) {
                console.error(`❌ Error con documento ${docId}:`, error);
            }
            
            // Pequeña pausa para no saturar
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Mostrar resultados
        if (successCount > 0) {
            await this.handleSuccess(successCount, 
                `${successCount} de ${total} documentos eliminados`);
        } else {
            this.hidePreloader();
            showAlert('No se pudo eliminar ningún documento', 'error');
        }
    }

    /**
     * OBTENER ESTADO DEL DOCUMENTO
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
     * OBTENER TEXTO DE ESTADO
     */
    getStatusText(doc) {
        if (!doc.fecha_vencimiento) return 'Activo';
        
        const fechaVencimiento = new Date(doc.fecha_vencimiento);
        const hoy = new Date();
        const diferenciaDias = Math.ceil((fechaVencimiento - hoy) / (1000 * 60 * 60 * 24));
        
        if (diferenciaDias <= 0) return 'Vencido';
        if (diferenciaDias <= 7) return `${diferenciaDias}d`;
        return 'Activo';
    }

    /**
     * MOSTRAR MODAL
     */
    showModal() {
        this.modal.style.display = 'block';
        document.body.classList.add('modal-open');
        
        setTimeout(() => {
            this.modal.classList.add('show');
            this.isOpen = true;
            
            // Enfocar campo de búsqueda
            const searchInput = document.getElementById('modalSearch');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }, 10);
    }

    /**
     * CERRAR MODAL
     */
    close() {
        if (!this.modal || !this.isOpen) return;
        
        console.log('📋 Cerrando modal de eliminación múltiple');
        
        this.modal.classList.remove('show');
        
        setTimeout(() => {
            this.modal.style.display = 'none';
            document.body.classList.remove('modal-open');
            this.isOpen = false;
        }, 300);
    }

    /**
     * ACTUALIZAR UI COMPLETA
     */
    updateUI() {
        this.updateStats();
        
        // Actualizar texto del botón de vista
        const toggleBtn = document.getElementById('toggleSelectionView');
        if (toggleBtn) {
            toggleBtn.innerHTML = this.compactView ? 
                '<i class="fas fa-th-large"></i> Vista normal' : 
                '<i class="fas fa-th-list"></i> Vista compacta';
        }
    }

    /**
     * DEBUG: MOSTRAR ESTADO DEL MODAL
     */
    debug() {
        console.group('🐛 DEBUG - BulkDeleteModal Mejorado');
        
        console.log('📊 Estado:', {
            abierto: this.isOpen,
            inicializado: this.isInitialized,
            vistaCompacta: this.compactView,
            documentosCargados: this.documents.length,
            documentosFiltrados: this.filteredDocuments.length,
            seleccionados: bulkDeleteState.getSelectedCount()
        });
        
        console.log('👁️ Elementos UI:', {
            'Modal': this.modal ? 'Presente' : 'Ausente',
            'Lista documentos': document.getElementById('modalDocumentsList') ? 'Presente' : 'Ausente',
            'Panel confirmación': document.getElementById('deleteConfirmation') ? 'Presente' : 'Ausente',
            'Botón eliminar': document.getElementById('bulkExecuteDeleteBtn') ? 'Presente' : 'Ausente'
        });
        
        bulkDeleteState.debug();
        
        console.groupEnd();
        
        showAlert('Debug completado. Revisa la consola.', 'info');
    }

    /**
     * TEST: SIMULAR SELECCIÓN
     */
    test() {
        console.group('🧪 TEST - BulkDeleteModal Mejorado');
        
        if (!this.isOpen) {
            this.open();
            setTimeout(() => this.performTest(), 500);
        } else {
            this.performTest();
        }
        
        console.groupEnd();
    }

    /**
     * EJECUTAR TEST
     */
    performTest() {
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
            
            // Mostrar panel de confirmación
            const confirmPanel = document.getElementById('deleteConfirmation');
            if (confirmPanel) {
                confirmPanel.style.display = 'block';
                confirmPanel.scrollIntoView({ behavior: 'smooth' });
            }
            
            console.log('✅ Test configurado: 3 documentos seleccionados');
            showAlert('Test configurado: 3 documentos seleccionados', 'info');
        } else {
            console.warn('⚠️ No hay suficientes documentos para el test');
            showAlert('Necesitas al menos 3 documentos para probar', 'warning');
        }
    }
}

// Exportar instancia singleton
export const bulkDeleteModal = new BulkDeleteModal();

// Auto-inicializar cuando se carga el DOM
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            bulkDeleteModal.init();
        }, 1000);
    });
}

// Hacer disponible globalmente para debugging
if (typeof window !== 'undefined') {
    window.bulkDeleteModal = bulkDeleteModal;
}