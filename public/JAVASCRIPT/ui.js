import { DOM } from './dom.js';
import { showAlert } from './utils.js';

// =============================================================================
// 1. MANEJADOR DE ACCIONES RÁPIDAS
// =============================================================================

/**
 * 1.1 Manejar acciones rápidas del dashboard
 * Controla los clics en las tarjetas de acciones rápidas del panel principal
 * y ejecuta las funciones correspondientes para cada acción.
 */
function handleQuickAction(e) {
    const action = this.querySelector('.action-card__title')?.textContent;
    console.log(`⚡ Acción rápida: ${action}`);
    
    switch(action) {
        case 'Subir Documento':
            if (typeof window.openDocumentModal === 'function') {
                window.openDocumentModal();
            }
            break;
        case 'Agregar Persona':
            if (typeof window.openPersonModal === 'function') {
                window.openPersonModal();
            }
            break;
        case 'Generar Reporte':
            if (typeof window.generateReport === 'function') {
                window.generateReport();
            }
            break;
        case 'Búsqueda Avanzada':
            if (typeof window.showAdvancedSearch === 'function') {
                window.showAdvancedSearch();
            }
            break;
        default:
            console.warn('Acción no reconocida:', action);
    }
}

// =============================================================================
// 2. MANEJADOR DE CIERRE DE MODALES
// =============================================================================

/**
 * 2.1 Manejar cierre de modales
 * Controla los clics en botones de cierre (×) de todos los modales
 * y llama a las funciones específicas de cierre para cada tipo de modal.
 */
function handleModalClose() {
    const modal = this.closest('.modal');
    if (modal) {
        if (modal.id === 'personModal') {
            if (typeof window.closePersonModal === 'function') {
                window.closePersonModal();
            }
        } else if (modal.id === 'documentModal') {
            if (typeof window.closeDocumentModal === 'function') {
                window.closeDocumentModal();
            }
        } else if (modal.id === 'categoryModal') {
            if (typeof window.closeCategoryModal === 'function') {
                window.closeCategoryModal();
            }
        } else if (modal.id === 'searchModal') {
            if (typeof window.closeSearchModal === 'function') {
                window.closeSearchModal();
            }
        } else if (modal.id === 'reportModal') {
            if (typeof window.closeReportModal === 'function') {
                window.closeReportModal();
            }
        }
    }
}

export { handleQuickAction, handleModalClose };