/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EVENT BUS — Sistema centralizado de eventos reactivos
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Maneja la comunicación entre módulos a través de eventos personalizados.
 * Permite que cualquier componente se suscriba a cambios sin acoplamiento.
 * 
 * USO:
 *   eventBus.emit('users:updated', { users: [] });
 *   eventBus.on('users:updated', (data) => console.log(data));
 *   eventBus.off('users:updated', handler);
 */

class EventBus {
  constructor() {
    this._events = new Map();
    this._debug = true; // Cambiar a false en producción
  }

  /**
   * Emite un evento con datos
   * @param {string} eventName - Nombre del evento
   * @param {*} data - Datos a pasar
   */
  emit(eventName, data = null) {
    if (this._debug) {
      console.log(`📢 EventBus: "${eventName}"`, data || '');
    }

    // Emitir también como CustomEvent en el documento para máxima compatibilidad
    const customEvent = new CustomEvent(eventName, { detail: data, bubbles: true });
    document.dispatchEvent(customEvent);

    // Emitir a los handlers registrados localmente
    if (this._events.has(eventName)) {
      this._events.get(eventName).forEach((handler) => {
        try {
          handler(data);
        } catch (err) {
          console.error(
            `❌ Error en handler de "${eventName}":`,
            err
          );
        }
      });
    }
  }

  /**
   * Se suscribe a un evento
   * @param {string} eventName - Nombre del evento
   * @param {function} handler - Función a ejecutar
   */
  on(eventName, handler) {
    if (!this._events.has(eventName)) {
      this._events.set(eventName, []);
    }
    this._events.get(eventName).push(handler);

    // También registrar en document como backup
    document.addEventListener(eventName, (e) => {
      handler(e.detail);
    });
  }

  /**
   * Se desuscribe de un evento
   * @param {string} eventName - Nombre del evento
   * @param {function} handler - Función a remover
   */
  off(eventName, handler) {
    if (!this._events.has(eventName)) return;
    const handlers = this._events.get(eventName);
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
    if (handlers.length === 0) {
      this._events.delete(eventName);
    }
  }

  /**
   * Espera una sola vez un evento
   * @param {string} eventName - Nombre del evento
   * @param {number} timeout - Tiempo máximo de espera (ms)
   * @returns {Promise}
   */
  once(eventName, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Timeout esperando evento: ${eventName}`));
      }, timeout);

      const handler = (data) => {
        clearTimeout(timeoutId);
        this.off(eventName, handler);
        resolve(data);
      };

      this.on(eventName, handler);
    });
  }

  /**
   * Limpia todos los eventos registrados
   */
  clear() {
    this._events.clear();
    console.log('🧹 EventBus limpiado');
  }

  /**
   * Obtiene nombres de eventos registrados
   */
  getEventNames() {
    return Array.from(this._events.keys());
  }
}

// Instancia global del EventBus
export const eventBus = new EventBus();

/**
 * EVENTOS ESTÁNDAR DE LA APLICACIÓN
 * ═════════════════════════════════════════════════════════════
 */

export const APP_EVENTS = {
  // ─── Datos ───
  PERSONS_UPDATED: 'persons:updated',
  DOCUMENTS_UPDATED: 'documents:updated',
  CATEGORIES_UPDATED: 'categories:updated',
  DEPARTMENTS_UPDATED: 'departments:updated',
  TASKS_UPDATED: 'tasks:updated',
  
  // ─── Dashboard ───
  DASHBOARD_STATS_UPDATED: 'dashboard:stats:updated',
  DASHBOARD_REFRESHED: 'dashboard:refreshed',
  
  // ─── Operaciones CRUD ───
  PERSON_CREATED: 'person:created',
  PERSON_UPDATED: 'person:updated',
  PERSON_DELETED: 'person:deleted',
  
  DOCUMENT_CREATED: 'document:created',
  DOCUMENT_UPDATED: 'document:updated',
  DOCUMENT_DELETED: 'document:deleted',
  DOCUMENT_RENEWED: 'document:renewed',
  
  CATEGORY_CREATED: 'category:created',
  CATEGORY_UPDATED: 'category:updated',
  CATEGORY_DELETED: 'category:deleted',
  
  DEPARTMENT_CREATED: 'department:created',
  DEPARTMENT_UPDATED: 'department:updated',
  DEPARTMENT_DELETED: 'department:deleted',
  
  TASK_CREATED: 'task:created',
  TASK_UPDATED: 'task:updated',
  TASK_DELETED: 'task:deleted',
  
  // ─── Usuarios y Admin ───
  USER_CREATED: 'user:created',
  USER_UPDATED: 'user:updated',
  USER_DELETED: 'user:deleted',
  ADMIN_UPDATED: 'admin:updated',
  ROLES_UPDATED: 'roles:updated',
  
  // ─── Sistema ───
  SYSTEM_STATUS_UPDATED: 'system:status:updated',
  AUDIT_LOG_CREATED: 'audit:log:created',
  NOTIFICATION_CREATED: 'notification:created',
  PERMISSIONS_CHANGED: 'permissions:changed',
  
  // ─── UI ───
  MODAL_CLOSED: 'modal:closed',
  MODAL_OPENED: 'modal:opened',
  FILTER_CHANGED: 'filter:changed',
  SEARCH_CHANGED: 'search:changed',
  
  // ─── Versiones ───
  VERSIONS_UPDATED: 'versions:updated',
  
  // ─── Avisos ───
  AVISOS_UPDATED: 'avisos:updated',
  
  // ─── Sugerencias ───
  SUGERENCIAS_UPDATED: 'sugerencias:updated',
};

/**
 * Helpers para emitir eventos comunes
 */
export const emit = {
  personsUpdated: (data) => eventBus.emit(APP_EVENTS.PERSONS_UPDATED, data),
  documentsUpdated: (data) => eventBus.emit(APP_EVENTS.DOCUMENTS_UPDATED, data),
  categoriesUpdated: (data) => eventBus.emit(APP_EVENTS.CATEGORIES_UPDATED, data),
  departmentsUpdated: (data) => eventBus.emit(APP_EVENTS.DEPARTMENTS_UPDATED, data),
  tasksUpdated: (data) => eventBus.emit(APP_EVENTS.TASKS_UPDATED, data),
  dashboardStatsUpdated: (data) => eventBus.emit(APP_EVENTS.DASHBOARD_STATS_UPDATED, data),
  personCreated: (data) => eventBus.emit(APP_EVENTS.PERSON_CREATED, data),
  personUpdated: (data) => eventBus.emit(APP_EVENTS.PERSON_UPDATED, data),
  personDeleted: (data) => eventBus.emit(APP_EVENTS.PERSON_DELETED, data),
  documentCreated: (data) => eventBus.emit(APP_EVENTS.DOCUMENT_CREATED, data),
  documentUpdated: (data) => eventBus.emit(APP_EVENTS.DOCUMENT_UPDATED, data),
  documentDeleted: (data) => eventBus.emit(APP_EVENTS.DOCUMENT_DELETED, data),
  documentRenewed: (data) => eventBus.emit(APP_EVENTS.DOCUMENT_RENEWED, data),
  userCreated: (data) => eventBus.emit(APP_EVENTS.USER_CREATED, data),
  userUpdated: (data) => eventBus.emit(APP_EVENTS.USER_UPDATED, data),
  userDeleted: (data) => eventBus.emit(APP_EVENTS.USER_DELETED, data),
  rolesUpdated: (data) => eventBus.emit(APP_EVENTS.ROLES_UPDATED, data),
  versionsUpdated: (data) => eventBus.emit(APP_EVENTS.VERSIONS_UPDATED, data),
  avisosUpdated: (data) => eventBus.emit(APP_EVENTS.AVISOS_UPDATED, data),
};

export default eventBus;
