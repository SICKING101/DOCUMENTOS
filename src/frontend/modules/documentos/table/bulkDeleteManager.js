// =============================================================================
// src/frontend/modules/documentos/table/bulkDeleteManager.js
// =============================================================================

import { api } from '../../../services/api.js';
import { showAlert } from '../../../utils.js';
import { updateTrashBadge } from '../../papelera.js';
import { bulkDeleteState } from '../core/BulkDeleteState.js';
import { bulkDeleteModal } from '../modals/bulkDeleteModal.js';
import { refreshTable } from './tableRenderer.js';

/**
 * GESTOR PRINCIPAL DE ELIMINACIÓN MÚLTIPLE
 * Coordina la eliminación masiva de documentos
 */
class BulkDeleteManager {
    constructor() {
        this.isProcessing = false;
        this.debugMode = true;
    }

    /**
     * INICIALIZAR MÓDULO
     */
    init() {
        console.log('🚀 Inicializando BulkDeleteManager...');
        
        this.setupEventListeners();
        this.updateUI();
        
        // Agregar funciones globales para debugging
        window.bulkDeleteManager = this;
        
        console.log('✅ BulkDeleteManager inicializado');
    }

    /**
     * CONFIGURAR EVENT LISTENERS
     */
    setupEventListeners() {
        console.log('🔧 Configurando event listeners...');
        
        // Delegación de eventos para mejor performance
        document.addEventListener('click', (e) => {
            // Botón para activar/desactivar modo selección
            if (e.target.closest('#toggleSelectModeBtn')) {
                this.toggleSelectionMode();
                return;
            }
            
            // Botón de seleccionar todos
            if (e.target.closest('#selectAllBtn')) {
                this.selectAllVisible();
                return;
            }
            
            // Botón de deseleccionar todos
            if (e.target.closest('#deselectAllBtn')) {
                this.deselectAll();
                return;
            }
            
            // Botón de eliminación masiva
            if (e.target.closest('#bulkDeleteBtn')) {
                this.showBulkDeleteModal();
                return;
            }
            
            // Botón de cancelar selección
            if (e.target.closest('#cancelBulkSelectionBtn')) {
                this.cancelSelectionMode();
                return;
            }
            
            // Botón de confirmar eliminación masiva
            if (e.target.closest('#confirmBulkDeleteBtn')) {
                this.confirmBulkDelete();
                return;
            }
        });

        // Evento para checkbox "seleccionar todos"
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.selectAllVisible();
                } else {
                    this.deselectAll();
                }
            });
            console.log('✅ Listener para selectAllCheckbox configurado');
        }

        // Evento para checkbox de confirmación en modal
        const confirmCheckbox = document.getElementById('confirmBulkDeleteCheckbox');
        if (confirmCheckbox) {
            confirmCheckbox.addEventListener('change', (e) => {
                const confirmBtn = document.getElementById('confirmBulkDeleteBtn');
                if (confirmBtn) {
                    confirmBtn.disabled = !e.target.checked;
                    console.log('🔘 Checkbox de confirmación:', e.target.checked);
                }
            });
            console.log('✅ Listener para confirmBulkDeleteCheckbox configurado');
        }

        console.log('🎯 Todos los event listeners configurados');
    }

    /**
     * TOGGLE MODO SELECCIÓN
     */
    toggleSelectionMode() {
        console.group('🔄 TOGGLE MODO SELECCIÓN');
        
        const newMode = bulkDeleteState.toggleSelectionMode();
        
        if (newMode) {
            this.enableSelectionMode();
        } else {
            this.disableSelectionMode();
        }
        
        this.updateUI();
        
        console.log(`✅ Modo selección ${newMode ? 'activado' : 'desactivado'}`);
        console.groupEnd();
    }

    /**
     * ACTIVAR MODO SELECCIÓN
     */
    enableSelectionMode() {
        console.log('🎯 Activando modo selección...');
        
        // Mostrar elementos UI
        const selectionBar = document.getElementById('selectionInfoBar');
        const bulkActions = document.getElementById('bulkActionsContainer');
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        const toggleBtn = document.getElementById('toggleSelectModeBtn');
        
        if (selectionBar) selectionBar.style.display = 'block';
        if (bulkActions) bulkActions.style.display = 'flex';
        if (selectAllCheckbox) selectAllCheckbox.style.display = 'block';
        
        if (toggleBtn) {
            toggleBtn.innerHTML = '<i class="fas fa-check-square"></i><span>Salir Modo Selección</span>';
            toggleBtn.classList.add('btn--primary');
        }
        
        // Forzar re-render de la tabla para mostrar checkboxes
        if (typeof refreshTable === 'function') {
            refreshTable();
        }
        
        console.log('✅ Modo selección activado');
    }

    /**
     * DESACTIVAR MODO SELECCIÓN
     */
    disableSelectionMode() {
        console.log('🎯 Desactivando modo selección...');
        
        // Limpiar selección primero
        this.deselectAll();
        
        // Ocultar elementos UI
        const selectionBar = document.getElementById('selectionInfoBar');
        const bulkActions = document.getElementById('bulkActionsContainer');
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        const toggleBtn = document.getElementById('toggleSelectModeBtn');
        
        if (selectionBar) selectionBar.style.display = 'none';
        if (bulkActions) bulkActions.style.display = 'none';
        if (selectAllCheckbox) selectAllCheckbox.style.display = 'none';
        
        if (toggleBtn) {
            toggleBtn.innerHTML = '<i class="far fa-square"></i><span>Modo Selección</span>';
            toggleBtn.classList.remove('btn--primary');
        }
        
        // Forzar re-render de la tabla para quitar checkboxes
        if (typeof refreshTable === 'function') {
            refreshTable();
        }
        
        console.log('✅ Modo selección desactivado');
    }

    /**
     * CANCELAR MODO SELECCIÓN
     */
    cancelSelectionMode() {
        console.log('❌ Cancelando modo selección...');
        this.disableSelectionMode();
        bulkDeleteState.isSelectionMode = false;
    }

    /**
     * SELECCIONAR TODOS LOS DOCUMENTOS VISIBLES
     */
    selectAllVisible() {
        console.group('📋 SELECCIONAR TODOS VISIBLES');
        
        const visibleIds = bulkDeleteState.currentFilteredIds;
        
        if (visibleIds.length === 0) {
            console.warn('⚠️ No hay documentos visibles para seleccionar');
            showAlert('No hay documentos visibles para seleccionar', 'warning');
            console.groupEnd();
            return;
        }
        
        console.log(`🎯 Seleccionando ${visibleIds.length} documentos visibles`);
        
        bulkDeleteState.selectAllVisible(visibleIds);
        
        // Marcar checkboxes visualmente
        visibleIds.forEach(docId => {
            const checkbox = document.querySelector(`.document-select-checkbox[data-document-id="${docId}"]`);
            const row = document.querySelector(`tr[data-document-id="${docId}"]`);
            
            if (checkbox) {
                checkbox.checked = true;
            }
            
            if (row) {
                row.classList.add('document-row--selected');
            }
        });
        
        this.updateUI();
        
        console.log(`✅ ${visibleIds.length} documentos seleccionados`);
        showAlert(`${visibleIds.length} documentos seleccionados`, 'success');
        console.groupEnd();
    }

    /**
     * DESELECCIONAR TODOS LOS DOCUMENTOS
     */
    deselectAll() {
        console.group('📋 DESELECCIONAR TODOS');
        
        bulkDeleteState.deselectAll();
        
        // Desmarcar checkboxes visualmente
        const checkboxes = document.querySelectorAll('.document-select-checkbox');
        const selectedRows = document.querySelectorAll('.document-row--selected');
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        
        selectedRows.forEach(row => {
            row.classList.remove('document-row--selected');
        });
        
        this.updateUI();
        
        console.log('✅ Todos los documentos deseleccionados');
        console.groupEnd();
    }

    /**
     * ACTUALIZAR INTERFAZ DE USUARIO
     */
    updateUI() {
        const selectedCount = bulkDeleteState.getSelectedCount();
        
        if (this.debugMode) {
            console.log('🔄 Actualizando UI:', {
                seleccionados: selectedCount,
                modoSelección: bulkDeleteState.isSelectionMode,
                selectAll: bulkDeleteState.selectAllChecked
            });
        }
        
        // Actualizar contadores
        const elementsToUpdate = [
            { id: 'selectedCountBadge', text: selectedCount },
            { id: 'selectedCountText', text: selectedCount },
            { id: 'bulkDeleteCount', text: selectedCount }
        ];
        
        elementsToUpdate.forEach(({ id, text }) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = text;
                
                // Manejar visibilidad del badge
                if (id === 'selectedCountBadge') {
                    element.style.display = selectedCount > 0 ? 'inline-block' : 'none';
                }
            }
        });
        
        // Actualizar botones
        const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
        if (bulkDeleteBtn) {
            bulkDeleteBtn.disabled = selectedCount === 0 || this.isProcessing;
        }
        
        const selectAllBtn = document.getElementById('selectAllBtn');
        if (selectAllBtn) {
            const totalCheckboxes = document.querySelectorAll('.document-select-checkbox').length;
            selectAllBtn.disabled = totalCheckboxes === 0;
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
        
        console.log('✅ UI actualizada');
    }

    /**
     * MOSTRAR MODAL DE ELIMINACIÓN MASIVA
     */
    showBulkDeleteModal() {
        const selectedCount = bulkDeleteState.getSelectedCount();
        
        if (selectedCount === 0) {
            showAlert('No hay documentos seleccionados', 'warning');
            return;
        }
        
        console.group(`📋 MOSTRAR MODAL PARA ${selectedCount} DOCUMENTOS`);
        
        try {
            // Obtener información de documentos seleccionados
            const selectedDocs = this.getSelectedDocumentsInfo();
            
            // Mostrar modal
            bulkDeleteModal.show(selectedCount, selectedDocs);
            
            console.log(`✅ Modal mostrado para ${selectedCount} documentos`);
        } catch (error) {
            console.error('❌ Error mostrando modal:', error);
            showAlert('Error al mostrar el modal de confirmación', 'error');
        }
        
        console.groupEnd();
    }

    /**
     * OBTENER INFORMACIÓN DE DOCUMENTOS SELECCIONADOS
     */
    getSelectedDocumentsInfo() {
        const selectedIds = bulkDeleteState.getSelectedIds();
        const documents = window.appState?.documents || [];
        
        return selectedIds.map(docId => {
            const doc = documents.find(d => (d._id || d.id) === docId);
            return doc || { 
                _id: docId, 
                nombre_original: `Documento ${docId}`,
                tipo_archivo: 'Desconocido',
                categoria: 'Sin categoría'
            };
        });
    }

    /**
     * CONFIRMAR ELIMINACIÓN MASIVA
     */
    async confirmBulkDelete() {
        const selectedCount = bulkDeleteState.getSelectedCount();
        
        if (selectedCount === 0) {
            showAlert('No hay documentos seleccionados', 'warning');
            return;
        }
        
        // Verificar confirmación
        const confirmCheckbox = document.getElementById('confirmBulkDeleteCheckbox');
        if (!confirmCheckbox?.checked) {
            showAlert('Debes confirmar la acción marcando la casilla', 'warning');
            return;
        }
        
        const documentIds = bulkDeleteState.getSelectedIds();
        
        console.group('🗑️ CONFIRMACIÓN DE ELIMINACIÓN MASIVA');
        console.log('📋 IDs a eliminar:', documentIds);
        console.log('📊 Cantidad:', selectedCount);
        
        // Ocultar modal
        bulkDeleteModal.hide();
        
        // Confirmación final
        if (!confirm(`¿Estás seguro de mover ${selectedCount} documentos a la papelera?`)) {
            console.log('⚠️ Usuario canceló la eliminación');
            console.groupEnd();
            return;
        }
        
        this.isProcessing = true;
        this.updateUI();
        
        try {
            showLoading(`Moviendo ${selectedCount} documentos a la papelera...`);
            
            // Ejecutar eliminación
            await this.performBulkDelete(documentIds);
            
        } catch (error) {
            console.error('❌ Error crítico:', error);
            showAlert('Error crítico al mover documentos a la papelera', 'error');
        } finally {
            this.isProcessing = false;
            this.updateUI();
            hideLoading();
            console.groupEnd();
        }
    }

    /**
     * EJECUTAR ELIMINACIÓN MASIVA
     */
    async performBulkDelete(documentIds) {
        console.log('🔄 Ejecutando eliminación masiva...');
        
        try {
            // Intentar eliminación masiva por API
            const response = await api.call('/documents/bulk-delete', {
                method: 'DELETE',
                body: JSON.stringify({ document_ids: documentIds })
            });
            
            console.log('📦 Respuesta del servidor:', response);
            
            if (response.success) {
                // Éxito en eliminación masiva
                await this.handleBulkDeleteSuccess(response, documentIds);
            } else {
                // Falló la eliminación masiva, intentar individualmente
                console.warn('⚠️ Falló eliminación masiva, intentando individualmente...');
                await this.deleteDocumentsIndividually(documentIds);
            }
            
        } catch (error) {
            console.error('❌ Error en eliminación masiva:', error);
            
            // Intentar eliminación individual como fallback
            await this.deleteDocumentsIndividually(documentIds);
        }
    }

    /**
     * MANEJAR ÉXITO DE ELIMINACIÓN MASIVA
     */
    async handleBulkDeleteSuccess(response, deletedIds) {
        const successCount = deletedIds.length;
        const message = response.message || `${successCount} documentos movidos a la papelera`;
        
        console.log(`✅ ${message}`);
        showAlert(message, 'success');
        
        // Limpiar selección
        this.deselectAll();
        this.disableSelectionMode();
        
        // Recargar documentos
        if (window.loadDocuments) {
            await window.loadDocuments();
        } else if (typeof refreshTable === 'function') {
            refreshTable();
        }
        
        // Actualizar badge de papelera
        if (updateTrashBadge) {
            await updateTrashBadge();
        }
        
        // Actualizar dashboard
        try {
            const dashboardLoader = window.dashboard?.loadDashboardData || window.loadDashboardData;
            if (typeof dashboardLoader === 'function') {
                await dashboardLoader(window.appState);
            } else if (typeof window.dashboard?.updateDashboardStats === 'function') {
                window.dashboard.updateDashboardStats(window.appState);
            }
        } catch (e) {
            console.warn('No se pudo actualizar dashboard tras eliminación masiva:', e);
        }
        try {
            window.dispatchEvent(new CustomEvent('documentDeleted', { detail: { ids: deletedIds } }));
        } catch (e) {
            console.warn('No se pudo disparar evento documentDeleted tras eliminación masiva:', e);
        }
        
        console.log(`✅ ${successCount} documentos procesados correctamente`);
    }

    /**
     * ELIMINAR DOCUMENTOS INDIVIDUALMENTE (FALLBACK)
     */
    async deleteDocumentsIndividually(documentIds) {
        console.group('🔄 ELIMINACIÓN INDIVIDUAL (FALLBACK)');
        
        let successCount = 0;
        let errorCount = 0;
        const errors = [];
        
        for (const documentId of documentIds) {
            try {
                const response = await api.call(`/documents/${documentId}`, {
                    method: 'DELETE'
                });
                
                if (response.success) {
                    successCount++;
                    console.log(`✅ Documento ${documentId} movido a papelera`);
                } else {
                    errorCount++;
                    errors.push({ id: documentId, error: response.message });
                    console.error(`❌ Error con documento ${documentId}:`, response.message);
                }
                
            } catch (error) {
                errorCount++;
                errors.push({ id: documentId, error: error.message });
                console.error(`❌ Error con documento ${documentId}:`, error);
            }
        }
        
        // Mostrar resultados
        if (successCount > 0) {
            const message = `${successCount} documentos movidos a la papelera` +
                          (errorCount > 0 ? `, ${errorCount} fallaron` : '');
            
            showAlert(message, errorCount > 0 ? 'warning' : 'success');
            
            // Actualizar interfaz para los exitosos
            await this.handleBulkDeleteSuccess(
                { success: true, message },
                documentIds.slice(0, successCount)
            );
        }
        
        if (errorCount > 0) {
            console.error('📋 Errores detallados:', errors);
            showAlert(`${errorCount} documentos no pudieron ser procesados`, 'error');
        }
        
        console.groupEnd();
    }

    /**
     * DEBUG: MOSTRAR ESTADO ACTUAL
     */
    debug() {
        console.group('🐛 DEBUG - BulkDeleteManager');
        
        console.log('📊 Estado del manager:', {
            procesando: this.isProcessing,
            debugMode: this.debugMode
        });
        
        console.log('📊 Estado de selección:');
        bulkDeleteState.debug();
        
        console.log('👁️ Elementos UI:');
        console.table({
            'Botón modo selección': document.getElementById('toggleSelectModeBtn') ? 'Presente' : 'Ausente',
            'Barra información': document.getElementById('selectionInfoBar') ? 'Presente' : 'Ausente',
            'Acciones masivas': document.getElementById('bulkActionsContainer') ? 'Presente' : 'Ausente',
            'Modal eliminación': document.getElementById('bulkDeleteModal') ? 'Presente' : 'Ausente',
            'Checkboxes en tabla': document.querySelectorAll('.document-select-checkbox').length,
            'Filas seleccionadas': document.querySelectorAll('.document-row--selected').length
        });
        
        console.groupEnd();
        
        showAlert('Debug completado. Revisa la consola.', 'info');
    }

    /**
     * TEST: SIMULAR SELECCIÓN DE DOCUMENTOS
     */
    test() {
        console.group('🧪 TEST - BulkDeleteManager');
        
        // Activar modo selección si no está activo
        if (!bulkDeleteState.isSelectionMode) {
            this.enableSelectionMode();
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
                bulkDeleteState.addDocument(docId);
                
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
            this.updateUI();
            
            console.log('✅ Test configurado: 3 documentos seleccionados');
            showAlert('Test configurado: 3 documentos seleccionados. Usa el botón de eliminación masiva.', 'info');
        } else {
            console.warn('⚠️ No hay suficientes documentos para el test');
            showAlert('Necesitas al menos 3 documentos para probar la selección múltiple', 'warning');
        }
        
        console.groupEnd();
    }
}

// Exportar instancia singleton
export const bulkDeleteManager = new BulkDeleteManager();