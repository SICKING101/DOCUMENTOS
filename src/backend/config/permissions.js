// src/backend/config/permissions.js
// Mapa central de permisos por rol - VERSIÓN ACTUALIZADA CON NUEVOS ROLES

export const PERMISSIONS = Object.freeze({
  VIEW_DOCUMENTS: 'viewDocuments',
  DOWNLOAD_DOCUMENTS: 'downloadDocuments',
  UPLOAD_DOCUMENTS: 'uploadDocuments',
  EDIT_DOCUMENTS: 'editDocuments',
  DELETE_DOCUMENTS: 'deleteDocuments',
  APPROVE_DOCUMENTS: 'approveDocuments',
  MANAGE_USERS: 'manageUsers'
});

export const ROLES = Object.freeze({
  ADMIN: 'administrador',
  GERENTE: 'gerente',           // NUEVO
  SUPERVISOR: 'supervisor',      // NUEVO
  EDITOR: 'editor',
  REVISOR: 'revisor',
  LECTOR: 'lector',
  MODERADOR: 'moderador',
  USUARIO: 'usuario',
  DISABLED: 'desactivado'
});

export const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.ADMIN]: [
    PERMISSIONS.VIEW_DOCUMENTS,
    PERMISSIONS.DOWNLOAD_DOCUMENTS,
    PERMISSIONS.UPLOAD_DOCUMENTS,
    PERMISSIONS.EDIT_DOCUMENTS,
    PERMISSIONS.DELETE_DOCUMENTS,
    PERMISSIONS.APPROVE_DOCUMENTS,
    PERMISSIONS.MANAGE_USERS
  ],

  [ROLES.GERENTE]: [             // NUEVO
    PERMISSIONS.VIEW_DOCUMENTS,
    PERMISSIONS.DOWNLOAD_DOCUMENTS,
    PERMISSIONS.UPLOAD_DOCUMENTS,
    PERMISSIONS.EDIT_DOCUMENTS,
    PERMISSIONS.DELETE_DOCUMENTS,
    PERMISSIONS.APPROVE_DOCUMENTS
  ],

  [ROLES.SUPERVISOR]: [           // NUEVO
    PERMISSIONS.VIEW_DOCUMENTS,
    PERMISSIONS.DOWNLOAD_DOCUMENTS,
    PERMISSIONS.APPROVE_DOCUMENTS
  ],

  [ROLES.EDITOR]: [
    PERMISSIONS.VIEW_DOCUMENTS,
    PERMISSIONS.DOWNLOAD_DOCUMENTS,
    PERMISSIONS.UPLOAD_DOCUMENTS
  ],

  [ROLES.REVISOR]: [
    PERMISSIONS.VIEW_DOCUMENTS,
    PERMISSIONS.DOWNLOAD_DOCUMENTS,
    PERMISSIONS.APPROVE_DOCUMENTS
  ],

  [ROLES.LECTOR]: [
    PERMISSIONS.VIEW_DOCUMENTS,
    PERMISSIONS.DOWNLOAD_DOCUMENTS
  ],

  [ROLES.MODERADOR]: [
    PERMISSIONS.VIEW_DOCUMENTS,
    PERMISSIONS.DOWNLOAD_DOCUMENTS,
    PERMISSIONS.UPLOAD_DOCUMENTS,
    PERMISSIONS.EDIT_DOCUMENTS,
    PERMISSIONS.DELETE_DOCUMENTS,
    PERMISSIONS.APPROVE_DOCUMENTS
  ],

  [ROLES.USUARIO]: [
    PERMISSIONS.VIEW_DOCUMENTS,
    PERMISSIONS.DOWNLOAD_DOCUMENTS
  ],

  [ROLES.DISABLED]: []
});

export function getRolePermissions(role) {
  return ROLE_PERMISSIONS[role] || [];
}

export function hasPermission(role, permission) {
  const perms = getRolePermissions(role);
  return perms.includes(permission);
}

export function hasAnyPermission(role, permissions = []) {
  const perms = getRolePermissions(role);
  return permissions.some((p) => perms.includes(p));
}