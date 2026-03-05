// src/backend/models/Role.js
// Modelo para roles personalizados dinámicos

import mongoose from 'mongoose';

/**
 * Permisos disponibles en el sistema.
 * Cada permiso tiene dos niveles: VER la sección y ACTUAR en ella.
 */
export const SYSTEM_SECTIONS = [
  { key: 'documentos',     label: 'Documentos',     icon: '📄' },
  { key: 'personas',       label: 'Personas',        icon: '👥' },
  { key: 'categorias',     label: 'Categorías',      icon: '🏷️' },
  { key: 'departamentos',  label: 'Departamentos',   icon: '🏢' },
  { key: 'tareas',         label: 'Tareas',          icon: '✅' },
  { key: 'reportes',       label: 'Reportes',        icon: '📊' },
  { key: 'papelera',       label: 'Papelera',        icon: '🗑️' },
  { key: 'calendario',     label: 'Calendario',      icon: '📅' },
  { key: 'historial',      label: 'Historial',       icon: '📜' },
  { key: 'notificaciones', label: 'Notificaciones',  icon: '🔔' },
  { key: 'soporte',        label: 'Soporte',         icon: '🛟' },
  // Secciones exclusivas del administrador (solo admin puede ver/actuar)
  // { key: 'admin',       label: 'Administración',  icon: '⚙️'  },  // Solo admin
  // { key: 'auditoria',   label: 'Auditoría',        icon: '📋' },  // Solo admin
];

/**
 * Estructura de un permiso de sección:
 * {
 *   section: 'documentos',   // key de la sección
 *   canView:   true/false,   // puede ver la sección
 *   canAction: true/false    // puede ejecutar acciones en ella
 * }
 */
const permissionSchema = new mongoose.Schema(
  {
    section:   { type: String, required: true },
    canView:   { type: Boolean, default: false },
    canAction: { type: Boolean, default: false },
  },
  { _id: false }
);

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre del rol es requerido'],
      unique: true,
      trim: true,
      minlength: [2, 'El nombre debe tener al menos 2 caracteres'],
      maxlength: [50, 'El nombre no puede superar 50 caracteres'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'La descripción no puede superar 200 caracteres'],
      default: '',
    },
    color: {
      type: String,
      default: '#6b7280', // gris neutro por defecto
    },
    permissions: {
      type: [permissionSchema],
      default: [],
    },
    // Roles del sistema que NO se pueden eliminar
    isSystem: {
      type: Boolean,
      default: false,
    },
    // Clave interna para roles del sistema (administrador, desactivado, etc.)
    systemKey: {
      type: String,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

// ─── Índices ───────────────────────────────────────────────────────────────────
roleSchema.index({ name: 1 });
roleSchema.index({ isSystem: 1 });

// ─── Métodos de instancia ──────────────────────────────────────────────────────

/**
 * Verifica si el rol puede ver una sección
 */
roleSchema.methods.canViewSection = function (section) {
  if (this.systemKey === 'administrador') return true; // admin siempre puede ver todo
  const perm = this.permissions.find((p) => p.section === section);
  return perm ? perm.canView : false;
};

/**
 * Verifica si el rol puede ejecutar acciones en una sección
 */
roleSchema.methods.canActionSection = function (section) {
  if (this.systemKey === 'administrador') return true;
  const perm = this.permissions.find((p) => p.section === section);
  return perm ? perm.canAction : false;
};

/**
 * Serializa los permisos como objeto plano { section: { canView, canAction } }
 */
roleSchema.methods.toPermissionsMap = function () {
  const map = {};
  this.permissions.forEach((p) => {
    map[p.section] = { canView: p.canView, canAction: p.canAction };
  });
  return map;
};

// ─── Métodos estáticos ─────────────────────────────────────────────────────────

/**
 * Obtiene o crea los permisos de un rol por nombre.
 * Si el nombre no existe en roles dinámicos, cae en el mapa legacy.
 */
roleSchema.statics.getPermissionsForRole = async function (roleName) {
  // El administrador siempre tiene acceso total
  if (roleName === 'administrador') {
    const map = {};
    SYSTEM_SECTIONS.forEach((s) => {
      map[s.key] = { canView: true, canAction: true };
    });
    // Secciones exclusivas admin
    map['admin']     = { canView: true, canAction: true };
    map['auditoria'] = { canView: true, canAction: true };
    return map;
  }

  // Buscar en roles dinámicos
  const role = await this.findOne({ name: roleName });
  if (role) return role.toPermissionsMap();

  // Rol desactivado: sin permisos
  if (roleName === 'desactivado') return {};

  // Fallback: sin permisos
  console.warn(`⚠️ Rol "${roleName}" no encontrado en roles dinámicos, sin permisos.`);
  return {};
};

const Role = mongoose.model('Role', roleSchema);

export default Role;
