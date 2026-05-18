// src/backend/models/SystemState.js
// Modelo para el estado del sistema (cierre/reapertura)
// Soporta cierre global Y cierre por escuela específica
// Los usuarios comparten schoolId con su admin (ej: "school-cbtis-51-51662544")

import mongoose from 'mongoose';

// ─── Esquema de cierre por escuela ────────────────────────────
const schoolClosureSchema = new mongoose.Schema(
  {
    schoolId: {
      type: String,
      required: true,
      index: true,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    closedAt: {
      type: Date,
      default: Date.now,
    },
    closedBy: {
      type: String,
      default: 'superadmin',
    },
  },
  { _id: false }
);

// ─── Esquema del historial ────────────────────────────────────
const systemHistorySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ['close_global', 'open_global', 'close_school', 'open_school'],
      required: true,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    targetSchoolId: {
      type: String,
      default: null,
    },
    performedBy: {
      type: String,
      default: 'superadmin',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

// ─── Esquema principal ────────────────────────────────────────
const systemLogSchema = new mongoose.Schema(
  {
    currentState: {
      // Cierre global
      isClosed: {
        type: Boolean,
        default: false,
        required: true,
      },
      reason: {
        type: String,
        trim: true,
        maxlength: 500,
        default: '',
      },
      closedAt: {
        type: Date,
        default: null,
      },
      lastModifiedBy: {
        type: String,
        default: 'superadmin',
      },

      // Cierres por escuela
      closedSchools: {
        type: [schoolClosureSchema],
        default: [],
      },
    },
    history: {
      type: [systemHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// ═══════════════════════════════════════════════════════════════
// MÉTODO ESTÁTICO: Obtener o crear instancia única
// ═══════════════════════════════════════════════════════════════
systemLogSchema.statics.getInstance = async function () {
  let instance = await this.findOne();
  if (!instance) {
    instance = new this({
      currentState: {
        isClosed: false,
        reason: '',
        closedAt: null,
        lastModifiedBy: 'superadmin',
        closedSchools: [],
      },
      history: [],
    });
    await instance.save();
    console.log('✅ [SystemState] Instancia creada por primera vez');
  }
  return instance;
};

// ═══════════════════════════════════════════════════════════════
// MÉTODOS DE INSTANCIA
// ═══════════════════════════════════════════════════════════════

/**
 * Cerrar el sistema GLOBALMENTE
 */
systemLogSchema.methods.closeSystem = async function (reason) {
  this.currentState.isClosed = true;
  this.currentState.reason = reason || '';
  this.currentState.closedAt = new Date();
  this.currentState.lastModifiedBy = 'superadmin';

  this.history.push({
    action: 'close_global',
    reason: reason || '',
    performedBy: 'superadmin',
    createdAt: new Date(),
  });

  await this.save();
  console.log(`🔒🌍 [SystemState] Sistema cerrado GLOBALMENTE. Motivo: ${reason || 'No especificado'}`);
  return this;
};

/**
 * Abrir el sistema GLOBALMENTE
 */
systemLogSchema.methods.openSystem = async function () {
  this.currentState.isClosed = false;
  this.currentState.reason = '';
  this.currentState.closedAt = null;
  this.currentState.lastModifiedBy = 'superadmin';

  this.history.push({
    action: 'open_global',
    reason: 'Sistema reabierto globalmente',
    performedBy: 'superadmin',
    createdAt: new Date(),
  });

  await this.save();
  console.log(`🔓🌍 [SystemState] Sistema reabierto GLOBALMENTE`);
  return this;
};

/**
 * Cerrar el sistema para UNA ESCUELA ESPECÍFICA
 * @param {String} schoolId - ID de la escuela (ej: "school-cbtis-51-51662544")
 * @param {String} reason - Motivo del cierre
 */
systemLogSchema.methods.closeSchool = async function (schoolId, reason) {
  // Verificar si ya está cerrada
  const alreadyClosed = this.currentState.closedSchools.find(
    s => s.schoolId === schoolId
  );

  if (alreadyClosed) {
    // Actualizar motivo si ya está cerrada
    alreadyClosed.reason = reason || alreadyClosed.reason;
    alreadyClosed.closedAt = new Date();
    alreadyClosed.closedBy = 'superadmin';
  } else {
    this.currentState.closedSchools.push({
      schoolId,
      reason: reason || '',
      closedAt: new Date(),
      closedBy: 'superadmin',
    });
  }

  this.history.push({
    action: 'close_school',
    reason: reason || '',
    targetSchoolId: schoolId,
    performedBy: 'superadmin',
    createdAt: new Date(),
  });

  await this.save();
  console.log(`🔒🏫 [SystemState] Escuela ${schoolId} cerrada. Motivo: ${reason || 'No especificado'}`);
  return this;
};

/**
 * Abrir el sistema para UNA ESCUELA ESPECÍFICA
 * @param {String} schoolId - ID de la escuela a reabrir
 */
systemLogSchema.methods.openSchool = async function (schoolId) {
  this.currentState.closedSchools = this.currentState.closedSchools.filter(
    s => s.schoolId !== schoolId
  );

  this.history.push({
    action: 'open_school',
    reason: 'Escuela reabierta',
    targetSchoolId: schoolId,
    performedBy: 'superadmin',
    createdAt: new Date(),
  });

  await this.save();
  console.log(`🔓🏫 [SystemState] Escuela ${schoolId} reabierta`);
  return this;
};

/**
 * Verificar si un usuario puede acceder al sistema
 * @param {Object} user - Debe tener al menos: { rol, schoolId, isSuperAdmin }
 * @returns {Object} { allowed: Boolean, reason: String, type: String }
 */
systemLogSchema.methods.checkAccess = function (user) {
  // El SUPERADMIN SIEMPRE tiene acceso
  if (user.rol === 'superadmin' || user.isSuperAdmin === true) {
    return { allowed: true, reason: '', type: 'superadmin' };
  }

  // ═══════════════════════════════════════════════════════════
  // Verificar cierre global (afecta a TODOS menos superadmin)
  // ═══════════════════════════════════════════════════════════
  if (this.currentState.isClosed) {
    return {
      allowed: false,
      reason: this.currentState.reason || 'Sistema cerrado por mantenimiento',
      type: 'global',
    };
  }

  // ═══════════════════════════════════════════════════════════
  // Verificar cierre por escuela (afecta a ADMIN y USUARIOS)
  // ═══════════════════════════════════════════════════════════
  if (user.schoolId) {
    const schoolClosure = this.currentState.closedSchools.find(
      s => s.schoolId === user.schoolId
    );

    if (schoolClosure) {
      return {
        allowed: false,
        reason: schoolClosure.reason || 'Acceso suspendido para esta escuela',
        type: 'school',
      };
    }
  }

  return { allowed: true, reason: '', type: 'open' };
};

const SystemState = mongoose.model('SystemState', systemLogSchema);

export default SystemState;