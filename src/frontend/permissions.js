// src/frontend/permissions.js
// Mapa central de permisos por rol - VERSIÓN MEJORADA CON TODAS LAS SECCIONES

export const PERMISSIONS = Object.freeze({
  // Documentos
  VIEW_DOCUMENTS: 'viewDocuments',
  DOWNLOAD_DOCUMENTS: 'downloadDocuments',
  UPLOAD_DOCUMENTS: 'uploadDocuments',
  EDIT_DOCUMENTS: 'editDocuments',
  DELETE_DOCUMENTS: 'deleteDocuments',
  APPROVE_DOCUMENTS: 'approveDocuments',
  
  // Personas
  VIEW_PERSONS: 'viewPersons',
  CREATE_PERSON: 'createPerson',
  EDIT_PERSON: 'editPerson',
  DELETE_PERSON: 'deletePerson',
  
  // Categorías
  VIEW_CATEGORIES: 'viewCategories',
  CREATE_CATEGORY: 'createCategory',
  EDIT_CATEGORY: 'editCategory',
  DELETE_CATEGORY: 'deleteCategory',
  
  // Departamentos
  VIEW_DEPARTMENTS: 'viewDepartments',
  CREATE_DEPARTMENT: 'createDepartment',
  EDIT_DEPARTMENT: 'editDepartment',
  DELETE_DEPARTMENT: 'deleteDepartment',
  
  // Tareas
  VIEW_TASKS: 'viewTasks',
  CREATE_TASK: 'createTask',
  EDIT_TASK: 'editTask',
  DELETE_TASK: 'deleteTask',
  COMPLETE_TASK: 'completeTask',
  
  // Reportes
  VIEW_REPORTS: 'viewReports',
  GENERATE_REPORTS: 'generateReports',
  EXPORT_REPORTS: 'exportReports',
  
  // Administración
  MANAGE_USERS: 'manageUsers',
  VIEW_AUDIT_LOGS: 'viewAuditLogs',
  VIEW_SYSTEM_SETTINGS: 'viewSystemSettings',
  EDIT_SYSTEM_SETTINGS: 'editSystemSettings',
  
  // Papelera
  VIEW_TRASH: 'viewTrash',
  RESTORE_FROM_TRASH: 'restoreFromTrash',
  EMPTY_TRASH: 'emptyTrash',
  
  // Calendario
  VIEW_CALENDAR: 'viewCalendar',
  CREATE_EVENT: 'createEvent',
  EDIT_EVENT: 'editEvent',
  DELETE_EVENT: 'deleteEvent',
  
  // Historial
  VIEW_HISTORY: 'viewHistory',
  EXPORT_HISTORY: 'exportHistory',
  CLEAR_HISTORY: 'clearHistory',
  
  // Soporte
  VIEW_SUPPORT: 'viewSupport',
  CREATE_TICKET: 'createTicket',
  VIEW_ALL_TICKETS: 'viewAllTickets',
  RESPOND_TICKET: 'respondTicket',
  CLOSE_TICKET: 'closeTicket'
});

export const ROLES = Object.freeze({
  ADMIN: 'administrador',      // 1 solo - Control total
  GERENTE: 'gerente',           // Gestión completa excepto admin
  SUPERVISOR: 'supervisor',     // Supervisa todo, no crea/elimina
  EDITOR: 'editor',             // Crea y edita contenido
  REVISOR: 'revisor',           // Solo revisa y aprueba
  LECTOR: 'lector',             // Solo lectura
  MODERADOR: 'moderador',       // Mantenido por compatibilidad
  USUARIO: 'usuario',           // Mantenido por compatibilidad
  DISABLED: 'desactivado'       // Usuario desactivado
});

// Mapa de permisos por rol
export const ROLE_PERMISSIONS = Object.freeze({
  // ADMIN - Control total del sistema (SOLO 1)
  [ROLES.ADMIN]: [
    // Documentos
    PERMISSIONS.VIEW_DOCUMENTS,
    PERMISSIONS.DOWNLOAD_DOCUMENTS,
    PERMISSIONS.UPLOAD_DOCUMENTS,
    PERMISSIONS.EDIT_DOCUMENTS,
    PERMISSIONS.DELETE_DOCUMENTS,
    PERMISSIONS.APPROVE_DOCUMENTS,
    
    // Personas
    PERMISSIONS.VIEW_PERSONS,
    PERMISSIONS.CREATE_PERSON,
    PERMISSIONS.EDIT_PERSON,
    PERMISSIONS.DELETE_PERSON,
    
    // Categorías
    PERMISSIONS.VIEW_CATEGORIES,
    PERMISSIONS.CREATE_CATEGORY,
    PERMISSIONS.EDIT_CATEGORY,
    PERMISSIONS.DELETE_CATEGORY,
    
    // Departamentos
    PERMISSIONS.VIEW_DEPARTMENTS,
    PERMISSIONS.CREATE_DEPARTMENT,
    PERMISSIONS.EDIT_DEPARTMENT,
    PERMISSIONS.DELETE_DEPARTMENT,
    
    // Tareas
    PERMISSIONS.VIEW_TASKS,
    PERMISSIONS.CREATE_TASK,
    PERMISSIONS.EDIT_TASK,
    PERMISSIONS.DELETE_TASK,
    PERMISSIONS.COMPLETE_TASK,
    
    // Reportes
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.GENERATE_REPORTS,
    PERMISSIONS.EXPORT_REPORTS,
    
    // Administración
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.VIEW_AUDIT_LOGS,
    PERMISSIONS.VIEW_SYSTEM_SETTINGS,
    PERMISSIONS.EDIT_SYSTEM_SETTINGS,
    
    // Papelera
    PERMISSIONS.VIEW_TRASH,
    PERMISSIONS.RESTORE_FROM_TRASH,
    PERMISSIONS.EMPTY_TRASH,
    
    // Calendario
    PERMISSIONS.VIEW_CALENDAR,
    PERMISSIONS.CREATE_EVENT,
    PERMISSIONS.EDIT_EVENT,
    PERMISSIONS.DELETE_EVENT,
    
    // Historial
    PERMISSIONS.VIEW_HISTORY,
    PERMISSIONS.EXPORT_HISTORY,
    PERMISSIONS.CLEAR_HISTORY,
    
    // Soporte
    PERMISSIONS.VIEW_SUPPORT,
    PERMISSIONS.CREATE_TICKET,
    PERMISSIONS.VIEW_ALL_TICKETS,
    PERMISSIONS.RESPOND_TICKET,
    PERMISSIONS.CLOSE_TICKET
  ],

  // GERENTE - Gestión completa excepto administración de usuarios
  [ROLES.GERENTE]: [
    // Documentos
    PERMISSIONS.VIEW_DOCUMENTS,
    PERMISSIONS.DOWNLOAD_DOCUMENTS,
    PERMISSIONS.UPLOAD_DOCUMENTS,
    PERMISSIONS.EDIT_DOCUMENTS,
    PERMISSIONS.DELETE_DOCUMENTS,
    PERMISSIONS.APPROVE_DOCUMENTS,
    
    // Personas
    PERMISSIONS.VIEW_PERSONS,
    PERMISSIONS.CREATE_PERSON,
    PERMISSIONS.EDIT_PERSON,
    PERMISSIONS.DELETE_PERSON,
    
    // Categorías
    PERMISSIONS.VIEW_CATEGORIES,
    PERMISSIONS.CREATE_CATEGORY,
    PERMISSIONS.EDIT_CATEGORY,
    PERMISSIONS.DELETE_CATEGORY,
    
    // Departamentos
    PERMISSIONS.VIEW_DEPARTMENTS,
    PERMISSIONS.CREATE_DEPARTMENT,
    PERMISSIONS.EDIT_DEPARTMENT,
    PERMISSIONS.DELETE_DEPARTMENT,
    
    // Tareas
    PERMISSIONS.VIEW_TASKS,
    PERMISSIONS.CREATE_TASK,
    PERMISSIONS.EDIT_TASK,
    PERMISSIONS.DELETE_TASK,
    PERMISSIONS.COMPLETE_TASK,
    
    // Reportes
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.GENERATE_REPORTS,
    PERMISSIONS.EXPORT_REPORTS,
    
    // Papelera
    PERMISSIONS.VIEW_TRASH,
    PERMISSIONS.RESTORE_FROM_TRASH,
    
    // Calendario
    PERMISSIONS.VIEW_CALENDAR,
    PERMISSIONS.CREATE_EVENT,
    PERMISSIONS.EDIT_EVENT,
    PERMISSIONS.DELETE_EVENT,
    
    // Historial
    PERMISSIONS.VIEW_HISTORY,
    
    // Soporte
    PERMISSIONS.VIEW_SUPPORT,
    PERMISSIONS.CREATE_TICKET,
    PERMISSIONS.VIEW_ALL_TICKETS
  ],

  // SUPERVISOR - Supervisa pero no modifica contenido crítico
  [ROLES.SUPERVISOR]: [
    // Documentos
    PERMISSIONS.VIEW_DOCUMENTS,
    PERMISSIONS.DOWNLOAD_DOCUMENTS,
    PERMISSIONS.APPROVE_DOCUMENTS,
    
    // Personas
    PERMISSIONS.VIEW_PERSONS,
    
    // Categorías
    PERMISSIONS.VIEW_CATEGORIES,
    
    // Departamentos
    PERMISSIONS.VIEW_DEPARTMENTS,
    
    // Tareas
    PERMISSIONS.VIEW_TASKS,
    PERMISSIONS.COMPLETE_TASK,
    
    // Reportes
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.GENERATE_REPORTS,
    PERMISSIONS.EXPORT_REPORTS,
    
    // Papelera
    PERMISSIONS.VIEW_TRASH,
    
    // Calendario
    PERMISSIONS.VIEW_CALENDAR,
    
    // Historial
    PERMISSIONS.VIEW_HISTORY,
    
    // Soporte
    PERMISSIONS.VIEW_SUPPORT,
    PERMISSIONS.CREATE_TICKET
  ],

  // EDITOR - Crea y edita contenido
  [ROLES.EDITOR]: [
    // Documentos
    PERMISSIONS.VIEW_DOCUMENTS,
    PERMISSIONS.DOWNLOAD_DOCUMENTS,
    PERMISSIONS.UPLOAD_DOCUMENTS,
    PERMISSIONS.EDIT_DOCUMENTS,
    
    // Personas
    PERMISSIONS.VIEW_PERSONS,
    PERMISSIONS.CREATE_PERSON,
    PERMISSIONS.EDIT_PERSON,
    
    // Categorías
    PERMISSIONS.VIEW_CATEGORIES,
    PERMISSIONS.CREATE_CATEGORY,
    PERMISSIONS.EDIT_CATEGORY,
    
    // Departamentos
    PERMISSIONS.VIEW_DEPARTMENTS,
    
    // Tareas
    PERMISSIONS.VIEW_TASKS,
    PERMISSIONS.CREATE_TASK,
    PERMISSIONS.EDIT_TASK,
    PERMISSIONS.COMPLETE_TASK,
    
    // Reportes
    PERMISSIONS.VIEW_REPORTS,
    
    // Calendario
    PERMISSIONS.VIEW_CALENDAR,
    PERMISSIONS.CREATE_EVENT,
    PERMISSIONS.EDIT_EVENT,
    
    // Soporte
    PERMISSIONS.VIEW_SUPPORT,
    PERMISSIONS.CREATE_TICKET
  ],

  // REVISOR - Revisa y aprueba
  [ROLES.REVISOR]: [
    // Documentos
    PERMISSIONS.VIEW_DOCUMENTS,
    PERMISSIONS.DOWNLOAD_DOCUMENTS,
    PERMISSIONS.APPROVE_DOCUMENTS,
    
    // Personas
    PERMISSIONS.VIEW_PERSONS,
    
    // Categorías
    PERMISSIONS.VIEW_CATEGORIES,
    
    // Departamentos
    PERMISSIONS.VIEW_DEPARTMENTS,
    
    // Tareas
    PERMISSIONS.VIEW_TASKS,
    PERMISSIONS.COMPLETE_TASK,
    
    // Reportes
    PERMISSIONS.VIEW_REPORTS,
    
    // Calendario
    PERMISSIONS.VIEW_CALENDAR,
    
    // Soporte
    PERMISSIONS.VIEW_SUPPORT
  ],

  // LECTOR - Solo lectura
  [ROLES.LECTOR]: [
    // Documentos
    PERMISSIONS.VIEW_DOCUMENTS,
    PERMISSIONS.DOWNLOAD_DOCUMENTS,
    
    // Personas
    PERMISSIONS.VIEW_PERSONS,
    
    // Categorías
    PERMISSIONS.VIEW_CATEGORIES,
    
    // Departamentos
    PERMISSIONS.VIEW_DEPARTMENTS,
    
    // Tareas
    PERMISSIONS.VIEW_TASKS,
    
    // Reportes
    PERMISSIONS.VIEW_REPORTS,
    
    // Calendario
    PERMISSIONS.VIEW_CALENDAR,
    
    // Soporte
    PERMISSIONS.VIEW_SUPPORT
  ],

  // Compatibilidad: moderador (intermedio)
  [ROLES.MODERADOR]: [
    PERMISSIONS.VIEW_DOCUMENTS,
    PERMISSIONS.DOWNLOAD_DOCUMENTS,
    PERMISSIONS.UPLOAD_DOCUMENTS,
    PERMISSIONS.EDIT_DOCUMENTS,
    PERMISSIONS.DELETE_DOCUMENTS,
    PERMISSIONS.APPROVE_DOCUMENTS,
    PERMISSIONS.VIEW_PERSONS,
    PERMISSIONS.CREATE_PERSON,
    PERMISSIONS.EDIT_PERSON,
    PERMISSIONS.VIEW_CATEGORIES,
    PERMISSIONS.VIEW_DEPARTMENTS,
    PERMISSIONS.VIEW_TASKS,
    PERMISSIONS.CREATE_TASK,
    PERMISSIONS.COMPLETE_TASK,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.VIEW_TRASH,
    PERMISSIONS.VIEW_CALENDAR,
    PERMISSIONS.VIEW_SUPPORT,
    PERMISSIONS.CREATE_TICKET
  ],

  // Compatibilidad: usuario (lector básico)
  [ROLES.USUARIO]: [
    PERMISSIONS.VIEW_DOCUMENTS,
    PERMISSIONS.DOWNLOAD_DOCUMENTS,
    PERMISSIONS.VIEW_PERSONS,
    PERMISSIONS.VIEW_CATEGORIES,
    PERMISSIONS.VIEW_DEPARTMENTS,
    PERMISSIONS.VIEW_TASKS,
    PERMISSIONS.VIEW_CALENDAR,
    PERMISSIONS.VIEW_SUPPORT
  ],

  [ROLES.DISABLED]: []
});

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getCurrentRole() {
  const user = getCurrentUser();
  return user?.rol || localStorage.getItem('userRole') || null;
}

export function getRolePermissions(role) {
  return ROLE_PERMISSIONS[role] || [];
}

export function hasPermission(permission, role = getCurrentRole()) {
  if (!role) return false;
  const permissions = getRolePermissions(role);
  return permissions.includes(permission);
}

// Verificar si el usuario actual es administrador (único)
export function isAdmin() {
  const role = getCurrentRole();
  return role === ROLES.ADMIN;
}

// Alias en español para uso reutilizable
export function tienePermiso(rol, accion) {
  return hasPermission(accion, rol);
}

export function requirePermission(permission, {
  onDenied,
  message = 'No tienes permisos para realizar esta acción.'
} = {}) {
  if (hasPermission(permission)) return true;
  if (typeof onDenied === 'function') onDenied(message);
  return false;
}

// Obtener nombre legible del rol
export function getRoleDisplayName(role) {
  const map = {
    [ROLES.ADMIN]: 'Administrador',
    [ROLES.GERENTE]: 'Gerente',
    [ROLES.SUPERVISOR]: 'Supervisor',
    [ROLES.EDITOR]: 'Editor',
    [ROLES.REVISOR]: 'Revisor',
    [ROLES.LECTOR]: 'Lector',
    [ROLES.MODERADOR]: 'Moderador',
    [ROLES.USUARIO]: 'Usuario',
    [ROLES.DISABLED]: 'Desactivado'
  };
  return map[role] || role;
}

// Helpers para UI: mostrar/ocultar por permiso
export function setElementVisible(el, visible) {
  if (!el) return;
  el.style.display = visible ? '' : 'none';
}

export function applyVisibilityRules(rules = []) {
  rules.forEach((r) => {
    const elements = document.querySelectorAll(r.selector);
    const allowed = hasPermission(r.permission);
    const visible = r.visibleWhenNoPermission ? !allowed : allowed;
    elements.forEach((el) => setElementVisible(el, visible));
  });
}

// Verificar si se puede crear otro administrador
export function canCreateAdmin(users) {
  if (!users || !Array.isArray(users)) return false;
  const adminCount = users.filter(u => u.rol === ROLES.ADMIN && u.activo !== false).length;
  return adminCount === 0; // Solo se puede crear si no hay ningún admin
}