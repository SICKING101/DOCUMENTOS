// =============================================================================
// src/frontend/modules/documentos/core/bulkMoveManager.js
// Gestor de movimiento múltiple - Coordina selección y modal
// =============================================================================

import { bulkMoveState } from './BulkMoveState.js';
import { bulkMoveModal } from '../modals/bulkMoveModal.js';
import { renderDocumentsTable } from '../table/tableRenderer.js';

class BulkMoveManager {
    constructor() {
        this.isProcessing = false;
    }

    init() {
        console.log('🚀 Inicializando BulkMoveManager...');
        this.setupEventListeners();
        console.log('✅ BulkMoveManager inicializado');
    }

    setupEventListeners() {
        // Botón trigger "Mover Múltiple"
        const triggerBtn = document.getElementById('bulkMoveTriggerBtn');
        if (triggerBtn) {
            triggerBtn.addEventListener('click', () => this.openMoveModal());
            console.log('✅ Listener para botón Mover Múltiple configurado');
        }
    }

    /**
     * Activar modo selección para movimiento
     */
    enableMoveSelectionMode() {
        console.log('🎯 Activando modo selección para movimiento...');
        
        // Usar el mismo estado que bulk delete pero con propósitos de movimiento
        bulkMoveState.enableSelectionMode();
        
        // Re-renderizar tabla con checkboxes
        renderDocumentsTable();
        
        // Mostrar barra de acciones
        const bulkActions = document.getElementById('bulkMoveActionsContainer');
        const selectionBar = document.getElementById('selectionInfoBar');
        
        if (selectionBar) selectionBar.style.display = 'flex';
        if (bulkActions) bulkActions.style.display = 'flex';
        
        console.log('✅ Modo selección para movimiento activado');
    }

    /**
     * Desactivar modo selección
     */
    disableMoveSelectionMode() {
        bulkMoveState.disableSelectionMode();
        renderDocumentsTable();
        
        const selectionBar = document.getElementById('selectionInfoBar');
        const bulkActions = document.getElementById('bulkMoveActionsContainer');
        
        if (selectionBar) selectionBar.style.display = 'none';
        if (bulkActions) bulkActions.style.display = 'none';
    }

    /**
     * Abrir modal de movimiento
     */
    openMoveModal() {
        const selectedCount = bulkMoveState.getSelectedCount();
        
        if (selectedCount === 0) {
            // Si no hay documentos seleccionados, activar modo selección primero
            if (!bulkMoveState.isSelectionMode) {
                this.enableMoveSelectionMode();
            }
            
            return;
        }
        
        // Sincronizar selección con bulkDeleteState si es necesario
        if (window.bulkDeleteState) {
            const selectedIds = window.bulkDeleteState.getSelectedIds();
            selectedIds.forEach(id => bulkMoveState.addDocument(id));
        }
        
        bulkMoveModal.open();
    }

    /**
     * Seleccionar todos los documentos visibles
     */
    selectAllVisible() {
        const visibleIds = bulkMoveState.currentFilteredIds || [];
        if (visibleIds.length === 0) return;
        
        bulkMoveState.selectAllVisible(visibleIds);
        
        // Actualizar checkboxes visualmente
        document.querySelectorAll('.document-select-checkbox').forEach(checkbox => {
            const docId = checkbox.getAttribute('data-document-id');
            if (bulkMoveState.isSelected(docId)) {
                checkbox.checked = true;
                checkbox.closest('tr')?.classList.add('doc-row--selected');
            }
        });
        
        this.updateUI();
    }

    /**
     * Deseleccionar todos
     */
    deselectAll() {
        bulkMoveState.deselectAll();
        
        document.querySelectorAll('.document-select-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        document.querySelectorAll('.doc-row--selected').forEach(row => {
            row.classList.remove('doc-row--selected');
        });
        
        this.updateUI();
    }

    /**
     * Actualizar UI de selección
     */
    updateUI() {
        const selectedCount = bulkMoveState.getSelectedCount();
        
        // Actualizar badges
        const badges = document.querySelectorAll('.move-selected-count');
        badges.forEach(badge => {
            badge.textContent = selectedCount;
            badge.style.display = selectedCount > 0 ? 'inline-block' : 'none';
        });
        
        // Actualizar botón de mover
        const moveBtn = document.getElementById('bulkMoveActionBtn');
        if (moveBtn) {
            moveBtn.disabled = selectedCount === 0 || this.isProcessing;
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
    }
}

export const bulkMoveManager = new BulkMoveManager();

// Exponer globalmente
if (typeof window !== 'undefined') {
    window.bulkMoveManager = bulkMoveManager;
}