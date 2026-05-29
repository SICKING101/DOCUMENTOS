// =============================================================================
// src/frontend/modules/documentos/table/tableRenderer.js
// CORREGIDO - Compatible con el nuevo CSS category--*
// =============================================================================


import { reinitializeDragDrop } from '../dragdrop/documentDragDrop.js';
import { DOM } from '../../../dom.js';
import { formatFileSize, formatDate, getFileIcon } from '../../../utils.js';
import { canPreviewDocument } from '../preview/previewManager.js';
import { downloadDocument } from '../download/downloadManager.js';
import { bulkDeleteState } from '../core/BulkDeleteState.js';
import { hasPermission, PERMISSIONS } from '../../../permissions.js';

const DOCUMENTS_PER_PAGE = 15;

function ensureDocumentsPaginationState() {
    if (!window.appState) window.appState = {};
    if (!window.appState.documentsPagination) {
        window.appState.documentsPagination = {
            currentPage: 1,
            itemsPerPage: DOCUMENTS_PER_PAGE
        };
    }
    if (!Number.isFinite(window.appState.documentsPagination.currentPage) || window.appState.documentsPagination.currentPage < 1) {
        window.appState.documentsPagination.currentPage = 1;
    }
    if (!Number.isFinite(window.appState.documentsPagination.itemsPerPage) || window.appState.documentsPagination.itemsPerPage < 1) {
        window.appState.documentsPagination.itemsPerPage = DOCUMENTS_PER_PAGE;
    }
    return window.appState.documentsPagination;
}

function renderDocumentsPagination(totalPages, currentPage) {
    const container = document.getElementById('documentsPagination');
    if (!container) return;

    if (!totalPages || totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '<div class="pagination">';

    html += `
        <button class="pagination__btn pagination__btn--prev" 
                ${currentPage === 1 ? 'disabled' : ''}
                onclick="window.changeDocumentsPage(${currentPage - 1})">
            <i class="fas fa-chevron-left"></i>
            <span>Anterior</span>
        </button>
    `;

    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);

    for (let i = start; i <= end; i++) {
        html += `
            <button class="pagination__btn ${i === currentPage ? 'pagination__btn--active' : ''}"
                    onclick="window.changeDocumentsPage(${i})">
                ${i}
            </button>
        `;
    }

    html += `
        <button class="pagination__btn pagination__btn--next"
                ${currentPage === totalPages ? 'disabled' : ''}
                onclick="window.changeDocumentsPage(${currentPage + 1})">
            <span>Siguiente</span>
            <i class="fas fa-chevron-right"></i>
        </button>
    `;

    html += '</div>';
    container.innerHTML = html;
}

export function changeDocumentsPage(page) {
    const pagination = ensureDocumentsPaginationState();
    const nextPage = Number(page);
    if (!Number.isFinite(nextPage)) return;
    pagination.currentPage = Math.max(1, Math.floor(nextPage));
    renderDocumentsTable();
    console.log(`📄 Cambiando a página ${pagination.currentPage}`);
}

function syncDocumentsTableHeader() {
    if (!DOM.documentosTableBody) return;

    const table = DOM.documentosTableBody.closest('table');
    if (!table) return;

    // Usar la nueva clase is-selection-mode
    table.classList.toggle('is-selection-mode', !!bulkDeleteState.isSelectionMode);

    const headerRow = table.querySelector('thead tr');
    if (!headerRow) return;

    const existing = headerRow.querySelector('th[data-selection-column="true"]');

    if (bulkDeleteState.isSelectionMode) {
        if (!existing) {
            const th = document.createElement('th');
            th.setAttribute('data-selection-column', 'true');
            th.setAttribute('aria-label', 'Selección');
            th.className = 'category--th';
            th.style.width = '5%';
            headerRow.insertBefore(th, headerRow.firstChild);
        }
    } else if (existing) {
        existing.remove();
    }
}

/**
 * Renderiza la tabla de documentos con filtros y búsqueda aplicados.
 */
export function renderDocumentsTable() {
    console.log('🔄 Renderizando tabla de documentos...');
    
    if (!DOM.documentosTableBody) {
        console.error('❌ DOM.documentosTableBody no encontrado');
        return;
    }

    syncDocumentsTableHeader();
    
    DOM.documentosTableBody.innerHTML = '';
    
    const pagination = ensureDocumentsPaginationState();

    const documentsOverride = arguments.length > 0 ? arguments[0] : undefined;
    let documentsToShow = Array.isArray(documentsOverride)
        ? documentsOverride
        : (window.appState.filteredDocuments || window.appState.documents || []);
    console.log(`📊 Documentos totales: ${documentsToShow.length}`);
    
    if (bulkDeleteState.setTotalDocuments) {
        bulkDeleteState.setTotalDocuments(documentsToShow.length);
    }
    
    const shouldApplyLocalFilters = !Array.isArray(documentsOverride) && !window.appState.filteredDocuments;
    if (shouldApplyLocalFilters) {
        if (window.appState.currentSearchQuery) {
            const query = window.appState.currentSearchQuery.toLowerCase();
            documentsToShow = documentsToShow.filter(doc =>
                doc.nombre_original.toLowerCase().includes(query) ||
                (doc.descripcion && doc.descripcion.toLowerCase().includes(query)) ||
                doc.categoria.toLowerCase().includes(query)
            );
        }

        if (window.appState.filters?.category) {
            documentsToShow = documentsToShow.filter(doc => doc.categoria === window.appState.filters.category);
        }

        if (window.appState.filters?.type) {
            documentsToShow = documentsToShow.filter(doc => doc.tipo_archivo.toLowerCase() === window.appState.filters.type.toLowerCase());
        }

        if (window.appState.filters?.status) {
            const now = new Date();
            documentsToShow = documentsToShow.filter(doc => {
                if (!doc.fecha_vencimiento) return window.appState.filters.status === 'active';
                const fechaVencimiento = new Date(doc.fecha_vencimiento);
                const diferenciaDias = Math.ceil((fechaVencimiento - now) / (1000 * 60 * 60 * 24));
                switch (window.appState.filters.status) {
                    case 'active': return diferenciaDias > 7;
                    case 'expiring': return diferenciaDias <= 7 && diferenciaDias > 0;
                    case 'expired': return diferenciaDias <= 0;
                    default: return true;
                }
            });
        }
    }
    
    const totalFiltered = documentsToShow.length;
    const itemsPerPage = pagination.itemsPerPage;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / itemsPerPage));
    if (pagination.currentPage > totalPages) pagination.currentPage = totalPages;
    const startIndex = (pagination.currentPage - 1) * itemsPerPage;
    const pageDocuments = documentsToShow.slice(startIndex, startIndex + itemsPerPage);

    const visibleIds = pageDocuments.map(doc => doc._id || doc.id).filter(id => id);
    if (bulkDeleteState.setFilteredIds) {
        bulkDeleteState.setFilteredIds(visibleIds);
    }
    
    // Manejar estado vacío
    if (documentsToShow.length === 0) {
        const emptyMessage = window.appState.currentSearchQuery || 
                           window.appState.filters?.category || 
                           window.appState.filters?.type || 
                           window.appState.filters?.status 
            ? 'No hay documentos que coincidan con la búsqueda o filtros aplicados' 
            : 'Sube tu primer documento para comenzar';
        
        const numColumns = bulkDeleteState.isSelectionMode ? 6 : 5;
        
        DOM.documentosTableBody.innerHTML = `
            <tr>
                <td colspan="${numColumns}" class="category--table-empty">
                    <i class="fas fa-file-alt category--table-empty-icon"></i>
                    <h3 class="category--table-empty-title">No hay documentos</h3>
                    <p class="category--table-empty-desc">${emptyMessage}</p>
                </td>
            </tr>
        `;
        
        if (bulkDeleteState.clearSelection) {
            bulkDeleteState.clearSelection();
        }
        updateBulkSelectionUI();
        renderDocumentsPagination(0, 1);
        
        // Emitir evento de renderizado completado
        window.dispatchEvent(new CustomEvent('documents:rendered'));
        
        return;
    }
    
    console.log(`✅ Mostrando página ${pagination.currentPage}/${totalPages} (${pageDocuments.length} de ${documentsToShow.length})`);
    
    // Renderizar cada documento
    pageDocuments.forEach(doc => {
        const row = createDocumentRow(doc);
        if (row) {
            DOM.documentosTableBody.appendChild(row);
        }
    });

    renderDocumentsPagination(totalPages, pagination.currentPage);
    updateBulkSelectionUI();
    
    if (bulkDeleteState.isSelectionMode) {
        setTimeout(() => {
            setupCheckboxEventListeners();
        }, 50);
    }
    
    console.log('✅ Tabla renderizada correctamente');
    
    // Emitir evento de renderizado completado
    window.dispatchEvent(new CustomEvent('documents:rendered'));
    
    // Inicializar drag & drop después de renderizar
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            if (typeof reinitializeDragDrop === 'function') {
                reinitializeDragDrop();
                console.log('🔄 Drag & drop re-inicializado después de renderizar tabla');
            }
        });
    });
}

/**
 * Obtiene la clase CSS para el icono según el tipo de archivo.
 */
function getFileIconClass(extension) {
    const ext = (extension || '').toLowerCase();
    const iconMap = {
        'pdf': 'category--doc-file-icon--pdf',
        'doc': 'category--doc-file-icon--word',
        'docx': 'category--doc-file-icon--word',
        'xls': 'category--doc-file-icon--excel',
        'xlsx': 'category--doc-file-icon--excel',
        'jpg': 'category--doc-file-icon--image',
        'jpeg': 'category--doc-file-icon--image',
        'png': 'category--doc-file-icon--image',
        'gif': 'category--doc-file-icon--image',
        'webp': 'category--doc-file-icon--image',
        'bmp': 'category--doc-file-icon--image',
        'ppt': 'category--doc-file-icon--ppt',
        'pptx': 'category--doc-file-icon--ppt',
        'txt': 'category--doc-file-icon--txt',
        'csv': 'category--doc-file-icon--txt',
        'json': 'category--doc-file-icon--txt',
        'xml': 'category--doc-file-icon--txt',
    };
    return iconMap[ext] || 'category--doc-file-icon--other';
}

/**
 * Obtiene el icono de Font Awesome según el tipo de archivo.
 */
function getFileFaIcon(extension) {
    const ext = (extension || '').toLowerCase();
    const iconMap = {
        'pdf': 'fa-file-pdf',
        'doc': 'fa-file-word',
        'docx': 'fa-file-word',
        'xls': 'fa-file-excel',
        'xlsx': 'fa-file-excel',
        'jpg': 'fa-file-image',
        'jpeg': 'fa-file-image',
        'png': 'fa-file-image',
        'gif': 'fa-file-image',
        'webp': 'fa-file-image',
        'bmp': 'fa-file-image',
        'ppt': 'fa-file-powerpoint',
        'pptx': 'fa-file-powerpoint',
        'txt': 'fa-file-alt',
        'csv': 'fa-file-csv',
        'json': 'fa-file-code',
        'xml': 'fa-file-code',
        'html': 'fa-file-code',
        'zip': 'fa-file-archive',
        'rar': 'fa-file-archive',
    };
    return iconMap[ext] || 'fa-file';
}

/**
 * CREAR FILA DE DOCUMENTO - CORREGIDA con las nuevas clases CSS
 */
function createDocumentRow(doc) {
    if (!doc || (!doc._id && !doc.id)) {
        console.warn('⚠️ Documento inválido:', doc);
        return null;
    }
    
    const person = doc.persona_id ? doc.persona_id : { nombre: 'No asignado' };
    const { vencimientoClass, vencimientoText, statusBadgeClass } = getDocumentStatus(doc);
    
    const fileExtension = doc.nombre_original?.split('.').pop().toLowerCase() || 'file';
    const previewInfo = canPreviewDocument(fileExtension);
    const fileIconClass = getFileIconClass(fileExtension);
    const fileFaIcon = getFileFaIcon(fileExtension);
    
    const actionButtons = createActionButtons(doc, previewInfo.canPreview);
    
    const docId = doc._id || doc.id;
    const isSelected = bulkDeleteState.isSelected ? bulkDeleteState.isSelected(docId) : false;
    
    const row = document.createElement('tr');
    row.className = isSelected ? 'doc-row--selected' : '';
    row.setAttribute('data-document-id', docId);
    
    let rowHTML = '';
    
    // Columna de selección (solo en modo selección)
    if (bulkDeleteState.isSelectionMode) {
        rowHTML += `
            <td class="category--checkbox-cell">
                <input type="checkbox" 
                       class="category--select-checkbox document-select-checkbox"
                       data-document-id="${docId}"
                       ${isSelected ? 'checked' : ''}
                       aria-label="Seleccionar documento">
            </td>
        `;
    }
    
    // Nombre del documento con icono
    const docName = doc.nombre_original || 'Documento sin nombre';
    const docDesc = doc.descripcion || '';
    const truncatedName = docName.length > 35 ? docName.substring(0, 35) + '...' : docName;
    const truncatedDesc = docDesc.length > 40 ? docDesc.substring(0, 40) + '...' : docDesc;
    
    rowHTML += `
        <td>
            <div class="category--doc-cell">
                <div class="category--doc-file-icon ${fileIconClass}">
                    <i class="fas ${fileFaIcon}"></i>
                </div>
                <div class="category--doc-info">
                    <span class="category--doc-name" title="${docName}">${truncatedName}</span>
                    ${docDesc ? `<span class="category--doc-desc" title="${docDesc}">${truncatedDesc}</span>` : ''}
                </div>
            </div>
        </td>
        <td>
            <span class="category--type-badge">${(doc.tipo_archivo || 'file').toUpperCase()}</span>
        </td>
        <td title="${person.nombre || 'No asignado'}">
            ${(person.nombre || 'No asignado').length > 20 
                ? (person.nombre || 'No asignado').substring(0, 20) + '...' 
                : (person.nombre || 'No asignado')}
        </td>
        <td>
            <span class="category--status-badge ${statusBadgeClass}">
                ${vencimientoText}
            </span>
        </td>
        <td>
            <div class="category--doc-actions">
                ${actionButtons}
            </div>
        </td>
    `;
    
    row.innerHTML = rowHTML;
    return row;
}

/**
 * OBTENER ESTADO DEL DOCUMENTO
 */
function getDocumentStatus(doc) {
    let vencimientoText = '';
    let statusBadgeClass = 'category--status-badge--none';
    
    if (doc.fecha_vencimiento) {
        try {
            const fechaVencimiento = new Date(doc.fecha_vencimiento);
            const hoy = new Date();
            const diferenciaDias = Math.ceil((fechaVencimiento - hoy) / (1000 * 60 * 60 * 24));
            
            if (diferenciaDias <= 0) {
                vencimientoText = 'Vencido';
                statusBadgeClass = 'category--status-badge--expired';
            } else if (diferenciaDias <= 7) {
                vencimientoText = `Vence en ${diferenciaDias} días`;
                statusBadgeClass = 'category--status-badge--expiring';
            } else if (diferenciaDias <= 30) {
                vencimientoText = `Vence en ${diferenciaDias} días`;
                statusBadgeClass = 'category--status-badge--active';
            } else {
                vencimientoText = 'Activo';
                statusBadgeClass = 'category--status-badge--active';
            }
        } catch (error) {
            vencimientoText = 'Fecha inválida';
            statusBadgeClass = 'category--status-badge--none';
        }
    } else {
        vencimientoText = 'Sin vencimiento';
        statusBadgeClass = 'category--status-badge--none';
    }
    
    return { vencimientoText, statusBadgeClass };
}

/**
 * CREAR BOTONES DE ACCIONES - CORREGIDO con nuevas clases
 */
function createActionButtons(doc, canPreview) {
    const docId = doc._id || doc.id;
    if (!docId) return '';

    const canDownload = hasPermission(PERMISSIONS.DOWNLOAD_DOCUMENTS);
    const canView = hasPermission(PERMISSIONS.VIEW_DOCUMENTS);
    const canEdit = hasPermission(PERMISSIONS.EDIT_DOCUMENTS);
    const canDelete = hasPermission(PERMISSIONS.DELETE_DOCUMENTS);

    let buttons = '';

    // Botón Descargar
    if (canDownload) {
        buttons += `
            <button class="category--action-btn category--action-btn--download" 
                    onclick="if(window.downloadDocument)window.downloadDocument('${docId}')" 
                    title="Descargar" aria-label="Descargar documento">
                <i class="fas fa-download"></i>
            </button>
        `;
    }

    // Botón Ver / Vista previa
    if (canPreview && canView) {
        buttons += `
            <button class="category--action-btn category--action-btn--view" 
                    onclick="if(window.previewDocument)window.previewDocument('${docId}')" 
                    title="Vista previa" aria-label="Ver documento">
                <i class="fas fa-eye"></i>
            </button>
        `;
    }

    // Botón Editar
    if (canEdit) {
        buttons += `
            <button class="category--action-btn category--action-btn--edit" 
                    onclick="if(window.editDocument)window.editDocument('${docId}')" 
                    title="Editar documento" aria-label="Editar documento">
                <i class="fas fa-edit"></i>
            </button>
        `;
    }

    // Botón Eliminar
    if (canDelete) {
        buttons += `
            <button class="category--action-btn category--action-btn--delete" 
                    onclick="if(window.deleteDocument)window.deleteDocument('${docId}')" 
                    title="Eliminar" aria-label="Eliminar documento">
                <i class="fas fa-trash"></i>
            </button>
        `;
    }

    return buttons;
}

/**
 * CONFIGURAR EVENT LISTENERS PARA CHECKBOXES
 */
function setupCheckboxEventListeners() {
    const checkboxes = document.querySelectorAll('.document-select-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.replaceWith(checkbox.cloneNode(true));
    });
    
    const newCheckboxes = document.querySelectorAll('.document-select-checkbox');
    
    newCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function(e) {
            const documentId = this.getAttribute('data-document-id');
            const isChecked = this.checked;
            
            if (isChecked) {
                if (bulkDeleteState.addDocument) {
                    bulkDeleteState.addDocument(documentId);
                }
                this.closest('tr').classList.add('doc-row--selected');
            } else {
                if (bulkDeleteState.removeDocument) {
                    bulkDeleteState.removeDocument(documentId);
                }
                this.closest('tr').classList.remove('doc-row--selected');
            }
            
            updateBulkSelectionUI();
        });
    });
}

/**
 * ACTUALIZAR UI DE SELECCIÓN MÚLTIPLE
 */
function updateBulkSelectionUI() {
    const selectedCount = bulkDeleteState.getSelectedCount ? bulkDeleteState.getSelectedCount() : 0;
    
    const badge = document.getElementById('selectedCountBadge');
    const text = document.getElementById('selectedCountText');
    const modalCount = document.getElementById('bulkDeleteCount');
    
    if (badge) {
        badge.textContent = selectedCount;
        badge.style.display = selectedCount > 0 ? 'inline-block' : 'none';
    }
    if (text) text.textContent = selectedCount;
    if (modalCount) modalCount.textContent = selectedCount;
    
    const selectionBar = document.getElementById('selectionInfoBar');
    const bulkActions = document.getElementById('bulkActionsContainer');
    
    if (selectionBar) {
        selectionBar.style.display = bulkDeleteState.isSelectionMode ? 'flex' : 'none';
    }
    if (bulkActions) {
        bulkActions.style.display = selectedCount > 0 ? 'flex' : 'none';
    }
    
    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
    if (bulkDeleteBtn) {
        bulkDeleteBtn.disabled = selectedCount === 0;
    }
    
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (selectAllCheckbox) {
        const totalCheckboxes = document.querySelectorAll('.document-select-checkbox').length;
        if (selectedCount === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else if (selectedCount === totalCheckboxes && totalCheckboxes > 0) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;
        }
    }
}

export function refreshTable() {
    renderDocumentsTable();
}

export function enableSelectionMode() {
    if (bulkDeleteState.enableSelectionMode) {
        bulkDeleteState.enableSelectionMode();
    }
    renderDocumentsTable();
}

export function disableSelectionMode() {
    if (bulkDeleteState.disableSelectionMode) {
        bulkDeleteState.disableSelectionMode();
    }
    renderDocumentsTable();
}

export function selectAllVisible() {
    const visibleIds = bulkDeleteState.currentFilteredIds || [];
    if (visibleIds.length === 0) return;
    
    if (bulkDeleteState.selectAllVisible) {
        bulkDeleteState.selectAllVisible(visibleIds);
    }
    
    const checkboxes = document.querySelectorAll('.document-select-checkbox');
    checkboxes.forEach(checkbox => {
        const docId = checkbox.getAttribute('data-document-id');
        if (bulkDeleteState.isSelected && bulkDeleteState.isSelected(docId)) {
            checkbox.checked = true;
            checkbox.closest('tr').classList.add('doc-row--selected');
        }
    });
    
    updateBulkSelectionUI();
}

export function deselectAll() {
    if (bulkDeleteState.deselectAll) {
        bulkDeleteState.deselectAll();
    }
    
    const checkboxes = document.querySelectorAll('.document-select-checkbox');
    checkboxes.forEach(checkbox => { checkbox.checked = false; });
    
    document.querySelectorAll('.doc-row--selected').forEach(row => {
        row.classList.remove('doc-row--selected');
    });
    
    updateBulkSelectionUI();
}

export function debugSelection() {
    console.group('🐛 DEBUG - Selección de documentos');
    const state = bulkDeleteState.getState ? bulkDeleteState.getState() : {};
    console.log('📊 Estado:', state);
    console.log('👁️ Elementos UI:');
    console.table({
        'Checkboxes en tabla': document.querySelectorAll('.document-select-checkbox').length,
        'Filas seleccionadas': document.querySelectorAll('.doc-row--selected').length,
        'Barra de selección visible': document.getElementById('selectionInfoBar')?.style.display !== 'none',
    });
    console.groupEnd();
    
    if (window.showAlert) {
        window.showAlert('Debug completado. Revisa la consola.', 'info');
    }
}

export function testSelection() {
    console.group('🧪 TEST - Selección múltiple');
    
    if (!bulkDeleteState.isSelectionMode) {
        enableSelectionMode();
    }
    
    const documents = window.appState?.documents || [];
    if (documents.length >= 3) {
        const testIds = documents.slice(0, 3).map(doc => doc._id || doc.id).filter(id => id);
        
        testIds.forEach(docId => {
            if (bulkDeleteState.addDocument) bulkDeleteState.addDocument(docId);
            const checkbox = document.querySelector(`.document-select-checkbox[data-document-id="${docId}"]`);
            const row = document.querySelector(`tr[data-document-id="${docId}"]`);
            if (checkbox) checkbox.checked = true;
            if (row) row.classList.add('doc-row--selected');
        });
        
        updateBulkSelectionUI();
        
        if (window.showAlert) {
            window.showAlert('Test: 3 documentos seleccionados', 'info');
        }
    }
    
    console.groupEnd();
}

export {
    bulkDeleteState,
    updateBulkSelectionUI
};