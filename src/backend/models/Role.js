// src/backend/models/Role.js
import mongoose from 'mongoose';

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
];

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
      default: '#6b7280',
    },
    permissions: {
      type: [permissionSchema],
      default: [],
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    systemKey: {
      type: String,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    schoolId: { 
      type: String, 
      required: true,
      index: true 
    },
  },
  { timestamps: true }
);

roleSchema.index({ name: 1, schoolId: 1 }, { unique: true });
roleSchema.index({ isSystem: 1 });
roleSchema.index({ schoolId: 1, isSystem: 1 });

roleSchema.methods.canViewSection = function (section) {
  if (this.systemKey === 'administrador') return true;
  const perm = this.permissions.find((p) => p.section === section);
  return perm ? perm.canView : false;
};

roleSchema.methods.canActionSection = function (section) {
  if (this.systemKey === 'administrador') return true;
  const perm = this.permissions.find((p) => p.section === section);
  return perm ? perm.canAction : false;
};

roleSchema.methods.toPermissionsMap = function () {
  const map = {};
  this.permissions.forEach((p) => {
    map[p.section] = { canView: p.canView, canAction: p.canAction };
  });
  return map;
};

roleSchema.statics.getPermissionsForRole = async function (roleName) {
  if (roleName === 'administrador') {
    const map = {};
    SYSTEM_SECTIONS.forEach((s) => {
      map[s.key] = { canView: true, canAction: true };
    });
    map['admin']     = { canView: true, canAction: true };
    map['auditoria'] = { canView: true, canAction: true };
    return map;
  }

  const role = await this.findOne({ name: roleName });
  if (role) return role.toPermissionsMap();

  if (roleName === 'desactivado') return {};

  console.warn(`⚠️ Rol "${roleName}" no encontrado en roles dinámicos, sin permisos.`);
  return {};
};

const Role = mongoose.model('Role', roleSchema);

export default Role;