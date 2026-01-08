import { DOM } from '../dom.js';
import { CONFIG } from '../config.js';
import { api } from '../services/api.js';
import { setLoadingState, showAlert, formatFileSize, getFileIcon, formatDate } from '../utils.js';

// =============================================================================
// ESTADO DE LA PAPELERA
// =============================================================================

class TrashState {
    constructor() {
        this.documents = [];
        this.selectedDocuments = new Set();
        this.sortBy = 'deletedAt';
        this.sortOrder = 'desc';
        this.filterText = '';
        this.viewMode = 'grid'; // 'grid' o 'list'
    }

    reset() {
        this.documents = [];
        this.selectedDocuments.clear();
    }

    toggleDocument(docId) {
        if (this.selectedDocuments.has(docId)) {
            this.selectedDocuments.delete(docId);
        } else {
            this.selectedDocuments.add(docId);
        }
    }

    selectAll() {
        this.documents.forEach(doc => this.selectedDocuments.add(doc._id));
    }

    deselectAll() {
        this.selectedDocuments.clear();
    }

    getSelectedCount() {
        return this.selectedDocuments.size;
    }

    getSelectedSize() {
        return Array.from(this.selectedDocuments).reduce((total, docId) => {
            const doc = this.documents.find(d => d._id === docId);
            return total + (doc ? doc.tamano_archivo : 0);
        }, 0);
    }

    // Nuevo método para obtener IDs seleccionados
    getSelectedIds() {
        return Array.from(this.selectedDocuments);
    }

    // Nuevo método para verificar si hay selección
    hasSelection() {
        return this.selectedDocuments.size > 0;
    }
}

const trashState = new TrashState();

// =============================================================================
// INICIALIZACIÓN
// =============================================================================

export async function initPapelera() {
    console.log('🗑️ Inicializando módulo de papelera...');
    setupEventListeners();
    await loadTrashDocuments();

    // Ejecutar limpieza automática después de cargar los documentos
    setTimeout(() => {
        runAutoCleanup();
    }, 2000);
}

// Exportar función para actualizar badge desde otros módulos
export async function updateTrashBadge() {
    try {
        const response = await api.call('/trash', { method: 'GET' });
        if (response.success) {
            const badge = document.getElementById('trashBadge');
            if (badge) {
                const count = response.documents.length;
                if (count > 0) {
                    badge.textContent = count > 99 ? '99+' : count;
                    badge.style.display = 'flex';
                    badge.classList.add('has-items');
                } else {
                    badge.style.display = 'none';
                    badge.classList.remove('has-items');
                }
            }
        }
    } catch (error) {
        console.error('Error actualizando badge de papelera:', error);
    }
}

function setupEventListeners() {
    // Botón de actualizar
    const refreshBtn = document.getElementById('refreshTrash');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.classList.add('rotating');
            await loadTrashDocuments();
            setTimeout(() => refreshBtn.classList.remove('rotating'), 500);
        });
    }

    // Botones de selección
    const selectAllBtn = document.querySelector('#selectAllTrash');
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', () => {
            trashState.selectAll();
            updateTrashUI();
            updateSelectionControls();
        });
    }

    const deselectAllBtn = document.querySelector('#deselectAllTrash');
    if (deselectAllBtn) {
        deselectAllBtn.addEventListener('click', () => {
            trashState.deselectAll();
            updateTrashUI();
            updateSelectionControls();
        });
    }

    // Botón restaurar seleccionados
    const restoreSelectedBtn = document.querySelector('#restoreSelectedBtn');
    if (restoreSelectedBtn) {
        restoreSelectedBtn.addEventListener('click', handleRestoreSelected);
    }

    // Botón eliminar seleccionados
    const deleteSelectedBtn = document.querySelector('#deleteSelectedBtn');
    if (deleteSelectedBtn) {
        deleteSelectedBtn.addEventListener('click', handleDeleteSelected);
    }

    // Orden
    const sortSelect = document.querySelector('#trashSortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            const [field, order] = e.target.value.split('-');
            trashState.sortBy = field;
            trashState.sortOrder = order;
            updateTrashUI();
        });
    }

    // Cambiar vista (grid/list)
    const gridViewBtn = document.querySelector('#gridViewBtn');
    const listViewBtn = document.querySelector('#listViewBtn');

    if (gridViewBtn) {
        gridViewBtn.addEventListener('click', () => {
            trashState.viewMode = 'grid';
            gridViewBtn.classList.add('active');
            listViewBtn.classList.remove('active');
            updateTrashUI();
        });
    }

    if (listViewBtn) {
        listViewBtn.addEventListener('click', () => {
            trashState.viewMode = 'list';
            listViewBtn.classList.add('active');
            gridViewBtn.classList.remove('active');
            updateTrashUI();
        });
    }

    // Búsqueda
    const searchInput = document.querySelector('#trashSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            trashState.filterText = e.target.value.toLowerCase();
            updateTrashUI();
        });
    }

    // Event listener para checkboxes individuales (delegación de eventos)
    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('trash-checkbox')) {
            const docId = e.target.id.replace('trash-check-', '');
            trashState.toggleDocument(docId);
            updateTrashUI();
            updateSelectionControls();
        }
    });
}

// =============================================================================
// CARGA DE DOCUMENTOS
// =============================================================================

async function loadTrashDocuments() {
    try {
        const container = document.getElementById('trashContent');
        setLoadingState(true, container);

        const response = await api.call('/trash', { method: 'GET' });

        if (response.success) {
            trashState.documents = response.documents || [];

            // Calcular días restantes si no viene del servidor
            trashState.documents.forEach(doc => {
                if (!doc.daysRemaining && doc.deletedAt) {
                    const deletedDate = new Date(doc.deletedAt);
                    const expirationDate = new Date(deletedDate);
                    expirationDate.setDate(expirationDate.getDate() + 30); // 30 días para eliminar
                    const now = new Date();
                    const diffTime = expirationDate - now;
                    doc.daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
                }
            });

            // Esperar un momento para que el DOM esté completamente disponible
            setTimeout(() => {
                updateTrashUI();
                updateTrashStats();
                updateTopbarBadge();
                updateSelectionControls(); // Añadir esta línea
            }, 100);

            showAlert('Papelera actualizada', 'success', 2000);
        } else {
            showAlert('Error al cargar papelera: ' + response.message, 'error');
        }
    } catch (error) {
        console.error('Error cargando papelera:', error);
        showAlert('Error al cargar documentos de la papelera', 'error');
    } finally {
        const container = document.getElementById('trashContent');
        setLoadingState(false, container);
    }
}

// =============================================================================
// RENDERIZADO
// =============================================================================

function updateTrashUI() {
    const container = document.querySelector('#trashDocumentsList');

    if (!container) {
        console.warn('⚠️ Contenedor de papelera no disponible todavía');
        return;
    }

    // Aplicar filtro de texto
    let filteredDocs = trashState.documents;
    if (trashState.filterText) {
        filteredDocs = filteredDocs.filter(doc =>
            doc.nombre_original.toLowerCase().includes(trashState.filterText) ||
            (doc.categoria && doc.categoria.toLowerCase().includes(trashState.filterText))
        );
    }

    // Ordenar documentos
    filteredDocs = [...filteredDocs].sort((a, b) => {
        let valA, valB;

        switch (trashState.sortBy) {
            case 'name':
                valA = a.nombre_original.toLowerCase();
                valB = b.nombre_original.toLowerCase();
                break;
            case 'deletedAt':
                valA = new Date(a.deletedAt);
                valB = new Date(b.deletedAt);
                break;
            case 'daysRemaining':
                valA = a.daysRemaining || 30;
                valB = b.daysRemaining || 30;
                break;
            case 'size':
                valA = a.tamano_archivo || 0;
                valB = b.tamano_archivo || 0;
                break;
            default:
                valA = a.deletedAt;
                valB = b.deletedAt;
        }

        if (trashState.sortOrder === 'asc') {
            return valA > valB ? 1 : -1;
        } else {
            return valA < valB ? 1 : -1;
        }
    });

    // Renderizar según el modo de vista
    if (filteredDocs.length === 0) {
        const noResultsHtml = trashState.filterText ?
            `<div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>No se encontraron resultados</h3>
                <p>No hay documentos que coincidan con "${trashState.filterText}"</p>
                <button class="btn btn-secondary" onclick="document.querySelector('#trashSearchInput').value=''; trashState.filterText=''; updateTrashUI();">
                    Limpiar búsqueda
                </button>
            </div>` :
            `<div class="empty-state">
                <div class="empty-state-icon">
                    <i class="fas fa-trash-alt"></i>
                </div>
                <h3>La papelera está vacía</h3>
                <p>Los documentos eliminados aparecerán aquí por 30 días</p>
                <div class="empty-state-tips">
                    <div class="tip">
                        <i class="fas fa-info-circle"></i>
                        <span>Los documentos se eliminan automáticamente después de 30 días</span>
                    </div>
                    <div class="tip">
                        <i class="fas fa-undo"></i>
                        <span>Puedes restaurar documentos antes de que sean eliminados permanentemente</span>
                    </div>
                </div>
            </div>`;

        container.innerHTML = noResultsHtml;
        
        // Ocultar acciones masivas si no hay documentos
        const bulkActionsContainer = document.getElementById('bulkActionsContainer');
        if (bulkActionsContainer) {
            bulkActionsContainer.style.display = 'none';
        }
        
        return;
    }

    // Agregar clase al contenedor según el modo de vista
    container.className = `trash-documents-list ${trashState.viewMode}-view`;

    if (trashState.viewMode === 'grid') {
        container.innerHTML = filteredDocs.map(doc => renderGridDocument(doc)).join('');
    } else {
        container.innerHTML = filteredDocs.map(doc => renderListDocument(doc)).join('');
    }

    // Agregar event listeners a los documentos
    filteredDocs.forEach(doc => {
        attachDocumentEventListeners(doc._id);
    });

    // Actualizar controles de selección
    updateSelectionControls();
}

function renderGridDocument(doc) {
    const isSelected = trashState.selectedDocuments.has(doc._id);
    const icon = getFileIcon(doc.tipo_archivo);
    const deletedDate = formatDate(doc.deletedAt);
    const daysRemaining = doc.daysRemaining || 30;

    // Determinar clase de urgencia según días restantes
    let urgencyClass = 'days-safe';
    let urgencyText = 'Seguro';
    let progress = 100;

    if (daysRemaining <= 7) {
        urgencyClass = 'days-danger';
        urgencyText = 'Crítico';
        progress = (daysRemaining / 30) * 100;
    } else if (daysRemaining <= 14) {
        urgencyClass = 'days-warning';
        urgencyText = 'Próximo';
        progress = (daysRemaining / 30) * 100;
    } else {
        progress = (daysRemaining / 30) * 100;
    }

    return `
        <div class="trash-document-card grid-card ${isSelected ? 'selected' : ''}" data-doc-id="${doc._id}">
            <div class="card-header">
                <div class="checkbox-container">
                    <input type="checkbox" 
                           id="trash-check-${doc._id}" 
                           ${isSelected ? 'checked' : ''}
                           class="trash-checkbox">
                    <label for="trash-check-${doc._id}"></label>
                </div>
                <div class="card-urgency ${urgencyClass}">
                    <span class="urgency-badge">${urgencyText}</span>
                </div>
            </div>
            
            <div class="card-body">
                <h4 class="document-name" title="${doc.nombre_original}">
                    ${doc.nombre_original}
                </h4>
                
                <div class="document-meta">
                    <div class="meta-item">
                        <i class="fas fa-folder"></i>
                        <span>${doc.categoria || 'Sin categoría'}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-hdd"></i>
                        <span>${formatFileSize(doc.tamano_archivo)}</span>
                    </div>
                </div>
                
                <div class="deleted-info">
                    <i class="fas fa-calendar-times"></i>
                    <span>Eliminado: ${deletedDate}</span>
                </div>
                
                <div class="days-progress">
                    <div class="progress-header">
                        <span class="progress-label">Días restantes</span>
                        <span class="days-count ${urgencyClass}">${daysRemaining} días</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill ${urgencyClass}" style="width: ${progress}%"></div>
                    </div>
                </div>
            </div>
            
            <div class="card-actions">
                <button class="btn-icon btn-restore" 
                        data-doc-id="${doc._id}"
                        title="Restaurar documento">
                    <i class="fas fa-undo"></i>
                    <span>Restaurar</span>
                </button>
                <button class="btn-icon btn-delete" 
                        data-doc-id="${doc._id}"
                        title="Eliminar permanentemente">
                    <i class="fas fa-trash"></i>
                    <span>Eliminar</span>
                </button>
            </div>
        </div>
    `;
}

function renderListDocument(doc) {
    const isSelected = trashState.selectedDocuments.has(doc._id);
    const icon = getFileIcon(doc.tipo_archivo);
    const deletedDate = formatDate(doc.deletedAt);
    const daysRemaining = doc.daysRemaining || 30;

    // Determinar clase de urgencia según días restantes
    let urgencyClass = 'days-safe';
    let progress = 100;

    if (daysRemaining <= 7) {
        urgencyClass = 'days-danger';
        progress = (daysRemaining / 30) * 100;
    } else if (daysRemaining <= 14) {
        urgencyClass = 'days-warning';
        progress = (daysRemaining / 30) * 100;
    } else {
        progress = (daysRemaining / 30) * 100;
    }

    return `
        <div class="trash-document-card list-card ${isSelected ? 'selected' : ''}" data-doc-id="${doc._id}">
            <div class="list-checkbox">
                <input type="checkbox" 
                       id="trash-check-${doc._id}" 
                       ${isSelected ? 'checked' : ''}
                       class="trash-checkbox">
                <label for="trash-check-${doc._id}"></label>
            </div>
            
            <div class="list-icon">
                <i class="${icon}"></i>
            </div>
            
            <div class="list-info">
                <div class="info-main">
                    <h4 class="document-name" title="${doc.nombre_original}">
                        ${doc.nombre_original}
                    </h4>
                    <div class="info-meta">
                        <span class="meta-item">
                            <i class="fas fa-folder"></i>
                            ${doc.categoria || 'Sin categoría'}
                        </span>
                        <span class="meta-item">
                            <i class="fas fa-hdd"></i>
                            ${formatFileSize(doc.tamano_archivo)}
                        </span>
                        <span class="meta-item">
                            <i class="fas fa-calendar-times"></i>
                            Eliminado: ${deletedDate}
                        </span>
                    </div>
                </div>
                
                <div class="list-days">
                    <div class="days-display ${urgencyClass}">
                        <div class="days-number">${daysRemaining}</div>
                        <div class="days-label">días restantes</div>
                    </div>
                    <div class="progress-bar-small">
                        <div class="progress-fill ${urgencyClass}" style="width: ${progress}%"></div>
                    </div>
                </div>
            </div>
            
            <div class="list-actions">
                <button class="btn-icon-small btn-restore" 
                        data-doc-id="${doc._id}"
                        title="Restaurar documento">
                    <i class="fas fa-undo"></i>
                </button>
                <button class="btn-icon-small btn-delete" 
                        data-doc-id="${doc._id}"
                        title="Eliminar permanentemente">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
}

function attachDocumentEventListeners(docId) {
    // Checkbox
    const checkbox = document.getElementById(`trash-check-${docId}`);
    if (checkbox) {
        checkbox.addEventListener('change', () => {
            trashState.toggleDocument(docId);
            updateTrashUI();
            updateSelectionControls(); // Añadir esta línea
        });
    }

    // Botón restaurar
    const restoreBtn = document.querySelector(`.btn-restore[data-doc-id="${docId}"]`);
    if (restoreBtn) {
        restoreBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await handleRestoreDocument(docId);
        });
    }

    // Botón eliminar
    const deleteBtn = document.querySelector(`.btn-delete[data-doc-id="${docId}"]`);
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await handleDeleteDocument(docId);
        });
    }

    // Botón restaurar lista pequeña
    const restoreBtnSmall = document.querySelector(`.btn-icon-small.btn-restore[data-doc-id="${docId}"]`);
    if (restoreBtnSmall) {
        restoreBtnSmall.addEventListener('click', async (e) => {
            e.stopPropagation();
            await handleRestoreDocument(docId);
        });
    }

    // Botón eliminar lista pequeña
    const deleteBtnSmall = document.querySelector(`.btn-icon-small.btn-delete[data-doc-id="${docId}"]`);
    if (deleteBtnSmall) {
        deleteBtnSmall.addEventListener('click', async (e) => {
            e.stopPropagation();
            await handleDeleteDocument(docId);
        });
    }

    // Click en la card para seleccionar
    const card = document.querySelector(`.trash-document-card[data-doc-id="${docId}"]`);
    if (card) {
        card.addEventListener('click', (e) => {
            // Evitar que el click en botones active la selección
            if (
                e.target.closest('.btn-icon') ||
                e.target.closest('.btn-icon-small') ||
                e.target.closest('.checkbox-container') ||
                e.target.closest('.list-checkbox')
            ) {
                return;
            }
            trashState.toggleDocument(docId);
            updateTrashUI();
            updateSelectionControls(); // Añadir esta línea
        });
    }
}

// =============================================================================
// CONTROLES DE SELECCIÓN
// =============================================================================

function updateSelectionControls() {
    const selectedCount = trashState.getSelectedCount();
    const bulkActionsContainer = document.getElementById('bulkActionsContainer');
    const selectionCounter = document.getElementById('trashSelectionCounter');
    const selectAllBtn = document.getElementById('selectAllTrash');
    const deselectAllBtn = document.getElementById('deselectAllTrash');
    const restoreSelectedBtn = document.getElementById('restoreSelectedBtn');
    const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
    
    // Actualizar contador
    if (selectionCounter) {
        const countSpan = selectionCounter.querySelector('.selection-count');
        if (countSpan) {
            countSpan.textContent = selectedCount;
        }
        
        if (selectedCount > 0) {
            selectionCounter.style.display = 'flex';
            selectionCounter.classList.add('visible');
        } else {
            selectionCounter.style.display = 'none';
            selectionCounter.classList.remove('visible');
        }
    }
    
    // Mostrar/ocultar acciones masivas
    if (bulkActionsContainer) {
        if (selectedCount > 0) {
            bulkActionsContainer.style.display = 'flex';
            bulkActionsContainer.classList.add('visible');
        } else {
            bulkActionsContainer.style.display = 'none';
            bulkActionsContainer.classList.remove('visible');
        }
    }
    
    // Habilitar/deshabilitar botones según selección
    if (selectAllBtn) {
        const allDocsCount = trashState.documents.length;
        const allSelected = selectedCount === allDocsCount && allDocsCount > 0;
        
        if (allDocsCount > 0 && !allSelected) {
            selectAllBtn.disabled = false;
            selectAllBtn.innerHTML = '<i class="fas fa-check-square"></i> Seleccionar Todo';
        } else {
            selectAllBtn.disabled = true;
            selectAllBtn.innerHTML = '<i class="fas fa-check-square"></i> Todo Seleccionado';
        }
    }
    
    if (deselectAllBtn) {
        deselectAllBtn.disabled = selectedCount === 0;
    }
    
    if (restoreSelectedBtn) {
        restoreSelectedBtn.disabled = selectedCount === 0;
        restoreSelectedBtn.innerHTML = selectedCount > 0 
            ? `<i class="fas fa-undo"></i> Restaurar (${selectedCount})`
            : '<i class="fas fa-undo"></i> Restaurar Seleccionados';
    }
    
    if (deleteSelectedBtn) {
        deleteSelectedBtn.disabled = selectedCount === 0;
        deleteSelectedBtn.innerHTML = selectedCount > 0 
            ? `<i class="fas fa-trash-alt"></i> Eliminar (${selectedCount})`
            : '<i class="fas fa-trash-alt"></i> Eliminar Seleccionados';
    }
}

// =============================================================================
// ACCIONES
// =============================================================================

async function handleRestoreDocument(docId) {
    const doc = trashState.documents.find(d => d._id === docId);
    if (!doc) return;

    const confirmed = await showConfirmationModal(
        'Restaurar documento',
        `¿Restaurar "${doc.nombre_original}"?`,
        'El documento volverá a estar disponible en su ubicación original.',
        'success',
        'fas fa-undo'
    );

    if (!confirmed) return;

    try {
        const restoreBtn = document.querySelector(`.btn-restore[data-doc-id="${docId}"]`);
        const originalContent = restoreBtn ? restoreBtn.innerHTML : null;
        if (restoreBtn) {
            restoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            restoreBtn.disabled = true;
        }

        const response = await api.call(`/trash/${docId}/restore`, { method: 'POST' });

        if (restoreBtn) {
            restoreBtn.innerHTML = originalContent;
            restoreBtn.disabled = false;
        }

        if (response.success) {
            showAlert(`"${doc.nombre_original}" restaurado exitosamente`, 'success', 3000);
            await loadTrashDocuments();
            animateDocumentRemoval(docId);
        } else {
            showAlert('Error al restaurar: ' + response.message, 'error');
        }

    } catch (error) {
        console.error('Error restaurando documento:', error);
        showAlert('Error al restaurar el documento', 'error');
        const restoreBtn = document.querySelector(`.btn-restore[data-doc-id="${docId}"]`);
        if (restoreBtn) {
            restoreBtn.innerHTML = '<i class="fas fa-undo"></i><span>Restaurar</span>';
            restoreBtn.disabled = false;
        }
    }
}

async function handleDeleteDocument(docId) {
    const doc = trashState.documents.find(d => d._id === docId);
    if (!doc) return;

    const confirmed = await showConfirmationModal(
        'Eliminar permanentemente',
        `¿Eliminar "${doc.nombre_original}" permanentemente?`,
        'Esta acción es irreversible. El documento no podrá recuperarse.',
        'danger',
        'fas fa-exclamation-triangle'
    );

    if (!confirmed) return;

    try {
        const deleteBtn = document.querySelector(`.btn-delete[data-doc-id="${docId}"]`);
        const originalContent = deleteBtn ? deleteBtn.innerHTML : null;
        if (deleteBtn) {
            deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            deleteBtn.disabled = true;
        }

        const response = await api.call(`/trash/${docId}`, { method: 'DELETE' });

        if (deleteBtn) {
            deleteBtn.innerHTML = originalContent;
            deleteBtn.disabled = false;
        }

        if (response.success) {
            showAlert(response.message, 'success', 3000);
            await loadTrashDocuments();
            animateDocumentRemoval(docId);
        } else {
            showAlert('Error al eliminar: ' + response.message, 'error');
        }

    } catch (error) {
        console.error('Error eliminando documento:', error);
        showAlert('Error al eliminar el documento permanentemente', 'error');
        const deleteBtn = document.querySelector(`.btn-delete[data-doc-id="${docId}"]`);
        if (deleteBtn) {
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i><span>Eliminar</span>';
            deleteBtn.disabled = false;
        }
    }
}

// =============================================================================
// ACCIONES MASIVAS
// =============================================================================

async function handleRestoreSelected() {
    const selectedCount = trashState.getSelectedCount();
    if (selectedCount === 0) {
        showAlert('No hay documentos seleccionados', 'warning');
        return;
    }
    
    const totalSize = formatFileSize(trashState.getSelectedSize());
    const selectedIds = trashState.getSelectedIds();
    
    const confirmed = await showConfirmationModal(
        'Restaurar documentos',
        `¿Restaurar ${selectedCount} documento(s) seleccionado(s)?`,
        `Total: ${totalSize}. Los documentos volverán a estar disponibles en su ubicación original.`,
        'success',
        'fas fa-undo'
    );

    if (!confirmed) return;

    try {
        showProgressModal('Restaurando documentos...', selectedCount);

        let restoredCount = 0;
        let errorCount = 0;
        const errors = [];

        for (let i = 0; i < selectedIds.length; i++) {
            const docId = selectedIds[i];
            const doc = trashState.documents.find(d => d._id === docId);
            
            updateProgressModal(i + 1, selectedIds.length, 
                `Restaurando: ${doc?.nombre_original || 'documento'}`);

            try {
                const response = await api.call(`/trash/${docId}/restore`, { method: 'POST' });
                if (response.success) {
                    restoredCount++;
                } else {
                    errorCount++;
                    errors.push(`${doc?.nombre_original || 'Documento'}: ${response.message}`);
                }
            } catch (error) {
                console.error(`Error restaurando ${docId}:`, error);
                errorCount++;
                errors.push(`${doc?.nombre_original || 'Documento'}: Error de conexión`);
            }
        }

        closeProgressModal();

        if (errorCount === 0) {
            showAlert(`✓ Restaurados ${restoredCount} documento(s) exitosamente`, 'success', 4000);
        } else {
            showAlert(`Restaurados: ${restoredCount}, Errores: ${errorCount}`, 'warning', 4000);
            if (errors.length > 0) {
                console.error('Errores detallados:', errors);
            }
        }

        // Limpiar selección y recargar
        trashState.deselectAll();
        await loadTrashDocuments();
        updateSelectionControls();

    } catch (error) {
        console.error('Error restaurando seleccionados:', error);
        closeProgressModal();
        showAlert('Error al restaurar documentos seleccionados', 'error');
    }
}

async function handleDeleteSelected() {
    const selectedCount = trashState.getSelectedCount();
    if (selectedCount === 0) {
        showAlert('No hay documentos seleccionados', 'warning');
        return;
    }
    
    const totalSize = formatFileSize(trashState.getSelectedSize());
    const selectedIds = trashState.getSelectedIds();
    
    const confirmed = await showConfirmationModal(
        'Eliminar permanentemente',
        `¿Eliminar ${selectedCount} documento(s) permanentemente?`,
        `Total: ${totalSize}. Esta acción es irreversible y no podrán recuperarse.`,
        'danger',
        'fas fa-exclamation-triangle',
        true // Doble confirmación
    );

    if (!confirmed) return;

    try {
        showProgressModal('Eliminando documentos...', selectedCount);

        let deletedCount = 0;
        let errorCount = 0;
        const errors = [];
        const selectedIds = Array.from(trashState.selectedDocuments);

        for (let i = 0; i < selectedIds.length; i++) {
            const docId = selectedIds[i];
            const doc = trashState.documents.find(d => d._id === docId);
            
            updateProgressModal(i + 1, selectedIds.length, 
                `Eliminando: ${doc?.nombre_original || 'documento'}`);

            try {
                const response = await api.call(`/trash/${docId}`, { method: 'DELETE' });
                if (response.success) {
                    deletedCount++;
                } else {
                    errorCount++;
                    errors.push(`${doc?.nombre_original || 'Documento'}: ${response.message}`);
                }
            } catch (error) {
                console.error(`Error eliminando ${docId}:`, error);
                errorCount++;
                errors.push(`${doc?.nombre_original || 'Documento'}: Error de conexión`);
            }
        }

        closeProgressModal();

        if (errorCount === 0) {
            showAlert(`✓ Eliminados ${deletedCount} documento(s) permanentemente`, 'success', 4000);
        } else {
            showAlert(`Eliminados: ${deletedCount}, Errores: ${errorCount}`, 'warning', 4000);
            if (errors.length > 0) {
                console.error('Errores detallados:', errors);
            }
        }

        // Limpiar selección y recargar
        trashState.deselectAll();
        await loadTrashDocuments();
        updateSelectionControls();

    } catch (error) {
        console.error('Error eliminando seleccionados:', error);
        closeProgressModal();
        showAlert('Error al eliminar documentos seleccionados', 'error');
    }
}

// =============================================================================
// ESTADÍSTICAS Y UI
// =============================================================================
// =============================================================================
// ESTADÍSTICAS Y UI
// =============================================================================

function updateTrashStats() {
    const totalDocs = trashState.documents.length;
    const totalSize = trashState.documents.reduce((sum, doc) => sum + (doc.tamano_archivo || 0), 0);
    const criticalDocs = trashState.documents.filter(doc => (doc.daysRemaining || 30) <= 7).length;
    const warningDocs = trashState.documents.filter(doc => {
        const days = doc.daysRemaining || 30;
        return days > 7 && days <= 14;
    }).length;

    console.log('📊 Estadísticas calculadas:', {
        totalDocs,
        totalSize: formatFileSize(totalSize),
        criticalDocs,
        warningDocs
    });

    // Actualizar tarjetas de estadísticas
    const totalElement = document.getElementById('trashTotalDocs');
    if (totalElement) {
        totalElement.textContent = totalDocs;
        console.log('✅ Actualizado trushTotalDocs:', totalDocs);
    } else {
        console.warn('❌ Elemento trushTotalDocs no encontrado');
    }

    const sizeElement = document.getElementById('trashTotalSize');
    if (sizeElement) {
        sizeElement.textContent = formatFileSize(totalSize);
        console.log('✅ Actualizado trushTotalSize:', formatFileSize(totalSize));
    } else {
        console.warn('❌ Elemento trushTotalSize no encontrado');
    }

    const criticalElement = document.getElementById('trashCriticalDocs');
    if (criticalElement) {
        criticalElement.textContent = criticalDocs;
        console.log('✅ Actualizado trushCriticalDocs:', criticalDocs);
        
        // Mostrar u ocultar tarjeta según haya documentos críticos
        const criticalCard = criticalElement.closest('.trash-stat-card');
        if (criticalCard) {
            if (criticalDocs > 0) {
                criticalCard.style.display = 'flex';
                criticalCard.classList.add('has-items');
            } else {
                criticalCard.style.display = 'none';
                criticalCard.classList.remove('has-items');
            }
        }
    } else {
        console.warn('❌ Elemento trushCriticalDocs no encontrado');
    }

    const warningElement = document.getElementById('trashWarningDocs');
    if (warningElement) {
        warningElement.textContent = warningDocs;
        console.log('✅ Actualizado trushWarningDocs:', warningDocs);
        
        // Mostrar u ocultar tarjeta según haya documentos con advertencia
        const warningCard = warningElement.closest('.trash-stat-card');
        if (warningCard) {
            if (warningDocs > 0) {
                warningCard.style.display = 'flex';
                warningCard.classList.add('has-items');
            } else {
                warningCard.style.display = 'none';
                warningCard.classList.remove('has-items');
            }
        }
    } else {
        console.warn('❌ Elemento trushWarningDocs no encontrado');
    }

    // Actualizar badge del topbar
    updateTopbarBadge();
}

function updateTopbarBadge() {
    const badge = document.getElementById('trashBadge');
    if (!badge) return;

    const count = trashState.documents.length;
    const criticalCount = trashState.documents.filter(doc => (doc.daysRemaining || 30) <= 7).length;

    if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = 'flex';

        // Cambiar color si hay documentos críticos
        if (criticalCount > 0) {
            badge.classList.add('badge-critical');
            badge.title = `${criticalCount} documento(s) por expirar`;
        } else {
            badge.classList.remove('badge-critical');
            badge.title = `${count} documento(s) en papelera`;
        }
    } else {
        badge.style.display = 'none';
        badge.classList.remove('badge-critical');
    }
}

function updateSelectionCounter() {
    const counter = document.getElementById('trashSelectionCounter');
    if (!counter) return;

    const selectedCount = trashState.getSelectedCount();
    const selectedSize = formatFileSize(trashState.getSelectedSize());

    if (selectedCount === 0) {
        counter.style.display = 'none';
    } else {
        counter.style.display = 'flex';
        counter.innerHTML = `
            <div class="selection-info">
                <span class="selection-count">${selectedCount} documento(s) seleccionado(s)</span>
                <span class="selection-size">${selectedSize}</span>
            </div>
        `;
    }
}

// =============================================================================
// MODALES Y ANIMACIONES
// =============================================================================

function showConfirmationModal(title, subtitle, message, type, icon, doubleConfirm = false) {
    return new Promise((resolve) => {
        // Crear modal
        const modalId = 'confirmationModal';
        let modal = document.getElementById(modalId);

        if (!modal) {
            modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'confirmation-modal';
            document.body.appendChild(modal);
        }

        const typeClass = type === 'danger' ? 'modal-danger' : 'modal-success';
        const doubleConfirmHtml = doubleConfirm ? `
            <div class="double-confirm">
                <input type="checkbox" id="doubleConfirm">
                <label for="doubleConfirm">Sí, estoy completamente seguro</label>
            </div>
        ` : '';

        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content ${typeClass}">
                <div class="modal-header">
                    <div class="modal-icon">
                        <i class="${icon}"></i>
                    </div>
                    <h3>${title}</h3>
                </div>
                <div class="modal-body">
                    <p class="modal-subtitle">${subtitle}</p>
                    <p class="modal-message">${message}</p>
                    ${doubleConfirmHtml}
                </div>
                <div class="modal-footer">
                    <button class="btn modal-cancel">Cancelar</button>
                    <button class="btn btn-${type} modal-confirm" ${doubleConfirm ? 'disabled' : ''}>
                        Confirmar
                    </button>
                </div>
            </div>
        `;

        modal.style.display = 'block';

        // Event listeners
        const confirmBtn = modal.querySelector('.modal-confirm');
        const cancelBtn = modal.querySelector('.modal-cancel');
        const overlay = modal.querySelector('.modal-overlay');

        const closeModal = () => {
            modal.style.display = 'none';
            document.removeEventListener('keydown', handleEscape);
        };

        const handleConfirm = () => {
            if (doubleConfirm) {
                const doubleCheck = modal.querySelector('#doubleConfirm');
                if (doubleCheck && !doubleCheck.checked) {
                    doubleCheck.classList.add('shake');
                    setTimeout(() => doubleCheck.classList.remove('shake'), 500);
                    return;
                }
            }
            closeModal();
            resolve(true);
        };

        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', () => {
            closeModal();
            resolve(false);
        });
        overlay.addEventListener('click', () => {
            closeModal();
            resolve(false);
        });

        // Habilitar confirmación después de marcar doble confirmación
        if (doubleConfirm) {
            const doubleCheck = modal.querySelector('#doubleConfirm');
            doubleCheck.addEventListener('change', (e) => {
                confirmBtn.disabled = !e.target.checked;
            });
        }

        // Tecla Escape
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                resolve(false);
            }
        };
        document.addEventListener('keydown', handleEscape);
    });
}

function showProgressModal(message, total) {
    const modalId = 'progressModal';
    let modal = document.getElementById(modalId);

    if (!modal) {
        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'progress-modal';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h3>Procesando...</h3>
            </div>
            <div class="modal-body">
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 0%"></div>
                    </div>
                    <div class="progress-text">
                        <span class="progress-message">${message}</span>
                        <span class="progress-percentage">0%</span>
                    </div>
                    <div class="progress-details">
                        <span class="progress-count">0/${total}</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    modal.style.display = 'block';
}

function updateProgressModal(current, total, message) {
    const modal = document.getElementById('progressModal');
    if (!modal) return;

    const percentage = Math.round((current / total) * 100);

    const progressFill = modal.querySelector('.progress-fill');
    const progressPercentage = modal.querySelector('.progress-percentage');
    const progressCount = modal.querySelector('.progress-count');
    const progressMessage = modal.querySelector('.progress-message');

    if (progressFill) progressFill.style.width = `${percentage}%`;
    if (progressPercentage) progressPercentage.textContent = `${percentage}%`;
    if (progressCount) progressCount.textContent = `${current}/${total}`;
    if (progressMessage && message) progressMessage.textContent = message;
}

function closeProgressModal() {
    const modal = document.getElementById('progressModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function animateDocumentRemoval(docId) {
    const card = document.querySelector(`.trash-document-card[data-doc-id="${docId}"]`);
    if (card) {
        card.style.transition = 'all 0.3s ease';
        card.style.opacity = '0';
        card.style.transform = 'translateX(-100px)';
        setTimeout(() => {
            if (card.parentNode) {
                card.style.display = 'none';
            }
        }, 300);
    }
}

// =============================================================================
// AUTO-LIMPIEZA
// =============================================================================

export async function runAutoCleanup() {
    try {
        console.log('🔄 Ejecutando limpieza automática...');
        const response = await api.call('/trash/auto-cleanup', { method: 'POST' });

        if (response.success && response.deletedCount > 0) {
            console.log(`✅ Limpieza automática: ${response.deletedCount} documento(s) eliminado(s)`);

            // Mostrar notificación si se eliminaron documentos
            if (response.deletedCount > 0) {
                showAlert(
                    `Limpieza automática: ${response.deletedCount} documento(s) expirados eliminados`,
                    'info',
                    5000
                );

                // Actualizar si estamos en la vista de papelera
                if (document.getElementById('trashContent')) {
                    await loadTrashDocuments();
                }
            }
        }
    } catch (error) {
        console.error('Error en limpieza automática:', error);
    }
}

// Exportar funciones para uso global
window.handleRestoreSelected = handleRestoreSelected;
window.handleDeleteSelected = handleDeleteSelected;

// Función de ayuda para limpiar selección
window.clearSelection = function() {
    trashState.deselectAll();
    updateTrashUI();
    updateSelectionControls();
};

// Función de ayuda para seleccionar todos los visibles
window.selectAllVisible = function() {
    const container = document.querySelector('#trashDocumentsList');
    if (!container) return;
    
    // Obtener solo los documentos visibles (después de filtro)
    const visibleCards = container.querySelectorAll('.trash-document-card');
    visibleCards.forEach(card => {
        const docId = card.getAttribute('data-doc-id');
        trashState.selectedDocuments.add(docId);
    });
    
    updateTrashUI();
    updateSelectionControls();
};

// Exportar para acceso global
window.trashState = trashState;