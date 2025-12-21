// =============================================================================
// src/frontend/modules/documentos/table/tableRenderer.js
// =============================================================================

import { DOM } from '../../../dom.js';
import { formatFileSize, formatDate, getFileIcon } from '../../../utils.js';
import { canPreviewDocument } from '../preview/previewManager.js';
import { downloadDocument } from '../download/downloadManager.js';
import { bulkDeleteState } from '../core/BulkDeleteState.js';

/**
 * Renderiza la tabla de documentos con filtros y búsqueda aplicados.
 * Muestra estado, acciones y formatos los datos apropiadamente.
 * Ahora incluye soporte para selección múltiple.
 */
export function renderDocumentsTable() {
    console.log('🔄 Renderizando tabla de documentos...');
    
    if (!DOM.documentosTableBody) {
        console.error('❌ DOM.documentosTableBody no encontrado');
        return;
    }
    
    DOM.documentosTableBody.innerHTML = '';
    
    let documentsToShow = window.appState.documents || [];
    console.log(`📊 Documentos totales: ${documentsToShow.length}`);
    
    // Actualizar estado con total de documentos
    if (bulkDeleteState.setTotalDocuments) {
        bulkDeleteState.setTotalDocuments(documentsToShow.length);
    }
    
    // Aplicar búsqueda si existe
    if (window.appState.currentSearchQuery) {
        const query = window.appState.currentSearchQuery.toLowerCase();
        const initialCount = documentsToShow.length;
        
        documentsToShow = documentsToShow.filter(doc => 
            doc.nombre_original.toLowerCase().includes(query) ||
            (doc.descripcion && doc.descripcion.toLowerCase().includes(query)) ||
            doc.categoria.toLowerCase().includes(query)
        );
        
        console.log(`🔍 Búsqueda "${query}": ${initialCount} → ${documentsToShow.length} documentos`);
    }
    
    // Aplicar filtros
    if (window.appState.filters?.category) {
        const initialCount = documentsToShow.length;
        documentsToShow = documentsToShow.filter(doc => doc.categoria === window.appState.filters.category);
        console.log(`🎯 Filtro categoría "${window.appState.filters.category}": ${initialCount} → ${documentsToShow.length}`);
    }
    
    if (window.appState.filters?.type) {
        const initialCount = documentsToShow.length;
        documentsToShow = documentsToShow.filter(doc => doc.tipo_archivo.toLowerCase() === window.appState.filters.type.toLowerCase());
        console.log(`🎯 Filtro tipo "${window.appState.filters.type}": ${initialCount} → ${documentsToShow.length}`);
    }
    
    if (window.appState.filters?.status) {
        const initialCount = documentsToShow.length;
        const now = new Date();
        
        documentsToShow = documentsToShow.filter(doc => {
            if (!doc.fecha_vencimiento) return window.appState.filters.status === 'active';
            
            const fechaVencimiento = new Date(doc.fecha_vencimiento);
            const diferenciaDias = Math.ceil((fechaVencimiento - now) / (1000 * 60 * 60 * 24));
            
            switch(window.appState.filters.status) {
                case 'active':
                    return diferenciaDias > 7;
                case 'expiring':
                    return diferenciaDias <= 7 && diferenciaDias > 0;
                case 'expired':
                    return diferenciaDias <= 0;
                default:
                    return true;
            }
        });
        
        console.log(`🎯 Filtro estado "${window.appState.filters.status}": ${initialCount} → ${documentsToShow.length}`);
    }
    
    // Guardar IDs filtrados para selección múltiple
    const filteredIds = documentsToShow.map(doc => doc._id || doc.id).filter(id => id);
    if (bulkDeleteState.setFilteredIds) {
        bulkDeleteState.setFilteredIds(filteredIds);
    }
    
    // Manejar estado vacío
    if (documentsToShow.length === 0) {
        console.log('📭 No hay documentos para mostrar');
        
        const emptyMessage = window.appState.currentSearchQuery || 
                           window.appState.filters?.category || 
                           window.appState.filters?.type || 
                           window.appState.filters?.status 
            ? 'No hay documentos que coincidan con la búsqueda o filtros aplicados' 
            : 'Sube tu primer documento para comenzar';
        
        // Calcular columnas correctamente
        const numColumns = bulkDeleteState.isSelectionMode ? 7 : 6;
        
        DOM.documentosTableBody.innerHTML = `
            <tr>
                <td colspan="${numColumns}" class="empty-state">
                    <div class="empty-state__container">
                        <i class="fas fa-file-alt empty-state__icon"></i>
                        <h3 class="empty-state__title">No hay documentos</h3>
                        <p class="empty-state__description">${emptyMessage}</p>
                    </div>
                </td>
            </tr>
        `;
        
        // Si no hay documentos, limpiar selección
        if (bulkDeleteState.clearSelection) {
            bulkDeleteState.clearSelection();
        }
        updateBulkSelectionUI();
        
        return;
    }
    
    console.log(`✅ Mostrando ${documentsToShow.length} documentos`);
    
    // Renderizar cada documento
    documentsToShow.forEach(doc => {
        const row = createDocumentRow(doc);
        if (row) {
            DOM.documentosTableBody.appendChild(row);
        }
    });
    
    // Actualizar UI de selección múltiple
    updateBulkSelectionUI();
    
    // Configurar event listeners para checkboxes si está en modo selección
    if (bulkDeleteState.isSelectionMode) {
        setTimeout(() => {
            setupCheckboxEventListeners();
        }, 50);
    }
    
    console.log('✅ Tabla renderizada correctamente');
}

/**
 * CREAR FILA DE DOCUMENTO
 */
function createDocumentRow(doc) {
    if (!doc || (!doc._id && !doc.id)) {
        console.warn('⚠️ Documento inválido:', doc);
        return null;
    }
    
    const person = doc.persona_id ? doc.persona_id : { nombre: 'No asignado' };
    
    // Determinar estado de vencimiento
    const { vencimientoClass, vencimientoText, statusBadgeClass } = getDocumentStatus(doc);
    
    // Determinar si se puede previsualizar
    const fileExtension = doc.nombre_original?.split('.').pop().toLowerCase() || 'file';
    const previewInfo = canPreviewDocument(fileExtension);
    const fileIcon = getFileIcon(doc.tipo_archivo || 'file');
    
    // Crear botones de acciones
    const actionButtons = createActionButtons(doc, previewInfo.canPreview);
    
    // Crear tooltips
    const nameTooltip = doc.nombre_original && doc.nombre_original.length > 40 ? `title="${doc.nombre_original}"` : '';
    const descTooltip = doc.descripcion && doc.descripcion.length > 40 ? `title="${doc.descripcion}"` : '';
    const statusTooltip = vencimientoText && vencimientoText.length > 15 ? `title="${vencimientoText}"` : '';
    const personTooltip = person.nombre && person.nombre.length > 20 ? `title="${person.nombre}"` : '';
    const categoryTooltip = doc.categoria && doc.categoria.length > 15 ? `title="${doc.categoria}"` : '';
    
    // Determinar si la fila está seleccionada
    const docId = doc._id || doc.id;
    const isSelected = bulkDeleteState.isSelected ? bulkDeleteState.isSelected(docId) : false;
    const rowClass = `table__row ${isSelected ? 'document-row--selected' : ''}`;
    
    const row = document.createElement('tr');
    row.className = rowClass;
    row.setAttribute('data-document-id', docId);
    
    // Crear HTML de la fila
    let rowHTML = '';
    
    // Columna de selección (solo en modo selección)
    if (bulkDeleteState.isSelectionMode) {
        rowHTML += `
            <td class="table__cell table__cell--select">
                <div class="checkbox-wrapper">
                    <input type="checkbox" 
                           class="document-select-checkbox"
                           data-document-id="${docId}"
                           ${isSelected ? 'checked' : ''}
                           aria-label="Seleccionar documento">
                </div>
            </td>
        `;
    }
    
    // Resto de las columnas
    rowHTML += `
        <td class="table__cell">
            <div class="documents__info documents__info--inline">
                <div class="documents__icon documents__icon--sm">
                    <i class="fas fa-file-${fileIcon}"></i>
                </div>
                <div>
                    <div class="documents__details-name" ${nameTooltip}>
                        ${doc.nombre_original || 'Documento sin nombre'}
                    </div>
                    ${doc.descripcion ? `<div class="documents__details-description" ${descTooltip}>${doc.descripcion}</div>` : ''}
                </div>
            </div>
        </td>
        <td class="table__cell">
            <span class="badge badge--info">${(doc.tipo_archivo || 'file').toUpperCase()}</span>
        </td>
        <td class="table__cell" ${personTooltip}>
            ${person.nombre || 'No asignado'}
        </td>
        <td class="table__cell">
            <span class="badge badge--info" ${categoryTooltip}>${doc.categoria || 'General'}</span>
        </td>
        <td class="table__cell">
            <span class="badge ${statusBadgeClass} document-status ${vencimientoClass}" ${statusTooltip}>
                ${vencimientoText}
            </span>
        </td>
        <td class="table__cell table__cell--actions">
            <div class="action-buttons">
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
    let vencimientoClass = '';
    let vencimientoText = '';
    let statusBadgeClass = 'badge--info';
    
    if (doc.fecha_vencimiento) {
        try {
            const fechaVencimiento = new Date(doc.fecha_vencimiento);
            const hoy = new Date();
            const diferenciaDias = Math.ceil((fechaVencimiento - hoy) / (1000 * 60 * 60 * 24));
            
            if (diferenciaDias <= 0) {
                vencimientoClass = 'vencido';
                vencimientoText = 'Vencido';
                statusBadgeClass = 'badge--danger';
            } else if (diferenciaDias <= 7) {
                vencimientoClass = 'por-vencer';
                vencimientoText = `Vence en ${diferenciaDias} días`;
                statusBadgeClass = 'badge--warning';
            } else if (diferenciaDias <= 30) {
                vencimientoClass = 'activo';
                vencimientoText = `Vence en ${diferenciaDias} días`;
                statusBadgeClass = 'badge--info';
            } else {
                vencimientoClass = 'activo';
                vencimientoText = 'Activo';
                statusBadgeClass = 'badge--info';
            }
        } catch (error) {
            console.error('❌ Error calculando estado del documento:', error);
            vencimientoClass = 'sin-vencimiento';
            vencimientoText = 'Fecha inválida';
            statusBadgeClass = 'badge--info';
        }
    } else {
        vencimientoClass = 'sin-vencimiento';
        vencimientoText = 'Sin vencimiento';
        statusBadgeClass = 'badge--info';
    }
    
    return { vencimientoClass, vencimientoText, statusBadgeClass };
}

/**
 * CREAR BOTONES DE ACCIONES
 */
function createActionButtons(doc, canPreview) {
    const docId = doc._id || doc.id;
    if (!docId) return '';
    
    let buttons = `
        <button class="btn btn--sm btn--outline btn--download" 
                onclick="if (window.downloadDocument) window.downloadDocument('${docId}')" 
                title="Descargar">
            <i class="fas fa-download"></i>
        </button>
    `;
    
    // Solo agregar botón de vista previa si se puede previsualizar
    if (canPreview) {
        buttons += `
            <button class="btn btn--sm btn--outline btn--view" 
                    onclick="if (window.previewDocument) window.previewDocument('${docId}')" 
                    title="Vista previa">
                <i class="fas fa-eye"></i>
            </button>
        `;
    }

    // Agregar botón de editar
    buttons += `
        <button class="btn btn--sm btn--outline btn--edit" 
                onclick="if (window.editDocument) window.editDocument('${docId}')" 
                title="Editar documento">
            <i class="fas fa-edit"></i>
        </button>
    `;
    
    // Siempre agregar botón de eliminar individual
    buttons += `
        <button class="btn btn--sm btn--outline btn--delete" 
                onclick="if (window.deleteDocument) window.deleteDocument('${docId}')" 
                title="Eliminar">
            <i class="fas fa-trash"></i>
        </button>
    `;
    
    return buttons;
}

/**
 * CONFIGURAR EVENT LISTENERS PARA CHECKBOXES
 */
function setupCheckboxEventListeners() {
    const checkboxes = document.querySelectorAll('.document-select-checkbox');
    
    console.log(`🎯 Configurando ${checkboxes.length} checkboxes`);
    
    checkboxes.forEach(checkbox => {
        // Remover listeners anteriores para evitar duplicados
        checkbox.replaceWith(checkbox.cloneNode(true));
    });
    
    // Re-seleccionar checkboxes después de clonar
    const newCheckboxes = document.querySelectorAll('.document-select-checkbox');
    
    newCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function(e) {
            const documentId = this.getAttribute('data-document-id');
            const isChecked = this.checked;
            
            console.log(`📝 Checkbox cambio: ${documentId} = ${isChecked ? 'checked' : 'unchecked'}`);
            
            // Actualizar estado
            if (isChecked) {
                if (bulkDeleteState.addDocument) {
                    bulkDeleteState.addDocument(documentId);
                }
                this.closest('tr').classList.add('document-row--selected');
            } else {
                if (bulkDeleteState.removeDocument) {
                    bulkDeleteState.removeDocument(documentId);
                }
                this.closest('tr').classList.remove('document-row--selected');
            }
            
            // Actualizar UI
            updateBulkSelectionUI();
        });
    });
}

/**
 * ACTUALIZAR UI DE SELECCIÓN MÚLTIPLE
 */
function updateBulkSelectionUI() {
    console.log('🔄 Actualizando UI de selección múltiple');
    
    const selectedCount = bulkDeleteState.getSelectedCount ? bulkDeleteState.getSelectedCount() : 0;
    
    // Actualizar contadores
    const badge = document.getElementById('selectedCountBadge');
    const text = document.getElementById('selectedCountText');
    const modalCount = document.getElementById('bulkDeleteCount');
    
    if (badge) {
        badge.textContent = selectedCount;
        badge.style.display = selectedCount > 0 ? 'inline-block' : 'none';
    }
    
    if (text) {
        text.textContent = selectedCount;
    }
    
    if (modalCount) {
        modalCount.textContent = selectedCount;
    }
    
    // Mostrar/ocultar barra de información y botones
    const selectionBar = document.getElementById('selectionInfoBar');
    const bulkActions = document.getElementById('bulkActionsContainer');
    
    if (selectionBar) {
        selectionBar.style.display = bulkDeleteState.isSelectionMode ? 'block' : 'none';
    }
    
    if (bulkActions) {
        bulkActions.style.display = selectedCount > 0 ? 'flex' : 'none';
    }
    
    // Actualizar botón de eliminación masiva
    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
    if (bulkDeleteBtn) {
        bulkDeleteBtn.disabled = selectedCount === 0;
    }
    
    // Actualizar checkbox "seleccionar todos"
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
    
    console.log(`✅ UI actualizada: ${selectedCount} seleccionados, modo: ${bulkDeleteState.isSelectionMode}`);
}

/**
 * REFRESCAR TABLA CON ESTADO ACTUAL
 */
export function refreshTable() {
    console.log('🔄 Refrescando tabla...');
    renderDocumentsTable();
}

/**
 * ACTIVAR MODO SELECCIÓN
 */
export function enableSelectionMode() {
    console.log('🎯 Activando modo selección desde tableRenderer');
    if (bulkDeleteState.enableSelectionMode) {
        bulkDeleteState.enableSelectionMode();
    }
    renderDocumentsTable();
}

/**
 * DESACTIVAR MODO SELECCIÓN
 */
export function disableSelectionMode() {
    console.log('🎯 Desactivando modo selección desde tableRenderer');
    if (bulkDeleteState.disableSelectionMode) {
        bulkDeleteState.disableSelectionMode();
    }
    renderDocumentsTable();
}

/**
 * SELECCIONAR TODOS LOS DOCUMENTOS VISIBLES
 */
export function selectAllVisible() {
    console.log('📋 Seleccionando todos los documentos visibles');
    
    const visibleIds = bulkDeleteState.currentFilteredIds || [];
    
    if (visibleIds.length === 0) {
        console.warn('⚠️ No hay documentos visibles para seleccionar');
        return;
    }
    
    if (bulkDeleteState.selectAllVisible) {
        bulkDeleteState.selectAllVisible(visibleIds);
    }
    
    // Marcar checkboxes visualmente
    const checkboxes = document.querySelectorAll('.document-select-checkbox');
    checkboxes.forEach(checkbox => {
        const docId = checkbox.getAttribute('data-document-id');
        if (bulkDeleteState.isSelected && bulkDeleteState.isSelected(docId)) {
            checkbox.checked = true;
            checkbox.closest('tr').classList.add('document-row--selected');
        }
    });
    
    updateBulkSelectionUI();
    console.log(`✅ ${visibleIds.length} documentos seleccionados`);
}

/**
 * DESELECCIONAR TODOS LOS DOCUMENTOS
 */
export function deselectAll() {
    console.log('📋 Deseleccionando todos los documentos');
    
    if (bulkDeleteState.deselectAll) {
        bulkDeleteState.deselectAll();
    }
    
    // Desmarcar checkboxes visualmente
    const checkboxes = document.querySelectorAll('.document-select-checkbox');
    const selectedRows = document.querySelectorAll('.document-row--selected');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    
    selectedRows.forEach(row => {
        row.classList.remove('document-row--selected');
    });
    
    updateBulkSelectionUI();
    console.log('✅ Todos los documentos deseleccionados');
}

/**
 * DEBUG: MOSTRAR ESTADO DE SELECCIÓN
 */
export function debugSelection() {
    console.group('🐛 DEBUG - Selección de documentos');
    
    const state = bulkDeleteState.getState ? bulkDeleteState.getState() : {};
    console.log('📊 Estado:', state);
    
    console.log('👁️ Elementos UI:');
    console.table({
        'Checkboxes en tabla': document.querySelectorAll('.document-select-checkbox').length,
        'Filas seleccionadas': document.querySelectorAll('.document-row--selected').length,
        'Barra de selección visible': document.getElementById('selectionInfoBar')?.style.display !== 'none',
        'Botones masivos visibles': document.getElementById('bulkActionsContainer')?.style.display !== 'none'
    });
    
    console.log('📋 Documentos en appState:', window.appState?.documents?.length || 0);
    
    if (window.appState?.documents) {
        console.log('🔍 Primeros 5 documentos:');
        window.appState.documents.slice(0, 5).forEach((doc, index) => {
            const docId = doc._id || doc.id;
            const isSelected = bulkDeleteState.isSelected ? bulkDeleteState.isSelected(docId) : false;
            console.log(`${index + 1}. ${doc.nombre_original} (ID: ${docId}) - Seleccionado: ${isSelected}`);
        });
    }
    
    console.groupEnd();
    
    // Mostrar alerta para el usuario
    if (window.showAlert) {
        window.showAlert('Debug completado. Revisa la consola.', 'info');
    }
}

/**
 * TEST: SIMULAR SELECCIÓN DE DOCUMENTOS
 */
export function testSelection() {
    console.group('🧪 TEST - Selección múltiple');
    
    // Activar modo selección si no está activo
    if (!bulkDeleteState.isSelectionMode) {
        enableSelectionMode();
        console.log('✅ Modo selección activado para test');
    }
    
    // Obtener primeros 3 documentos
    const documents = window.appState?.documents || [];
    if (documents.length >= 3) {
        const testIds = documents.slice(0, 3)
            .map(doc => doc._id || doc.id)
            .filter(id => id);
        
        console.log('🎯 IDs de prueba:', testIds);
        
        // Seleccionar documentos
        testIds.forEach(docId => {
            if (bulkDeleteState.addDocument) {
                bulkDeleteState.addDocument(docId);
            }
            
            // Marcar visualmente
            const checkbox = document.querySelector(`.document-select-checkbox[data-document-id="${docId}"]`);
            const row = document.querySelector(`tr[data-document-id="${docId}"]`);
            
            if (checkbox) {
                checkbox.checked = true;
            }
            
            if (row) {
                row.classList.add('document-row--selected');
            }
        });
        
        // Actualizar UI
        updateBulkSelectionUI();
        
        console.log('✅ Test configurado: 3 documentos seleccionados');
        
        if (window.showAlert) {
            window.showAlert('Test configurado: 3 documentos seleccionados. Usa el botón de eliminación masiva.', 'info');
        }
    } else {
        console.warn('⚠️ No hay suficientes documentos para el test');
        
        if (window.showAlert) {
            window.showAlert('Necesitas al menos 3 documentos para probar la selección múltiple', 'warning');
        }
    }
    
    console.groupEnd();
}

// Exportar funciones de selección
export {
    bulkDeleteState,
    updateBulkSelectionUI
};