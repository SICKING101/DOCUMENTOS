// src/backend/models/Version.js
// Modelo para el Panel de Versiones del Super Administrador.
// SOLO el superadmin puede crear/editar/eliminar versiones.
// Los administradores y roles pueden VER las versiones (solo lectura).

import mongoose from 'mongoose';

const changeSchema = new mongoose.Schema(
  {
    tipo: {
      type: String,
      enum: ['nuevo', 'mejora', 'correccion', 'eliminado', 'seguridad', 'rendimiento'],
      required: true,
    },
    descripcion: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
  },
  { _id: true }
);

const versionSchema = new mongoose.Schema(
  {
    // Número de versión semántico: "2.1.0", "3.0.0-beta", etc.
    numero: {
      type: String,
      required: [true, 'El número de versión es requerido'],
      unique: true,
      trim: true,
      match: [/^\d+\.\d+\.\d+(-[\w.]+)?$/, 'Formato inválido. Usa semver: 1.0.0 o 1.0.0-beta'],
    },

    // Nombre/título de la versión: "El Gran Salto", "Parche Crítico", etc.
    titulo: {
      type: String,
      required: [true, 'El título de la versión es requerido'],
      trim: true,
      maxlength: 100,
    },

    // Descripción general de la versión
    descripcion: {
      type: String,
      trim: true,
      maxlength: 10000,
      default: '',
    },

    // Lista de cambios clasificados
    cambios: {
      type: [changeSchema],
      default: [],
    },

    // Estado de la versión
    estado: {
      type: String,
      enum: ['desarrollo', 'beta', 'estable', 'deprecada'],
      default: 'estable',
    },

    // Si es la versión actual del sistema
    esActual: {
      type: Boolean,
      default: false,
    },

    // Fecha de lanzamiento
    fechaLanzamiento: {
      type: Date,
      default: Date.now,
    },

    // Creado por (siempre será "superadmin", pero lo guardamos)
    creadoPor: {
      type: String,
      default: 'superadmin',
    },
  },
  {
    timestamps: true,
  }
);

// Índices
versionSchema.index({ numero: 1 });
versionSchema.index({ esActual: 1 });
versionSchema.index({ fechaLanzamiento: -1 });

// Antes de guardar: si esta versión se marca como actual,
// quitar el flag de todas las demás
versionSchema.pre('save', async function (next) {
  if (this.isModified('esActual') && this.esActual === true) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id } },
      { $set: { esActual: false } }
    );
  }
  next();
});

// Método para obtener el color del estado
versionSchema.methods.getEstadoColor = function () {
  const colores = {
    desarrollo: '#f59e0b',
    beta: '#8b5cf6',
    estable: '#10b981',
    deprecada: '#6b7280',
  };
  return colores[this.estado] || '#6b7280';
};

const Version = mongoose.model('Version', versionSchema);

export default Version;