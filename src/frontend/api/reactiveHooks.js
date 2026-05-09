/**
 * ═══════════════════════════════════════════════════════════════════════════
 * API REACTIVE WRAPPER — Intercepta llamadas API y emite eventos automáticos
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Envuelve las llamadas a la API para emitir eventos automáticos cuando
 * ocurren cambios de datos. Esto asegura que la UI se actualice sin
 * necesidad de botones de refresh.
 */

import { eventBus, APP_EVENTS, emit } from '/src/frontend/events/eventBus.js';
import { reactiveState } from '/src/frontend/state/reactiveState.js';

/**
 * Envuelve una llamada API para emitir eventos después de cambios exitosos
 * @param {Promise} apiCall - La promesa de la llamada API
 * @param {string} eventName - Evento a emitir después
 * @param {*} data - Datos a pasar al evento
 */
export async function wrapApiCall(apiCall, eventName, data = null) {
  try {
    const result = await apiCall;
    
    if (result.success) {
      // Emitir evento automáticamente
      if (eventName) {
        eventBus.emit(eventName, data || result);
      }
      return result;
    }
    
    throw new Error(result.message || 'Error en API');
  } catch (err) {
    console.error(`❌ Error en API [${eventName}]:`, err);
    throw err;
  }
}

/**
 * Hook para emitir automáticamente eventos después de operaciones CRUD
 * Se llama después de que una operación API exitosa se complete
 */
export const ReactiveAPIHooks = {
  /**
   * Emitir cuando se crea una persona
   */
  afterPersonCreated(person) {
    reactiveState.set('persons', [
      ...reactiveState.get('persons'),
      person
    ]);
    emit.personCreated(person);
  },

  /**
   * Emitir cuando se actualiza una persona
   */
  afterPersonUpdated(updatedPerson) {
    const persons = reactiveState.get('persons').map(p => 
      p.id === updatedPerson.id ? updatedPerson : p
    );
    reactiveState.set('persons', persons);
    emit.personUpdated(updatedPerson);
  },

  /**
   * Emitir cuando se elimina una persona
   */
  afterPersonDeleted(personId) {
    const persons = reactiveState.get('persons').filter(p => p.id !== personId);
    reactiveState.set('persons', persons);
    emit.personDeleted({ id: personId });
  },

  /**
   * Emitir cuando se crea un documento
   */
  afterDocumentCreated(document) {
    reactiveState.set('documents', [
      ...reactiveState.get('documents'),
      document
    ]);
    emit.documentCreated(document);
  },

  /**
   * Emitir cuando se actualiza un documento
   */
  afterDocumentUpdated(updatedDocument) {
    const documents = reactiveState.get('documents').map(d => 
      d.id === updatedDocument.id ? updatedDocument : d
    );
    reactiveState.set('documents', documents);
    emit.documentUpdated(updatedDocument);
  },

  /**
   * Emitir cuando se elimina un documento
   */
  afterDocumentDeleted(documentId) {
    const documents = reactiveState.get('documents').filter(d => d.id !== documentId);
    reactiveState.set('documents', documents);
    emit.documentDeleted({ id: documentId });
  },

  /**
   * Emitir cuando se renuevaun documento
   */
  afterDocumentRenewed(document) {
    const documents = reactiveState.get('documents').map(d => 
      d.id === document.id ? document : d
    );
    reactiveState.set('documents', documents);
    emit.documentRenewed(document);
  },

  /**
   * Emitir cuando se crea una categoría
   */
  afterCategoryCreated(category) {
    reactiveState.set('categories', [
      ...reactiveState.get('categories'),
      category
    ]);
    emit.categoryCreated(category);
  },

  /**
   * Emitir cuando se actualiza una categoría
   */
  afterCategoryUpdated(updatedCategory) {
    const categories = reactiveState.get('categories').map(c => 
      c.id === updatedCategory.id ? updatedCategory : c
    );
    reactiveState.set('categories', categories);
    emit.categoryUpdated(updatedCategory);
  },

  /**
   * Emitir cuando se elimina una categoría
   */
  afterCategoryDeleted(categoryId) {
    const categories = reactiveState.get('categories').filter(c => c.id !== categoryId);
    reactiveState.set('categories', categories);
    emit.categoryDeleted({ id: categoryId });
  },

  /**
   * Emitir cuando se crea un departamento
   */
  afterDepartmentCreated(department) {
    reactiveState.set('departments', [
      ...reactiveState.get('departments'),
      department
    ]);
    emit.departmentCreated(department);
  },

  /**
   * Emitir cuando se actualiza un departamento
   */
  afterDepartmentUpdated(updatedDepartment) {
    const departments = reactiveState.get('departments').map(d => 
      d.id === updatedDepartment.id ? updatedDepartment : d
    );
    reactiveState.set('departments', departments);
    emit.departmentUpdated(updatedDepartment);
  },

  /**
   * Emitir cuando se elimina un departamento
   */
  afterDepartmentDeleted(departmentId) {
    const departments = reactiveState.get('departments').filter(d => d.id !== departmentId);
    reactiveState.set('departments', departments);
    emit.departmentDeleted({ id: departmentId });
  },

  /**
   * Emitir cuando se actualizan estadísticas del dashboard
   */
  afterDashboardStatsUpdated(stats) {
    reactiveState.set('dashboardStats', stats);
    emit.dashboardStatsUpdated(stats);
  },

  /**
   * Emitir cuando se crea un usuario
   */
  afterUserCreated(user) {
    emit.userCreated(user);
  },

  /**
   * Emitir cuando se actualiza un usuario
   */
  afterUserUpdated(user) {
    emit.userUpdated(user);
  },

  /**
   * Emitir cuando se elimina un usuario
   */
  afterUserDeleted(userId) {
    emit.userDeleted({ id: userId });
  },

  /**
   * Emitir cuando se actualizan roles
   */
  afterRolesUpdated(roles) {
    reactiveState.set('roles', roles);
    emit.rolesUpdated(roles);
  },

  /**
   * Emitir cuando se actualizan versiones
   */
  afterVersionsUpdated(versions) {
    reactiveState.set('versions', versions);
    emit.versionsUpdated(versions);
  },

  /**
   * Emitir cuando se actualizan avisos
   */
  afterAvisosUpdated(avisos) {
    reactiveState.set('avisos', avisos);
    emit.avisosUpdated(avisos);
  },
};

export default ReactiveAPIHooks;
