// =============================================================================
// src/frontend/modules/documentos/core/BulkMoveState.js
// Estado para movimiento múltiple de documentos
// =============================================================================

class BulkMoveStateManager {
    constructor() {
        this.selectedDocuments = new Set();
        this.totalDocuments = 0;
        this.currentFilteredIds = [];
        this.isSelectionMode = false;
        this.targetFolderId = null;
        this.targetFolderName = 'Raíz';
        
        console.log('✅ BulkMoveStateManager inicializado');
    }

    setTotalDocuments(total) {
        this.totalDocuments = total;
    }

    setFilteredIds(ids) {
        this.currentFilteredIds = ids || [];
    }

    addDocument(documentId) {
        if (documentId && !this.selectedDocuments.has(documentId)) {
            this.selectedDocuments.add(documentId);
        }
    }

    removeDocument(documentId) {
        if (documentId && this.selectedDocuments.has(documentId)) {
            this.selectedDocuments.delete(documentId);
        }
    }

    isSelected(documentId) {
        return this.selectedDocuments.has(documentId);
    }

    selectAllVisible(visibleIds) {
        if (!visibleIds || !Array.isArray(visibleIds)) return;
        visibleIds.forEach(id => { if (id) this.selectedDocuments.add(id); });
    }

    deselectAll() {
        this.selectedDocuments.clear();
    }

    getSelectedCount() {
        return this.selectedDocuments.size;
    }

    getSelectedIds() {
        return Array.from(this.selectedDocuments);
    }

    getState() {
        return {
            selectedCount: this.getSelectedCount(),
            totalDocuments: this.totalDocuments,
            filteredCount: this.currentFilteredIds.length,
            isSelectionMode: this.isSelectionMode,
            selectedIds: this.getSelectedIds(),
            targetFolderId: this.targetFolderId,
            targetFolderName: this.targetFolderName
        };
    }

    enableSelectionMode() {
        this.isSelectionMode = true;
    }

    disableSelectionMode() {
        this.isSelectionMode = false;
        this.deselectAll();
    }

    setTargetFolder(folderId, folderName) {
        this.targetFolderId = folderId;
        this.targetFolderName = folderName || 'Raíz';
    }

    clearTargetFolder() {
        this.targetFolderId = null;
        this.targetFolderName = 'Raíz';
    }

    clearSelection() {
        this.deselectAll();
    }

    clear() {
        this.selectedDocuments.clear();
        this.isSelectionMode = false;
        this.clearTargetFolder();
    }

    reset() {
        this.selectedDocuments.clear();
        this.totalDocuments = 0;
        this.currentFilteredIds = [];
        this.isSelectionMode = false;
        this.clearTargetFolder();
    }
}

const bulkMoveState = new BulkMoveStateManager();

export { bulkMoveState, BulkMoveStateManager };