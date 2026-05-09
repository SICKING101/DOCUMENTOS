/**
 * ═══════════════════════════════════════════════════════════════════════════
 * REACTIVE STATE — Sistema de state management reactivo
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Proporciona un state global que se sincroniza automáticamente con la UI
 * cuando cambian los datos. Funciona como un Proxy que intercepta cambios
 * y emite eventos para notificar a los suscriptores.
 * 
 * USO:
 *   reactiveState.subscribe('users', (newUsers) => {
 *     console.log('Users changed:', newUsers);
 *   });
 *   
 *   reactiveState.set('users', [newUsers]);
 *   // → Automáticamente emite evento y renderiza
 */

import { eventBus, APP_EVENTS } from '/src/frontend/events/eventBus.js';

class ReactiveState {
  constructor() {
    this._state = {
      persons: [],
      documents: [],
      categories: [],
      departments: [],
      tasks: [],
      users: [],
      roles: [],
      dashboardStats: {
        totalPersonas: 0,
        totalDocumentos: 0,
        proximosVencer: 0,
        totalCategorias: 0,
      },
      systemStatus: null,
      auditLogs: [],
      notifications: [],
      invitations: [],
      versions: [],
      avisos: [],
      sugerencias: [],
      filters: {},
      searchTerm: '',
      loading: false,
      error: null,
    };

    this._subscribers = new Map();
    this._watchers = new Map();
    this._debug = true;
  }

  /**
   * Obtiene un valor del estado
   * @param {string} key - Clave del estado
   * @returns {*}
   */
  get(key) {
    return this._state[key];
  }

  /**
   * Establece un valor en el estado
   * Si el valor es diferente, emite eventos automáticamente
   * @param {string} key - Clave
   * @param {*} value - Nuevo valor
   * @param {object} options - Opciones { silent: false, batch: false }
   */
  set(key, value, options = {}) {
    const { silent = false, batch = false } = options;
    
    // Comparar con valor anterior
    const oldValue = this._state[key];
    
    // Si es el mismo valor, no hacer nada
    if (JSON.stringify(oldValue) === JSON.stringify(value)) {
      return;
    }

    // Actualizar estado
    this._state[key] = value;

    if (this._debug) {
      console.log(`🔄 State updated: ${key}`, value);
    }

    // No emitir si es silencioso
    if (silent) return;

    // Notificar suscriptores locales
    this._notifySubscribers(key, value, oldValue);

    // Emitir eventos globales
    this._emitGlobalEvents(key, value, oldValue);
  }

  /**
   * Actualiza múltiples valores a la vez (batch)
   * @param {object} updates - Objeto con actualizaciones
   * @param {object} options - Opciones
   */
  update(updates, options = {}) {
    const { silent = false } = options;
    
    Object.entries(updates).forEach(([key, value]) => {
      this.set(key, value, { silent, batch: true });
    });

    if (!silent) {
      // Emitir un evento de actualización batch
      eventBus.emit('state:batch:updated', updates);
    }
  }

  /**
   * Obtiene todo el estado
   * @returns {object}
   */
  getState() {
    return { ...this._state };
  }

  /**
   * Reemplaza todo el estado
   * @param {object} newState
   */
  replaceState(newState) {
    this._state = newState;
    console.log('🔄 State reemplazado completamente');
    eventBus.emit('state:replaced', newState);
  }

  /**
   * Se suscribe a cambios en una clave específica
   * @param {string} key - Clave a observar
   * @param {function} callback - Función a ejecutar
   * @returns {function} Función para desuscribirse
   */
  subscribe(key, callback) {
    if (!this._subscribers.has(key)) {
      this._subscribers.set(key, []);
    }
    this._subscribers.get(key).push(callback);

    // Retornar función para desuscribirse
    return () => {
      const callbacks = this._subscribers.get(key);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Observa cambios profundos en estructuras complejas
   * @param {string} key - Clave a observar
   * @param {function} callback - Función a ejecutar
   * @returns {function} Función para desuscribirse
   */
  watch(key, callback) {
    if (!this._watchers.has(key)) {
      this._watchers.set(key, []);
    }
    this._watchers.get(key).push(callback);

    // Retornar función para desuscribirse
    return () => {
      const watchers = this._watchers.get(key);
      const index = watchers.indexOf(callback);
      if (index > -1) {
        watchers.splice(index, 1);
      }
    };
  }

  /**
   * Notifica a los suscriptores locales
   * @private
   */
  _notifySubscribers(key, newValue, oldValue) {
    if (this._subscribers.has(key)) {
      this._subscribers.get(key).forEach((callback) => {
        try {
          callback(newValue, oldValue);
        } catch (err) {
          console.error(`Error en subscriber de ${key}:`, err);
        }
      });
    }

    // También notificar watchers
    if (this._watchers.has(key)) {
      this._watchers.get(key).forEach((callback) => {
        try {
          callback(newValue, oldValue);
        } catch (err) {
          console.error(`Error en watcher de ${key}:`, err);
        }
      });
    }
  }

  /**
   * Emite eventos globales según la clave actualizada
   * @private
   */
  _emitGlobalEvents(key, newValue, oldValue) {
    const eventMap = {
      persons: APP_EVENTS.PERSONS_UPDATED,
      documents: APP_EVENTS.DOCUMENTS_UPDATED,
      categories: APP_EVENTS.CATEGORIES_UPDATED,
      departments: APP_EVENTS.DEPARTMENTS_UPDATED,
      tasks: APP_EVENTS.TASKS_UPDATED,
      users: APP_EVENTS.USER_UPDATED,
      roles: APP_EVENTS.ROLES_UPDATED,
      dashboardStats: APP_EVENTS.DASHBOARD_STATS_UPDATED,
      systemStatus: APP_EVENTS.SYSTEM_STATUS_UPDATED,
      auditLogs: APP_EVENTS.AUDIT_LOG_CREATED,
      versions: APP_EVENTS.VERSIONS_UPDATED,
      avisos: APP_EVENTS.AVISOS_UPDATED,
    };

    if (eventMap[key]) {
      eventBus.emit(eventMap[key], newValue);
    }
  }

  /**
   * Limpia el estado
   */
  clear() {
    this._state = {};
    this._subscribers.clear();
    this._watchers.clear();
    console.log('🧹 State limpiado');
  }
}

// Instancia global del state
export const reactiveState = new ReactiveState();

export default reactiveState;
