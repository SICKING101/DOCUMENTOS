import { DOM } from '../dom.js';
import { CONFIG } from '../config.js';
import { apiCall } from '../api.js';
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
        const response = await apiCall('/trash', { method: 'GET' });
        if (response.success) {
            const badge = document.getElementById('trashBadge');
            if (badge) {
                const count = response.documents.length;
                if (count > 0) {
                    badge.textContent = count;
                    badge.style.display = 'block';
                } else {
                    badge.style.display = 'none';
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
            await loadTrashDocuments();
        });
    }

    // Botón de vaciar papelera
    const emptyBtn = document.getElementById('emptyTrashBtn');
    if (emptyBtn) {
        emptyBtn.addEventListener('click', handleEmptyTrash);
    }

    // Botones de selección
    const selectAllBtn = document.querySelector('#selectAllTrash');
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', () => {
            trashState.selectAll();
            updateTrashUI();
        });
    }

    const deselectAllBtn = document.querySelector('#deselectAllTrash');
    if (deselectAllBtn) {
        deselectAllBtn.addEventListener('click', () => {
            trashState.deselectAll();
            updateTrashUI();
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
}

// =============================================================================
// CARGA DE DOCUMENTOS
// =============================================================================

async function loadTrashDocuments() {
    try {
        const container = document.getElementById('trashContent');
        setLoadingState(true, container);

        const response = await apiCall('/trash', { method: 'GET' });

        if (response.success) {
            trashState.documents = response.documents || [];
            
            // Esperar un momento para que el DOM esté completamente disponible
            setTimeout(() => {
                updateTrashUI();
                updateTrashStats();
            }, 100);
            
            showAlert('Papelera actualizada', 'success');
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

    // Obtener documentos sin filtrado de texto
    let filteredDocs = trashState.documents;

    // Ordenar documentos
    filteredDocs = [...filteredDocs].sort((a, b) => {
        let valA, valB;
        
        switch(trashState.sortBy) {
            case 'name':
                valA = a.nombre_original.toLowerCase();
                valB = b.nombre_original.toLowerCase();
                break;
            case 'deletedAt':
                valA = new Date(a.deletedAt);
                valB = new Date(b.deletedAt);
                break;
            case 'daysRemaining':
                valA = a.daysRemaining;
                valB = b.daysRemaining;
                break;
            case 'size':
                valA = a.tamano_archivo;
                valB = b.tamano_archivo;
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

    // Renderizar
    if (filteredDocs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-trash-alt"></i>
                <h3>La papelera está vacía</h3>
                <p>Los documentos eliminados aparecerán aquí</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filteredDocs.map(doc => renderTrashDocument(doc)).join('');

    // Agregar event listeners a los documentos
    filteredDocs.forEach(doc => {
        attachDocumentEventListeners(doc._id);
    });

    // Actualizar contador de selección
    updateSelectionCounter();
}

function renderTrashDocument(doc) {
    const isSelected = trashState.selectedDocuments.has(doc._id);
    const icon = getFileIcon(doc.tipo_archivo);
    const deletedDate = formatDate(doc.deletedAt);
    
    // Determinar clase de urgencia según días restantes
    let urgencyClass = 'trash-days--safe';
    if (doc.daysRemaining <= 7) {
        urgencyClass = 'trash-days--danger';
    } else if (doc.daysRemaining <= 14) {
        urgencyClass = 'trash-days--warning';
    }

    return `
        <div class="trash-document-card ${isSelected ? 'trash-document-card--selected' : ''}" data-doc-id="${doc._id}">
            <div class="trash-document-checkbox">
                <input type="checkbox" 
                       id="trash-check-${doc._id}" 
                       ${isSelected ? 'checked' : ''}
                       class="trash-checkbox">
            </div>
            
            <div class="trash-document-icon">
                <i class="${icon}"></i>
            </div>
            
            <div class="trash-document-info">
                <h4 class="trash-document-name" title="${doc.nombre_original}">
                    ${doc.nombre_original}
                </h4>
                <div class="trash-document-meta">
                    <span class="trash-meta-item">
                        <i class="fas fa-folder"></i>
                        ${doc.categoria || 'Sin categoría'}
                    </span>
                    <span class="trash-meta-item">
                        <i class="fas fa-hdd"></i>
                        ${formatFileSize(doc.tamano_archivo)}
                    </span>
                    <span class="trash-meta-item">
                        <i class="fas fa-calendar-times"></i>
                        Eliminado: ${deletedDate}
                    </span>
                </div>
            </div>
            
            <div class="trash-document-days ${urgencyClass}">
                <div class="trash-days-number">${doc.daysRemaining}</div>
                <div class="trash-days-label">días restantes</div>
            </div>
            
            <div class="trash-document-actions">
                <button class="btn-icon btn-icon--success trash-restore-btn" 
                        data-doc-id="${doc._id}"
                        title="Restaurar documento">
                    <i class="fas fa-undo"></i>
                </button>
                <button class="btn-icon btn-icon--danger trash-delete-btn" 
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
        });
    }

    // Botón restaurar
    const restoreBtn = document.querySelector(`.trash-restore-btn[data-doc-id="${docId}"]`);
    if (restoreBtn) {
        restoreBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await handleRestoreDocument(docId);
        });
    }

    // Botón eliminar
    const deleteBtn = document.querySelector(`.trash-delete-btn[data-doc-id="${docId}"]`);
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await handleDeleteDocument(docId);
        });
    }

    // Click en la card para seleccionar
    const card = document.querySelector(`.trash-document-card[data-doc-id="${docId}"]`);
    if (card) {
        card.addEventListener('click', (e) => {
            // Evitar que el click en botones active la selección
            if (e.target.closest('.trash-document-actions') || e.target.closest('.trash-document-checkbox')) {
                return;
            }
            trashState.toggleDocument(docId);
            updateTrashUI();
        });
    }
}

// =============================================================================
// ACCIONES
// =============================================================================

async function handleRestoreDocument(docId) {
    const doc = trashState.documents.find(d => d._id === docId);
    if (!doc) return;

    const confirmed = confirm(`¿Restaurar "${doc.nombre_original}"?\n\nEl documento volverá a estar disponible en su ubicación original.`);
    if (!confirmed) return;

    try {
        const response = await apiCall(`/trash/${docId}/restore`, { method: 'POST' });

        if (response.success) {
            showAlert(`"${doc.nombre_original}" restaurado exitosamente`, 'success');
            await loadTrashDocuments();
        } else {
            showAlert('Error al restaurar: ' + response.message, 'error');
        }

    } catch (error) {
        console.error('Error restaurando documento:', error);
        showAlert('Error al restaurar el documento', 'error');
    }
}

async function handleDeleteDocument(docId) {
    const doc = trashState.documents.find(d => d._id === docId);
    if (!doc) return;

    const confirmed = confirm(
        `⚠️ ADVERTENCIA: Esta acción es IRREVERSIBLE\n\n` +
        `¿Eliminar permanentemente "${doc.nombre_original}"?\n\n` +
        `El documento será eliminado definitivamente y no podrá recuperarse.`
    );
    if (!confirmed) return;

    try {
        const response = await apiCall(`/trash/${docId}`, { method: 'DELETE' });

        if (response.success) {
            showAlert(response.message, 'success');
            await loadTrashDocuments();
        } else {
            showAlert('Error al eliminar: ' + response.message, 'error');
        }

    } catch (error) {
        console.error('Error eliminando documento:', error);
        showAlert('Error al eliminar el documento permanentemente', 'error');
    }
}

async function handleRestoreSelected() {
    const selectedCount = trashState.getSelectedCount();
    if (selectedCount === 0) {
        showAlert('No hay documentos seleccionados', 'warning');
        return;
    }

    const confirmed = confirm(
        `¿Restaurar ${selectedCount} documento(s) seleccionado(s)?\n\n` +
        `Los documentos volverán a estar disponibles.`
    );
    if (!confirmed) return;

    try {
        let restoredCount = 0;
        let errorCount = 0;

        for (const docId of trashState.selectedDocuments) {
            try {
                const response = await apiCall(`/trash/${docId}/restore`, { method: 'POST' });
                if (response.success) {
                    restoredCount++;
                } else {
                    errorCount++;
                }
            } catch (error) {
                console.error(`Error restaurando ${docId}:`, error);
                errorCount++;
            }
        }

        showAlert(
            `Restaurados: ${restoredCount} documento(s)${errorCount > 0 ? `. Errores: ${errorCount}` : ''}`,
            errorCount > 0 ? 'warning' : 'success'
        );

        trashState.deselectAll();
        await loadTrashDocuments();

    } catch (error) {
        console.error('Error restaurando seleccionados:', error);
        showAlert('Error al restaurar documentos seleccionados', 'error');
    }
}

async function handleDeleteSelected() {
    const selectedCount = trashState.getSelectedCount();
    if (selectedCount === 0) {
        showAlert('No hay documentos seleccionados', 'warning');
        return;
    }

    const confirmed = confirm(
        `⚠️ ADVERTENCIA: Esta acción es IRREVERSIBLE\n\n` +
        `¿Eliminar permanentemente ${selectedCount} documento(s) seleccionado(s)?\n\n` +
        `Los documentos serán eliminados definitivamente y no podrán recuperarse.`
    );
    if (!confirmed) return;

    try {
        let deletedCount = 0;
        let errorCount = 0;

        for (const docId of trashState.selectedDocuments) {
            try {
                const response = await apiCall(`/trash/${docId}`, { method: 'DELETE' });
                if (response.success) {
                    deletedCount++;
                } else {
                    errorCount++;
                }
            } catch (error) {
                console.error(`Error eliminando ${docId}:`, error);
                errorCount++;
            }
        }

        showAlert(
            `Eliminados permanentemente: ${deletedCount} documento(s)${errorCount > 0 ? `. Errores: ${errorCount}` : ''}`,
            errorCount > 0 ? 'warning' : 'success'
        );

        trashState.deselectAll();
        await loadTrashDocuments();

    } catch (error) {
        console.error('Error eliminando seleccionados:', error);
        showAlert('Error al eliminar documentos seleccionados', 'error');
    }
}

async function handleEmptyTrash() {
    const docCount = trashState.documents.length;
    
    if (docCount === 0) {
        showAlert('La papelera ya está vacía', 'info');
        return;
    }

    const confirmed = confirm(
        `⚠️ ADVERTENCIA CRÍTICA: Esta acción es IRREVERSIBLE\n\n` +
        `¿Vaciar completamente la papelera?\n\n` +
        `Se eliminarán permanentemente ${docCount} documento(s).\n` +
        `Esta acción NO puede deshacerse.`
    );
    if (!confirmed) return;

    // Segunda confirmación
    const doubleConfirmed = confirm(
        `Última confirmación:\n\n` +
        `¿Estás COMPLETAMENTE SEGURO de eliminar ${docCount} documento(s)?`
    );
    if (!doubleConfirmed) return;

    try {
        const container = document.getElementById('trashContent');
        setLoadingState(true, container);

        const response = await apiCall('/trash/empty-all', { method: 'DELETE' });

        if (response.success) {
            showAlert(response.message, 'success');
            trashState.reset();
            await loadTrashDocuments();
        } else {
            showAlert('Error al vaciar papelera: ' + response.message, 'error');
        }

    } catch (error) {
        console.error('Error vaciando papelera:', error);
        showAlert('Error al vaciar la papelera', 'error');
    } finally {
        const container = document.getElementById('trashContent');
        setLoadingState(false, container);
    }
}

// =============================================================================
// ESTADÍSTICAS Y UI
// =============================================================================

function updateTrashStats() {
    // Total de documentos
    const totalElement = document.getElementById('trashTotalDocs');
    if (totalElement) {
        totalElement.textContent = trashState.documents.length;
    }

    // Actualizar badge del topbar
    updateTopbarBadge();
}

function updateTopbarBadge() {
    const badge = document.getElementById('trashBadge');
    if (!badge) return;

    const count = trashState.documents.length;
    
    if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'block';
    } else {
        badge.style.display = 'none';
    }
}

function updateSelectionCounter() {
    const counter = document.getElementById('trashSelectionCounter');
    if (!counter) return;

    const selectedCount = trashState.getSelectedCount();
    
    if (selectedCount === 0) {
        counter.style.display = 'none';
    } else {
        counter.style.display = 'flex';
        counter.textContent = `${selectedCount} seleccionado(s)`;
    }
}

// =============================================================================
// AUTO-LIMPIEZA
// =============================================================================

// Ejecutar limpieza automática al cargar la papelera
export async function runAutoCleanup() {
    try {
        console.log('🔄 Ejecutando limpieza automática...');
        const response = await apiCall('/trash/auto-cleanup', { method: 'POST' });
        
        if (response.success && response.deletedCount > 0) {
            console.log(`✅ Limpieza automática: ${response.deletedCount} documento(s) eliminado(s)`);
        }
    } catch (error) {
        console.error('Error en limpieza automática:', error);
    }
}

// La limpieza automática se ejecutará cuando se cargue la papelera
// No ejecutar automáticamente al cargar el módulo
