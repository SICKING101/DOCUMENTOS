// src/backend/models/SystemState.js
// Modelo para el estado del sistema (cierre/reapertura)
// SOLO el superadmin puede modificar estos valores

import mongoose from 'mongoose';

const systemStateSchema = new mongoose.Schema(
  {
    // Estado actual del sistema
    isClosed: {
      type: Boolean,
      default: false,
      required: true,
    },
    
    // Motivo del último cierre (si está cerrado)
    reason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    
    // Fecha del último cierre
    closedAt: {
      type: Date,
      default: null,
    },
    
    // Quién realizó el último cambio (siempre superadmin)
    lastModifiedBy: {
      type: String,
      default: 'superadmin',
    },
  },
  {
    timestamps: true,
  }
);

// Historial de cambios (subdocumentos)
const systemHistorySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ['close', 'open'],
      required: true,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
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

// Modelo principal con historial
const systemLogSchema = new mongoose.Schema(
  {
    currentState: {
      type: systemStateSchema,
      default: () => ({}),
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

// Método estático para obtener o crear el documento único
systemLogSchema.statics.getInstance = async function () {
  let instance = await this.findOne();
  if (!instance) {
    instance = new this({
      currentState: {
        isClosed: false,
        reason: '',
        closedAt: null,
        lastModifiedBy: 'superadmin',
      },
      history: [],
    });
    await instance.save();
    console.log('✅ [SystemState] Instancia creada por primera vez');
  }
  return instance;
};

// Método para cerrar el sistema
systemLogSchema.methods.closeSystem = async function (reason) {
  this.currentState.isClosed = true;
  this.currentState.reason = reason || '';
  this.currentState.closedAt = new Date();
  this.currentState.lastModifiedBy = 'superadmin';
  
  this.history.push({
    action: 'close',
    reason: reason || '',
    performedBy: 'superadmin',
    createdAt: new Date(),
  });
  
  await this.save();
  console.log(`🔒 [SystemState] Sistema cerrado. Motivo: ${reason || 'No especificado'}`);
  return this;
};

// Método para abrir el sistema
systemLogSchema.methods.openSystem = async function () {
  this.currentState.isClosed = false;
  this.currentState.reason = '';
  this.currentState.closedAt = null;
  this.currentState.lastModifiedBy = 'superadmin';
  
  this.history.push({
    action: 'open',
    reason: 'Sistema reabierto',
    performedBy: 'superadmin',
    createdAt: new Date(),
  });
  
  await this.save();
  console.log(`🔓 [SystemState] Sistema reabierto`);
  return this;
};

const SystemState = mongoose.model('SystemState', systemLogSchema);

export default SystemState;