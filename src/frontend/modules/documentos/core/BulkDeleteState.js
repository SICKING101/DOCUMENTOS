// =============================================================================
// src/frontend/modules/documentos/core/BulkDeleteState.js
// =============================================================================

/**
 * Gestor centralizado del estado de eliminación masiva.
 * Maneja la selección de documentos, filtros y operaciones en lote.
 */
class BulkDeleteStateManager {
    constructor() {
        // Inicializar propiedades
        this.selectedDocuments = new Set();  // IDs de documentos seleccionados
        this.totalDocuments = 0;             // Total de documentos en la tabla
        this.currentFilteredIds = [];        // IDs de documentos filtrados actualmente
        this.isSelectionMode = false;        // Si el modo selección está activado
        
        console.log('✅ BulkDeleteStateManager inicializado');
    }

    // =========================================================================
    // Métodos de gestión de documentos
    // =========================================================================

    /**
     * Establecer el total de documentos en la tabla
     * @param {number} total - Total de documentos
     */
    setTotalDocuments(total) {
        this.totalDocuments = total;
        console.log(`📊 Total documentos establecido: ${total}`);
    }

    /**
     * Establecer IDs de documentos filtrados
     * @param {Array} ids - IDs de documentos filtrados
     */
    setFilteredIds(ids) {
        this.currentFilteredIds = ids || [];
        console.log(`📋 IDs filtrados establecidos: ${this.currentFilteredIds.length}`);
    }

    // =========================================================================
    // Métodos de selección
    // =========================================================================

    /**
     * Agregar documento a la selección
     * @param {string} documentId - ID del documento
     */
    addDocument(documentId) {
        if (documentId && !this.selectedDocuments.has(documentId)) {
            this.selectedDocuments.add(documentId);
            console.log(`📝 Documento agregado a selección: ${documentId}`);
        }
    }

    /**
     * Remover documento de la selección
     * @param {string} documentId - ID del documento
     */
    removeDocument(documentId) {
        if (documentId && this.selectedDocuments.has(documentId)) {
            this.selectedDocuments.delete(documentId);
            console.log(`📝 Documento removido de selección: ${documentId}`);
        }
    }

    /**
     * Verificar si un documento está seleccionado
     * @param {string} documentId - ID del documento
     * @returns {boolean}
     */
    isSelected(documentId) {
        return this.selectedDocuments.has(documentId);
    }

    /**
     * Seleccionar todos los documentos visibles
     * @param {Array} visibleIds - IDs de documentos visibles
     */
    selectAllVisible(visibleIds) {
        if (!visibleIds || !Array.isArray(visibleIds)) {
            console.warn('⚠️ No hay IDs visibles para seleccionar');
            return;
        }

        visibleIds.forEach(id => {
            if (id) this.selectedDocuments.add(id);
        });

        console.log(`✅ ${visibleIds.length} documentos seleccionados`);
    }

    /**
     * Deseleccionar todos los documentos
     */
    deselectAll() {
        const count = this.selectedDocuments.size;
        this.selectedDocuments.clear();
        console.log(`✅ ${count} documentos deseleccionados`);
    }

    // =========================================================================
    // Métodos de obtención de información
    // =========================================================================

    /**
     * Obtener cantidad de documentos seleccionados
     * @returns {number}
     */
    getSelectedCount() {
        return this.selectedDocuments.size;
    }

    /**
     * Obtener IDs de documentos seleccionados
     * @returns {Array}
     */
    getSelectedIds() {
        return Array.from(this.selectedDocuments);
    }

    /**
     * Obtener estado completo
     * @returns {Object}
     */
    getState() {
        return {
            selectedCount: this.getSelectedCount(),
            totalDocuments: this.totalDocuments,
            filteredCount: this.currentFilteredIds.length,
            isSelectionMode: this.isSelectionMode,
            selectedIds: this.getSelectedIds()
        };
    }

    /**
     * Obtener estadísticas para mostrar
     * @returns {Object}
     */
    getStats() {
        return {
            seleccionados: this.getSelectedCount(),
            total: this.totalDocuments,
            filtrados: this.currentFilteredIds.length,
            modoSeleccion: this.isSelectionMode ? 'Activado' : 'Desactivado'
        };
    }

    // =========================================================================
    // Métodos de gestión de modo
    // =========================================================================

    /**
     * Activar modo selección
     */
    enableSelectionMode() {
        this.isSelectionMode = true;
        console.log('🎯 Modo selección activado');
    }

    /**
     * Desactivar modo selección
     */
    disableSelectionMode() {
        this.isSelectionMode = false;
        this.deselectAll();
        console.log('🎯 Modo selección desactivado');
    }

    /**
     * Alternar modo selección
     */
    toggleSelectionMode() {
        this.isSelectionMode = !this.isSelectionMode;
        
        if (!this.isSelectionMode) {
            this.deselectAll();
        }
        
        console.log(`🎯 Modo selección ${this.isSelectionMode ? 'activado' : 'desactivado'}`);
        return this.isSelectionMode;
    }

    // =========================================================================
    // Métodos de limpieza y reinicio
    // =========================================================================

    /**
     * Limpiar selección (pero mantener modo)
     */
    clearSelection() {
        this.deselectAll();
        console.log('🧹 Selección limpiada');
    }

    /**
     * Limpiar completamente (selección y modo)
     */
    clear() {
        this.selectedDocuments.clear();
        this.isSelectionMode = false;
        console.log('🧹 Estado completamente limpiado');
    }

    /**
     * Resetear a valores iniciales
     */
    reset() {
        this.selectedDocuments.clear();
        this.totalDocuments = 0;
        this.currentFilteredIds = [];
        this.isSelectionMode = false;
        console.log('🔄 Estado reseteado a valores iniciales');
    }
}

// Crear instancia única
const bulkDeleteState = new BulkDeleteStateManager();

// Exportar instancia y clase
export {
    bulkDeleteState,
    BulkDeleteStateManager
};

// =============================================================================
// Inicialización y debugging
// =============================================================================

/**
 * Verificar estado inicial
 */
console.log('🔍 BulkDeleteState verificado:', {
    instance: bulkDeleteState ? '✅ Creada' : '❌ No creada',
    methods: {
        setTotalDocuments: typeof bulkDeleteState.setTotalDocuments === 'function',
        setFilteredIds: typeof bulkDeleteState.setFilteredIds === 'function',
        addDocument: typeof bulkDeleteState.addDocument === 'function',
        getSelectedCount: typeof bulkDeleteState.getSelectedCount === 'function'
    }
});