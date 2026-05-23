// src/frontend/modules/documentos/notificationConfig.js
// Control centralizado de notificaciones para el módulo de documentos

/**
 * Reglas para determinar qué acciones generan notificaciones
 */
export const NOTIFICATION_RULES = {
    CREATE: true,           // Subir nuevo documento
    DELETE: true,           // Eliminar documento individual
    UPDATE: true,           // Actualizar documento existente
    BULK_DELETE: true,      // Eliminación múltiple
    RENEW: true,            // Renovar documento
    
    // Acciones que NO generan notificaciones
    LOAD: false,            // Cargar lista de documentos
    PREVIEW: false,         // Previsualizar documento
    DOWNLOAD: false,        // Descargar documento
    CLOSE_MODAL: false,     // Cerrar modal sin cambios
    FILTER_CHANGE: false,   // Cambiar filtros
    NAVIGATE: false,        // Navegar entre categorías
    SORT: false,            // Ordenar tabla
    SEARCH: false           // Buscar documentos
};

/**
 * Mapa de mensajes de notificación predefinidos
 */
export const NOTIFICATION_MESSAGES = {
    CREATE: {
        success: 'Documento subido correctamente',
        error: 'Error al subir documento'
    },
    DELETE: {
        success: 'Documento eliminado correctamente',
        error: 'Error al eliminar documento'
    },
    UPDATE: {
        success: 'Documento actualizado correctamente',
        error: 'Error al actualizar documento'
    },
    BULK_DELETE: {
        success: (count) => `${count} documentos eliminados correctamente`,
        error: 'Error en eliminación múltiple'
    }
};

/**
 * Verifica si una acción debe generar notificación
 * @param {string} action - Tipo de acción (CREATE, DELETE, UPDATE, etc.)
 * @returns {boolean}
 */
export function shouldNotify(action) {
    if (!action) return false;
    
    // Verificar si estamos en carga inicial
    if (window.isLoadingDocuments) {
        console.log('🔇 Notificación suprimida durante carga de documentos');
        return false;
    }
    
    return NOTIFICATION_RULES[action] === true;
}

/**
 * Cola de notificaciones con debounce para evitar duplicados
 */
class NotificationDebounce {
    constructor() {
        this.queue = new Map();
        this.DEBOUNCE_TIME = 3000; // 3 segundos
    }
    
    /**
     * Verifica si una notificación debe ser debounced
     * @param {string} key - Clave única de notificación
     * @returns {boolean} - true si debe ignorarse, false si debe procesarse
     */
    shouldDebounce(key) {
        const now = Date.now();
        
        if (this.queue.has(key)) {
            const lastTime = this.queue.get(key);
            if (now - lastTime < this.DEBOUNCE_TIME) {
                console.log(`🔄 Notificación debounced: ${key}`);
                return true; // Debe ignorarse
            }
        }
        
        // Actualizar timestamp
        this.queue.set(key, now);
        return false;
    }
    
    /**
     * Limpia la cola de notificaciones
     */
    clear() {
        this.queue.clear();
    }
    
    /**
     * Limpia notificaciones antiguas
     */
    cleanup() {
        const now = Date.now();
        for (const [key, timestamp] of this.queue.entries()) {
            if (now - timestamp > this.DEBOUNCE_TIME * 2) {
                this.queue.delete(key);
            }
        }
    }
}

export const notificationDebounce = new NotificationDebounce();

/**
 * Muestra una notificación solo si corresponde
 * @param {string} action - Tipo de acción
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo de notificación (success, error, warning, info)
 * @param {string} contextId - ID único para debounce (opcional)
 */
export function showDocumentNotification(action, message, type = 'info', contextId = null) {
    if (!shouldNotify(action)) {
        console.log(`🔇 Notificación suprimida para acción: ${action}`);
        return;
    }
    
    // Verificar debounce si hay contextId
    if (contextId) {
        const debounceKey = `${action}:${contextId}:${type}`;
        if (notificationDebounce.shouldDebounce(debounceKey)) {
            return; // Notificación duplicada
        }
    }
    
    // Importar showAlert dinámicamente para evitar dependencia circular
    import('../../utils.js').then(utils => {
        utils.showAlert(message, type);
    }).catch(err => {
        console.error('Error mostrando notificación:', err);
    });
    
    // Limpiar notificaciones antiguas periódicamente
    if (Math.random() < 0.1) { // 10% de probabilidad de limpiar
        notificationDebounce.cleanup();
    }
}